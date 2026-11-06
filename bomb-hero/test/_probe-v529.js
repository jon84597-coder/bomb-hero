// v5.29 截圖：單人簡單模式的 5 格生命（HUD）、設定頁難度說明
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v529');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

async function shot(p, name, w, h) {
  await p.resize(w || 430, h || 900);
  const s = await p.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(s.data, 'base64'));
  console.log('  📸 ' + name);
}

(async () => {
  const b = await launch({ port: 9663, w: 430, height: 900 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 430, height: 900, deviceScaleFactor: 2, mobile: true });
    await p.goto(URL, 6000);
    for (let i = 0; i < 80; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game)')) break; await sleep(250); }
    await p.eval("document.body.classList.add('touch')");
    await sleep(300);

    // ① 設定頁的難度說明（預設就停在簡單）
    await p.eval(`(function(){
      var P=window.__BH;
      P.Screen.show('solo');
    })()`);
    await sleep(500);
    await p.eval(`(function(){
      var el=document.getElementById('segSoloDiff'); if(!el) return;
      el.scrollIntoView({block:'center'});
      var pane=el.closest('.scrollpane')||el.parentNode.parentNode; if(pane) pane.scrollTop = Math.max(0, el.getBoundingClientRect().top + pane.scrollTop - 260);
    })()`);
    await sleep(500);
    await shot(p, '01-settings-easy');

    // ② 簡單模式開局：HUD 應該 5 顆心
    await p.eval(`(function(){
      var P=window.__BH;
      P.settings.soloDiff='easy';
      P.startSolo(3);
      P.Game.state='play';
      var ov=document.getElementById('overlay'); if(ov) ov.classList.remove('on');
    })()`);
    await sleep(700);
    await shot(p, '02-hud-5hearts');

    console.log('  lives=' + await p.eval('window.__BH.Game.players[0].lives'));
    console.log('  startLives=' + await p.eval('window.__BH.Game.startLives'));

    // ③ 掉兩格之後（3 實心 + 2 空心）
    await p.eval(`(function(){
      var P=window.__BH, p=P.Game.players[0];
      p.lives = 3; p.invuln = 0;
    })()`);
    await sleep(600);
    await shot(p, '03-hud-3of5');

    // ④ 普通模式對照：3 顆心
    await p.eval(`(function(){
      var P=window.__BH;
      P.settings.soloDiff='normal';
      P.startSolo(3);
      P.Game.state='play';
      var ov=document.getElementById('overlay'); if(ov) ov.classList.remove('on');
    })()`);
    await sleep(700);
    await shot(p, '04-hud-normal-3');
    console.log('  normal lives=' + await p.eval('window.__BH.Game.players[0].lives'));

    // ⑤ 桌面寬度（電腦版 HUD 一樣要好看）
    await p.eval(`(function(){
      var P=window.__BH;
      P.settings.soloDiff='easy';
      P.startSolo(3);
      P.Game.state='play';
      var ov=document.getElementById('overlay'); if(ov) ov.classList.remove('on');
    })()`);
    await sleep(700);
    await shot(p, '05-desktop-hud', 1100, 700);
  } finally {
    await b.close();
  }
})().catch(function (e) { console.error(e); process.exit(1); });
