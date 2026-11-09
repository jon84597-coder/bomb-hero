// test/verify-v570.js —— v5.69：外觀（炸彈外殼／爆風顏色）只套在「自己」身上
//   症狀：玩家換了藍色爆風、紅色炸彈殼之後，AI 與怪物丟出來的彈、炸開的火
//         也跟著變成同一套顏色 —— 整場都是玩家的皮膚，還分不出那顆是誰放的。
//   本支分成：① 機制 ② 炸彈外殼 ③ 爆風顏色 ④ 入場快照 ⑤ 面板與字典 ⑥ 版本戳記
const fs = require('fs');
const { makeEnv } = require('./_sandbox');

const env = makeEnv();
const P = env.BH, G = P.Game;
const SRC = fs.readFileSync(__dirname + '/../js/main.js', 'utf8');
const SKINS = fs.readFileSync(__dirname + '/../js/skins.js', 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg, extra) {
  if (cond) { pass++; console.log('  ✓ ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
function sec(t) { console.log('\n=== ' + t + ' ==='); }

/* ---------------- 測試用的假外觀 ---------------- */
const SKIN_BOMB = ['#ff0000', '#cc0000', '#990000', '#550000'];
const SKIN_FLAME = ['rgba(255,255,255,A)', 'rgba(0,255,136,A)', 'rgba(0,204,110,A)', 'rgba(0,128,68,A)', 'rgba(0,64,34,0)'];
const W = env.sandbox.window || env.sandbox;
W.__BHSKIN = { cache: { flame: SKIN_FLAME, aura: '#ff0000', bomb: '#ff0000', bombStops: SKIN_BOMB } };

/* 記錄「畫了哪些顏色」的 ctx —— drawFlameOn／drawBombOn 會把主檔的 ctx 暫時換成它 */
function recCtx() {
  const stops = [];
  const grad = function () { return { addColorStop: function (p, c) { stops.push(String(c)); } }; };
  const noop = function () {};
  const t = {
    createRadialGradient: grad, createLinearGradient: grad,
    measureText: function () { return { width: 10 }; },
    __stops: stops
  };
  return new Proxy(t, {
    get: function (o, k) { if (k in o) return o[k]; return noop; },
    set: function (o, k, v) { o[k] = v; return true; }
  });
}
function has(list, re) {
  for (let i = 0; i < list.length; i++) if (re.test(list[i])) return true;
  return false;
}

/* ---------------------------------------------------------------- ① */
sec('① 機制：外觀讀取多了「mine」這道門');
ok(/function skinBombStops\(mine\)/.test(SRC) && /if \(mine === false\) return null;/.test(SRC),
  'skinBombStops 吃 mine，不是自己的就直接回 null');
ok(/const FIRE_PAL_DEF = \[ 'rgba\(255,255,255,A\)'/.test(SRC) && /const skinPal = mineFire \? skinFlamePal\(\) : null;/.test(SRC),
  '爆風色停在 drawFlame 內先判斷 mineFire（不是全域取用）');
ok(/const mineFire = !bossFire && !allyFire/.test(SRC), 'BOSS 紫焰／隊友藍焰優先於外觀');
ok(/bombIsAlly\(b\), mineBomb\)/.test(SRC), 'drawBomb 把「是不是自己的彈」傳進去');
ok(/const mineBomb = !!\(b\.owner && !b\.petOwner && isMyPlayer\(b\.owner\)\);/.test(SRC),
  '隨從的彈不算自己的（維持白彈藍爆）');

/* ---------------------------------------------------------------- ② */
sec('② 炸彈外殼：自己的染色，AI 原色');
{
  const mine = recCtx();
  P.drawBombOn(mine, 14, 3, false, true, false);          // mine 省略 ＝ 自己的（手上的彈／預覽）
  ok(mine.__stops.indexOf('#ff0000') >= 0, '自己的彈殼用外觀色（#ff0000）');

  const ai = recCtx();
  P.drawBombOn(ai, 14, 3, false, true, false, false);     // mine = false
  ok(ai.__stops.indexOf('#ff0000') < 0, 'AI／怪物的彈殼完全沒有外觀色');
  ok(has(ai.__stops, /^#5b6172$/i) && has(ai.__stops, /^#15171f$/i),
    'AI／怪物彈殼是原本的黑曜漸層（亮 #5b6172 → 暗 #15171f）');
}

/* ---------------------------------------------------------------- ③ */
sec('③ 爆風顏色：自己的用外觀，AI 維持橙火');
{
  G.gameT = 1.0;
  const base = { cx: 1, cy: 1, type: 'center', dir: null, t: .30 };

  const mineF = recCtx();
  // owner 不能給 null —— 那是 BOSS 的紫焰分支（外觀不該蓋掉它）
  P.drawFlameOn(mineF, Object.assign({}, base, { owner: { ai: false }, mine: true }), 40);
  ok(has(mineF.__stops, /^rgba\(0,255,136,/), '自己的爆風用自訂色（綠 #00ff88）');

  const aiF = recCtx();
  P.drawFlameOn(aiF, Object.assign({}, base, { owner: { ai: true }, mine: false }), 40);
  ok(!has(aiF.__stops, /^rgba\(0,255,136,/), 'AI／怪物的爆風沒有自訂色');
  ok(has(aiF.__stops, /^rgba\(255,214,130,/) && has(aiF.__stops, /^rgba\(214,60,16,0\)/),
    'AI／怪物是原本的橙火色停（255,214,130 → 214,60,16）');

  const bossF = recCtx();
  P.drawFlameOn(bossF, Object.assign({}, base, { owner: null, mine: true }), 40);
  ok(has(bossF.__stops, /^rgba\(210,120,255,/), 'BOSS 就算 mine 為真也還是紫焰（owner 為 null）');

  const allyF = recCtx();
  P.drawFlameOn(allyF, Object.assign({}, base, { owner: { ai: true }, ally: true, mine: true }), 40);
  ok(has(allyF.__stops, /^rgba\(64,146,255,/), '隊友／隨從的火仍是藍色（ally 優先）');
  ok(!has(allyF.__stops, /^rgba\(0,255,136,/), '隊友的火不吃玩家外觀');
}

/* ---------------------------------------------------------------- ④ */
sec('④ 入場快照：火焰一放下去就記住「是不是我的」');
{
  G.flames = []; G.items = []; G.hazards = [];
  G.players = [{ ai: false }];

  P.addFlame(1, 1, 'center', null, G.players[0]);
  ok(G.flames[G.flames.length - 1].mine === true, '玩家自己的火 → mine:true');

  P.addFlame(2, 1, 'center', null, { ai: true });
  const ai = G.flames[G.flames.length - 1];
  ok(ai.mine === false && ai.ally === false, 'AI 的火 → mine:false、ally:false');

  P.addFlame(3, 1, 'center', null, null);
  ok(G.flames[G.flames.length - 1].mine === false, 'BOSS 的火（owner 為 null）→ mine:false');

  P.addFlame(4, 1, 'center', null, { __pet: true });
  const pet = G.flames[G.flames.length - 1];
  ok(pet.ally === true && pet.mine === false, '隨從的火 → ally:true、mine:false');
}

/* ---------------------------------------------------------------- ⑤ */
sec('⑤ 面板文案：講清楚只影響自己');
ok(/class="skmine"/.test(SKINS) && /T\('sk\.mineOnly'/.test(SKINS), '外觀面板有「只套在自己身上」那行');
const dict = fs.readFileSync(__dirname + '/../js/i18n-src.js', 'utf8');
const row = dict.split('\n').filter(function (l) { return /^sk\.mineOnly\|/.test(l); })[0] || '';
ok(row.split('|').length === 6, '字典有 sk.mineOnly（六語言齊全）', row.length);

/* ---------------------------------------------------------------- ⑥ */
sec('⑥ 版本戳記');
const verEl = fs.readFileSync(__dirname + '/../index.html', 'utf8').match(/id="verTxt">([\d.]+)</);
const cur = verEl ? parseFloat(verEl[1]) : 0;
ok(cur >= 5.69, '版本至少 5.69', cur);
const logSrc = fs.readFileSync(__dirname + '/../js/version-log.js', 'utf8');
ok(/v: '5\.69'/.test(logSrc), '更新紀錄有 5.69 條目');
ok(/v: '5\.68'[^]*?now: false/.test(logSrc), '上一版 5.68 已標成 now:false');
const sw = fs.readFileSync(__dirname + '/../sw.js', 'utf8');
ok(/SW_VERSION = 'v5\.69\.0'/.test(sw), 'SW 版號 v5.69.0');

console.log('\n========================================');
console.log('v5.69 外觀只套在自己身上：' + pass + ' 通過 / ' + fail + ' 失敗');
if (fail) process.exitCode = 1;
