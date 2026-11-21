/* ラクガス図鑑 — 標本・付録の個別ページの動き（コピー・依頼への移動・アクセス記録）
   アクセス記録は app.js と同じ形式。名前やメールアドレス、IPアドレスは送らない。 */
(function () {
  'use strict';
  const CFG = window.RAKUGAS_CONFIG || {};

  /* アクセス記録（個人を特定しない） */
  let off = !CFG.gasUrl || navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true;
  try { if (localStorage.getItem('rakugas-notrack') === '1') off = true; } catch (e) {}
  const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const keep = (getStore, k) => { try { const st = getStore(); let v = st.getItem(k); if (!v) { v = rid(); st.setItem(k, v); } return v; } catch (e) { return rid(); } };
  const vid = keep(() => localStorage, 'rakugas-vid');
  const sid = keep(() => sessionStorage, 'rakugas-sid');
  const w = innerWidth, device = w < 600 ? 'スマホ' : w < 1024 ? 'タブレット' : 'PC';
  const q = [];
  const ev = (e, t, v) => { if (!off) q.push({ e, t: String(t ?? '').slice(0, 100), v: String(v ?? '').slice(0, 50), at: Date.now() }); };
  const flush = () => {
    if (off || !q.length) return;
    const body = JSON.stringify({ kind: 'track', vid, sid, device, width: w, page: location.pathname, events: q.splice(0, 50) });
    try { if (!(navigator.sendBeacon && navigator.sendBeacon(CFG.gasUrl, new Blob([body], { type: 'text/plain' })))) fetch(CFG.gasUrl, { method: 'POST', body, mode: 'no-cors', keepalive: true }).catch(() => {}); } catch (e) {}
  };

  /* 流入元（検索エンジンなど）を覚えて、依頼のときに添える。app.js と同じキー */
  let ref = '直接・ブックマーク', camp = '';
  try {
    const sp = new URL(location.href).searchParams, u = sp.get('utm_source');
    camp = (sp.get('utm_campaign') || '').replace(/[^\w\-]/g, '').slice(0, 60);
    if (u) ref = u.replace(/[<>"]/g, '').slice(0, 40);
    else if (document.referrer) { const h = new URL(document.referrer).hostname; if (h && h !== location.hostname) ref = h; }
    if (ref !== '直接・ブックマーク') localStorage.setItem('rakugas-touch', JSON.stringify({ s: ref, c: camp, at: Date.now() }));
  } catch (e) {}
  const name = (document.querySelector('h1') || {}).textContent || '';
  ev('pageview', ref, camp);
  if (/\/no\/\d{3}\/$/.test(location.pathname)) ev('spec_open', (document.querySelector('.label-no') || {}).textContent + ' ' + name);
  else if (/\/furoku\//.test(location.pathname)) ev('filter', '付録：' + name);
  setTimeout(flush, 1500);
  addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });

  /* コードのコピー */
  document.querySelectorAll('[data-copy-code]').forEach((b) => {
    b.hidden = false;
    b.addEventListener('click', () => {
      const code = b.parentElement.querySelector('code').textContent;
      const done = (t) => { b.textContent = t; setTimeout(() => { b.textContent = 'コピー'; }, 1800); };
      try { navigator.clipboard.writeText(code).then(() => done('コピーしました'), () => done('選択してコピーしてください')); } catch (e) { done('選択してコピーしてください'); }
      ev('copy_code', (document.querySelector('.label-no') || {}).textContent + ' ' + name); flush();
    });
  });

  /* 付録の「相談する」ボタン → 図鑑のトップの依頼フォームへ */
  document.querySelectorAll('button[data-ref]').forEach((b) => {
    b.addEventListener('click', () => { location.href = '../../?ref=' + encodeURIComponent(b.dataset.ref) + '#request'; });
  });
  /* お気に入り（図鑑のトップと同じ保存場所。このブラウザの中だけ） */
  const FAV_LS = 'rakugas-fav';
  const readFavs = () => { try { const a = JSON.parse(localStorage.getItem(FAV_LS) || '[]'); return Array.isArray(a) ? a.filter((n) => Number.isInteger(n) && n >= 1 && n <= 999) : []; } catch (e) { return []; } };
  document.querySelectorAll('[data-fav]').forEach((b) => {
    const n = +b.dataset.fav, t = b.querySelector('.fav-t');
    const paint = (on) => { b.setAttribute('aria-pressed', on); if (t) t.textContent = on ? 'お気に入りに追加済み' : 'お気に入りに追加'; };
    paint(readFavs().includes(n)); b.hidden = false;
    b.addEventListener('click', () => {
      const set = new Set(readFavs()), on = !set.has(n);
      if (on) set.add(n); else set.delete(n);
      try { localStorage.setItem(FAV_LS, JSON.stringify([...set].sort((x, y) => x - y))); } catch (e) {}
      b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
      paint(on); ev('fav', b.dataset.favName || '', on ? '1' : '0'); flush();
    });
  });

  // 依頼フォームを開いた記録は、移動先の図鑑のトップで「個別ページから」として残す

  /* 横にスクロールする表：キーボードでも動かせるようにする */
  document.querySelectorAll('.tbl').forEach((el) => {
    el.tabIndex = 0; el.setAttribute('role', 'region');
    const s = el.closest('details') && el.closest('details').querySelector('summary');
    el.setAttribute('aria-label', (s ? s.textContent.trim().slice(0, 40) + '：' : '') + '表（横にスクロールできます）');
  });
})();
