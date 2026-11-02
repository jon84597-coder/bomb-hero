// test/_bot-src.js — AI 玩家本體（字串，會被 eval 進遊戲頁面）
module.exports = `
window.__bot = (function () {
  const BH = window.__BH;
  const DIRS = { up:{x:0,y:-1}, down:{x:0,y:1}, left:{x:-1,y:0}, right:{x:1,y:0} };
  const INF = 1e9;
  const st = { lastDirs: [], lastAction: false, bombsPlaced: 0, deaths: 0, reason: '' };

  function analyze() {
    const G = BH.Game, T = G.T, cols = G.cols, rows = G.rows, grid = G.grid;
    const p = G.players[0];
    const wall = function (x,y) { return x<0||y<0||x>=cols||y>=rows||grid[y][x]===1; };
    const soft = function (x,y) { return x>=0&&y>=0&&x<cols&&y<rows&&grid[y][x]===2; };
    const liveBombs = G.bombs.filter(function(b){ return !b.held; });
    const bombAt = function (x,y) { return liveBombs.some(function(b){ return b.cx===x&&b.cy===y; }); };
    const et = Array.from({length:rows}, function(){ return new Array(cols).fill(INF); });
    liveBombs.forEach(function (b) {
      const t0 = b.remoteArmed ? INF : b.timer;
      if (t0 < et[b.cy][b.cx]) et[b.cy][b.cx] = t0;
      Object.keys(DIRS).forEach(function (dn) {
        const d = DIRS[dn];
        for (let i=1; i<=(b.power||1); i++) {
          const x=b.cx+d.x*i, y=b.cy+d.y*i;
          if (wall(x,y)) break;
          if (t0 < et[y][x]) et[y][x] = t0;
          if (soft(x,y) || bombAt(x,y)) break;
        }
      });
    });
    G.flames.forEach(function (f) {
      if (f.src==='dino' && f.owner===p) return;
      if (et[f.cy]) et[f.cy][f.cx] = 0;
    });
    const enemyNear = function (x,y,r) {
      return G.enemies.some(function(e){
        if (e.dead) return false;
        const ex=Math.floor(e.x/T), ey=Math.floor(e.y/T);
        return Math.abs(ex-x)+Math.abs(ey-y) <= r;
      });
    };
    return { G:G,T:T,cols:cols,rows:rows,p:p,wall:wall,soft:soft,bombAt:bombAt,et:et,enemyNear:enemyNear };
  }

  function bfs(a, goalFn, opts) {
    opts = opts || {};
    const T=a.T, cols=a.cols, rows=a.rows, p=a.p, wall=a.wall, soft=a.soft, bombAt=a.bombAt, et=a.et;
    const start = { x: Math.floor(p.x/T), y: Math.floor(p.y/T) };
    const spd = Math.max(40, BH.moveSpeed(p) || 146);
    const step = T / spd;
    const seen = Array.from({length:rows}, function(){ return new Array(cols).fill(null); });
    seen[start.y][start.x] = { t:0, prev:null };
    const q = [start];
    let goal = null;
    for (let qi=0; qi<q.length && !goal; qi++) {
      const c = q[qi], t = seen[c.y][c.x].t;
      if (!(c.x===start.x && c.y===start.y) && goalFn(c.x, c.y, c)) { goal = c; break; }
      Object.keys(DIRS).some(function (dn) {
        const x=c.x+DIRS[dn].x, y=c.y+DIRS[dn].y;
        if (wall(x,y) || soft(x,y)) return false;
        if (bombAt(x,y)) return false;
        if (opts.avoidEnemy && a.enemyNear(x,y,1)) return false;
        if (seen[y][x]) return false;
        const nt = t + step*1.12;
        if (et[y][x] <= nt + 0.06) return false;
        seen[y][x] = { t:nt, prev:c };
        q.push({x:x, y:y});
        return false;
      });
    }
    if (!goal) return null;
    const path = []; let c = goal;
    while (c) { path.unshift(c); c = seen[c.y][c.x].prev; }
    return path;
  }

  function escapePath(a) {
    let p = bfs(a, function(x,y){ return a.et[y][x] >= INF && !a.enemyNear(x,y,1); }, { avoidEnemy:true });
    if (!p) p = bfs(a, function(x,y){ return a.et[y][x] >= INF; }, { avoidEnemy:true });
    if (!p) p = bfs(a, function(x,y){ return a.et[y][x] >= INF; }, {});
    return p;
  }

  function wantBomb(a) {
    const G=a.G, T=a.T, p=a.p;
    const cx = Math.floor(p.x/T), cy = Math.floor(p.y/T);
    if (a.bombAt(cx,cy)) return false;
    const mine = G.bombs.filter(function(b){ return b.owner===p; }).length;
    if (mine >= p.maxBombs) return false;
    let useful = false;
    Object.keys(DIRS).some(function (dn) {
      const d = DIRS[dn];
      for (let i=1; i<=p.power; i++) {
        const x=cx+d.x*i, y=cy+d.y*i;
        if (a.wall(x,y)) return true;
        if (a.soft(x,y)) { useful = true; return true; }
        const en = G.enemies.find(function(e){
          return !e.dead && Math.floor(e.x/T)===x && Math.floor(e.y/T)===y;
        });
        if (en) { useful = true; return true; }
      }
      return false;
    });
    if (!useful) return false;
    const blast = {};
    blast[cy+','+cx] = true;
    Object.keys(DIRS).forEach(function (dn) {
      const d = DIRS[dn];
      for (let i=1; i<=p.power; i++) {
        const x=cx+d.x*i, y=cy+d.y*i;
        if (a.wall(x,y)) return;
        blast[y+','+x] = true;
        if (a.soft(x,y) || a.bombAt(x,y)) return;
      }
    });
    const savedEt = a.et;
    a.et = a.et.map(function(row,y){
      return row.map(function(v,x){ return blast[y+','+x] ? Math.min(v, 2.4) : v; });
    });
    const esc = escapePath(a);
    a.et = savedEt;
    if (!esc || esc.length < 2) { st.reason = 'no-escape'; return false; }
    st.bombsPlaced++;
    return true;
  }

  function follow(path) {
    if (!path || path.length < 2) return [];
    const d = path[1], c = path[0];
    if (d.x > c.x) return ['right'];
    if (d.x < c.x) return ['left'];
    if (d.y > c.y) return ['down'];
    if (d.y < c.y) return ['up'];
    return [];
  }

  function plan() {
    const a = analyze();
    const G=a.G, T=a.T, p=a.p;
    if (!p || !p.alive || G.state !== 'play') { st.lastDirs=[]; st.lastAction=false; return st; }
    const cx = Math.floor(p.x/T), cy = Math.floor(p.y/T);
    const cur = (a.et[cy] && a.et[cy][cx] !== undefined) ? a.et[cy][cx] : INF;
    if (cur < INF) {
      const path = escapePath(a);
      st.lastDirs = follow(path); st.lastAction = false;
      if (!path) st.reason = 'trapped';
      return st;
    }
    if (wantBomb(a)) { st.lastDirs = []; st.lastAction = true; return st; }
    st.lastAction = false;
    const door = G.door;
    let path = null;
    if (door && door.open) {
      path = bfs(a, function(x,y){ return x===door.x && y===door.y; }, {avoidEnemy:true}) ||
             bfs(a, function(x,y){ return x===door.x && y===door.y; }, {});
    }
    if (!path) path = bfs(a, function(x,y){
      return Object.keys(DIRS).some(function(dn){
        const d=DIRS[dn]; return a.soft(x+d.x, y+d.y);
      });
    }, {avoidEnemy:true});
    if (!path) path = bfs(a, function(x,y){
      return G.enemies.some(function(e){
        if (e.dead) return false;
        return Math.abs(Math.floor(e.x/T)-x)+Math.abs(Math.floor(e.y/T)-y) <= 1;
      });
    }, {});
    st.lastDirs = (path && path.length > 1) ? follow(path) : [];
    if (!st.lastDirs.length) st.reason = 'no-path';
    return st;
  }

  const scheme = {
    dirs:    function () { plan(); return st.lastDirs; },
    action:  function () { return st.lastAction; },
    actionHeld: function () { return false; },
    detonate: function () { return false; },
    fire:    function () { return false; }
  };
  return { scheme: scheme, st: st, attach: function (pl) {
    (pl || BH.Game.players[0]).scheme = scheme;
  } };
})();
`;
