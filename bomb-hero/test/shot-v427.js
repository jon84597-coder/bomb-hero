// v4.27 驗證截圖：圖鑑 48 隻分八關 / 新小怪實戰 / 投擲越牆 / 四段縮放
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');

const OUT = path.join(__dirname, '_v427');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

async function ready(p) {
  // SW 首次接管會 reload → 等 __BH 與安裝鈕都在
  for (let i = 0; i < 60; i++) {
    const ok = await p.eval('(function(){var P=window.__BH;return !!(P&&P.Game&&P.VERSION);})()');
    if (ok) return true;
    await sleep(400);
  }
  return false;
}

(async () => {
  const b = await launch({ port: 9466, w: 1000, h: 760 });
  try {
    // ---------- 1~2：圖鑑（第 1 關 vs 第 8 關）----------
    for (const [tag, block] of [['foe1', 0], ['foe8', 7]]) {
      const p = await b.newPage();
      await p.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 760, deviceScaleFactor: 2, mobile: false });
      await p.goto(URL, 2400);
      if (!await ready(p)) { console.log('not ready', tag); continue; }
      // 直接開說明頁的「小怪」分頁
      await p.eval(`(function(){ var b1=document.getElementById('btnHelp'); b1&&b1.click(); })()`);
      await sleep(500);
      await p.eval(`(function(){
        var t=document.getElementById('helpTabs'); if(!t) return 'noTabs';
        var bs=t.querySelectorAll('button');
        for (var i=0;i<bs.length;i++){ if(bs[i].getAttribute('data-ht')==='foe'){ bs[i].click(); return 'ok'; } }
        return 'noTab';
      })()`);
      await sleep(900);
      const n = await p.eval(`(function(){
        var h=document.getElementById('helpBody');
        return h? h.querySelectorAll('canvas[data-sp]').length : -1;
      })()`);
      // 捲到指定關卡標題
      const sc = await p.eval(`(function(){
        var h=document.getElementById('helpBody'); if(!h) return -1;
        var subs=h.querySelectorAll('.hsub');
        var el=subs[${block}]; if(!el) return -1;
        el.scrollIntoView({block:'start'});
        return Math.round(el.getBoundingClientRect().top + window.scrollY);
      })()`);
      await sleep(700);
      const f = path.join(OUT, tag + '.png');
      await p.shot(f);
      console.log(tag, 'icons=' + n, 'scroll=' + sc, f);
      await p.send('Target.closeTarget', { targetId: p.targetId });
    }

    // ---------- 3~6：新小怪實戰 + 投擲 + 縮放 ----------
    const STAGES = [1, 13, 21, 29];
    for (const st of STAGES) {
      const p = await b.newPage();
      await p.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 760, deviceScaleFactor: 2, mobile: false });
      await p.goto(URL, 2400);
      if (!await ready(p)) { console.log('not ready stage', st); continue; }
      await p.eval('window.__BH.startSolo(' + st + ', false)');
      await sleep(450);
      await p.eval(`(function(){ var ov=document.getElementById('ovBox'); var k=ov&&ov.querySelector('button'); if(k) k.click(); return !!k; })()`);
      await sleep(800);
      // 把該關所有種類的小怪叫到附近排排站（看清楚造型）
      const info = await p.eval(`(function(){
        var P=window.__BH, G=P.Game;
        try { P.hideDoorHint && P.hideDoorHint(); } catch(e){}
        G.enemies.length = 0;
        var types = P.stageTypes(G.stage);
        // 找玩家附近的空地格子排成兩排
        var pc = { x: Math.floor(G.players[0].x / G.T), y: Math.floor(G.players[0].y / G.T) };
        var spots = [];
        for (var dy=-2; dy<=2; dy++) for (var dx=2; dx<=7; dx++) {
          var x=pc.x+dx, y=pc.y+dy;
          if (x<1||y<1||x>G.cols-2||y>G.rows-2) continue;
          if (P.cellAt(x,y)!==0) continue;
          spots.push({x:x,y:y});
        }
        var made=0;
        for (var i=0;i<types.length && i<spots.length;i++){
          var e=P.makeEnemy(spots[i].x, spots[i].y, types[i], 1, G.stage);
          e.dirName='left'; e.dirT=99; e.vx=-1;
          G.enemies.push(e); made++;
        }
        G.players[0].invuln = 0;
        G.gameT = 2.2;
        G.camSnap = true; P.updateCamera(0.016);
        try { P.render(); } catch(e){}
        return JSON.stringify({ stage:G.stage, theme:G.theme.name, made:made, types:types.join(','), env:G.enemies.length });
      })()`);
      await sleep(600);
      const f = path.join(OUT, 'stage' + st + '.png');
      await p.shot(f);
      console.log('stage' + st, info);
      await p.send('Target.closeTarget', { targetId: p.targetId });
    }

    // ---------- 7：縮放四連拍（同一畫面 0.58 / 1.0 / 1.35 / 1.85）----------
    {
      const p = await b.newPage();
      await p.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 760, deviceScaleFactor: 2, mobile: false });
      await p.goto(URL, 2400);
      if (await ready(p)) {
        await p.eval('window.__BH.startSolo(1, false)');
        await sleep(450);
        await p.eval(`(function(){ var ov=document.getElementById('ovBox'); var k=ov&&ov.querySelector('button'); if(k) k.click(); })()`);
        await sleep(700);
        for (const z of [0.58, 1, 1.35, 1.85]) {
          const r = await p.eval(`(function(){
            var P=window.__BH, G=P.Game;
            P.Zoom.set(${z});
            for (var i=0;i<240;i++) P.Zoom.tick(1/60);
            G.camSnap=true; P.updateCamera(0.016);
            try { P.render(); } catch(e){}
            var vw=P.viewInfo().w, c=vw/2, W=G.cols*G.T;
            var L=(0+G.camX-c)*G.zoom+c, R=(W+G.camX-c)*G.zoom+c;
            return JSON.stringify({ z:G.zoom, L:Math.round(L), R:Math.round(R), vw:vw });
          })()`);
          await sleep(300);
          await p.shot(path.join(OUT, 'zoom-' + String(z).replace('.', '_') + '.png'));
          console.log('zoom', r);
        }
        await p.send('Target.closeTarget', { targetId: p.targetId });
      }
    }
  } finally {
    await b.close();
  }
  console.log('done ->', OUT);
})();
