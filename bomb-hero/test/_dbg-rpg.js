const path=require('path');
const { launch, sleep } = require('./cdp');
const URL='file:///'+path.resolve(__dirname,'../index.html').replace(/\\/g,'/');
(async()=>{
  const b=await launch({port:9558,w:900,h:600});
  try{
    const p=await b.newPage();
    await p.send('Emulation.setDeviceMetricsOverride',{width:900,height:600,deviceScaleFactor:1,mobile:false});
    await p.goto(URL,3000);
    for(let i=0;i<60;i++){ if(await p.eval('!!(window.__BH&&window.__BH.Rpg)')) break; await sleep(300);}
    console.log(await p.eval(`(function(){
      var out={};
      try{ window.__BH.Rpg.render(); out.ok=1; }catch(e){ out.err=String(e&&e.message); }
      var sb=document.getElementById('segRpgMap');
      out.children=sb?sb.children.length:-1;
      out.html=sb?sb.innerHTML.slice(0,120):'nosb';
      return JSON.stringify(out);
    })()`));
    console.log('RPG export', await p.eval("typeof window.__BH.RPG"));
  } finally { await b.close(); }
})().catch(e=>console.error('ERR',e.message));
