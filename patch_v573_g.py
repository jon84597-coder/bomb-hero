# -*- coding: utf-8 -*-
"""v5.73 patch G: 8 角色專屬主動技"""
import io, os

P = os.path.join(os.path.dirname(__file__), 'bomb-hero', 'js', 'main.js')
s = io.open(P, 'r', encoding='utf-8', newline='').read()
o = len(s)

# ---- 1. 定義與狀態 ----
A1 = """  const LEFT = {};                 // id → 剩餘冷卻
  let uiT = 0;"""
B1 = """  const LEFT = {};                 // id → 剩餘冷卻
  let uiT = 0;

  /* ===== v5.73：角色專屬技 =================================================
     八個角色本來只差「一行天賦」，換角色沒有感覺。專屬技不進招式池、不佔
     出戰 4 欄、不花技能點 —— 選了這個角色就天生有這一招，冷卻 14~20 秒。
     全部做成「炸彈做不到的事」，跟原本的主動招同一條設計原則（0 傷害）。
     ====================================================================== */
  const CHAR_SKILLS = [
    { id: 'gale',    ico: '\\uD83D\\uDCA8', n: '疾風步', cd: 14, d: '往面向的方向瞬移 2 格，落地 0.8 秒無敵（穿得過火線）。' },
    { id: 'roll',    ico: '\\uD83D\\uDF00', n: '滾地閃避', cd: 16, d: '往反方向滾 2 格，翻滾中完全無敵。' },
    { id: 'quickfuse', ico: '\\u26A1', n: '速爆指令', cd: 18, d: '場上自己的炸彈引信立刻縮短一半（一次清場）。' },
    { id: 'enchant', ico: '\\uD83D\\uDD25', n: '烈焰灌注', cd: 20, d: '本關爆炸範圍永久 +1（上限 10 格），可疊到極限。' },
    { id: 'loot',    ico: '\\uD83E\\uDE99', n: '拾金之手', cd: 15, d: '把 4 格內的所有金幣與道具直接吸到腳下。' },
    { id: 'bulwark', ico: '\\uD83D\\uDEE1\\uFE0F', n: '鐵壁', cd: 20, d: '護甲回滿並 +2，同時 1.8 秒無敵。' },
    { id: 'refill',  ico: '\\uD83D\\uDCE6', n: '軍械補給', cd: 22, d: '本關炸彈上限 +1（上限 8），打得越久越強。' },
    { id: 'stardust', ico: '\\u2728', n: '星塵爆', cd: 17, d: '清掉身邊 3 格內所有敵方投射物，並把怪物震暈 1.6 秒。' }
  ];
  let charCd = 0;

  function charIdx() {
    try { return ((RPG.char | 0) % CHAR_SKILLS.length + CHAR_SKILLS.length) % CHAR_SKILLS.length; }
    catch (e) { return 0; }
  }
  function charDef() { return CHAR_SKILLS[charIdx()]; }
  function charCdLeft() { return charCd; }
  function charStep(p, dx, dy, n) {
    const T = Game.T || 40;
    for (let k = 0; k < n; k++) {
      const cx = Math.floor(p.x / T) + dx, cy = Math.floor(p.y / T) + dy;
      if (cx < 1 || cy < 1 || cx >= Game.cols - 1 || cy >= Game.rows - 1) break;
      if (cellAt(cx, cy) !== 0 || bombAt(cx, cy)) break;
      p.x = (cx + .5) * T; p.y = (cy + .5) * T;
      p.camSnap = true;
    }
  }
  function charCast() {
    if (!Game.rpg || Game.state !== 'play') return false;
    const p = Game.players && Game.players[0];
    if (!p || !p.alive) return false;
    if (charCd > 0) return false;
    const def = charDef();
    const T = Game.T || 40;
    let ok = false;
    const f = p.facing || 'down';
    const dv = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[f] || [0, 1];

    if (def.id === 'gale') {
      charStep(p, dv[0], dv[1], 2);
      p.invuln = Math.max(p.invuln || 0, .8);
      burst(p.x, p.y, '#c9f0ff', 26, 300);
      AudioSys.sfx('item');
      ok = true;
    } else if (def.id === 'roll') {
      charStep(p, -dv[0], -dv[1], 2);
      p.invuln = Math.max(p.invuln || 0, 1);
      burst(p.x, p.y, '#ffe6a8', 22, 260);
      AudioSys.sfx('place');
      ok = true;
    } else if (def.id === 'quickfuse') {
      let n = 0;
      Game.bombs.forEach(function (b) {
        if (b.owner === p && !b.held) { b.timer = Math.max(.05, (b.timer || 0) * .5); n++; }
      });
      if (n) { burst(p.x, p.y, '#ffd166', 16, 210); AudioSys.sfx('explode'); ok = true; }
    } else if (def.id === 'enchant') {
      if ((p.power | 0) < 10) {
        p.power = Math.min(10, (p.power | 0) + 1);
        burst(p.x, p.y, '#ff9a3c', 28, 300);
        Game.flash = Math.max(Game.flash || 0, .28);
        AudioSys.sfx('heal');
        ok = true;
      }
    } else if (def.id === 'loot') {
      const r = 4 * T, r2 = r * r;
      let n = 0;
      (Game.items || []).forEach(function (it) {
        const dx = (it.cx + .5) * T - p.x, dy = (it.cy + .5) * T - p.y;
        if (dx * dx + dy * dy > r2) return;
        it.cx = Math.floor(p.x / T); it.cy = Math.floor(p.y / T);
        n++;
      });
      burst(p.x, p.y, '#ffe07a', 20 + Math.min(20, n * 2), 240);
      AudioSys.sfx('coin');
      ok = true;
    } else if (def.id === 'bulwark') {
      p.armorMax = Math.max(p.armorMax | 0, (p.armorCur | 0) + 2);
      p.armorCur = p.armorMax;
      p.invuln = Math.max(p.invuln || 0, 1.8);
      burst(p.x, p.y, '#9fd8ff', 30, 280);
      Game.shake = Math.max(Game.shake || 0, .22);
      AudioSys.sfx('heal');
      ok = true;
    } else if (def.id === 'refill') {
      if ((p.maxBombs | 0) < 8) {
        p.maxBombs = Math.min(8, (p.maxBombs | 0) + 1);
        burst(p.x, p.y, '#ffc46b', 22, 250);
        AudioSys.sfx('item');
        ok = true;
      }
    } else if (def.id === 'stardust') {
      const r = 3 * T, r2 = r * r;
      Game.bolts = [];
      Game.foeAoe = [];
      Game.foeHaz = [];
      (Game.enemies || []).forEach(function (e) {
        if (!e || e.dead || e.boss) return;
        if (dist2(e.x, e.y, p.x, p.y) > r2) return;
        e.dizzy = Math.max(e.dizzy || 0, 1.6);
        burst(e.x, e.y, '#e6d4ff', 10, 150);
      });
      burst(p.x, p.y, '#ffffff', 40, 340);
      Game.flash = Math.max(Game.flash || 0, .3);
      AudioSys.sfx('item');
      ok = true;
    }
    if (!ok) return false;
    charCd = def.cd;
    paint();
    return true;
  }"""
assert s.count(A1) == 1, 'A1 %d' % s.count(A1)
s = s.replace(A1, B1)

# ---- 2. syncBar：加金色專屬鈕 ----
A2 = """    bar.innerHTML = html;
    if (!bar._wired) {
      bar._wired = 1;
      bar.addEventListener('pointerdown', function (e) {
        const b = e.target && e.target.closest ? e.target.closest('.skbtn') : null;
        if (!b) return;
        e.preventDefault();
        cast(parseInt(b.getAttribute('data-sk'), 10) || 0);
      });
    }"""
B2 = """    /* v5.73：角色專屬技永遠排在最前面（金色），跟主動招分開辨識 */
    const cd0 = charDef();
    html = '<button class="skbtn wsk" data-sk="c" type="button" aria-label="' + escHtml(cd0.n) + '">' +
        '<span class="ski">' + cd0.ico + '</span>' +
        '<span class="skc"></span>' +
        '<span class="skh">T</span>' +
      '</button>' + html;
    bar.innerHTML = html;
    if (!bar._wired) {
      bar._wired = 1;
      bar.addEventListener('pointerdown', function (e) {
        const b = e.target && e.target.closest ? e.target.closest('.skbtn') : null;
        if (!b) return;
        e.preventDefault();
        const k = b.getAttribute('data-sk');
        if (k === 'c') { charCast(); return; }
        cast(parseInt(k, 10) || 0);
      });
    }"""
assert s.count(A2) == 1, 'A2 %d' % s.count(A2)
s = s.replace(A2, B2)

# ---- 3. paint：顯示專屬冷卻 ----
A3 = """  function paint() {
    const bar = $id('skillBar');
    if (!bar) return;
    const lo = rpgLoadout();
    const on = !!(Game.rpg && Screen.current === 'game' && lo.length > 0);
    bar.classList.toggle('hide', !on);
    if (!on) return;"""
B3 = """  function paint() {
    const bar = $id('skillBar');
    if (!bar) return;
    const lo = rpgLoadout();
    const on = !!(Game.rpg && Screen.current === 'game');
    bar.classList.toggle('hide', !on);
    if (!on) return;
    /* v5.73：專屬技冷卻 */
    const cb = bar.querySelector('[data-sk="c"]');
    if (cb) {
      const cd = charCd;
      const tot = charDef().cd || 1;
      const c = cb.querySelector('.skc');
      if (c) c.textContent = cd > 0 ? (cd >= 1 ? String(Math.ceil(cd)) : cd.toFixed(1)) : '';
      cb.classList.toggle('cool', cd > 0);
      cb.style.setProperty('--p', String(Math.max(0, Math.min(1, cd / tot))));
    }"""
assert s.count(A3) == 1, 'A3 %d' % s.count(A3)
s = s.replace(A3, B3)

# ---- 4. tick：冷卻遞減 ----
A4 = """  function tick(dt) {
    let any = false;
    for (const k in LEFT) {
      if (LEFT[k] > 0) { LEFT[k] = Math.max(0, LEFT[k] - dt); any = true; }
    }"""
B4 = """  function tick(dt) {
    let any = false;
    if (charCd > 0) { charCd = Math.max(0, charCd - dt); any = true; }
    for (const k in LEFT) {
      if (LEFT[k] > 0) { LEFT[k] = Math.max(0, LEFT[k] - dt); any = true; }
    }"""
assert s.count(A4) == 1, 'A4 %d' % s.count(A4)
s = s.replace(A4, B4)

# ---- 5. 熱鍵 T ----
A5 = """      const i = ['KeyQ', 'KeyR', 'KeyF', 'KeyV'].indexOf(e.code);
      if (i < 0) return;
      try { e.preventDefault(); } catch (err) {}
      cast(i);"""
B5 = """      if (e.code === 'KeyT') { try { e.preventDefault(); } catch (err) {} charCast(); return; }
      const i = ['KeyQ', 'KeyR', 'KeyF', 'KeyV'].indexOf(e.code);
      if (i < 0) return;
      try { e.preventDefault(); } catch (err) {}
      cast(i);"""
assert s.count(A5) == 1, 'A5 %d' % s.count(A5)
s = s.replace(A5, B5)

# ---- 6. 重置 / 匯出 ----
A6 = """  function reset() { for (const k in LEFT) delete LEFT[k]; }"""
B6 = """  function reset() { for (const k in LEFT) delete LEFT[k]; charCd = 0; }"""
assert s.count(A6) == 1, 'A6 %d' % s.count(A6)
s = s.replace(A6, B6)

A7 = """  return { reset: reset, tick: tick, paint: paint, syncBar: syncBar, cast: cast, castById: castById, cdOf: cdOf,
    CDS: CDS, DUR: DUR };"""
B7 = """  return { reset: reset, tick: tick, paint: paint, syncBar: syncBar, cast: cast, castById: castById, cdOf: cdOf,
    charCast: charCast, charDef: charDef, charCdLeft: charCdLeft, CHAR_SKILLS: CHAR_SKILLS,
    CDS: CDS, DUR: DUR };"""
assert s.count(A7) == 1, 'A7 %d' % s.count(A7)
s = s.replace(A7, B7)

assert s.count('\r\n') == 0, 'CRLF!'
tmp = P + '.tmp'
io.open(tmp, 'w', encoding='utf-8', newline='\n').write(s)
os.replace(tmp, P)
print('OK', o, '->', len(s))
