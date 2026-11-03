// v4.55 目檢：首頁新增的大逃殺鈕（桌機／手機）＋ 點下去的說明；順便拍腳下炸彈提醒
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const URL = process.env.BH_URL || ('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
const OUT = path.join(__dirname, '_v455');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }

async function open(b, w, h, mobile) {
  const p = await b.newPage();
  await p.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: !!mobile });
  await p.goto(URL, 3200);
  for (let i = 0; i < 60; i++) {
    if (await p.eval('!!(window.__BH && window.__BH.Game)')) break;
    await sleep(250);
  }
  await sleep(500);
  await p.eval(`(function(){ try{ localStorage.setItem('bombhero-tut2','999'); }catch(e){} })()`);
  return p;
}

(async () => {
  const b = await launch({ port: 9633, w: 1280, h: 900 });
  try {
    // 1) 桌機首頁
    let p = await open(b, 1280, 900, false);
    const box = await p.eval(`(function(){
      var el=document.getElementById('btnBR'); if(!el) return null;
      var r=el.getBoundingClientRect();
      return {txt:el.innerText.replace(/\\n/g,'|'), w:Math.round(r.width), h:Math.round(r.height),
        left:Math.round(r.left), top:Math.round(r.top), cls:el.className,
        tag:(el.querySelector('.betaTag')||{}).textContent||''};
    })()`);
    console.log('btnBR', JSON.stringify(box));
    await p.shot(path.join(OUT, 'title-desktop.png'));
    await p.eval(`(function(){ document.getElementById('btnBR').click(); })()`);
    await sleep(500);
    await p.shot(path.join(OUT, 'br-overlay.png'));
    try { await p.close(); } catch (e) { }

    // 2) 手機首頁
    p = await open(b, 390, 844, true);
    await p.shot(path.join(OUT, 'title-phone.png'));
    try { await p.close(); } catch (e) { }

    // 3) 腳下炸彈提醒（實戰畫面）
    p = await open(b, 1280, 900, false);
    await p.eval(`(function(){
      var BH=window.__BH, G=BH.Game;
      document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('on'); });
      BH.startSolo(1, true); G.state='play';
      try{ BH.beginCountdown('battle'); }catch(e){}
      for(var i=0;i<40;i++){ try{ BH.updateWorld(1/60); }catch(e){} }
      var pl=G.players[0];
      var cx=Math.floor(pl.x/G.T), cy=Math.floor(pl.y/G.T);
      G.bombs.push({cx:cx,cy:cy,px:(cx+.5)*G.T,py:(cy+.5)*G.T,timer:9,power:1,owner:pl,seed:1,
        passers:[],moving:null,flying:null,held:false,remoteArmed:false,mine:false,ownerLeft:false,petOwner:null});
      pl.invuln=0;
      G.camSnap=true;
      try{ BH.updateCamera(); }catch(e){}
      for(var j=0;j<8;j++){ try{ BH.updateWorld(1/60); }catch(e){} }
      try{ BH.render(); }catch(e){}
    })()`);
    await sleep(600);
    await p.shot(path.join(OUT, 'bomb-warn.png'));
    try { await p.close(); } catch (e) { }
    console.log('OK');
  } finally {
    try { await b.close(); } catch (e) { }
  }
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
