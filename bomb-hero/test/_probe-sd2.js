const { makeEnv } = require('./_sandbox');
const env = makeEnv(); const P = env.BH, G = P.Game;
P.settings.size='M'; P.settings.ctrl='kb'; P.settings.sd='on'; P.settings.time=120;
P.startBattle(2,'normal'); G.state='play';
P.buildSdList();
const T=G.T, ai=G.players[1], human=G.players[0];
ai.alive=true; ai.maxBombs=0; ai.ai=true;
human.alive=true; human.ai=false;
human.x=Math.floor(G.cols/2)*T+T/2; human.y=Math.floor(G.rows/2)*T+T/2;
function roomSize(cx, cy) {
  const seen = {}; seen[cx+','+cy]=1; const q=[[cx,cy]];
  for (let i=0;i<q.length&&q.length<400;i++){ const c=q[i];
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(function(v){ const x=c[0]+v[0],y=c[1]+v[1];
      if(x<1||y<1||x>G.cols-2||y>G.rows-2)return; if(G.grid[y][x]!==0)return;
      if(seen[x+','+y])return; seen[x+','+y]=1; q.push([x,y]); }); }
  return q.length;
}
let idx=-1;
for(let i=0;i<G.sdList.length;i++){ const c=G.sdList[i]; if(G.grid[c[1]][c[0]]!==0)continue; if(roomSize(c[0],c[1])>=40){idx=i;break;} }
console.log('chosen idx', idx, 'room', roomSize(G.sdList[idx][0], G.sdList[idx][1]));
const victim=G.sdList[idx];
G.sdIndex=idx;
ai.x=victim[0]*T+T/2; ai.y=victim[1]*T+T/2;
G.bombs.length=0; G.timer=0; G.sdActive=true; G.sdIndex=0; G.sdTimer=0;
console.log('victim', victim, 'grid', G.grid[victim[1]][victim[0]]);
for (let f=0; f<40; f++){
  G.state='play'; P.updateBattle(1/60); human.alive=true;
  if (f<12 || f===39){
    const cx=Math.floor(ai.x/T), cy=Math.floor(ai.y/T);
    console.log('f'+f, 'pos', ai.x.toFixed(1), ai.y.toFixed(1), 'cell', cx+','+cy,
      'dir', ai.aiDir, 'dizzy', ai.dizzy, 'alive', ai.alive, 'sdRoom', ai.sdRoom);
  }
  if(!ai.alive){ console.log('DEAD', f); break; }
}
