// test/verify-v590b.js —— v5.90 主角精靈動作（影片生成）
//   ① spr/hero-anim-rabbit-*.webp 六張都在、尺寸與格數正確
//   ② main.js 的 META 與 spr/hero-anim-rabbit.json 一致（不然貼圖會位移）
//   ③ 動作挑選：拿炸彈→舉彈、被炸→受傷、歡呼→勝利、走動→走路、其餘待機
//   ④ 繪製順序：精靈優先、零件當後備；精靈沒載完不會破圖
//   ⑤ Service Worker 把六張歸到 P1（不能擠掉 P0 的地形圖）
//   ⑥ 版本與預算
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, '..');
const mainSrc = fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8');
const idxSrc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const swPub = fs.readFileSync(path.join(SRC, 'public/sw.js'), 'utf8');

let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; } else { fail++; console.log('  ✗ FAIL: ' + m); } }
function sec(n) { console.log('\n=== ' + n + ' ==='); }

const env = makeEnv();
const BH = env.BH;

/* ① 素材 */
sec('① 六套動作素材');
const ACTS = ['walk', 'idle', 'hold', 'throw', 'hurt', 'victory'];
const json = JSON.parse(fs.readFileSync(path.join(ROOT, 'spr/hero-anim-rabbit.json'), 'utf8'));
ok(ACTS.every(a => fs.existsSync(path.join(ROOT, 'spr/hero-anim-rabbit-' + a + '.webp'))),
  '六張 hero-anim-rabbit-*.webp 都存在');
let badMagic = 0, wrongSize = [];
ACTS.forEach(function (a) {
  const b = fs.readFileSync(path.join(ROOT, 'spr/hero-anim-rabbit-' + a + '.webp'));
  if (b.slice(8, 12).toString() !== 'WEBP') badMagic++;
});
ok(badMagic === 0, '六張都是合法 WEBP（壞檔 ' + badMagic + '）');
ok(json.cellW > 0 && json.cellH > 0 && json.charHpx > 0, 'meta 有 cellW／cellH／charHpx');
ok(ACTS.every(a => json.actions[a] && json.actions[a].frames === 12), '每套都是 12 格');

const list = JSON.parse(fs.readFileSync(path.join(ROOT, 'spr/_list.json'), 'utf8'));
ok(ACTS.every(a => list.indexOf('hero-anim-rabbit-' + a + '.webp') >= 0), '六張都在 spr/_list.json');

/* ② META 一致 */
sec('② main.js 與 json 的對位參數一致');
const metaM = mainSrc.match(/const META = \{ charHpx: ([\d.]+), cellW: (\d+), cellH: (\d+), ax: ([\d.]+), ay: ([\d.]+), frames: (\d+) \};/);
ok(!!metaM, 'main.js 找得到 META');
if (metaM) {
  ok(+metaM[1] === json.charHpx, 'charHpx 一致（' + metaM[1] + ' = ' + json.charHpx + '）');
  ok(+metaM[2] === json.cellW, 'cellW 一致（' + metaM[2] + ' = ' + json.cellW + '）');
  ok(+metaM[3] === json.cellH, 'cellH 一致（' + metaM[3] + ' = ' + json.cellH + '）');
  ok(Math.abs(+metaM[4] - json.ax) < 0.02, 'ax 一致（' + metaM[4] + ' ≈ ' + json.ax + '）');
  ok(Math.abs(+metaM[5] - json.ay) < 0.02, 'ay 一致（' + metaM[5] + ' ≈ ' + json.ay + '）');
  ok(+metaM[6] === 12, 'frames = 12');
  ok(Math.abs(json.ax - json.cellW * 0.5) < json.cellW * 0.06,
    '錨點在幀寬中央（ax ' + json.ax + ' vs 中線 ' + (json.cellW / 2) + '）');
}

/* ③ 動作挑選 */
sec('③ 遊戲狀態 → 動作');
const H = BH.HeroAnim;
ok(!!H && typeof H.pick === 'function', 'HeroAnim 掛在 __BH 上（除錯／驗收用）');
ok(H.has('rabbit') === true, 'rabbit 有精靈動作');
ok(H.has('bear') === false, '沒做動作的角色走零件（bear = false）');
if (H && H.pick) {
  ok(H.pick({ moving: true }) === 'walk', '走動 → walk');
  ok(H.pick({ moving: false }) === 'idle', '站著 → idle');
  ok(H.pick({ carry: true, moving: false }) === 'hold', '拿炸彈站著 → hold（雙手舉到頭頂）');
  ok(H.pick({ carry: true, moving: true }) === 'walk', '拿炸彈走動 → walk（不會滑步）');
  ok(H.pick({ expr: 'cry' }) === 'hurt', '被炸到 → hurt');
  ok(H.pick({ expr: 'laugh' }) === 'victory', '歡呼 → victory');
  ok(H.pick({ expr: 'cry', carry: true }) === 'hurt', '受傷優先於舉彈');
  ok(H.pick({ act: 'throw' }) === 'throw', '明確指定 act → throw');
  ok(H.pick({ act: 'nope' }) === 'idle', '亂填的 act 退回 idle（不會貼錯圖）');
  ok(H.pick({}) === 'idle', '空參數 → idle');
}

/* ④ 繪製順序與後備 */
sec('④ 精靈優先、零件後備');
const iAnim = mainSrc.indexOf('HeroAnim.draw(g, key, x, footY, H, a || {})');
const iParts = mainSrc.indexOf("const M = IMG_PARTS[key];\n  if (!M || !Parts.has(key)) return null;");
ok(iAnim > 0, 'drawRigChar 裡有精靈分支');
ok(iParts > 0 && iAnim < iParts, '精靈分支在零件之前（先試精靈，失敗才拼零件）');
ok(/if \(r\) return r;/.test(mainSrc), '精靈畫成功就直接 return（不會重複畫零件）');
ok(/HeroAnim.readyCount|function get\(k\)/.test(mainSrc), '有載入狀態查詢');
ok(/im.onerror = function \(\) \{ ready\[k\] = false; \}/.test(mainSrc), '載入失敗會標記 false');
ok(/if \(!im\) return null;/.test(mainSrc), '圖沒載完時 draw 回傳 null（退回零件，不破圖）');

/* ⑤ Service Worker 分桶 */
sec('⑤ SW 預熱分桶');
let wb = null;
try {
  const i = swSrc.indexOf('function warmBucket');
  let d = 0, j = i;
  for (; j < swSrc.length; j++) { const c = swSrc[j]; if (c === '{') d++; else if (c === '}') { d--; if (!d) { j++; break; } } }
  wb = new Function('return ' + swSrc.slice(i, j))();
} catch (e) { ok(false, 'warmBucket 挖不出來：' + e.message); }
if (typeof wb === 'function') {
  ok(wb('hero-anim-rabbit-walk.webp') === 1, '主角動畫 → P1（不搶 P0 的地形圖）');
  ok(wb('tile-grass.webp') === 0, '地形仍是 P0');
}
ok(swPub.indexOf('hero-anim-') > 0, 'public/sw.js 同步了分桶規則');

/* ⑥ 版本與預算 */
sec('⑥ 版本與預算');
const vm = mainSrc.match(/const VERSION = '([\d.]+)'/);
ok(!!vm && parseFloat(vm[1]) >= 5.9, '主檔版本 ≥ 5.90（實際 ' + (vm ? vm[1] : '?') + '）');
ok(/<span id="verTxt">5\.9\d<\/span>/.test(idxSrc), 'index.html 版本戳記同步');
ok(/SW_VERSION = 'v5\.9\d\.0'/.test(swSrc), 'sw.js 版號跟著升');
ok(/SW_VERSION = 'v5\.9\d\.0'/.test(swPub), 'public/sw.js 版號同步');
ok(/v: '5\.90'/.test(fs.readFileSync(path.join(ROOT, 'js/version-log.js'), 'utf8')), '版本紀錄有 5.90');
ok(/主檔 \d[\d,]* 字元/.test('主檔 ' + mainSrc.length + ' 字元') && mainSrc.length < 1950000,
  '主檔仍在預算內（' + mainSrc.length + ' / 1,950,000）');
const bin = ACTS.reduce(function (s, a) { return s + fs.statSync(path.join(ROOT, 'spr/hero-anim-rabbit-' + a + '.webp')).size; }, 0);
ok(bin < 700 * 1024, '六張合計 ' + Math.round(bin / 1024) + ' KB（上限 700KB）');

console.log('\n' + '─'.repeat(28));
console.log('通過 ' + pass + ' 項，失敗 ' + fail + ' 項');
process.exit(fail ? 1 : 0);
