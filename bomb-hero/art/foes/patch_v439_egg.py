# -*- coding: utf-8 -*-
# v4.39 補丁 4：恐龍蛋 —— 換新貼圖、藏在軟磚裡、左右搖晃＋蛋緣閃光
import io, os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = os.path.join(ROOT, 'index.html')
DATA = os.path.join(ROOT, 'art', 'eggs', '_egg_game.js')
s = io.open(P, encoding='utf-8', newline='').read()
CRLF = '\r\n' in s


def rep(old, new, tag, cnt=1):
    global s
    o, n = old, new
    if CRLF:
        o = o.replace('\n', '\r\n')
        n = n.replace('\n', '\r\n')
    assert s.count(o) == cnt, '[%s] 對不上（找到 %d 次，預期 %d）' % (tag, s.count(o), cnt)
    s = s.replace(o, n)
    print('ok [%s]' % tag)


# ---------- 1) Game 狀態多一個 eggsHidden ----------
rep("""  players: [], enemies: [], bombs: [], flames: [], items: [], eggs: [], particles: [], bubbles: [],""",
    """  players: [], enemies: [], bombs: [], flames: [], items: [], eggs: [], eggsHidden: [], particles: [], bubbles: [],""",
    'state')

rep("""  Game.eggs = [];
  // ---------- 地形機關""",
    """  Game.eggs = [];
  Game.eggsHidden = [];        // v4.39：藏在軟磚裡的蛋（打掉磚才孵出來）
  // ---------- 地形機關""", 'buildMap')

# ---------- 2) spawnEggs：改成藏在軟磚裡 ----------
i = s.index('function spawnEggs(n) {')
j = s.index('function eggAt(x, y) {', i)
NEW = """// v4.39：恐龍蛋不再直接躺在場上 —— 一律「藏在軟磚裡」，打掉那塊軟磚才孵出來。
//   地圖軟磚不夠（或全被道具／門佔走）才退回舊行為：直接生在空地。
const EGG_HIDDEN = '__egg';
function spawnEggs(n) {
  Game.eggs = [];
  Game.eggsHidden = [];
  const T = Game.T;
  const p = Game.players[0];
  Game.hidden = Game.hidden || {};
  const softs = [];
  for (let y = 1; y < Game.rows - 1; y++) {
    for (let x = 1; x < Game.cols - 1; x++) {
      if (Game.grid[y][x] !== 2) continue;                    // 只藏軟磚
      if (Game.hidden[y + ',' + x]) continue;                 // 已經藏了道具／出口門
      if (Game.door && Game.door.x === x && Game.door.y === y) continue;
      softs.push({ x: x, y: y });
    }
  }
  let want = n;
  while (want > 0 && softs.length) {
    const sl = softs.splice(rand(softs.length), 1)[0];
    Game.hidden[sl.y + ',' + sl.x] = EGG_HIDDEN;
    Game.eggsHidden.push({ x: sl.x, y: sl.y, bob: Math.random() * 6.28 });
    want--;
  }
  let guard = 0;
  while (want > 0 && guard++ < 400) {
    const x = 1 + rand(Game.cols - 2), y = 1 + rand(Game.rows - 2);
    if (Game.grid[y][x] !== 0) continue;
    if (bombAt(x, y)) continue;
    if (eggAt(x, y)) continue;
    if (Game.door && Game.door.x === x && Game.door.y === y) continue;
    if (p && Math.abs(p.x / T - x) + Math.abs(p.y / T - y) < 2.5) continue;   // 不要生在腳邊
    Game.eggs.push({ x: x, y: y, bob: Math.random() * 6.28, wob: 0, born: 0, safeT: 0 });
    want--;
  }
  return Game.eggs.length + Game.eggsHidden.length;
}
// 軟磚被打掉 → 藏在裡面的蛋冒出來（scale 彈一下，並且給 0.8 秒保護）
function revealEgg(x, y) {
  if (!Game.eggs) Game.eggs = [];
  Game.eggsHidden = (Game.eggsHidden || []).filter(function (e) { return !(e.x === x && e.y === y); });
  if (eggAt(x, y)) return;
  const T = Game.T;
  Game.eggs.push({ x: x, y: y, bob: Math.random() * 6.28, wob: 0, born: .5, safeT: .8 });
  burst(x * T + T / 2, y * T + T / 2, '#ffe9a8', 16, 170);
  AudioSys.sfx('item');
}
"""
if CRLF:
    NEW = NEW.replace('\n', '\r\n')
s = s[:i] + NEW + s[j:]
print('ok [spawnEggs]')

# ---------- 3) destroySoft 認得「藏在磚裡的蛋」 ----------
rep("""    if (h === 'door') {
      if (Game.door) { Game.door.revealed = true; Game.door.x = x; Game.door.y = y; }
    } else {
      spawnItem(x, y, h);
    }""",
    """    if (h === 'door') {
      if (Game.door) { Game.door.revealed = true; Game.door.x = x; Game.door.y = y; }
    } else if (h === EGG_HIDDEN) {
      revealEgg(x, y);                       // v4.39：打掉軟磚 → 恐龍蛋孵出來
    } else {
      spawnItem(x, y, h);
    }""", 'destroySoft')

# ---------- 4) 更新：蛋的 wobble / 出生動畫 / 剛出生保護 ----------
rep("""      const eg = Game.eggs[i];
      eg.bob += dt * 3.2;
      for (let j = 0; j < Game.flames.length; j++) {""",
    """      const eg = Game.eggs[i];
      eg.bob += dt * 3.2;
      if (eg.born > 0) eg.born = Math.max(0, eg.born - dt);
      // v4.39：剛從磚裡冒出來的 0.8 秒不受火焰影響 —— 不然「炸開磚的同一發爆炸」
      //   會馬上把蛋燒掉，玩家永遠騎不到龍
      if (eg.safeT > 0) { eg.safeT = Math.max(0, eg.safeT - dt); continue; }
      for (let j = 0; j < Game.flames.length; j++) {""", 'eggUpdate')

# ---------- 5) 繪製：新貼圖 + 搖晃 + 蛋緣閃光（舊向量蛋留著當後備） ----------
i = s.index('  // 恐龍蛋：可以炸掉，走過去會孵出恐龍')
j = s.index('  // 道具\n', i)
NEW2 = """  // 恐龍蛋：藏在軟磚裡，打出來才看得到；會左右搖晃、蛋緣一直閃亮光
  if (Game.eggs) Game.eggs.forEach(function (eg) {
    const px = eg.x * T + T / 2;
    const py = eg.y * T + T / 2 + Math.sin(eg.bob) * 1.8;
    const img = (typeof EggArt !== 'undefined') ? EggArt.get() : null;
    const sway = Math.sin(eg.bob * 1.35) * .105;        // 左右搖晃 ±6°
    const bk = eg.born > 0 ? clamp(1 - eg.born / .5, 0, 1) : 1;
    const sc = .55 + .45 * bk + Math.sin(bk * Math.PI) * .10;
    const pw = .5 + .5 * Math.sin(eg.bob * 1.9);
    softShadow(px, eg.y * T + T * .82, T * .26, T * .08, .30);
    ctx.save();
    ctx.translate(px, py);
    // 珍貴感：外圈暖金／翡翠呼吸光暈
    const gr = ctx.createRadialGradient(0, 0, T * .14, 0, 0, T * .64);
    gr.addColorStop(0, 'rgba(255,238,168,' + (.26 + .16 * pw).toFixed(3) + ')');
    gr.addColorStop(.55, 'rgba(150,240,182,' + (.14 + .09 * pw).toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(0, 0, T * .64, 0, 6.283); ctx.fill();
    ctx.scale(sc, sc);
    ctx.rotate(sway);
    if (img) {
      const es = T * .88;                                // 蛋高 ≈ 0.88 格（比原本的向量蛋更飽滿）
      ctx.drawImage(img, -es / 2, -es / 2, es, es);
    } else {
      ctx.fillStyle = '#fdf3dc';
      ctx.beginPath(); ctx.ellipse(0, 0, T * .255, T * .325, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(120,90,60,.14)';
      ctx.beginPath(); ctx.ellipse(T * .05, T * .06, T * .20, T * .27, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#7fc98f';
      [[-.10, -.09, .052], [.09, .01, .042], [.01, .15, .046], [-.12, .10, .036]].forEach(function (d) {
        ctx.beginPath(); ctx.ellipse(d[0] * T, d[1] * T, d[2] * T, d[2] * T * .82, .4, 0, 6.283); ctx.fill();
      });
      ctx.fillStyle = 'rgba(255,255,255,.58)';
      ctx.beginPath(); ctx.ellipse(-T * .10, -T * .14, T * .07, T * .11, -.5, 0, 6.283); ctx.fill();
    }
    // 蛋緣閃亮光：沿蛋型輪廓跑的亮弧 ＋ 星芒（看起來很珍貴）
    const a0 = eg.bob * .9;
    ctx.strokeStyle = 'rgba(255,252,214,.90)';
    ctx.lineWidth = Math.max(1.6, T * .042);
    ctx.beginPath(); ctx.ellipse(0, 0, T * .338, T * .418, 0, a0, a0 + 1.15); ctx.stroke();
    ctx.strokeStyle = 'rgba(176,255,206,.52)';
    ctx.lineWidth = Math.max(1.1, T * .028);
    ctx.beginPath(); ctx.ellipse(0, 0, T * .338, T * .418, 0, a0 + 2.55, a0 + 3.45); ctx.stroke();
    const spx = Math.cos(a0 + .55) * T * .338, spy = Math.sin(a0 + .55) * T * .418;
    ctx.globalAlpha = .55 + .45 * Math.sin(eg.bob * 3.1);
    ctx.fillStyle = '#fffce8';
    spark4(ctx, spx, spy, T * .105);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  });
"""
if CRLF:
    NEW2 = NEW2.replace('\n', '\r\n')
s = s[:i] + NEW2 + s[j:]
print('ok [drawEgg]')

# ---------- 6) 星芒小工具（放在 rrPath 後面） ----------
rep("""function drawItemBadge(px, py, T, type, img, pulse) {""",
    """// v4.39：四角星芒（恐龍蛋的閃光用）
function spark4(g, x, y, r) {
  g.beginPath();
  g.moveTo(x, y - r);
  g.quadraticCurveTo(x + r * .16, y - r * .16, x + r, y);
  g.quadraticCurveTo(x + r * .16, y + r * .16, x, y + r);
  g.quadraticCurveTo(x - r * .16, y + r * .16, x - r, y);
  g.quadraticCurveTo(x - r * .16, y - r * .16, x, y - r);
  g.closePath();
}
function drawItemBadge(px, py, T, type, img, pulse) {""", 'spark4')

# ---------- 7) EGG_ART 資料 ＋ EggArt 載入器 ----------
data = io.open(DATA, encoding='utf-8').read()
anchor = """// 每個道具的代表色（外框／光暈用）
const ITEM_TINT = {"""
add = data + """
// v4.39：恐龍蛋貼圖載入（跟 ItemArt 同一套寫法）
const EggArt = (function () {
  try {
    return (function () {
      let img = null, ready = false;
      function load() {
        if (typeof Image === 'undefined' || typeof EGG_ART === 'undefined') return;
        img = new Image();
        img.onload = function () { ready = true; };
        img.onerror = function () {};
        try { img.src = EGG_ART.egg.u; } catch (e) {}
      }
      function get() { return (ready && img && img.naturalWidth) ? img : null; }
      function readyCount() { return ready ? 1 : 0; }
      return { load: load, get: get, readyCount: readyCount };
    })();
  } catch (__e) {
    if (typeof __bootFail === 'function') __bootFail('EggArt', __e);
    return { load: function () {}, get: function () { return null; }, readyCount: function () { return 0; } };
  }
})();
""" + anchor
rep(anchor, add, 'EggArt')

# ---------- 8) 開機載入 ＋ 導出 ----------
rep("""ItemArt.load();          // v4.38：道具圖示""",
    """ItemArt.load();          // v4.38：道具圖示
EggArt.load();           // v4.39：恐龍蛋貼圖""", 'load')

rep("""  ItemArt: ItemArt, ITEM_ART: ITEM_ART, ITEM_TINT: ITEM_TINT,""",
    """  ItemArt: ItemArt, ITEM_ART: ITEM_ART, ITEM_TINT: ITEM_TINT,
  EggArt: EggArt, EGG_ART: EGG_ART, revealEgg: revealEgg, EGG_HIDDEN: EGG_HIDDEN,""",
    'export')

# ---------- 9) 圖鑑文案：蛋改成「藏在軟磚裡」 ----------
rep("""    d: { tw: '地圖上隨機出現的蛋，<b>走上去就孵化</b>並立刻騎上。', cn: '地图上随机出现的蛋，<b>走上去就孵化</b>并立刻骑上。', en: 'Randomly spawned eggs — <b>walk onto one</b> to hatch and ride.' },""",
    """    d: { tw: '恐龍蛋<b>藏在軟磚裡</b>，打掉那塊磚才會冒出來，<b>走上去就孵化</b>並立刻騎上。', cn: '恐龙蛋<b>藏在软砖里</b>，打掉那块砖才会冒出来，<b>走上去就孵化</b>并立刻骑上。', en: 'Dino eggs are <b>hidden inside soft blocks</b> — blast the block to reveal one, then <b>walk onto it</b> to hatch and ride.' },""",
    'i18nEgg')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('bytes', len(s.encode('utf-8')))
