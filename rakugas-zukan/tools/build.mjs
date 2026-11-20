// ラクガス図鑑：検索エンジン向けの静的ページを作る
//   標本ごとのページ   rakugas-zukan/no/001/ 〜
//   付録（業界別）     rakugas-zukan/furoku/<slug>/   （本文は tools/fx/<slug>.html）
//   サイトマップ       /sitemap.xml
// 使い方：リポジトリのルートで  node rakugas-zukan/tools/build.mjs
// data.js（標本）や tools/fx/*.html（付録）を直したら、もう一度実行してから公開する。
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');   // rakugas-zukan/
const SITE = 'https://futurefoundry19840305.github.io';
const BASE = SITE + '/rakugas-zukan/';
const TODAY = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'assets/data.js'), 'utf8'), ctx);
const Z = ctx.window.ZUKAN;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ic = (k, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${Z.icons[k] || ''}</svg>`;
const HAB = {
  'スプレッドシート': ['--h-sheet', 'sheet'], 'Gmail': ['--h-mail', 'mail'], 'カレンダー': ['--h-cal', 'cal'],
  'ドライブ': ['--h-drive', 'drive'], 'ドキュメント': ['--h-doc', 'doc'], 'スライド': ['--h-slide', 'slide'],
  'フォーム': ['--h-form', 'form'], '外部連携': ['--h-ext', 'ext'], 'Webアプリ': ['--h-web', 'web'], '自動実行': ['--h-auto', 'clock'],
};
const hab = (s) => HAB[s] || ['--ink', 'gear'];
const LV = ['', 'かんたん', 'ふつう', 'ちょい難'];
const HEART = '<svg class="heart" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8.2 3.4 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.6 0 5.5 3.7 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>';
const SPEC = Z.specimens.map((x, i) => ({ ...x, n: i + 1, id: String(i + 1).padStart(3, '0'), no: 'No.' + String(i + 1).padStart(3, '0') }));
const saveMin = (x) => x.save.man * x.save.per;
const fmtSave = (x) => { const m = saveMin(x); return m < 60 ? `約${Math.round(m)}分` : `約${Math.round(m / 60)}時間`; };
const fmtMan = (m) => (m < 1 ? `約${Math.round(m * 60)}秒` : `約${m}分`);
const lvDots = (lv) => `<span class="lv" role="img" aria-label="難しさ：${LV[lv]}">${[1, 2, 3].map((k) => `<i class="${k <= lv ? 'on' : ''}"></i>`).join('')}</span>`;

// app.js の flow() / cnote() と同じ判定（画面のポップアップと同じ図になるように）
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
  return { html: `<div class="flow" role="img" aria-label="流れ：${tg[1]}、GAS、${sv.map((m) => m[2]).join('・')}">${parts.join('<span class="arr" aria-hidden="true">▸</span>')}</div>`, trigger: tg[1], services: sv.map((m) => m[2]) };
}
function cnote(c) {
  const h = [];
  if (/ID'/.test(c)) h.push('「〜ID」');
  if (/example\.(com|co\.jp)|@example|Webhook URL|アクセストークン|ユーザーID/.test(c)) h.push('メールアドレスやURL・トークン');
  if (/r\[\d\]|\]\) =>|getRange\('/.test(c)) h.push('列の位置やセル範囲');
  return '見本のコードです。' + (h.length ? h.join('・') + 'を自分のものに書き換え、' : '自分の環境に合わせて書き換え、') + 'テスト用のデータで試してから使ってください。';
}

const FAVICON = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='15' fill='%2317784a'/%3E%3Ccircle cx='16' cy='16' r='4.5' fill='none' stroke='white' stroke-width='2.4'/%3E%3C/svg%3E`;
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self' https://script.google.com https://script.googleusercontent.com; form-action 'none'; base-uri 'none'; object-src 'none'";

// 共通の外枠。up = rakugas-zukan/ までの相対パス（例 '../../'）
function page({ up, url, title, desc, ogTitle, jsonld, crumbs, body, bodyClass = '' }) {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${esc(ogTitle || title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="ラクガス図鑑">
<meta property="og:locale" content="ja_JP">
<meta property="og:image" content="${BASE}assets/ogp.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#1a2747" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#11191d" media="(prefers-color-scheme: dark)">
<link rel="icon" href="${FAVICON}">
<link rel="preload" href="${up}assets/fonts/dela-gothic-one-subset.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${up}assets/style.css">
<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>
<script src="${up}assets/config.js" defer></script>
<script src="${up}assets/page.js" defer></script>
</head>
<body class="sub ${bodyClass}">
<a class="skip" href="#main">本文へスキップ</a>
<header class="top">
  <div class="wrap">
    <a class="logo" href="${up}"><span class="logo-mark">${ic('gear')}</span>ラクガス図鑑</a>
    <nav class="nav" aria-label="サイト内の移動">
      <a class="nav-link" href="${up}#zukan">標本の一覧</a>
      <a class="nav-link" href="${up}#price">料金</a>
      <a class="nav-link" href="${up}#guide">はじめ方</a>
      <a class="btn primary small" href="${up}#request" data-req-link>作成を依頼する</a>
    </nav>
  </div>
</header>
<main id="main">
  <div class="wrap">
    <nav class="crumbs" aria-label="現在の場所"><ol>${crumbs.map((c, i) => i < crumbs.length - 1 ? `<li><a href="${c[1]}">${esc(c[0])}</a></li>` : `<li aria-current="page">${esc(c[0])}</li>`).join('')}</ol></nav>
${body}
  </div>
</main>
<footer class="foot">
  <div class="wrap">
    <a class="logo" href="${up}"><span class="logo-mark">${ic('gear')}</span>ラクガス図鑑</a>
    <span>コード例は見本です。ご利用は自己責任でお願いします。</span>
    <span class="privacy">サイトの改善のため、個人を特定しない形で、どのページが見られたかを記録しています。ブラウザの「トラッキング拒否」を有効にしている場合は記録しません。</span>
  </div>
</footer>
</body>
</html>
`;
}
const crumbLd = (crumbs) => ({ '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c[0], ...(c[2] ? { item: c[2] } : {}) })) });
const write = (rel, html) => { const f = path.join(ROOT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };

/* ---------- 標本のページ ---------- */
const HOWTO = ['Googleスプレッドシートを開く', 'メニューの「拡張機能」→「Apps Script」を選ぶ', 'コードを貼り付けて保存する（Ctrl＋S）', '「実行」を押す（初回だけ許可の確認が出ます）', '自動で動かすなら、左の時計マーク「トリガー」で時間を設定する'];
const urls = [{ loc: BASE, lastmod: TODAY }];
for (const x of SPEC) {
  const [hc, hi] = hab(x.s);
  const url = `${BASE}no/${x.id}/`;
  const f = flow(x);
  const same = SPEC.filter((y) => y.s === x.s && y.n !== x.n);
  const near = [...same.filter((y) => y.n > x.n), ...same.filter((y) => y.n < x.n)].slice(0, 4);
  const prev = SPEC[x.n - 2], next = SPEC[x.n];
  const title = `${x.t}【GASのコード例つき】｜ラクガス図鑑 ${x.no}`;
  const desc = `${x.d}${x.use} Google Apps Script（GAS）のコード例と流れ図、年間の時間削減のめやす（${fmtSave(x)}）を紹介します。`;
  const crumbs = [['ラクガス図鑑', '../../', BASE], [x.s, `../../#zukan`], [x.no, '', url]];
  const ref = `${x.no} ${x.t}`;
  const reqHref = `../../?ref=${encodeURIComponent(ref)}#request`;
  const body = `
    <article class="sheetpage" style="--hc:var(${hc})">
      <header class="sp-head">
        <p class="label-top"><span class="label-no">${x.no}${x.adv ? '<span class="adv-tag">応用</span>' : ''}</span><span class="label-hab">${ic(hi)}${esc(x.s)}</span></p>
        <h1>${esc(x.t)}</h1>
        <p class="sp-lead">${esc(x.d)}</p>
        <dl class="sp-facts">
          <div><dt>年間の時間削減</dt><dd><b>${fmtSave(x)}</b></dd></div>
          <div><dt>難しさ</dt><dd>${lvDots(x.lv)} ${LV[x.lv]}</dd></div>
          <div><dt>動くきっかけ</dt><dd>${esc(f.trigger)}</dd></div>
        </dl>
        <p class="sp-fav"><button class="btn small fav-btn" type="button" data-fav="${x.n}" data-fav-name="${esc(x.no + ' ' + x.t)}" aria-pressed="false" hidden>${HEART}<span class="fav-t">お気に入りに追加</span></button></p>
      </header>
      <div class="sp-body">
        ${f.html}
        <section><h2>こんな時に便利</h2><p>${esc(x.use)}</p></section>
        ${x.tips && x.tips.length ? `<section><h2>応用のポイント</h2><ul class="tips">${x.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></section>` : ''}
        <section><h2>時間削減のめやす</h2>
          <div class="saving">
            <div class="saving-row"><span class="saving-k">いまの手作業</span><span>${esc(x.save.how)}</span></div>
            <div class="saving-row"><span class="saving-k">1回あたり</span><span>${fmtMan(x.save.man)} × ${esc(x.save.perT)}</span></div>
            <div class="saving-row"><span class="saving-k">GASなら</span><span>ほぼ自動（数秒〜1分）</span></div>
            <div class="saving-total"><span>年間</span><b>${fmtSave(x)}</b><span>の削減</span></div>
            <p class="saving-note">1回の手作業時間と回数から計算した、めやすです。</p>
          </div>
        </section>
        <section><h2>コード例</h2>
          <div class="code-wrap"><pre translate="no" tabindex="0" aria-label="コード例"><code>${esc(x.code)}</code></pre><button class="copy" type="button" data-copy-code hidden>コピー</button></div>
          <p class="cnote">${esc(cnote(x.code))}</p>
        </section>
        <section><h2>試し方</h2>
          <ol class="sp-steps">${HOWTO.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>
          <p class="muted">うまく動かないときは、<a href="../../#cautions">使う前に知っておきたいこと</a>を確認してください。</p>
        </section>
        <aside class="sp-cta">
          <p><b>自分の業務に合わせて作ってほしい場合は</b>、この標本をもとに作成を依頼できます。料金は内容を伺ってからお見積りします。</p>
          <a class="btn primary" href="${reqHref}" data-req-link data-ref="${esc(ref)}">${ic('send')}これに近いものを依頼する</a>
        </aside>
      </div>
    </article>
    <nav class="sp-more" aria-label="ほかの標本">
      ${near.length ? `<h2>${esc(x.s)}のほかの標本</h2><ul class="sp-near">${near.map((y) => `<li><a href="../${y.id}/"><span class="label-no">${y.no}</span>${esc(y.t)}</a></li>`).join('')}</ul>` : ''}
      <p class="sp-pn">${prev ? `<a href="../${prev.id}/" rel="prev"><span>前の標本</span>${prev.no} ${esc(prev.t)}</a>` : '<span></span>'}${next ? `<a href="../${next.id}/" rel="next"><span>次の標本</span>${next.no} ${esc(next.t)}</a>` : ''}</p>
      <p><a class="btn" href="../../#zukan">${ic('gear')}56種の標本の一覧へ</a></p>
    </nav>`;
  const jsonld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'TechArticle', headline: x.t, description: desc, inLanguage: 'ja', url, mainEntityOfPage: url, image: BASE + 'assets/ogp.png',
      about: { '@type': 'SoftwareApplication', name: 'Google Apps Script', applicationCategory: 'DeveloperApplication' },
      proficiencyLevel: x.lv >= 3 ? 'Expert' : 'Beginner', isPartOf: { '@type': 'WebSite', name: 'ラクガス図鑑', url: BASE },
      hasPart: { '@type': 'SoftwareSourceCode', programmingLanguage: 'Google Apps Script', text: x.code } },
    crumbLd(crumbs),
  ] };
  write(`no/${x.id}/index.html`, page({ up: '../../', url, title, desc, ogTitle: `${x.no} ${x.t}｜ラクガス図鑑`, jsonld, crumbs, body }));
  urls.push({ loc: url, lastmod: TODAY });
}

/* ---------- 付録（業界別）のページ ---------- */
export const FUROKU = [
  ['fudosan', 'furoku', '不動産業界'], ['ryokan-hotel', 'furoku-hotel', '旅館・ホテル業界'], ['inshoku', 'furoku-food', '飲食店'], ['fashion', 'furoku-fashion', 'ファッション業界'],
];
for (const [slug, , label] of FUROKU) {
  const src = fs.readFileSync(path.join(ROOT, `tools/fx/${slug}.html`), 'utf8');
  const h = src.match(/<!-- title: (.*?) -->/)[1];
  const frag = src.replace(/<!-- title: .*? -->\n?/, '');
  const lead = (frag.match(/<div class="sec-head">\s*<p>(.*?)<\/p>/s) || [, ''])[1].replace(/<[^>]+>/g, '');
  const url = `${BASE}furoku/${slug}/`;
  const title = `${h}｜どの業務をGoogle Apps Scriptで自動化できるか｜ラクガス図鑑`;
  const desc = lead.slice(0, 120);
  const crumbs = [['ラクガス図鑑', '../../', BASE], ['付録・業界別', ''], [label, '', url]];
  const tabs = FUROKU.map(([s, , l]) => s === slug ? `<li aria-current="page">${esc(l)}</li>` : `<li><a href="../${s}/">${esc(l)}</a></li>`).join('');
  const body = `
    <article class="fxpage fx-drawer">
      <header class="fxpage-head"><p class="fx-kicker">付録・業界別</p><h1>${esc(h)}</h1><ul class="fxpage-tabs" aria-label="ほかの業界">${tabs}</ul></header>
      <div class="fx-body">${frag}</div>
    </article>`;
  const jsonld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Article', headline: h, description: desc, inLanguage: 'ja', url, mainEntityOfPage: url, image: BASE + 'assets/ogp.png', isPartOf: { '@type': 'WebSite', name: 'ラクガス図鑑', url: BASE } },
    crumbLd(crumbs),
  ] };
  write(`furoku/${slug}/index.html`, page({ up: '../../', url, title, desc, ogTitle: `${h}｜ラクガス図鑑`, jsonld, crumbs, body, bodyClass: 'fx' }));
  urls.push({ loc: url, lastmod: TODAY });
}

/* ---------- 図鑑のトップに標本の一覧を書き込む（JavaScriptが動く前・検索エンジン向け。表示後は app.js が描き直す） ---------- */
{
  const f = path.join(ROOT, 'index.html');
  const html = fs.readFileSync(f, 'utf8');
  const cards = SPEC.map((x) => { const [hc, hi] = hab(x.s); return `<div class="label-wrap" style="--hc:var(${hc})"><a class="label" href="no/${x.id}/" data-n="${x.n}"><span class="label-top"><span class="label-no">${x.no}${x.adv ? '<span class="adv-tag">応用</span>' : ''}</span><span class="label-hab">${ic(hi)}${esc(x.s)}</span></span><h3>${esc(x.t)}</h3><span class="desc">${esc(x.d)}</span><span class="label-foot"><span class="label-save"><small>年間の削減</small><b>${fmtSave(x)}</b></span><span class="label-lv">${lvDots(x.lv)}${LV[x.lv]}</span></span></a><button class="fav" type="button" data-fav="${x.n}" aria-pressed="false" aria-label="お気に入り：${esc(x.no + ' ' + x.t)}">${HEART}</button></div>`; }).join('\n');
  const out = html.replace(/<!-- cards:start -->[\s\S]*?<!-- cards:end -->/, `<!-- cards:start -->\n${cards}\n<!-- cards:end -->`);
  if (out === html && !html.includes('<!-- cards:start -->')) throw new Error('index.html に cards の目印がありません');
  fs.writeFileSync(f, out);
}

/* ---------- サイトマップ（サイト全体） ---------- */
const sm = path.join(ROOT, '../sitemap.xml');
const keep = [SITE + '/', SITE + '/portfolio/'];
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${keep.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}
${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(sm, xml);
console.log(`標本 ${SPEC.length}ページ・付録 ${FUROKU.length}ページ・サイトマップ ${keep.length + urls.length}件を書き出しました`);
