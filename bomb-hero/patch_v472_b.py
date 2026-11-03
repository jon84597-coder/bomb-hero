# -*- coding: utf-8 -*-
# v4.72 B：大逃殺本體（三島地圖、毒圈、8 人、名次獎勵、入場卡）
import io, sys

P = 'index.html'
s = io.open(P, encoding='utf-8').read()


def rep(old, new, tag, cnt=1):
    global s
    n = s.count(old)
    if n != cnt:
        print('[FAIL]', tag, 'count=', n)
        sys.exit(1)
    s = s.replace(old, new)
    print('[ok]', tag)


BR_CODE = r"""
// ====
//   v4.72：大逃殺（三島）
//   · 48×38＝1,824 格（T5 的 2.6 倍）：三座島 + 兩條 3 格寬的窄橋
//   · 每場三座島各配一種地形（八關主題隨機抽三種），地板、可炸物、地面裝飾都跟著走
//   · 8 人同場（你 + 7 個 AI）／14 隻小怪依島嶼面積平均分配（不擠在出生點旁）
//   · 毒圈：以最大的島為圓心往內縮，圈外撐 1.6 秒就淘汰
//   · 名次獎勵金幣，前三名再送一張門票（打得好可以一直打下去）
// ====
const BR = {
  W: 48, H: 38, N: 8, FOES: 14,
  // [等待秒數, 目標半徑（格）]
  PH: [[34, 24], [24, 16], [18, 9], [14, 4.5]],
  // 名次 1~8 的金幣獎勵
  GOLD: [1200, 700, 450, 300, 200, 150, 100, 80],
  ISL: [
    { cx: 12, cy: 12, r: 8.6 },
    { cx: 35, cy: 12, r: 8.6 },
    { cx: 24, cy: 27, r: 9.2 }
  ],
  on: function () { return Game.mode === 'br'; }
};

function brIslAt(x, y) {
  const a = Game.brIsl;
  if (!a || !a[y]) return -1;
  return a[y][x] < 0 ? -1 : a[y][x];
}

function buildBRMap() {
  const cols = BR.W, rows = BR.H, isl = BR.ISL;
  Game.cols = cols; Game.rows = rows;
  Game.bigMap = true;
  Game.T = tileSize();
  recalcSpdK();
  Game.ox = Math.floor((canvasSize().w - Game.T * cols) / 2);
  Game.oy = Math.floor((canvasSize().h - Game.T * rows) / 2);
  Game.camSnap = true;
  Game.wallKind = null; Game.wallSize = null;
  Game.sdRock = null; Game.sdActive = false; Game.sdList = [];
  // 三座島各挑一種地形（八選三、不重複）；背景底圖沿用第三座島 → 島與島之間看得到海水
  const picks = [];
  while (picks.length < 3) {
    const k = rand(THEMES.length);
    if (picks.indexOf(k) < 0) picks.push(k);
  }
  Game.theme = THEMES[picks[2]];
  Game.stage = picks[2] + 1;
  Game.grid = []; Game.themeAt = []; Game.brIsl = []; Game.hazards = [];
  for (let y = 0; y < rows; y++) {
    const row = [], tr = [], ir = [];
    for (let x = 0; x < cols; x++) { row.push(1); tr.push(null); ir.push(-1); }
    Game.grid.push(row); Game.themeAt.push(tr); Game.brIsl.push(ir);
    Game.hazards.push(new Array(cols).fill(null));
  }
  Game.warps = []; Game.bubbles = []; Game.hidden = {};
  Game.eggs = []; Game.eggsHidden = []; Game.door = null;
  // ---- 島：圓形底 + 三段弦波做出不規則海岸線 ----
  function inBlob(x, y, c, seed) {
    const dx = x - c.cx, dy = y - c.cy;
    const d = Math.sqrt(dx * dx + dy * dy);
    const a = Math.atan2(dy, dx);
    const k = 1 + .16 * Math.sin(a * 3 + seed) + .085 * Math.sin(a * 5 - seed * 1.7);
    return d < c.r * k;
  }
  isl.forEach(function (c, i) {
    const th = THEMES[picks[i]];
    for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
      if (!inBlob(x, y, c, i * 2.1 + .7)) continue;
      Game.grid[y][x] = 0; Game.brIsl[y][x] = i; Game.themeAt[y][x] = th;
    }
  });
  // ---- 橋：第一、二座島各連一條到第三座島（3 格寬、帶弧度）----
  function bridge(a, b, bend) {
    const steps = Math.ceil(Math.sqrt((b.cx - a.cx) * (b.cx - a.cx) + (b.cy - a.cy) * (b.cy - a.cy)) * 2);
    const th = THEMES[picks[2]];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const bx = a.cx + (b.cx - a.cx) * t + Math.sin(t * Math.PI) * bend;
      const by = a.cy + (b.cy - a.cy) * t;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (Math.abs(dx) + Math.abs(dy) > 1) continue;
        const px = Math.round(bx) + dx, py = Math.round(by) + dy;
        if (px < 1 || py < 1 || px >= cols - 1 || py >= rows - 1) continue;
        Game.grid[py][px] = 0;
        if (Game.brIsl[py][px] < 0) Game.brIsl[py][px] = 2;
        if (!Game.themeAt[py][px]) Game.themeAt[py][px] = th;
      }
    }
  }
  bridge(isl[0], isl[2], 3.4);
  bridge(isl[1], isl[2], -3.4);
  // ---- 連通性：從第三座島的中心擴散，走不到的陸地補回岩層 ----
  const seen = [];
  for (let y = 0; y < rows; y++) seen.push(new Array(cols).fill(false));
  const q = [[isl[2].cx, isl[2].cy]];
  seen[isl[2].cy][isl[2].cx] = true;
  for (let i = 0; i < q.length; i++) {
    const cx2 = q[i][0], cy2 = q[i][1];
    for (let k = 0; k < 4; k++) {
      const nx = cx2 + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = cy2 + (k === 2 ? 1 : k === 3 ? -1 : 0);
      if (nx < 1 || ny < 1 || nx >= cols - 1 || ny >= rows - 1) continue;
      if (seen[ny][nx] || Game.grid[ny][nx] === 1) continue;
      seen[ny][nx] = true; q.push([nx, ny]);
    }
  }
  let cut = 0;
  for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
    if (Game.brIsl[y][x] >= 0 && !seen[y][x]) { Game.grid[y][x] = 1; cut++; }
  }
  // ---- 出生點：三座島 3／3／2 分散 ----
  const sp = [];
  const per = [3, 3, 2];
  isl.forEach(function (c, i) {
    let got = 0, guard = 0;
    while (got < per[i] && guard++ < 500) {
      const a2 = Math.random() * 6.2832, rr = Math.sqrt(Math.random()) * c.r * .6;
      const x = clamp(Math.round(c.cx + Math.cos(a2) * rr), 1, cols - 2);
      const y = clamp(Math.round(c.cy + Math.sin(a2) * rr), 1, rows - 2);
      if (Game.brIsl[y][x] !== i || !seen[y][x]) continue;
      let ok = true;
      for (let k = 0; k < sp.length; k++) {
        if (Math.abs(sp[k].x - x) + Math.abs(sp[k].y - y) < 5) { ok = false; break; }
      }
      if (!ok) continue;
      sp.push({ x: x, y: y }); got++;
    }
  });
  // 出生格周圍 1 格淨空（跟單人隨機圖同一個規則）
  const near = {};
  sp.forEach(function (s2) {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = s2.x + dx, y = s2.y + dy;
      if (x < 1 || y < 1 || x >= cols - 1 || y >= rows - 1) continue;
      if (Game.brIsl[y][x] < 0) continue;
      Game.grid[y][x] = 0; near[y + ',' + x] = 1;
    }
    near[s2.y + ',' + s2.x] = 1;
  });
  // ---- 可炸軟磚（.5）＋ 底下藏道具 ----
  const softs = [];
  for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
    if (Game.brIsl[y][x] < 0 || Game.grid[y][x] !== 0) continue;
    if (near[y + ',' + x]) continue;
    if (Math.random() < .5) { Game.grid[y][x] = 2; softs.push({ x: x, y: y }); }
  }
  const pool = ITEM_POOL.slice();
  for (let i = 0; i < Math.min(34, softs.length); i++) {
    const s3 = softs.splice(rand(softs.length), 1)[0];
    Game.hidden[s3.y + ',' + s3.x] = pick(pool);
  }
  // ---- 空地上的補給（離出生點遠一點，開局不會一撿就滿裝）----
  const open = [];
  for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
    if (Game.grid[y][x] !== 0 || Game.brIsl[y][x] < 0 || near[y + ',' + x]) continue;
    open.push({ x: x, y: y });
  }
  for (let i = 0; i < 20 && open.length; i++) {
    const o = open.splice(rand(open.length), 1)[0];
    spawnItem(o.x, o.y, pick(ITEM_POOL));
  }
  Game.wallKind = null;
  markWallKinds();
  return { picks: picks, spawns: sp, cut: cut };
}

// 圈外：AI 往圓心走（回傳 true 表示這幀由我接管移動）
function brSteer(p, dt) {
  const z = Game.brZone; if (!z) return false;
  const T = Game.T;
  const cx = (z.cx + .5) * T, cy = (z.cy + .5) * T;
  const safe = Math.max(0, (z.r - 2.5) * T);
  const dx = cx - p.x, dy = cy - p.y;
  if (Math.sqrt(dx * dx + dy * dy) <= safe) return false;
  const dirs = [];
  if (Math.abs(dx) > T * .35) dirs.push(dx > 0 ? 'right' : 'left');
  if (Math.abs(dy) > T * .35) dirs.push(dy > 0 ? 'down' : 'up');
  if (!dirs.length) return false;
  humanMoveDirs(p, dirs, dt);
  return true;
}

function startBR() {
  // 門票：每場消耗一張（開發者帳號不扣）
  let dev = false;
  try { dev = Shop.dev(); } catch (e) {}
  if (!dev) {
    let ok = false;
    try { ok = Shop.useTicket(); } catch (e) {}
    if (!ok) {
      toast('🎟️ 門票不足 —— 商店 2000 金幣一張，每天登入也會送 1 張', 2.6);
      return false;
    }
  }
  Game.mode = 'br';
  Game.pets = [];
  Game.bossRush = false; Game.round = 1; Game.matchOver = false; Game.endShown = false;
  Game.teamsOn = 0; Game.winsNeeded = 1; Game.teamWins = [0, 0, 0, 0];
  Game.state = 'idle'; paused = false;
  Game.brOut = 0;
  const me = 0;
  const dummy = { dirs: function () { return []; }, action: function () { return false; }, actionHeld: function () { return false; } };
  Screen.show('game');
  resizeView();
  const info = buildBRMap();
  const humanScheme = IS_TOUCH ? Input.schemes.touch : Input.schemes.kb1;
  Game.players = [];
  for (let i = 0; i < BR.N; i++) {
    const c = info.spawns[i] || { x: 1, y: 1 };
    const isMe = i === 0;
    const p = makePlayer(i, isMe ? (settings.chIdx | 0) : randomChar(), isMe ? humanScheme : dummy,
      { px: (c.x + .5) * Game.T, py: (c.y + .5) * Game.T });
    resetPlayerStats(p);
    p.alive = true; p.dead = false; p.invuln = 2.5; p.carry = null; p.slide = null;
    p.warpLock = ''; p.cart = false; p.cartCd = 0; p.gloat = 0; p.cartDir = null;
    p.brOut = 0;
    p.label = 'P' + (i + 1);
    p.name = isMe ? (settings.playerName || String(settings.names[0] || '').trim() || '我') : ('AI·' + (i + 1));
    if (!isMe) p.ai = true;
    Game.players.push(p);
  }
  Game.brAlive = Game.players.length;
  Game.brZone = { cx: BR.ISL[2].cx, cy: BR.ISL[2].cy, r: 34, tr: 34, phase: 0, t: BR.PH[0][0] };
  Game.enemies = [];
  Game.bombs = []; Game.flames = []; Game.items = []; Game.particles = [];
  Game.bolts = []; Game.pops = []; Game.edgeFx = 0; Game.pets = [];
  Game.foeCap = BR.FOES + 8;
  Game.timer = Infinity;
  // ---- 小怪：依島嶼面積平均分配，離出生點 3 格內不生 ----
  const perIsl = [5, 5, 4];
  const used = {};
  for (let i = 0; i < 3; i++) {
    const th = info.picks[i] + 1;                 // 這一座島用的主題 → 對應的關卡生態
    const pool = stageTypes(th);
    let made = 0, guard = 0;
    while (made < perIsl[i] && guard++ < 900) {
      const x = rand(Game.cols), y = rand(Game.rows);
      if (Game.brIsl[y][x] !== i) continue;
      if (Game.grid[y][x] !== 0) continue;
      const key = y * Game.cols + x;
      if (used[key]) continue;
      let bad = false;
      for (let k = 0; k < Game.players.length; k++) {
        const p = Game.players[k];
        if (Math.abs(p.x / Game.T - x) < 3.2 && Math.abs(p.y / Game.T - y) < 3.2) { bad = true; break; }
      }
      if (bad) continue;
      used[key] = 1;
      const e = makeEnemy(x, y, pick(pool), 10, 1);
      e.homeIsl = i;
      Game.enemies.push(e);
      made++;
    }
  }
  showOverlay({
    title: '🏝️ 大逃殺 · 三島',
    sub: '48×38 的超大地圖 · ' + BR.N + ' 人同場 · ' + Game.enemies.length + ' 隻小怪\n' +
         '縮圈從腳下最大的島開始收；撐到最後一個人就是冠軍。',
    btn: '出發（存活 ' + Game.brAlive + ' 人）',
    action: function () { beginCountdown('battle'); }
  });
  AudioSys.startBGM(stageBGM(Game.stage));
  updateHud();
  enterImmersive();
  return true;
}

// 圓外毒圈：畫在牆之上、角色之下，圈外地面染成紫紅
function drawBRZone(T) {
  const z = Game.brZone;
  const cx = (z.cx + .5) * T, cy = (z.cy + .5) * T, r = Math.max(8, z.r * T);
  ctx.save();
  ctx.beginPath();
  ctx.rect(-T * 2, -T * 2, Game.cols * T + T * 4, Game.rows * T + T * 4);
  ctx.arc(cx, cy, r, 0, 6.2832, true);
  ctx.fillStyle = 'rgba(104,26,132,.30)';
  ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832);
  ctx.strokeStyle = 'rgba(255,116,190,.85)';
  ctx.lineWidth = Math.max(2, T * .12);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.restore();
}

// 左上角小地圖下方：存活人數 + 縮圈倒數
function drawBRHud() {
  if (Game.mode !== 'br' || !Game.brZone) return;
  const mm = miniMapOn() ? miniMapBox() : null;
  const x = 8, y = mm ? mm.y + mm.h + 6 : 8;
  const w = mm ? Math.max(84, mm.w) : 118, h = 44;
  const z = Game.brZone;
  const alive = Game.players.filter(function (p) { return p.alive; }).length;
  ctx.save();
  ctx.fillStyle = 'rgba(6,11,20,.80)';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, 7); ctx.fill(); }
  else ctx.fillRect(x, y, w, h);
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, 7); }
  else { ctx.beginPath(); ctx.rect(x, y, w, h); }
  ctx.strokeStyle = 'rgba(255,120,190,.55)';
  ctx.lineWidth = 1.3; ctx.stroke(); ctx.lineWidth = 1;
  const fs = Math.max(10, Math.round(w * .155));
  ctx.font = 'bold ' + fs + 'px sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe6a6';
  ctx.fillText('存活 ' + alive + '/' + Game.players.length, x + 8, y + h * .30);
  ctx.fillStyle = '#ffc0dd';
  const left = z.phase >= BR.PH.length ? '終局' : (Math.max(0, Math.ceil(z.t)) + 's');
  ctx.fillText('縮圈 ' + left, x + 8, y + h * .70);
  ctx.restore();
}

function brOnDeath(p) {
  p.brPlace = Math.max(1, Game.brAlive | 0);
  Game.brAlive = Math.max(0, (Game.brAlive | 0) - 1);
  if (!p.ai && Game.state === 'play') {
    Game.state = 'roundover';
    setTimeout(function () { brFinish(null); }, 1400);
  }
}

function brFinish(winner) {
  if (Game.endShown) return;
  const me = Game.players[0];
  const win = !!(winner && winner === me);
  const place = win ? 1 : Math.min(BR.N, me.brPlace || (Game.brAlive + 1));
  const gold = BR.GOLD[Math.max(1, Math.min(BR.GOLD.length, place)) - 1] || 80;
  let tk = 0;
  try { Shop.addGold(gold); } catch (e) {}
  if (place <= 3) {
    try { Shop.grantTicket(1); tk = Shop.tickets(); } catch (e) {}
  }
  try { if (typeof Cloud !== 'undefined' && Cloud.track) Cloud.track('br', place); } catch (e) {}
  const title = win ? '🏆 大逃殺冠軍！' : ('🏝️ 第 ' + place + ' 名 / ' + BR.N);
  const sub = (win ? '整座群島只剩你一個。' : '再撐一下就更前面了。') +
    '\n金幣 +' + gold + (place <= 3 ? '　🎟️ 門票 +1（現有 ' + tk + ' 張）' : '');
  Game.state = 'over';
  banner(title, 3.2);
  if (win) { AudioSys.sfx('victory'); confetti(me.x, me.y - Game.T * .6, 18); }
  showEnd(title, sub, win, me.chIdx);
}

function updateBR(dt) {
  if (Game.state === 'play' || Game.state === 'roundover') {
    const T = Game.T, z = Game.brZone;
    if (z) {
      if (z.r > z.tr) z.r = Math.max(z.tr, z.r - dt * 1.6);     // 收縮動畫
      if (Game.state === 'play') {
        z.t -= dt;
        if (z.t <= 0 && z.phase < BR.PH.length) {
          z.tr = BR.PH[z.phase][1];
          z.phase++;
          z.t = z.phase < BR.PH.length ? BR.PH[z.phase][0] : 1e9;
          banner('毒圈收縮', 1.0);
          AudioSys.sfx('sd');
        }
      }
    }
    Game.players.forEach(function (p) {
      if (!p.alive) return;
      let outside = false;
      if (z) {
        const dx = p.x / T - (z.cx + .5), dy = p.y / T - (z.cy + .5);
        outside = (dx * dx + dy * dy) > z.r * z.r;
      }
      if (outside) {
        p.brOut = (p.brOut || 0) + dt;
        if (p.brOut > 1.6) { p.brOut = 0; killBattlePlayer(p, null); return; }
      } else p.brOut = 0;
      if (p.cart) { updateCart(p, dt); return; }
      if (p.ai) { if (!(outside && brSteer(p, dt))) controlAI(p, dt); }
      else controlHuman(p, dt);
    });
    if (Game.state === 'play') {
      Game.enemies.forEach(function (e) { updateEnemy(e, dt); });
      Game.players.forEach(function (p) {
        if (!p.alive || p.invuln > 0) return;
        for (let i = 0; i < Game.enemies.length; i++) {
          const e = Game.enemies[i];
          if (e.blinkT > 0 || e.emergeT > 0) continue;
          const rr = foeTouchR(e);
          if (dist2(e.x, e.y, p.x, p.y) < rr * rr) { killBattlePlayer(p, null); break; }
        }
      });
      transferSkull();
      const alive = Game.players.filter(function (q) { return q.alive; });
      if (alive.length <= 1 && Game.state === 'play') brFinish(alive[0] || null);
    }
  }
  Game.players.forEach(function (p) {
    if (p.dead && p.respawnT > 0) { p.respawnT -= dt; if (p.respawnT <= 0) p.dead = false; }
  });
  updateWorld(dt);
}
"""

rep("""// ===== 復仇推車（場外環狀軌道） =====""",
    BR_CODE + """
// ===== 復仇推車（場外環狀軌道） =====""",
    'br-module')

# ---- 分派 ----
rep("""    } else if (Game.mode === 'solo' || Game.mode === 'rpg') updateSolo(dt); else updateBattle(dt);""",
    """    } else if (Game.mode === 'solo' || Game.mode === 'rpg') updateSolo(dt);
    else if (Game.mode === 'br') updateBR(dt);
    else updateBattle(dt);""",
    'dispatch')

# ---- 擊殺守衛：大逃殺跟對戰一樣「一擊就淘汰」 ----
rep("""      if (Game.mode === 'battle') killBattlePlayer(p, b.owner);
      else killPlayer(p, false, b.owner);""",
    """      if (Game.mode === 'battle' || Game.mode === 'br') killBattlePlayer(p, b.owner);
      else killPlayer(p, false, b.owner);""",
    'kill-bomb')

rep("""        if (Game.mode === 'battle') killBattlePlayer(p, killer); else killPlayer(p, false, killer);""",
    """        if (Game.mode === 'battle' || Game.mode === 'br') killBattlePlayer(p, killer);
        else killPlayer(p, false, killer);""",
    'kill-flame')

# ---- killBattlePlayer：大逃殺記名次、不上復仇推車 ----
rep("""  p.alive = false; p.dead = true; p.respawnT = 1;
  p.cry = 2.8;                    // v1.7：被炸到要亮相大哭臉""",
    """  p.alive = false; p.dead = true; p.respawnT = 1;
  p.cry = 2.8;                    // v1.7：被炸到要亮相大哭臉
  if (Game.mode === 'br') brOnDeath(p);      // v4.72：大逃殺記名次（不會復活、不坐推車）""",
    'kill-br-place')

rep("""  if (settings.revenge && settings.revenge !== 'off' && !Game.sdActive) {""",
    """  if (Game.mode !== 'br' && settings.revenge && settings.revenge !== 'off' && !Game.sdActive) {""",
    'kill-no-cart')

# ---- HUD 用對戰樣式（大計時器）----
rep("""  const battle = Game.mode === 'battle';
  top.className = 'game-top' + (battle ? ' battle' : '') +""",
    """  const battle = Game.mode === 'battle' || Game.mode === 'br';
  top.className = 'game-top' + (battle ? ' battle' : '') +""",
    'hud-battle')

# ---- 再來一次 ----
rep("""    if (Game.mode === 'solo') { if (Game.bossRush) startSolo(SOLO_STAGES, true); else startSolo(Game.stage); }
    else startBattle();""",
    """    if (Game.mode === 'solo') { if (Game.bossRush) startSolo(SOLO_STAGES, true); else startSolo(Game.stage); }
    else if (Game.mode === 'br') startBR();
    else startBattle();""",
    'again-br', 2)

# ---- Shop：送門票 ----
rep("""    claimDaily: claimDaily, todayKey: todayKey,""",
    """    claimDaily: claimDaily, todayKey: todayKey, grantTicket: grantTicket,""",
    'shop-export')

rep("""  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(owned)); } catch (e) {}""",
    """  // v4.72：大逃殺前三名送一張門票（打得好可以一直打下去）
  function grantTicket(n) {
    tickets += Math.max(1, n | 0 || 1);
    save(); render();
    return tickets;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(owned)); } catch (e) {}""",
    'shop-grant')

# ---- 匯出 ----
rep("""  drawMiniMap: drawMiniMap, miniMapOn: miniMapOn, miniMapBox: miniMapBox, drawTeamHud: drawTeamHud,""",
    """  drawMiniMap: drawMiniMap, miniMapOn: miniMapOn, miniMapBox: miniMapBox, drawTeamHud: drawTeamHud,
  // v4.72：大逃殺（測試／除錯用）
  BR: BR, startBR: startBR, buildBRMap: buildBRMap, updateBR: updateBR, brFinish: brFinish,
  brOnDeath: brOnDeath, drawBRHud: drawBRHud, drawBRZone: drawBRZone, brSteer: brSteer, viewRange: viewRange,""",
    'bh-export')

io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('done')
