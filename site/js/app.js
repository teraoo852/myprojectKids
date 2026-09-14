/* なぞって あいうえお — 画面の動き（spec §3〜§8・§13） */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var K = window.KIDS || {};

  /* ── 失敗を無言にしない（spec §8・CLAUDE.md §3-4） ── */
  function fail(err) {
    try { console.error('なぞって あいうえお:', err); } catch (e) { /* 何もしない */ }
    var f = $('#fail');
    if (!f) return;
    f.classList.remove('late'); f.hidden = false;
    var a = $('#app'); if (a) a.hidden = true;
    var b = $('#boot'); if (b) b.hidden = true;
  }
  window.addEventListener('error', function (e) { fail(e.error || e.message); });
  window.addEventListener('unhandledrejection', function (e) { fail(e.reason); });
  if (!K.ROWS || !K.ICONS || !K.UI || !K.TRACE) { fail('data.js・icons.js・trace.js のどれかが読めない'); return; }

  /* ── おとなに知らせること（画面5・「？」の ！ 印） ── */
  var WARN = { voice: false, store: false };
  var WARN_TEXT = {
    voice: 'この iPad には 日本語の読み上げ音声が ありません。「設定 › アクセシビリティ › 読み上げコンテンツ › 声」で 日本語の声を入れてください。',
    store: 'はなまるを 記録できません。プライベートブラウズを やめて、ホーム画面のアイコンから開いてください。'
  };
  function warn(kind) {
    if (WARN[kind]) return;
    WARN[kind] = true; renderWarns();
  }
  function renderWarns() {
    var html = '', any = false;
    Object.keys(WARN).forEach(function (k) {
      if (WARN[k]) { any = true; html += '<p class="warn">' + WARN_TEXT[k] + '</p>'; }
    });
    $('#warns').innerHTML = html;
    $('#helpBadge').hidden = !any;
  }

  /* ── 記録（spec §8）: はなまるを取った字だけ ── */
  var KEY = 'hira-stars';
  var store = {
    get: function () {
      try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; }
    },
    add: function (k) {
      try { var s = store.get(); s[k] = 1; localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { warn('store'); }
    },
    check: function () {
      try { localStorage.setItem('hira-test', '1'); localStorage.removeItem('hira-test'); } catch (e) { warn('store'); }
    }
  };

  /* ── 読み上げ（spec §8）: 押したときだけ。声の一覧で止めない（R2） ── */
  var jaVoice = null;
  function pickVoice() {
    try {
      var vs = speechSynthesis.getVoices();
      if (!vs || !vs.length) return;               // まだ そろっていない。空で「声が無い」と決めない
      jaVoice = null;
      for (var i = 0; i < vs.length; i++) { if (/^ja/i.test(vs[i].lang)) { jaVoice = vs[i]; break; } }
      if (!jaVoice) warn('voice');
    } catch (e) { /* 読み上げが使えなくても画面は動かす */ }
  }
  function initVoice() {
    if (!('speechSynthesis' in window)) { warn('voice'); return; }
    pickVoice();
    if (speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', pickVoice);
    setTimeout(pickVoice, 1500);
  }
  function speak(text) {
    if (!text || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();                     // 前の読み上げは止める
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP'; u.rate = 0.8; u.pitch = 1.1;
      if (jaVoice) u.voice = jaVoice;
      speechSynthesis.speak(u);
    } catch (e) { /* 読み上げが使えなくても画面は動かす */ }
  }

  /* ── 絵を差し込む: data-ui＝画面の絵、data-icon＝単語の絵（無ければ「？」） ── */
  function fillIcons(root) {
    var els = root.querySelectorAll('[data-ui],[data-icon]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i], ui = el.getAttribute('data-ui');
      var src = ui ? K.UI[ui] : K.ICONS[el.getAttribute('data-icon')];
      el.innerHTML = src
        ? '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">' + src + '</svg>'
        : '<span class="none" aria-hidden="true">？</span>';
    }
  }

  /* ── 字の一覧 ── */
  var byKey = {}, total = 0;
  K.ROWS.forEach(function (r) {
    r.chars.forEach(function (c) {
      if (!c) return;
      total++;
      byKey[c[1]] = { c: c[0], k: c[1], w: c[2], gyou: r.gyou, row: r.row };
    });
  });

  /* ── 画面の切り替えと URL（spec §4） ── */
  var SCREENS = ['chart', 'detail', 'otona'];
  var cur = null;
  function show(name) {
    SCREENS.forEach(function (id) { $('#' + id).hidden = id !== name; });
  }
  function route() {
    var h = decodeURIComponent(location.hash.slice(1));
    if (h === 'otona') showHelp();
    else if (h && byKey[h]) openChar(h);
    else showChart();
  }
  function go(hash) {
    if (location.hash !== '#' + hash) history.pushState(null, '', '#' + hash);
    route();
  }
  /* もどる は いつも画面1（履歴を1つ戻すのではない・R13） */
  function home() {
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    route();
  }

  /* ── 画面1 ひょう（spec §3） ── */
  function showChart() {
    stopTrace();
    var stars = store.get(), n = 0, html = '';
    K.ROWS.forEach(function (r) {
      r.chars.forEach(function (c) {
        if (!c) {
          html += '<div class="cell empty" data-row="' + r.row + '" aria-hidden="true"><span class="ch">・</span></div>';
          return;
        }
        var done = !!stars[c[1]];
        if (done) n++;
        html += '<button class="cell" data-row="' + r.row + '" data-key="' + c[1] + '" aria-label="' + c[0] + (done ? ' はなまる' : '') + '">' +
          '<span class="ch">' + c[0] + '</span>' + (done ? '<span class="mk" aria-hidden="true">◎</span>' : '') + '</button>';
      });
    });
    $('#grid').innerHTML = html;
    $('#stars').textContent = n;
    $('#total').textContent = total;
    show('chart');
  }

  /* ── 画面5 おとなの ひとへ（spec §13） ── */
  function showHelp() {
    stopTrace();
    renderWarns();
    show('otona');
    $('#otona').scrollTop = 0;
  }

  /* ── 画面2〜4 もじページ（spec §4〜§7） ── */
  function openChar(k) {
    cur = byKey[k];
    $('#detail').setAttribute('data-row', cur.row);
    $('#bigText').textContent = cur.c;
    $('#gyou').textContent = cur.gyou;
    renderPanels();
    setTab(0, false);
    show('detail');
  }

  /* 単語の中の その字を全部 強調する（spec §5） */
  function marked(word) {
    return word.split('').map(function (ch) { return ch === cur.c ? '<em>' + ch + '</em>' : ch; }).join('');
  }
  function noteHtml(note) {
    var html = note.strong ? note.text.replace(note.strong, '<b>' + note.strong + '</b>') : note.text;
    return '<button class="note" data-say="' + note.text + '">' + html + '<span class="nt" aria-hidden="true">♪</span></button>';
  }
  function card(w) {
    return '<button class="card" data-say="' + w[0] + '"><span class="pic" data-icon="' + w[1] + '"></span>' +
      '<span class="word">' + marked(w[0]) + '</span><span class="nt" aria-hidden="true">♪</span></button>';
  }
  function wrow(w) {
    return '<button class="wrow" data-say="' + w[0] + '"><span class="word">' + marked(w[0]) + '</span>' +
      '<span class="nt" aria-hidden="true">♪</span></button>';
  }
  function renderPanels() {
    var note = K.NOTE[cur.k];
    var words = note && note.example ? [note.example] : cur.w;     // を は例文カード（R14）
    var top = note ? noteHtml(note) : '';
    $('#p0').innerHTML = top + '<div class="cards">' + words.map(card).join('') + '</div>';
    $('#p1').innerHTML = top + '<div class="words">' + words.map(wrow).join('') + '</div>';
    fillIcons($('#p0'));
  }
  function onSay(e) {
    var el = e.target.closest('[data-say]');
    if (el) speak(el.getAttribute('data-say'));
  }

  function setTab(i, byTap) {
    for (var j = 0; j < 3; j++) {
      $('#tab' + j).setAttribute('aria-selected', j === i ? 'true' : 'false');
      $('#p' + j).hidden = j !== i;
    }
    if (i === 2) startTrace(byTap); else stopTrace();
  }

  /* ── 画面4 なぞる（spec §7） ── */
  var T = K.TRACE, INK = '#25313A';
  var GUIDE = 'しろい せんの うえを ゆびで なぞってね';
  var MSG = {
    empty: 'まだ なにも かいてないよ',
    good: 'はなまる！ よく できました',
    near: 'もうすこし！ しろい せんを ぜんぶ なぞってね',
    far: 'しろい せんの うえを なぞってみよう',
    wait: 'ちょっと まってね'
  };
  var gctx = null, ictx = null, m = null, drew = false, active = null, last = null, token = 0;

  function say(text, good) {
    var v = $('#verdict');
    v.textContent = text;
    v.className = 'verdict' + (good ? ' good' : '');
    speak(text);
  }
  function startTrace(byTap) {
    var g = $('#guide'), ink = $('#ink');
    g.width = g.height = ink.width = ink.height = T.S;
    gctx = g.getContext('2d'); ictx = ink.getContext('2d');
    m = null; active = null;
    clearInk();
    if (byTap) speak(GUIDE);                        // なぞるタブを押したら案内を声でも（R20）
    var my = ++token, ch = cur.c;
    T.loadFont(ch).then(function () {
      if (my !== token) return;                     // 別の字・タブに移った
      T.drawGuide(gctx, ch);
      m = T.masks(ch);
    });
  }
  function stopTrace() { token++; active = null; }
  function clearInk() {
    if (ictx) ictx.clearRect(0, 0, T.S, T.S);
    drew = false;
    $('#maru').classList.remove('on');
    var v = $('#verdict'); v.textContent = GUIDE; v.className = 'verdict';
  }
  function judge() {
    if (!m) { say(MSG.wait, false); return; }
    var r = drew ? T.measure(m, ictx.getImageData(0, 0, T.S, T.S).data) : null;
    var v = T.verdict(r);
    say(MSG[v], v === 'good');
    if (v === 'good') { $('#maru').classList.add('on'); store.add(cur.k); }
  }

  var box = $('#box');
  function pos(e) {
    var r = box.getBoundingClientRect();
    return [(e.clientX - r.left) * T.S / r.width, (e.clientY - r.top) * T.S / r.height];
  }
  /* 最初に触れた1本の指だけで描く（R21） */
  box.addEventListener('pointerdown', function (e) {
    if (active !== null || !ictx) return;
    active = e.pointerId; e.preventDefault();
    try { box.setPointerCapture(e.pointerId); } catch (x) { /* 取れなくても描ける */ }
    last = pos(e); drew = true;
    ictx.fillStyle = INK;
    ictx.beginPath(); ictx.arc(last[0], last[1], T.LINE / 2, 0, Math.PI * 2); ictx.fill();
  });
  box.addEventListener('pointermove', function (e) {
    if (e.pointerId !== active) return;
    e.preventDefault();
    var p = pos(e);
    ictx.strokeStyle = INK; ictx.lineWidth = T.LINE; ictx.lineCap = 'round'; ictx.lineJoin = 'round';
    ictx.beginPath(); ictx.moveTo(last[0], last[1]); ictx.lineTo(p[0], p[1]); ictx.stroke();
    last = p;
  });
  function up(e) { if (e.pointerId === active) active = null; }
  box.addEventListener('pointerup', up);
  box.addEventListener('pointercancel', up);
  /* 枠の中では ページが動かない・拡大しない */
  box.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
  box.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });

  /* ── 拡大させない・長押しのメニューを出さない（spec §8・R1） ── */
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (t) {
    document.addEventListener(t, function (e) { e.preventDefault(); }, { passive: false });
  });
  document.addEventListener('touchmove', function (e) {
    if (e.touches && e.touches.length > 1) e.preventDefault();
  }, { passive: false });
  document.addEventListener('dblclick', function (e) { e.preventDefault(); });
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  document.addEventListener('touchstart', function () {}, { passive: true });   // iOS で :active（押した見た目）を効かせる

  /* ── つなぐ ── */
  $('#grid').addEventListener('click', function (e) {
    var b = e.target.closest('[data-key]');
    if (b) go(b.getAttribute('data-key'));
  });
  $('#help').addEventListener('click', function () { go('otona'); });
  $('#back').addEventListener('click', home);
  $('#back2').addEventListener('click', home);
  $('#bigchar').addEventListener('click', function () { if (cur) speak(K.YOMI[cur.k] || cur.c); });
  [0, 1, 2].forEach(function (i) {
    $('#tab' + i).addEventListener('click', function () { setTab(i, true); });
  });
  $('#p0').addEventListener('click', onSay);
  $('#p1').addEventListener('click', onSay);
  $('#check').addEventListener('click', judge);
  $('#clear').addEventListener('click', clearInk);
  window.addEventListener('popstate', route);

  /* オフラインで開けるように（spec §8）。登録できなくても画面は動く */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(function (e) {
      try { console.warn('サービスワーカーを登録できない（オフラインでは開けない）:', e); } catch (x) { /* 何もしない */ }
    });
  }

  fillIcons(document);
  store.check();
  initVoice();
  renderWarns();
  route();
  $('#boot').hidden = true;
  $('#fail').hidden = true;
  $('#app').hidden = false;
})();
