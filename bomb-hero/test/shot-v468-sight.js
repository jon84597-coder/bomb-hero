// test/shot-v468-sight.js — v4.68 目檢：怪在「5 格外」時舊版會射、新版不會
//   左（舊 4.67）／右（新 4.68）：同一個地圖、同一個距離、同樣推進 1.05 秒
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const NEW = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/');
const OLD = 'file:///' + path.join(__dirname, '../_bak_v468_pre.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v468');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const SCENE = `(function(){
  var G = __BH.Game;
  __BH.settings.count = 1; __BH.settings.size = 'M';
  __BH.startSolo(1, false);
  G.state = 'play';
  var T = G.T, cols = G.cols, rows = G.rows;
  for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++)
    G.grid[y][x] = (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) ? 1 : 0;
  G.hides = []; G.bombs.length = 0; G.flames.length = 0; G.bolts = [];
  var me = G.players[0];
  me.alive = true; me.hp = 1; me.invuln = 0;   // 無敵會閃爍，截圖要關掉
  me.x = 3.5 * T; me.y = 6.5 * T;
  var e = __BH.makeEnemy(8, 6, 'frog', 0, 1);   // 玩家正右方 5 格
  e.skCd = 0; e.castT = 0; e.aggro = true;
  G.enemies = [e];
  for (var i = 0; i < 64; i++) { e.aggro = true; __BH.enemySkillTick(e, 1 / 60); }
  G.state = 'play'; G.zoom = G.zoomTarget = 0.62; G.camSnap = true;
  ['rotHint', 'zoomHint'].forEach(function (id) { var el = document.getElementById(id); if (el) el.remove(); });
  ['zoomPill', 'banner', 'toast'].forEach(function (id) { var el = document.getElementById(id); if (el) el.style.display = 'none'; });
  var ov = document.getElementById('ovIn'); if (ov) ov.classList.add('hide');
  try { __BH.updateCamera(1); __BH.render(); } catch (err) {}
  return JSON.stringify({ T: T, dist: +((e.x - me.x) / T).toFixed(2), castT: +(e.castT || 0).toFixed(2),
                          bolts: (G.bolts || []).length, skCd: +(e.skCd || 0).toFixed(2) });
})()`;

(async function () {
  const br = await launch({ port: 9599, w: 390, h: 844 });
  const np = await br.newPage();
  const op = await br.newPage();
  for (const p of [np, op]) {
    await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await p.resize(390, 844, true);
  }
  await np.goto(NEW, 3200);
  await op.goto(OLD, 3200);
  for (let i = 0; i < 40; i++) {
    const a = await np.eval('typeof __BH').catch(() => 'x');
    const b = await op.eval('typeof __BH').catch(() => 'x');
    if (a === 'object' && b === 'object') break;
    await sleep(300);
  }
  for (const [p, tag] of [[op, 'old'], [np, 'new']]) {
    await p.eval("try{localStorage.setItem('bombhero-rotstip','1');localStorage.setItem('bombhero-rotskip','1')}catch(e){}; __BH.settings.ctrl='touch'; __BH.applyCtrl(); 1");
    const r = await p.eval(SCENE);
    console.log(tag, r);
    await sleep(200);
    await p.shot(path.join(OUT, 'cmp-' + tag + '.png'));
  }
  br.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
