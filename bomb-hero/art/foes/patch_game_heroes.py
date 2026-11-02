# -*- coding: utf-8 -*-
"""把 v3 站立版主角接進 index.html（部件圖 + 朝向 + 表情圖示）。可重複執行。"""
import io
import os
import re
import sys

ROOT = r'C:\Users\jon84\WorkBuddy\2026-10-30-12-58-54\bomb-hero'
PAGE = os.path.join(ROOT, 'index.html')
PARTS = os.path.join(ROOT, 'art', 'foes', '_heroes_game_parts.js')

s = io.open(PAGE, encoding='utf-8', newline='').read().replace('\r\n', '\n')
orig = len(s)
hero_js = io.open(PARTS, encoding='utf-8', newline='').read().replace('\r\n', '\n')

ANIMALS = ['rabbit', 'bear', 'dog', 'cat', 'pig', 'panda', 'frog', 'chick']
ALL = ANIMALS + ['boss', 'dragon']

# ---------- 1) 換掉 IMG_PARTS 裡的 8 隻主角 ----------
pos = {}
for k in ALL:
    marker = '\n  %s: { asp:' % k
    n = s.count(marker)
    if n != 1:
        sys.exit('marker %s 出現 %d 次，中止' % (k, n))
    pos[k] = s.index(marker)

start = pos['rabbit']
end = pos['boss']
old_block = s[start:end]
print('IMG_PARTS 主角段長度:', len(old_block))

s = s[:start] + '\n' + s[end:]

# 在 const IMG_PARTS 之前插入 HERO_PARTS
anchor = 'const IMG_PARTS = {'
assert s.count(anchor) == 1
hero_block = (
    '// ---------- v4.29：主角群 v3 站立版（頭／軀幹／左右手／左右腿／尾巴，逐層拆件）----------\n'
    '// 座標以「角色內容 bbox」為畫布，所以 drawRigChar 的 H（角色總高）＝ bbox 高\n'
    '// → 換圖後大小與舊角色完全相同。dir = 原圖的預設朝向（+1 面右 / -1 面左）。\n'
    + hero_js + '\n'
)
s = s.replace(anchor, hero_block + anchor, 1)

# IMG_PARTS 結尾加合併
m = re.search(r'\n\};', s[s.index(anchor):])
close_at = s.index(anchor) + m.start() + 3
merge = (
    '\n// v4.29：把新主角部件併進 IMG_PARTS（Parts 模組會一併載入）\n'
    'Object.keys(HERO_PARTS).forEach(function (k) { IMG_PARTS[k] = HERO_PARTS[k]; });\n'
)
s = s[:close_at] + merge + s[close_at:]

# ---------- 2) drawRigChar：朝向 / 尾巴 / 表情圖示 ----------
old_side = "  const fx = DIRS[a.facing] || DIRS.down;\n  const side = fx.x < 0 ? -1 : 1;"
new_side = ("  const fx = DIRS[a.facing] || DIRS.down;\n"
            "  // v4.29：M.dir = 原圖的預設朝向；side 是「相對原圖」要翻的方向\n"
            "  const side = (fx.x < 0 ? -1 : 1) * (M.dir || 1);")
assert s.count(old_side) >= 1, 'side 段找不到'
s = s.replace(old_side, new_side, 1)   # 只換 drawRigChar 那組（drawSpriteChar 有同樣兩行）

old_leg = "  // 腿：左右交替抬腳（step > 0 抬左腿）"
new_leg = ("  // 尾巴（狗／貓）：隨身體慢擺\n"
           "  if (M.p.tail) put('tail', Math.sin((a.idle || 0) * 1.6) * .20 * amp + step * .12 * amp, 0, 0);\n"
           "  // 腿：左右交替抬腳（step > 0 抬左腿）")
assert s.count(old_leg) == 1
s = s.replace(old_leg, new_leg)

old_expr = ("  // v1.7：大哭 / 大笑的表情疊在頭部圖上面\n"
            "  if (a.expr === 'cry' || a.expr === 'laugh' || a.expr === 'gloat') {\n"
            "    const hd = M.p.head;\n"
            "    if (hd) drawFaceExpr(g, a.expr, ox + hd.x * W, oy + hd.y * H, hd.w * W, hd.h * H, a.idle || 0, a.skin);\n"
            "  }")
new_expr = ("  // v4.29：表情＝頭頂情緒圖示 ＋ 身體周圍特效（不覆蓋原臉）。\n"
            "  // 自然狀態（a.expr 為空）完全不畫 → 角色保持原圖的乾淨笑臉。\n"
            "  const mood = heroMood(a);\n"
            "  if (mood) {\n"
            "    const hd = M.p.head;\n"
            "    const hcx = hd ? ox + (hd.x + hd.w * .5) * W : x;\n"
            "    const hty = hd ? oy + hd.y * H : oy;\n"
            "    heroMoodVfx(g, mood, x, footY - jump, H, a.idle || 0);\n"
            "    heroEmoteIcon(g, mood, hcx, hty - H * .13, H * .16, a.idle || 0, 1);\n"
            "  }")
assert s.count(old_expr) == 1, 'expr 段找不到'
s = s.replace(old_expr, new_expr)

# ---------- 3) 插入特效函式（drawRigChar 之前）----------
FUNC_ANCHOR = "function drawRigChar(g, key, x, footY, H, a) {"
assert s.count(FUNC_ANCHOR) == 1

FUNCS = r'''// ---------- 主角情緒：頭頂圖示 ＋ 身體特效（v4.29）----------
// 只在有 expr 時出現；自然狀態不畫，角色保持原圖的乾淨笑臉。
function heroMood(a) {
  const e = a && a.expr;
  if (e === 'cry') return 'cry';
  if (e === 'hurt') return 'pain';
  if (e === 'laugh' || e === 'gloat') return 'happy';
  return '';
}

function heroStar(g, x, y, r, col) {
  g.fillStyle = col;
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, rr = i % 2 ? r * .42 : r;
    if (i) g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath(); g.fill();
}

function heroDrop(g, x, y, r) {
  g.fillStyle = 'rgba(140,205,255,.95)';
  g.beginPath();
  g.moveTo(x, y - r * 1.5);
  g.quadraticCurveTo(x + r, y + r * .2, x, y + r);
  g.quadraticCurveTo(x - r, y + r * .2, x, y - r * 1.5);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,.75)';
  g.beginPath(); g.arc(x - r * .28, y, r * .22, 0, 6.283); g.fill();
}

// 頭頂情緒圖示（跟小怪頭上的生氣圖示同一個意思）
function heroEmoteIcon(g, kind, x, y, r, t, alpha) {
  if (!(alpha > .02) || !(r > 1)) return;
  const pop = Math.min(1, (t % 9.9) / .24);
  const e = 1 - Math.pow(1 - pop, 3);
  const rr = r * e * (1 + Math.sin(pop * Math.PI) * .22);
  if (rr < 1) return;
  const bob = Math.sin(t * 3.6) * r * .09;
  const ink = kind === 'happy' ? '#8A5410' : kind === 'pain' ? '#4C2E7A' : '#14507A';

  g.save();
  g.globalAlpha = alpha;
  try { g.filter = 'none'; } catch (err) {}
  g.translate(x, y + bob);

  g.fillStyle = '#fff';                                     // 指向頭部的小尖角
  g.beginPath();
  g.moveTo(-rr * .34, rr * .72); g.lineTo(rr * .34, rr * .72);
  g.lineTo(0, rr * 1.38); g.closePath(); g.fill();
  g.beginPath(); g.arc(0, 0, rr * 1.16, 0, 6.283); g.fill(); // 白外框

  const A = kind === 'happy' ? ['#FFE783', '#F5B231']
    : kind === 'pain' ? ['#E2CDFB', '#A374E6'] : ['#B4E4FF', '#59B4F0'];
  const gr = g.createRadialGradient(-rr * .30, -rr * .38, rr * .08, 0, 0, rr * 1.2);
  gr.addColorStop(0, A[0]); gr.addColorStop(1, A[1]);
  g.beginPath(); g.arc(0, 0, rr * 1.02, 0, 6.283); g.fillStyle = gr; g.fill();

  g.strokeStyle = ink; g.fillStyle = ink;
  g.lineCap = 'round'; g.lineJoin = 'round';

  if (kind === 'happy') {
    g.lineWidth = rr * .19;
    [-1, 1].forEach(function (s) {
      g.beginPath(); g.arc(s * rr * .38, rr * .04, rr * .24, Math.PI * 1.12, Math.PI * 1.88); g.stroke();
    });
    g.lineWidth = rr * .17;
    g.beginPath(); g.arc(0, rr * .06, rr * .50, .28 * Math.PI, .72 * Math.PI); g.stroke();
    g.fillStyle = 'rgba(255,105,135,.45)';
    [-1, 1].forEach(function (s) {
      g.beginPath(); g.ellipse(s * rr * .60, rr * .34, rr * .17, rr * .11, 0, 0, 6.283); g.fill();
    });
  } else if (kind === 'pain') {
    g.lineWidth = rr * .17;
    [-1, 1].forEach(function (s) {
      const cx2 = s * rr * .38;
      g.beginPath();
      g.moveTo(cx2 - s * rr * .16, -rr * .20);
      g.lineTo(cx2 + s * rr * .13, -rr * .02);
      g.lineTo(cx2 - s * rr * .16, rr * .16);
      g.stroke();
    });
    g.lineWidth = rr * .15;
    g.beginPath();
    g.moveTo(-rr * .26, rr * .46);
    g.quadraticCurveTo(-rr * .09, rr * .30, 0, rr * .46);
    g.quadraticCurveTo(rr * .09, rr * .62, rr * .26, rr * .44);
    g.stroke();
    g.fillStyle = 'rgba(120,190,250,.95)';
    g.beginPath();
    g.moveTo(rr * .92, -rr * .72);
    g.quadraticCurveTo(rr * 1.16, -rr * .34, rr * .92, -rr * .26);
    g.quadraticCurveTo(rr * .68, -rr * .34, rr * .92, -rr * .72);
    g.fill();
    g.strokeStyle = 'rgba(120,80,190,.95)'; g.lineWidth = rr * .13;
    for (let i2 = 0; i2 < 3; i2++) {
      const lx = -rr * (1.62 + i2 * .34);
      g.beginPath(); g.moveTo(lx, -rr * 1.05); g.lineTo(lx, -rr * .52); g.stroke();
    }
  } else {
    g.lineWidth = rr * .17;
    [-1, 1].forEach(function (s) {
      const cx2 = s * rr * .40;
      g.beginPath();
      g.moveTo(cx2 - s * rr * .15, -rr * .22);
      g.lineTo(cx2 + s * rr * .12, -rr * .04);
      g.lineTo(cx2 - s * rr * .15, rr * .14);
      g.stroke();
    });
    g.fillStyle = '#2E1B33';
    g.beginPath(); g.ellipse(0, rr * .44, rr * .30, rr * .26, 0, 0, 6.283); g.fill();
    g.fillStyle = 'rgba(230,120,150,.9)';
    g.beginPath(); g.ellipse(0, rr * .56, rr * .16, rr * .09, 0, 0, 6.283); g.fill();
    g.strokeStyle = 'rgba(150,215,255,.95)'; g.lineWidth = rr * .16;
    [-1, 1].forEach(function (s) {
      g.beginPath();
      g.moveTo(s * rr * .42, rr * .18);
      g.quadraticCurveTo(s * rr * .58, rr * .62, s * rr * .50, rr * 1.02);
      g.stroke();
    });
  }
  g.restore();
}

// 身體周圍的情緒特效
function heroMoodVfx(g, kind, px, py, size, t) {
  g.save();
  try { g.filter = 'none'; } catch (err) {}

  if (kind === 'happy') {
    for (let i = 0; i < 14; i++) {
      const ang = t * .8 + i / 14 * Math.PI * 2;
      const rx = size * (.34 + .16 * Math.sin(t * 1.3 + i * 1.7));
      const x = px + Math.cos(ang) * rx * 1.25;
      const y = py - size * .48 + Math.sin(ang) * rx * .82;
      const tw = .30 + .70 * Math.abs(Math.sin(t * 3.4 + i * 2.1));
      heroStar(g, x, y, size * (.022 + .028 * tw), 'rgba(255,247,205,' + (.90 * tw) + ')');
    }
  } else if (kind === 'pain') {
    for (let j = 0; j < 7; j++) {
      const pj = ((t * .55) + j / 7) % 1;
      const xj = px + Math.sin(t * 2.1 + j * 2.4) * size * .30;
      const yj = py - size * (.10 + pj * .95);
      const rj = size * (.05 + .05 * pj);
      const gg = g.createRadialGradient(xj, yj, 0, xj, yj, rj * 2.4);
      gg.addColorStop(0, 'rgba(168,120,235,' + (.34 * (1 - pj)) + ')');
      gg.addColorStop(1, 'rgba(168,120,235,0)');
      g.fillStyle = gg;
      g.beginPath(); g.arc(xj, yj, rj * 2.4, 0, 6.283); g.fill();
    }
  } else if (kind === 'cry') {
    const hy = py - size * .74;
    [-1, 1].forEach(function (dir, si) {
      const wob = Math.sin(t * 6.4 + si * 1.7) * size * .018;
      const x0 = px + dir * size * .22, y0 = hy;
      const cx1 = px + dir * size * .40, cy1 = y0 + size * .04 + wob;
      const x1 = px + dir * (size * .58 + Math.sin(t * 3.1 + si) * size * .02);
      const y1 = y0 + size * .30 + wob;
      for (let q = 0; q <= 16; q++) {
        const kq = q / 16, ik = 1 - kq;
        const bx = ik * ik * x0 + 2 * ik * kq * cx1 + kq * kq * x1;
        const by = ik * ik * y0 + 2 * ik * kq * cy1 + kq * kq * y1;
        const rad = size * (.062 - .030 * kq);
        g.fillStyle = 'rgba(146,210,255,' + (.92 - kq * .45) + ')';
        g.beginPath(); g.arc(bx, by, rad, 0, 6.283); g.fill();
        if (q % 3 === 0) {
          g.fillStyle = 'rgba(255,255,255,' + (.55 - kq * .35) + ')';
          g.beginPath(); g.arc(bx - dir * rad * .3, by - rad * .35, rad * .30, 0, 6.283); g.fill();
        }
      }
      for (let m = 0; m < 3; m++) {
        const pm = ((t * 1.15) + m * .33 + si * .17) % 1;
        heroDrop(g, x1 + dir * pm * size * .10, y1 + pm * pm * size * .22, size * (.032 - pm * .012));
      }
    });
  }
  g.restore();
}

'''
s = s.replace(FUNC_ANCHOR, FUNCS + FUNC_ANCHOR, 1)

# ---------- 4) 版號 ----------
s = s.replace("const VERSION = '4.28';", "const VERSION = '4.29';")
s = s.replace('<span id="verLogVer">4.28</span>', '<span id="verLogVer">4.29</span>')
s = s.replace('<span id="verTxt">4.28</span>', '<span id="verTxt">4.29</span>')

old_log = "  { v: '4.28', date: '2026-11-02', now: true, items: ["
assert s.count(old_log) == 1
s = s.replace(old_log, "  { v: '4.29', date: '2026-11-02', now: true, items: [\n"
                       "    '主角群換成新版站立美術：頭／軀幹／左右手／左右腿分層，走路時手腳真的會擺動',\n"
                       "    '角色會依移動方向轉向（兔兔、柴犬、熊貓預設面右；其餘面左）',\n"
                       "    '表情改成頭頂小圖示＋身體特效；平常站著不會有圖示'\n"
                       "  ] },\n"
                       "  { v: '4.28', date: '2026-11-02', now: false, items: [")

io.open(PAGE, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n'))
print('index.html %d → %d bytes (+%.0f KB)' % (orig, len(s), (len(s) - orig) / 1024.0))
