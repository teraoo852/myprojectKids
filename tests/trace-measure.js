/* なぞりの数値を測る（spec §7 の注・R24）
 * 字の本体（core）を細線化して中心線を出し、その中心線を 太さ w の線で なぞったことにして、
 * site/js/trace.js の measure() で なぞれた割合（coverage）を測る。画面と同じ判定の処理を使う。 */
(async function () {
  'use strict';
  const T = KIDS.TRACE, S = T.S;
  const chars = KIDS.ROWS.flatMap((r) => r.chars).filter(Boolean).map((c) => c[0]);
  const WIDTHS = [30, 40, 48, 52, 56, 60];
  const TARGET = 0.70;

  try { await document.fonts.load(T.font(), chars.join('')); } catch (e) { /* 下で知らせる */ }
  const fontOk = document.fonts.check('900 20px "Zen Maru Gothic"', 'あ');
  const fontEl = document.getElementById('font');
  fontEl.textContent = fontOk
    ? 'フォント: Zen Maru Gothic（900）で測った'
    : 'フォント: Zen Maru Gothic が読めていない。代わりのフォントで測った（site/fonts/ を置いてから測り直す）';
  if (!fontOk) fontEl.classList.add('warn');

  /* Zhang-Suen の細線化（1 の画素を 中心線だけ残るまで削る） */
  function thin(img, W, H) {
    const del = [];
    let changed = true;
    while (changed) {
      changed = false;
      for (let step = 0; step < 2; step++) {
        del.length = 0;
        for (let y = 1; y < H - 1; y++) {
          for (let x = 1; x < W - 1; x++) {
            const i = y * W + x;
            if (!img[i]) continue;
            const p2 = img[i - W], p3 = img[i - W + 1], p4 = img[i + 1], p5 = img[i + W + 1];
            const p6 = img[i + W], p7 = img[i + W - 1], p8 = img[i - 1], p9 = img[i - W - 1];
            const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
            if (B < 2 || B > 6) continue;
            const A = (!p2 && p3) + (!p3 && p4) + (!p4 && p5) + (!p5 && p6) + (!p6 && p7) + (!p7 && p8) + (!p8 && p9) + (!p9 && p2);
            if (A !== 1) continue;
            if (step === 0 ? (p2 * p4 * p6 || p4 * p6 * p8) : (p2 * p4 * p8 || p2 * p6 * p8)) continue;
            del.push(i);
          }
        }
        if (del.length) { changed = true; for (const i of del) img[i] = 0; }
      }
    }
    return img;
  }

  const ink = document.createElement('canvas'); ink.width = ink.height = S;
  const ictx = ink.getContext('2d', { willReadFrequently: true });
  const rows = [];
  for (const ch of chars) {
    const m = T.masks(ch);
    const skel = thin(Uint8Array.from(m.core), S, S);
    const pts = [];
    for (let i = 0; i < skel.length; i++) if (skel[i]) pts.push([i % S, (i / S) | 0]);
    const cov = {};
    for (const w of WIDTHS) {
      ictx.clearRect(0, 0, S, S);
      ictx.fillStyle = '#000';
      ictx.beginPath();
      for (const [x, y] of pts) { ictx.moveTo(x + w / 2, y); ictx.arc(x, y, w / 2, 0, Math.PI * 2); }
      ictx.fill();
      const r = T.measure(m, ictx.getImageData(0, 0, S, S).data);
      cov[w] = { coverage: +r.coverage.toFixed(3), precision: +r.precision.toFixed(3) };
    }
    rows.push({ ch, cov });
    await new Promise((res) => setTimeout(res, 0));   // 画面を固めない
  }

  /* 表 */
  const tbl = document.getElementById('table');
  tbl.innerHTML = '<tr><th>字</th>' + WIDTHS.map((w) => `<th>太さ ${w}</th>`).join('') + '</tr>' +
    rows.map((r) => `<tr><td>${r.ch}</td>` + WIDTHS.map((w) => {
      const c = r.cov[w].coverage;
      return `<td class="${c < TARGET ? 'low' : ''}">${(c * 100).toFixed(0)}%</td>`;
    }).join('') + '</tr>').join('');

  /* まとめ: 太さごとの いちばん低い字・70% に届かない字の数 */
  const summary = WIDTHS.map((w) => {
    const list = rows.map((r) => ({ ch: r.ch, c: r.cov[w].coverage })).sort((a, b) => a.c - b.c);
    const low = list.filter((x) => x.c < TARGET);
    return { width: w, min: list[0], below: low.length, belowChars: low.map((x) => x.ch).join('') };
  });
  document.getElementById('summary').innerHTML = summary.map((s) =>
    `<p>太さ ${s.width}: いちばん低い「${s.min.ch}」${(s.min.c * 100).toFixed(0)}%・70% 未満 ${s.below}字 ${s.belowChars}</p>`).join('');
  document.getElementById('json').textContent = JSON.stringify({ fontOk, TARGET, current: T.LINE, summary, rows });
  document.title = '測り終えた';
})();
