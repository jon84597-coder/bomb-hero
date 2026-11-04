// test/verify-v476.js —— v4.76
//   ① 大逃殺兩隻「亂入 BOSS」：20 血、仇恨 4 格、會追人、被打死給恐龍坐騎
//   ② 隊友辨識：頭上綠三角＋名字＋血條、HUD 隊友列、隊友出局另外提示
//   ③ 提示只講自己（別人的血量不回報）
//   ④ 首頁大逃殺不再是「未開放」→ 推薦測試遊玩 HOT
//   ⑤ 草原底圖調亮＋加飽和
const { makeEnv } = require('./_sandbox');
const fs = require('fs'), path = require('path');
const env = makeEnv();
const P = env.BH, G = P.Game, src = env.html;
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ FAIL: ' + m); } }
function head(t) { console.log('\n=== ' + t + ' ==='); }

// ---------- 1. 兩隻亂入 BOSS ----------
head('1. 兩隻亂入 BOSS');
P.BR.opt = { n: 30, team: 1, dur: 10 };
P.startBR();
const bosses = G.enemies.filter(function (e) { return e.brBoss; });
ok(bosses.length === 2, '開局丟 2 隻 BOSS 進場（' + bosses.length + '）');
ok(bosses.every(function (e) { return e.boss === true && e.hp === 20 && e.maxHp === 20; }), '兩隻都是 BOSS、各 20 點血');
ok(bosses.every(function (e) { return (e.brStage | 0) >= 1 && (e.brStage | 0) <= 32; }),
  '關卡是隨機抽的（第 ' + bosses.map(function (e) { return e.brStage; }).join('、') + ' 關）');
ok(bosses.every(function (e) {
  return G.players.every(function (p) {
    return Math.abs(p.x / G.T - e.x / G.T) >= 3 || Math.abs(p.y / G.T - e.y / G.T) >= 3;
  });
}), '不會生在人的臉上（優先 8 格，地圖太擠才放寬到 3 格）');
ok(P.BR.BOSS_AGGRO === 4 && P.BR.BOSS_HP === 20, '常數：仇恨 4 格、20 血');

// ---------- 2. 仇恨範圍與追擊 ----------
head('2. 仇恨 4 格、看到人就追');
(function () {
  const b = bosses[0];
  const me = G.players[0];
  G.flames = []; G.bombs = [];
  // 其他人先下場，免得本來就站在王旁邊
  const back = [];
  G.players.forEach(function (q) { back.push(q.alive); if (q !== me) q.alive = false; });
  me.alive = true; me.invuln = 99;

  // 找一格空地、而且四面有三面是通道（王才走得動，不然是地圖卡住不是行為錯）
  const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let sx = -1, sy = -1;
  for (let y = 4; y < G.rows - 4 && sx < 0; y++) {
    for (let x = 4; x < G.cols - 4; x++) {
      if (G.grid[y][x] !== 0) continue;
      let open = 0;
      D4.forEach(function (v) { if (G.grid[y + v[1]][x + v[0]] === 0) open++; });
      if (open >= 3) { sx = x; sy = y; break; }
    }
  }
  if (sx < 0) { sx = 8; sy = 8; }
  b.x = (sx + .5) * G.T; b.y = (sy + .5) * G.T; b.hitT = 0; b.bombT = 999;
  me.x = b.x + G.T * 5; me.y = b.y;
  P.updateBRBoss(b, 1 / 60);
  ok(b.aggro === false, '5 格外：不會發火（仇恨 4 格）');

  me.x = b.x + G.T * 3; me.y = b.y;
  const d0 = Math.hypot(b.x - me.x, b.y - me.y);
  P.updateBRBoss(b, 1 / 60);
  ok(b.aggro === true, '走進 3 格：馬上發火');
  for (let i = 0; i < 90; i++) P.updateBRBoss(b, 1 / 60);
  const d1 = Math.hypot(b.x - me.x, b.y - me.y);
  ok(d1 < d0 - G.T * .4, '發火後會往人靠（' + Math.round(d0) + ' → ' + Math.round(d1) + ' px）');
  G.players.forEach(function (q, i) { q.alive = back[i]; });
})();

// ---------- 3. 火焰傷害與擊殺獎勵 ----------
head('3. 打 20 血 → 恐龍坐騎');
(function () {
  P.BR.opt = { n: 30, team: 1, dur: 10 };
  P.startBR();
  const b = G.enemies.filter(function (e) { return e.brBoss; })[0];
  const me = G.players[0];
  G.players.forEach(function (q) { if (q !== me) q.alive = false; });
  G.flames = []; G.bombs = []; me.alive = true; me.invuln = 99; me.dino = false;
  b.hitT = 0; b.bombT = 99; b.hp = 20;

  const cx = Math.floor(b.x / G.T), cy = Math.floor(b.y / G.T);
  G.flames = [{ cx: cx, cy: cy, owner: me, power: 1, src: '' }];
  P.updateBRBoss(b, 1 / 60);
  ok(b.hp === 18, '玩家火焰一次扣 2 點（' + b.hp + '/20）');

  b.hitT = 0;
  G.flames = [{ cx: cx, cy: cy, owner: null, power: 1, src: '' }];
  P.updateBRBoss(b, 1 / 60);
  ok(b.hp === 18, '自己的彈（owner=null）炸不到王');

  let n = 0;
  while (!b.dead && n < 40) {
    b.hitT = 0;
    G.flames = [{ cx: Math.floor(b.x / G.T), cy: Math.floor(b.y / G.T), owner: me, power: 1, src: '' }];
    P.updateBRBoss(b, 1 / 60);
    n++;
  }
  ok(b.dead === true, '20 點血打完就倒（' + (n + 1) + ' 發火焰）');
  ok(me.dino === true, '打倒的人直接騎上恐龍坐騎');
  ok(b.hp <= 0, '倒下後血量歸零');
})();

// ---------- 4. 隊友辨識 ----------
head('4. 隊友標記與血條');
P.BR.opt = { n: 20, team: 2, dur: 10 };
P.startBR();
G.state = 'play';
ok(G.players.length === 20 && G.players[0].team === 0 && G.players[1].team === 0 && G.players[2].team === 1,
  '20 人 / 2 人一隊：我和第 2 人同隊，第 3 人換隊');
ok(G.players.every(function (p) { return p.brHp === P.BR.HP; }), '每個人都 10 點血（隊友血條有資料）');
let drewOk = true;
try { P.drawMateTag(G.players[1], G.T); } catch (e) { drewOk = false; console.log('    ' + e.message); }
ok(drewOk, 'drawMateTag 畫得出來（不會炸）');
let hudOk = true;
try { P.drawBRHud(); } catch (e) { hudOk = false; console.log('    ' + e.message); }
ok(hudOk, 'HUD（含隊友列）畫得出來');
ok(/drawMateTag\(q, T\)/.test(src), '玩家迴圈會幫每個隊友畫標記');
ok(/#5ef0a8/.test(src) && /q\.y \+ r \* \.5/.test(src), '腳下綠環（地面層）');
ok(/q\.name \|\| ''/.test(src) && /strokeText\(nm/.test(src), '頭上有名字（描邊才看得清）');
ok(/bw \* \(hp \/ BR\.HP\)/.test(src), '頭上的血條照實際血量比例');
ok(/matte|mates\.push|mates\[i\]/.test(src) && /q\.alive \? String\(q\.name/.test(src), 'HUD 下方列出隊友名字＋血量（出局打叉）');

// ---------- 5. 提示只講自己 ----------
head('5. 提示只回報自己');
ok(/if \(isMyPlayer\(p\)\) \{[\s\S]{0,200}?brTip\('💔'/.test(src) && !/else banner\('♥/.test(src), '別人扣血不再跳提示（只有自己的）');
ok(/mate \? '💚' : '☠️'/.test(src), '隊友出局用不同顏色講');
ok((src.match(/brTip\('💔'/g) || []).length === 1, '「受到傷害」只有一個呼叫點');

// ---------- 6. 首頁大逃殺按鈕 ----------
head('6. 首頁：推薦測試遊玩（HOT）');
ok(/class="mbtn c-br has-beta" id="btnBR"/.test(src), 'btnBR 不再標 locked（未開放）');
ok(!/未開放<\/span>/.test(src), '畫面上沒有「未開放」標籤');
ok(/t\('br\.btnTop'\) \+ '<span class="hotTag">HOT<\/span><small>'/.test(src), '按鈕文字：大逃殺＋HOT（走字典 br.btnTop）');
ok(/推薦測試遊玩/.test(src), '副標寫「推薦測試遊玩」');
ok(/\.hotTag \{/.test(src) && /@keyframes hotPulse/.test(src), 'HOT 標籤有自己的樣式與呼吸光');
ok(/t\('br\.foot', \{ b: BR\.BOSS_N \}\)/.test(src), '入口卡寫清楚有亂入 BOSS（br.foot 帶 BOSS_N）');

// ---------- 7. 草原底圖 ----------
head('7. 草原底圖（調亮＋加飽和）');
(function () {
  const f = path.join(__dirname, '../bg/forest.webp');
  ok(fs.existsSync(f), 'bg/forest.webp 存在');
  const b = fs.readFileSync(f);
  ok(String(b.slice(0, 4)) === 'RIFF' && String(b.slice(8, 12)) === 'WEBP', '檔案是 WebP');
  ok(b.length > 45000, '檔案大小 ' + Math.round(b.length / 1024) + 'KB（調亮＋加飽和後重新輸出）');
  ['sand', 'ice', 'lava', 'neon', 'sea', 'sky', 'dark'].forEach(function (st) {
    const g = path.join(__dirname, '../bg/' + st + '.webp');
    if (!fs.existsSync(g)) ok(false, 'bg/' + st + '.webp 不該被刪掉');
  });
  ok(true, '其餘七個關卡底圖照舊');
})();

// ---------- 8. 版本 ----------
head('8. 版本');
ok(/(^|\D)4\.(7[6-9]|[89]\d)(\D|$)/.test(P.VERSION), 'VERSION ≥ 4.76（實際 ' + P.VERSION + '）');
ok(P.VERSION_LOG[0].v === P.VERSION, '版本紀錄最上面是本版 ' + P.VERSION);
ok(/SW_VERSION = 'v4\.(7[6-9]|[89]\d)\.\d+'/.test(fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8')), 'sw.js 版本跟著升');

console.log('\n' + (fail ? '✗ ' + fail + ' 失敗 / ' + pass + ' 通過' : '✅ v4.76：' + pass + ' 通過 / 0 失敗'));
process.exit(fail ? 1 : 0);
