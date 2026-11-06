// 各尺寸的頁籤是否溢出（橫向手機／平板／小手機）
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, '_tabs');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

(async () => {
  const b = await launch({ port: 9823, w: 430, h: 932 });
  const p = await b.newPage();
  await p.goto('file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/'), 5000);
  for (let i = 0; i < 60; i++) { if (await p.eval('!!(window.__BH && window.__BH.Game)')) break; await sleep(250); }
  await sleep(700);
  for (const [w, h, tag] of [[932, 430, 'land932'], [768, 1024, 'tab768'], [360, 780, 'w360']]) {
    await p.resize(w, h, w < 700);
    await sleep(400);
    await p.eval(`(function(){ document.querySelectorAll('.bhmodal').forEach(function(m){m.classList.remove('on');}); return 1; })()`);
    for (const [k, fn, mid, tid] of [['ach', 'AchUI', 'achModal', 'achTabs'], ['rk', 'RankUI', 'rankModal', 'rkTabs']]) {
      await p.eval(`(function(){ try{ window.${fn}.open(); return 1; }catch(e){ return 0; } })()`);
      await sleep(450);
      const o = await p.eval(`(function(){
        var tb=document.getElementById('${tid}'),pn=document.querySelector('#${mid} .bhpanel'),bd=document.getElementById('${tid.replace('Tabs','Body')}');
        var chips=tb.children,rows=0,prev=-999,tr=tb.getBoundingClientRect(),pr=pn.getBoundingClientRect(),br=bd.getBoundingClientRect();
        var over=0,maxR=0;
        for(var i=0;i<chips.length;i++){var r=chips[i].getBoundingClientRect();maxR=Math.max(maxR,r.right);if(Math.abs(r.top-prev)>4){rows++;prev=r.top;}
          if(r.right>tr.right+1||r.bottom>pr.bottom+1)over++;}
        return {rows:rows,over:over,tabH:Math.round(tr.height),bodyH:Math.round(br.height),panelH:Math.round(pr.height),chipH:Math.round(chips[0].getBoundingClientRect().height)};
      })()`);
      console.log(tag + ' ' + k + '  列 ' + o.rows + '  頁籤高 ' + o.tabH + '  內文高 ' + o.bodyH + '/' + o.panelH + '  chipH ' + o.chipH + '  溢出 ' + o.over);
      if (k === 'ach') await p.shot(path.join(OUT, 'chk-' + tag + '.png'));
      await p.eval(`(function(){ document.querySelectorAll('.bhmodal').forEach(function(m){m.classList.remove('on');}); return 1; })()`);
      await sleep(200);
    }
  }
  b.close();
})();
