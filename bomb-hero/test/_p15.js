// test/_p15.js — 換英文後逐頁掃殘留中文（含說明頁整份）
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const OUT = __dirname + '/_audit/';
const LANG = process.env.L || 'en';

(async () => {
  const cdp = await launch({ port: 9484, w: 900, h: 430 });
  const p = await cdp.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.send('Emulation.setUserAgentOverride', { userAgent: UA, platform: 'Android' });
  await p.resize(900, 430, true);
  await p.goto('http://127.0.0.1:3111/index.html', 2600);
  await p.eval(`(function(){ try{localStorage.setItem('bombhero-rotskip','1');}catch(e){} var r=document.getElementById('rotHint'); if(r&&r.parentNode) r.parentNode.removeChild(r); __BH.settings.mapMode='classic'; })()`);

  const sw = await p.eval(`(function(){
    try { var b=document.getElementById('btnLang'); if(b) b.click();
      var it=document.querySelector('#langList [data-lang="${LANG}"]'); if(it){ it.click(); return 'ok'; }
      return 'noitem'; } catch(e){ return 'err:'+e.message; }
  })()`);
  await sleep(900);
  console.log('切語言:', sw, 'lang=', await p.eval('document.documentElement.lang'));

  const SCAN = `(function(){
    var root = document.querySelector('.screen.on') || document.body;
    var out = [];
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var n;
    var RE = /[\\u3400-\\u9fff]/;
    while ((n = w.nextNode())) {
      var s = (n.nodeValue||'').trim();
      if (!s || !RE.test(s)) continue;
      var pe = n.parentElement; if (!pe) continue;
      var cs = getComputedStyle(pe);
      if (cs.display==='none'||cs.visibility==='hidden') continue;
      out.push((pe.id||pe.className||pe.tagName) + ': ' + s.slice(0,30));
    }
    return JSON.stringify({ n: out.length, list: out.slice(0, 25) });
  })()`;

  for (const s of ['learn', 'solo', 'rpg', 'settings', 'shop', 'title', 'char', 'daily', 'battle', 'online']) {
    await p.eval(`(function(){ try{ __BH.Screen.show('${s}'); }catch(e){} })()`);
    await sleep(500);
    const r = JSON.parse(await p.eval(SCAN));
    console.log('[' + s + '] 殘留 ' + r.n);
    r.list.forEach(x => console.log('    ' + x));
  }
  await p.eval(`(function(){ try{ __BH.Screen.show('learn'); }catch(e){} })()`);
  await sleep(400);
  await p.shot(OUT + 'learn-' + LANG + '.png');
  cdp.close();
})().catch(e => { console.error(e); process.exit(2); });
