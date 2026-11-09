/**
 * ラクガス図鑑 — 依頼の受付窓口（Google Apps Script）
 *
 * できること
 *  ・サイトの依頼フォームから届いた内容を、スプレッドシート「ラクガス図鑑 依頼一覧」に記録
 *  ・あなたのGmailに「新しい依頼」のメールを送る
 *  ・依頼した人が、サイト上で進み具合（受付・対応中・完了）を確認できるようにする
 *  ・サイトのアクセス状況（個人を特定しない）を「アクセスログ」シートに記録
 *  ・管理者だけが開けるダッシュボード（?view=admin）で、アクセスと依頼の状況を見る
 *  ・依頼一覧の「商談」「金額」で、契約・継続依頼・保留・失注と依頼単価を管理する
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

const HEADERS = ['受付日時', '受付番号', '状態', 'お名前', '連絡先', 'ご希望', '使いたいサービス', '自動化したいこと', '頻度', '希望の時期', '参考にした標本', 'メモ', '商談', '金額（円）', '確定日', '流入元'];
const STATUSES = ['受付', '対応中', '完了'];          // 依頼者に見せる進み具合
const DEALS = ['未確定', '契約', '継続依頼', '保留', '失注']; // 管理者だけが見る商談の結果
const WON = ['契約', '継続依頼'];
const COL = { date: 1, id: 2, status: 3, name: 4, contact: 5, plan: 6, want: 8, deal: 13, amount: 14, decided: 15, source: 16 };
// 単発の依頼に最初に入れておく金額（見積もりに合わせて書き換える）
// 記事のネタを毎朝書き出すGoogleドキュメント（「ラクガス図鑑 note下書き」フォルダ内・作成済み）
const TOPICS_DOC_ID = '1DeaOWncaTYEvBv7VfKNAX-Ui5LszjHD0BypQefftIvE';

// アクセスログ（サイトから届く匿名の記録）
const LOG_SHEET = 'アクセスログ';
const LOG_HEADERS = ['日時', '訪問者ID', 'セッションID', 'イベント', '対象', '値', 'ページ', '端末', '画面幅'];
const EVENTS = ['pageview', 'scroll', 'leave', 'filter', 'search', 'sort', 'spec_open', 'copy_code', 'scene', 'price_view', 'req_open', 'req_submit'];

/** 最初に1回だけ実行：表の見た目を整え、テストメールを送る */
function setup() {
  guardAdmin_();
  const sh = sheet_();
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#1a2747').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  const rows = sh.getMaxRows() - 1;
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false).build();
  sh.getRange(2, COL.status, rows, 1).setDataValidation(rule);
  const dealRule = SpreadsheetApp.newDataValidation().requireValueInList(DEALS, true).setAllowInvalid(false).build();
  sh.getRange(2, COL.deal, rows, 1).setDataValidation(dealRule);
  sh.getRange(2, COL.amount, rows, 1).setNumberFormat('#,##0');
  sh.getRange(2, COL.decided, rows, 1).setNumberFormat('yyyy/mm/dd');
  sh.getRange(1, COL.deal, 1, 3).setBackground('#17784a');
  [150, 120, 80, 120, 200, 200, 180, 360, 100, 110, 220, 200, 100, 110, 110, 180].forEach((w, i) => sh.setColumnWidth(i + 1, w));
  sh.getRange(2, COL.want, rows, 1).setWrap(true);
  // 以前からある行の「商談」が空なら「未確定」にする
  const last = sh.getLastRow();
  if (last > 1) {
    const r = sh.getRange(2, COL.deal, last - 1, 1);
    r.setValues(r.getValues().map((v) => [v[0] === '' ? '未確定' : v[0]]));
  }
  logSheet_();
  // 記事のネタを毎朝6時ごろに更新する（すでにあれば作らない）
  if (!ScriptApp.getProjectTriggers().some((t) => t.getHandlerFunction() === 'updateTopics')) {
    ScriptApp.newTrigger('updateTopics').timeBased().everyDays(1).atHour(6).create();
  }
  updateTopics();
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

  // 送りすぎ対策：1分間に10件まで、6時間で60件まで
  const cache = CacheService.getScriptCache();
  const count = Number(cache.get('rate') || 0), count6h = Number(cache.get('rate6h') || 0);
  if (count >= 10 || count6h >= 60) return json_({ ok: false, error: 'busy' });
  cache.put('rate', String(count + 1), 60);
  cache.put('rate6h', String(count6h + 1), 21600);

  const services = Array.isArray(d.services) ? d.services.map((s) => str_(s, 30)).filter(String).slice(0, 12).join('、') : '';
  const row = {
    date: new Date(), id: Utilities.getUuid(), status: '受付', name: name, contact: contact,
    plan: str_(d.plan, 60), services: services, want: want,
    freq: str_(d.freq, 40), due: str_(d.due, 40), ref: str_(d.ref, 120),
    source: str_(d.source, 120) || '直接・ブックマーク',
  };

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    // 先頭が「=」などだと数式として動くため、文字として保存する
    const safe = (v) => (typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v);
    const price = '';   // 料金はすべて要相談。金額は見積り・契約が決まったら入力する
    sheet_().appendRow([row.date, row.id, row.status, row.name, row.contact, row.plan, row.services, row.want, row.freq, row.due, row.ref, '', '未確定', price, '', row.source].map(safe));
  } finally {
    lock.releaseLock();
  }

  // 通知メールは6時間で30通まで（いたずらでメールの送信上限を使い切られないように。超えた分もシートには記録される）
  const mails = Number(cache.get('mail6h') || 0);
  if (mails < 30) {
    cache.put('mail6h', String(mails + 1), 21600);
    try { notify_(row); } catch (err) { console.error('通知メールの送信に失敗', err); }
  }
  return json_({ ok: true, id: row.id });
}

/** 依頼一覧で「商談」を契約・継続依頼・失注にしたら、確定日を自動で入れる（シートを手で編集したときに動く） */
function onEdit(e) {
  try {
    const r = e.range, sh = r.getSheet();
    if (sh.getIndex() !== 1 || r.getRow() < 2 || r.getColumn() > COL.deal || r.getLastColumn() < COL.deal) return;
    for (let row = r.getRow(); row <= r.getLastRow(); row++) {
      const v = String(sh.getRange(row, COL.deal).getValue());
      const cell = sh.getRange(row, COL.decided);
      if ((WON.indexOf(v) >= 0 || v === '失注') && !cell.getValue()) cell.setValue(new Date());
    }
  } catch (err) { /* 手入力のじゃまはしない */ }
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
  guardAdmin_();
  const res = doPost({ postData: { contents: JSON.stringify({
    name: 'テスト 太郎', contact: 'test@example.com', plan: '単発の作成（要相談）',
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
    '流入元　　：' + (r.source || '不明'),
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
  if (count >= 300) return json_({ ok: false, error: 'busy' });   // 全体で1分あたり300回まで
  cache.put('trk', String(count + 1), 60);
  // 同じ訪問者IDからの送りすぎ（いたずら）を止める：10分あたり60回まで
  const vkey = 'tv:' + String(d && d.vid).slice(0, 20);
  const vcount = Number(cache.get(vkey) || 0);
  if (vcount >= 60) return json_({ ok: false, error: 'busy' });
  cache.put(vkey, String(vcount + 1), 600);

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
/** 管理者（このGASの持ち主）以外が実行したら止める。エディタで持ち主が実行するときは通る */
function guardAdmin_() {
  if (!isAdmin_()) throw new Error('この操作は管理者だけが実行できます。');
}

function isAdmin_() {
  const viewer = Session.getActiveUser().getEmail();
  return !!viewer && viewer === Session.getEffectiveUser().getEmail();
}

function admin_() {
  if (!isAdmin_()) {
    // 管理者以外には、GASの関数を呼び出せる画面（HtmlService）を返さない。ただの文字だけを返す
    return ContentService.createTextOutput('この画面は管理者だけが見られます。');
  }
  // 最初の表示：直近30日・日ごと
  const to = ymd_(Date.now()), from = ymd_(Date.now() - 29 * DAY);
  const t = HtmlService.createTemplateFromFile('dashboard');
  t.payload = JSON.stringify(query_(from, to, 'day')).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, '');
  return t.evaluate().setTitle('ラクガス図鑑 ダッシュボード').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/* ---------- 日付の道具（日本時間） ---------- */
const DAY = 86400000, JST = 9 * 3600000;
const pad_ = (n) => String(n).padStart(2, '0');
function ymd_(ts) { const j = new Date(ts + JST); return j.getUTCFullYear() + '-' + pad_(j.getUTCMonth() + 1) + '-' + pad_(j.getUTCDate()); }
function parseYmd_(s) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s)); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) - JST : NaN; }
/** 集計単位ごとの区切り：day=日 / week=月曜はじまりの週 / month=月 / year=年 */
function bucketOf_(ts, unit) {
  const j = new Date(ts + JST), y = j.getUTCFullYear(), m = j.getUTCMonth(), d = j.getUTCDate();
  if (unit === 'year') return { key: String(y), label: y + '年' };
  if (unit === 'month') return { key: y + '-' + pad_(m + 1), label: y + '年' + (m + 1) + '月' };
  if (unit === 'week') {
    const s = new Date(Date.UTC(y, m, d - ((j.getUTCDay() + 6) % 7)));
    return { key: s.getUTCFullYear() + '-' + pad_(s.getUTCMonth() + 1) + '-' + pad_(s.getUTCDate()), label: s.getUTCFullYear() + '/' + (s.getUTCMonth() + 1) + '/' + s.getUTCDate() + '〜' };
  }
  return { key: y + '-' + pad_(m + 1) + '-' + pad_(d), label: y + '/' + (m + 1) + '/' + d };
}
const money_ = (v) => { const n = typeof v === 'number' ? v : Number(String(v).replace(/[^\d.]/g, '')); return isFinite(n) && n > 0 ? Math.round(n) : 0; };
const planKey_ = (p) => { const s = String(p || '').replace(/^'/, ''); return /^単発/.test(s) ? '単発の作成' : /^継続/.test(s) ? '継続サポート・業務改善' : /相談/.test(s) ? 'まずは相談' : (s.split('（')[0] || '未選択'); };

/**
 * 集計（ダッシュボードの画面から google.script.run で呼ばれる）
 * @param {string} from 開始日 yyyy-MM-dd
 * @param {string} to   終了日 yyyy-MM-dd（この日を含む）
 * @param {string} unit day | week | month | year
 */
function dashboardQuery(from, to, unit) {
  if (!isAdmin_()) throw new Error('この操作は管理者だけができます。');
  return query_(from, to, unit);
}

function query_(from, to, unit) {
  unit = ['day', 'week', 'month', 'year'].indexOf(unit) >= 0 ? unit : 'day';
  const fromTs = parseYmd_(from), toTs = parseYmd_(to) + DAY - 1;
  if (!isFinite(fromTs) || !isFinite(toTs) || fromTs > toTs) return { error: '期間の指定が正しくありません。開始日が終了日より前になるように選んでください。' };
  const spanDays = Math.round((toTs + 1 - fromTs) / DAY);
  if (unit === 'day' && spanDays > 400) return { error: '「日ごと」は400日までです。期間を短くするか、週・月・年ごとに切り替えてください。' };
  if (spanDays > 3660) return { error: '期間は10年までにしてください。' };

  // 区切りの一覧（データがない区切りも0として並べる）
  const buckets = [], index = {};
  for (let ts = fromTs; ts <= toTs; ts += DAY) {
    const b = bucketOf_(ts, unit);
    if (index[b.key] == null) {
      index[b.key] = buckets.length;
      buckets.push({ key: b.key, label: b.label, v: {}, s: {}, pageviews: 0, reqOpen: {}, requests: 0, contract: 0, repeat: 0, hold: 0, lost: 0, open: 0, revenue: 0, priced: 0 });
    }
  }
  const at = (ts) => buckets[index[bucketOf_(ts, unit).key]];
  const inRange = (ts) => ts >= fromTs && ts <= toTs;

  /* ---- アクセス ---- */
  const log = SpreadsheetApp.openById(SHEET_ID).getSheetByName(LOG_SHEET);
  const raw = log && log.getLastRow() > 1 ? log.getRange(2, 1, log.getLastRow() - 1, LOG_HEADERS.length).getValues() : [];
  const E = [];
  raw.forEach((r) => {
    if (!(r[0] instanceof Date)) return;
    const ts = r[0].getTime();
    if (!inRange(ts)) return;
    E.push({ ts: ts, vid: String(r[1]), sid: String(r[2]), e: String(r[3]), t: String(r[4]).replace(/^'/, ''), v: String(r[5]).replace(/^'/, ''), device: String(r[7]) });
  });
  /* ---- 流入元（セッションの最初の表示で決める）・曜日×時間 ---- */
  const srcOf = {}, heat = [], heatNote = [];
  for (let i = 0; i < 7; i++) { heat.push(new Array(24).fill(0)); heatNote.push(new Array(24).fill(0)); }
  E.filter((x) => x.e === 'pageview').sort((a, b) => a.ts - b.ts).forEach((x) => {
    if (srcOf[x.sid]) return;
    srcOf[x.sid] = x.t + (x.v ? ' / ' + x.v : '');
    const j = new Date(x.ts + JST), wd = (j.getUTCDay() + 6) % 7, hr = j.getUTCHours();
    heat[wd][hr]++;
    if (/^note\b/.test(x.t)) heatNote[wd][hr]++;
  });
  E.forEach((x) => {
    const b = at(x.ts);
    b.v[x.vid] = 1; b.s[x.sid] = 1;
    if (x.e === 'pageview') b.pageviews++;
    if (x.e === 'req_open') b.reqOpen[x.sid] = 1;
  });
  const visitors = new Set(E.map((x) => x.vid)), sessions = new Set(E.map((x) => x.sid));
  const sessWith = (name, test) => new Set(E.filter((x) => x.e === name && (!test || test(x))).map((x) => x.sid));
  const top = (name, n, test) => {
    const m = {};
    E.filter((x) => x.e === name && x.t && (!test || test(x))).forEach((x) => { m[x.t] = (m[x.t] || 0) + 1; });
    return Object.keys(m).map((k) => [k, m[k]]).sort((a, b) => b[1] - a[1]).slice(0, n);
  };
  const stay = {};
  E.filter((x) => x.e === 'leave').forEach((x) => { const s = Number(x.v) || 0; if (s <= 10800) stay[x.sid] = Math.max(stay[x.sid] || 0, s); });
  const stayVals = Object.keys(stay).map((k) => stay[k]);
  const scr = {};
  E.filter((x) => x.e === 'scroll').forEach((x) => { scr[x.sid] = Math.max(scr[x.sid] || 0, Number(x.v) || 0); });
  const pvSessions = sessWith('pageview');
  const dev = {}, devices = {};
  E.filter((x) => x.e === 'pageview').forEach((x) => { if (!dev[x.sid]) dev[x.sid] = x.device || '不明'; });
  Object.keys(dev).forEach((k) => { devices[dev[k]] = (devices[dev[k]] || 0) + 1; });

  const SRC = {};
  const srcRow = (k) => SRC[k] || (SRC[k] = { key: k, sessions: {}, spec: {}, price: {}, form: {}, requests: 0, won: 0, revenue: 0 });
  Object.keys(srcOf).forEach((sid) => { srcRow(srcOf[sid]).sessions[sid] = 1; });
  E.forEach((x) => {
    const k = srcOf[x.sid]; if (!k) return;
    if (x.e === 'spec_open') srcRow(k).spec[x.sid] = 1;
    if (x.e === 'price_view') srcRow(k).price[x.sid] = 1;
    if (x.e === 'req_open') srcRow(k).form[x.sid] = 1;
  });

  /* ---- 依頼・商談・単価 ----
     依頼数・保留・未確定は「受付日」、契約・継続依頼・失注・売上は「確定日」（空なら受付日）で数える */
  const reqSh = sheet_();
  const R = reqSh.getLastRow() > 1 ? reqSh.getRange(2, 1, reqSh.getLastRow() - 1, HEADERS.length).getValues() : [];
  const T = { requests: 0, contract: 0, repeat: 0, hold: 0, lost: 0, open: 0, revenue: 0, priced: 0, unpriced: 0, holdValue: 0, openValue: 0 };
  const prices = [], plans = {};
  const recent = [];
  R.forEach((r) => {
    if (!(r[0] instanceof Date)) return;
    const rec = r[0].getTime();
    const deal = DEALS.indexOf(String(r[COL.deal - 1])) >= 0 ? String(r[COL.deal - 1]) : '未確定';
    const amount = money_(r[COL.amount - 1]);
    const decided = r[COL.decided - 1] instanceof Date ? r[COL.decided - 1].getTime() : rec;
    const srcKey = String(r[COL.source - 1] || '').replace(/^'/, '') || '（記録なし）';
    if (inRange(rec)) {
      const b = at(rec); b.requests++; T.requests++;
      srcRow(srcKey).requests++;
      if (deal === '保留') { b.hold++; T.hold++; T.holdValue += amount; }
      if (deal === '未確定') { b.open++; T.open++; T.openValue += amount; }
      recent.push({ ts: rec, date: Utilities.formatDate(r[0], 'Asia/Tokyo', 'yyyy/M/d'), name: String(r[COL.name - 1]).replace(/^'/, ''), plan: planKey_(r[COL.plan - 1]), deal: deal, amount: amount, status: String(r[COL.status - 1]), want: String(r[COL.want - 1]).replace(/^'/, '').slice(0, 70) });
    }
    if ((WON.indexOf(deal) >= 0 || deal === '失注') && inRange(decided)) {
      const b = at(decided);
      if (deal === '失注') { b.lost++; T.lost++; return; }
      if (deal === '契約') { b.contract++; T.contract++; } else { b.repeat++; T.repeat++; }
      srcRow(srcKey).won++; srcRow(srcKey).revenue += amount;
      const key = deal === '継続依頼' ? '継続依頼（月額）' : planKey_(r[COL.plan - 1]);
      const P = plans[key] || (plans[key] = { n: 0, priced: 0, total: 0, min: 0, max: 0 });
      P.n++;
      if (amount) {
        b.revenue += amount; b.priced++; T.revenue += amount; T.priced++; prices.push(amount);
        P.priced++; P.total += amount; P.min = P.min ? Math.min(P.min, amount) : amount; P.max = Math.max(P.max, amount);
      } else T.unpriced++;
    }
  });
  prices.sort((a, b) => a - b);
  const median = prices.length ? (prices.length % 2 ? prices[(prices.length - 1) / 2] : Math.round((prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2)) : 0;
  const won = T.contract + T.repeat;

  return {
    generated: Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm'),
    range: { from: from, to: to, unit: unit, days: spanDays },
    buckets: buckets.map((b) => ({
      key: b.key, label: b.label, visitors: Object.keys(b.v).length, sessions: Object.keys(b.s).length, pageviews: b.pageviews,
      reqOpen: Object.keys(b.reqOpen).length, requests: b.requests, contract: b.contract, repeat: b.repeat, hold: b.hold, lost: b.lost, open: b.open,
      revenue: b.revenue, priced: b.priced,
    })),
    access: {
      visitors: visitors.size, sessions: sessions.size, pageviews: E.filter((x) => x.e === 'pageview').length,
      avgStay: stayVals.length ? Math.round(stayVals.reduce((a, b) => a + b, 0) / stayVals.length) : 0,
      reqOpen: sessWith('req_open').size,
      funnel: [['サイトを訪れた', pvSessions.size], ['標本を開いた', sessWith('spec_open').size], ['依頼フォームを開いた', sessWith('req_open').size], ['依頼を送った', sessWith('req_submit', (x) => x.v === '1').size]],
      specimens: top('spec_open', 10), searches: top('search', 10), noHit: top('search', 10, (x) => x.v === '0'),
      scenes: top('scene', 6), reqFrom: top('req_open', 8), refs: top('pageview', 8), filters: top('filter', 10),
      devices: Object.keys(devices).map((k) => [k, devices[k]]).sort((a, b) => b[1] - a[1]),
      scroll: [25, 50, 75, 100].map((m) => [m + '%', Object.keys(scr).filter((k) => scr[k] >= m).length]),
      scrollBase: Object.keys(scr).length || pvSessions.size,
      submitFail: E.filter((x) => x.e === 'req_submit' && x.v === '0').length,
    },
    deals: Object.assign(T, {
      won: won, winRate: won + T.lost ? Math.round((won / (won + T.lost)) * 1000) / 10 : null,
      avgPrice: T.priced ? Math.round(T.revenue / T.priced) : 0, medianPrice: median,
      minPrice: prices[0] || 0, maxPrice: prices[prices.length - 1] || 0,
    }),
    sources: Object.keys(SRC).map((k) => { const x = SRC[k]; return { key: k, sessions: Object.keys(x.sessions).length, spec: Object.keys(x.spec).length, price: Object.keys(x.price).length, form: Object.keys(x.form).length, requests: x.requests, won: x.won, revenue: x.revenue }; })
      .sort((a, b) => b.revenue - a.revenue || b.requests - a.requests || b.sessions - a.sessions).slice(0, 30),
    journey: [
      ['サイトを訪れた', pvSessions.size],
      ['標本を開いた', sessWith('spec_open').size],
      ['料金を見た', sessWith('price_view').size],
      ['依頼フォームを開いた', sessWith('req_open').size],
      ['依頼が届いた', T.requests],
      ['成約した', won],
      ['継続依頼', T.repeat],
    ],
    heat: heat, heatNote: heatNote,
    plans: Object.keys(plans).map((k) => { const P = plans[k]; return [k, P.n, P.priced, P.total, P.priced ? Math.round(P.total / P.priced) : 0, P.min, P.max]; }).sort((a, b) => b[3] - a[3]),
    recent: recent.sort((a, b) => b.ts - a.ts).slice(0, 8),
    sheetUrl: SpreadsheetApp.openById(SHEET_ID).getUrl(),
    siteUrl: SITE_URL,
  };
}


/* =========================================================
   記事のネタ（毎朝、Googleドキュメントに書き出す）
   note下書きを作るルーティンが、このドキュメントを読んでテーマを選びます。
   名前・連絡先は書き出しません。
   ========================================================= */
function updateTopics() {
  const to = ymd_(Date.now()), from = ymd_(Date.now() - 29 * DAY);
  const q = query_(from, to, 'week');
  // 週次の比較（直近7日 と その前の7日）
  const w1 = query_(ymd_(Date.now() - 6 * DAY), to, 'week');
  const w0 = query_(ymd_(Date.now() - 13 * DAY), ymd_(Date.now() - 7 * DAY), 'week');
  const delta = (a, b) => a + '（前週 ' + b + '）';
  const jline = (q2) => q2.journey.map((s) => s[0] + ' ' + s[1]).join(' → ');
  const DOW = ['月', '火', '水', '木', '金', '土', '日'];
  const slots = (h) => { const L = []; h.forEach((row, d) => row.forEach((n, hr) => { if (n) L.push([DOW[d] + '曜 ' + hr + '時台', n]); })); return L.sort((a, b) => b[1] - a[1]).slice(0, 5); };
  const A = q.access;
  const list = (rows, unit) => (rows && rows.length ? rows.map((r) => '- ' + r[0] + '（' + r[1] + (unit || '回') + '）').join('\n') : '- （まだ記録がありません）');

  // 依頼の「参考にした標本」と「自動化したいこと」（直近90日・名前と連絡先は除く）
  const since = Date.now() - 90 * DAY;
  const R = sheet_().getLastRow() > 1 ? sheet_().getRange(2, 1, sheet_().getLastRow() - 1, HEADERS.length).getValues() : [];
  const refCount = {}, wantCount = {};
  R.forEach((r) => {
    if (!(r[0] instanceof Date) || r[0].getTime() < since) return;
    const ref = String(r[10]).replace(/^'/, '').trim();
    if (ref) refCount[ref] = (refCount[ref] || 0) + 1;
    const w = String(r[COL.want - 1]).replace(/^'/, '').replace(/\s+/g, ' ').trim();
    if (w) { const k = w.slice(0, 120); wantCount[k] = (wantCount[k] || 0) + 1; }
  });
  const wants = Object.keys(wantCount).sort((a, b) => wantCount[b] - wantCount[a]).slice(0, 20).map((k) => '- ' + k + (wantCount[k] > 1 ? '（' + wantCount[k] + '件）' : ''));
  const refs = Object.keys(refCount).map((k) => [k, refCount[k]]).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const text = [
    'ラクガス図鑑 記事のネタと数字（自動更新）',
    '更新：' + q.generated,
    '',
    '■■ 週次の数字（直近7日：' + w1.range.from + '〜' + w1.range.to + '／前週と比較）',
    '- 訪問者 ' + delta(w1.access.visitors, w0.access.visitors) + '／セッション ' + delta(w1.access.sessions, w0.access.sessions),
    '- 依頼 ' + delta(w1.deals.requests, w0.deals.requests) + '／成約 ' + delta(w1.deals.won, w0.deals.won) + '／失注 ' + delta(w1.deals.lost, w0.deals.lost),
    '- 売上 ' + delta(w1.deals.revenue, w0.deals.revenue) + '円／平均単価 ' + w1.deals.avgPrice + '円／見込み ' + (w1.deals.holdValue + w1.deals.openValue) + '円',
    '- 導線（直近7日）：' + jline(w1),
    '- 導線（前週）：' + jline(w0),
    '',
    '■■ 流入元・記事ごとの成果（直近30日：流入元 / 記事名｜セッション｜標本｜料金｜フォーム｜依頼｜成約｜売上）',
    q.sources.length ? q.sources.slice(0, 15).map((x) => '- ' + x.key + '｜' + x.sessions + '｜' + x.spec + '｜' + x.price + '｜' + x.form + '｜' + x.requests + '｜' + x.won + '｜' + x.revenue + '円').join('\n') : '- （まだ記録がありません）',
    '',
    '■■ 訪問が多い曜日と時間（直近30日・セッションの開始）',
    '- 全体：' + (slots(q.heat).map((x) => x[0] + '（' + x[1] + '）').join('、') || 'まだ記録がありません'),
    '- note経由：' + (slots(q.heatNote).map((x) => x[0] + '（' + x[1] + '）').join('、') || 'まだ記録がありません'),
    ...threadsLines_(q),
    '',
    '■■ 記事のネタ（直近30日）',
    '',
    '■ 見つからなかった検索（結果0件。図鑑にない＝求められているテーマ）',
    list(A.noHit),
    '',
    '■ よく検索された言葉',
    list(A.searches),
    '',
    '■ よく開かれた標本',
    list(A.specimens),
    '',
    '■ 依頼で「参考にした標本」（直近90日）',
    list(refs, '件'),
    '',
    '■ 依頼で寄せられた「自動化したいこと」（直近90日・多い順に20件）',
    wants.join('\n') || '- （まだ依頼はありません）',
    '',
    '■ 参考：どこから来たか',
    list(A.refs),
    '',
    '■ 参考：直近30日のアクセス',
    '- 訪問者 ' + A.visitors + '人／セッション ' + A.sessions + '回／依頼 ' + q.deals.requests + '件／成約 ' + q.deals.won + '件／売上 ' + q.deals.revenue + '円',
  ].join('\n');
  DocumentApp.openById(TOPICS_DOC_ID).getBody().setText(text);
}

/** Threads の成績（threads.gs があるときだけ。失敗しても記事のネタの更新は止めない） */
function threadsLines_(q) {
  if (typeof threadsSummary_ !== 'function') return [];
  try { return threadsSummary_(q); } catch (err) { return ['', '■■ Threads の投稿と成績', '- （読み取りに失敗：' + String(err.message || err).slice(0, 80) + '）']; }
}
