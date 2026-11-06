// _probe-nuke2.js — 雙核彈：兩顆都在圈內、彼此分開；最後 2 分鐘不再落彈
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game, BR = P.BR;
P.BR.opt.n = 100;
P.startBR();
G.state = 'play';

function dist(a, b) { return Math.hypot(a.cx - b.cx, a.cy - b.cy); }
function inZone(n) {
  const z = G.brZone;
  return Math.hypot(n.cx - z.cx, n.cy - z.cy) <= z.r + 0.01;
}

// ① 直接觸發一波
G.brNukeCd = 0.01;
P.updateBRNuke(0.02);
const list = G.brNukes || [];
console.log('一波顆數', list.length, '相位', list.map(n => n.phase).join(','));
console.log('都在圈內', list.every(inZone), '間距', list.length > 1 ? dist(list[0], list[1]).toFixed(1) : '-');
console.log('brNuke 指標 = 第 0 顆', G.brNuke === list[0]);

// ② 打完整場，看最後 2 分鐘還會不會冒核彈
const t0 = Date.now();
let launchedLate = 0, lastLeft = 0;
G.state = 'play';
for (let i = 0; i < 60 * 620 && G.state === 'play'; i++) {
  const before = (G.brNukes || []).length;
  P.updateBR(1 / 60);
  if ((G.brNukes || []).length > before) {
    const left = P.brTimeLeft();
    if (left <= BR.NUKE_STOP) launchedLate++;
  }
  lastLeft = P.brTimeLeft();
  if (i % 600 === 0) console.log('t=' + (i / 60).toFixed(0) + 's 剩 ' + left0(), '存活', G.brAlive);
  function left0() { return P.brTimeLeft().toFixed(0); }
}
console.log('模擬到最後，剩餘秒數', lastLeft.toFixed(1), '最後2分鐘內落彈次數', launchedLate, '耗時', ((Date.now() - t0) / 1000).toFixed(1) + 's');
