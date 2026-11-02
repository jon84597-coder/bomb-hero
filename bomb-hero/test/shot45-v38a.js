// v3.8-A 目檢：真的進遊戲放炸彈，把新的炸彈／遙控彈／火焰拍下來看
const path = require('path');
const { launch, sleep } = require('./cdp');

const PORT = 3521;
const BASE = 'http://127.0.0.1:' + PORT;
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ FAIL: ' + m); } }

(async function () {
  const { spawn } = require('child_process');
  const srv = spawn(process.execPath, [path.join(__dirname, '../../bomberman-online/server.js')], {
    env: Object.assign({}, process.env, { PORT: String(PORT) }), stdio: ['ignore', 'pipe', 'pipe']
  });
  let up = false;
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(BASE + '/api/health'); if ((await r.json()).ok) { up = true; break; } } catch (e) {}
    await sleep(150);
  }
  if (!up) { srv.kill(); throw new Error('server 起不來'); }

  const br = await launch({ w: 1100, h: 800, port: 9521 });
  // ?auto=1 → 遊戲自己會把「出發！」按掉
  const page = await br.newPage();
  await page.goto(BASE + '/?auto=1', 2200);
  await sleep(700);

  await page.eval(`(function(){
    var B = window.__BH;
    B.startSolo(1);          // 注意：不要傳第二個參數，否則會進 BOSS 討伐
  })()`);
  await sleep(600);          // 等 ?auto=1 的 setTimeout(260) 按掉出發
  await page.eval(`(function(){
    var G = window.__BH.Game;
    G.state = 'play'; G.countdown = 0;
  })()`);
  await sleep(800);

  const st = await page.eval(`JSON.stringify({state: window.__BH.Game.state, mode: window.__BH.Game.mode, players: window.__BH.Game.players.length, bossRush: window.__BH.Game.bossRush})`);
  console.log('  畫面狀態：' + st);
  ok(/"state":"play"/.test(st) && /"bossRush":false/.test(st), '進入一般單人關卡（不是 BOSS 討伐）');

  // ---- 放三顆炸彈＋三道火焰（玩家旁邊，鏡頭一定拍得到）----
  await page.eval(`(function(){
    var B = window.__BH, G = B.Game, T = G.T;
    var p = G.players[0];
    G.bombs.length = 0; G.flames.length = 0;
    function mk(cx, cy, opt){
      G.bombs.push({ cx:cx, cy:cy, px:cx*T+T/2, py:cy*T+T/2, timer: opt.timer, power: 2,
                     owner: p, seed: opt.seed||1, remoteArmed: !!opt.remote, flying: null, passers: [], mine:false });
    }
    var px = Math.floor(p.x / T), py = Math.floor(p.y / T);
    mk(px + 1, py,     {timer: 2.6,  seed: 3});              // 一般：正在燃燒
    mk(px + 3, py,     {timer: 0.42, seed: 7});              // 快爆炸：會透紅光
    mk(px + 5, py,     {timer: 3.0,  seed: 11, remote: true}); // 遙控彈：LED 面板
    G.flames.push({ cx: px + 1, cy: py + 3, owner: p,  t: 0.30, dir: null });
    G.flames.push({ cx: px + 3, cy: py + 3, owner: p,  t: 0.30, dir: 'right' });
    G.flames.push({ cx: px + 5, cy: py + 3, owner: null, t: 0.30, dir: null });  // BOSS 紫焰
    // 鎖住玩家別亂動、別死掉
    p.vx = 0; p.vy = 0; p.invuln = 99;
    return G.bombs.length;
  })()`);
  await sleep(450);
  await page.shot('test/v38a-1-bombs.png');

  await br.close();
  srv.kill();
  console.log('\n[shot45] ' + pass + ' 通過、' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e.message); process.exit(1); });
