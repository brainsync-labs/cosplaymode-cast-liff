/**
 * LIFF の起動と API 呼び出し（共通）。
 *
 * ここは「LINEの中で開かれていること」を前提にする。
 * URLパラメータで登録状態やユーザーを偽装できる仕組みは作らない（v8 §14.6 / §14.12）。
 */
(function () {
  'use strict';

  var CFG = window.CMC_CONFIG || {};

  /* ---------- ユーティリティ ---------- */

  function el(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** 通信の再送を見分けるためのキー。ボタン連打で行が増えないようにする */
  function newIdempotencyKey() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return 'k-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }

  /* ---------- エラー表示 ---------- */

  /**
   * 利用者へ出すのは、短い説明・再試行方法・エラーコード・問い合わせ番号だけ。
   * 内部の詳細は出さない（v8 §14.1）。
   */
  function showError(container, err) {
    var code = err && err.errorCode ? err.errorCode : 'SYS-001';
    var msg = err && err.message ? err.message
      : '処理を完了できませんでした。時間をおいてもう一度お試しください。';
    var rid = err && (err.shortRequestId || err.requestId) ? (err.shortRequestId || err.requestId).slice(0, 8) : '';

    container.innerHTML =
      '<div class="error-box" role="alert">' +
        '<p>' + esc(msg) + '</p>' +
        '<p class="meta">エラーコード：' + esc(code) +
        (rid ? '<br>お問い合わせ番号：' + esc(rid) : '') + '</p>' +
      '</div>';
    container.hidden = false;
  }

  function clearError(container) {
    container.innerHTML = '';
    container.hidden = true;
  }

  /* ---------- API ---------- */

  var idToken = null;

  /**
   * GAS へ POST する。
   * Content-Type は text/plain。application/json にすると CORS のプリフライトが
   * 発生し、GAS はそれに応答できないため必ず失敗する。
   * カスタムヘッダーも付けない（同じ理由）。
   */
  function post(action, payload) {
    if (!CFG.apiUrl || CFG.apiUrl.indexOf('__') === 0) {
      return Promise.reject({
        errorCode: 'SYS-001',
        message: 'この画面はまだ公開準備中です。時間をおいて開き直してください。',
      });
    }

    var body = { action: action, idToken: idToken, payload: payload || {} };

    return fetch(CFG.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      redirect: 'follow',
    })
      .then(function (res) { return res.json(); })
      .then(function (json) {
        if (!json || json.ok !== true) return Promise.reject(json || {});
        // 画面とAPIの版数がずれていたら記録する（キャッシュ・再デプロイ漏れの検出）
        if (json.releaseVersion && json.releaseVersion !== CFG.releaseVersion) {
          console.warn('version mismatch: page=' + CFG.releaseVersion + ' api=' + json.releaseVersion);
        }
        window.CMC_API_VERSION = json.releaseVersion;
        return json.data;
      })
      .catch(function (e) {
        if (e && e.errorCode) return Promise.reject(e);
        return Promise.reject({
          errorCode: 'SYS-001',
          message: '通信できませんでした。電波の良い場所でもう一度お試しください。',
        });
      });
  }

  /* ---------- 起動 ---------- */

  /**
   * LIFF を初期化してIDトークンを取り、onReady を呼ぶ。
   * IDトークンはメモリにだけ置き、URL・localStorage・ログへ出さない。
   */
  function boot(onReady) {
    var errBox = el('error');
    var loading = el('loading');

    if (!CFG.liffId || CFG.liffId.indexOf('__') === 0) {
      if (loading) loading.hidden = true;
      showError(errBox, {
        errorCode: 'SYS-001',
        message: 'この画面はまだ公開準備中です。9月4日の公開までお待ちください。',
      });
      return;
    }

    if (typeof liff === 'undefined') {
      if (loading) loading.hidden = true;
      showError(errBox, {
        errorCode: 'AUTH-001',
        message: 'LINEの情報を取得できませんでした。LINEアプリのメニューから開き直してください。',
      });
      return;
    }

    liff.init({ liffId: CFG.liffId })
      .then(function () {
        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href });
          return null;
        }
        idToken = liff.getIDToken();
        if (!idToken) {
          // LIFF のスコープに openid が無いとここに落ちる
          return Promise.reject({
            errorCode: 'AUTH-001',
            message: 'LINEの情報を取得できませんでした。LINEアプリのメニューから開き直してください。',
          });
        }
        if (loading) loading.hidden = true;
        return onReady();
      })
      .catch(function (e) {
        if (loading) loading.hidden = true;
        showError(errBox, e && e.errorCode ? e : {
          errorCode: 'AUTH-002',
          message: 'ログイン情報の有効期限が切れました。この画面を閉じて、もう一度開いてください。',
        });
      });
  }

  /** フッターに版数を出す（v8 §14.9） */
  function renderVersion() {
    var f = el('version');
    if (!f) return;
    f.textContent = 'Version ' + (CFG.releaseVersion || '-');
  }

  /** リッチメニューの他のページへ戻る導線 */
  function liffPath(path) {
    if (!CFG.liffId || CFG.liffId.indexOf('__') === 0) return path;
    return 'https://liff.line.me/' + CFG.liffId + path;
  }

  window.CMC = {
    el: el,
    esc: esc,
    post: post,
    boot: boot,
    showError: showError,
    clearError: clearError,
    renderVersion: renderVersion,
    newIdempotencyKey: newIdempotencyKey,
    liffPath: liffPath,
  };

  document.addEventListener('DOMContentLoaded', renderVersion);
})();
