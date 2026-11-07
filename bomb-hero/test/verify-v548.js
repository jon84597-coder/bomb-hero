// test/verify-v548.js —— v5.48：①配點「點數＋金幣」 ②BOSS 血量曲線 ③大逃殺頭像列 ④橫屏首頁微調
//   ① 每一格都吃 1 點；第 4 格起 = 1 點 ＋ 金幣（前後端同一套）
//   ② 第一隻王 4/5/6 格，第 3、5、7、8 隻各加一格
//   ③ 100 人不再整排硬塞：只留頭像、上限 12 個、排在小地圖右邊
//   ④ 橫屏首頁：LOGO 放到欄寬極限、暱稱貼底、公告上移
//   ⑤ 版本
const SB = require('./_sandbox');
const env = SB.makeEnv();
const P = env.BH;
const src = SB.rawHtml;
const C = require('../../cloud.js');
const fs = require('fs');

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log('  ✓ ' + m); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

/* ================= ① 配點：每一格都要點 ================= */
head('① 配點：每格吃 1 點，第 4 格起再加金幣');
let gold = 999999, spent = [];
const gp = P.Shop.gold, gs = P.Shop.spend;
P.Shop.gold = function () { return gold; };
P.Shop.spend = function (n) { spent.push(n); gold -= n; return { ok: true, gold: gold }; };
function setup(alloc, paid, total) {
  P.RPG.alloc = Object.assign({ hp: 0, def: 0, spd: 0, atk: 0 }, alloc || {});
  P.RPG.paid = Object.assign({ hp: 0, def: 0, spd: 0, atk: 0 }, paid || {});
  P.RPG.bought = 0;
  for (const k in P.RPG.paid) P.RPG.bought += P.RPG.paid[k];
  P.rpgSetTotal(total === undefined ? 40 : total);
  spent.length = 0;
}

// 剩餘點數 = 總點數 − 已配格數（連買來的格子也算）
setup({ hp: 3, def: 3 }, {}, 40);
ok(P.rpgLeft() === 34, '兩項各 3 格 → 剩 34（40 − 6，買來的格子也吃點）', P.rpgLeft());
setup({ hp: 10, def: 10, spd: 10, atk: 10 }, { hp: 7, def: 7, spd: 7, atk: 7 }, 40);
ok(P.rpgLeft() === 0, '四項全滿（40 格）→ 點數剛好用完，不多也不少', P.rpgLeft());

// 第 4 格：同時扣 1 點 ＋ 2000 金幣
setup({ hp: 3 }, {}, 20);
P.rpgAdjust('hp', 1);
ok(P.RPG.alloc.hp === 4, '第 4 格加上去', P.RPG.alloc.hp);
ok(P.rpgLeft() === 16, '點數 20 − 4 = 16（第 4 格也吃點）', P.rpgLeft());
ok(spent.length === 1 && spent[0] === 2000, '同時扣了 2000 金幣', spent);

// 沒點數 → 就算金幣滿手也加不了
setup({ hp: 4, def: 4, spd: 4, atk: 4 }, {}, 16);
ok(P.rpgLeft() === 0, '16 點配滿 16 格 → 剩 0', P.rpgLeft());
gold = 999999; spent.length = 0;
let r = P.rpgAdjust('hp', 1);
ok(r === false && P.RPG.alloc.hp === 4, '點數用完 → ＋ 按不動（有錢也一樣）', P.RPG.alloc.hp);
ok(spent.length === 0, '點數不夠時一毛金幣都沒扣', spent);

// 按鈕：沒點數 → disabled；第 4 格 → 顯示價格
P.Rpg.renderStats();
let rows = String(env.getId('rpgRows').innerHTML || '');
ok((rows.match(/data-d="1"[^>]*disabled/g) || []).length === 4, '四項都沒點數 → 四個「＋」全部禁用',
  (rows.match(/data-d="1"[^>]*disabled/g) || []).length);
ok((rows.match(/class="buypt"/g) || []).length === 4, '第 4 格起（四項都在第 5 格）→ 四顆都顯示價格');
P.rpgSetTotal(40);
P.Rpg.renderStats();
rows = String(env.getId('rpgRows').innerHTML || '');
ok((rows.match(/data-d="1"[^>]*disabled/g) || []).length === 0, '補點數後又全部可按');

// 雲端同一套：沒點數 → 帶了 pay 也不放行
function freshRpg(alloc, paid) {
  return {
    alloc: Object.assign({ hp: 0, def: 0, spd: 0, atk: 0 }, alloc || {}),
    paid: Object.assign({ hp: 0, def: 0, spd: 0, atk: 0 }, paid || {}),
    bought: 0, cleared: 0, xp: 0, gold: 0, char: 0, deaths: 0, playSec: 0,
    perm: { hp: 0, bomb: 0, fire: 0 }, sk: {}, skLoad: [], bag: {}, campRev: 0
  };
}
let acc = freshRpg({ hp: 4, def: 4, spd: 4, atk: 4 }, { hp: 1, def: 1, spd: 1, atk: 1 });
const capNow = C.pointsTotalFor ? C.pointsTotalFor(acc) : 9;
let res = C.spendPoint(acc, 'hp', 1, 2000);
ok(!res.ok && res.err === 'NO_POINTS', '雲端：點數用完 → 帶 pay 也是 NO_POINTS（' + capNow + ' 點上限）', res);
acc = freshRpg({ hp: 3 }, {});
res = C.spendPoint(acc, 'hp', 1, 2000);
ok(res.ok && acc.alloc.hp === 4 && acc.paid.hp === 1, '雲端：還有點數 → 第 4 格放行並記帳', res);
acc.rpg = 0;
const va = C.validateAlloc({ hp: 4, def: 4, spd: 4, atk: 4 }, 9, 20);
ok(!va.ok && va.err === 'POINT_OVERFLOW', '雲端：總格數超過總點數 → POINT_OVERFLOW', va);
const vb = C.validateAlloc({ hp: 4, def: 4, spd: 0, atk: 0 }, 9, 20);
ok(vb.ok && vb.spent === 8, '雲端：8 格 ≤ 9 點 → 放行', vb);
ok(C.freeLeftOf({ alloc: { hp: 0, def: 0, spd: 0, atk: 0 }, xp: 0 }) >= 0, 'freeLeftOf 不會回負數');

// 洗點：點數全部回來（每格都吃點的正面好處）
setup({ hp: 6, def: 2 }, { hp: 3, def: 0 }, 20);
P.rpgRespecApply();
ok(P.rpgLeft() === 20 && P.rpgSum(P.RPG.alloc) === 0, '洗點後 20 點全部回到手上', P.rpgLeft());
ok(P.rpgPrice('hp') === 2000, '洗點後價格階也重來（2000）', P.rpgPrice('hp'));

P.Shop.gold = gp; P.Shop.spend = gs;

/* ================= ② BOSS 血量曲線 ================= */
head('② BOSS 血量：第一隻 4/5/6 格，之後慢慢加');
ok(P.BOSS_HP_BASE && P.BOSS_HP_BASE.easy === 4 && P.BOSS_HP_BASE.normal === 5 && P.BOSS_HP_BASE.hard === 6,
  '基準 4／5／6 格（簡單／普通／困難）', P.BOSS_HP_BASE);
const oldDiff = P.settings ? P.settings.soloDiff : null;
function hpAt(ch, diff) {
  P.settings.soloDiff = diff;
  return P.bossHpOf(ch);
}
P.Game.daily = false;
ok(hpAt(1, 'easy') === 4 && hpAt(1, 'normal') === 5 && hpAt(1, 'hard') === 6, '第 1 隻王：4／5／6');
ok(hpAt(2, 'easy') === 4 && hpAt(2, 'normal') === 5 && hpAt(2, 'hard') === 6, '第 2 隻王：維持 4／5／6');
ok(hpAt(3, 'normal') === 6, '第 3 隻王：+1 → 6（普通）', hpAt(3, 'normal'));
ok(hpAt(4, 'normal') === 6, '第 4 隻王：維持 6', hpAt(4, 'normal'));
ok(hpAt(5, 'normal') === 7 && hpAt(6, 'normal') === 7, '第 5、6 隻：7', [hpAt(5, 'normal'), hpAt(6, 'normal')]);
ok(hpAt(7, 'normal') === 8, '第 7 隻：8', hpAt(7, 'normal'));
ok(hpAt(8, 'normal') === 9, '第 8 隻：9', hpAt(8, 'normal'));
ok(hpAt(8, 'easy') === 8 && hpAt(8, 'hard') === 10, '最後一隻：8／9／10', [hpAt(8, 'easy'), hpAt(8, 'hard')]);
ok(hpAt(1, 'normal') < 11, '比舊版（10 + 章數 = 11）明顯寬鬆');
P.Game.daily = true;
P.settings.soloDiff = 'hard';
ok(P.bossHpOf(1) === 5, '每日挑戰固定普通難度（不吃玩家自己的困難設定）', P.bossHpOf(1));
P.Game.daily = false;
P.settings.soloDiff = oldDiff || 'normal';

// 真的套進決戰場
P.settings.soloDiff = 'normal';
P.Game.mode = 'solo';
P.Game.daily = false;
P.startSolo(5);
const b1 = P.Game.bossArena && P.Game.bossArena.boss;
ok(!!b1, '第 5 關（第 1 隻王）有建出決戰場');
ok(b1 && b1.hp === 5 && b1.maxHp === 5, '決戰場的王血量 = 5（普通）', b1 && b1.hp);
P.startSolo(40);
const b8 = P.Game.bossArena && P.Game.bossArena.boss;
ok(b8 && b8.hp === 9, '第 40 關（第 8 隻王）血量 = 9', b8 && b8.hp);
P.settings.soloDiff = 'easy';
P.startSolo(5);
ok(P.Game.bossArena.boss.hp === 4, '簡單模式第 1 隻王 = 4 格', P.Game.bossArena.boss.hp);
P.settings.soloDiff = oldDiff || 'normal';

/* ================= ③ 大逃殺頭像列 ================= */
head('③ 大逃殺 100 人：只留頭像、排在小地圖右邊');
ok(/#pkRoster\.mini \{/.test(src), '有 .mini 精簡模式');
ok(/#pkRoster\.mini \.pcard canvas \{[^}]*width: 24px; height: 24px/.test(src), '頭像固定 24px（不再被 flex 壓成細條）');
ok(/#pkRoster\.mini \.pkinfo \{ display: none; \}/.test(src), '大逃殺把名字／星星收起來（只留頭像）');
ok(/\.pmore \{/.test(src), '塞不下時有「+N」溢出徽章');
ok(/const brMany = Game\.mode === 'br' && Game\.players\.length > 8/.test(src), '只在 9 人以上才切精簡模式（對戰 4~8 人保留名字）');
ok(/Math\.max\(4, Math\.min\(12, Math\.floor\(\(room - 34\) \/ 26\)\)\)/.test(src), '同時最多 12 個頭像，窄機自動減到 4 個');
ok(/mmBox \? mmBox\.x \+ mmBox\.w \+ 6 : 8/.test(src), '整條列往右讓開小地圖（minimapBox 右緣 +6）');
ok(/pkEl\.style\.left = lx \+ 'px'/.test(src), '位置用 inline style 設定（CSS 只管外觀）');

// 沙盒實跑：100 人只渲染 12 張卡 + 溢出徽章
const G = P.Game;
G.mode = 'br';
const real = [];
for (let i = 0; i < 100; i++) {
  real.push({ name: 'P' + i, chIdx: i % 8, ch: { color: '#fff' }, alive: i % 3 !== 0, wins: 0, ai: true, team: -1 });
}
G.players = real;
try { P.updateHud(); } catch (e) { console.log('  (updateHud threw: ' + e.message + ')'); }
const roster = env.getId('pkRoster');
const html = String(roster.innerHTML || '');
const nCard = (html.match(/class="pcard/g) || []).length;
ok(nCard > 0 && nCard <= 12, '100 人 → 最多 12 張卡（不是 100 張）', nCard);
ok(/pmore/.test(html), '有「+N」徽章告訴玩家還有多少人', (html.match(/<i class="pmore">([^<]*)</) || [])[1]);
ok(/mini/.test(String(roster.className || '')), '大逃殺時加上 mini class', roster.className);

/* ================= ④ 橫屏首頁微調 ================= */
head('④ 橫屏首頁：LOGO 放大、暱稱貼底、公告上移');
ok(/grid-template-rows: auto minmax\(0, 1fr\) auto auto/.test(src), '四列：LOGO 那列吃剩下的高度');
ok(/body\.touch\.home-wide #scr-title \.nickwrap \{[^}]*align-self: end/.test(src), '暱稱貼齊底部（＝右欄按鈕列下緣）');
ok(/body\.touch\.home-wide #scr-title \.titlewrap \{[^}]*display: flex; align-items: center; justify-content: center/.test(src),
  'LOGO 在左欄垂直置中');
ok(/body\.touch\.home-wide #scr-title \.title-card \.title-logo \{[^}]*width: 100%; max-width: 100%/.test(src),
  'LOGO 寬度吃滿欄寬（左右只留一點空間）');
ok(/padding: calc\(30px \+ env\(safe-area-inset-top, 0px\)\) 10px/.test(src), '上面那條再往上收 5px（30px）');

/* ================= ⑤ 版本 ================= */
head('⑤ 版本戳記');
const vm = src.match(/const VERSION = '([\d.]+)'/);
ok(vm && parseFloat(vm[1]) >= 5.48, 'VERSION ≥ 5.48', vm && vm[1]);
const vlog = String(SB.vlog || '');
ok(!/v: '5\.48'[\s\S]{0,240}now: true/.test(vlog), '5.48 已改成 now:false（被更新的一版蓋過）');
ok(!/v: '5\.47'[\s\S]{0,200}now: true/.test(vlog), '5.47 已改成 now:false');
const sws = [
  ['bomb-hero/sw.js', fs.readFileSync(__dirname + '/../sw.js', 'utf8')],
  ['public/sw.js', fs.readFileSync(__dirname + '/../../public/sw.js', 'utf8')],
  ['bomberman-online/public/sw.js', fs.readFileSync(__dirname + '/../../bomberman-online/public/sw.js', 'utf8')]
];
sws.forEach(function (x) {
  const m = x[1].match(/var SW_VERSION = 'v([\d.]+)'/);
  ok(m && parseFloat(m[1]) >= 5.48, x[0] + ' 的 SW_VERSION 也升到 5.48（' + (m && m[1]) + '）');
});

console.log('\n' + (fail === 0 ? '✅ 全部 ' + pass + ' 項通過' : '❌ ' + fail + ' 項失敗 / ' + (pass + fail) + ' 項'));
process.exit(fail === 0 ? 0 : 1);
