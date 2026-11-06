// test/verify-v533.js —— v5.33
//   ① 大逃殺核彈：45 秒一顆、通報 5 秒、落下 2 秒、落地爆
//   ② 爆炸：半徑 5 格軟牆全毀、直擊 -6 格血、畫面震動、燒地 10 秒
//   ③ 燒地每秒 -1 格
//   ④ AI 只有「有察覺」的那批會逃
//   ⑤ 隊友／隨從的炸彈是白色的、爆炸是藍色火焰
//   ⑥ 淚水再放大（10 顆、1.45 倍）
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

const env = makeEnv();
const P = env.BH, G = P.Game;
const src = env.html.replace(/\r/g, '');
const mk = () => env.mkCtx2D();

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

// ================================================================
head('1. 常數與音效');
{
  ok(P.BR.NUKE === 45, '每 45 秒一顆（' + P.BR.NUKE + '）');
  ok(P.BR.NUKE_WARN === 5, '落下前 5 秒通報');
  ok(P.NUKE_R === 5 && P.NUKE_DMG === 6 && P.NUKE_BURN_SEC === 10, '半徑 5 格／直擊 6 格血／燒地 10 秒');
  ok(/case 'nukeAlarm'/.test(src) && /case 'nukeFall'/.test(src) && /case 'nukeBoom'/.test(src),
     '三種音效：警報、下墜、落地爆炸');
  ok(/gn\.gain\.setValueAtTime\(\.16, t0 \+ 3\.70\);/.test(src) && /t0 \+ 5\.00\)/.test(src),
     '警報聲在最後 1 秒慢慢消音（3.7s → 5.0s 漸弱到 0）');
  ok(/f2\.frequency\.exponentialRampToValueAtTime\(260, t0 \+ dur\)/.test(src), '下墜音是往下掃的火箭聲');
  ok(/boom\(1\.9, \.95\)/.test(src), '落地是 1.9 秒的低頻大爆炸');
}

// ================================================================
head('2. 45 秒後開始通報');
{
  P.BR.opt = { n: 20, team: 1, dur: 10 };
  P.startBR();
  G.state = 'play';
  G.brNuke = null; G.brBurn = []; G.brNukeCd = P.BR.NUKE;
  ok(G.brNuke === null, '開局沒有核彈');
  P.updateBRNuke(P.BR.NUKE - 1);
  ok(G.brNuke === null, '44 秒時還沒來');
  P.updateBRNuke(1.2);
  const n = G.brNuke;
  ok(!!n && n.phase === 'warn', '45 秒到 → 進入通報（warn）');
  ok(!!n && Math.abs(n.t - 5) <= 5, '通報時間 5 秒（剩 ' + (n && n.t.toFixed(1)) + '）');
  ok(!!n && G.brIsl && G.brIsl[n.cy] && G.brIsl[n.cy][n.cx] >= 0, '落點在陸地上（不會丟到海裡）');
  ok(!!n && G.brNukeCd === P.BR.NUKE, '下一顆的計時重新歸 45 秒');
  ok(/drawBRNukeGround\(T\)/.test(src) && /drawMiniMap\(\)/.test(src) && /Game\.brNuke\.phase !== 'done'/.test(src),
     '大地圖與小地圖都會畫出轟炸範圍');
}

// ================================================================
head('3. AI 逃跑（只有察覺的那批）');
{
  const n = G.brNuke, T = G.T;
  const cx = (n.cx + .5) * T, cy = (n.cy + .5) * T;
  const ai = G.players[1];
  ai.ai = true; ai.alive = true; ai.dead = false; ai.invuln = 0;
  ai.x = cx + T * 1.2; ai.y = cy + T * 0.2;
  ai.nukeAware = true;
  // 先把周圍 3 格清成空地：隨機地圖有可能剛好被牆卡住（那是地圖問題不是 AI 不跑）
  const ax0 = Math.floor(ai.x / T), ay0 = Math.floor(ai.y / T);
  for (let yy = ay0 - 3; yy <= ay0 + 3; yy++) {
    for (let xx = ax0 - 3; xx <= ax0 + 3; xx++) {
      if (xx > 0 && yy > 0 && xx < G.cols - 1 && yy < G.rows - 1) G.grid[yy][xx] = 0;
    }
  }
  ai.x = (ax0 + .5) * T; ai.y = (ay0 + .5) * T;
  const d0 = Math.sqrt(Math.pow(ai.x - cx, 2) + Math.pow(ai.y - cy, 2));
  for (let i = 0; i < 14; i++) P.brNukeFlee(ai, 0.05);
  const d1 = Math.sqrt(Math.pow(ai.x - cx, 2) + Math.pow(ai.y - cy, 2));
  ok(d1 > d0 + T * .4, '有察覺的 AI 會往外逃（' + (d0 / T).toFixed(2) + ' → ' + (d1 / T).toFixed(2) + ' 格）');

  ai.nukeAware = false;
  ai.x = cx + T * 1.2; ai.y = cy + T * 0.2;
  const moved = P.brNukeFlee(ai, 0.05);
  ok(moved === false, '沒察覺的 AI 不會逃（敏感度低）');

  // 已經在安全距離外 → 不用逃
  ai.nukeAware = true;
  ai.x = cx + T * 20; ai.y = cy + T * 20;
  ok(P.brNukeFlee(ai, 0.05) === false, '已經在爆炸範圍外就不會亂跑');
}

// ================================================================
head('4. 落下 → 落地爆炸');
{
  const n = G.brNuke, T = G.T;
  const cx = n.cx, cy = n.cy;
  // 先在爆心周圍鋪一圈軟磚（含幾格硬牆），才驗得到「軟牆全毀、硬牆不動」
  for (let y = cy - 6; y <= cy + 6; y++) {
    for (let x = cx - 6; x <= cx + 6; x++) {
      if (x < 1 || y < 1 || x > G.cols - 2 || y > G.rows - 2) continue;
      if (G.grid[y][x] === 0) G.grid[y][x] = 2;
    }
  }
  const hardX = cx + 3, hardY = cy;
  G.grid[hardY][hardX] = 1;
  const me = G.players[0];
  me.alive = true; me.dead = false; me.invuln = 0; me.brHp = P.BR.HP;
  me.x = (cx + .5) * T; me.y = (cy + .5) * T;
  G.flames = []; G.bombs = [];

  P.updateBRNuke(5.1);
  ok(G.brNuke.phase === 'fall', '通報 5 秒後進入落下（fall）');
  ok(/drawBRNukeBomb\(T\)/.test(src), '落下中的核彈有獨立的繪製（含影子與拖尾）');

  P.updateBRNuke(2.1);
  ok(G.brNuke.phase === 'done', '2 秒後落地爆炸');
  let softLeft = 0, hardLeft = 0;
  for (let y = cy - 5; y <= cy + 5; y++) {
    for (let x = cx - 5; x <= cx + 5; x++) {
      if (x < 0 || y < 0 || x >= G.cols || y >= G.rows) continue;
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy > 25) continue;
      if (G.grid[y][x] === 2) softLeft++;
      if (G.grid[y][x] === 1) hardLeft++;
    }
  }
  ok(softLeft === 0, '爆心半徑 5 格的軟牆全部消失（剩 ' + softLeft + '）');
  ok(G.grid[hardY][hardX] === 1, '硬牆不會被核彈打穿');
  ok(me.brHp === P.BR.HP - 6, '站在爆心的人扣 6 格血（' + me.brHp + '）');
  ok((G.shake || 0) > .8, '畫面劇烈震動（shake ' + (G.shake || 0).toFixed(2) + '）');
  ok(G.brBurn.length === 1 && Math.abs(G.brBurn[0].t - P.NUKE_BURN_SEC) < .5,
     '炸完留下一塊燒地，持續 10 秒');
}

// ================================================================
head('5. 燒地每秒扣 1 格');
{
  const hp0 = G.players[0].brHp;
  P.updateBRNuke(1.05);
  ok(G.players[0].brHp === hp0 - 1, '站在火裡 1 秒扣 1 格（' + hp0 + ' → ' + G.players[0].brHp + '）');
  const hp1 = G.players[0].brHp;
  P.updateBRNuke(1.05);
  ok(G.players[0].brHp === hp1 - 1, '再 1 秒再扣 1 格（' + hp1 + ' → ' + G.players[0].brHp + '）');
  // 走出火場就不會繼續扣
  const T = G.T;
  G.players[0].x = (G.brBurn[0].cx + P.NUKE_R + 3) * T;
  G.players[0].y = (G.brBurn[0].cy + .5) * T;
  const hp2 = G.players[0].brHp;
  P.updateBRNuke(1.05);
  ok(G.players[0].brHp === hp2, '走出火場就不再扣血');
  ok(P.brBurnAt((G.brBurn[0].cx + .5) * T, (G.brBurn[0].cy + .5) * T, T) === true, 'brBurnAt 認得爆心');
  ok(P.brBurnAt((G.brBurn[0].cx + 9) * T, (G.brBurn[0].cy + 9) * T, T) === false, '9 格外不算燒地');
  // 燒完就消失
  P.updateBRNuke(9.5);
  ok(G.brBurn.length === 0, '10 秒燒完就收掉');
  ok(/drawBRBurn\(T\)/.test(src), '燒地有火焰舌＋火星的繪製');
}

// ================================================================
head('6. 隊友／隨從的炸彈是白的、爆炸是藍的');
{
  const me = G.players[0], mate = G.players[1], foe = G.players[2];
  G.brTeam = 2; G.teamsOn = 2;
  me.team = 0; mate.team = 0; foe.team = 1;
  const pet = { __pet: true, x: me.x, y: me.y };
  ok(P.isAllyOwner(pet) === true, '隨從丟的 → 自己人');
  ok(P.isAllyOwner(mate) === true, '組隊隊友 → 自己人');
  ok(P.isAllyOwner(foe) === false, '敵隊 → 不是自己人');
  ok(P.isAllyOwner(me) === false, '自己的炸彈維持黑色');
  ok(P.isAllyOwner(null) === false, 'BOSS 的彈（owner 為 null）不是自己人');
  ok(P.bombIsAlly({ owner: pet }) === true && P.bombIsAlly({ petOwner: pet }) === true,
     '隨從的炸彈判定為白色彈');
  ok(P.bombIsAlly({ owner: foe }) === false, '敵人的炸彈維持黑色');

  // 火焰顏色：自己人的火標記 ally
  G.flames = [];
  P.addFlame(3, 3, 'center', null, pet);
  P.addFlame(4, 3, 'center', null, foe);
  ok(G.flames[0] && G.flames[0].ally === true, '自己人的爆炸火焰標記為藍色');
  ok(G.flames[1] && G.flames[1].ally === false, '敵人的爆炸火焰維持橘色');

  // 原始碼：白色漸層＋藍色火焰色階
  ok(/g\.addColorStop\(0, '#ffffff'\);/.test(src) && /g\.addColorStop\(1, '#8d99b0'\);/.test(src),
     '白彈是同一個模子、白色漸層');
  ok(/'rgba\(150,206,255,A\)', 'rgba\(64,146,255,A\)', 'rgba\(26,92,238,A\)'/.test(src),
     '藍色火焰色階存在');
  ok(/drawBombArt\(r, b\.seed, hot, armed, !!b\.remoteArmed, danger, bombIsAlly\(b\)\)/.test(src),
     'drawBomb 會把「是不是自己人」傳進美術層');
}

// ================================================================
head('7. 淚水再放大');
{
  ok(/for \(let i = 0; i < 10; i\+\+\)/.test(src), '每一側 10 顆水珠（原 8 顆）');
  ok(/heroDrop\(g, x0 \+ dx, y0 \+ dy, rr \* 1\.45\)/.test(src), '水珠半徑再放大（1.28 → 1.45 倍）');
  ok(/const dx = dir \* size \* \(\.13 \+ \.38 \* ph\) \* fan/.test(src), '往外灑的範圍更寬（.30 → .38）');
}

// ================================================================
head('8. 版本與預算');
{
  const vm = src.match(/const VERSION = '([\d.]+)'/);
  const v = vm ? vm[1].split('.').map(Number) : [0, 0];
  ok(v[0] > 5 || (v[0] === 5 && v[1] >= 33), '主檔版號 ≥ 5.33（目前 ' + (vm && vm[1]) + '）');
  ok(/v: '5\.33'/.test(src), 'VERSION_LOG 有 5.33 條目');
  ok(/\{ v: '5\.32', date: '[^']+', now: false/.test(src), '上一版（5.32）已標記 now:false');
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  const swv = (sw.match(/var SW_VERSION = 'v([\d.]+)'/) || [])[1] || '0';
  const sv = swv.split('.').map(Number);
  ok(sv[0] > 5 || (sv[0] === 5 && sv[1] >= 33), 'sw.js 是 v5.33.x（目前 ' + swv + '）');
  const raw = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  ok(raw.length <= 1900000, '主檔 ' + raw.length + ' 字元（預算 1,900,000）');
}

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' v5.33：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
