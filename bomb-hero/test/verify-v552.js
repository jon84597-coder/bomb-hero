// test/verify-v552.js —— v5.52：爆爆王按鍵控制面板
//   ① 檔案本體（存在 / LF / 不污染主檔預算）
//   ② 兩套鍵位內容（經典照《爆爆王》預設；現代 = 主檔 DEF_KEYS1）
//   ③ 1P／2P 互補（同一套裡不撞鍵、兩套之間方向鍵對調）
//   ④ 對照表（功能 / 預設按鍵 / 說明 三欄，照使用者給的圖）
//   ⑤ 面板掛點（首頁 chip、設定頁入口、離線快取、主檔載入順序）
//   ⑥ 版本戳記
const SB = require('./_sandbox');
const fs = require('fs'), path = require('path');
const env = SB.makeEnv();
const P = env.BH;
try { P.WeekMod.pin([]); } catch (e) {}

const MOD = require('../js/keys-ui.js');
const KF = path.join(__dirname, '..', 'js', 'keys-ui.js');
const RAW = fs.readFileSync(KF, 'utf8');
const SRC = SB.rawHtml;

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log('  ✓ ' + m); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }
function keysOf(m) { return MOD.K_ORDER.map(function (k) { return m[k]; }); }

/* ================================================================ ① */
head('① 檔案本體');
{
  ok(fs.existsSync(KF), 'js/keys-ui.js 存在');
  const buf = fs.readFileSync(KF);
  ok(buf.length > 6000, '檔案有內容（' + buf.length + ' bytes）');
  ok(buf.indexOf('\r\n') < 0, '整檔 LF（沒有 CRLF）');
  ok(/^\s*\(function\s*\(\s*\)\s*\{/m.test(RAW), '是獨立 IIFE，不會漏變數到全域');
  ok(RAW.indexOf('module.exports') > 0, '有 module.exports（node 測試可直接 require 純函式）');
  ok(RAW.indexOf('document') > 0 && RAW.indexOf('return;\n  }') > 0,
    '瀏覽器分支與 node 分支分開（node 端不會碰到 document）');

  // 主檔預算：這支完全外置，不佔 1,950,000
  const html = require('./_sandbox').rawHtml;
  ok(html.indexOf('id="bhKeys"') < 0, '面板 HTML 不在主檔裡（外置，主檔只剩 ' +
    (2400000 - html.length) + ' 字元）');
}

/* ================================================================ ② */
head('② 兩套鍵位內容');
{
  const c1 = MOD.CLASSIC[1], c2 = MOD.CLASSIC[2], m1 = MOD.MODERN[1], m2 = MOD.MODERN[2];

  ok(c1.up === 'ArrowUp' && c1.down === 'ArrowDown' && c1.left === 'ArrowLeft' && c1.right === 'ArrowRight',
    '經典：方向鍵移動（↑ ↓ ← →）', keysOf(c1));
  ok(c1.act === 'Space', '經典：Space 放炸彈');
  ok(c1.det === 'ControlLeft', '經典：Ctrl 引爆（道具格 1）');
  ok(c1.fire === 'AltLeft', '經典：Alt 坐騎招式（道具格 2）');

  // 現代＝主檔原本的預設（v5.11 起），不能自己另創一套
  const d1 = P.DEF_KEYS1 || {};
  ok(MOD.sameMap(m1, d1), '現代：與主檔 DEF_KEYS1 完全一致（' + keysOf(m1).join(' / ') + '）');
  const d2 = P.DEF_KEYS2 || {};
  ok(MOD.sameMap(m2, d2), '現代：2P 與主檔 DEF_KEYS2 完全一致');

  ok(MOD.K_ORDER.length === 7 && MOD.K_ORDER.join(',') === 'up,down,left,right,act,det,fire',
    '七個動作鍵（上下左右／放彈／引爆／坐騎）');
  ok(Object.keys(MOD.CLASSIC[1]).length === 7 && Object.keys(MOD.MODERN[1]).length === 7,
    '兩套都剛好七個鍵，沒有多餘欄位');
}

/* ================================================================ ③ */
head('③ 1P／2P 互補（同機對戰不撞鍵）');
{
  function dupIn(a, b) {
    const hit = [];
    MOD.K_ORDER.forEach(function (k) {
      if (a[k] && b[k] && a[k] === b[k]) hit.push(k + ':' + a[k]);
    });
    return hit;
  }
  const dupC = dupIn(MOD.CLASSIC[1], MOD.CLASSIC[2]);
  ok(dupC.length === 0, '經典：1P 與 2P 沒有共用同一顆鍵', dupC);
  const dupM = dupIn(MOD.MODERN[1], MOD.MODERN[2]);
  ok(dupM.length === 0, '現代：1P 與 2P 沒有共用同一顆鍵', dupM);

  // 方向鍵剛好對調：一套吃方向鍵，另一套就吃 WASD
  const dirs = ['up', 'down', 'left', 'right'];
  const cOnes = dirs.every(function (k) { return /^Arrow/.test(MOD.CLASSIC[1][k]); });
  const cTwo = dirs.every(function (k) { return /^Key[WASD]$/.test(MOD.CLASSIC[2][k]); });
  const mOnes = dirs.every(function (k) { return /^Key[WASD]$/.test(MOD.MODERN[1][k]); });
  const mTwo = dirs.every(function (k) { return /^Arrow/.test(MOD.MODERN[2][k]); });
  ok(cOnes && cTwo, '經典：1P 方向鍵、2P WASD（對調）');
  ok(mOnes && mTwo, '現代：1P WASD、2P 方向鍵（對調）');

  // 只有 1P 吃滑鼠
  const mouse = MOD.K_ORDER.filter(function (k) { return /^Mouse/.test(MOD.MODERN[1][k] || ''); });
  ok(mouse.length === 2, '現代 1P 有兩顆滑鼠鍵（左鍵放彈／右鍵引爆）', mouse);
  const m2mouse = MOD.K_ORDER.filter(function (k) { return /^Mouse/.test(MOD.MODERN[2][k] || ''); });
  ok(m2mouse.length === 0, '2P 不綁滑鼠（同一台電腦不共用一顆滑鼠）');

  // presetMaps 要回新物件（不能直接把手上的常數交出去，否則玩家改鍵會污染預設）
  const got = MOD.presetMaps('classic');
  ok(got.keys1 !== MOD.CLASSIC[1] && got.keys2 !== MOD.CLASSIC[2], 'presetMaps 回傳複本，不是常數本身');
  got.keys1.up = 'KeyZ';
  ok(MOD.CLASSIC[1].up === 'ArrowUp', '改複本不會污染 CLASSIC 常數');
}

/* ================================================================ ④ */
head('④ 判定與對照表');
{
  ok(MOD.presetOf(MOD.CLASSIC[1]) === 'classic', 'keys1＝經典 → 判定 classic');
  ok(MOD.presetOf(MOD.MODERN[1]) === 'modern', 'keys1＝現代 → 判定 modern');
  ok(MOD.presetOf({}) === 'custom', '空的 keys1 → 判定 custom');
  ok(MOD.presetOf({ up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', act: 'KeyJ', det: 'KeyK', fire: 'KeyL' }) === 'custom',
    '手改過的鍵位 → 判定 custom（不會誤標成某套預設）');

  const R = MOD.ROWS;
  ok(R.classic.length === 5 && R.modern.length === 5, '兩張對照表各 5 列（功能 / 預設按鍵 / 說明）');
  ok(R.classic.every(function (r) { return r.length === 3 && r[0] && r[1] && r[2]; }),
    '每列都是三欄（功能 / 預設按鍵 / 說明）');
  const txt = function (w) { return R[w].map(function (r) { return r.join('|'); }).join('\n'); };
  const ct = txt('classic'), mt = txt('modern');
  ok(/移動方向\|\s*↑ ↓ ← →/.test(ct), '經典表：移動方向＝↑ ↓ ← →');
  ok(/放炸彈\|\s*Space/.test(ct), '經典表：放炸彈＝Space');
  ok(/衝刺\|\s*Shift/.test(ct), '經典表：衝刺＝Shift');
  ok(/引爆\|\s*Ctrl/.test(ct), '經典表：引爆＝Ctrl');
  ok(/坐騎招式\|\s*Alt/.test(ct), '經典表：坐騎招式＝Alt');
  ok(/移動方向\|\s*W A S D/.test(mt), '現代表：移動方向＝W A S D');
  ok(/放炸彈\|\s*滑鼠左鍵/.test(mt), '現代表：放炸彈＝滑鼠左鍵');
  ok(/引爆\|\s*滑鼠右鍵/.test(mt), '現代表：引爆＝滑鼠右鍵');
}

/* ================================================================ ⑤ */
head('⑤ 面板掛點與快取');
{
  ok(/<script src="js\/keys-ui\.js"><\/script>/.test(SRC), '主檔有載入 js/keys-ui.js');
  const at = SRC.indexOf('<script src="js/keys-ui.js"></script>');
  const mainEnd = SRC.lastIndexOf('</script>', at - 1);   // 主程式那個 </script>
  ok(at > 0 && mainEnd > 0 && at > mainEnd, '載入位置在主程式之後（__BH 已經準備好）');
  ok(SRC.indexOf('id="acctModal"') > at, '在帳號彈窗那段 HTML 之前（先載模組再放 DOM，順序無所謂但要固定）');

  // 面板元素由 JS 建立 —— 斷言建立邏輯與 class 名稱
  ok(/root\.id = 'bhKeys'/.test(RAW), '面板容器 id=bhKeys');
  ok(/data-p="classic"/.test(RAW) && /data-p="modern"/.test(RAW), '兩張方案卡（classic / modern）');
  ok(/#bhKeys\.on\{display:flex\}/.test(RAW), 'CSS：.on 才顯示（預設不佔畫面）');
  ok(/z-index:1310/.test(RAW), 'z-index 1310（壓得過 #bhModal 的 1250）');

  ok(/getElementById\('quickRow'\)/.test(RAW) && /b\.id = 'btnKeys'/.test(RAW),
    '首頁 #quickRow 會插入一顆 🕹️ 按鍵');
  // v5.54：chip 文字改走字典（kx.btn），繁中只是後備值 → 兩種寫法都接受
  ok(/b\.innerHTML = '<span class="qico2">🕹️<\/span><b>' \+ T\('kx\.btn', null, '按鍵'\) \+ '<\/b>'/.test(RAW),
    'chip 文字是「🕹️ 按鍵」（v5.54 起走字典 kx.btn，繁中當後備）');
  ok(/getElementById\('paneCtrl'\)/.test(RAW) && /bhkSetBtn/.test(RAW),
    '設定 → 操作設定 最上面也有一顆入口');
  ok(/insertBefore\(box, pane\.firstChild\)/.test(RAW), '設定頁入口插在 paneCtrl 最前面（最明顯）');

  // 行為：點卡就套用；改鍵會標成 custom；ESC 取消
  ok(/function applyPreset\(/.test(RAW) && /P\.settings\.keys1 = m\.keys1/.test(RAW),
    '點方案卡 → 直接改 settings.keys1（立即生效，不用重開）');
  ok(/P\.settings\.keys2 = m\.keys2/.test(RAW), '同時改 2P（互補，不撞鍵）');
  ok(/P\.settings\.keyPreset = which/.test(RAW), '記住目前是哪一套（keyPreset）');
  ok(/P\.settings\.keyPreset = 'custom'/.test(RAW), '手動改鍵 → 標成 custom');
  ok(/if \(e\.code === 'Escape'\) \{ stopCap\(\); return; \}/.test(RAW), '改鍵中按 ESC 取消');
  ok(/repaintSettings/.test(RAW) && /P\.renderKeyRow/.test(RAW),
    '套用後會重繪設定頁的按鍵列（兩邊顯示一致）');

  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  ok(/'\.\/js\/keys-ui\.js'/.test(sw), 'sw.js 離線快取有列 js/keys-ui.js（斷網也開得了面板）');
  const swm = /SW_VERSION = 'v([0-9.]+)'/.exec(sw);
  ok(swm && parseFloat(swm[1]) >= 5.52, 'sw.js SW_VERSION ≥ v5.52（' + (swm ? swm[1] : '?') + '）');
}

/* ================================================================ ⑥ */
head('⑥ 版本戳記');
{
  ok(parseFloat(P.VERSION) >= 5.52, 'VERSION ≥ 5.52（實際 ' + P.VERSION + '）');
  const vlog = fs.readFileSync(path.join(__dirname, '..', 'js', 'version-log.js'), 'utf8');
  // v5.53：改成動態 —— 每升一版都要回來改寫死的版號太痛（鐵律：版本斷言別寫死）。
  const _ver = P.VERSION.replace(/\./g, '\\.');
  ok(new RegExp("v: '" + _ver + "'[\\s\\S]{0,400}now: true").test(vlog), 'VERSION_LOG 有 ' + P.VERSION + ' 且 now:true');
  ok(!/v: '5\.52'[\s\S]{0,300}now: true/.test(vlog), '5.52 已改成 now:false');
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8'));
  ok(parseFloat(pkg.version) >= 5.52, 'package.json 版本 ≥ 5.52（' + pkg.version + '）');
  ok(new RegExp('測試版 v<span id="verTxt">' + P.VERSION + '</span>').test(SRC), '首頁版本文字 = ' + P.VERSION);
  const html = SRC;
  ok(new RegExp('id="verLogVer">' + P.VERSION + '<').test(html), '「版本更新內容」標題 = ' + P.VERSION);
}

console.log('\n' + (fail ? '❌' : '✅') + ' v5.52：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
