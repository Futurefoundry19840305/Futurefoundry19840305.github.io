/* ラクガス図鑑のデータ（標本・アイコン・シアターの場面）
   save: 時間削減のめやす（man=1回の手作業の分数, per=年間の回数） */
window.ZUKAN = {
 "specimens": [
  {
   "s": "スプレッドシート",
   "t": "表のデータを自動で集計する",
   "d": "毎日の売上や経費を、ボタン一つで合計・分類します。",
   "lv": 1,
   "use": "経費一覧から月別・科目別の合計表を作る。",
   "code": "function sumByMonth(){\n  const sh = SpreadsheetApp.getActiveSheet();\n  const rows = sh.getDataRange().getValues().slice(1);\n  const total = {};\n  rows.forEach(r => {\n    const m = Utilities.formatDate(r[0],'JST','yyyy-MM');\n    total[m] = (total[m]||0) + r[2];\n  });\n  Logger.log(total);\n}",
   "save": {
    "man": 30,
    "per": 12,
    "perT": "月1回",
    "how": "経費一覧を見ながら、月別・科目別に手で集計"
   }
  },
  {
   "s": "スプレッドシート",
   "t": "オリジナルのメニューを追加",
   "d": "シートの上部に自分専用のボタンメニューを作れます。",
   "lv": 1,
   "use": "「集計する」「メール送信」をメニューから実行。",
   "code": "function onOpen(){\n  SpreadsheetApp.getUi().createMenu('便利ツール')\n    .addItem('集計する','sumByMonth')\n    .addToUi();\n}",
   "save": {
    "man": 1,
    "per": 240,
    "perT": "営業日の毎日",
    "how": "エディタを開いて目的の処理を探して実行"
   }
  },
  {
   "s": "スプレッドシート",
   "t": "自分だけの関数を作る",
   "d": "=税込(A2) のように、オリジナル関数をセルで使えます。",
   "lv": 1,
   "use": "税込計算や和暦変換などをセルの関数にする。",
   "code": "function 税込(price){\n  return Math.round(price * 1.1);\n}\n// セルに =税込(A2) と入力",
   "save": {
    "man": 0.5,
    "per": 1000,
    "perT": "年1,000件",
    "how": "税込や和暦を電卓で計算して入力"
   }
  },
  {
   "s": "スプレッドシート",
   "t": "複数シートを1つにまとめる",
   "d": "部署別・月別のシートを1枚に自動で集めます。",
   "lv": 2,
   "use": "12か月分のシートを年間シートに統合。",
   "code": "function merge(){\n  const ss = SpreadsheetApp.getActive();\n  let all = [];\n  ss.getSheets().filter(s=>s.getName()!=='まとめ')\n    .forEach(s=>all = all.concat(s.getDataRange().getValues().slice(1)));\n  const out = ss.getSheetByName('まとめ');\n  out.getRange(2,1,all.length,all[0].length).setValues(all);\n}",
   "save": {
    "man": 60,
    "per": 12,
    "perT": "月1回",
    "how": "12か月分のシートを開いてコピー＆貼り付け"
   }
  },
  {
   "s": "Gmail",
   "t": "メールを一斉に自動送信",
   "d": "シートの名前とアドレスを使って、一人ずつ宛名入りメールを送ります。",
   "lv": 1,
   "use": "お客様への案内、請求のお知らせ。",
   "code": "function sendAll(){\n  const rows = SpreadsheetApp.getActiveSheet()\n    .getDataRange().getValues().slice(1);\n  rows.forEach(([name, mail]) => {\n    GmailApp.sendEmail(mail, 'ご案内',\n      name + ' 様\\n\\nいつもありがとうございます。');\n  });\n}",
   "save": {
    "man": 30,
    "per": 12,
    "perT": "月1回",
    "how": "30人に宛名を変えながら1通ずつ送信"
   }
  },
  {
   "s": "Gmail",
   "t": "届いたメールをシートに記録",
   "d": "特定の件名や送り主のメールを、表に自動で書き出します。",
   "lv": 2,
   "use": "問い合わせメールや注文メールの一覧化。",
   "code": "function logMail(){\n  const sh = SpreadsheetApp.getActiveSheet();\n  GmailApp.search('subject:注文 newer_than:1d')\n    .forEach(th => th.getMessages().forEach(m =>\n      sh.appendRow([m.getDate(), m.getFrom(), m.getSubject()])));\n}",
   "save": {
    "man": 2,
    "per": 1200,
    "perT": "月100件",
    "how": "メールを開いて日時・送り主・件名を表に転記"
   }
  },
  {
   "s": "Gmail",
   "t": "添付ファイルをドライブに保存",
   "d": "メールのPDFや画像を、自動でフォルダに保存します。",
   "lv": 2,
   "use": "領収書・請求書PDFの保管を自動化。",
   "code": "function saveAttach(){\n  const folder = DriveApp.getFolderById('フォルダID');\n  GmailApp.search('has:attachment 領収書 newer_than:1d')\n    .forEach(th => th.getMessages().forEach(m =>\n      m.getAttachments().forEach(a => folder.createFile(a))));\n}",
   "save": {
    "man": 1,
    "per": 600,
    "perT": "月50件",
    "how": "添付を開いて保存先フォルダに移す"
   }
  },
  {
   "s": "Gmail",
   "t": "メールに自動でラベル付け",
   "d": "条件に合うメールを仕分けて整理します。",
   "lv": 2,
   "use": "取引先ごとにラベルを付けて見逃しを防ぐ。",
   "code": "function labeling(){\n  const label = GmailApp.getUserLabelByName('取引先A')\n    || GmailApp.createLabel('取引先A');\n  GmailApp.search('from:@example.co.jp is:unread')\n    .forEach(th => th.addLabel(label));\n}",
   "save": {
    "man": 5,
    "per": 240,
    "perT": "営業日の毎日",
    "how": "受信箱を見て取引先ごとに振り分け"
   }
  },
  {
   "s": "カレンダー",
   "t": "シートから予定を一括登録",
   "d": "表に書いた予定を、まとめてGoogleカレンダーに入れます。",
   "lv": 1,
   "use": "年間行事・シフト表をカレンダーへ。",
   "code": "function addEvents(){\n  const cal = CalendarApp.getDefaultCalendar();\n  SpreadsheetApp.getActiveSheet().getDataRange()\n    .getValues().slice(1)\n    .forEach(([title,start,end]) =>\n      cal.createEvent(title, start, end));\n}",
   "save": {
    "man": 60,
    "per": 4,
    "perT": "年4回",
    "how": "行事やシフトを1件ずつカレンダーに入力"
   }
  },
  {
   "s": "カレンダー",
   "t": "今日の予定を朝に通知",
   "d": "毎朝、その日の予定一覧をメールで届けます。",
   "lv": 2,
   "use": "出勤前に1日の予定を確認。",
   "code": "function todayPlan(){\n  const ev = CalendarApp.getDefaultCalendar()\n    .getEventsForDay(new Date());\n  const body = ev.map(e =>\n    Utilities.formatDate(e.getStartTime(),'JST','HH:mm')\n    + ' ' + e.getTitle()).join('\\n');\n  GmailApp.sendEmail(Session.getActiveUser().getEmail(),\n    '今日の予定', body || '予定はありません');\n}",
   "save": {
    "man": 5,
    "per": 240,
    "perT": "営業日の毎朝",
    "how": "カレンダーを開いて今日の予定を確認"
   }
  },
  {
   "s": "ドライブ",
   "t": "ファイル一覧を表にする",
   "d": "フォルダの中身（名前・URL・更新日）を一覧にします。",
   "lv": 1,
   "use": "共有フォルダの棚卸し。",
   "code": "function listFiles(){\n  const sh = SpreadsheetApp.getActiveSheet();\n  const it = DriveApp.getFolderById('フォルダID').getFiles();\n  while(it.hasNext()){\n    const f = it.next();\n    sh.appendRow([f.getName(), f.getUrl(), f.getLastUpdated()]);\n  }\n}",
   "save": {
    "man": 60,
    "per": 4,
    "perT": "年4回",
    "how": "フォルダを開いて名前・URL・日付を書き出し"
   }
  },
  {
   "s": "ドライブ",
   "t": "フォルダを自動で作成・整理",
   "d": "月ごと・顧客ごとのフォルダを一気に作ります。",
   "lv": 1,
   "use": "「2026-01」〜「2026-12」のフォルダ作成。",
   "code": "function makeFolders(){\n  const parent = DriveApp.getFolderById('フォルダID');\n  for(let m=1; m<=12; m++){\n    parent.createFolder('2026-' + String(m).padStart(2,'0'));\n  }\n}",
   "save": {
    "man": 20,
    "per": 1,
    "perT": "年1回",
    "how": "12か月分のフォルダを1つずつ作成"
   }
  },
  {
   "s": "ドライブ",
   "t": "定期的にバックアップ",
   "d": "大事なシートのコピーを毎日自動で残します。",
   "lv": 1,
   "use": "誤って消しても戻せる安心の保険。",
   "code": "function backup(){\n  const file = DriveApp.getFileById(\n    SpreadsheetApp.getActive().getId());\n  const day = Utilities.formatDate(new Date(),'JST','yyyyMMdd');\n  file.makeCopy('バックアップ_' + day);\n}",
   "save": {
    "man": 3,
    "per": 240,
    "perT": "営業日の毎日",
    "how": "大事なシートを手でコピーして保存"
   }
  },
  {
   "s": "ドキュメント",
   "t": "ひな形から書類を自動作成",
   "d": "請求書や契約書のひな形に、名前や金額を差し込みます。",
   "lv": 2,
   "use": "顧客ごとの請求書・案内状を量産。",
   "code": "function makeDoc(){\n  const copy = DriveApp.getFileById('ひな形ID')\n    .makeCopy('請求書_山田様');\n  const body = DocumentApp.openById(copy.getId()).getBody();\n  body.replaceText('{{名前}}','山田 太郎');\n  body.replaceText('{{金額}}','55,000円');\n}",
   "save": {
    "man": 10,
    "per": 240,
    "perT": "月20件",
    "how": "ひな形をコピーして名前や金額を書き換え"
   }
  },
  {
   "s": "ドキュメント",
   "t": "PDFに変換して保存・送信",
   "d": "作った書類をPDFにして、保存やメール添付をします。",
   "lv": 2,
   "use": "請求書PDFをそのままメール送付。",
   "code": "function toPdf(){\n  const pdf = DriveApp.getFileById('ドキュメントID')\n    .getAs('application/pdf');\n  GmailApp.sendEmail('to@example.com','請求書送付',\n    '請求書をお送りします。',{attachments:[pdf]});\n}",
   "save": {
    "man": 5,
    "per": 240,
    "perT": "月20件",
    "how": "PDFに書き出してメールに添付して送信"
   }
  },
  {
   "s": "フォーム",
   "t": "回答が来たら自動で返信",
   "d": "Googleフォームに回答した人に、お礼メールを送ります。",
   "lv": 2,
   "use": "申込受付・アンケートのお礼。",
   "code": "// トリガー「フォーム送信時」に設定\nfunction onSubmit(e){\n  const mail = e.response.getRespondentEmail();\n  GmailApp.sendEmail(mail,'受付完了',\n    'お申し込みありがとうございました。');\n}",
   "save": {
    "man": 3,
    "per": 300,
    "perT": "年300件",
    "how": "申込を確認してお礼メールを手で送信"
   }
  },
  {
   "s": "フォーム",
   "t": "フォームを自動で作る",
   "d": "質問リストから、アンケートフォームを一瞬で作成します。",
   "lv": 2,
   "use": "毎回同じ形式のアンケートを作る手間を削減。",
   "code": "function makeForm(){\n  const f = FormApp.create('満足度アンケート');\n  f.addMultipleChoiceItem().setTitle('満足度は？')\n    .setChoiceValues(['とても満足','満足','普通','不満']);\n  f.addParagraphTextItem().setTitle('ご意見');\n}",
   "save": {
    "man": 30,
    "per": 12,
    "perT": "月1回",
    "how": "同じ形式のアンケートを毎回作り直し"
   }
  },
  {
   "s": "外部連携",
   "t": "Slack / Chatに通知",
   "d": "締切やエラーを、チャットに自動で知らせます。",
   "lv": 2,
   "use": "在庫が少なくなったらチャットに通知。",
   "code": "function notify(){\n  UrlFetchApp.fetch('Webhook URL', {\n    method:'post', contentType:'application/json',\n    payload: JSON.stringify({text:'在庫が残り5個です'})\n  });\n}",
   "save": {
    "man": 10,
    "per": 240,
    "perT": "営業日の毎日",
    "how": "在庫表を見て、少ないものをチャットで共有"
   }
  },
  {
   "s": "外部連携",
   "t": "天気や為替などの情報を取得",
   "d": "インターネット上のAPIから情報を取り込みます。",
   "lv": 3,
   "use": "毎朝の天気予報をシートに記録。",
   "code": "function weather(){\n  const res = UrlFetchApp.fetch(\n    'https://weather.tsukumijima.net/api/forecast/city/130010');\n  const json = JSON.parse(res.getContentText());\n  Logger.log(json.forecasts[0].telop);\n}",
   "save": {
    "man": 5,
    "per": 240,
    "perT": "営業日の毎日",
    "how": "天気や為替のサイトを見てシートに記入"
   }
  },
  {
   "s": "外部連携",
   "t": "翻訳を自動で行う",
   "d": "Googleの翻訳機能で、文章を他の言語に変換します。",
   "lv": 1,
   "use": "海外からの問い合わせを日本語に。",
   "code": "function translate(){\n  const ja = LanguageApp.translate(\n    'Thank you for your order.','en','ja');\n  Logger.log(ja); // ご注文ありがとうございます。\n}\n// セルで =GOOGLETRANSLATE(A1,\"en\",\"ja\") も可",
   "save": {
    "man": 10,
    "per": 100,
    "perT": "年100件",
    "how": "翻訳サイトに貼り付けて訳を確認"
   }
  },
  {
   "s": "Webアプリ",
   "t": "簡単なWebページを公開",
   "d": "GASだけで入力フォームや社内ツールのページが作れます。",
   "lv": 3,
   "use": "社内の備品貸出受付ページ。",
   "code": "function doGet(){\n  return HtmlService.createHtmlOutput(\n    '<h1>備品貸出受付</h1><p>準備中です</p>');\n}\n// 「デプロイ」→「ウェブアプリ」で公開",
   "save": {
    "man": 5,
    "per": 200,
    "perT": "年200件",
    "how": "貸出の申込をメールや口頭で受けて記録"
   }
  },
  {
   "s": "Webアプリ",
   "t": "他のサービスからデータを受け取る",
   "d": "外部から送られたデータを受け取り、シートに保存します。",
   "lv": 3,
   "use": "ECサイトの注文通知を受け取り記録。",
   "code": "function doPost(e){\n  const data = JSON.parse(e.postData.contents);\n  SpreadsheetApp.openById('シートID').getSheets()[0]\n    .appendRow([new Date(), data.item, data.price]);\n  return ContentService.createTextOutput('OK');\n}",
   "save": {
    "man": 2,
    "per": 1200,
    "perT": "月100件",
    "how": "注文通知を見て表に転記"
   }
  },
  {
   "s": "自動実行",
   "t": "毎日・毎週決まった時間に実行",
   "d": "時間を決めておけば、パソコンを閉じていても動きます。",
   "lv": 1,
   "use": "毎朝8時にレポート送信、毎週月曜に集計。",
   "code": "// 画面左の時計マーク「トリガー」から設定もOK\nfunction setTrigger(){\n  ScriptApp.newTrigger('todayPlan')\n    .timeBased().everyDays(1).atHour(8).create();\n}",
   "save": {
    "man": 10,
    "per": 240,
    "perT": "営業日の毎日",
    "how": "決まった時間にレポートを作って送信"
   }
  },
  {
   "s": "自動実行",
   "t": "シートが編集されたら動く",
   "d": "セルが変更された瞬間に、記録や色付けをします。",
   "lv": 2,
   "use": "ステータスが「完了」になったら日付を自動入力。",
   "code": "function onEdit(e){\n  const r = e.range;\n  if(r.getColumn()===3 && e.value==='完了'){\n    r.offset(0,1).setValue(new Date());\n  }\n}",
   "save": {
    "man": 0.5,
    "per": 1000,
    "perT": "年1,000件",
    "how": "完了日を手で入力"
   }
  },
  {
   "s": "スプレッドシート",
   "t": "重複データを自動で削除",
   "d": "同じ行が何度も入ってしまった表を、一発できれいにします。",
   "lv": 1,
   "use": "名簿や顧客リストのダブり削除。",
   "code": "function removeDup(){\n  SpreadsheetApp.getActiveSheet()\n    .getDataRange().removeDuplicates();\n}",
   "save": {
    "man": 30,
    "per": 12,
    "perT": "月1回",
    "how": "名簿を並べ替えてダブりを目で探して削除"
   }
  },
  {
   "s": "スプレッドシート",
   "t": "条件に合う行に色を付ける",
   "d": "期限切れや金額が大きい行などを目立たせます。",
   "lv": 2,
   "use": "締切を過ぎたタスクを赤くする。",
   "code": "function highlight(){\n  const sh = SpreadsheetApp.getActiveSheet();\n  const rows = sh.getDataRange().getValues();\n  const today = new Date();\n  rows.forEach((r,i) => {\n    if(i>0 && r[1] < today)\n      sh.getRange(i+1,1,1,r.length).setBackground('#ffd6d6');\n  });\n}",
   "save": {
    "man": 10,
    "per": 50,
    "perT": "週1回",
    "how": "締切を過ぎた行を探して色を付ける"
   }
  },
  {
   "s": "スプレッドシート",
   "t": "グラフを自動で作成",
   "d": "表のデータから棒グラフや折れ線グラフを作ります。",
   "lv": 2,
   "use": "月別売上の推移グラフを毎月更新。",
   "code": "function makeChart(){\n  const sh = SpreadsheetApp.getActiveSheet();\n  const chart = sh.newChart()\n    .setChartType(Charts.ChartType.COLUMN)\n    .addRange(sh.getRange('A1:B13'))\n    .setPosition(2,4,0,0).build();\n  sh.insertChart(chart);\n}",
   "save": {
    "man": 20,
    "per": 12,
    "perT": "月1回",
    "how": "グラフの範囲を直して作り直し"
   }
  },
  {
   "s": "スプレッドシート",
   "t": "シートをPDFにして送る",
   "d": "表をそのままPDFにして、メールで送れます。",
   "lv": 3,
   "use": "月次報告書を上司に自動送付。",
   "code": "function sheetPdf(){\n  const ss = SpreadsheetApp.getActive();\n  const pdf = ss.getAs('application/pdf')\n    .setName('月次報告.pdf');\n  GmailApp.sendEmail('boss@example.com','月次報告',\n    '添付をご確認ください。',{attachments:[pdf]});\n}",
   "save": {
    "man": 15,
    "per": 12,
    "perT": "月1回",
    "how": "PDFに書き出して上司にメールで送付"
   }
  },
  {
   "s": "スプレッドシート",
   "t": "入力ミスをチェック",
   "d": "空欄や形式の間違ったメールアドレスを見つけて知らせます。",
   "lv": 2,
   "use": "申込データの抜け漏れ確認。",
   "code": "function check(){\n  const rows = SpreadsheetApp.getActiveSheet()\n    .getDataRange().getValues().slice(1);\n  rows.forEach((r,i) => {\n    if(!/^\\S+@\\S+$/.test(r[1]))\n      Logger.log((i+2) + '行目のアドレスを確認');\n  });\n}",
   "save": {
    "man": 30,
    "per": 50,
    "perT": "週1回",
    "how": "申込データを1行ずつ見て抜け漏れを確認"
   }
  },
  {
   "s": "Gmail",
   "t": "下書きをまとめて作成",
   "d": "すぐ送らずに下書きに入れるので、確認してから送れます。",
   "lv": 1,
   "use": "送る前に一通ずつ目で確認したいとき。",
   "code": "function drafts(){\n  SpreadsheetApp.getActiveSheet().getDataRange()\n    .getValues().slice(1)\n    .forEach(([name,mail]) => GmailApp.createDraft(\n      mail,'ご案内', name + ' 様\\n\\nご案内です。'));\n}",
   "save": {
    "man": 20,
    "per": 12,
    "perT": "月1回",
    "how": "30通分の下書きを宛名を変えて作成"
   }
  },
  {
   "s": "Gmail",
   "t": "古いメールを自動で整理",
   "d": "一定期間より古い宣伝メールなどをゴミ箱へ移します。",
   "lv": 2,
   "use": "受信トレイを毎週すっきり保つ。",
   "code": "function cleanup(){\n  GmailApp.search('category:promotions older_than:30d')\n    .forEach(th => th.moveToTrash());\n}",
   "save": {
    "man": 15,
    "per": 50,
    "perT": "週1回",
    "how": "古い宣伝メールを探してまとめて削除"
   }
  },
  {
   "s": "Gmail",
   "t": "返信していないメールを通知",
   "d": "数日返事をしていない大事なメールを思い出させます。",
   "lv": 2,
   "use": "返信漏れの防止。",
   "code": "function reminder(){\n  const th = GmailApp.search(\n    'is:starred older_than:3d -in:sent');\n  if(th.length) GmailApp.sendEmail(\n    Session.getActiveUser().getEmail(),'未返信あり',\n    th.map(t=>t.getFirstMessageSubject()).join('\\n'));\n}",
   "save": {
    "man": 10,
    "per": 240,
    "perT": "営業日の毎日",
    "how": "受信箱を見返して返信漏れを探す"
   }
  },
  {
   "s": "カレンダー",
   "t": "予定をシートに書き出す",
   "d": "1か月分の予定を表にして、作業時間の集計などに使えます。",
   "lv": 1,
   "use": "案件ごとの作業時間を月末に集計。",
   "code": "function exportEvents(){\n  const sh = SpreadsheetApp.getActiveSheet();\n  const s = new Date(2026,9,1), e = new Date(2026,10,1);\n  CalendarApp.getDefaultCalendar().getEvents(s,e)\n    .forEach(ev => sh.appendRow([ev.getTitle(),\n      ev.getStartTime(), ev.getEndTime()]));\n}",
   "save": {
    "man": 45,
    "per": 12,
    "perT": "月1回",
    "how": "1か月分の予定を表に書き写す"
   }
  },
  {
   "s": "カレンダー",
   "t": "誕生日や記念日をリマインド",
   "d": "名簿の日付を見て、当日にお知らせします。",
   "lv": 2,
   "use": "お客様・社員の誕生日にメッセージ。",
   "code": "function birthday(){\n  const t = Utilities.formatDate(new Date(),'JST','MM/dd');\n  SpreadsheetApp.getActiveSheet().getDataRange()\n    .getValues().slice(1)\n    .filter(r => Utilities.formatDate(r[1],'JST','MM/dd')===t)\n    .forEach(r => Logger.log(r[0] + 'さんの誕生日です'));\n}",
   "save": {
    "man": 10,
    "per": 12,
    "perT": "月1回",
    "how": "名簿を見て今月の誕生日を確認"
   }
  },
  {
   "s": "ドライブ",
   "t": "ファイル名を一括で変更",
   "d": "たくさんのファイル名に日付や番号を付け直します。",
   "lv": 2,
   "use": "写真やスキャンした書類の名前をそろえる。",
   "code": "function rename(){\n  const it = DriveApp.getFolderById('フォルダID').getFiles();\n  let n = 1;\n  while(it.hasNext()){\n    it.next().setName('領収書_' + String(n++).padStart(3,'0'));\n  }\n}",
   "save": {
    "man": 0.5,
    "per": 1200,
    "perT": "年1,200件",
    "how": "ファイルを1つずつ開いて名前を変更"
   }
  },
  {
   "s": "ドライブ",
   "t": "共有設定をまとめて変更",
   "d": "フォルダ内のファイルを特定の人と一括共有します。",
   "lv": 2,
   "use": "新メンバーに資料をまとめて共有。",
   "code": "function share(){\n  const it = DriveApp.getFolderById('フォルダID').getFiles();\n  while(it.hasNext()) it.next().addViewer('new@example.com');\n}",
   "save": {
    "man": 30,
    "per": 6,
    "perT": "年6回",
    "how": "資料を1つずつ開いて共有相手を追加"
   }
  },
  {
   "s": "ドキュメント",
   "t": "議事録のひな形を自動作成",
   "d": "日付と参加者入りの議事録を、会議の前に用意します。",
   "lv": 1,
   "use": "毎週の定例会議の準備。",
   "code": "function minutes(){\n  const d = Utilities.formatDate(new Date(),'JST','yyyy/MM/dd');\n  const doc = DocumentApp.create('議事録 ' + d);\n  const b = doc.getBody();\n  b.appendParagraph('議事録 ' + d)\n    .setHeading(DocumentApp.ParagraphHeading.HEADING1);\n  ['参加者','議題','決定事項','次回までの宿題']\n    .forEach(h => b.appendParagraph(h)\n    .setHeading(DocumentApp.ParagraphHeading.HEADING2));\n}",
   "save": {
    "man": 10,
    "per": 50,
    "perT": "週1回",
    "how": "議事録の見出しと日付を毎回作成"
   }
  },
  {
   "s": "スライド",
   "t": "シートの内容でスライドを作る",
   "d": "表の1行を1枚のスライドにして、資料を自動で作ります。",
   "lv": 2,
   "use": "商品紹介や社員紹介のスライドを量産。",
   "code": "function slides(){\n  const p = SlidesApp.create('商品紹介');\n  SpreadsheetApp.getActiveSheet().getDataRange()\n    .getValues().slice(1).forEach(([name,desc]) => {\n      const s = p.appendSlide(\n        SlidesApp.PredefinedLayout.TITLE_AND_BODY);\n      s.getPlaceholders()[0].asShape().getText().setText(name);\n      s.getPlaceholders()[1].asShape().getText().setText(desc);\n    });\n}",
   "save": {
    "man": 5,
    "per": 120,
    "perT": "年120枚",
    "how": "スライドを複製して文字を貼り替え"
   }
  },
  {
   "s": "スライド",
   "t": "スライドの文字を一括置換",
   "d": "社名や日付など、全ページの文字をまとめて書き換えます。",
   "lv": 1,
   "use": "提案資料の会社名を差し替え。",
   "code": "function replaceAll(){\n  SlidesApp.openById('スライドID')\n    .replaceAllText('{{会社名}}','株式会社サンプル');\n}",
   "save": {
    "man": 15,
    "per": 24,
    "perT": "月2回",
    "how": "全ページを見て会社名を書き換え"
   }
  },
  {
   "s": "フォーム",
   "t": "回答を集計して通知",
   "d": "集まった回答の数や結果を、毎日まとめて知らせます。",
   "lv": 2,
   "use": "イベントの申込人数を毎朝確認。",
   "code": "function summary(){\n  const n = FormApp.openById('フォームID')\n    .getResponses().length;\n  GmailApp.sendEmail(Session.getActiveUser().getEmail(),\n    '申込状況','現在の申込数：' + n + '件');\n}",
   "save": {
    "man": 5,
    "per": 120,
    "perT": "年120回",
    "how": "フォームの回答数を確認して共有"
   }
  },
  {
   "s": "外部連携",
   "t": "LINEに通知を送る",
   "d": "LINE公式アカウントのMessaging APIで、スマホに通知します。",
   "lv": 3,
   "use": "予約が入ったらLINEで知らせる。",
   "code": "function line(){\n  UrlFetchApp.fetch(\n    'https://api.line.me/v2/bot/message/push',{\n    method:'post', contentType:'application/json',\n    headers:{Authorization:'Bearer ' + 'アクセストークン'},\n    payload: JSON.stringify({to:'ユーザーID',\n      messages:[{type:'text',text:'予約が入りました'}]})\n  });\n}",
   "save": {
    "man": 5,
    "per": 365,
    "perT": "毎日",
    "how": "予約システムを開いて新しい予約を確認"
   }
  },
  {
   "s": "外部連携",
   "t": "Webページの情報を取り込む",
   "d": "公開されているページの内容を読み取り、記録します。",
   "lv": 3,
   "use": "お知らせページの更新チェック。",
   "code": "function fetchPage(){\n  const html = UrlFetchApp.fetch('https://example.com')\n    .getContentText();\n  const title = html.match(/<title>(.*?)<\\/title>/)[1];\n  Logger.log(title);\n}\n// 利用規約で禁止されているサイトでは使わないこと",
   "save": {
    "man": 5,
    "per": 240,
    "perT": "営業日の毎日",
    "how": "お知らせページを開いて更新を確認"
   }
  },
  {
   "s": "自動実行",
   "t": "毎月1日に実行",
   "d": "月初の請求処理や集計を、忘れずに自動で行います。",
   "lv": 1,
   "use": "月初に先月分の集計と報告。",
   "code": "function monthly(){\n  ScriptApp.newTrigger('sumByMonth')\n    .timeBased().onMonthDay(1).atHour(9).create();\n}",
   "save": {
    "man": 60,
    "per": 12,
    "perT": "月1回",
    "how": "月初に先月分を集計して報告"
   }
  },
  {
   "s": "自動実行",
   "t": "エラー時に自分へ知らせる",
   "d": "自動処理が失敗したとき、すぐ気づけるようにします。",
   "lv": 2,
   "use": "夜中の処理が止まっていないか確認。",
   "code": "function safeRun(){\n  try{\n    sumByMonth();\n  }catch(err){\n    GmailApp.sendEmail(Session.getActiveUser().getEmail(),\n      'GASでエラー発生', err.message);\n  }\n}",
   "save": {
    "man": 5,
    "per": 240,
    "perT": "営業日の毎朝",
    "how": "夜間の処理が動いたかを確認"
   }
  },
  {
   "s": "Webアプリ",
   "t": "申請をメールで承認してもらう",
   "d": "申請が入ると上長に「承認・却下」のリンク付きメールが届き、押すと結果がシートに残ります。",
   "lv": 3,
   "use": "備品購入・休暇・経費などの申請を、紙やチャットのやり取りなしで承認まで進めたいときに。",
   "code": "// 申請シートの行について、承認・却下のリンク付きメールを上長へ送る\nconst APP_URL = 'ウェブアプリのURL';\nfunction requestApproval(row) {\n  const sh = SpreadsheetApp.getActive().getSheetByName('申請');\n  const [date, name, item, amount] = sh.getRange(row, 1, 1, 4).getValues()[0];\n  const token = Utilities.getUuid();\n  sh.getRange(row, 6).setValue(token);            // F列：使い捨ての合言葉\n  const link = (a) => APP_URL + '?row=' + row + '&a=' + a + '&t=' + token;\n  GmailApp.sendEmail('boss@example.com', '【承認依頼】' + name + '：' + item,\n    item + '（' + amount + '円）\\n承認する：' + link('ok') + '\\n却下する：' + link('ng'));\n}\n// リンクを開くと確認画面を出す（開いただけでは確定しない）\nfunction doGet(e) {\n  const a = e.parameter.a === 'ok' ? 'ok' : 'ng';\n  const row = Number(e.parameter.row) || 0;\n  const t = String(e.parameter.t || '').replace(/[^\\w-]/g, '');\n  return HtmlService.createHtmlOutput('<p>' + (a === 'ok' ? '承認' : '却下') + 'しますか？</p>' +\n    '<button onclick=\"google.script.run.withSuccessHandler(function(m){document.body.textContent=m})' +\n    '.decide(' + row + ',\\'' + a + '\\',\\'' + t + '\\')\">確定する</button>');\n}\nfunction decide(row, a, t) {\n  const sh = SpreadsheetApp.getActive().getSheetByName('申請');\n  if (!t || sh.getRange(row, 6).getValue() !== t) return 'このリンクは使えません（処理済みか無効です）';\n  sh.getRange(row, 5).setValue(a === 'ok' ? '承認' : '却下');   // E列：結果\n  sh.getRange(row, 6).clearContent();                          // 一度使ったリンクは無効に\n  return '記録しました。';\n}",
   "save": {
    "man": 10,
    "per": 120,
    "perT": "月10件",
    "how": "申請内容を転送し、返事を待って台帳に書き写す"
   },
   "adv": true,
   "tips": [
    "リンクを開いただけで承認されないよう、確認画面のボタンを押して確定する作りにしています（メールのセキュリティ機能がリンクを先読みすることがあるため）。",
    "行ごとに使い捨ての合言葉（トークン）を発行し、一度使ったリンクは無効にします。",
    "ウェブアプリは「次のユーザーとして実行：自分」でデプロイし、APP_URL にそのURLを入れます。"
   ]
  },
  {
   "s": "Webアプリ",
   "t": "スマホで押せる打刻ボタン",
   "d": "「出勤」「退勤」ボタンだけのページを作り、押した時刻と人をシートに記録します。",
   "lv": 3,
   "use": "小さな事務所やお店の勤怠を、タイムカードや手書きの出勤簿から置きかえたいときに。",
   "code": "// ボタンだけのページを返す（スマホでも押しやすい大きさ）\nfunction doGet() {\n  return HtmlService.createHtmlOutput(\n    '<style>button{font-size:24px;padding:16px 32px;margin:8px}</style>' +\n    '<button onclick=\"p(\\'出勤\\')\">出勤</button><button onclick=\"p(\\'退勤\\')\">退勤</button><p id=\"m\"></p>' +\n    '<script>function p(t){m.textContent=\"記録中…\";google.script.run.withSuccessHandler(function(s){m.textContent=s}).punch(t)}</script>')\n    .addMetaTag('viewport', 'width=device-width, initial-scale=1');\n}\nfunction punch(type) {\n  if (['出勤', '退勤'].indexOf(type) < 0) return '不正な操作です';\n  const user = Session.getActiveUser().getEmail();     // 同じ組織の中なら取得できる\n  const sh = SpreadsheetApp.openById('勤怠シートID').getSheetByName('打刻');\n  sh.appendRow([new Date(), user, type]);\n  return Utilities.formatDate(new Date(), 'Asia/Tokyo', 'H:mm') + ' に' + type + 'を記録しました';\n}",
   "save": {
    "man": 30,
    "per": 12,
    "perT": "毎月の締め",
    "how": "タイムカードや出勤簿を見ながら勤務時間を表に打ち直す"
   },
   "adv": true,
   "tips": [
    "押した人のメールアドレスが取れるのは、Google Workspace の同じ組織の中で使う場合です。個人のGmail同士では、名前を選ぶ欄を足します。",
    "ホーム画面に追加しておくと、アプリのように1タップで開けます。",
    "月末の集計は、記録シートからピボットテーブルや No.001 の集計で作れます。"
   ]
  },
  {
   "s": "フォーム",
   "t": "予約を受け付けてカレンダーに入れる",
   "d": "フォームの希望日時が空いていればカレンダーに登録し、受付・お断りのメールを自動で返します。",
   "lv": 3,
   "use": "面談・相談会・レッスンなど、時間枠の予約を受け付けたいときに。",
   "code": "// フォーム送信時：希望日時が空いていればカレンダーに登録し、結果をメールで返す\nfunction onSubmit(e) {\n  const v = e.namedValues;                                   // 質問名で値を取り出す\n  const start = new Date(v['希望日時'][0]);\n  const end = new Date(start.getTime() + 60 * 60 * 1000);    // 1時間枠\n  const to = v['メールアドレス'][0], name = v['お名前'][0];\n  const cal = CalendarApp.getDefaultCalendar();\n  const lock = LockService.getScriptLock();\n  lock.waitLock(20000);                                      // 同時送信による二重予約を防ぐ\n  try {\n    if (cal.getEvents(start, end).length) {\n      GmailApp.sendEmail(to, 'ご予約について', name + ' 様\\nあいにくその時間は埋まっております。別の日時でお申し込みください。');\n      return;\n    }\n    cal.createEvent('予約：' + name, start, end, { description: to });\n    GmailApp.sendEmail(to, 'ご予約を承りました',\n      name + ' 様\\n' + Utilities.formatDate(start, 'Asia/Tokyo', 'M月d日 H:mm') + ' からでお待ちしております。');\n  } finally {\n    lock.releaseLock();\n  }\n}",
   "save": {
    "man": 8,
    "per": 240,
    "perT": "月20件",
    "how": "申込メールを読み、空きを確認して予定を入れ、返信する"
   },
   "adv": true,
   "tips": [
    "フォームの回答先スプレッドシートに書き、トリガー「フォーム送信時」で動かします（e.namedValues は質問名で値を取り出せます）。",
    "同時に2人が同じ枠を申し込んでも二重予約にならないよう、ロック（LockService）で1件ずつ処理します。",
    "営業時間外や休業日を断る条件を足すと、より実用的になります。"
   ]
  },
  {
   "s": "カレンダー",
   "t": "全員が空いている会議の候補を探す",
   "d": "参加者のカレンダーの空き状況を調べて、全員が空いている時間の候補を一覧にします。",
   "lv": 3,
   "use": "3人以上の打ち合わせで、日程調整のメールの往復を減らしたいときに。",
   "code": "// 参加者全員が空いている30分枠を、これから5日間で5つまで探す（拡張サービス「Calendar API」を追加）\nfunction findSlots() {\n  const people = ['a@example.com', 'b@example.com', Session.getActiveUser().getEmail()];\n  const from = new Date(), to = new Date(from.getTime() + 5 * 86400000);\n  const res = Calendar.Freebusy.query({\n    timeMin: from.toISOString(), timeMax: to.toISOString(), timeZone: 'Asia/Tokyo',\n    items: people.map((id) => ({ id })),\n  });\n  const busy = Object.values(res.calendars).flatMap((c) => c.busy || [])\n    .map((b) => [new Date(b.start), new Date(b.end)]);\n  const slots = [];\n  const t = new Date(from); t.setMinutes(t.getMinutes() < 30 ? 30 : 60, 0, 0);   // 次の30分区切りから\n  for (; t < to && slots.length < 5; t.setMinutes(t.getMinutes() + 30)) {\n    const end = new Date(t.getTime() + 30 * 60000);\n    if (t.getDay() % 6 === 0 || t.getHours() < 10 || t.getHours() >= 18) continue;   // 平日10〜18時だけ\n    if (!busy.some(([s, e]) => s < end && t < e)) slots.push(Utilities.formatDate(t, 'Asia/Tokyo', 'M/d H:mm〜'));\n  }\n  Logger.log(slots.length ? slots.join('\\n') : '候補が見つかりませんでした');\n}",
   "save": {
    "man": 15,
    "per": 48,
    "perT": "月4回",
    "how": "参加者に都合を聞いて回り、空いている時間を突き合わせる"
   },
   "adv": true,
   "tips": [
    "Apps Script の「サービス」から拡張サービス「Google Calendar API」を追加すると、Calendar.Freebusy が使えます。",
    "ほかの人の空き状況が見られるのは、相手がカレンダーを共有している（同じ組織など）場合です。",
    "見つかった候補を No.009 のように予定として仮登録したり、メールの文面にしたりもできます。"
   ]
  },
  {
   "s": "スライド",
   "t": "月次レポートを自動で作って配る",
   "d": "シートの数字とグラフをスライドのひな形に差し込み、PDFにして関係者へメールします。",
   "lv": 3,
   "use": "毎月の売上報告・定例会議の資料づくりを、数字の転記からなくしたいときに。",
   "code": "// 先月の数字をスライドのひな形に差し込み、PDFにして関係者へ送る\nfunction monthlyReport() {\n  const sh = SpreadsheetApp.openById('集計シートID').getSheetByName('月次');\n  const [sales, orders, rate] = sh.getRange('B2:B4').getValues().flat();   // 売上・件数・成約率\n  const month = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM');\n  const copy = DriveApp.getFileById('ひな形スライドID').makeCopy('月次レポート_' + month);\n  const deck = SlidesApp.openById(copy.getId());\n  deck.replaceAllText('{{売上}}', Number(sales).toLocaleString('ja-JP') + '円');\n  deck.replaceAllText('{{件数}}', String(orders));\n  deck.replaceAllText('{{成約率}}', Math.round(rate * 100) + '%');\n  deck.getSlides()[1].insertSheetsChartAsImage(sh.getCharts()[0]);         // 2枚目にグラフを貼る\n  deck.saveAndClose();\n  GmailApp.sendEmail('team@example.com', '月次レポート（' + month + '）', '今月のレポートを添付します。',\n    { attachments: [copy.getAs('application/pdf')] });\n}",
   "save": {
    "man": 90,
    "per": 12,
    "perT": "毎月",
    "how": "数字をシートから資料に書き写し、グラフを貼り直してPDFで送る"
   },
   "adv": true,
   "tips": [
    "スライドのひな形に {{売上}} のような目印を書いておき、replaceAllText で差し込みます。",
    "グラフはシートで作っておけば、insertSheetsChartAsImage でスライドに貼れます。",
    "No.043「毎月1日に実行」と組み合わせると、何もしなくても毎月届きます。初めは送り先を自分だけにして確かめてください。"
   ]
  },
  {
   "s": "スプレッドシート",
   "t": "在庫が減ったら発注メールを下書き",
   "d": "在庫が発注点を下回った品目を仕入先ごとにまとめ、発注メールの下書きを作ります。",
   "lv": 3,
   "use": "消耗品や商品の在庫を表で管理していて、発注漏れや発注の手間を減らしたいときに。",
   "code": "// 在庫が発注点以下の品目を仕入先ごとにまとめ、発注メールの「下書き」を作る\nfunction draftOrders() {\n  const rows = SpreadsheetApp.openById('在庫シートID').getSheetByName('在庫')\n    .getDataRange().getValues().slice(1);                    // 1行目は見出し\n  const bySupplier = {};\n  rows.forEach(([item, stock, point, qty, mail]) => {        // 品名・在庫・発注点・発注数・仕入先メール\n    if (item && mail && stock <= point) (bySupplier[mail] = bySupplier[mail] || []).push('・' + item + '　' + qty + '個');\n  });\n  Object.keys(bySupplier).forEach((mail) => {\n    GmailApp.createDraft(mail, '発注のお願い',\n      'いつもお世話になっております。\\n下記の発注をお願いいたします。\\n\\n' + bySupplier[mail].join('\\n'));\n  });\n}",
   "save": {
    "man": 20,
    "per": 48,
    "perT": "月4回",
    "how": "在庫表を見て足りない物を拾い出し、仕入先ごとにメールを書く"
   },
   "adv": true,
   "tips": [
    "いきなり送らず「下書き」にしているので、数量を確かめてから自分で送信できます。",
    "同じ品目の下書きが毎朝できないよう、発注した日を記録する列を足して、発注済みは飛ばすようにすると安心です。",
    "在庫数を No.024「シートが編集されたら動く」で見張れば、減った瞬間に知らせることもできます。"
   ]
  },
  {
   "s": "自動実行",
   "t": "契約の更新日が近づいたら知らせる",
   "d": "契約台帳を毎朝見て、更新日の30日前と7日前に担当者へメールで知らせます。",
   "lv": 3,
   "use": "サービスの契約・保守・リース・ドメインなど、うっかり自動更新や期限切れを防ぎたいときに。",
   "code": "// 毎朝：更新日の30日前・7日前になった契約を、担当者にメールで知らせる\nfunction remindRenewals() {\n  const rows = SpreadsheetApp.openById('契約台帳ID').getSheetByName('契約').getDataRange().getValues().slice(1);\n  const today = new Date(); today.setHours(0, 0, 0, 0);\n  rows.forEach(([name, due, owner]) => {                     // 契約名・更新日・担当者メール\n    if (!(due instanceof Date) || !owner) return;\n    const days = Math.round((due - today) / 86400000);\n    if ([30, 7].indexOf(days) >= 0) {\n      GmailApp.sendEmail(owner, '【更新' + days + '日前】' + name,\n        name + ' の更新日は ' + Utilities.formatDate(due, 'Asia/Tokyo', 'yyyy/M/d') + ' です。継続・解約のご判断をお願いします。');\n    }\n  });\n}",
   "save": {
    "man": 20,
    "per": 12,
    "perT": "毎月",
    "how": "契約台帳を開き、近づいている更新日を目で探して連絡する"
   },
   "adv": true,
   "tips": [
    "トリガー「時間主導型・日付ベース」で毎朝1回動かします。",
    "「何日前に知らせるか」は [30, 7] の部分で自由に変えられます。",
    "更新日の列は日付の形式（例：2026/12/31）で入れてください。文字として入っていると判定できません。"
   ]
  },
  {
   "s": "ドライブ",
   "t": "公開しすぎのファイルを見つける",
   "d": "「リンクを知っている全員」などに公開されている自分のファイルを探し、一覧にします。",
   "lv": 3,
   "use": "情報漏えいの点検に。退職者の引き継ぎや、取引先との共有を見直すときにも。",
   "code": "// 自分がオーナーのファイルのうち、外部に公開されているものを「共有チェック」シートに書き出す\nfunction auditSharing() {\n  const out = [['ファイル名', '共有範囲', '最終更新', 'URL']];\n  const open = [DriveApp.Access.ANYONE, DriveApp.Access.ANYONE_WITH_LINK];\n  const files = DriveApp.searchFiles(\"'me' in owners and trashed = false\");\n  while (files.hasNext()) {\n    const f = files.next();\n    const a = f.getSharingAccess();\n    if (open.indexOf(a) >= 0) out.push([f.getName(), String(a), f.getLastUpdated(), f.getUrl()]);\n  }\n  const ss = SpreadsheetApp.getActive();\n  const sh = ss.getSheetByName('共有チェック') || ss.insertSheet('共有チェック');\n  sh.clear().getRange(1, 1, out.length, out[0].length).setValues(out);\n}",
   "save": {
    "man": 60,
    "per": 4,
    "perT": "四半期ごと",
    "how": "ドライブのファイルを1つずつ開いて共有設定を確かめる"
   },
   "adv": true,
   "tips": [
    "ファイルが多いと1回の実行時間（6分）を超えることがあります。そのときは No.056 の分割処理と組み合わせます。",
    "見つけたファイルの共有をまとめて直すなら No.036 と組み合わせます。まずは一覧で確認してから直すのが安全です。",
    "組織のファイル全体を点検するのは、Google Workspace の管理者向けの機能のほうが向いています。"
   ]
  },
  {
   "s": "ドライブ",
   "t": "PDFや画像の文字を読み取る",
   "d": "届いた請求書などのPDFを文字に変換（OCR）し、合計金額などをシートに書き出します。",
   "lv": 3,
   "use": "紙やPDFで届く書類の金額・日付を、手で打ち込まずに台帳へ入れたいときに。",
   "code": "// フォルダのPDFを文字にして、「合計」のあとの金額をシートに書き出す（拡張サービス「Drive API」を追加）\nfunction readPdfs() {\n  const sh = SpreadsheetApp.getActive().getSheetByName('読み取り結果');\n  const done = DriveApp.getFolderById('処理済みフォルダID');\n  const files = DriveApp.getFolderById('PDFフォルダID').getFilesByType(MimeType.PDF);\n  while (files.hasNext()) {\n    const pdf = files.next();\n    const doc = Drive.Files.create({ name: pdf.getName(), mimeType: MimeType.GOOGLE_DOCS },\n      pdf.getBlob(), { ocrLanguage: 'ja' });                  // ドキュメントに変換するときに文字を読み取る\n    const text = DocumentApp.openById(doc.id).getBody().getText();\n    const m = text.match(/合計[^\\d]{0,10}([\\d,]+)/);\n    sh.appendRow([new Date(), pdf.getName(), m ? Number(m[1].replace(/,/g, '')) : '要確認', text.slice(0, 200)]);\n    DriveApp.getFileById(doc.id).setTrashed(true);            // 作業用のドキュメントはごみ箱へ\n    pdf.moveTo(done);                                         // 読み取ったPDFは処理済みフォルダへ\n  }\n}",
   "save": {
    "man": 5,
    "per": 360,
    "perT": "月30枚",
    "how": "PDFを開いて金額や日付を見ながら台帳に打ち込む"
   },
   "adv": true,
   "tips": [
    "Apps Script の「サービス」から拡張サービス「Drive API」を追加します。PDFをGoogleドキュメントに変換するときに文字を読み取ります。",
    "読み取りは完璧ではありません。「要確認」の行や金額は、元のPDFと見比べてから使ってください。",
    "No.007「添付ファイルをドライブに保存」と組み合わせると、メールで届いたPDFから自動で読み取れます。"
   ]
  },
  {
   "s": "Gmail",
   "t": "問い合わせをAIで分類・要約",
   "d": "問い合わせメールをAI（Gemini API）に読ませて種類分けと1行要約をし、ラベルとシートに残します。",
   "lv": 3,
   "use": "問い合わせ窓口のメールが多く、急ぎ・担当ごとに振り分ける手間を減らしたいときに。",
   "code": "// まだ処理していない問い合わせメールを、AI（Gemini API）で分類・要約してラベルとシートに残す\nconst MODEL = 'gemini-3.8-flash';                            // 使うモデル名（Googleの「Gemini のモデル」ページで最新の名前を確認）\nfunction triageMail() {\n  const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');   // キーはコードに書かない\n  const sh = SpreadsheetApp.getActive().getSheetByName('問い合わせ');\n  const doneLabel = GmailApp.getUserLabelByName('AI済み') || GmailApp.createLabel('AI済み');\n  GmailApp.search('to:info@example.com -label:AI済み newer_than:2d', 0, 20).forEach((th) => {\n    const m = th.getMessages()[0];\n    const prompt = '次のメールを「見積」「不具合」「請求」「その他」のどれかに分類し、1行で要約してください。' +\n      'JSONで {\"cat\":\"\",\"sum\":\"\"} だけを返してください。\\n\\n' + m.getPlainBody().slice(0, 3000);\n    const res = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent', {\n      method: 'post', contentType: 'application/json', headers: { 'x-goog-api-key': key },\n      payload: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json' } }),\n    });\n    const ai = JSON.parse(JSON.parse(res.getContentText()).candidates[0].content.parts[0].text);\n    const label = 'AI/' + ai.cat;\n    th.addLabel(GmailApp.getUserLabelByName(label) || GmailApp.createLabel(label)).addLabel(doneLabel);\n    sh.appendRow([m.getDate(), m.getFrom(), m.getSubject(), ai.cat, ai.sum]);\n  });\n}",
   "save": {
    "man": 2,
    "per": 1200,
    "perT": "月100通",
    "how": "問い合わせを1通ずつ読み、種類を判断して担当に振り分ける"
   },
   "adv": true,
   "tips": [
    "APIキーはコードに書かず、「プロジェクトの設定」→「スクリプト プロパティ」に GEMINI_API_KEY として保存します。キーは公開の場所に置かないでください。",
    "メールの本文を外部のAIに送ることになります。お客さまの個人情報の扱いについて、社内のルールや利用規約を確かめてから使ってください。",
    "AIの分類はまちがえることがあります。最初は「分類の提案」として使い、人が確かめる運用にします。モデル名は入れ替わります（例：2.5 世代は新しく使い始める人には提供されていません）。使う前に Google の案内で最新の名前を確認してください。"
   ]
  },
  {
   "s": "外部連携",
   "t": "外部サービスと毎晩データを同期",
   "d": "ネットショップや業務システムのAPIから新しいデータを取り込み、シートを毎晩最新にします。",
   "lv": 3,
   "use": "別のサービスの管理画面から、毎日CSVを書き出して貼り付けている作業をなくしたいときに。",
   "code": "// 毎晩：外部サービスのAPIから注文を取得し、まだ取り込んでいないものだけをシートに追加する\nfunction syncOrders() {\n  const props = PropertiesService.getScriptProperties();\n  const token = props.getProperty('SHOP_API_TOKEN');         // アクセストークンは設定に保存\n  const sh = SpreadsheetApp.getActive().getSheetByName('注文');\n  const known = new Set(sh.getRange('A2:A').getValues().flat().map(String));   // 取り込み済みの注文番号\n  let url = 'https://api.example.com/v1/orders?since=' + encodeURIComponent(props.getProperty('LAST_SYNC') || '');\n  const rows = [];\n  while (url) {                                              // ページを順にたどる\n    const res = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true });\n    if (res.getResponseCode() !== 200) throw new Error('取得に失敗しました：' + res.getResponseCode());\n    const body = JSON.parse(res.getContentText());\n    body.orders.filter((o) => !known.has(String(o.id)))\n      .forEach((o) => rows.push([o.id, new Date(o.created_at), o.total]));\n    url = body.next || null;\n  }\n  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, 3).setValues(rows);\n  props.setProperty('LAST_SYNC', new Date().toISOString());\n}",
   "save": {
    "man": 15,
    "per": 240,
    "perT": "営業日の毎日",
    "how": "管理画面からCSVを書き出し、シートに貼り付けて整える"
   },
   "adv": true,
   "tips": [
    "アクセストークンは「スクリプト プロパティ」に保存し、コードやシートに書かないでください。",
    "取り込み済みの番号を見て、同じデータを二重に入れないようにしています。",
    "URL・ページのたどり方・項目名はサービスごとに違います。使うサービスのAPIの説明書に合わせて書き換えます。"
   ]
  },
  {
   "s": "自動実行",
   "t": "大量のデータを分けて処理する",
   "d": "1回6分の実行時間の上限を超えないよう、5分で区切り、1分後に続きから自動で再開します。",
   "lv": 3,
   "use": "数千行のデータの一括処理や、ファイルの大量整理が「時間切れ」で止まってしまうときに。",
   "code": "// 5分で区切り、1分後に続きの行から自動で再開する\nfunction processAll() {\n  ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === 'processAll')\n    .forEach((t) => ScriptApp.deleteTrigger(t));             // 前回の予約を片づける\n  const props = PropertiesService.getScriptProperties();\n  const sh = SpreadsheetApp.getActive().getSheetByName('データ');\n  const last = sh.getLastRow(), began = Date.now();\n  let row = Number(props.getProperty('NEXT_ROW') || 2);\n  for (; row <= last; row++) {\n    if (Date.now() - began > 5 * 60 * 1000) break;           // 5分たったら区切る\n    const value = sh.getRange(row, 1).getValue();\n    sh.getRange(row, 2).setValue(String(value).trim());      // ここに1行ぶんの処理を書く（例：整形して隣の列へ）\n  }\n  if (row <= last) {\n    props.setProperty('NEXT_ROW', String(row));\n    ScriptApp.newTrigger('processAll').timeBased().after(60 * 1000).create();   // 1分後に続きから\n  } else {\n    props.deleteProperty('NEXT_ROW');                        // 最後まで終わった\n  }\n}",
   "save": {
    "man": 10,
    "per": 24,
    "perT": "月2回",
    "how": "範囲を区切って何度も実行し直し、どこまで終わったかを手で管理する"
   },
   "adv": true,
   "tips": [
    "どこまで進んだかを「スクリプト プロパティ」に覚えておき、次の回はそこから始めます。",
    "続きの予約（トリガー）は毎回作り直し、終わったら片づけるので、トリガーがたまりません。",
    "No.044「エラー時に自分へ知らせる」と組み合わせると、途中で止まったときにすぐ気づけます。"
   ]
  }
 ],
 "icons": {
  "sheet": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M3 9h18M3 14h18M9 4v16M15 4v16\"/>",
  "mail": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"m3 7 9 6 9-6\"/>",
  "cal": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M3 10h18M8 3v4M16 3v4M8 14h3v3H8z\"/>",
  "drive": "<path d=\"M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"/>",
  "doc": "<path d=\"M6 3h8l4 4v14H6z\"/><path d=\"M14 3v4h4M9 12h6M9 16h6\"/>",
  "slide": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"12\" rx=\"1.5\"/><path d=\"M12 16v4M8 20h8M7 9h7M7 12h4\"/>",
  "form": "<rect x=\"4\" y=\"3\" width=\"16\" height=\"18\" rx=\"2\"/><path d=\"M8 8h1M11 8h5M8 12h1M11 12h5M8 16h1M11 16h5\"/>",
  "web": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M3 8h18M6 6h.01M8.5 6h.01\"/>",
  "ext": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M3 12h18M12 3c3.5 3.5 3.5 14.5 0 18M12 3c-3.5 3.5-3.5 14.5 0 18\"/>",
  "chat": "<path d=\"M4 5h16v11H10l-5 4v-4H4z\"/><path d=\"M8 10h8\"/>",
  "tr": "<path d=\"M3 5h9M7.5 3v2M5 5c1 3.5 3.5 6 6.5 7.5M10 5c-1 3.5-3 5.5-6 7\"/><path d=\"m13 21 4-9 4 9M14.4 18h5.2\"/>",
  "chart": "<path d=\"M4 4v16h16\"/><path d=\"M8 16v-4M12 16V8M16 16v-6\"/>",
  "gear": "<circle cx=\"12\" cy=\"12\" r=\"3.2\"/><path d=\"M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1\"/>",
  "clock": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3.5 2\"/>",
  "tap": "<rect x=\"3\" y=\"6\" width=\"18\" height=\"12\" rx=\"6\"/><path d=\"m10.5 9.5 4 2.5-4 2.5z\"/>",
  "edit": "<path d=\"M4 20h4L19 9l-4-4L4 16z\"/><path d=\"m13 7 4 4\"/>",
  "send": "<path d=\"M21 3 3 10.5l7 3 3 7.5z\"/><path d=\"m10 13.5 4.5-4.5\"/>",
  "menu": "<path d=\"M4 6h16M4 12h16M4 18h10\"/>",
  "warn": "<path d=\"M12 3 2 20h20z\"/><path d=\"M12 10v4M12 17h.01\"/>",
  "lock": "<rect x=\"5\" y=\"10\" width=\"14\" height=\"10\" rx=\"2\"/><path d=\"M8 10V7a4 4 0 0 1 8 0v3\"/>"
 },
 "scenes": [
  {
   "tab": "経費をまとめる",
   "ti": "sheet",
   "ref": "No.001 表のデータを自動で集計する",
   "trig": [
    "clock",
    "毎月1日 9:00 になったら"
   ],
   "inL": [
    "sheet",
    "経費シート（10月分）"
   ],
   "ins": [
    "10/03　交通費　1,240円",
    "10/07　消耗品　3,280円",
    "10/12　交通費　2,960円",
    "10/18　通信費　4,400円",
    "10/22　消耗品　2,700円",
    "10/29　交通費　4,220円"
   ],
   "outL": [
    "mail",
    "税理士さんへ自動で送付"
   ],
   "outs": [
    {
     "t": "交通費　合計 8,420円",
     "f": [
      0,
      2,
      5
     ],
     "i": "chart"
    },
    {
     "t": "消耗品　合計 5,980円",
     "f": [
      1,
      4
     ],
     "i": "chart"
    },
    {
     "t": "通信費　合計 4,400円",
     "f": [
      3
     ],
     "i": "chart"
    },
    {
     "t": "「経費まとめ_10月.pdf」を作成",
     "f": [],
     "i": "doc"
    },
    {
     "t": "税理士の田中様へメール送信",
     "f": [],
     "i": "mail"
    }
   ],
   "steps": [
    "シートを読み込み中…",
    "科目ごとに集計中…",
    "科目ごとに集計中…",
    "PDFを作成中…",
    "メールを送信中…"
   ],
   "man": 45,
   "gas": 10,
   "per": 12,
   "perT": "毎月1回"
  },
  {
   "tab": "お客様へ一斉メール",
   "ti": "mail",
   "ref": "No.005 メールを一斉に自動送信",
   "trig": [
    "tap",
    "ボタンを1回押したら"
   ],
   "inL": [
    "sheet",
    "お客様リスト"
   ],
   "ins": [
    "佐藤 花子 様",
    "鈴木 一郎 様",
    "高橋 美咲 様",
    "田中 健太 様",
    "伊藤 さくら 様",
    "渡辺 大輔 様"
   ],
   "more": "人数が100人に増えても、押すボタンは1回だけです。",
   "outL": [
    "mail",
    "宛名入りのメールを送信"
   ],
   "outs": [
    {
     "t": "佐藤 花子 様へ「いつもありがとうございます」",
     "f": [
      0
     ],
     "i": "mail"
    },
    {
     "t": "鈴木 一郎 様へ「いつもありがとうございます」",
     "f": [
      1
     ],
     "i": "mail"
    },
    {
     "t": "高橋 美咲 様へ「いつもありがとうございます」",
     "f": [
      2
     ],
     "i": "mail"
    },
    {
     "t": "田中 健太 様へ「いつもありがとうございます」",
     "f": [
      3
     ],
     "i": "mail"
    },
    {
     "t": "伊藤 さくら 様へ「いつもありがとうございます」",
     "f": [
      4
     ],
     "i": "mail"
    },
    {
     "t": "渡辺 大輔 様へ「いつもありがとうございます」",
     "f": [
      5
     ],
     "i": "mail"
    }
   ],
   "steps": [
    "リストを読み込み中…",
    "宛名を差し込み中…",
    "送信中…",
    "送信中…",
    "送信中…",
    "送信中…"
   ],
   "man": 30,
   "gas": 15,
   "per": 12,
   "perT": "毎月1回のお知らせ"
  },
  {
   "tab": "毎朝の予定通知",
   "ti": "cal",
   "ref": "No.010 今日の予定を朝に通知",
   "trig": [
    "clock",
    "毎朝 8:00 になったら"
   ],
   "inL": [
    "cal",
    "Googleカレンダー（今日）"
   ],
   "ins": [
    "10:00　A社と打ち合わせ",
    "13:30　見積書の提出",
    "16:00　チーム定例"
   ],
   "outL": [
    "mail",
    "スマホに届くメール"
   ],
   "outs": [
    {
     "t": "件名：今日の予定（3件）",
     "f": [],
     "i": "mail"
    },
    {
     "t": "10:00 A社と打ち合わせ",
     "f": [
      0
     ],
     "i": "cal"
    },
    {
     "t": "13:30 見積書の提出",
     "f": [
      1
     ],
     "i": "cal"
    },
    {
     "t": "16:00 チーム定例",
     "f": [
      2
     ],
     "i": "cal"
    }
   ],
   "steps": [
    "カレンダーを確認中…",
    "予定をまとめ中…",
    "予定をまとめ中…",
    "メールを送信中…"
   ],
   "man": 5,
   "gas": 3,
   "per": 240,
   "perT": "営業日の毎朝"
  },
  {
   "tab": "申込に自動で返信",
   "ti": "form",
   "ref": "No.016 回答が来たら自動で返信",
   "trig": [
    "send",
    "フォームが送信されたら"
   ],
   "inL": [
    "form",
    "申込フォーム"
   ],
   "ins": [
    "お名前：山本 恵 様",
    "参加日：11月15日（土）",
    "メール：yamamoto@example.com"
   ],
   "outL": [
    "gear",
    "3つの作業が同時に完了"
   ],
   "outs": [
    {
     "t": "山本様へお礼メールを自動返信",
     "f": [
      0,
      2
     ],
     "i": "mail"
    },
    {
     "t": "申込一覧シートに1行追加",
     "f": [
      0,
      1
     ],
     "i": "sheet"
    },
    {
     "t": "チャットに「新しい申込」と通知",
     "f": [
      1
     ],
     "i": "chat"
    }
   ],
   "steps": [
    "回答を受け取り中…",
    "お礼メールを送信中…",
    "シートに記録中…",
    "チャットに通知中…"
   ],
   "man": 4,
   "gas": 2,
   "per": 300,
   "perT": "年300件の申込"
  }
 ]
};
