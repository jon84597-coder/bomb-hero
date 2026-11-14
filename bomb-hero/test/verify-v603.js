// test/verify-v603.js —— v6.01：手把 B 鍵只能「遙控引爆」，不准順便暫停
//   ① 版本 6.01 的七處戳記（主檔／首頁兩處／VERSION_LOG／package.json／四份 sw.js）
//   ② 手把選單導航在遊戲畫面整段停手（A／B／Start 都不接管）
//   ③ 真的跑一次 PadUI.tick：遊戲中按 B 不會讓 paused 變 true
//   ④ 非遊戲畫面按 B 仍然是「返回」（沒有把選單導航一起砍掉）
//   ⑤ 遊戲中的暫停只認 Start（Menu），而且 1P～4P 任何一支都算
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

const ROOT = path.join(__dirname, '..');
const mainSrc = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');
const idxSrc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const vlogSrc = fs.readFileSync(path.join(ROOT, 'js', 'version-log.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, '..', 'package.json'), 'utf8'));

let pass = 0, fail = 0;
function ok(c, m, x) {
  if (c) { pass++; }
  else { fail++; console.log('  ✗ FAIL: ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
}
function sec(t) { console.log('\n' + t); }

const env = makeEnv();
const P = env.BH;
const G = P.Game;

// ---------------------------------------------------------------- ①
sec('① 版本戳記');
ok(P.VERSION === '6.01', '主檔 VERSION = 6.01', P.VERSION);
ok(/<span id="verTxt">6\.01<\/span>/.test(idxSrc), '首頁徽章 verTxt = 6.01');
ok(/<span id="verLogVer">6\.01<\/span>/.test(idxSrc), '版本面板 verLogVer = 6.01');
ok(pkg.version === '6.01.0', 'package.json = 6.01.0', pkg.version);
for (const rel of ['sw.js', '../public/sw.js', '../bomberman-online/public/sw.js', '../dist/site/sw.js']) {
  const p = path.join(ROOT, rel);
  const w = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
  ok(/SW_VERSION = 'v6\.01\.0'/.test(w), rel + ' SW_VERSION = v6.01.0');
}
ok(/v: '6\.01'[\s\S]{0,120}now: true/.test(vlogSrc), 'VERSION_LOG[0] 是 6.01 且 now:true');
ok(/v: '6\.00'[\s\S]{0,120}now: false/.test(vlogSrc), 'VERSION_LOG[1]（6.00）已收成 now:false');

// ---------------------------------------------------------------- ②
sec('② 遊戲畫面不接管手把選單按鍵');
ok(/const inGame = \(typeof Screen !== 'undefined' && Screen\.current === 'game'\);/.test(mainSrc),
  'PadUI 先算出 inGame');
ok(/if \(!inGame && Input\.padEdge\(pi, 0\)\) activate\(\);/.test(mainSrc), 'A 確認只在選單');
ok(/if \(!inGame && Input\.padEdge\(pi, 1\)\) back\(\);/.test(mainSrc), 'B 返回只在選單（遊戲中＝遙控引爆）');
ok(/if \(!inGame && cacheScope && Input\.padEdge\(pi, 9\)\) activate\(\);/.test(mainSrc),
  'Start 在遊戲中不進選單（交給主迴圈開關暫停，避免一鍵兩用）');
ok(!/if \(Input\.padEdge\(pi, 1\)\) back\(\);/.test(mainSrc), '沒有殘留「無條件 B→back()」的舊寫法');

// ---------------------------------------------------------------- ③
sec('③ 實測：遊戲中按 B 不會暫停');
const pad = {
  connected: true,
  buttons: Array.from({ length: 16 }, function () { return { pressed: false }; }),
  axes: [0, 0, 0, 0]
};
/* 注意：Node 自己也有一個 navigator —— 要改的是「沙盒裡」那一顆，不然 vm 內仍看不到手把，
   PadUI.tick() 會在手把偵測那行就 return，測試就變成假綠。 */
const nav = env.sandbox.navigator;
try { nav.getGamepads = function () { return [pad]; }; } catch (e) {}

const rawDown = P.Input.padDown, rawEdge = P.Input.padEdge, rawAxis = P.Input.padAxis;
function stubPad(btn) {
  P.Input.padDown = function (pi, b) { return b === btn; };
  P.Input.padEdge = function (pi, b) { return b === btn; };
  P.Input.padAxis = function () { return { x: 0, y: 0, rx: 0, ry: 0 }; };
}
function restorePad() {
  P.Input.padDown = rawDown; P.Input.padEdge = rawEdge; P.Input.padAxis = rawAxis;
}

G.state = 'play';
/* Screen.current 是唯讀 getter，直接賦值會靜默失敗（測試會變假綠）→ 一定要走 show()。 */
try { P.Screen.show('game'); } catch (e) {}
ok(P.Screen.current === 'game', '切到遊戲畫面', P.Screen.current);
if (P.isPaused()) { try { P.togglePause(); } catch (e) {} }
ok(!P.isPaused(), '起點：遊戲進行中（沒有暫停）');

stubPad(1);                       // B
let err = null;
try { P.PadUI.tick(); } catch (e) { err = e; }
ok(!err, '遊戲中按 B 時 PadUI.tick 不報錯', err && err.message);
ok(!P.isPaused(), '遊戲中按 B → 沒有被暫停（B 只剩遙控引爆）');

// 再按一次也不該有任何反應（舊版是 toggle，會來回開關）
try { P.PadUI.tick(); } catch (e) {}
ok(!P.isPaused(), '連按 B 仍然不會暫停');

// A 在遊戲中也不該去點 HUD
stubPad(0);
try { P.PadUI.tick(); } catch (e) {}
ok(!P.isPaused(), '遊戲中按 A 也不會亂切暫停');

// ---------------------------------------------------------------- ④
sec('④ 非遊戲畫面：B 仍然是「返回」');
try { P.Screen.show('title'); } catch (e) {}
ok(P.Screen.current === 'title', '切回選單畫面', P.Screen.current);
let backs = 0;
const rawBack = P.Screen.back;
try { P.Screen.back = function () { backs++; return true; }; } catch (e) {}
/* 沙盒沒有真 DOM：把 querySelector 暫時收成 null，讓 back() 走到最後那行 Screen.back()
   （不然它會先去點「← 返回」按鈕，那也是返回，只是觀測不到）。 */
const doc = env.sandbox.document;              // 沙盒裡的 document（Node 這邊沒有）
const rawQS = doc.querySelector;
try { doc.querySelector = function () { return null; }; } catch (e) {}
stubPad(1);
try { P.PadUI.tick(); } catch (e) {}
ok(backs > 0, '選單裡按 B → 呼叫 Screen.back()（返回沒有被砍掉）', backs);
try { doc.querySelector = rawQS; } catch (e) {}
try { P.Screen.back = rawBack; } catch (e) {}
restorePad();

// ---------------------------------------------------------------- ⑤
sec('⑤ 暫停只認 Start，1P～4P 都收');
ok(/for \(let pi = 0; pi < 4; pi\+\+\) if \(Input\.padEdge\(pi, 9\)\) \{ togglePause\(\); break; \}/.test(mainSrc),
  '主迴圈掃 0～3 槽的 Start（不是只認第一支手把）');
ok(!/Screen\.current === 'game' && Input\.padEdge\(0, 9\)\) togglePause\(\)/.test(mainSrc),
  '舊的「只有 0 號手把能暫停」寫法已移除');
ok(/detonate: function \(\) \{ const pi = padPhys\(slot\); return pi >= 0 && padEdge\(pi, padMapOf\(slot\)\.det\); \}/.test(mainSrc),
  'B（det 槽）在遊戲裡走的是「遙控引爆」這條路');
ok(/const PAD_DEF = \{ act: 0, det: 1, dash: 2, fire: 3 \};/.test(mainSrc),
  '預設 B = button 1 = 遙控引爆');

// ---------------------------------------------------------------- 收尾
console.log('\n' + (fail ? '✗ ' + fail + ' 項失敗' : '✓ 全部通過') + '（通過 ' + pass + '）');
process.exit(fail ? 1 : 0);
