const {makeEnv}=require('./_sandbox');
const env=makeEnv(); const BH=env.BH,G=BH.Game,P=BH;
P.settings.size='M';P.settings.hazards='on';P.settings.ctrl='kb';
P.startSolo(1,false); G.state='play';
const T=G.T, me=G.players[0];
const Y=5;
for(let x=2;x<=14;x++){ G.grid[Y][x]=0; G.grid[Y+1][x]=0; G.hazards[Y][x]=null; }
G.bombs.length=0; G.enemies.length=0;
G.hazards[Y][6]={type:'convey',dir:'down'};
me.x=6*T+T/2; me.y=Y*T+T/2; me.invuln=0; me.alive=true; me.dizzy=0; me.dino=false;
me.scheme={dirs:()=>['right'],action:()=>false,actionHeld:()=>false};
console.log('T',T,'start',me.x.toFixed(1),me.y.toFixed(1));
for(let i=0;i<8;i++){
  P.controlHuman(me,1/60);
  const afterCtrl=[me.x.toFixed(2), me.y.toFixed(2), me.beltMul];
  P.hazardTick(me,1/60,true);
  console.log(i,'ctrl',JSON.stringify(afterCtrl),'-> ',me.x.toFixed(2),me.y.toFixed(2),
    'cell',Math.floor(me.x/T)+','+Math.floor(me.y/T),'dizzy',me.dizzy,'mv',me.moving);
}
