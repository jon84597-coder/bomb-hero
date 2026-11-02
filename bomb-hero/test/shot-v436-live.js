// v4.36 線上部屬驗證：Render 上真的是 4.36、章節魔王（第 4 關）真的出王
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v436live');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const URL = process.argv[2] || 'https://bomb-hero-game.onrender.com/';

(async () => {
  const b = await launch({ port: 9496, w: 1000, h: 720 });
  const errs = [];
  try {
    const p = await b.newPage();
    await p.goto(URL, 8000);
    for (let i = 0; i < 80; i++) {
      if (await p.eval('!!(window.__BH && window.__BH.Game)')) break;
      await sleep(500);
    }
    await sleep(1200);
    console.log('ONLINE', await p.eval(`(function(){
      var BH = window.__BH;
      return JSON.stringify({
        ver: BH.VERSION, logVer: BH.VERSION_LOG[0].v,
        badges: [document.getElementById('verTxt') && document.getElementById('verTxt').textContent],
        bossArt: Object.keys(BH.BOSS_ART || {}).length,
        kits: Object.keys(BH.FOE_KIT || {}).length,
        maxLive: BH.FOE_MAX_LIVE,
        ch4: BH.isChapterFinal(4), ch32: BH.isChapterFinal(32)
      });
    })()`));
    await p.shot(path.join(OUT, 'title.png'));

    // 第 4 關 = 第一大關的章節魔王
    await p.eval('window.__BH.startSolo(4)');
    await sleep(900);
    await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
    await sleep(400);
    await p.eval("(function(){ var ok=document.getElementById('rhOk'); if(ok) ok.click(); })()");
    for (let i = 0; i < 60; i++) {
      if (await p.eval("window.__BH.Game.state==='play'")) break;
      await sleep(300);
    }
    await sleep(600);
    console.log('STAGE4', await p.eval(`(function(){
      var BH = window.__BH, G = BH.Game;
      var boss = G.enemies.filter(function (e) { return e.type === 'boss'; })[0];
      var p0 = G.players[0];
      // 把玩家挪到王前面，畫面才帶得到王
      if (boss) {
        p0.x = boss.x; p0.y = Math.max(2 * G.T, boss.y - 2.2 * G.T);
        p0.invuln = 99;
        G.camSnap = true;
      }
      return JSON.stringify({
        state: G.state, mobs: G.enemies.length,
        boss: !!boss, hp: boss && boss.maxHp, sizeMul: boss && boss.sizeMul,
        ch: boss && boss.chapterBoss, art: boss && BH.bossArtKey(boss)
      });
    })()`));
    await sleep(900);
    await p.shot(path.join(OUT, 'stage4.png'));
    console.log('errs', errs.length, errs.slice(0, 3));
  } finally {
    await b.close();
  }
})().catch(function (e) { console.error('ERR', e.message); process.exit(1); });
