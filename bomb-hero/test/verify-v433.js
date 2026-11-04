// test/verify-v433.js — v4.33：暫停選單「回關卡清單」＋ 主角再縮 10% ＋ 熊貓再放大 10%
//   ＋ 第 4 大關（熔岩洞窟）6 隻手繪小怪 ＋ 龍坐騎換手繪圖（原色／紅色、體積 -15%、騎乘者 +20%、去紅光暈）
const fs = require('fs');
const ART = require('./_artcheck');
const path = require('path');
const { makeEnv } = require('./_sandbox');

const ROOT = path.join(__dirname, '..');
const HTML_PATH = path.join(ROOT, 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

let pass = 0, fail = 0;
function ok(c, n, x) {
  if (c) { pass++; console.log('  ✓ ' + n + (x === undefined ? '' : '（' + x + '）')); }
  else { fail++; console.log('  ✗ FAIL: ' + n + (x === undefined ? '' : '（' + x + '）')); }
}
const src = (re) => re.test(html);

const env = makeEnv();
const P = env.BH;

// ==================================================================
console.log('\n=== 0. 版本 ===');
ok(/^\d+\.\d+$/.test(P.VERSION), 'VERSION 格式正確（' + P.VERSION + '）');
ok(src(new RegExp('<span id="verTxt">' + P.VERSION.replace('.', '\\.') + '<\\/span>')), '首頁徽章同步 ' + P.VERSION);
ok(P.VERSION_LOG[0].v === P.VERSION && P.VERSION_LOG[0].now === true, '版本紀錄最新一筆 = 當前版本 v' + P.VERSION);

// ==================================================================
console.log('\n=== 1. 暫停選單：回關卡清單 ===');
ok(src(/id="pmStages"/), '暫停選單有 pmStages 按鈕');
ok(!!(P.I18N['zh-TW'] && P.I18N['zh-TW']['pause.stages']), '有 pause.stages 文案');
// 每個語系都翻到
const nStages = P.LANGS.filter(function (L) { return P.I18N[L.id] && P.I18N[L.id]['pause.stages']; }).length;
ok(nStages === P.LANGS.length, P.LANGS.length + ' 個語系都有 pause.stages', nStages);
ok(!/"pause\.stages"/.test(html), '沒有殘留未翻譯的 key');
// 只有單人／RPG 才顯示，而且會跳回對應清單
ok(src(/Game\.mode !== 'solo' && Game\.mode !== 'rpg'[\s\S]{0,140}pmSt\.style\.display = 'none'/), '對戰／線上模式把按鈕藏起來');
ok(src(/Screen\.show\('rpg'\)/), 'RPG 模式回到 RPG 選單');
ok(src(/Screen\.show\('solo'\)/), '單人模式回到關卡清單');
ok(src(/Rpg\.render\) Rpg\.render\(\)/), '回 RPG 清單前會重畫地圖解鎖狀態');
ok(src(/Solo\.renderGrid\) Solo\.renderGrid\(\)/), '回單人清單前會重畫關卡格');
// 按鈕真的在 pmRestart 與 pmSettingsBtn 之間（不是塞在別的地方）
const iPause = html.indexOf('pmRestart"');
const iStages = html.indexOf('pmStages"');
const iSet = html.indexOf('id="pmSettingsBtn"');
ok(iPause > 0 && iPause < iStages && iStages < iSet, '按鈕位置在「重新開始」與「設定」之間');

// ==================================================================
console.log('\n=== 2. 主角再縮 10% ===');
ok(P.HERO_ART_SCALE === 0.81, 'HERO_ART_SCALE = 0.81（v4.32 是 .90）', P.HERO_ART_SCALE);
// v4.36：豬／青蛙／小雞再縮 5% → 高度算式尾巴多一個 heroSizeK()
ok(src(/const rigH = R \* 3\.75 \* HERO_ART_SCALE \* heroSizeK\(c\.animal\);/),
  '零件骨架高度乘上 HERO_ART_SCALE（再乘角色體型係數）');
ok(src(/const H = R \* 3\.75 \* HERO_ART_SCALE \* heroSizeK\(c\.animal\);/),
  '整張圖 fallback 也乘上 HERO_ART_SCALE（再乘角色體型係數）');
ok(P.HERO_SIZE_K.pig === .95 && P.HERO_SIZE_K.frog === .95 && P.HERO_SIZE_K.chick === .95,
  '豬／青蛙／小雞都是 0.95（縮 5%）');
ok(P.heroSizeK('pig') === .95 && P.heroSizeK('dragon') === 1, 'heroSizeK() 只縮那三隻，其他不動');
// 只縮顯示：判定半徑與腳底位置沒被動到
ok(src(/const R = T \* \.40 \* \(p\.dino \? \.82 : 1\)/), '站立時 R 仍是 T×.40（碰撞沒變小）');

// ==================================================================
console.log('\n=== 3. 第 3 大關熊貓再放大 10% ===');
// v4.37 尺寸重新配比後不再固定 2.475，改驗「熊貓仍是第 3 大關最高的一隻」
function dispH(k) { return P.enemyArtR(P.makeEnemy(3, 3, k, 1, 1)) * P.FOE_ART[k].hs; }
const S3 = ['penguin', 'crystal', 'bat', 'snowball', 'seal'];
ok(P.FOE_ART.panda.hs > 1.5 && P.FOE_ART.panda.hs < 4,
  'FOE_ART.panda.hs 存在且在合理範圍', P.FOE_ART.panda.hs);
ok(S3.every(function (k) { return dispH('panda') > dispH(k); }),
  '熊貓是第 3 大關最高的一隻（比企鵝／冰晶／蝙蝠／雪球／海豹都高）',
  S3.map(function (k) { return k + ' ' + dispH(k).toFixed(0); }).join(' / ') + ' vs panda ' + dispH('panda').toFixed(0));

// ==================================================================
console.log('\n=== 4. 第 4 大關 6 隻手繪小怪 ===');
const S4 = [['lavaslime', 'jelly'], ['lavaworm', 'inch'], ['bee', 'flap'],
['bomber', 'waddle'], ['lizard', 'skitter'], ['rockling', 'stomp']];
ok(Object.keys(P.FOE_ART).length >= 24, 'FOE_ART 至少 24 隻（v4.34 起 48 隻）', Object.keys(P.FOE_ART).length);
S4.forEach(function (pair) {
  const id = pair[0], anim = pair[1];
  const m = P.FOE_ART[id];
  ok(!!m, id + ' 有貼圖資料');
  if (!m) return;
  ok(ART.isArtOk(m.u), id + ' 指向真實的 spr/*.webp');
  ok(ART.artFile(m.u).length > 6000, id + ' 圖檔不是空殼（' + Math.round(ART.artFile(m.u).length / 1024) + 'KB）');
  ok(m.anim === anim, id + ' 動作 = ' + anim, m.anim);
  ok(m.hs > 1.2 && m.hs < 3.2, id + ' 顯示倍率合理（' + m.hs + '）');
  ok(Math.abs(m.dir) === 1, id + ' dir 是 ±1', m.dir);
  ok(m.asp > 0.4 && m.asp < 2.6, id + ' 長寬比合理（' + m.asp + '）');
  const sp = P.speciesOf(id);
  ok(!!sp && sp.stage === 4, id + ' 在圖鑑第 4 大關');
});
ok(P.STAGE_ROSTER[3].join(',') === 'lavaslime,lavaworm,bee,bomber,lizard,rockling',
  'STAGE_ROSTER 第 4 關名單一致');

// ==================================================================
console.log('\n=== 5. 龍坐騎換手繪圖 ===');
ok(!!P.MOUNT_ART, '有 MOUNT_ART');
ok(Object.keys(P.MOUNT_ART).length === 3, 'MOUNT_ART 有三張（綠龍／紅龍／鴕鳥 v4.87）', Object.keys(P.MOUNT_ART).join(','));
['green', 'red'].forEach(function (k) {
  const m = P.MOUNT_ART[k];
  ok(!!m, k + ' 有資料');
  if (!m) return;
  ok(ART.isArtOk(m.u), k + ' 指向真實的 spr/*.webp');
  ok(ART.artFile(m.u).length > 20000, k + ' 圖檔不是空殼（' + Math.round(ART.artFile(m.u).length / 1024) + 'KB）');
  ok(m.dir === 1, k + ' 原圖朝右');
  ok(m.asp > 1.0 && m.asp < 1.4, k + ' 長寬比合理（' + m.asp + '）');
});
ok(!!P.MountArt && P.MountArt.readyCount() >= 0, 'MountArt 載入器存在');
// 走新圖，舊的拆件骨架留著當備援
ok(src(/drawMountSprite\(ctx, red \? 'red' : 'green'/), 'drawDino 優先用新貼圖');
ok(src(/drawMountSprite\(g, key, x, footY, H, side, a\)/), '有 drawMountSprite 實作');
ok(src(/drewMount \? .* : drawRigChar\(ctx, 'dragon'/), '沒有新圖時退回舊骨架');
// 體積 -15%
ok(src(/const DH = T \* \(red \? 1\.82 : 1\.70\);/), '坐騎高度 -15%（2.00→1.70、2.14→1.82）');
// 騎乘者 +20%
ok(src(/const R = T \* \.40 \* \(p\.dino \? \.82 : 1\)/), '騎乘者 R = T×.40×.82（原本 .62）');
// 紅光暈整段移除
ok(!/hue-rotate\(-118deg\)/.test(html), '移除舊的 hue-rotate 換色（紅龍改用獨立圖）');
ok(!/rgba\(255,100,60,/.test(html), '移除紅龍邊緣紅光圈');
ok(!/'rgba\(255,80,50,\.85\)'/.test(html), '移除紅龍 shadowBlur 發光');
// 用顏色真的不一樣（兩張獨立圖，不是同一張）
ok(P.MOUNT_ART.green.u !== P.MOUNT_ART.red.u, '原色／紅色是兩張不同的圖');

// ==================================================================
console.log('\n=== 6. 回歸：還能跑 ===');
ok(typeof P.enemyArtR === 'function', 'enemyArtR 還在');
const e = { spec: 'lavaslime', r: 15, dirName: 'right' };
const R = P.enemyArtR(e);
ok(R > 10 && R < 40, '第 4 關小怪外型半徑正常（' + R.toFixed(2) + '）');
ok(P.speciesOf('lavaslime').stage === 4, '圖鑑分組正確');
ok(src(/MountArt\.load\(\);/), '開機會載入坐騎圖');

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' v4.33：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
