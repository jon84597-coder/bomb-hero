// test/verify-v581.js —— v5.80：新手看得懂「為什麼大逃殺／對戰還不能玩」
//   ① 鎖住的卡片寫出「通關 N 關解鎖」，不再只有一顆鎖頭
//   ② 點下去開說明卡（原因／已通關幾關／還差幾關／進度條／去哪打）
//   ③ 說明卡按鈕真的把玩家帶到冒險模式，ESC 關得掉
//   ④ 鎖標是流式排版（不壓到卡片說明那行）、鎖定時收掉 HOT／BETA 角標
//   ⑤ 新手期兩張卡看得見（不再 display:none），Starter 的減負仍然保留給其他卡
//   ⑥ 三組門檻文案五語齊全、徽章走字典不走硬寫
//   ⑦ 版本 >= 5.80 七處一致
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const unlock = read('js/unlock.js');
const mainJs = read('js/main.js');
const idx = read('index.html');
const vlog = read('js/version-log.js');
const i18n = read('js/i18n-src.js');
const pkg = read('../package.json');

let pass = 0, fail = 0;
function ok(c, m, x) {
  if (c) { pass++; console.log('  ✓ ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

/* ================================================================ */
head('1. 版本七處一致（>= 5.80）');
{
  const ver = (mainJs.match(/const VERSION = '([\d.]+)'/) || [])[1];
  ok(parseFloat(ver) >= 5.80, '主檔 VERSION >= 5.80', ver);
  ok(/<span id="verTxt">5\.80<\/span>/.test(idx), '首頁 verTxt = 5.80');
  ok(/<span id="verLogVer">5\.80<\/span>/.test(idx), '版本面板 verLogVer = 5.80');
  ok(/"version":\s*"5\.80\.0"/.test(pkg), 'package.json 5.80.0');
  const sws = ['sw.js', '../public/sw.js', '../bomberman-online/public/sw.js', '../dist/site/sw.js']
    .map(f => { try { return (read(f).match(/SW_VERSION = '(v[\d.]+)'/) || [])[1]; } catch (e) { return null; } })
    .filter(Boolean);
  ok(sws.length >= 3 && sws.every(v => v === 'v5.80.0'), '四份 sw.js 都是 v5.80.0', sws);
  ok(/v: '5\.80'[\s\S]{0,80}now: true/.test(vlog), 'VERSION_LOG[0] 是 5.80 且 now:true');
  ok(/v: '5\.79'[\s\S]{0,80}now: false/.test(vlog), '上一版 5.79 已收成 now:false');
  const items = (vlog.match(/v: '5\.80'[\s\S]*?items: \[([\s\S]*?)\]\s*\}/) || [])[1] || '';
  ok((items.match(/'/g) || []).length >= 12, '本版至少 6 條說明');
}

/* ================================================================ */
head('2. 門檻定義：三階、每階都有自己的說明');
{
  ok(/id: 'rpg', sel: 'btnRpg', need: 3/.test(unlock), 'RPG 養成 need 3');
  ok(/id: 'br', sel: 'btnBR', need: 6/.test(unlock), '大逃殺 need 6');
  ok(/id: 'multi', sel: 'btnMulti', need: 9/.test(unlock), '多人對戰 need 9');
  ok(/tk: 'rpg'/.test(unlock) && /tk: 'br'/.test(unlock) && /tk: 'battle'/.test(unlock),
    '三階都有 tk（對應字典鍵）');
  ok(!/content:"🔒";/.test(unlock), '鎖標不再只是寫死一顆🔒');
  ok(/content:attr\(data-aigain\)/.test(unlock), '鎖標內容來自 data-aigain（走字典）');
  ok(/T\('gate\.badge', \{ n: g\.need \}/.test(unlock), '徽章文案用 gate.badge');
  ok(/setAttribute\('data-needn', String\(g\.need\)\)/.test(unlock), '另存 data-needn 給說明卡用');
  ok(/setAttribute\('data-gn', g\.n\)/.test(unlock), '另存模式名 data-gn');
}

/* ================================================================ */
head('3. 鎖標排版：流式、不壓到卡片說明、鎖定時收角標');
{
  ok(/position:static;left:auto;top:auto;right:auto;bottom:auto/.test(unlock),
    '鎖標是流式（static）—— 跟原本的卡片圖示同一格，不會蓋住下面的說明');
  ok(/#scr-title #homeMenu \.mgrid \.mbtn\.locked\[data-aigain\]::before/.test(unlock),
    '選擇器掛兩個 id → 壓得過 home-wide 窄卡規則');
  ok(/display:block;width:max-content/.test(unlock), '膠囊自己決定寬度並置中');
  ok(/\.locked \.hotTag[\s\S]{0,80}display:none!important/.test(unlock), '鎖住的卡收掉 HOT 角標');
  ok(/\.locked \.betaTag/.test(unlock), '鎖住的卡也收掉 BETA 角標');
  ok(/font-size:10px/.test(unlock), '桌機鎖標字級 10px');
  ok(/body\.touch #scr-title #homeMenu \.mgrid \.mbtn\.locked\[data-aigain\]::before\{[\s\S]{0,60}font-size:8\.5px/.test(unlock),
    '手機鎖標縮到 8.5px');
  ok(/locked\[data-aigain\]::before/.test(unlock),
    '鎖標只畫在 data-aigain 的卡上（深淵按鈕自己那套小字不會被蓋）');
  ok(/#bhPick \.qbtn\.locked\[data-aigain\]::before\{[\s\S]{0,90}right:4px;top:-7px/.test(unlock),
    '冒險面板的鎖標是「外掛角標」—— 不壓住 RPG 養成那行字');
}

/* ================================================================ */
head('4. 說明卡：欄位、按鈕、關閉方式');
{
  ok(/var CARD_ID = 'gateOv'/.test(unlock), '說明卡 id = gateOv（主檔 ESC 認得）');
  ok(/function openCard\(tk, need, name\)/.test(unlock), 'openCard 收 tk / need / name');
  ok(/function closeCard\(\)/.test(unlock), '有 closeCard');
  ['bhgT', 'bhgB', 'bhgL', 'bhgN', 'bhgF', 'bhgNote', 'bhgGo', 'bhgBack'].forEach(function (id) {
    ok(unlock.indexOf('id="' + id + '"') >= 0, '說明卡有 #' + id);
  });
  ok(/id="bhgBack" data-close="1"/.test(unlock), '關閉鈕帶 data-close（主檔 Escape 找得到）');
  ok(/T\('gate\.' \+ tk \+ 'Title'/.test(unlock), '標題按模式取字典鍵');
  ok(/T\('gate\.' \+ tk \+ 'Body', \{ n: need \}/.test(unlock), '正文按模式取字典鍵並代入關數');
  ok(/T\('gate\.prog', \{ a: cur, b: need \}/.test(unlock), '顯示「已通關 a / b 關」');
  ok(/style\.width = Math\.max\(4, Math\.round\(cur \/ Math\.max\(1, need\) \* 100\)/.test(unlock),
    '進度條依實際進度算寬度（最低 4% 才看得見）');
  ok(/getElementById\('btnAdventure'\)/.test(unlock) && /adv\.click\(\)/.test(unlock),
    '「去冒險模式通關」走原本的冒險入口，不另拼流程');
  ok(/if \(e\.target === ov\) closeCard\(\)/.test(unlock), '點遮罩空白處可關');
  ok(/if \(tk && openCard\(tk, need, gn\)\) return;/.test(unlock), '點鎖住的卡 → 開說明卡');
  ok(/b\.toast\('🔒 ' \+ T\('ul\.need'/.test(unlock), 'openCard 失敗時仍有 toast 兜底');
}

/* ================================================================ */
head('5. 主檔整合：ESC 認得、沒有殘留的重複實作');
{
  ok(/'skinPanel', 'gateOv'\]/.test(mainJs) || /'gateOv'\]/.test(mainJs), 'BH_DIALOG_IDS 收進 gateOv');
  ok(!/ModeGate/.test(mainJs), '主檔沒有殘留重複的門檻實作（統一由 unlock.js 管）');
  ok(/\$id\('btnBR'\)\.addEventListener\('click'/.test(mainJs), 'btnBR 的原生 handler 還在（解鎖後照原流程）');
  ok(/\$id\('btnMulti'\)\.addEventListener\('click'/.test(mainJs), 'btnMulti 的原生 handler 還在');
}

/* ================================================================ */
head('6. 新手首頁：兩張卡看得見');
{
  ok(!/#homeMenu\.starter\[data-tier="0"\] \.mgrid \.mbtn:not\(#btnAdventure\),/.test(idx),
    'tier0 不再把大逃殺／對戰整批隱藏');
  ok(/#homeMenu\.starter\[data-tier="0"\] \.mgrid \.mbtn:not\(#btnAdventure\):not\(#btnBR\):not\(#btnMulti\)/.test(idx),
    'tier0 仍保留冒險＋大逃殺＋多人對戰三張（後兩張鎖定態）');
  ok(/#homeMenu\.starter\[data-tier="1"\][^\n]*:not\(#btnBR\):not\(#btnMulti\)/.test(idx),
    'tier1 同樣保留這兩張');
  ok(/starterTip/.test(idx), '新手提示條還在');
}

/* ================================================================ */
head('7. 五語文案齊全');
{
  const keys = ['gate.badge', 'gate.rpgTitle', 'gate.rpgBody', 'gate.brTitle', 'gate.brBody',
    'gate.battleTitle', 'gate.battleBody', 'gate.prog', 'gate.why', 'gate.notBroken', 'gate.go', 'gate.back'];
  const bad = [];
  keys.forEach(function (k) {
    const m = i18n.match(new RegExp('^' + k.replace('.', '\\.') + '\\|(.+)$', 'm'));
    if (!m) { bad.push(k + '(缺)'); return; }
    const parts = m[1].split('|').map(function (s) { return s.trim(); });
    if (parts.length !== 5 || parts.some(function (s) { return !s; })) bad.push(k + '(' + parts.length + '語)');
  });
  ok(bad.length === 0, keys.length + ' 個 gate.* 鍵都是五語齊全', bad);
  ok(/gate\.badge\|[^|\n]*\{n\}[^|\n]*\|[^|\n]*\{n\}/.test(i18n), '徽章文案有 {n} 佔位符（繁中／簡中）');
  ok(/gate\.brBody\|[^|\n]*6 關|gate\.brBody\|[^|\n]*\{n\} 關/.test(i18n), '大逃殺正文說明要幾關');
  ok(!/\\uD83D|\\u26A0/.test(i18n), '字典檔沒有殘留 \\u 轉義（會原樣顯示）');
}

/* ================================================================ */
head('8. 反向確認：解鎖後一切照舊');
{
  ok(/if \(open\) el\.classList\.remove\('locked'\)/.test(unlock), '達標就移除 locked');
  ok(/el\.setAttribute\('data-aigain', open \? '' : /.test(unlock), '解鎖後清掉徽章文案');
  ok(/else \{\s*el\.removeAttribute\('data-locked'\);/.test(unlock),
    '解鎖後移除 data-locked');
  ok(/ST\.all = 1;/.test(unlock) && /isVeteran\(\)/.test(unlock), '老玩家仍然一次全開（鎖不到他們）');
  ok(/paint\(!changed\)/.test(unlock), '900ms 巡檢還在（主檔重畫首頁後會補回來）');
  ok(/document\.addEventListener\('click', onCap, true\)/.test(unlock), '點擊仍在捕獲階段攔（抗重繪）');
  ok(/timer = setInterval\(tick, 900\)/.test(unlock), '巡檢間隔沒被改掉');
}

console.log('\n=== v5.80 模式門檻提示：' + pass + ' 通過 / ' + fail + ' 失敗 ===');
process.exit(fail ? 1 : 0);
