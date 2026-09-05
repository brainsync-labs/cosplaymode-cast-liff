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
  liffId: '2011428122-Stw0lwML',

  // GAS ウェブアプリの /exec URL（公開情報）
  apiUrl: 'https://script.google.com/macros/s/AKfycbwixWLUd_5r0QZ8Yo5OYkO30L41dO8gYRV1t-D-Qnt-GmNFPphliRmWXc-EsmcgrvGC/exec',

  // 画面側のリリース版数。GAS 側の RELEASE_VERSION と一致していること
  releaseVersion: '2026.09.05-03',

  // 問い合わせ導線
  contactUrl: '',
};
