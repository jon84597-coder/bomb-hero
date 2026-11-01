// test/diag-v414.js —— 診斷：拿到遙控器（定時炸彈）後，搬彈手套撿不起來、踢彈鞋踢不動
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game;

P.settings.size = 'M'; P.settings.hazards = 'off'; P.settings.sd = 'off';
P.settings.ctrl = 'kb'; P.settings.soloDiff = 'normal'; P.settings.soloTime = 300;
P.startSolo(1, false);
G.state = 'play';

function clearRow(y, x0, x1) { for (let x = x0; x <= x1; x++) { G.grid[y][x] = 0; if (G.hidden) delete G.hidden[y + ',' + x]; } }

function setup(opts) {
  const p = G.players[0];
  const T = G.T;
  G.bombs.length = 0; G.flames.length = 0; G.items.length = 0;
  p.alive = true; p.dead = false;
  p.kick = !!opts.kick; p.glove = !!opts.glove; p.punch = !!opts.punch;
  p.remote = !!opts.remote; p.line = false;
  p.carry = null; p.facing = 'right'; p.maxBombs = 8;
  p.x = 5 * T + T / 2; p.y = 5 * T + T / 2;
  clearRow(5, 4, 10);
  // 放一顆自己的炸彈在右邊一格，並把 passers 設好（模擬剛放下來的炸彈）
  const b = {
    cx: 6, cy: 5, px: 6 * T + T / 2, py: 5 * T + T / 2,
    timer: opts.remote ? 9999 : 2.4, power: 2, owner: p,
    passers: [p], remoteArmed: !!opts.remote, mine: false, mineLife: 10,
    moving: null, flying: null, held: false, seed: 1, armT: 40
  };
  G.bombs.push(b);
  return { p, b, T };
}

function report(label, opts) {
  const { p, b } = setup(opts);
  const kicked = P.kickBomb(p, 'right');
  const moving = !!(b.moving);
  // 重置，測撿彈
  const r2 = setup(opts);
  // 手套撿彈要「走進炸彈格」→ 移到炸彈上看 placeBomb 的行為
  r2.p.x = 6 * r2.T + r2.T / 2; r2.p.y = 5 * r2.T + r2.T / 2;
  P.placeBomb(r2.p);
  const carried = !!r2.p.carry;
  console.log('  ' + label.padEnd(34) + ' kick=' + (kicked ? 'Y' : 'N') + ' moving=' + (moving ? 'Y' : 'N') + '  撿起=' + (carried ? 'Y' : 'N'));
  return { kicked, moving, carried };
}

console.log('=== 診斷：踢彈 / 撿彈（右邊一格有炸彈）===');
const cases = [
  ['無道具', {}],
  ['只有踢彈鞋', { kick: true }],
  ['只有手套', { glove: true }],
  ['踢彈鞋＋手套', { kick: true, glove: true }],
  ['踢彈鞋＋遙控器', { kick: true, remote: true }],
  ['手套＋遙控器', { glove: true, remote: true }],
  ['踢彈鞋＋手套＋遙控器', { kick: true, glove: true, remote: true }],
  ['拳擊＋手套', { punch: true, glove: true }]
];
const res = {};
cases.forEach(function (c) { res[c[0]] = report(c[0], c[1]); });

console.log('\n=== 結論 ===');
console.log('踢彈在「有手套」時失效：', !res['踢彈鞋＋手套'].kicked);
console.log('撿彈在「有遙控器」時失效：', !res['手套＋遙控器'].carried);
