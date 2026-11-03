const { launch, sleep } = require('./cdp');
const URL = process.argv[2];
(async () => {
  const b = await launch({ port: 9796, w: 1000, h: 700 });
  const p = await b.newPage();
  await p.goto(URL, 5000);
  for (let i = 0; i < 40; i++) { if (await p.eval('!!(window.__BH&&window.__BH.Game)')) break; await sleep(300); }
  await sleep(1200);
  const r = await p.eval(`(function(){
    var BH = window.__BH || {};
    return {
      hasAcct: typeof BH.Acct,
      acctKeys: BH.Acct ? Object.keys(BH.Acct) : null,
      btn: !!document.querySelector('[data-acct="open"], #acctBtn, #btnAcctBig'),
      btnId: (document.querySelector('#btnAcctBig')||{}).id || null,
      boot: (window.__BHB && JSON.stringify(window.__BHB).slice(0,120)) || null,
      ver: BH.VERSION || null
    };
  })()`);
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
