const { makeEnv } = require('./_sandbox');
function bench(label, start) {
  const env = makeEnv(); const P = env.BH, G = P.Game;
  start(P, G);
  // 暖機（含 render：地板分塊快取要在暖機就建好，不然第一幀的烘焙成本會算進來）
  for (let i = 0; i < 4; i++) {
    try { P.updateWorld && P.updateWorld(1/60); } catch (e) {}
    try { P.render(); } catch (e) {}
  }
  env.rec.calls.length = 0; env.rec.sets.length = 0;
  const t0 = Date.now();
  const N = 20;
  for (let i = 0; i < N; i++) {
    try { P.updateWorld(1/60); } catch(e) {}
    try { P.render(); } catch(e) {}
  }
  const ms = (Date.now() - t0) / N;
  console.log(label.padEnd(14), 'calls/frame', Math.round(env.rec.calls.length / N), 'sets/frame', Math.round(env.rec.sets.length / N), 'ms/frame', ms.toFixed(2));
}
bench('solo stage 1', (P,G)=>{ P.startSolo(1,false); });
bench('solo stage 8', (P,G)=>{ P.startSolo(8,false); });
bench('rpg stage 12', (P,G)=>{ P.startRPG ? P.startRPG(12) : P.startSolo(12,false); });
bench('battle 4p', (P,G)=>{ try{P.startBattle(4);}catch(e){console.log('battle err',e.message);} });
bench('BR 30', (P,G)=>{ P.BR.opt={n:30,team:1,dur:10}; P.startBR(); });
bench('BR 50', (P,G)=>{ P.BR.opt={n:50,team:1,dur:10}; P.startBR(); });
