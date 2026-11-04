const { launch, sleep } = require('./cdp');
const path = require('path');
const F = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
(async () => {
  const b = await launch({ w: 844, h: 390 });
  const p = await b.newPage();
  await p.send('Runtime.enable');
  await p.goto(F, 2200);
  for (let i = 0; i < 40; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(200); }
  await p.eval("document.body.classList.add('touch');1");
  await sleep(400);
  console.log(await p.eval(`(function(){
    var out=[];
    var scr=document.getElementById('scr-title');
    Array.prototype.forEach.call(scr.children,function(c){
      var b=c.getBoundingClientRect(), st=getComputedStyle(c);
      out.push({tag:c.tagName+'.'+c.className, y:Math.round(b.y), h:Math.round(b.height),
        mt:st.marginTop, mb:st.marginBottom, flex:st.flex, jc:st.justifyContent});
    });
    return JSON.stringify({scrPad:getComputedStyle(scr).padding, scrMargin:getComputedStyle(scr).margin,
      kids:out}, null, 1);
  })()`));
  try { await b.close(); } catch (e) {}
})().catch(e=>{console.error(e);process.exit(1);});
