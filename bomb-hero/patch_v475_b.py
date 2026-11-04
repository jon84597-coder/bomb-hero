# -*- coding: utf-8 -*-
# v4.75b：大逃殺開局選項（人數／組隊／時長）＋ 介面重排 ＋ 提示改成右上角膠囊
# v4.75c：開發者預設（全關卡解鎖、金幣無限）一併在這裡
import io, sys
P = 'index.html'
s = io.open(P, encoding='utf-8').read()

def rep(old, new, tag, cnt=1):
    global s
    n = s.count(old)
    if n != cnt:
        print('!! %s count=%d (want %d)' % (tag, n, cnt)); sys.exit(1)
    s = s.replace(old, new)
    print('ok', tag)

def cut(start, end, new, tag):
    """把 start..end（不含 end）整段換掉"""
    global s
    i = s.index(start); j = s.index(end, i)
    s = s[:i] + new + s[j:]
    print('ok', tag)

# ---------- 0) 開發者預設 ----------
rep("const clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };",
    "const clamp = function (v, a, b) { return v < a ? a : v > b ? b : v };\n"
    "// v4.75：這份 index.html 就是開發者版本 —— 預設全部關卡解鎖、金幣無限（錢包顯示 ∞、買東西不扣錢）。\n"
    "//   要驗一般玩家的流程，把 DEV_BUILD 改成 false 就好。\n"
    "const DEV_BUILD = true;", 'DEV_BUILD')

rep("""  function isDevUser() {
    try { return !!(typeof Cloud !== 'undefined' && Cloud && Cloud.isDev && Cloud.isDev()); } catch (e) { return false; }
  }""",
    """  function isDevUser() {
    if (DEV_BUILD) return true;
    try { return !!(typeof Cloud !== 'undefined' && Cloud && Cloud.isDev && Cloud.isDev()); } catch (e) { return false; }
  }""", 'Shop dev')

rep("  function isDev() { return !!(S.acc && S.acc.dev); }",
    "  function isDev() { return DEV_BUILD || !!(S.acc && S.acc.dev); }", 'Cloud dev')

rep("  dev: false,                              // v4.3：開發者 → 全關卡解鎖",
    "  dev: true,                               // v4.75：預設就是開發者（全關卡解鎖）", 'Solo dev')

rep("  maxUnlocked() { return Solo.dev ? SOLO_STAGES : Solo.unlocked; },",
    "  maxUnlocked() { return (Solo.dev || DEV_BUILD) ? SOLO_STAGES : Solo.unlocked; },", 'Solo maxUnlocked')

rep("Solo.applyDev(!!a.dev);", "Solo.applyDev(DEV_BUILD || !!a.dev);", 'applyDev')

# ---------- 1) BR 常數：人數／組隊／時長 ----------
rep("""  // [等待秒數, 目標半徑（格）]：10 段 × 60 秒 = 10 分鐘
  PH: [[60, 27], [60, 23.5], [60, 20], [60, 17], [60, 14.5], [60, 12], [60, 9.5], [60, 7], [60, 4.6], [60, 2.8]],""",
"""  // v4.75：開局選項（入口卡）—— 人數／組隊人數／場長
  opt: { n: 30, team: 1, dur: 10 },
  TEAM: 1,             // 1 = 單人混戰；2／3／4 = 組隊（隊員之間不會互炸）
  // [等待秒數, 目標半徑（格）]：10 段 × 60 秒 = 10 分鐘
  PH10: [[60, 27], [60, 23.5], [60, 20], [60, 17], [60, 14.5], [60, 12], [60, 9.5], [60, 7], [60, 4.6], [60, 2.8]],
  // 5 段 × 60 秒 = 5 分鐘（半徑跨得大一點，5 分鐘也收得完）
  PH5: [[60, 24], [60, 19], [60, 14], [60, 8.5], [60, 3]],
  PH: [],""", 'BR opt')

# ---------- 2) startBR：套用選項 ----------
rep("""  Game.state = 'idle'; paused = false;
  Game.brOut = 0;
  const me = 0;""",
"""  Game.state = 'idle'; paused = false;
  Game.brOut = 0;
  // v4.75：把入口卡的選項套進這一場（人數上限 50，地圖 2,464 格放得下）
  BR.N = clamp(BR.opt.n | 0, 20, 50);
  BR.TEAM = clamp(BR.opt.team | 0, 1, 4);
  BR.PH = (BR.opt.dur | 0) === 5 ? BR.PH5 : BR.PH10;
  Game.brTeam = BR.TEAM;
  Game.teamsOn = BR.TEAM >= 2 ? BR.TEAM : 0;      // 隊友之間不互炸（火焰判定會看這個）
  const me = 0;""", 'startBR opt')

rep("""    if (!isMe) p.ai = true;
    Game.players.push(p);""",
"""    if (!isMe) p.ai = true;
    p.team = BR.TEAM >= 2 ? Math.floor(i / BR.TEAM) : -1;
    Game.players.push(p);""", 'team assign')

rep("  Game.teamsOn = 0; Game.winsNeeded = 1; Game.teamWins = [0, 0, 0, 0];",
    "  Game.winsNeeded = 1; Game.teamWins = [0, 0, 0, 0];", 'teamsOn pre')

# ---------- 3) 隊友不互炸（投射物）＋ AI 不打隊友 ----------
rep("""      if (Math.floor(p.x / T) !== b.cx || Math.floor(p.y / T) !== b.cy) return;
      if (Game.mode === 'battle' || Game.mode === 'br') killBattlePlayer(p, b.owner);""",
"""      if (Math.floor(p.x / T) !== b.cx || Math.floor(p.y / T) !== b.cy) return;
      if (Game.teamsOn >= 2 && b.owner && b.owner !== p && b.owner.team >= 0 && b.owner.team === p.team) return;
      if (Game.mode === 'battle' || Game.mode === 'br') killBattlePlayer(p, b.owner);""", 'bolt team')

rep("""        Game.players.forEach(function (q) {
          if (q === p || !q.alive || q.cart) return;
          const dd = dist2(q.x, q.y, p.x, p.y);""",
"""        Game.players.forEach(function (q) {
          if (q === p || !q.alive || q.cart || sameTeam(p, q)) return;
          const dd = dist2(q.x, q.y, p.x, p.y);""", 'ai foe 1')

rep("""      Game.players.forEach(function (q) {
        if (q !== p && q.alive && !playerHiding(q)) {   // v4.16：躲在樹叢裡的對手 AI 看不到""",
"""      Game.players.forEach(function (q) {
        if (q !== p && q.alive && !playerHiding(q) && !sameTeam(p, q)) {   // v4.16：躲在樹叢裡的對手 AI 看不到""",
 'ai foe 2')

rep("function controlAI(p, dt) {",
    """// v4.75：大逃殺組隊 —— 同隊的不互打（單人混戰時 team 是 -1，永遠不回 true）
function sameTeam(a, b) {
  return !!((Game.brTeam | 0) >= 2 && a && b && a.team >= 0 && a.team === b.team);
}
function controlAI(p, dt) {""", 'sameTeam')

# ---------- 4) 勝負：剩一隊就奪冠 ----------
rep("""      const alive = Game.players.filter(function (q) { return q.alive; });
      if (alive.length <= 1 && Game.state === 'play') brFinish(alive[0] || null);""",
"""      const alive = Game.players.filter(function (q) { return q.alive; });
      let over = alive.length <= 1;
      if (!over && (Game.brTeam | 0) >= 2) {
        const tm = {};
        alive.forEach(function (q) { tm[q.team | 0] = 1; });
        if (Object.keys(tm).length <= 1) over = true;      // 只剩一隊 → 那一隊奪冠
      }
      if (over && Game.state === 'play') brFinish(alive[0] || null);""", 'win cond')

rep("  const title = win ? '🏆 大逃殺冠軍！' : ('🏝️ 第 ' + place + ' 名 / ' + BR.N);",
    "  const title = win ? ((BR.TEAM | 0) >= 2 ? '🏆 你們這隊奪冠！' : '🏆 大逃殺冠軍！') : ('🏝️ 第 ' + place + ' 名 / ' + BR.N);",
    'win title')

# ---------- 5) 提示：右上角膠囊（不擋畫面中央） ----------
rep("function showBRDeath(title, sub, good) {",
"""// v4.75：大逃殺提示一律走「右上角膠囊」—— 滑入、堆疊最多 3 則、自動淡出。
//   以前的 banner() 是畫面正中央 clamp(52px,10vmin,110px) 的巨字，整個遊戲畫面都被蓋住。
function brTip(ico, txt, kind, dur) {
  let box = $id('brTips');
  if (!box) {
    box = document.createElement('div');
    box.id = 'brTips';
    document.body.appendChild(box);
  }
  const d = document.createElement('div');
  d.className = 'btip' + (kind ? ' ' + kind : '');
  d.innerHTML = '<i>' + ico + '</i><span>' + tr(txt) + '</span>';
  box.appendChild(d);
  while (box.children.length > 3) box.removeChild(box.firstChild);
  setTimeout(function () { d.classList.add('on'); }, 16);
  setTimeout(function () {
    d.classList.remove('on');
    setTimeout(function () { try { d.remove(); } catch (e) {} }, 420);
  }, Math.max(900, (dur || 2.2) * 1000));
}

function showBRDeath(title, sub, good) {""", 'brTip')

rep("          banner('毒圈收縮', 1.0);",
    "          brTip('🌀', '毒圈收縮 · 半徑 ' + Math.round(z.tr) + ' 格', 'warn', 1.9);", 'tip zone')

rep("      banner('♥ ' + p.brHp, .55);",
    "      if (Game.mode === 'br') brTip('💔', '受到傷害 · 剩 ' + p.brHp + ' 點血', 'bad', 1.6);\n      else banner('♥ ' + p.brHp, .55);",
    'tip hp')

rep("""  if (win) {
    banner(title, 3.2);""",
"""  if (win) {
    brTip('🏆', title, 'good', 3.2);""", 'tip win')

rep("""function brOnDeath(p) {
  p.brPlace = Math.max(1, Game.brAlive | 0);
  Game.brAlive = Math.max(0, (Game.brAlive | 0) - 1);""",
"""function brOnDeath(p) {
  p.brPlace = Math.max(1, Game.brAlive | 0);
  Game.brAlive = Math.max(0, (Game.brAlive | 0) - 1);
  if (p.ai) brTip('☠️', (p.name || 'AI') + ' 出局 · 剩 ' + Game.brAlive + ' 人', '', 1.5);""", 'tip death')

# ---------- 6) HUD 重排 ----------
cut("// 左上角小地圖下方：存活人數 + 縮圈倒數\nfunction drawBRHud() {",
    "// v4.74：大逃殺結算小卡",
"""// 左上角：存活 / 縮圈 / 血量（v4.75 重排 —— 一列一列對齊，帶進度條與血量格）
function drawBRHud() {
  if (Game.mode !== 'br' || !Game.brZone) return;
  const mm = miniMapOn() ? miniMapBox() : null;
  const x = 8, y = mm ? mm.y + mm.h + 7 : 8;
  const w = mm ? Math.max(112, mm.w) : 150, h = 68;
  const z = Game.brZone;
  const me = Game.players[0] || {};
  const alive = Game.players.filter(function (q) { return q.alive; }).length;
  const total = Game.players.length || BR.N;
  const hp = Math.max(0, me.brHp == null ? 10 : me.brHp | 0);
  const teamOn = (Game.brTeam | 0) >= 2;
  const teams = teamOn ? Math.ceil(total / (Game.brTeam | 1)) : 0;
  let ta = 0;
  if (teamOn) {
    const tm = {};
    Game.players.forEach(function (q) { if (q.alive) tm[q.team | 0] = 1; });
    ta = Object.keys(tm).length;
  }
  const pad = 9, fs = Math.max(10, Math.round(w * .10));
  ctx.save();
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, 11); }
  else { ctx.beginPath(); ctx.rect(x, y, w, h); }
  let g = null;
  try {
    g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, 'rgba(20,28,46,.93)'); g.addColorStop(1, 'rgba(7,11,20,.93)');
  } catch (e) {}
  ctx.fillStyle = g || 'rgba(8,13,22,.92)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,126,192,.55)'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.lineWidth = 1;
  ctx.fillStyle = 'rgba(255,126,192,.92)';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x + 2, y + 11, 2.6, h - 22, 2); ctx.fill(); }
  else ctx.fillRect(x + 2, y + 11, 2.6, h - 22);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = '900 ' + (fs + 4) + 'px sans-serif';
  ctx.fillStyle = '#ffe9b0';
  ctx.fillText(String(alive), x + pad, y + 16);
  const nw = ctx.measureText(String(alive)).width;
  ctx.font = '700 ' + fs + 'px sans-serif';
  ctx.fillStyle = 'rgba(198,212,234,.78)';
  ctx.fillText(' / ' + total, x + pad + nw, y + 17);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(150,205,255,.92)';
  ctx.fillText(teamOn ? ('隊伍 ' + ta + '/' + teams) : '單人混戰', x + w - pad, y + 17);
  ctx.textAlign = 'left';
  const left = z.phase >= BR.PH.length ? 0 : Math.max(0, z.t);
  const durP = z.phase < BR.PH.length ? (BR.PH[z.phase][0] || 60) : 60;
  const pr = z.phase >= BR.PH.length ? 1 : clamp(1 - left / durP, 0, 1);
  ctx.font = '700 ' + fs + 'px sans-serif';
  ctx.fillStyle = '#ffc0dd';
  ctx.fillText(z.phase >= BR.PH.length ? '終局' : ('縮圈 ' + Math.ceil(left) + 's'), x + pad, y + 34);
  const bx = x + pad, by = y + 41, bw = w - pad * 2, bh = 4;
  ctx.fillStyle = 'rgba(255,255,255,.14)';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 2); ctx.fill(); }
  else ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = '#ff7ec0';
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(bx, by, Math.max(2, bw * pr), bh, 2); ctx.fill(); }
  else ctx.fillRect(bx, by, Math.max(2, bw * pr), bh);
  const pip = 10, pw = Math.max(3, (bw - (pip - 1) * 2) / pip);
  for (let i = 0; i < pip; i++) {
    const px2 = bx + i * (pw + 2);
    ctx.fillStyle = i < hp ? (hp <= 3 ? '#ff6b6b' : '#8ff0b0') : 'rgba(255,255,255,.14)';
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(px2, y + 52, pw, 6, 2); ctx.fill(); }
    else ctx.fillRect(px2, y + 52, pw, 6);
  }
  ctx.restore();
}

""", 'BR HUD')

# ---------- 7) 入口卡（分段控制器） ----------
cut("$id('btnBR').addEventListener('click', function () {",
    "$id('btnSettings').addEventListener('click', function () {",
"""function brCardHTML() {
  const o = BR.opt;
  function seg(k, arr) {
    return '<div class="brseg" data-k="' + k + '">' + arr.map(function (v) {
      return '<b data-v="' + v[0] + '"' + ((o[k] | 0) === (v[0] | 0) ? ' class="on"' : '') + '>' + v[1] + '</b>';
    }).join('') + '</div>';
  }
  let tkN = 0;
  try { tkN = Shop.tickets ? Shop.tickets() : 0; } catch (e) {}
  const n = o.n | 0, tm = o.team | 0, du = o.dur | 0;
  return '<div class="brc">' +
    '<div class="brc-h"><b>🏝️ 大逃殺</b><span>' + BR.W + '×' + BR.H + ' 隨機大陸</span>' +
    '<button class="brc-x" id="brOk" type="button">✕</button></div>' +
    '<div class="brrow"><label class="brlab">人數</label>' + seg('n', [[30, '30 人'], [50, '50 人']]) + '</div>' +
    '<div class="brrow"><label class="brlab">組隊</label>' +
      seg('team', [[1, '單人'], [2, '2 人'], [3, '3 人'], [4, '4 人']]) + '</div>' +
    '<div class="brrow"><label class="brlab">時間</label>' + seg('dur', [[5, '5 分鐘 · 5 圈'], [10, '10 分鐘 · 10 圈']]) + '</div>' +
    '<div class="brsum" id="brSum">' + brSumText() + '</div>' +
    '<div class="brgo-box"><button class="mbtn warm" id="brGo" type="button">' +
      (tm >= 2 ? ('出發（' + Math.ceil(n / tm) + ' 隊 × ' + tm + ' 人）') : ('出發（' + n + ' 人混戰）')) +
    '</button><div class="brfoot">🎟️ ' + (BR.FREE ? '正式測試期間免費入場' : '每場消耗 1 張門票（現有 ' + tkN + ' 張）') +
      '　·　14 隻小怪　·　八種地形各佔一區</div></div>' +
  '</div>';
}
function brSumText() {
  const o = BR.opt, n = o.n | 0, tm = o.team | 0, du = o.dur | 0;
  return tm >= 2
    ? ('<b>' + Math.ceil(n / tm) + ' 隊</b>（每隊 ' + tm + ' 人）· 隊友不會互炸 · ' +
       du + ' 分鐘 ' + (du === 5 ? 5 : 10) + ' 圈（每分鐘一縮）')
    : ('<b>' + n + ' 人</b>同場 · 最後一個活著的就是冠軍 · ' + du + ' 分鐘 ' + (du === 5 ? 5 : 10) + ' 圈（每分鐘一縮）');
}

$id('btnBR').addEventListener('click', function () {
  AudioSys.sfx('click');
  let ov = $id('brOv');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'brOv'; ov.className = 'overlay-in';
    document.body.appendChild(ov);
  }
  ov.innerHTML = brCardHTML();
  ov.classList.remove('hide');
  ov.onclick = function (ev) {
    const b = ev.target;
    if (b && b.tagName === 'B' && b.dataset && b.dataset.v) {
      const k = b.parentNode.getAttribute('data-k');
      BR.opt[k] = parseInt(b.dataset.v, 10) || 1;
      AudioSys.sfx('click');
      const on = b.parentNode.querySelectorAll('b');
      for (let i = 0; i < on.length; i++) on[i].classList.toggle('on', on[i] === b);
      const sum = $id('brSum');
      if (sum) sum.innerHTML = brSumText();
      const go = $id('brGo');
      if (go) go.textContent = (BR.opt.team | 0) >= 2
        ? ('出發（' + Math.ceil(BR.opt.n / BR.opt.team) + ' 隊 × ' + BR.opt.team + ' 人）')
        : ('出發（' + BR.opt.n + ' 人混戰）');
    }
  };
  $id('brOk').addEventListener('click', function () {
    AudioSys.sfx('click'); ov.classList.add('hide');
  });
  $id('brGo').addEventListener('click', function () {
    AudioSys.sfx('click');
    let tkN = 0;
    try { tkN = Shop.tickets ? Shop.tickets() : 0; } catch (e) {}
    if (!BR.FREE && tkN <= 0) {
      ov.classList.add('hide');
      try { Shop.open(); } catch (e) {}
      return;
    }
    ov.classList.add('hide');
    try { startBR(); } catch (e) { try { __bootFail('startBR', e); } catch (e2) {} }
  });
});
""", 'BR card')

# ---------- 8) 開場提示 ----------
rep("""  Game.brAlive = Game.players.length;""",
"""  Game.brAlive = Game.players.length;
  brTip('🏝️', BR.TEAM >= 2
    ? ((BR.N / BR.TEAM | 0) + ' 隊 · ' + BR.opt.dur + ' 分鐘 · 隊友不會互炸')
    : (BR.N + ' 人混戰 · ' + BR.opt.dur + ' 分鐘 · 最後活著的奪冠'), 'good', 3.2);""", 'start tip')

# ---------- 9) CSS ----------
rep(".br-end { position: fixed;",
""".brc { width: min(93vw, 372px); max-height: 86vh; overflow: auto; border-radius: 18px; color: #eaf2ff;
  background: linear-gradient(180deg, rgba(17,25,42,.975), rgba(9,14,25,.975));
  border: 1px solid rgba(120,190,255,.30); box-shadow: 0 24px 64px rgba(0,0,0,.62); }
.brc-h { display: flex; align-items: center; gap: 8px; padding: 13px 14px 11px;
  border-bottom: 1px solid rgba(255,255,255,.08); }
.brc-h b { font-size: 16px; font-weight: 900; letter-spacing: .4px; }
.brc-h span { margin-left: auto; font-size: 11px; font-weight: 700; color: #8fb4d8; }
.brc-x { width: 30px; height: 30px; border-radius: 9px; border: 1px solid rgba(255,255,255,.14);
  background: rgba(255,255,255,.06); color: #cfe0f5; font-size: 13px; font-weight: 900; cursor: pointer; }
.brrow { display: flex; align-items: center; gap: 9px; padding: 11px 14px 0; }
.brlab { width: 30px; flex: none; font-size: 11.5px; font-weight: 800; color: #9dbbdd; letter-spacing: .5px; }
.brseg { display: flex; gap: 6px; flex: 1; min-width: 0; }
.brseg b { flex: 1; text-align: center; padding: 9px 4px; border-radius: 10px; font-size: 12px; font-weight: 800;
  color: #c6d7ee; background: rgba(255,255,255,.055); border: 1px solid rgba(255,255,255,.10);
  cursor: pointer; transition: transform .12s, background .15s, color .15s; white-space: nowrap; }
.brseg b.on { color: #3a1a00; border-color: #ffd08a; transform: translateY(-1px);
  background: linear-gradient(180deg, #ffc65c, #f0801e); box-shadow: 0 6px 16px rgba(240,128,30,.34); }
.brsum { margin: 13px 14px 0; padding: 9px 11px; border-radius: 11px; font-size: 11.5px; line-height: 1.55;
  color: #b8cbe4; background: rgba(90,150,220,.10); border: 1px solid rgba(120,190,255,.20); }
.brsum b { color: #ffe0a0; }
.brgo-box { padding: 12px 14px 14px; }
.brgo-box .mbtn { width: 100%; }
.brfoot { margin-top: 8px; font-size: 10.5px; line-height: 1.5; color: #8ea6c4; text-align: center; }
#brTips { position: fixed; right: 8px; top: 58px; z-index: 61; display: flex; flex-direction: column;
  gap: 6px; align-items: flex-end; max-width: min(78vw, 268px); pointer-events: none; }
.btip { display: flex; align-items: center; gap: 7px; padding: 6px 11px 6px 7px; border-radius: 999px;
  background: linear-gradient(90deg, rgba(12,18,32,.94), rgba(23,33,55,.88));
  border: 1px solid rgba(140,200,255,.34); box-shadow: 0 8px 22px rgba(0,0,0,.46);
  color: #eaf2ff; font-size: 12px; font-weight: 700; line-height: 1.25;
  transform: translateX(118%); opacity: 0;
  transition: transform .34s cubic-bezier(.2,.9,.3,1), opacity .34s; }
.btip.on { transform: none; opacity: 1; }
.btip i { display: grid; place-items: center; width: 21px; height: 21px; border-radius: 50%;
  font-style: normal; font-size: 11px; flex: none; border: 1px solid rgba(255,255,255,.28);
  background: radial-gradient(circle at 34% 28%, rgba(255,255,255,.45), rgba(110,170,250,.22)); }
.btip.warn { border-color: rgba(255,160,90,.62); }
.btip.warn i { background: radial-gradient(circle at 34% 28%, #ffd39a, #c25a1a); }
.btip.bad { border-color: rgba(255,110,140,.60); }
.btip.bad i { background: radial-gradient(circle at 34% 28%, #ffb6c6, #a02446); }
.btip.good { border-color: rgba(120,240,180,.60); }
.btip.good i { background: radial-gradient(circle at 34% 28%, #b7ffd6, #0f8a5a); }
.br-end { position: fixed;""", 'CSS')

io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('done')
