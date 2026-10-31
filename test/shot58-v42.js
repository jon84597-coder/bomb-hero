// test/shot58-v42.js — 瀏覽器端到端回歸：手機「橫放滿版」與各機型版面
//   病灶回歸：body 高度是 auto → .wrap.game height:100% 解析失敗 → 畫布用 4:3 被撐成
//   844×633，放彈鍵落到 y=605（視窗只有 390），橫放等於按不到；隱形滑動區也變成
//   比螢幕高一截，容錯判定跟著失準。
//   驗收：每個機型都要「零垂直溢出 + 三顆觸控鍵完整在視窗內 + 滑動區 = 實際畫面」。
const cdp = require('./cdp');

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name + (extra === undefined ? '' : '（' + extra + '）')); }
  else { fail++; console.log('  ✗ FAIL: ' + name + (extra === undefined ? '' : '（' + extra + '）')); }
}
function tp(x, y, id) { return { x: Math.round(x), y: Math.round(y), id: id || 1, radiusX: 8, radiusY: 8, force: 1 }; }

// 機型（CSS px，皆為真實裝置實測值）
const LANDSCAPES = [
  ['iPhone 12/13', 844, 390],
  ['iPhone X', 812, 375],
  ['iPhone SE', 667, 375],
  ['Pixel 7', 915, 412],
  ['小螢幕 Android', 640, 360],
  ['iPhone 12 Pro Max', 926, 428]
];

(async () => {
  const b = await cdp.launch({ w: 1100, h: 800, port: 9441 });
  const p = await b.newPage();
  await p.resize(844, 390, true);
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.goto('http://127.0.0.1:3000/', 1900);
  await cdp.sleep(700);

  const down = (pts) => p.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts });
  const move = (pts) => p.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts });
  const up = (pts) => p.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: pts || [] });

  // ── 1. 進遊戲 ───────────────────────────────────────────────
  console.log('\n=== 1. 進入遊戲（844×390）===');
  await p.eval('window.__BH.startSolo(1, false)');
  await cdp.sleep(500);
  await p.eval("(function(){ const b=document.querySelector('#ovBox button'); if (b) b.click(); })()");
  await cdp.sleep(3800);
  ok(await p.eval('window.__BH.Game.state') === 'play', '遊戲進行中（state=play）');

  const geo = () => p.eval(`(() => {
    function r(el){ if(!el) return null; const b=el.getBoundingClientRect();
      return { x:Math.round(b.x), y:Math.round(b.y), w:Math.round(b.width), h:Math.round(b.height),
               b:Math.round(b.bottom), rt:Math.round(b.right) }; }
    const wrap = document.querySelector('#scr-game').closest('.wrap');
    return {
      iw: innerWidth, ih: innerHeight, scrollH: document.body.scrollHeight,
      bodyH: Math.round(document.body.getBoundingClientRect().height),
      wrap: r(wrap), stage: r(document.getElementById('stageWrap')),
      cv: r(document.getElementById('cv')),
      cvClient: [document.getElementById('cv').clientWidth, document.getElementById('cv').clientHeight],
      act: r(document.querySelector('#touchUI .tact')),
      det: r(document.querySelector('#touchUI .tdet')),
      fire: r(document.querySelector('#touchUI .tfire')),
      pause: r(document.querySelector('#touchUI .tpause')),
      zone: r(document.getElementById('slideZone')),
      top: r(document.getElementById('gameTop')),
      mode: window.__BH.padMode()
    };
  })()`);

  let g = await geo();
  console.log('    ' + JSON.stringify(g));

  // ── 2. 主機型逐項驗收（844×390）───────────────────────────
  console.log('\n=== 2. 橫放滿版（844×390）===');
  ok(g.scrollH <= g.ih + 1, '整頁沒有垂直溢出（scrollH ' + g.scrollH + ' ≤ ' + g.ih + '）');
  ok(g.wrap.h <= g.ih + 1, '.wrap.game 高度不再被內容撐爆（' + g.wrap.h + ' ≤ ' + g.ih + '）');
  ok(g.stage.h > 120 && g.stage.h < g.ih, 'stageWrap 吃掉剩餘高度（' + g.stage.h + '）');
  ok(Math.abs(g.cv.h - g.stage.h) <= 2, '畫布不再用 4:3 內在比例撐高（' + g.cv.h + ' vs ' + g.stage.h + '）');
  ok(Math.abs(g.cvClient[1] - g.stage.h) <= 2, '畫布的 CSS 像素高度 = stageWrap（resizeView 拿到的高度是對的）');
  ok(g.act.b <= g.ih, '放彈鍵完整在視窗內（bottom ' + g.act.b + ' ≤ ' + g.ih + '）');
  ok(g.det.b <= g.ih, '遙控引爆鍵完整在視窗內（bottom ' + g.det.b + ' ≤ ' + g.ih + '）');
  ok(g.pause.b <= g.ih && g.pause.rt <= g.iw, '暫停鍵在視窗內');
  ok(g.top.y >= 0 && g.top.b < g.stage.y + 4, 'HUD 在畫布上方且沒被切掉（0..' + g.top.b + '）');
  ok(g.top.h <= 80, 'HUD 壓成一行，沒有折成兩行吃掉高度（' + g.top.h + 'px）');
  ok(Math.abs(g.zone.h - g.stage.h) <= 2, '隱形滑動區高度 = 實際遊戲畫面（' + g.zone.h + ' vs ' + g.stage.h + '）');
  ok(Math.abs(g.zone.w - g.stage.w / 2) <= 2, '隱形滑動區寬度 = 畫面一半（' + g.zone.w + ' vs ' + g.stage.w / 2 + '）');
  ok(g.zone.h <= g.ih, '滑動區不再高於螢幕（否則「滑出邊界」判定會失準）');
  ok(g.mode === 'slide', '預設模式 A');

  // ── 3. 真觸控：滑動區在「入框後」仍然有效 ──────────────────
  console.log('\n=== 3. 真觸控（入框後仍可操作）===');
  // 先把角色放到一條「上下三格都空地」的走廊中央，避免出生點上方剛好是牆 → 誤判成沒反應
  const prep = await p.eval(`(() => {
    const G = window.__BH.Game, pl = G.players[0];
    G.bombs.length = 0; G.flames.length = 0;
    let found = null;
    for (let y = 2; y < G.rows - 2 && !found; y++) {
      for (let x = 1; x < G.cols - 1; x++) {
        if (G.grid[y][x] === 0 && G.grid[y - 1][x] === 0 && G.grid[y - 2][x] === 0) { found = { x: x, y: y }; break; }
      }
    }
    if (!found) return null;
    pl.x = (found.x + 0.5) * G.T; pl.y = (found.y + 0.5) * G.T;
    return { cx: found.x, cy: found.y, T: G.T };
  })()`);
  ok(!!prep, '找到可自由上下的空地並把角色移過去', prep ? ('格 ' + prep.cx + ',' + prep.cy + '，T=' + prep.T) : 'none');
  await cdp.sleep(160);
  const cx = g.zone.x + g.zone.w / 2, cy = g.zone.y + g.zone.h / 2;
  const py0 = await p.eval('window.__BH.Game.players[0].y');
  await down([tp(cx, cy)]);
  await cdp.sleep(60);
  await move([tp(cx, cy - 70)]);
  await cdp.sleep(300);
  const st = await p.eval(`(() => { const I = window.__BH.Input.touchState;
    return { ax: I.ax || 0, ay: I.ay || 0, dirs: window.__BH.Input.schemes.touch.dirs().join(',') }; })()`);
  ok(st.ay < -0.9, '手指上滑 → 軸向 ay≈-1（' + st.ay.toFixed(3) + '）');
  ok(st.dirs === 'up', '方向判定為 up（' + st.dirs + '）');
  const py1 = await p.eval('window.__BH.Game.players[0].y');
  ok(py1 < py0 - 10, '角色真的往上移動（' + Math.round(py0) + ' → ' + Math.round(py1) + '）');
  // 滑到畫面另一側（橫向極限）仍要有效
  await move([tp(g.stage.rt - 30, cy)]);
  await cdp.sleep(200);
  const st2 = await p.eval(`(() => { const I = window.__BH.Input.touchState;
    return { ax: I.ax || 0, ay: I.ay || 0, dirs: window.__BH.Input.schemes.touch.dirs().join(',') }; })()`);
  ok(st2.ax > 0.9, '橫向滑到畫面另一側仍是有效輸入（ax ' + st2.ax.toFixed(3) + '）');
  await up([]);
  await cdp.sleep(120);
  const st3 = await p.eval(`(() => { const I = window.__BH.Input.touchState;
    return { ax: I.ax || 0, ay: I.ay || 0 }; })()`);
  ok(st3.ax === 0 && st3.ay === 0, '放手後軸向歸零');
  await p.shot('test/v42-8-landscape-fit.png');

  // ── 4. 模式 B（虛擬搖桿）在橫放也要入框 ────────────────────
  console.log('\n=== 4. 模式 B 橫放入框 ===');
  await p.eval(`(() => { const s = window.__BH.settings; s.tpad.mode = 'stick'; window.__BH.applyTouchLayout(); })()`);
  await cdp.sleep(300);
  g = await geo();
  console.log('    ' + JSON.stringify({ ih: g.ih, scrollH: g.scrollH, stage: g.stage.h, act: g.act.b, mode: g.mode }));
  ok(g.mode === 'stick', '已切到模式 B');
  ok(g.scrollH <= g.ih + 1, '模式 B 也沒有垂直溢出（scrollH ' + g.scrollH + '）');
  ok(g.act.b <= g.ih, '模式 B 放彈鍵仍在視窗內（' + g.act.b + ' ≤ ' + g.ih + '）');
  const padOk = await p.eval(`(() => { const r = document.querySelector('#touchUI .tpad').getBoundingClientRect();
    return { y: Math.round(r.y), b: Math.round(r.bottom), vis: getComputedStyle(document.querySelector('#touchUI .tpad')).visibility }; })()`);
  ok(padOk.vis === 'visible', '模式 B 搖桿可見');
  ok(padOk.b <= g.ih && padOk.y >= 0, '模式 B 搖桿完整在視窗內（' + padOk.y + '~' + padOk.b + '）');
  await p.shot('test/v42-9-landscape-stick.png');
  await p.eval(`(() => { const s = window.__BH.settings; s.tpad.mode = 'slide'; window.__BH.applyTouchLayout(); })()`);
  await cdp.sleep(200);

  // ── 5. 六種機型逐一切換（含更矮／更寬的）──────────────────
  console.log('\n=== 5. 多機型（橫放）===');
  for (const [name, w, h] of LANDSCAPES) {
    await p.resize(w, h, true);
    await cdp.sleep(420);
    const q = await geo();
    const overflow = q.scrollH - q.ih;
    const actIn = q.act.b <= q.ih + 1 && q.act.rt <= q.iw + 1;
    const detIn = q.det.b <= q.ih + 1;
    const zoneOk = Math.abs(q.zone.h - q.stage.h) <= 2 && Math.abs(q.zone.w - q.stage.w / 2) <= 2;
    ok(overflow <= 1, name + ' 無垂直溢出', w + '×' + h + '，溢出 ' + overflow + 'px');
    ok(actIn && detIn, name + ' 觸控鍵在視窗內', 'act.b=' + q.act.b + ' det.b=' + q.det.b + ' ih=' + q.ih);
    ok(q.stage.h >= 120 && Math.abs(q.cv.h - q.stage.h) <= 2, name + ' 畫布高度正確', 'stage ' + q.stage.h + ' / cv ' + q.cv.h);
    ok(zoneOk, name + ' 隱形滑動區 = 實際畫面', 'zone ' + q.zone.w + '×' + q.zone.h + ' / stage ' + q.stage.w + '×' + q.stage.h);
  }
  await p.resize(640, 360, true);
  await cdp.sleep(400);
  await p.shot('test/v42-10-landscape-small.png');

  // ── 6. 直放不能被這次修正弄壞 ──────────────────────────────
  console.log('\n=== 6. 直放（390×844）不受影響 ===');
  await p.resize(390, 844, true);
  await cdp.sleep(500);
  // 前面繞了六種機型，單人場可能已經被怪打死／時間到 → 需要就重開一場
  let st6 = await p.eval('window.__BH.Game.state');
  if (st6 !== 'play') {
    console.log('    （前面繞機型時場次已結束 state=' + st6 + '，重開一場）');
    await p.eval('window.__BH.startSolo(1, false)');
    await cdp.sleep(500);
    await p.eval("(function(){ const b=document.querySelector('#ovBox button'); if (b) b.click(); })()");
    await cdp.sleep(3800);
  }
  ok(await p.eval('window.__BH.Game.state') === 'play', '直放時遊戲進行中（state=play）');
  const v = await geo();
  console.log('    ' + JSON.stringify({ ih: v.ih, scrollH: v.scrollH, wrap: v.wrap.h, stage: v.stage.h, act: v.act.b }));
  ok(v.scrollH <= v.ih + 1, '直放沒有垂直溢出（scrollH ' + v.scrollH + ' ≤ ' + v.ih + '）');
  ok(v.act.b <= v.ih, '直放放彈鍵在視窗內（' + v.act.b + '）');
  ok(v.stage.h > 150, '直放畫布仍有足夠高度（' + v.stage.h + '）');
  ok(Math.abs(v.zone.h - v.stage.h) <= 2, '直放滑動區高度 = 畫面');
  await p.eval(`(() => {
    const G = window.__BH.Game, pl = G.players[0];
    G.bombs.length = 0; G.flames.length = 0;
    let found = null;
    for (let y = 2; y < G.rows - 2 && !found; y++) {
      for (let x = 1; x < G.cols - 1; x++) {
        if (G.grid[y][x] === 0 && G.grid[y - 1][x] === 0 && G.grid[y - 2][x] === 0) { found = { x: x, y: y }; break; }
      }
    }
    if (found) { pl.x = (found.x + 0.5) * G.T; pl.y = (found.y + 0.5) * G.T; }
    return !!found;
  })()`);
  await cdp.sleep(160);
  const pv0 = await p.eval('window.__BH.Game.players[0].y');
  const zx = v.zone.x + v.zone.w / 2, zy = v.zone.y + v.zone.h / 2;
  await down([tp(zx, zy)]);
  await cdp.sleep(60);
  await move([tp(zx, zy - 60)]);
  await cdp.sleep(300);
  const pv1 = await p.eval('window.__BH.Game.players[0].y');
  await up([]);
  ok(pv1 < pv0 - 8, '直放滑動區可操作（' + Math.round(pv0) + ' → ' + Math.round(pv1) + '）');
  await p.shot('test/v42-11-portrait-fit.png');

  console.log('\n========================================');
  console.log('  結果：' + pass + ' 通過 / ' + fail + ' 失敗');
  console.log('========================================');
  b.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
