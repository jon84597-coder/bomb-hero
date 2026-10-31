# -*- coding: utf-8 -*-
import io
p = 'index.html'
s = io.open(p, encoding='utf-8').read()

# ---------- 1. Sprites 模块 + drawSpriteChar（插在 drawCharBody 之前） ----------
anchor = "function drawCharBody(g, c, x, y, R, a) {"
assert anchor in s
sprite_block = r"""// ---------- 精靈圖：使用者提供的原圖（已摳成透明背景） ----------
const Sprites = (function () {
  const imgs = {}, ready = {};
  function load() {
    if (typeof Image === 'undefined') return;
    Object.keys(IMG_CHARS).forEach(function (k) {
      const im = new Image();
      im.onload = function () { ready[k] = true; };
      im.onerror = function () { ready[k] = false; };
      try { im.src = IMG_CHARS[k]; } catch (e) {}
      imgs[k] = im;
    });
  }
  function get(k) {
    const im = imgs[k];
    return im && ready[k] && im.naturalWidth ? im : null;
  }
  function readyCount() {
    return Object.keys(ready).filter(function (k) { return ready[k]; }).length;
  }
  return { load: load, get: get, readyCount: readyCount, imgs: imgs };
})();

// 用精靈圖畫角色：走路搖擺（waddle）＋踏步彈跳＋傾身＋擠壓拉伸＋受傷變色
// 圖片還沒載入 → 回傳 null，呼叫端改用原本的程式繪圖（drawCharBody）
function drawSpriteChar(g, c, x, y, R, a) {
  const img = Sprites.get(c.animal);
  if (!img || !g.drawImage) return null;
  a = a || {};
  const H = R * 3.5;                                  // 角色高（含耳朵／尾巴）
  const sc = H / img.naturalHeight;
  const W = img.naturalWidth * sc;
  const moving = !!a.moving;
  const walk = a.walk || 0;
  const amp = a.amp != null ? a.amp : 1;
  const fx = DIRS[a.facing] || DIRS.down;
  const side = fx.x < 0 ? -1 : 1;
  const sq = moving ? Math.sin(walk * 2) * .055 * amp : Math.sin((a.idle || 0) * 2.1) * .012;   // 擠壓（吸氣／踏步）
  const waddle = moving ? Math.sin(walk) * .10 * amp : 0;                                        // 左右搖擺
  const lift = moving ? Math.abs(Math.sin(walk)) * R * .13 * amp : 0;                             // 踏步抬升
  const footY = y + R * .82;
  g.save();
  if (g.translate) g.translate(x, footY - lift - (a.jump || 0));
  g.rotate((waddle + fx.x * .05) * side);
  g.scale(side * (1 + sq * .5), 1 - sq);
  if (a.expr === 'hurt') { try { g.filter = 'brightness(1.2) saturate(2.6) hue-rotate(-16deg)'; } catch (e) {} }
  g.drawImage(img, -W / 2, -H, W, H);
  try { g.filter = 'none'; } catch (e) {}
  g.restore();
  return { topY: footY - lift - H * .80, ex: fx.x * R * .1, ey: 0, H: H, W: W };
}

"""
s = s.replace(anchor, sprite_block + anchor, 1)

# ---------- 2. drawPlayer 優先用精靈圖 ----------
old = """  const bd = drawCharBody(ctx, c, x, y, R, {
    walk: p.walkT * 15, moving: p.moving, facing: p.facing,
    bob: bob, blink: false, expr: p.gloat > 0 ? 'gloat' : ''
  });"""
new = """  const charArgs = {
    walk: p.walkT * 15, moving: p.moving, facing: p.facing,
    bob: bob, blink: false, expr: p.gloat > 0 ? 'gloat' : (p.hurtFlash > 0 ? 'hurt' : ''),
    idle: Game.gameT
  };
  const bd = drawSpriteChar(ctx, c, x, y, R, charArgs) || drawCharBody(ctx, c, x, y, R, charArgs);"""
assert old in s
s = s.replace(old, new, 1)

# ---------- 3. drawAvatarOn 用精靈圖 ----------
old = """  const S = cnv.width;
  g.clearRect(0, 0, S, S);
  const cx = S / 2, cy = S * .58, R = S * .30;"""
new = """  const S = cnv.width;
  g.clearRect(0, 0, S, S);
  const im = Sprites.get(c.animal);
  if (im && g.drawImage) {
    const h = S * .98, sc = h / im.naturalHeight, w = im.naturalWidth * sc;
    g.drawImage(im, (S - w) / 2, S - h, w, h);
    return;
  }
  const cx = S / 2, cy = S * .58, R = S * .30;"""
assert old in s
s = s.replace(old, new, 1)

# ---------- 4. CharPreview 用精靈圖 ----------
old = """  function drawOne(o, now) {
    const W = o.cnv.width, H = o.cnv.height, g = o.g;
    const c = CHARACTERS[o.ch % CHARACTERS.length];
    g.clearRect(0, 0, W, H);
    const R = W * .27;
    // 來回踱步：左右平移 + 轉身（走路動作）
    const phase = now * 1.05 + o.ch * .7;
    const cx = W / 2 + Math.sin(phase) * W * .085;
    const facing = Math.cos(phase) >= 0 ? 'right' : 'left';
    const walk = now * 12;
    const bob = Math.abs(Math.sin(walk)) * W * .018;
    // 選到時的小跳躍
    const hp = hops[o.ch] || 0;
    const jump = hp > 0 ? Math.sin((1 - hp) * Math.PI) * W * .15 : 0;
    const blink = ((now + o.ch * .41) % 3.4) < .12;   // 偶爾眨眼
    const footY = H * .70 - jump;
    // 地面影子（跳起來會縮小變淡）
    g.fillStyle = 'rgba(0,0,0,' + Math.max(.08, .30 - jump / W * .7).toFixed(3) + ')';
    g.beginPath(); g.ellipse(cx, H * .72, Math.max(6, R * .78 - jump * .28), Math.max(3, R * .2 - jump * .07), 0, 0, 6.283); g.fill();
    drawCharBody(g, c, cx, footY, R, {
      walk: walk, moving: true, facing: facing, bob: bob, blink: blink, amp: R / 14
    });
  }"""
new = """  function drawOne(o, now) {
    const W = o.cnv.width, H = o.cnv.height, g = o.g;
    const c = CHARACTERS[o.ch % CHARACTERS.length];
    g.clearRect(0, 0, W, H);
    // 來回踱步：左右平移 + 轉身（走路動作）
    const phase = now * 1.05 + o.ch * .7;
    const cx = W / 2 + Math.sin(phase) * W * .075;
    const facing = Math.cos(phase) >= 0 ? 'right' : 'left';
    const walk = now * 12;
    // 選到時的小跳躍
    const hp = hops[o.ch] || 0;
    const jump = hp > 0 ? Math.sin((1 - hp) * Math.PI) * H * .2 : 0;
    const hasImg = !!Sprites.get(c.animal);
    const R = hasImg ? (H * .86 - jump) / 3.5 : W * .27;
    const footY = hasImg ? H * .93 : H * .70 - jump;
    // 地面影子（跳起來會縮小變淡）
    g.fillStyle = 'rgba(0,0,0,' + Math.max(.08, .30 - jump / H * .8).toFixed(3) + ')';
    g.beginPath(); g.ellipse(cx, footY + H * .015, Math.max(6, R * .92 - jump * .3), Math.max(3, R * .22 - jump * .08), 0, 0, 6.283); g.fill();
    if (hasImg) {
      drawSpriteChar(g, c, cx, footY - R * .82, R, { walk: walk, moving: true, facing: facing, amp: 1.15, idle: now });
    } else {
      drawCharBody(g, c, cx, H * .70 + H * .0, R, {
        walk: walk, moving: true, facing: facing, bob: Math.abs(Math.sin(walk)) * W * .018,
        blink: ((now + o.ch * .41) % 3.4) < .12, amp: R / 14
      });
    }
  }"""
assert old in s
s = s.replace(old, new, 1)

# ---------- 5. 啟動時載入精靈圖 ----------
old = "Solo.init();\nupdateCountHint();"
new = "Sprites.load();\nSolo.init();\nupdateCountHint();"
assert old in s
s = s.replace(old, new, 1)

# ---------- 6. 匯出測試介面 ----------
old = "  animalWear: animalWear, animalAccessory: animalAccessory, showEnd: showEnd,"
new = """  animalWear: animalWear, animalAccessory: animalAccessory, showEnd: showEnd,
  // v1.4 新增
  Sprites: Sprites, drawSpriteChar: drawSpriteChar, IMG_CHARS: IMG_CHARS, IMG_TITLEBG: IMG_TITLEBG,"""
assert old in s
s = s.replace(old, new, 1)

io.open(p, 'w', encoding='utf-8').write(s)
print('patched, lines', s.count('\n') + 1)
