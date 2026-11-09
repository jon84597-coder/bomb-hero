const path=require('path');
const { launch, sleep } = require('./cdp');
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
(async()=>{
  const cdp=await launch({port:9504,w:900,h:600});
  const p=await cdp.newPage();
  await p.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  await p.send('Emulation.setUserAgentOverride',{userAgent:UA,platform:'Android'});
  await p.resize(900,600,true);
  await p.goto('http://127.0.0.1:3111/index.html',2400);
  await p.eval(`(function(){try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}var r=document.getElementById('rotHint');if(r&&r.parentNode)r.parentNode.removeChild(r);})()`);
  await p.eval(`(function(){var b=document.getElementById('btnLang');if(b)b.click();var it=document.querySelector('#langList [data-lang="en"]');if(it)it.click();})()`);
  await sleep(900);
  await p.eval(`(function(){ try{ __BH.Screen.show('help'); }catch(e){} })()`);
  await sleep(900);
  console.log(await p.eval(`(function(){
    var el=document.getElementById('scr-help');
    var out=[]; var w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,null); var n;
    while((n=w.nextNode())){
      var s=(n.nodeValue||'').trim();
      if(!s||!/[\\u4e00-\\u9fff]/.test(s)) continue;
      var pe=n.parentElement;
      out.push((pe.tagName+'.'+(typeof pe.className==='string'?pe.className:'')+'#'+(pe.id||'')).slice(0,44)+' :: '+s.slice(0,60));
    }
    return out.slice(0,80).join('\\n');
  })()`));
  await p.shot(path.join(__dirname,'_audit','help-en.png'));
  cdp.close();
})().catch(e=>{console.error(e);process.exit(2);});
