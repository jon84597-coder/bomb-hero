// test/verify-v471.js —— v4.71：轉橫屏格子大小一致 / 小地圖挪到左上 / 縮放不再被轉屏扯爆
const path = require('path');
const { makeEnv, html } = require('./_sandbox');

let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ FAIL: ' + m); } }

const src = html;
const env0 = makeEnv({ runTimers: true });
const P0 = env0.BH, G0 = env0.G;

// 量一個尺寸的格子大小
function T_at(w, h, mapMode, stage) {
  const env = makeEnv({ runTimers: true });
  env.getId('body').classList.add('touch');
  const c = env.getId('cv');
  c.clientWidth = w; c.clientHeight = h;
  env.getId('stageWrap').clientWidth = w;
  env.getId('stageWrap').clientHeight = h;
  ['resize', 'orientationchange'].forEach(t => (env.listeners[t] || []).forEach(f => { try { f(); } catch (e) {} }));
  if (mapMode) env.BH.settings.mapMode = mapMode;
  env.BH.startSolo(stage || 3, false);
  return { T: env.G.T, cols: env.G.cols, rows: env.G.rows, bigMap: !!env.G.bigMap, env: env };
}

console.log('\n=== 1. 直放 / 橫放：同一個短邊 → 同樣的格子大小 ===');
[['390×844 手機', 390, 844], ['430×932 大手機', 430, 932], ['375×812', 375, 812]].forEach(function (a) {
  const n = a[0], w = a[1], h = a[2];
  const pt = T_at(w, h, null, 3);
  const ld = T_at(h, w, null, 3);
  ok(pt.T === ld.T, n + ' 基本地圖：直放 T=' + pt.T + ' / 橫放 T=' + ld.T);
  const pr = T_at(w, h, 'random', 30);
  const lr = T_at(h, w, 'random', 30);
  ok(pr.T === lr.T, n + ' 隨機大圖：直放 T=' + pr.T + ' / 橫放 T=' + lr.T + '（' + pr.cols + '×' + pr.rows + '）');
});

console.log('\n=== 2. 橫放不再「整張塞進畫面」→ 不會退到 18px／格 ===');
(function () {
  const lr = T_at(844, 390, 'random', 30);
  ok(lr.T >= 24, '844×390 橫放隨機圖 T=' + lr.T + '（≥24，舊版是 18）');
  ok(lr.T * lr.rows > 390, '地圖高度 ' + (lr.T * lr.rows) + ' > 390 → 靠相機上下跟隨（角色大小才跟直放一致）');
  const pr = T_at(390, 844, 'random', 30);
  ok(pr.T === lr.T, '同一台裝置轉屏，格子大小不變（' + pr.T + '）');
})();

console.log('\n=== 3. 小地圖改到左上，不會被 ⏸／⛶ 擋住 ===');
(function () {
  ok(/return \{ x: 8, y: 8, w: w, h: h \};/.test(src), 'miniMapBox() 固定回左上 (8,8)');
  const env = makeEnv({ runTimers: true });
  env.getId('body').classList.add('touch');
  const c = env.getId('cv'); c.clientWidth = 844; c.clientHeight = 390;
  env.BH.settings.mapMode = 'random';
  env.BH.startSolo(30, false);
  env.G.state = 'play';
  const box = env.BH.miniMapBox();
  ok(box.x === 8 && box.y === 8, '小地圖位置 x=8 y=8（' + box.w + '×' + box.h + '）');
  // 右上兩個觸控鈕：.tpause right:16 top:12 46×46；.tfs right:16 top:64 44×44
  const btnL = 844 - 16 - 46, btnR = 844 - 16, btnT = 12, btnB = 64 + 44;
  const overlap = !(box.x + box.w < btnL || box.x > btnR || box.y + box.h < btnT || box.y > btnB);
  ok(!overlap, '與右上 ⏸／⛶（x ' + btnL + '~' + btnR + '、y ' + btnT + '~' + btnB + '）不重疊');
  ok(box.x + box.w < 844 / 2, '整個小地圖留在左半邊');
})();

console.log('\n=== 4. 縮放：轉屏（版面重排）不再把 zoom 扯到 210% / 42% ===');
(function () {
  const env = makeEnv();
  const wrap = env.getId('stageWrap');
  const dn = wrap._on['pointerdown'][0], mv = wrap._on['pointermove'][0], up = wrap._on['pointerup'][0];
  const noBtn = { closest: () => null };
  const pe = (id, x, y) => ({ pointerId: id, clientX: x, clientY: y, pointerType: 'touch', target: noBtn, preventDefault() {}, cancelable: true });
  dn(pe(1, 100, 200)); dn(pe(2, 250, 200));
  ok(env.G.zoomTarget === 1, '兩指按下後基準仍是 100%');
  mv(pe(2, 600, 300));                       // 版面重排：座標整組跑掉
  ok(Math.abs(env.G.zoomTarget - 1) < .01, '單一事件距離暴增 → 不套用（維持 ' + Math.round(env.G.zoomTarget * 100) + '%）');
  mv(pe(2, 640, 300));
  ok(Math.abs(env.G.zoomTarget - 1) < .01, '連續第二次也不會偷偷放大（仍 ' + Math.round(env.G.zoomTarget * 100) + '%）');
  up(pe(2, 640, 300)); up(pe(1, 100, 200));
})();

console.log('\n=== 5. 正常捏合仍然有效（不能把好手勢一起擋掉） ===');
(function () {
  const env = makeEnv();
  const wrap = env.getId('stageWrap');
  const dn = wrap._on['pointerdown'][0], mv = wrap._on['pointermove'][0];
  const noBtn = { closest: () => null };
  const pe = (id, x, y) => ({ pointerId: id, clientX: x, clientY: y, pointerType: 'touch', target: noBtn, preventDefault() {}, cancelable: true });
  dn(pe(1, 100, 200)); dn(pe(2, 200, 200));   // 相距 100
  for (let i = 1; i <= 6; i++) mv(pe(2, 200 + i * 10, 200));   // 慢慢拉開到 160
  ok(env.G.zoomTarget > 1.3, '緩慢拉開 → 正常放大（' + Math.round(env.G.zoomTarget * 100) + '%）');
  const z = env.G.zoomTarget;
  for (let i = 1; i <= 6; i++) mv(pe(2, 260 - i * 10, 200));   // 收回
  ok(env.G.zoomTarget < z, '收回 → 正常縮小（' + Math.round(env.G.zoomTarget * 100) + '%）');
})();

console.log('\n=== 6. resizeView 尺寸真的變了才重取基準 ===');
(function () {
  ok(/if \(Math\.abs\(w - wasW\) > 2 \|\| Math\.abs\(h - wasH\) > 2\) \{/.test(src),
     '只有寬或高變化 >2px 才 rebase（loop 每 0.4s 呼叫不會亂清）');
  ok(/try \{ Zoom\.rebase\(\); \} catch \(e\) \{\}/.test(src), 'rebase 有 try 包住（boot 期間 Zoom 還沒建立也不會炸');
  ok(/function rebase\(\) \{[\s\S]{0,120}?pinchD = 0;/.test(src), 'rebase 會清掉所有指標並歸零基準距離');
});

console.log('\n=== 7. 新關卡把極端縮放收回 100% ===');
(function () {
  ok(/if \(Math\.abs\(Game\.zoomTarget - 1\) > \.34\) Zoom\.reset\(\);/.test(src),
     'beginCountdown 會把「被誤觸到極端」的縮放歸 100%');
  const env = makeEnv();
  env.G.zoomTarget = 2.1;
  env.BH.startSolo(3, false);
  ok(Math.abs(env.G.zoomTarget - 1) < .01, '從 210% 開新關卡 → 回到 ' + Math.round(env.G.zoomTarget * 100) + '%');
  const env2 = makeEnv();
  env2.G.zoomTarget = 1.15;                  // 玩家自己微調的，不要動
  env2.BH.startSolo(3, false);
  ok(Math.abs(env2.G.zoomTarget - 1.15) < .01, '小幅度的偏好縮放會保留（' + Math.round(env2.G.zoomTarget * 100) + '%）');
});

console.log('\n=== 8. 版本 ===');
(function () {
  const v = (src.match(/const VERSION = '([^']+)'/) || [])[1];
  // v4.71 之後版本還會往上加 → 只驗「有沒有跟上 4.71 以上」，不鎖死版號
  ok(parseFloat(v) >= 4.71, 'VERSION ≥ 4.71（實際 ' + v + '）');
  ok(new RegExp('id="verTxt">' + v.replace('.', '\\.') + '<\\/span>').test(src), '首頁版本文字同步（' + v + '）');
  ok(new RegExp('id="verLogVer">' + v.replace('.', '\\.') + '<\\/span>').test(src), '版本紀錄標題同步（' + v + '）');
  ok(/\{ v: '4\.71', date: '[^']+', now: false/.test(src), 'VERSION_LOG 收了 4.71（後續版本已接手 now:true）');
  const sw = require('fs').readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  const m = sw.match(/SW_VERSION = '([^']+)'/);
  ok(m && /^v\d+\.\d+\.\d+$/.test(m[1]), 'sw.js 版本格式正確且已升版（實際 ' + (m && m[1]) + '）');
})();

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' v4.71：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
