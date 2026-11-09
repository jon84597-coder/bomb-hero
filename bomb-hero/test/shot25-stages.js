// test/shot25-stages.js — v1.6 各關美術／小怪／BOSS 目檢截圖
const path = require('path');
const { launch, sleep } = require('./cdp');

const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
const OUT = p => path.join(__dirname, p);

(async () => {
  const br = await launch({ w: 1280, h: 820, port: 9342 });
  const page = await br.newPage();

  // 1) 標題 + 設定（看「上一頁」與音樂開關工具列）
  await page.goto(URL, 1500);
  await page.shot(OUT('v16-title.png'));
  await page.eval(`document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));document.getElementById('scr-settings').classList.add('on');1`);
  await sleep(250);
  await page.shot(OUT('v16-settings.png'));
  console.log('v16-title.png / v16-settings.png');

  // 2) 八關美術（機關全開）
  for (let st = 1; st <= 8; st++) {
    await page.goto(URL + '?stage=' + st, 1300);
    await page.eval(`(function(){
      var BH = window.__BH;
      BH.settings.hazards = 'on';
      BH.startSolo(${st}, false);
      BH.Game.state = 'play';
      var b = document.querySelector('.overlay-in .mbtn'); if (b) b.click();
      return 1;
    })()`);
    await sleep(900);
    await page.shot(OUT('v16-stage' + st + '.png'));
    const info = await page.eval(`(function(){
      var G = window.__BH.Game, hz = {}, n = 0;
      G.hazards.forEach(function(r){ r.forEach(function(h){ if(h){ n++; hz[h.type] = (hz[h.type]||0)+1; } }); });
      var sp = {};
      G.enemies.forEach(function(e){ sp[e.spec||e.type] = (sp[e.spec||e.type]||0)+1; });
      return { theme: G.theme.name, style: G.theme.style, hz: n, kinds: hz, enemies: sp };
    })()`);
    console.log('第' + st + '關 ' + info.theme + '（' + info.style + '）機關 ' + info.hz +
      ' ' + JSON.stringify(info.kinds) + ' 敵人 ' + JSON.stringify(info.enemies));
  }

  // 3) BOSS 戰
  await page.goto(URL + '?stage=40', 1600);
  await page.eval(`(function(){ var b=document.querySelector('.overlay-in .mbtn'); if(b) b.click(); return 1; })()`);
  await sleep(1200);
  await page.shot(OUT('v16-boss.png'));
  const boss = await page.eval(`(function(){
    var G = window.__BH.Game, e = G.enemies.filter(function(x){return x.boss;})[0];
    return e ? { hp: e.hp, bombs: G.bombs.length } : null;
  })()`);
  console.log('v16-boss.png  ' + JSON.stringify(boss));

  await br.close();
})().catch(e => { console.error('ERR', e); process.exit(1); });
