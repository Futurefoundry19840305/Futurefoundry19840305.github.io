# SIMPLE — 海と、街と、暮らしと。

ちいさな手仕事を、未来へつなぐ会社「SIMPLE」のコーポレートサイトです。

## 公開URL

https://futurefoundry19840305.github.io/

## 構成

- `index.html` — トップページ（ヒーロー／ギャラリー／事業内容／空間／暮らし／お問合せ／フッター）
- `assets/` — 画像素材
- `404.html` — Not Found ページ
- `.nojekyll` — Jekyll を無効化（`_` で始まるディレクトリをそのまま配信）

## 技術メモ

- React 18 + Babel Standalone を CDN から読み込み、ブラウザ上で JSX を解釈してレンダリングしています。
- デザインは 1440px 幅のキャンバスを基準に作られており、デスクトップでは `transform: scale()` でビューポートに合わせて縮小表示します。
- 1024px 以下のタブレット／スマートフォンでは、`transform` を解除してネイティブにレスポンシブ表示するレイアウトに切り替わります。

## ローカルでの確認方法

```sh
# このディレクトリで
python3 -m http.server 8000
# http://localhost:8000/ を開く
```

## ライセンス

© 2026 SIMPLE INC. ALL RIGHTS RESERVED.
