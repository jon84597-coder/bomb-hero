const {makeEnv}=require('./_sandbox');
const env=makeEnv(); const BH=env.BH,G=BH.Game,P=BH;
console.log('EGG_ART keys', BH.EGG_ART?Object.keys(BH.EGG_ART):'NONE', 'EggArt', typeof BH.EggArt);
P.settings.size='M';P.settings.hazards='on';P.settings.ctrl='kb';
P.startSolo(1,false); G.state='play';
const T=G.T;
console.log('eggs',G.eggs.length,'hidden',G.eggsHidden.length, JSON.stringify(G.eggsHidden));
const hid=Object.keys(G.hidden||{}).filter(k=>G.hidden[k]===BH.EGG_HIDDEN);
console.log('hidden keys',hid.length, hid.slice(0,3));
if(hid.length){
  const [ky,kx]=hid[0].split(',').map(Number);
  console.log('grid at',kx,ky,'=',G.grid[ky][kx],'expect 2');
  G.grid[ky][kx]=2;
  P.destroySoft(kx,ky);
  console.log('after destroy → eggs',G.eggs.length,'eggsHidden',G.eggsHidden.length,'egg',JSON.stringify(G.eggs[0]));
  // 火焰測試：剛出生不該被燒掉
  G.flames.length=0; P.addFlame(kx,ky,'fire','down',null,'bomb');
  for(let i=0;i<20;i++) P.updateBattle ? P.updateBattle(1/60) : P.updateWorld(1/60);
  console.log('after flame 20f → eggs',G.eggs.length,'safeT',G.eggs[0]&&G.eggs[0].safeT);
  // 保護結束後火焰應該燒掉
  G.flames.length=0;
  for(let i=0;i<60;i++){ if(G.eggs[0]) G.eggs[0].safeT=0; G.flames.length=0; P.addFlame(kx,ky,'fire','down',null,'bomb'); P.updateWorld?P.updateWorld(1/60):0; }
  console.log('after grace → eggs',G.eggs.length);
}
