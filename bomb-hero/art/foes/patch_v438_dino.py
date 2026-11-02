# -*- coding: utf-8 -*-
"""v4.38-1：對戰模式坐騎吐火 —— 判定放寬 ＋ 拿掉「無限護盾」

真兇不是火焰範圍，而是：
  ① 對戰每回合 spawnEggs(3) → AI 一被打掉龍就再吃一顆，永遠有龍擋
  ② breakDino 給 invuln 1.8 秒，而吐火冷卻是 2 秒 → 剛好卡在無敵窗內
  ③ flameCovers 用 floor 分格比對，對手站在格子交界就判到隔壁格
"""
import io, os

PAGE = r'C:\Users\jon84\WorkBuddy\2026-10-30-12-58-54\bomb-hero\index.html'
s = io.open(PAGE, encoding='utf-8', newline='').read().replace('\r\n', '\n')


def sub1(old, new, tag):
    global s
    assert s.count(old) == 1, '%s: count=%d' % (tag, s.count(old))
    s = s.replace(old, new)
    print('ok [%s]' % tag)


# ---------- ① 吐火範圍調回 2 格（v4.36 改成 3 格是誤解需求） ----------
sub1('const DINO_FIRE_RANGE = 3;',
     'const DINO_FIRE_RANGE = 2;   // v4.38：範圍調回 2 格（問題在判定，不在距離）',
     'range-2')

# ---------- ② 火焰覆蓋：座騎火改成幾何圓，不再只看格子索引 ----------
sub1('''// v4.36：火焰是否燒到某個座標（坐騎吐火判定放寬到 0.62 格，避免站在格子邊界時漏判）
function flameCovers(f, px, py, T) {
  if (!f) return false;
  if (f.cx === Math.floor(px / T) && f.cy === Math.floor(py / T)) return true;
  if (f.src !== 'dino') return false;
  const dx = px - (f.cx * T + T / 2), dy = py - (f.cy * T + T / 2);
  return dx * dx + dy * dy < (T * .62) * (T * .62);
}''',
     '''// 火焰是否燒到某個座標
// v4.38：座騎吐火改成「幾何覆蓋」—— 除了同格必中，再用圓形半徑兜住跨格／斜角的情況。
//   舊版只比 floor(px/T)，對手站在格子交界（x 剛好是 T 的整數倍）就會被判到隔壁格，
//   火焰明明燒在身上卻不扣血 → 這就是「面對面吐好幾次都燒不到」的主因。
//   半徑 .74 格可以完整蓋住整格（格中心到角落 = .707 格），視覺上也不會誇張。
//   一般炸彈火維持「格內命中」的嚴格規則，不動手感。
function flameCovers(f, px, py, T) {
  if (!f) return false;
  if (f.cx === Math.floor(px / T) && f.cy === Math.floor(py / T)) return true;
  if (f.src !== 'dino') return false;
  const dx = px - (f.cx * T + T / 2), dy = py - (f.cy * T + T / 2);
  return dx * dx + dy * dy <= (T * .74) * (T * .74);
}''',
     'flamecovers')

# ---------- ③ 對戰模式蛋 3 → 1（避免無限換龍擋刀） ----------
sub1('  if (!Net.on) spawnEggs(3);           // 離線對戰也有恐龍蛋（線上為避免不同步先不開）',
     '  // v4.38：蛋從 3 顆降到 1 顆 —— 3 顆時 AI 被打掉龍就馬上再吃一顆，永遠有龍擋刀，\n'
     '  //   玩家面對面吐火好幾次也殺不掉（線上不同步一律不開蛋）\n'
     '  if (!Net.on) spawnEggs(1);',
     'eggs-1')

# ---------- ④ 龍碎後的無敵 1.8s → 0.7s ----------
sub1('''function breakDino(p) {
  p.dino = false; p.redDragon = false; p.fireCd = 0;
  p.invuln = Math.max(p.invuln, 1.8);''',
     '''function breakDino(p) {
  p.dino = false; p.redDragon = false; p.fireCd = 0;
  // v4.38：無敵 1.8s → 0.7s。龍本身已經擋掉一次傷害了，再給 1.8 秒等於
  //   剛好蓋過吐火冷卻（2 秒）→ 變成「一直有龍就一直打不死」。
  p.invuln = Math.max(p.invuln, .7);''',
     'dino-invuln')

io.open(PAGE, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n'))
print('寫回 index.html')
