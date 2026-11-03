// test/probe-v465-net.js — 兩個獨立瀏覽器（房主／客人）真的開一局線上對戰，
// 逐帧取樣客人的 Game.T / camX / camY，找出「客人畫面一直跳」的原因。
//   （一定要兩支「獨立」瀏覽器：同一支的背景分頁會被節流，rAF 不跑 → 房主不會推狀態）
//   用法：node test/probe-v465-net.js       TOUCH=0 → 客人不模擬手機（對照組）
const { spawn } = require('child_process');
const path = require('path');
const { launch, sleep } = require('./cdp');

const PORT = 3429;
const BASE = 'http://127.0.0.1:' + PORT;
const TOUCH = process.env.TOUCH !== '0';

(async function () {
  const srv = spawn(process.execPath, [path.join(__dirname, '../bomberman-online/server.js')], {
    env: Object.assign({}, process.env, { PORT: String(PORT) }),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  srv.stdout.on('data', () => {});
  srv.stderr.on('data', () => {});
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(BASE + '/api/health'); if (r.ok) break; } catch (e) {}
    await sleep(100);
  }

  // 房主：矮桌機視窗（T 小）；客人：平板／手機（T 大）→ 兩個人 T 天生不同
  const brH = await launch({ port: 9442, w: 1180, h: 520 });
  const brG = await launch({ port: 9443, w: 860, h: 1180 });
  const host = await brH.newPage();
  const guest = await brG.newPage();
  if (TOUCH) {
    await guest.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await guest.resize(860, 1180, true);
  } else {
    await guest.resize(760, 620, false);
  }

  await host.goto(BASE + '/index.html', 2500);
  await guest.goto(BASE + '/index.html', 2500);
  for (let i = 0; i < 40; i++) {
    const okH = await host.eval('typeof __BH').catch(() => 'err');
    const okG = await guest.eval('typeof __BH').catch(() => 'err');
    if (okH === 'object' && okG === 'object') break;
    if (i === 39) console.log('載入失敗 host=' + okH + ' guest=' + okG + ' url=' + await host.eval('location.href'));
    await sleep(250);
  }
  console.log('版本', await host.eval('__BH.VERSION'));
  console.log('客人 觸控=', await guest.eval('__BH.IS_TOUCH'), 'ctrl=', await guest.eval('__BH.ctrlMode()'),
              '視圖=', JSON.stringify(await guest.eval('__BH.viewInfo()')));

  const code = await host.eval(`(function(){
    return new Promise(function(res){
      __BH.Screen.show('online');
      __BH.Net.create();
      var t0 = Date.now();
      var iv = setInterval(function(){
        if (__BH.Net.code) { clearInterval(iv); res(__BH.Net.code); }
        else if (Date.now()-t0 > 8000) { clearInterval(iv); res(''); }
      }, 60);
    });
  })()`);
  console.log('房號', code);
  if (!code) throw new Error('建立房間失敗');

  await guest.eval(`(function(){
    __BH.Screen.show('online');
    document.getElementById('netCode').value = '${code}';
    __BH.Net.join();
    return 1;
  })()`);
  for (let i = 0; i < 40; i++) {
    await sleep(150);
    if (await host.eval('__BH.Net.roster.length') >= 2) break;
  }

  await guest.eval(`(function(){
    window.__cnt = { apply: 0, T: null };
    var o = __BH.Net.applySnap;
    __BH.Net.applySnap = function(s){ window.__cnt.apply++; window.__cnt.T = s && s.T; return o.call(__BH.Net, s); };
    return 1;
  })()`);
  await host.eval(`(function(){
    window.__push = 0;
    var o = __BH.Net.pushState;
    __BH.Net.pushState = function(w){ window.__push++; return o.call(__BH.Net, w); };
    return 1;
  })()`);

  await host.eval('__BH.Net.count = 2; __BH.Net.startMatch(); 1');
  await sleep(3000);
  console.log('客人 Screen', await guest.eval('__BH.Screen.current'), 'mySlot', await guest.eval('__BH.Net.mySlot'));
  console.log('客人收到快照', await guest.eval('window.__cnt.apply'), '次（最後 s.T=' + (await guest.eval('window.__cnt.T')) + '）',
              '／房主推', await host.eval('window.__push'), '次',
              '／房主 T', await host.eval('__BH.Game.T'),
              '／客人自己算的 T', await guest.eval('__BH.tileSize()'),
              '／客人目前 T', await guest.eval('__BH.Game.T'));

  await guest.eval(`(function(){
    window.__S = [];
    function tick(){
      var g = __BH.Game;
      var p = g.players[__BH.Net.mySlot] || null;
      window.__S.push([+performance.now().toFixed(1), g.T, +g.camX.toFixed(2), +g.camY.toFixed(2),
        +g.zoom.toFixed(3), __BH.viewInfo().w, __BH.viewInfo().h, p ? +p.x.toFixed(2) : -1, p ? +p.y.toFixed(2) : -1,
        g.cols, g.rows, p ? +((p.tx == null ? -1 : p.tx)).toFixed(2) : -1, p ? +((p.ty == null ? -1 : p.ty)).toFixed(2) : -1,
        g.state + '', __BH.Net.snapV | 0]);
      if (window.__S.length < 1200) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    return 1;
  })()`);

  const KM = { '1,0': ['KeyD', 'd'], '0,1': ['KeyS', 's'], '-1,0': ['KeyA', 'a'], '0,-1': ['KeyW', 'w'] };
  for (const d of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 0], [0, 1], [-1, 0]]) {
    const [c, k] = KM[d[0] + ',' + d[1]];
    if (TOUCH) await guest.eval('__BH.Input.setTouchAxis(' + d[0] + ',' + d[1] + '); 1');
    else await guest.eval("window.dispatchEvent(new KeyboardEvent('keydown',{key:'" + k + "',code:'" + c + "',bubbles:true})); 1");
    await sleep(700);
    if (TOUCH) await guest.eval('__BH.Input.setTouchAxis(0,0); 1');
    else await guest.eval("window.dispatchEvent(new KeyboardEvent('keyup',{key:'" + k + "',code:'" + c + "',bubbles:true})); 1");
    await sleep(120);
  }
  await sleep(700);

  const S = await guest.eval('window.__S');
  await guest.shot(path.join(__dirname, '_v465/net-guest.png'));
  if (!S || S.length < 30) { console.log('取樣失敗'); brH.close(); brG.close(); srv.kill(); return; }

  const Ts = {}; S.forEach(r => Ts[r[1]] = (Ts[r[1]] || 0) + 1);
  console.log('客人取樣帧數', S.length);
  console.log('Game.T 出現過的値', JSON.stringify(Ts));
  console.log('尺寸', S[0][5] + 'x' + S[0][6], '地圖', S[0][9] + 'x' + S[0][10], 'zoom', S[0][4]);
  const xs = S.map(r => r[7]);
  console.log('客人 x 範圍', Math.min.apply(null, xs).toFixed(0), '~', Math.max.apply(null, xs).toFixed(0));

  let jump = 0, maxJ = 0, arr = [], frameDt = [], tJ = [];
  for (let i = 1; i < S.length; i++) {
    const dt = S[i][0] - S[i - 1][0];
    const d = Math.hypot(S[i][2] - S[i - 1][2], S[i][3] - S[i - 1][3]);
    if (dt > 0) frameDt.push(dt);
    arr.push(d);
    if (d > 6) { jump++; if (tJ.length < 12) tJ.push([S[i][0], +d.toFixed(1), S[i - 1][1] + '→' + S[i][1], S[i][7], S[i][11]]); }
    if (d > maxJ) maxJ = d;
  }
  console.log('相機帧間位移：平均', (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2),
              '最大', maxJ.toFixed(1), '超過 6px 的帧數', jump, '/', arr.length);
  console.log('平均帧距', (frameDt.reduce((a, b) => a + b, 0) / frameDt.length).toFixed(1), 'ms');
  console.log('跳動樣本 [t, d, T前→後, x, tx]:');
  tJ.forEach(r => console.log('  ', r.join('  ')));

  brH.close(); brG.close();
  try { srv.kill(); } catch (e) {}
})().catch(e => { console.error('ERR', e); process.exit(1); });
