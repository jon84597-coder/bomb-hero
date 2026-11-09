const { launch } = require('./cdp');
const path = require('path');
const URL0 = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g,'/');
(async()=>{
  const br = await launch({w:430,h:900,port:9391});
  const p = await br.newPage();
  await p.resize(430,900,true);
  await p.goto(URL0, 3000);
  const r = await p.eval(`(function(){ return { bh: typeof window.__BH, diag: document.getElementById('bootDiag') ? document.getElementById('bootDiag').textContent.slice(0,300) : '', pre: document.getElementById('bootDiagPre') ? document.getElementById('bootDiagPre').textContent.slice(0,400) : '' }; })()`);
  console.log(JSON.stringify(r,null,1));
  await br.close();
})();
