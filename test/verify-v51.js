// test/verify-v51.js — v4.5：受傷反饋改為「頭上飄字 ＋ 邊緣紅光 ＋ HUD 血量大 1.2 倍」
//   無頭沙盒（vm）＋ 原始碼斷言，不需要瀏覽器
const path = require('path');
const fs = require('fs');
const { makeEnv } = require('./_sandbox');

const ROOT = path.join(__dirname, '..');
const HTML_PATH = (function () {
  const a = path.join(ROOT, 'index.html');
  const b = path.join(ROOT, 'public', 'index.html');
  return fs.existsSync(a) ? a : b;
})();
const html = fs.readFileSync(HTML_PATH, 'utf8');

let pass = 0, fail = 0;
function ok(c, n, x) {
  if (c) { pass++; console.log('  ✓ ' + n + (x === undefined ? '' : '（' + x + '）')); }
  else { fail++; console.log('  ✗ FAIL: ' + n + (x === undefined ? '' : '（' + x + '）')); }
}
const src = (re) => re.test(html);

const env = makeEnv();
const P = env.BH;

console.log('\n=== 0. 版本 ===');
ok(P.VERSION === '4.5', '版本 = 4.5', P.VERSION);
ok(src(/<span id="verTxt">4\.5<\/span>/), '首頁徽章同步 4.5');
ok(P.VERSION_LOG[0].v === '4.5' && P.VERSION_LOG[0].now === true, '版本紀錄最新一筆是 4.5');
ok(P.VERSION_LOG[1].v === '4.4' && !P.VERSION_LOG[1].now, '上一筆 4.4 已不是「當前」');
const v45 = P.VERSION_LOG[0].items.join('|');
['頭上', '邊緣', '1.2', '中央'].forEach(function (k) {
  ok(v45.indexOf(k) >= 0, 'v4.5 條列提到「' + k + '」');
});

// ------------------------------------------------------------------
console.log('\n=== 1. 中央巨型血量數字已徹底移除 ===');
ok(!src(/banner\('❤️ ' \+ p\.hpCur/), '原始碼已沒有 banner(\'❤️ n / m\') 這種中央大字');
ok(!src(/hpCur \+ ' \/ ' \+ p\.hpMax/), '已沒有「n / m」拼字串丟給 banner');
// rpgHurt 的函式本體裡不能再出現 banner(
const rpgHurtBody = (function () {
  const i = html.indexOf('function rpgHurt(');
  if (i < 0) return '';
  const j = html.indexOf('\r\n}\r\n', i);
  return html.slice(i, j < 0 ? i + 2600 : j);
})();
ok(rpgHurtBody.length > 200, '抓得到 rpgHurt 函式本體');
ok(rpgHurtBody.indexOf('banner(') < 0, 'rpgHurt 內完全沒有 banner( 呼叫');
ok(rpgHurtBody.indexOf('hurtFeedback(') > 0, 'rpgHurt 改呼叫 hurtFeedback()');
ok(src(/\/\/ v4\.5：這裡原本是「畫面正中央的巨大血量數字」/), '原始碼留下「舊版是中央大字」的註解（可追溯）');

// banner 本身要保留（倒數 3/2/1/GO!、開門、對戰勝負還在用）
ok(src(/function banner\(txt, dur\)/), 'banner() 本身保留（倒數／勝負還要用）');
ok(src(/banner\(String\(n\), \.75\)/), '倒數數字仍走 banner');
ok(src(/banner\(winner \? t\('bt\.win'/), '對戰勝負仍走 banner');

// ------------------------------------------------------------------
console.log('\n=== 2. 頭上飄字（浮動傷害數字）===');
ok(src(/const POP_LIFE = \.8;/), 'POP_LIFE = 0.8 秒（0.5 秒上飄 + 0.3 秒淡出）');
ok(src(/const POP_RISE = \.5;/), 'POP_RISE = 0.5 秒（規格要求的 0.5 秒上飄）');
ok(src(/const POP_UP = \.8;/), '上飄距離 = 0.8 格');
ok(typeof P.pushPop === 'function', '__BH 匯出 pushPop');
ok(typeof P.updatePops === 'function', '__BH 匯出 updatePops');
ok(typeof P.drawPops === 'function', '__BH 匯出 drawPops');
ok(Array.isArray(P.Game.pops), 'Game.pops 初始化為陣列');

// 真的推一顆看看
P.Game.T = 40;
P.pushPop(100, 200, '-1', { color: '#ff4d5e' });
ok(P.Game.pops.length === 1, 'pushPop 之後佇列有 1 顆', P.Game.pops.length);
ok(P.Game.pops[0].txt === '-1', '文字是 -1');
ok(P.Game.pops[0].color === '#ff4d5e', '預設紅色（扣血）');
ok(P.Game.pops[0].t === 0, '時間從 0 開始');
P.updatePops(.3);
ok(Math.abs(P.Game.pops[0].t - .3) < 1e-6, 'updatePops 會累加時間', P.Game.pops[0].t);
P.updatePops(.6);
ok(P.Game.pops.length === 0, '超過 0.8 秒自動移除（淡出結束）', P.Game.pops.length);

// 佇列上限
for (let i = 0; i < 20; i++) P.pushPop(0, 0, '-' + i);
ok(P.Game.pops.length <= 8, '同時最多 8 顆（連續受傷不會爆量）', P.Game.pops.length);
P.Game.pops.length = 0;

// ------------------------------------------------------------------
console.log('\n=== 3. hurtFeedback：三種情況 ===');
const p0 = { x: 200, y: 300, hpCur: 4, hpMax: 5, armorCur: 0, armorMax: 0 };
P.Game.T = 40;
P.Game.pops.length = 0;
P.Game.edgeFx = 0;
P.hurtFeedback(p0, 1, 0);
ok(P.Game.pops.length === 1, '只扣血 → 1 顆飄字', P.Game.pops.length);
ok(P.Game.pops[0].txt === '-1', '內容是 -1', P.Game.pops[0] && P.Game.pops[0].txt);
ok(P.Game.pops[0].color === '#ff4d5e', '紅色', P.Game.pops[0] && P.Game.pops[0].color);
ok(P.Game.pops[0].y < p0.y, '位置在角色「頭上」（y 比角色小）', P.Game.pops[0] && P.Game.pops[0].y + ' < ' + p0.y);
ok(P.Game.edgeFx === 1, '同時觸發邊緣紅光', P.Game.edgeFx);
ok(P.Game.edgeKind === 'hp', '邊緣是紅色（扣血）', P.Game.edgeKind);

P.Game.pops.length = 0;
P.Game.edgeFx = 0;
P.hurtFeedback({ x: 200, y: 300, hpCur: 4, armorCur: 2 }, 0, 1);
ok(P.Game.pops.length === 1, '只扣護甲 → 1 顆飄字');
ok(P.Game.pops[0].color === '#5fb6ff', '護甲是藍字', P.Game.pops[0] && P.Game.pops[0].color);
ok(P.Game.edgeKind === 'armor', '邊緣改藍光（一眼看出護甲在擋）', P.Game.edgeKind);

P.Game.pops.length = 0;
P.Game.edgeFx = 0;
P.hurtFeedback({ x: 200, y: 300, hpCur: 4, armorCur: 2 }, 1, 1);
ok(P.Game.pops.length === 2, '同時扣血＋護甲 → 2 顆', P.Game.pops.length);
const xs = P.Game.pops.map(function (d) { return d.x; });
ok(Math.abs(xs[0] - xs[1]) > 10, '兩顆左右錯開，不會疊在一起', JSON.stringify(xs));

P.Game.pops.length = 0;
P.Game.edgeFx = 0;
P.hurtFeedback(p0, 0, 0);
ok(P.Game.pops.length === 0 && P.Game.edgeFx === 0, '沒有實際扣到血 → 不顯示任何反饋');
ok(P.hurtFeedback(null, 1, 0) === undefined, '傳 null 不會炸');

// ------------------------------------------------------------------
console.log('\n=== 4. 邊緣紅光（只在四邊，中央透明）===');
ok(typeof P.drawHurtEdge === 'function', '__BH 匯出 drawHurtEdge');
ok(typeof P.hurtEdge === 'function', '__BH 匯出 hurtEdge');
ok(src(/'255,62,84'/), '扣血用紅色 255,62,84');
ok(src(/'92,172,255'/), '扣護甲用藍色 92,172,255');
ok(src(/Math\.min\(w, h\) \* \.085/), '光暈帶寬度隨畫面大小縮放（約 8.5%）');
ok(src(/addColorStop\(1, 'rgba\(' \+ rgb \+ ',0\)'\)/), '漸層外緣 alpha = 0（中央完全不受影響）');
ok(src(/dt \* 3\.2/), '約 0.31 秒收完（一閃即逝）');
// 沙盒真的呼叫一次（ctx 是 stub，不能拋錯）
let edgeOk = true;
try { P.Game.edgeFx = 1; P.Game.edgeKind = 'hp'; P.drawHurtEdge(); } catch (e) { edgeOk = e.message; }
ok(edgeOk === true, 'drawHurtEdge 在無頭環境可安全執行', edgeOk);
let popDrawOk = true;
try { P.pushPop(120, 160, '-2'); P.drawPops(40); } catch (e) { popDrawOk = e.message; }
ok(popDrawOk === true, 'drawPops 在無頭環境可安全執行', popDrawOk);
P.Game.pops.length = 0;
P.Game.edgeFx = 0;

// ------------------------------------------------------------------
console.log('\n=== 5. 頂部血量列：放大 1.2 倍＋閃紅光 ===');
ok(src(/#gameTop \.chip\.fx-hurt \{ animation: hudPopHurt/), '有 .fx-hurt 的彈跳動畫');
ok(src(/@keyframes hudPopHurt \{[\s\S]*?18% \{ transform: scale\(1\.2\); \}/), '放大到 1.2 倍（規格值）');
ok(src(/@keyframes hudPopHurt \{[\s\S]*?46% \{ transform: scale\(1\); \}/), '放大後回到原尺寸');
ok(src(/@keyframes hudPopHurt \{[\s\S]*?66% \{ transform: scale\(1\.2\); \}/), '第二次彈一下（閃爍感）');
ok(src(/\.chip\.fx-hurt::after \{[^}]*rgba\(255, 72, 88/), '外框是紅色光圈');
ok(src(/@keyframes hudRingHurt/), '有獨立的光圈擴散動畫');
ok(src(/\.chip\.fx-hurt b \{ color: #ff5568; \}/), '數字本身轉紅');
ok(src(/prefers-reduced-motion[^}]*\}?[^@]*#gameTop \.chip\.fx-hurt/), '「減少動態」時自動關掉動畫');
ok(src(/const mode = \(kind === 'hurt' \|\| kind === 'armor'\)/), 'hudFlash 支援 kind = hurt / armor');
ok(src(/const HUD_FX_KIND = \{\}/), '用 HUD_FX_KIND 記住是「好東西」還是「受傷」');
ok(src(/const cls = hudFxCls\(k\);/), 'applyHudFx 會依種類補回正確的 class');
ok(src(/el\.classList\.remove\('fx', 'fx-hurt', 'fx-armor'\)/), '清掉時三種 class 都移除（不會卡住顏色）');
ok(src(/#gameTop \.chip\.fx-armor \{ animation: hudPopHurt/), '只扣護甲時走藍色 .fx-armor');
ok(src(/\.chip\.fx-armor::after \{[^}]*rgba\(92, 172, 255/), '護甲光圈是藍色（和藍字、藍光一致）');
// 吃道具仍然是金色 1.38 倍
ok(src(/22% \{ transform: scale\(1\.38\); \}/), '道具的好東西高亮仍是 1.38 倍（兩種回饋可分辨）');
let hudOk = true;
try { P.hudFlash('hp', 900, 'hurt'); } catch (e) { hudOk = e.message; }
ok(hudOk === true, 'hudFlash(..., \'hurt\') 不會拋錯', hudOk);

// ------------------------------------------------------------------
console.log('\n=== 6. 接到主迴圈與 render ===');
ok(src(/updatePops\(dt\);/), '主迴圈每幀更新飄字');
ok(src(/if \(Game\.edgeFx > 0\) Game\.edgeFx = Math\.max\(0, Game\.edgeFx - dt \* 3\.2\)/), '主迴圈遞減邊緣紅光');
ok(src(/drawPops\(T\);/), 'render 內有畫飄字');
ok(src(/drawHurtEdge\(\);/), 'render 內有畫邊緣紅光');
ok(src(/ctx\.setTransform\(PIXEL_RATIO, 0, 0, PIXEL_RATIO, 0, 0\);\r?\n  drawHurtEdge\(\);/),
  '邊緣紅光在還原座標後才畫（不受 shake 位移影響）');
const clearCount = (html.match(/Game\.pops = \[\]; Game\.edgeFx = 0;/g) || []).length;
ok(clearCount >= 3, '換場／換關會清掉殘留反饋（≥3 處）', clearCount);

// ------------------------------------------------------------------
console.log('\n=== 7. 角色頭上對話（氣泡）沒有被誤刪 ===');
ok(typeof P.bubbleSay === 'function', 'bubbleSay 仍在');
ok(src(/function drawBubbles\(T\)/), 'drawBubbles 仍在');
ok(src(/bubbleDeathPair\(p, killer/), '死亡台詞配對仍在');

// ------------------------------------------------------------------
console.log('\n=== 8. 匯出 ===');
['hurtFeedback', 'hurtEdge', 'pushPop', 'updatePops', 'drawPops', 'drawHurtEdge', 'rpgHurt', 'hudFlash']
  .forEach(function (k) {
    ok(typeof P[k] === 'function', '__BH 匯出 ' + k);
  });
ok(src(/window\.__BH = \{/), '__BH 仍存在');

console.log('\n結果：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
