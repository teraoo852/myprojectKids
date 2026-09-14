/* なぞりの判定（spec §7）。画面（app.js）と tests/trace-measure の両方から使う。
 * しくみ: 見えないキャンバスに、枠と同じフォント・同じ位置で字を描き、
 *   core＝字の本体、soft＝本体を太らせた許容範囲 の2枚の型を作って、描いた線と比べる。
 *   枠の字と型は同じ描き方から作るので、フォントが代わっても ずれない。 */
var KIDS = window.KIDS || (window.KIDS = {});

KIDS.TRACE = (function () {
  'use strict';
  var S = 600;              // 判定に使う枠の大きさ（内部の px）
  var TOL = 26;             // 許容範囲: 字の本体の外へ この幅まで
  var LINE = 30;            // なぞる線の太さ（仮・R24: tests/trace-measure で測って決める）
  var GOOD = { coverage: 0.55, precision: 0.45 };   // はなまる
  var NEAR = 0.30;                                   // もうすこし
  var Y = S / 2 + S * 0.02;

  function font() {
    return '900 ' + Math.round(S * 0.74) + 'px "Zen Maru Gothic","Hiragino Maru Gothic ProN",sans-serif';
  }
  function place(ctx) {
    ctx.font = font(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  }

  /* その字のフォントを読み込み終えるまで待つ（1.5秒で あきらめて代わりのフォントで進む） */
  function loadFont(ch) {
    var wait = new Promise(function (r) { setTimeout(r, 1500); });
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.race([document.fonts.load(font(), ch).catch(function () {}), wait]);
  }

  /* 枠: 練習帳の十字の点線と内枠、真ん中に白い字 */
  function drawGuide(ctx, ch) {
    ctx.clearRect(0, 0, S, S);
    ctx.strokeStyle = 'rgba(255,255,255,.42)'; ctx.lineWidth = 3; ctx.setLineDash([12, 14]);
    ctx.beginPath();
    ctx.moveTo(S / 2, 20); ctx.lineTo(S / 2, S - 20);
    ctx.moveTo(20, S / 2); ctx.lineTo(S - 20, S / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 4;
    ctx.strokeRect(26, 26, S - 52, S - 52);
    place(ctx); ctx.fillStyle = '#FFFFFF';
    ctx.fillText(ch, S / 2, Y);
  }

  /* 型: core（字の本体）と soft（許容範囲） */
  function masks(ch) {
    var off = document.createElement('canvas'); off.width = off.height = S;
    var o = off.getContext('2d');
    place(o); o.fillStyle = '#000'; o.fillText(ch, S / 2, Y);
    var a = o.getImageData(0, 0, S, S).data;
    var core = new Uint8Array(S * S), coreN = 0, i, p;
    for (i = 0, p = 3; i < core.length; i++, p += 4) { if (a[p] > 100) { core[i] = 1; coreN++; } }
    o.lineJoin = 'round'; o.lineCap = 'round'; o.lineWidth = TOL * 2; o.strokeStyle = '#000';
    o.strokeText(ch, S / 2, Y);
    var b = o.getImageData(0, 0, S, S).data;
    var soft = new Uint8Array(S * S);
    for (i = 0, p = 3; i < soft.length; i++, p += 4) { if (b[p] > 60) soft[i] = 1; }
    return { core: core, soft: soft, coreN: coreN };
  }

  /* 描いた線（ImageData.data）と型を比べる
   * coverage＝字の本体のうち なぞれた割合、precision＝線のうち 許容範囲に入った割合 */
  function measure(m, d) {
    var hit = 0, stray = 0, covered = 0;
    for (var i = 0, p = 3; i < m.core.length; i++, p += 4) {
      if (d[p] > 60) {
        if (m.soft[i]) hit++; else stray++;
        if (m.core[i]) covered++;
      }
    }
    return {
      coverage: m.coreN ? covered / m.coreN : 0,
      precision: (hit + stray) ? hit / (hit + stray) : 0,
      drawn: hit + stray
    };
  }

  /* 判定: 'empty'（描いていない）／'good'（はなまる）／'near'（もうすこし）／'far' */
  function verdict(r) {
    if (!r || !r.drawn) return 'empty';
    if (r.coverage >= GOOD.coverage && r.precision >= GOOD.precision) return 'good';
    if (r.coverage >= NEAR) return 'near';
    return 'far';
  }

  return {
    S: S, TOL: TOL, LINE: LINE, GOOD: GOOD, NEAR: NEAR,
    font: font, loadFont: loadFont, drawGuide: drawGuide, masks: masks, measure: measure, verdict: verdict
  };
})();
