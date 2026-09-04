/**
 * 応募・進行中（v8 §5 §10）。
 *
 * 表示のいちばん大事な約束：**「応募なし」と断定しない。**
 * Googleフォームの回答が取り込まれるまでは、反映待ちであることを案内する。
 *
 * サーバーは linked かつ表示対象の応募だけを返す。
 * needs_review / unmatched / duplicate / invalid_token は
 * そもそもここへ返ってこないので、別人の応募が出ることはない。
 */
(function () {
  'use strict';

  var app, errBox;

  function esc(s) { return window.CMC.esc(s); }

  function entryHtml(e) {
    return '<article class="panel">' +
      '<h3>' + esc(e.projectName) + '</h3>' +
      '<div class="summary"><dl>' +
        '<dt>状態</dt><dd><span class="pill on">' + esc(e.statusLabel) + '</span></dd>' +
        '<dt>応募日</dt><dd>' + esc(formatDate(e.submittedAt)) + '</dd>' +
      '</dl></div>' +
      '</article>';
  }

  function formatDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var days = ['日', '月', '火', '水', '木', '金', '土'];
    // 日本時間で表示する
    var j = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    return j.getUTCFullYear() + '年' + (j.getUTCMonth() + 1) + '月' + j.getUTCDate() + '日' +
      '（' + days[j.getUTCDay()] + '）';
  }

  function render(data) {
    var head = '<div class="sec sec-lead"><p class="sec-en">ENTRIES</p><h2>応募・進行中</h2></div>';

    // 1. プロフィール未完了
    if (data.profileStatus !== 'complete') {
      var label = data.profileStatus === 'draft'
        ? '登録の続きへ進む'
        : 'CASTプロフィールを登録する';
      app.innerHTML = head +
        '<div class="empty">' +
          '<strong>プロフィール登録後に、応募した案件を確認できます</strong>' +
          '<p>先にCASTプロフィールのご登録をお願いします。登録は初回の1回のみです。</p>' +
          '<a class="btn btn-primary" href="../profile/">' + esc(label) + '</a>' +
        '</div>';
      app.hidden = false;
      return;
    }

    var list = data.entries || [];

    // 2. 応募あり
    if (list.length > 0) {
      app.innerHTML = head +
        '<div class="notice">応募後の反映には数分かかる場合があります。' +
        '送信直後にこちらへ表示されていなくても、受付は完了しています。</div>' +
        list.map(entryHtml).join('');
      app.hidden = false;
      return;
    }

    // 3. 応募なし。ただし「応募なし」と断定しない
    app.innerHTML = head +
      '<div class="notice">応募情報は順次こちらへ反映します。' +
      'Googleフォームからの応募後、反映まで数分かかる場合があります。</div>' +
      '<div class="panel">' +
        (data.syncStarted
          ? '<h3>いま受付済みの応募はありません</h3>' +
            '<p>応募を送信された直後の場合は、反映までしばらくお待ちください。' +
            '時間をおいても表示されないときは、お問い合わせください。</p>'
          : '<h3>応募の受付前です</h3>' +
            '<p>案件の募集はLINEのメッセージでご案内します。' +
            '応募後は、この画面で受付状況をご確認いただけます。</p>') +
      '</div>' +
      '<div class="actions">' +
        '<a class="btn btn-secondary" href="../projects/">募集中の案件を見る</a>' +
      '</div>';
    app.hidden = false;
  }

  document.addEventListener('DOMContentLoaded', function () {
    app = window.CMC.el('app');
    errBox = window.CMC.el('error');

    window.CMC.boot(function () {
      return window.CMC.post('entries.list', {})
        .then(render)
        .catch(function (e) { window.CMC.showError(errBox, e); });
    });
  });
})();
