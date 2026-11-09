const fs=require('fs'), path=require('path');
const { launch, sleep } = require('./cdp');
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const LANG=process.env.L||'en';
function zhValues(){
  const src=fs.readFileSync(path.join(__dirname,'..','js','i18n-src.js'),'utf8');
  const body=src.slice(src.indexOf('`'),src.lastIndexOf('`'));
  const out=[];
  body.split('\n').forEach(function(l){
    if(!l||l.indexOf('|')<0) return; const c=l.split('|'); if(c.length!==6) return;
    const zh=c[1], tv=c[LANG==='ja'?4:LANG==='ko'?5:3];
    if(!zh||zh.length<2||tv==null||tv===zh) return; if(!/[\u4e00-\u9fff]/.test(zh)) return;
    out.push(zh);
  });
  return out;
}
(async()=>{
  const cdp=await launch({port:9498,w:900,h:430});
  const p=await cdp.newPage();
  await p.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  await p.send('Emulation.setUserAgentOverride',{userAgent:UA,platform:'Android'});
  await p.resize(900,430,true);
  await p.goto('http://127.0.0.1:3111/index.html',2400);
  await p.eval(`(function(){try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}var r=document.getElementById('rotHint');if(r&&r.parentNode)r.parentNode.removeChild(r);})()`);
  await p.eval(`window.__ZH=${JSON.stringify(zhValues())};`);
  await p.eval(`(function(){var b=document.getElementById('btnLang');if(b)b.click();var it=document.querySelector('#langList [data-lang="${LANG}"]');if(it)it.click();})()`);
  await sleep(900);
  let total=0;
  for (const s of ['help','learn','tut']) {
    const ok=await p.eval(`(function(){ try{ __BH.Screen.show('${s}'); return document.querySelector('#scr-${s}')? 'ok':'noScreen'; }catch(e){ return 'err'; } })()`);
    await sleep(700);
    // 說明頁有分頁，逐一點
    const tabs=await p.eval(`(function(){ var panes=document.querySelectorAll('.bhpane'); for(var i=0;i<panes.length;i++){ panes[i].classList.add('on'); } return String(panes.length); })()`);
    await sleep(800);
    const r=await p.eval(`(function(){
      if(!window.__ZHSET) window.__ZHSET=new Set(window.__ZH);
      var root=document.querySelector('.screen.on')||document.body;
      function vis(el){for(var e=el;e&&e!==document.body;e=e.parentElement){var cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden')return false;}return true;}
      var out=[];var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null);var n;
      while((n=w.nextNode())){var s=(n.nodeValue||'').trim();if(!s||!/[\\u4e00-\\u9fff]/.test(s))continue;var pe=n.parentElement;if(!pe||!vis(pe))continue;if(!window.__ZHSET.has(s))continue;out.push((pe.id||pe.className||pe.tagName)+': '+s.slice(0,30));}
      return JSON.stringify(out);
    })()`);
    const arr=JSON.parse(r); total+=arr.length;
    console.log('['+s+'] screen='+ok+' tabs='+tabs+' 殘留 '+arr.length);
    arr.slice(0,10).forEach(x=>console.log('    '+x));
  }
  console.log('總計',total);
  cdp.close();
})().catch(e=>{console.error(e);process.exit(2);});
