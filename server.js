'use strict';

/* 炸彈超人 Online — 單端口 HTTP 伺服器
 * 伺服器權威：所有遊戲邏輯在後端執行，客戶端只送輸入、收快照
 * 同步方式：HTTP 短輪詢（不需 WebSocket，反向代理友善）
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUB = path.join(__dirname, 'public');

const T = 40, COLS = 15, ROWS = 13;
const ROUND_TIME = 180;      // 單局時限（秒）
const MAX_PLAYERS = 4;

const DIRS = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
  left: { x: -1, y: 0 }, right: { x: 1, y: 0 }
};

const SPAWNS = [
  { x: 1, y: 1, f: 'right' },
  { x: COLS - 2, y: ROWS - 2, f: 'left' },
  { x: COLS - 2, y: 1, f: 'left' },
  { x: 1, y: ROWS - 2, f: 'right' }
];

const COLORS = ['#3f7cf0', '#e0553f', '#2f9bd6', '#c9873a'];
const NAMES = ['藍', '紅', '青', '金'];

// ============ 房間 ============
const rooms = new Map();
let roomSeq = 0;

function makeRoom() {
  let code;
  do { code = String(1000 + Math.floor(Math.random() * 9000)); } while (rooms.has(code));
  const room = {
    id: code,
    players: [],
    grid: null,
    hidden: {},
    bombs: [],
    flames: [],
    items: [],
    state: 'waiting',       // waiting | playing | roundover
    countdown: 3,
    roundOverT: 0,
    roundT: 0,
    roundId: 0,
    winner: null,
    ver: 0,
    changes: [],            // 地圖變化 [[cx,cy], ...]
    created: Date.now()
  };
  rooms.set(code, room);
  roomSeq++;
  buildMap(room);   // 先給一張地圖，等待畫面才有的看
  return room;
}

function makePlayer(pid, name, slot) {
  const sp = SPAWNS[slot];
  return {
    pid: pid,
    name: name,
    slot: slot,
    color: COLORS[slot],
    x: sp.x * T + T / 2,
    y: sp.y * T + T / 2,
    r: 13,
    speed: 112,
    power: 1,
    maxBombs: 1,
    lives: 3,
    alive: true,
    invuln: 2,
    facing: sp.f,
    dir: null,
    bombSeq: 0,
    lastBombSeq: 0,
    score: 0,
    kills: 0,
    speedLv: 0,
    glove: false,
    kick: false,
    carry: null,
    connected: true,
    lastSeen: Date.now()
  };
}

function findSlot(room) {
  for (let i = 0; i < MAX_PLAYERS; i++) {
    if (!room.players.some(function (p) { return p.slot === i; })) return i;
  }
  return -1;
}

// ============ 地圖 ============
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function buildMap(room) {
  const grid = [];
  for (let y = 0; y < ROWS; y++) {
    grid[y] = [];
    for (let x = 0; x < COLS; x++) {
      let v = 0;
      if (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) v = 1;
      else if (x % 2 === 0 && y % 2 === 0) v = 1;
      grid[y][x] = v;
    }
  }

  // 四個出生點周圍留出安全區
  const safe = {};
  SPAWNS.forEach(function (s) {
    safe[s.x + ',' + s.y] = 1;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
      safe[(s.x + d[0]) + ',' + (s.y + d[1])] = 1;
    });
  });

  for (let y = 1; y < ROWS - 1; y++) {
    for (let x = 1; x < COLS - 1; x++) {
      if (grid[y][x] !== 0) continue;
      if (safe[x + ',' + y]) continue;
      if (Math.random() < 0.78) grid[y][x] = 2;
    }
  }

  // 道具埋在軟磚下
  const softs = [];
  for (let y = 1; y < ROWS - 1; y++) {
    for (let x = 1; x < COLS - 1; x++) if (grid[y][x] === 2) softs.push({ x: x, y: y });
  }
  shuffle(softs);

  room.hidden = {};
  const pool = ['power', 'power', 'bomb', 'bomb', 'speed', 'glove', 'kick', 'power', 'bomb', 'speed'];
  let n = 0;
  for (let i = 0; i < softs.length && n < 24; i++) {
    if (Math.random() < 0.42) {
      room.hidden[softs[i].y * COLS + softs[i].x] = pool[Math.floor(Math.random() * pool.length)];
      n++;
    }
  }
  // 保底 8 個
  for (let i = softs.length - 1; i >= 0 && n < 8; i--) {
    const k = softs[i].y * COLS + softs[i].x;
    if (!room.hidden[k]) { room.hidden[k] = pool[Math.floor(Math.random() * pool.length)]; n++; }
  }

  room.grid = grid;
  room.changes = [];
}

function startRound(room) {
  buildMap(room);
  room.bombs = [];
  room.flames = [];
  room.items = [];
  room.roundT = 0;
  room.winner = null;
  room.roundId = (room.roundId || 0) + 1;
  room.changes = [];
  room.state = 'playing';
  room.players.forEach(function (p, i) {
    const sp = SPAWNS[p.slot];
    p.x = sp.x * T + T / 2;
    p.y = sp.y * T + T / 2;
    p.facing = sp.f;
    p.dir = null;
    p.alive = true;
    p.invuln = 2;
    p.lives = 3;
    p.power = 1;
    p.maxBombs = 1;
    p.speed = 112;
    p.bombSeq = 0;
    p.lastBombSeq = 0;
    p.score = 0;
    p.kills = 0;
    p.speedLv = 0;
    p.glove = false;
    p.kick = false;
    p.carry = null;
  });
  room.ver++;
}

// ============ 碰撞 ============
function isSolid(room, cx, cy) {
  if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return true;
  return room.grid[cy][cx] !== 0;
}

function overlapsCell(x, y, r, cx, cy) {
  return (x + r) > cx * T && (x - r) < (cx + 1) * T && (y + r) > cy * T && (y - r) < (cy + 1) * T;
}

function collides(room, x, y, r, ent) {
  const l = Math.floor((x - r) / T);
  const rt = Math.floor((x + r - 0.001) / T);
  const tp = Math.floor((y - r) / T);
  const bt = Math.floor((y + r - 0.001) / T);

  for (let cy = tp; cy <= bt; cy++) {
    for (let cx = l; cx <= rt; cx++) {
      if (isSolid(room, cx, cy)) return true;
      for (let i = 0; i < room.bombs.length; i++) {
        const b = room.bombs[i];
        if (b.cx === cx && b.cy === cy) {
          if (!overlapsCell(ent.x, ent.y, ent.r, cx, cy)) return true;
        }
      }
    }
  }
  return false;
}

function moveAxis(room, e, dx, dy) {
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return false;
  const steps = Math.max(1, Math.ceil(dist / 4));
  let moved = false;
  for (let i = 0; i < steps; i++) {
    const nx = e.x + dx / steps;
    const ny = e.y + dy / steps;
    if (collides(room, nx, ny, e.r, e)) break;
    e.x = nx; e.y = ny; moved = true;
  }
  return moved;
}

function snapAxis(room, e, axis, dt) {
  const cur = axis === 'x' ? e.x : e.y;
  const center = (Math.round(cur / T - 0.5) + 0.5) * T;
  const diff = center - cur;
  if (Math.abs(diff) < 0.25) return;
  const step = Math.sign(diff) * Math.min(Math.abs(diff), e.speed * 2.1 * dt);
  if (axis === 'x') {
    if (!collides(room, e.x + step, e.y, e.r, e)) e.x += step;
  } else {
    if (!collides(room, e.x, e.y + step, e.r, e)) e.y += step;
  }
}

// ============ 遊戲邏輯 ============
// 這格能不能讓炸彈通過（不含自己）
function cellBlockedForBomb(room, cx, cy, self) {
  if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return true;
  if (room.grid[cy][cx] !== 0) return true;
  for (let i = 0; i < room.bombs.length; i++) {
    const b = room.bombs[i];
    if (b === self) continue;
    if (b.cx === cx && b.cy === cy) return true;
  }
  return false;
}

function placeBomb(room, p) {
  if (!p.alive || room.state !== 'playing') return;
  const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);
  if (room.bombs.some(function (b) { return b.cx === cx && b.cy === cy; })) return;
  const mine = room.bombs.filter(function (b) { return b.owner === p.pid; }).length;
  if (mine >= p.maxBombs) return;
  room.bombs.push({
    cx: cx, cy: cy, px: cx * T + T / 2, py: cy * T + T / 2,
    timer: 2.4, power: p.power, owner: p.pid, seed: Math.random() * 6.28,
    moving: null, left: 0
  });
}

function pickUpBomb(room, p, b) {
  if (p.carry) return false;
  const idx = room.bombs.indexOf(b);
  if (idx < 0) return false;
  room.bombs.splice(idx, 1);
  p.carry = { power: b.power, timer: b.timer, owner: b.owner };
  return true;
}

function throwCarried(room, p) {
  if (!p.carry) return;
  const carry = p.carry;
  p.carry = null;
  const d = DIRS[p.facing] || DIRS.down;
  const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);

  let land = 0;
  for (let i = 1; i <= 3; i++) {
    if (cellBlockedForBomb(room, cx + d.x * i, cy + d.y * i, null)) break;
    land = i;
  }

  const bomb = {
    cx: cx, cy: cy, px: p.x, py: p.y - 6,
    timer: carry.timer, power: carry.power, owner: carry.owner || p.pid,
    seed: Math.random() * 6.28, moving: null, left: 0
  };
  if (land === 0) {
    bomb.px = cx * T + T / 2;
    bomb.py = cy * T + T / 2;
  } else {
    bomb.moving = { dx: d.x, dy: d.y, speed: 330 };
    bomb.tcx = cx + d.x; bomb.tcy = cy + d.y;
    bomb.left = land;
  }
  room.bombs.push(bomb);
}

// 空白鍵統一入口：手上有彈就丟、腳下有彈就撿（需要手套）、否則放新彈
function fireAction(room, p) {
  if (!p.alive || room.state !== 'playing') return;
  if (p.carry) { throwCarried(room, p); return; }
  const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);
  if (p.glove) {
    for (let i = 0; i < room.bombs.length; i++) {
      const b = room.bombs[i];
      if (!b.moving && b.cx === cx && b.cy === cy) {
        if (pickUpBomb(room, p, b)) return;
      }
    }
  }
  placeBomb(room, p);
}

function tryKick(room, p, dir) {
  if (!p.kick || !p.alive) return;
  const d = DIRS[dir];
  if (!d) return;
  const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);
  const ncx = cx + d.x, ncy = cy + d.y;
  const perp = d.x !== 0
    ? Math.abs(p.y - (cy * T + T / 2))
    : Math.abs(p.x - (cx * T + T / 2));
  if (perp > 12) return;
  for (let i = 0; i < room.bombs.length; i++) {
    const b = room.bombs[i];
    if (b.moving) continue;
    if (b.cx !== ncx || b.cy !== ncy) continue;
    if (cellBlockedForBomb(room, ncx + d.x, ncy + d.y, b)) return;
    b.px = b.cx * T + T / 2;
    b.py = b.cy * T + T / 2;
    b.left = 99;
    b.moving = { dx: d.x, dy: d.y, speed: 210 };
    b.tcx = b.cx + d.x; b.tcy = b.cy + d.y;
    return;
  }
}

function reveal(room, cx, cy) {
  const k = cy * COLS + cx;
  const type = room.hidden[k];
  if (!type) return;
  room.items.push({ cx: cx, cy: cy, type: type });
  delete room.hidden[k];
}

function explode(room, bomb) {
  const cells = [{ cx: bomb.cx, cy: bomb.cy }];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  for (let k = 0; k < dirs.length; k++) {
    const dx = dirs[k][0], dy = dirs[k][1];
    for (let i = 1; i <= bomb.power; i++) {
      const cx = bomb.cx + dx * i, cy = bomb.cy + dy * i;
      if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) break;
      if (room.grid[cy][cx] === 1) break;
      if (room.grid[cy][cx] === 2) {
        room.grid[cy][cx] = 0;
        room.changes.push([cx, cy]);
        reveal(room, cx, cy);
        cells.push({ cx: cx, cy: cy });
        break;
      }
      cells.push({ cx: cx, cy: cy });
      for (let j = 0; j < room.bombs.length; j++) {
        const o = room.bombs[j];
        if (o.cx === cx && o.cy === cy) o.timer = Math.min(o.timer, 0.06);
      }
    }
  }

  for (let i = 0; i < cells.length; i++) {
    room.flames.push({ cx: cells[i].cx, cy: cells[i].cy, t: 0.46 });
  }
}

function isBurning(room, px, py) {
  const cx = Math.floor(px / T), cy = Math.floor(py / T);
  return room.flames.some(function (f) { return f.cx === cx && f.cy === cy; });
}

function killPlayer(room, p, killerPid) {
  if (!p.alive || p.invuln > 0) return;
  p.lives -= 1;
  p.score = Math.max(0, p.score - 50);

  // 手上的炸彈掉在原地繼續燒
  if (p.carry) {
    const dcx = Math.max(1, Math.min(COLS - 2, Math.floor(p.x / T)));
    const dcy = Math.max(1, Math.min(ROWS - 2, Math.floor(p.y / T)));
    room.bombs.push({
      cx: dcx, cy: dcy, px: dcx * T + T / 2, py: dcy * T + T / 2,
      timer: Math.max(0.4, p.carry.timer), power: p.carry.power,
      owner: p.carry.owner || p.pid, seed: Math.random() * 6.28,
      moving: null, left: 0
    });
    p.carry = null;
  }

  if (killerPid && killerPid !== p.pid) {
    const k = room.players.find(function (x) { return x.pid === killerPid; });
    if (k) { k.kills += 1; k.score += 150; }
  }

  if (p.lives <= 0) {
    p.alive = false;
  } else {
    // 復活：回出生點，短暫無敵
    const sp = SPAWNS[p.slot];
    p.x = sp.x * T + T / 2;
    p.y = sp.y * T + T / 2;
    p.facing = sp.f;
    p.invuln = 2.2;
  }
}

function updatePlayer(room, p, dt) {
  if (!p.alive) return;
  p.invuln = Math.max(0, p.invuln - dt);

  if (p.dir && DIRS[p.dir]) {
    const d = DIRS[p.dir];
    p.facing = p.dir;
    if (d.x !== 0) snapAxis(room, p, 'y', dt);
    else snapAxis(room, p, 'x', dt);
    moveAxis(room, p, d.x * p.speed * dt, d.y * p.speed * dt);
    tryKick(room, p, p.dir);
  }

  // 放炸彈（用序號偵測新的按壓事件）
  if (p.bombSeq !== p.lastBombSeq) {
    p.lastBombSeq = p.bombSeq;
    fireAction(room, p);
  }

  // 拾取道具
  const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);
  for (let i = room.items.length - 1; i >= 0; i--) {
    const it = room.items[i];
    if (it.cx === cx && it.cy === cy) {
      if (it.type === 'power') p.power = Math.min(8, p.power + 1);
      else if (it.type === 'bomb') p.maxBombs = Math.min(8, p.maxBombs + 1);
      else if (it.type === 'speed') {
        p.speedLv = Math.min(4, p.speedLv + 1);
        p.speed = 112 + p.speedLv * 20;
      }
      else if (it.type === 'glove') p.glove = true;
      else if (it.type === 'kick') p.kick = true;
      p.score += 50;
      room.items.splice(i, 1);
    }
  }

  // 火焰傷害
  if (isBurning(room, p.x, p.y)) {
    let killer = null;
    for (let i = 0; i < room.bombs.length; i++) {
      const b = room.bombs[i];
      if (Math.abs(b.cx - cx) <= b.power + 1 && Math.abs(b.cy - cy) <= b.power + 1) killer = b.owner;
    }
    killPlayer(room, p, killer);
  }
}

function tickRoom(room, dt) {
  if (room.state === 'waiting') {
    const ready = room.players.filter(function (p) { return p.connected; }).length;
    if (ready >= 2) {
      room.countdown -= dt;
      if (room.countdown <= 0) startRound(room);
    } else {
      room.countdown = 3;
    }
    room.ver++;
    return;
  }

  if (room.state === 'roundover') {
    room.roundOverT -= dt;
    if (room.roundOverT <= 0) startRound(room);
    room.ver++;
    return;
  }

  // playing
  room.roundT += dt;

  for (let i = 0; i < room.players.length; i++) updatePlayer(room, room.players[i], dt);

  // 炸彈（含被踢／被丟的滑行）
  for (let i = room.bombs.length - 1; i >= 0; i--) {
    const b = room.bombs[i];

    if (b.moving) {
      const d = b.moving;
      const tx = b.tcx * T + T / 2, ty = b.tcy * T + T / 2;
      const dist = Math.hypot(tx - b.px, ty - b.py);
      const step = d.speed * dt;
      if (dist <= step) {
        b.px = tx; b.py = ty;
        b.cx = b.tcx; b.cy = b.tcy;
        b.left -= 1;
        const nx = b.cx + d.dx, ny = b.cy + d.dy;
        if (b.left <= 0 || cellBlockedForBomb(room, nx, ny, b)) {
          b.moving = null;
        } else {
          b.tcx = nx; b.tcy = ny;
        }
      } else {
        b.px += (tx - b.px) / dist * step;
        b.py += (ty - b.py) / dist * step;
      }
    }

    b.timer -= dt;
    if (b.timer <= 0) {
      room.bombs.splice(i, 1);
      explode(room, b);
    }
  }

  // 火焰
  for (let i = room.flames.length - 1; i >= 0; i--) {
    room.flames[i].t -= dt;
    if (room.flames[i].t <= 0) room.flames.splice(i, 1);
  }

  // 勝負
  const alivePlayers = room.players.filter(function (p) { return p.alive; });
  if (alivePlayers.length <= 1 || room.roundT > ROUND_TIME) {
    let winner = null;
    if (alivePlayers.length === 1) winner = alivePlayers[0];
    else if (room.players.length) {
      winner = room.players.slice().sort(function (a, b) {
        return (b.lives * 100 + b.kills * 10) - (a.lives * 100 + a.kills * 10);
      })[0];
    }
    room.winner = winner ? { pid: winner.pid, name: winner.name, color: winner.color } : null;
    if (winner) winner.score += 200;
    room.state = 'roundover';
    room.roundOverT = 6;
  }

  room.ver++;
}

// ============ 快照 ============
function snapshot(room, pid, sinceGv) {
  let ch = null;
  if (typeof sinceGv === 'number' && sinceGv >= 0) {
    ch = room.changes.slice(Math.min(sinceGv, room.changes.length));
  }
  return {
    v: room.ver,
    rid: room.roundId,
    s: room.state,
    cd: Math.ceil(Math.max(0, room.countdown) * 10) / 10,
    ro: Math.ceil(Math.max(0, room.roundOverT) * 10) / 10,
    w: room.winner,
    gv: room.changes.length,
    ch: ch,
    p: room.players.map(function (p) {
      return [
        p.pid, Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10, p.facing,
        p.alive ? 1 : 0, p.power, p.maxBombs, p.lives, p.score, p.slot,
        p.name, p.color, p.invuln > 0 ? 1 : 0, p.kills,
        p.carry ? 1 : 0, p.glove ? 1 : 0, p.kick ? 1 : 0, p.speedLv
      ];
    }),
    b: room.bombs.map(function (b) {
      return [b.cx, b.cy, Math.round(b.timer * 100) / 100, b.power,
        Math.round(b.px * 10) / 10, Math.round(b.py * 10) / 10];
    }),
    f: room.flames.map(function (f) { return [f.cx, f.cy, Math.round(f.t * 100) / 100]; }),
    i: room.items.map(function (i) { return [i.cx, i.cy, i.type]; })
  };
}

// ============ HTTP ============
function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(body);
}

function readBody(req, cb) {
  let data = '';
  req.on('data', function (c) {
    data += c;
    if (data.length > 1e6) req.destroy();
  });
  req.on('end', function () {
    try { cb(JSON.parse(data || '{}')); } catch (e) { cb(null); }
  });
}

function newPid() {
  return Math.random().toString(36).slice(2, 10);
}

function handleJoin(body, res) {
  const name = String(body.name || '').slice(0, 12) || '玩家';
  const code = String(body.code || '').replace(/\D/g, '').slice(0, 4);

  let room = null;
  if (code) {
    room = rooms.get(code);
    if (!room) return sendJSON(res, 404, { ok: false, err: '房間不存在，確認一下房號' });
    if (room.players.filter(function (p) { return p.connected; }).length >= MAX_PLAYERS) {
      return sendJSON(res, 409, { ok: false, err: '這間房已經滿了' });
    }
  } else {
    // 自動配對：找還有位子、且在等待中的房間
    for (const r of rooms.values()) {
      const count = r.players.filter(function (p) { return p.connected; }).length;
      if (count > 0 && count < MAX_PLAYERS && r.state === 'waiting') { room = r; break; }
    }
    if (!room) room = makeRoom();
  }

  let slot = findSlot(room);
  if (slot < 0) return sendJSON(res, 409, { ok: false, err: '這間房已經滿了' });

  const pid = newPid();
  const p = makePlayer(pid, name, slot);
  room.players.push(p);
  room.ver++;

  sendJSON(res, 200, {
    ok: true,
    pid: pid,
    room: room.id,
    slot: slot,
    color: COLORS[slot],
    map: room.grid,
    state: room.state
  });
}

function handleInput(body, res) {
  const room = rooms.get(String(body.room || ''));
  if (!room) return sendJSON(res, 404, { ok: false, err: 'room gone' });
  const p = room.players.find(function (x) { return x.pid === body.pid; });
  if (!p) return sendJSON(res, 404, { ok: false, err: 'player gone' });

  p.lastSeen = Date.now();
  p.connected = true;

  const dir = String(body.dir || '');
  p.dir = DIRS[dir] ? dir : null;
  if (typeof body.bomb === 'number' && body.bomb !== p.bombSeq) p.bombSeq = body.bomb;

  sendJSON(res, 200, { ok: true, v: room.ver });
}

function handleState(query, res) {
  const room = rooms.get(String(query.get('room') || ''));
  if (!room) return sendJSON(res, 404, { ok: false, err: 'room gone' });

  const pid = String(query.get('pid') || '');
  const p = room.players.find(function (x) { return x.pid === pid; });
  if (p) { p.lastSeen = Date.now(); p.connected = true; }

  const gvRaw = query.get('gv');
  const gv = gvRaw === null || gvRaw === '' ? null : parseInt(gvRaw, 10);

  sendJSON(res, 200, Object.assign({ ok: true, map: gv === null ? room.grid : null }, snapshot(room, pid, gv)));
}


// ============================================================
//  爆爆英雄 —— 線上配對中繼（主機權威：主機送快照、客人送輸入）
// ============================================================
const relayRooms = new Map();      // code -> room
const RELAY_MAX = 8;

function relayCode() {
  let code;
  do { code = String(Math.floor(1000 + Math.random() * 9000)); } while (relayRooms.has(code));
  return code;
}

function relayRoom(code) { return relayRooms.get(String(code || '')); }

function relayHost(room) {
  return room.roster.find(function (p) { return p.pid === room.host; });
}

function relayPub(room) {
  return {
    v: room.v,
    phase: room.phase,
    host: room.host,
    count: room.count,
    roster: room.roster.map(function (p) {
      return { pid: p.pid, name: p.name, ch: p.ch, slot: p.slot, entry: p.entry, host: p.pid === room.host };
    })
  };
}

// 大廳：列出所有還在等待中的房間（人多的排前面 → 快速配對用它）
function handleRelayList(res) {
  const rooms = [];
  relayRooms.forEach(function (room) {
    if (room.phase !== 'wait') return;
    const h = relayHost(room);
    rooms.push({
      code: room.id, count: room.count, players: room.roster.length,
      host: h ? h.name : '', created: room.created
    });
  });
  rooms.sort(function (a, b) { return b.players - a.players || a.created - b.created; });
  sendJSON(res, 200, { ok: true, rooms: rooms });
}

function handleRelayCreate(body, res) {
  const code = relayCode();
  const pid = newPid();
  const name = String(body.name || '玩家').slice(0, 8);
  const count = parseInt(body.count, 10) === 8 ? 8 : 4;
  const room = {
    id: code, created: Date.now(), host: pid, phase: 'wait', count: count,
    roster: [{ pid: pid, name: name, ch: 0, slot: 0, entry: 1, lastSeen: Date.now() }],
    snap: null, v: 1, inputs: {}
  };
  relayRooms.set(code, room);
  sendJSON(res, 200, Object.assign({ ok: true, code: code, pid: pid, snap: null }, relayPub(room)));
}

function handleRelayJoin(body, res) {
  const room = relayRoom(body.code);
  if (!room) return sendJSON(res, 404, { ok: false, err: '房號不存在（可能已解散）' });
  if (room.roster.length >= RELAY_MAX) return sendJSON(res, 409, { ok: false, err: '這間房已經滿了' });
  if (room.phase === 'play') return sendJSON(res, 409, { ok: false, err: '這局已經開始了，等下一局' });

  const pid = newPid();
  const name = String(body.name || '玩家').slice(0, 8);
  let slot = 0;
  while (room.roster.some(function (p) { return p.slot === slot; })) slot++;
  room.roster.push({ pid: pid, name: name, ch: slot % 8, slot: slot, entry: 1, lastSeen: Date.now() });
  room.v++;
  sendJSON(res, 200, Object.assign({ ok: true, pid: pid, code: room.id, snap: null }, relayPub(room)));
}

function handleRelayPoll(query, res) {
  const room = relayRoom(query.get('code'));
  if (!room) return sendJSON(res, 404, { ok: false, err: 'room gone' });
  const pid = String(query.get('pid') || '');
  const me = room.roster.find(function (p) { return p.pid === pid; });
  if (!me) return sendJSON(res, 404, { ok: false, err: '你已被移出房間' });
  me.lastSeen = Date.now();

  const since = parseInt(query.get('v') || '0', 10) || 0;
  const out = { ok: true, pid: pid };
  Object.assign(out, relayPub(room));
  if (pid === room.host) {
    out.snap = null;
    out.rosterAll = true;
    // 主機順便收客人的輸入（收完清空）
    out.inputs = [];
    Object.keys(room.inputs).forEach(function (k) {
      room.inputs[k].forEach(function (pk) { out.inputs.push(pk); });
    });
    room.inputs = {};
    delete out.rosterAll;
  } else {
    out.snap = room.snap && room.v !== since ? room.snap : null;
  }
  sendJSON(res, 200, out);
}

function handleRelayPush(body, res) {
  const room = relayRoom(body.code);
  if (!room) return sendJSON(res, 404, { ok: false, err: 'room gone' });
  if (body.pid !== room.host) return sendJSON(res, 403, { ok: false, err: '只有房主可以推狀態' });
  const h = relayHost(room);
  if (h) h.lastSeen = Date.now();

  if (body.phase) room.phase = body.phase;
  if (Array.isArray(body.roster)) {
    body.roster.forEach(function (m) {
      const p = room.roster.find(function (x) { return x.pid === m.pid; });
      if (!p) return;
      if (typeof m.entry === 'number') p.entry = m.entry ? 1 : 0;
      if (typeof m.ch === 'number') p.ch = m.ch;
      if (typeof m.slot === 'number') p.slot = m.slot;
      if (typeof m.name === 'string') p.name = m.name.slice(0, 8);
    });
  }
  if (typeof body.count === 'number') room.count = body.count === 8 ? 8 : 4;
  if (body.snap) { room.snap = body.snap; }
  room.v++;
  sendJSON(res, 200, { ok: true, v: room.v });
}

function handleRelayInput(body, res) {
  const room = relayRoom(body.code);
  if (!room) return sendJSON(res, 404, { ok: false, err: 'room gone' });
  const p = room.roster.find(function (x) { return x.pid === body.pid; });
  if (!p) return sendJSON(res, 404, { ok: false, err: 'not in room' });
  p.lastSeen = Date.now();
  if (!room.inputs[p.pid]) room.inputs[p.pid] = [];
  const q = room.inputs[p.pid];
  q.push({ pid: p.pid, seq: body.seq | 0, dx: body.dx | 0, dy: body.dy | 0, act: body.act ? 1 : 0, t: Date.now() });
  if (q.length > 8) q.splice(0, q.length - 8);      // 只留最新幾個，避免延遲累積
  sendJSON(res, 200, { ok: true });
}

function handleRelayLeave(body, res) {
  const room = relayRoom(body.code);
  if (!room) return sendJSON(res, 200, { ok: true });
  const pid = String(body.pid || '');
  room.roster = room.roster.filter(function (p) { return p.pid !== pid; });
  delete room.inputs[pid];
  room.v++;
  if (!room.roster.length || room.host === pid) {
    // 房主離開 → 解散（客人會收到 room gone）
    relayRooms.delete(room.id);
  }
  sendJSON(res, 200, { ok: true });
}

// ============ v3.6：全域統計（瀏覽人數 / 按讚）============
// 存成 data/stats.json（不存在就從 0 開始；寫入失敗也不影響遊戲）
// v3.7：Render 免費方案的磁碟會歸零 → 可用 STATS_PATH 指到 Persistent Disk（例如 /var/data/stats.json）
const STATS_FILE = process.env.STATS_PATH || path.join(__dirname, 'data', 'stats.json');
const DATA_DIR = path.dirname(STATS_FILE);
const STATS_VID_KEEP = 5000;               // 最多記住多少個訪客 id，避免檔案無限長大
const STATS = { views: 0, likes: 0, day: '', dayViews: 0, vids: [], likers: [] };
let statsDirty = false;
let statsSaving = false;

function dayKey() {
  const d = new Date();
  const p = function (x) { return (x < 10 ? '0' : '') + x; };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
function trimArr(a) { if (a.length > STATS_VID_KEEP) a.splice(0, a.length - STATS_VID_KEEP); }
function rollStatsDay() {
  const k = dayKey();
  if (STATS.day !== k) { STATS.day = k; STATS.dayViews = 0; }
  return k;
}
function loadStats() {
  try {
    if (!fs.existsSync(STATS_FILE)) return;
    const j = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
    if (isFinite(j.views)) STATS.views = j.views | 0;
    if (isFinite(j.likes)) STATS.likes = j.likes | 0;
    if (typeof j.day === 'string') STATS.day = j.day;
    if (isFinite(j.dayViews)) STATS.dayViews = j.dayViews | 0;
    if (Array.isArray(j.vids)) STATS.vids = j.vids.slice(-STATS_VID_KEEP).map(String);
    if (Array.isArray(j.likers)) STATS.likers = j.likers.slice(-STATS_VID_KEEP).map(String);
  } catch (e) { /* 讀不到就從 0 開始，不影響遊戲 */ }
}
function saveStats() {
  if (statsSaving) return;
  statsSaving = true;
  const data = JSON.stringify({
    views: STATS.views, likes: STATS.likes, day: STATS.day, dayViews: STATS.dayViews,
    vids: STATS.vids.slice(-STATS_VID_KEEP), likers: STATS.likers.slice(-STATS_VID_KEEP),
    savedAt: Date.now()
  });
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
  const tmp = STATS_FILE + '.tmp';
  fs.writeFile(tmp, data, 'utf8', function (err) {
    if (err) { statsSaving = false; return; }
    fs.rename(tmp, STATS_FILE, function (e2) {
      statsSaving = false;
      if (!e2) statsDirty = false;
    });
  });
}
loadStats();
rollStatsDay();

// v3.7：同步立刻落盤（Render 休眠 / 重新部署會送 SIGTERM，只剩幾秒鐘，不能等 10 秒的定時器）
function flushStatsSync() {
  try {
    const data = JSON.stringify({
      views: STATS.views, likes: STATS.likes, day: STATS.day, dayViews: STATS.dayViews,
      vids: STATS.vids.slice(-STATS_VID_KEEP), likers: STATS.likers.slice(-STATS_VID_KEEP),
      savedAt: Date.now()
    });
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
    fs.writeFileSync(STATS_FILE, data, 'utf8');
    statsDirty = false;
    return true;
  } catch (e) { return false; }
}

// v3.7：容器重建後把數字抓回來（設了 STATS_RESTORE_URL 才做；失敗就安靜從 0 開始）
const STATS_RESTORE_URL = String(process.env.STATS_RESTORE_URL || '').trim();
function tryRestoreStats() {
  if (!STATS_RESTORE_URL || STATS.views > 0) return;
  const mod = STATS_RESTORE_URL.indexOf('https:') === 0 ? https : http;
  let done = false;
  try {
    const req = mod.get(STATS_RESTORE_URL, function (r) {
      let buf = '';
      r.on('data', function (c) { buf += c; });
      r.on('end', function () {
        if (done) return;
        done = true;
        try {
          const j = JSON.parse(buf);
          if (isFinite(j.views)) STATS.views = Math.max(STATS.views, j.views | 0);
          if (isFinite(j.likes)) STATS.likes = Math.max(STATS.likes, j.likes | 0);
          if (typeof j.day === 'string' && j.day === STATS.day && isFinite(j.dayViews)) {
            STATS.dayViews = Math.max(STATS.dayViews, j.dayViews | 0);
          }
          if (Array.isArray(j.vids)) STATS.vids = j.vids.slice(-STATS_VID_KEEP).map(String);
          if (Array.isArray(j.likers)) STATS.likers = j.likers.slice(-STATS_VID_KEEP).map(String);
          rollStatsDay();
          console.log('[stats] 已從 STATS_RESTORE_URL 還原：' + STATS.views + ' 瀏覽 / ' + STATS.likes + ' 讚');
        } catch (e) { /* 抓到不是 JSON 就當沒這回事 */ }
      });
    });
    req.on('error', function () { done = true; });
    req.setTimeout(8000, function () { done = true; try { req.destroy(); } catch (e) {} });
  } catch (e) { /* 設了怪網址也不影響遊戲 */ }
}
tryRestoreStats();

function statsOut(extra) {
  const o = { ok: true, views: STATS.views, likes: STATS.likes, dayViews: STATS.dayViews, day: STATS.day };
  if (extra) { for (const k in extra) o[k] = extra[k]; }
  return o;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8'
};

function serveStatic(pathname, res) {
  let rel = pathname === '/' ? '/index.html' : pathname;
  rel = rel.replace(/\.\./g, '');
  const file = path.join(PUB, rel);

  if (!file.startsWith(PUB)) {
    res.writeHead(403); return res.end('forbidden');
  }

  fs.readFile(file, function (err, buf) {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('not found');
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300'
    });
    res.end(buf);
  });
}

// ---- v3.6 統計 handler ----
function handleStatsGet(sp, res) {
  const vid = String(sp.get('vid') || '').slice(0, 40);
  sendJSON(res, 200, statsOut({ liked: vid ? STATS.likers.indexOf(vid) >= 0 : false }));
}
function handleStatsView(b, res) {
  rollStatsDay();
  const vid = String((b && b.vid) || '').slice(0, 40);
  let fresh = false;
  if (!vid) {                                  // 沒帶 id：算一次瀏覽（不重複計算）
    STATS.views++; STATS.dayViews++; fresh = true;
  } else if (STATS.vids.indexOf(vid) < 0) {    // 同一個訪客只算一次
    STATS.vids.push(vid); trimArr(STATS.vids);
    STATS.views++; STATS.dayViews++; fresh = true;
  }
  statsDirty = true;
  sendJSON(res, 200, statsOut({ fresh: fresh, liked: vid ? STATS.likers.indexOf(vid) >= 0 : false }));
}
function handleStatsLike(b, res) {
  const vid = String((b && b.vid) || '').slice(0, 40);
  const undo = !!(b && (b.undo === true || b.d === -1));
  let liked = vid ? STATS.likers.indexOf(vid) >= 0 : false;
  if (undo) {
    if (liked) {
      const i = STATS.likers.indexOf(vid);
      if (i >= 0) STATS.likers.splice(i, 1);
      STATS.likes = Math.max(0, STATS.likes - 1);
      liked = false;
    }
  } else if (!liked) {                         // 同一個訪客只能按一次讚
    if (vid) { STATS.likers.push(vid); trimArr(STATS.likers); }
    STATS.likes++;
    liked = true;
  }
  statsDirty = true;
  sendJSON(res, 200, statsOut({ liked: liked }));
}

const server = http.createServer(function (req, res) {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  if (url.pathname === '/api/join' && req.method === 'POST') {
    return readBody(req, function (b) { b ? handleJoin(b, res) : sendJSON(res, 400, { ok: false, err: 'bad body' }); });
  }

  if (url.pathname === '/api/input' && req.method === 'POST') {
    return readBody(req, function (b) { b ? handleInput(b, res) : sendJSON(res, 400, { ok: false, err: 'bad body' }); });
  }

  if (url.pathname === '/api/state' && req.method === 'GET') {
    return handleState(url.searchParams, res);
  }

  if (url.pathname === '/api/relay/create' && req.method === 'POST') {
    return readBody(req, function (b) { b ? handleRelayCreate(b, res) : sendJSON(res, 400, { ok: false, err: 'bad body' }); });
  }
  if (url.pathname === '/api/relay/join' && req.method === 'POST') {
    return readBody(req, function (b) { b ? handleRelayJoin(b, res) : sendJSON(res, 400, { ok: false, err: 'bad body' }); });
  }
  if (url.pathname === '/api/relay/push' && req.method === 'POST') {
    return readBody(req, function (b) { b ? handleRelayPush(b, res) : sendJSON(res, 400, { ok: false, err: 'bad body' }); });
  }
  if (url.pathname === '/api/relay/input' && req.method === 'POST') {
    return readBody(req, function (b) { b ? handleRelayInput(b, res) : sendJSON(res, 400, { ok: false, err: 'bad body' }); });
  }
  if (url.pathname === '/api/relay/leave' && req.method === 'POST') {
    return readBody(req, function (b) { b ? handleRelayLeave(b, res) : sendJSON(res, 400, { ok: false, err: 'bad body' }); });
  }
  if (url.pathname === '/api/relay/poll' && req.method === 'GET') {
    return handleRelayPoll(url.searchParams, res);
  }
  if (url.pathname === '/api/relay/list' && req.method === 'GET') {
    return handleRelayList(res);
  }
  // v3.6：瀏覽人數 / 按讚
  // v3.7：完整快照（含訪客 id 清單），把內容貼到任何靜態空間就能當 STATS_RESTORE_URL
  if (url.pathname === '/api/stats/snapshot' && req.method === 'GET') {
    sendJSON(res, 200, {
      ok: true, views: STATS.views, likes: STATS.likes, day: STATS.day, dayViews: STATS.dayViews,
      vids: STATS.vids, likers: STATS.likers, file: STATS_FILE, savedAt: Date.now()
    });
    return;
  }
  if (url.pathname === '/api/stats' && req.method === 'GET') {
    return handleStatsGet(url.searchParams, res);
  }
  if (url.pathname === '/api/stats/view' && req.method === 'POST') {
    return readBody(req, function (b) { b ? handleStatsView(b, res) : sendJSON(res, 400, { ok: false, err: 'bad body' }); });
  }
  if (url.pathname === '/api/stats/like' && req.method === 'POST') {
    return readBody(req, function (b) { b ? handleStatsLike(b, res) : sendJSON(res, 400, { ok: false, err: 'bad body' }); });
  }
  if (url.pathname === '/api/health') {
    return sendJSON(res, 200, {
      ok: true,
      views: STATS.views, likes: STATS.likes, dayViews: STATS.dayViews,
      rooms: rooms.size,
      relay: relayRooms.size,
      players: Array.from(rooms.values()).reduce(function (n, r) { return n + r.players.filter(function (p) { return p.connected; }).length; }, 0)
    });
  }

  if (url.pathname.indexOf('/api/') === 0) {
    return sendJSON(res, 404, { ok: false, err: 'no such api' });
  }

  serveStatic(url.pathname, res);
});

// ============ 主循環 ============
const TICK_MS = 33;   // 約 30Hz
let lastTick = Date.now();

setInterval(function () {
  const now = Date.now();
  let dt = (now - lastTick) / 1000;
  lastTick = now;
  if (dt > 0.1) dt = 0.1;

  relayRooms.forEach(function (room, code) {
    for (let i = room.roster.length - 1; i >= 0; i--) {
      if (now - room.roster[i].lastSeen > 15000) room.roster.splice(i, 1);
    }
    if (!room.roster.some(function (p) { return p.pid === room.host; })) { relayRooms.delete(code); return; }
    if (!room.roster.length && now - room.created > 30000) relayRooms.delete(code);
  });

  rooms.forEach(function (room, code) {
    // 清理斷線玩家
    for (let i = room.players.length - 1; i >= 0; i--) {
      const p = room.players[i];
      if (now - p.lastSeen > 12000) {
        room.players.splice(i, 1);
      }
    }

    if (room.players.length === 0) {
      if (now - room.created > 30000) rooms.delete(code);
      return;
    }

    tickRoom(room, dt);
  });
}, TICK_MS);

// v3.6：統計定期落盤（v3.7 縮短為 3 秒，縮小意外遺失的窗口）
setInterval(function () { if (statsDirty) saveStats(); }, 3000);

// v3.7：收到結束訊號時同步存檔（Render 休眠、或每次 git push 重新部署都會送 SIGTERM）
['SIGTERM', 'SIGINT', 'SIGHUP'].forEach(function (sig) {
  process.on(sig, function () {
    try { flushStatsSync(); } catch (e) {}
    process.exit(0);
  });
});
process.on('uncaughtException', function (e) {
  console.error('[uncaughtException]', e && e.message);
  try { flushStatsSync(); } catch (e2) {}
});

server.listen(PORT, '0.0.0.0', function () {
  console.log('炸彈超人 Online 啟動：http://0.0.0.0:' + PORT);
  console.log('[stats] 存檔位置：' + STATS_FILE + '（目前 ' + STATS.views + ' 瀏覽 / ' + STATS.likes + ' 讚）');
});
