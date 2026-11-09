# -*- coding: utf-8 -*-
"""v5.73 patch I: 3 種行為型補給（透視符 / 煙霧彈 / 傳送卷）"""
import io, os

P = os.path.join(os.path.dirname(__file__), 'bomb-hero', 'js', 'main.js')
s = io.open(P, 'r', encoding='utf-8', newline='').read()
o = len(s)

# ---- 1. 補給表 ----
A1 = """  { id: 'rev1',  ico: '💖', n: '復活幣',   price: 1200, desc: '陣亡時原地復活一次（半血）', buff: { revive: 1 } }
];"""
B1 = """  { id: 'rev1',  ico: '\\uD83D\\uDC96', n: '復活幣',   price: 1200, desc: '陣亡時原地復活一次（半血）', buff: { revive: 1 } },
  /* v5.73：行為型補給 —— 前三種補給全是數值（+血 +甲 +火），換了也不會改變打法。
     這三種改的是「資訊」「資訊不對稱」「退路」，才是真的換一種玩法。 */
  { id: 'xray',  ico: '\\uD83D\\uDD0D', n: '透視符',   price: 800,  desc: '本關前 30 秒，牆後的道具與金幣會透出輪廓', buff: { xray: 1 } },
  { id: 'smoke', ico: '\\uD83D\\uDCA8', n: '煙霧彈',   price: 600,  desc: '開場 10 秒怪物看不到你 —— 可以大膽衝過怪群', buff: { smoke: 1 } },
  { id: 'warp',  ico: '\\uD83C\\uDF00', n: '傳送卷',   price: 900,  desc: '陣亡時自動傳回起點並復活（半血，每張一次）', buff: { warp: 1 } }
];"""
assert s.count(A1) == 1, 'A1 %d' % s.count(A1)
s = s.replace(A1, B1)

# ---- 2. rpgTakeBag 預設欄位 ----
A2 = """  const out = { hp: 0, def: 0, fire: 0, bomb: 0, remote: 0, revive: 0, used: {} };"""
B2 = """  const out = { hp: 0, def: 0, fire: 0, bomb: 0, remote: 0, revive: 0, xray: 0, smoke: 0, warp: 0, used: {} };"""
assert s.count(A2) == 1, 'A2 %d' % s.count(A2)
s = s.replace(A2, B2)

# ---- 3. startRpg 套用 ----
A3 = """  p.revive = Math.max(0, bf.revive | 0);             // 補給：復活幣"""
B3 = """  p.revive = Math.max(0, bf.revive | 0);             // 補給：復活幣
  /* v5.73：行為型補給 */
  p.xrayT = Math.max(0, (bf.xray | 0) * 30);         // 透視符：本關前 30 秒
  p.smokeT = Math.max(0, (bf.smoke | 0) * 10);       // 煙霧彈：開場 10 秒不會被盯上
  p.warpBack = Math.max(0, bf.warp | 0);             // 傳送卷：陣亡回起點"""
assert s.count(A3) == 1, 'A3 %d' % s.count(A3)
s = s.replace(A3, B3)

# ---- 4. playerHiding 吃煙霧 ----
A4 = """function playerHiding(p) {
  if (!p || !p.alive || p.dino) return false;"""
B4 = """function playerHiding(p) {
  if (!p || !p.alive || p.dino) return false;
  if ((p.smokeT | 0) > 0) return true;          // v5.73：煙霧彈（怪物完全看不到）"""
assert s.count(A4) == 1, 'A4 %d' % s.count(A4)
s = s.replace(A4, B4)

# ---- 5. 計時遞減（updateWorld 開頭）----
A5 = """function updateWorld(dt) {"""
B5 = """function updateWorld(dt) {
  /* v5.73：行為型補給的時效（放在最前面，暫停時不會偷跑） */
  try {
    const me = Game.players && Game.players[0];
    if (me) {
      if ((me.xrayT | 0) > 0) me.xrayT = Math.max(0, me.xrayT - dt);
      if ((me.smokeT | 0) > 0) me.smokeT = Math.max(0, me.smokeT - dt);
    }
  } catch (e) {}"""
assert s.count(A5) == 1, 'A5 %d' % s.count(A5)
s = s.replace(A5, B5)

# ---- 6. 傳送卷：陣亡回起點 ----
A6 = """  if (p.hpCur <= 0) {                                // 生命歸零 → 冒險失敗"""
B6 = """  if (p.hpCur <= 0 && (p.warpBack | 0) > 0) {
    /* v5.73：傳送卷 —— 比復活幣弱（會離開現場），但能救回一條命 */
    p.warpBack = (p.warpBack | 0) - 1;
    const sc = Game.spawnCell || { x: 1, y: 1 };
    p.x = (sc.x + .5) * Game.T; p.y = (sc.y + .5) * Game.T;
    p.hpCur = Math.max(1, Math.ceil(p.hpMax / 2));
    p.invuln = 2.5; p.camSnap = true;
    Game.hurtCount = (Game.hurtCount | 0) + 1;
    burst(p.x, p.y, '#b9a6ff', 28, 260);
    Game.flash = Math.max(Game.flash || 0, .3);
    try { toast('🌀 傳送卷生效 —— 回到起點（半血）', 2.4); } catch (e) {}
    try { AudioSys.sfx('item'); } catch (e) {}
    return;
  }
  if (p.hpCur <= 0) {                                // 生命歸零 → 冒險失敗"""
assert s.count(A6) == 1, 'A6 %d' % s.count(A6)
s = s.replace(A6, B6)

assert s.count('\r\n') == 0, 'CRLF!'
tmp = P + '.tmp'
io.open(tmp, 'w', encoding='utf-8', newline='\n').write(s)
os.replace(tmp, P)
print('OK', o, '->', len(s))
