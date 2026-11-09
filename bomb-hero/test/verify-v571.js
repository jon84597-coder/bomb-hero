// test/verify-v571.js —— v5.70：對戰（手機直放／橫放）的角色清單改成「大逃殺式小頭像列」
//   症狀：對戰模式頂部那排「頭像＋暱稱＋星星」膠囊卡，手機直放時實測 416×46px，
//         把頂部資訊列的計時器整個蓋掉；橫放時吃掉左邊 441px，像貼了一塊板子在畫面上。
//   本支分成：① 手機對戰 → 小頭像列 ② 桌機對戰 → 維持原本長條卡
//             ③ 大逃殺 100 人 → 同一套（但不顯示勝場角標）
//             ④ 版位（left／maxWidth／窄螢幕收成 +N） ⑤ 樣式與版本戳記
const fs = require('fs');
const { makeEnv } = require('./_sandbox');

const env = makeEnv();
const P = env.BH, G = P.Game;
const doc = env.sandbox.document;
const body = doc.body;
const SRC = fs.readFileSync(__dirname + '/../js/main.js', 'utf8');
const HTML = fs.readFileSync(__dirname + '/../index.html', 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg, extra) {
  if (cond) { pass++; console.log('  ✓ ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
function sec(t) { console.log('\n=== ' + t + ' ==='); }
function roster() { return env.getId('pkRoster'); }

/* ---------------- 假玩家 ---------------- */
const CH = [
  { id: 'a', color: '#ffd95e', name: '丁四' }, { id: 'b', color: '#9ecbff', name: '小雞' },
  { id: 'c', color: '#b8aef0', name: '青蛙' }, { id: 'd', color: '#c98d5a', name: '小熊' },
  { id: 'e', color: '#ff9bc4', name: '貓咪' }, { id: 'f', color: '#8ce8a8', name: '兔兔' },
  { id: 'g', color: '#ffb066', name: '狐狸' }, { id: 'h', color: '#a0d8ef', name: '企鵝' }
];
function fakeP(i, opts) {
  const o = opts || {};
  return {
    x: 100 + i * 40, y: 160, alive: o.dead ? false : true, ai: i > 0,
    name: CH[i % CH.length].name, chIdx: i % 8, ch: CH[i % CH.length],
    team: (o.team == null ? -1 : o.team), wins: (o.wins || 0), cart: null,
    lives: 3, sHp: 3, sHpMax: 3, hp: 5, hpMax: 5, score: 0, buffs: {},
    maxBombs: 1, power: 1, speed: 1, invuln: 0, dead: !!o.dead
  };
}
function mkBattle(n) {
  G.mode = 'battle'; G.teamsOn = 0; G.bigMap = false;
  G.cols = 15; G.rows = 13; G.T = 40;
  G.grid = [];
  for (let y = 0; y < G.rows; y++) { const r = []; for (let x = 0; x < G.cols; x++) r.push(0); G.grid.push(r); }
  G.players = [];
  for (let i = 0; i < n; i++) G.players.push(fakeP(i, { wins: i }));
  G.timer = 120; G.state = 'play';
  G.bombs = []; G.flames = []; G.items = []; G.enemies = []; G.pets = [];
}
function mkBR(n) {
  G.mode = 'br'; G.bigMap = true; G.cols = 79; G.rows = 62; G.T = 12;
  G.grid = [];
  for (let y = 0; y < G.rows; y++) { const r = []; for (let x = 0; x < G.cols; x++) r.push(0); G.grid.push(r); }
  G.players = [];
  for (let i = 0; i < n; i++) G.players.push(fakeP(i, { wins: 3 }));
  G.timer = 600; G.state = 'play';
  G.bombs = []; G.flames = []; G.items = []; G.enemies = []; G.pets = [];
  G.brZone = undefined;
}
function hud() { try { P.updateHud(); } catch (e) { return e; } return null; }

/* ================= ① 手機對戰 → 小頭像列 ================= */
sec('① 手機（touch）對戰：清單變小頭像列');
body.classList.add('touch', 'in-game');
mkBattle(5);
G.players[2].alive = false; G.players[2].dead = true;
let err = hud();
ok(!err, 'updateHud 在手機對戰下不會拋錯', err && err.message);
const ro = roster();
ok(ro.className === 'pkrow mini vs', '清單 class = pkrow mini vs', ro.className);
ok((ro.innerHTML.match(/class="pcard/g) || []).length === 5, '5 個玩家 → 5 張卡');
ok(!/pkinfo|plabel|pstars/.test(ro.innerHTML), '不再輸出「暱稱／星星」那兩行（只留頭像）');
ok((ro.innerHTML.match(/class="pwin"/g) || []).length === 5, '每張卡都有勝場角標 .pwin');
ok(/<b class="pwin">2<\/b>/.test(ro.innerHTML), '第 3 位（index 2）勝場顯示 2');
ok((ro.innerHTML.match(/class="pcard me"/g) || []).length === 1, '只有一張卡標成「我」');
ok(/class="pcard dead me"|class="pcard me dead"/.test(ro.innerHTML) === false, '「我」與「死亡」不會同時掛在同一張');
ok(/class="pcard dead"/.test(ro.innerHTML), '死掉的玩家卡片有 dead 標記');
ok(/--ring:#9ecbff/.test(ro.innerHTML), '每張卡帶自己的角色色（--ring）');

/* ①b 組隊對戰：外框改吃隊色 */
mkBattle(4);
G.teamsOn = 2;
G.players.forEach(function (q, i) { q.team = i % 2; });
err = hud();
ok(!err, '組隊對戰 updateHud 不拋錯', err && err.message);
const teamHex = ['#ff5568', '#4fa8ff'];
const rings = (ro.innerHTML.match(/--ring:([^"]+)/g) || []).map(function (s) { return s.slice(6); });
ok(rings[0] === rings[2], '同一隊的兩張卡外框同色（' + rings[0] + '）');
ok(rings[0] !== rings[1], '不同隊外框不同色（' + rings[0] + ' vs ' + rings[1] + '）');
G.teamsOn = 0;

/* ================= ② 桌機 → 維持原本長條卡 ================= */
sec('② 桌機（無 touch）對戰：維持原本的長條卡');
body.classList.remove('touch');
mkBattle(4);
err = hud();
ok(!err, 'updateHud 在桌機對戰下不會拋錯', err && err.message);
ok(ro.className === 'pkrow', '桌機 class 仍是 pkrow（沒有 mini／vs）', ro.className);
ok(/pkinfo/.test(ro.innerHTML) && /plabel/.test(ro.innerHTML), '桌機仍顯示暱稱＋星星');
ok(!/pwin/.test(ro.innerHTML), '桌機不會多出勝場角標');
ok(/丁四/.test(ro.innerHTML), '桌機卡片上看得到名字');

/* ================= ③ 大逃殺 100 人 → 同一套 ================= */
sec('③ 大逃殺 100 人：同一套小頭像列（沒有勝場角標）');
body.classList.add('touch');
mkBR(100);
err = hud();
ok(!err, 'updateHud 在大逃殺下不會拋錯', err && err.message);
ok(ro.className === 'pkrow mini', '大逃殺 class = pkrow mini（不含 vs）', ro.className);
const brCards = (ro.innerHTML.match(/class="pcard/g) || []).length;
ok(brCards >= 2 && brCards <= 12, '只放塞得下的前 N 個（' + brCards + ' 張）');
ok(/class="pmore">\+/.test(ro.innerHTML), '放不下的收成「+N」');
ok(!/pwin/.test(ro.innerHTML), '大逃殺不顯示勝場角標');

/* ================= ④ 版位 ================= */
sec('④ 版位：貼左邊、寬度不撞右上角計時器');
// 模擬 390×844 的直放手機
env.getId('cv').clientWidth = 390;
env.getId('cv').clientHeight = 600;
P.resizeView();
body.classList.add('touch');
mkBattle(8);
err = hud();
ok(!err, 'updateHud 在 390 寬下不會拋錯', err && err.message);
ok(ro.style.left === '8px', '沒有小地圖時貼左邊 8px', ro.style.left);
ok(parseFloat(ro.style.maxWidth) === 376, 'maxWidth = 視窗寬 - 8 - 6', ro.style.maxWidth);
const room = 390 - 8 - 96;
const capN = Math.floor((room - 30) / 31);
const shown = (ro.innerHTML.match(/class="pcard/g) || []).length;
ok(shown <= Math.max(2, Math.min(8, capN)) && shown >= 2,
  '390 寬 + 8 人：最多只放 ' + Math.max(2, Math.min(8, capN)) + ' 張（實際 ' + shown + '）');
ok(shown * 31 <= 390 - 8 - 96, '整排寬度仍在計時器左邊（' + (shown * 31) + 'px ≤ ' + (390 - 8 - 96) + 'px）');

/* ================= ⑤ 樣式與版本 ================= */
sec('⑤ 樣式、匯出、版本戳記');
ok(/#pkRoster\.mini\.vs \.pcard canvas\s*\{[^}]*width: 28px/.test(HTML), 'CSS：28px 圓形頭像');
ok(/border-color: var\(--ring/.test(HTML), 'CSS：外框吃隊色／角色色（--ring）');
ok(/#pkRoster\.mini\.vs \.pcard\.me canvas/.test(HTML), 'CSS：自己多一圈青光');
ok(/#pkRoster\.mini\.vs \.pwin/.test(HTML), 'CSS：右下角勝場角標');
ok(/const vsMini = Game\.mode === 'battle' && touchUi;/.test(SRC), '程式：對戰＋手機才走 mini');
ok(/mmRight = ox \+ mmBox\.x \+ mmBox\.w \+ 6;/.test(SRC), '程式：小地圖右緣有加上畫布位移');
ok(typeof P.updateHud === 'function', 'updateHud 已匯出（測試可直接叫）');
ok(String(P.VERSION) >= '5.70', 'VERSION ≥ 5.70（' + P.VERSION + '）');

console.log('\n========================================');
console.log('v5.70 對戰清單小頭像列：' + pass + ' 通過 / ' + fail + ' 失敗');
if (fail) process.exitCode = 1;
