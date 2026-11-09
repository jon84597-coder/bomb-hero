const { launch, sleep } = require('./cdp');
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
(async()=>{
  const cdp=await launch({port:9502,w:900,h:430});
  const p=await cdp.newPage();
  await p.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  await p.send('Emulation.setUserAgentOverride',{userAgent:UA,platform:'Android'});
  await p.resize(900,430,true);
  await p.goto('http://127.0.0.1:3111/index.html',2400);
  await p.eval(`(function(){try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}var r=document.getElementById('rotHint');if(r&&r.parentNode)r.parentNode.removeChild(r);})()`);
  await p.eval(`(function(){var b=document.getElementById('btnLang');if(b)b.click();var it=document.querySelector('#langList [data-lang="en"]');if(it)it.click();})()`);
  await sleep(900);
  console.log('screens:', await p.eval(`(function(){ return JSON.stringify(Object.keys(__BH.Screen.list||{}).slice(0,30)); })()`));
  for (const s of ['help','guide','about']) {
    const has = await p.eval(`(function(){ return !!document.getElementById('scr-${s}'); })()`);
    if (!has) { console.log(s,'不存在'); continue; }
    await p.eval(`(function(){ try{ __BH.Screen.show('${s}'); }catch(e){} })()`);
    await sleep(800);
    const r = await p.eval(`(function(){
      var el=document.getElementById('scr-${s}');
      var txt=el.innerText||'';
      var cjk=(txt.match(/[\\u4e00-\\u9fff]/g)||[]);
      // 逐分頁展開
      var panes=el.querySelectorAll('.bhpane'); var detail=[];
      for (var i=0;i<panes.length;i++){
        var t2=panes[i].innerText||''; detail.push(panes[i].className.replace('bhpane','').trim()+'='+(t2.match(/[\\u4e00-\\u9fff]/g)||[]).length);
      }
      return JSON.stringify({cjk:cjk.length, panes:panes.length, detail:detail, head:txt.replace(/\\s+/g,' ').slice(0,120)});
    })()`);
    console.log(s, r);
  }
  cdp.close();
})().catch(e=>{console.error(e);process.exit(2);});
