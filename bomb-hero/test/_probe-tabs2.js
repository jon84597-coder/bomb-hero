// 其他寬度＋其他面板（雜貨商人／招式師／後台）的頁籤樣式檢查
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, '_tabs');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

(async () => {
  const b = await launch({ port: 9822, w: 430, h: 932 });
  const p = await b.newPage();
  await p.goto('file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/'), 5000);
  for (let i = 0; i < 60; i++) { if (await p.eval('!!(window.__BH && window.__BH.Game)')) break; await sleep(250); }
  await sleep(700);

  const box = (sel) => `(function(){var e=document.querySelector('${sel}');if(!e)return null;var r=e.getBoundingClientRect(),c=getComputedStyle(e);return {w:Math.round(r.width),h:Math.round(r.height),bg:c.backgroundColor,fs:c.fontSize,color:c.color,border:c.borderRadius};})()`;

  for (const [w, h, tag] of [[320, 700, 'w320'], [390, 844, 'w390'], [1280, 900, 'desk']]) {
    await p.resize(w, h, w < 700);
    await sleep(400);
    await p.eval(`(function(){ document.querySelectorAll('.bhmodal').forEach(function(m){m.classList.remove('on');}); window.RankUI.open(); return 1; })()`);
    await sleep(500);
    const o = await p.eval(`(function(){
      var tb=document.getElementById('rkTabs'),pn=document.querySelector('#rankModal .bhpanel');
      var chips=tb.children,rows=0,prev=-999,maxR=0,maxB=0,tr=tb.getBoundingClientRect(),pr=pn.getBoundingClientRect();
      for(var i=0;i<chips.length;i++){var r=chips[i].getBoundingClientRect();maxR=Math.max(maxR,r.right);maxB=Math.max(maxB,r.bottom);if(Math.abs(r.top-prev)>4){rows++;prev=r.top;}}
      return {rows:rows,tabH:Math.round(tr.height),overR:Math.round(Math.max(0,maxR-tr.right)),overB:Math.round(Math.max(0,maxB-pr.bottom)),chipW:Math.round(chips[0].getBoundingClientRect().width)};
    })()`);
    console.log(tag + '  排名頁籤 ' + o.rows + ' 列 高 ' + o.tabH + '  chipW ' + o.chipW + '  溢出R ' + o.overR + ' B ' + o.overB);
    await p.shot(path.join(OUT, 'rk-' + tag + '.png'));
  }

  /* 其他面板的頁籤樣式（不開面板，直接看 computed style） */
  await p.resize(430, 932, true);
  await sleep(300);
  for (const sel of ['#shopRTabs', '#shopRTabs button', '#skillTabs button', '#bhTabs', '#bhTabs button']) {
    console.log(sel + '  ' + JSON.stringify(await p.eval(box(sel))));
  }
  b.close();
})();
