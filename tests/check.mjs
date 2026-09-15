// 機械チェック（spec §8・CLAUDE.md §3-3・§4）: node tests/check.mjs
// NG が1つでもあれば 終了コード 1
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(root, 'site');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let bad = 0;
const ok = (cond, msg, detail = '') => {
  console.log((cond ? 'OK  ' : 'NG  ') + msg + (!cond && detail ? ' → ' + detail : ''));
  if (!cond) bad++;
};

/* ── 1. データ（spec §5） ── */
const ctx = {}; ctx.window = ctx;
vm.runInNewContext(read('site/js/data.js') + '\n' + read('site/js/icons.js'), ctx);
const K = ctx.KIDS;
const chars = K.ROWS.flatMap((r) => r.chars).filter(Boolean);
const keys = chars.map((c) => c[1]);
ok(K.ROWS.length === 10 && K.ROWS.every((r) => r.chars.length === 5), '10行×5段');
ok(chars.length === 46, '46字', String(chars.length));
ok(new Set(keys).size === keys.length, 'キーの重複なし');
ok(new Set(chars.map((c) => c[0])).size === chars.length, '字の重複なし');
ok(chars.every((c) => (c[1] === 'wo' ? c[2].length === 0 : c[2].length === 2)), '各字に単語2つ（を は0）');
ok(chars.every((c) => c[1] === 'wo' || c[2].every((w) => w[0].includes(c[0]))), '単語にその字が入っている');
const words = chars.flatMap((c) => c[2].map((w) => w[0]));
const youon = words.filter((w) => /[ゃゅょ]/.test(w));
ok(!youon.length, '単語に拗音が無い（R16）', youon.join(','));
const refs = chars.flatMap((c) => c[2].map((w) => w[1])).concat([K.NOTE.wo.example[1]]);
const noPic = refs.filter((k) => !K.ICONS[k]);
ok(!noPic.length, '単語の絵が全部ある', noPic.join(','));
const unused = Object.keys(K.ICONS).filter((k) => !refs.includes(k));
ok(!unused.length, '使われない単語の絵が無い', unused.join(','));
ok(Object.keys(K.YOMI).every((k) => keys.includes(k)), 'よみ のキーが字にある');
ok(K.NOTE.wo && K.NOTE.n, 'を・ん の説明がある');

/* ── ものさがし の語（spec §15） ── */
const sg = K.SAGASU || [];
ok(sg.length >= 12, 'ものさがし の語が12以上（1回に12枚並べる）', String(sg.length));
const sgLong = sg.filter((w) => w[0].length < 2 || w[0].length > 3);
ok(!sgLong.length, 'ものさがし の語は2〜3字', sgLong.map((w) => w[0]).join(','));
const sgNoPic = sg.filter((w) => !K.ICONS[w[1]]);
ok(!sgNoPic.length, 'ものさがし の絵が全部ある', sgNoPic.map((w) => w[1]).join(','));
ok(new Set(sg.map((w) => w[1])).size === sg.length, 'ものさがし の語の重複なし');

/* ── 2. 画面の規約（CLAUDE.md §4） ── */
const walk = (d) => fs.readdirSync(d, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = walk(site).map((f) => path.relative(site, f).split(path.sep).join('/'));
for (const f of files.filter((x) => x.endsWith('.html'))) {
  const s = fs.readFileSync(path.join(site, f), 'utf8');
  ok(!/\sstyle\s*=/.test(s), `${f}: インライン style が無い`);
  ok(!/<script(?![^>]*\ssrc=)[^>]*>/.test(s), `${f}: HTML の中に JS が無い`);
  const links = [...s.matchAll(/\s(?:href|src)="([^"#]+)"/g)].map((x) => x[1]);
  const abs = links.filter((r) => /^[a-z]+:|^\/\//i.test(r) || r.startsWith('/'));
  ok(!abs.length, `${f}: 読むものは全部 相対パス（外部 URL・先頭 / なし）`, abs.join(','));
  const missing = links.filter((r) => !fs.existsSync(path.join(site, path.dirname(f), r.split('?')[0])));
  ok(!missing.length, `${f}: 読むファイルが全部ある`, missing.join(','));
}
const extUrl = files.filter((f) => /\.(html|css|js|webmanifest)$/.test(f))
  .filter((f) => /https?:\/\//.test(fs.readFileSync(path.join(site, f), 'utf8')));
ok(!extUrl.length, '外部の URL が書かれていない', extUrl.join(','));

/* ── 3. id の参照（CLAUDE.md §3-3: 変えたら消費者を全数で） ── */
const ids = new Set([...read('site/index.html').matchAll(/\sid="([^"]+)"/g)].map((x) => x[1]));
const used = [...new Set([...read('site/js/app.js').matchAll(/\$\('#([\w-]+)'\)/g)].map((x) => x[1]))];
const screens = (read('site/js/app.js').match(/SCREENS = \[([^\]]+)\]/) || ['', ''])[1].match(/[\w-]+/g) || [];
const noId = [...used, ...screens].filter((i) => !ids.has(i));
ok(!noId.length, 'app.js が使う id が index.html に全部ある', noId.join(','));
const uiUsed = [...read('site/index.html').matchAll(/data-ui="([\w-]+)"/g)].map((x) => x[1]);
ok(uiUsed.every((k) => K.UI[k]), 'index.html の画面の絵が icons.js に全部ある', uiUsed.filter((k) => !K.UI[k]).join(','));
const iconUsed = [...read('site/index.html').matchAll(/data-icon="([\w-]+)"/g)].map((x) => x[1]);
ok(iconUsed.every((k) => K.ICONS[k]), 'index.html の単語の絵が icons.js に全部ある', iconUsed.filter((k) => !K.ICONS[k]).join(','));

/* ── 4. 行の色（spec §8）: 濃は 淡い地・白い字・なぞった線 のどれとも 3:1 以上 ── */
const css = read('site/css/style.css');
const lum = (h) => {
  const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const INK = lum('25313A'), WHITE = 1;
for (let i = 1; i <= 10; i++) {
  const m = css.match(new RegExp(`\\[data-row="${i}"\\]\\s*\\{\\s*--hue:\\s*#([0-9A-Fa-f]{6});\\s*--tint:\\s*#([0-9A-Fa-f]{6})`));
  if (!m) { ok(false, `行${i}の色がある`); continue; }
  const h = lum(m[1]), t = lum(m[2]);
  const r = [ratio(h, t), ratio(h, WHITE), ratio(h, INK)];
  ok(r.every((x) => x >= 3), `行${i}の色: 地 ${r[0].toFixed(2)}・白 ${r[1].toFixed(2)}・線 ${r[2].toFixed(2)}（3以上）`);
}

/* ── 5. サービスワーカーの先読み一覧（spec §8） ── */
const sw = read('site/sw.js');
ok(/var VERSION = 'kids-v\d+';/.test(sw), 'サービスワーカーのキャッシュ名に版がある');
const list = JSON.parse((sw.match(/var FILES = (\[[\s\S]*?\]);/) || ['', '[]'])[1]).filter((f) => f !== './');
const need = files.filter((f) => f !== 'sw.js' && f !== '.nojekyll' && !/^fonts\/.*\.txt$/.test(f));
const notListed = need.filter((f) => !list.includes(f));
const notThere = list.filter((f) => !files.includes(f));
ok(!notListed.length, 'site/ のファイルが全部 先読み一覧にある', notListed.join(','));
ok(!notThere.length, '先読み一覧のファイルが全部 site/ にある', notThere.join(','));

/* ── 6. いっしょに タワー の積み木（spec §16） ── */
const kinds = K.TSUMIKI || [];
ok(kinds.length === 5, '積み木は5種類', String(kinds.length));
const noBlock = kinds.filter((t) => !(K.BLOCKS && K.BLOCKS[t[0]] && K.BLOCKS[t[0]].includes('COLOR')));
ok(!noBlock.length, '積み木の絵が全部ある（色は COLOR で差し込む）', noBlock.map((t) => t[0]).join(','));
const colors = K.TSUMIKI_COLORS || [];
const offRow = colors.filter((c) => !css.includes(c));
ok(colors.length > 0 && !offRow.length, '積み木の色は行の色（style.css の --hue にある色）', offRow.join(','));

console.log(bad ? `\nNG ${bad} 件` : '\nすべて OK');
process.exit(bad ? 1 : 0);
