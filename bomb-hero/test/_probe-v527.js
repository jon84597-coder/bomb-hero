// v5.27 截圖：設定頁新四欄、模式提示卡、賽季區塊、FPS 錶、快捷語面板、發招預告
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = path.join(__dirname, '_v527');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

async function shot(p, name, clip) {
  await p.resize(900, 760);
  const o = { format: 'png' };
  if (clip && clip.width) { o.clip = clip; o.captureBeyondViewport = true; }
  const s = await p.send('Page.captureScreenshot', o);
  fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(s.data, 'base64'));
  console.log('  📸 ' + name);
}

(async () => {
  const b = await launch({ port: 9651, w: 900, h: 760 });
  try {
    const p = await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride', { width: 900, height: 760, deviceScaleFactor: 1, mobile: false });
    await p.goto(URL, 5000);
    for (let i = 0; i < 80; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game)')) break; await sleep(250); }
    // 首頁
    await p.eval("document.body.classList.add('desk')");
    await sleep(400);

    // ① 設定頁：畫質／FPS／震動／色盲四欄
    await p.eval(`(function(){
      var P=window.__BH;
      P.settings.qual='mid'; P.settings.fps=1; P.settings.shake=1; P.settings.cb=1;
      P.Screen.show('settings');
      var tab=document.querySelector('.settab[data-tab="gen"]'); if(tab) tab.click();
    })()`);
    await sleep(600);
    const r1 = await p.eval(`(function(){
      var el=document.getElementById('labQual');
      var box=el?el.closest('.field'):null;
      if(!box) return 'no field';
      var b=box.getBoundingClientRect();
      var boxes=document.querySelectorAll('#paneGen .field');var last=boxes[boxes.length-1];
      var lr=last?last.getBoundingClientRect():b;
      return JSON.stringify({x:Math.max(0,b.x-16),y:Math.max(0,b.y-16),width:Math.min(b.width+32,880),height:Math.min(lr.y+lr.height-b.y+40,740)});
    })()`);
    console.log('qual field', r1);
    let clip = null;
    try { clip = JSON.parse(r1); } catch (e) {}
    await shot(p, '01-settings-qual', clip && clip.w > 0 ? clip : null);

    // ② 首頁 → 禮物面板（賽季）
    await p.eval(`(function(){ window.__BH.Screen.show('home'); })()`);
    await sleep(300);
    await p.eval(`(function(){
      var g=document.getElementById('giftBtn'); if(g) g.click();
    })()`);
    await sleep(700);
    await shot(p, '02-season');

    // 關掉禮物面板
    await p.eval("(function(){var c=document.getElementById('giftX'); if(c)c.click(); var pn=document.getElementById('giftPanel'); if(pn) pn.classList.remove('on'); var bk=document.getElementById('giftBk'); if(bk) bk.classList.remove('on');})()");
    await sleep(300);
    // ③ 模式提示卡：直接開單人（第一次進場）
    await p.eval(`(function(){
      try{ localStorage.removeItem('bombhero-modetip'); }catch(e){}
      location.hash='';
      var P=window.__BH; P.settings.ctrl='kb'; P.settings.hazards='off';
      P.startSolo(1);
    })()`);
    await sleep(900);
    await shot(p, '03-modetip-solo');

    // ④ 遊戲畫面：FPS 錶 ＋ 怪物發招預告（虛線要在怪物身上）
    await p.eval(`(function(){
      var P=window.__BH, G=P.Game, T=G.T;
      G.state='play';
      var ov=document.getElementById('ovIn'); if(ov) ov.classList.add('hide');
      var pl=G.players[0];
      var cx=Math.floor(G.cols/2), cy=Math.floor(G.rows/2);
      pl.x=cx*T+T/2; pl.y=cy*T+T/2;
      G.enemies.length=0;
      var e=P.makeEnemy(Math.min(G.cols-3,cx+3), cy+1, 'frog', 1, 1);
      e.x=Math.min(G.cols-3,cx+3)*T+T/2; e.y=(cy+1)*T+T/2;
      e.skill='spit'; e.fx='water'; e.castT=1.4; e.castX=cx; e.castY=cy; e.boss=false;
      G.enemies.push(e);
      // 再放一隻「只有僵直」的怪，證明它不再畫假虛線
      var e2=P.makeEnemy(2, 2, 'slime', 1, 1);
      e2.skill='beam'; e2.castT=.5; e2.boss=false;
      G.enemies.push(e2);
    })()`);
    await sleep(500);
    await shot(p, '04-cast-aim');

    // ⑤ 快捷語面板
    await p.eval(`(function(){
      try{
        window.__BH.Net.on=true; window.__BH.Net.role='host'; window.__BH.Net.code='1234'; window.__BH.Net.pid='p1';
      }catch(e){}
      window.__BH.QChat.sync();
      window.__BH.QChat.toggle();
    })()`);
    await sleep(400);
    await shot(p, '05-qchat');

    console.log('done');
  } finally { await b.close(); }
})().catch(e => { console.error('ERR', e && e.message); process.exit(1); });
