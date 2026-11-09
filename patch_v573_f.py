# -*- coding: utf-8 -*-
"""v5.73 patch F: 本週限制挑戰"""
import io, os

D = os.path.dirname(__file__)
PH = os.path.join(D, 'bomb-hero', 'index.html')
PM = os.path.join(D, 'bomb-hero', 'js', 'main.js')
PC = os.path.join(D, 'cloud.js')

h = io.open(PH, 'r', encoding='utf-8', newline='').read()
m = io.open(PM, 'r', encoding='utf-8', newline='').read()
c = io.open(PC, 'r', encoding='utf-8', newline='').read()
ho, mo, co = len(h), len(m), len(c)

# ---------- HTML：每日挑戰頁加「本週限制挑戰」 ----------
A1 = """      <div class="lbhead">
        <b id="lbTitle">🏆 今日排行榜</b>"""
B1 = """      <!-- v5.73：本週限制挑戰 —— 同一張圖、同一條限制，一週內比最快 -->
      <div class="wkchal" id="wkChal">
        <div class="wkchd"><b id="wkChalTitle">⏱️ 本週限制挑戰</b><span id="wkChalWeek">—</span></div>
        <div class="wkchrow"><span id="wkChalMod">—</span></div>
        <div class="wkchrow"><span id="wkChalStage">—</span></div>
        <div class="wkchrow"><span id="wkChalBest">—</span></div>
        <div class="rowbtns"><button class="biggo alt" id="btnWkChal" type="button">挑戰 →</button></div>
        <div class="lblist" id="wkChalList"></div>
      </div>
      <div class="lbhead">
        <b id="lbTitle">🏆 今日排行榜</b>"""
assert h.count(A1) == 1, 'A1 %d' % h.count(A1)
h = h.replace(A1, B1)

# ---------- CSS ----------
A2 = """#abyssBadge.hide { display: none; }"""
B2 = """#abyssBadge.hide { display: none; }
.wkchal { margin: 14px 0 12px; padding: 11px 12px; border-radius: 15px;
  background: linear-gradient(160deg, rgba(255,236,204,.85), rgba(255,214,164,.55));
  border: 1px solid rgba(210,150,70,.45); box-shadow: inset 0 1px 0 rgba(255,255,255,.6); }
.wkchd { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 7px; }
.wkchd b { font-size: 14px; color: #7a3d00; }
.wkchd span { font-size: 11px; color: #a1732c; font-weight: 800; }
.wkchrow { display: flex; gap: 7px; font-size: 12px; color: #4a3418; line-height: 1.55; }
.wkchrow b { color: #b4500a; }
.wkchal .rowbtns { margin: 9px 0 6px; }
.biggo.alt { background: linear-gradient(180deg, #b98cff, #7b4bd6); box-shadow: 0 3px 0 #4e2a92; }
.wkchal .lblist { max-height: 168px; }"""
assert h.count(A2) == 1, 'A2 %d' % h.count(A2)
h = h.replace(A2, B2)

# ---------- JS：Lb 方法 ----------
A3 = """  submitAbyss(layer, name) {"""
B3 = """  /* v5.73：本週限制挑戰（同週同一張圖＋同一條限制，比秒數） */
  topChal(week, limit) {
    const w = week || Gift.weekKey();
    return Lb._get(Lb.origin() + '/api/lb/top?mode=wchal&day=' + encodeURIComponent(w) +
                   '&limit=' + (limit || 20))
      .then(function (j) {
        if (j && j.ok && j.list) return { list: j.list, online: true };
        return { list: [], online: false };
      }, function () { return { list: [], online: false }; });
  },
  submitChal(week, name, ms) {
    return Lb._post(Lb.origin() + '/api/lb/submit', {
      mode: 'wchal', day: week || Gift.weekKey(), name: name || '', ms: Math.round(ms),
      deviceId: Lb.deviceId(), ver: VERSION
    });
  },
  submitAbyss(layer, name) {"""
assert m.count(A3) == 1, 'A3 %d' % m.count(A3)
m = m.replace(A3, B3)

# ---------- JS：WeekChal 模組（放在 Lb 之後）----------
A4 = """/* =====================================================================
 * v5.13：成就系統（Ach）"""
B4 = """/* ============================================================================
   v5.73：本週限制挑戰（Weekly Challenge）
   · 每週一條限制（按週 key 固定）、同一張圖（Gift.weekStage()）比最快秒數
   · 與每日／每週榜完全分開（mode=wchal）—— 限制條件下的成績不能跟一般榜混在一起
   · 三條限制刻意都是「改玩法」而不是「加數值」：
       長引信 → 逼你算時機；無隨從 → 靠自己走位；無補給 → 不能靠回血硬撐
   ========================================================================== */
const WK_MODS = [
  { id: 'fuse',   ico: '\\uD83D\\uDD6F\\uFE0F', key: 'wk.mod.fuse' },
  { id: 'nopet',  ico: '\\uD83D\\uDEAB', key: 'wk.mod.nopet' },
  { id: 'noitem', ico: '\\uD83D\\uDD12', key: 'wk.mod.noitem' }
];
const WeekChal = (function () {
  let cachedWk = '', cachedMod = null;
  function modOf() {
    const k = Gift.weekKey();
    if (k === cachedWk && cachedMod) return cachedMod;
    let h = 0;
    for (let i = 0; i < k.length; i++) h = (Math.imul(h, 131) + k.charCodeAt(i)) >>> 0;
    cachedWk = k; cachedMod = WK_MODS[h % WK_MODS.length];
    return cachedMod;
  }
  function stageOf() { return Gift.weekStage(); }
  function active() { return !!Game.wchal; }
  function bestKey() { return 'bombhero-wkchal-' + Gift.weekKey(); }
  function best() { try { return parseInt(localStorage.getItem(bestKey()), 10) || 0; } catch (e) { return 0; } }
  function setBest(ms) { try { localStorage.setItem(bestKey(), String(Math.round(ms) | 0)); } catch (e) {} }
  function begin() {
    const st = stageOf(), mod = modOf().id;
    Game.wchal = { mod: mod, at: Date.now() };
    startSolo(st, false, false);
    Game.wchal = { mod: mod, at: Date.now(), t0: Date.now() };
    const p = Game.players[0];
    if (p) {
      if (mod === 'fuse') p.fuseMul = Math.max(1.6, p.fuseMul || 1);
      if (mod === 'nopet') { Game.pets = []; p.wkNoPet = 1; }
      if (mod === 'noitem') { Game.items = []; p.wkNoItem = 1; }
    }
    try {
      doorHintCard(modOf().ico, t('wk.title'), t(modOf().key), 2.8);
    } catch (e) {}
  }
  /* 過關 → 提交；只收「本週指定關卡」且沒用每日挑戰 */
  function submit(p) {
    if (!active() || Game.daily) return;
    const used = Math.round((Game.timerMax - Game.timer) * 1000);
    if (!(used > 1000)) return;
    const bk = best();
    if (!bk || used < bk) {
      setBest(used);
      try {
        Lb.submitChal(Gift.weekKey(), settings.playerName || '', used).then(function (r) {
          if (r && r.ok && r.rank) toast(t('wk.rank', { r: r.rank, t: fmtMs(used) }), 3);
          else toast(t('wk.record', { t: fmtMs(used) }), 2.8);
        }, function () {});
      } catch (e) {}
    }
  }
  return { modOf: modOf, stageOf: stageOf, begin: begin, submit: submit, best: best, active: active, MODS: WK_MODS };
})();

/* =====================================================================
 * v5.13：成就系統（Ach）"""
assert m.count(A4) == 1, 'A4 %d' % m.count(A4)
m = m.replace(A4, B4)

# ---------- JS：startSolo 清 wchal ----------
A5 = """  Game.abyss = null;
  // v5.38：只有「從第 1 關開始」或每日／BOSS 連戰才算新的一輪；"""
B5 = """  Game.abyss = null;
  Game.wchal = null;          // v5.73：普通入口一律離開限制挑戰
  // v5.38：只有「從第 1 關開始」或每日／BOSS 連戰才算新的一輪；"""
assert m.count(A5) == 1, 'A5 %d' % m.count(A5)
m = m.replace(A5, B5)

# ---------- JS：updateSolo 裡維持限制 ----------
A6 = """function updateSolo(dt) {
  const p = Game.players[0];
  if (Game.state === 'play') {"""
B6 = """function updateSolo(dt) {
  const p = Game.players[0];
  if (Game.state === 'play') {
    /* v5.73：限制挑戰的條件要「每一幀都成立」——
       吃到引信強化卡、撿到隨從，都不能讓限制偷偷失效。 */
    if (Game.wchal && p) {
      if (Game.wchal.mod === 'fuse') p.fuseMul = Math.max(p.fuseMul || 1, 1.6);
      if (Game.wchal.mod === 'nopet' && Game.pets && Game.pets.length) Game.pets = [];
      if (Game.wchal.mod === 'noitem' && Game.items && Game.items.length) Game.items = [];
    }"""
assert m.count(A6) == 1, 'A6 %d' % m.count(A6)
m = m.replace(A6, B6)

# ---------- JS：過關提交 ----------
A7 = """            GiftUI.alertOn();
          }
        } catch (e) {}"""
B7 = """            GiftUI.alertOn();
            /* v5.73：本週限制挑戰 —— 只有 solo（不是 RPG／深淵／每日）才收 */
            if (Game.wchal && solo) { try { WeekChal.submit(p); } catch (e2) {} }
          }
        } catch (e) {}"""
assert m.count(A7) == 1, 'A7 %d' % m.count(A7)
m = m.replace(A7, B7)

# ---------- JS：每日畫面渲染 ----------
A8 = """  set('lbTitle', t('lb.titleToday'));
  set('btnLbReload', t('lb.reload'));
  renderLbList();
}"""
B8 = """  set('lbTitle', t('lb.titleToday'));
  set('btnLbReload', t('lb.reload'));
  renderWkChal();
  renderLbList();
}

/* v5.73：本週限制挑戰的卡片與榜單 */
function renderWkChal() {
  const mod = WeekChal.modOf();
  const st = WeekChal.stageOf();
  const set = function (id, v) { const e = $id(id); if (e) e.textContent = v; };
  set('wkChalTitle', '\\u23F1\\uFE0F ' + t('wk.title'));
  set('wkChalWeek', Gift.weekKey());
  const md = $id('wkChalMod');
  if (md) md.innerHTML = mod.ico + ' <b>' + escHtml(t('wk.modName.' + mod.id)) + '</b>　' + escHtml(t(mod.key));
  const sd = $id('wkChalStage');
  if (sd) sd.innerHTML = '\\uD83D\\uDFFA <b>' + escHtml(t('wk.stageLine', { n: st, name: mapName(soloInfo(st)) })) + '</b>';
  const bk = WeekChal.best();
  const bd = $id('wkChalBest');
  if (bd) bd.innerHTML = '\\uD83C\\uDFC6 ' + escHtml(bk ? t('wk.bestHave', { t: fmtMs(bk) }) : t('wk.bestNone'));
  const go = $id('btnWkChal');
  if (go) go.textContent = t('wk.go');
  const box = $id('wkChalList');
  if (!box) return;
  box.innerHTML = '<div class="empty">' + t('lb.loading') + '</div>';
  WeekChalPreview(box);
}
function WeekChalPreview(box) {
  Lb.topChal(Gift.weekKey(), 10).then(function (r) {
    const list = (r && r.list) || [];
    if (!list.length) { box.innerHTML = '<div class="empty">' + t('wk.empty') + '</div>'; return; }
    const me = settings.playerName || '';
    box.innerHTML = list.map(function (e, i) {
      const cls = me && e.n === me ? ' me' : '';
      return '<div class="lbrow' + cls + '"><span class="lbrk">' + (i + 1) + '</span>' +
        '<span class="lbnm">' + escHtml(e.n || '—') + '</span>' +
        '<span class="lbms">' + fmtMs(e.ms | 0) + '</span></div>';
    }).join('');
  }, function () { box.innerHTML = '<div class="empty">' + t('wk.empty') + '</div>'; });
}"""
assert m.count(A8) == 1, 'A8 %d' % m.count(A8)
m = m.replace(A8, B8)

# ---------- JS：按鈕事件 ----------
A9 = """$id('btnDailyGo').addEventListener('click', function () { Daily.begin(); });"""
B9 = """$id('btnDailyGo').addEventListener('click', function () { Daily.begin(); });
/* v5.73：本週限制挑戰 */
(function () {
  const b = $id('btnWkChal');
  if (b && b.addEventListener) b.addEventListener('click', function () {
    AudioSys.ensure(); AudioSys.sfx('click');
    if (!ensureNickname()) return;
    try { WeekChal.begin(); } catch (e) { try { toast('載入失敗，請重新整理', 2.4); } catch (e2) {} }
  });
})();"""
assert m.count(A9) == 1, 'A9 %d' % m.count(A9)
m = m.replace(A9, B9)

# ---------- 後端：wchal 走 weekly 的日期規則 ----------
A10 = """  const LB_MODES = { daily: 1, weekly: 1, abyss: 1 };   // v4.87：weekly＝每週榜；v5.73：abyss＝深淵（比層數）"""
B10 = """  const LB_MODES = { daily: 1, weekly: 1, abyss: 1, wchal: 1 };   // v5.73：abyss＝深淵（層數）、wchal＝每週限制挑戰"""
assert c.count(A10) == 1, 'A10 %d' % c.count(A10)
c = c.replace(A10, B10)

A11 = """        const weekly = mode === 'weekly';
        const abyss = mode === 'abyss';"""
assert c.count(A11) == 2, 'A11 %d' % c.count(A11)
c = c.replace(A11, """        const weekly = (mode === 'weekly' || mode === 'wchal');
        const abyss = mode === 'abyss';""")

assert h.count('\r\n') == 0 and m.count('\r\n') == 0 and c.count('\r\n') == 0, 'CRLF!'
for path, data in ((PH, h), (PM, m), (PC, c)):
    tmp = path + '.tmp'
    io.open(tmp, 'w', encoding='utf-8', newline='\n').write(data)
    os.replace(tmp, path)
print('OK html', ho, '->', len(h), '| js', mo, '->', len(m), '| cloud', co, '->', len(c))
