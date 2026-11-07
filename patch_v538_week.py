# -*- coding: utf-8 -*-
import io, os

P = 'bomb-hero/index.html'
s = io.open(P, encoding='utf-8').read()
n0 = len(s)
steps = []

def rep(a, b, tag):
    global s
    c = s.count(a)
    assert c == 1, '[%s] anchor count=%d' % (tag, c)
    s = s.replace(a, b, 1)
    steps.append(tag)

# ---------------------------------------------------------------- A. WeekMod 模組
A_OLD = '''const Season = (function () {
  try {
    return (function () {
      const KEY = 'bombhero-season-v1';'''

A_NEW = '''/* ============================================================================
 * v5.38\uff1a\u6bcf\u9031\u8b8a\u7570\u898f\u5247
 *   \u6bcf\u9031\uff08UTC+8 \u9031\u4e00\u63db\u9031\uff09\u5f9e\u56fa\u5b9a\u8868\u62bd 2 \u689d\u898f\u5247\uff0c\u53ea\u5728\u300c\u55ae\u4eba\u95d6\u95dc\uff0fRPG\u300d\u751f\u6548
 *   \u2014\u2014 \u5c0d\u6230\u3001\u5927\u9003\u6bba\u4e0d\u5403\uff08\u516c\u5e73\u6027\uff09\u3002\u540c\u4e00\u500b\u79d2\u6578 \u2192 \u5168\u4e16\u754c\u7684\u73a9\u5bb6\u540c\u4e00\u9031\u770b\u5230\u540c\u4e00\u7d44\uff0c
 *   \u53ef\u4ee5\u4e92\u76f8\u8a0e\u8ad6\u300c\u9019\u9031\u600e\u9ebc\u6253\u300d\u3002\u9019\u5c31\u662f\u300c\u6bcf\u9031\u56de\u4f86\u770b\u770b\u9019\u9031\u662f\u4ec0\u9ebc\u300d\u7684\u7406\u7531\u3002
 *   \u5168\u90e8\u53ea\u52d5\u5169\u500b\u6578\u503c\uff08\u5c0f\u602a\u79fb\u901f\u3001\u5c0f\u602a\u6578\u91cf\u3001\u958b\u5c40\u9053\u5177\u6578\u3001\u5c0f\u602a\u8840\u683c\uff09\uff0c
 *   \u4e0d\u78b0\u7269\u7406\u3001\u4e0d\u78b0\u8a08\u5206\uff0c\u4e0d\u6703\u56e0\u70ba\u8b8a\u7570\u800c\u51fa\u73fe\u7121\u6cd5\u5b8c\u6210\u7684\u95dc\u5361\u3002
 * ========================================================================== */
const WEEK_EPOCH = Date.UTC(2026, 0, 5);        // \u7b2c 0 \u9031\u7684\u9031\u4e00
const WEEK_MODS = [
  { id: 'rush',  ico: '\U0001F525', foeSpd: 1.20, itemK: .85 },
  { id: 'loot',  ico: '\U0001F48E', foeSpd: .94,  itemK: 1.70 },
  { id: 'tough', ico: '\U0001F6E1', foeHp: 1,     itemK: 1.25 },
  { id: 'swarm', ico: '\U0001F41C', foeN: 3,      foeSpd: .90 },
  { id: 'tiny',  ico: '\U0001FAB6', foeSpd: 1.08, itemK: 1.30 },
  { id: 'calm',  ico: '\U0001F33F', foeSpd: .85,  foeN: -2 }
];
const WeekMod = (function () {
  function weekIdx() { return Math.floor((Date.now() - WEEK_EPOCH) / 604800000); }
  function daysLeft() { return 7 - Math.floor((Date.now() - WEEK_EPOCH) / 86400000) % 7; }
  function list() {
    const w = weekIdx(), n = WEEK_MODS.length;
    const a = WEEK_MODS[((w % n) + n) % n];
    const b = WEEK_MODS[(((w * 3 + 2) % n) + n) % n];
    return a === b ? [a] : [a, b];
  }
  // \u53ea\u6709\u55ae\u4eba\u95d6\u95dc\u8207 RPG \u5403\u8b8a\u7570\uff08\u5c0d\u6230\uff0f\u5927\u9003\u6bba\u8981\u516c\u5e73\uff09
  function live() { return Game.mode === 'solo' || Game.mode === 'rpg'; }
  function mul(field) {
    if (!live()) return 1;
    const L = list(); let r = 1;
    for (let i = 0; i < L.length; i++) if (typeof L[i][field] === 'number') r *= L[i][field];
    return r;
  }
  function add(field) {
    if (!live()) return 0;
    const L = list(); let r = 0;
    for (let i = 0; i < L.length; i++) if (typeof L[i][field] === 'number') r += L[i][field];
    return r;
  }
  return { POOL: WEEK_MODS, list: list, weekIdx: weekIdx, daysLeft: daysLeft, live: live, mul: mul, add: add };
})();
function weekMul(f) { return WeekMod.mul(f); }
function weekAdd(f) { return WeekMod.add(f); }
function weekBanner() {
  if (!WeekMod.live()) return;
  const L = WeekMod.list();
  if (!L.length) return;
  let nm = '';
  for (let i = 0; i < L.length; i++) nm += (i ? ' \u00b7 ' : '') + t2('week.m.' + L[i].id);
  try { brTip('\U0001F300', t2('week.on', { m: nm }), 'good', 3.2); } catch (e) {}
}

const Season = (function () {
  try {
    return (function () {
      const KEY = 'bombhero-season-v1';'''
rep(A_OLD, A_NEW, 'A-weekmod')

# ---------------------------------------------------------------- B. 面板區塊
B_OLD = '''function seasonBlock() {'''
B_NEW = '''// v5.38\uff1a\u672c\u9031\u8b8a\u7570\uff08\u62fc\u5728\u7b7e\u5230\u9762\u677f\u6700\u4e0a\u9762\uff0c\u8ddf\u8cfd\u5b63\u4e26\u5217\uff09
function weekModBlock() {
  const L = WeekMod.list();
  let h = '<div class="gsec">\U0001F300 ' + t2('week.title') +
    '<span class="gtag">' + t2('week.tag', { d: WeekMod.daysLeft() }) + '</span></div>';
  h += '<div class="stgoals">';
  for (let i = 0; i < L.length; i++) {
    const M = L[i];
    h += '<div class="stgoal"><span class="sgico">' + M.ico + '</span>' +
      '<span class="sgtx"><b>' + t2('week.m.' + M.id) + '</b>' +
      '<small>' + t2('week.d.' + M.id) + '</small></span></div>';
  }
  if (!L.length) {
    h += '<div class="stgoal"><span class="sgtx"><b>' + t2('week.none') + '</b></span></div>';
  }
  h += '</div>';
  return h;
}

function seasonBlock() {'''
rep(B_OLD, B_NEW, 'B-weekblock')

B2_OLD = '''            seasonBlock() +'''
B2_NEW = '''            weekModBlock() +
            seasonBlock() +'''
rep(B2_OLD, B2_NEW, 'B2-panel')

# ---------------------------------------------------------------- C. makeEnemy 吃變異
C_OLD = '''  const hpBase = 1;'''
C_NEW = '''  // v5.38\uff1a\u6bcf\u9031\u8b8a\u7570\u53ef\u4ee5\u7d66\u5c0f\u602a\u591a\u4e00\u683c\u8840\uff08\u53ea\u5f71\u97ff\u55ae\u4eba\uff1bRPG \u7a0d\u5f8c\u6703\u88ab RPG_FOE \u8986\u5beb\uff09
  const hpBase = Math.max(1, 1 + weekAdd('foeHp'));'''
rep(C_OLD, C_NEW, 'C-foe-hp')

C2_OLD = '''    speed: (sp.spd + stage * (sp.kind === 'fly' ? 1.2 : 2.6)) * M * (Game.spdK || 1), color: sp.color, color2: sp.color2,'''
C2_NEW = '''    speed: (sp.spd + stage * (sp.kind === 'fly' ? 1.2 : 2.6)) * M * (Game.spdK || 1) * weekMul('foeSpd'), color: sp.color, color2: sp.color2,'''
rep(C2_OLD, C2_NEW, 'C2-foe-spd')

# ---------------------------------------------------------------- D. 關卡道量與怪量
D_OLD = '''    items: lay ? Math.round(lay.floor * .10) : Math.min(18, 14 + Math.round(stage * .15)),'''
D_NEW = '''    items: Math.max(2, Math.round((lay ? Math.round(lay.floor * .10) : Math.min(18, 14 + Math.round(stage * .15))) * weekMul('itemK'))),'''
rep(D_OLD, D_NEW, 'D-item-k')

D2_OLD = '''    for (let i = 0; i < n; i++) {
      let x, y;'''
D2_NEW = '''    // v5.38\uff1a\u6bcf\u9031\u8b8a\u7570\u53ef\u4ee5 +-\u5c0f\u602a\u6578\u91cf\uff08\u4ecd\u53d7 FOE_MAX_LIVE \u5c01\u9802\uff09
    const nWeek = Math.max(2, Math.min(FOE_MAX_LIVE, n + weekAdd('foeN')));
    for (let i = 0; i < nWeek; i++) {
      let x, y;'''
rep(D2_OLD, D2_NEW, 'D2-foe-n')

# ---------------------------------------------------------------- E. 進場提示
E_OLD = '''  Screen.show('game');
  resizeView();                 // \u5148\u91cf\u6e2c\u5be6\u969b\u756b\u9762\u5c3a\u5bf8\uff0c\u5730\u5716\u683c\u5b50\u5927\u5c0f\u624d\u6b63\u78ba
  buildSoloStage(stage, true);'''
E_NEW = '''  Screen.show('game');
  resizeView();                 // \u5148\u91cf\u6e2c\u5be6\u969b\u756b\u9762\u5c3a\u5bf8\uff0c\u5730\u5716\u683c\u5b50\u5927\u5c0f\u624d\u6b63\u78ba
  buildSoloStage(stage, true);
  weekBanner();                 // v5.38\uff1a\u9032\u5834\u5148\u544a\u8a34\u4f60\u9019\u9031\u662f\u4ec0\u9ebc\u8b8a\u7570'''
rep(E_OLD, E_NEW, 'E-banner')

# ---------------------------------------------------------------- F. 匯出
F_OLD = '''  BOSS_BREAK: BOSS_BREAK, bossShieldMax: bossShieldMax, bossPhaseSpd: bossPhaseSpd,'''
F_NEW = '''  BOSS_BREAK: BOSS_BREAK, bossShieldMax: bossShieldMax, bossPhaseSpd: bossPhaseSpd,
  WeekMod: WeekMod, WEEK_MODS: WEEK_MODS, weekMul: weekMul, weekAdd: weekAdd, weekBanner: weekBanner,'''
rep(F_OLD, F_NEW, 'F-export')

out = s.replace('\r\n', '\n')
tmp = P + '.tmp'
io.open(tmp, 'w', encoding='utf-8', newline='\n').write(out)
os.replace(tmp, P)
print('OK', n0, '->', len(out), 'delta', len(out) - n0)
print(' | '.join(steps))
