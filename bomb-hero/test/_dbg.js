const { launch } = require('./cdp');
(async () => {
  const b = await launch({ w: 430, h: 900, port: 9401 });
  const p = await b.newPage();
  await p.resize(430, 900, true);
  await p.goto('http://127.0.0.1:3122/?unlock=all', 4000);
  for (let i = 0; i < 20; i++) {
    const st = await p.eval(`(function(){ return { bh: typeof window.__BH, v: window.__BH && window.__BH.VERSION }; })()`);
    if (st.bh === 'object' && st.v) break;
    await new Promise(r => setTimeout(r, 400));
  }
  const r = await p.eval(`(function(){
    var A = window.__BH.AudioSys;
    var B = window.__BHB || {};
    return { stub: A.__stub, errs: (B.errs || []).map(function (e) { return String(e && (e.msg || e)); }), ver: window.__BH.VERSION };
  })()`);
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
