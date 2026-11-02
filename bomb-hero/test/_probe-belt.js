const {makeEnv}=require('./_sandbox');
const env=makeEnv(); const BH=env.BH,G=BH.Game,P=BH;
P.settings.size='M';P.settings.hazards='on';P.settings.ctrl='kb';
P.startSolo(1,false); G.state='play';
const T=G.T, me=G.players[0];
const Y=5;
for(let x=2;x<=14;x++){ G.grid[Y][x]=0; G.grid[Y+1][x]=0; G.hazards[Y][x]=null; }
G.hazards[Y][6]={type:'convey',dir:'down'};
G.bombs.length=0; G.enemies.length=0;
function run(dirKey, secs, belt){
  G.hazards[Y][6]= belt?{type:'convey',dir:belt}:null;
  me.x=6*T+T/2; me.y=Y*T+T/2; me.invuln=0; me.alive=true; me.dizzy=0; me.beltMul=1; me.dino=false;
  me.scheme={dirs:()=>[dirKey],action:()=>false,actionHeld:()=>false};
  const x0=me.x,y0=me.y;
  for(let i=0;i<Math.round(secs*60);i++){ P.controlHuman(me,1/60); P.hazardTick(me,1/60,true); }
  return {dx:Math.round(me.x-x0), dy:Math.round(me.y-y0)};
}
console.log('belt down, walk right (perp):', JSON.stringify(run('right',1,'down')));
console.log('belt down, walk down (with) :', JSON.stringify(run('down',1,'down')));
console.log('belt down, walk up (against):', JSON.stringify(run('up',1,'down')));
console.log('no belt,   walk right (flat):', JSON.stringify(run('right',1,null)));
