/* =========================================================
   ラクガス図鑑 — Threads への予約投稿（承認したものだけ）
   ---------------------------------------------------------
   流れ
   1. 定期タスク（Claude）が、毎週の投稿文の下書き（CSV）を
      Googleドライブ「ラクガス図鑑 Threads下書き」フォルダに置く
   2. importThreadsDrafts が1時間ごとに、それを「Threads投稿」シートに取り込む
   3. あなたがシートの「承認」にチェックを入れる
   4. postDueThreads が15分ごとに、承認済みで予定時刻を過ぎた行を
      Threads の公式APIで投稿する（承認していない行は投稿しない）
   5. updateThreadsInsights が毎朝、投稿ごとのビュー・いいね等を記録する
   6. refreshThreadsToken が毎週、アクセストークンの期限を延ばす

   準備：プロジェクトの設定 → スクリプト プロパティ に
         THREADS_TOKEN（Threads の長期アクセストークン）を保存してから、
         setupThreads を1回実行する。
   トークンはコードやシートに書かないこと。
   ========================================================= */

const TH_SHEET = 'Threads投稿';
const TH_HEADERS = ['予定日時', '本文', 'リンク', '種類', '投稿ID（utm_campaign）', '承認', '状態', '投稿日時', 'ThreadsのID',
  'ビュー', 'いいね', '返信', 'リポスト', '引用', '数字の更新', '狙い・メモ', '取り込み元'];
const TH = { at: 1, text: 2, link: 3, kind: 4, pid: 5, ok: 6, st: 7, posted: 8, mid: 9,
  views: 10, likes: 11, replies: 12, reposts: 13, quotes: 14, upd: 15, memo: 16, src: 17 };
const TH_DRAFT_FOLDER = '16ldxCr7zC_kxZ0rRys-stz8dHM5g7rCo';   // ドライブ「ラクガス図鑑 Threads下書き」
const TH_API = 'https://graph.threads.net/v1.0';
const TH_MAX_LEN = 500;            // Threads の1投稿の上限（文字）
const TH_LATE_LIMIT = 3 * 3600000; // 予定時刻を3時間過ぎても投稿できなかったものは見送る
const TH_WAIT = '承認待ち', TH_DONE = '投稿済み';

/** 最初に1回だけ実行：シートとトリガーを用意し、トークンが使えるか確かめる */
function setupThreads() {
  guardAdmin_();
  const sh = thSheet_();
  sh.getRange(1, 1, 1, TH_HEADERS.length).setValues([TH_HEADERS]).setFontWeight('bold').setBackground('#1a2747').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  const rows = sh.getMaxRows() - 1;
  sh.getRange(2, TH.ok, rows, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
  sh.getRange(2, TH.at, rows, 1).setNumberFormat('yyyy/mm/dd(ddd) hh:mm');
  sh.getRange(2, TH.posted, rows, 1).setNumberFormat('yyyy/mm/dd hh:mm');
  sh.getRange(2, TH.upd, rows, 1).setNumberFormat('yyyy/mm/dd hh:mm');
  sh.getRange(2, TH.text, rows, 1).setWrap(true);
  [150, 420, 260, 90, 150, 50, 110, 130, 150, 60, 60, 60, 60, 60, 130, 220, 200].forEach((w, i) => sh.setColumnWidth(i + 1, w));
  sh.getRange(1, TH.ok).setBackground('#17784a');

  const want = { postDueThreads: (b) => b.everyMinutes(15), importThreadsDrafts: (b) => b.everyHours(1),
    updateThreadsInsights: (b) => b.everyDays(1).atHour(5), refreshThreadsToken: (b) => b.onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(4) };
  const have = ScriptApp.getProjectTriggers().map((t) => t.getHandlerFunction());
  Object.keys(want).forEach((fn) => { if (have.indexOf(fn) < 0) want[fn](ScriptApp.newTrigger(fn).timeBased()).create(); });

  const me = thFetch_('get', '/me', { fields: 'id,username' });
  PropertiesService.getScriptProperties().setProperty('THREADS_USER_ID', me.id);
  importThreadsDrafts();
  Logger.log('Threads の準備ができました：@' + me.username + ' として投稿します');
}

/** 下書きフォルダの CSV を「Threads投稿」シートに取り込む（承認はまだ入れない） */
function importThreadsDrafts() {
  const folder = DriveApp.getFolderById(TH_DRAFT_FOLDER);
  const sh = thSheet_();
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const known = new Set(sh.getLastRow() > 1 ? sh.getRange(2, TH.pid, sh.getLastRow() - 1, 1).getValues().flat().map(String) : []);
    const files = folder.getFiles();
    while (files.hasNext()) {
      const f = files.next();
      if (/^【取込済み】/.test(f.getName())) continue;
      const table = thReadTable_(f);
      if (!table.length) continue;
      const head = table[0].map((h) => String(h).trim());
      const col = (name) => head.findIndex((h) => h.indexOf(name) === 0);
      const c = { at: col('予定日時'), text: col('本文'), link: col('リンク'), kind: col('種類'), pid: col('投稿ID'), memo: col('狙い') };
      if (c.at < 0 || c.text < 0 || c.pid < 0) { f.setName('【取込エラー：見出しが違います】' + f.getName()); continue; }
      const out = [];
      table.slice(1).forEach((r) => {
        const pid = String(r[c.pid] || '').trim().replace(/[^\w-]/g, '').slice(0, 40);
        const at = thParseJst_(r[c.at]);
        const text = String(r[c.text] || '').trim();
        if (!pid || !at || !text || known.has(pid)) return;
        known.add(pid);
        const row = new Array(TH_HEADERS.length).fill('');
        row[TH.at - 1] = at; row[TH.text - 1] = thSafe_(text); row[TH.link - 1] = thSafe_(String(r[c.link] || '').trim());
        row[TH.kind - 1] = thSafe_(String(c.kind >= 0 ? r[c.kind] : '').trim()); row[TH.pid - 1] = pid; row[TH.ok - 1] = false;
        row[TH.st - 1] = TH_WAIT; row[TH.memo - 1] = thSafe_(String(c.memo >= 0 ? r[c.memo] : '').trim()); row[TH.src - 1] = f.getName();
        out.push(row);
      });
      if (out.length) {
        const start = sh.getLastRow() + 1;
        sh.getRange(start, 1, out.length, TH_HEADERS.length).setValues(out);
        sh.getRange(start, TH.ok, out.length, 1).insertCheckboxes();
      }
      f.setName('【取込済み】' + f.getName());
    }
  } finally { lock.releaseLock(); }
}

/** 承認済みで予定時刻を過ぎた行を投稿する（1回に2件まで） */
function postDueThreads() {
  const sh = thSheet_();
  if (sh.getLastRow() < 2) return;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    const now = Date.now();
    const rows = sh.getRange(2, 1, sh.getLastRow() - 1, TH_HEADERS.length).getValues();
    let posted = 0;
    for (let i = 0; i < rows.length && posted < 2; i++) {
      const r = rows[i], rowNo = i + 2;
      if (r[TH.st - 1] !== TH_WAIT || !(r[TH.at - 1] instanceof Date) || r[TH.at - 1].getTime() > now) continue;
      if (r[TH.ok - 1] !== true) {                                     // 承認されないまま予定時刻を過ぎた
        if (now - r[TH.at - 1].getTime() > TH_LATE_LIMIT) sh.getRange(rowNo, TH.st).setValue('見送り（未承認）');
        continue;
      }
      if (now - r[TH.at - 1].getTime() > TH_LATE_LIMIT) { sh.getRange(rowNo, TH.st).setValue('見送り（予定時刻を過ぎた）'); continue; }
      const text = String(r[TH.text - 1]).trim() + (r[TH.link - 1] ? '\n' + String(r[TH.link - 1]).trim() : '');
      if ([...text].length > TH_MAX_LEN) { sh.getRange(rowNo, TH.st).setValue('エラー：500文字を超えています'); continue; }
      sh.getRange(rowNo, TH.st).setValue('投稿中');
      try {
        const id = thPublish_(text);
        sh.getRange(rowNo, TH.st, 1, 3).setValues([[TH_DONE, new Date(), id]]);
        posted++;
      } catch (err) {
        sh.getRange(rowNo, TH.st).setValue('エラー：' + String(err.message || err).slice(0, 120));
        console.error('Threads への投稿に失敗', err);
      }
    }
  } finally { lock.releaseLock(); }
}

/** 投稿ごとのビュー・いいね・返信・リポスト・引用を記録する（投稿から30日まで） */
function updateThreadsInsights() {
  const sh = thSheet_();
  if (sh.getLastRow() < 2) return;
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, TH_HEADERS.length).getValues();
  const since = Date.now() - 30 * DAY;
  rows.forEach((r, i) => {
    if (r[TH.st - 1] !== TH_DONE || !r[TH.mid - 1] || !(r[TH.posted - 1] instanceof Date) || r[TH.posted - 1].getTime() < since) return;
    try {
      const res = thFetch_('get', '/' + encodeURIComponent(r[TH.mid - 1]) + '/insights', { metric: 'views,likes,replies,reposts,quotes' });
      const v = {};
      (res.data || []).forEach((m) => { v[m.name] = m.total_value ? m.total_value.value : (m.values && m.values[0] ? m.values[0].value : 0); });
      sh.getRange(i + 2, TH.views, 1, 6).setValues([[v.views || 0, v.likes || 0, v.replies || 0, v.reposts || 0, v.quotes || 0, new Date()]]);
    } catch (err) { console.error('Threads の数字の取得に失敗', err); }
  });
}

/** 長期アクセストークンの期限（60日）を延ばす。毎週日曜の朝に自動で動く */
function refreshThreadsToken() {
  const props = PropertiesService.getScriptProperties();
  const res = UrlFetchApp.fetch('https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=' +
    encodeURIComponent(thToken_()), { muteHttpExceptions: true });
  const body = JSON.parse(res.getContentText() || '{}');
  if (res.getResponseCode() !== 200 || !body.access_token) {
    MailApp.sendEmail(notifyTo_(), '【ラクガス図鑑】Threads のトークンを延長できませんでした',
      'Threads のアクセストークンの期限を延ばせませんでした。期限が切れると投稿が止まります。\n' +
      'Meta の開発者ページで新しい長期アクセストークンを作り、スクリプト プロパティの THREADS_TOKEN を書き換えてください。', { name: 'ラクガス図鑑' });
    return;
  }
  props.setProperty('THREADS_TOKEN', body.access_token);
}

/** 「記事のネタと数字」ドキュメントに載せる Threads の成績（updateTopics から呼ばれる） */
function threadsSummary_(q) {
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TH_SHEET);
  const L = ['', '■■ Threads の投稿と成績（直近30日・投稿済み｜曜日と時間｜種類｜ビュー｜いいね｜返信｜リポスト｜サイト訪問｜依頼）'];
  if (!sh || sh.getLastRow() < 2) return L.concat(['- （まだ投稿がありません）']);
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, TH_HEADERS.length).getValues();
  const DOW = ['日', '月', '火', '水', '木', '金', '土'];
  const src = {}; (q.sources || []).forEach((x) => { src[x.key] = x; });
  const since = Date.now() - 30 * DAY;
  const done = rows.filter((r) => r[TH.st - 1] === TH_DONE && r[TH.posted - 1] instanceof Date && r[TH.posted - 1].getTime() >= since);
  const jst = (d) => new Date(d.getTime() + JST);
  const slotOf = (d) => { const j = jst(d); const h = j.getUTCHours(); return DOW[j.getUTCDay()] + '曜 ' + h + '時台'; };
  const band = (d) => { const h = jst(d).getUTCHours(); return h < 10 ? '朝（〜9時台）' : h < 15 ? '昼（10〜14時台）' : h < 19 ? '夕方（15〜18時台）' : '夜（19時台〜）'; };
  const weekend = (d) => { const w = jst(d).getUTCDay(); return w === 0 || w === 6 ? '土日' : '平日'; };
  done.forEach((r) => {
    const s = src['threads / ' + r[TH.pid - 1]] || { sessions: 0, requests: 0 };
    L.push('- ' + r[TH.pid - 1] + '｜' + slotOf(r[TH.posted - 1]) + '｜' + (r[TH.kind - 1] || '-') + '｜' + (r[TH.views - 1] || 0) + '｜' + (r[TH.likes - 1] || 0) + '｜' +
      (r[TH.replies - 1] || 0) + '｜' + (r[TH.reposts - 1] || 0) + '｜' + s.sessions + '｜' + s.requests);
  });
  if (!done.length) L.push('- （直近30日の投稿はまだありません）');
  // 時間帯ごとのまとめ（ビューの中央値。投稿から3日以上たったものだけで比べる）
  const groups = {};
  done.filter((r) => Date.now() - r[TH.posted - 1].getTime() >= 3 * DAY).forEach((r) => {
    const k = weekend(r[TH.posted - 1]) + '・' + band(r[TH.posted - 1]);
    (groups[k] = groups[k] || []).push(Number(r[TH.views - 1]) || 0);
  });
  const med = (a) => { const s = a.slice().sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };
  L.push('', '■ Threads の時間帯ごとのビュー（投稿から3日以上たったもの・中央値／本数）');
  const keys = Object.keys(groups).sort((a, b) => med(groups[b]) - med(groups[a]));
  L.push(keys.length ? keys.map((k) => '- ' + k + '：' + med(groups[k]) + '（' + groups[k].length + '本）').join('\n') : '- （比べられる投稿がまだありません）');
  const waiting = rows.filter((r) => r[TH.st - 1] === TH_WAIT);
  L.push('', '■ Threads の予定：承認済み ' + waiting.filter((r) => r[TH.ok - 1] === true).length + '本／承認待ち ' + waiting.filter((r) => r[TH.ok - 1] !== true).length + '本／' +
    '見送り（直近30日） ' + rows.filter((r) => /^見送り/.test(String(r[TH.st - 1])) && r[TH.at - 1] instanceof Date && r[TH.at - 1].getTime() >= since).length + '本');
  return L;
}

/* ---------- 内部で使う道具 ---------- */
function thSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  return ss.getSheetByName(TH_SHEET) || ss.insertSheet(TH_SHEET);
}
function thToken_() {
  const t = PropertiesService.getScriptProperties().getProperty('THREADS_TOKEN');
  if (!t) throw new Error('スクリプト プロパティに THREADS_TOKEN がありません');
  return t;
}
function thUserId_() {
  return PropertiesService.getScriptProperties().getProperty('THREADS_USER_ID') || 'me';
}
/** Threads API を呼ぶ。トークンはエラー文に含めない */
function thFetch_(method, path, params) {
  const p = Object.assign({}, params || {}, { access_token: thToken_() });
  const qs = (o) => Object.keys(o).map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(o[k])).join('&');
  const res = method === 'post'
    ? UrlFetchApp.fetch(TH_API + path, { method: 'post', payload: p, muteHttpExceptions: true })
    : UrlFetchApp.fetch(TH_API + path + '?' + qs(p), { muteHttpExceptions: true });
  let body = {};
  try { body = JSON.parse(res.getContentText() || '{}'); } catch (e) { /* 何もしない */ }
  if (res.getResponseCode() !== 200 || body.error) {
    throw new Error('Threads API ' + res.getResponseCode() + '：' + ((body.error && body.error.message) || '応答を読み取れませんでした'));
  }
  return body;
}
/** 投稿の2段階：入れ物を作る → 準備ができたら公開する */
function thPublish_(text) {
  const uid = thUserId_();
  const c = thFetch_('post', '/' + uid + '/threads', { media_type: 'TEXT', text: text });
  for (let i = 0; i < 8; i++) {                       // 準備ができるのを最大40秒待つ
    Utilities.sleep(5000);
    const s = thFetch_('get', '/' + c.id, { fields: 'status,error_message' });
    if (s.status === 'FINISHED') break;
    if (s.status === 'ERROR' || s.status === 'EXPIRED') throw new Error('投稿の準備に失敗：' + (s.error_message || s.status));
  }
  return thFetch_('post', '/' + uid + '/threads_publish', { creation_id: c.id }).id;
}
function thReadTable_(f) {
  const type = f.getMimeType();
  if (type === MimeType.GOOGLE_SHEETS) return SpreadsheetApp.openById(f.getId()).getSheets()[0].getDataRange().getValues();
  if (/csv|plain/.test(type)) return Utilities.parseCsv(f.getBlob().getDataAsString('UTF-8').replace(/^﻿/, ''));
  return [];
}
/** "2026-11-10 12:15" を日本時間として読む */
function thParseJst_(v) {
  if (v instanceof Date) return v;
  const m = /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})[ T](\d{1,2}):(\d{2})/.exec(String(v).trim());
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - JST) : null;
}
/** 先頭が「=」などだと数式として動くため、文字として保存する */
function thSafe_(v) { return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v; }
