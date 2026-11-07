// test/_probe-keys-play.js — v5.52：切到「爆爆王經典」之後，遊戲裡真的走得動、放得出炸彈
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, '_keys');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

const KEY = function (code, key, vk) {
  return [
    { type: 'keyDown', code: code, key: key, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk },
    { type: 'keyUp', code: code, key: key, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }
  ];
};

(async () => {
  const b = await launch({ w: 430, h: 932, port: 9393 });
  const p = await b.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.goto('http://127.0.0.1:3111/', 1800);
  await sleep(500);
  await p.eval(`(function(){
    try { localStorage.setItem('bombhero-rotskip','1'); } catch(e){}
    var r = document.getElementById('rotHint'); if (r && r.parentNode) r.parentNode.removeChild(r);
    try { __BH.ovHide(); } catch(e){}
    return 1;
  })()`);

  // 切經典
  await p.eval(`(function(){
    document.getElementById('btnKeys').click();
    return 1;
  })()`);
  await sleep(300);
  await p.eval(`(function(){ document.querySelector('#bhKeys .kopt[data-p="classic"]').click(); return 1; })()`);
  await sleep(250);
  await p.eval(`(function(){
    var x = document.querySelector('#bhKeys .kx'); if (x) x.click();
    return 1;
  })()`);
  await sleep(200);

  // 開單人第 1 關（地圖釘回 classic，格子大小穩定）
  console.log('開關卡', JSON.stringify(await p.eval(`(function(){
    __BH.settings.mapMode = 'classic';
    __BH.settings.size = 'L';
    __BH.startSolo(1, false);
    __BH.Game.state = 'play'; __BH.Game.paused = false;
    try { __BH.ovHide(); } catch(e){}
    var G = __BH.Game, pl = G.players[0];
    return { keys1: __BH.settings.keys1, T: G.T, x: Math.round(pl.x), y: Math.round(pl.y),
             bombs: G.bombs.length, ctrl: __BH.settings.ctrl };
  })()`)));
  await sleep(400);

  // 方向鍵右 → 玩家要往右
  const before = await p.eval(`(function(){ var p=__BH.Game.players[0]; return { x: Math.round(p.x), y: Math.round(p.y) }; })()`);
  for (const e of KEY('ArrowRight', 'ArrowRight', 39)) await p.send('Input.dispatchKeyEvent', e);
  await sleep(60);
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'ArrowRight', key: 'ArrowRight', windowsVirtualKeyCode: 39 });
  await sleep(450);
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'ArrowRight', key: 'ArrowRight', windowsVirtualKeyCode: 39 });
  await sleep(120);
  const after = await p.eval(`(function(){ var p=__BH.Game.players[0]; return { x: Math.round(p.x), y: Math.round(p.y) }; })()`);
  console.log('方向鍵 →', JSON.stringify({ before, after, dx: after.x - before.x, dy: after.y - before.y }));

  // Space 放炸彈
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'Space', key: ' ', windowsVirtualKeyCode: 32, text: ' ' });
  await sleep(120);
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'Space', key: ' ', windowsVirtualKeyCode: 32 });
  await sleep(250);
  console.log('Space 放彈', JSON.stringify(await p.eval(`(function(){
    var G = __BH.Game;
    return { bombs: G.bombs.length };
  })()`)));
  await p.shot(path.join(OUT, 'play-classic.png'));

  // WASD 應該沒反應（經典 1P 不吃 WASD）
  const b2 = await p.eval(`(function(){ var p=__BH.Game.players[0]; return Math.round(p.x); })()`);
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyD', key: 'd', windowsVirtualKeyCode: 68 });
  await sleep(420);
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyD', key: 'd', windowsVirtualKeyCode: 68 });
  await sleep(120);
  const a2 = await p.eval(`(function(){ var p=__BH.Game.players[0]; return Math.round(p.x); })()`);
  console.log('WASD 無效 ', JSON.stringify({ dx: a2 - b2 }));

  // 切回現代 → 方向鍵就不動了、WASD 才會動
  await p.eval(`(function(){ __BH.settings.keys1 = { up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD',act:'Mouse0',det:'Mouse2',fire:'Space' }; __BH.saveSettings(); return 1; })()`);
  await sleep(200);
  const b3 = await p.eval(`(function(){ var p=__BH.Game.players[0]; return Math.round(p.x); })()`);
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'ArrowRight', key: 'ArrowRight', windowsVirtualKeyCode: 39 });
  await sleep(420);
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'ArrowRight', key: 'ArrowRight', windowsVirtualKeyCode: 39 });
  await sleep(120);
  const a3 = await p.eval(`(function(){ var p=__BH.Game.players[0]; return Math.round(p.x); })()`);
  console.log('現代(方向鍵)', JSON.stringify({ dx: a3 - b3 }));

  console.log('done');
  await b.close();
})().catch(function (e) { console.error('PROBE FAIL', e && e.stack || e); process.exit(1); });
