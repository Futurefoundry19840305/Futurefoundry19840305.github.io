/* =========================================================
   ラクガス図鑑 — 画面の動き
   ========================================================= */
(function () {
  'use strict';
  const Z = window.ZUKAN;
  const CFG = window.RAKUGAS_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- アクセス解析（個人を特定しない） ----------
     送るのは、ランダムな訪問者ID・どの機能が使われたか・端末の種類だけ。
     名前やメールアドレス、IPアドレスは送らない。
     「トラッキング拒否」の設定、または ?notrack=1 で開いたブラウザでは送らない。 */
  const T = (() => {
    let off = !CFG.gasUrl || navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true;
    try {
      if (/[?&]notrack=1\b/.test(location.search)) localStorage.setItem('rakugas-notrack', '1');
      if (/[?&]notrack=0\b/.test(location.search)) localStorage.removeItem('rakugas-notrack');
      if (localStorage.getItem('rakugas-notrack') === '1') off = true;
    } catch (e) {}
    const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    const keep = (getStore, k) => { try { const st = getStore(); let v = st.getItem(k); if (!v) { v = rid(); st.setItem(k, v); } return v; } catch (e) { return rid(); } };
    const vid = keep(() => localStorage, 'rakugas-vid');
    const sid = keep(() => sessionStorage, 'rakugas-sid');
    const w = innerWidth;
    const device = w < 600 ? 'スマホ' : w < 1024 ? 'タブレット' : 'PC';
    let q = [], timer = null;
    function flush() {
      if (off || !q.length) return;
      const body = JSON.stringify({ kind: 'track', vid, sid, device, width: w, page: location.pathname, events: q.splice(0, 50) });
      try {
        const ok = navigator.sendBeacon && navigator.sendBeacon(CFG.gasUrl, new Blob([body], { type: 'text/plain' }));
        if (!ok) fetch(CFG.gasUrl, { method: 'POST', body, mode: 'no-cors', keepalive: true }).catch(() => {});
      } catch (e) {}
    }
    function ev(name, target, value) {
      if (off) return;
      q.push({ e: name, t: String(target ?? '').slice(0, 100), v: String(value ?? '').slice(0, 50), at: Date.now() });
      clearTimeout(timer);
      if (q.length >= 10) flush(); else timer = setTimeout(flush, 6000);
    }
    return { ev, flush };
  })();
  /* 流入元：utm_source があればそれ、なければ外部サイトのドメイン。utm_campaign は記事ごとの名前。
     直接以外の流入は「最後の流入元」として30日間覚え、依頼にも添える（どの記事から依頼が来たかを測るため） */
  const TOUCH_KEY = 'rakugas-touch';
  const touch = (() => {
    let ref = '直接・ブックマーク', camp = '';
    try {
      const sp = new URL(location.href).searchParams;
      const u = sp.get('utm_source');
      camp = (sp.get('utm_campaign') || '').replace(/[^\w\-]/g, '').slice(0, 60);
      if (u) ref = u.replace(/[<>"]/g, '').slice(0, 40);
      else if (document.referrer) { const h = new URL(document.referrer).hostname; if (h && h !== location.hostname) ref = h; }
    } catch (e) {}
    if (ref !== '直接・ブックマーク') { try { localStorage.setItem(TOUCH_KEY, JSON.stringify({ s: ref, c: camp, at: Date.now() })); } catch (e) {} }
    return { ref, camp };
  })();
  const lastTouch = () => {
    try {
      const t = JSON.parse(localStorage.getItem(TOUCH_KEY) || 'null');
      if (t && Date.now() - t.at < 30 * 86400000) return t.s + (t.c ? ' / ' + t.c : '');
    } catch (e) {}
    return '直接・ブックマーク';
  };
  (function () {
    T.ev('pageview', touch.ref, touch.camp);
    // 料金を見た（セッションで1回）
    if ('IntersectionObserver' in window && $('price')) {
      const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); T.ev('price_view'); } }, { threshold: 0.4 });
      io.observe($('price'));
    }
    // スクロールの到達率
    const marks = [25, 50, 75, 100], hit = new Set();
    addEventListener('scroll', () => {
      const d = document.documentElement, pct = ((scrollY + innerHeight) / d.scrollHeight) * 100;
      marks.forEach((m) => { if (pct >= m - 1 && !hit.has(m)) { hit.add(m); T.ev('scroll', '', m); } });
    }, { passive: true });
    // 滞在時間（画面が見えていた秒数）
    let shown = 0, since = document.visibilityState === 'visible' ? Date.now() : 0;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        if (since) shown += Date.now() - since; since = 0;
        T.ev('leave', '', Math.round(shown / 1000)); T.flush();
      } else since = Date.now();
    });
    addEventListener('pagehide', () => T.flush());
  })();

  /* ---------- アイコン ---------- */
  const I = Object.assign({}, Z.icons, {
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  });
  const ic = (k, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${I[k] || ''}</svg>`;
  document.querySelectorAll('[data-i]').forEach((el) => { el.innerHTML = ic(el.dataset.i); el.removeAttribute('data-i'); });
  $('thGear').innerHTML = I.gear;

  /* ---------- 生息地（サービス） ---------- */
  const HAB = {
    'スプレッドシート': { c: '--h-sheet', i: 'sheet' },
    'Gmail': { c: '--h-mail', i: 'mail' },
    'カレンダー': { c: '--h-cal', i: 'cal' },
    'ドライブ': { c: '--h-drive', i: 'drive' },
    'ドキュメント': { c: '--h-doc', i: 'doc' },
    'スライド': { c: '--h-slide', i: 'slide' },
    'フォーム': { c: '--h-form', i: 'form' },
    '外部連携': { c: '--h-ext', i: 'ext' },
    'Webアプリ': { c: '--h-web', i: 'web' },
    '自動実行': { c: '--h-auto', i: 'clock' },
  };
  const hab = (s) => HAB[s] || { c: '--ink', i: 'gear' };
  const SPEC = Z.specimens.map((x, i) => ({ ...x, n: i + 1, no: 'No.' + String(i + 1).padStart(3, '0') }));
  const LV = ['', 'かんたん', 'ふつう', 'ちょい難'];
  const lvDots = (lv) => `<span class="lv" aria-label="難しさ：${LV[lv]}">${[1, 2, 3].map((k) => `<i class="${k <= lv ? 'on' : ''}"></i>`).join('')}</span>`;
  const priceOf = (lv) => (lv === 1 ? '3,000円〜' : 'お見積り');
  /* 時間削減のめやす */
  const saveMin = (x) => x.save.man * x.save.per;
  const fmtSave = (x) => { const m = saveMin(x); return m < 60 ? `約${Math.round(m)}分` : `約${Math.round(m / 60)}時間`; };
  const fmtMan = (m) => (m < 1 ? `約${Math.round(m * 60)}秒` : `約${m}分`);
  const saveBadge = (x) => `<span class="save">${ic('clock')}<span>年間 <b>${fmtSave(x)}</b> の削減</span></span>`;

  /* 流れ図：きっかけ → GAS → 使うサービス */
  function flow(x) {
    const c = x.code; let tg;
    if (c.includes('onEdit')) tg = ['edit', '編集した時'];
    else if (c.includes('onSubmit')) tg = ['send', '送信された時'];
    else if (c.includes('onOpen')) tg = ['menu', '開いた時'];
    else if (/doGet|doPost/.test(c)) tg = ['web', 'アクセス時'];
    else if (c.includes('timeBased') || x.s === '自動実行') tg = ['clock', '決まった時間'];
    else if (c.includes('// セルに')) tg = ['edit', 'セルに入力'];
    else tg = ['tap', '実行ボタン'];
    const M = [['SpreadsheetApp', 'sheet', 'シート'], ['GmailApp', 'mail', 'メール'], ['CalendarApp', 'cal', 'カレンダー'], ['DriveApp', 'drive', 'ドライブ'], ['DocumentApp', 'doc', 'ドキュメント'], ['SlidesApp', 'slide', 'スライド'], ['FormApp', 'form', 'フォーム'], ['Charts.', 'chart', 'グラフ'], ['LanguageApp', 'tr', '翻訳'], ['Calendar.', 'cal', 'カレンダー'], ['generativelanguage', 'ext', 'AI'], ['HtmlService', 'web', 'Webページ'], ['line.me', 'chat', 'LINE'], ['Webhook', 'chat', 'チャット'], ['UrlFetchApp', 'ext', '外部サイト']];
    let sv = M.map((m) => [c.indexOf(m[0]), m]).filter((a) => a[0] >= 0).sort((a, b) => a[0] - b[0]).map((a) => a[1]);
    if (sv.some((m) => m[1] === 'chat')) sv = sv.filter((m) => m[1] !== 'ext');
    if (!sv.length) sv = [[0, 'sheet', 'シート']];
    sv = sv.slice(0, 3);
    const n = (k, l, g) => `<span class="node${g ? ' g' : ''}">${ic(k)}${l}</span>`;
    const parts = [n(tg[0], tg[1]), n('gear', 'GAS', 1), ...sv.map((m) => n(m[1], m[2]))];
    return `<div class="flow" role="img" aria-label="流れ：${tg[1]}、GAS、${sv.map((m) => m[2]).join('・')}">${parts.join('<span class="arr" aria-hidden="true">▸</span>')}</div>`;
  }
  function cnote(c) {
    const h = [];
    if (/ID'/.test(c)) h.push('「〜ID」');
    if (/example\.(com|co\.jp)|@example|Webhook URL|アクセストークン|ユーザーID/.test(c)) h.push('メールアドレスやURL・トークン');
    if (/r\[\d\]|\]\) =>|getRange\('/.test(c)) h.push('列の位置やセル範囲');
    return '見本のコードです。' + (h.length ? h.join('・') + 'を自分のものに書き換え、' : '自分の環境に合わせて書き換え、') + 'テスト用のデータで試してから使ってください。';
  }

  /* ---------- 図鑑の一覧 ---------- */
  let cat = 'すべて', q = '', sort = 'no';
  const habBox = $('habitats');
  const ADV = '応用';   // 複数サービスの連携・AI・外部APIなど、一歩進んだ使い方
  const inCat = (x, k) => k === 'すべて' || (k === ADV ? !!x.adv : x.s === k);
  const cats = ['すべて', ...(SPEC.some((x) => x.adv) ? [ADV] : []), ...Object.keys(HAB).filter((k) => SPEC.some((x) => x.s === k))];
  habBox.innerHTML = cats.map((k) => {
    const n = SPEC.filter((x) => inCat(x, k)).length;
    const dot = k === 'すべて' ? '' : k === ADV ? '<span class="dot adv-dot" aria-hidden="true">★</span>' : `<span class="dot" style="--hc:var(${hab(k).c})"></span>`;
    return `<button class="hab" type="button" aria-pressed="${k === cat}" data-cat="${esc(k)}">${dot}${esc(k)}<span class="n">${n}</span></button>`;
  }).join('');
  habBox.addEventListener('click', (e) => {
    const b = e.target.closest('.hab'); if (!b) return;
    cat = b.dataset.cat; T.ev('filter', cat);
    habBox.querySelectorAll('.hab').forEach((x) => x.setAttribute('aria-pressed', x === b));
    renderList();
  });
  let searchTimer = null;
  $('q').addEventListener('input', (e) => {
    q = e.target.value; renderList();
    clearTimeout(searchTimer);
    const word = q.trim();
    if (word) searchTimer = setTimeout(() => T.ev('search', word, $('specimens').querySelectorAll('.label').length), 1500);
  });
  $('sort').addEventListener('change', (e) => { sort = e.target.value; renderList(); T.ev('sort', sort === 'save' ? '削減時間順' : '番号順'); });

  function renderList() {
    const k = q.trim().toLowerCase();
    const list = SPEC.filter((x) => inCat(x, cat) && (!k || (x.t + x.d + x.use + x.s + (x.adv ? ADV : '')).toLowerCase().includes(k)));
    if (sort === 'save') list.sort((a, b) => saveMin(b) - saveMin(a) || a.n - b.n);
    $('count').textContent = `${list.length}種の標本`;
    $('specimens').innerHTML = list.length ? list.map((x) => {
      const h = hab(x.s);
      return `<button class="label" type="button" data-n="${x.n}" style="--hc:var(${h.c})" aria-label="${esc(x.no + ' ' + x.t)}の詳細を開く">
        <span class="label-top"><span class="label-no">${x.no}${x.adv ? '<span class="adv-tag">応用</span>' : ''}</span><span class="label-hab">${ic(h.i)}${esc(x.s)}</span></span>
        <h3>${esc(x.t)}</h3>
        <p class="desc">${esc(x.d)}</p>
        ${flow(x)}
        ${saveBadge(x)}
        <span class="label-meta"><span>難しさ ${lvDots(x.lv)} ${LV[x.lv]}</span><span class="price-tag">依頼 ${priceOf(x.lv)}</span></span>
      </button>`;
    }).join('') : `<div class="empty"><p>「${esc(q)}」に当てはまる標本は見つかりませんでした。</p><p class="muted">別の言葉で探すか、そのまま作成をご相談ください。</p><p><button class="btn small" type="button" data-open-req>作成を相談する</button></p></div>`;
  }
  renderList();

  /* ---------- 標本の詳細 ---------- */
  const plate = $('plate');
  function openPlate(n, fromHash) {
    const x = SPEC[n - 1]; if (!x) return;
    const h = hab(x.s);
    $('plateInner').style.setProperty('--hc', `var(${h.c})`);
    $('plateInner').innerHTML = `
      <div class="plate-head">
        <div class="label-top"><span class="label-no">${x.no}${x.adv ? '<span class="adv-tag">応用</span>' : ''}</span><span class="label-hab">${ic(h.i)}${esc(x.s)}</span></div>
        <h2 id="plateTitle">${esc(x.t)}</h2>
        <p>${esc(x.d)}</p>
        <button class="close" type="button" data-close aria-label="閉じる">×</button>
      </div>
      <div class="plate-body">
        <div class="facts-row"><span>難しさ ${lvDots(x.lv)} <b>${LV[x.lv]}</b></span><span>作成依頼 <b>${priceOf(x.lv)}</b></span></div>
        ${flow(x)}
        <h3>こんな時に便利</h3><p>${esc(x.use)}</p>
        ${x.tips && x.tips.length ? `<h3>応用のポイント</h3><ul class="tips">${x.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
        <h3>時間削減のめやす</h3>
        <div class="saving">
          <div class="saving-row"><span class="saving-k">いまの手作業</span><span>${esc(x.save.how)}</span></div>
          <div class="saving-row"><span class="saving-k">1回あたり</span><span>${fmtMan(x.save.man)} × ${esc(x.save.perT)}</span></div>
          <div class="saving-row"><span class="saving-k">GASなら</span><span>ほぼ自動（数秒〜1分）</span></div>
          <div class="saving-total"><span>年間</span><b>${fmtSave(x)}</b><span>の削減</span></div>
          <p class="saving-note">1回の手作業時間と回数から計算した、めやすです。</p>
        </div>
        <h3>コード例</h3>
        <div class="code-wrap"><pre><code>${esc(x.code)}</code></pre><button class="copy" type="button" data-copy="${x.n}">コピー</button></div>
        <p class="cnote">${esc(cnote(x.code))}</p>
      </div>
      <div class="plate-foot"><button class="btn" type="button" data-close>閉じる</button><button class="btn primary" type="button" data-ref="${esc(x.no + ' ' + x.t)}">これに近いものを依頼する（${priceOf(x.lv)}）</button></div>`;
    if (!plate.open) { try { plate.showModal(); } catch (e) { plate.setAttribute('open', ''); } }
    T.ev('spec_open', x.no + ' ' + x.t);
    if (!fromHash) history.replaceState(null, '', '#no-' + String(n).padStart(3, '0'));
  }
  function clearHash() { if (/^#no-\d{3}$/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search); }
  plate.addEventListener('close', clearHash);
  $('specimens').addEventListener('click', (e) => { const b = e.target.closest('.label'); if (b) openPlate(+b.dataset.n); });
  function fromHash() { const m = location.hash.match(/^#no-(\d{3})$/); if (m) openPlate(+m[1], true); }
  addEventListener('hashchange', fromHash); fromHash();

  /* コピー */
  function copyText(text, btn, done) {
    const ok = () => { btn.textContent = done; setTimeout(() => { btn.textContent = btn.dataset.label || 'コピー'; }, 1800); };
    try { navigator.clipboard.writeText(text).then(ok, () => { btn.textContent = '選択してコピーしてください'; }); }
    catch (e) { btn.textContent = '選択してコピーしてください'; }
  }
  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-copy]');
    if (c) { c.dataset.label = 'コピー'; const x = SPEC[+c.dataset.copy - 1]; copyText(x.code, c, 'コピーしました'); T.ev('copy_code', x.no + ' ' + x.t); }
  });

  /* ---------- 観察窓（シアター） ---------- */
  const SC = Z.scenes, stage = $('thStage'), gear = $('thGear');
  let cur = 0, RUN = 0;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const fmtGas = (s) => (s < 60 ? `約${s}秒` : `約${Math.round(s / 60)}分`);
  $('thTabs').innerHTML = SC.map((s, i) => `<button class="th-tab" type="button" role="tab" aria-selected="${i === 0}">${ic(s.ti)}${esc(s.tab)}</button>`).join('');
  function setBars(on, s) { $('cmpMan').style.width = on ? '100%' : '0'; $('cmpGas').style.width = on ? Math.max(1.5, (s.gas / (s.man * 60)) * 100) + '%' : '0'; }
  function renderScene(s, final) {
    $('thTitle').textContent = s.tab;
    $('thInLabel').innerHTML = ic(s.inL[0]) + esc(s.inL[1]);
    $('thOutLabel').innerHTML = ic(s.outL[0]) + esc(s.outL[1]);
    $('thTrig').innerHTML = `<span class="th-trig" id="thTrigChip">${ic(s.trig[0])}${esc(s.trig[1])}</span>`;
    $('thIn').innerHTML = s.ins.map((t) => `<div class="ti${final ? '' : ' hide'}">${ic(s.inL[0])}<span>${esc(t)}</span></div>`).join('') + (s.more ? `<p class="th-more">${esc(s.more)}</p>` : '');
    $('thOut').innerHTML = s.outs.map((o) => `<div class="to${final ? ' done' : ' hide'}">${ic(o.i)}<span>${esc(o.t)}</span></div>`).join('');
    $('thStatus').textContent = final ? '完了しました' : '待機中';
    $('thProg').style.width = final ? '100%' : '0';
    gear.classList.remove('spin');
    $('cmpManT').textContent = `約${s.man}分`;
    $('cmpGasT').textContent = fmtGas(s.gas);
    $('cmpSave').textContent = `年間 約${Math.round(((s.man * 60 - s.gas) * s.per) / 3600)}時間のゆとり`;
    $('cmpNote').textContent = `${s.perT}の場合のめやす`;
    setBars(final, s);
    $('thAsk').dataset.ref = s.ref;
  }
  function center(el) { const a = el.getBoundingClientRect(), b = stage.getBoundingClientRect(); return [a.left - b.left + a.width / 2, a.top - b.top + a.height / 2]; }
  function fly(from, to, icon) {
    const t = document.createElement('div'); t.className = 'th-token'; t.innerHTML = ic(icon); stage.appendChild(t);
    const p = [center(from), center(gear), center(to)];
    const a = t.animate(p.map(([x, y], i) => ({ transform: `translate(${x}px,${y}px) scale(${i === 1 ? 1.15 : 1})`, opacity: i === 2 ? 0.2 : 1 })), { duration: 850, easing: 'ease-in-out' });
    return a.finished.catch(() => {}).then(() => t.remove());
  }
  async function play(i) {
    const run = ++RUN, s = SC[i], ok = () => run === RUN;
    stage.querySelectorAll('.th-token').forEach((t) => t.remove());
    renderScene(s, false);
    await sleep(250); if (!ok()) return;
    $('thTrigChip').classList.add('ping'); $('thStatus').textContent = 'スタート';
    const ti = [...$('thIn').querySelectorAll('.ti')], to = [...$('thOut').querySelectorAll('.to')];
    for (const el of ti) { el.classList.remove('hide'); await sleep(140); if (!ok()) return; }
    gear.classList.add('spin');
    for (let j = 0; j < s.outs.length; j++) {
      const o = s.outs[j];
      $('thStatus').textContent = s.steps[Math.min(j, s.steps.length - 1)];
      ti.forEach((e) => e.classList.remove('lit')); o.f.forEach((n) => ti[n] && ti[n].classList.add('lit'));
      const srcs = o.f.length ? o.f.map((n) => ti[n]).filter(Boolean) : [gear];
      await Promise.all(srcs.map((el, k) => sleep(k * 90).then(() => ok() && fly(el, to[j], o.i))));
      if (!ok()) return;
      to[j].classList.remove('hide'); to[j].classList.add('done');
      $('thProg').style.width = ((j + 1) / s.outs.length) * 100 + '%';
      await sleep(160); if (!ok()) return;
    }
    ti.forEach((e) => e.classList.remove('lit'));
    gear.classList.remove('spin'); $('thStatus').textContent = '完了しました';
    await sleep(200); if (!ok()) return;
    setBars(true, s);
  }
  function selectScene(i) {
    cur = i; [...$('thTabs').children].forEach((b, k) => b.setAttribute('aria-selected', k === i));
    T.ev('scene', SC[i].tab);
    reduce ? renderScene(SC[i], true) : play(i);
  }
  $('thTabs').addEventListener('click', (e) => { const b = e.target.closest('.th-tab'); if (b) selectScene([...$('thTabs').children].indexOf(b)); });
  $('thReplay').addEventListener('click', () => selectScene(cur));
  renderScene(SC[0], true);
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); setTimeout(() => play(cur), 500); } }, { threshold: 0.4 });
    io.observe($('theater'));
  }

  /* ---------- 依頼フォーム ---------- */
  const SVCS = ['スプレッドシート', 'Gmail', 'カレンダー', 'ドライブ', 'ドキュメント', 'スライド', 'フォーム', 'LINE・チャット', '外部サービス', 'わからない'];
  $('f-svcs').innerHTML = SVCS.map((s, i) => `<label><input type="checkbox" id="f-svc-${i}" value="${s}">${s}</label>`).join('');
  const dlg = $('dlg'), form = $('reqForm'), msg = $('formMsg'), sendBtn = $('sendBtn');
  let openedAt = 0;
  const show = (v) => [form, $('doneView'), $('offView')].forEach((x) => { x.hidden = x !== v; });
  const placeOf = (el) => !el ? 'その他' : el.closest('#theater') ? '観察窓' : el.closest('#plate') ? '標本の詳細' : el.closest('.top') ? 'ヘッダー' : el.closest('.hero') ? 'ヒーロー' : el.closest('.empty') ? '検索0件' : el.closest('#mine') ? 'あなたの依頼' : el.closest('#price') ? '料金' : 'その他';
  function openReq(ref, from) {
    T.ev('req_open', placeOf(from));
    if (plate.open) plate.close();
    show(form); msg.hidden = true; openedAt = Date.now();
    if (ref != null) $('f-ref').value = ref;
    try { dlg.showModal(); } catch (e) { dlg.setAttribute('open', ''); }
    setTimeout(() => $('f-name').focus(), 30);
  }
  document.addEventListener('click', (e) => {
    const o = e.target.closest('[data-open-req]'); if (o) return openReq(null, o);
    const r = e.target.closest('[data-ref]'); if (r) return openReq(r.dataset.ref, r);
    const c = e.target.closest('[data-close]'); if (c) { const d = c.closest('dialog'); if (d) d.close(); }
    const g = e.target.closest('[data-goto]'); if (g) { const t = $(g.dataset.goto); if (t) t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }
  });
  [dlg, plate].forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));

  const collect = () => ({
    name: $('f-name').value.trim(), contact: $('f-contact').value.trim(),
    services: [...$('f-svcs').querySelectorAll('input:checked')].map((i) => i.value),
    plan: $('f-plan').value, want: $('f-want').value.trim(), freq: $('f-freq').value, due: $('f-due').value,
    ref: $('f-ref').value.trim(), website: $('f-hp').value, elapsed: Date.now() - openedAt, source: lastTouch(),
  });
  const asText = (d) => `【GAS作成の依頼】\nお名前：${d.name}\n連絡先：${d.contact}\nご希望：${d.plan}\n使いたいサービス：${d.services.join('、') || '未選択'}\n自動化したいこと：\n${d.want}\n頻度：${d.freq}\n希望の時期：${d.due}\n参考にした標本：${d.ref || 'なし'}`;
  function offline(d, why) { $('copyText').textContent = asText(d); if (why) $('offWhy').textContent = why; show($('offView')); }

  const LS = 'rakugas-my-requests';
  const loadMine = () => { try { const a = JSON.parse(localStorage.getItem(LS) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  const saveMine = (a) => { try { localStorage.setItem(LS, JSON.stringify(a.slice(-30))); } catch (e) {} };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = collect(), miss = [];
    if (!d.name) miss.push('お名前'); if (!d.contact) miss.push('連絡先'); if (!d.want) miss.push('自動化したいこと');
    if (miss.length) { msg.textContent = miss.join('・') + 'を入力してください。'; msg.hidden = false; return; }
    msg.hidden = true;
    if (!CFG.gasUrl) return offline(d, '受付窓口の準備中です。お手数ですが、下の依頼文をコピーしてメールなどで送ってください。');
    sendBtn.disabled = true; sendBtn.textContent = '送信中…';
    try {
      // text/plain で送ると、GASへの送信で事前確認（CORS）が発生しない
      const res = await fetch(CFG.gasUrl, { method: 'POST', body: JSON.stringify(d) });
      const body = await res.json().catch(() => ({}));
      if (body.ok && body.id) { T.ev('req_submit', d.plan, 1); saveMine([...loadMine(), body.id]); form.reset(); show($('doneView')); drawMine(); }
      else if (body.error === 'invalid') { msg.textContent = body.message || '入力内容を確認してください。'; msg.hidden = false; }
      else if (body.error === 'busy') { msg.textContent = '送信が集中しています。1分ほどおいて、もう一度「依頼を送る」を押してください。'; msg.hidden = false; }
      else { T.ev('req_submit', d.plan, 0); offline(d); }
    } catch (err) { T.ev('req_submit', d.plan, 0); offline(d); }
    finally { sendBtn.disabled = false; sendBtn.textContent = '依頼を送る'; }
  });
  $('copyBtn').addEventListener('click', () => {
    const b = $('copyBtn'), box = $('copyText');
    try { navigator.clipboard.writeText(box.textContent).then(() => { b.textContent = 'コピーしました'; }, sel); } catch (e) { sel(); }
    function sel() { const r = document.createRange(); r.selectNodeContents(box); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = '選択しました。コピーしてください'; }
  });

  /* ---------- あなたの依頼 ---------- */
  const ST = ['受付', '対応中', '完了'];
  async function drawMine() {
    const el = $('reqs'), ids = loadMine();
    if (!ids.length) { el.innerHTML = '<p class="muted">まだ依頼はありません。気になる標本があれば、気軽にご相談ください。</p>'; return; }
    if (!CFG.gasUrl) { el.innerHTML = '<p class="muted">受付窓口の準備中のため、進み具合を表示できません。</p>'; return; }
    el.innerHTML = '<p class="muted">読み込み中…</p>';
    try {
      const res = await fetch(CFG.gasUrl + '?ids=' + encodeURIComponent(ids.slice(-20).join(',')));
      const body = await res.json();
      const items = (body.items || []).slice().reverse();
      el.innerHTML = items.length ? items.map((r) => {
        const st = ST.includes(r.status) ? r.status : '受付';
        return `<article class="req"><div class="hd"><span>${esc(r.date)}　${esc(r.name)} 様</span><span class="st st-${st}">${st}</span></div><p class="want">${esc(r.want)}</p></article>`;
      }).join('') : '<p class="muted">依頼の記録が見つかりませんでした。</p>';
    } catch (e) { el.innerHTML = '<p class="muted">進み具合を読み込めませんでした。少し時間をおいて開き直してください。</p>'; }
  }
  drawMine();
})();
