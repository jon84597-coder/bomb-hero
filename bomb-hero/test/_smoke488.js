// test/_smoke488.js —— v4.88 實機驗證：鴕鳥跑動三幀在真實遊戲畫面裡會不會交替
// 跑法：node test/_smoke488.js
const { launch, sleep } = require('./cdp');
const URL = process.env.BH_URL || 'file:///C:/Users/jon84/WorkBuddy/2026-10-30-12-58-54/bomb-hero/index.html';

(async () => {
  const b = await launch({ w: 900, h: 700 });
  const p = await b.newPage();
  await p.goto(URL + '?cb=' + Date.now(), 1500);
  for (let i = 0; i < 80; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(250); }
  await sleep(600);

  const ver = await p.eval('__BH.VERSION');
  console.log('VERSION', ver);

  // 三幀圖有沒有真的載進來
  const loaded = await p.eval(`(function(){
    const keys = Object.keys(__BH.MountArt.imgs);
    return keys.map(function(k){
      const im = __BH.MountArt.imgs[k];
      return k + ':' + (im && im.naturalWidth ? im.naturalWidth + 'x' + im.naturalHeight : 'X');
    });
  })()`);
  console.log('MountArt.imgs', loaded);

  await p.eval('__BH.startSolo(1);1');
  await sleep(4200);

  // 讓玩家騎鴕鳥
  const s0 = await p.eval(`(function(){
    const pl = __BH.Game.players && __BH.Game.players[0];
    if (!pl) return 'no-player';
    pl.dino = true; pl.ostrich = true; pl.redDragon = false; __BH.Game.state = 'play';
    return { x: Math.round(pl.x), y: Math.round(pl.y), T: __BH.Game.T };
  })()`);
  console.log('player', JSON.stringify(s0));

  // 按住方向鍵跑起來（撞牆就換方向，保證每張都是「移動中」）
  const dirs = ['KeyD', 'KeyD', 'KeyS', 'KeyS', 'KeyA', 'KeyA'];
  const shots = [];
  let cur = null;
  for (let i = 0; i < dirs.length; i++) {
    if (cur !== dirs[i]) {
      if (cur) await p.eval("window.dispatchEvent(new KeyboardEvent('keyup', {code:'" + cur + "', bubbles:true}));1");
      cur = dirs[i];
      await p.eval("window.dispatchEvent(new KeyboardEvent('keydown', {code:'" + cur + "', bubbles:true}));1");
      await sleep(150);
    }
    await sleep(90);
    const st = await p.eval(`(function(){
      const pl = __BH.Game.players[0];
      return { wt: +(pl.walkT||0).toFixed(3), mv: !!pl.moving, x: Math.round(pl.x), y: Math.round(pl.y), inv: +(pl.invuln||0).toFixed(2) };
    })()`);
    const f = 'test/_smoke488-f' + i + '.png';
    await p.shot(f);
    shots.push({ file: f, st: st });
    console.log('shot', i, JSON.stringify(st));
  }

  if (cur) await p.eval("window.dispatchEvent(new KeyboardEvent('keyup', {code:'" + cur + "', bubbles:true}));1");
  await sleep(500);
  await p.shot('test/_smoke488-idle.png');

  const moving = shots.filter(function (s) { return s.st.mv; }).length;
  console.log('移動中的截圖：' + moving + '/' + shots.length);
  console.log('walkT 序列', JSON.stringify(shots.map(function (s) { return s.st.wt; })));

  b.close();
  console.log('done');
})().catch(e => { console.error(e); process.exit(1); });
