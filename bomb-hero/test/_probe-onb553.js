// test/_probe-onb553.js — v5.53 真瀏覽器驗收：首頁新手卡 / 面板 / 主程式外置後能不能開機
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp.js');

(async () => {
  const b = await launch({ w: 430, h: 900 });
  const url = 'file:///' + path.join(__dirname, '..', 'index.html').replace(/\\/g, '/') + '?cb=' + Date.now();
  const p = await b.newPage();

  const logs = [];
  p.on && p.on('Runtime.exceptionThrown', m => logs.push('EXC ' + (m.exceptionDetails && m.exceptionDetails.text)));
  p.on && p.on('Runtime.consoleAPICalled', m => {
    const t = (m.args || []).map(a => a.value).join(' ');
    if (/MAINFAIL|Error/i.test(t)) logs.push('LOG ' + t);
  });

  await p.goto(url, 2000);
  for (let i = 0; i < 60; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(250); }
  await sleep(1200);

  // 關掉可能的遮罩：轉屏提示 / 引言動畫 / 社交彈窗
  await p.eval(`(function(){
    try{ localStorage.setItem('bombhero-rotskip','1'); }catch(e){}
    var r=document.getElementById('rotHint'); if(r&&r.remove) r.remove();
    try{ if(window.__BH && __BH.ovHide) __BH.ovHide(); }catch(e){}
    try{ if(window.__BH && __BH.Social && __BH.Social.close) __BH.Social.close(); }catch(e){}
    return 1;
  })()`);
  await sleep(600);

  const st = await p.eval(`JSON.stringify({
    ready: document.readyState,
    hasBH: typeof __BH,
    ver: window.__BH && __BH.VERSION,
    hasOnb: typeof window.BHOnboard,
    card: !!(document.getElementById('bhoCard')),
    cardHidden: (function(){ var c=document.getElementById('bhoCard'); return c? c.getBoundingClientRect().height<6 : null; })(),
    cardText: (function(){ var c=document.getElementById('bhoCard'); return c? (c.innerText||'').replace(/\\s+/g,' ').trim().slice(0,60) : ''; })(),
    tasks: (window.BHOnboard && BHOnboard.TASKS || []).length,
    stage: (function(){ try{ return localStorage.getItem('bombhero-stage'); }catch(e){ return 'ERR'; } })()
  })`);
  console.log('STATE ' + st);

  await p.shot(path.join(__dirname, '_v553-home.png'));

  // 點開面板
  await p.eval(`(function(){ var c=document.getElementById('bhoCard'); if(c && c.click) c.click(); return 1; })()`);
  await sleep(700);
  const op = await p.eval(`JSON.stringify({
    open: (window.BHOnboard && BHOnboard.isOpen()),
    rows: (function(){ var l=document.getElementById('bhoList'); return l? l.children.length : -1; })(),
    panelText: (function(){ var p=document.getElementById('bhOnb'); return p? (p.innerText||'').replace(/\\s+/g,' ').trim().slice(0,90) : ''; })()
  })`);
  console.log('PANEL ' + op);
  await p.shot(path.join(__dirname, '_v553-panel.png'));

  if (logs.length) console.log('LOGS\n' + logs.slice(0, 8).join('\n'));
  else console.log('LOGS (none)');

  await b.close();
})().catch(e => { console.error('PROBE FAIL', e && e.message); process.exit(1); });
