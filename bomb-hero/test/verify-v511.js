// v5.11 驗證（使用者 12 條需求的第二批）：
//   ① 電腦操作＝鍵盤＋滑鼠（左鍵放彈／右鍵引爆／中鍵·Shift 衝刺／空白鍵坐騎招式）
//   ② 每日挑戰獎金（越快越多；當天只補差額、不重複發）
//   ③ 大逃殺地形：長條輸送帶／滑冰區塊／不規則河流／區塊沙地，水與沙會變慢
//   ④ 奪冠大標題（.champ 金色放射光芒＋皇冠＋漸層金字）
//   ⑤ AI 衝刺收斂（有目標且距離遠／逃命才衝，平常走路）
//   ⑥ 大逃殺入口可選外觀、可命名
//   ⑦ 後台點會員（先畫名單資料、失敗寫原因、捲回頂端、舊資料補 id）
// 跑法：node test/verify-v511.js
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

let pass = 0, fail = 0;
function ok(cond, msg, extra) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
function head(s) { console.log('\n' + s); }
// 版本一律用元組比大小（parseFloat('5.10') 會變 5.1 → 比 5.9 小）
function vt(v) { return String(v).split('.').map(function (x) { return parseInt(x, 10) || 0; }); }
function vge(a, b) { const A = vt(a), B = vt(b); for (let i = 0; i < 3; i++) { const x = A[i] || 0, y = B[i] || 0; if (x !== y) return x > y; } return true; }

const SRC = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const CLOUD = fs.readFileSync(path.join(__dirname, '..', '..', 'cloud.js'), 'utf8');
const env = makeEnv();
const B = env.BH, G = env.G;

console.log('\n=== 0. 版本 ===');
ok(vge(B.VERSION, '5.11'), 'VERSION ≥ 5.11（實測 ' + B.VERSION + '）');
ok(new RegExp('<span id="verTxt">' + B.VERSION + '</span>').test(SRC), '#verTxt 同步');
ok(new RegExp('<span id="verLogVer">' + B.VERSION + '</span>').test(SRC), '#verLogVer 同步');
ok(vge(B.VERSION_LOG[0].v, '5.11') && B.VERSION_LOG[0].now === true, 'VERSION_LOG 首位 ≥ 5.11 且 now:true（實測 ' + B.VERSION_LOG[0].v + '）');
ok(B.VERSION_LOG.slice(1).every(function (r) { return r.now !== true; }), '只有最新一筆是 now:true，其餘都已改成 false');
ok(!/const VERSION_LOG[\s\S]{0,7000}?後台[\s\S]{0,200}?\n/.test(SRC), '版本紀錄（給玩家看的）沒有提到後台');

console.log('\n=== 1. 電腦操作：鍵盤＋滑鼠 ===');
const K1 = B.DEF_KEYS1;
ok(K1.up === 'KeyW' && K1.down === 'KeyS' && K1.left === 'KeyA' && K1.right === 'KeyD', 'WASD 移動照舊');
ok(K1.act === 'Mouse0', '放炸彈＝滑鼠左鍵（' + K1.act + '）');
ok(K1.det === 'Mouse2', '引爆＝滑鼠右鍵（' + K1.det + '）');
ok(K1.fire === 'Space', '坐騎招式＝空白鍵（' + K1.fire + '）');
ok((B.settings.keysVer | 0) >= 2, '舊存檔會被一次性遷移（keysVer=' + B.settings.keysVer + '）');
ok(/滑鼠左鍵/.test(B.keyName('Mouse0')), 'keyName 認得滑鼠鍵（' + B.keyName('Mouse0') + '）');
ok(/function keyHeld[\s\S]{0,220}Mouse/.test(SRC), 'keyHeld 會把滑鼠鍵當一般鍵位查');
ok(/dash: function \(\) \{\s*return !!edges\.ShiftLeft[\s\S]{0,90}mouseEdge\(1\)/.test(SRC), '衝刺＝Shift 或滑鼠中鍵');
ok(/function mouseOnStage/.test(SRC) && /addEventListener\('contextmenu'/.test(SRC), '滑鼠只在遊戲區算數，右鍵不彈瀏覽器選單');
ok(/kb1: kbScheme\(function \(\) \{ return settings\.keys1; \}, true\)/.test(SRC), '1P 的鍵盤 scheme 帶滑鼠');

console.log('\n=== 2. 每日挑戰獎金 ===');
const total = B.DAILY_TIME * 1000;
const p0 = B.Daily.prizePlan(0), pMid = B.Daily.prizePlan(total / 2), pEnd = B.Daily.prizePlan(total);
ok(p0.total === 300, '0 秒＝300 金幣（實測 ' + p0.total + '）');
ok(pEnd.total === 80, '用到 3 分鐘＝底薪 80（實測 ' + pEnd.total + '）');
ok(p0.total > pMid.total && pMid.total > pEnd.total, '越快領越多（' + p0.total + ' > ' + pMid.total + ' > ' + pEnd.total + '）');
// 實際發放：當天第一次全額、第二次只補差額
try { localStorage.removeItem(B.Daily.PRIZE_KEY); } catch (e) {}
const g0 = B.Shop.gold();
const day = '2099-01-01';
const a1 = B.Daily.award(day, total);             // 最慢 → 80
const g1 = B.Shop.gold();
const a2 = B.Daily.award(day, total);             // 一模一樣 → 不重複發
const g2 = B.Shop.gold();
const a3 = B.Daily.award(day, 0);                 // 破紀錄 → 補到 300
const g3 = B.Shop.gold();
ok(a1.pay === 80 && g1 - g0 === 80, '第一次過關進帳 80（實際 +' + (g1 - g0) + '）');
ok(a2.pay === 0 && g2 === g1, '同一天重玩不重複發');
ok(a3.pay === 220 && g3 - g2 === 220, '破紀錄只補差額 +220（實際 +' + (g3 - g2) + '）');
ok(/daily\.prize/.test(SRC) && /Daily\.award\(d\.day, d\.ms\)/.test(SRC), 'dailyClear 會結算獎金');
ok(/dprize/.test(SRC) && /daily\.prizeFull/.test(SRC), '結算畫面有獎金卡（含「已滿」說明）');

console.log('\n=== 3. 大逃殺地形：輸送帶／滑冰／河流／沙地 ===');
B.BR.opt.n = 30; B.BR.opt.team = 1; B.BR.opt.dur = 10;
/* 地形是程序化隨機擺的：河不一定夠長、沙不一定有（實測整套跑會抽到 0 塊沙的地圖）。
   抽 12 張挑一張水和沙都齊的來驗 → 驗的是「生成器做得到」，不是「單張運氣」。 */
function scanHz() {
  const o = { convey: 0, ice: 0, water: 0, sand: 0 };
  for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
    const h = G.hazards[y] && G.hazards[y][x];
    if (h && o[h.type] !== undefined) o[h.type]++;
  }
  return o;
}
let info = null, tries = 0, hz = null;
for (; tries < 12; tries++) {
  info = B.buildBRMap();
  hz = scanHz();
  if (hz.water >= 20 && hz.sand > 0) break;
}
hz = scanHz(); // 以最後這張為準，跟 G 對得上
const wallOnSlow = [];
for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) {
  const h = G.hazards[y] && G.hazards[y][x];
  if (h && (h.type === 'water' || h.type === 'sand') && G.grid[y][x] !== 0) wallOnSlow.push(x + ',' + y);
}
ok(info.hz && info.hz.belt > 0, '有長條輸送帶（' + (info.hz && info.hz.belt) + ' 條）');
ok(info.hz && info.hz.ice > 0, '有滑冰區塊（' + (info.hz && info.hz.ice) + ' 塊）');
ok(info.hz && info.hz.water > 0, '有河流（' + (info.hz && info.hz.water) + ' 條）');
ok(info.hz && info.hz.sand > 0, '有沙地（' + (info.hz && info.hz.sand) + ' 塊，抽 ' + (tries + 1) + ' 張）');
ok(hz.water >= 20, '河流總格數 ' + hz.water + '（≥20，不是零星水坑）');
ok(wallOnSlow.length === 0, '水／沙只鋪在可以走的格子（沒有壓在岩層上）');
// 出生點不能被機關蓋住
let spawnHit = 0;
(info.spawns || []).forEach(function (s) { if (G.hazards[s.y] && G.hazards[s.y][s.x]) spawnHit++; });
ok(spawnHit === 0, '出生點上沒有機關（' + spawnHit + '）');

// 水／沙會變慢
function fakePAt(type) {
  for (let y = 1; y < G.rows - 1; y++) for (let x = 1; x < G.cols - 1; x++) {
    const h = G.hazards[y][x];
    if (h && h.type === type && G.grid[y][x] === 0) return { x: x * G.T + G.T / 2, y: y * G.T + G.T / 2 };
  }
  return null;
}
const pw = fakePAt('water'), ps = fakePAt('sand');
ok(!!pw && B.beltMulFor(pw, 1, 0) < 1, '踩在水裡速度變慢（' + (pw ? B.beltMulFor(pw, 1, 0) : '—') + '）');
ok(!!ps && B.beltMulFor(ps, 1, 0) < 1, '踩在沙上速度變慢（' + (ps ? B.beltMulFor(ps, 1, 0) : '—') + '）');
ok(!!pw && B.beltMulFor(pw, 1, 0) < (ps ? B.beltMulFor(ps, 1, 0) : 1), '水比沙更慢（涉水 > 陷沙）');
ok(B.beltMulFor({ x: 1, y: 1 }, 1, 0) === 1, '一般地板不受影響');
ok(/paintHazardCell[\s\S]{0,400}hz\.type === 'water'/.test(SRC) && /hz\.type === 'sand'/.test(SRC), '兩種新地面都有專屬畫法');
ok(/WATER_MUL|SLOW_GROUND/.test(SRC), '減速倍率寫在常數裡（不是散在四處的魔術數字）');

console.log('\n=== 4. 奪冠大標題 ===');
ok(/\.champ \{/.test(SRC) && /\.champ \.ray/.test(SRC) && /\.champ \.crown/.test(SRC), '有 .champ / .ray / .crown 三段視覺');
ok(/repeating-conic-gradient/.test(SRC) && /champSpin/.test(SRC), '背後是會旋轉的放射光芒');
ok(/background-clip: text/.test(SRC) && /-webkit-text-fill-color: transparent/.test(SRC), '標題用金色漸層字（不是單色大標）');
ok(/@keyframes champPop/.test(SRC) && /@keyframes sparkTwinkle/.test(SRC), '進場彈跳＋閃光動畫');
ok(/'champ grand'/.test(SRC) && /Game\.mode === 'battle' \|\| Game\.mode === 'br'/.test(SRC), '對戰／大逃殺奪冠才用大版（單人過關用小版）');
ok(/prefers-reduced-motion/.test(SRC), '有用戶偏好「減少動畫」的處理');
ok(!/\.title-logo[^{]*\{[^}]*conic-gradient/.test(SRC), '首頁 LOGO 仍然沒有那圈光暈（v2.7 的規則沒被破壞）');

console.log('\n=== 5. AI 衝刺時機 ===');
ok(/const DASH_TRAVEL_CELLS = 3\.2/.test(SRC), '趕路衝刺門檻＝3.2 格');
ok(/\(p\.aiTgtD \|\| 0\) >= DASH_TRAVEL_CELLS/.test(SRC), 'aiTryDash 會檢查「目標還遠不遠」');
ok(/p\.aiDashGap = 2\.2 \+ Math\.random\(\) \* 2\.2/.test(SRC), '兩次趕路衝刺之間留 2.2~4.4 秒');
ok(/if \(p\.aiDashGap > 0\) p\.aiDashGap -= dt/.test(SRC), 'controlAI 會遞減間隔計時');
ok(/p\.aiTgtD = tgt \?/.test(SRC) && /p\.aiTgtD = 99/.test(SRC), '沒有目標＝99（純巡邏不衝）');
ok(!/Math\.random\(\) < \(lv\.dash == null \? \.16 : lv\.dash\)/.test(SRC), '舊的「冷卻好就 16% 亂衝」已經移除');
// 行為：目標很近時不管怎麼重試都不衝
(function () {
  B.buildOrganicMap(15, 13, B.THEMES[0], { shape: 'island' }, B.rngFrom(7), { seed: 7 });
  B.markWallKinds();
  let spot = null;
  for (let y = 1; y < G.rows - 1 && !spot; y++) for (let x = 1; x < G.cols - 2 && !spot; x++) {
    if (B.cellAt(x, y) === 0 && B.cellAt(x + 1, y) === 0 && B.cellAt(x + 2, y) === 0) spot = { x: x, y: y };
  }
  const lvl = B.AI_LEVELS.normal;
  const mk = function (tgtD) {
    const p = { alive: true, carry: null, air: 0, dashT: 0, dashCd: 0, aiDashGap: 0, facing: 'right',
      aiDir: 'right', aiTgtD: tgtD, x: spot.x * G.T + G.T / 2, y: spot.y * G.T + G.T / 2, maxBombs: 1 };
    return p;
  };
  let nearDash = 0, farDash = 0;
  for (let i = 0; i < 60; i++) {
    const a = mk(1);            // 目標就在旁邊 → 走路就好
    if (B.aiTryDash(a, lvl, spot.x, spot.y)) nearDash++;
    const b = mk(9);            // 目標很遠 → 允許偶爾衝
    if (B.aiTryDash(b, lvl, spot.x, spot.y)) farDash++;
  }
  ok(nearDash === 0, '目標在 1 格內 → 60 次都不衝（實測 ' + nearDash + '）');
  ok(farDash > 0, '目標在 9 格外 → 會衝（實測 ' + farDash + '/60）');
})();

console.log('\n=== 6. 大逃殺選角與命名 ===');
ok(/brChar: 0, brName: ''/.test(SRC), 'settings 有大逃殺專屬欄位');
ok(/data-chd="-1"/.test(SRC) && /data-chd="1"/.test(SRC), '入口卡有左右切換箭頭');
ok(/id="brName"/.test(SRC) && /maxlength="8"/.test(SRC), '入口卡可以命名（最多 8 字）');
ok(/settings\.brChar = \(brc >= 0 && brc < 8\) \? brc : 0/.test(SRC), 'brChar 會被正規化（壞值回 0）');
ok(/makePlayer\(i, isMe \? \(settings\.brChar \| 0\)/.test(SRC), 'startBR 用玩家挑的角色');
ok(/settings\.brName \|\| ''\)\.trim\(\) \|\| settings\.playerName/.test(SRC), 'startBR 用玩家取的名字（沒取才退回暱稱）');
ok(/Screen\.current !== 'title'/.test(SRC), '首頁開的預覽也會播動畫（否則角色圖是空白）');
ok(/CharPreview\.mount\(ov\)/.test(SRC), '入口卡有角色預覽');

console.log('\n=== 7. 後台點會員 ===');
ok(/function clickRow\(row, toMembers\)/.test(SRC), '名單／最近活動共用一個點擊入口');
ok(/renderDetail\(seed, \{ loading: true \}\)/.test(SRC), '點下去先用名單資料畫一版（不會空白）');
ok(/renderDetail\(seed, \{ error: \(r && r\.err\) \|\| 'NET' \}\)/.test(SRC), '抓不到完整資料也把原因寫進面板');
ok(/box\.scrollTop = 0/.test(SRC), '每次重畫都捲回頂端（詳情欄保留舊捲軸會看起來像沒反應）');
ok(/缺少 id/.test(SRC), 'data-id 是空的時候講清楚，不是送出 ?id=undefined');
ok(/function fixAccountIds/.test(CLOUD) && /fixAccountIds\(\);/.test(CLOUD), '後端載入時補回舊帳號缺漏的 id');
ok(/String\(a\.id \|\| ''\) === q/.test(CLOUD), '/api/admin/player 會再掃一遍 a.id 才回 404');

console.log('\n' + (fail ? '✗ ' + fail + ' 項失敗' : '✅ 全部通過') + ' / ' + pass + ' 項通過');
process.exit(fail ? 1 : 0);
