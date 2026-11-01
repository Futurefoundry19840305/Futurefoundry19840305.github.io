/**
 * ラクガス図鑑 — 依頼の受付窓口（Google Apps Script）
 *
 * できること
 *  ・サイトの依頼フォームから届いた内容を、スプレッドシート「ラクガス図鑑 依頼一覧」に記録
 *  ・あなたのGmailに「新しい依頼」のメールを送る
 *  ・依頼した人が、サイト上で進み具合（受付・対応中・完了）を確認できるようにする
 *  ・サイトのアクセス状況（個人を特定しない）を「アクセスログ」シートに記録
 *  ・管理者だけが開けるダッシュボード（?view=admin）で、アクセスと依頼の状況を見る
 *
 * 進み具合は、スプレッドシートの「状態」列をプルダウンで変えるだけでサイトに反映されます。
 * 設定のしかたは README.md の「手順1」を見てください。
 */

// 依頼を記録するスプレッドシートのID（作成済みの「ラクガス図鑑 依頼一覧」）
const SHEET_ID = '1fwHOrWZ6HkxH9N2kCfrbeAtqtuA_D-B2zmp5hpkG1ZE';
// 通知を受け取るアドレス。空のままなら、このGASを動かすGoogleアカウントのアドレス
const NOTIFY_TO = '';
// サイトのURL（メール本文に載せるだけ。公開後に書き換えてください）
const SITE_URL = 'https://futurefoundry19840305.github.io/rakugas-zukan/';

const HEADERS = ['受付日時', '受付番号', '状態', 'お名前', '連絡先', 'ご希望', '使いたいサービス', '自動化したいこと', '頻度', '希望の時期', '参考にした標本', 'メモ'];
const STATUSES = ['受付', '対応中', '完了'];
const COL = { date: 1, id: 2, status: 3, name: 4, contact: 5, want: 8 };

// アクセスログ（サイトから届く匿名の記録）
const LOG_SHEET = 'アクセスログ';
const LOG_HEADERS = ['日時', '訪問者ID', 'セッションID', 'イベント', '対象', '値', 'ページ', '端末', '画面幅'];
const EVENTS = ['pageview', 'scroll', 'leave', 'filter', 'search', 'sort', 'spec_open', 'copy_code', 'scene', 'req_open', 'req_submit'];
// ログを残す日数（これより古い行はダッシュボードの集計に使わない）
const KEEP_DAYS = 90;

/** 最初に1回だけ実行：表の見た目を整え、テストメールを送る */
function setup() {
  const sh = sheet_();
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#1a2747').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false).build();
  sh.getRange(2, COL.status, sh.getMaxRows() - 1, 1).setDataValidation(rule);
  [150, 120, 80, 120, 200, 200, 180, 360, 100, 110, 220, 200].forEach((w, i) => sh.setColumnWidth(i + 1, w));
  sh.getRange(2, COL.want, sh.getMaxRows() - 1, 1).setWrap(true);
  logSheet_();
  MailApp.sendEmail(notifyTo_(), '【ラクガス図鑑】受付窓口の準備ができました',
    'このメールが届いていれば、通知の設定は完了です。\n次は「デプロイ」→「新しいデプロイ」でウェブアプリとして公開してください。\n\n依頼一覧：' + SpreadsheetApp.openById(SHEET_ID).getUrl(),
    { name: 'ラクガス図鑑' });
  Logger.log('準備完了：' + notifyTo_() + ' にテストメールを送りました');
}

/** 依頼の受付（サイトのフォームから） */
function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'invalid', message: '送信内容を読み取れませんでした。' }); }

  // アクセス記録（サイトの動き）は依頼とは別に処理する
  if (d && d.kind === 'track') return track_(d);

  // いたずら対策：見えない欄に入力がある／開いてすぐの送信は、保存せずに成功したふり
  if (str_(d.website, 200) || Number(d.elapsed) < 3000) return json_({ ok: true, id: Utilities.getUuid() });

  const name = str_(d.name, 100), contact = str_(d.contact, 200), want = str_(d.want, 4000);
  if (!name || !contact || !want) return json_({ ok: false, error: 'invalid', message: 'お名前・連絡先・自動化したいことを入力してください。' });

  // 送りすぎ対策：1分間に10件まで
  const cache = CacheService.getScriptCache();
  const count = Number(cache.get('rate') || 0);
  if (count >= 10) return json_({ ok: false, error: 'busy' });
  cache.put('rate', String(count + 1), 60);

  const services = Array.isArray(d.services) ? d.services.map((s) => str_(s, 30)).filter(String).slice(0, 12).join('、') : '';
  const row = {
    date: new Date(), id: Utilities.getUuid(), status: '受付', name: name, contact: contact,
    plan: str_(d.plan, 60), services: services, want: want,
    freq: str_(d.freq, 40), due: str_(d.due, 40), ref: str_(d.ref, 120),
  };

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    // 先頭が「=」などだと数式として動くため、文字として保存する
    const safe = (v) => (typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v);
    sheet_().appendRow([row.date, row.id, row.status, row.name, row.contact, row.plan, row.services, row.want, row.freq, row.due, row.ref, ''].map(safe));
  } finally {
    lock.releaseLock();
  }

  try { notify_(row); } catch (err) { console.error('通知メールの送信に失敗', err); }
  return json_({ ok: true, id: row.id });
}

/** 進み具合の確認（サイトの「あなたの依頼」から）。連絡先は返さない */
function doGet(e) {
  if (e && e.parameter && e.parameter.view === 'admin') return admin_();
  const ids = String((e && e.parameter && e.parameter.ids) || '').split(',').map((s) => s.trim()).filter((s) => /^[0-9a-f-]{36}$/.test(s)).slice(0, 20);
  if (!ids.length) return json_({ ok: true, items: [] });
  const sh = sheet_();
  const last = sh.getLastRow();
  if (last < 2) return json_({ ok: true, items: [] });
  const values = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
  const want = new Set(ids);
  const items = values.filter((r) => want.has(String(r[COL.id - 1]))).map((r) => ({
    id: String(r[COL.id - 1]),
    date: r[COL.date - 1] instanceof Date ? Utilities.formatDate(r[COL.date - 1], 'Asia/Tokyo', 'yyyy/MM/dd HH:mm') : String(r[COL.date - 1]),
    status: STATUSES.indexOf(String(r[COL.status - 1])) >= 0 ? String(r[COL.status - 1]) : '受付',
    name: String(r[COL.name - 1]).replace(/^'/, ''),
    want: String(r[COL.want - 1]).replace(/^'/, '').slice(0, 300),
  }));
  return json_({ ok: true, items: items });
}

/** 動作テスト：エディタで実行すると、テストの依頼が1件記録され、メールが届く */
function testRequest() {
  const res = doPost({ postData: { contents: JSON.stringify({
    name: 'テスト 太郎', contact: 'test@example.com', plan: '単発の作成（3,000円〜）',
    services: ['スプレッドシート', 'Gmail'], want: 'これはテストです。毎月1日に経費を集計してメールで送りたい。',
    freq: '毎月', due: 'いつでも', ref: 'No.001 表のデータを自動で集計する', elapsed: 10000,
  }) } });
  Logger.log(res.getContent());
}

/* ---------- 内部で使う道具 ---------- */
function notify_(r) {
  const when = Utilities.formatDate(r.date, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm');
  const body = [
    'ラクガス図鑑から、新しい依頼が届きました。',
    '',
    '受付日時　：' + when,
    'お名前　　：' + r.name + ' 様',
    '連絡先　　：' + r.contact,
    'ご希望　　：' + (r.plan || '未選択'),
    'サービス　：' + (r.services || '未選択'),
    '頻度　　　：' + r.freq,
    '希望の時期：' + r.due,
    '参考の標本：' + (r.ref || 'なし'),
    '',
    '■ 自動化したいこと',
    r.want,
    '',
    '――――――――――――',
    '進み具合は、依頼一覧の「状態」列を変えるとサイトに反映されます。',
    '依頼一覧：' + SpreadsheetApp.openById(SHEET_ID).getUrl(),
    SITE_URL ? 'サイト　：' + SITE_URL : '',
    '受付番号：' + r.id,
  ].filter((l) => l !== null).join('\n');
  const options = { name: 'ラクガス図鑑' };
  // 連絡先がメールアドレスなら、このメールに「返信」するだけで依頼者に返せる
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.contact)) options.replyTo = r.contact;
  MailApp.sendEmail(notifyTo_(), '【ラクガス図鑑】新しい依頼：' + r.name.slice(0, 40) + ' 様', body, options);
}
function sheet_() { return SpreadsheetApp.openById(SHEET_ID).getSheets()[0]; }
function notifyTo_() { return NOTIFY_TO || Session.getEffectiveUser().getEmail(); }
function str_(v, max) { return typeof v === 'string' ? v.trim().slice(0, max) : ''; }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }


/* =========================================================
   アクセス記録
   ========================================================= */
function track_(d) {
  const cache = CacheService.getScriptCache();
  const count = Number(cache.get('trk') || 0);
  if (count >= 600) return json_({ ok: false, error: 'busy' });   // 1分あたり600回まで
  cache.put('trk', String(count + 1), 60);

  const id = (v) => (typeof v === 'string' && /^[a-z0-9]{6,20}$/.test(v) ? v : '');
  const vid = id(d.vid), sid = id(d.sid);
  if (!vid || !sid || !Array.isArray(d.events)) return json_({ ok: false, error: 'invalid' });
  const device = ['PC', 'タブレット', 'スマホ'].indexOf(d.device) >= 0 ? d.device : '';
  const width = Math.max(0, Math.min(10000, Number(d.width) || 0));
  const page = str_(d.page, 100);
  const now = Date.now();
  const safe = (v) => (/^[=+\-@]/.test(v) ? "'" + v : v);
  const rows = d.events.slice(0, 50).filter((x) => x && EVENTS.indexOf(x.e) >= 0).map((x) => {
    const at = Number(x.at);
    const when = at && Math.abs(now - at) < 86400000 ? new Date(at) : new Date(now);
    return [when, vid, sid, x.e, safe(str_(x.t, 100)), safe(str_(x.v, 50)), page, device, width];
  });
  if (!rows.length) return json_({ ok: true });
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = logSheet_();
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, LOG_HEADERS.length).setValues(rows);
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}

function logSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(LOG_SHEET);
  if (!sh) {
    sh = ss.insertSheet(LOG_SHEET, ss.getSheets().length);
    sh.getRange(1, 1, 1, LOG_HEADERS.length).setValues([LOG_HEADERS]).setFontWeight('bold').setBackground('#1a2747').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}

/* =========================================================
   管理者用ダッシュボード（?view=admin）
   「自分のみ」に制限したデプロイのURLで開いてください。
   それ以外の人が開いても、データは表示しません。
   ========================================================= */
function admin_() {
  const viewer = Session.getActiveUser().getEmail();
  const owner = Session.getEffectiveUser().getEmail();
  if (!viewer || viewer !== owner) {
    return HtmlService.createHtmlOutput('<p style="font-family:sans-serif;padding:24px">この画面は管理者だけが見られます。</p>').setTitle('ラクガス図鑑');
  }
  const t = HtmlService.createTemplateFromFile('dashboard');
  // 検索語などに含まれる「<」で画面が壊れないよう、エスケープして埋め込む
  t.payload = JSON.stringify(analytics_()).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, '');
  return t.evaluate().setTitle('ラクガス図鑑 ダッシュボード').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** 集計：7日・30日・90日の3期間ぶんをまとめて作る */
function analytics_() {
  const tz = 'Asia/Tokyo';
  const now = new Date();
  const fmt = (d) => Utilities.formatDate(d, tz, 'yyyy-MM-dd');
  const since = now.getTime() - KEEP_DAYS * 86400000;

  const log = SpreadsheetApp.openById(SHEET_ID).getSheetByName(LOG_SHEET);
  const rows = log && log.getLastRow() > 1 ? log.getRange(2, 1, log.getLastRow() - 1, LOG_HEADERS.length).getValues() : [];
  const ev = rows.filter((r) => r[0] instanceof Date && r[0].getTime() >= since).map((r) => ({
    ts: r[0].getTime(), day: fmt(r[0]), vid: String(r[1]), sid: String(r[2]), e: String(r[3]),
    t: String(r[4]).replace(/^'/, ''), v: String(r[5]).replace(/^'/, ''), device: String(r[7]),
  }));

  const reqSh = sheet_();
  const reqRows = reqSh.getLastRow() > 1 ? reqSh.getRange(2, 1, reqSh.getLastRow() - 1, HEADERS.length).getValues() : [];

  const periods = {};
  [7, 30, 90].forEach((days) => {
    const from = now.getTime() - days * 86400000;
    const E = ev.filter((x) => x.ts >= from);
    const visitors = new Set(E.map((x) => x.vid));
    const sessions = new Set(E.map((x) => x.sid));
    const sessWith = (name, test) => new Set(E.filter((x) => x.e === name && (!test || test(x))).map((x) => x.sid));
    const count = (name) => E.filter((x) => x.e === name).length;
    const top = (name, n, test) => {
      const m = {};
      E.filter((x) => x.e === name && x.t && (!test || test(x))).forEach((x) => { m[x.t] = (m[x.t] || 0) + 1; });
      return Object.keys(m).map((k) => [k, m[k]]).sort((a, b) => b[1] - a[1]).slice(0, n);
    };
    // 日別
    const daily = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = fmt(new Date(now.getTime() - i * 86400000));
      const De = E.filter((x) => x.day === d);
      daily.push([d, new Set(De.map((x) => x.vid)).size, new Set(De.map((x) => x.sid)).size, De.filter((x) => x.e === 'pageview').length]);
    }
    // 滞在時間：セッションごとの最大値の平均（3時間を超えるものは除く）
    const stay = {};
    E.filter((x) => x.e === 'leave').forEach((x) => { const s = Number(x.v) || 0; if (s <= 10800) stay[x.sid] = Math.max(stay[x.sid] || 0, s); });
    const stayVals = Object.keys(stay).map((k) => stay[k]);
    const avgStay = stayVals.length ? Math.round(stayVals.reduce((a, b) => a + b, 0) / stayVals.length) : 0;
    // スクロール到達：各セッションの最大到達点
    const scr = {};
    E.filter((x) => x.e === 'scroll').forEach((x) => { scr[x.sid] = Math.max(scr[x.sid] || 0, Number(x.v) || 0); });
    const pvSessions = sessWith('pageview');
    const scroll = [25, 50, 75, 100].map((m) => [m + '%', Object.keys(scr).filter((k) => scr[k] >= m).length]);
    // 端末：セッションの最初の端末
    const dev = {};
    E.filter((x) => x.e === 'pageview').forEach((x) => { if (!dev[x.sid]) dev[x.sid] = x.device || '不明'; });
    const devices = {};
    Object.keys(dev).forEach((k) => { devices[dev[k]] = (devices[dev[k]] || 0) + 1; });
    // 依頼
    const R = reqRows.filter((r) => r[0] instanceof Date && r[0].getTime() >= from);
    const status = { '受付': 0, '対応中': 0, '完了': 0 };
    R.forEach((r) => { const st = String(r[COL.status - 1]); if (status[st] != null) status[st]++; });

    periods[days] = {
      kpi: {
        visitors: visitors.size, sessions: sessions.size, pageviews: count('pageview'), avgStay: avgStay,
        reqOpen: sessWith('req_open').size, reqSubmit: count('req_submit') ? E.filter((x) => x.e === 'req_submit' && x.v === '1').length : 0,
        requests: R.length,
      },
      daily: daily,
      funnel: [
        ['サイトを訪れた', pvSessions.size],
        ['標本を開いた', sessWith('spec_open').size],
        ['依頼フォームを開いた', sessWith('req_open').size],
        ['依頼を送った', sessWith('req_submit', (x) => x.v === '1').size],
      ],
      specimens: top('spec_open', 10),
      searches: top('search', 10),
      noHit: top('search', 10, (x) => x.v === '0'),
      scenes: top('scene', 6),
      reqFrom: top('req_open', 8),
      refs: top('pageview', 8),
      filters: top('filter', 10),
      copies: top('copy_code', 5),
      devices: Object.keys(devices).map((k) => [k, devices[k]]).sort((a, b) => b[1] - a[1]),
      scroll: scroll, scrollBase: Object.keys(scr).length || pvSessions.size,
      status: status,
      submitFail: E.filter((x) => x.e === 'req_submit' && x.v === '0').length,
    };
  });

  const recent = reqRows.filter((r) => r[0] instanceof Date).sort((a, b) => b[0] - a[0]).slice(0, 6).map((r) => ({
    date: Utilities.formatDate(r[0], tz, 'M/d HH:mm'), name: String(r[COL.name - 1]).replace(/^'/, ''),
    plan: String(r[5]).replace(/^'/, ''), status: String(r[COL.status - 1]), want: String(r[COL.want - 1]).replace(/^'/, '').slice(0, 80),
  }));

  return {
    generated: Utilities.formatDate(now, tz, 'yyyy/MM/dd HH:mm'),
    periods: periods,
    recent: recent,
    sheetUrl: SpreadsheetApp.openById(SHEET_ID).getUrl(),
    siteUrl: SITE_URL,
    logRows: rows.length,
  };
}
