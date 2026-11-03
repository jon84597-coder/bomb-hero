# -*- coding: utf-8 -*-
# v4.70 A：小地圖（雷達）＋ 組隊隊色 HUD
import io, sys
P = 'index.html'
s = io.open(P, encoding='utf-8').read()


def rep(old, new, tag):
    global s
    n = s.count(old)
    if n != 1:
        sys.stderr.write('[FAIL] %s count=%d\n' % (tag, n))
        if n:
            i = s.find(old)
            sys.stderr.write(repr(s[max(0, i - 200):i + 300]) + '\n')
        sys.exit(1)
    s = s.replace(old, new)
    print('[ok] ' + tag)


# 1) settings 預設加 miniMap
rep("""  mapMode: 'classic',                             // v4.69：地圖模式 classic = 原本 32 張 / random = 隨機生成""",
    """  mapMode: 'classic',                             // v4.69：地圖模式 classic = 原本 32 張 / random = 隨機生成
  miniMap: 1,                                     // v4.70：小地圖（雷達），1 = 開 / 0 = 關""",
    'settings-minimap')

# 2) 設定頁加一列開關（放在音效音量之後）
rep("""      <div class="field"><label>音效音量</label>
        <div class="seg" id="segSfx"><button data-v="0">關</button><button data-v="0.5">小</button><button data-v="1">大</button></div>
      </div>
      <div class="backrow">""",
    """      <div class="field"><label>音效音量</label>
        <div class="seg" id="segSfx"><button data-v="0">關</button><button data-v="0.5">小</button><button data-v="1">大</button></div>
      </div>
      <div class="field"><label>小地圖（雷達）</label>
        <div class="seg" id="segMiniMap"><button data-v="1">開</button><button data-v="0">關</button></div>
        <div class="hint">只在「隨機生成」的大地圖與組隊對戰出現。牆壁留深底、可走的路淡淡發亮；怪物只顯示你周圍 7 格（不是全圖開圖）。關掉可以多留一點畫面給戰場。</div>
      </div>
      <div class="backrow">""",
    'settings-html')

# 3) segWire
rep("""refreshers.push(segWire('segSfx', function () { return settings.sfx; }, function (v) { settings.sfx = parseFloat(v); AudioSys.applyVolumes(); }));""",
    """refreshers.push(segWire('segSfx', function () { return settings.sfx; }, function (v) { settings.sfx = parseFloat(v); AudioSys.applyVolumes(); }));
// v4.70：小地圖開關（1 = 開 / 0 = 關）
refreshers.push(segWire('segMiniMap', function () { return settings.miniMap | 0; }, function (v) { settings.miniMap = parseInt(v, 10); }));""",
    'settings-wire')

# 4) 繪製：小地圖 + 隊色 HUD（插在 render 尾端，drawHurtEdge 之後、座標還原成裝置像素之前）
rep("""  ctx.setTransform(PIXEL_RATIO, 0, 0, PIXEL_RATIO, 0, 0);
  drawHurtEdge();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}""",
    """  ctx.setTransform(PIXEL_RATIO, 0, 0, PIXEL_RATIO, 0, 0);
  drawHurtEdge();
  // v4.70：小地圖與隊色 HUD 都是「畫面座標」，畫在所有世界物件之上（此時 transform = CSS 像素）
  try { drawMiniMap(); } catch (e) {}
  try { drawTeamHud(); } catch (e) {}
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}""",
    'render-call')

# 5) 函式本體
rep("""// 對話框氣泡：死者灰紅框、凶手綠框，帶尖角指向頭上
function drawBubbles(T) {""",
    """// ====
//   v4.70：小地圖（雷達）
//   · 只在大地圖（隨機生成／對戰大地圖）出現 —— 15×13 的舊地圖整個畫面都看得到，畫了只是擋視線
//   · 牆壁留深底、可走格淡淡填色 → 一眼看出通道；怪物只畫自己附近 7 格（不是全圖開圖）
//   · 底圖快取在離屏 canvas：28×25＝700 格逐格填，每幀重算是會吃掉手機 fps 的
// ====
let mmBg = null, mmBgKey = '';
const MM_FOE_R = 7;                    // 小地圖只顯示自己周圍 7 格內的怪
const MM_ITEM_R = 4;                   // 道具只顯示 4 格內（避免整張圖都是亮點）
function miniMapOn() {
  if (settings.miniMap === 0) return false;
  if (!Game || !Game.grid || !Game.grid.length) return false;
  if (Game.state !== 'play' && Game.state !== 'countdown') return false;
  return !!(Game.bigMap || Game.cols > 15 || Game.rows > 13);
}
// 小地圖方框（右上角；手機小一點，高度不夠時改成等比例縮寬）
function miniMapBox() {
  const touch = !!(document.body && document.body.classList && document.body.classList.contains('touch'));
  let w = Math.min(VIEW_W * (touch ? .30 : .25), touch ? 94 : 120);
  let h = w * (Game.rows / Game.cols);
  const maxH = VIEW_H * .34;
  if (h > maxH) { h = maxH; w = h * (Game.cols / Game.rows); }
  w = Math.max(56, Math.round(w));
  h = Math.max(42, Math.round(h));
  return { x: Math.round(VIEW_W - w - 8), y: 8, w: w, h: h };
}
function miniMapBgFor(r) {
  const key = Game.cols + 'x' + Game.rows + '|' + r.w + 'x' + r.h + '|' +
    ((Game.sdList && Game.sdList.length) | 0);
  if (mmBg && mmBgKey === key) return mmBg;
  let cv = null;
  try {
    const dpr = 2;
    cv = document.createElement('canvas');
    cv.width = Math.round(r.w * dpr);
    cv.height = Math.round(r.h * dpr);
    const g = cv.getContext('2d');
    if (!g) return null;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cw = r.w / Game.cols, ch = r.h / Game.rows;
    g.fillStyle = 'rgba(126,196,255,.22)';
    for (let y = 0; y < Game.rows; y++) {
      const row = Game.grid[y] || [];
      for (let x = 0; x < Game.cols; x++) {
        if (row[x] === 1) continue;                       // 牆不畫（留深底＝牆）
        g.fillRect(x * cw, y * ch, cw + .35, ch + .35);
      }
    }
  } catch (e) { return null; }
  mmBg = cv; mmBgKey = key;
  return mmBg;
}
function drawMiniMap() {
  if (!miniMapOn()) return;
  const r = miniMapBox();
  const bg = miniMapBgFor(r);
  const cw = r.w / Game.cols, ch = r.h / Game.rows;
  const mx = function (cellX) { return r.x + cellX * cw; };
  const my = function (cellY) { return r.y + cellY * ch; };
  ctx.save();
  ctx.globalAlpha = 1;
  // 底板
  ctx.fillStyle = 'rgba(8,14,26,.66)';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 6); ctx.fill(); }
  else ctx.fillRect(r.x, r.y, r.w, r.h);
  if (bg) {
    try { ctx.drawImage(bg, r.x, r.y, r.w, r.h); } catch (e) {}
  }
  // 外框
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 6); }
  else { ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); }
  ctx.strokeStyle = 'rgba(150,212,255,.50)';
  ctx.lineWidth = 1.4; ctx.stroke(); ctx.lineWidth = 1;
  // 目前視野（相機看得到的那塊）—— 大地圖最怕「不知道自己在哪一段」
  try {
    const z = Game.zoom || 1, T2 = Game.T || 1;
    const wx0 = (0 - VIEW_W / 2) / z - Game.camX + VIEW_W / 2;
    const wy0 = (0 - VIEW_H / 2) / z - Game.camY + VIEW_H / 2;
    const wx1 = (VIEW_W - VIEW_W / 2) / z - Game.camX + VIEW_W / 2;
    const wy1 = (VIEW_H - VIEW_H / 2) / z - Game.camY + VIEW_H / 2;
    const vx = mx(wx0 / T2), vy = my(wy0 / T2);
    const vw = (wx1 - wx0) / T2 * cw, vh = (wy1 - wy0) / T2 * ch;
    ctx.strokeStyle = 'rgba(255,255,255,.42)';
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.max(r.x + 1, vx), Math.max(r.y + 1, vy),
      Math.min(r.w - 2, vw), Math.min(r.h - 2, vh));
  } catch (e) {}
  const me = Game.players && Game.players[0];
  const cxp = me ? me.x / Game.T : 0, cyp = me ? me.y / Game.T : 0;
  // 道具（只畫附近）
  if (Game.items && Game.items.length) {
    for (let i = 0; i < Game.items.length; i++) {
      const it = Game.items[i];
      const dx = it.x / Game.T - cxp, dy = it.y / Game.T - cyp;
      if (dx * dx + dy * dy > MM_ITEM_R * MM_ITEM_R) continue;
      ctx.fillStyle = 'rgba(255,224,120,.95)';
      ctx.fillRect(mx(it.x / Game.T) - 1, my(it.y / Game.T) - 1, 2, 2);
    }
  }
  // 敵人（只畫附近）
  if (Game.enemies && Game.enemies.length) {
    for (let i = 0; i < Game.enemies.length; i++) {
      const e = Game.enemies[i];
      if (e.dead) continue;
      const dx = e.x / Game.T - cxp, dy = e.y / Game.T - cyp;
      if (dx * dx + dy * dy > MM_FOE_R * MM_FOE_R) continue;
      ctx.fillStyle = (e.boss || e.type === 'boss') ? '#ff8a3d' : 'rgba(255,96,96,.95)';
      const rr = (e.boss || e.type === 'boss') ? 2.6 : 1.7;
      ctx.beginPath(); ctx.arc(mx(e.x / Game.T), my(e.y / Game.T), rr, 0, 6.283); ctx.fill();
    }
  }
  // 玩家（組隊 → 隊色；混戰／單人 → 白）
  Game.players.forEach(function (p, i) {
    if (!p) return;
    const isMe = (i === 0);
    if (!p.alive && !isMe) return;
    const tm = (p.team >= 0) ? teamMeta(p.team) : null;
    const px2 = mx(p.x / Game.T), py2 = my(p.y / Game.T);
    ctx.beginPath();
    ctx.arc(px2, py2, isMe ? 2.8 : 2.3, 0, 6.283);
    ctx.fillStyle = tm ? tm.hex : (isMe ? '#ffffff' : 'rgba(255,255,255,.72)');
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = .8; ctx.stroke(); ctx.lineWidth = 1;
    if (isMe) {                                   // 自己再加一圈呼吸光環
      const k = .55 + .45 * Math.sin((Game.gameT || 0) * 5);
      ctx.strokeStyle = 'rgba(255,255,255,' + (.30 + .35 * k).toFixed(2) + ')';
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(px2, py2, 4.6 + k * 1.6, 0, 6.283); ctx.stroke();
      ctx.lineWidth = 1;
    }
  });
  ctx.restore();
}

// ====
//   v4.70：組隊隊色 HUD（畫面左上角）
//   · 每一隊一個色塊 ＋ 存活/總數，自己那一隊加白框加粗
//   · 只畫「這一局真的有人的隊」，混戰（teamsOn < 2）不畫
// ====
function drawTeamHud() {
  if (!(Game.teamsOn >= 2)) return;
  if (Game.mode !== 'battle') return;
  if (Game.state !== 'play' && Game.state !== 'countdown') return;
  const meP = Game.players && Game.players[0];
  const myTeam = meP ? (meP.team | 0) : -1;
  const cnt = {};
  for (let i = 0; i < Game.players.length; i++) {
    const p = Game.players[i];
    if (!p || p.team < 0) continue;
    const k = p.team | 0;
    if (!cnt[k]) cnt[k] = { alive: 0, all: 0 };
    cnt[k].all++;
    if (p.alive) cnt[k].alive++;
  }
  const keys = Object.keys(cnt);
  if (keys.length < 2) return;
  let x = 8;
  const y = 8, hh = 18;
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '700 10px sans-serif';
  keys.forEach(function (k) {
    const m = teamMeta(k | 0);
    if (!m) return;
    const mine = (k | 0) === myTeam;
    const label = cnt[k].alive + '/' + cnt[k].all;
    const w = ctx.measureText(label).width + 24;
    ctx.fillStyle = mine ? 'rgba(255,255,255,.22)' : 'rgba(8,14,26,.66)';
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, hh, 9); ctx.fill(); }
    else ctx.fillRect(x, y, w, hh);
    ctx.strokeStyle = m.hex;
    ctx.lineWidth = mine ? 2 : 1.2;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, hh, 9); ctx.stroke(); }
    else ctx.strokeRect(x, y, w, hh);
    ctx.lineWidth = 1;
    // 色球
    ctx.beginPath();
    ctx.arc(x + 10, y + hh / 2, 4, 0, 6.283);
    ctx.fillStyle = m.hex; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1; ctx.stroke();
    // 存活/總數
    ctx.fillStyle = m.hex;
    ctx.fillText(label, x + 10 + 5 + (w - 15) / 2 - 2, y + hh / 2 + .5);
    x += w + 5;
  });
  ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

// 對話框氣泡：死者灰紅框、凶手綠框，帶尖角指向頭上
function drawBubbles(T) {""",
    'minimap-funcs')

# 6) 匯出（測試用）
rep("""  drawPops: drawPops, drawHurtEdge: drawHurtEdge, rpgHurt: rpgHurt,""",
    """  drawPops: drawPops, drawHurtEdge: drawHurtEdge, rpgHurt: rpgHurt,
  // v4.70：小地圖／隊色 HUD（測試／除錯用）
  drawMiniMap: drawMiniMap, miniMapOn: miniMapOn, miniMapBox: miniMapBox, drawTeamHud: drawTeamHud,""",
    'exports')

io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('written', len(s))
