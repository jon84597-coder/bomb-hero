const path=require('path'), fs=require('fs');
const {launch,sleep}=require('./cdp');
const URL=process.env.BH_URL||('file:///'+path.resolve(__dirname,'../index.html').replace(/\\/g,'/'));
const OUT=path.join(__dirname,'_v455');
(async()=>{
  const b=await launch({port:9635,w:1280,h:900});
  const p=await b.newPage();
  await p.goto(URL,3200);
  for(let i=0;i<60;i++){ if(await p.eval('!!(window.__BH&&window.__BH.Game)'))break; await sleep(250); }
  const pos=await p.eval(`(function(){
    var BH=window.__BH,G=BH.Game;
    document.querySelectorAll('.screen').forEach(function(s){s.classList.remove('on');});
    BH.startSolo(1,true);G.state='play';
    try{BH.beginCountdown('battle');}catch(e){}
    for(var i=0;i<30;i++){try{BH.updateWorld(1/60);}catch(e){}}
    var pl=G.players[0],T=G.T;
    pl.x=6*T+T/2; pl.y=6*T+T/2; pl.invuln=0;
    var cx=6,cy=6;
    G.bombs.push({cx:cx,cy:cy,px:(cx+.5)*T,py:(cy+.5)*T,timer:9,power:1,owner:pl,seed:1,
      passers:[],moving:null,flying:null,held:false,remoteArmed:false,mine:false,ownerLeft:false,petOwner:null});
    G.camSnap=true; try{BH.updateCamera();}catch(e){}
    for(var j=0;j<3;j++){try{BH.updateWorld(1/60);}catch(e){}}
    try{BH.render();}catch(e){}
    var cv=document.getElementById('cv').getBoundingClientRect();
    return {x:Math.round(cv.left+cv.width/2), y:Math.round(cv.top+cv.height/2), T:T};
  })()`);
  console.log(JSON.stringify(pos));
  await sleep(400);
  const clip={x:Math.max(0,pos.x-130),y:Math.max(0,pos.y-130),width:260,height:260,scale:4};
  const s1=await p.send('Page.captureScreenshot',{format:'png',clip:clip});
  fs.writeFileSync(path.join(OUT,'bomb-zoom.png'),Buffer.from(s1.data,'base64'));
  await b.close();
  console.log('ok');
})().catch(e=>{console.error(e);process.exit(1);});
