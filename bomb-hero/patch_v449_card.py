# -*- coding: utf-8 -*-
# v4.49（2/3）：手機教學提示改「可收起的單行窄條」
#   使用者回饋：手機實戰演練時，教學卡佔掉畫面很大一塊。
#   改成：第 1 步給完整卡（要學操作，讀清楚）→ 之後每一步自動收成貼在狀態列下方的
#         一條 44px 窄條（步驟號＋標題＋目標，右邊「⌃」）→ 想看細節點一下就展開。
import io
#   （重跑流程：cp _bak_v449_pre.html index.html → nav → card → tut → ver）

P = 'index.html'
SRC = 'index.html'        # 就地續改（前一支 patch 的產物）
s = io.open(SRC, encoding='utf-8', newline='').read()


def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new, 1)


# ---------------------------------------------------------------
# 1) CSS：窄條樣式
# ---------------------------------------------------------------
rep("""#gameTop.tutglow { outline: 2px solid #ffd166; box-shadow: 0 0 20px rgba(255, 209, 102, .7); }""",
    """#gameTop.tutglow { outline: 2px solid #ffd166; box-shadow: 0 0 20px rgba(255, 209, 102, .7); }
/* v4.49：手機教學提示收成單行窄條 —— 不再吃掉半個畫面 */
#tutMini { display: none; }
/* 特異性要壓過 body.touch #tutCard 的固定 430px */
body.touch #tutCard.mini { padding: 0; left: 8px; right: auto; transform: none;
  width: auto; min-width: 252px; max-width: min(92vw, 520px); }
#tutCard.mini #tutMini { display: flex; align-items: center; gap: 7px; width: 100%;
  min-height: 46px; padding: 7px 11px; background: none; border: 0; font-family: inherit;
  color: #e8eefc; text-align: left; cursor: pointer; }
#tutCard.mini .tc-top, #tutCard.mini #tutTitle, #tutCard.mini #tutBody,
#tutCard.mini #tutGoal, #tutCard.mini .tc-btns, #tutCard.mini #tutDots { display: none !important; }
#tutMiniN { flex: 0 0 auto; font-size: 11.5px; font-weight: 900; color: #ffd166; }
#tutMiniT { flex: 0 0 auto; font-size: 13px; font-weight: 900; }
#tutMiniG { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis;
  white-space: nowrap; font-size: 11.5px; color: #9db0d4; }
#tutMini i { flex: 0 0 auto; font-style: normal; font-size: 12px; font-weight: 900; color: #ffb066; }
#tutFold { display: none; }
body.touch.in-game #tutFold { display: inline-block; }""")

# ---------------------------------------------------------------
# 2) HTML：卡片加「窄條」與「收起」兩顆
# ---------------------------------------------------------------
rep("""<div id="tutCard" role="dialog" aria-live="polite">
  <div class="tc-top"><span id="tutLead"></span><span class="tc-step" id="tutStep"></span><button class="tc-x" id="tutX" type="button" title="結束教學">✕</button></div>""",
    """<div id="tutCard" role="dialog" aria-live="polite">
  <button id="tutMini" type="button" title="展開說明"><b id="tutMiniN"></b><b id="tutMiniT"></b><span id="tutMiniG"></span><i>⌃</i></button>
  <div class="tc-top"><span id="tutLead"></span><span class="tc-step" id="tutStep"></span><button class="tc-x" id="tutFold" type="button" title="收成一行">⌄</button><button class="tc-x" id="tutX" type="button" title="結束教學">✕</button></div>""")

# ---------------------------------------------------------------
# 3) JS：狀態與工具
# ---------------------------------------------------------------
rep("""      let on = false, part = '', i = 0, goal = 0, baseN = 0, flags = {}, doneP = {}, advT = 0, pausedHide = false;""",
    """      let on = false, part = '', i = 0, goal = 0, baseN = 0, flags = {}, doneP = {}, advT = 0, pausedHide = false;
      let compact = false, manualOpen = false;   // v4.49：compact=之後各步收成窄條；manualOpen=這一步使用者已展開""")

rep("""      function idxOf(key) {""",
    """      function isTouchUI() { return document.body.classList.contains('touch'); }
      // 窄條上的一行摘要：步驟號 / 標題（去圈號）/ 目標
      function fillMini(st, n) {
        const total = part === 'home' ? HOME.length : PLAY.length;
        const N = $id('tutMiniN'), T = $id('tutMiniT'), G = $id('tutMiniG');
        if (N) N.textContent = (n + 1) + '/' + total;
        if (T) T.textContent = String(st.t || '').replace(/^[\\u2460-\\u2473]\\s*/, '');
        if (G) G.textContent = st.need || (st.end ? '按▶開始第 1 關' : '照著畫面做就好');
      }
      function idxOf(key) {""")

# 4) paintCard：算出要不要窄條
rep("""        $id('tutCard').classList.add('on');
      }""",
    """        const card = $id('tutCard');
        // v4.49：手機第 1 步給完整卡（要學操作），之後自動收成窄條；
        //   使用者手動展開的這一步保持展開，換下一步再自動收。
        const mini = isTouchUI() && !manualOpen && (compact || (part === 'play' && n > 0));
        card.classList.toggle('mini', mini);
        if (mini) fillMini(st, n);
        card.classList.add('on');
      }""")

# 5) closeCard：清掉窄條與 inline 定位
rep("""        if (c) { c.classList.remove('on'); c.classList.remove('top'); }""",
    """        if (c) { c.classList.remove('on'); c.classList.remove('top'); c.classList.remove('mini'); c.style.top = ''; c.style.bottom = ''; }""")

# 6) showPlay：換步就重置「這一步已展開」
rep("""      function showPlay(n) {
        if (n >= PLAY.length) n = PLAY.length - 1;
        i = n;""",
    """      function showPlay(n) {
        if (n >= PLAY.length) n = PLAY.length - 1;
        i = n;
        manualOpen = false;""")

# 7) applyPos：窄條固定貼狀態列下方
rep("""      function applyPos(st) {
        const c = $id('tutCard');
        if (!c || !st) return;
        let ty = null;""",
    """      function applyPos(st) {
        const c = $id('tutCard');
        if (!c || !st) return;
        if (c.classList.contains('mini')) {
          // 窄條一律貼在狀態列下緣（直放兩排 / 橫放一排都自己算），不擋地圖與搖桿
          const gt = $id('gameTop');
          const b = gt ? gt.getBoundingClientRect().bottom : 56;
          c.classList.remove('top');
          c.style.top = Math.max(4, Math.round(b) + 6) + 'px';
          c.style.bottom = 'auto';
          return;
        }
        c.style.top = ''; c.style.bottom = '';
        let ty = null;""")

# 8) 接線
rep("""        const nx = $id('tutNext'), pv = $id('tutPrev'), x = $id('tutX');""",
    """        const mi = $id('tutMini');
        if (mi) mi.addEventListener('click', function () {
          try { AudioSys.sfx('click'); } catch (e) {}
          manualOpen = true;
          const st = (part === 'home') ? HOME[i] : PLAY[i];
          if (st) { paintCard(st, i); applyPos(st); }
        });
        const fo = $id('tutFold');
        if (fo) fo.addEventListener('click', function () {
          try { AudioSys.sfx('click'); } catch (e) {}
          manualOpen = false; compact = true;
          const st = (part === 'home') ? HOME[i] : PLAY[i];
          if (st) { paintCard(st, i); applyPos(st); }
        });
        const nx = $id('tutNext'), pv = $id('tutPrev'), x = $id('tutX');""")

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('OK  chars %d (limit 3,350,000, left %d)' % (len(s), 3350000 - len(s)))
