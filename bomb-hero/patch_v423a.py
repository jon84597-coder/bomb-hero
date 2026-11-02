# -*- coding: utf-8 -*-
"""
v4.23 patch A：開機防護
1. pwaBoot 階段建立全域錯誤收集器（即使主腳本中斷也還在）
2. 主腳本加入 __bootFail / __stubModule
3. 每個頂層模組 IIFE 包 try/catch（用內層 function 包住，保留函式提升）
4. spawnPets 等處的 typeof（TDZ 會拋錯）改成安全寫法
5. 首頁加「開機診斷卡」：有模組掛掉時明講原因＋一鍵強制更新
"""
import io, re, sys

P = 'index.html'
src = io.open(P, encoding='utf-8', newline='').read()
assert '\r\n' in src, '檔案應為 CRLF'
s = src.replace('\r\n', '\n')

def rep(old, new, cnt=1):
    global s
    n = s.count(old)
    assert n == cnt, '需要 %d 次命中，實際 %d 次：%r' % (cnt, n, old[:80])
    s = s.replace(old, new)

# ---------------------------------------------------------------- 1. pwaBoot
boot_anchor = "  'use strict';\n"
assert s.count(boot_anchor) == 1, s.count(boot_anchor)
boot_add = """  'use strict';
  /* ================================================================
     v4.23：開機錯誤收集器
     主腳本（2MB、兩萬行）是一個大 IIFE，只要「任何一行」在初始化時丟出例外，
     後面所有模組（Shop／Share／RPG／Cloud…）就永遠停在 TDZ 未初始化，
     玩家看到的結果就是「商店／帳號／RPG／BOSS 點了完全沒反應」。
     這個收集器放在最早的 script，即使主腳本掛掉也活著 —— 首頁會顯示
     診斷卡把真正的錯誤訊息印出來（而不是靜靜壞掉）。
     ================================================================ */
  window.__BHB = { errs: [], t0: Date.now(), done: false };
  function _push(e) {
    try {
      if (window.__BHB.errs.length > 24) return;
      window.__BHB.errs.push(e);
      var k = 'bombhero-boot-err';
      try { localStorage.setItem(k, JSON.stringify(window.__BHB.errs.slice(0, 8))); } catch (e2) {}
    } catch (e2) {}
  }
  window.__bootFail = function (mod, e) {
    _push({
      mod: String(mod || '?'),
      msg: String((e && e.message) || e || ''),
      stack: String((e && e.stack) || '').split('\\n').slice(0, 3).join(' | ').slice(0, 320)
    });
    try { console.error('[boot:' + mod + ']', e); } catch (e2) {}
  };
  window.addEventListener('error', function (ev) {
    var t = ev.target;
    if (t && t !== window && t.tagName && (t.src || t.href)) {
      _push({ mod: 'resource', msg: (t.tagName + ' ' + (t.src || t.href)).slice(0, 220) });
      return;
    }
    _push({
      mod: 'script',
      msg: String(ev.message || ''),
      stack: (String(ev.filename || '').split('/').pop() + ':' + ev.lineno + ':' + ev.colno +
        (ev.error && ev.error.stack ? ' | ' + String(ev.error.stack).split('\\n')[1] : '')).slice(0, 320)
    });
  }, true);
  window.addEventListener('unhandledrejection', function (ev) {
    var r = ev.reason;
    _push({ mod: 'promise', msg: String((r && r.message) || r).slice(0, 220) });
  });
"""
rep(boot_anchor, boot_add)

# ------------------------------------------------- 2. 主腳本：boot 工具函式
# 注意：主腳本的 <script> 在 pwaBoot 之後，一定要從那裡起算，
# 否則 helper 會插進 pwaBoot 的作用域（模組 catch 就找不到它）
m0 = s.index('<script id="pwaBoot">')
m1 = s.index('<script>', m0 + 10)
_ms = re.compile(r"^[ \t]*'use strict';[ \t]*$", re.M)
mm = _ms.search(s, m1)
assert mm, '找不到主腳本的 use strict'
ins_at = mm.end() + 1
helpers = """
  /* ================================================================
     v4.23：模組隔離工具
     __stubModule：模組初始化失敗時的替代品 —— 任何方法被呼叫都只會
       「toast 一句話」然後回 undefined，不會再讓整個程式停擺。
     ================================================================ */
  function __stubModule(name) {
    const say = function () {
      try { toast('⚠️ ' + name + ' 功能載入失敗 · 請按選單最下方「🔄 強制更新」', 3.8); } catch (e) {}
      return undefined;
    };
    const base = { __stub: name, __err: true };
    try {
      if (typeof Proxy === 'function') {
        return new Proxy(base, {
          get: function (t, k) { return (k in t) ? t[k] : say; }
        });
      }
    } catch (e) {}
    return { open: say, render: say, sync: say, refresh: say, close: say, build: say,
             gold: function () { return 0; }, addGold: say, syncGold: say, isDev: function () { return false; } };
  }
  function __bootFail(mod, e) {
    try { (window.__bootFail || function () {})(mod, e); } catch (e2) {}
  }
"""
s = s[:ins_at] + helpers + s[ins_at:]

# --------------------------------------------- 3. 模組 IIFE 全部包 try/catch
lines = s.split('\n')
CLOSE = '})();'
mod_re = re.compile(r'^(const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\(function\s*[\w$]*\s*\(\s*\)\s*\{$')
iife_re = re.compile(r'^\(function\s*[\w$]*\s*\(\s*\)\s*\{$')

# 找出所有頂層 opener（欄位 0）與 closer（欄位 0）
stack = []
pairs = []          # (open_line_idx, close_line_idx, name_or_None)
for i, ln in enumerate(lines):
    m = mod_re.match(ln)
    if m:
        stack.append((i, m.group(2)))
        continue
    if iife_re.match(ln):
        stack.append((i, None))
        continue
    if ln == CLOSE:
        if not stack:
            raise SystemExit('第 %d 行出現多餘的 })();' % (i + 1))
        oi, name = stack.pop()
        pairs.append((oi, i, name))
assert not stack, '有 %d 個 IIFE 沒有收尾：%r' % (len(stack), [x[0] + 1 for x in stack])

# 最外層那個（緊接 </script> 的）就是整個主腳本，不要包
main_pair = None
for k, (oi, ci, name) in enumerate(pairs):
    if '</script>' in lines[ci + 1] or '</script>' in lines[ci + 2]:
        main_pair = k
        break
assert main_pair is not None, '找不到主腳本結尾'
assert lines[pairs[main_pair][0]].strip() == '(function () {', lines[pairs[main_pair][0]]
pairs.pop(main_pair)
named = [p for p in pairs if p[2]]
anon = [p for p in pairs if not p[2]]
print('模組 %d 個、匿名 wiring 區塊 %d 個' % (len(named), len(anon)))

# 由下往上改，行號才不會亂
edits = []
for oi, ci, name in pairs:
    if name:
        edits.append((oi, 'open', name))
        edits.append((ci, 'close', name))
    else:
        edits.append((oi, 'aopen', name))
        edits.append((ci, 'aclose', name))
edits.sort(key=lambda x: (-x[0], 0 if x[1].endswith('close') else 1))

for li, kind, name in edits:
    if kind == 'open':
        ind = '  '
        lines[li] = lines[li] + '\n    try {\n      return (function () {'
    elif kind == 'close':
        lines[li] = ('      })();\n'
                      '    } catch (__e) {\n'
                      '      __bootFail(' + repr(name) + ', __e);\n'
                      '      return (typeof __stubModule === \'function\') ? __stubModule(' + repr(name) + ') : {};\n'
                      '    }\n'
                      '  })();')
    elif kind == 'aopen':
        lines[li] = '  try {\n' + lines[li]
    elif kind == 'aclose':
        lines[li] = lines[li] + '\n  } catch (__e) { __bootFail(\'wire\', __e); }'

s = '\n'.join(lines)

# --------------------------------------------- 4. typeof TDZ 風險改成安全寫法
rep("""  if (typeof Shop === 'undefined') return 0;
  const hero = petHero();
  if (!hero) return 0;
  const list = Shop.active();""",
    """  // v4.23：typeof 對「TDZ 中的 const」也會拋錯（不是安全檢查），一定要用 try
  let shopMod = null;
  try { shopMod = Shop; } catch (e) { return 0; }
  if (!shopMod || !shopMod.active) return 0;
  const hero = petHero();
  if (!hero) return 0;
  const list = shopMod.active();""")

rep("""        if (Game.mode === 'rpg' && typeof Cloud !== 'undefined') Cloud.clearStage(cleared);""",
    """        try { if (Game.mode === 'rpg' && typeof Cloud !== 'undefined') Cloud.clearStage(cleared); } catch (e) {}""")

rep("""  if (typeof Cloud !== 'undefined' && Cloud.online() && st > RPG.unlocked) st = RPG.unlocked;""",
    """  try { if (typeof Cloud !== 'undefined' && Cloud.online() && st > RPG.unlocked) st = RPG.unlocked; } catch (e) {}""")

# --------------------------------------------- 5. 首頁診斷卡（HTML + CSS + JS）
rep("""    <div class="title-card">
      <div class="titlewrap">""",
    """    <div class="bootdiag hide" id="bootDiag">
      <b>⚠️ 這個裝置有部分功能沒有載入成功</b>
      <p id="bootDiagMsg">商店／帳號／RPG／BOSS 可能按了沒反應。</p>
      <div class="bdrow">
        <button class="bdbtn" type="button" id="bootDiagFix">🔄 強制更新</button>
        <button class="bdbtn ghost" type="button" id="bootDiagMore">顯示細節</button>
      </div>
      <pre class="bdpre hide" id="bootDiagPre"></pre>
    </div>
    <div class="title-card">
      <div class="titlewrap">""")

css_anchor = "  .card {\n    background: linear-gradient(180deg, rgba(255,251,241,.97), rgba(255,243,224,.95));"
css_add = """  /* v4.23：開機診斷卡（只有模組載入失敗時才出現） */
  .bootdiag {
    width: 100%; max-width: 560px; margin: 0 auto 10px; padding: 12px 14px;
    background: linear-gradient(180deg, #fff2f0, #ffe0dc);
    border: 2px solid #e2705c; border-radius: 14px; color: #7a2318;
    font-size: 13px; line-height: 1.7;
    box-shadow: 0 10px 26px -14px rgba(180, 60, 40, .55);
  }
  .bootdiag.hide { display: none; }
  .bootdiag b { font-size: 14px; letter-spacing: .02em; }
  .bootdiag p { margin: 3px 0 9px; color: #8d3527; font-size: 12.5px; }
  .bootdiag .bdrow { display: flex; gap: 8px; flex-wrap: wrap; }
  .bootdiag .bdbtn {
    font-family: inherit; font-size: 12.5px; font-weight: 800; cursor: pointer;
    padding: 8px 14px; border-radius: 10px; border: 2px solid #b8462f;
    background: linear-gradient(180deg, #f4703c, #d9542a); color: #fff;
    box-shadow: 0 3px 0 #a53d22;
  }
  .bootdiag .bdbtn.ghost { background: #fff; color: #8d3527; box-shadow: 0 3px 0 #e6b3a8; }
  .bootdiag .bdbtn:active { transform: translateY(2px); box-shadow: none; }
  .bootdiag .bdpre {
    margin: 9px 0 0; padding: 8px 10px; max-height: 150px; overflow: auto;
    background: #fff; border: 1px solid #e6b3a8; border-radius: 8px;
    font-size: 10.5px; line-height: 1.6; color: #8d3527; white-space: pre-wrap; word-break: break-all;
  }
  .bootdiag .bdpre.hide { display: none; }
"""
rep(css_anchor, css_add + css_anchor)

# 診斷卡的邏輯放在「很早執行」的位置：主腳本開頭（helpers 之後）
diag_js = """
  /* v4.23：開機自檢 —— 有模組初始化失敗就把真正的原因顯示在首頁 */
  (function () {
    const paint = function () {
      try {
        const B = window.__BHB;
        if (!B || !B.errs || !B.errs.length) return;
        const box = $id('bootDiag');
        if (!box) return;
        const list = B.errs.filter(function (x) { return x && x.msg; });
        if (!list.length) return;
        const mp = {};
        list.forEach(function (x) { const k = x.mod || '?'; mp[k] = (mp[k] || []); mp[k].push(x.msg); });
        const mods = Object.keys(mp).filter(function (k) { return k !== 'resource'; });
        const msg = $id('bootDiagMsg');
        if (msg) {
          msg.textContent = (mods.length ? ('出問題的模組：' + mods.join(' · ')) : '頁面有資源載入失敗') +
            '。按「強制更新」通常就能救回來。';
        }
        const pre = $id('bootDiagPre');
        if (pre) pre.textContent = list.map(function (x) {
          return '[' + (x.mod || '?') + '] ' + x.msg + (x.stack ? ('\\n    ' + x.stack) : '');
        }).join('\\n');
        box.classList.remove('hide');
      } catch (e) {}
    };
    // 主腳本可能中途掛掉（後面的程式根本沒執行），所以自檢要獨立於它
    window.addEventListener('load', function () { setTimeout(paint, 900); });
    setTimeout(paint, 2600);
    document.addEventListener('click', function (e) {
      const t = e.target;
      if (!t || !t.id) return;
      if (t.id === 'bootDiagMore') {
        const pre = $id('bootDiagPre');
        if (pre) pre.classList.toggle('hide');
      } else if (t.id === 'bootDiagFix') {
        try { t.textContent = '更新中…'; } catch (e2) {}
        const done = function () { location.reload(); };
        try {
          if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
            navigator.serviceWorker.getRegistrations().then(function (rs) {
              return Promise.all(rs.map(function (r) { return r.unregister(); }));
            }).then(function () {
              return (window.caches ? caches.keys() : Promise.resolve([]));
            }).then(function (ks) {
              return Promise.all(ks.map(function (k) { return caches.delete(k); }));
            }).then(done, done);
          } else { done(); }
        } catch (e3) { done(); }
      }
    }, true);
  })();
"""
anchor2 = "  function __bootFail(mod, e) {\n    try { (window.__bootFail || function () {})(mod, e); } catch (e2) {}\n  }\n"
rep(anchor2, anchor2 + diag_js)

io.open(P, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n'))
print('patch A 完成')
