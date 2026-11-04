// v4.70 驗證：
//   ① 小地圖（雷達）：只在大地圖出現、可關閉、怪物只畫附近 7 格、不超出畫面
//   ② 組隊隊色 HUD：每隊存活/總數、混戰不畫
//   ③ RPG 每一章最後一關出魔王（4/8/12…32），第 32 關仍是最終魔王
//   ④ 大逃殺門票：每天免費 1 張（同日不重複）
//   ⑤ 隨機地圖種子碼
//   node test/verify-v470.js
const { makeEnv } = require('./_sandbox');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const env = makeEnv();
const P = env.BH, G = P.Game;
const S = [], F = [];
function ok(cond, msg, extra) {
  (cond ? S : F).push(msg);
  console.log((cond ? '  ok  ' : '  FAIL') + ' ' + msg + (extra !== undefined ? '  ' + JSON.stringify(extra) : ''));
}
function head(t) { console.log('\n' + t); }
const vm = src.match(/const VERSION = '([\d.]+)';/);
function calls(name) { return env.rec.calls.filter(function (c) { return c[0] === name; }); }

// ================================================================
head('1. 源碼檢查');
{
  ok(vm && parseFloat(vm[1]) >= 4.70, 'VERSION >= 4.70（目前 ' + (vm && vm[1]) + '）');
  ok(/miniMap: 1,/.test(src), 'settings 有 miniMap 預設開');
  ok(/id="segMiniMap"/.test(src) && /segWire\('segMiniMap'/.test(src), '設定頁有小地圖開關');
  ok(/function drawMiniMap\(\)/.test(src) && /function drawTeamHud\(\)/.test(src), '有小地圖與隊色 HUD 的繪製函式');
  ok(/drawMiniMap\(\); \} catch \(e\) \{\}/.test(src), 'render 每幀會畫小地圖');
  ok(/drawTeamHud\(\); \} catch \(e\) \{\}/.test(src), 'render 每幀會畫隊色 HUD');
  ok(/const MM_FOE_R = 7;/.test(src), '小地圖怪物只顯示附近 7 格（不是全圖開圖）');
  ok(/if \(Game\.mode !== 'battle'\) return;/.test(src), '隊色 HUD 只在對戰類模式出現');
  ok(/function seedCode\(\)/.test(src) && /function seedTag\(\)/.test(src), '有地圖種子碼函式');
  ok(/t\('solo\.ovTime'[\s\S]{0,160}seedTag\(\)/.test(src), '出發前的關卡說明會帶種子碼');
}

// ================================================================
head('2. 小地圖');
{
  // 經典 15×13：整個畫面都看得到 → 不畫
  P.settings.mapMode = 'classic';
  P.settings.miniMap = 1;
  P.startRpg(3);
  G.state = 'play';
  ok(G.cols === 15 && G.rows === 13, '經典 RPG 關是 15×13', { cols: G.cols, rows: G.rows });
  ok(P.miniMapOn() === false, '經典小地圖不畫（擋視線）');

  // 隨機 23×21 → 要畫
  P.settings.mapMode = 'random';
  P.startRpg(3);
  G.state = 'play';
  ok(G.cols >= 18 && P.miniMapOn() === true, '隨機大地圖會畫小地圖', { cols: G.cols, rows: G.rows });

  // 關掉設定
  P.settings.miniMap = 0;
  ok(P.miniMapOn() === false, '設定關掉就不畫');
  P.settings.miniMap = 1;

  // state 不是 play／countdown 時不畫
  G.state = 'idle';
  ok(P.miniMapOn() === false, '非遊戲中不畫');
  G.state = 'play';

  // 方框必須在畫面內
  const b = P.miniMapBox();
  ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= 720 && b.y + b.h <= 540,
    '小地圖方框在畫面內', b);
  ok(b.w >= 56 && b.h >= 42 && Math.abs(b.w / b.h - G.cols / G.rows) < .08,
    '小地圖比例跟地圖一致', { w: b.w, h: b.h, ratio: +(b.w / b.h).toFixed(3) });

  // 實際畫一次：底圖（drawImage）＋視野框（strokeRect）
  env.rec.calls.length = 0;
  let err = null;
  try { P.drawMiniMap(); } catch (e) { err = e; }
  ok(!err, 'drawMiniMap 不拋錯', err && err.message);
  ok(calls('drawImage').length === 1, '底圖用離屏快取（每幀只貼一次）', calls('drawImage').length);
  ok(calls('strokeRect').length >= 1, '有畫目前視野框');

  // 怪物只畫附近 7 格
  const T = G.T;
  const me = G.players[0];
  G.items = [];
  G.enemies = [];
  G.players = [me];
  env.rec.calls.length = 0; P.drawMiniMap();
  const base = calls('arc').length;
  G.enemies = [{ x: me.x + T * 20, y: me.y, r: 10, dead: false, type: 'slime' }];   // 20 格外
  env.rec.calls.length = 0; P.drawMiniMap();
  ok(calls('arc').length === base, '20 格外的怪不會出現在小地圖', { base: base, now: calls('arc').length });
  G.enemies.push({ x: me.x + T * 2, y: me.y, r: 10, dead: false, type: 'slime' });  // 2 格外
  env.rec.calls.length = 0; P.drawMiniMap();
  ok(calls('arc').length === base + 1, '2 格外的怪會出現在小地圖', { now: calls('arc').length });
  G.enemies = [];
}

// ================================================================
head('3. 組隊隊色 HUD');
{
  G.mode = 'battle';
  G.teamsOn = 2;
  G.state = 'play';
  G.players = [
    { team: 0, alive: true, x: 100, y: 100 },
    { team: 0, alive: true, x: 120, y: 120 },
    { team: 1, alive: true, x: 200, y: 200 },
    { team: 1, alive: false, x: 0, y: 0 }
  ];
  env.rec.calls.length = 0;
  let e2 = null;
  try { P.drawTeamHud(); } catch (e) { e2 = e; }
  ok(!e2, 'drawTeamHud 不拋錯', e2 && e2.message);
  const labels = calls('fillText').map(function (c) { return c[1]; });
  ok(labels.length === 2, '兩隊各一個標籤', labels);
  ok(labels.indexOf('2/2') >= 0 && labels.indexOf('1/2') >= 0, '標籤是存活/總數', labels);

  // 混戰（0 隊）不畫
  G.teamsOn = 0;
  env.rec.calls.length = 0; P.drawTeamHud();
  ok(calls('fillText').length === 0, '混戰不畫隊色 HUD');

  // 只有一隊有人時也不畫（沒有「對抗」可言）
  G.teamsOn = 2;
  G.players = [{ team: 0, alive: true, x: 100, y: 100 }];
  env.rec.calls.length = 0; P.drawTeamHud();
  ok(calls('fillText').length === 0, '只有一隊時不畫');
}

// ================================================================
head('4. RPG 每一章最後一關出魔王');
{
  function bosses(st) {
    P.settings.mapMode = 'classic';
    P.startRpg(st);
    return G.enemies.filter(function (e) { return e.boss; });
  }
  const b3 = bosses(3);
  ok(b3.length === 0, '第 3 關（章節中段）沒有魔王');
  const b4 = bosses(4);
  ok(b4.length === 1, '第 4 關（第 1 章最後）有魔王');
  ok(b4[0] && b4[0].hp === 5 && b4[0].chapterBoss === true && Math.abs(b4[0].sizeMul - 1.12) < 1e-6,
    '章節魔王：血量 4+1=5、體型 1.12、標記 chapterBoss', b4[0] && { hp: b4[0].hp, sm: b4[0].sizeMul });
  const b8 = bosses(8);
  ok(b8.length === 1 && b8[0].hp === 6, '第 8 關魔王血量 4+2=6', b8[0] && b8[0].hp);
  const b12 = bosses(12);
  ok(b12.length === 1 && b12[0].hp === 7, '第 12 關魔王血量 4+3=7', b12[0] && b12[0].hp);
  const b32 = bosses(32);
  ok(b32.length === 1 && b32[0].hp === 23 && b32[0].def === 1 && b32[0].sizeMul === 1.34 && !b32[0].chapterBoss,
    '第 32 關仍是最終魔王（血量 23、def 1、體型 1.34）', b32[0] && { hp: b32[0].hp, def: b32[0].def });
  // 魔王站的一定是空地（不能硬挖出死格）
  ok(b4[0] && G.grid[Math.floor(b4[0].y / G.T)][Math.floor(b4[0].x / G.T)] === 0, '魔王站在現成空地上');
}

// ================================================================
head('5. 大逃殺門票：每天免費 1 張');
{
  const Shop = P.Shop;
  ok(!!Shop && typeof Shop.claimDaily === 'function', 'Shop 有 claimDaily');
  const today = Shop.todayKey();
  ok(/^\d{4}-\d{2}-\d{2}$/.test(today), '今日日期字串格式正確', today);
  ok(env.storage['bombhero-br-free'] === today, '載入時就登記今天已領', env.storage['bombhero-br-free']);
  const t0 = Shop.tickets();
  ok(t0 >= 1, '第一次載入就拿到 1 張', t0);
  Shop.claimDaily();
  ok(Shop.tickets() === t0, '同一天不會重複送', Shop.tickets());
  env.storage['bombhero-br-free'] = '2000-01-01';
  Shop.claimDaily();
  ok(Shop.tickets() === t0 + 1, '換一天會再送 1 張', Shop.tickets());
  ok(Shop.ticketPrice() === 2000, '額外購買仍是 2000 金幣');
}

// ================================================================
head('6. 隨機地圖種子碼');
{
  P.settings.mapMode = 'random';
  P.startRpg(5);
  const code = P.seedCode();
  ok(/^[0-9A-Z]{5}$/.test(code), '種子碼固定 5 碼英數', code);
  const tag = P.seedTag();
  ok(tag.indexOf('🔑') >= 0 && tag.indexOf(code) >= 0, '種子標籤帶鑰匙與代碼', tag);
  // 同一關重進沿用同一個種子
  const first = code;
  P.startRpg(5);
  ok(P.seedCode() === first, '同一關重進沿用同一個種子', { first: first, again: P.seedCode() });
  // 換關換種子
  P.startRpg(6);
  ok(P.seedCode() !== first, '換關就換一張圖', { first: first, next: P.seedCode() });
  // 經典模式不顯示
  P.settings.mapMode = 'classic';
  P.startRpg(5);
  ok(P.seedTag() === '', '經典地圖不顯示種子');
}

console.log('\n結果：' + S.length + ' 通過 / ' + F.length + ' 失敗');
if (F.length) {
  F.forEach(function (m) { console.log('  ✗ ' + m); });
  process.exit(1);
}
