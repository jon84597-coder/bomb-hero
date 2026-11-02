// test/_play-smoke.js — 冒烟测试：无头浏览器载入游戏，确认能进单人模式
const { launch, sleep } = require('./cdp');
const path = require('path');

const FILE = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

(async () => {
  const b = await launch({ w: 1280, h: 900, port: 9341 });
  const pg = await b.newPage();
  try {
    await pg.goto(FILE, 2500);
    const info = await pg.eval(`(function(){
      const BH = window.__BH;
      if (!BH) return {ok:false, err:'no __BH'};
      return {ok:true, ver: BH.VERSION, screen: BH.Screen.current,
              errors: (window.__errs||[]).slice(0,3)};
    })()`);
    console.log('INFO', JSON.stringify(info));

    const started = await pg.eval(`(function(){
      const BH = window.__BH;
      BH.startSolo(1);
      BH.beginCountdown('battle');
      const G = BH.Game;
      return {state:G.state, mode:G.mode, stage:G.stage, cols:G.cols, rows:G.rows,
              T:G.T, players:G.players.length, enemies:G.enemies.length,
              p:{x:G.players[0].x, y:G.players[0].y, power:G.players[0].power}};
    })()`);
    console.log('START', JSON.stringify(started));

    await sleep(4500);
    const after = await pg.eval(`(function(){
      const G = window.__BH.Game, p = G.players[0];
      return {state:G.state, alive:p.alive, lives:p.lives, x:Math.round(p.x), y:Math.round(p.y),
              bombs:G.bombs.length, flames:G.flames.length, enemies:G.enemies.length,
              cell:[Math.floor(p.x/G.T), Math.floor(p.y/G.T)]};
    })()`);
    console.log('AFTER', JSON.stringify(after));
    await pg.shot(path.resolve(__dirname, '_play_smoke.png'));
  } catch (e) {
    console.log('ERR', e.message);
  } finally {
    b.close();
  }
})();
