/**
 * 公開してよい設定値だけを置く。
 *
 * ここに秘密情報を書かないこと。
 * チャネルシークレット・アクセストークン・スプレッドシートIDは
 * すべて GAS のスクリプトプロパティ側にあり、この JS からは触れない。
 *
 * セキュリティはこのファイルの非公開性に頼らない。
 * すべての個人情報APIは、GAS 側で LINE IDトークンを検証したうえで応答する。
 */
window.CMC_CONFIG = {
  // LINE Developers > LIFF で発行される ID（公開情報）
  liffId: '__LIFF_ID__',

  // GAS ウェブアプリの /exec URL（公開情報）
  apiUrl: '__GAS_API_URL__',

  // 画面側のリリース版数。GAS 側の RELEASE_VERSION と一致していること
  releaseVersion: '2026.09.04-01',

  // 問い合わせ導線
  contactUrl: '',
};
