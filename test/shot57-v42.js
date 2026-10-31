// 瀏覽器端到端驗證 v4.2：手機移動操作雙軌
//   · 真觸控（CDP Input.dispatchTouchEvent + Emulation.setTouchEmulationEnabled）
//     驗證：任意處按下→滑動→方向、死區、滑很遠、放開停住
//   · 合成 PointerEvent（同一條瀏覽器事件路徑的下游）
//     驗證：多點觸控不互相歸零、模式 B 搖桿、編輯器拖曳
const cdp = require('./cdp');

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name + (extra === undefined ? '' : '（' + extra + '）')); }
  else { fail++; console.log('  ✗ FAIL: ' + name + (extra === undefined ? '' : '（' + extra + '）')); }
}
function tp(x, y, id) { return { x: Math.round(x), y: Math.round(y), id: id || 1, radiusX: 8, radiusY: 8, force: 1 }; }

(async () => {
  const b = await cdp.launch({ w: 1280, h: 900, port: 9432 });
  const p = await b.newPage();
  await p.resize(844, 390, true);              // 手機橫放（遊戲建議方向）
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.goto('http://127.0.0.1:3000/', 1800);
  await cdp.sleep(900);

  const down = (pts) => p.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts });
  const move = (pts) => p.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts });
  const up = (pts) => p.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: pts || [] });
  const state = () => p.eval(`(() => {
    const I = window.__BH.Input.touchState, z = document.getElementById('slideZone');
    return { ax: I.ax || 0, ay: I.ay || 0, act: !!I.action,
      dirs: window.__BH.Input.schemes.touch.dirs().join(','),
      on: z ? z.dataset.on : '' };
  })()`);
  // 在頁面內合成 pointer 事件（走向和真觸控完全一樣的 handler）
  const fire = (sel, type, x, y, id) => p.eval(`(() => {
    const el = ${sel};
    if (!el) return false;
    el.dispatchEvent(new PointerEvent('${type}', {
      pointerId: ${id || 1}, clientX: ${Math.round(x)}, clientY: ${Math.round(y)},
      bubbles: true, cancelable: true, pointerType: 'touch', isPrimary: ${(id || 1) === 1}
    }));
    return true;
  })()`);

  console.log('\n=== 1. 手機環境與模式 A 進入點 ===');
  let r = await p.eval(`(() => {
    const z = document.getElementById('slideZone').getBoundingClientRect();
    const w = document.getElementById('stageWrap').getBoundingClientRect();
    return { touch: window.__BH.IS_TOUCH, body: document.body.className,
      mode: window.__BH.padMode(), disp: getComputedStyle(document.getElementById('slideZone')).display,
      z: [Math.round(z.x), Math.round(z.width), Math.round(z.height)],
      stage: [Math.round(w.x), Math.round(w.width), Math.round(w.height)],
      padVis: getComputedStyle(document.getElementById('tpad')).visibility,
      rot: !!document.getElementById('rotHint'), ver: window.__BH.VERSION };
  })()`);
  console.log('    ' + JSON.stringify(r));
  ok(r.ver === '4.3', '版本 4.3');
  ok(r.touch === true, '手機環境被正確辨識（IS_TOUCH）');
  ok(/touch/.test(r.body), 'body 有 .touch');
  ok(r.mode === 'slide', '預設是模式 A（隱形滑動區）');
  ok(r.disp === 'block', '滑動區已啟用（display:block）');
  ok(r.padVis === 'hidden', '模式 A 下實體搖桿完全看不到（visibility:hidden）');
  ok(r.rot === false, '橫放不會跳「請轉向」提示');

  console.log('\n=== 2. 進入遊戲 ===');
  await p.eval("window.__BH.startSolo(1, false)");
  await cdp.sleep(500);
  await p.eval("(function(){ const b=document.querySelector('#ovBox button'); if (b) b.click(); })()");  // 按「開始」
  await cdp.sleep(4000);          // 等 3.4 秒倒數跑完，地圖真的畫出來再截圖
  ok(await p.eval("window.__BH.Game.state") === 'play', '倒數結束，遊戲進行中（state=play）');
  const zr = await p.eval(`(() => { const z = document.getElementById('slideZone').getBoundingClientRect();
    return { x: z.x, y: z.y, w: z.width, h: z.height }; })()`);
  console.log('    zone ' + JSON.stringify(zr));
  ok(zr.w > 150 && zr.h > 200, '遊戲中滑動區確實佔了半邊畫面');
  r = await p.eval(`(() => {
    const z = document.getElementById('slideZone').getBoundingClientRect();
    const w = document.getElementById('stageWrap').getBoundingClientRect();
    return { z: [Math.round(z.x), Math.round(z.width), Math.round(z.height)],
      stage: [Math.round(w.x), Math.round(w.width), Math.round(w.height)] };
  })()`);
  ok(Math.abs(r.z[1] - r.stage[1] / 2) <= 2, '滑動區寬度 = 遊戲畫面一半（' + r.z[1] + ' vs ' + r.stage[1] / 2 + '）');
  ok(Math.abs(r.z[2] - r.stage[2]) <= 2, '滑動區高度 = 整個遊戲畫面（' + r.z[2] + ' vs ' + r.stage[2] + '）');
  ok(r.z[0] === r.stage[0], '滑動區貼齊左邊界（預設左半屏）');

  console.log('\n=== 3. 真觸控：任意處按下 → 一路滑（單一手勢測完死區／轉向／滑很遠）===');
  const cx = zr.x + zr.w * 0.55, cy = zr.y + zr.h * 0.5;
  await down([tp(cx, cy, 1)]);
  await cdp.sleep(90);
  let st = await state();
  ok(st.on === '1', '手指按在空白處就被當成搖桿中心');
  ok(st.ax === 0 && st.ay === 0, '剛按下還沒滑 → 不動（死區）');

  await move([tp(cx, cy - 70, 1)]);
  await cdp.sleep(90);
  st = await state();
  ok(st.ay <= -0.5 && st.dirs === 'up', '往上滑 70px → 往上走（ay=' + st.ay.toFixed(2) + '）');

  await move([tp(cx + 4, cy - 5, 1)]);
  await cdp.sleep(90);
  st = await state();
  ok(st.ax === 0 && st.ay === 0, '位移 6.4px（< 9px 死區）→ 完全不動');

  await move([tp(cx - 30, cy, 1)]);
  await cdp.sleep(90);
  st = await state();
  ok(st.ax <= -0.5 && st.dirs === 'left', '往左滑 30px → 左走（' + st.dirs + '）');

  await move([tp(cx + 8, cy - 300, 1)]);
  await cdp.sleep(90);
  st = await state();
  ok(st.on === '1' && st.ay <= -0.5 && st.dirs === 'up', '往上滑 300px 仍然往上走（原點自動前移，沒斷線）');

  await move([tp(cx + 8, cy - 140, 1)]);
  await cdp.sleep(90);
  st = await state();
  ok(st.ay > 0.5 && st.dirs === 'down', '滑到原點另一側 → 立刻轉向（' + st.dirs + ' ay=' + st.ay.toFixed(2) + '）');

  await move([tp(cx + 8, cy - 180, 1)]);
  await cdp.sleep(90);
  st = await state();
  ok(Math.abs(st.ay) < 0.5, '回到原點附近 → 停下（ay=' + st.ay.toFixed(2) + '）');

  await p.shot('test/v42-1-slide.png');       // 放手前截圖（真觸控手勢中截圖會斷序列，這裡是最後一步）
  await up([]);
  await cdp.sleep(120);
  st = await state();
  ok(st.on === '0' && st.ax === 0 && st.ay === 0, '手指放開 → 立即停住');

  console.log('\n=== 4. 多點觸控：移動中按放彈鍵不會停 ===');
  const act = await p.eval(`(() => { const q = document.querySelector('#touchUI .tact').getBoundingClientRect();
    return { x: q.x + q.width / 2, y: q.y + q.height / 2 }; })()`);
  const px = cx, py = cy;
  await fire("document.getElementById('slideZone')", 'pointerdown', px, py, 1);
  await fire("document.getElementById('slideZone')", 'pointermove', px, py - 80, 1);
  st = await state();
  ok(st.ay <= -0.5, '第一根手指正在往上走（ay=' + st.ay.toFixed(2) + '）');
  await fire("document.querySelector('#touchUI .tact')", 'pointerdown', act.x, act.y, 2);
  st = await state();
  ok(st.act === true, '第二根手指按下放彈鍵 → 放彈鍵生效');
  ok(st.ay <= -0.5 && st.dirs === 'up', '同時仍然在往上走（軸向沒有被清掉）');
  await fire("document.querySelector('#touchUI .tact')", 'pointerup', act.x, act.y, 2);
  st = await state();
  ok(st.act === false, '放開放彈鍵');
  ok(st.ay <= -0.5 && st.dirs === 'up', '放開按鈕之後還在走（最容易寫錯的地方）');
  await fire("document.getElementById('slideZone')", 'pointerup', px, py - 80, 1);
  st = await state();
  ok(st.ax === 0 && st.ay === 0, '全部放開 → 完全停住');

  console.log('\n=== 5. 模式 B（虛擬搖桿）===');
  await p.eval("window.__BH.settings.tpad.mode='stick'; window.__BH.applyTouchLayout()");
  await cdp.sleep(300);
  r = await p.eval(`(() => {
    const pr = document.getElementById('tpad').getBoundingClientRect();
    const pad = document.getElementById('tpad');
    return { zd: getComputedStyle(document.getElementById('slideZone')).display,
      vis: getComputedStyle(pad).visibility, pe: getComputedStyle(pad).pointerEvents,
      c: [Math.round(pr.x + pr.width / 2), Math.round(pr.y + pr.height / 2)], w: Math.round(pr.width) };
  })()`);
  ok(r.zd === 'none', '模式 B → 隱形滑動區關閉');
  ok(r.vis === 'visible' && r.pe === 'auto', '模式 B → 實體搖桿出現且可操作');
  await fire("document.getElementById('tpad')", 'pointerdown', r.c[0], r.c[1], 1);
  await fire("document.getElementById('tpad')", 'pointermove', r.c[0] + r.w * 0.3, r.c[1], 1);
  st = await state();
  ok(st.ax >= 0.5 && st.dirs === 'right', '推搖桿往右 → 右走（' + st.dirs + ' ax=' + st.ax.toFixed(2) + '）');
  await fire("document.getElementById('tpad')", 'pointermove', r.c[0], r.c[1] - r.w * 0.3, 1);
  st = await state();
  ok(st.ay <= -0.5 && st.dirs === 'up', '推搖桿往上 → 上走（' + st.dirs + '）');
  await p.shot('test/v42-2-stick.png');
  await fire("document.getElementById('tpad')", 'pointerup', r.c[0], r.c[1], 1);
  st = await state();
  ok(st.ax === 0 && st.ay === 0, '放開搖桿 → 停住');
  r = await p.eval("document.getElementById('tpknob').style.transform");
  ok(/translate\(0px, ?0px\)/.test(r), '旋鈕回到中心（' + r + '）');

  console.log('\n=== 6. 自訂搖桿位置（比例定位）===');
  await p.eval("window.__BH.settings.tpad.pad={x:0.75,y:0.25}; window.__BH.applyTouchLayout()");
  await cdp.sleep(300);
  r = await p.eval(`(() => {
    const s = document.getElementById('stageWrap').getBoundingClientRect();
    const pr = document.getElementById('tpad').getBoundingClientRect();
    return {
      rx: Math.round((pr.x + pr.width / 2 - s.x) / s.width * 100),
      ry: Math.round((pr.y + pr.height / 2 - s.y) / s.height * 100),
      custom: document.getElementById('tpad').classList.contains('custom')
    };
  })()`);
  ok(r.custom === true, '#tpad 加上 .custom');
  ok(Math.abs(r.rx - 75) <= 3, '圓盤中心落在 75% 寬（實際 ' + r.rx + '%）');
  ok(Math.abs(r.ry - 25) <= 3, '圓盤中心落在 25% 高（實際 ' + r.ry + '%）');
  await p.shot('test/v42-3-custom-pos.png');
  r = await p.eval(`(() => { const pr = document.getElementById('tpad').getBoundingClientRect();
    return { c: [Math.round(pr.x + pr.width / 2), Math.round(pr.y + pr.height / 2)], w: Math.round(pr.width) }; })()`);
  await fire("document.getElementById('tpad')", 'pointerdown', r.c[0], r.c[1], 1);
  await fire("document.getElementById('tpad')", 'pointermove', r.c[0], r.c[1] - r.w * 0.3, 1);
  st = await state();
  ok(st.ay <= -0.5 && st.dirs === 'up', '自訂位置的搖桿一樣能操作（' + st.dirs + '）');
  await fire("document.getElementById('tpad')", 'pointerup', r.c[0], r.c[1], 1);

  console.log('\n=== 7. 直放（portrait）也能滑 ===');
  await p.resize(390, 844, true);
  await cdp.sleep(500);
  await p.eval("window.__BH.settings.tpad.mode='slide'; window.__BH.settings.tpad.pad=null; window.__BH.applyTouchLayout(); window.__BH.startSolo(1, false)");
  await cdp.sleep(600);
  await p.eval("(function(){ const b=document.querySelector('#ovBox button'); if (b) b.click(); })()");
  await cdp.sleep(1200);
  r = await p.eval(`(() => ({ rot: !!document.getElementById('rotHint'), body: document.body.className,
    mode: window.__BH.padMode() }))()`);
  ok(r.rot === true, '直式進遊戲會先跳「建議轉橫」提示（原本行為）');
  ok(/slidepad/.test(r.body), 'body.slidepad 仍然在（' + r.mode + '）');
  await p.eval("(function(){ const b=document.getElementById('rhOk'); if(b) b.click(); })()");
  await cdp.sleep(600);
  r = await p.eval(`(() => {
    const z = document.getElementById('slideZone').getBoundingClientRect();
    const s = document.getElementById('stageWrap').getBoundingClientRect();
    return { rot: !!document.getElementById('rotHint'), body: document.body.className,
      z: [Math.round(z.x), Math.round(z.y), Math.round(z.width), Math.round(z.height)],
      s: [Math.round(s.width), Math.round(s.height)],
      disp: getComputedStyle(document.getElementById('slideZone')).display };
  })()`);
  console.log('    ' + JSON.stringify(r));
  ok(r.rot === false, '按「知道了」關掉提示');
  ok(r.disp === 'block' && r.z[2] > 100, '直式的滑動區有正常寬度（' + r.z[2] + ' / 畫面 ' + r.s[0] + '）');
  ok(Math.abs(r.z[2] - r.s[0] / 2) <= 2, '直式也剛好半個畫面寬（' + r.z[2] + ' vs ' + r.s[0] / 2 + '）');
  await fire("document.getElementById('slideZone')", 'pointerdown', r.z[0] + r.z[2] * 0.5, r.z[1] + r.z[3] * 0.5, 1);
  await fire("document.getElementById('slideZone')", 'pointermove', r.z[0] + r.z[2] * 0.5, r.z[1] + r.z[3] * 0.5 - 70, 1);
  st = await state();
  ok(st.ay <= -0.5 && st.dirs === 'up', '直式一樣能滑（' + st.dirs + '）');
  await p.shot('test/v42-4-portrait-slide.png');
  await fire("document.getElementById('slideZone')", 'pointerup', 0, 0, 1);

  console.log('\n=== 8. 拖曳位置編輯器 ===');
  await p.eval("window.__BH.Screen.show('settings')");
  await cdp.sleep(600);
  await p.eval("document.getElementById('btnPadPos').click()");
  await cdp.sleep(400);
  r = await p.eval(`(() => {
    const m = document.getElementById('padEdit');
    const s = document.getElementById('peStage').getBoundingClientRect();
    const pd = document.getElementById('pePad').getBoundingClientRect();
    return { on: m.classList.contains('on'), s: [s.x, s.y, s.width, s.height],
      c: [pd.x + pd.width / 2, pd.y + pd.height / 2] };
  })()`);
  ok(r.on === true, '按「拖曳調整搖桿位置」會打開編輯器');
  ok(r.s[2] > 200 && r.s[3] > 120, '編輯器裡有一塊模擬遊戲畫面');
  await p.shot('test/v42-5-editor.png');
  const toX = r.s[0] + r.s[2] * 0.82, toY = r.s[1] + r.s[3] * 0.24;
  await fire("document.getElementById('pePad')", 'pointerdown', r.c[0], r.c[1], 1);
  await fire("document.getElementById('pePad')", 'pointermove', (r.c[0] + toX) / 2, (r.c[1] + toY) / 2, 1);
  await fire("document.getElementById('pePad')", 'pointermove', toX, toY, 1);
  await fire("document.getElementById('pePad')", 'pointerup', toX, toY, 1);
  await cdp.sleep(150);
  r = await p.eval(`(() => {
    const s = document.getElementById('peStage').getBoundingClientRect();
    const pd = document.getElementById('pePad').getBoundingClientRect();
    return { rx: Math.round((pd.x + pd.width / 2 - s.x) / s.width * 100),
      ry: Math.round((pd.y + pd.height / 2 - s.y) / s.height * 100),
      inside: pd.x >= s.x - 1 && pd.right <= s.right + 1 && pd.y >= s.y - 1 && pd.bottom <= s.bottom + 1,
      val: document.getElementById('peVal').textContent.replace(/\\s+/g, ' ').trim() };
  })()`);
  ok(r.rx >= 72 && r.rx <= 92, '拖曳後圓盤跑到右邊（' + r.rx + '%）');
  ok(r.ry <= 46, '拖曳後圓盤跑到上面（' + r.ry + '%，靠近邊界會被夾住不超出）');
  ok(r.inside === true, '圓盤被夾在框內（不會拖出畫面外）');
  console.log('    ' + r.val);
  await p.shot('test/v42-6-editor-dragged.png');
  await p.eval("document.getElementById('peSave').click()");
  await cdp.sleep(400);
  r = await p.eval(`(() => ({ on: document.getElementById('padEdit').classList.contains('on'),
    pad: window.__BH.settings.tpad.pad,
    saved: (JSON.parse(localStorage.getItem('bombhero-settings-v1') || '{}').tpad || {}) }))()`);
  ok(r.on === false, '存檔後編輯器關閉');
  ok(r.pad && r.pad.x > 0.6, '自訂位置寫進設定（x=' + (r.pad && r.pad.x) + '）');
  ok(r.saved && r.saved.pad && Math.abs(r.saved.pad.x - r.pad.x) < 1e-6, '位置也寫進 localStorage');
  await p.eval("window.__BH.settings.tpad.mode='stick'; window.__BH.applyTouchLayout(); window.__BH.Screen.show('game')");
  await cdp.sleep(600);
  r = await p.eval(`(() => { const s = document.getElementById('stageWrap').getBoundingClientRect();
    const pr = document.getElementById('tpad').getBoundingClientRect();
    return { w: Math.round(s.width), rx: s.width ? Math.round((pr.x + pr.width / 2 - s.x) / s.width * 100) : -1 }; })()`);
  ok(r.w > 100 && r.rx >= 70, '遊戲裡的搖桿真的搬到新位置（' + r.rx + '%）');

  console.log('\n=== 9. 回復預設位置 ===');
  await p.eval("window.__BH.Screen.show('settings')");
  await cdp.sleep(500);
  await p.eval("document.getElementById('btnPadReset').click()");
  await cdp.sleep(300);
  ok(await p.eval("window.__BH.settings.tpad.pad") === null, '「回復預設位置」清掉自訂座標');

  console.log('\n=== 10. 設定頁 UI ===');
  r = await p.eval(`(() => {
    const seg = document.getElementById('segTmode');
    const btns = seg ? Array.from(seg.querySelectorAll('button')) : [];
    return { labels: btns.map(x => x.textContent.trim()),
      sel: btns.filter(x => x.classList.contains('sel')).map(x => x.getAttribute('data-v')),
      hasPadPos: !!document.getElementById('btnPadPos'), hasReset: !!document.getElementById('btnPadReset'),
      hint: (document.getElementById('tpadHint').textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 70) };
  })()`);
  ok(r.labels.join('|').indexOf('隱形滑動區') >= 0 && r.labels.join('|').indexOf('虛擬搖桿') >= 0,
    '設定頁有兩種模式可切：' + r.labels.join(' / '));
  ok(r.sel.length === 1, '目前模式有高亮（' + r.sel.join(',') + '）');
  ok(r.hasPadPos && r.hasReset, '有「拖曳調整位置」與「回復預設位置」');
  console.log('    hint: ' + r.hint);
  await p.eval("document.querySelector('#segTmode button[data-v=\"slide\"]').click()");
  await cdp.sleep(300);
  r = await p.eval(`(() => ({ mode: window.__BH.padMode(),
    sel: document.querySelector('#segTmode button.sel').getAttribute('data-v'),
    hint: (document.getElementById('tpadHint').textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 30) }))()`);
  ok(r.mode === 'slide' && r.sel === 'slide', '點「隱形滑動區」立刻切換並高亮');
  ok(r.hint.indexOf('隱形滑動區') >= 0, '提示文字跟著換：' + r.hint);
  await p.eval("document.getElementById('segTmode').scrollIntoView({ block: 'center' })");
  await cdp.sleep(400);
  await p.shot('test/v42-7-settings.png');

  b.close();
  console.log('\n[shot57] ' + pass + ' 通過、' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
})();
