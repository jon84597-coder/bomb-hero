// test/verify-v553.js —— v5.53：架構重整（主程式外置 / SW 分級預熱 / 新手任務）
//   ① index.html 只剩 HTML＋CSS，主邏輯在 js/main.js
//   ② 載入順序：i18n → version-log → main → keys-ui → onboard
//   ③ 沙盒內聯回填（151 支舊測試不用改就還能抓到主邏輯）
//   ④ Service Worker：CORE 收錄新檔、預熱分三桶、P0 全速 / P1 P2 讓頻寬
//   ⑤ 新手任務：7 個里程碑、讀存檔推算狀態、領獎真的加金幣、首頁卡片掛得上
//   ⑥ 版本戳記
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const SB = require('./_sandbox');

const ROOT = path.join(__dirname, '..');
const env = SB.makeEnv();
const P = env.BH;
const rawIndex = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const mainJs = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');
const onbSrc = fs.readFileSync(path.join(ROOT, 'js', 'onboard.js'), 'utf8');
const swJs = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');

let pass = 0, fail = 0;
function ok(c, n, x) {
  if (c) { pass++; console.log('  ✓ ' + n + (x === undefined ? '' : '（' + x + '）')); }
  else { fail++; console.log('  ✗ FAIL: ' + n + (x === undefined ? '' : '（' + x + '）')); }
}

// ================================================================
console.log('=== ① index.html 只剩外殼 ===');
// ================================================================
const idxChars = rawIndex.length;
ok(idxChars < 420000, 'index.html 字元數 ' + idxChars + ' < 420,000（原本 1,948,263）');
ok(rawIndex.indexOf('function updateBoss') < 0, '主邏輯已不在 index.html（找不到 updateBoss）');
ok(rawIndex.indexOf('function drawBRDrop') < 0, '大逃殺繪製也不在 index.html');
ok(/<style[\s\S]*<\/style>/.test(rawIndex), 'CSS 仍內嵌（避免多一次請求）');
ok(mainJs.length > 1200000, 'js/main.js 有 ' + mainJs.length + ' 字元（主邏輯本體）');
ok(mainJs.indexOf('function updateBoss') > 0, 'updateBoss 在 js/main.js');
ok((mainJs.match(/\r/g) || []).length === 0, 'js/main.js 是 LF（CR 0）');
ok((rawIndex.match(/\r/g) || []).length === 0, 'index.html 是 LF（CR 0）');

// ================================================================
console.log('=== ② 載入順序 ===');
// ================================================================
const at = (s) => rawIndex.indexOf(s);
const i18nAt = at('<script src="js/i18n-src.js"></script>');
const vlogAt = at('<script src="js/version-log.js"></script>');
const mainAt = at('<script src="js/main.js"></script>');
const keysAt = at('<script src="js/keys-ui.js"></script>');
const onbAt = at('<script src="js/onboard.js"></script>');
/* v5.63：版本紀錄（181 KB）改成點開面板才動態載入 → 不再出現在同步清單裡。 */
ok(i18nAt > 0, '字典在最前（主程式要用 __I18N_SRC）');
ok(vlogAt < 0, '版本紀錄不在同步清單（v5.63 起點開面板才載入）');
ok(mainAt > i18nAt, '主程式在字典之後（要用 __I18N_SRC）');
ok(keysAt > mainAt, '按鍵面板在主程式之後（它要讀 __BH.settings）');
ok(onbAt > mainAt, '新手任務在主程式之後（它要讀 __BH.Shop）');
ok(!/js\/main\.js[^>]*\bdefer\b/.test(rawIndex), 'main.js 沒有 defer（key-ui／onboard 依賴它的執行順序）');
ok((rawIndex.match(/<script(?![^>]*src=)/g) || []).length === 1, '真實 index.html 只剩 1 個 inline script（PWA 前置）');

// ================================================================
console.log('=== ③ 沙盒內聯回填（舊測試相容） ===');
// ================================================================
ok(SB.rawHtml.indexOf('function updateBoss') > 0, 'rawHtml 回填後有主邏輯');
ok(SB.rawHtml.indexOf('js/main.js"></script>') < 0, '回填後看不到 <script src="js/main.js"> 的原始標籤');
ok(/^<!DOCTYPE html>/i.test(SB.rawHtml), '回填後仍以 DOCTYPE 開頭');
ok(/\n<\/script>/.test(SB.rawHtml), '回填後的 script 有正常收尾');
ok(typeof P.render === 'function' && typeof P.updateSolo === 'function', '沙盒跑起來後主迴圈函式都在');
ok(SB.rawHtml.length < 2400000, '合併後全文 ' + SB.rawHtml.length + ' < 2,400,000（防爆炸成長）');

// ================================================================
console.log('=== ④ Service Worker：CORE＋分級預熱 ===');
// ================================================================
ok(swJs.indexOf("'./js/main.js'") > 0, 'CORE 收錄 js/main.js（離線也要開得起來）');
ok(swJs.indexOf("'./js/onboard.js'") > 0, 'CORE 收錄 js/onboard.js');
ok(/function warmBucket\s*\(/.test(swJs), '有 warmBucket 分桶');
ok(/\/\^\(br-\|nuke-\|drop-\)\//.test(swJs), '大逃殺素材（br- / nuke- / drop-）被判到最後一批');
// v5.63：四級分桶 —— BOSS 與怪物同一級（第一關只遇得到幾種，其餘 80ms 後補上）
ok(/\^\(foe-\|boss-\)\//.test(swJs), '章節 BOSS（boss-）被判到第二級');
ok(/return 0;/.test(swJs), '其餘（角色／炸彈／地形）是第一批');
ok(/Math\.floor\(list\.length \* 0\.95\)/.test(swJs), '完成判定改成比例（不再寫死 150 張）');
// v5.63：P1 縮到 80ms（怪物圖晚 1 秒才到就會看到程序繪製的替代圖）
ok(/setTimeout\(next, at < len1 \? 80 : at < len2 \? 400 : 1200\)/.test(swJs),
  'P1 讓 80ms、P2 400ms、P3 1200ms（不跟正在玩的關卡搶頻寬）');
ok(/buckets\[0\]\.concat\(buckets\[1\], buckets\[2\], buckets\[3\]\)/.test(swJs), '抓取順序是 P0 → P1 → P2 → P3');

// ================================================================
console.log('=== ⑤ 新手任務 ===');
// ================================================================
const body = env.getId('body');
const qr = env.getId('quickRow');
qr.parentNode = body;                       // 沙盒沒有真 DOM，卡片掛載需要這個
try {
  vm.runInContext(onbSrc, env.sandbox, { filename: 'js/onboard.js' });
} catch (e) {
  ok(false, 'onboard.js 能在沙盒裡跑起來', String(e && e.message).slice(0, 60));
}
const OB = env.sandbox.window.BHOnboard;
ok(!!OB, '匯出 window.BHOnboard');

if (OB) {
  ok(OB.TASKS.length === 7, '7 個里程碑（實際 ' + OB.TASKS.length + '）');
  ok(OB.FINAL_GOLD === 5000, '全部完成加碼 5000 金幣');
  ok(OB.TASKS.every(function (t) { return t.gold > 0 && t.name && t.tip; }), '每一步都有金幣與提示文案');

  // 全新玩家：一關都沒過
  env.storage['bombhero-stage'] = '1';
  ok(OB.clearedCount() === 0, 'stage=1 → 已通關 0 關');
  ok(OB.TASKS.every(function (t) { return OB.stateOf(t) === 'todo' || t.id === 'd1'; }),
    '全新玩家：進度類任務全部未完成');

  // 打到第 6 關（通過 5 關 → 含第 1 章 BOSS）
  env.storage['bombhero-stage'] = '6';
  ok(OB.clearedCount() === 5, 'stage=6 → 已通關 5 關');
  const st = {};
  OB.TASKS.forEach(function (t) { st[t.id] = OB.stateOf(t); });
  ok(st.c1 === 'ready' && st.c3 === 'ready' && st.b1 === 'ready', '第 1／3／5(BOSS) 關變成可領取');
  ok(st.c10 === 'todo' && st.c15 === 'todo' && st.c20 === 'todo', '第 10／15／20 關還沒到');
  ok(OB.readyCount() === 3, '可領取數 = 3（實際 ' + OB.readyCount() + '）');

  // 領獎：金幣要真的增加
  let before = 0, after = 0;
  try { before = P.Shop.gold(); } catch (e) {}
  OB.claim('c1');
  try { after = P.Shop.gold(); } catch (e) {}
  ok(after - before === 300, '領第 1 關獎勵 → 金幣 +300（實際 ' + (after - before) + '）');
  ok(OB.stateOf(OB.TASKS[0]) === 'got', '領完標記成已領（不能重複領）');
  const mid = P.Shop.gold();
  OB.claim('c1');
  ok(P.Shop.gold() === mid, '再點一次不會重複發金幣');

  // 領取紀錄要寫進 localStorage（重開遊戲還在）
  ok((env.storage['bombhero-onb-v1'] || '').indexOf('c1') >= 0, '領取紀錄存進 localStorage');

  // 首頁卡片
  //   注意：沙盒的 createElement 不會把新節點註冊進 getId 的索引（那是給 HTML 裡寫死的 id 用的），
  //   所以要從 body.children 反查，不能 env.getId('bhoCard')。
  function findCard() {
    const bs = body.children || [];
    for (let i = 0; i < bs.length; i++) if (bs[i] && bs[i].id === 'bhoCard') return bs[i];
    return null;
  }
  const card = findCard();
  ok(!!card, '首頁插進新手卡片 #bhoCard');
  ok(!!card && card.parentNode === body, '卡片掛在 quickRow 的父節點上（不塞進 quickRow 擠壞四顆 chip）');
  ok(!!card && String(card.innerHTML || '').indexOf('新手任務') >= 0, '卡片標題是「新手任務」');

  // 面板
  OB.open();
  const panel = env.getId('bhOnb');
  ok(!!panel, '面板 #bhOnb 建立得起來');
  ok(OB.isOpen() === true, 'open() 之後是開啟狀態');
  OB.close();
  ok(OB.isOpen() === false, 'close() 之後關起來');

  // 全部領完 → 卡片退休
  const got2 = {};
  OB.TASKS.forEach(function (t) { got2[t.id] = 1; });
  env.storage['bombhero-onb-v1'] = JSON.stringify(got2);
  OB.refreshCard();
  ok(OB.allGot() === true, '7 個都領完 → allGot()');
  const card2 = findCard();
  // 沙盒的 classList 走自己的 Set，不會同步到 className → 要問 classList
  ok(!!card2 && card2.classList.contains('hide'), '全部領完 → 首頁卡片自動收起來');
}

// ================================================================
console.log('=== ⑥ 版本戳記 ===');
// ================================================================
ok(parseFloat(P.VERSION) >= 5.53, 'VERSION ≥ 5.53（實際 ' + P.VERSION + '）');
const vlog = fs.readFileSync(path.join(ROOT, 'js', 'version-log.js'), 'utf8');
/* v5.54：改成「跟著 P.VERSION 走」—— 寫死 5.53 的話每升一版就要回來改這支。 */
ok(new RegExp("v: '" + P.VERSION.replace(/\./g, '\\.') + "'[\\s\\S]{0,600}now: true").test(vlog),
  'VERSION_LOG 有當前版本（' + P.VERSION + '）且 now:true');
ok(!/v: '5\.52'[\s\S]{0,400}now: true/.test(vlog), '5.52 已改成 now:false');
ok(/v: '5\.53'[\s\S]{0,2400}新手任務/.test(vlog), '5.53 的更新內容提到新手任務');
const swm = swJs.match(/SW_VERSION = 'v([\d.]+)'/);
ok(swm && parseFloat(swm[1]) >= 5.53, 'sw.js SW_VERSION ≥ 5.53（' + (swm ? swm[1] : '?') + '）');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, '..', 'package.json'), 'utf8'));
ok(parseFloat(pkg.version) >= 5.53, 'package.json ≥ 5.53（' + pkg.version + '）');

console.log('\n' + (fail ? '❌' : '✅') + ' v5.53：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
