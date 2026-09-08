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
          ? '<button type="button" class="btn btn-primary js-apply" data-id="' + esc(p.projectId) + '">この案件に応募する<span class="chev"></span></button>'
          : '<a class="btn btn-primary" href="../profile/">先にCASTプロフィールを登録する</a>') +
      '</div>' +
      '</article>';
  }

  function render(data) {
    var canApply = data.profileStatus === 'complete';
    var list = data.projects || [];

    var head = '<div class="sec sec-lead"><p class="sec-en">PROJECTS</p><h2>募集中の案件</h2></div>';

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
        // 自動で開かない。liff.openWindow({external:true}) はAndroidで
        // 無反応になることがあり、「押しても何も起きない」状態になっていた
        // （2026-09-06）。本人がタップするリンクを出せば必ず開く。
        //
        // このとき応募ボタンを押せる状態で残すと、同じ色のボタンが2つ並んで
        // 押し間違える（2026-09-08 の指摘）。役目が終わったので無効化する。
        btn.disabled = true;
        btn.textContent = '応募フォームを準備しました';
        showFormLink(projectId, data.formUrl);
      })
      .catch(function (e) {
        // 失敗したときは押し直せるように戻す
        btn.disabled = false;
        btn.innerHTML = 'この案件に応募する<span class="chev"></span>';

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

  /**
   * 応募フォームへのリンクを出す。
   *
   * 以前は liff.openWindow で自動的に開いていたが、Androidで無反応になり
   * 「押しても何も起きない」という問い合わせが出た（2026-09-06）。
   * 本人のタップで開く形にすれば、どの端末でも確実に開く。
   */
  function showFormLink(projectId, formUrl) {
    var card = app.querySelector('[data-project="' + projectId + '"]');
    if (!card) return;

    var old = card.querySelector('.js-opened');
    if (old) old.parentNode.removeChild(old);

    var box = document.createElement('div');
    box.className = 'js-opened';
    box.innerHTML =
      '<div class="actions" style="margin-top:14px">' +
        '<a class="btn btn-go" href="' + esc(formUrl) + '" target="_blank" rel="noopener">' +
          '応募フォームを開く<span class="chev"></span>' +
        '</a>' +
      '</div>' +
      '<div class="notice notice-go" style="margin-top:12px">' +
        '<strong>上の緑のボタンから応募フォームが開きます。</strong><br>' +
        '送信が終わったら、この画面に戻ってください。<br>' +
        '「エントリー済みの案件」への反映には数分かかる場合があります。' +
      '</div>';
    card.appendChild(box);
    box.scrollIntoView({ block: 'center' });
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
