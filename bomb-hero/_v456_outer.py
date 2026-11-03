# -*- coding: utf-8 -*-
# v4.56：外牆改成「每大關自己一套專屬貼圖」（paintOuterTile 烘焙），尺寸回到與硬牆同一個 T×T
import io, re, sys

P = 'index.html'
src = io.open(P, encoding='utf-8').read()
orig_len = len(src)


def rep(old, new, tag, cnt=1):
    global src
    n = src.count(old)
    if n != cnt:
        print('[FAIL] %s: 出現 %d 次（預期 %d）' % (tag, n, cnt))
        sys.exit(1)
    src = src.replace(old, new, cnt)
    print('[ok] %s' % tag)


# ---------- 1. 換掉 drawOuterWall（連同舊的 mixHex 一起重寫） ----------
A = '// v4.54：外牆 —— 沙色粗磚。'
B = '// v4.54：牆的分類表（每張圖算一次，地圖重建或縮圈落石時重算）'
ia, ib = src.find(A), src.find(B)
assert ia > 0 and ib > ia, 'drawOuterWall 區塊找不到'

NEW_WALL = '''// 顏色混合（外牆調色、測試都會用到）
function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
  const g2 = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
  const b2 = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
  return 'rgb(' + r + ',' + g2 + ',' + b2 + ')';
}
// v4.56：外牆 —— 每個大關「自己一套貼圖」（paintOuterTile 現烤），跟場內硬牆是兩套不同材質。
//   尺寸與硬牆一樣是 T×T（取消 v4.55 的往外擴）；只在「相鄰不是外牆」的那一側壓暗邊 → 整坨牆才有厚度。
function drawOuterWall(px, py, T, th, seed, gx, gy) {
  if (!artBlit(artSet(artStyle()).outer, seed, px, py, T)) {
    const base = (th && (th.out || th.hard)) || '#8a8a8a';
    ctx.fillStyle = base; ctx.fillRect(px, py, T, T);
  }
  if (gx == null) return;
  const wk = Game.wallKind;
  const isOut = function (ax, ay) {
    if (ax < 0 || ay < 0 || ax >= Game.cols || ay >= Game.rows) return true;
    return !!(wk && wk[ay] && wk[ay][ax] === 1);
  };
  const b = Math.max(2, T * .07);
  ctx.fillStyle = 'rgba(24,12,4,.32)';
  if (!isOut(gx, gy - 1)) ctx.fillRect(px, py, T, b);
  if (!isOut(gx, gy + 1)) ctx.fillRect(px, py + T - b, T, b);
  if (!isOut(gx - 1, gy)) ctx.fillRect(px, py, b, T);
  if (!isOut(gx + 1, gy)) ctx.fillRect(px + T - b, py, b, T);
}
'''
src = src[:ia] + NEW_WALL + src[ib:]
print('[ok] drawOuterWall 重寫（同尺寸 + 吃 outer 貼圖）')

# ---------- 2. 插入外牆貼圖：每大關自己的色 + 大塊圓石 + 專屬風化 ----------
ANCHOR = '// ================================================================\n//  烘焙 / 快取 / 貼圖'
NEW_ART = '''// v4.56：外牆專屬貼圖 —— 每大關一張，不跟別的大關共用。
//   色：由該關硬牆基底（THEMES.out）調出來，明度/飽和拉開，跟場內硬牆一眼分得開。
//   形：大塊圓石（2 列 × 2 顆，比硬牆的砌石大一倍）＋ 寬石縫 ＋ 每關自己的風化細節。
const OUTER_DECO = {
  forest: { cap: 'rgba(126,178,96,.62)', sp: ['rgba(96,150,70,.46)', 'rgba(255,255,255,.20)'], moss: 1 },
  sand:   { cap: 'rgba(246,232,196,.94)', sp: ['rgba(255,252,232,.52)', 'rgba(150,116,60,.42)'], dust: 1 },
  ice:    { cap: 'rgba(255,255,255,.96)', sp: ['rgba(200,240,255,.55)', 'rgba(12,44,70,.32)'], icic: 1 },
  lava:   { cap: 'rgba(70,56,92,.92)', sp: ['rgba(255,150,60,.32)', 'rgba(10,4,14,.52)'], glow: 1 },
  neon:   { cap: 'rgba(150,236,255,.86)', sp: ['rgba(190,246,255,.50)', 'rgba(10,6,28,.44)'], strip: 1 },
  sea:    { cap: 'rgba(150,220,220,.58)', sp: ['rgba(90,170,150,.44)', 'rgba(255,255,255,.16)'], weed: 1 },
  sky:    { cap: 'rgba(255,255,255,.94)', sp: ['rgba(232,200,120,.42)', 'rgba(150,170,200,.28)'], trim: 1 },
  dark:   { cap: 'rgba(96,44,70,.90)', sp: ['rgba(255,94,154,.28)', 'rgba(6,2,8,.55)'], spike: 1 }
};
// 把單一底色展開成一套砌石用色（暗面 / 亮面 / 縫）
function outerMat(st) {
  const arr = THEMES.filter(function (x) { return x.style === st; });
  const b = (arr[0] && (arr[0].out || arr[0].hard)) || '#b57a72';
  return { side: shadeHex(b, .58), face1: shadeHex(b, 1.22), face2: b, grout: shadeHex(b, .36) };
}
function paintOuterTile(g, st, S, seed, vi) {
  const c = outerMat(st), d = OUTER_DECO[st] || OUTER_DECO.forest, u = S / 100, V = vi | 0;
  g.clearRect(0, 0, S, S);
  g.fillStyle = c.grout; g.fillRect(0, 0, S, S);
  // 兩列大石，上下列錯半顆 → 砌石感；石塊圓角大、縫寬，跟硬牆的細砌石完全不同
  for (let row = 0; row < 2; row++) {
    const ry = 2 * u + row * 49 * u, rh = 46 * u;
    const sh = (row ? .5 : 0) + (V % 2) * .16;
    for (let k = 0; k < 3; k++) {
      const rx = (k - sh) * 50 * u, rw = 50 * u;
      const n = dhash(seed + row * 5 + k, V, 173);
      const sx = rx + 1.8 * u, sy = ry + 1.4 * u, sw = rw - 3.6 * u, sh2 = rh - 2.8 * u;
      const rr = sh2 * (.36 + n * .12);
      const lg = g.createLinearGradient(rx, ry, rx + rw * .34, ry + rh);
      lg.addColorStop(0, shadeHex(c.face1, .90 + n * .18));
      lg.addColorStop(.52, shadeHex(c.face2, .94 + n * .12));
      lg.addColorStop(1, c.side);
      g.fillStyle = lg; aRR(g, sx, sy, sw, sh2, rr); g.fill();
      // 球面光：頂亮 → 底暗（夾在石頭形狀內），石面兩道細紋
      g.save(); aRR(g, sx, sy, sw, sh2, rr); g.clip();
      const sg = g.createLinearGradient(0, ry, 0, ry + rh);
      sg.addColorStop(0, 'rgba(255,255,255,.28)'); sg.addColorStop(.28, 'rgba(255,255,255,0)');
      sg.addColorStop(.70, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,0,.36)');
      g.fillStyle = sg; g.fillRect(rx, ry, rw, rh);
      g.strokeStyle = 'rgba(0,0,0,.15)'; g.lineWidth = Math.max(1, S * .009);
      for (let q = 0; q < 2; q++) {
        const qy = ry + rh * (.32 + q * .32 + n * .08);
        g.beginPath(); g.moveTo(rx + rw * .14, qy);
        g.lineTo(rx + rw * .46, qy + rh * .055); g.lineTo(rx + rw * .84, qy - rh * .03); g.stroke();
      }
      g.restore();
    }
  }
  // 風化細節（每大關一種，不能互換）
  if (d.moss) aMoss(g, 0, 0, S, S, d.cap, seed, 7);
  else aCap(g, 0, 0, S, S, d.cap, seed, st === 'sky' ? .17 : .14);
  aSpeckles(g, 0, 0, S, S * .42, seed, d.sp, 14, 1, S * .022);
  if (d.dust) {
    g.fillStyle = 'rgba(242,226,182,.42)';
    for (let i = 0; i < 3; i++) {
      g.beginPath(); g.ellipse(S * (.18 + i * .30), S * (.86 + dhash(seed, i, 83) * .07), S * .14, S * .05, 0, 0, 6.283); g.fill();
    }
  }
  if (d.icic) {
    g.fillStyle = 'rgba(228,247,255,.82)';
    for (let i = 0; i < 3; i++) {
      const ix = S * (.14 + i * .32 + dhash(seed, i, 61) * .06), iw = S * .055;
      const il = S * (.10 + dhash(seed, i, 67) * .10);
      g.beginPath(); g.moveTo(ix - iw, S * .17); g.lineTo(ix + iw, S * .17); g.lineTo(ix, S * .17 + il);
      g.closePath(); g.fill();
    }
  }
  if (d.glow) aGlowCracks(g, 0, S * .56, S, S * .44, seed, 'rgba(20,8,6,.60)', 'rgba(255,152,60,.95)', 'rgba(255,110,20,.85)', Math.max(1.1, S * .013), 1);
  if (d.strip) {
    g.fillStyle = 'rgba(160,242,255,.85)'; g.fillRect(S * .10, S * .05, S * .80, Math.max(1.2, S * .022));
    g.fillStyle = 'rgba(200,250,255,.45)'; g.fillRect(S * .10, S * .085, S * .80, Math.max(1, S * .008));
  }
  if (d.weed) {
    g.strokeStyle = 'rgba(64,132,104,.55)'; g.lineWidth = Math.max(1, S * .014);
    for (let i = 0; i < 4; i++) {
      const wx = S * (.12 + i * .24 + dhash(seed, i, 79) * .06);
      g.beginPath(); g.moveTo(wx, S * .99); g.quadraticCurveTo(wx - S * .035, S * .82, wx + S * .02, S * .60); g.stroke();
    }
  }
  if (d.trim) {
    g.fillStyle = 'rgba(232,200,120,.55)'; g.fillRect(0, S * .16, S, Math.max(1.2, S * .014));
  }
  if (d.spike) {
    g.fillStyle = 'rgba(18,6,12,.88)';
    for (let i = 0; i < 3; i++) {
      const px2 = S * (.18 + i * .32), ph = S * (.06 + dhash(seed, i, 71) * .08);
      g.beginPath(); g.moveTo(px2 - S * .05, S * .15); g.lineTo(px2 + S * .05, S * .15);
      g.lineTo(px2, S * .15 - ph); g.closePath(); g.fill();
    }
  }
}

'''
rep(ANCHOR, NEW_ART + ANCHOR, '插入 OUTER_DECO／outerMat／paintOuterTile')

# ---------- 3. 烘焙器接上 outer ----------
rep("const seed = 101 + vi * 977 + (kind === 'hard' ? 7 : kind === 'soft' ? 71 : kind === 'softBig' ? 33 : 13);",
    "const seed = 101 + vi * 977 + (kind === 'hard' ? 7 : kind === 'soft' ? 71 : kind === 'softBig' ? 33 : kind === 'outer' ? 53 : 13);",
    '_artBake seed 加 outer')
rep("    if (kind === 'hard') paintHardTile(g, st, ART_RES, seed, vi);\n    else if (kind === 'soft')",
    "    if (kind === 'hard') paintHardTile(g, st, ART_RES, seed, vi);\n    else if (kind === 'outer') paintOuterTile(g, st, ART_RES, seed, vi);\n    else if (kind === 'soft')",
    '_artBake 受理 outer')
rep("  s = { hard: [], soft: [], softBig: [], floor: [] };\n  for (let i = 0; i < ART_VARIANTS; i++) {\n    s.hard.push(_artBake('hard', st, i));",
    "  s = { hard: [], soft: [], softBig: [], floor: [], outer: [] };\n  for (let i = 0; i < ART_VARIANTS; i++) {\n    s.hard.push(_artBake('hard', st, i));\n    s.outer.push(_artBake('outer', st, i));",
    'artSet 加 outer 圖組')

# ---------- 4. 版本 ----------
rep("const VERSION = '4.55';", "const VERSION = '4.56';", 'VERSION')
rep('<span id="verLogVer">4.55</span>', '<span id="verLogVer">4.56</span>', 'verLogVer')
rep('<div class="ver beta">測試版 v<span id="verTxt">4.55</span></div>',
    '<div class="ver beta">測試版 v<span id="verTxt">4.56</span></div>', 'verTxt')
rep("  { v: '4.55', date: '2026-11-03', now: true, items: [",
    """  { v: '4.56', date: '2026-11-03', now: true, items: [
    '外牆改成「每個大關一套專屬貼圖」：顏色由該關硬牆調出來、造型換成大塊圓石＋寬石縫，跟場內硬牆一眼就分得開（不再八關共用同一張）',
    '每大關的外牆都有自己的風化細節：綠野長苔、沙漠積沙、冰雪掛冰柱、熔岩裂縫發光、霓虹光條、深海水草、天空金邊、暗黑尖刺',
    '外牆尺寸改回與場內硬牆同一個大小（取消 v4.55 的往外擴 10%）' ] },
  { v: '4.55', date: '2026-11-03', items: [""",
    'VERSION_LOG')

# ---------- 5. 瘦身：章節分隔線 64 字 → 8 字（釋放約 3.8K） ----------
before = len(src)
src, n = re.subn(r'(?m)^(\s*)// ={20,}\s*$', r'\1// ====', src)
print('[ok] 分隔線 %d 條縮短（-%d 字）' % (n, before - len(src)))

io.open(P, 'w', encoding='utf-8', newline='\n').write(src)
print('字元 %d → %d（%+d）' % (orig_len, len(src), len(src) - orig_len))
print('位元組 %d' % len(src.encode('utf-8')))
