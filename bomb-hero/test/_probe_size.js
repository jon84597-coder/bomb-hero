const { makeEnv } = require('./_sandbox');
const env = makeEnv(); const P = env.BH, G = P.Game;
P.settings.size='M'; P.startSolo(1,false); G.state='play';
const T = G.T;
const heroH = T * 0.40 * 3.75 * P.HERO_ART_SCALE;   // 主角顯示高度（不含 heroSizeK）
console.log('T=', T, ' 主角高=', heroH.toFixed(1));
const rows = [];
P.ENEMY_SPECIES.forEach(function(sp){
  const e = P.makeEnemy(3,3,sp.id,1,1);
  const R = P.enemyArtR(e);
  const art = P.FOE_ART[sp.id];
  const H = R * (art ? art.hs : 2);
  const W = H * (art ? art.asp : 1);
  rows.push({ id: sp.id, tier: P.FOE_TIER[sp.id], r: sp.r, hs: art?art.hs:0, H: H, W: W, k: H/heroH });
});
rows.sort(function(a,b){ return a.k - b.k; });
console.log('id            tier   r   hs     H      W     H/主角');
rows.forEach(function(o){
  console.log('%s %s %s %s %s %s %s',
    o.id.padEnd(12), String(o.tier).padEnd(5), String(o.r).padStart(2),
    o.hs.toFixed(2).padStart(5), o.H.toFixed(0).padStart(5), o.W.toFixed(0).padStart(5),
    o.k.toFixed(2).padStart(6));
});
const low = rows.filter(function(o){ return o.k < 1.0; });
console.log('\n比主角小的：', low.length, low.map(function(o){return o.id+'('+o.k.toFixed(2)+')';}).join(' '));
