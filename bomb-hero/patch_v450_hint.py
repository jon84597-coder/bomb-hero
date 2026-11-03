# -*- coding: utf-8 -*-
"""v4.50：教學提示「點開」暗示 + 手機兩指捏合縮放手勢圖示
   重跑流程：cp _bak_v449_pre.html index.html → nav → card → tut → ver → hint
   （本支就地續改 index.html，可重複執行：找不到 anchor 但新內容已在 → 視為已套用）
"""
import io

P = 'index.html'
s = io.open(P, encoding='utf-8', newline='').read()


def rep(old, new, optional=False):
    global s
    if optional and s.count(old) == 0:
        if new in s:
            return
        raise AssertionError(('optional 但找不到 anchor', old[:90]))
    assert s.count(old) == 1, (s.count(old), old[:100])
    s = s.replace(old, new, 1)


# ============================================================
# 1) CSS
# ============================================================
CSS_ANCHOR = """#tutFold { display: none; }
body.touch.in-game #tutFold { display: inline-block; }"""

CSS_NEW = """#tutFold { display: none; }
body.touch.in-game #tutFold { display: inline-block; }
#tutFold b { font-weight: 900; font-size: 10.5px; margin-left: 2px; opacity: .85; }
/* ===== v4.50：窄條右端「👆 點開」—— 讓玩家知道標題可以按 ===== */
#tutMini .tap { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 3px;
  padding: 3px 7px 3px 5px; border-radius: 999px;
  background: rgba(255,200,90,.16); border: 1px solid rgba(255,200,90,.55);
  color: #ffd166; font-style: normal; animation: tapPulse 1.25s ease-in-out infinite; }
#tutMini .tap span { font-size: 13px; line-height: 1; display: inline-block; }
#tutMini .tap em { font-style: normal; font-size: 11px; font-weight: 900; letter-spacing: .02em; }
#tutMiniT { font-size: 13.5px; }   /* v4.50：標題再清楚一點，縮小後也讀得到 */
@keyframes tapPulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,209,102,.5); }
  55% { transform: scale(1.09); box-shadow: 0 0 0 6px rgba(255,209,102,0); } }
@media (prefers-reduced-motion: reduce) { #tutMini .tap { animation: none; } }
/* 第一次收成窄條時，條本身往上頂兩下，把注意力帶過去 */
body.touch #tutCard.mini.peek { animation: miniPeek .72s ease-out 2; }
@keyframes miniPeek { 0%, 100% { transform: translateY(0); } 40% { transform: translateY(-5px); } }
/* ===== v4.50：手機縮放 —— 兩指捏合手勢圖示 ===== */
#zoomPill .zh { width: 23px; height: 18px; flex: 0 0 auto; display: none; }
body.touch #zoomPill .zh { display: block; }
#zoomHint { position: absolute; left: 50%; top: 38%; transform: translate(-50%, -50%) scale(.9);
  display: none; opacity: 0; z-index: 9; pointer-events: none;
  transition: opacity .3s ease, transform .28s cubic-bezier(.2,.9,.25,1); }
#zoomHint.on { display: block; opacity: 1; pointer-events: auto; cursor: pointer;
  transform: translate(-50%, -50%) scale(1); }
.zhCard { display: flex; flex-direction: column; align-items: center; gap: 7px;
  padding: 13px 20px 12px; border-radius: 16px;
  background: rgba(10,16,30,.84); border: 1px solid rgba(150,190,255,.34);
  box-shadow: 0 10px 30px rgba(0,0,0,.45); }
.zhCard svg { width: 118px; height: 60px; }
.zhCard b { font-size: 13px; font-weight: 900; color: #ffd166; letter-spacing: .02em; }
.zhCard small { font-size: 10.5px; color: #9db0d4; font-weight: 700; }
.zhCard .zf.l { animation: zfL 1.9s ease-in-out infinite; }
.zhCard .zf.r { animation: zfR 1.9s ease-in-out infinite; }
@keyframes zfL { 0%, 100% { transform: translateX(0); } 45% { transform: translateX(13px); } }
@keyframes zfR { 0%, 100% { transform: translateX(0); } 45% { transform: translateX(-13px); } }
@media (prefers-reduced-motion: reduce) {
  .zhCard .zf.l, .zhCard .zf.r { animation: none; } }"""

rep(CSS_ANCHOR, CSS_NEW, optional=True)

# ============================================================
# 2) HTML：窄條右端改成「👆 點開」
# ============================================================
rep('<button id="tutMini" type="button" title="展開說明"><b id="tutMiniN"></b><b id="tutMiniT"></b><span id="tutMiniG"></span><i>⌃</i></button>',
    '<button id="tutMini" type="button" title="展開說明"><b id="tutMiniN"></b><b id="tutMiniT"></b><span id="tutMiniG"></span>'
    '<i class="tap"><span>👆</span><em id="tutMiniTap"></em></i></button>',
    optional=True)

# 收起鍵加文字
rep('<button class="tc-x" id="tutFold" type="button" title="收成一行">⌄</button>',
    '<button class="tc-x" id="tutFold" type="button" title="收成一行">⌄<b id="tutFoldTxt"></b></button>',
    optional=True)

# ============================================================
# 3) HTML：縮放指示加手勢圖 + 新增手勢教學卡
# ============================================================
ZH_SVG = ('<svg class="zh" viewBox="0 0 34 26" aria-hidden="true">'
          '<rect x="1" y="9" width="10" height="8" rx="4" fill="#dbe8ff"/>'
          '<rect x="23" y="9" width="10" height="8" rx="4" fill="#dbe8ff"/>'
          '<path d="M14 13h6" stroke="#ffd166" stroke-width="1.6" stroke-linecap="round"/>'
          '<path d="M14 13l2.2-2.2M14 13l2.2 2.2M20 13l-2.2-2.2M20 13l-2.2 2.2" stroke="#ffd166" '
          'stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>')

rep('<div id="zoomPill" aria-hidden="true"><b id="zoomVal">100%</b><span class="zl">縮放</span></div>',
    '<div id="zoomPill" aria-hidden="true">' + ZH_SVG +
    '<b id="zoomVal">100%</b><span class="zl">縮放</span></div>',
    optional=True)

BIG_SVG = ('<svg viewBox="0 0 118 60" aria-hidden="true">'
           # 左手：手掌 + 短指節 + 大指腹（讀起來是「指尖」不是橫槓）
           '<g class="zf l">'
           '<ellipse cx="6" cy="36" rx="9" ry="12" fill="#8fa6cc" opacity=".32"/>'
           '<rect x="12" y="26" width="17" height="12" rx="6" fill="#c9d8f0"/>'
           '<circle cx="34" cy="32" r="7.6" fill="#eef3ff"/>'
           '<circle cx="34" cy="32" r="3.1" fill="#9db0d4" opacity=".42"/></g>'
           # 右手（鏡像）
           '<g class="zf r">'
           '<ellipse cx="112" cy="36" rx="9" ry="12" fill="#8fa6cc" opacity=".32"/>'
           '<rect x="89" y="26" width="17" height="12" rx="6" fill="#c9d8f0"/>'
           '<circle cx="84" cy="32" r="7.6" fill="#eef3ff"/>'
           '<circle cx="84" cy="32" r="3.1" fill="#9db0d4" opacity=".42"/></g>'
           # 兩指分開／靠近
           '<path d="M45 32h22" stroke="#ffd166" stroke-width="2.2" stroke-linecap="round"/>'
           '<path d="M46 32l4.6-4.2M46 32l4.6 4.2M66 32l-4.6-4.2M66 32l-4.6 4.2" stroke="#ffd166" '
           'stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>')

ZOOMHINT = ('<!-- v4.50：手機第一次實戰 → 教兩指捏合縮放（點一下或 5 秒後收起，只提示一次） -->\n'
            '        <div id="zoomHint" role="button" aria-label="zoom gesture">\n'
            '          <div class="zhCard">' + BIG_SVG +
            '<b id="zhTxt"></b><small id="zhSub"></small></div>\n'
            '        </div>')

rep('<div id="zoomPill" aria-hidden="true">' + ZH_SVG +
    '<b id="zoomVal">100%</b><span class="zl">縮放</span></div>',
    '<div id="zoomPill" aria-hidden="true">' + ZH_SVG +
    '<b id="zoomVal">100%</b><span class="zl">縮放</span></div>\n        ' + ZOOMHINT,
    optional=True)

# ============================================================
# 4) JS：文案 + 顯示邏輯
# ============================================================
# 4a) fillMini 後注入「點開」文案（沿用 Tut 的 JS 注入慣例，維持 i18n 覆蓋率）
rep("""      function fillMini(st, n) {
        const total = part === 'home' ? HOME.length : PLAY.length;
        const N = $id('tutMiniN'), T = $id('tutMiniT'), G = $id('tutMiniG');""",
    """      function fillMini(st, n) {
        const total = part === 'home' ? HOME.length : PLAY.length;
        const N = $id('tutMiniN'), T = $id('tutMiniT'), G = $id('tutMiniG');
        const TP = $id('tutMiniTap');
        if (TP && !TP.textContent) TP.textContent = '點開';   // v4.50：說明標題可按
        const FT = $id('tutFoldTxt');
        if (FT && !FT.textContent) FT.textContent = '收起';   // v4.50：收起鍵加字""",
    optional=True)

# 4b) 第一次收成窄條 → 加 peek 動畫（只做一次，避免每步都抖）
rep("""        card.classList.toggle('mini', mini);
        if (mini) fillMini(st, n);""",
    """        card.classList.toggle('mini', mini);
        if (mini) {
          fillMini(st, n);
          // v4.50：第一次從完整卡收成窄條時，頂兩下把注意力帶到窄條上
          if (!peeked) {
            peeked = true;
            card.classList.remove('peek');
            void card.offsetWidth;               // 強制重排，動畫才會重播
            card.classList.add('peek');
            setTimeout(function () { card.classList.remove('peek'); }, 1600);
          }
        }""",
    optional=True)

rep("      let compact = false, manualOpen = false;",
    "      let compact = false, manualOpen = false, peeked = false;   // v4.50：peeked=窄條提示動畫播過了",
    optional=True)

# 4c) 手機第一次進入實戰 → 捏合縮放提示（定義在主作用域，和 loop 同級）

ZHFN = """  // ===== v4.50：手機第一次實戰 → 教「兩指捏合縮放」 =====
  let _zhDone = false;
  function showZoomHint() {
    const el = $id('zoomHint');
    if (!el) return;
    if (!document.body || !document.body.classList.contains('touch')) return;
    try { if (localStorage.getItem('bombhero-zoomtip') === '1') return; } catch (e) {}
    const t1 = $id('zhTxt'), s1 = $id('zhSub');
    if (t1 && !t1.textContent) t1.textContent = '兩指捏合縮放';
    if (s1 && !s1.textContent) s1.textContent = '縮小看全局，放大看細節';
    let tm = null;
    const kill = function () {
      el.classList.remove('on');
      try { localStorage.setItem('bombhero-zoomtip', '1'); } catch (e) {}
      if (tm) clearTimeout(tm);
    };
    el.addEventListener('click', kill);
    el.classList.add('on');
    tm = setTimeout(kill, 5600);
  }"""

# 插在 let last = 0; 之前（主作用域，與 loop 同級；$id 在 3169 行已是頂層 const）
rep("""// ================================================================
//   主循環
// ================================================================
let last = 0;""",
    ZHFN + """

// ================================================================
//   主循環
// ================================================================
let last = 0;""",
    optional=True)

# 4d) 主迴圈：state 進入 play 的第一帧觸發
rep("""  try { Tut.tick(dt); } catch (e) {}""",
    """  try { Tut.tick(dt); } catch (e) {}
  // v4.50：手機第一次真正開打 → 提示捏合縮放（每台裝置只提示一次）
  if (!_zhDone && Game.state === 'play' && Screen.current === 'game' && !paused) {
    // 教學中不打擾（第 7 步本來就在教縮放），走完教學再提示
    if (typeof Tut === 'undefined' || !Tut.on) {
      _zhDone = true;
      try { showZoomHint(); } catch (e) {}
    }
  }""",
    optional=True)

# ============================================================
# 5) 版本
# ============================================================
rep("const VERSION = '4.49';", "const VERSION = '4.50';", optional=True)
rep('<span id="verLogVer">4.49</span>', '<span id="verLogVer">4.50</span>', optional=True)
rep('<div class="ver beta">測試版 v<span id="verTxt">4.49</span></div>',
    '<div class="ver beta">測試版 v<span id="verTxt">4.50</span></div>', optional=True)

rep("""  { v: '4.49', date: '2026-11-03', now: true, items: [""",
    """  { v: '4.50', date: '2026-11-03', now: true, items: [
    '教學窄條右端多了「👆 點開」：標題可以按開看完整說明，不用再猜',
    '第一次從完整卡收成窄條時會往上頂兩下，把注意力帶到那條提示上',
    '手機縮放加了兩指捏合手勢圖示：第一次實戰自動示範一次，縮放時百分比旁也看得到',
    '教學標題字級調大，展開卡右上「⌄ 收起」補上文字說明',
  ] },
  { v: '4.49', date: '2026-11-03', now: false, items: [""",
    optional=True)

# ============================================================
# 6) 三份 sw.js 一起升
# ============================================================
for sw in ('sw.js', '../public/sw.js', '../bomberman-online/public/sw.js'):
    try:
        t = io.open(sw, encoding='utf-8', newline='').read()
    except IOError:
        print('sw 略過', sw)
        continue
    if "'v4.50.0'" in t:
        print('sw', sw, 'already v4.50.0')
        continue
    assert t.count("'v4.49.0'") == 1, (sw, t.count("'v4.49.0'"))
    io.open(sw, 'w', encoding='utf-8', newline='').write(t.replace("'v4.49.0'", "'v4.50.0'"))
    print('sw', sw, '-> v4.50.0')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('patch v4.50 套用完成，chars', len(s))
