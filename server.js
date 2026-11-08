'use strict';

/* 炸彈超人 Online — 單端口 HTTP 伺服器
 * 伺服器權威：所有遊戲邏輯在後端執行，客戶端只送輸入、收快照
 * 同步方式：HTTP 短輪詢（不需 WebSocket，反向代理友善）
 */

const http = require('http');
const fs = require('fs');
const zlib = require('zlib');   // v5.28：主機沒開壓縮時自己壓（Render 邊緣會壓，但不保證每台都有）
const path = require('path');
const os = require('os');        // v5.37：區網連線要列出這台機器的 LAN IP
// v4.85i：容器啟動時刻 —— /api/health 會回報，用來確認「這次真的換了一個新容器」
const BOOT_AT = Date.now();

const cloud = require('./cloud').createCloud();

const PORT = process.env.PORT || 3000;
const PUB = path.join(__dirname, 'public');
// v4.1：Render 之類的反向代理會給 x-forwarded-proto，不是 https 就 308 轉過去
const FORCE_HTTPS = String(process.env.BH_FORCE_HTTPS || '1') !== '0';

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

// v4.15：人數一律夾在 2～8 之間（前端送什麼都擋得住）
function clampCount(v) {
  const n = parseInt(v, 10);
  if (!isFinite(n)) return 4;
  return Math.max(2, Math.min(RELAY_MAX, n));
}

// v5.37：對戰設定只留白名單欄位（不讓客人塞奇怪的東西）
function optsOf(body) {
  const o = (body && body.opts) || {};
  const str = function (v, allow, dflt) { return allow.indexOf(String(v)) >= 0 ? String(v) : dflt; };
  return {
    size: str(o.size, ['S', 'M', 'L', 'XL'], 'M'),
    wins: Math.max(1, Math.min(3, parseInt(o.wins, 10) || 2)),
    time: [60, 120, 180, 300].indexOf(parseInt(o.time, 10)) >= 0 ? parseInt(o.time, 10) : 120,
    hazards: str(o.hazards, ['on', 'off'], 'on'),
    sd: str(o.sd, ['on', 'off'], 'on'),
    revenge: str(o.revenge, ['off', 'on', 'super'], 'on'),
    ai: str(o.ai, ['weak', 'normal', 'strong'], 'normal')
  };
}

function relayHost(room) {
  return room.roster.find(function (p) { return p.pid === room.host; });
}

function relayPub(room) {
  return {
    v: room.v,
    phase: room.phase,
    host: room.host,
    count: room.count,
    teams: room.teams | 0,
    opts: room.opts || null,               // v5.37：房主的對戰設定（客人唯讀顯示）
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
  // v4.15：房主可以設 2～8 人（原本只收 4／8）
  const count = clampCount(body.count);
  const room = {
    id: code, created: Date.now(), host: pid, phase: 'wait', count: count, teams: 0, opts: optsOf(body),
    roster: [{ pid: pid, name: name, ch: 0, slot: 0, entry: 1, lastSeen: Date.now() }],
    snap: null, v: 1, inputs: {},
    chat: [], chatId: 0            // v5.27：房間快捷語（只存索引，前端各自翻譯）
  };
  relayRooms.set(code, room);
  sendJSON(res, 200, Object.assign({ ok: true, code: code, pid: pid, snap: null }, relayPub(room)));
}

function handleRelayJoin(body, res) {
  const room = relayRoom(body.code);
  if (!room) return sendJSON(res, 404, { ok: false, err: '房號不存在（可能已解散）' });
  // v4.15：滿不滿要看房主設的人數（2～8），不是固定 8
  if (room.roster.length >= Math.min(RELAY_MAX, room.count || RELAY_MAX)) {
    return sendJSON(res, 409, { ok: false, err: '這間房已經滿了' });
  }
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
  const sinceChat = parseInt(query.get('c') || '0', 10) || 0;
  const out = { ok: true, pid: pid };
  Object.assign(out, relayPub(room));
  // v5.27：只回「比我手上的更新的」那幾句，避免 100ms 輪詢一直重送同一段文字
  out.chatId = room.chatId | 0;
  out.chat = (room.chat || []).filter(function (m) { return m.id > sinceChat; }).slice(-8);
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
  if (typeof body.count === 'number') room.count = clampCount(body.count);
  if (typeof body.teams === 'number') room.teams = [0, 2, 3, 4].indexOf(body.teams | 0) >= 0 ? (body.teams | 0) : 0;
  if (body.opts) room.opts = optsOf(body);   // v5.37：房主推上來的對戰設定
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
  // v5.37：每人可以自己換角色（只改自己那一筆；房主下次推狀態時會沿用）
  if (typeof body.ch === 'number') p.ch = Math.max(0, Math.min(7, body.ch | 0));
  // v5.27：快捷語（0~11 索引；不開放自由輸入 → 不會有髒話與長度問題）
  if (typeof body.chat === 'number' && body.chat >= 0 && body.chat < 12) {
    if (!room.chat) { room.chat = []; room.chatId = 0; }
    room.chatId = (room.chatId | 0) + 1;
    room.chat.push({ id: room.chatId, pid: p.pid, n: p.name, m: '#' + (body.chat | 0), t: Date.now() });
    if (room.chat.length > 20) room.chat.splice(0, room.chat.length - 20);
  }
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

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',   // v4.75：八大關卡底圖 bg/*.webp
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8'
};

/* ===== v5.28：靜態檔的壓縮、ETag 與快取 =====
   ① 以前完全沒有 ETag／Last-Modified → 瀏覽器每次都把整份 index.html 重抓（即使沒改）。
      現在帶 ETag，沒改就回 304（0 bytes）。
   ② 圖片網址都帶 ?v=NN（改圖一定換網址）→ 可以給長快取；
      以前只給 5 分鐘，冷啟動時 200 多張圖要重新問一輪。
   ③ 主機邊緣沒壓縮時自己 gzip（壓好的結果放記憶體，同一版只壓一次）。
   快取鍵含 mtime，改檔立刻失效，不會拿到舊內容。 */
const GZ_CACHE = new Map();
const GZ_TYPES = /\.(?:html|js|css|json|svg|txt|webmanifest)$/i;
const GZ_MIN = 1024;

function gzipBuf(file, buf, st) {
  const key = st.size + ':' + Math.floor(st.mtimeMs);
  const hit = GZ_CACHE.get(file);
  if (hit && hit.key === key) return hit.gz;
  const gz = zlib.gzipSync(buf, { level: 6 });
  GZ_CACHE.set(file, { key: key, gz: gz });
  if (GZ_CACHE.size > 80) { GZ_CACHE.delete(GZ_CACHE.keys().next().value); }
  return gz;
}

/* v5.38：brotli —— 主檔 gzip 706 KB、brotli 523 KB（省 26%），而且只壓一次就常駐記憶體。
   品質用 9（11 對 2 MB 的檔案要壓好幾秒，冷啟動會卡；9 的體積只差 1~2%）。
   一定要比 gzip 優先，不然支援 br 的瀏覽器永遠拿不到更小的那份。 */
const BR_CACHE = new Map();
function brBuf(file, buf, st) {
  const key = st.size + ':' + Math.floor(st.mtimeMs);
  const hit = BR_CACHE.get(file);
  if (hit && hit.key === key) return hit.br;
  let br;
  try {
    br = zlib.brotliCompressSync(buf, {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 9,
        [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buf.length
      }
    });
  } catch (e) { return null; }
  if (!br || br.length >= buf.length) return null;      // 沒變小就不要送
  BR_CACHE.set(file, { key: key, br: br });
  if (BR_CACHE.size > 40) { BR_CACHE.delete(BR_CACHE.keys().next().value); }
  return br;
}

function serveStatic(pathname, req, res) {
  let rel = pathname === '/' ? '/index.html' : pathname;
  rel = rel.replace(/\.\./g, '');
  const file = path.join(PUB, rel);

  if (!file.startsWith(PUB)) {
    res.writeHead(403); return res.end('forbidden');
  }

  fs.stat(file, function (e0, st) {
    if (e0 || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('not found');
    }
    const ext = path.extname(file).toLowerCase();
    // v4.6：Service Worker 與 manifest 一定要 no-cache，
    // 否則玩家瀏覽器會抱著舊的 sw.js／manifest.json，改版也吃不到
    const noCache = ext === '.html' || /(?:^|[\\/])sw\.js$/.test(file) || /manifest\.json$/.test(file);
    const img = /\.(?:webp|png|jpe?g|gif|ico|woff2?)$/i.test(ext);
    const cacheCtl = noCache ? 'no-cache'
      : img ? 'public, max-age=604800, stale-while-revalidate=86400'
      : 'public, max-age=3600';
    const etag = 'W/"' + st.size.toString(16) + '-' + Math.floor(st.mtimeMs).toString(16) + '"';
    const base = { 'ETag': etag, 'Cache-Control': cacheCtl };

    // 沒改就回 304：內容一樣，用瀏覽器手上那份就是最新的（ETag 含 mtime，改檔一定變）
    if (req && req.headers['if-none-match'] === etag) {
      res.writeHead(304, base);
      return res.end();
    }

    fs.readFile(file, function (err, buf) {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('not found');
      }
      const head = {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': cacheCtl,
        'ETag': etag,
        'Last-Modified': st.mtime.toUTCString()
      };
      let body = buf;
      const ae = String((req && req.headers['accept-encoding']) || '');
      const compressible = GZ_TYPES.test(ext) && buf.length >= GZ_MIN;
      // v5.38：brotli 優先（同一份檔案小 26%），瀏覽器不支援才退回 gzip
      if (compressible && /\bbr\b/.test(ae)) {
        const br = brBuf(file, buf, st);
        if (br) {
          body = br;
          head['Content-Encoding'] = 'br';
          head['Vary'] = 'Accept-Encoding';
        }
      }
      if (body === buf && compressible && /\bgzip\b/.test(ae)) {
        try { body = gzipBuf(file, buf, st); } catch (e) { body = buf; }
        if (body !== buf) {
          head['Content-Encoding'] = 'gzip';
          head['Vary'] = 'Accept-Encoding';
        }
      }
      head['Content-Length'] = body.length;
      res.writeHead(200, head);
      res.end(body);
    });
  });
}

/* v4.1 安全標頭：所有回應都加上（HSTS 只在 https 時才送，避免本機開發被鎖） */
function applySecurityHeaders(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  if (proto === 'https' || (req.socket && req.socket.encrypted)) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
}

const server = http.createServer(function (req, res) {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));

  applySecurityHeaders(req, res);

  // 強制 HTTPS（憑證由 Render / 反向代理處理，這裡只負責把 http 導去 https）
  if (FORCE_HTTPS) {
    const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
    if (proto === 'http') {
      res.writeHead(308, { Location: 'https://' + (req.headers['x-forwarded-host'] || req.headers.host || '') + req.url });
      return res.end();
    }
  }

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
  // v5.37：區網連線 —— 回報這台伺服器的 LAN 位址（手機連同一個 WiFi 就能一起玩）
  if (url.pathname === '/api/lan' && req.method === 'GET') {
    const addrs = [];
    try {
      const ifs = os.networkInterfaces();
      Object.keys(ifs).forEach(function (k) {
        (ifs[k] || []).forEach(function (a) {
          if (!a || a.internal) return;
          if (a.family !== 'IPv4' && a.family !== 4) return;
          addrs.push({ name: k, ip: a.address, url: 'http://' + a.address + ':' + PORT });
        });
      });
    } catch (e) {}
    return sendJSON(res, 200, { ok: true, port: PORT, addrs: addrs });
  }
  if (url.pathname === '/api/relay/list' && req.method === 'GET') {
    return handleRelayList(res);
  }
  if (url.pathname === '/api/health') {
    const cs = cloud.stats();
    return sendJSON(res, 200, {
      ok: true,
      rooms: rooms.size,
      relay: relayRooms.size,
      players: Array.from(rooms.values()).reduce(function (n, r) { return n + r.players.filter(function (p) { return p.connected; }).length; }, 0),
      accounts: cs.accounts,
      tamper: cs.tamper,
      // v4.85：存檔到底存在哪 —— 這三個欄位就是「能不能永存」的答案
      storage: cs.storage,               // supabase / file / memory
      storageLoaded: cs.storageLoaded,   // 有沒有真的從雲端讀到資料
      storageError: cs.storageError || '',   // 連不上時的原因（給人看的）
      storageWrites: cs.storageWrites,
      storageFails: cs.storageFails,
      rankClamped: cs.rankClamped,   // v5.28：排行榜被合理性檢查夾住的次數
      storageDiag: cs.storageDiag,     // v4.85f：遮罩過的 URL/金鑰指紋（不含金鑰本體）
      bootAt: BOOT_AT,                 // v4.85i：這次啟動的時間戳（判斷容器有沒有真的換過）
      uptimeSec: Math.round((Date.now() - BOOT_AT) / 1000)
    });
  }

  // v4.1：帳號 / 第三方登入 / 雲端存檔（cloud.js 自己處理路由，這裡只負責轉交）
  // v4.3：加上 /api/admin/*（開發者後台，cloud.js 內另有白名單檢查）
  if (url.pathname.indexOf('/api/auth/') === 0 ||
      url.pathname.indexOf('/api/rpg/') === 0 ||
      url.pathname.indexOf('/api/admin/') === 0 ||
      url.pathname.indexOf('/api/lb/') === 0 ||        // v4.80：每日挑戰排行榜
      url.pathname.indexOf('/api/save/') === 0 ||      // v4.85：整包存檔（跨裝置同步）
      url.pathname.indexOf('/api/share/') === 0 ||
      url.pathname.indexOf('/api/rank/') === 0 ||      // v5.13：十項排名
      url.pathname.indexOf('/api/social/') === 0 ||    // v5.13：線上玩家／好友／私訊
      url.pathname === '/api/player/card' ||           // v5.59：玩家資訊卡（只回公開欄位）
      url.pathname === '/api/visit') {           // v5.5：拜訪紀錄（免登入，cloud.js 內限流）
    cloud.handle(req, res, url).then(function (done) {
      if (!done) sendJSON(res, 404, { ok: false, err: 'no such api' });
    }).catch(function (e) {
      console.error('[cloud] handle 失敗:', e && e.message);
      try { sendJSON(res, 500, { ok: false, err: 'server error' }); } catch (e2) {}
    });
    return;
  }

  if (url.pathname.indexOf('/api/') === 0) {
    return sendJSON(res, 404, { ok: false, err: 'no such api' });
  }

  serveStatic(url.pathname, req, res);
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

/* v4.85：先等雲端存檔載入完再開始收請求
 *   —— 不然冷啟動的第一個請求會讀到空資料庫（帳號「不存在」→ 玩家被登出／進度看起來消失）
 */
const booted = cloud && cloud.ready ? cloud.ready : Promise.resolve();
booted.then(function () { server.listen(PORT, '0.0.0.0', function () {
  console.log('炸彈超人 Online 啟動：http://0.0.0.0:' + PORT);
  const cs = cloud.stats();
  if (cs.storage === 'supabase') {
    if (cs.storageLoaded) console.log('[cloud] 存檔：Supabase（雲端資料庫）✔ 已載入，寫入 ' + cs.storageWrites + ' 次');
    else console.log('[cloud] ⚠ Supabase 連線失敗：' + cs.storageError + ' → 目前不會寫回雲端，請檢查環境變數');
  } else if (cs.persisted) {
    console.log('[cloud] 存檔：本機檔案 ' + cs.dir + '（暫時磁碟，休眠／重新部署會消失）');
  } else {
    console.log('[cloud] 存檔：記憶體模式（重啟後帳號會消失）');
  }
}); }, function () { server.listen(PORT, '0.0.0.0', function () { console.log('炸彈超人 Online 啟動（存檔載入失敗，仍提供服務）'); }); });

module.exports = { server: server, cloud: cloud };
