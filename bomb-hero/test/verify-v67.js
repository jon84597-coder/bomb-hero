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

head('5. 手機選單兩欄');
{
  ok(/body\.touch \.menu \{\s*\n\s*display: grid; grid-template-columns: 1fr 1fr;/.test(noCmt),
    '手機 .menu 是兩欄 grid');
  ['warm', 'rpgbtn', 'bossbtn', 'quitbtn'].forEach(function (c) {
    ok(new RegExp('body\\.touch \\.menu \\.mbtn\\.' + c + '[^{]*\\{[^}]*grid-column: 1 / -1').test(noCmt) ||
       new RegExp('body\\.touch \\.menu \\.mbtn\\.' + c + ',?\\s*\\n?[^{]*\\{[^}]*grid-column: 1 / -1').test(noCmt),
      '.' + c + ' 跨滿整列');
  });
  const iBoss = src.indexOf('id="btnBoss"');
  const iStore = src.indexOf('id="btnStore"');
  const iAcct = src.indexOf('id="btnAcctBig"');
  const iBattle = src.indexOf('id="btnBattle"');
  ok(iStore > iBoss && iAcct > iStore && iBattle > iAcct, '商店／帳號登入已提到 BOSS 後面（不用滑四屏）');
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
  // 形狀：軟牆是八角、硬牆是方塊
  const crate = /function drawCrateIce[\s\S]*?\n\}\n/.exec(noCmt);
  ok(!!crate, '找得到 drawCrateIce');
  ok(crate && /const cut = w \* \.26/.test(crate[0]), '軟牆用八角切角（形狀跟硬牆不同）');
  ok(crate && /#d2f8ff/.test(crate[0]), '軟牆是亮青冰晶');
  ok(crate && /rgba\(12,58,84,\.62\)/.test(crate[0]), '軟牆的裂痕是深色（不是白色反光）');

  const wall = /function drawWallIce[\s\S]*?\n\}\n/.exec(noCmt);
  ok(!!wall, '找得到 drawWallIce');
  ok(wall && /#3d7398/.test(wall[0]) && /#15314a/.test(wall[0]), '硬牆是深藍漸層');
  ok(wall && /#0b2236/.test(wall[0]), '硬牆有深色粗外框（實心感）');

  // 地板：不可以再有「整條白色亮帶」（會被誤認成牆的上緣）
  const floorBlock = noCmt.slice(noCmt.indexOf("if (st === 'ice') {"), noCmt.indexOf("if (st === 'lava') {"));
  ok(floorBlock.length > 100, '找得到冰主題地板分支');
  ok(!/fillRect\(px \+ T \* \.04, py \+ T \* \.04, T \* \.92, T \* \.10\)/.test(floorBlock),
    '冰地板不再有那條橫貫的白色亮帶');
  ok(/rgba\(158,182,200,\.42\)/.test(floorBlock), '地板用淡灰細縫（低對比）');

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
