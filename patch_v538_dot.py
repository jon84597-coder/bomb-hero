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

# ---- A. CSS：選單按鈕的紅點
A_OLD = '''@keyframes gdotPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.25); opacity: .78; } }'''
A_NEW = '''@keyframes gdotPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.25); opacity: .78; } }
/* v5.38\uff1a\u9996\u9801\u9078\u55ae\u6309\u9215\u7684\u7d05\u9ede\uff08\u300c\u4eca\u5929\u9084\u6c92\u6253\u300d\u4e4b\u985e\uff09\uff0c\u8ddf \U0001F381 \u540c\u4e00\u500b\u62c6\u6e1b\u7bc0\u594f */
.mbtn { position: relative; }
.mbtn.hasdot::after {
  content: ''; position: absolute; top: 8px; right: 10px;
  width: 10px; height: 10px; border-radius: 50%;
  background: #ff4d5e; box-shadow: 0 0 0 2px rgba(255,77,94,.26);
  animation: gdotPulse 1.6s ease-in-out infinite;
}'''
rep(A_OLD, A_NEW, 'A-css')

# ---- B. HomeDot 模組
B_OLD = '''function nearMissSuffix(p) {'''
B_NEW = '''/* ============================================================================
 * v5.38\uff1a\u9996\u9801\u7d05\u9ede\u7e3d\u7ba1
 *   \u53ea\u6709\u300c\u4eca\u5929\u9084\u6709\u4e8b\u53ef\u4ee5\u505a\u300d\u7684\u5730\u65b9\u624d\u4eae\uff0c\u770b\u904e\u5c31\u7184\u3002
 *   \u4ee5\u524d\u53ea\u6709 \U0001F381 \u6703\u4eae\uff0c\u73a9\u5bb6\u5e38\u5e38\u4e0d\u77e5\u9053\u6bcf\u5929\u8a72\u9ede\u54ea\u88e1 \u2192 \u56de\u982d\u7387\u5c31\u5361\u5728\u9019\u4e00\u6b65\u3002
 *   \u76ee\u524d\u5169\u8655\uff1a\U0001F381 \u79ae\u7269\uff08\u7c3d\u5230\uff0f\u4efb\u52d9\uff0f\u8cfd\u5b63\uff09\u3001\U0001F4C5 \u6bcf\u65e5\u6311\u6230\uff08\u4eca\u5929\u9084\u6c92\u6253\uff09\u3002
 * ========================================================================== */
const HomeDot = {
  dailyKey() { try { return 'bombhero-dailydone-' + dailyDayKey(); } catch (e) { return ''; } },
  dailyDone() { try { return localStorage.getItem(HomeDot.dailyKey()) === '1'; } catch (e) { return false; } },
  markDaily() {
    try { localStorage.setItem(HomeDot.dailyKey(), '1'); } catch (e) {}
    HomeDot.refresh();
  },
  set(id, on) {
    const b = $id(id);
    if (b && b.classList) b.classList.toggle('hasdot', !!on);
  },
  refresh() {
    try { HomeDot.set('btnDaily', !HomeDot.dailyDone()); } catch (e) {}
    try { GiftUI.alertOn(); } catch (e) {}
  }
};

function nearMissSuffix(p) {'''
rep(B_OLD, B_NEW, 'B-homedot')

# ---- C. 回首页刷新
C_OLD = '''    try { if (name === 'title') GiftUI.alertOn(); } catch (e) {}'''
C_NEW = '''    try { if (name === 'title') HomeDot.refresh(); } catch (e) {}   // v5.38\uff1a\u7d05\u9ede\u7e3d\u7ba1'''
rep(C_OLD, C_NEW, 'C-refresh')

# ---- D. 過關標記
D_OLD = '''  try { Ghost.finish(d.day, d.ms); } catch (e) {}   // v5.38\uff1a\u7834\u7d00\u9304\u624d\u5b58\u6b98\u5f71'''
D_NEW = '''  try { Ghost.finish(d.day, d.ms); } catch (e) {}   // v5.38\uff1a\u7834\u7d00\u9304\u624d\u5b58\u6b98\u5f71
  try { HomeDot.markDaily(); } catch (e) {}         // v5.38\uff1a\u4eca\u5929\u6253\u904e\u4e86 \u2192 \U0001F4C5 \u7d05\u9ede\u7184\u6389'''
rep(D_OLD, D_NEW, 'D-mark')

# ---- E. 匯出
E_OLD = '''  Ghost: Ghost, drawDailyGhost: drawDailyGhost, nearMissSuffix: nearMissSuffix,'''
E_NEW = '''  Ghost: Ghost, drawDailyGhost: drawDailyGhost, nearMissSuffix: nearMissSuffix, HomeDot: HomeDot,'''
rep(E_OLD, E_NEW, 'E-export')

out = s.replace('\r\n', '\n')
tmp = P + '.tmp'
io.open(tmp, 'w', encoding='utf-8', newline='\n').write(out)
os.replace(tmp, P)
print('OK', n0, '->', len(out), 'delta', len(out) - n0)
print(' | '.join(steps))
