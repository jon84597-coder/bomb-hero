// test/_cart4.js —— 手機直放（390×844）看推車：四輪與角色有沒有跑出箱子
const { launch } = require('./cdp');
const BASE = process.env.BH_BASE || 'http://127.0.0.1:3122';
const wait = ms => new Promise(r => setTimeout(r, ms));
const TAG = process.argv[2] || 'a';
const ZOOM = +(process.argv[3] || 3.0);

(async () => {
  const b = await launch({ w: 390, h: 844, port: 9505 });
  const p = await b.newPage();
  await p.resize(390, 844, true);
  await p.goto(BASE + '/?unlock=all', 3000);
  for (let i = 0; i < 30; i++) { if (await p.eval('!!window.__BH')) break; await wait(200); }
  await p.eval(`(function(){ localStorage.setItem('bombhero-rotskip','1');
    var P=window.__BH; try { P.AudioSys.ensure(); } catch(e){} try { P.Screen.show('title'); } catch(e){} return 1; })()`);
  await wait(400);
  await p.eval(`(function(){ window.__BH.startBattle(); return 1; })()`);
  await wait(700);
  await p.eval(`(function(){ try { window.__BH.beginCountdown('battle'); } catch(e){} return 1; })()`);
  await wait(2000);

  const r = await p.eval(`(function(){
    var P = window.__BH, G = P.Game, T = G.T;
    var cx = G.cols * T * .5, cy = G.rows * T * .5;
    G.players.forEach(function (pp, i) {
      if (!pp) return;
      if (i === 0) {
        try { if (!pp.cart) P.putOnCart(pp); } catch (e) {}
        pp.x = cx; pp.y = cy;
        pp.moving = true; pp.walkT = .85;
        pp.invuln = 0; pp.cry = 0; pp.cartCharge = 0;
      } else {
        pp.cart = false;
        pp.x = cx + i * T * 3; pp.y = cy - T * 3;
      }
    });
    try { G.zoom = ${ZOOM}; G.zoomTarget = ${ZOOM}; G.camSnap = true; } catch (e) {}
    return { z: G.zoom, T: T }; })()`);
  console.log('就位 →', JSON.stringify(r));
  await wait(4200);           // 等倒數「GO!」跑完，畫面才乾淨

  const box = await p.eval(`(function(){ var c=document.getElementById('cv'), rc=c.getBoundingClientRect();
    return { x: rc.left, y: rc.top, w: rc.width, h: rc.height }; })()`);
  const shot = await p.send('Page.captureScreenshot', { format: 'png' });
  require('fs').writeFileSync('test/_v576/cartm-' + TAG + '-full.png', Buffer.from(shot.data, 'base64'));
  console.log('畫布 →', JSON.stringify(box));

  const { execFileSync } = require('child_process');
  const cw = Math.round(box.w * .30), ch = Math.round(box.h * .52);
  const cx0 = Math.round(box.x + box.w / 2 - cw / 2);
  const cy0 = Math.round(box.y + box.h / 2 - ch * .58);
  try {
    execFileSync('python', ['-c', `
from PIL import Image
im = Image.open(r"test/_v576/cartm-${TAG}-full.png")
box = (${cx0}, ${cy0}, ${cx0 + cw}, ${cy0 + ch})
crop = im.crop(box)
crop = crop.resize((crop.width * 4, crop.height * 4), Image.LANCZOS)
crop.save(r"test/_v576/cartm-${TAG}-zoom.png")
print('zoom', crop.size)
`], { stdio: 'inherit' });
  } catch (e) { console.log('裁切失敗', String(e)); }

  await b.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
