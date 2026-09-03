/**
 * 募集中の案件（v8 §5 §10）。
 *
 * 案件情報はプロフィール未登録でも閲覧できる。
 * ただし応募CTAを押した時点でプロフィール完了を必須とし、
 * 未完了なら登録の続きへ誘導する。
 *
 * 応募の可否・締切・トークン発行はすべてサーバーで判定する。
 * この画面の表示状態を根拠に応募を通さない。
 */
(function () {
  'use strict';

  var app, errBox;

  function esc(s) { return window.CMC.esc(s); }

  function projectHtml(p, canApply) {
    return '<article class="panel" data-project="' + esc(p.projectId) + '">' +
      '<h3>' + esc(p.projectName) + '</h3>' +
      '<p>' + esc(p.shortDescription) + '</p>' +
      '<div class="summary"><dl>' +
        '<dt>応募締切</dt><dd>' + esc(p.applicationDeadlineLabel) + '</dd>' +
      '</dl></div>' +
      '<div class="actions">' +
        (canApply
          ? '<button type="button" class="btn btn-primary js-apply" data-id="' + esc(p.projectId) + '">この案件に応募する</button>'
          : '<a class="btn btn-primary" href="../profile/">先にCASTプロフィールを登録する</a>') +
      '</div>' +
      '</article>';
  }

  function render(data) {
    var canApply = data.profileStatus === 'complete';
    var list = data.projects || [];

    var head = '<h1>募集中の案件</h1>';

    if (list.length === 0) {
      app.innerHTML = head +
        '<div class="notice">案件の募集は<strong>LINEのメッセージでご案内します</strong>。<br>' +
        'メニューを見に来ていただかなくても、募集開始時にこちらからお知らせします。</div>' +
        '<div class="panel"><h3>いま募集中の案件はありません</h3>' +
        '<p>新しい募集が始まりましたら、公式LINEのメッセージでご案内します。' +
        (canApply ? '' : '<br>先にCASTプロフィールのご登録をお願いします。登録済みの方へ優先的にご案内します。') +
        '</p></div>' +
        (canApply ? '' : '<div class="actions"><a class="btn btn-primary" href="../profile/">CASTプロフィールを登録する</a></div>');
      app.hidden = false;
      return;
    }

    app.innerHTML = head +
      (canApply
        ? ''
        : '<div class="notice">案件の内容はご覧いただけます。<strong>ご応募にはCASTプロフィールの登録完了が必要です。</strong></div>') +
      list.map(function (p) { return projectHtml(p, canApply); }).join('');

    app.hidden = false;

    Array.prototype.forEach.call(app.querySelectorAll('.js-apply'), function (btn) {
      btn.addEventListener('click', function () { apply(btn); });
    });
  }

  /**
   * 応募を開始する。
   * サーバーが認証・プロフィール完了・締切を検証してから、
   * 連携用IDを事前入力した Google フォームのURLを返す。
   * 利用者にコードを手入力させない。
   */
  function apply(btn) {
    var projectId = btn.getAttribute('data-id');
    window.CMC.clearError(errBox);
    btn.disabled = true;
    btn.textContent = '応募フォームを準備しています…';

    window.CMC.post('entry.start', { projectId: projectId })
      .then(function (data) {
        btn.textContent = '応募フォームを開きます…';
        // LINE内ブラウザから外部ブラウザへ出す。フォーム送信の取りこぼしを避ける
        if (typeof liff !== 'undefined' && liff.openWindow) {
          liff.openWindow({ url: data.formUrl, external: true });
          btn.disabled = false;
          btn.textContent = 'この案件に応募する';
          showAfterOpen(projectId);
        } else {
          window.location.href = data.formUrl;
        }
      })
      .catch(function (e) {
        btn.disabled = false;
        btn.textContent = 'この案件に応募する';

        // 二重応募・締切済みは、原因が分かる文言で伝える
        if (e && e.errorCode === 'ENT-002') {
          replaceCard(projectId,
            '<h3>すでに応募済みです</h3>' +
            '<p>この案件にはご応募いただいています。受付状況は' +
            '<a href="../entries/">応募・進行中</a>からご確認ください。</p>');
          return;
        }
        if (e && e.errorCode === 'ENT-003') {
          replaceCard(projectId,
            '<h3>応募の受付は終了しました</h3>' +
            '<p>この案件の応募締切を過ぎています。次の募集をお待ちください。</p>');
          return;
        }
        window.CMC.showError(errBox, e);
        window.scrollTo(0, 0);
      });
  }

  function replaceCard(projectId, html) {
    var card = app.querySelector('[data-project="' + projectId + '"]');
    if (card) card.innerHTML = html;
  }

  function showAfterOpen(projectId) {
    var card = app.querySelector('[data-project="' + projectId + '"]');
    if (!card || card.querySelector('.js-opened')) return;
    var note = document.createElement('div');
    note.className = 'notice js-opened';
    note.innerHTML = '応募フォームを開きました。<strong>送信が終わったらこの画面に戻ってください。</strong><br>' +
      '「応募・進行中」への反映には数分かかる場合があります。';
    card.appendChild(note);
  }

  document.addEventListener('DOMContentLoaded', function () {
    app = window.CMC.el('app');
    errBox = window.CMC.el('error');

    window.CMC.boot(function () {
      return window.CMC.post('projects.list', {})
        .then(render)
        .catch(function (e) { window.CMC.showError(errBox, e); });
    });
  });
})();
