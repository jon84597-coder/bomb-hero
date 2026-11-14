const { launch, sleep } = require('./cdp');
(async () => {
  const br = await launch({ w: 1100, h: 900, port: 9432 });
  const page = await br.newPage();
  await page.goto('http://127.0.0.1:3122/?t=' + Date.now(), 2600);
  await page.eval(`(function(){
    var B=window.__BH; B.settings.size='M'; B.settings.ctrl='kb'; B.settings.sd='off';
    B.startSolo(1,false);
    var G=B.Game; G.state='play'; G.countdown=0; G.paused=false;
    try{B.hideOverlay&&B.hideOverlay();}catch(e){}
    return 1;})()`);
  await sleep(700);
  console.log(await page.eval(`(function(){
    var B=window.__BH,G=B.Game;
    var ch=B.floorChunk(0,0);
    if(!ch) return 'no chunk';
    var g=ch.getContext('2d');
    var d=g.getImageData(0,0,ch.width,ch.height).data;
    var n=ch.width*ch.height, a0=0,a255=0,mid=[];
    for(var i=0;i<n;i++){var a=d[i*4+3]; if(a===0)a0++; else if(a===255)a255++; else if(mid.length<8) mid.push(a);}
    return JSON.stringify({w:ch.width,h:ch.height,total:n,alpha0:a0,alpha255:a255,midSamples:mid});
  })()`));
  await br.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
