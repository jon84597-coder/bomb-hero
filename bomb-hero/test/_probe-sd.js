const { makeEnv } = require('./_sandbox');
const env = makeEnv(); const P = env.BH, G = P.Game;
P.settings.size='M'; P.settings.ctrl='kb'; P.settings.sd='on'; P.settings.time=120;
P.startBattle(2,'normal'); G.state='play';
P.buildSdList();
const T=G.T, ai=G.players[1], human=G.players[0];
ai.alive=true; ai.maxBombs=0;
function putAt(cx,cy){ ai.x=cx*T+T/2; ai.y=cy*T+T/2; }
putAt(2,2);
human.alive=true; human.ai=false;
human.x=Math.floor(G.cols/2)*T+T/2; human.y=Math.floor(G.rows/2)*T+T/2;
G.bombs.length=0;
G.timer=0; G.sdActive=true; G.sdTimer=0;
const mx=(G.cols-1)/2, my=(G.rows-1)/2;
function dump(){
  const a={x:Math.floor(ai.x/T), y:Math.floor(ai.y/T)}, h={x:Math.floor(human.x/T), y:Math.floor(human.y/T)};
  let out='';
  for(let y=0;y<G.rows;y++){
    let line='';
    for(let x=0;x<G.cols;x++){
      if(x===a.x&&y===a.y) line+='A';
      else if(x===h.x&&y===h.y) line+='P';
      else if(G.grid[y][x]===1) line+='#';
      else if(G.grid[y][x]===2) line+='o';
      else line+='.';
    }
    out+=line+'\n';
  }
  return out;
}
console.log('初始地圖 (A=AI P=玩家 #=牆 o=軟磚):');
console.log(dump());
for (let f=0; f<60*100; f++){
  G.state='play'; P.updateBattle(1/60); human.alive=true;
  if (f%120===0){
    const acx=Math.floor(ai.x/T), acy=Math.floor(ai.y/T);
    console.log((f/60).toFixed(0)+'s cell',acx+','+acy,'d2c',(Math.abs(acx-mx)+Math.abs(acy-my)).toFixed(0),
      'dir',ai.aiDir,'moving',ai.moving,'sdIdx',G.sdIndex,'alive',ai.alive);
  }
  if(!ai.alive){ console.log('DEAD frame',f,'sdIdx',G.sdIndex); console.log(dump()); break; }
}
