/**
 * CASTプロフィール（v8 §5 / §7 / §8）。
 *
 * 3つの状態を、サーバーが返した profileStatus だけで切り替える。
 *   not_registered → 初回登録（STEP1から）
 *   draft          → 保存済みの値を入れて、未完了の最初のステップから再開
 *   complete       → 確認・変更
 *
 * 登録済みの人に空のフォームを見せない。URLパラメータで状態を変えられる余地は作らない。
 */
(function () {
  'use strict';

  var app, errBox, state = null, cache = {};

  /* ---------- 選択肢（サーバーの検証と同じ集合） ---------- */

  var PREFECTURES = ['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
  var AREAS = ['北海道・東北','関東','中部','関西','中国・四国','九州・沖縄'];
  var PREPARATION = ['可','条件付き可','不可'];
  var WEEKDAYS = ['平日','土日祝'];
  var TIME_SLOTS = ['午前','午後','夜間'];
  var TRAVEL = ['遠征可','近隣のみ','不可'];

  /* ---------- 項目定義 ---------- */

  var STEPS = [
    {
      no: 1,
      title: '基本情報',
      fields: [
        { name: 'activityName', label: '活動名／コスプレネーム', type: 'text', required: true, hint: '案件のご案内や誌面掲載で使用します。あとから変更できます。' },
        { name: 'email', label: 'メールアドレス', type: 'email', required: true, hint: '例: taro@example.com' },
        { name: 'birthDate', label: '生年月日', type: 'date', required: true, hint: '年齢の表示には使いません。18歳未満の方の確認にのみ使用します。' },
        { name: 'prefecture', label: 'お住まいの都道府県', type: 'select', required: true, options: PREFECTURES, hint: '住所の全文はお聞きしません。' },
      ],
    },
    {
      no: 2,
      title: '活動条件',
      fields: [
        { name: 'availableAreas', label: '対応可能なエリア', type: 'checks', required: true, options: AREAS, hint: '複数選べます。' },
        { name: 'availableAreasNote', label: 'エリアの補足', type: 'text', required: false, hint: '「都内であれば平日も可」など、あれば記入してください。' },
        { name: 'heightCm', label: '身長', type: 'number', required: true, unit: 'cm', min: 100, max: 230 },
        { name: 'shoeSizeCm', label: '靴のサイズ', type: 'number', required: true, unit: 'cm', min: 18, max: 35, stepAttr: '0.5' },
        { name: 'wigPreparation', label: 'ウィッグのご自身での準備', type: 'radios', required: true, options: PREPARATION },
        { name: 'makeupPreparation', label: 'メイクのご自身での準備', type: 'radios', required: true, options: PREPARATION },
        { name: 'availableWeekdays', label: '活動できる曜日', type: 'checks', required: true, options: WEEKDAYS },
        { name: 'availableTimeSlots', label: '活動できる時間帯', type: 'checks', required: true, options: TIME_SLOTS },
        { name: 'travelAvailability', label: '遠征の可否', type: 'radios', required: true, options: TRAVEL },
      ],
    },
    {
      no: 3,
      title: 'SNS・同意',
      fields: [
        { name: 'xAccount', label: 'X（旧Twitter）', type: 'text', required: false, hint: '@から始まるIDまたはURL' },
        { name: 'instagramAccount', label: 'Instagram', type: 'text', required: false },
        { name: 'tiktokAccount', label: 'TikTok', type: 'text', required: false },
        { name: 'otherSns', label: 'その他のSNS', type: 'text', required: false },
      ],
      snsNote: true,
    },
  ];

  /** 登録完了後だけ追加できる任意項目（v8 §7） */
  var OPTIONAL_FIELDS = [
    { name: 'weightKg', label: '体重', type: 'text', hint: '回答しない場合は空欄のままで構いません。' },
    { name: 'bustCm', label: 'バスト', type: 'text' },
    { name: 'waistCm', label: 'ウエスト', type: 'text' },
    { name: 'hipCm', label: 'ヒップ', type: 'text' },
    { name: 'topSize', label: 'トップスのサイズ', type: 'text' },
    { name: 'bottomSize', label: 'ボトムスのサイズ', type: 'text' },
    { name: 'specialties', label: '得意ジャンル', type: 'text' },
    { name: 'faceVisibility', label: '顔出しの可否', type: 'text' },
    { name: 'selfPr', label: '活動歴・自己PR', type: 'textarea' },
    { name: 'notes', label: '備考', type: 'textarea' },
  ];

  /* ---------- 描画 ---------- */

  function esc(s) { return window.CMC.esc(s); }

  function valueOf(name) {
    if (cache[name] !== undefined) return cache[name];
    var p = state && state.profile ? state.profile : {};
    var v = p[name];
    return v === undefined || v === null ? '' : v;
  }

  function fieldHtml(f) {
    var v = valueOf(f.name);
    var badge = f.required ? '<span class="req">必須</span>' : '<span class="opt">任意</span>';
    var body = '';

    if (f.type === 'select') {
      body = '<select id="f-' + f.name + '" name="' + f.name + '">' +
        '<option value="">選んでください</option>' +
        f.options.map(function (o) {
          return '<option value="' + esc(o) + '"' + (String(v) === o ? ' selected' : '') + '>' + esc(o) + '</option>';
        }).join('') + '</select>';

    } else if (f.type === 'checks' || f.type === 'radios') {
      var picked = f.type === 'checks' ? (Array.isArray(v) ? v : (v ? [v] : [])) : [String(v)];
      var inputType = f.type === 'checks' ? 'checkbox' : 'radio';
      body = '<div class="choices" id="f-' + f.name + '">' + f.options.map(function (o, i) {
        var id = 'f-' + f.name + '-' + i;
        var on = picked.indexOf(o) >= 0;
        return '<label for="' + id + '"><input type="' + inputType + '" id="' + id + '" name="' + f.name + '"' +
          ' value="' + esc(o) + '"' + (on ? ' checked' : '') + '>' + esc(o) + '</label>';
      }).join('') + '</div>';

    } else if (f.type === 'textarea') {
      body = '<textarea id="f-' + f.name + '" name="' + f.name + '">' + esc(v) + '</textarea>';

    } else if (f.type === 'number') {
      var input = '<input type="number" inputmode="decimal" id="f-' + f.name + '" name="' + f.name + '"' +
        ' value="' + esc(v) + '"' +
        (f.min !== undefined ? ' min="' + f.min + '"' : '') +
        (f.max !== undefined ? ' max="' + f.max + '"' : '') +
        (f.stepAttr ? ' step="' + f.stepAttr + '"' : '') + '>';
      body = f.unit ? '<div class="suffix">' + input + '<span>' + esc(f.unit) + '</span></div>' : input;

    } else {
      body = '<input type="' + (f.type === 'email' ? 'email' : f.type === 'date' ? 'date' : 'text') + '"' +
        ' id="f-' + f.name + '" name="' + f.name + '" value="' + esc(v) + '"' +
        (f.type === 'email' ? ' inputmode="email" autocomplete="email"' : '') + '>';
    }

    var labelTag = (f.type === 'checks' || f.type === 'radios')
      ? '<span class="label">' + esc(f.label) + badge + '</span>'
      : '<label for="f-' + f.name + '">' + esc(f.label) + badge + '</label>';

    return '<div class="field" data-field="' + f.name + '">' +
      labelTag + body +
      (f.hint ? '<p class="hint">' + esc(f.hint) + '</p>' : '') +
      '<p class="err-msg" id="e-' + f.name + '"></p>' +
      '</div>';
  }

  function stepsBar(current) {
    return '<ol class="steps">' + STEPS.map(function (s) {
      var cls = s.no === current ? 'on' : (s.no < current ? 'done' : '');
      return '<li class="' + cls + '">' +
        '<span class="no">' + s.no + '</span>' +
        '<span class="t">' + esc(s.title) + '</span></li>';
    }).join('') + '</ol>';
  }

  function renderStep(no) {
    var step = STEPS[no - 1];
    var isMinor = state && state.profile && state.profile.isMinor;
    var extra = '';

    if (step.snsNote) {
      extra += '<div class="notice">X・Instagram・TikTok のうち、<strong>1つ以上</strong>のご入力をお願いします。' +
        'お持ちでないサービスは空欄のままで構いません。</div>';
    }

    if (no === 3) {
      if (isMinor) {
        extra += '<div class="field" data-field="guardianConsentInitial">' +
          '<label class="check" for="f-guardian">' +
          '<input type="checkbox" id="f-guardian" name="guardianConsentInitial"' +
          (valueOf('guardianConsentInitial') === true ? ' checked' : '') + '>' +
          '<span>保護者の同意を得ています<span class="req">必須</span><br>' +
          '<span class="hint">18歳未満の方のみ表示しています。案件へ進む際に、あらためて保護者の方の同意確認をお願いすることがあります。</span></span>' +
          '</label><p class="err-msg" id="e-guardianConsentInitial"></p></div>';
      }
      extra += '<div class="field" data-field="termsAgreed">' +
        '<label class="check" for="f-terms">' +
        '<input type="checkbox" id="f-terms" name="termsAgreed">' +
        '<span>利用規約とプライバシーポリシーに同意します<span class="req">必須</span></span>' +
        '</label><p class="err-msg" id="e-termsAgreed"></p></div>';
    }

    var resumed = state && state.profileStatus === 'draft' && no > 1;

    app.innerHTML =
      '<h1>CASTプロフィールの登録</h1>' +
      '<p class="lead">登録は初回の1回のみです。登録後はLINEからいつでも確認・変更できます。</p>' +
      (resumed ? '<div class="notice">前回の続きから再開します。入力済みの内容は保存されています。</div>' : '') +
      stepsBar(no) +
      '<h2>' + esc(step.title) + '</h2>' +
      step.fields.map(fieldHtml).join('') +
      extra +
      '<div class="actions">' +
        (no > 1 ? '<button type="button" class="btn btn-secondary" id="back">前へ戻る</button>' : '') +
        '<button type="button" class="btn btn-primary" id="next">' +
          (no === 3 ? '登録を完了する' : '次へ進む') +
        '</button>' +
      '</div>';

    app.hidden = false;
    window.scrollTo(0, 0);

    if (no > 1) {
      window.CMC.el('back').addEventListener('click', function () {
        collect(no);
        renderStep(no - 1);
      });
    }
    window.CMC.el('next').addEventListener('click', function () { submitStep(no); });
  }

  /** 画面の入力値を cache へ取り込む。通信失敗時もここに残るので入力が消えない */
  function collect(no) {
    var fields = STEPS[no - 1].fields.slice();
    if (no === 3) {
      fields = fields.concat([{ name: 'guardianConsentInitial', type: 'flag' }, { name: 'termsAgreed', type: 'flag' }]);
    }
    fields.forEach(function (f) {
      if (f.type === 'checks') {
        var boxes = app.querySelectorAll('input[name="' + f.name + '"]:checked');
        cache[f.name] = Array.prototype.map.call(boxes, function (b) { return b.value; });
      } else if (f.type === 'radios') {
        var r = app.querySelector('input[name="' + f.name + '"]:checked');
        cache[f.name] = r ? r.value : '';
      } else if (f.type === 'flag') {
        var c = app.querySelector('input[name="' + f.name + '"]');
        cache[f.name] = c ? c.checked : false;
      } else {
        var i = window.CMC.el('f-' + f.name);
        if (i) cache[f.name] = i.value;
      }
    });
    return cache;
  }

  function clearFieldErrors() {
    Array.prototype.forEach.call(app.querySelectorAll('.field.bad'), function (n) {
      n.classList.remove('bad');
    });
    Array.prototype.forEach.call(app.querySelectorAll('.err-msg'), function (n) {
      n.textContent = '';
    });
  }

  function showFieldErrors(fields) {
    var first = null;
    Object.keys(fields || {}).forEach(function (name) {
      // sns は3項目にまたがるので、まとめて X の下に出す
      var target = name === 'sns' ? 'xAccount' : name;
      var box = app.querySelector('[data-field="' + target + '"]');
      var msg = window.CMC.el('e-' + target);
      if (box) box.classList.add('bad');
      if (msg) msg.textContent = fields[name];
      if (!first && box) first = box;
    });
    if (first) first.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function submitStep(no) {
    var btn = window.CMC.el('next');
    var values = collect(no);
    clearFieldErrors();
    window.CMC.clearError(errBox);

    btn.disabled = true;
    btn.textContent = '保存しています…';

    // 同じ操作の再送で行が増えないよう、ステップごとに1つのキーを使い回す
    if (!cache['__key' + no]) cache['__key' + no] = window.CMC.newIdempotencyKey();

    window.CMC.post('profile.saveStep', {
      step: no,
      values: values,
      idempotencyKey: cache['__key' + no],
    })
      .then(function (data) {
        state = data;
        delete cache['__key' + no];
        if (data.profileStatus === 'complete') {
          renderComplete(true);
        } else {
          renderStep(Math.min(no + 1, 3));
        }
      })
      .catch(function (e) {
        btn.disabled = false;
        btn.textContent = no === 3 ? '登録を完了する' : '次へ進む';
        // 保存に失敗しても入力は画面に残っている（cache から再描画される）
        if (e && e.errorCode === 'PRF-002' && e.fields) {
          showFieldErrors(e.fields);
          window.CMC.showError(errBox, {
            errorCode: e.errorCode,
            message: '入力内容をご確認ください。',
            shortRequestId: e.shortRequestId,
          });
        } else {
          window.CMC.showError(errBox, e);
        }
        window.scrollTo(0, 0);
      });
  }

  /* ---------- 確認・変更 ---------- */

  function joinList(v) { return Array.isArray(v) ? v.join('、') : (v || ''); }

  function renderComplete(justSaved) {
    var p = state.profile || {};
    cache = {};

    function row(label, value) {
      return '<dt>' + esc(label) + '</dt><dd>' + esc(value) + '</dd>';
    }

    app.innerHTML =
      (justSaved
        ? '<div class="notice done"><strong>CASTプロフィールを登録しました。</strong><br>今後はLINEからいつでも確認・変更できます。</div>'
        : '') +
      '<h1>登録情報の確認・変更</h1>' +
      '<p class="lead">CAST ID：' + esc(p.castId || state.castId || '') + '</p>' +

      '<h2>基本情報</h2><div class="summary"><dl>' +
        row('活動名', p.activityName) +
        row('メール', p.email) +
        row('生年月日', p.birthDate) +
        row('都道府県', p.prefecture) +
      '</dl></div>' +

      '<h2>活動条件</h2><div class="summary"><dl>' +
        row('対応エリア', joinList(p.availableAreas)) +
        row('エリア補足', p.availableAreasNote) +
        row('身長', p.heightCm ? p.heightCm + ' cm' : '') +
        row('靴のサイズ', p.shoeSizeCm ? p.shoeSizeCm + ' cm' : '') +
        row('ウィッグ', p.wigPreparation) +
        row('メイク', p.makeupPreparation) +
        row('活動曜日', joinList(p.availableWeekdays)) +
        row('活動時間帯', joinList(p.availableTimeSlots)) +
        row('遠征', p.travelAvailability) +
      '</dl></div>' +

      '<h2>SNS</h2><div class="summary"><dl>' +
        row('X', p.xAccount) +
        row('Instagram', p.instagramAccount) +
        row('TikTok', p.tiktokAccount) +
        row('その他', p.otherSns) +
      '</dl></div>' +

      '<h2>任意項目</h2><div class="summary"><dl>' +
        OPTIONAL_FIELDS.map(function (f) { return row(f.label, p[f.name]); }).join('') +
      '</dl></div>' +

      '<div class="actions">' +
        '<button type="button" class="btn btn-primary" id="edit">登録内容を変更する</button>' +
      '</div>';

    app.hidden = false;
    window.scrollTo(0, 0);
    window.CMC.el('edit').addEventListener('click', renderEdit);
  }

  function renderEdit() {
    var all = STEPS.reduce(function (acc, s) { return acc.concat(s.fields); }, []);
    var isMinor = state && state.profile && state.profile.isMinor;

    app.innerHTML =
      '<h1>登録内容の変更</h1>' +
      '<p class="lead">変更したい項目だけ書き換えて保存してください。触っていない項目はそのまま残ります。</p>' +
      '<h2>基本情報・活動条件・SNS</h2>' +
      all.map(fieldHtml).join('') +
      (isMinor
        ? '<div class="field" data-field="guardianConsentInitial"><label class="check" for="f-guardian">' +
          '<input type="checkbox" id="f-guardian" name="guardianConsentInitial"' +
          (state.profile.guardianConsentInitial ? ' checked' : '') + '>' +
          '<span>保護者の同意を得ています<span class="req">必須</span></span></label>' +
          '<p class="err-msg" id="e-guardianConsentInitial"></p></div>'
        : '') +
      '<h2>任意項目</h2>' +
      '<p class="lead">未入力のままでも登録は有効です。案件のご案内の精度が上がります。</p>' +
      OPTIONAL_FIELDS.map(fieldHtml).join('') +
      '<div class="actions">' +
        '<button type="button" class="btn btn-secondary" id="cancel">やめる</button>' +
        '<button type="button" class="btn btn-primary" id="save">変更を保存する</button>' +
      '</div>';

    app.hidden = false;
    window.scrollTo(0, 0);

    window.CMC.el('cancel').addEventListener('click', function () {
      cache = {};
      renderComplete(false);
    });

    window.CMC.el('save').addEventListener('click', function () {
      var btn = window.CMC.el('save');
      var values = {};

      all.concat(OPTIONAL_FIELDS).forEach(function (f) {
        if (f.type === 'checks') {
          var boxes = app.querySelectorAll('input[name="' + f.name + '"]:checked');
          values[f.name] = Array.prototype.map.call(boxes, function (b) { return b.value; });
        } else if (f.type === 'radios') {
          var r = app.querySelector('input[name="' + f.name + '"]:checked');
          values[f.name] = r ? r.value : '';
        } else {
          var i = window.CMC.el('f-' + f.name);
          if (i) values[f.name] = i.value;
        }
      });
      if (isMinor) {
        var g = app.querySelector('input[name="guardianConsentInitial"]');
        values.guardianConsentInitial = g ? g.checked : false;
      }
      cache = values;

      clearFieldErrors();
      window.CMC.clearError(errBox);
      btn.disabled = true;
      btn.textContent = '保存しています…';

      if (!cache.__keyEdit) cache.__keyEdit = window.CMC.newIdempotencyKey();

      window.CMC.post('profile.update', { values: values, idempotencyKey: cache.__keyEdit })
        .then(function (data) {
          state = data;
          cache = {};
          renderComplete(false);
        })
        .catch(function (e) {
          btn.disabled = false;
          btn.textContent = '変更を保存する';
          if (e && e.errorCode === 'PRF-002' && e.fields) {
            showFieldErrors(e.fields);
            window.CMC.showError(errBox, {
              errorCode: e.errorCode, message: '入力内容をご確認ください。', shortRequestId: e.shortRequestId,
            });
          } else {
            window.CMC.showError(errBox, e);
          }
          window.scrollTo(0, 0);
        });
    });
  }

  /* ---------- 起動 ---------- */

  document.addEventListener('DOMContentLoaded', function () {
    app = window.CMC.el('app');
    errBox = window.CMC.el('error');

    window.CMC.boot(function () {
      return window.CMC.post('profile.get', {})
        .then(function (data) {
          state = data;
          if (data.profileStatus === 'complete') renderComplete(false);
          else renderStep(data.nextStep || 1);
        })
        .catch(function (e) { window.CMC.showError(errBox, e); });
    });
  });
})();
