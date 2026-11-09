const { launch, sleep } = require('./cdp');
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
(async()=>{
  const cdp=await launch({port:9500,w:900,h:430});
  const p=await cdp.newPage();
  await p.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  await p.send('Emulation.setUserAgentOverride',{userAgent:UA,platform:'Android'});
  await p.resize(900,430,true);
  await p.goto('http://127.0.0.1:3111/index.html',2400);
  await p.eval(`(function(){try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}var r=document.getElementById('rotHint');if(r&&r.parentNode)r.parentNode.removeChild(r);})()`);
  await p.eval(`(function(){var b=document.getElementById('btnLang');if(b)b.click();var it=document.querySelector('#langList [data-lang="en"]');if(it)it.click();})()`);
  await sleep(900);
  await p.eval(`(function(){ try{ __BH.Screen.show('help'); }catch(e){} })()`);
  await sleep(800);
  for (let i=0;i<5;i++){
    await p.eval(`(function(){ var bs=document.querySelectorAll('#scr-help [data-hp], #scr-help .hseg button, #scr-help .segs button'); if(bs[${i}]) bs[${i}].click(); })()`);
    await sleep(450);
    const r=await p.eval(`(function(){
      var pane=document.querySelector('.bhpane.on');
      if(!pane) return 'noPane';
      var txt=(pane.innerText||'').replace(/\\s+/g,' ').slice(0,180);
      var cjk=(pane.innerText||'').match(/[\\u4e00-\\u9fff]/g);
      return JSON.stringify({n:cjk?cjk.length:0, dt:pane.querySelectorAll('dt').length, head:txt});
    })()`);
    console.log('pane'+i, r);
  }
  cdp.close();
})().catch(e=>{console.error(e);process.exit(2);});
