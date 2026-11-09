# -*- coding: utf-8 -*-
"""v5.73 patch C: 深淵（Endless）核心"""
import io, os

P = os.path.join(os.path.dirname(__file__), 'bomb-hero', 'js', 'main.js')
s = io.open(P, 'r', encoding='utf-8', newline='').read()
orig = len(s)

# ---- 1. 深淵模組（插在 startSolo 之前）----
A1 = """function startSolo(stage, bossRush, daily) {
  try { DeathCard.reset(); } catch (e) {}"""
B1 = """/* ============================================================================
   v5.73：深淵（Endless）—— 40 關全破之後的無限去處
   · 每一層＝一關：主題在 2~39 之間循環（避開第 1 關，才不會每層都 resetBuffs），
     第 5 的倍數進 BOSS 決戰場。
   · 越深越難，但靠「限制」而不是純數值：引信一路縮、血量只給 3 格上限，
     炸彈與火力慢慢加 —— 玩到後面是「節奏變快」，不是「怪變肉」。
   · 死亡即結算：最深層數寫進 localStorage＋全服榜（mode=abyss）。
   ========================================================================== */
const ABYSS_KEY = 'bombhero-abyss-v1';
const Abyss = (function () {
  let best = 0;
  try { best = Math.max(0, parseInt(localStorage.getItem(ABYSS_KEY), 10) || 0); } catch (e) { best = 0; }

  function bestOf() { return best | 0; }
  function layerOf() { return (Game.abyss && Game.abyss.layer) | 0; }
  function active() { return !!Game.abyss; }
  function unlocked() {
    try { if ((Solo.unlocked | 0) >= SOLO_STAGES) return true; } catch (e) {}
    try { if ((RPG.cleared | 0) >= SOLO_STAGES) return true; } catch (e) {}
    return false;
  }
  /* 第 5 的倍數＝BOSS 決戰場（SOLO_STAGES）；其餘在 2~39 循環 */
  function layerStage(n) {
    const k = Math.max(1, n | 0);
    if (k % 5 === 0) return SOLO_STAGES;
    return 2 + ((k - 1) % (SOLO_STAGES - 2));
  }
  /* 這一層的起始加成：炸彈／火力慢慢加，引信一路縮，血量最多 +3 */
  function bump(p, n) {
    if (!p) return;
    p.maxBombs = Math.min(12, (p.maxBombs | 0) + Math.floor(n / 3));
    p.power = Math.min(12, (p.power | 0) + Math.floor(n / 10));
    p.fuseMul = Math.max(.42, 1 - n * .012);
    const hp = Math.min(3, Math.floor(n / 6));
    p.sHpMax = (p.sHpMax | 0) + hp;
    p.sHp = p.sHpMax;
  }
  /* 追怪：每 4 層 +1 隻，上限 +12 —— 用「同生態表的怪」才不會出現違和組合 */
  function extraFoes(n) {
    const add = Math.min(12, Math.floor(n / 4));
    if (add <= 0) return;
    const st = layerStage(n);
    let types = [];
    try { types = stageTypes(st); } catch (e) { types = []; }
    if (!types || !types.length) return;
    let lv = 1;
    try { lv = Math.min(8, chapterOf(st) + Math.floor(n / 15)); } catch (e) { lv = 1; }
    let speed = 1;
    try { speed = soloDiffCfg().speed; } catch (e) {}
    let guard = 0;
    for (let i = 0; i < add && guard < 500; i++) {
      let x = 0, y = 0, ok = false;
      while (guard++ < 500) {
        x = 1 + Math.floor(Math.random() * (Game.cols - 2));
        y = 1 + Math.floor(Math.random() * (Game.rows - 2));
        if (cellAt(x, y) === 0 && !bombAt(x, y) && !nearSpawn(x, y, 2)) { ok = true; break; }
      }
      if (!ok) break;
      try { Game.enemies.push(makeEnemy(x, y, pick(types), lv, speed)); } catch (e) { break; }
    }
  }
  function start(n) {
    const layer = Math.max(1, n | 0 || 1);
    const at = (Game.abyss && Game.abyss.startAt) || Date.now();
    startSolo(layerStage(layer), false, false);
    /* startSolo 會把 Game.abyss 清掉（普通模式的入口），這裡重新釘回去 */
    Game.abyss = { layer: layer, startAt: at };
    try { bump(Game.players[0], layer); } catch (e) {}
    try { extraFoes(layer); } catch (e) {}
    try {
      if (layer % 5 === 0) {
        Game.enemies.forEach(function (e) { if (e.boss) { e.hp = (e.hp | 0) + layer; e.maxHp = e.hp; } });
      }
    } catch (e) {}
    try { AbyssHud.paint(); } catch (e) {}
    try {
      doorHintCard('\\uD83D\\uDD73\\uFE0F', t('abyss.layer', { n: layer }),
        t('abyss.layerSub', { best: best }), 2.2);
    } catch (e) {}
  }
  /* 過門 → 下一層（不結算、不給星、不記週榜） */
  function layerClear() {
    if (!active()) return;
    const n = layerOf() + 1;
    Game.abyss.layer = n;
    Game.state = 'roundover';
    try { AbyssHud.paint(); } catch (e) {}
    try { AudioSys.sfx('victory'); } catch (e) {}
    try {
      if (n % 5 === 0) { Game.flash = Math.max(Game.flash || 0, .45); Game.shake = Math.max(Game.shake || 0, .4); }
    } catch (e) {}
    setTimeout(function () {
      const go = function () { try { start(n); } catch (e) {} };
      try { if (buffsOn()) BuffPick.open(go); else go(); } catch (e) { go(); }
    }, 620);
  }
  /* 死亡結算 —— 這才是深淵的「終點」，也是唯一的成績 */
  function finish() {
    const n = layerOf();
    const deeper = n > best;
    if (deeper) {
      best = n;
      try { localStorage.setItem(ABYSS_KEY, String(best)); } catch (e) {}
    }
    try { AbyssHud.paint(); } catch (e) {}
    try { if (Lb && Lb.submitAbyss) Lb.submitAbyss(n, settings.playerName || ''); } catch (e) {}
    try {
      Game.shake = Math.max(Game.shake || 0, .55);
      Game.flash = Math.max(Game.flash || 0, .35);
    } catch (e) {}
    try {
      showOverlay({
        title: deeper ? t('abyss.newBest', { n: n }) : t('abyss.over', { n: n }),
        sub: t('abyss.bestLine', { n: best }),
        btn: t('abyss.retry'),
        action: function () { try { start(1); } catch (e) {} }
      });
    } catch (e) {}
    try { Cloud.track('abyss', n, '深淵第 ' + n + ' 層'); } catch (e) {}
  }
  return {
    start: start, layerClear: layerClear, finish: finish,
    bestOf: bestOf, layerOf: layerOf, active: active, unlocked: unlocked, layerStage: layerStage
  };
})();

/* 深淵層數顯示（HUD 左上角的小徽章；普通模式完全不存在） */
const AbyssHud = (function () {
  let el = null;
  function ensure() {
    if (el && el.parentNode) return el;
    const top = $id('gameTop');
    if (!top || !top.appendChild) return null;
    el = document.createElement('div');
    el.id = 'abyssBadge';
    el.className = 'abyssBadge hide';
    top.appendChild(el);
    return el;
  }
  function paint() {
    const n = Abyss.layerOf();
    const on = n > 0 && !!Game.abyss;
    const b = ensure();
    if (!b) return;
    b.classList.toggle('hide', !on);
    if (!on) return;
    b.innerHTML = '<b>\\uD83D\\uDD73\\uFE0F ' + t('abyss.layerShort', { n: n }) + '</b>' +
      '<i>' + t('abyss.bestShort', { n: Abyss.bestOf() }) + '</i>';
  }
  return { paint: paint };
})();

function startSolo(stage, bossRush, daily) {
  try { DeathCard.reset(); } catch (e) {}
  /* v5.73：普通入口一律離開深淵（深淵自己會在呼叫後重新釘回去） */
  Game.abyss = null;"""
assert s.count(A1) == 1, 'A1 %d' % s.count(A1)
s = s.replace(A1, B1)

# ---- 2. 過門 → 深淵下一層 ----
A2 = """        const cleared = Game.stage;
        // v4.17：過關發金幣（單人與 RPG 都給；商店買隨從用）"""
B2 = """        const cleared = Game.stage;
        /* v5.73：深淵 —— 過門不是通關，是下一層。金幣照給（不然沒人想玩），
           但星數／每週榜／關卡解鎖一律不記，否則深淵會直接洗掉 solo 的進度。 */
        if (Game.abyss) {
          try {
            const c0 = Math.max(0, Math.round(p.score || 0) - Math.max(0, Game.paidScore | 0));
            Game.paidScore = Math.max(0, Math.round(p.score || 0));
            if (c0 > 0) Shop.addGold(c0);
          } catch (e) {}
          try { Abyss.layerClear(); } catch (e) {}
          return;
        }
        // v4.17：過關發金幣（單人與 RPG 都給；商店買隨從用）"""
assert s.count(A2) == 1, 'A2 %d' % s.count(A2)
s = s.replace(A2, B2)

# ---- 3. 死亡 → 深淵結算 ----
A3 = """        try { DeathCard.finish(); } catch (e) {}
        const rev = revAdd();          // v5.63：死一次 +1，下一局開場多一顆炸彈"""
B3 = """        try { DeathCard.finish(); } catch (e) {}
        /* v5.73：深淵死亡＝本輪結束（沒有復活、沒有復仇值） */
        if (Game.abyss) {
          try { Abyss.finish(); } catch (e) {}
          battleEndFx(false);
          return;
        }
        const rev = revAdd();          // v5.63：死一次 +1，下一局開場多一顆炸彈"""
assert s.count(A3) == 1, 'A3 %d' % s.count(A3)
s = s.replace(A3, B3)

assert s.count('\r\n') == 0, 'CRLF!'
tmp = P + '.tmp'
io.open(tmp, 'w', encoding='utf-8', newline='\n').write(s)
os.replace(tmp, P)
print('OK', orig, '->', len(s))
