const { launch, sleep } = require('./cdp');
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
(async () => {
  const cdp = await launch({ port: 9486, w: 900, h: 430 });
  const p = await cdp.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.send('Emulation.setUserAgentOverride', { userAgent: UA, platform: 'Android' });
  await p.resize(900, 430, true);
  await p.goto('http://127.0.0.1:3111/index.html', 2400);
  await p.eval(`(function(){try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}var r=document.getElementById('rotHint');if(r&&r.parentNode)r.parentNode.removeChild(r);})()`);
  await p.eval(`(function(){var b=document.getElementById('btnLang');if(b)b.click();var it=document.querySelector('#langList [data-lang="en"]');if(it)it.click();})()`);
  await sleep(900);
  await p.eval(`(function(){ try{ __BH.Screen.show('settings'); }catch(e){} })()`);
  await sleep(600);
  console.log(await p.eval(`(function(){
    var out=[]; var els=document.querySelectorAll('.screen.on small');
    for(var i=0;i<els.length;i++){ var e=els[i]; if(/[\\u4e00-\\u9fff]/.test(e.textContent)) out.push(e.closest('[id]') ? (e.closest('[id]').id) : '?'); }
    return JSON.stringify(out.slice(0,12));
  })()`));
  console.log(await p.eval(`(function(){
    var el=document.querySelector('.screen.on small');
    var chain=[]; var e=el; for(var i=0;i<5&&e;i++){ chain.push(e.tagName+'.'+(typeof e.className==='string'?e.className:'')+(e.id?'#'+e.id:'')); e=e.parentElement; }
    return chain.join(' < ') + ' || text=' + el.textContent;
  })()`));
  console.log('setCmdHint:', await p.eval(`(function(){var e=document.getElementById('setCmdHint');return e?e.innerHTML.slice(0,120):'none';})()`));
  cdp.close();
})().catch(e => { console.error(e); process.exit(2); });
