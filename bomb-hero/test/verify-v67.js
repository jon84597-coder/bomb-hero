// test/verify-v67.js —— v4.23
//   ① 模組隔離：任何一個模組初始化失敗，都不會讓後面的模組（商店／帳號／RPG）跟著死
//   ② 開機錯誤收集器（pwaBoot 階段就裝好）＋ 首頁診斷卡
//   ③ 「版本更新內容」不再 fixed（會蓋住選單）
//   ④ 帳號／商店按鈕的顏色對比
//   ⑤ 手機選單兩欄 + 商店／帳號提前
//   ⑥ 寒冰地圖四種元件的明度階梯與形狀
//   ⑦ 版號與 SW
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, html = env.html;
const fs = require('fs');

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

const css = html.replace(/\r/g, '');
const src = css;
const noCmt = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

head('1. 模組隔離（一段壞掉不會拖垮全部）');
{
  ok(/function __stubModule\(/.test(noCmt), '有 __stubModule()：模組失敗時的替代物件');
  ok(/function __bootFail\(/.test(noCmt), '有 __bootFail()：記錄哪個模組掛了');
  // 每個核心模組都要有「try → 內層 function → catch 回 stub」的結構
  ['Screen', 'Help', 'VersionLog', 'Shop', 'Share', 'Rpg', 'Cloud', 'Admin'].forEach(function (n) {
    const re = new RegExp('const ' + n + ' = \\(function \\(\\) \\{\\s*\\n\\s*try \\{\\s*\\n\\s*return \\(function \\(\\) \\{');
    ok(re.test(noCmt), n + ' 有包 try/catch（失敗回 stub）');
  });
  const catches = (noCmt.match(/__bootFail\('(Shop|Share|Rpg|Cloud|Admin|VersionLog|Help|Screen)'/g) || []).length;
  ok(catches >= 8, 'catch 有記錄模組名稱（' + catches + ' 個）');
  // Battle / Game 是物件字面量（初始化不會拋錯），不強制包
  ok(/const Battle = \{/.test(noCmt) && /const Game = \{/.test(noCmt), 'Battle / Game 是物件字面量（本來就不會初始化失敗）');
  ok(/return \(typeof __stubModule === 'function'\) \? __stubModule\(/.test(noCmt), 'catch 內回傳 stub（不會 undefined）');
  // 保留函式提升：一定要是「內層 function」而不是直接包裸 try 區塊
  ok(!/const Shop = \(function \(\) \{\s*\n\s*try \{\s*\n\s*const KEY/.test(noCmt),
    '包裹方式保留函式提升（不是裸 try 區塊）');
}

head('2. 開機錯誤收集器 + 首頁診斷卡');
{
  const bootTag = src.indexOf('<script id="pwaBoot">');
  const bootEnd = src.indexOf('</script>', bootTag);
  const boot = src.slice(bootTag, bootEnd);
  ok(/window\.__BHB = \{ errs: \[\]/.test(boot), 'pwaBoot 就建立 __BHB 錯誤收集器（主腳本掛掉也還在）');
  ok(/window\.__bootFail = function/.test(boot), 'pwaBoot 提供全域 __bootFail');
  ok(/addEventListener\('error'/.test(boot), 'pwaBoot 監聽 window error');
  ok(/unhandledrejection/.test(boot), 'pwaBoot 監聽 promise 例外');
  ok(/bombhero-boot-err/.test(boot), '錯誤會寫進 localStorage（下次可回報）');
  ok(/id="bootDiag"/.test(src), '首頁有 #bootDiag 診斷卡');
  ok(/id="bootDiagFix"/.test(src), '診斷卡有「強制更新」按鈕');
  ok(/id="bootDiagMore"/.test(src), '診斷卡有「顯示細節」按鈕');
  const m = noCmt.match(/\n\s{2}\.bootdiag \{([\s\S]*?)\}/);
  ok(!!m && !/position:\s*fixed/.test(m[1]), '診斷卡在正常排版裡（不是浮層）');
  ok(/\.bootdiag\.hide \{ display: none; \}/.test(noCmt), '診斷卡預設隱藏（沒事不會嚇到玩家）');
  ok(/setTimeout\(paint, 900\)/.test(noCmt) && /setTimeout\(paint, 2600\)/.test(noCmt),
    '自檢跑兩次（load 後 + 2.6 秒保險），主腳本中途死掉也畫得出來');
}

head('3. 「版本更新內容」不再浮在選單上');
{
  const m = noCmt.match(/\n\s{2}\.verlogbtn \{([\s\S]*?)\}/);
  ok(!!m, '找得到 .verlogbtn 樣式');
  ok(m && !/position:\s*fixed/.test(m[1]), '.verlogbtn 不再是 position:fixed（以前會蓋住選單）');
  ok(!/body\.touch \.verlogbtn \{[^}]*top:/.test(noCmt), '手機不再用 top 硬壓位置');
  ok(/\.toprow \{/.test(noCmt), '有 .toprow 把版本膠囊與作者公告排在一起');
  // DOM 順序：verLogBtn 要在 toprow 裡面，而且在 annBox 前面
  const iTop = src.indexOf('class="toprow"');
  const iBtn = src.indexOf('id="verLogBtn"');
  const iAnn = src.indexOf('id="annBox"');
  const iClose = src.indexOf('/toprow');
  ok(iTop > 0 && iBtn > iTop && iAnn > iBtn && iClose > iAnn, '#verLogBtn 與 #annBox 都在 .toprow 內');
}

head('4. 帳號／商店按鈕看得清楚');
{
  const m = noCmt.match(/\n\s{2}\.mbtn\.acctbigbtn \{([\s\S]*?)\}/);
  ok(!!m, '找得到 .mbtn.acctbigbtn');
  ok(m && /color:\s*#123f6b/i.test(m[1]), '帳號鈕有明確深藍字色（不再繼承深褐 #6b4222）');
  ok(m && /linear-gradient\(180deg, #eef7ff, #d3e8ff\)/i.test(m[1]), '帳號鈕是淺藍底');
  // 對比：文字亮度要明顯低於底色（>4.5:1 會太嚴，這裡取 >6）
  const lum = function (hex) {
    const v = hex.replace('#', '');
    const c = [0, 2, 4].map(function (i) {
      let n = parseInt(v.substr(i, 2), 16) / 255;
      return n <= .03928 ? n / 12.92 : Math.pow((n + .055) / 1.055, 2.4);
    });
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
  };
  const L1 = lum('#d3e8ff'), L2 = lum('#123f6b');
  const ratio = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
  ok(ratio > 6, '帳號鈕字/底對比 = ' + ratio.toFixed(1) + ':1（>6）');
  const s2 = noCmt.match(/\n\s{2}\.mbtn\.storebtn \{([\s\S]*?)\}/);
  ok(!!s2 && /#fff8e2/.test(s2[1]) && /#6a4512/.test(s2[1]), '商店鈕改成金色卡片＋深褐字');
}

head('5. 首頁選單分層（v4.81：6 張玩法卡 + 更多抽屜）');
{
  // 舊版 14 顆等高按鈕在手機佔 1203px（要滑 1.4 屏），改成 2 欄卡片 + 抽屜
  ok(/\.mgrid \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/.test(noCmt), '主玩法 2 欄 grid');
  ok(/@media \(min-width: 900px\)[\s\S]{0,240}?\.mgrid \{[^}]*repeat\(3/.test(noCmt), '桌機 3 欄');
  ok(/\.mdrawer \{ display: none;/.test(noCmt), '「更多」抽屜預設收起');
  ok(/\.mdrawer\.on \{ display: grid;/.test(noCmt), '抽屜展開才有 grid');

  const grid = src.slice(src.indexOf('<div class="mgrid">'), src.indexOf('id="mDrawer"'));
  const cards = (grid.match(/class="mbtn/g) || []).length;
  ok(cards === 6, '首頁主玩法剛好 6 張卡（' + cards + '）');
  ['btnSolo', 'btnBR', 'btnDaily', 'btnMulti', 'btnRpg', 'btnMoreMenu'].forEach(function (id) {
    ok(grid.indexOf('id="' + id + '"') > 0, '卡片 #' + id + ' 在 grid 裡');
  });
  const drawer = src.slice(src.indexOf('id="mDrawer"'), src.indexOf('id="mDrawer"') + 900);
  ['btnStore', 'btnHelp', 'btnSettings', 'btnQuit'].forEach(function (id) {
    ok(drawer.indexOf('id="' + id + '"') > 0, '抽屜 #' + id + ' 收在裡面');
  });
  // 併掉的入口不能再出現在首頁
  const menuSeg = src.slice(src.indexOf('id="homeMenu"'), src.indexOf('id="multiPick"'));
  ['btnBoss', 'btnLb"', 'btnBattle', 'btnOnline', 'btnAcctBig'].forEach(function (id) {
    ok(menuSeg.indexOf(id) < 0, '首頁已移除 #' + id);
  });
  ok(menuSeg.indexOf('btnSoloBoss') < 0 && src.indexOf('id="btnSoloBoss"') > 0,
    'BOSS 入口搬到單人關卡畫面（不在首頁）');
}

head('6. 寒冰地圖：四種元件分得出來');
{
  // 主題色明度階梯（WCAG 相對亮度，跟人眼感受一致；灰階也分得開）
  const lum = function (hex) {
    const v = hex.replace('#', '');
    const c = [0, 2, 4].map(function (i) {
      let n = parseInt(v.substr(i, 2), 16) / 255;
      return n <= .03928 ? n / 12.92 : Math.pow((n + .055) / 1.055, 2.4);
    });
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
  };
  // 逐個 key 抓（不要靠位置，改天調順序就會抓錯）
  const iceLine = (noCmt.split('\n').filter(function (l) { return /style: 'ice'/.test(l); })[0]) || '';
  const col = function (k) {
    const m = new RegExp(k + ": '(#[0-9a-fA-F]{6})'").exec(iceLine);
    return m ? m[1] : null;
  };
  const cFloor = col('floor'), cHard = col('hard'), cSoft = col('soft');
  ok(!!cFloor && !!cHard && !!cSoft, '找得到寒冰主題色（' + [cFloor, cHard, cSoft].join(' / ') + '）');
  if (cFloor && cHard && cSoft) {
    const Lfloor = lum(cFloor), Lhard = lum(cHard), Lsoft = lum(cSoft);
    ok(Lfloor > .70, '地板很亮（L=' + Lfloor.toFixed(2) + '）');
    ok(Lhard < .20, '硬牆很深（L=' + Lhard.toFixed(2) + '）');
    ok(Lsoft > Lhard + .20, '軟牆明顯比硬牆亮（差 ' + (Lsoft - Lhard).toFixed(2) + '）');
    ok(Lfloor > Lsoft + .20, '地板明顯比軟牆亮（差 ' + (Lfloor - Lsoft).toFixed(2) + '）');
  }
  // v4.26：美術改成「預烘焙材質引擎」→ 這裡改驗 MAT.ice 的材質表與三種繪製函式
  ok(/function paintHardTile/.test(noCmt) && /function paintSoftTile/.test(noCmt) &&
     /function paintFloorTile/.test(noCmt), '找得到硬牆／軟牆／地板三種材質繪製函式');
  // v4.36：FOE_FX_STYLE 也有一行 `ice: { glow: ... }` → 這裡要指名「下面接 hard:」才是 MAT.ice
  const iceMat = /ice: \{\s*\n    hard: [\s\S]*?\n  \},/.exec(noCmt);
  ok(!!iceMat, '找得到 MAT.ice 材質表');
  const matBlk = function (k) {
    const m = new RegExp(k + ': \\{([\\s\\S]*?)\\}').exec(iceMat ? iceMat[0] : '');
    return m ? m[1] : '';
  };
  const hexIn = function (s, k) {
    const m = new RegExp(k + ": '(#[0-9a-fA-F]{6})'").exec(s);
    return m ? m[1] : null;
  };
  const hardB = matBlk('hard'), softB = matBlk('soft'), floorB = matBlk('floor');
  const mHard = hexIn(hardB, 'face2'), mSoft = hexIn(softB, 'face2'), mFloor = hexIn(floorB, 'a');
  ok(!!mHard && !!mSoft && !!mFloor, '冰主題三種材質都有主色（' + [mHard, mSoft, mFloor].join(' / ') + '）');
  if (mHard && mSoft && mFloor) {
    // 材質表自己也要守住明度階梯（不然改配色時很容易把牆地板改到一樣亮）
    const lh = lum(mHard), ls = lum(mSoft), lf = lum(mFloor);
    ok(lf > .70, '材質表：地板很亮（L=' + lf.toFixed(2) + '）');
    ok(lh < .20, '材質表：硬牆很深（L=' + lh.toFixed(2) + '）');
    ok(ls > lh + .20, '材質表：軟牆明顯比硬牆亮（差 ' + (ls - lh).toFixed(2) + '）');
    ok(lf > ls + .20, '材質表：地板明顯比軟牆亮（差 ' + (lf - ls).toFixed(2) + '）');
  }
  // 形狀：軟牆是八角冰晶（跟硬牆的方塊拉開差距）
  const softFn = /function paintSoftTile[\s\S]*?\n\}\n/.exec(noCmt);
  ok(!!softFn, '找得到 paintSoftTile');
  ok(softFn && /const cut = w \* \.26/.test(softFn[0]), '軟牆用八角切角（形狀跟硬牆不同）');

  // 地板：不可以再有「整條白色亮帶」（會被誤認成牆的上緣）
  const fpos = noCmt.indexOf('function paintFloorTile');
  const floorBlock = noCmt.slice(noCmt.indexOf("if (st === 'ice') {", fpos), noCmt.indexOf("if (st === 'lava') {", fpos));
  ok(fpos > 0 && floorBlock.length > 100, '找得到冰主題地板分支');
  ok(!/fillRect\(px \+ T \* \.04, py \+ T \* \.04, T \* \.92, T \* \.10\)/.test(floorBlock),
    '冰地板不再有那條橫貫的白色亮帶');
  ok(/rgba\(150,178,198,\.44\)/.test(floorB), '地板用淡灰細縫（低對比）');

  // 滑地：深藍鏡面 + 霓虹邊
  ok(/#8ff0ff/.test(noCmt), '滑地有霓虹青邊框');
  ok(/g\.addColorStop\(0, '#4a9cbb'\)/.test(noCmt), '滑地是中間偏深的鏡面藍');
}

head('7. 版號與 SW');
{
  ok(/^\d+\.\d+$/.test(P.VERSION), '版號格式 = ' + P.VERSION);
  // v4.24：改成不綁死版號（否則每次升版都要回頭改舊測試）
  ok(html.indexOf('id="verTxt">' + P.VERSION + '<') > 0, '畫面版本文字同步 ' + P.VERSION);
  ok(P.VERSION_LOG[0].v === P.VERSION && P.VERSION_LOG[0].now === true, 'VERSION_LOG 第一筆 = 目前版號（now）');
  // 舊條目（3.x）根本沒有 now 欄位 → 用 !== true 判斷（否則 undefined 會誤判失敗）
  ok(P.VERSION_LOG.slice(1).every(function (e) { return e.now !== true; }), '只有第一筆是 now');
  const e423 = P.VERSION_LOG.filter(function (e) { return e.v === '4.23'; })[0] || { items: [] };
  ok(e423.items.join(' ').indexOf('一起壞掉') >= 0, '4.23 更新內容寫了「模組隔離」');
  ok(e423.items.join(' ').indexOf('寒冰') >= 0, '4.23 更新內容寫了寒冰地圖');
  ok(P.VERSION_LOG.filter(function (e) { return e.v === '4.22'; }).every(function (e) { return e.now === false; }),
    '4.22 已不是 now');
  ok(new RegExp("SW_VERSION = 'v" + P.VERSION + "\\.0'").test(fs.readFileSync(__dirname + '/../sw.js', 'utf8')),
    'sw.js = v' + P.VERSION + '.0');
}

console.log('\n通過 ' + pass + ' 項，失敗 ' + fail + ' 項');
process.exit(fail ? 1 : 0);
