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

# ---------------------------------------------------------------- A. Ghost 模組
A_OLD = '''function dailyClear(p) {'''
A_NEW = '''/* ============================================================================
 * v5.38\uff1a\u6bcf\u65e5\u6311\u6230\u300c\u6b98\u5f71\u300d
 *   \u6311\u6230\u662f\u56fa\u5b9a\u5730\u5716\u3001\u56fa\u5b9a\u8d77\u9ede\u3001\u6bd4\u8ab0\u5feb \u2192 \u6b63\u597d\u53ef\u4ee5\u628a\u81ea\u5df1\u6700\u5feb\u90a3\u4e00\u5834\u7684\u8def\u7dda\u8a18\u4e0b\u4f86\u3002
 *   \u91cd\u73a9\u6642\u5834\u4e0a\u6703\u591a\u4e00\u500b\u534a\u900f\u660e\u7684\u300c\u4f60\u300d\uff0c\u8ddf\u8457\u7576\u6642\u7684\u8d70\u6cd5\u8dd1 \u2014\u2014 \u4f60\u5c31\u6709\u4e86\u4e00\u500b
 *   \u770b\u5f97\u898b\u3001\u8ddf\u5f97\u4e0a\u7684\u5c0d\u624b\uff08\u81ea\u5df1\uff09\u3002\u9019\u6bd4\u4e00\u500b\u62bd\u8c61\u7684\u300c\u6700\u4f73\u79d2\u6578\u300d\u6709\u611f\u89ba\u5f97\u591a\u3002
 *   \u8a18\u9304\u6bcf 0.5 \u79d2\u4e00\u683c\uff08\u6700\u591a 400 \u683c\uff09\uff0c\u53ea\u5b58\u300c\u4eca\u5929\u6700\u5feb\u7684\u4e00\u6b21\u904e\u95dc\u300d\uff0c\u4e26\u4e14\u53ea\u6709\u540c\u4e00\u5929\u624d\u6703\u51fa\u73fe\u3002
 * ========================================================================== */
const Ghost = {
  KEY: 'bombhero-daily-ghost-v1',
  GAP: .5,
  MAXN: 400,
  data: null,
  load() {
    try {
      const o = JSON.parse(localStorage.getItem(Ghost.KEY) || 'null');
      Ghost.data = (o && o.day && Array.isArray(o.path) && o.path.length > 1) ? o : null;
    } catch (e) { Ghost.data = null; }
    return Ghost.data;
  },
  today() {
    const g = Ghost.data || Ghost.load();
    return (g && g.day === dailyDayKey()) ? g : null;
  },
  save(day, ms, path) {
    if (!path || path.length < 2) return;
    try { localStorage.setItem(Ghost.KEY, JSON.stringify({ day: day, ms: ms | 0, path: path })); } catch (e) {}
    Ghost.data = { day: day, ms: ms | 0, path: path };
  },
  start() {
    const g = Ghost.today();
    Game.ghost = { has: !!g, ms: g ? g.ms : 0, t: 0, acc: 0, rec: [] };
  },
  tick(dt) {
    const q = Game.ghost;
    if (!q || !Game.daily) return;
    q.t += dt;
    q.acc += dt;
    if (q.acc < Ghost.GAP) return;
    q.acc = 0;
    const p = Game.players[0];
    if (!p || q.rec.length >= Ghost.MAXN) return;
    q.rec.push([Math.round(q.t * 10) / 10, Math.round(p.x), Math.round(p.y)]);
  },
  finish(day, ms) {
    const q = Game.ghost;
    if (!q || !q.rec || q.rec.length < 2) return;
    const cur = Ghost.today();
    if (!cur || (ms | 0) <= (cur.ms | 0)) Ghost.save(day, ms, q.rec);
  },
  // t \u79d2\u6642\u6b98\u5f71\u61c9\u8a72\u5728\u54ea\uff08\u7dda\u6027\u5167\u63d2\uff09
  at(sec) {
    const g = Ghost.today();
    if (!g) return null;
    const A = g.path;
    if (sec <= A[0][0]) return { x: A[0][1], y: A[0][2] };
    for (let i = 1; i < A.length; i++) {
      if (A[i][0] >= sec) {
        const a = A[i - 1], b = A[i];
        const k = (sec - a[0]) / Math.max(.001, b[0] - a[0]);
        return { x: a[1] + (b[1] - a[1]) * k, y: a[2] + (b[2] - a[2]) * k };
      }
    }
    return null;                   // \u8dd1\u5b8c\u4e86 \u2192 \u6b98\u5f71\u6d88\u5931\uff08\u4ee3\u8868\u4f60\u5df2\u7d93\u8d85\u904e\u4ed6\u4e86\uff09
  }
};

function dailyClear(p) {'''
rep(A_OLD, A_NEW, 'A-ghost')

# ---------------------------------------------------------------- B. 開局啟動 / 收工
B_OLD = '''  weekBanner();                 // v5.38\uff1a\u9032\u5834\u5148\u544a\u8a89\u4f60\u9019\u9031\u662f\u4ec0\u9ebc\u8b8a\u7570'''
B_OLD2 = '''  weekBanner();                 // v5.38\uff1a\u9032\u5834\u5148\u544a\u8a34\u4f60\u9019\u9031\u662f\u4ec0\u9ebc\u8b8a\u7570'''
B_NEW = '''  weekBanner();                 // v5.38\uff1a\u9032\u5834\u5148\u544a\u8a34\u4f60\u9019\u9031\u662f\u4ec0\u9ebc\u8b8a\u7570
  // v5.38\uff1a\u6bcf\u65e5\u6311\u6230\u624d\u6709\u6b98\u5f71\uff1b\u5176\u4ed6\u6a21\u5f0f\u4e00\u5f8b\u6e05\u6389
  if (Game.daily) { try { Ghost.start(); } catch (e) { Game.ghost = null; } }
  else Game.ghost = null;'''
if B_OLD in s:
    rep(B_OLD, B_NEW, 'B-ghost-start')
else:
    rep(B_OLD2, B_NEW, 'B-ghost-start')

# ---------------------------------------------------------------- C. 每幀取樣
C_OLD = '''    if (Game.daily && !Game.daily.done) Game.daily.ms += dt * 1000;'''
C_NEW = '''    if (Game.daily && !Game.daily.done) { Game.daily.ms += dt * 1000; Ghost.tick(dt); }'''
rep(C_OLD, C_NEW, 'C-ghost-tick')

# ---------------------------------------------------------------- D. 過關寫入
D_OLD = '''  Daily.saveBest(d.day, d.ms);'''
D_NEW = '''  Daily.saveBest(d.day, d.ms);
  try { Ghost.finish(d.day, d.ms); } catch (e) {}   // v5.38\uff1a\u7834\u7d00\u9304\u624d\u5b58\u6b98\u5f71'''
rep(D_OLD, D_NEW, 'D-ghost-finish')

# ---------------------------------------------------------------- E. \u756b\u9762
E_OLD = '''  Game.players.forEach(function (p) {
    if (playerHiding(p) && !isMyPlayer(p)) return;'''
E_NEW = '''  if (Game.daily && Game.daily.ms) { try { drawDailyGhost(T); } catch (e) {} }
  Game.players.forEach(function (p) {
    if (playerHiding(p) && !isMyPlayer(p)) return;'''
rep(E_OLD, E_NEW, 'E-ghost-draw-call')

# ---------------------------------------------------------------- F. drawDailyGhost
F_OLD = '''function drawPlayer(p, T) {'''
F_NEW = '''/* v5.38\uff1a\u6bcf\u65e5\u6311\u6230\u7684\u6b98\u5f71\uff08\u534a\u900f\u660e\u7684\u81ea\u5df1\uff09\u2014\u2014 \u5168\u7a0b\u5e8f\u7e6a\u88fd\uff0c\u4e0d\u5403\u7f8e\u8853 */
function drawDailyGhost(T) {
  const at = Ghost.at((Game.daily.ms || 0) / 1000);
  if (!at) return;
  if (typeof onScreen === 'function' && !onScreen(at.x, at.y, T * 1.6)) return;
  const R = T * .40;
  const t = Game.gameT || 0;
  ctx.save();
  ctx.globalAlpha = .34;
  ctx.fillStyle = '#9fe4ff';
  ctx.beginPath(); ctx.arc(at.x, at.y - R * 1.34, R * .56, 0, 6.283); ctx.fill();          // \u982d
  ctx.beginPath(); ctx.ellipse(at.x, at.y - R * .22, R * .80, R * 1.00, 0, 0, 6.283); ctx.fill();  // \u8eab
  ctx.globalAlpha = .20;
  ctx.strokeStyle = '#9fe4ff';
  ctx.lineWidth = Math.max(1.5, T * .05);
  const rr = R * (1.16 + .12 * Math.sin(t * 4));
  ctx.beginPath(); ctx.ellipse(at.x, at.y + R * .72, rr, rr * .34, 0, 0, 6.283); ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = .70;
  ctx.font = '700 ' + Math.round(T * .36) + 'px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('\U0001F47B', at.x, at.y - R * 2.20);
  ctx.restore();
  ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
}

function drawPlayer(p, T) {'''
rep(F_OLD, F_NEW, 'F-ghost-draw')

# ---------------------------------------------------------------- G. 匯出
G_OLD = '''  WeekMod: WeekMod, WEEK_MODS: WEEK_MODS, weekMul: weekMul, weekAdd: weekAdd, weekBanner: weekBanner,'''
G_NEW = '''  WeekMod: WeekMod, WEEK_MODS: WEEK_MODS, weekMul: weekMul, weekAdd: weekAdd, weekBanner: weekBanner,
  Ghost: Ghost, drawDailyGhost: drawDailyGhost,'''
rep(G_OLD, G_NEW, 'G-export')

out = s.replace('\r\n', '\n')
tmp = P + '.tmp'
io.open(tmp, 'w', encoding='utf-8', newline='\n').write(out)
os.replace(tmp, P)
print('OK', n0, '->', len(out), 'delta', len(out) - n0)
print(' | '.join(steps))
