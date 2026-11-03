// v4.55 探測：對戰玩家頭像在「人數 < 8」時是否被拉成橢圓
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const URL = process.env.BH_URL || ('file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/'));
const OUT = path.join(__dirname, '_v455');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }

(async function () {
  const W = +(process.argv[2] || 1280), H = +(process.argv[3] || 800), N = +(process.argv[4] || 4);
  const b = await launch({ width: W, height: H });
  const p = await b.newPage();
  await p.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 800 });
  await p.goto(URL, 3200);
  for (let i = 0; i < 60; i++) {
    if (await p.eval('!!(window.__BH && window.__BH.Game)')) break;
    await sleep(300);
  }
  await sleep(500);
  // 直接開一場 4 人對戰
  const info = await p.eval(`(function(){
    var BH=window.__BH;
    BH.settings.count = ${N};
    BH.startBattle();
    var row=document.getElementById('pkRoster');
    var out={cls:row?row.className:'', cards:[]};
    [].slice.call(document.querySelectorAll('#pkRoster .pcard canvas')).forEach(function(c){
      var r=c.getBoundingClientRect();
      var s=getComputedStyle(c);
      out.cards.push({w:+r.width.toFixed(1),h:+r.height.toFixed(1),cssW:s.width,cssH:s.height,
        flex:s.flexShrink+'/'+s.flexBasis, rows:document.querySelectorAll('#pkRoster .pcard').length});
    });
    return out;
  })()`);
  console.log(JSON.stringify(info, null, 1));
  await sleep(700);
  await p.eval('(function(){ try{ window.__BH.render(); }catch(e){} })()');
  const shot = await p.send('Page.captureScreenshot', { format: 'png', clip: { x: 4, y: 8, width: 130, height: 50, scale: 8 } });
  fs.writeFileSync(path.join(OUT, 'battle-'+W+'x'+H+'-'+N+'p.png'), Buffer.from(shot.data, 'base64'));
  await b.close();
  console.log('shot -> _v455/battle-'+W+'x'+H+'-'+N+'p.png');
})().catch(function (e) { console.error(e); process.exit(1); });
