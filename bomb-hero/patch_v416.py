# -*- coding: utf-8 -*-
"""v4.16：①只有第 32 關有 BOSS ②結束畫面「再來一場」在手機點不到 ③首頁拿掉「組隊 對戰」
   ④新增可躲人的樹叢／破屋 ⑤RPG 小怪血量微調"""
import io, sys, re

P = 'index.html'
src = io.open(P, encoding='utf-8', newline='').read()
assert '\r\n' in src, 'file is not CRLF'
s = src.replace('\r\n', '\n')

rules = []
def R(name, old, new, cnt=1):
    rules.append((name, old, new, cnt))

# ================================================================
# ① 只有第 32 關有 BOSS
# ================================================================
R('soloIsBoss 函式',
  """const SOLO_STAGES = 32;
function soloInfo(stage) { return MAP32[((((stage | 0) - 1) % 32) + 32) % 32]; }""",
  """const SOLO_STAGES = 32;
function soloInfo(stage) { return MAP32[((((stage | 0) - 1) % 32) + 32) % 32]; }
// v4.16：只有第 32 關（魔王之間）有 BOSS —— 其餘關卡原本每區第 4 張都出魔王，全部拿掉
function soloIsBoss(stage) { return (stage | 0) >= SOLO_STAGES; }""")

R('選關按鈕副標的魔王標記',
  """      : themeName(info.theme) + ' · ' + info.n + (info.sub === 3 ? t('boss.suffix') : '');""",
  """      : themeName(info.theme) + ' · ' + info.n + (soloIsBoss(n) ? t('boss.suffix') : '');""")

R('選關格線的魔王判定',
  """    // v4.14：32 張地圖（8 大主題 × 4 張）；每一區的第 4 張是魔王關，標上 👑
    MAP32.forEach(function (m, i) {
      const n = i + 1;
      const boss = m.sub === 3;""",
  """    // v4.16：32 張地圖（8 大主題 × 4 張）；只有第 32 關是最終魔王關，標上 👑
    MAP32.forEach(function (m, i) {
      const n = i + 1;
      const boss = soloIsBoss(n);""")

R('開場字幕的魔王關判定',
  """    sub: (Game.bossRush ? t('solo.ovBossSub') : (soloInfo(stage).sub === 3 ? t('solo.ovBossSub2') : t('solo.ovSub'))) +""",
  """    sub: (Game.bossRush ? t('solo.ovBossSub') : (soloIsBoss(stage) ? t('solo.ovBossSub2') : t('solo.ovSub'))) +""")

R('小怪量（魔王關減量）',
  """    // v4.14：前 7 關沿用 v2.8 的怪物量曲線（手感不變），第 8 關之後接上連續成長；
    //   魔王關（每區第 4 張）小怪只留 45%，讓玩家專心打王
    const SOLO_WAVE = [6, 8, 9, 11, 12, 14, 15];
    const base0 = stage <= 7 ? SOLO_WAVE[stage - 1] : Math.min(20, 13 + Math.round((stage - 7) * .5));
    const base = info.sub === 3 ? Math.round(base0 * .45) : base0;""",
  """    // v4.14：前 7 關沿用 v2.8 的怪物量曲線（手感不變），第 8 關之後接上連續成長；
    //   v4.16：只有第 32 關是最終魔王關，小怪只留 45%，讓玩家專心打王
    const SOLO_WAVE = [6, 8, 9, 11, 12, 14, 15];
    const base0 = stage <= 7 ? SOLO_WAVE[stage - 1] : Math.min(20, 13 + Math.round((stage - 7) * .5));
    const base = soloIsBoss(stage) ? Math.round(base0 * .45) : base0;""")

R('BOSS 生成條件',
  """  // v4.14：每一大關的第 4 張地圖（sub === 3）＝ 該區的魔王關（第 4 / 8 / … / 32 關）
  if (Game.bossRush || info.sub === 3) {""",
  """  // v4.16：只有第 32 關「魔王之間」會出 BOSS（其餘 31 關都不再放魔王）
  if (Game.bossRush || soloIsBoss(stage)) {""")

R('魔王血量（只有最終魔王，固定滿血 12 下）',
  """    // 魔王血量：第 1 大關 5 下 → 第 8 大關 12 下（BOSS 連戰固定 5 下）
    const bossHp = Game.bossRush ? diff.bossHp : Math.min(12, 4 + info.theme + 1);""",
  """    // 魔王血量：最終魔王固定 12 下（首頁「挑戰 BOSS」連戰仍是各難度的 5 下）
    const bossHp = Game.bossRush ? diff.bossHp : 12;""")

# ================================================================
# ② 結束畫面的按鈕在手機點不到（#touchUI z-index 壓在覆蓋層上）
# ================================================================
R('覆蓋層 z-index 提到觸控介面之上',
  """  .overlay-in {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    background: rgba(6,10,20,.72); border-radius: 14px; z-index: 5;
  }""",
  """  .overlay-in {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    background: rgba(6,10,20,.72); border-radius: 14px;
    /* v4.16：原本 z-index:5 被手機觸控介面（z-index:7）壓住 →
       結算畫面的「再來一場／回主選單」點下去其實是打到看不見的滑動區，完全沒反應 */
    z-index: 9;
  }""")

R('覆蓋層打開時收起觸控介面',
  """  body.touch #touchUI { display: block; }""",
  """  body.touch #touchUI { display: block; }
  /* v4.16：結算／暫停／開場覆蓋層打開時，整組觸控介面先收起來（否則會偷走按鈕的點擊） */
  body.ovopen #touchUI { visibility: hidden; pointer-events: none; }
  body.ovopen #touchUI * { pointer-events: none; }""")

R('ovShow / ovHide 輔助',
  """function hideOverlay() { Game.ovInfo = null; stopWinJump(); $id('ovIn').classList.add('hide'); }""",
  """// v4.16：覆蓋層開關一律走這兩支 —— 順便幫 body 掛上 ovopen，
//   讓手機的觸控介面（滑動區／搖桿／功能鍵）自動讓開，按鈕才點得到
function ovShow() {
  const el = $id('ovIn');
  if (el) el.classList.remove('hide');
  if (document.body && document.body.classList) document.body.classList.add('ovopen');
}
function ovHide() {
  const el = $id('ovIn');
  if (el) el.classList.add('hide');
  if (document.body && document.body.classList) document.body.classList.remove('ovopen');
}
function hideOverlay() { Game.ovInfo = null; stopWinJump(); ovHide(); }""")

R('所有覆蓋層開啟處改走 ovShow',
  """$id('ovIn').classList.remove('hide');""",
  """ovShow();""", cnt=5)

# ================================================================
# ③ 首頁拿掉「組隊 對戰」（對戰頁裡就能選隊數）
# ================================================================
R('首頁移除組隊按鈕',
  """        <button class="mbtn" id="btnTeam">👥 組隊 對戰<small>紅／藍／綠／黃 4 隊 · 2～8 人</small></button>
""",
  """""")

R('組隊按鈕的監聽器改成有才綁',
  """$id('btnTeam').addEventListener('click', function () {""",
  """// v4.16：首頁的「組隊 對戰」按鈕已移除（組隊改成在對戰頁的「隊數」選），
//   這裡保留程式碼但加存在判斷 → 以後要放回來只要把按鈕 HTML 加回去就好
if ($id('btnTeam')) $id('btnTeam').addEventListener('click', function () {""")

# ================================================================
# ④ 可躲人的樹叢／破屋
# ================================================================
R('躲點函式（hazardAt 之後）',
  """function hazardUnder(p) {
  const T = Game.T;
  return hazardAt(Math.floor(p.x / T), Math.floor(p.y / T));
}""",
  """function hazardUnder(p) {
  const T = Game.T;
  return hazardAt(Math.floor(p.x / T), Math.floor(p.y / T));
}

// ================================================================
//   v4.16：可躲人的地形 —— 樹叢（bush）／破屋（hut）
//   站進這種格子＝躲起來：AI 對手與小怪看不到你、也不會追你；
//   但火焰照樣燒得到（躲點不是無敵），而且炸過一次就會被燒掉。
// ================================================================
function hideTileAt(x, y) {
  const hz = hazardAt(x, y);
  return (hz && hz.type === 'hide') ? hz : null;
}
// 這位玩家現在是不是躲在樹叢／破屋裡（騎著恐龍躲不進去）
function playerHiding(p) {
  if (!p || !p.alive || p.dino) return false;
  const T = Game.T || 1;
  return !!hideTileAt(Math.floor(p.x / T), Math.floor(p.y / T));
}
// 在地圖空地隨機放躲點（出生點、出口、已有機關的格子都避開）
function placeHideTiles(cols, rows, rnd, spawns) {
  const R2 = typeof rnd === 'function' ? rnd : Math.random;
  if (!Game.hazards || !Game.grid) return 0;
  const spots = [];
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      if (Game.grid[y][x] !== 0) continue;
      if (Game.hazards[y] && Game.hazards[y][x]) continue;
      if (Game.door && Game.door.x === x && Game.door.y === y) continue;
      if (x <= 3 && y <= 3) continue;                       // 出生點附近留空
      let near = false;
      (spawns || []).forEach(function (sp) {
        if (Math.abs(sp.x - x) <= 1 && Math.abs(sp.y - y) <= 1) near = true;
      });
      if (near) continue;
      spots.push({ x: x, y: y });
    }
  }
  if (!spots.length) return 0;
  // 數量：小圖 3 個、大圖最多 9 個（太少沒得躲，太多整張圖都是草叢）
  const want = Math.max(3, Math.min(9, Math.round(cols * rows / 26)));
  let n = 0;
  for (let i = 0; i < want && spots.length; i++) {
    const sp = spots.splice(Math.floor(R2() * spots.length), 1)[0];
    Game.hazards[sp.y][sp.x] = {
      type: 'hide',
      kind: R2() < .58 ? 'bush' : 'hut',
      seed: Math.floor(R2() * 997)
    };
    n++;
  }
  return n;
}""")

R('buildMap 收尾放躲點',
  """  }
}

function cellAt(x, y) {""",
  """  }
  // v4.16：可躲人的樹叢／破屋
  placeHideTiles(cols, rows, Math.random, opts.spawns || []);
}

function cellAt(x, y) {""")

R('buildOrganicMap 收尾放躲點',
  """  }
}

// ---------- RPG 怪物數值（血量／防禦／速度倍率）----------""",
  """  }
  // v4.16：可躲人的樹叢／破屋（有機地圖也放，固定種子 → 位置固定）
  placeHideTiles(cols, rows, rnd, [{ x: 1, y: 1 }]);
}

// ---------- RPG 怪物數值（血量／防禦／速度倍率）----------""")

R('躲點進出提示',
  """function hazardTick(p, dt, pressing) {
  const T = Game.T;
  const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);
  const hz = hazardAt(cx, cy);""",
  """function hazardTick(p, dt, pressing) {
  const T = Game.T;
  const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);
  const hz = hazardAt(cx, cy);
  // v4.16：躲進樹叢／破屋（第一次進入給一句提示，AI 不吵）
  const hidNow = !!(hz && hz.type === 'hide') && !p.dino;
  if (hidNow !== !!p.hiding) {
    p.hiding = hidNow;
    if (hidNow && isMyPlayer(p)) toast(t('hide.in'), 1.9);
  }""")

R('火焰會燒掉躲點',
  """function addFlame(cx, cy, type, dir, owner, src) {
  Game.flames.push({ cx: cx, cy: cy, type: type, dir: dir, t: .46, owner: owner || null, src: src || null });
}""",
  """function addFlame(cx, cy, type, dir, owner, src) {
  Game.flames.push({ cx: cx, cy: cy, type: type, dir: dir, t: .46, owner: owner || null, src: src || null });
  // v4.16：火焰會把樹叢／破屋燒掉（躲點是消耗品，炸過就沒了）
  const hzF = (Game.hazards && Game.hazards[cy]) ? Game.hazards[cy][cx] : null;
  if (hzF && hzF.type === 'hide') {
    Game.hazards[cy][cx] = null;
    const TF = Game.T || 1;
    burst(cx * TF + TF / 2, cy * TF + TF / 2, '#8fd06a', 6, 90);
  }
}""")

R('小怪（地面＋飛行）追人時看不到躲在裡面的人',
  """    Game.players.forEach(function (p) {
      if (!p.alive) return;
      const d = dist2(p.x, p.y, e.x, e.y);""",
  """    Game.players.forEach(function (p) {
      if (!p.alive) return;
      if (playerHiding(p)) return;               // v4.16：躲在樹叢／破屋裡的人看不到
      const d = dist2(p.x, p.y, e.x, e.y);""", cnt=2)

R('AI 對手找不到躲在裡面的人',
  """      Game.players.forEach(function (q) {
        if (q !== p && q.alive) {""",
  """      Game.players.forEach(function (q) {
        if (q !== p && q.alive && !playerHiding(q)) {   // v4.16：躲在樹叢裡的對手 AI 看不到""")

R('躲點繪製 + 壓在角色上面',
  """  Game.players.forEach(function (p) { if (p.alive || p.cry > 0) drawPlayer(p, T); });
  // v4.5：受傷飄字畫在角色「頭上」（世界座標，跟著相機一起動）""",
  """  Game.players.forEach(function (p) { if (p.alive || p.cry > 0) drawPlayer(p, T); });
  // v4.16：樹叢／破屋壓在角色「上面」→ 躲進去的人自然被葉子／屋頂蓋住
  drawHideCanopy(T);
  // v4.5：受傷飄字畫在角色「頭上」（世界座標，跟著相機一起動）""")

R('躲點的美術（drawPlayer 之前）',
  """function drawPlayer(p, T) {""",
  """// ---------- v4.16：樹叢／破屋的畫法 ----------
function drawBushTile(px, py, T, alpha, seed) {
  const s2 = (seed || 0) % 97;
  const sway = Math.sin(Game.gameT * 1.7 + s2 * .31) * T * .014;
  ctx.save();
  ctx.globalAlpha = alpha;
  // 地面陰影
  ctx.fillStyle = 'rgba(24,52,28,.26)';
  ctx.beginPath();
  ctx.ellipse(px + T * .5, py + T * .80, T * .42, T * .13, 0, 0, 6.283);
  ctx.fill();
  // 六團葉子疊成一叢
  const blobs = [
    [.26, .62, .30], [.74, .62, .30], [.50, .52, .36],
    [.30, .40, .24], [.70, .40, .24], [.50, .30, .22]
  ];
  for (let i = 0; i < blobs.length; i++) {
    const b = blobs[i];
    const bx = px + b[0] * T + sway * (1 + i * .25);
    const by = py + b[1] * T;
    const r = b[2] * T;
    let g = null;
    if (ctx.createRadialGradient) {
      try {
        g = ctx.createRadialGradient(bx - r * .30, by - r * .38, r * .12, bx, by, r);
        if (g && g.addColorStop) {
          g.addColorStop(0, '#9ae88f');
          g.addColorStop(.55, '#4faa5c');
          g.addColorStop(1, '#2a6c3c');
        } else g = null;
      } catch (e) { g = null; }
    }
    ctx.fillStyle = g || '#4faa5c';
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, 6.283);
    ctx.fill();
  }
  // 亮葉點綴
  ctx.fillStyle = 'rgba(228,255,208,.62)';
  const dots = [[.34, .46], [.62, .38], [.50, .24], [.76, .56]];
  for (let i = 0; i < dots.length; i++) {
    ctx.beginPath();
    ctx.arc(px + dots[i][0] * T + sway, py + dots[i][1] * T, T * .05, 0, 6.283);
    ctx.fill();
  }
  // 小紅果實
  ctx.fillStyle = 'rgba(255,108,108,.92)';
  ctx.beginPath(); ctx.arc(px + T * .44 + sway, py + T * .55, T * .04, 0, 6.283); ctx.fill();
  ctx.beginPath(); ctx.arc(px + T * .70 + sway, py + T * .44, T * .034, 0, 6.283); ctx.fill();
  ctx.restore();
}

function drawHutTile(px, py, T, alpha, seed) {
  ctx.save();
  ctx.globalAlpha = alpha;
  // 地面陰影
  ctx.fillStyle = 'rgba(30,22,12,.26)';
  ctx.beginPath();
  ctx.ellipse(px + T * .5, py + T * .82, T * .42, T * .12, 0, 0, 6.283);
  ctx.fill();
  // 屋內地板（木板）
  ctx.fillStyle = '#6b4a2e';
  ctx.fillRect(px + T * .12, py + T * .30, T * .76, T * .56);
  ctx.fillStyle = 'rgba(255,226,180,.16)';
  for (let i = 0; i < 3; i++) ctx.fillRect(px + T * .12, py + T * (.36 + i * .15), T * .76, T * .035);
  // 左牆（半塌）＋右牆（破口）
  ctx.fillStyle = '#8a5f3a';
  ctx.fillRect(px + T * .10, py + T * .16, T * .13, T * .62);
  ctx.fillRect(px + T * .77, py + T * .30, T * .13, T * .48);
  // 斷掉的屋頂（兩片斜板，中間破一個大洞）
  ctx.fillStyle = '#a8703f';
  ctx.beginPath();
  ctx.moveTo(px + T * .06, py + T * .26);
  ctx.lineTo(px + T * .46, py + T * .04);
  ctx.lineTo(px + T * .52, py + T * .18);
  ctx.lineTo(px + T * .10, py + T * .38);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#8c5a33';
  ctx.beginPath();
  ctx.moveTo(px + T * .56, py + T * .14);
  ctx.lineTo(px + T * .94, py + T * .30);
  ctx.lineTo(px + T * .90, py + T * .42);
  ctx.lineTo(px + T * .52, py + T * .26);
  ctx.closePath(); ctx.fill();
  // 破洞裡的暗面
  ctx.fillStyle = 'rgba(18,12,8,.34)';
  ctx.beginPath();
  ctx.ellipse(px + T * .5, py + T * .52, T * .19, T * .12, 0, 0, 6.283);
  ctx.fill();
  ctx.restore();
}

// 躲點一律畫在角色上面（自己降到 40% 才看得到自己；裡面有炸彈時也降到 34%）
function drawHideCanopy(T) {
  if (!Game.hazards || !Game.rows || !Game.cols) return;
  const me = Game.players.filter(function (p) { return !p.ai; })[0] || null;
  for (let y = 0; y < Game.rows; y++) {
    const row = Game.hazards[y];
    if (!row) continue;
    for (let x = 0; x < Game.cols; x++) {
      const hz = row[x];
      if (!hz || hz.type !== 'hide') continue;
      let alpha = 1;
      if (me && me.alive && Math.floor(me.x / T) === x && Math.floor(me.y / T) === y) alpha = .40;
      if (bombAt(x, y)) alpha = Math.min(alpha, .34);
      if (hz.kind === 'hut') drawHutTile(x * T, y * T, T, alpha, hz.seed);
      else drawBushTile(x * T, y * T, T, alpha, hz.seed);
    }
  }
}

function drawPlayer(p, T) {""")

# ================================================================
# ⑤ RPG 小怪血量微調（FOE_HP 只有 RPG 在用；單人闖關一律 hp 1）
# ================================================================
R('RPG 小怪血量 -1',
  """const FOE_HP = {
  slime: 3, mush: 2, crab: 3, beetle: 4, skull: 4, lizard: 5,
  bat: 2, ghost: 3, bee: 2, eye: 4
};""",
  """// v4.16：RPG 小怪血量全部微調低一點（-1，最低 2 下）
//   單人闖關不受影響（makeEnemy 一律 hp 1，炸一下就死）
const FOE_HP = {
  slime: 2, mush: 2, crab: 2, beetle: 3, skull: 3, lizard: 4,
  bat: 2, ghost: 2, bee: 2, eye: 3
};""")

# ================================================================
# i18n：躲點提示 + 首頁單人副標（10 語言）
# ================================================================
R('zh-TW 文案', """  'menu.solo': '單人闖關', 'menu.solo.sub': '32 張地圖 · 難易度／無限時間 · 每區魔王',""",
  """  'menu.solo': '單人闖關', 'menu.solo.sub': '32 張地圖 · 難易度／無限時間 · 第 32 關魔王', 'hide.in': '🌿 躲起來了 · 對手和小怪看不到你',""")
R('zh-CN 文案', """  'menu.solo': '单人闯关', 'menu.solo.sub': '32 张地图 · 难度／无限时间 · 每区魔王',""",
  """  'menu.solo': '单人闯关', 'menu.solo.sub': '32 张地图 · 难度／无限时间 · 第 32 关魔王', 'hide.in': '🌿 躲起来了 · 对手和小怪看不到你',""")
R('en 文案', """  'menu.solo': 'Solo Quest', 'menu.solo.sub': '32 maps · difficulty / endless time · stage bosses',""",
  """  'menu.solo': 'Solo Quest', 'menu.solo.sub': '32 maps · difficulty / endless time · boss on stage 32', 'hide.in': '🌿 Hidden — rivals and monsters cannot see you',""")
R('ja 文案', """  'menu.solo': '一人で挑戦', 'menu.solo.sub': '全 32 ステージ · 難易度／無制限時間 · 各エリアに魔王',""",
  """  'menu.solo': '一人で挑戦', 'menu.solo.sub': '全 32 ステージ · 難易度／無制限時間 · ボスは 32 面のみ', 'hide.in': '🌿 隠れた —— 相手もモンスターも見えない',""")
R('ko 文案', """  'menu.solo': '싱글 모험', 'menu.solo.sub': '32개 스테이지 · 난이도／무한 시간 · 구역 보스',""",
  """  'menu.solo': '싱글 모험', 'menu.solo.sub': '32개 스테이지 · 난이도／무한 시간 · 32 스테이지 보스', 'hide.in': '🌿 숨었다 · 상대와 몬스터가 보지 못한다',""")
R('th 文案', """  'menu.solo': 'ผจญภัยคนเดียว', 'menu.solo.sub': '32 ด่าน · ความยาก／เวลาไม่จำกัด · บอสแต่ละโซน',""",
  """  'menu.solo': 'ผจญภัยคนเดียว', 'menu.solo.sub': '32 ด่าน · ความยาก／เวลาไม่จำกัด · บอสที่ด่าน 32', 'hide.in': '🌿 ซ่อนตัวแล้ว · คู่แข่งและมอนสเตอร์มองไม่เห็น',""")
R('vi 文案', """  'menu.solo': 'Chơi đơn', 'menu.solo.sub': '32 màn · độ khó／thời gian vô hạn · trùm mỗi vùng',""",
  """  'menu.solo': 'Chơi đơn', 'menu.solo.sub': '32 màn · độ khó／thời gian vô hạn · trùm ở màn 32', 'hide.in': '🌿 Đã trốn · đối thủ và quái không thấy bạn',""")
R('ru 文案', """  'menu.solo': 'Одиночная игра', 'menu.solo.sub': '32 уровня · сложность／без лимита · босс в каждой зоне',""",
  """  'menu.solo': 'Одиночная игра', 'menu.solo.sub': '32 уровня · сложность／без лимита · босс только на 32-м', 'hide.in': '🌿 Вы спрятались · соперники вас не видят',""")
R('de 文案', """  'menu.solo': ' Einzelspieler', 'menu.solo.sub': '32 Level · Schwierigkeit／unendlich Zeit · Endboss pro Zone',""",
  """  'menu.solo': ' Einzelspieler', 'menu.solo.sub': '32 Level · Schwierigkeit／unendlich Zeit · Boss nur in Level 32', 'hide.in': '🌿 Versteckt · Gegner sehen dich nicht',""")
R('it 文案', """  'menu.solo': 'Giocatore singolo', 'menu.solo.sub': '32 livelli · difficoltà／tempo infinito · boss per zona',""",
  """  'menu.solo': 'Giocatore singolo', 'menu.solo.sub': '32 livelli · difficoltà／tempo infinito · boss solo al 32', 'hide.in': '🌿 Nascosto · rivali e mostri non ti vedono',""")

# 首頁單人按鈕的靜態副標
R('首頁單人副標', """<small>32 張地圖 · 難易度／無限時間 · 每區魔王</small>""",
  """<small>32 張地圖 · 難易度／無限時間 · 第 32 關魔王</small>""")

# ================================================================
# 版本號 4.15 → 4.16
# ================================================================
R('VERSION 常數', """const VERSION = '4.15';""", """const VERSION = '4.16';""")
R('標題徽章', """<div class="ver beta">測試版 v<span id="verTxt">4.15</span></div>""",
  """<div class="ver beta">測試版 v<span id="verTxt">4.16</span></div>""")
R('版本紀錄標題', """📜 <b>版本更新內容</b><span class="vlnum">v<span id="verLogVer">4.15</span></span>""",
  """📜 <b>版本更新內容</b><span class="vlnum">v<span id="verLogVer">4.16</span></span>""")

R('VERSION_LOG 新增 4.16',
  """const VERSION_LOG = [
  { v: '4.15', date: '2026-11-01', now: true, items: [""",
  """const VERSION_LOG = [
  { v: '4.16', date: '2026-11-01', now: true, items: [
    '<b>只有第 32 關有 BOSS</b>：單人闖關原本每區第 4 張（第 4／8／12…關）都會出魔王，現在只留最後一關「魔王之間」，其餘 31 關都是純小怪關，一路打到底才決戰',
    '<b>「再來一場」點不動修好</b>：手機上（隱形滑動區模式）結算畫面的按鈕被看不見的觸控區蓋住，點下去完全沒反應。現在覆蓋層會壓在觸控介面之上，開著的時候觸控介面自動收起',
    '<b>首頁收起「👥 組隊 對戰」</b>：組隊不需要兩個入口 —— 直接點「對戰」，在對戰設定裡選「隊數 2／3／4」就是組隊對戰',
    '<b>新增可躲人的地形：樹叢 🌿 與破屋 🏚️</b>：每一張圖都會散落幾個，走進去就躲起來 —— AI 對手與小怪看不到你、也不會追你（頭上不會冒名字）。但火焰照樣燒得到，而且炸過一次躲點就會燒掉，是會用完的戰術資源',
    '<b>RPG 小怪血量微調</b>：全部 -1 下（史萊姆 2、鐵甲蟲 3、疾風蜥 4…），打起來不會那麼黏；單人闖關維持「炸一下就死」不變'
  ] },
  { v: '4.15', date: '2026-11-01', now: false, items: [""")

# __BH 匯出
R('__BH 匯出躲點與魔王判定',
  """  MAP32: MAP32, SOLO_STAGES: SOLO_STAGES, soloInfo: soloInfo, tryGlovePickup: tryGlovePickup,""",
  """  MAP32: MAP32, SOLO_STAGES: SOLO_STAGES, soloInfo: soloInfo, tryGlovePickup: tryGlovePickup,
  // v4.16：只有第 32 關有 BOSS ＋ 可躲人的樹叢／破屋
  soloIsBoss: soloIsBoss, hideTileAt: hideTileAt, playerHiding: playerHiding,
  placeHideTiles: placeHideTiles, drawHideCanopy: drawHideCanopy, ovShow: ovShow, ovHide: ovHide,""")

# ================================================================
# 套用
# ================================================================
fail = 0
for name, old, new, cnt in rules:
    n = s.count(old)
    if cnt is not None and n != cnt:
        print('[FAIL] %s —— 命中 %d 次（預期 %d）' % (name, n, cnt)); fail += 1
        continue
    if cnt is None and n == 0:
        print('[FAIL] %s —— 命中 0 次' % name); fail += 1
        continue
    s = s.replace(old, new)
    print('[ok] %s（%d 處）' % (name, n))

if fail:
    print('\n有 %d 條規則失敗，未寫入。' % fail); sys.exit(1)

io.open(P, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n'))
print('\n已寫入 %s' % P)
