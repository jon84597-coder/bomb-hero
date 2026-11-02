const { makeEnv } = require('./_sandbox');
const env = makeEnv(); const P = env.BH, G = P.Game;
P.settings.size='M'; P.startSolo(1,false); G.state='play';
const T = G.T, heroH = T * 0.40 * 3.75 * P.HERO_ART_SCALE;
const out = { T: T, heroH: heroH, scale: P.HERO_ART_SCALE, rows: [] };
P.ENEMY_SPECIES.forEach(function(sp){
  const e = P.makeEnemy(3,3,sp.id,1,1);
  const R = P.enemyArtR(e);
  const art = P.FOE_ART[sp.id];
  out.rows.push({ id: sp.id, r: sp.r, R: R, hs: art?art.hs:0, asp: art?art.asp:1,
                  tier: P.FOE_TIER[sp.id], anim: art?art.anim:'' });
});
console.log(JSON.stringify(out, null, 1));
