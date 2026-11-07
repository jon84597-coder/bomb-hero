// test/verify-v535.js —— v5.35
//   ① PUBG 式隨機縮圈（換位置、虛線預告、8 秒收在虛線上）
//   ② 核彈對怪物／BOSS 造成傷害（直擊／燒地）
//   ③ 打倒小怪／BOSS 掉落金幣／道具／恐龍蛋
//   ④ 大逃殺戰鬥曲音量平衡（低音換 sawtooth）
//   ⑤ 硬牆只准 1 格厚（岩脊／空心圍籬，禁止 2×2 實心塊）
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

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
  if (n) P.BR.opt.n = n;
  P.startBR();
  G.state = 'play';
  G.brNukeCd = 1e9;             // 這一支不測核彈，先把核彈關掉免得影響縮圈
  return G;
}
function hard2x2() {
  let k = 0;
  for (let y = 1; y < G.rows - 2; y++) for (let x = 1; x < G.cols - 2; x++) {
    if (G.brIsl[y][x] < 0) continue;
    if (G.grid[y][x] === 1 && G.grid[y][x + 1] === 1 && G.grid[y + 1][x] === 1 && G.grid[y + 1][x + 1] === 1) k++;
  }
  return k;
}

// ================================================================
head('1. 隨機縮圈：常數與開局預告');
{
  ok(P.BR.SHRINK === 8, '收圈動畫 8 秒（' + P.BR.SHRINK + '）');
  bootBR();
  const z = G.brZone;
  ok(z.mode === 'wait', '開局是「等待」狀態（' + z.mode + '）');
  ok(Math.abs(z.t - (P.BR.PH[0][0] - P.BR.SHRINK)) < .5, '等待時間 = 60 - 8（' + z.t.toFixed(1) + ' 秒）');
  ok(z.nr === P.BR.PH[0][1], '下一圈半徑 = 毒圈表第一個目標（' + z.nr + '）');
  ok(z.nx != null && z.ny != null && !z.done, '開局就算好第一個虛線圈');
}

// ================================================================
head('2. 縮圈會換位置（不是原地縮小）');
{
  bootBR();
  const z = G.brZone;
  const cx0 = z.cx, cy0 = z.cy, r0 = z.r;
  for (let i = 0; i < 60 * 51; i++) { G.brNukeCd = 1e9; P.updateBR(1 / 60); }
  ok(Math.abs(G.brZone.r - r0) < .01, '51 秒時還沒開始收（r=' + G.brZone.r.toFixed(2) + '）');
  for (let i = 0; i < 60 * 2; i++) { G.brNukeCd = 1e9; P.updateBR(1 / 60); }
  ok(G.brZone.mode === 'shrink', '53 秒進入收圈（' + G.brZone.mode + '）');
  ok(G.brZone.r < r0 && G.brZone.r > G.brZone.nr, '收圈中：半徑在兩者之間（' + G.brZone.r.toFixed(1) + '）');
  for (let i = 0; i < 60 * 8; i++) { G.brNukeCd = 1e9; P.updateBR(1 / 60); }
  const z2 = G.brZone;
  ok(z2.phase >= 1, '收完進下一階段（phase=' + z2.phase + '）');
  // v5.36：地圖 56×44 → 79×62，開場圈 40、第一圈目標 34
  ok(Math.abs(z2.r - 34) < .6, '第一圈收到 34 格（' + z2.r.toFixed(1) + '）');
  ok(z2.tr < z2.r, '下一圈目標更小（' + z2.tr + '）');
  ok(Math.hypot(cx0 - (G.cols - 1) / 2, cy0 - (G.rows - 1) / 2) < .01,
    '開局圈心在正中間（' + cx0 + ',' + cy0 + '／地圖 ' + G.cols + '×' + G.rows + '）');
}

// ================================================================
head('3. 圈會漂到地圖邊角（跑滿 10 段）');
{
  let maxDrift = 0, inside = true, moved = 0;
  for (let k = 0; k < 5; k++) {
    // 只驗縮圈 → 人數壓到 20（v5.36 的 100 人跑 180k 幀會超過測試逾時）
    bootBR(20);
    const c0x = G.brZone.cx, c0y = G.brZone.cy;
    const ccx = (G.cols - 1) / 2, ccy = (G.rows - 1) / 2;   // 圈心基準跟著地圖大小
    for (let i = 0; i < 60 * 600; i++) {
      G.brNukeCd = 1e9;
      P.updateBR(1 / 60);
      const z = G.brZone;
      maxDrift = Math.max(maxDrift, Math.hypot(z.cx - ccx, z.cy - ccy));
      // 新圈一定要整個包在舊圈裡（PUBG 規則）
      if (Math.hypot(z.nx - z.cx, z.ny - z.cy) + z.nr > z.r + .05) inside = false;
    }
    if (Math.hypot(G.brZone.cx - c0x, G.brZone.cy - c0y) > 1) moved++;
  }
  ok(moved >= 3, '5 場裡至少 3 場的圈心真的換了位置（' + moved + '/5）');
  ok(maxDrift > 6, '圈心離地圖中心最遠 ' + maxDrift.toFixed(1) + ' 格（>6 格才算「縮在角落」）');
  ok(inside, '每一圈都完整包在上一圈裡（PUBG 規則）');
}

// ================================================================
head('4. 虛線預告（大地圖＋小地圖）');
{
  ok(/setLineDash\(\[T \* \.55, T \* \.40\]\)/.test(src), '大地圖有虛線節奏（T*.55 / T*.40）');
  ok(/lineDashOffset = -gt \* T \* \.55/.test(src), '虛線沿著圈在跑（彈彈的）');
  ok(/strokeStyle = 'rgba\(255,255,255,\.62\)'/.test(src) && /rgba\(24,10,32,\.40\)/.test(src),
     '大地圖的虛線壓淡但看得見（白色 .62 墊在深色底線上）');
  ok(/v5\.35：下一圈預告/.test(src), '有標註「下一圈預告」');
  ok(/v5\.35：毒圈範圍（小地圖半徑直接吃 cw/.test(src), '小地圖畫出毒圈範圍');
  ok(/setLineDash\(\[3, 2\.4\]\)/.test(src), '小地圖也有虛線（而且更明顯）');
  ok(/rgba\(255,116,190,\.92\)/.test(src), '小地圖毒圈是亮粉紅實線');
  ok(/arc\(zx, zy, zr, 0, 6\.2832, true\)/.test(src), '小地圖把圈外染成紫紅（反向填色）');
  ok(/z\.done/.test(src) && /!z\.done && z\.nx != null/.test(src), '最後一圈收完就不再畫預告');
}

// ================================================================
head('5. 核彈打怪與 BOSS');
{
  bootBR();
  const T = G.T;
  const foe = G.enemies[0];
  foe.x = 20.5 * T; foe.y = 20.5 * T; foe.hp = foe.maxHp = 1;
  const boss = { boss: true, brBoss: true, maxHp: 20, hp: 20, color: '#fff',
    x: 21.5 * T, y: 20.5 * T, dead: false, spec: null };
  G.enemies.push(boss);
  // v5.36：核彈改成陣列（一波兩顆）→ 測試也要塞進 Game.brNukes
  const nk0 = { cx: 20, cy: 20, phase: 'fall', t: .001, fall: 1, dur: 0 };
  G.brNukes = [nk0]; G.brNuke = nk0;
  P.updateBRNuke(.01);
  ok(G.brNukes[0] && G.brNukes[0].phase === 'done', '核彈落地');
  ok(foe.dead, '半徑內的雜兵當場蒸發');
  ok(boss.hp === 20 - Math.round(20 * .35), 'BOSS 吃 35% 血量（20 → ' + boss.hp + '）');
  ok(!boss.dead, 'BOSS 不會被一顆核彈帶走');

  const b2 = { boss: true, brBoss: true, maxHp: 20, hp: 1, color: '#fff',
    x: 20.5 * T, y: 20.5 * T, dead: false, spec: null };
  G.enemies.push(b2);
  G.brBurn.push({ cx: 20, cy: 20, t: 5, tongues: [] });
  P.brNukeHurtFoe(b2, 6, false);
  ok(b2.dead, '血見底的 BOSS 會被炸死');

  const burnFoe = { maxHp: 6, hp: 6, color: '#fff', x: 20.5 * T, y: 20.5 * T, dead: false, spec: null };
  G.enemies.push(burnFoe);
  G.brBurn = [{ cx: 20, cy: 20, t: 9, tongues: [] }];
  for (let i = 0; i < 60 * 3; i++) P.updateBRNuke(1 / 60);
  ok(burnFoe.hp <= 3, '站在火裡每秒 -1（6 → ' + burnFoe.hp + '）');
}

// ================================================================
head('6. 掉落：金幣／道具／恐龍蛋');
{
  bootBR();
  ok(/coin:   \{ icon: '🪙'/.test(src), 'ITEMS 有金幣');
  ok(/coin: '#ffd766'/.test(src), '金幣有自己的顏色（金黃）');
  ok(/id: 'coin', en: 'Coin'/.test(src), '說明頁有金幣條目');
  ok(/function drawCoinDrop/.test(src) && /fillText\('\$', 0, r \* \.04\)/.test(src),
     '金幣是程式畫的立體硬幣（會旋轉）');
  ok(/if \(it\.type === 'coin'\) \{ drawCoinDrop/.test(src), '場上有金幣就用金幣美術');

  const e0 = G.enemies[0];
  let coins = 0, gears = 0, eggs = 0;
  for (let i = 0; i < 240; i++) {
    const ni = G.items.length, ne = G.eggs.length;
    P.foeDrop({ x: e0.x, y: e0.y, dead: false });
    for (let k = ni; k < G.items.length; k++) { if (G.items[k].type === 'coin') coins++; else gears++; }
    if (G.eggs.length > ne) eggs++;
    G.items.length = ni; G.eggs.length = ne;
  }
  ok(coins > 0 && gears > 0 && eggs > 0, '三種都會掉（金幣 ' + coins + '／道具 ' + gears + '／蛋 ' + eggs + '）');
  ok(coins > gears, '金幣最常見（' + coins + ' > ' + gears + '）');
  ok(/_coins|coinTo\(p, \(item && \(item\.amount \| 0\)\) \|\| 6\)/.test(src) === false ||
     /if \(type === 'coin'\) \{ coinTo/.test(src), '撿金幣走 coinTo');
  ok(/e\.isSplit\) return;/.test(src), '分裂出來的小碎片不掉東西（不能刷）');
  ok(/Game\.mode !== 'solo' && Game\.mode !== 'rpg' && Game\.mode !== 'br'/.test(src),
     '只有單人／RPG／大逃殺會掉（對戰不掉）');
  ok(/if \(e && !e\.dropDone\)/.test(src), 'foeOnDeath 是唯一出口 → 所有死亡方式都吃得到');

  const p = G.players[0];
  const sc0 = p.score | 0;
  P.coinTo(p, 7);
  ok((p.score | 0) - sc0 === 7, 'coinTo 直接把金幣加進分數（+7）');
  ok(G.brLootGold >= 7, '大逃殺另外累計到 brLootGold（' + G.brLootGold + '）');
  ok(/const loot = Math\.max\(0, Game\.brLootGold \| 0\)/.test(src), '結算時把掉落金幣加進獎金');
  // BOSS 掉比較多
  let bossCoins = 0;
  for (let i = 0; i < 60; i++) {
    const ni = G.items.length;
    P.foeDrop({ x: e0.x, y: e0.y, boss: true, dead: false });
    for (let k = ni; k < G.items.length; k++) if (G.items[k].type === 'coin') bossCoins += G.items[k].amount;
    G.items.length = ni;
  }
  ok(bossCoins / 60 > 15, 'BOSS 掉的金幣比較多（平均 ' + (bossCoins / 60).toFixed(1) + ' 枚）');
}

// ================================================================
head('7. 大逃殺音樂音量平衡');
{
  const d10 = P.AudioSys.WAR_DEFS.brWar10;
  ok(d10.bassWave === 'sawtooth' && d10.bassLp === 420, '低音軌換成 sawtooth＋低通 420Hz（手機才聽得到）');
  ok(d10.bassVol >= .24, '低音音量拉到 ' + d10.bassVol);
  ok(d10.drumVol >= .125, '鼓組音量拉到 ' + d10.drumVol);
  ok(d10.melVol < .11, '旋律略收回來（' + d10.melVol + '），不再一枝獨秀');
  const s = P.AudioSys.compileWar('brWar10');
  const bass = s.tracks[1];
  ok(bass.wave === 'sawtooth' && bass.lp === 420, 'compileWar 產出的低音軌確實是 sawtooth');
  ok(s.tracks[0].vol < bass.vol, '低音比旋律大聲（' + bass.vol + ' > ' + s.tracks[0].vol + '）');
  ok(/case 'coin': tone\(1180/.test(src), '金幣有專屬音效');
}

// ================================================================
head('8. 硬牆不准聚成一坨');
{
  // v5.37：整組重寫（一座一座檢查）。舊的「單格 2×2 撤銷」擋不住兩座各 1 格厚貼在一起，
  //   改成「整座碰到別座就放棄」＋密度上限，形狀仍然只准直線與空心圍籬。
  ok(/function hardCanPlace\(cells\)/.test(src), '有 hardCanPlace 統一判斷整座能不能放');
  ok(/function hardTouchOther\(x, y\)/.test(src), '新的一座碰到別座（含斜角）就整座放棄');
  ok(/if \(hardDensity\(c.x, c.y, 2\) > 7\) return false;/.test(src), '再加方圓 2 格的密度上限');
  ok(/① 空心圍籬先放/.test(src), '形狀 ①：留缺口的空心圍籬');
  ok(/② 直線岩脊（長 2~4 格，只准連成一排）/.test(src), '形狀 ②：1 格厚的直線岩脊');
  ok(!/const rr = 1 \+ Math\.random\(\) \* 1\.9;/.test(src), '舊的「半徑 1~2.9 圓團」已經移除');

  let worst = 0, minHard = 999, maxHard = 0;
  for (let k = 0; k < 8; k++) {
    bootBR();
    const b = hard2x2();
    if (b > worst) worst = b;
    let hard = 0;
    for (let y = 1; y < G.rows - 1; y++) for (let x = 1; x < G.cols - 1; x++) {
      if (G.brIsl[y][x] >= 0 && G.grid[y][x] === 1) hard++;
    }
    minHard = Math.min(minHard, hard); maxHard = Math.max(maxHard, hard);
  }
  ok(worst === 0, '8 張圖完全沒有 2×2 實心硬牆（最多 ' + worst + ' 個）');
  // v5.36：地圖面積 ×2（79×62）→ 硬牆量上限也放寬約 2 倍
  ok(minHard >= 100 && maxHard <= 460, '硬牆量還在合理範圍（' + minHard + '~' + maxHard + ' 格／' +
    G.cols + '×' + G.rows + '）');
}

// ================================================================
head('9. 版本與預算');
{
  // 不寫死版號（後續版本沿用這支）：只驗「至少是 5.35」與四處戳記同步
  const VN = P.VERSION.split('.').map(Number);
  const vEsc = P.VERSION.replace(/\./g, '\\.');
  ok(VN[0] === 5 && VN[1] >= 35, 'VERSION 是 5.35 以上（' + P.VERSION + '）');
  ok(new RegExp('<span id="verTxt">' + vEsc + '</span>').test(src), '#verTxt 同步');
  ok(new RegExp('<span id="verLogVer">' + vEsc + '</span>').test(src), '#verLogVer 同步');
  ok(P.VERSION_LOG[0].v === P.VERSION && P.VERSION_LOG[0].now === true, 'VERSION_LOG 首位＝' + P.VERSION + ' 且 now:true');
  ok(P.VERSION_LOG[1].now === false, '上一版 ' + P.VERSION_LOG[1].v + ' 已是 now:false');
  ok(P.VERSION_LOG[0].items.length >= 5, '本版至少 5 條（實際 ' + P.VERSION_LOG[0].items.length + '）');
  ok(!/後台|開發者/.test(P.VERSION_LOG[0].items.join('')), '更新內容不出現「後台／開發者」');
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  const swv = (sw.match(/var SW_VERSION = 'v([\d.]+)'/) || [])[1] || '0';
  const sv = swv.split('.').map(Number);
  ok(sv[0] > 5 || (sv[0] === 5 && sv[1] >= 35), 'sw.js 是 v5.35.x（目前 ' + swv + '）');
  const raw = require('./_sandbox').rawHtml;
  ok(raw.length <= 2400000, '主檔 ' + raw.length + ' 字元（v5.54：合併全文防呆上限 2,400,000；單檔預算已拆成 index.html／js/main.js）');
  ok(raw.indexOf('\r') === -1, '整檔 LF（CR 0）');
}

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' v5.35：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
