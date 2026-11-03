// test/_probe-v466.js — v4.66 驗證：①客人不再嘟嘟嘟 ②客人自己的角色 60fps 預測 ③別人 10Hz 插值
const { launch, sleep } = require('./cdp');
const path = require('path');
const FILE = 'file:///' + path.join(__dirname, '../index.html').replace(/\\/g, '/');

(async function () {
  const br = await launch({ port: 9561, w: 1100, h: 700 });
  const hp = await br.newPage();
  const gp = await br.newPage();
  await hp.resize(1100, 700, false);
  await gp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await gp.resize(390, 844, true);

  await hp.goto(FILE, 3200);
  await gp.goto(FILE, 3200);
  for (let i = 0; i < 60; i++) {
    const a = await hp.eval('typeof __BH').catch(() => 'x');
    const b = await gp.eval('typeof __BH').catch(() => 'x');
    if (a === 'object' && b === 'object') break;
    await sleep(300);
  }

  // ---- 房主：開一場 2 人對戰，並把地圖清空（只量同步，不量撞牆） ----
  await hp.eval(`(function(){
    var N = __BH.Net;
    N.on = true; N.role = 'host'; N.pid = 'h1'; N.count = 2;
    N.roster = [{pid:'h1',entry:1,ch:0,slot:0,name:'H'},{pid:'g1',entry:1,ch:1,slot:1,name:'G'}];
    N.startMatch();
    __BH.Game.state = 'play';
    __BH.Game.frozen = false;
    for (var y=0;y<__BH.Game.rows;y++) for (var x=0;x<__BH.Game.cols;x++) if (y===0||x===0||y===__BH.Game.rows-1||x===__BH.Game.cols-1) __BH.Game.grid[y][x]=1; else __BH.Game.grid[y][x]=0;
    __BH.Game.enemies = []; __BH.Game.bombs = []; __BH.Game.flames = [];
    __BH.Game.players[0].x = 5*__BH.Game.T; __BH.Game.players[0].y = 5*__BH.Game.T;
    __BH.Game.players[1].x = 3*__BH.Game.T; __BH.Game.players[1].y = 3*__BH.Game.T;
    return 1;
  })()`);
  await sleep(200);
  const hostT = await hp.eval('__BH.Game.T');
  const hCols = await hp.eval('__BH.Game.cols'), hRows = await hp.eval('__BH.Game.rows');

  // ---- 客人：進遊戲畫面、身份設好 ----
  await gp.eval(`(function(){
    __BH.settings.ctrl='touch'; __BH.applyCtrl();
    __BH.Screen.show('game'); __BH.resizeView();
    var N = __BH.Net; N.on = true; N.role = 'guest'; N.pid = 'g1'; N.mySlot = 1;
    __BH.Game.frozen = false;
    window.__sfx = []; var o = __BH.AudioSys.sfx;
    __BH.AudioSys.sfx = function(n){ window.__sfx.push(n); return o.apply(__BH.AudioSys, arguments); };
    return 1;
  })()`);
  await sleep(300);

  // ---- ①倒數狀態：客人不該進入 countdown，也不該狂播 GO ----
  await hp.eval("__BH.Game.state='countdown'; 1");
  let snapCd = await hp.eval('JSON.stringify(__BH.buildSnap())');
  await gp.eval(`(function(s){ __BH.applySnap(JSON.parse(s)); return 1; })(${JSON.stringify(snapCd)})`);
  const cd = await gp.eval("(function(){ return { st: __BH.Game.state, frozen: !!__BH.Game.frozen, sfx: window.__sfx.slice() }; })()");
  console.log('① 倒數快照 → 客人 state =', cd.st, ' frozen =', cd.frozen, ' 音效 =', JSON.stringify(cd.sfx));

  // 連灌 20 張倒數快照，看會不會逼出任何音效（舊版每張都會播 GO!）
  await gp.eval('window.__sfx.length = 0; 1');
  for (let i = 0; i < 20; i++) {
    snapCd = await hp.eval('JSON.stringify(__BH.buildSnap())');
    await gp.eval(`(function(s){ __BH.applySnap(JSON.parse(s)); return 1; })(${JSON.stringify(snapCd)})`);
  }
  const spam = await gp.eval('window.__sfx.slice()');
  console.log('① 20 張倒數快照後的音效 =', JSON.stringify(spam));

  // ---- ②③ 移動：房主 p1/p0 一起往右，客人按右 ----
  await hp.eval("__BH.Game.state='play'; 1");
  await gp.eval("__BH.Net.myScheme = function(){ return { dirs: function(){ return ['right']; }, action: function(){ return false; } }; }; 1");
  const firstSnap = await hp.eval('JSON.stringify(__BH.buildSnap())');
  await gp.eval(`(function(s){ var N=__BH.Net; N.placeSnap=true; __BH.applySnap(JSON.parse(s)); window.__trace=[]; return 1; })(${JSON.stringify(firstSnap)})`);
  await sleep(120);

  const guestT = await gp.eval('__BH.Game.T');
  console.log('房主 T =', hostT, '／客人 T =', guestT, '／地圖', hCols + 'x' + hRows);

  for (let it = 0; it < 40; it++) {
    for (let k = 0; k < 6; k++) {
      await hp.eval(`(function(){ var G=__BH.Game, d=146/60;
        G.players[0].x += d; G.players[1].x += d; return 1; })()`);
      await gp.eval(`(function(){ __BH.Net.guestTick(1/60);
        var G=__BH.Game, p0=G.players[0], p1=G.players[1];
        window.__trace.push([p0.x, p1.x]); return 1; })()`);
    }
    const snap = await hp.eval('JSON.stringify(__BH.buildSnap())');
    await gp.eval(`(function(s){ __BH.applySnap(JSON.parse(s)); return 1; })(${JSON.stringify(snap)})`);
  }

  const tr = await gp.eval('window.__trace');
  const hEnd = await hp.eval('(function(){ var G=__BH.Game; return [G.players[0].x, G.players[1].x]; })()');
  const me = tr.map(r => r[1]), ot = tr.map(r => r[0]);
  const dMe = me.slice(1).map((v, i) => v - me[i]);
  const dOt = ot.slice(1).map((v, i) => v - ot[i]);
  const stat = function (arr) {
    const abs = arr.map(Math.abs);
    return { mean: +(abs.reduce((a, b) => a + b, 0) / abs.length).toFixed(2), max: +Math.max.apply(null, abs).toFixed(2), zeros: abs.filter(v => v < .2).length };
  };
  console.log('② 自己（預測）每幀位移 =', JSON.stringify(stat(dMe)));
  console.log('③ 別人（插值）每幀位移 =', JSON.stringify(stat(dOt)));
  console.log('   房主 p1.x =', hEnd[1].toFixed(1), '／客人看到的 p1.x =', me[me.length - 1].toFixed(1),
    ' 誤差 =', (hEnd[1] - me[me.length - 1]).toFixed(1), 'px');
  console.log('   範圍 T =', guestT, ' → 每幀應為', (146 / 60).toFixed(2), 'px');

  // ---- ④ 判定半徑 ----
  const hit = await gp.eval(`(function(){
    var G=__BH.Game, out={};
    [62,54,35].forEach(function(T){
      G.T = T;
      out[T] = { art: +__BH.enemyArtR({r:14,spec:'slime'}).toFixed(1), hit: +__BH.foeTouchR({r:14,spec:'slime'}).toFixed(1) };
    });
    return out;
  })()`);
  console.log('④ 小怪 r=14 的身體半徑／碰撞半徑 =', JSON.stringify(hit));

  br.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
