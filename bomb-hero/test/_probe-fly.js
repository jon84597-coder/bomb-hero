const {makeEnv}=require('./_sandbox');
const env=makeEnv(); const P=env.BH,G=P.Game;
P.settings.count=4;P.settings.size='M';P.settings.hazards='off';P.settings.sd='off';P.settings.revenge='off';P.settings.ctrl='kb';
P.Battle.resetSlots();P.startBattle();G.state='play';
for(let y=0;y<G.rows;y++)for(let x=0;x<G.cols;x++)G.grid[y][x]=0;
const path=[{x:3,y:0}]; for(let i=1;i<=8;i++)path.push({x:3,y:i,w:0});
G.bombs.length=0;
G.bombs.push({cx:3,cy:8,px:0,py:0,timer:99,power:1,owner:G.players[0],passers:[],remoteArmed:false,mine:false,moving:null,held:false,ownerLeft:false,seed:0,armT:40,
  flying:{fx:3,fy:0,tx:3,ty:8,t:0,dur:.8,path:path}});
for(let i=0;i<10;i++){ G.state='play'; P.updateWorld(1/60); }
console.log('bombs',G.bombs.length,'flying',!!(G.bombs[0]&&G.bombs[0].flying),'py',G.bombs[0]&&G.bombs[0].py.toFixed(1));
const ys=[];
for(let i=0;i<40;i++){ G.state='play'; P.updateWorld(1/60); if(G.bombs[0]) ys.push(+(G.bombs[0].py.toFixed(1))); }
console.log(ys.join(' '));
console.log('T',G.T);
