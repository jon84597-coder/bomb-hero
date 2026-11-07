# -*- coding: utf-8 -*-
import io, sys

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

# ---------------------------------------------------------------- A. 常數與函式
A_OLD = '''// v5.36\uff1aBOSS \u5834\u5730\u7684\u7bc0\u594f \u2014\u2014 \u6bcf 60 \u79d2 +2 \u5c0f\u5175\uff08\u4e0a\u9650 8\uff09\u3001\u738b\u6b7b\u958b\u9580
function updateBossArena(dt) {'''

A_NEW = '''/* ===================================================================
 * v5.38\uff1aBOSS \u6c7a\u6230\u5834\u300c\u5206\u968e\u6bb5\u7834\u9632\u300d
 *   \u4ee5\u524d\u738b\u5c31\u662f\u4e00\u689d\u8840\uff1a\u7e5e\u5708\u653e\u70b8\u5f48\u3001\u71d2\u5230\u6b7b\uff0c\u4e2d\u9593\u6c92\u6709\u4efb\u4f55\u7bc0\u594f\u3002
 *   \u73fe\u5728\u628a\u5b83\u62c6\u6210\u4e09\u6bb5\u5faa\u74b0\uff1a
 *     \u00b7 \u8b77\u76fe\u671f   \u738b\u8eab\u4e0a\u6709 N \u7247\u8b77\u76fe\uff0c\u6253\u4e0a\u53bb\u53ea\u6389\u8b77\u76fe\u3001\u5b8c\u5168\u4e0d\u6389\u8840\uff08\u6703\u8df3\U0001F6E1\uff09
 *     \u00b7 \u7834\u9632\u7a97\u53e3 \u8b77\u76fe\u5168\u7834 \u2192 5.5 \u79d2\uff0c\u9019\u6bb5\u6642\u9593\u50b7\u5bb3 \u00d72\uff08\u738b\u6703\u61f5\u4e00\u4e0b\u3001\u8eab\u4e0a\u5192\u7d05\u5149\uff09
 *     \u00b7 \u72c2\u66b4     \u7a97\u53e3\u7d50\u675f \u2192 \u8b77\u76fe\u88dc\u6eff\uff0c\u738b\u591a\u4e00\u5c64\u72c2\u66b4\uff08\u66f4\u5feb\u3001\u653e\u5f48\u66f4\u5bc6\uff09\uff0c\u6700\u591a\u4e09\u5c64
 *   \u9019\u6a23\u300c\u6253\u738b\u300d\u5c31\u5f9e\u55ae\u7d14\u7e5e\u5708\uff0c\u8b8a\u6210\u300c\u7b49\u7a97\u53e3\u3001\u6436\u8f38\u51fa\u300d\u3002
 *   \u5168\u90e8\u7528\u73fe\u6709\u5f71\u683c \uff0b \u7a0b\u5e8f\u7e6a\u88fd\uff0c\u4e0d\u9700\u8981\u65b0\u7f8e\u8853\u3002
 * ================================================================== */
const BOSS_BREAK = {
  sec: 5.5,
  mul: 2,
  rageMax: 3,
  rageSpd: .12,
  rageBomb: .15
};
// \u9019\u53ea\u738b\u662f\u4e0d\u662f\u300c\u6c7a\u6230\u5834\u7684\u738b\u300d\uff08\u5927\u9003\u6bba\u4e82\u5165\u738b\u3001\u5c0d\u6230 BOSS \u90fd\u4e0d\u5403\u9019\u5957\uff09
function arenaBossOf(e) {
  const A = Game.bossArena;
  return (A && A.boss && e === A.boss) ? A : null;
}
// \u8b77\u76fe\u7247\u6578\uff1a\u7b2c 1 \u7ae0 3 \u7247\uff0c\u4e4b\u5f8c\u6bcf\u5169\u7ae0 +1\uff08\u7b2c 8 \u7ae0 6 \u7247\uff09
function bossShieldMax(ch) {
  return 2 + Math.ceil((ch || 1) / 2);
}
// \u79fb\u901f\u500d\u7387\uff1a\u7834\u9632\u671f\u6703\u61f5\u4e00\u4e0b\uff08\u7d66\u4f60\u8cbc\u4e0a\u53bb\u6253\uff09\uff0c\u72c2\u66b4\u6bcf\u5c64 +12%
function bossPhaseSpd(e) {
  const A = arenaBossOf(e);
  if (!A) return 1;
  if (A.breakT > 0) return .80;
  return 1 + BOSS_BREAK.rageSpd * (A.rageN || 0);
}
// \u653e\u5f48\u9593\u9694\u500d\u7387\uff08\u8d8a\u5c0f\u8d8a\u5bc6\uff09
function bossPhaseBombK(e) {
  const A = arenaBossOf(e);
  if (!A) return 1;
  if (A.breakT > 0) return 1.25;
  return 1 / (1 + BOSS_BREAK.rageBomb * (A.rageN || 0));
}
function bossShieldHitFx(e, A) {
  const T = Game.T || 40;
  try { pushPop(e.x, e.y - e.r * 2.1, '\U0001F6E1', { color: '#8fd9ff', size: 1.15, life: .55 }); } catch (x) {}
  try { burst(e.x, e.y - e.r * .7, '#bfeaff', 12, 200); } catch (x) {}
  try { burst(e.x, e.y - e.r * .7, '#ffffff', 6, 260); } catch (x) {}
  try { AudioSys.sfx('punch'); } catch (x) {}
  Game.shake = Math.max(Game.shake || 0, .10);
}
function bossBreakStart(e, A) {
  const T = Game.T || 40;
  A.breakT = BOSS_BREAK.sec;
  A.breakMax = BOSS_BREAK.sec;
  try { brTip('\U0001F4A5', t('boss.breakStart'), 'good', 2.4); } catch (x) {}
  try { AudioSys.sfx('slam'); } catch (x) {}
  Game.shake = Math.max(Game.shake || 0, 1);
  Game.flash = Math.max(Game.flash || 0, .5);
  try { burst(e.x, e.y, '#ffd24a', 42, 320); } catch (x) {}
  try { burst(e.x, e.y, '#ff6a3a', 28, 250); } catch (x) {}
  if (!Game.rings) Game.rings = [];
  Game.rings.push({ x: e.x, y: e.y, r: Game.T * 3.4, dur: .55, born: Game.gameT || 0, kind: 'ring', color: '#ffd166' });
}
function bossBreakEnd(e, A) {
  if (!e) return;
  A.breakT = 0;
  A.rageN = Math.min(BOSS_BREAK.rageMax, (A.rageN || 0) + 1);
  A.shield = A.shieldMax;
  try { brTip('\U0001F6E1', t('boss.shieldBack', { n: A.shield }), 'warn', 1.9); } catch (x) {}
  try { AudioSys.sfx('spawn'); } catch (x) {}
  try { burst(e.x, e.y, '#8fd9ff', 24, 240); } catch (x) {}
}

// v5.36\uff1aBOSS \u5834\u5730\u7684\u7bc0\u594f \u2014\u2014 \u6bcf 60 \u79d2 +2 \u5c0f\u5175\uff08\u4e0a\u9650 8\uff09\u3001\u738b\u6b7b\u958b\u9580
function updateBossArena(dt) {'''
rep(A_OLD, A_NEW, 'A-phase-block')

# ---------------------------------------------------------------- B. 建立時帶上階段狀態
B_OLD = '''  Game.bossArena = { chapter: ch, t: 0, minionT: 60, boss: boss, bossDead: false, rpg: !!rpg };'''
B_NEW = '''  const shMax = bossShieldMax(ch);                 // v5.38\uff1a\u5206\u968e\u6bb5\u7834\u9632
  Game.bossArena = {
    chapter: ch, t: 0, minionT: 60, boss: boss, bossDead: false, rpg: !!rpg,
    shieldMax: shMax, shield: shMax, breakT: 0, breakMax: BOSS_BREAK.sec, rageN: 0
  };'''
rep(B_OLD, B_NEW, 'B-init-arena')

# ---------------------------------------------------------------- C. updateBossArena \u5012\u6578
C_OLD = '''  A.t += dt;
  A.minionT -= dt;
  if (A.minionT > 0) return;'''
C_NEW = '''  A.t += dt;
  // v5.38\uff1a\u7834\u9632\u7a97\u53e3\u5012\u6578 \u2014\u2014 \u6642\u9593\u5230\u5c31\u88dc\u6eff\u8b77\u76fe\u4e26\u8b93\u738b\u72c2\u66b4\u4e00\u5c64
  if (A.breakT > 0) {
    A.breakT = Math.max(0, A.breakT - dt);
    if (A.breakT <= 0) bossBreakEnd(A.boss, A);
  }
  A.minionT -= dt;
  if (A.minionT > 0) return;'''
rep(C_OLD, C_NEW, 'C-break-tick')

# ---------------------------------------------------------------- D. flameHitDamage \u62e6\u622a
D_OLD = '''// \u706b\u7130\u5c0d\u602a\u7269\u7684\u50b7\u5bb3\uff1aRPG \u6a21\u5f0f\u770b\u73a9\u5bb6\u7684\u300c\u653b\u64ca\u300d\u9ede\u6578\u8207\u602a\u7269\u9632\u79a6
function flameHitDamage(e) {
  if (!Game.rpg) return 1;
  const p = Game.players[0];
  const dmg = (p && p.rpgDmg) ? p.rpgDmg : 1;      // v5.19\uff1a\u653b\u64ca\u9ede\u6578\u5df2\u5728\u9032\u5834\u6642\u63db\u7b97\u6210\u50b7\u5bb3
  return Math.max(1, dmg - ((e && e.def) || 0));
}'''
D_NEW = '''// \u706b\u7130\u5c0d\u602a\u7269\u7684\u50b7\u5bb3\uff1aRPG \u6a21\u5f0f\u770b\u73a9\u5bb6\u7684\u300c\u653b\u64ca\u300d\u9ede\u6578\u8207\u602a\u7269\u9632\u79a6
function flameBaseDamage(e) {
  if (!Game.rpg) return 1;
  const p = Game.players[0];
  const dmg = (p && p.rpgDmg) ? p.rpgDmg : 1;      // v5.19\uff1a\u653b\u64ca\u9ede\u6578\u5df2\u5728\u9032\u5834\u6642\u63db\u7b97\u6210\u50b7\u5bb3
  return Math.max(1, dmg - ((e && e.def) || 0));
}
function flameHitDamage(e) {
  /* v5.38\uff1a\u6c7a\u6230\u5834\u7684\u300c\u8b77\u76fe \u2192 \u7834\u9632 \u2192 \u72c2\u66b4\u300d\u4e09\u6bb5\u5728\u9019\u88e1\u62e6\u3002
     \u8b77\u76fe\u671f\u56de 0\uff08\u4ee3\u8868\u9019\u4e00\u767c\u88ab\u76fe\u5403\u6389\u3001\u4e0d\u6263\u8840\uff09\uff0c\u7834\u9632\u671f\u50b7\u5bb3 \u00d72\u3002 */
  const A = arenaBossOf(e);
  if (A && !e.dead) {
    if (A.shield > 0) {
      A.shield--;
      bossShieldHitFx(e, A);
      if (A.shield <= 0) bossBreakStart(e, A);
      return 0;
    }
    if (A.breakT > 0) return flameBaseDamage(e) * BOSS_BREAK.mul;
  }
  return flameBaseDamage(e);
}'''
rep(D_OLD, D_NEW, 'D-flame-hit')

# ---------------------------------------------------------------- E. updateBoss \u7684\u786c\u5beb 1 \u9ede\u50b7\u5bb3\u6539\u8d70\u540c\u4e00\u5957
E_OLD = '''    if (f.cx === Math.floor(e.x / T) && f.cy === Math.floor(e.y / T) && e.hitT <= 0) {
      e.hp -= 1; e.hitT = .8;
      try { foeHitFx(e, 1); } catch (x) {}    // v5.21\uff1a\u9b54\u738b\u95dc\u7684\u5c0f\u602a\u4e5f\u8df3\u5b57'''
E_NEW = '''    if (f.cx === Math.floor(e.x / T) && f.cy === Math.floor(e.y / T) && e.hitT <= 0) {
      // v5.38\uff1a\u4ee5\u524d\u9019\u88e1\u786c\u5beb 1 \u9ede\uff0c\u8b77\u76fe\uff0f\u7834\u9632\u5168\u90e8\u7e5e\u904e\u53bb\u3002\u73fe\u5728\u8d70\u540c\u4e00\u5957\u50b7\u5bb3\u5165\u53e3\u3002
      const dmB = flameHitDamage(e);
      e.hp -= dmB; e.hitT = .8;
      try { foeHitFx(e, dmB); } catch (x) {}    // v5.21\uff1a\u9b54\u738b\u95dc\u7684\u5c0f\u602a\u4e5f\u8df3\u5b57'''
rep(E_OLD, E_NEW, 'E-boss-flame')

# ---------------------------------------------------------------- F. foeHitFx \u9047\u5230 0 \u50b7\u5bb3\u4e0d\u8df3\u5b57
F_OLD = '''function foeHitFx(e, dmg, opt) {
  if (!e) return;
  opt = opt || {};'''
F_NEW = '''function foeHitFx(e, dmg, opt) {
  if (!e) return;
  // v5.38\uff1a\u88ab\u8b77\u76fe\u5403\u6389\u7684\u90a3\u4e00\u4e0b\u4e0d\u8df3\u6578\u5b57\uff08\u4e0d\u7136\u6703\u51fa\u73fe\u4e00\u5806\u7a7a\u767d\u6f02\u5b57\uff09
  if (!(dmg > 0)) { e.flashT = .13; hitStop(.02); return; }
  opt = opt || {};'''
rep(F_OLD, F_NEW, 'F-foe-hit-zero')

# ---------------------------------------------------------------- G. updateBoss \u901f\u5ea6\u8207\u653e\u5f48\u9593\u9694
G_OLD = '''  const speed = (rage ? 88 : 54) * (e.speedMul || 1) * (Game.spdK || 1);'''
G_NEW = '''  // v5.38\uff1a\u518d\u4e58\u4e0a\u5206\u968e\u6bb5\u500d\u7387\uff08\u7834\u9632\u671f\u8b8a\u6162\u3001\u72c2\u66b4\u6bcf\u5c64\u52a0\u5feb\uff09
  const speed = (rage ? 88 : 54) * (e.speedMul || 1) * (Game.spdK || 1) * bossPhaseSpd(e);'''
rep(G_OLD, G_NEW, 'G-boss-speed')

G2_OLD = '''    e.bombT = rage ? .75 : 1.35;'''
G2_NEW = '''    e.bombT = (rage ? .75 : 1.35) * bossPhaseBombK(e);   // v5.38\uff1a\u7834\u9632\u671f\u51fa\u624b\u6162\u3001\u72c2\u66b4\u5c64\u6578\u8d8a\u9ad8\u8d8a\u5bc6'''
rep(G2_OLD, G2_NEW, 'G2-boss-bombT')

# ---------------------------------------------------------------- H. \u756b\u9762\uff1a\u8b77\u76fe\u5149\u74b0\uff0f\u7834\u9632\u8108\u52d5
H_OLD = '''    // v5.1b\uff1a\u4e0a\u5c64\u7684\u5c11\u91cf\u7c92\u5b50\uff08\u5f9e\u8eab\u9ad4\u524d\u9762\u7e5e\u904e\u53bb\uff0c\u7279\u6548\u624d\u6709\u300c\u5305\u4f4f\u300d\u7684\u611f\u89ba\uff09
    try { drawBossElemFx(e, x, bFoot, BH, T, 1); } catch (er) {}'''
H_NEW = '''    // v5.1b\uff1a\u4e0a\u5c64\u7684\u5c11\u91cf\u7c92\u5b50\uff08\u5f9e\u8eab\u9ad4\u524d\u9762\u7e5e\u904e\u53bb\uff0c\u7279\u6548\u624d\u6709\u300c\u5305\u4f4f\u300d\u7684\u611f\u89ba\uff09
    try { drawBossElemFx(e, x, bFoot, BH, T, 1); } catch (er) {}
    try { drawBossPhaseFx(e, x, bFoot, BH, T); } catch (er) {}   // v5.38\uff1a\u8b77\u76fe\uff0f\u7834\u9632'''.rstrip()
rep(H_OLD, H_NEW, 'H-draw-hook')

# ---------------------------------------------------------------- I. \u8840\u689d\u4e0b\u65b9\uff1a\u8b77\u76fe\u5c0f\u65b9\u584a\uff0f\u7834\u9632\u5012\u6578\u689d
I_OLD = '''    ctx.fillStyle = '#ff5e6e';
    ctx.fillRect(x - bw / 2 + 1, barY + 1, (bw - 2) * (e.hp / e.maxHp), 5);'''
I_NEW = '''    ctx.fillStyle = '#ff5e6e';
    ctx.fillRect(x - bw / 2 + 1, barY + 1, (bw - 2) * (e.hp / e.maxHp), 5);
    /* v5.38\uff1a\u8840\u689d\u4e0b\u9762\u4e00\u6392\u5c0f\u65b9\u584a = \u5269\u9918\u8b77\u76fe\u7247\u6578\uff1b
       \u7834\u9632\u6642\u6539\u6210\u4e00\u689d\u5f80\u5de6\u7e2e\u7684\u9ec3\u689d \uff0b \u500d\u7387\u5b57\u6a23\u3002 */
    const A3 = (Game.bossArena && Game.bossArena.boss === e) ? Game.bossArena : null;
    if (A3 && !e.brBoss) {
      ctx.save();
      if (A3.breakT > 0) {
        const kk = A3.breakMax ? (A3.breakT / A3.breakMax) : 0;
        ctx.fillStyle = 'rgba(0,0,0,.55)';
        ctx.fillRect(x - bw / 2, barY + 9, bw, 4);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(x - bw / 2, barY + 9, bw * kk, 4);
        ctx.font = '900 ' + Math.round(Game.T * .26) + 'px sans-serif';
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.lineWidth = Math.max(2, Game.T * .06); ctx.strokeStyle = 'rgba(20,8,4,.9)';
        ctx.strokeText('\u00d72', x + bw / 2 + 3, barY + 11);
        ctx.fillStyle = '#ffd166';
        ctx.fillText('\u00d72', x + bw / 2 + 3, barY + 11);
        ctx.lineWidth = 1;
      } else if (A3.shield > 0) {
        const n = A3.shieldMax || 1, pw = (bw - (n - 1) * 2) / n;
        for (let i = 0; i < n; i++) {
          const on = i < A3.shield;
          ctx.fillStyle = on ? '#7fd4ff' : 'rgba(255,255,255,.14)';
          ctx.fillRect(x - bw / 2 + i * (pw + 2), barY + 9, pw, 3);
        }
      }
      ctx.restore();
    }'''
rep(I_OLD, I_NEW, 'I-boss-bar-pips')

# ---------------------------------------------------------------- J. drawBossPhaseFx \u51fd\u5f0f
J_OLD = '''function drawEnemy(e, T) {'''
J_NEW = '''/* v5.38\uff1aBOSS \u5206\u968e\u6bb5\u7834\u9632\u7684\u8996\u89ba
 *   \u8b77\u76fe\u671f\uff1a\u5169\u5708\u53cd\u5411\u65cb\u8f49\u7684\u516d\u89d2\u6676\u76fe\uff08\u96a8\u5269\u9918\u7247\u6578\u8b8a\u6de1\uff09\u3002
 *   \u7834\u9632\u671f\uff1a\u7d05\u8272\u8108\u52d5\u5149\u6688 \uff0b \u5f80\u5167\u6536\u7684\u5730\u9762\u5149\u74b0\uff08\u8d8a\u63a5\u8fd1\u7d50\u675f\u6536\u5f97\u8d8a\u7dca\uff09\u3002
 *   \u5168\u90e8\u7a0b\u5e8f\u7e6a\u88fd\uff0c\u4e0d\u5403\u7f8e\u8853\u9810\u7b97\u3002 */
function drawBossPhaseFx(e, x, footY, H, T) {
  const A = arenaBossOf(e);
  if (!A || A.bossDead || !(H > 0)) return;
  const t = Game.gameT || 0;
  const cy = footY - H * .52;
  if (A.breakT > 0) {
    const k = A.breakMax ? (1 - A.breakT / A.breakMax) : 0;
    const puls = .62 + .38 * Math.sin(t * 9.5);
    try {
      const rg = ctx.createRadialGradient(x, cy, H * .05, x, cy, H * .68);
      rg.addColorStop(0, 'rgba(255,90,60,' + (.34 * puls).toFixed(3) + ')');
      rg.addColorStop(.55, 'rgba(255,150,40,' + (.16 * puls).toFixed(3) + ')');
      rg.addColorStop(1, 'rgba(255,90,60,0)');
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.ellipse(x, cy, H * .60, H * .70, 0, 0, 6.283); ctx.fill();
    } catch (er) {}
    ctx.strokeStyle = 'rgba(255,120,70,' + (.42 + .34 * puls).toFixed(3) + ')';
    ctx.lineWidth = Math.max(2, T * .08);
    const rr = H * (.34 + .32 * (1 - k));
    ctx.beginPath(); ctx.ellipse(x, footY - H * .04, rr, rr * .34, 0, 0, 6.283); ctx.stroke();
    ctx.lineWidth = 1;
    return;
  }
  if (A.shield > 0) {
    const left = A.shield / Math.max(1, A.shieldMax);
    const spin = t * .55;
    ctx.save();
    ctx.translate(x, cy);
    for (let s2 = 0; s2 < 2; s2++) {
      const R = H * (.50 + s2 * .07);
      ctx.strokeStyle = 'rgba(150,220,255,' + ((.18 + .24 * left) * (1 - s2 * .38)).toFixed(3) + ')';
      ctx.lineWidth = Math.max(1.3, T * (.030 - s2 * .009));
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a = spin * (s2 ? -1 : 1) + i * 1.0472;
        const px = Math.cos(a) * R, py = Math.sin(a) * R * .46;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();
    ctx.lineWidth = 1;
  }
}

function drawEnemy(e, T) {'''
rep(J_OLD, J_NEW, 'J-draw-phase')

# ---------------------------------------------------------------- K. \u532f\u51fa
K_OLD = '''  arenaFreeCell: arenaFreeCell, updateBossArena: updateBossArena, BOSS_SLOT: BOSS_SLOT,'''
K_NEW = '''  arenaFreeCell: arenaFreeCell, updateBossArena: updateBossArena, BOSS_SLOT: BOSS_SLOT,
  BOSS_BREAK: BOSS_BREAK, bossShieldMax: bossShieldMax, bossPhaseSpd: bossPhaseSpd,
  bossPhaseBombK: bossPhaseBombK, arenaBossOf: arenaBossOf,'''
rep(K_OLD, K_NEW, 'K-export')

out = s.replace('\r\n', '\n')
tmp = P + '.tmp'
io.open(tmp, 'w', encoding='utf-8', newline='\n').write(out)
import os
os.replace(tmp, P)
print('OK', n0, '->', len(out), 'delta', len(out) - n0)
print(' | '.join(steps))
