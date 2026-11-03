# -*- coding: utf-8 -*-
# v4.55 patch：外牆配色／頭像不變形／地圖去疙瘩／出生保護 2 格／軟磚變多／格檔搶仇恨／腳下炸彈提醒／大逃殺鈕
import io, re, sys

P = 'index.html'
s = io.open(P, encoding='utf-8').read()
N = [0]

def rep(old, new, tag):
    global s
    if s.count(old) != 1:
        print('!! [%s] 出現 %d 次，中止' % (tag, s.count(old)))
        sys.exit(1)
    s = s.replace(old, new)
    N[0] += 1
    print('ok', tag)

def must(txt, tag):
    if txt not in s:
        print('!! 驗證失敗：%s' % tag)
        sys.exit(1)

# ============================================================
# 1) THEMES：每一大關自己的外牆底色（由該關硬牆基底調出來）
# ============================================================
for hard, out in [
    ("hard: '#c9a09a'", "hard: '#c9a09a', out: '#b57a72'"),
    ("hard: '#d3b47c'", "hard: '#d3b47c', out: '#b08a4e'"),
    ("hard: '#2b577a'", "hard: '#2b577a', out: '#79aecb'"),
    ("hard: '#3a3358'", "hard: '#3a3358', out: '#6b5d93'"),
    ("hard: '#4b4478'", "hard: '#4b4478', out: '#8b7fd4'"),
    ("hard: '#3d6c77'", "hard: '#3d6c77', out: '#63a3ae'"),
    ("hard: '#c6d2e8'", "hard: '#c6d2e8', out: '#94aacb'"),
    ("hard: '#35202c'", "hard: '#35202c', out: '#7a4358'"),
]:
    rep(hard, out, 'THEME out ' + out[-9:])

# ============================================================
# 2) drawOuterWall：吃 th.out，比硬牆大 20%，外緣壓暗邊
# ============================================================
old_wall = """function drawOuterWall(px, py, T, th, seed) {
  const hard = (th && th.hard) || '#c9a0a8';
  const base = mixHex(hard, '#e8cf9c', .55);
  const dark = mixHex(hard, '#8a6b3e', .42);
  const e = T * .045;
  const x = px - e, y = py - e, w = T + e * 2, h = T + e * 2;
  const gr = ctx.createLinearGradient(x, y, x, y + h);
  gr.addColorStop(0, base); gr.addColorStop(1, dark);
  ctx.fillStyle = gr; ctx.fillRect(x, y, w, h);
  const mw = Math.max(1, T * .045);
  const half = h * .5;
  ctx.strokeStyle = 'rgba(84,58,30,.34)';
  ctx.lineWidth = mw;
  ctx.beginPath();
  ctx.moveTo(x, y + half); ctx.lineTo(x + w, y + half);
  const u = ((seed >> 1) & 1) ? .34 : .63;
  ctx.moveTo(x + w * u, y); ctx.lineTo(x + w * u, y + half);
  ctx.moveTo(x + w * (1.26 - u), y + half); ctx.lineTo(x + w * (1.26 - u), y + h);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,246,214,.40)';                    // 頂面亮邊
  ctx.fillRect(x, y, w, Math.max(1.5, T * .07));
  ctx.fillStyle = 'rgba(66,44,20,.26)';                       // 底部沉影
  ctx.fillRect(x, y + h - Math.max(2, T * .09), w, Math.max(2, T * .09));
}"""
new_wall = """function drawOuterWall(px, py, T, th, seed, gx, gy) {
  // v4.55：顏色吃 th.out（每個大關自己一組，由該關硬牆基底調出來），不再一律混沙金
  const base = (th && (th.out || th.hard)) || '#b57a72';
  const top = mixHex(base, '#ffffff', .26), deep = mixHex(base, '#241206', .30);
  const e = T * .10;                        // 比硬牆往外擴 10% → 更粗更有份量
  const x = px - e, y = py - e, w = T + e * 2, h = w;
  const gr = ctx.createLinearGradient(x, y, x, y + h);
  gr.addColorStop(0, top); gr.addColorStop(1, deep);
  ctx.fillStyle = gr; ctx.fillRect(x, y, w, h);
  // 大塊粗石：兩道橫縫 ＋ 一道直縫（上下錯開），跟硬牆的細磚紋不同
  const h1 = y + h * .34, h2 = y + h * .71;
  const u = ((seed >> 1) & 1) ? .40 : .62;
  ctx.strokeStyle = 'rgba(32,18,6,.30)';
  ctx.lineWidth = Math.max(1.2, T * .048);
  ctx.beginPath();
  ctx.moveTo(x, h1); ctx.lineTo(x + w, h1);
  ctx.moveTo(x, h2); ctx.lineTo(x + w, h2);
  ctx.moveTo(x + w * u, h1); ctx.lineTo(x + w * u, h2);
  ctx.moveTo(x + w * (1.3 - u), y); ctx.lineTo(x + w * (1.3 - u), h1);
  ctx.stroke();
  const cap = Math.max(2, T * .09);
  ctx.fillStyle = 'rgba(255,250,230,.30)'; ctx.fillRect(x, y, w, cap);        // 頂面亮邊
  ctx.fillStyle = 'rgba(26,14,4,.28)'; ctx.fillRect(x, y + h - cap, w, cap);  // 底部沉影
  // 只有「相鄰不是外牆」的那一側壓暗邊 → 整坨牆更厚，內部不會出現一格一格的線
  if (gx == null) return;
  const wk = Game.wallKind;
  const isOut = function (ax, ay) {
    if (ax < 0 || ay < 0 || ax >= Game.cols || ay >= Game.rows) return true;
    return !!(wk && wk[ay] && wk[ay][ax] === 1);
  };
  const b = Math.max(2, T * .075);
  ctx.fillStyle = 'rgba(26,14,4,.34)';
  if (!isOut(gx, gy - 1)) ctx.fillRect(x, y, w, b);
  if (!isOut(gx, gy + 1)) ctx.fillRect(x, y + h - b, w, b);
  if (!isOut(gx - 1, gy)) ctx.fillRect(x, y, b, h);
  if (!isOut(gx + 1, gy)) ctx.fillRect(x + w - b, y, b, h);
}"""
rep(old_wall, new_wall, 'drawOuterWall')

# 呼叫端補 gx/gy（畫外牆時要判斷相鄰）
rep("if (wk === 1) drawOuterWall(px, py, T, th, x * 37 + y * 7);",
    "if (wk === 1) drawOuterWall(px, py, T, th, x * 37 + y * 7, x, y);",
    'drawOuterWall call')

# ============================================================
# 3) freeRimRocks：跟外牆黏在一起的硬牆島直接挖開（別兩層牆擠在一起浪費場地）
# ============================================================
anchor = """  Game.wallKind = wk;
}
function drawStone("""
add = """  Game.wallKind = wk;
}
// v4.55：黏在外牆上的硬牆島（含斜角相黏）直接挖開 ——
//   兩層牆貼在一起只是白白吃掉場地空間，還會讓輪廓看起來像一坨疙瘩。
//   只拆「小島」（<= 24 格），大塊岩層不動，免得把關卡的隔間拆光。
function freeRimRocks(g) {
  markWallKinds();
  const wk = Game.wallKind, cols = Game.cols, rows = Game.rows;
  if (!wk) return 0;
  const seen = [], q = [], D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let y = 0; y < rows; y++) seen.push(new Array(cols).fill(false));
  let n = 0;
  for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
    if (wk[y][x] !== 2 || seen[y][x]) continue;
    seen[y][x] = true;
    const island = [[x, y]]; q.length = 0; q.push([x, y]);
    let near = false;
    for (let i = 0; i < q.length; i++) {
      const cx = q[i][0], cy = q[i][1];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const ax = cx + dx, ay = cy + dy;
        if (ax < 0 || ay < 0 || ax >= cols || ay >= rows) continue;
        if ((dx || dy) && wk[ay][ax] === 1) near = true;          // 八鄰接外牆
      }
      for (let k = 0; k < 4; k++) {
        const ax = cx + D4[k][0], ay = cy + D4[k][1];
        if (ax < 1 || ay < 1 || ax >= cols - 1 || ay >= rows - 1) continue;
        if (seen[ay][ax] || wk[ay][ax] !== 2) continue;
        seen[ay][ax] = true; island.push([ax, ay]); q.push([ax, ay]);
      }
    }
    if (!near || island.length > 24) continue;
    for (let i = 0; i < island.length; i++) { g[island[i][1]][island[i][0]] = 0; n++; }
  }
  if (n) Game.wallKind = null;                                   // 格子變了 → 分類重算
  return n;
}
function drawStone("""
rep(anchor, add, 'freeRimRocks')

rep("""  Game.grid = g;
  Game.wallKind = null;
  Game.spawnCell = { x: sp.x, y: sp.y };""",
    """  Game.grid = g;
  if (!Game.bigMap) freeRimRocks(g);      // v4.55：先拆掉黏在外牆上的硬牆島，場地才不會被兩層牆吃掉
  Game.wallKind = null;
  Game.spawnCell = { x: sp.x, y: sp.y };""",
    'freeRimRocks call')

# ============================================================
# 4) 出生點保護半徑 3 → 2 格
# ============================================================
rep("""        // v4.51：出生點半徑 3 內不生成怪（隨機出生點後，舊的「x<4 && y<4」已經沒意義）
      } while ((cellAt(x, y) !== 0 || nearSpawn(x, y, 3) || bombAt(x, y)) && tries < 200);""",
    """        // v4.55：出生點半徑 2 格內不生成怪（原本 3 格，開場周圍太乾淨）
      } while ((cellAt(x, y) !== 0 || nearSpawn(x, y, 2) || bombAt(x, y)) && tries < 200);""",
    'nearSpawn A')

rep("    } while ((cellAt(x, y) !== 0 || nearSpawn(x, y, 3) || bombAt(x, y)) && tries < 200);",
    "    } while ((cellAt(x, y) !== 0 || nearSpawn(x, y, 2) || bombAt(x, y)) && tries < 200);",
    'nearSpawn B')

rep("""  const s2 = Game.spawnCell || { x: 1, y: 1 };
  d = d || 3;""",
    """  const s2 = Game.spawnCell || { x: 1, y: 1 };
  d = d || 2;""",
    'nearSpawn default')

# ============================================================
# 5) 軟磚多一點（間隔更明確）
# ============================================================
rep("""  //   v4.51：大地圖軟磚率降到 .34 —— 46% 在 300 格的圖上會變回一格一格的棋盤
  const softRate = opts.softRate == null ? (Game.bigMap ? .34 : .46) : opts.softRate;""",
    """  //   v4.55：小圖 .46 → .52（多一點軟磚間隔）；大圖 .34 → .40（300 格以上還不至於變棋盤）
  const softRate = opts.softRate == null ? (Game.bigMap ? .40 : .52) : opts.softRate;""",
    'softRate')

# ============================================================
# 6) 格檔隨從：搶仇恨 + 主動衝去擋刀
# ============================================================
rep("""function petNearestEnemy(pt) {
  const T = Game.T || 40;
  let best = null, bd = Infinity;
  const lim = T * PET_SENSE_T;""",
    """function petNearestEnemy(pt, reach) {
  const T = Game.T || 40;
  let best = null, bd = Infinity;
  const lim = reach || T * PET_SENSE_T;""",
    'petNearestEnemy reach')

anchor2 = """  return best;
}
// 隨從打怪（單人怪 1 下就死；RPG 扣 1 點血）"""
add2 = """  return best;
}
// v4.55：格檔隨從「搶仇恨」—— 只要她比主角更靠近怪、又在仇恨圈內，怪就轉頭打她
function guardTaunt(e) {
  const T = Game.T || 40, ps = Game.pets || [];
  let best = null, bd = (aggroTiles(e) + 1.4) * T;
  for (let i = 0; i < ps.length; i++) {
    const pt = ps[i];
    if (!pt || pt.kind !== 'guard' || pt.down || pt.restT > 0) continue;
    const d = Math.hypot(pt.x - e.x, pt.y - e.y);
    if (d > bd) continue;
    let pd = Infinity;
    for (let k = 0; k < Game.players.length; k++) {
      const p = Game.players[k];
      if (!p || !p.alive || playerHiding(p)) continue;
      pd = Math.min(pd, Math.hypot(p.x - e.x, p.y - e.y));
    }
    if (d < pd * .9) { bd = d; best = pt; }
  }
  return best;
}
// v4.55：怪物「正在追主角」→ 格檔隨從自己跑過去攔，不是等牠靠近自己
function petHeroThreat(hero, reach) {
  let best = null, bd = reach;
  const list = Game.enemies || [];
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (!e || e.dead || e.boss || !e.aggro) continue;
    const d = Math.hypot(e.x - hero.x, e.y - hero.y);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
// 隨從打怪（單人怪 1 下就死；RPG 扣 1 點血）"""
rep(anchor2, add2, 'guardTaunt/petHeroThreat')

rep("""    if (pt.kind === 'guard') {
      if (foe) {
        // 站到主角與怪物中間
        petStepTo(pt, (hero.x + foe.x) / 2, (hero.y + foe.y) / 2, dt, T * 3.2);
      } else petFollowWork(pt, hero, dt);""",
    """    if (pt.kind === 'guard') {
      // v4.55：怪物想打主角（5 格內）就衝過去擋在兩者中間；順便搶走仇恨（guardTaunt）
      const gfoe = foe || petHeroThreat(hero, T * 5);
      if (gfoe) petStepTo(pt, (hero.x + gfoe.x) / 2, (hero.y + gfoe.y) / 2, dt, T * 4.0);
      else petFollowWork(pt, hero, dt);""",
    'guard AI')

rep("  enemyAngerTick(e, dt, !!enemyAggro(e), true);",
    "  enemyAngerTick(e, dt, !!enemyAggro(e) || !!guardTaunt(e), true);",
    'aggro A')
rep("  enemyAngerTick(e, dt, !!enemyAggro(e), false);",
    "  enemyAngerTick(e, dt, !!enemyAggro(e) || !!guardTaunt(e), false);",
    'aggro B')

rep("""      const d = dist2(p.x, p.y, e.x, e.y);
      if (d < bestD) { bestD = d; best = p; }
    });
    if (best) {""",
    """      const d = dist2(p.x, p.y, e.x, e.y);
      if (d < bestD) { bestD = d; best = p; }
    });
    const gp = guardTaunt(e);              // v4.55：仇恨被格檔隨從搶走 → 改追她
    if (gp) {
      const gd = dist2(gp.x, gp.y, e.x, e.y);
      if (gd < bestD) { bestD = gd; best = gp; }
    }
    if (best) {""",
    'chase pet')

# ============================================================
# 7) 腳下有炸彈 → 頭上閃爍 💣 ＋ 腳邊紅圈
# ============================================================
rep("""  // 骷髏詛咒指示
  if (p.skull) {""",
    """  // v4.55：腳下踩著炸彈 → 頭上冒閃爍 💣＋腳邊紅圈（常常自己被炸死卻不知道腳下有彈）
  if (p.alive && isMyPlayer(p) && bombAt(Math.floor(p.x / T), Math.floor(p.y / T))) {
    const pu = .5 + .5 * Math.sin(Game.gameT * 11);
    ctx.save();
    ctx.globalAlpha = .5 + .5 * pu;
    ctx.font = '900 ' + Math.round(T * .34) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💣', x, y - R * 2.15 - pu * T * .16);
    ctx.globalAlpha = .3 + .45 * pu;
    ctx.strokeStyle = '#ff5a5a';
    ctx.lineWidth = Math.max(2, T * .055);
    ctx.beginPath();
    ctx.ellipse(x, y + T * .37, R * 1.12, R * .42, 0, 0, 6.283);
    ctx.stroke();
    ctx.restore();
  }
  // 骷髏詛咒指示
  if (p.skull) {""",
    'bomb warning')

# ============================================================
# 8) 首頁「大逃殺（未開放）」
# ============================================================
rep("""        <button class="mbtn c-boss" id="btnBoss" data-ico="👹">挑戰 BOSS<small>單挑暗黑魔王</small></button>""",
    """        <button class="mbtn c-boss" id="btnBoss" data-ico="👹">挑戰 BOSS<small>單挑暗黑魔王</small></button>
        <button class="mbtn c-br locked" id="btnBR" data-ico="🏝️">大逃殺<small>30～50 人 · 超大地圖</small><span class="betaTag">未開放</span></button>""",
    'btnBR html')

rep("""#scr-title .menu .c-battle{""",
    """#scr-title .menu .c-br    { --c1: #4fc3b8; --c2: #1b7c75; --c3: #0d4d48; --g1: rgba(120,230,215,.55); --g0: rgba(120,230,215,0); }
#scr-title .menu .mbtn.locked { opacity: .72; filter: saturate(.55); }
#scr-title .menu .c-battle{""",
    'c-br css')

rep("""  'menu.boss': '挑戰 BOSS', 'menu.boss.sub': '單挑暗黑魔王',""",
    """  'menu.boss': '挑戰 BOSS', 'menu.boss.sub': '單挑暗黑魔王',
  'menu.br': '大逃殺', 'menu.br.sub': '30～50 人 · 超大地圖', 'menu.br.lock': '未開放',""",
    'i18n br')

rep("""$id('btnSettings').addEventListener('click', function () {""",
    """// v4.55：大逃殺（未開放）—— 先讓玩家看到進度，點下去說明在做什麼
$id('btnBR').addEventListener('click', function () {
  AudioSys.sfx('click');
  const box = $id('ovBox');
  box.innerHTML = '<h3>🏝️ 大逃殺（未開放）</h3>' +
    '<p>超大地圖上撒 30～50 個 AI，撿物資升級 <b>血量／防禦／攻擊</b>，最後活著的贏。</p>' +
    '<p style="font-size:13px;opacity:.75">30 人以上的模擬很吃效能，先用小規模測試幀率再決定上限，所以先不開放。</p>' +
    '<div class="row" style="justify-content:center"><button class="mbtn warm" id="brOk" style="width:auto;padding:11px 24px;">知道了</button></div>';
  ovShow();
  $id('brOk').addEventListener('click', function () { AudioSys.sfx('click'); hideOverlay(); });
});
$id('btnSettings').addEventListener('click', function () {""",
    'btnBR handler')

# ============================================================
# 9) 版本 4.55
# ============================================================
rep("const VERSION = '4.54';", "const VERSION = '4.55';", 'VERSION const')
rep('<span id="verLogVer">4.54</span>', '<span id="verLogVer">4.55</span>', 'verLogVer')
rep('<div class="ver beta">測試版 v<span id="verTxt">4.54</span></div>',
    '<div class="ver beta">測試版 v<span id="verTxt">4.55</span></div>', 'verTxt')

rep("""const VERSION_LOG = [
  { v: '4.54', date: '2026-11-03', now: true, items: [""",
    """const VERSION_LOG = [
  { v: '4.55', date: '2026-11-03', now: true, items: [
    '外牆改成「每個大關自己一組顏色」（跟該關硬牆同一個色系去調），不再八關都長一樣；而且比硬牆大 20%，外緣壓暗邊，看起來更厚',
    '對戰玩家頭像不再被拉成橢圓：頭像固定正方形、不隨版面壓縮，外面多一圈圓框',
    '生成地圖時會拆掉「黏在外牆上的小石堆」，不再兩層牆擠在一起白吃場地空間',
    '出生點周圍不生怪的範圍從 3 格縮到 2 格（開場附近不會空一大圈）',
    '自然生成的軟磚變多（間隔更明顯），走位更有變化',
    '格檔隨從會搶仇恨：怪物想打主角時她主動衝過去擋在中間，怪物轉頭打她',
    '腳下踩著炸彈時，頭上會冒閃爍的 💣 加腳邊紅圈，不會再莫名其妙被自己炸死',
    '首頁新增「大逃殺（未開放）」按鈕，先寫清楚玩法與為什麼還沒開',
  ] },
  { v: '4.54', date: '2026-11-03', now: false, items: [""",
    'VERSION_LOG')

io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('---- 完成 %d 個替換，bytes=%d chars=%d' % (N[0], len(s.encode()), len(s)))
