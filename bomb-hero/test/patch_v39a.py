# -*- coding: utf-8 -*-
"""
v3.9-a：手機觸控按鈕改用「遊戲裡的真實美術圖」＋精美圓框
  1. HTML：💥/🧨/🔥 三個表情符號換成按鈕內的小畫布（<canvas class="ticon">）
  2. CSS ：三層同心金屬圓框（盤面 / 金屬環 / 深色外圈）＋外緣細白線＋上緣玻璃反光
  3. JS  ：paintTouchIcons() 直接呼叫 drawBombOn / drawFlameOn 畫出炸彈／遙控彈／火焰
  4. 版本：3.8 → 3.9
保留 CRLF、以 UTF-8 讀寫。
"""
import io, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, 'index.html')

raw = open(P, 'rb').read()
EOL = b'\r\n' if b'\r\n' in raw else b'\n'
s = raw.decode('utf-8')


def sub(old, new, tag, count=1):
    """old/new 用 \n 撰寫，寫回時還原成檔案原本的換行符"""
    o = old.replace('\n', EOL.decode())
    n = new.replace('\n', EOL.decode())
    if s.count(o) != count:
        print('  !! %s：找不到（實際出現 %d 次，預期 %d）' % (tag, s.count(o), count))
        sys.exit(1)
    globals()['s'] = s.replace(o, n, count)
    print('  ok %s' % tag)


# ============================================================
# 1. CSS：精美圓框
# ============================================================
OLD_CSS = """  #touchUI .tbtn {
    position: absolute; pointer-events: auto; display: flex; align-items: center; justify-content: center;
    background: rgba(14,22,40,.55); border: 2px solid rgba(150,190,255,.42); border-radius: 50%;
    color: #dbe8ff; font-size: 20px; font-weight: 900; user-select: none; -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent; touch-action: none; backdrop-filter: blur(2px);
  }
  #touchUI .tbtn.on { background: rgba(110,170,255,.62); border-color: #cfe4ff; }
  #touchUI .tact {
    left: var(--act-left); right: var(--act-right); bottom: 26px; width: 92px; height: 92px; font-size: 30px;
    background: rgba(255,138,61,.35); border-color: rgba(255,190,140,.7);
    transform: scale(var(--tscale)); transform-origin: var(--act-origin);
  }
  #touchUI .tact.on { background: rgba(255,138,61,.7); transform: scale(calc(var(--tscale) * .94)); }
  #touchUI .tpause { right: 16px; top: 12px; width: 46px; height: 46px; font-size: 17px; }
  #touchUI .tfs { right: 16px; top: 64px; width: 44px; height: 44px; font-size: 15px; }
  /* 遙控引爆（E）／恐龍吐火（F）：小按鈕，排在放彈鍵上方 */
  #touchUI .tdet, #touchUI .tfire {
    width: 62px; height: 62px; font-size: 22px; opacity: .92;
    transform: scale(var(--tscale)); transform-origin: var(--act-origin);
  }
  #touchUI .tdet {
    left: var(--act-left); right: var(--act-right); bottom: 126px;
    background: rgba(94,224,255,.26); border-color: rgba(148,235,255,.7);
  }
  #touchUI .tdet.on { background: rgba(94,224,255,.7); }
  /* v2.6：坐騎招式（\U0001F525）改排在「遙控引爆」的左邊 —— 原本疊在遙控引爆上方，
     橫式畫面比較矮時會跟右上角的 ⛶ 全視窗鈕撞在一起（按不到）。 */
  #touchUI .tfire {
    left: var(--act-left2); right: var(--act-right2); bottom: 126px;
    background: rgba(255,86,48,.26); border-color: rgba(255,160,120,.72);
  }
  #touchUI .tfire.on { background: rgba(255,86,48,.72); }
"""

NEW_CSS = """  /* v3.9：按鈕改成「內嵌小畫布畫真實美術圖」＋三層同心金屬圓框 */
  #touchUI .tbtn {
    position: absolute; pointer-events: auto; display: flex; align-items: center; justify-content: center;
    border-radius: 50%; border: 0;
    color: #dbe8ff; font-size: 20px; font-weight: 900; user-select: none; -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent; touch-action: none;
    /* 圓框①：盤面 → 金屬環 → 深色外圈（像遊戲裡的金屬鑲框） */
    background:
      radial-gradient(circle at 50% 50%,
        var(--tb-face) 0%, var(--tb-face) 63%,
        var(--tb-ring) 64%, var(--tb-ring) 82%,
        rgba(9,13,24,.82) 83%, rgba(9,13,24,.82) 100%);
    /* 圓框②：外緣細白線 ＋ 金屬厚邊 ＋ 光暈 ＋ 落下陰影 ＋ 內凹立體感 */
    box-shadow:
      0 0 0 1.5px rgba(255,255,255,.36),
      0 0 0 4.5px var(--tb-edge),
      0 0 18px -2px var(--tb-glow),
      0 12px 22px -10px rgba(0,0,0,.92),
      inset 0 -8px 16px rgba(0,0,0,.46),
      inset 0 6px 12px rgba(255,255,255,.16);
    --tb-face: rgba(22,32,56,.62);
    --tb-ring: rgba(126,164,224,.52);
    --tb-edge: rgba(72,98,152,.62);
    --tb-glow: rgba(120,170,255,.34);
  }
  #touchUI .tbtn::before {          /* 圓框③：內圈細線，把圖示「框」起來 */
    content: ''; position: absolute; inset: 15%; border-radius: 50%;
    border: 1px solid rgba(255,255,255,.22); pointer-events: none;
  }
  #touchUI .tbtn::after {           /* 圓框④：上緣玻璃反光 */
    content: ''; position: absolute; left: 20%; right: 20%; top: 6%; height: 30%;
    border-radius: 50%; background: linear-gradient(rgba(255,255,255,.42), rgba(255,255,255,0));
    filter: blur(1.5px); pointer-events: none;
  }
  #touchUI .tbtn.on { --tb-face: var(--tb-hi, rgba(110,170,255,.72)); filter: brightness(1.12); }
  /* 圖示畫布：填滿鈕面，不吃掉觸控事件（事件給外層 .tbtn） */
  #touchUI .ticon {
    position: relative; z-index: 1; display: block;
    width: 100%; height: 100%; pointer-events: none;
  }
  #touchUI .tact {
    left: var(--act-left); right: var(--act-right); bottom: 26px; width: 92px; height: 92px;
    --tb-face: rgba(74,34,14,.64);
    --tb-ring: rgba(255,186,120,.62);
    --tb-edge: rgba(190,104,42,.72);
    --tb-glow: rgba(255,152,60,.44);
    --tb-hi: rgba(255,138,61,.80);
    transform: scale(var(--tscale)); transform-origin: var(--act-origin);
  }
  #touchUI .tact.on { transform: scale(calc(var(--tscale) * .94)); }
  #touchUI .tpause { right: 16px; top: 12px; width: 46px; height: 46px; font-size: 17px; }
  #touchUI .tfs { right: 16px; top: 64px; width: 44px; height: 44px; font-size: 15px; }
  /* 遙控引爆（E）／恐龍吐火（F）：小按鈕，排在放彈鍵上方 */
  #touchUI .tdet, #touchUI .tfire {
    width: 62px; height: 62px; opacity: .94;
    transform: scale(var(--tscale)); transform-origin: var(--act-origin);
  }
  #touchUI .tdet {
    left: var(--act-left); right: var(--act-right); bottom: 126px;
    --tb-face: rgba(8,38,50,.64);
    --tb-ring: rgba(150,235,255,.60);
    --tb-edge: rgba(56,150,178,.72);
    --tb-glow: rgba(94,224,255,.42);
    --tb-hi: rgba(94,224,255,.76);
  }
  /* v2.6：坐騎招式（\U0001F525）改排在「遙控引爆」的左邊 —— 原本疊在遙控引爆上方，
     橫式畫面比較矮時會跟右上角的 ⛶ 全視窗鈕撞在一起（按不到）。 */
  #touchUI .tfire {
    left: var(--act-left2); right: var(--act-right2); bottom: 126px;
    --tb-face: rgba(62,16,8,.64);
    --tb-ring: rgba(255,168,130,.62);
    --tb-edge: rgba(186,66,34,.72);
    --tb-glow: rgba(255,86,48,.44);
    --tb-hi: rgba(255,86,48,.78);
  }
"""
sub(OLD_CSS, NEW_CSS, 'CSS：按鈕圓框')

# ============================================================
# 2. HTML：表情符號 → 小畫布
# ============================================================
OLD_HTML = """          <div class="tbtn tact" data-t="action">\U0001F4A5</div>
          <div class="tbtn tdet" data-t="det" title="遙控引爆">\U0001F9E8</div>
          <div class="tbtn tfire hide" data-t="fire" title="恐龍吐火">\U0001F525</div>
"""
NEW_HTML = """          <div class="tbtn tact" data-t="action" title="放炸彈"><canvas class="ticon" data-icon="bomb"></canvas></div>
          <div class="tbtn tdet" data-t="det" title="遙控引爆"><canvas class="ticon" data-icon="remote"></canvas></div>
          <div class="tbtn tfire hide" data-t="fire" title="恐龍吐火"><canvas class="ticon" data-icon="flame"></canvas></div>
"""
sub(OLD_HTML, NEW_HTML, 'HTML：按鈕圖示畫布')

# ============================================================
# 3. JS：paintTouchIcons()
# ============================================================
OLD_JS = """function applyTouchLayout() {
  const ui = $id('touchUI');
  if (!ui || !ui.style) return;"""
NEW_JS = """// v3.9：手機按鈕上的圖示 —— 直接重用場上的炸彈／火焰美術（同一套函式，絕不跑版）
//   bomb  ：黑亮圓球炸彈，引線已點燃（armed=true）
//   remote：同一顆炸彈，但插著青色 LED 遙控面板、引線只剩暗紅餘燼（armed=false）
//   flame ：四層水滴火舌（drawFlame 吃「格子座標」，所以餵一個假的 flame 物件）
const TICON_BASE = { bomb: 92, remote: 62, flame: 62 };
let iconT = 0;                                  // 圖示自己的時鐘（選單裡也會動）
function paintTouchIcons(dt) {
  const saved = Game.gameT;
  try {
    if (dt) iconT += dt;
    Game.gameT = iconT;                         // 火苗／LED 的抖動都看這個值
    const sc = (settings.tpad && parseFloat(settings.tpad.size)) || 1;
    const dpr = Math.min(3, (window.devicePixelRatio || 1));
    const list = [
      { el: document.querySelector('#touchUI .tact canvas'), kind: 'bomb' },
      { el: document.querySelector('#touchUI .tdet canvas'), kind: 'remote' },
      { el: document.querySelector('#touchUI .tfire canvas'), kind: 'flame' }
    ];
    list.forEach(function (it) {
      const cv = it.el;
      if (!cv || !cv.getContext) return;
      const cssW = Math.round(TICON_BASE[it.kind] * sc);
      const bw = Math.max(8, Math.round(cssW * dpr));
      if (cv.width !== bw) { cv.width = bw; cv.height = bw; }
      const g = cv.getContext('2d');
      if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, cssW, cssW);
      if (it.kind === 'flame') {
        // 火焰：把「一格」縮到鈕面大小，再把格心搬到畫布正中央
        const T = cssW * .76;
        g.translate(cssW / 2 - T / 2, cssW / 2 - T / 2 + T * .05);
        drawFlameOn(g, { cx: 0, cy: 0, t: .30, dir: null, owner: 0 }, T);
        return;
      }
      // 炸彈：球體半徑 r，引線往上伸 1.5r（含火花）→ 整顆圖往下壓 0.5r 才會視覺置中
      const r = cssW * (it.kind === 'bomb' ? .28 : .27);
      g.translate(cssW / 2, cssW / 2 + r * .48);
      drawBombOn(g, r, it.kind === 'bomb' ? 3 : 7, false, it.kind === 'bomb', it.kind === 'remote');
    });
  } catch (e) { /* 畫圖失敗不影響操作 */ }
  finally { Game.gameT = saved; }
}
function applyTouchLayout() {
  const ui = $id('touchUI');
  if (!ui || !ui.style) return;"""
sub(OLD_JS, NEW_JS, 'JS：paintTouchIcons()')

# ============================================================
# 4. applyTouchLayout 結尾補一次重繪（改大小／換邊時立刻跟上）
# ============================================================
OLD_TAIL = """      (settings.tpad.size < 1 ? '小' : settings.tpad.size > 1 ? '大' : '中') + '</b>。這些按鈕只在「手機觸控」模式顯示。';
  }
}"""
NEW_TAIL = """      (settings.tpad.size < 1 ? '小' : settings.tpad.size > 1 ? '大' : '中') + '</b>。這些按鈕只在「手機觸控」模式顯示。';
  }
  try { paintTouchIcons(0); } catch (e) {}      // v3.9：尺寸／位置一改就重畫圖示
}"""
sub(OLD_TAIL, NEW_TAIL, 'JS：applyTouchLayout 重繪')

# ============================================================
# 5. 主循環：20fps 更新圖示（火苗會抖、LED 會跑）
# ============================================================
OLD_LOOP = """  Input.framePads();                       // 手把整幀快照（遊戲與選單共用）
  Pad.tick();                              // 自動判斷鍵盤／手把"""
NEW_LOOP = """  Input.framePads();                       // 手把整幀快照（遊戲與選單共用）
  // v3.9：手機按鈕圖示（炸彈火苗／遙控 LED）跟著時間動；20fps 就夠，省電
  if (document.body && document.body.classList.contains('touch')) {
    Game._iconT = (Game._iconT || 0) + dt;
    if (Game._iconT >= .05) { paintTouchIcons(Game._iconT); Game._iconT = 0; }
  }
  Pad.tick();                              // 自動判斷鍵盤／手把"""
sub(OLD_LOOP, NEW_LOOP, 'JS：主循環更新圖示')

# ============================================================
# 6. __BH 導出（目檢／測試用）
# ============================================================
OLD_EXP = """  drawBombOn: drawBombOn, drawFlameOn: drawFlameOn,"""
NEW_EXP = """  drawBombOn: drawBombOn, drawFlameOn: drawFlameOn, paintTouchIcons: paintTouchIcons, TICON_BASE: TICON_BASE,"""
sub(OLD_EXP, NEW_EXP, 'JS：__BH 導出')

# ============================================================
# 7. 版本號 3.8 → 3.9
# ============================================================
OLD_VER = """// v3.8：炸彈／遙控彈／火焰外型精緻化、台詞更新、對戰勝利過場延長＋獲勝音樂、
//       第二關配色改善；瀏覽人數／按讚功能依使用者要求整組移除（前端＋後端）
const VERSION = '3.8';"""
NEW_VER = """// v3.8：炸彈／遙控彈／火焰外型精緻化、台詞更新、對戰勝利過場延長＋獲勝音樂、
//       第二關配色改善；瀏覽人數／按讚功能依使用者要求整組移除（前端＋後端）
// v3.9：手機觸控按鈕圖示換成場上的真實美術（黑亮圓球炸彈／遙控 LED 彈／四層水滴火焰），
//       外加三層同心金屬圓框（盤面＋金屬環＋深色外圈、外緣細白線、上緣玻璃反光）
const VERSION = '3.9';"""
sub(OLD_VER, NEW_VER, '版本號 3.9')

open(P, 'wb').write(s.encode('utf-8'))
print('\n[patch_v39a] 完成，寫回 ' + str(len(s.encode('utf-8'))) + ' bytes')
