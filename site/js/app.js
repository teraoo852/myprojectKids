/* なぞって あいうえお — 画面の動き（spec §3〜§8・§13〜§17） */
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
  if (!K.ROWS || !K.ICONS || !K.UI || !K.TRACE || !K.SAGASU || !K.TSUMIKI || !K.BLOCKS) {
    fail('data.js・icons.js・trace.js のどれかが読めない'); return;
  }

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
  function countStars() {
    var s = store.get(), n = 0;
    Object.keys(byKey).forEach(function (k) { if (s[k]) n++; });
    return n;
  }

  /* ── 画面の切り替えと URL（spec §4・§17） ──
     URL: なし＝メニュー／#hyou＝表／#ka など＝字のページ／#otona＝画面5／#sagasu＝画面6／#tower＝画面7 */
  var SCREENS = ['menu', 'chart', 'detail', 'otona', 'sagasu', 'tower'];
  var cur = null;
  function show(name) {
    SCREENS.forEach(function (id) { $('#' + id).hidden = id !== name; });
  }
  function route() {
    var h = decodeURIComponent(location.hash.slice(1));
    stopTrace(); stopDuo();
    if (h === 'hyou') showChart();
    else if (h === 'otona') showHelp();
    else if (h === 'sagasu') showSagasu();
    else if (h === 'tower') showTower();
    else if (h && byKey[h]) openChar(h);
    else showMenu();
  }
  function go(hash) {
    if (location.hash !== '#' + hash) history.pushState(null, '', '#' + hash);
    route();
  }
  /* もどる は ひとつ上の画面へ（履歴を1つ戻すのではない・R13・§17）: 字のページ→表、それ以外→メニュー */
  function up(hash) {
    history.replaceState(null, '', hash ? '#' + hash : location.pathname + location.search);
    route();
  }

  /* ── 画面0 メニュー（spec §17） ── */
  function showMenu() {
    $('#menuStars').textContent = countStars();
    $('#menuTotal').textContent = total;
    renderWarns();
    show('menu');
  }

  /* ── 画面1 ひょう（spec §3） ── */
  function showChart() {
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
  function up1(e) { if (e.pointerId === active) active = null; }
  box.addEventListener('pointerup', up1);
  box.addEventListener('pointercancel', up1);
  /* 枠の中では ページが動かない・拡大しない */
  box.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
  box.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });

  /* ── ふたりで あそぶ 画面の共通（spec §14） ── */

  /* 指ごとに受け付ける「押した」: 2人が同時に押しても両方効く（§14 の決まり4）。
     押した指が そのまま同じ物の上で離れたときだけ fn を呼ぶ */
  function onTap(root, sel, fn) {
    var downs = {};
    root.addEventListener('pointerdown', function (e) {
      var el = e.target.closest(sel);
      if (el && root.contains(el)) downs[e.pointerId] = el;
    });
    root.addEventListener('pointerup', function (e) {
      var el = downs[e.pointerId];
      delete downs[e.pointerId];
      if (!el) return;
      var at = document.elementFromPoint(e.clientX, e.clientY);
      if (at && el.contains(at)) fn(el);
    });
    root.addEventListener('pointercancel', function (e) { delete downs[e.pointerId]; });
  }

  /* 置き方: short＝短い辺で向かい合う（既定）／long＝長い辺で向かい合う */
  var PLACE_KEY = 'futari-place';
  function getPlace() {
    try { return localStorage.getItem(PLACE_KEY) === 'long' ? 'long' : 'short'; } catch (e) { return 'short'; }
  }
  function setPlace(p) {
    try { localStorage.setItem(PLACE_KEY, p); } catch (e) { warn('store'); }
    applyPlace(p);
  }
  function applyPlace(p) {
    p = p || getPlace();
    var duos = document.querySelectorAll('.duo');
    for (var i = 0; i < duos.length; i++) duos[i].setAttribute('data-place', p);
    $('#placeShort').setAttribute('aria-pressed', p === 'short' ? 'true' : 'false');
    $('#placeLong').setAttribute('aria-pressed', p === 'long' ? 'true' : 'false');
  }
  /* 画面を出るとき: 待っている動きを止める（数えるのは その回だけ） */
  function stopDuo() {
    clearTimeout(SG.timer);
    clearTimeout(TW.pushTimer); clearTimeout(TW.stampTimer);
    twDragEnd();
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ── 画面6 ものさがし（spec §15） ── */
  var SG = { set: [], ans: null, found: 0, hint: 0, busy: false, timer: 0 };
  function setHintPic(ui, icon) {
    var h = $('#sgHintPic');
    if (ui) { h.setAttribute('data-ui', ui); h.removeAttribute('data-icon'); }
    else { h.removeAttribute('data-ui'); h.setAttribute('data-icon', icon); }
    fillIcons($('#sgHint'));
  }
  /* 1回: 28語から12語を選んで並べ、その中の1つが こたえ（前の回と同じ こたえは続けない） */
  function sgRound() {
    var prev = SG.ans;
    SG.set = shuffle(K.SAGASU.slice()).slice(0, 12);
    var cands = SG.set.filter(function (w) { return !prev || w[1] !== prev[1]; });
    SG.ans = cands[Math.floor(Math.random() * cands.length)];
    SG.hint = 0; SG.busy = false;
    $('#sgWordText').textContent = SG.ans[0];
    setHintPic('bulb');
    $('#sgPics').innerHTML = SG.set.map(function (w) {
      return '<button class="sg-pic" data-k="' + w[1] + '" data-say="' + w[0] + '" aria-label="' + w[0] + '">' +
        '<span class="sg-img" data-icon="' + w[1] + '"></span></button>';
    }).join('');
    fillIcons($('#sgPics'));
    $('#sgStamp').classList.remove('on');
  }
  function showSagasu() {
    applyPlace();
    SG.found = 0;
    $('#sgFound').textContent = '0';
    sgRound();
    show('sagasu');
  }
  onTap($('#sagasu'), '#sgWord', function () { speak(SG.ans[0]); });
  onTap($('#sagasu'), '#sgHint', function () {
    SG.hint++;
    if (SG.hint === 1) setHintPic(null, SG.ans[1]);                       // 1回目: 兄の側に こたえの絵
    else {                                                                // 2回目: 弟の側の こたえの絵に枠
      var t = $('#sgPics').querySelector('[data-k="' + SG.ans[1] + '"]');
      if (t) t.classList.add('glow');
    }
  });
  onTap($('#sagasu'), '.sg-pic', function (el) {
    if (SG.busy) return;
    var name = el.getAttribute('data-say');
    if (el.getAttribute('data-k') !== SG.ans[1]) { speak(name); return; }  // 外れても否定しない: 名前を言うだけ
    SG.busy = true;
    el.classList.add('hit');
    SG.found++;
    $('#sgFound').textContent = SG.found;
    $('#sgStamp').classList.add('on');
    speak(name + '！ みつけた！');
    SG.timer = setTimeout(sgRound, 1500);
  });
  onTap($('#sagasu'), '#sgBack', function () { up(''); });

  /* ── 画面7 いっしょに タワー（spec §16） ── */
  var TW_MAX = 7, TW_GOAL = 6, TRAY_MAX = 3;
  var TW = { cols: [[], [], []], tray: [], n: 0, busy: false, done: false, sel: -1, drag: null, pushTimer: 0, stampTimer: 0 };
  var ghost = $('#twGhost');
  function blockSvg(b) {
    return '<svg viewBox="0 0 112 48" aria-hidden="true" focusable="false">' + K.BLOCKS[b.shape].replace(/COLOR/g, b.color) + '</svg>';
  }
  function twHigh() { return Math.max(TW.cols[0].length, TW.cols[1].length, TW.cols[2].length); }
  function twRender() {
    var cols = document.querySelectorAll('.tw-col');
    TW.cols.forEach(function (c, i) {
      cols[i].innerHTML = c.map(function (b) { return '<span class="tw-blk">' + blockSvg(b) + '</span>'; }).join('');
      cols[i].classList.toggle('pick', TW.sel >= 0 && c.length < TW_MAX);
    });
    $('#twTrayBlocks').innerHTML = TW.tray.map(function (b, i) {
      return '<button class="tw-blk tw-take' + (i === TW.sel ? ' sel' : '') + '" data-i="' + i + '" aria-label="' + b.name + '">' + blockSvg(b) + '</button>';
    }).join('');
    var h = twHigh();
    $('#twHigh').textContent = h;
    $('#twFlag').classList.toggle('on', h >= TW_GOAL);
  }
  function twReset() {
    clearTimeout(TW.pushTimer); clearTimeout(TW.stampTimer);
    TW.cols = [[], [], []]; TW.tray = []; TW.done = false; TW.sel = -1; TW.busy = false;
    $('#twAgain').hidden = true;
    $('#twStamp').classList.remove('on');
    $('#twTray').classList.remove('full');
    $('#twDrop').innerHTML = '';
    twRender();
  }
  function showTower() {
    applyPlace();
    twReset();
    show('tower');
  }

  /* 弟: 押すたびに積み木が1つ、兄の受け皿へ届く（連打しても1回に1つ） */
  onTap($('#tower'), '#twPush', function () {
    if (TW.busy) return;
    if (TW.tray.length >= TRAY_MAX) {                      // 受け皿がいっぱい: 弟を否定せず、兄に頼む
      var tr = $('#twTray');
      tr.classList.add('full');
      setTimeout(function () { tr.classList.remove('full'); }, 800);
      speak('つみきが いっぱい！ おにいちゃん つんでね');
      return;
    }
    TW.busy = true;
    var kind = K.TSUMIKI[Math.floor(Math.random() * K.TSUMIKI.length)];
    var b = { shape: kind[0], name: kind[1], color: K.TSUMIKI_COLORS[TW.n++ % K.TSUMIKI_COLORS.length] };
    $('#twDrop').innerHTML = '<span class="tw-blk tw-pop">' + blockSvg(b) + '</span>';
    speak(b.name + '！');
    TW.pushTimer = setTimeout(function () {
      $('#twDrop').innerHTML = '';
      TW.tray.push(b);
      TW.busy = false;
      twRender();
    }, 450);
  });

  /* 兄: 受け皿の i 番目を c 列に置く（c が -1 や いっぱいの列なら受け皿に残る） */
  function twPlace(i, c) {
    var b = TW.tray[i];
    TW.sel = -1;
    if (!b || c < 0 || TW.cols[c].length >= TW_MAX) { twRender(); return; }
    var before = twHigh();
    TW.tray.splice(i, 1);
    TW.cols[c].push(b);
    twRender();
    var h = twHigh();
    if (h >= TW_GOAL && !TW.done) {
      TW.done = true;
      $('#twStamp').classList.add('on');
      speak('たかい！ ふたりで つんだね');
      TW.stampTimer = setTimeout(function () {
        $('#twStamp').classList.remove('on');
        $('#twAgain').hidden = false;
      }, 2000);
    } else if (h > before) {
      speak(h + 'だん！');
    }
  }

  /* 兄: 受け皿の積み木を指で運んで列に置く。動かさずに離すと「選ぶ」→ 列を押して置く */
  function colAt(x, y) {
    var el = document.elementFromPoint(x, y);
    var col = el && el.closest('.tw-col');
    return col ? +col.getAttribute('data-col') : -1;
  }
  function markOver(c) {
    var cols = document.querySelectorAll('.tw-col');
    for (var j = 0; j < cols.length; j++) cols[j].classList.toggle('over', j === c);
  }
  function twDragEnd() {
    TW.drag = null;
    if (ghost) ghost.hidden = true;
    markOver(-1);
  }
  $('#tower').addEventListener('pointerdown', function (e) {
    var t = e.target.closest('.tw-take');
    if (!t || TW.drag) return;
    TW.drag = { id: e.pointerId, i: +t.getAttribute('data-i'), x: e.clientX, y: e.clientY, moved: false };
  });
  document.addEventListener('pointermove', function (e) {
    var d = TW.drag;
    if (!d || e.pointerId !== d.id) return;
    if (!d.moved) {
      if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) < 12) return;   // 少し動くまでは「押しただけ」
      d.moved = true;
      ghost.innerHTML = blockSvg(TW.tray[d.i]);
      ghost.hidden = false;
      var src = $('#twTrayBlocks').querySelector('[data-i="' + d.i + '"]');
      if (src) src.classList.add('lift');
    }
    /* 運んでいる積み木を指の位置に置く（位置は指といっしょに変わるので、ここだけ JS で置く） */
    ghost.style.left = e.clientX + 'px';
    ghost.style.top = e.clientY + 'px';
    markOver(colAt(e.clientX, e.clientY));
  });
  function dragUp(e) {
    var d = TW.drag;
    if (!d || e.pointerId !== d.id) return;
    twDragEnd();
    if (d.moved) { twPlace(d.i, e.type === 'pointerup' ? colAt(e.clientX, e.clientY) : -1); return; }
    TW.sel = TW.sel === d.i ? -1 : d.i;                    // 押して離しただけ: 選ぶ（もう一度でやめる）
    twRender();
  }
  document.addEventListener('pointerup', dragUp);
  document.addEventListener('pointercancel', dragUp);
  onTap($('#tower'), '.tw-col', function (el) {
    if (TW.sel >= 0) twPlace(TW.sel, +el.getAttribute('data-col'));
  });
  onTap($('#tower'), '#twAgain', twReset);
  onTap($('#tower'), '#twBack', function () { up(''); });

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
  $('#goHyou').addEventListener('click', function () { go('hyou'); });
  $('#goSagasu').addEventListener('click', function () { go('sagasu'); });
  $('#goTower').addEventListener('click', function () { go('tower'); });
  $('#help').addEventListener('click', function () { go('otona'); });
  $('#grid').addEventListener('click', function (e) {
    var b = e.target.closest('[data-key]');
    if (b) go(b.getAttribute('data-key'));
  });
  $('#backMenu').addEventListener('click', function () { up(''); });
  $('#back').addEventListener('click', function () { up('hyou'); });
  $('#back2').addEventListener('click', function () { up(''); });
  $('#bigchar').addEventListener('click', function () { if (cur) speak(K.YOMI[cur.k] || cur.c); });
  [0, 1, 2].forEach(function (i) {
    $('#tab' + i).addEventListener('click', function () { setTab(i, true); });
  });
  $('#p0').addEventListener('click', onSay);
  $('#p1').addEventListener('click', onSay);
  $('#check').addEventListener('click', judge);
  $('#clear').addEventListener('click', clearInk);
  $('#placeShort').addEventListener('click', function () { setPlace('short'); });
  $('#placeLong').addEventListener('click', function () { setPlace('long'); });
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
  applyPlace();
  route();
  $('#boot').hidden = true;
  $('#fail').hidden = true;
  $('#app').hidden = false;
})();
