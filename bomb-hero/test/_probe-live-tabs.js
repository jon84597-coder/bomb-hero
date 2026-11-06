// 線上實測（Render）：手機尺寸打開三個面板，量頁籤位置＋截圖
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, '_tabs');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

const URL0 = 'https://bomb-hero-game.onrender.com/?v=' + Date.now();

(async () => {
  const b = await launch({ port: 9826, w: 430, h: 932 });
  const p = await b.newPage();
  await p.resize(430, 932, true);
  await p.goto(URL0, 12000);
  for (let i = 0; i < 80; i++) {
    if (await p.eval('!!(window.__BH && window.__BH.Game)')) break;
    await sleep(400);
  }
  await sleep(1500);
  console.log('VERSION = ' + await p.eval('(window.__BH && window.__BH.VERSION) || "?"'));
  console.log('SW = ' + await p.eval('(document.querySelector("#verLogVer")||{}).textContent || "?"'));

  for (const [k, id, tid, bid, btn] of [
    ['ach', 'achModal', 'achTabs', 'achBody', 'btnAch'],
    ['rk', 'rankModal', 'rkTabs', 'rkBody', 'btnRank'],
    ['on', 'onModal', 'onTabs', 'onBody', 'btnPlayers']]) {
    const r = await p.eval(`(function(){
      var b=document.getElementById('${btn}'); if(!b) return 'NO BUTTON';
      b.click(); return 1; })()`);
    await sleep(900);
    const o = await p.eval(`(function(){
      var pn=document.querySelector('#${id} .bhpanel'), tb=document.getElementById('${tid}'), bd=document.getElementById('${bid}');
      if(!pn||!tb) return null;
      var pr=pn.getBoundingClientRect(), tr=tb.getBoundingClientRect(), br=bd.getBoundingClientRect();
      var chips=tb.children, rows=0, prev=-999, over=0, maxR=0, maxB=0;
      for(var i=0;i<chips.length;i++){var r=chips[i].getBoundingClientRect();maxR=Math.max(maxR,r.right);maxB=Math.max(maxB,r.bottom);
        if(Math.abs(r.top-prev)>4){rows++;prev=r.top;} if(r.bottom>pr.bottom+1||r.right>pr.right+1)over++;}
      return {n:chips.length,rows:rows,tabTop:Math.round(tr.top-pr.top),tabBottom:Math.round(pr.bottom-tr.bottom),
        tabH:Math.round(tr.height),chipH:Math.round(chips[0].getBoundingClientRect().height),over:over,
        bodyH:Math.round(br.height),order:getComputedStyle(tb).order};
    })()`);
    console.log(k + '  ' + (o ? (o.n + ' 項／' + o.rows + ' 列  距頂 ' + o.tabTop + ' 距底 ' + o.tabBottom +
      '  列高 ' + o.tabH + '  chipH ' + o.chipH + '  溢出 ' + o.over + '  內文高 ' + o.bodyH + '  order=' + o.order) : 'no panel') + (r === 1 ? '' : ' [' + r + ']'));
    await p.shot(path.join(OUT, 'live-' + k + '.png'));
    await p.eval(`(function(){ document.querySelectorAll('.bhmodal').forEach(function(m){m.classList.remove('on');}); return 1; })()`);
    await sleep(300);
  }
  b.close();
})();
