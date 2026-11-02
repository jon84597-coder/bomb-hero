# -*- coding: utf-8 -*-
# v2.9a：對戰／線上玩家卡改右上一橫排（PC 大、手機小）＋ 遊戲中鎖定畫面（拖曳方向鍵不再捲動整頁）
import io, sys

PATH = 'index.html'
src = io.open(PATH, encoding='utf-8').read()
orig = src
fails = []

def rep(old, new, tag, count=1):
    global src
    n = src.count(old)
    if n < count:
        fails.append('%s: 找不到目標（出現 %d 次，需要 %d）\n---\n%s\n---' % (tag, n, count, old[:200]))
        return
    src = src.replace(old, new, count)
    print('OK  ' + tag)

# ---------- 1. 版本號 ----------
rep("const VERSION = '2.8';", "const VERSION = '2.9';", 'VERSION 常數')
rep('<span id="verTxt">2.8</span>', '<span id="verTxt">2.9</span>', 'HTML 版本徽章')

# ---------- 2. HTML：玩家卡橫排容器 ----------
rep("""    <div class="game-top" id="gameTop"></div>
    <div class="game-flex" id="gameFlex">""",
"""    <div class="game-top" id="gameTop"></div>
    <div class="pkrow hide" id="pkRoster"></div>
    <div class="game-flex" id="gameFlex">""",
    'HTML 加入 #pkRoster')

# ---------- 3. CSS：pkrow 樣式（PC 大／手機小）＋ 遊戲中鎖定捲動 ----------
rep("""  .pcard.dead { opacity: .35; filter: grayscale(.7); }""",
"""  .pcard.dead { opacity: .35; filter: grayscale(.7); }
  /* ===== v2.9：對戰／線上玩家卡 → 右上一橫排（取代左右側欄，遊戲畫面左右延伸） ===== */
  .pkrow {
    display: flex; justify-content: flex-end; align-items: stretch; gap: 7px;
    flex-wrap: nowrap; margin: 0 0 6px; padding: 0 2px; min-height: 0;
  }
  .pkrow.hide { display: none; }
  .pkrow .pcard {
    display: flex; align-items: center; gap: 6px; padding: 3px 10px 3px 4px;
    border-radius: 999px; flex: 0 1 auto; min-width: 0;
  }
  .pkrow .pcard canvas { width: 32px; height: 32px; margin: 0; }
  .pkrow .pkinfo { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.25; min-width: 0; }
  .pkrow .plabel { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pkrow .pstars { font-size: 12px; }
  .game-top.battle { justify-content: flex-end; }
  /* PC 空間大 → 玩家卡放大 */
  @media (min-width: 900px) {
    .pkrow .pcard canvas { width: 42px; height: 42px; }
    .pkrow .pcard { padding: 4px 12px 4px 5px; }
    .pkrow .plabel { font-size: 14px; max-width: 150px; }
    .pkrow .pstars { font-size: 13.5px; }
  }
  /* 手機空間小 → 玩家卡自動縮小、一樣一橫排 */
  @media (max-width: 899px) {
    .pkrow { gap: 4px; margin: 0 0 4px; }
    .pkrow .pcard { padding: 2px 7px 2px 3px; gap: 4px; }
    .pkrow .pcard canvas { width: 22px; height: 22px; }
    .pkrow .plabel { font-size: 10px; max-width: 66px; }
    .pkrow .pstars { font-size: 9.5px; }
  }
  /* v2.9：遊戲中整頁禁止捲動（方向鍵／拖曳都不再拉動畫面） */
  body.in-game { overflow: hidden; }""",
    'CSS pkrow + in-game')

# 淺色主題（v1.4）下的 pkrow 卡片外觀
rep("""  .side .pcard { background: #fffaf0; border: 2px solid var(--woodline); }
  .side .pcard .plabel { color: #7b4a1f; font-size: 13px; }
  .side .pcard .pstars { color: #d2691e; }""",
"""  .side .pcard { background: #fffaf0; border: 2px solid var(--woodline); }
  .side .pcard .plabel { color: #7b4a1f; font-size: 13px; }
  .side .pcard .pstars { color: #d2691e; }
  .pkrow .pcard { background: #fffaf0; border: 2px solid var(--woodline); box-shadow: 0 4px 12px -8px rgba(120,80,40,.5); }
  .pkrow .pcard .plabel { color: #7b4a1f; }
  .pkrow .pcard .pstars { color: #d2691e; }""",
    'CSS pkrow 淺色主題')

# ---------- 4. JS：Screen 進遊戲 → body.in-game（鎖整頁捲動） ----------
rep("""    document.querySelector('.wrap').classList.toggle('game', name === 'game');""",
"""    document.querySelector('.wrap').classList.toggle('game', name === 'game');
    document.body.classList.toggle('in-game', name === 'game');   // v2.9：遊戲中鎖定整頁捲動""",
    'Screen body.in-game')

# ---------- 5. JS：拖曳捲動兜底 — 遊戲中不捲整頁（暫停／結算覆蓋層除外） ----------
rep("""function dsFind(node) {
  while (node && node !== document.body) {""",
"""function dsFind(node) {
  // v2.9：遊戲進行中（對戰／線上）鎖定畫面 — 拖曳搖桿／方向鍵不再拉動整頁。
  // （暫停／結算覆蓋層 #ovIn 打開時不受影響，裡面照樣可以捲）
  if (typeof Screen !== 'undefined' && Screen.current === 'game' &&
      !(node && node.nodeType === 1 && node.closest && node.closest('#ovIn'))) {
    return null;
  }
  while (node && node !== document.body) {""",
    'dsFind 遊戲中鎖定')

# ---------- 6. JS：updateHud — 玩家卡改一橫排 ----------
rep("let hudKey = '';", "let hudKey = '';\nlet pkKey = '';   // v2.9：右上橫排玩家卡自己的快取 key", 'pkKey 宣告')

rep("""  const top = $id('gameTop');
  const battle = Game.mode === 'battle';
  $id('sideL').className = 'side' + (battle ? ' show' : '');
  $id('sideR').className = 'side' + (battle ? ' show' : '');""",
"""  const top = $id('gameTop');
  const battle = Game.mode === 'battle';
  top.className = 'game-top' + (battle ? ' battle' : '');
  // v2.9：左右側欄整個收掉 → 遊戲畫面左右延伸；玩家卡改右上一橫排（#pkRoster）
  $id('sideL').className = 'side';
  $id('sideR').className = 'side';
  const pkEl = $id('pkRoster');
  if (pkEl) pkEl.className = 'pkrow' + (battle ? '' : ' hide');""",
    'updateHud 收側欄')

rep("""    const card = function (p) {
      return '<div class="pcard' + (p.alive ? '' : ' dead') + '">' +
        '<span class="plabel" style="color:' + p.ch.color + '">' + pname(p) + (p.ai ? '🤖' : '') + (p.cart ? '🛒' : '') + '</span>' +
        '<canvas class="pav" width="52" height="52" data-ch="' + p.chIdx + '"></canvas>' +
        '<span class="pstars">⭐' + p.wins + '</span></div>';
    };
    const L = $id('sideL'), R = $id('sideR');
    const nPl = Game.players.length;
    const half = Math.ceil(nPl / 2);
    L.className = 'side show' + (nPl > 4 ? ' many' : '');
    R.className = 'side show' + (nPl > 4 ? ' many' : '');
    const lhtml = Game.players.slice(0, half).map(card).join('');
    const rhtml = Game.players.slice(half).map(card).join('');
    if (L.innerHTML !== lhtml) { L.innerHTML = lhtml; drawAvatarsIn(L); }
    if (R.innerHTML !== rhtml) { R.innerHTML = rhtml; drawAvatarsIn(R); }""",
"""    // v2.9：一橫排玩家卡（頭像＋暱稱＋星星）放右上；PC 大、手機自動縮小（CSS media query）
    const card = function (p) {
      return '<div class="pcard' + (p.alive ? '' : ' dead') + '">' +
        '<canvas class="pav" width="52" height="52" data-ch="' + p.chIdx + '"></canvas>' +
        '<span class="pkinfo">' +
        '<span class="plabel" style="color:' + p.ch.color + '">' + pname(p) + (p.ai ? '🤖' : '') + (p.cart ? '🛒' : '') + '</span>' +
        '<span class="pstars">⭐' + p.wins + '</span></span></div>';
    };
    const phtml = Game.players.map(card).join('');
    if (pkEl && pkKey !== phtml) { pkKey = phtml; pkEl.innerHTML = phtml; drawAvatarsIn(pkEl); }""",
    'updateHud 橫排玩家卡')

if fails:
    print('\n FAIL:')
    for f in fails: print(f)
    sys.exit(1)

io.open(PATH, 'w', encoding='utf-8', newline='\n').write(src)
print('\nv2.9a 套完，%d -> %d bytes' % (len(orig.encode('utf-8')), len(src.encode('utf-8'))))
