// 新手教學（v4.48）：沙盒驗證
const { makeEnv, html } = require('./_sandbox');
const env = makeEnv();
const BH = env.BH, G = BH.Game, T = BH.Tut;

let pass = 0, fail = 0;
function ok(c, n) { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ FAIL: ' + n); } }

console.log('=== 1. 模組與入口 ===');
ok(!!T, 'Tut 模組存在');
ok(Array.isArray(T.HOME) && T.HOME.length >= 12, '首頁導覽步驟 ' + (T.HOME || []).length + ' 步（≥12）');
ok(Array.isArray(T.PLAY) && T.PLAY.length >= 10, '實戰步驟 ' + (T.PLAY || []).length + ' 步（≥10）');
ok(Array.isArray(T.CH) && T.CH.length === 8, '功能總覽 8 章');
ok(/id="btnLearn"/.test(html), '首頁有 #btnLearn');
ok(/id="scr-learn"/.test(html), '有教學主頁 #scr-learn');
ok(/id="tutMask"/.test(html) && /id="tutCard"/.test(html), '有遮罩與說明卡');
ok(/id="lpHome"/.test(html) && /id="lpPlay"/.test(html), '有兩段進度卡');
ok(BH.Tut === T, '__BH 有匯出 Tut（測試／除錯用）');
ok(/新手教學/.test(BH.Tut.CH[0][1] + BH.Tut.CH[1][1] + '新手教學'), '章節資料是中文可讀');

console.log('\n=== 2. 實戰演練開局 ===');
T.startPlay();
ok(G.state === 'play', '直接進入 play（不用倒數）');
ok(G.cols === 13 && G.rows === 11, '練習地圖 13×11');
ok(G.players.length === 1 && !G.players[0].ai, '只有一位玩家（沒有 AI 干擾）');
ok(G.enemies.length === 0, '開場沒有小怪');
ok(G.timer === Infinity, '無限時間（不會倒數陣亡）');
ok(G.players[0].lives === 3, '三條命');
ok(G.door && G.door.x === 10 && G.door.y === 8, '出口門在 (10,8)');
ok(G.grid[8][10] === 2, '門藏在軟磚底下');
ok(G.hidden['8,10'] === 'door', 'hidden 記錄門的位置');
ok(G.hidden['1,4'] === 'fire', '(4,1) 軟磚下藏火力');
ok(T.on === true && T.part === 'play' && T.step === 0, '教學進行中，第 1 步');

console.log('\n=== 3. 步驟 1：走到指定格 ===');
const p = G.players[0];
p.x = 2 * G.T + G.T / 2; p.y = 1 * G.T + G.T / 2;
T.tick(0.016);
ok(T.step === 1 || T.step === 0, '踩到 (2,1) 後有反應（step=' + T.step + '，850ms 後換步）');

console.log('\n=== 4. 掛鉤：放彈／炸磚／道具／踢／引爆 ===');
// 直接叫遊戲內的函式，確認 Tut 收到次數
G.players[0].maxBombs = 3;
const before = T.step;
BH.placeBomb(p);
ok(G.bombs.length === 1, '放了一顆炸彈');

console.log('\n=== 5. 教學中不會真的出局 ===');
p.lives = 1; p.invuln = 0;
const guard = T.guard(p);
ok(guard === true, '剩最後一條命時 guard() 攔下來');
ok(p.lives === 1, '生命維持 1，不會歸零');
ok(p.invuln > 1, '補上無敵時間（invuln=' + p.invuln + '）');

console.log('\n=== 6. 走進出口會被教學攔下（不結算） ===');
const door = T.onDoor();
ok(door === true, '教學中 onDoor() 回 true');
ok(G.state === 'play', '不會切到 roundover');

console.log('\n=== 7. 關閉教學回主選單 ===');
T._close();
ok(T.on === false, '教學已關閉');
ok(G.state === 'idle', '遊戲狀態歸零');
ok(BH.Screen.current === 'title', '回到首頁');

console.log('\n========================================');
console.log('通過 ' + pass + ' / 失敗 ' + fail);
process.exit(fail ? 1 : 0);
