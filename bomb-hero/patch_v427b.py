# -*- coding: utf-8 -*-
# v4.27 B 段：投擲炸彈（越牆直線）＋ 全場縮放（雙指／鍵盤／手把／滾輪）＋ UI ＋ 版號
import io

P = 'index.html'
raw = io.open(P, 'rb').read().decode('utf-8')
html = raw.replace('\r\n', '\n')

def once(old, new, label):
    global html
    n = html.count(old)
    assert n == 1, '%s -> %d' % (label, n)
    html = html.replace(old, new, 1)
    print('OK', label)

# ---------------------------------------------------------------
# 1. 投擲炸彈：嚴格直線、遇牆跳過、落到第一格空地
# ---------------------------------------------------------------
THROW = r"""// ================================================================
//   v4.27：把炸彈「丟進場內」（Q／手把 RB／手機 🤾）
//   · 方向嚴格限制在上下左右（用角色面向，不做斜向）
//   · 路上遇到牆（硬牆／軟磚）→ 不撞、不爆，直接「跳過那一格」繼續飛
//   · 一直到第一格「空地」才停下來落地倒數（不會停在牆上、不會停在炸彈上）
//   · 用既有的 b.flying 逐格拋物線動畫 → 視覺上就是「一格一格跳過牆」
// ================================================================
const THROW_CD = 1.05;        // 投擲冷卻（秒）：避免無腦連丟把整場鋪滿
const THROW_RANGE = 16;       // 最多飛幾格（地圖再大也夠）
function findThrowLanding(cx, cy, dx, dy, maxStep) {
  const cols = Game.cols, rows = Game.rows;
  const path = [{ x: cx, y: cy }];
  let x = cx, y = cy;
  for (let k = 1; k <= (maxStep || THROW_RANGE); k++) {
    const nx = x + dx, ny = y + dy;
    // 撞到最外圈的外牆 → 就飛到這裡為止（沒有空地可落 → 回 null，改在腳下放）
    if (nx < 1 || nx > cols - 2 || ny < 1 || ny > rows - 2) break;
    path.push({ x: nx, y: ny });
    if (cellAt(nx, ny) !== 0) { x = nx; y = ny; continue; }        // 牆 → 跳過去
    if (bombAt(nx, ny)) { x = nx; y = ny; continue; }              // 已經有炸彈 → 也跳過
    if (enemyAtCell(nx, ny)) break;                                 // 有怪 → 停在牠前面一格
    return { x: nx, y: ny, dist: k, path: path };
  }
  return null;
}
function throwBomb(p) {
  if (!p || !p.alive || p.dizzy > 0) return false;
  if (Game.state !== 'play') return false;
  if ((p.throwCd || 0) > 0) return false;
  if (Net.on && Net.role === 'guest') return false;          // 線上客人不本地模擬
  const T = Game.T;
  const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);
  const owned = Game.bombs.filter(function (b) { return b.owner === p; }).length;
  if (owned >= p.maxBombs) {
    toast(t('toast.throwFull'), 1.4, 'g:bomb');
    return false;
  }
  const d = DIRS[p.facing] || DIRS.down;
  const land = findThrowLanding(cx, cy, d.x, d.y, THROW_RANGE);
  if (!land) {                                   // 前方沒有空地 → 就放在腳下（跟平常放彈一樣）
    placeBomb(p);
    p.throwCd = .4;
    toast(t('toast.throwBlocked'), 1.5, 'g:bomb');
    return false;
  }
  const b = {
    cx: cx, cy: cy, px: cx * T + T / 2, py: cy * T + T / 2,
    timer: p.remote ? 9999 : 2.4, power: p.skull === 'mini' ? 1 : p.power, owner: p,
    passers: [], remoteArmed: !!p.remote, mine: false, mineLife: 10, moving: null,
    flying: { fx: cx, fy: cy, tx: land.x, ty: land.y, t: 0,
      dur: Math.min(1.2, .10 + (land.path.length - 1) * .055), path: land.path },
    held: false, seed: Math.random() * 6.28, armT: 40, thrown: true
  };
  Game.bombs.push(b);
  b.cx = land.x; b.cy = land.y;                 // 落點馬上生效（飛行中 bombAt 會忽略它）
  p.throwCd = THROW_CD;
  AudioSys.sfx('throw');
  burst(p.x, p.y - T * .24, '#ffd166', 10, 110);
  toast(t('toast.threw'), 1.2, 'g:bomb');
  return true;
}
"""
once("""  AudioSys.sfx('throw');
}
function explodeBomb(b) {""",
"""  AudioSys.sfx('throw');
}
""" + THROW + """function explodeBomb(b) {""", '投擲炸彈')

# 動作鍵分派：Q／手把 RB／手機 🤾
once("""  // F 鍵（手把 Y／手機 🔥）：騎恐龍吐火
  if (p.scheme.fire && p.scheme.fire()) fireBreath(p);""",
"""  // F 鍵（手把 Y／手機 🔥）：騎恐龍吐火
  if (p.scheme.fire && p.scheme.fire()) fireBreath(p);
  // v4.27：Q 鍵（手把 RB／手機 🤾）：把炸彈丟進場內（直線、遇牆跳過）
  if (p.scheme.throwBomb && p.scheme.throwBomb()) throwBomb(p);""", '投擲鍵分派')

# 冷卻倒數
once("""    if (p.fireCd > 0) p.fireCd = Math.max(0, p.fireCd - dt);""",
"""    if (p.fireCd > 0) p.fireCd = Math.max(0, p.fireCd - dt);
    if (p.throwCd > 0) p.throwCd = Math.max(0, p.throwCd - dt);   // v4.27：投擲冷卻""", '投擲冷卻倒數')

# 控制方案
once("""      detonate: function () { return !!edges[getMap().det]; },
      fire: function () { return !!edges[getMap().fire]; }""",
"""      detonate: function () { return !!edges[getMap().det]; },
      fire: function () { return !!edges[getMap().fire]; },
      throwBomb: function () { return !!edges.KeyQ; }        // v4.27：Q 投擲（固定鍵，不佔自訂鍵位）""", '鍵盤投擲')

once("""      detonate: function () { return padEdge(pi, 2); },     // X／□
      fire: function () { return padEdge(pi, 3); }          // Y／△""",
"""      detonate: function () { return padEdge(pi, 2); },     // X／□
      fire: function () { return padEdge(pi, 3); },         // Y／△
      throwBomb: function () { return padEdge(pi, 5); }     // v4.27：RB／R1 投擲""", '手把投擲')

once("""      detonate: function () { const c = this.cur(); return c.detonate ? c.detonate() : false; },
      fire: function () { const c = this.cur(); return c.fire ? c.fire() : false; }""",
"""      detonate: function () { const c = this.cur(); return c.detonate ? c.detonate() : false; },
      fire: function () { const c = this.cur(); return c.fire ? c.fire() : false; },
      throwBomb: function () { const c = this.cur(); return c.throwBomb ? c.throwBomb() : false; }""", 'auto 投擲')

once("""      detonate: function () { return !!edges.TouchD; },
      fire: function () { return !!edges.TouchF; }""",
"""      detonate: function () { return !!edges.TouchD; },
      fire: function () { return !!edges.TouchF; },
      throwBomb: function () { return !!edges.TouchT; }      // v4.27：手機 🤾""", '觸控投擲')

once("""  const touchState = { up: false, down: false, left: false, right: false, action: false, det: false, fire: false, ax: 0, ay: 0 };""",
"""  const touchState = { up: false, down: false, left: false, right: false, action: false, det: false, fire: false, throw: false, ax: 0, ay: 0 };""", 'touchState 加 throw')

once("""    if (k === 'action' || k === 'det' || k === 'fire') {
      const st = k === 'action' ? 'action' : k;
      const ed = k === 'action' ? 'TouchA' : (k === 'det' ? 'TouchD' : 'TouchF');""",
"""    if (k === 'action' || k === 'det' || k === 'fire' || k === 'throw') {
      const st = k;
      const ed = k === 'action' ? 'TouchA' : (k === 'det' ? 'TouchD' : (k === 'fire' ? 'TouchF' : 'TouchT'));""", 'setTouch 支援 throw')

once("""    ['up', 'down', 'left', 'right', 'action', 'det', 'fire'].forEach(function (k) { Input.setTouch(k, false); });""",
"""    ['up', 'down', 'left', 'right', 'action', 'det', 'fire', 'throw'].forEach(function (k) { Input.setTouch(k, false); });""", 'releaseAll 加 throw')

once("""const NET_DUMMY = {
  dirs: function () { return []; },
  action: function () { return false; },
  actionHeld: function () { return false; }
};""",
"""const NET_DUMMY = {
  dirs: function () { return []; },
  action: function () { return false; },
  actionHeld: function () { return false; },
  throwBomb: function () { return false; }
};""", 'NET_DUMMY 加 throwBomb')

# ---------------------------------------------------------------
# 2. 相機縮放
# ---------------------------------------------------------------
once("""  camX: 0, camY: 0, camSnap: true,""",
"""  camX: 0, camY: 0, camSnap: true,
  zoom: 1, zoomTarget: 1,     // v4.27：全場縮放（1 = 原始大小；只影響「怎麼看」）""", 'Game 加 zoom')

once("""// 把相機偏移夾在世界範圍內；世界比畫面小時置中
function clampCam(want, view, min, max) {
  const lo = view - max, hi = -min;
  if (lo <= hi) return clamp(want, lo, hi);
  return view / 2 - (min + max) / 2;
}""",
"""// 把相機偏移夾在世界範圍內；世界比畫面小時置中
// v4.27：多了 zoom（以畫面中心縮放）→ 可視的世界範圍是 view/zoom，
//   邊界的換算式要一起換，不然放大後會看到地圖外的空白。
function clampCam(want, view, min, max, zoom) {
  const z = zoom || 1;
  if (z === 1) {
    const lo = view - max, hi = -min;
    if (lo <= hi) return clamp(want, lo, hi);
    return view / 2 - (min + max) / 2;
  }
  const half = view / 2;
  // 世界左緣要壓在畫面左緣之外 → camX ≤ half − half/z；右緣要蓋滿 → camX ≥ half + half/z − max
  const lo2 = half + half / z - max, hi2 = half - half / z;
  if (lo2 <= hi2) return clamp(want, lo2, hi2);
  return half - (min + max) / 2;
}""", 'clampCam 支援 zoom')

once("""  const wantX = clampCam(VIEW_W / 2 - tx, VIEW_W, 0, Game.cols * T);
  const wantY = clampCam(VIEW_H / 2 - ty, VIEW_H, 0, Game.rows * T);""",
"""  const z = Game.zoom || 1;
  const wantX = clampCam(VIEW_W / 2 - tx, VIEW_W, 0, Game.cols * T, z);
  const wantY = clampCam(VIEW_H / 2 - ty, VIEW_H, 0, Game.rows * T, z);""", 'updateCamera 支援 zoom')

once("""  if (Game.shake > 0) {
    ctx.translate((Math.random() - .5) * Game.shake * 9, (Math.random() - .5) * Game.shake * 9);
  }
  // 相機：地圖大於畫面時，把世界平移成「角色置中」""",
"""  if (Game.shake > 0) {
    ctx.translate((Math.random() - .5) * Game.shake * 9, (Math.random() - .5) * Game.shake * 9);
  }
  // v4.27：縮放 —— 以「畫面中心」為基準縮放，相機的邊界計算才對得上（clampCam 已同步）
  const z = Game.zoom || 1;
  if (z !== 1) {
    ctx.translate(VIEW_W / 2, VIEW_H / 2);
    ctx.scale(z, z);
    ctx.translate(-VIEW_W / 2, -VIEW_H / 2);
  }
  // 相機：地圖大於畫面時，把世界平移成「角色置中」""", 'render 縮放')

# ---------------------------------------------------------------
# 3. Zoom 模組
# ---------------------------------------------------------------
ZOOM_MOD = r"""
// ================================================================
//   v4.27：全場自由縮放（Zoom In / Out）
//   · 手機：畫面上「雙指捏合」（只認真的兩指手勢，單指照樣給搖桿用）
//   · 電腦：1 放大／2 縮小／0 回到 100%，滑鼠滾輪也可以
//   · 手把：右搖桿上下（推上放大）＋ RT 放大／LT 縮小
//   · 只改「畫布怎麼看」→ 玩家／怪物／炸彈的世界座標完全不動，
//     所以物理、碰撞、鏡頭夾邊都不用改，也不影響連線同步。
// ================================================================
const ZOOM_MIN = .58, ZOOM_MAX = 1.85, ZOOM_STEP = .14;
const Zoom = (function () {
  const pts = {};                 // 正在畫面上的手指（pointerId → 座標）
  let pinchD = 0, pinchBase = 1;

  function pillEl() { return $id('zoomPill'); }
  function paintPill() {
    const el = pillEl(); if (!el) return;
    const v = Math.round(Game.zoom * 100);
    const tx = $id('zoomVal');
    if (tx && tx.textContent !== v + '%') tx.textContent = v + '%';
    el.classList.toggle('show', Math.abs(Game.zoom - 1) > .015);
    el.classList.toggle('in', Game.zoom > 1.015);
  }
  function set(z) {
    const nz = Math.round(clamp(Number(z) || 1, ZOOM_MIN, ZOOM_MAX) * 100) / 100;
    if (nz !== Game.zoomTarget) AudioSys.sfx('click');
    Game.zoomTarget = nz;
    paintPill();
    return nz;
  }
  function by(d) { return set(Game.zoomTarget + d); }
  function reset() { return set(1); }
  function tick(dt) {
    // 手把：右搖桿（axes[3]）＋ 扳機
    if (Input.padAxis) {
      const st = Input.padAxis(0);
      if (st && Math.abs(st.ry || 0) > .42) set(Game.zoomTarget - st.ry * dt * 1.5);
      if (Input.padDown(0, 7)) set(Game.zoomTarget + dt * 1.3);     // RT 放大
      if (Input.padDown(0, 6)) set(Game.zoomTarget - dt * 1.3);     // LT 縮小
    }
    // 平滑靠近（不要一鍵硬跳，看久會暈）
    const k = Math.min(1, dt * 13);
    if (Math.abs(Game.zoom - Game.zoomTarget) > .0015) Game.zoom += (Game.zoomTarget - Game.zoom) * k;
    else Game.zoom = Game.zoomTarget;
    paintPill();
  }
  function dist2p() {
    const ids = Object.keys(pts);
    if (ids.length < 2) return 0;
    const a = pts[ids[0]], b = pts[ids[1]];
    return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
  }
  function wire() {
    // ---- 手機雙指捏合 ----
    const wrap = $id('stageWrap');
    if (wrap && wrap.addEventListener) {
      const skip = function (e) {
        // 手指按在按鈕／搖桿上 → 不算縮放手勢（避免點放彈鍵時被判定成捏合）
        const tg = e.target;
        if (!tg || !tg.closest) return false;
        return !!tg.closest('#touchUI .tbtn, #touchUI .tpad, .tbtn, .tpad');
      };
      wrap.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' || skip(e)) return;
        pts[e.pointerId] = { x: e.clientX, y: e.clientY };
        if (Object.keys(pts).length === 2) { pinchD = dist2p(); pinchBase = Game.zoomTarget; }
      }, true);
      wrap.addEventListener('pointermove', function (e) {
        if (!pts[e.pointerId]) return;
        pts[e.pointerId].x = e.clientX; pts[e.pointerId].y = e.clientY;
        if (Object.keys(pts).length !== 2 || !pinchD) return;
        const d = dist2p();
        if (d > 12 && pinchD > 12) {
          set(pinchBase * (d / pinchD));
          if (e.cancelable) e.preventDefault();      // 兩指時才吃掉事件
        }
      }, { passive: false, capture: true });
      const lift = function (e) {
        if (pts[e.pointerId]) delete pts[e.pointerId];
        if (Object.keys(pts).length < 2) pinchD = 0;
      };
      wrap.addEventListener('pointerup', lift, true);
      wrap.addEventListener('pointercancel', lift, true);
      wrap.addEventListener('pointerleave', lift, true);
    }
    // ---- 滑鼠滾輪 ----
    if (cv && cv.addEventListener) {
      cv.addEventListener('wheel', function (e) {
        if (Screen.current !== 'game') return;
        if (e.cancelable) e.preventDefault();
        set(Game.zoomTarget - (e.deltaY || 0) * .0016);
      }, { passive: false });
    }
  }
  try { wire(); } catch (e) {
    try { if (typeof __bootFail === 'function') __bootFail('Zoom', e); } catch (e2) {}
  }
  return { set: set, by: by, reset: reset, tick: tick, min: ZOOM_MIN, max: ZOOM_MAX, step: ZOOM_STEP };
})();
"""
once("""  const k = Math.min(1, dt * 9.5);          // 平滑跟隨，不硬黏在角色身上
  Game.camX += (wantX - Game.camX) * k;
  Game.camY += (wantY - Game.camY) * k;
}
""",
"""  const k = Math.min(1, dt * 9.5);          // 平滑跟隨，不硬黏在角色身上
  Game.camX += (wantX - Game.camX) * k;
  Game.camY += (wantY - Game.camY) * k;
}
""" + ZOOM_MOD, 'Zoom 模組')

# 手把右搖桿（axes[2]／axes[3]）進快照
once("""      n.ax = gp ? (gp.axes[0] || 0) : 0;
      n.ay = gp ? (gp.axes[1] || 0) : 0;
      pv.ax = gp ? (pv.ax || 0) : 0;
      pv.ay = gp ? (pv.ay || 0) : 0;""",
"""      n.ax = gp ? (gp.axes[0] || 0) : 0;
      n.ay = gp ? (gp.axes[1] || 0) : 0;
      // v4.27：右搖桿（標準映射是 axes[2]／axes[3]）→ 全場縮放
      n.rx = gp ? (gp.axes[2] || 0) : 0;
      n.ry = gp ? (gp.axes[3] || 0) : 0;
      pv.ax = gp ? (pv.ax || 0) : 0;
      pv.ay = gp ? (pv.ay || 0) : 0;""", '右搖桿快照')

once("""  function padAxis(pi) { return { x: (gNow[pi] && gNow[pi].ax) || 0, y: (gNow[pi] && gNow[pi].ay) || 0 }; }""",
"""  function padAxis(pi) { return { x: (gNow[pi] && gNow[pi].ax) || 0, y: (gNow[pi] && gNow[pi].ay) || 0, rx: (gNow[pi] && gNow[pi].rx) || 0, ry: (gNow[pi] && gNow[pi].ry) || 0 }; }""", 'padAxis 回傳右搖桿')

# 主迴圈：按鍵＋更新
once("""  Pad.tick();                              // 自動判斷鍵盤／手把
  PadUI.tick();                            // 手把選單導航""",
"""  Pad.tick();                              // 自動判斷鍵盤／手把
  PadUI.tick();                            // 手把選單導航
  // v4.27：全場縮放（1／2／0 鍵、滾輪、手把右搖桿、手機雙指都由 Zoom 收斂）
  if (Screen.current === 'game') {
    if (Input.edges.Digit1 || Input.edges.Numpad1) Zoom.by(ZOOM_STEP);
    if (Input.edges.Digit2 || Input.edges.Numpad2) Zoom.by(-ZOOM_STEP);
    if (Input.edges.Digit0 || Input.edges.Numpad0) Zoom.reset();
    Zoom.tick(dt);
  }""", '主迴圈縮放')

# ---------------------------------------------------------------
# 4. HTML：投擲鈕＋縮放指示
# ---------------------------------------------------------------
once("""          <div class="tbtn tfire hide" data-t="fire" title="恐龍吐火"><canvas class="ticon" data-icon="flame"></canvas></div>""",
"""          <div class="tbtn tfire hide" data-t="fire" title="恐龍吐火"><canvas class="ticon" data-icon="flame"></canvas></div>
          <div class="tbtn tthrow hide" data-t="throw" title="投擲炸彈（直線、越牆）">🤾</div>""", '投擲鈕 HTML')

once("""        <div id="toast" style="display:none"></div>""",
"""        <div id="toast" style="display:none"></div>
        <!-- v4.27：縮放指示（純顯示、pointer-events:none → 不會偷走任何點擊） -->
        <div id="zoomPill" aria-hidden="true"><b id="zoomVal">100%</b><span class="zl">縮放</span></div>""", '縮放指示 HTML')

# ---------------------------------------------------------------
# 5. CSS
# ---------------------------------------------------------------
once("""  body.touch #touchUI .tact { bottom: 26px; }
  body.touch #touchUI .tdet.hide, body.touch #touchUI .tfire.hide { display: none; }""",
"""  body.touch #touchUI .tact { bottom: 26px; }
  body.touch #touchUI .tdet.hide, body.touch #touchUI .tfire.hide { display: none; }
  /* v4.27：投擲鈕（🤾）—— 排在遙控引爆上面；只在單人／RPG／對戰顯示 */
  #touchUI .tthrow {
    width: 62px; height: 62px; font-size: 24px; line-height: 1;
    left: var(--act-left); right: var(--act-right); bottom: 194px;
    --tb-face: rgba(0,0,0,0);
    --tb-ring: rgba(255,226,150,.62);
    --tb-edge: rgba(178,132,42,.72);
    --tb-glow: rgba(255,196,72,.44);
    transform: scale(var(--tscale)); transform-origin: var(--act-origin);
  }
  #touchUI .tthrow.cool { filter: grayscale(.8) brightness(.66); opacity: .74; }
  body.touch #touchUI .tthrow.hide { display: none; }""", '投擲鈕 CSS')

once("""  #toast.show { opacity: 1; transform: translate(-50%, 0) scale(1); }""",
"""  #toast.show { opacity: 1; transform: translate(-50%, 0) scale(1); }
  /* v4.27：縮放指示（畫面上方中間，只在不是 100% 時出現） */
  #zoomPill {
    position: absolute; left: 50%; top: 6px; transform: translateX(-50%) translateY(-4px);
    display: flex; align-items: center; gap: 6px;
    padding: 3px 11px; border-radius: 999px;
    background: rgba(12,18,34,.66); border: 1px solid rgba(150,190,255,.34);
    color: #dbe8ff; font-size: 11.5px; font-weight: 800; letter-spacing: .02em;
    opacity: 0; transition: opacity .2s ease, transform .2s ease;
    pointer-events: none; z-index: 6; white-space: nowrap;
  }
  #zoomPill.show { opacity: 1; transform: translateX(-50%) translateY(0); }
  #zoomPill b { font-size: 12.5px; color: #ffe6a6; }
  #zoomPill span.zl { opacity: .7; font-weight: 700; }""", '縮放指示 CSS')

once("""    body.touch #touchUI .tdet, body.touch #touchUI .tfire { bottom: 128px; }""",
"""    body.touch #touchUI .tdet, body.touch #touchUI .tfire { bottom: 128px; }
    body.touch #touchUI .tthrow { bottom: 196px; }""", '投擲鈕直式位置')

# ---------------------------------------------------------------
# 6. HUD：投擲鈕顯示／冷卻
# ---------------------------------------------------------------
once("""  // v4.11：吐火鈕的冷卻灰態／冷卻完發亮""",
"""  // v4.27：投擲鈕（單人／RPG／對戰都有；線上客人不顯示；冷卻中變灰）
  const thrBtn = document.querySelector('#touchUI .tthrow');
  if (thrBtn) {
    const me = Game.players.filter(function (q) { return !q.ai; })[0] || Game.players[0];
    const guest = (typeof Net !== 'undefined' && Net.on && Net.role === 'guest');
    thrBtn.classList.toggle('hide', !(me && me.alive && !guest && Game.state !== 'over'));
    thrBtn.classList.toggle('cool', !!(me && me.throwCd > 0));
  }
  // v4.11：吐火鈕的冷卻灰態／冷卻完發亮""", 'HUD 投擲鈕')

# ---------------------------------------------------------------
# 7. 操作說明
# ---------------------------------------------------------------
once("""  const line1 = mode === 'touch'
    ? '手機觸控：左下圓形搖桿推方向（可 45° 斜走）· 💥 放彈／撿彈／投擲／排線 · 🧨 遙控引爆 · 🔥 恐龍吐火 · ⏸ 暫停'
    : mode === 'pad'
      ? '手把：十字鍵／左蘑菇頭移動 · A 放彈 · X 遙控引爆 · Y 恐龍吐火 · <kbd>ESC</kbd>／Start 暫停（選單可用方向鍵選、A 確認、B 返回）'
      : kbDirs + ' 移動 · <kbd>' + keyName(kb1.act) + '</kbd> 放彈 · <kbd>' + keyName(kb1.det) + '</kbd> 遙控引爆 · <kbd>' + keyName(kb1.fire) + '</kbd> 恐龍吐火 · <kbd>ESC</kbd> 暫停' +
        '（按鍵可在設定自訂）';""",
"""  const line1 = mode === 'touch'
    ? '手機觸控：左下圓形搖桿推方向（可 45° 斜走）· 💥 放彈／撿彈／投擲／排線 · 🤾 丟炸彈（直線越牆）· 🧨 遙控引爆 · 🔥 恐龍吐火 · ⏸ 暫停'
    : mode === 'pad'
      ? '手把：十字鍵／左蘑菇頭移動 · A 放彈 · <b>RB 丟炸彈</b> · X 遙控引爆 · Y 恐龍吐火 · <b>右搖桿上下／LT·RT 縮放</b> · <kbd>ESC</kbd>／Start 暫停'
      : kbDirs + ' 移動 · <kbd>' + keyName(kb1.act) + '</kbd> 放彈 · <kbd>Q</kbd> 丟炸彈 · <kbd>' + keyName(kb1.det) + '</kbd> 遙控引爆 · <kbd>' + keyName(kb1.fire) + '</kbd> 恐龍吐火 · <kbd>1</kbd>／<kbd>2</kbd> 縮放（<kbd>0</kbd> 復原）· 滾輪縮放 · <kbd>ESC</kbd> 暫停' +
        '（按鍵可在設定自訂）';""", '操作說明')

once("""    '走向炸彈：有🥾就踢出去 · 有🥊就打飛 · 有🧤可撿起投擲（越牆飛行，飛出邊界從對側繞回）· 💀骷髏會詛咒你<br>' +""",
"""    '走向炸彈：有🥾就踢出去 · 有🥊就打飛 · 有🧤可撿起投擲（越牆飛行，飛出邊界從對側繞回）· 💀骷髏會詛咒你<br>' +
    '🤾 <b>丟炸彈</b>：按下就往面向的方向丟，<b>只走直線、遇到牆會跳過去</b>，飛到第一格空地才落地倒數 —— 隔著牆清怪、救援都靠這招。<br>' +""", '提示文字')

# ---------------------------------------------------------------
# 8. i18n（只補缺的，不覆蓋既有翻譯）
# ---------------------------------------------------------------
I18N_BLOCK = """/* ---------- v4.27：新功能文案（只補缺的鍵，不覆蓋既有翻譯） ---------- */
const I18N_V427 = {
  'zh-TW': {
    'toast.threw': '🤾 炸彈丟出去了！',
    'toast.throwBlocked': '🪨 前面沒有空地，改放在腳下',
    'toast.throwFull': '💣 場上炸彈滿了，等它爆炸再丟'
  },
  'zh-CN': {
    'toast.threw': '🤾 炸弹丢出去了！',
    'toast.throwBlocked': '🪨 前面没有空地，改放在脚下',
    'toast.throwFull': '💣 场上炸弹满了，等它爆炸再丢'
  },
  'en': {
    'toast.threw': '🤾 Bomb thrown!',
    'toast.throwBlocked': '🪨 No open ground ahead — dropped at your feet',
    'toast.throwFull': '💣 Bomb limit reached — wait for one to blow'
  },
  'ja': {
    'toast.threw': '🤾 ボムを投げた！',
    'toast.throwBlocked': '🪨 先に空地がないので足元に置きました',
    'toast.throwFull': '💣 ボムの上限です。爆発を待ってください'
  },
  'ko': {
    'toast.threw': '🤾 폭탄을 던졌다!',
    'toast.throwBlocked': '🪨 앞에 빈 땅이 없어 발밑에 놓았습니다',
    'toast.throwFull': '💣 폭탄이 가득 찼습니다. 터질 때까지 기다리세요'
  },
  'th': {
    'toast.threw': '🤾 โยนระเบิดแล้ว!',
    'toast.throwBlocked': '🪨 ข้างหน้าไม่มีที่ว่าง วางที่เท้าแทน',
    'toast.throwFull': '💣 ระเบิดเต็มแล้ว รอให้ระเบิดก่อน'
  },
  'vi': {
    'toast.threw': '🤾 Đã ném bom!',
    'toast.throwBlocked': '🪨 Phía trước không có chỗ trống — đặt dưới chân',
    'toast.throwFull': '💣 Đã đủ bom — chờ nó nổ đã'
  },
  'ru': {
    'toast.threw': '🤾 Бомба брошена!',
    'toast.throwBlocked': '🪨 Впереди нет свободного места — оставил у ног',
    'toast.throwFull': '💣 Лимит бомб — дождитесь взрыва'
  },
  'de': {
    'toast.threw': '🤾 Bombe geworfen!',
    'toast.throwBlocked': '🪨 Kein freies Feld voraus — zu Füßen abgelegt',
    'toast.throwFull': '💣 Bombenlimit erreicht — warte auf die Explosion'
  },
  'it': {
    'toast.threw': '🤾 Bomba lanciata!',
    'toast.throwBlocked': '🪨 Nessuno spazio libero davanti — lasciata ai piedi',
    'toast.throwFull': '💣 Limite bombe raggiunto — attendi l’esplosione'
  }
};
Object.keys(I18N_V427).forEach(function (lg) {
  if (!I18N[lg]) return;
  const add = I18N_V427[lg];
  Object.keys(add).forEach(function (k) { if (I18N[lg][k] == null) I18N[lg][k] = add[k]; });
});

// 取翻譯；v 是 {name:'...'} 形式的插值參數"""
once("""// 取翻譯；v 是 {name:'...'} 形式的插值參數""", I18N_BLOCK, 'i18n 文案')

# ---------------------------------------------------------------
# 9. 匯出（測試／除錯用）
# ---------------------------------------------------------------
once("""  enemySkillTick: enemySkillTick, ENEMY_SPECIES: ENEMY_SPECIES,""",
"""  enemySkillTick: enemySkillTick, ENEMY_SPECIES: ENEMY_SPECIES,
  STAGE_ROSTER: STAGE_ROSTER, blockOf: blockOf, stageRoster: stageRoster, stageTypes: stageTypes,""", '匯出生態表')

once("""  throwCarried: throwCarried, applyItem: applyItem, controlHuman: controlHuman,""",
"""  throwCarried: throwCarried, throwBomb: throwBomb, findThrowLanding: findThrowLanding, Zoom: Zoom,
  applyItem: applyItem, controlHuman: controlHuman,""", '匯出投擲與縮放')

# ---------------------------------------------------------------
# 10. 版號
# ---------------------------------------------------------------
once("const VERSION = '4.26';", "const VERSION = '4.27';", 'VERSION')
once('<span id="verLogVer">4.26</span>', '<span id="verLogVer">4.27</span>', 'verLogVer')
once('<div class="ver beta">測試版 v<span id="verTxt">4.26</span></div>',
     '<div class="ver beta">測試版 v<span id="verTxt">4.27</span></div>', 'verTxt')

LOG = """const VERSION_LOG = [
  { v: '4.27', date: '2026-11-02', now: true, items: [
    '<b>🤾 炸彈可以「丟進場內」了</b>：按 <b>Q</b>（手機 🤾／手把 RB）就往面向的方向丟出去 —— 只走<b>上下左右的直線</b>，<b>撞到牆不會爆、會直接跳過那一格</b>，一直到<b>第一格空地</b>才停下來落地倒數。隔著牆清掉對面的怪、隔牆救援都靠這招（冷卻 1 秒，不讓你無腦鋪滿地）。',
    '<b>🔍 整個戰場可以自由放大縮小</b>：手機<b>雙指捏合</b>、電腦 <b>1／2 鍵</b>或<b>滑鼠滾輪</b>（<b>0</b> 鍵回到 100%）、手把<b>右搖桿上下</b>或 LT／RT。縮到 58% 一眼看完大半個戰場，放大到 185% 在小螢幕上更好瞄。縮放只影響「怎麼看」，角色與炸彈的位置完全不動。',
    '<b>🐸 八大關卡各 6 隻專屬小怪，共 48 隻</b>：草原是小青蛙／蹦蹦兔／毛毛蟲，沙漠是木乃伊小兵／沙地蠍子／流沙蟲，冰雪是雪球怪／冰晶怪／小海豹，熔岩是熔岩史萊姆／岩石小怪／熔岩蠕蟲，夜光是霓虹機器人／電音小怪／雷射蜂，深海是寄居蟹兵／水母／燈籠魚，天空是雲端飛艇／風精靈／疾風鷹，魔城是暗黑小惡魔／魔王近衛軍／死亡騎士。',
    '<b>📖 圖鑑改成「八大關卡生態」</b>：一關一張卡、6 隻怪並排，直接看得到這一關會遇到誰、難度怎麼一階一階上去；新怪也有專屬造型（不是換色而已）。',
    '<b>⚖️ 難度曲線重排</b>：每張地圖只會出現「所屬大關」那 6 隻，而且第 1 小關先出 4 種、第 2 小關 5 種、之後全員出場 —— 不會在第 1 關就被最後期的怪追著跑。'
  ] },
"""
once("const VERSION_LOG = [\n", LOG, 'VERSION_LOG 新條目')
once("  { v: '4.26', date: '2026-11-02', now: true, items: [",
     "  { v: '4.26', date: '2026-11-02', now: false, items: [", '4.26 舊版標記')

# 最外層 catch：__bootFail 不存在時（例如無頭沙盒只跑主腳本）要印出真正的錯誤
idx = html.rfind("} catch (__e) { __bootFail('wire', __e); }")
assert idx > 0
html = html[:idx] + "} catch (__e) {\n    if (typeof __bootFail === 'function') __bootFail('wire', __e);\n    else if (typeof console !== 'undefined') console.log('MAINFAIL', __e && __e.stack);\n  }" + html[idx + len("} catch (__e) { __bootFail('wire', __e); }"):]
print('OK 最外層 catch 防護')

io.open(P, 'wb').write(html.replace('\n', '\r\n').encode('utf-8'))
print('written', len(html))
