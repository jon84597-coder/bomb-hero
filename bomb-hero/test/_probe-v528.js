// v5.28 截圖：設定頁新兩欄、大字模式、死因卡、觀戰名字列
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v528');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

async function shot(p, name, w, h) {
  await p.resize(w || 430, h || 900);
  const s = await p.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(s.data, 'base64'));
  console.log('  📸 ' + name);
}

(async () => {
  const b = await launch({ port: 9661, w: 430, h: 900 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 430, height: 900, deviceScaleFactor: 2, mobile: true });
    await p.goto(URL, 6000);
    for (let i = 0; i < 80; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game)')) break; await sleep(250); }
    await p.eval("document.body.classList.add('touch')");
    await sleep(300);

    // ① 設定頁：文字大小／減少動態
    await p.eval(`(function(){
      var P=window.__BH;
      P.Screen.show('settings');
      var tab=document.querySelector('.settab[data-tab="gen"]'); if(tab) tab.click();
    })()`);
    await sleep(600);
    await p.eval(`(function(){
      var el=document.getElementById('labFont'); if(!el) return;
      el.scrollIntoView({block:'center'});
    })()`);
    await sleep(500);
    await shot(p, '01-settings-a11y');

    // ② 大字模式：同一頁開大字
    await p.eval(`(function(){
      var P=window.__BH; P.settings.font='l'; P.applyA11y();
      var el=document.getElementById('labFont'); if(el) el.scrollIntoView({block:'center'});
    })()`);
    await sleep(600);
    await shot(p, '02-bigtext');
    await p.eval(`(function(){ var P=window.__BH; P.settings.font='n'; P.applyA11y(); })()`);

    // ③ 死因卡：單人開局 → 移動一圈 → 命歸零
    await p.eval(`(function(){
      var P=window.__BH; P.startSolo(4);
      P.Game.state='play';
      var ov=document.getElementById('overlay'); if(ov) ov.classList.remove('on');
    })()`);
    await sleep(500);
    await p.eval(`(function(){
      var P=window.__BH, G=P.Game, p=G.players[0];
      window.__mv = setInterval(function(){
        var t = Date.now()/240;
        p.x = (G.cols*0.5 + Math.cos(t)*2.2) * G.T;
        p.y = (G.rows*0.5 + Math.sin(t)*1.8) * G.T;
        p.alive = true;
      }, 50);
    })()`);
    await sleep(1400);
    await p.eval(`(function(){
      var P=window.__BH, G=P.Game, p=G.players[0];
      clearInterval(window.__mv);
      p.lives = 0; p.dead = true; p.alive = false; p.respawnT = 0.05;
    })()`);
    await sleep(1600);
    await shot(p, '03-deathcard');

    // ④ 觀戰名字列：大逃殺開局 → 自己出局
    await p.eval(`(function(){
      var P=window.__BH; P.startBR(); P.Game.state='play';
      var ov=document.getElementById('overlay'); if(ov) ov.classList.remove('on');
      var me=P.Game.players[0]; me.alive=false; me.dead=true;
    })()`);
    await sleep(1200);
    await shot(p, '04-spectate');
  } catch (e) {
    console.error('ERR', e && e.message);
  } finally {
    await b.close();
  }
})();
