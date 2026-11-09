// test/verify-v556.js —— v5.56：七項留存改造
//   ① 外觀收藏（裝飾品只能靠行為解鎖，不能用金幣買）
//   ② 模式遞進解鎖（首日只開單機；老玩家不被鎖）
//   ③ 賽季重排 40 關（同一季穩定、換季才變、難度跨度 ≤3 章）
//   A 幽靈對手（榜上前三名的殘影）
//   B 每日挑戰成績卡
//   C 稱號／配戴成就被看見
//   D 克制版今日提醒
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SB = require('./_sandbox');

const mainSrc = fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8');
const cloudSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'cloud.js'), 'utf8');
const htmlSrc = typeof SB.rawHtml === 'function' ? SB.rawHtml() : SB.rawHtml;
const skinsSrc = fs.readFileSync(path.join(ROOT, 'js/skins.js'), 'utf8');
const unlockSrc = fs.readFileSync(path.join(ROOT, 'js/unlock.js'), 'utf8');
const shareSrc = fs.readFileSync(path.join(ROOT, 'js/sharecard.js'), 'utf8');
const notifySrc = fs.readFileSync(path.join(ROOT, 'js/notify.js'), 'utf8');

let pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  ✗ FAIL: ' + m); } }
function sec(n) { console.log('\n=== ' + n + ' ==='); }

/* ============================================================
   ① 外觀收藏
   ============================================================ */
sec('① 外觀收藏');
ok(/bombhero-skins-v1/.test(skinsSrc), '有獨立的存檔 key');
ok(/how: \{ kind: 'free' \}/.test(skinsSrc), '有「一開始就有」的預設外觀');
ok(skinsSrc.indexOf('hex:') > 0 && skinsSrc.indexOf("pal:") > 0, '爆風（色停）與單色外觀都有定義');
/* 關鍵設計：外觀不能用金幣買 —— 定義裡不該出現任何價格欄位 */
ok(!/(^|[\s,{])price\s*:/.test(skinsSrc) && !/(^|[\s,{])cost\s*:/.test(skinsSrc),
  '沒有任何金幣定價欄位（只能靠行為解鎖）');
ok(/kind: 'stage'/.test(skinsSrc), '有「通關 N 關」型解鎖');
ok(/kind: 'ach'/.test(skinsSrc), '有「成就分」型解鎖');
ok(/kind: 'season'/.test(skinsSrc), '有「賽季層級」型解鎖');
ok(/kind: 'boss'/.test(skinsSrc), '有「BOSS 決戰」型解鎖');
ok(/kind: 'br'/.test(skinsSrc), '有「大逃殺奪冠」型解鎖');
ok(/statNum\('soloBoss'\)/.test(skinsSrc), 'BOSS 次數取的是 soloBoss（不是不存在的鍵）');
ok(/window\.__BHSKIN/.test(skinsSrc), '有把快取掛到 window.__BHSKIN');
ok(/bombStops/.test(skinsSrc) && /mix\(BOMB_BASE/.test(skinsSrc), '炸彈外殼在模組內先混色好（主檔不做混色）');

/* 主檔端：熱路徑只讀快取，且一律有回退原色 */
ok(/function skinCache\(\)/.test(mainSrc), '主檔有 skinCache()');
ok(/function skinFlamePal\(\)/.test(mainSrc) && /function skinAuraHex\(\)/.test(mainSrc), '有火焰與光環的讀取函式');
/* v5.69：外觀只給「自己的」彈與火 —— 原本的橙火抽成 FIRE_PAL_DEF，
   AI／怪物／隊友一律吃預設或專屬配色，skinBombStops 也多一個 mine 參數。 */
ok(/const FIRE_PAL_DEF = \[ 'rgba\(255,255,255,A\)'/.test(mainSrc) && /skinPal \|\| FIRE_PAL_DEF/.test(mainSrc),
  '火焰取不到外觀時回退原本的橙色');
ok(/const bs = \(mine !== false\) \? skinBombStops\(\) : null;/.test(mainSrc), '炸彈球體使用外觀色停（只有自己的彈）');
ok(/ctx\.globalCompositeOperation = 'lighter'/.test(mainSrc) && /auraHex/.test(mainSrc), '光環用 lighter 疊色（不會變成灰圈）');

/* 行為：模組真的能載入並算出快取 */
(function () {
  const env = SB.makeEnv();
  const P = env.BH;
  /* 主檔端的讀取函式在沒有 __BHSKIN 時必須一律回 null / 空字串 */
  ok(typeof P.Ghost === 'object', '沙盒可以載入主檔（新模組缺席時主檔照常）');
})();

/* ============================================================
   ② 模式遞進解鎖
   ============================================================ */
sec('② 模式遞進解鎖');
ok(/bombhero-unlock-v1/.test(unlockSrc), '有獨立存檔 key');
ok(/need: 3/.test(unlockSrc) && /need: 6/.test(unlockSrc) && /need: 9/.test(unlockSrc), '門檻 3／6／9 關（測試期壓低，讓大家快點摸到每個玩法）');
ok(/sel: 'btnRpg'/.test(unlockSrc) && /sel: 'btnBR'/.test(unlockSrc) && /sel: 'btnMulti'/.test(unlockSrc), '三個被鎖的入口都對得上實際 id');
ok(/function isVeteran\(\)/.test(unlockSrc), '有老玩家判定');
ok(/cleared\(\) >= /.test(unlockSrc), '老玩家判定看「走了多遠」而不是「有沒有開始走」（過完第 1 關不算老玩家）');
ok(/ST\.all = 1/.test(unlockSrc), '老玩家一次性全開');
ok(/document\.addEventListener\('click', onCap, true\)/.test(unlockSrc), '點擊在捕獲階段攔（改不動主檔的 handler）');
ok(/stopImmediatePropagation/.test(unlockSrc), '攔下來後主檔監聽不會再跑');
ok(/classList\.add\('locked'\)/.test(unlockSrc), '鎖定用 class（不會被 innerHTML 重寫沖掉）');
ok(/::before/.test(unlockSrc), '鎖角標用 ::before（.mbtn 的 ::after 已被果凍效果佔用）');
ok(/q\.get\('unlock'\) === 'all'/.test(unlockSrc), '有 ?unlock=all 逃生口');
ok(/catch \(e\) \{[\s\S]{0,400}classList\.remove\('locked'\)/.test(unlockSrc), '自身出錯時全部解鎖（寧可少一層引導，也不能把人鎖在門外）');
ok(/unlock\.js/.test(htmlSrc), 'index.html 有載入 unlock.js');

/* ---- ②b 真的把 unlock.js 跑起來 ----
   為什麼要這一節：v5.56 上線後才發現「三個門檻對所有人都失效」 ——
   Cloud.init() 一定會打 /api/auth/guest 自動建遊客帳號，於是
   「Cloud.online() || Cloud.acc()」恆為真，所有人一進來就被判成老玩家。
   這種錯只有真的執行才抓得到（靜態正則全綠）。 */
function runUnlock(cloud, ls0) {
  const store = Object.assign({}, ls0 || {});
  const els = {};
  function mkEl() {
    const s = new Set();
    return {
      classList: {
        add: function (c) { s.add(c); }, remove: function (c) { s.delete(c); },
        contains: function (c) { return s.has(c); }
      },
      attrs: {},
      setAttribute: function (k, v) { this.attrs[k] = String(v); },
      getAttribute: function (k) { return this.attrs[k] === undefined ? null : this.attrs[k]; },
      removeAttribute: function (k) { delete this.attrs[k]; },
      isLocked: function () { return s.has('locked'); }
    };
  }
  ['btnRpg', 'btnBR', 'btnMulti'].forEach(function (id) { els[id] = mkEl(); });

  const saved = {
    win: global.window, doc: global.document, ls: global.localStorage,
    si: global.setInterval, loc: global.location
  };
  global.localStorage = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; }
  };
  global.document = {
    getElementById: function (id) { return els[id] || null; },
    addEventListener: function () {},
    createElement: function () { return { style: {}, id: '', textContent: '' }; },
    head: { appendChild: function () {} },
    body: {}
  };
  global.location = { search: '' };
  global.setInterval = function () { return 0; };   // 不讓輪詢把 node 卡住
  global.window = { document: global.document, localStorage: global.localStorage, __BH: { Cloud: cloud, t: null, toast: function () {} } };

  let API = null;
  try {
    const p = path.join(ROOT, 'js/unlock.js');
    delete require.cache[require.resolve(p)];
    API = require(p);
  } catch (e) {
    API = { err: String(e && e.message) };
  }
  const out = {
    rpg: els.btnRpg.isLocked(), br: els.btnBR.isLocked(), multi: els.btnMulti.isLocked(),
    vet: API && typeof API.isVeteran === 'function' ? API.isVeteran() : null,
    all: API && API.state ? API.state().all : null,
    needTitle: els.btnRpg.getAttribute('title')
  };
  global.window = saved.win; global.document = saved.doc; global.localStorage = saved.ls;
  global.setInterval = saved.si; global.location = saved.loc;
  return out;
}

sec('②b 解鎖真的跑起來（遊客 ≠ 老玩家）');
const guestCloud = { online: function () { return true; }, guest: function () { return true; }, acc: function () { return { kind: 'guest', unlocked: 0 }; } };
const membCloud = { online: function () { return true; }, guest: function () { return false; }, acc: function () { return { kind: 'member', unlocked: 0 }; } };
const offCloud = { online: function () { return false; }, guest: function () { return true; }, acc: function () { return null; } };

const R1 = runUnlock(guestCloud, {});
ok(R1.vet === false, '自動建立的遊客帳號不算老玩家（isVeteran=false）');
ok(R1.rpg === true && R1.br === true && R1.multi === true, '遊客 → 三個入口維持上鎖');

const R2 = runUnlock(membCloud, {});
ok(R2.vet === true && R2.all === 1, '真的登入的會員 → 視為老玩家、全開');
ok(R2.rpg === false && R2.br === false, '會員 → 三個入口全開');

const R3 = runUnlock(offCloud, { 'bombhero-stage': '20' });
ok(R3.vet === true && R3.rpg === false, '有通關紀錄（離線）→ 全開');

const R4 = runUnlock(offCloud, { 'bombhero-stage': '4' });
ok(R4.rpg === false && R4.br === true && R4.multi === true, '通關 3 關（stage=4）→ 只開 RPG（br／multi 仍鎖）');

const R5 = runUnlock(offCloud, { 'bombhero-stage': '1' });
ok(R5.rpg === true && R5.br === true && R5.multi === true, '全新（0 關）→ 三個都鎖');
ok(R5.vet === false, '只過完第 1 關（鍵已存在）也不算老玩家 —— 否則階梯只剩 0／1 兩格');
ok(/3/.test(R5.needTitle || ''), '上鎖時 title 有講「通關第幾關」（實際：' + R5.needTitle + '）');

const R6 = runUnlock(offCloud, { 'bombhero-stage': '7' });
ok(R6.rpg === false && R6.br === false && R6.multi === true, '通關 6 關 → RPG＋大逃殺都開，多人還鎖');

const R6b = runUnlock(offCloud, { 'bombhero-stage': '9' });
ok(R6b.rpg === false && R6b.br === false && R6b.multi === true && R6b.vet === false,
  '通關 8 關 → 多人仍鎖，而且還沒被當老玩家（階梯最後一階＝9 關）');

const R6c = runUnlock(offCloud, { 'bombhero-stage': '10' });
ok(R6c.rpg === false && R6c.br === false && R6c.multi === false, '通關 9 關（走完階梯）→ 三個全開');

const R7 = runUnlock({ online: function () { return true; }, guest: function () { return true; }, acc: function () { return { kind: 'guest', unlocked: 1, rpg: { cleared: 0, xp: 0 } }; } }, {});
ok(R7.vet === false, '全新遊客帳號（unlocked 預設就是 1、rpg 全 0）→ 不算老玩家（v5.56 第二個洞）');

const R8 = runUnlock({ online: function () { return true; }, guest: function () { return true; }, acc: function () { return { kind: 'guest', unlocked: 1, rpg: { cleared: 3, xp: 120 } }; } }, {});
ok(R8.vet === true && R8.rpg === false, '遊客但伺服器上有 RPG 進度（cleared=3）→ 視為老玩家，換裝置不會被鎖回去');

ok(/C\.guest\(\)/.test(unlockSrc) && /!guest/.test(unlockSrc), '老玩家判定有讀遊客身分（反向：改回「online 就算」會在這裡紅）');
ok(!/a\.unlocked \| 0\) > 0/.test(unlockSrc), '反向：不再用 acc.unlocked 當「玩過 RPG」（遊客帳號預設就是 1）');
ok(/rg\.cleared \| 0\) > 0/.test(unlockSrc), '改看 rpg.cleared／rpg.xp 這種「真的打過」的欄位');
ok(/function tick\(\)[\s\S]{0,600}paint\(!changed\)/.test(unlockSrc),
  '輪詢每一輪都重鋪（主檔 homeFill 重畫首頁會把 locked 洗掉，不能只在關數變了才鋪）');

ok(/btnSkins/.test(htmlSrc), '「更多」抽屜有外觀入口');
ok(/skins\.js/.test(htmlSrc) && /sharecard\.js/.test(htmlSrc) && /notify\.js/.test(htmlSrc),
  '四個新模組都在 index.html 裡');

/* ============================================================
   ③ 賽季重排 40 關
   ============================================================ */
sec('③ 賽季重排 40 關');
(function () {
  const env = SB.makeEnv();
  const P = env.BH;
  ok(typeof P.seasonChapterMap === 'function', 'seasonChapterMap 有匯出');
  ok(typeof P.seasonMapShift === 'function', 'seasonMapShift 有匯出');
  ok(P.hasOwnProperty('mapIdxOfStage') || typeof P.mapIdxOfStage === 'function', 'mapIdxOfStage 可用');

  /* 剛升上這個版本：smvBase 會被寫成「當下這一季」→ shift = 0 → 完全等於改版前 */
  const idn = [];
  for (let c = 1; c <= 8; c++) idn.push(P.seasonChapterMap(c));
  ok(idn.join(',') === '1,2,3,4,5,6,7,8', 'shift 0 時是恆等映射（改版當下地圖不變）');

  /* 40 關每一關都要落在 0~31 的合法索引，且同一季內穩定 */
  const a1 = [], a2 = [];
  for (let s = 1; s <= 40; s++) { a1.push(P.mapIdxOfStage(s)); a2.push(P.mapIdxOfStage(s)); }
  ok(a1.join(',') === a2.join(','), '同一季內重複呼叫結果一致（可重現）');
  ok(a1.every(function (v) { return v >= 0 && v <= 31; }), '40 關全部落在 0~31 的合法地圖索引');
  ok(a1.every(function (v) { return Number.isInteger(v); }), '索引都是整數');

  /* 模擬換季：把基準季往前推一季 → shift = 1 → 1↔2、3↔4 … */
  const cur = P.Season.seasonNo();
  P.settings.smvBase = Math.max(1, cur - 1);
  const m1 = [];
  for (let c = 1; c <= 8; c++) m1.push(P.seasonChapterMap(c));
  ok(m1.join(',') === '2,1,4,3,6,5,8,7', 'shift 1：章節兩兩對調（1↔2、3↔4…）');

  /* shift 2 / 3 / 4 都要是「同一組 4 章內的重排」——不能出現跨組 */
  const want = { 2: '1,4,3,2,5,8,7,6', 3: '3,4,1,2,7,8,5,6', 4: '4,3,2,1,8,7,6,5' };
  for (let sh = 2; sh <= 4; sh++) {
    P.settings.smvBase = Math.max(1, cur - sh);
    const got = [];
    for (let c = 1; c <= 8; c++) got.push(P.seasonChapterMap(c));
    ok(got.join(',') === want[sh], 'shift ' + sh + ' 的章節映射正確');
    /* 每組 4 章只能在自己的組內換 → 前四章的值都在 1~4、後四章在 5~8 */
    ok(got.slice(0, 4).every(function (v) { return v >= 1 && v <= 4; }) &&
       got.slice(4).every(function (v) { return v >= 5 && v <= 8; }),
      'shift ' + sh + ' 不會把第 1 章換成第 8 章的地圖（難度跨度 ≤3 章）');
    /* 一定要是「排列」：8 個值不重複 */
    ok(new Set(got).size === 8, 'shift ' + sh + ' 是一一對應（不會兩關同一張圖）');
  }

  /* 關卡名稱的編號要用「關卡自己的」章-小關，而不是地圖的 */
  P.settings.smvBase = Math.max(1, cur - 1);
  const nm = P.stageName(1);
  ok(/^1-1/.test(nm), '重排後第 1 關仍顯示 1-1（不會跳成 3-1）');
})();

/* ============================================================
   A 幽靈對手
   ============================================================ */
sec('A 幽靈對手');
(function () {
  const env = SB.makeEnv();
  const G = env.BH.Ghost;
  ok(!!G, 'Ghost 可用');
  ok(typeof G.pack === 'function', '有 pack()（0.5 秒 → 1 秒一格）');
  ok(typeof G.parse === 'function', '有 parse()');
  ok(typeof G.atPath === 'function', '有 atPath()');
  ok(G.GAP2 === 1, 'GAP2 = 1（與後端 LB_GHOST_GAP 一致）');
  ok(G.RKEY === 'bombhero-rivals-v1', '對手殘影有自己的快取 key');

  /* pack：400 格 → 200 格，且第一個點與最後一點都要留 */
  const rec = [];
  for (let i = 0; i < 41; i++) rec.push([i * .5, i, i + 1]);
  const packed = G.pack(rec);
  const cnt = packed.split('|').length;
  ok(cnt === 21, '41 格（0.5 秒）壓成 21 格（1 秒）');
  ok(packed.indexOf('0,1') === 0, '第一個點有留（不然 0~1 秒影子會消失）');
  ok(/\|40,41$/.test(packed), '最後一個點有留（影子不會提前收掉）');

  const arr = G.parse(packed);
  ok(Array.isArray(arr) && arr.length === 21, 'parse 還原成 21 個點');
  ok(arr[0][0] === 0 && arr[0][1] === 1, 'parse 的座標正確');

  /* atPath：0 秒在起點、2 秒在第三個點（1 秒 = 2 個原始取樣 = 2 格）、超時回 null */
  ok(G.atPath(arr, 0, 1).x === 0, 't=0 在起點');
  ok(G.atPath(arr, 2, 1).x === 4, 't=2 在第三個點');
  ok(Math.abs(G.atPath(arr, 0.5, 1).x - 1) < .01, 't=0.5 有線性內插');
  ok(G.atPath(arr, 999, 1) === null, '跑完之後回 null（影子消失）');
  ok(G.atPath(null, 1, 1) === null && G.atPath([], 1, 1) === null, '空資料不會炸');

  /* 壞資料要能吃掉 */
  ok(G.parse('abc') === null && G.parse('') === null && G.parse('1,2') === null, '壞字串回 null');
  ok(G.parse('1,x|2,3') === null || G.parse('1,x|2,3').length >= 1, '非數字不會產生 NaN 座標');

  /* rivals()：沒有快取時回空陣列（不是 undefined） */
  ok(Array.isArray(G.rivals()), 'rivals() 一定回陣列');
})();
ok(/ghosts=3/.test(mainSrc), '抓榜時帶 ghosts=3');
ok(/lbDailyGap|LB_GHOST_GAP/.test(cloudSrc), '後端有 LB_GHOST_GAP');
ok(/LB_GHOST_KEEP = 3/.test(cloudSrc), '後端只留前三名的軌跡');
ok(/lbCleanPath/.test(cloudSrc), '後端有軌跡白名單（只收 x,y|… 格式）');
ok(/ghosts\.\.\. *parseInt|const ghosts = Math\.max\(0, Math\.min\(LB_GHOST_KEEP/.test(cloudSrc), 'top 端點支援 ghosts 參數');
/* v5.74：v5.73 深淵榜上線後寫成 `(weekly || abyss) ? '' : …` —— 只要「非每日榜就不收軌跡」這個規則還在就算過。 */
ok(/const ghostPath = [^;\n]*weekly[^;\n]*\? '' : lbCleanPath\(body\.p\)/.test(cloudSrc), '只有每日榜收軌跡（每週榜沒固定地圖）');
ok(/for \(let i = LB_GHOST_KEEP; i < b\.list\.length; i\+\+\)/.test(cloudSrc), '前三名之外會清掉軌跡（省空間）');
ok(/function drawGhostFigure/.test(mainSrc), '抽出單一殘影的畫法（自己與對手共用）');
ok(/Ghost\.rivals\(\)/.test(mainSrc), '繪製時會讀對手殘影');
ok(/Ghost\.fetchRivals\(\)/.test(mainSrc), '開場就去抓榜（影子到手就生效）');
ok(/Ghost\.saveRivals\(j\.list\)/.test(mainSrc), '送榜回來就存一份殘影');

/* ============================================================
   B 每日挑戰成績卡
   ============================================================ */
sec('B 每日挑戰成績卡');
ok(/btndailyShare|btnDailyShare/i.test(mainSrc), '結算畫面有分享按鈕');
ok(/window\.__BHShare/.test(mainSrc), '主檔會用 __BHShare');
ok(/shBtn\.style\.display = 'none'/.test(mainSrc),
  '沒有分享模組時把按鈕藏起來（不留下點不動的鍵）');
ok(/createLinearGradient/.test(shareSrc) && /fillText/.test(shareSrc), '成績卡是 canvas 畫的（零依賴）');
ok(/navigator\.canShare/.test(shareSrc) && /navigator\.share/.test(shareSrc), '手機優先走系統分享');
ok(/toDataURL\('image\/png'\)/.test(shareSrc), '可以存成 PNG');
ok(/execCommand\('copy'\)/.test(shareSrc), '不支援下載時退回複製文字（老瀏覽器）');
ok(/sh\.cta|全球同一張圖/.test(shareSrc), '卡片上有「同一張圖」的傳播文案');
ok(/d\.rank > 0 && d\.total > 0/.test(shareSrc), '有榜才有名次徽章，離線不亂寫名次');
ok(/Game\.dailyRank/.test(mainSrc), '名次會留給分享卡用');

/* ============================================================
   C 稱號／配戴成就被看見
   ============================================================ */
sec('C 稱號／配戴成就被看見');
ok(/lbCleanTT/.test(cloudSrc) && /lbCleanEq/.test(cloudSrc), '後端有稱號／成就的白名單清洗');
ok(/const wearTT = lbCleanTT\(body\.tt\)/.test(cloudSrc), 'submit 會收 tt');
ok(/if \(typeof e\.tt === 'number'/.test(cloudSrc), 'top 會把 tt 帶出去');
ok(/if \(wearTT >= 0\) mine\.tt = wearTT; else delete mine\.tt/.test(cloudSrc),
  '展示資訊跟成績分開更新（換稱號不必重跑成績）');
ok(/body\.tt = \(typeof Ach !== 'undefined' && Ach\.wornIdx\)/.test(mainSrc), '送榜時自動帶上自己的稱號代號');
ok(/Ach\.equippedMini/.test(mainSrc), '送榜時自動帶上配戴成就');
ok(/typeof e\.tt === 'number' && e\.tt >= 0/.test(mainSrc), '排行榜行會畫稱號');
ok(/hesc\(String\(e\.eq\)\)/.test(mainSrc), '成就圖示有做 HTML 轉義（不會被注入）');
/* 稱號只傳代號 → 跨語言不會變成中文 */
ok(!/lbCleanTT[\s\S]{0,400}TITLES/.test(cloudSrc), '後端不認識中文稱號名（只存代號）');

/* ============================================================
   D 克制版今日提醒
   ============================================================ */
sec('D 克制版今日提醒');
ok(/bombhero-nudge-day/.test(notifySrc), '有「今天已提示」的記號');
ok(/bombhero-nudge-on/.test(notifySrc), '系統通知有獨立開關');
ok(/ls\(KEY_ON\) === '1'/.test(notifySrc), '系統通知預設關閉');
ok(/Notification\.permission === 'default'[\s\S]{0,120}requestPermission/.test(notifySrc),
  '只在玩家自己打開開關時才請求權限（不主動彈）');
ok(/5 \* 60000/.test(notifySrc), '切走 5 分鐘才提醒一次');
ok(/if \(ls\(KEY_SYS\) === todayKey\(\)\) return;/.test(notifySrc), '系統通知每天最多一條');
ok(/nd\.daily/.test(notifySrc) && /nd\.season/.test(notifySrc), '只提醒兩件事：今日挑戰、賽季倒數');
ok(/\.nx/.test(notifySrc) && /hideBar/.test(notifySrc), '橫幅可以關掉');
ok(/document\.addEventListener\('visibilitychange', onVis\)/.test(notifySrc), '切回前景會重新評估');

/* ============================================================
   共通：不能讓新模組拖垮既有功能
   ============================================================ */
sec('共通');
[['skins.js', skinsSrc], ['unlock.js', unlockSrc], ['sharecard.js', shareSrc], ['notify.js', notifySrc]].forEach(function (p) {
  ok(p[1].indexOf('\r') < 0, p[0] + ' 整檔 LF');
  ok(/try \{/.test(p[1]), p[0] + ' 有 try 保護（壞掉不影響遊戲本體）');
  ok(/module\.exports/.test(p[1]), p[0] + ' 有雙出口（測試可 require）');
});
ok(mainSrc.indexOf('\r') < 0, 'main.js 整檔 LF');
ok(mainSrc.length <= 1950000, '主檔仍在預算內（' + mainSrc.length + ' / 1950000）');

console.log('\n' + (fail ? '❌' : '✅') + ' v5.56：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
