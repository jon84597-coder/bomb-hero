// v5.34 探針：在真瀏覽器裡跑一次戰鬥曲，確認 WebAudio 沒有例外、排程有在動
const { launch, sleep } = require('./cdp');
const path = require('path');

(async () => {
  const b = await launch({ port: 9897, w: 430, h: 932 });
  try {
    const p = await b.newPage();
    const errs = [];
    p.on && p.on('Runtime.exceptionThrown', function (e) { errs.push(String(e && e.text)); });
    await p.goto('file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/') + '?auto=1', 9000);
    for (let i = 0; i < 100; i++) { if (await p.eval('!!(window.__BH && window.__BH.Game)')) break; await sleep(250); }
    await sleep(600);

    // 使用者手勢（瀏覽器要求）→ AudioContext 才會 running
    await p.eval(`(function(){ try{ document.body.click(); }catch(e){} var c=document.getElementById('cv'); if(c) c.click(); return 1; })()`);
    await sleep(300);

    const r = await p.eval(`JSON.stringify((function(){
      var A = window.__BH.AudioSys, out = { err: null };
      try {
        A.startBGM('brWar10');
        out.sec10 = +A.songSeconds('brWar10').toFixed(1);
        out.sec5 = +A.songSeconds('brWar5').toFixed(1);
        out.secB = +A.songSeconds('battle').toFixed(1);
        var g = A.buildGrid(A.compileWar('brWar10'));
        out.steps = g.steps;
        var ev = 0; for (var i = 0; i < g.grid.length; i++) if (g.grid[i]) ev += g.grid[i].length;
        out.events = ev;
      } catch (e) { out.err = String(e && e.message || e); }
      return out;
    })())`);
    const o = JSON.parse(r);
    console.log('戰鬥曲秒數  對戰', o.secB, '／10 分場', o.sec10, '／5 分場', o.sec5);
    console.log('10 分曲步數', o.steps, '事件數', o.events, '（每步平均', (o.events / o.steps).toFixed(2), '個）');
    console.log('例外', o.err || '無');

    // 讓它真的跑 3 秒，看排程有沒有持續推進
    await sleep(3000);
    const st = await p.eval(`JSON.stringify((function(){
      var A=window.__BH.AudioSys;
      return { war: Object.keys(A.WAR_DEFS||{}).length };
    })())`);
    console.log('WAR_DEFS', st);
    console.log('頁面例外', errs.length ? errs.join(' | ') : '無');
    console.log('done');
  } finally {
    b.close();
  }
})();
