const { launch, sleep } = require('./cdp');
const BASE = 'http://127.0.0.1:3111/';
(async function () {
  const b = await launch({ port: 9456, w: 430, h: 900 });
  const p = await b.newPage();
  await p.resize(430, 900, true);
  await p.goto(BASE, 2600);
  const r = await p.eval(`(function(){
    document.body.classList.add('touch','slidepad');
    var t=document.getElementById('touchUI'), f=document.getElementById('fpad');
    var g=getComputedStyle(f);
    var t2=getComputedStyle(t);
    return {
      bodyCls: document.body.className,
      touchDisp: t2.display, touchVis: t2.visibility, touchPos: t2.position,
      fpadDisp: g.display, fpadW: g.width, fpadH: g.height, fpadOpacity: g.opacity,
      fpadZ: g.zIndex, fpadPos: g.position,
      rect: JSON.parse(JSON.stringify(f.getBoundingClientRect())),
      parent: f.parentElement ? f.parentElement.id : null,
      touchRect: JSON.parse(JSON.stringify(t.getBoundingClientRect())),
      cssRuleFound: (function(){
        for (var i=0;i<document.styleSheets.length;i++){
          try{
            var ss=document.styleSheets[i];
            for(var j=0;j<ss.cssRules.length;j++){
              var cr=ss.cssRules[j];
              if(cr.selectorText && cr.selectorText.indexOf('.fpad')>=0) return cr.selectorText+' => '+cr.style.cssText.slice(0,80);
            }
          }catch(e){}
        }
        return 'none';
      })()
    };
  })()`);
  console.log(JSON.stringify(r, null, 2));
  b.close();
})().catch(e => { console.error(e); process.exit(1); });
