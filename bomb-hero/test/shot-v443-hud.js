// v4.43：手機 HUD（直放／橫放）截圖檢查
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const OUT = path.join(__dirname, '_v443');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

async function boot(b, w, h, tag) {
  const p = await b.newPage();
  await p.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true });
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.goto(URL, 2600);
  for (let i = 0; i < 60; i++) {
    if (await p.eval('!!(window.__BH && window.__BH.Game)')) break;
    await sleep(200);
  }
  await p.eval(`(function(){
    var BH=window.__BH;
    BH.settings.ctrl='touch';
    if (BH.applyCtrl) BH.applyCtrl();
    document.body.classList.add('touch');
  })()`);
  await p.eval('window.__BH.startSolo(1)');
  for (let i = 0; i < 40; i++) {
    if (await p.eval('window.__BH.TileArt && window.__BH.TileArt.readyCount() >= 9')) break;
    await sleep(200);
  }
  console.log('  tiles', await p.eval('window.__BH.TileArt.readyCount() + "/" + window.__BH.TileArt.total()'));
  await sleep(600);
  await p.eval("(function(){ var ov=document.getElementById('ovBox'); var b2=ov&&ov.querySelector('button'); if(b2) b2.click(); })()");
  await sleep(300);
  await p.eval("(function(){ var ok=document.getElementById('rhOk'); if(ok) ok.click(); })()");
  for (let i = 0; i < 40; i++) { if (await p.eval("window.__BH.Game.state==='play'")) break; await sleep(200); }
  await p.eval(`(function(){
    var BH=window.__BH,G=BH.Game;
    G.players[0].invuln=0;
    var a=document.getElementById('doorHint'); if(a) a.style.display='none';
    var b3=document.getElementById('annBox'); if(b3) b3.style.display='none';
  })()`);
  await sleep(800);
  return p;
}

function hudInfoScript() {
  return `(function(){
    var top=document.getElementById('gameTop');
    var nav=document.getElementById('navBar');
    var r=top.getBoundingClientRect();
    var cv=document.getElementById('cv').getBoundingClientRect();
    var chips=[].slice.call(top.querySelectorAll('.chip'));
    var rows={};
    chips.forEach(function(c){ var b=c.getBoundingClientRect(); var k=Math.round(b.top); rows[k]=1; });
    var vis=[].slice.call(nav.querySelectorAll('.navbtn')).filter(function(x){
      var b=x.getBoundingClientRect(); return b.width>0 && b.height>0;
    }).map(function(x){ return (x.id||x.className)+'@'+Math.round(x.getBoundingClientRect().left); });
    return {
      topH: Math.round(r.height), topTop: Math.round(r.top), topBot: Math.round(r.bottom),
      chipRows: Object.keys(rows).length,
      chipOverflow: top.scrollWidth > top.clientWidth + 1,
      chipsW: (function(){var last=chips[chips.length-1];return last?Math.round(last.getBoundingClientRect().right):0;})(),
      boxW: Math.round(top.getBoundingClientRect().right),
      navLeft: Math.round(nav.getBoundingClientRect().left),
      cvTop: Math.round(cv.top), cvH: Math.round(cv.height), vh: window.innerHeight,
      pauseBtn: (function(){var e=document.getElementById('pauseBtn');return e?getComputedStyle(e).display:'none';})(),
      navVisible: vis
    };
  })()`;
}

(async () => {
  const b = await launch({ port: 9555, w: 900, h: 900 });
  try {
    // ---------- 直放 ----------
    let p = await boot(b, 390, 844, 'p');
    console.log('直放', JSON.stringify(await p.eval(hudInfoScript()), null, 0));
    await p.shot(path.join(OUT, 'portrait.png'));
    await p.eval("(function(){ var m=document.getElementById('navMore'); if(m) m.classList.add('on'); })()");
    await sleep(300);
    await p.shot(path.join(OUT, 'portrait-more.png'));
    await p.send('Page.close').catch(() => { });

    // ---------- 橫放 ----------
    p = await boot(b, 844, 390, 'l');
    console.log('橫放', JSON.stringify(await p.eval(hudInfoScript()), null, 0));
    await p.shot(path.join(OUT, 'landscape.png'));
    await p.eval("(function(){ var m=document.getElementById('navMore'); if(m) m.classList.add('on'); })()");
    await sleep(300);
    await p.shot(path.join(OUT, 'landscape-more.png'));
  } finally {
    await b.close();
  }
})();
