# -*- coding: utf-8 -*-
# v3.0：首頁左上角「作者公告欄」
import io, sys
PATH = 'index.html'
src = io.open(PATH, encoding='utf-8').read()

def rep(old, new, n=1):
    global src
    if src.count(old) != n:
        print('FAIL(%d): %s' % (src.count(old), old[:70].replace('\n', '\\n')))
        sys.exit(1)
    src = src.replace(old, new, n)

# ---------- 1) 版本號 ----------
rep("const VERSION = '2.9';", "const VERSION = '3.0';")

# ---------- 2) CSS（插在 v2.8d 的 PC 矮視窗區塊後面） ----------
CSS_ANCHOR = """  /* v2.8c：PC 矮視窗 → 內容改成向上對齊可捲動；說明卡收起來，選單一屏看得到 */
  @media (max-height: 700px) {"""
CSS_NEW = """  /* ================================================================
     v3.0：作者公告欄（首頁左上角背景空白處）
     PC 寬螢幕預設展開；手機／窄螢幕自動收成一顆「📢 作者公告」小膠囊，
     點一下展開（裡面可捲動），再點收起 —— 不佔遊戲畫面空間。
     ================================================================ */
  .annbox {
    position: fixed; z-index: 900;
    left: 10px; top: calc(56px + env(safe-area-inset-top, 0px));
    width: clamp(190px, 17vw, 300px); max-width: calc(100vw - 20px);
    background: rgba(255, 248, 233, .94);
    border: 2px solid var(--woodline, #ecd0ab);
    border-radius: 16px; overflow: hidden;
    box-shadow: 0 10px 26px -14px rgba(120, 80, 40, .55);
  }
  .annbox .annhead {
    display: flex; align-items: center; gap: 6px; width: 100%;
    background: linear-gradient(180deg, #fffdf6, #ffeccd);
    border: 0; border-bottom: 1px solid var(--woodline, #ecd0ab);
    padding: 8px 11px; cursor: pointer; font-family: inherit;
    color: var(--ink, #5b3a1e); font-size: 13px; font-weight: 900; letter-spacing: .06em;
  }
  .annbox.min .annhead { border-bottom: 0; }
  .annbox .annico { font-size: 15px; }
  .annbox .annlabel { flex: 1 1 auto; text-align: left; white-space: nowrap; }
  .annbox .anncaret { font-size: 10px; color: var(--ink-soft, #8a6a4a); }
  .annbox .annbody {
    padding: 10px 13px 12px; color: var(--ink, #5b3a1e);
    font-size: 12.5px; line-height: 1.85;
    max-height: min(52vh, 430px); overflow-y: auto; -webkit-overflow-scrolling: touch;
    user-select: text; -webkit-user-select: text;
  }
  .annbox.min .annbody { display: none; }
  .annbox .annbody p + p { margin-top: 5px; }
  .annbox .annbody b { color: var(--sun, #f4703c); }
  .annbox .annbody a { color: #2f6fd0; font-weight: 800; text-decoration: underline; word-break: break-all; }
  .annbox .annfb { margin-top: 8px; }
  .annbox .annsign { margin-top: 7px; text-align: right; font-weight: 900; color: var(--ink-soft, #8a6a4a); }
  @media (min-width: 1400px) { .annbox { width: clamp(240px, 18vw, 340px); } .annbox .annbody { font-size: 13.5px; } }
  /* 窄螢幕：展開時寬度加大到接近滿版、可上下捲 */
  @media (max-width: 1199px) { .annbox { width: min(320px, calc(100vw - 20px)); } }
  body.touch .annbox { left: 8px; top: calc(48px + env(safe-area-inset-top, 0px)); }
  body.touch .annbox .annbody { font-size: 12px; max-height: 58vh; }
  body.touch .annbox .annhead { font-size: 12px; padding: 7px 10px; }

  /* v2.8c：PC 矮視窗 → 內容改成向上對齊可捲動；說明卡收起來，選單一屏看得到 */
  @media (max-height: 700px) {"""
rep(CSS_ANCHOR, CSS_NEW)

# ---------- 3) HTML（插在 #scr-title 開頭） ----------
HTML_ANCHOR = """  <div class="screen on" id="scr-title">
    <div class="title-card">"""
HTML_NEW = """  <div class="screen on" id="scr-title">
    <!-- v3.0：作者公告欄（左上角；手機預設收起成小膠囊） -->
    <div class="annbox" id="annBox">
      <button class="annhead" id="annHead" type="button" title="點一下展開／收起作者公告">
        <span class="annico">📢</span><span class="annlabel">作者公告</span><span class="anncaret" id="annCaret">▾</span>
      </button>
      <div class="annbody" id="annBody">
        <p>大家好，這是我利用 AI 的方式來研發生成的遊戲，</p>
        <p>主要是可以在電腦 PC 的網頁上遊玩，也可以在手機的網頁上進行遊戲，看各位方便。</p>
        <p>用電腦畫面視野可能會比較好，手機畫面小有些侷限但也方便遊玩。</p>
        <p>目前還在開發測試階段，非營利、單純興趣研究這塊而已，很多東西都還沒完成，還有很多問題要解決。</p>
        <p>大家不嫌棄的話可以玩看看；有遇到任何問題、在遊戲中遇到 BUG，或是有什麼遊戲上的建議，都很歡迎點選右上角的 <b>✉️ 信箱</b> 告知我唷！</p>
        <p>謝謝大家的捧場～～ 祝大家天天開心快樂！</p>
        <p class="annfb">FB 連結：<a href="https://www.facebook.com/jon84597" target="_blank" rel="noopener noreferrer">https://www.facebook.com/jon84597</a></p>
        <p class="annsign">— Jon.</p>
      </div>
    </div>
    <div class="title-card">"""
rep(HTML_ANCHOR, HTML_NEW)

# ---------- 4) JS（插在 updateLangBtn() 之前的那段 IIFE 裡） ----------
JS_ANCHOR = """  updateLangBtn();
  try {
    document.addEventListener('fullscreenchange', updateFullBtn);"""
JS_NEW = """  updateLangBtn();
  // v3.0：作者公告欄（左上角）—— PC 寬螢幕預設展開，手機／窄螢幕收起，點標題開合
  initAnn();
  try {
    document.addEventListener('fullscreenchange', updateFullBtn);"""
rep(JS_ANCHOR, JS_NEW)

# ---------- 5) initAnn / setAnnMin 函式（放在 updateNavUI 之後） ----------
FN_ANCHOR = """function toggleMusic() {"""
FN_NEW = """/* ---- v3.0：作者公告欄（作者的話 + FB 連結） ---- */
const ANN_STORE = 'bombhero.ann.min';
const ANN_URL = 'https://www.facebook.com/jon84597';
function setAnnMin(mn) {
  const b = (typeof $id === 'function') ? $id('annBox') : null;
  if (!b) return;
  b.classList.toggle('min', !!mn);
  const c = $id('annCaret');
  if (c) c.textContent = mn ? '\\u25b8' : '\\u25be';
  try { localStorage.setItem(ANN_STORE, mn ? '1' : '0'); } catch (e) {}
}
function isAnnMin() {
  const b = (typeof $id === 'function') ? $id('annBox') : null;
  return !!(b && b.classList.contains('min'));
}
function toggleAnn() {
  const mn = !isAnnMin();
  setAnnMin(mn);
  try { AudioSys.ensure(); AudioSys.sfx('click'); } catch (e) {}
  return mn;
}
function initAnn() {
  const b = (typeof $id === 'function') ? $id('annBox') : null;
  const h = (typeof $id === 'function') ? $id('annHead') : null;
  if (!b) return;
  if (h && typeof h.addEventListener === 'function') {
    h.addEventListener('click', function (ev) {
      if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
      toggleAnn();
    });
  }
  let saved = null;
  try { saved = localStorage.getItem(ANN_STORE); } catch (e) {}
  if (saved === '1' || saved === '0') { setAnnMin(saved === '1'); return; }
  // 沒存過 → PC 寬螢幕展開，手機／窄螢幕收起
  const narrow = (typeof window !== 'undefined' && window.innerWidth ? window.innerWidth < 1200 : true);
  setAnnMin(!!(IS_TOUCH || narrow));
}

function toggleMusic() {"""
rep(FN_ANCHOR, FN_NEW)

io.open(PATH, 'w', encoding='utf-8', newline='\n').write(src)
print('v3.0 OK')
