// test/diag-v414b.js —— 端到端模擬 controlHuman：遙控器（定時炸彈）下的踢彈 / 撿彈 / 投彈
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game;

P.settings.size = 'M'; P.settings.hazards = 'off'; P.settings.sd = 'off';
P.settings.ctrl = 'kb'; P.settings.soloDiff = 'normal'; P.settings.soloTime = 300;
P.startSolo(1, false);
G.state = 'play';
G.flames.length = 0;

const T = G.T;
function clearRow(y, x0, x1) { for (let x = x0; x <= x1; x++) { G.grid[y][x] = 0; if (G.hidden) delete G.hidden[y + ',' + x]; } }

const IN = { dir: null, act: false };
function fakeScheme() {
  return {
    dirs: function () { return IN.dir ? [IN.dir] : []; },
    action: function () { return IN.act; },
    actionHeld: function () { return IN.act; },
    detonate: function () { return false; },
    fire: function () { return false; }
  };
}

function fresh(opts) {
  const p = G.players[0];
  G.bombs.length = 0; G.flames.length = 0; G.items.length = 0; G.enemies.length = 0;
  p.alive = true; p.dead = false; p.carry = null; p.facing = 'right';
  p.kick = !!opts.kick; p.glove = !!opts.glove; p.punch = !!opts.punch;
  p.remote = !!opts.remote; p.line = !!opts.line;
  p.maxBombs = 8; p.power = 2; p.dizzy = 0; p.skull = null;
  p.x = 5 * T + T / 2; p.y = 5 * T + T / 2;
  p.scheme = fakeScheme();
  clearRow(5, 1, 13); clearRow(4, 1, 13); clearRow(6, 1, 13);
  IN.dir = null; IN.act = false;
  return p;
}
function putBomb(p, cx, cy, remote) {
  const b = { cx: cx, cy: cy, px: cx * T + T / 2, py: cy * T + T / 2,
    timer: remote ? 9999 : 2.4, power: 2, owner: p, passers: [], remoteArmed: !!remote,
    mine: false, mineLife: 10, moving: null, flying: null, held: false, seed: 1, armT: 40 };
  G.bombs.push(b);
  return b;
}
function frame(p, n) { for (let i = 0; i < (n || 1); i++) P.controlHuman(p, 1 / 60); }

// 情境：炸彈在右邊一格，玩家往右推 → 應該踢出去
function kickTest(opts, label) {
  const p = fresh(opts);
  const b = putBomb(p, 6, 5, opts.remote);
  IN.dir = 'right';
  frame(p, 30);
  IN.dir = null;
  console.log('  ' + label.padEnd(24) + ' 踢出=' + (b.moving ? 'Y' : 'N') +
    ' 玩家格=' + Math.floor(p.x / T) + ',' + Math.floor(p.y / T));
  return !!b.moving;
}
// 情境：炸彈在右邊一格，站著按動作鍵 → 手套應該撿起來
function pickTest(opts, label) {
  const p = fresh(opts);
  const b = putBomb(p, 6, 5, opts.remote);
  IN.act = true; frame(p, 1); IN.act = false;
  console.log('  ' + label.padEnd(24) + ' 撿起=' + (p.carry ? 'Y' : 'N') +
    ' 炸彈held=' + (b.held ? 'Y' : 'N'));
  return !!p.carry;
}
// 情境：撿起來後按動作鍵 → 應該投出去
function throwTest(opts, label) {
  const p = fresh(opts);
  const b = putBomb(p, 6, 5, opts.remote);
  IN.act = true; frame(p, 1); IN.act = false;
  const got = !!p.carry;
  IN.act = true; frame(p, 1); IN.act = false;
  console.log('  ' + label.padEnd(24) + ' 撿=' + (got ? 'Y' : 'N') + ' 投=' + (b.flying ? 'Y' : 'N') +
    ' 落點=' + b.cx + ',' + b.cy);
}
// 情境：先撿道具（遙控器/線圈）再撿彈
function itemThenPick(itemType) {
  const p = fresh({ glove: true });
  P.applyItem(p, itemType);
  const b = putBomb(p, 6, 5, !!p.remote);
  IN.act = true; frame(p, 1); IN.act = false;
  console.log('  ' + ('手套→撿到 ' + itemType + '→撿彈').padEnd(24) + ' 撿起=' + (p.carry ? 'Y' : 'N') +
    ' 場上炸彈數=' + G.bombs.length);
}

console.log('=== 踢彈 ===');
kickTest({ kick: true }, '踢彈鞋');
kickTest({ kick: true, remote: true }, '踢彈鞋+遙控器');
kickTest({ kick: true, glove: true }, '踢彈鞋+手套');
kickTest({ kick: true, glove: true, remote: true }, '踢彈鞋+手套+遙控器');
kickTest({ punch: true }, '拳擊');
kickTest({ punch: true, remote: true }, '拳擊+遙控器');

console.log('\n=== 撿彈（按動作鍵）===');
pickTest({ glove: true }, '手套');
pickTest({ glove: true, remote: true }, '手套+遙控器');
itemThenPick('remote');
itemThenPick('line');
itemThenPick('kick');

console.log('\n=== 撿起後投擲 ===');
throwTest({ glove: true }, '手套');
throwTest({ glove: true, remote: true }, '手套+遙控器');
