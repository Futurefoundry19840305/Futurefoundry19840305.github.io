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
