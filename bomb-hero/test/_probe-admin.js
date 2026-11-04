// test/_probe-admin.js — 診斷「後台三種入口全失效」
const path = require('path');
const { launch, sleep } = require('./cdp.js');

(async () => {
  const b = await launch({ w: 1280, h: 900 });
  const url = 'file:///' + path.join(__dirname, '..', 'index.html').replace(/\\/g, '/') + '?cb=' + Date.now();
  const p = await b.newPage();

  const logs = [];
  p.on && p.on('Runtime.consoleAPICalled', m => logs.push('LOG ' + JSON.stringify(m.args && m.args.map(a => a.value))));
  p.on && p.on('Runtime.exceptionThrown', m => logs.push('EXC ' + (m.exceptionDetails && m.exceptionDetails.text)));

  await p.goto(url, 1800);
  for (let i = 0; i < 60; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(250); }
  await sleep(900);

  const env = await p.eval(`JSON.stringify({
    ready: document.readyState,
    hasAdmin: !!(window.__BH && __BH.Admin),
    hasModal: !!document.getElementById('bhModal'),
    modalInBody: !!document.getElementById('bhModal') && document.getElementById('bhModal').parentNode === document.body,
    modals: document.querySelectorAll('#bhModal').length,
    verTxt: !!document.getElementById('verTxt'),
    verParent: (function(){const v=document.getElementById('verTxt');return v&&v.parentNode?v.parentNode.className+'/'+v.parentNode.tagName:null})(),
    st: window.__BH && __BH.Admin ? JSON.stringify(__BH.Admin.state()) : null,
    adminKeys: window.__BH && __BH.Admin ? Object.keys(__BH.Admin).join(',') : null
  })`);
  console.log('ENV', env);

  // 1) 直接呼叫 open()
  const direct = await p.eval(`(function(){
    try { const r = __BH.Admin.open(); return JSON.stringify({ ret: r, cls: (document.getElementById('bhModal')||{}).className, open: __BH.Admin.state().open }); }
    catch(e){ return 'ERR ' + e.message + ' | ' + (e.stack||'').split('\\n').slice(0,3).join(' <> '); }
  })()`);
  console.log('DIRECT open()', direct);
  await sleep(500);
  await p.shot(path.join(__dirname, '_probe-admin-direct.png'));
  await p.eval(`try{__BH.Admin.close()}catch(e){}`);

  // 2) 連點版本號 3 下
  const tap = await p.eval(`(function(){
    const v = document.getElementById('verTxt');
    if (!v || !v.parentNode) return 'no verTxt';
    const t = v.parentNode;
    for (let i=0;i<3;i++) t.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    return JSON.stringify({ open: __BH.Admin.state().open, cls: document.getElementById('bhModal').className });
  })()`);
  console.log('TRIPLE CLICK', tap);
  await sleep(400);
  await p.eval(`try{__BH.Admin.close()}catch(e){}`);

  // 3) Ctrl+Alt+D
  const key = await p.eval(`(function(){
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'d',code:'KeyD',ctrlKey:true,altKey:true,bubbles:true}));
    return JSON.stringify({ open: __BH.Admin.state().open, cls: document.getElementById('bhModal').className });
  })()`);
  console.log('CTRL+ALT+D', key);

  // 4) 元素是否真的可見
  const vis = await p.eval(`(function(){
    const m = document.getElementById('bhModal');
    const r = m.getBoundingClientRect();
    const cs = getComputedStyle(m);
    return JSON.stringify({ cls:m.className, disp:cs.display, z:cs.zIndex, w:Math.round(r.width), h:Math.round(r.height), top:Math.round(r.top), vis:cs.visibility, op:cs.opacity });
  })()`);
  console.log('VISIBLE', vis);

  console.log('LOGS', logs.slice(-12).join('\n'));
  b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
