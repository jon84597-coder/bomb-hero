const fs=require('fs'), path=require('path');
const { launch, sleep } = require('./cdp');
const UA='Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
(async()=>{
  const cdp=await launch({port:9506,w:900,h:700});
  const p=await cdp.newPage();
  await p.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
  await p.send('Emulation.setUserAgentOverride',{userAgent:UA,platform:'Android'});
  await p.resize(900,700,true);
  await p.goto('http://127.0.0.1:3111/index.html',2400);
  await p.eval(`(function(){try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}var r=document.getElementById('rotHint');if(r&&r.parentNode)r.parentNode.removeChild(r);})()`);
  await p.eval(`(function(){ try{ __BH.Screen.show('help'); }catch(e){} })()`);
  await sleep(700);
  const tabs=['basic','item','ride','stage','br','daily','foe','tip'];
  const all=[];
  for (const t of tabs){
    await p.eval(`(function(){ var b=document.querySelector('#helpTabs [data-ht="${t}"]'); if(b) b.click(); })()`);
    await sleep(650);
    const r=await p.eval(`(function(){
      var body=document.getElementById('helpBody');
      if(!body) return '[]';
      var out=[];
      var all=body.querySelectorAll('*');
      for (var i=0;i<all.length;i++){
        var el=all[i];
        if (el.tagName==='CANVAS') continue;
        var html=el.innerHTML||'';
        if (!/[\\u4e00-\\u9fff]/.test(html)) continue;
        // 只收「葉節點」：子元素裡沒有中文的，才當一個翻譯單位
        var kids=el.children, hasKid=false;
        for (var j=0;j<kids.length;j++){ if (/[\\u4e00-\\u9fff]/.test(kids[j].outerHTML||'')) { hasKid=true; break; } }
        if (hasKid) continue;
        var plain = kids.length===0;
        out.push({ t: el.tagName.toLowerCase(), c: (typeof el.className==='string'?el.className:''), s: plain? (el.textContent||'') : html });
      }
      return JSON.stringify(out);
    })()`);
    let arr=[]; try{ arr=JSON.parse(r); }catch(e){}
    arr.forEach(x=>all.push(x));
  }
  // 去重
  const seen=new Set(), uniq=[];
  all.forEach(x=>{ const k=x.s; if(!k||seen.has(k)) return; if(/\n/.test(k)) return; if(k.indexOf('|')>=0) return; seen.add(k); uniq.push(x); });
  fs.writeFileSync(path.join(__dirname,'_help554.json'), JSON.stringify(uniq,null,1));
  let ch=0; uniq.forEach(x=>ch+=x.s.length);
  console.log('單位', uniQ=uniq.length, 'zh 字數', ch);
  const byTag={}; uniq.forEach(x=>{ byTag[x.t+'|'+x.c]=(byTag[x.t+'|'+x.c]||0)+1; });
  console.log(JSON.stringify(byTag));
})().catch(e=>{console.error(e);process.exit(2);});
