// test/verify-v596.js —— v5.96 第三隻主角色「柴犬」＋小熊補齊丟彈
//   ① 柴犬四套圖都在、寬度是「格子 × 12」、meta 與格子／錨點正確
//   ② HeroAnim 登記柴犬：SHEET.dog 的 cellW／ax 與 meta 一致、KEYS 有牠
//   ③ 柴犬沒有 hurt／throw → 退回鏈要接得住（不會掉回零件骨架）
//   ④ HOLD_BOMB.dog：一手托球在胸前的位置，換算後要落在素材球上
//   ⑤ 小熊六套齊全（throw 改用「上拋接住」重生成）
//   ⑥ 版本戳記
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

const ROOT = path.join(__dirname, '..');
const SPR = path.join(ROOT, 'spr');
const mainSrc = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');
const idxSrc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; } else { fail++; console.log('  ✗ FAIL: ' + m); } }
function sec(t) { console.log('\n' + t); }

/* ---------------------------------------------------------------- ① */
sec('① 柴犬五套圖集（v5.97 補 hurt）');
const ACTS = ['walk', 'idle', 'hold', 'victory', 'hurt'];
const meta = JSON.parse(fs.readFileSync(path.join(SPR, 'hero-anim-dog.json'), 'utf8'));
ok(meta.charHpx === 200, 'charHpx = 200（三隻共用同一個量綱）');
ok(meta.cellW === 187 && meta.cellH === 234, '格子 187x234（1000 寬畫布 × 200/1069）');
ok(Math.abs(meta.ax - 93.55) < 0.05, 'ax = 93.55 ＝ 畫布中線 500 × 200/1069');
ok(Math.abs(meta.ay - 226.38) < 0.05, 'ay = 226.38（與兔兔／小熊相同 → 腳底同一條線）');
ok(Object.keys(meta.actions).length === 5, '柴犬五套（walk／idle／hold／victory／hurt）');
ACTS.forEach(function (a) {
  const f = path.join(SPR, 'hero-anim-dog-' + a + '.webp');
  ok(fs.existsSync(f), '有 hero-anim-dog-' + a + '.webp');
  if (!fs.existsSync(f)) return;
  const buf = fs.readFileSync(f);
  ok(buf.slice(8, 12).toString() === 'WEBP', 'dog-' + a + ' 是合法 WEBP');
  /* 12 格寬度：用 VP8X 的 canvas 寬高（webp 檔頭 24~30 byte 是 little-endian 24bit） */
  /* VP8X 存的是 canvas 寬高「減一」，所以要 +1 */
  const w = (buf[24] | (buf[25] << 8) | (buf[26] << 16)) + 1;
  const h = (buf[27] | (buf[28] << 8) | (buf[29] << 16)) + 1;
  ok(w === 187 * 12 && h === 234, 'dog-' + a + ' 尺寸 ' + w + 'x' + h + ' ＝ 187×12 x 234');
});

/* ---------------------------------------------------------------- ② */
sec('② HeroAnim 登記柴犬');
ok(/dog:\s*\{ pre: 'dog',\s*cellW: 187, ax: 93\.55,\s*acts: \['walk', 'idle', 'hold', 'victory', 'hurt'\](?:, dir: -?1)? \}/.test(mainSrc),
  'SHEET.dog 的 cellW／ax／acts 與 meta 一致');
/* v6.0：八隻全部登記。 */
ok(/const KEYS = \{ rabbit: 1, bear: 1, dog: 1, cat: 1, pig: 1, panda: 1, frog: 1, chick: 1 \};/.test(mainSrc),
  'KEYS 有八隻（沒登記就會被當成「沒有圖集」）');
ok(mainSrc.indexOf("'spr/hero-anim-' + sh.pre + '-' + k + '.webp'") >= 0, '檔名仍走動態模板（不寫死角色）');

/* ---------------------------------------------------------------- ③ */
sec('③ 缺動作的退回鏈');
ok(!!meta.actions.hurt && !meta.actions.throw, '柴犬有 hurt、沒有 throw（throw 這批底色變青）');
ok(/if \(!get\(key, act\)\) act = get\(key, 'idle'\) \? 'idle'/.test(mainSrc), '退回順序 idle → walk → null 仍在');
const env = makeEnv(); const BH = env.BH;
ok(BH.HeroAnim && typeof BH.HeroAnim.has === 'function', 'HeroAnim 對外可用');
ok(BH.HeroAnim.has('dog') === true, 'HeroAnim.has(\'dog\') 為真');
/* v6.0：八隻全部做完 → 改成驗「沒登記的 key」而不是特定角色。 */
ok(BH.HeroAnim.has('bunny') === false, '沒登記的角色（bunny）仍然是 false');

/* ---------------------------------------------------------------- ④ */
sec('④ 柴犬舉彈位置');
ok(/dog:\s*\{\s*up: 0\.3714, side: -0\.2675\s*\}/.test(mainSrc), 'HOLD_BOMB.dog 有登記（up 0.3714／side -0.2675）');
const p1 = BH.holdBombPos('dog', { footY: 1000, H: 200 });
ok(!!p1, 'holdBombPos 回得出座標');
ok(p1 && Math.abs(p1.y - (1000 - 0.3714 * 200)) < 0.01, 'y ＝ 腳底 - 0.3714H（' + (p1 && p1.y.toFixed(2)) + '）');
ok(p1 && Math.abs(p1.dx - (-0.2675 * 200)) < 0.01, 'dx ＝ -0.2675H（' + (p1 && p1.dx.toFixed(2)) + '）');
/* 對位交叉驗證：球心在畫布 (214, 963)、腳底 1360、角色高 1069
   → 格子座標 x = 214×0.187 = 40.0、y = (963-150)×0.187 = 152.0
   而 bomb center = ax + side×200 = 93.55 - 53.5 = 40.05、ay - up×200 = 226.38 - 74.28 = 152.10 */
const bx = 93.55 + (-0.2675) * 200, by = 226.38 - 0.3714 * 200;
ok(Math.abs(bx - 214 * 0.187) < 1.5, '炸彈 x 與「球心 214 畫布座標 × 縮放」對得上（' + bx.toFixed(1) + ' vs ' + (214 * 0.187).toFixed(1) + '）');
ok(Math.abs(by - (963 - 150) * 0.187) < 1.5, '炸彈 y 與「球心 963 畫布座標」對得上（' + by.toFixed(1) + ' vs ' + ((963 - 150) * 0.187).toFixed(1) + '）');
/* 不能影響別隻 */
const pr = BH.holdBombPos('rabbit', { footY: 1000, H: 200, frame: 0 });
ok(pr && Math.abs(pr.y - (1000 - 0.930 * 200)) < 0.01, '兔兔第 0 格高度沒被動到（0.930）');
const pb = BH.holdBombPos('bear', { footY: 1000, H: 200, frame: 8 });
ok(pb && Math.abs(pb.y - (1000 - 0.8410 * 200)) < 0.01, '小熊第 8 格高度沒被動到（0.8410）');

/* ---------------------------------------------------------------- ⑤ */
sec('⑤ 小熊六套');
const bmeta = JSON.parse(fs.readFileSync(path.join(SPR, 'hero-anim-bear.json'), 'utf8'));
ok(Object.keys(bmeta.actions).length === 6, '小熊六套齊全（含 throw／hurt）');
ok(fs.existsSync(path.join(SPR, 'hero-anim-bear-throw.webp')), '有 hero-anim-bear-throw.webp');
const tb = fs.readFileSync(path.join(SPR, 'hero-anim-bear-throw.webp'));
ok((tb[24] | (tb[25] << 8) | (tb[26] << 16)) + 1 === 202 * 12, '小熊 throw 是 12 格 × 202');
ok(/bear:\s*\{ pre: 'bear',\s*cellW: 202, ax: 101\.03,\s*acts: \[[^\]]*'throw'[^\]]*\]/.test(mainSrc),
  'SHEET.bear.acts 有 throw');

/* ---------------------------------------------------------------- ⑥ */
sec('⑥ 版本戳記');
const vm = mainSrc.match(/const VERSION = '([\d.]+)'/);
ok(vm && parseFloat(vm[1]) >= 5.96, '主檔版本 ≥ 5.96（' + (vm && vm[1]) + '）');
const V = vm ? vm[1] : '0', VRE = V.replace(/\./g, '\\.');
ok(new RegExp('verTxt">' + VRE + '<').test(idxSrc), 'index.html 版號跟主檔一致');
const SW = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
ok(new RegExp("var SW_VERSION = 'v" + VRE + "\\.\\d+';").test(SW), 'SW 版號 v' + V + '.0');
const LOG = fs.readFileSync(path.join(ROOT, 'js', 'version-log.js'), 'utf8');
ok(new RegExp("v: '" + VRE + "'[\\s\\S]{0,80}?now: true").test(LOG), '更新紀錄有 ' + V + ' 條目（now: true）');
ok(!/後台|開發者模式/.test(LOG.split("v: '" + V + "'")[1].split('v:')[0]), V + ' 條目沒有提到「後台／開發者」');

console.log('\n' + (fail ? '❌' : '✅') + ' v5.96：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
