// 線上配對 —— 兩台「裝置」端到端整合測試（房主沙盒 + 客人沙盒，真的走 HTTP）
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 3413;
const BASE = 'http://127.0.0.1:' + PORT;
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];

let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ FAIL: ' + m); } }
const sleep = ms => new Promise(r => setTimeout(r, ms));

function mkCtx2D() {
  const grad = { addColorStop() {} };
  return new Proxy({}, {
    get(t, k) {
      if (k === 'canvas') return { width: 720, height: 540 };
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
      if (typeof t[k] !== 'undefined') return t[k];
      return () => {};
    },
    set(t, k, v) { t[k] = v; return true; }
  });
}
function mkEl(id) {
  const el = {
    id, style: {}, dataset: {}, children: [], _cls: new Set(),
    classList: {
      add(c) { el._cls.add(c); }, remove(c) { el._cls.delete(c); },
      toggle(c) { el._cls.has(c) ? el._cls.delete(c) : el._cls.add(c); },
      contains(c) { return el._cls.has(c); }
    },
    addEventListener() {}, removeEventListener() {},
    appendChild(c) { el.children.push(c); return c; },
    getContext: () => mkCtx2D(),
    querySelectorAll: () => [], querySelector: () => mkEl(id + '-q'),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 900, height: 600 }),
    focus() {}, click() {},
    width: 720, height: 540, textContent: '', value: '',
    clientWidth: 900, clientHeight: 600
  };
  let _inner = '';
  Object.defineProperty(el, 'innerHTML', {
    get() { return _inner; },
    set(v) { _inner = v; el.children = []; }
  });
  return el;
}

function makeClient(tag) {
  const els = {};
  const listeners = {};
  const storage = {};
  const getId = id => (els[id] || (els[id] = mkEl(id)));
  const sandbox = {
    console, Math, JSON, Object, Array, Date, parseInt, parseFloat, isNaN, isFinite,
    Uint8ClampedArray, Infinity, NaN, undefined,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: () => 0,
    performance: { now: () => Date.now() },
    localStorage: {
      getItem: k => (k in storage ? storage[k] : null),
      setItem: (k, v) => { storage[k] = String(v); },
      removeItem: k => { delete storage[k]; }
    },
    navigator: { getGamepads: () => [] },
    document: {
      getElementById: getId, querySelectorAll: () => [], querySelector: () => mkEl('q'),
      addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
      removeEventListener() {}, createElement: t => mkEl(t),
      body: mkEl('body'), documentElement: mkEl('html')
    },
    // 真的 fetch，但自動補上伺服器位址
    fetch: function (u, o) { return fetch(BASE + u, o); }
  };
  sandbox.window = sandbox;
  sandbox.addEventListener = (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); };
  sandbox.removeEventListener = () => {};
  sandbox.globalThis = sandbox;
  sandbox.window.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: 'index-' + tag + '.html' });
  const BH = sandbox.window.__BH;
  return { sandbox, BH, G: BH.Game, els, tag };
}

(async function () {
  const srv = spawn(process.execPath, [path.join(__dirname, '../../bomberman-online/server.js')], {
    env: Object.assign({}, process.env, { PORT: String(PORT) }),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  try {
    for (let i = 0; i < 50; i++) {
      try { const r = await fetch(BASE + '/api/health'); if (r.ok) break; } catch (e) {}
      await sleep(100);
    }

    console.log('=== 1. 房主建立房間 ===');
    const host = makeClient('host');
    host.BH.settings.count = 4;
    host.BH.settings.size = 'M';
    host.BH.settings.hazards = 'off';
    host.BH.settings.sd = 'off';
    host.BH.settings.revenge = 'off';
    host.BH.settings.ctrl = 'kb';
    host.sandbox.document.getElementById('netName').value = '房主阿明';
    host.BH.Net.create();
    await sleep(300);
    ok(host.BH.Net.on && host.BH.Net.role === 'host', '房主進入房間（角色 host）');
    ok(/^\d{4}$/.test(host.BH.Net.code), '拿到房號 ' + host.BH.Net.code);
    const roomCode = host.BH.Net.code;

    console.log('=== 2. 客人用房號加入 ===');
    const guest = makeClient('guest');
    guest.BH.settings.ctrl = 'kb';
    guest.sandbox.document.getElementById('netCode').value = roomCode;
    guest.sandbox.document.getElementById('netName').value = '客人小華';
    guest.BH.Net.join();
    await sleep(300);
    ok(guest.BH.Net.on && guest.BH.Net.role === 'guest', '客人成功加入');
    ok(guest.BH.Net.roster.length === 2, '客人看到 2 人名單');

    console.log('=== 3. 房主輪詢看到客人 ===');
    host.BH.Net.poll();
    await sleep(250);
    ok(host.BH.Net.roster.length === 2, '房主名單變 2 人（' + host.BH.Net.roster.length + '）');
    const hostPid = host.BH.Net.pid, guestPid = guest.BH.Net.pid;
    host.BH.Net.roster.forEach(r => { r.entry = 1; });
    host.BH.Net.pushState(false);
    await sleep(200);

    console.log('=== 4. 只有 2 人入場，其餘 AI 補位（4 人房）===');
    host.BH.Net.startMatch();
    ok(host.G.players.length === 4, '房主端開 4 位角色（' + host.G.players.length + '）');
    ok(host.G.players.filter(p => !p.ai).length === 2, '其中 2 位是真人');
    ok(host.G.players.filter(p => p.ai).length === 2, '另外 2 位是 AI');
    host.G.state = 'play';
    host.G.players.forEach(p => { p.invuln = 0; });

    console.log('=== 5. 快照推給客人 → 客人自動進遊戲 ===');
    for (let i = 0; i < 5; i++) { host.BH.updateBattle(1 / 60); host.BH.Net.pushState(true); await sleep(60); }
    await sleep(150);
    guest.BH.Net.poll();
    await sleep(300);
    ok(guest.BH.Net.phase === 'play', '客人收到開局狀態（' + guest.BH.Net.phase + '）');
    ok(guest.sandbox.document.getElementById('scr-game').classList.contains('on'), '客人自動切到遊戲畫面');
    ok(guest.G.players.length === host.G.players.length, '客人端角色數與房主一致（' + guest.G.players.length + '）');
    ok(guest.G.cols === host.G.cols && guest.G.T === host.G.T, '客人端地圖尺寸與格子大小一致');
    let diff = 0;
    for (let i = 0; i < host.G.players.length; i++) {
      diff += Math.abs(host.G.players[i].x - guest.G.players[i].x);
    }
    ok(diff < 3, '全部玩家位置誤差 ' + diff.toFixed(2) + 'px');

    console.log('=== 6. 客人按右 → 客人的角色真的往右走 ===');
    const mySlot = guest.BH.Net.mySlot;
    ok(mySlot >= 0, '客人認得自己的位子（slot ' + mySlot + '）');
    const startX = host.G.players[mySlot].x;
    guest.BH.Net.localScheme = () => ({
      dirs: () => ['right'], action: () => false, actionHeld: () => false
    });
    guest.BH.Net.mySlot = mySlot;
    guest.BH.Net.sendInput();
    await sleep(300);
    host.BH.Net.poll();
    await sleep(200);
    for (let i = 0; i < 40; i++) { host.BH.updateBattle(1 / 60); }
    const movedX = host.G.players[mySlot].x - startX;
    ok(movedX > 5, '房主端客人角色往右移動 ' + movedX.toFixed(1) + 'px');
    ok(host.G.players[mySlot].name === '客人小華', '角色暱稱是客人小華（' + host.G.players[mySlot].name + '）');

    console.log('=== 7. 客人再收快照 → 自己角色位置跟上 ===');
    host.BH.Net.pushState(true);
    await sleep(250);
    guest.BH.Net.poll();
    await sleep(250);
    const gx = guest.G.players[mySlot].x, hx = host.G.players[mySlot].x;
    ok(Math.abs(gx - hx) < 3, '客人端看到自己的新位置（差 ' + Math.abs(gx - hx).toFixed(1) + 'px）');

    console.log('=== 8. 客人在遊戲中放彈（動作鍵）===');
    // 找一格空地站好、清掉場上炸彈，避免 AI 隨機放彈干擾判斷
    const mp = host.G.players[mySlot];
    host.G.bombs.length = 0;
    const T8 = host.G.T;
    for (let y = 1; y < host.G.rows - 1 && !mp.cellOk; y++) {
      for (let x = 1; x < host.G.cols - 1; x++) {
        if (host.G.grid[y][x] === 0) { mp.x = x * T8 + T8 / 2; mp.y = y * T8 + T8 / 2; mp.cellOk = 1; break; }
      }
    }
    const before = host.G.bombs.filter(b => b.owner === mp).length;
    guest.BH.Net.localScheme = () => ({
      dirs: () => [], action: () => true, actionHeld: () => false
    });
    guest.BH.Net.pendingAct = true;      // 模擬「剛按下動作鍵」的邊緣
    guest.BH.Net.sendInput();
    await sleep(300);
    host.BH.Net.poll();
    await sleep(200);
    // 房主的 controlHuman 會讀 scheme.action() 放彈
    host.BH.controlHuman(mp, 1 / 60);
    const after = host.G.bombs.filter(b => b.owner === mp).length;
    ok(after > before, '客人按放彈 → 房主端出現該玩家的炸彈（' + after + ' 顆）');

    console.log('=== 9. 爆炸與火焰同步到客人 ===');
    host.G.state = 'play';
    host.G.bombs.length = 0;
    host.G.flames.length = 0;
    const bp = host.G.players[0];
    host.BH.placeBomb(bp);
    ok(host.G.bombs.length === 1, '房主端放了一顆測試炸彈');
    host.G.bombs[0].timer = 0.01;
    for (let i = 0; i < 5; i++) host.BH.updateWorld(1 / 60);
    const hostFlames = host.G.flames.length;
    ok(hostFlames > 0, '房主端爆炸產生火焰（' + hostFlames + ' 格）');
    host.BH.Net.pushState(true);
    await sleep(250);
    guest.BH.Net.poll();
    await sleep(250);
    ok(guest.G.flames.length === hostFlames, '客人端看到相同數量火焰（' + guest.G.flames.length + ' / ' + hostFlames + '）');
    ok(guest.G.bombs.length === host.G.bombs.length, '炸彈數量一致（' + guest.G.bombs.length + '）');

    console.log('=== 10. 房主離開 → 客人收到解散 ===');
    host.BH.Net.leave();
    await sleep(300);
    guest.BH.Net.poll();
    await sleep(300);
    ok(guest.BH.Net.on === false, '客人被踢回等待室（房間解散）');
    ok(String(guest.sandbox.document.getElementById('netMsg').innerHTML || '').indexOf('解散') >= 0, '顯示「房間已解散」訊息');
  } catch (e) {
    ok(false, '例外：' + (e && e.stack || e));
  } finally {
    srv.kill();
  }
  console.log('\n結果：' + pass + ' 通過 / ' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
})();
