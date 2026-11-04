const { makeEnv } = require('./_sandbox');
// ① 貼身接觸 → 扣血  ② 站在王的正前方空地 → 王的炸彈燒到人
function setup() {
  const env = makeEnv(); const BH = env.BH, G = env.G;
  BH.BR.opt = { n: 30, team: 1, dur: 10 };
  BH.startBR(); G.state = 'play'; G.countdown = 0;
  const b = G.enemies.filter(e => e.brBoss)[0];
  const me = G.players[0];
  G.players.forEach(q => { if (q !== me) { q.ai = false; q.invuln = 999; q.x = 2.5 * G.T; q.y = 2.5 * G.T; } });
  me.invuln = 0; me.brHp = 10;
  return { BH, G, b, me };
}
// ① 接觸
{
  const { BH, G, b, me } = setup();
  me.x = b.x; me.y = b.y;
  for (let i = 0; i < 8; i++) BH.updateBR(1 / 60);
  console.log('contact: brHp=' + me.brHp + ' (預期 9)');
}
// ② 站在王前方的空地（自己挑方向，避免被牆擋住）
{
  const { BH, G, b, me } = setup();
  const D = [[1,0],[-1,0],[0,1],[0,-1]];
  let placed = false;
  for (const d of D) {
    const cx = Math.floor(b.x / G.T), cy = Math.floor(b.y / G.T);
    if (G.grid[cy + d[1]] && G.grid[cy + d[1]][cx + d[0]] === 0 &&
        G.grid[cy + d[1] * 2] && G.grid[cy + d[1] * 2][cx + d[0] * 2] === 0) {
      me.x = (cx + d[0] * 2 + .5) * G.T; me.y = (cy + d[1] * 2 + .5) * G.T; placed = true; break;
    }
  }
  let hp0 = me.brHp, t = 0;
  for (let i = 0; i < 60 * 20; i++) {
    BH.updateBR(1 / 60); t += 1 / 60;
    if (me.brHp < hp0 || !me.alive) break;
    // 玩家不要站著不動就跳開（模擬會走的人）
  }
  console.log('bomb: placed=' + placed + ' brHp=' + me.brHp + ' after=' + Math.round(t) + 's bombs=' + G.bombs.length);
}
