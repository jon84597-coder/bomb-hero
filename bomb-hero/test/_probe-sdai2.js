// 探針：AI 面對「隔壁一顆快爆的炸彈」為什麼有時不躲
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game;

function setup() {
  P.settings.count = 4; P.settings.size = 'M'; P.settings.wins = 2;
  P.settings.sd = 'on';
  P.Battle.resetSlots(); P.startBattle(); G.state = 'play';
  G.sdActive = true; G.sdIndex = 3; G.sdTimer = 0;
  G.bombs = []; G.flames = [];
  G.players.forEach(function (p) { p.alive = true; p.invuln = 0; p.dino = false; });
  return G.T;
}
function findOpen(minN) {
  for (let y = 2; y < G.rows - 2; y++) {
    for (let x = 2; x < G.cols - 2; x++) {
      if (G.grid[y][x] !== 0) continue;
      let n = 0;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (v) {
        if (G.grid[y + v[1]][x + v[0]] === 0) n++;
      });
      if (n >= minN) return { x: x, y: y };
    }
  }
  return { x: 5, y: 5 };
}

for (let run = 0; run < 12; run++) {
  const T = setup();
  const ai = G.players[1];
  G.players[0].x = (G.cols - 2) * T; G.players[0].y = (G.rows - 2) * T;
  G.players[2].x = (G.cols - 2) * T; G.players[2].y = 2 * T;
  G.players[3].x = (G.cols - 2) * T; G.players[3].y = 3 * T;
  const sp = findOpen(4);
  ai.x = sp.x * T + T / 2; ai.y = sp.y * T + T / 2;
  const cx = sp.x, cy = sp.y;
  G.bombs.push({
    cx: cx + 1, cy: cy, px: (cx + 1) * T + T / 2, py: cy * T + T / 2,
    timer: .9, power: 1, owner: G.players[0], passers: [], remoteArmed: false,
    mine: false, moving: null, held: false, ownerLeft: false, seed: 0, armT: 40
  });
  let maxAway = 0, died = false, trace = [];
  for (let i = 0; i < 90; i++) {
    G.sdTimer = 999;
    const ax0 = Math.floor(ai.x / T), ay0 = Math.floor(ai.y / T);
    P.updateBattle(1 / 60);
    const ax = Math.floor(ai.x / T), ay = Math.floor(ai.y / T);
    const dc = Math.abs(ax - cx) + Math.abs(ay - cy);
    if (dc > maxAway) maxAway = dc;
    if (i < 4) trace.push(i + ':' + ax + ',' + ay + ' dir=' + ai.aiDir + ' d=' + dc +
      ' xy=' + ai.x.toFixed(0) + '/' + ai.y.toFixed(0) +
      ' nbr=' + [[1,0],[-1,0],[0,1],[0,-1]].map(function (v) { return G.grid[ay+v[1]] && G.grid[ay+v[1]][ax+v[0]]; }).join('') +
      ' cart=' + !!ai.cart + ' dizzy=' + (ai.dizzy||0) + ' carry=' + (ai.carry||'') + ' ai=' + !!ai.ai);
    if (!ai.alive) { died = true; break; }
    if (maxAway >= 2) break;
  }
  console.log('run' + run, 'spot=' + cx + ',' + cy, 'maxAway=' + maxAway, died ? 'DIED' : '',
    'alive=' + ai.alive);
  if (maxAway < 2) {
    console.log('   bombs=', JSON.stringify(G.bombs.map(function (b) { return b.cx + ',' + b.cy + ' t' + b.timer.toFixed(2); })));
    console.log('   trace=', trace.slice(0, 14).join(' | '));
  }
}
