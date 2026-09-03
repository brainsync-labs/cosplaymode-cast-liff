# cosplaymode-cast-liff

COSPLAY MODE CAST 公式LINEの LIFF フロントエンド（静的HTML）。

GitHub Pages で配信し、LINEアプリ内から LIFF として開かれる。

## このリポジトリに置くもの

静的なフロントエンド**だけ**。

```
index.html          入口
profile/            CASTプロフィールの登録・確認・変更
projects/           募集中の案件
entries/            応募・進行中
notices/            お知らせ
faq/                よくあるご質問
contact/            お問い合わせ
assets/
  app.css           共通スタイル
  app.js            LIFF起動とAPI呼び出し
  profile.js        プロフィール画面
  config.js         公開してよい設定値のみ
```

## このリポジトリに置かないもの

このリポジトリは public です。以下は**絶対に含めません**。

- チャネルシークレット、チャネルアクセストークン
- GAS のスクリプトプロパティ、その値
- 個人情報、旧CASTデータ、スプレッドシートの内容
- 認証を省略できるデバッグ機能
- 本番用の秘密鍵・認証情報

`assets/config.js` に置くのは LIFF ID・API の URL・リリース版数だけです。
いずれも公開されて問題のない値です。

## セキュリティ

**リポジトリの非公開性に依存しません。**

個人情報を扱うすべての API は、サーバー側（Google Apps Script）で
LINE の IDトークンを `https://api.line.me/oauth2/v2.1/verify` で検証し、
検証済みトークンの `sub` を利用者の識別子として使います。
クライアントが送った利用者IDは信用しません。

URLパラメータで登録状態や利用者を偽装できる仕組みは実装していません。

## 開発

バックエンド（Apps Script）とセットアップ手順は別管理です。
