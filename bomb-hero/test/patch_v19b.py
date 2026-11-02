# -*- coding: utf-8 -*-
# v1.9 介面：
#   2) 單人闖關：點關卡＝選關，下面給一顆明顯的「▶ 開始遊戲」按鈕
#   4) 標題底下要有深紅色噴發光芒
#   5) 對戰 P2 預設改成 AI
import io

P = 'index.html'
s = io.open(P, encoding='utf-8').read()

def rep(old, new, tag):
    global s
    assert old in s, 'MISS ' + tag
    assert s.count(old) == 1, 'DUP(' + str(s.count(old)) + ') ' + tag
    s = s.replace(old, new)
    print('OK', tag)

# ==================================================================
# 4) 標題包一層 .titlewrap（用來放深紅色放射光芒）
# ==================================================================
rep("""      <h1 class="title-en">BOMB HERO</h1>
      <div class="title-zh">爆爆英雄</div>
""",
"""      <div class="titlewrap">
        <h1 class="title-en">BOMB HERO</h1>
        <div class="title-zh">爆爆英雄</div>
      </div>
""", 'titlewrap HTML')

# ---------- 深色主題：深紅色噴發光芒 ----------
rep("""  .ver.beta { font-size: clamp(9px, 2.4vw, 11.5px); letter-spacing: .16em; opacity: .9; }""",
"""  /* v1.9：標題底下的深紅色噴發光芒（放射狀，會慢慢轉） */
  .titlewrap { position: relative; isolation: isolate; padding: 8px 0 4px; }
  .titlewrap > * { position: relative; z-index: 2; }
  .titlewrap::before, .titlewrap::after {
    content: ''; position: absolute; z-index: 0; pointer-events: none;
    left: 50%; top: 56%;
  }
  .titlewrap::before {
    width: 900px; height: 900px; max-width: 220vw; max-height: 220vw;
    transform: translate(-50%, -50%);
    background: repeating-conic-gradient(from 0deg at 50% 50%,
      rgba(158,6,28,.66) 0deg 3deg, rgba(158,6,28,0) 3deg 10.5deg);
    -webkit-mask-image: radial-gradient(circle at 50% 50%, #000 0 16%, rgba(0,0,0,.72) 40%, rgba(0,0,0,0) 66%);
    mask-image: radial-gradient(circle at 50% 50%, #000 0 16%, rgba(0,0,0,.72) 40%, rgba(0,0,0,0) 66%);
    animation: bh-rays 26s linear infinite;
  }
  .titlewrap::after {
    width: 660px; height: 330px; max-width: 170vw;
    transform: translate(-50%, -50%);
    background: radial-gradient(ellipse at 50% 50%,
      rgba(196,12,32,.60) 0%, rgba(150,6,26,.34) 38%, rgba(120,4,22,0) 72%);
  }
  @keyframes bh-rays {
    from { transform: translate(-50%, -50%) rotate(0deg); }
    to   { transform: translate(-50%, -50%) rotate(360deg); }
  }
  @media (prefers-reduced-motion: reduce) { .titlewrap::before { animation: none; } }
  .ver.beta { font-size: clamp(9px, 2.4vw, 11.5px); letter-spacing: .16em; opacity: .9; }""",
'標題深紅光芒 CSS（深）')

# ---------- 淺色主題：同一組光芒，配色調淡 ----------
rep("""  .title-card .title-zh { color: #b0763f; font-size: clamp(20px, 4.8vw, 36px); letter-spacing: .3em; font-weight: 800; }""",
"""  .title-card .title-zh { color: #b0763f; font-size: clamp(20px, 4.8vw, 36px); letter-spacing: .3em; font-weight: 800; }
  /* v1.9：標題底下的深紅色噴發光芒（米黃底上要壓得淡一點才不髒） */
  .titlewrap { position: relative; isolation: isolate; padding: 8px 0 4px; }
  .titlewrap > * { position: relative; z-index: 2; }
  .titlewrap::before, .titlewrap::after {
    content: ''; position: absolute; z-index: 0; pointer-events: none; left: 50%; top: 56%;
  }
  .titlewrap::before {
    width: 900px; height: 900px; max-width: 220vw; max-height: 220vw;
    transform: translate(-50%, -50%);
    background: repeating-conic-gradient(from 0deg at 50% 50%,
      rgba(178,18,32,.42) 0deg 3deg, rgba(178,18,32,0) 3deg 10.5deg);
    -webkit-mask-image: radial-gradient(circle at 50% 50%, #000 0 16%, rgba(0,0,0,.66) 40%, rgba(0,0,0,0) 66%);
    mask-image: radial-gradient(circle at 50% 50%, #000 0 16%, rgba(0,0,0,.66) 40%, rgba(0,0,0,0) 66%);
    animation: bh-rays 26s linear infinite;
  }
  .titlewrap::after {
    width: 660px; height: 330px; max-width: 170vw;
    transform: translate(-50%, -50%);
    background: radial-gradient(ellipse at 50% 50%,
      rgba(196,26,32,.34) 0%, rgba(160,14,26,.20) 40%, rgba(140,10,24,0) 74%);
  }""",
'標題深紅光芒 CSS（淺）')

# ==================================================================
# 2) 單人闖關：選關 + 明顯的「開始遊戲」按鈕
# ==================================================================
rep("""      <div class="stagegrid" id="stageGrid"></div>
      <div class="backrow">""",
"""      <div class="stagegrid" id="stageGrid"></div>
      <div class="gowrap">
        <button class="biggo" id="btnSoloGo" type="button">
          <span class="gtxt" id="soloGoTxt">▶ 開始遊戲</span>
          <small class="gsub" id="soloGoSub">第 1 關 · 綠野草原</small>
        </button>
        <div class="hint gobote" id="soloGoHint">👆 先點上面選關卡，再按這顆大按鈕出發（同一顆按鈕再點一次也會直接出發）</div>
      </div>
      <div class="backrow">""",
'開始遊戲按鈕 HTML')

# 關卡按鈕「選中」樣式 + 大按鈕
rep("""  .stg.done { border-color: #46d68c; }
""",
"""  .stg.done { border-color: #46d68c; }
  .stg { position: relative; }
  /* v1.9：選中的關卡 */
  .stg.sel {
    border-color: #ff8a3d; background: linear-gradient(180deg, #2a2038, #1b1428);
    box-shadow: 0 0 0 2px rgba(255,138,61,.30), 0 8px 18px -10px rgba(0,0,0,.8);
    transform: translateY(-2px);
  }
  .stg.sel b { color: #ffd166; }
  .stg.sel::after {
    content: '✓'; position: absolute; top: 3px; right: 6px;
    font-size: 12px; color: #ff8a3d;
  }
  /* v1.9：明顯的「開始遊戲」大按鈕 */
  .gowrap { margin: 4px 0 6px; text-align: center; }
  .biggo {
    display: block; width: 100%; cursor: pointer; font-family: inherit;
    padding: 15px 18px; border-radius: 18px; color: #2a1400; font-weight: 900;
    font-size: clamp(20px, 5.2vw, 26px); letter-spacing: .04em;
    background: linear-gradient(180deg, #ffd98a, #ff9a3d 52%, #f4702c);
    border: 2px solid #ffb45f; box-shadow: 0 10px 24px -12px rgba(255,140,60,.9), inset 0 -4px 0 rgba(160,60,10,.35);
    text-shadow: 0 1px 0 rgba(255,255,255,.6);
    animation: bh-go 1.9s ease-in-out infinite;
    transition: transform .12s, filter .12s;
  }
  .biggo:hover { transform: translateY(-2px); filter: brightness(1.06); }
  .biggo:active { transform: translateY(1px); }
  .biggo .gsub {
    display: block; margin-top: 3px; font-size: 13px; font-weight: 800;
    color: #7a3208; text-shadow: none; letter-spacing: .08em;
  }
  .biggo.locked {
    background: linear-gradient(180deg, #3a4560, #2b3350); color: #8f9cba;
    border-color: #46527a; box-shadow: none; animation: none; cursor: not-allowed;
    text-shadow: none;
  }
  .biggo.locked .gsub { color: #7d8db0; }
  @keyframes bh-go {
    0%, 100% { transform: translateY(0) scale(1); }
    50%      { transform: translateY(-3px) scale(1.017); }
  }
  @media (prefers-reduced-motion: reduce) { .biggo { animation: none; } }
  .gobote { margin-top: 8px; }
""", '開始遊戲按鈕 CSS（深）')

rep("""  .stg.done { border-color: #7fc98a; }
  .stg:hover:not(:disabled) { border-color: #f4703c; }""",
"""  .stg.done { border-color: #7fc98a; }
  .stg:hover:not(:disabled) { border-color: #f4703c; }
  .stg.sel {
    border-color: #f4703c; background: linear-gradient(180deg, #fff6e0, #ffe3bf);
    box-shadow: 0 0 0 3px rgba(244,112,60,.20), 0 8px 18px rgba(200,110,40,.25);
    transform: translateY(-2px);
  }
  .biggo {
    background: linear-gradient(180deg, #ffd166, #f4703c 52%, #d94f22);
    border-color: #d9884a; color: #54190a; box-shadow: 0 10px 22px -12px rgba(220,90,30,.7), inset 0 -4px 0 rgba(150,50,10,.28);
  }
  .biggo .gsub { color: #8a3a15; }
  .biggo.locked { background: linear-gradient(180deg, #efe3cf, #e0d0b6); color: #a08a70; border-color: #cfbb9e; }
  .biggo.locked .gsub { color: #9c8a72; }""",
'開始遊戲按鈕 CSS（淺）')

# ---------- JS：Solo 選關邏輯 ----------
rep("""const Solo = {
  unlocked: 1,
  init() {
    try { Solo.unlocked = Math.max(1, parseInt(localStorage.getItem('bombhero-stage') || '1', 10)); } catch (e) {}
    Solo.renderGrid();
    Solo.renderChar();
  },""",
"""const Solo = {
  unlocked: 1,
  sel: 1,                                  // v1.9：目前選到哪一關
  init() {
    try { Solo.unlocked = Math.max(1, parseInt(localStorage.getItem('bombhero-stage') || '1', 10)); } catch (e) {}
    Solo.unlocked = Math.max(1, Math.min(THEMES.length, Solo.unlocked));
    // 預設停在「目前開到最遠的一關」，玩家一眼就知道要打哪一關
    Solo.sel = Math.max(1, Math.min(THEMES.length, Solo.unlocked));
    Solo.renderGrid();
    Solo.renderChar();
  },
  // v1.9：選關（不再一點就直接開打）
  pick(n) {
    Solo.sel = Math.max(1, Math.min(THEMES.length, n));
    Solo.renderGrid();
  },
  go() {
    const n = Solo.sel;
    if (n > Solo.unlocked) { toast('🔒 第 ' + n + ' 關還沒解鎖，先通過前面的關卡！', 1.8); return; }
    startSolo(n);
  },
  // v1.9：明顯的「開始遊戲」大按鈕（隨選到的關卡更新文字）
  renderGo() {
    const btn = $id('btnSoloGo'), txt = $id('soloGoTxt'), sub = $id('soloGoSub');
    if (!btn) return;
    const n = Math.max(1, Math.min(THEMES.length, Solo.sel || 1));
    const th = THEMES[n - 1];
    const lock = n > Solo.unlocked;
    btn.classList.toggle('locked', lock);
    btn.disabled = !!lock;
    if (txt) txt.textContent = lock ? '🔒 尚未解鎖' : '▶ 開始遊戲 · 第 ' + n + ' 關';
    if (sub) sub.textContent = lock ? '先通過前面的關卡才能進來'
      : th.name + (n === THEMES.length ? ' · 👹 暗黑魔王' : '');
  },""",
'Solo 選關邏輯')

rep("""  renderGrid() {
    const g = $id('stageGrid');
    g.innerHTML = '';
    THEMES.forEach(function (th, i) {
      const b = document.createElement('button');
      b.className = 'stg' + (i + 1 < Solo.unlocked ? ' done' : '');
      b.disabled = i + 1 > Solo.unlocked;
      b.innerHTML = '<b>' + (i + 1) + '</b><span>' + th.name + (i === 7 ? ' · 👹' : '') + '</span>';
      b.addEventListener('click', function () { startSolo(i + 1); });
      g.appendChild(b);
    });
  }
};""",
"""  renderGrid() {
    const g = $id('stageGrid');
    if (!g) return;
    g.innerHTML = '';
    THEMES.forEach(function (th, i) {
      const n = i + 1;
      const b = document.createElement('button');
      b.className = 'stg' + (n < Solo.unlocked ? ' done' : '') + (n === Solo.sel ? ' sel' : '');
      b.disabled = n > Solo.unlocked;
      b.setAttribute('data-stage', String(n));
      b.innerHTML = '<b>' + n + '</b><span>' + th.name + (i === THEMES.length - 1 ? ' · 👹' : '') + '</span>';
      b.addEventListener('click', function () {
        AudioSys.sfx('click');
        if (Solo.sel === n) { Solo.go(); return; }   // 再點一次＝直接出發
        Solo.pick(n);
      });
      g.appendChild(b);
    });
    Solo.renderGo();
  }
};""",
'Solo.renderGrid 選關')

# ==================================================================
# 5) 對戰：P2 預設改成 AI（只有 P1 是人類）
# ==================================================================
rep("""        joined: i < 2,
        ch: (pv && typeof pv.ch === 'number') ? pv.ch : i % CHARACTERS.length,
        forceAi: false""",
"""        // v1.9：只有 P1 是人類，P2 起預設交給 AI（想自己玩再點 🤖 切回來）
        joined: i === 0,
        ch: (pv && typeof pv.ch === 'number') ? pv.ch : i % CHARACTERS.length,
        forceAi: i === 1""",
'P2 預設 AI')

rep("""          : i === 1 ? '鍵盤 2（方向鍵 + Enter）'""",
"""          : i === 1 ? '鍵盤 2（方向鍵 + Enter）· 預設 AI'""",
'P2 副標')

# 過關後解鎖下一關 → 同時把「選到的關」推進去
rep("""          Solo.unlocked = cleared + 1;""",
"""          Solo.unlocked = cleared + 1;
          Solo.sel = Math.max(1, Math.min(THEMES.length, Solo.unlocked));""",
'過關後自動選到新關')

io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('bytes', len(s.encode('utf-8')))
