// test/verify-v536.js —— v5.36
//   ① 友軍全免疫眩暈（自己／隨從／隊友的炸彈都不暈，敵方投擲彈照暈）
//   ② 大逃殺地圖 ×2（79×62）＋ 100 人＋一波兩顆核彈＋最後 1 分鐘停火＋落點只在圈內
//   ③ 大逃殺外牆換成鈦合金（機械面板／髮絲紋／鉚釘／磨損）
//   ④ 每章第 5 關＝BOSS 決戰場（17×15、開場無小兵、每分鐘 2 隻、王死開門、冠軍級勝利演出）
//   ⑤ 版本戳記／預算／LF
const fs = require('fs');
const path = require('path');
const { makeEnv, rawHtml } = require('./_sandbox');

const env = makeEnv();
const P = env.BH, G = P.Game;
const src = env.html.replace(/\r/g, '');

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

function bootBR(n) {
  env.getId('body').classList.add('touch');
  const c = env.getId('cv'); c.clientWidth = 390; c.clientHeight = 775;
  P.settings.ctrl = 'touch';
  P.BR.opt.n = n || 100;
  P.startBR();
  G.state = 'play';
  return G;
}

// ================================================================
head('① 友軍眩暈免疫');
{
  ok(typeof P.dizzyImmune === 'function', 'dizzyImmune 存在');
  ok(typeof P.sameSquad === 'function', 'sameSquad 存在（v5.36 新增：隊友判定）');

  const me = { team: 0 }, ally = { team: 0 }, enemy = { team: 1 }, pet = { __pet: true };
  ok(P.dizzyImmune(me, { owner: me }) === true, '自己丟的 → 不暈');
  ok(P.dizzyImmune(me, { petOwner: me }) === true, '隨從（petOwner）丟的 → 不暈');
  ok(P.dizzyImmune(me, { owner: pet, petOwner: pet }) === true, '隨從自己丟的 → 不暈');
  ok(P.dizzyImmune(me, { owner: null }) === false, '怪物／場外推車丟的 → 照樣暈');

  G.teamsOn = 3;   // 分隊模式
  ok(P.sameSquad(me, ally) === true, '同隊（team 0 / 0）算友軍');
  ok(P.dizzyImmune(me, { owner: ally }) === true, 'v5.36：隊友丟的 → 不暈');
  ok(P.dizzyImmune(me, { owner: enemy }) === false, '敵隊丟的 → 照樣暈');
  G.teamsOn = 1;
  ok(P.sameSquad(me, ally) === false, '混戰（沒分隊）時不比 team');
  ok(P.dizzyImmune(me, { owner: ally }) === false, '混戰時別人丟的還是會暈（不是無敵）');
  ok(P.dizzyImmune(null, { owner: me }) === false, 'who 是 null 不會爆');
}

// ================================================================
head('② 大逃殺：79×62／100 人／雙核彈');
{
  ok(P.BR.W === 79 && P.BR.H === 62, '地圖 79×62（面積 ×2：' + (79 * 62) + ' 格）');
  ok(P.BR.N === 100 && P.BR.opt.n === 100, '人數 100（預設 ' + P.BR.opt.n + '）');
  ok(P.BR.Z0 === 40, '開場毒圈半徑 40 格（包得住整張 79×62）');
  ok(P.BR.NUKE === 45 && P.BR.NUKE_N === 2, '每 45 秒一波、一波 ' + P.BR.NUKE_N + ' 顆');
  // v5.37：120 → 60（兩種尺寸都只剩最後 1 分鐘停火）
  ok(P.BR.NUKE_STOP >= 60, '剩 ' + P.BR.NUKE_STOP + ' 秒就不再落彈（至少最後 1 分鐘）');
  ok(P.BR.NUKE_GAP >= 8, '同波兩顆至少隔 ' + P.BR.NUKE_GAP + ' 格（不會疊在同一格）');

  bootBR(100);
  ok(G.cols === 79 && G.rows === 62, '實際建出 ' + G.cols + '×' + G.rows);
  ok(G.players.length === 100, '場上 ' + G.players.length + ' 名玩家');
  ok(G.players.filter(function (p) { return p.ai; }).length === 99, '99 個 AI + 自己');

  // 出生點不能重複（100 人擠在同一格會立刻互撞）
  const seen = {};
  let dup = 0;
  G.players.forEach(function (p) {
    const k = Math.floor(p.x / G.T) + ',' + Math.floor(p.y / G.T);
    if (seen[k]) dup++; seen[k] = 1;
  });
  ok(dup === 0, '100 個出生點互不重疊（重複 ' + dup + ' 個）');

  // 一波兩顆、都在圈內、彼此有距離
  G.brNukes = []; G.brNuke = null;
  P.brNukeLaunch();
  ok(G.brNukes.length === 2, '一波真的落 ' + G.brNukes.length + ' 顆');
  const z = G.brZone;
  const outside = G.brNukes.filter(function (n) {
    return Math.sqrt(Math.pow(n.cx + .5 - (z.cx + .5), 2) + Math.pow(n.cy + .5 - (z.cy + .5), 2)) > Math.max(1.5, z.r - 1);
  });
  ok(outside.length === 0, '兩顆的落點都在毒圈內（圈外 ' + outside.length + ' 顆）');
  if (G.brNukes.length === 2) {
    const dd = Math.hypot(G.brNukes[0].cx - G.brNukes[1].cx, G.brNukes[0].cy - G.brNukes[1].cy);
    ok(dd >= P.BR.NUKE_GAP - .01, '兩顆相距 ' + dd.toFixed(1) + ' 格');
  }
  ok(G.brNuke === G.brNukes[0], 'Game.brNuke 仍指向第一顆（相容舊程式）');
}

// ================================================================
head('②-b 最後 1 分鐘不再落彈');
{
  ok(typeof P.brTimeLeft === 'function', 'brTimeLeft() 存在');
  bootBR(20);
  const t0 = P.brTimeLeft();
  ok(t0 > 500 && t0 <= 601, '開場剩餘 ' + t0.toFixed(0) + ' 秒');

  // 把時間推到最後一段尾巴
  G.brZone.phase = P.BR.PH.length - 1;
  G.brZone.mode = 'shrink';
  G.brZone.st = P.BR.PH[P.BR.PH.length - 1][0];
  G.brZone.t = 0;
  const t1 = P.brTimeLeft();
  ok(t1 <= P.BR.NUKE_STOP, '模擬到剩 ' + t1.toFixed(0) + ' 秒（≤ ' + P.BR.NUKE_STOP + '）');

  G.brNukes = []; G.brNuke = null; G.brNukeCd = .01;
  for (let i = 0; i < 300; i++) P.updateBRNuke(1 / 60);
  ok(G.brNukes.length === 0, '最後 2 分鐘真的 5 秒內一顆都沒落（' + G.brNukes.length + ' 顆）');

  // 反過來：時間還早 → cd 到就會落
  bootBR(20);
  G.brNukes = []; G.brNuke = null; G.brNukeCd = .01;
  for (let i = 0; i < 30; i++) P.updateBRNuke(1 / 60);
  ok(G.brNukes.length === 2, '時間還早時 cd 到就會落一波（' + G.brNukes.length + ' 顆）');
}

// ================================================================
head('②-c 100 人的效能：遠方 AI 降頻');
{
  ok(/p\.lodAcc = \(p\.lodAcc \|\| 0\) \+ dt;/.test(src), '有 lodAcc 累加器');
  ok(/lx \* lx \+ ly \* ly > 18 \* 18/.test(src), '離玩家 18 格外才降頻（近處仍是全速）');
  ok(/if \(far && p\.lodAcc < 1 \/ 6\) return;/.test(src), '遠方降成 6Hz（不是整隻停掉）');
  ok(/adt = Math\.min\(\.35, p\.lodAcc\)/.test(src), '降頻後補回累積時間（移動速度不變慢）');
}

// ================================================================
head('③ 鈦合金外牆');
{
  ok(typeof P.drawBRTitanWall === 'function', 'drawBRTitanWall 存在');
  ok(/if \(Game\.mode === 'br' && gx != null\) \{ drawBRTitanWall\(px, py, T, seed, gx, gy\); return; \}/.test(src),
    '大逃殺的外牆走鈦合金（其他模式仍用主題外牆）');
  ['鈦合金', '髮絲紋', '面板接縫', '散熱柵欄', '鉚釘', '磨損', '警示條'].forEach(function (k) {
    ok(src.indexOf(k) > 0, '材質細節有「' + k + '」');
  });
  ok(/#a5b7c8/.test(src) && /#414a55/.test(src), '底板是亮冷灰漸層（#a5b7c8 → #414a55）');
  ok(/rgba\(96,146,196,\.14\)/.test(src), '加了冷色調（不會被場地暖光染成水泥）');
  ok(/h\(91\) > \.52/.test(src) && /h\(101\) > \.74/.test(src), '鏽流／油汙是穩定偽隨機（同一格不會每幀亂跳）');

  // 真的畫得出東西
  bootBR(20);
  env.rec.calls.length = 0;
  let threw = null;
  try { P.drawBRTitanWall(20, 40, 32, 12345, 3, 4); } catch (e) { threw = e.message; }
  ok(!threw, '實際呼叫不會丟錯' + (threw ? '：' + threw : ''));
  ok(env.rec.calls.length > 40, '一次畫出 ' + env.rec.calls.length + ' 個繪圖指令（有真的在畫）');
}

// ================================================================
head('④ 每章第 5 關＝BOSS 決戰場');
{
  ok(P.SOLO_STAGES === 40 && P.BOSS_SLOT === 5, '40 關制、每章 5 關（' + P.SOLO_STAGES + ' / ' + P.BOSS_SLOT + '）');
  ok(P.chapterOf(40) === 8 && P.stageSlot(40) === 5, '第 40 關＝第 8 章第 5 關');
  ok(P.isBossStage(5) && P.isBossStage(40) && !P.isBossStage(4) && !P.isBossStage(6), '只有第 5、10、… 關是決戰場');
  ok(P.stageName(5).indexOf('1-5') === 0, '關卡名是「1-5　…」（' + P.stageName(5) + '）');
  ok(P.soloInfo(5).boss === true, 'soloInfo(5) 標記 boss');

  // 場地
  P.settings.size = 'M'; P.settings.soloDiff = 'normal'; P.settings.hazards = 'off';
  P.startSolo(5, false);
  G.state = 'play';
  ok(G.cols === 17 && G.rows === 15, '決戰場 17×15（對戰「大」的尺寸）');
  ok(!!G.door && G.door.x === 8 && G.door.y === 1 && G.door.open === false, '大門在正上方（8,1）而且一開始是關的');
  const me0 = G.players[0];
  ok(Math.floor(me0.x / G.T) === 8 && Math.floor(me0.y / G.T) === 13, '玩家從正下方（8,13）出發');
  const bosses = G.enemies.filter(function (e) { return e.type === 'boss'; });
  ok(bosses.length === 1, '場上只有 1 隻王（' + bosses.length + '）');
  const B0 = bosses[0];
  ok(B0 && Math.floor(B0.x / G.T) === 8 && Math.floor(B0.y / G.T) === 2, '王站正上方（8,2）');
  ok(G.enemies.length === 1, '開場完全沒有小兵（' + G.enemies.length + ' 隻敵人）');
  ok(!!G.bossArena && G.bossArena.minionT === 60, '計時器 60 秒後生小兵');

  // 60 秒 → 2 隻
  for (let i = 0; i < 122; i++) P.updateBossArena(.5);
  const minions = G.enemies.filter(function (e) { return e.type !== 'boss'; });
  ok(minions.length === 2, '過了 1 分鐘生出 ' + minions.length + ' 隻小兵');
  ok(minions.every(function (e) {
    const cx = Math.floor(e.x / G.T), cy = Math.floor(e.y / G.T);
    return G.grid[cy] && G.grid[cy][cx] === 0;
  }), '小兵都站在空地上（不會卡牆）');
  for (let i = 0; i < 122; i++) P.updateBossArena(.5);
  ok(G.enemies.filter(function (e) { return e.type !== 'boss'; }).length === 4, '再 1 分鐘再補 2 隻');

  // 王死 → 門開
  G.bossArena.boss.hp = 0; G.bossArena.boss.dead = true;
  P.updateBossArena(1 / 60);
  ok(G.bossArena.bossDead === true, '王死後標記 bossDead');
  ok(G.door.open === true, '王死 → 上方大門自動打開');

  // 勝利演出（比照大逃殺冠軍）
  ok(/boss\.clear/.test(src), '有「通關」提示文案');
  ok(/AudioSys\.sfx\('victory'\)/.test(src), '打贏播勝利音效');
  ok(/confetti\(p\.x \+ \(Math\.random\(\) - \.5\)/.test(src), '打贏灑紙花');
  ok(/Game\.flash = Math\.max\(Game\.flash \|\| 0, \.55\)/.test(src), '打贏白閃一下');
  ok(/Game\.shake = Math\.max\(Game\.shake \|\| 0, \.5\)/.test(src), '打贏震屏');

  // RPG 也走同一套
  P.startRpg(5);
  ok(G.cols === 17 && G.rows === 15 && !!G.bossArena, 'RPG 第 5 關也是 17×15 決戰場');
  ok(G.bossArena.boss.hp === P.bossHpOf(1) + 5,
    'v5.50：RPG 第 5 關王血＝單人第 1 章 ＋5（' + G.bossArena.boss.hp + '）');
}

// ================================================================
head('④-b 選關畫面：40 格、8 個決戰場');
{
  P.Solo.sel = 1;
  P.Solo.renderGrid();
  const kids = env.getId('stageGrid').children || [];
  ok(kids.length === 40, '選關畫面 ' + kids.length + ' 格');
  const withBoss = kids.filter(function (b) { return String(b.className || '').indexOf('boss') >= 0; }).length;
  ok(withBoss === 8, '其中 ' + withBoss + ' 格標成決戰場（每章 1 個）');
}

// ================================================================
head('⑤ 版本與預算');
{
  const VN = P.VERSION.split('.').map(Number);
  ok(VN[0] === 5 && VN[1] >= 36, 'VERSION 是 5.36 以上（' + P.VERSION + '）');
  ok(P.VERSION_LOG[0].v === P.VERSION && P.VERSION_LOG[0].now === true, 'VERSION_LOG 首位＝' + P.VERSION + ' 且 now:true');
  ok(P.VERSION_LOG[1].now === false, '上一版 ' + P.VERSION_LOG[1].v + ' 已是 now:false');
  ok(P.VERSION_LOG[0].items.length >= 5, '本版至少 5 條（' + P.VERSION_LOG[0].items.length + ' 條）');
  ok(!/後台|開發者/.test(P.VERSION_LOG[0].items.join('')), '更新內容不出現「後台／開發者」');
  ok(env.html.indexOf('id="verTxt">' + P.VERSION) > 0, '#verTxt 同步');
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  const swv = (sw.match(/var SW_VERSION = 'v([\d.]+)'/) || [])[1] || '0';
  ok(Number(swv.split('.')[1]) >= 36, 'sw.js = v' + swv);
  ok(rawHtml.length < 2400000, '主檔 ' + rawHtml.length + ' 字元（v5.54：合併全文防呆上限 2,400,000；單檔預算已拆成 index.html／js/main.js）');
  ok((rawHtml.match(/\r/g) || []).length === 0, '整檔 LF（0 個 \\r）');
}

console.log('\n' + (fail ? '❌' : '✅') + ' v5.36：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
