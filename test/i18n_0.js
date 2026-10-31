/* ===== v2.7 多語言核心 ===== */
const LANG_STORE = 'bombhero-lang';
let LANG = 'zh-TW';
try { const _ls = localStorage.getItem(LANG_STORE); if (_ls && I18N[_ls]) LANG = _ls; } catch (e) {}

// 反查表：繁中原文 → key（讓舊的中文常值也能自動翻譯）
const SRC2KEY = (function () {
  const m = Object.create(null);
  const base = I18N['zh-TW'] || {};
  for (const k in base) { const v = base[k]; if (typeof v === 'string' && v) m[v] = k; }
  return m;
})();

// 取翻譯；v 是 {name:'...'} 形式的插值參數
function t(key, v) {
  const d = I18N[LANG] || I18N['zh-TW'];
  let s = (d && d[key] != null) ? d[key] : ((I18N['zh-TW'] && I18N['zh-TW'][key]) != null ? I18N['zh-TW'][key] : key);
  if (v) { for (const p in v) s = String(s).split('{' + p + '}').join(v[p]); }
  return s;
}
// 把「繁中原文」翻成現在的語言（查不到就原樣回傳）
function tr(src) {
  if (!src || typeof src !== 'string' || LANG === 'zh-TW') return src;
  const k = SRC2KEY[src];
  return k ? t(k) : src;
}
function langMeta(id) {
  for (let i = 0; i < LANGS.length; i++) if (LANGS[i].id === id) return LANGS[i];
  return LANGS[0];
}
function langLabel(id) { const L = langMeta(id); return L.flag + ' ' + L.label; }

/* ---- 靜態 HTML 文字：記住原文一次，之後照語言重寫 ---- */
const I18N_TXT = new WeakMap();
let _i18nCaptured = false;
function captureI18N() {
  if (_i18nCaptured) return;
  _i18nCaptured = true;
  try {
    if (typeof document.createTreeWalker !== 'function') return;
    const wk = document.createTreeWalker(document.body, 4, null, false);
    let n;
    while ((n = wk.nextNode())) { if (n.nodeValue && n.nodeValue.trim()) I18N_TXT.set(n, n.nodeValue); }
    const els = document.body.querySelectorAll('[title],[placeholder]');
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      if (el.title && typeof el.setAttribute === 'function') el.setAttribute('data-i18n-title', el.title);
      if (el.placeholder && typeof el.setAttribute === 'function') el.setAttribute('data-i18n-ph', el.placeholder);
    }
  } catch (e) {}
}
function applyI18N() {
  try {
    if (typeof document.createTreeWalker === 'function') {
      const wk = document.createTreeWalker(document.body, 4, null, false);
      let n;
      while ((n = wk.nextNode())) {
        const src = I18N_TXT.get(n);
        if (src == null) continue;
        const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(src);
        const out = (m ? m[1] : '') + tr(m ? m[2] : src) + (m ? m[3] : '');
        if (out !== n.nodeValue) n.nodeValue = out;
      }
    }
    const els = document.body.querySelectorAll('[data-i18n-title],[data-i18n-ph]');
    for (let i = 0; i < els.length; i++) {
      const el = els[i], a = el.getAttribute('data-i18n-title'), b = el.getAttribute('data-i18n-ph');
      if (a && typeof el.title === 'string') el.title = tr(a);
      if (b && typeof el.placeholder === 'string') el.placeholder = tr(b);
    }
  } catch (e) {}
}
// 重畫所有「由 JS 產生」的動態畫面，讓新語言立刻生效
function refreshI18NUI() {
  try { if (typeof Solo !== 'undefined' && Solo && Solo.renderGrid) { Solo.renderGrid(); Solo.renderChar(); Solo.renderGo(); } } catch (e) {}
  try { if (typeof Battle !== 'undefined' && Battle && Battle.renderSlots) Battle.renderSlots(); } catch (e) {}
  try { if (typeof updateCountHint === 'function') updateCountHint(); } catch (e) {}
  try { if (typeof updateAiHint === 'function') updateAiHint(); } catch (e) {}
  try { if (typeof updateHud === 'function') updateHud(); } catch (e) {}
  try { if (typeof applyCtrl === 'function') applyCtrl(); } catch (e) {}
  try { if (typeof updateFullBtn === 'function') updateFullBtn(); } catch (e) {}
  try { if (typeof updateNavUI === 'function') updateNavUI(); } catch (e) {}
}
function updateLangBtn() {
  const el = typeof $id === 'function' ? $id('btnLang') : null;
  if (!el) return;
  const L = langMeta(LANG);
  const lb = el.querySelector('b');
  if (lb) lb.textContent = L.label;
  el.title = t('nav.langTip');
  el.classList.remove('tg', 'on');
  el.classList.add('tg');
}
function renderLangMenu() {
  const list = typeof $id === 'function' ? $id('langList') : null;
  if (!list || typeof document.createElement !== 'function') return;
  list.innerHTML = '';
  const tt = typeof $id === 'function' ? $id('langMenuTitle') : null;
  if (tt) tt.textContent = t('nav.langTitle');
  LANGS.forEach(function (L) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'lmbtn' + (L.id === LANG ? ' on' : '');
    b.setAttribute('data-lang', L.id);
    b.textContent = L.flag + '  ' + L.label;
    b.addEventListener('click', function () {
      if (typeof AudioSys !== 'undefined' && AudioSys && AudioSys.sfx) { try { AudioSys.sfx('click'); } catch (e) {} }
      setLang(L.id);
      closeLangMenu();
    });
    list.appendChild(b);
  });
}
function openLangMenu() {
  renderLangMenu();
  const m = typeof $id === 'function' ? $id('langMenu') : null;
  if (m) m.classList.remove('hide');
}
function closeLangMenu() {
  const m = typeof $id === 'function' ? $id('langMenu') : null;
  if (m) m.classList.add('hide');
}
function toggleLangMenu() {
  const m = typeof $id === 'function' ? $id('langMenu') : null;
  if (!m) return;
  if (m.classList.contains('hide')) openLangMenu(); else closeLangMenu();
}
function setLang(id, silent) {
  if (!I18N[id]) id = 'zh-TW';
  LANG = id;
  try { localStorage.setItem(LANG_STORE, id); } catch (e) {}
  try { document.documentElement.setAttribute('lang', id); } catch (e) {}
  applyI18N();
  updateLangBtn();
  refreshI18NUI();
  if (!silent) { try { toast(t('lang.saved', { name: langLabel(id) }), 1.8); } catch (e) {} }
}
captureI18N();

/* ---- 名稱類輔助（道具／關卡／角色都跟著語言變） ---- */
function itemName(type) { return (ITEMS[type] && I18N[LANG] && I18N[LANG]['item.' + type + '.name']) || (ITEMS[type] ? ITEMS[type].name : type); }
function itemHint(type) { return (ITEMS[type] && I18N[LANG] && I18N[LANG]['item.' + type + '.hint']) || (ITEMS[type] ? ITEMS[type].hint : ''); }
function themeName(i) { const k = 'theme.' + (i + 1); return (I18N[LANG] && I18N[LANG][k]) || ((THEMES[i] && THEMES[i].name) || ''); }
function charName(ch) { if (!ch) return ''; const k = 'char.' + ch.id; return I18N[LANG] && I18N[LANG][k] ? I18N[LANG][k] : ch.name; }
function charTag(ch) { if (!ch) return ''; const k = 'tag.' + ch.id; return I18N[LANG] && I18N[LANG][k] ? I18N[LANG][k] : ch.tag; }
