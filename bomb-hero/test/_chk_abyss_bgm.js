// test/_chk_abyss_bgm.js —— 一次性檢查：深淵曲長度與段落動態
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, A = P.AudioSys;

const def = A.WAR_DEFS.abyssWar;
console.log('bpm', def.bpm, 'plan 句數', def.plan.length);
const s = A.compileWar('abyssWar');
const units = s.tracks.map(t => t.seq.reduce((n, x) => n + x.len, 0));
console.log('各軌總長（單位）', units, '等長？', units.every(u => u === units[0]));
console.log('秒數', A.songSeconds('abyssWar').toFixed(1));

// 每句（8 小節 × 8 單位 = 64）統計：arp 有聲數 / pow 有聲數 / 鼓數
const PER = 128;   // 每句 8 小節 × 16 單位
const nPh = units[0] / PER;
console.log('句數', nPh);
function stats(trackName) {
  const tr = s.tracks.find(t => t.wave === (trackName === 'arp' ? 'square' : 'sawtooth'));
  return tr;
}
const arp = s.tracks.find(t => t.wave === 'square');
const powTr = s.tracks.filter(t => t.wave === 'sawtooth');
for (let i = 0; i < nPh; i++) {
  const a0 = i * PER, a1 = a0 + PER;
  let aNote = 0;
  let pos = 0;
  arp.seq.forEach(e => { if (pos >= a0 && pos < a1 && e.midi !== null) aNote++; pos += e.len; });
  // pow 軌：取最後一條（pow2）
  let pNote = 0;
  const last = powTr[powTr.length - 1];
  pos = 0;
  last.seq.forEach(e => { if (pos >= a0 && pos < a1 && e.midi !== null) pNote++; pos += e.len; });
  // 鼓
  let d = 0;
  for (let k = a0; k < a1 && k < s.drums.length; k++) if (s.drums[k] && s.drums[k].kind) d++;
  console.log(`句 ${String(i + 1).padStart(2)} ${def.plan[i]}  arp:${String(aNote).padStart(3)}  pow:${String(pNote).padStart(2)}  drum:${String(d).padStart(2)}`);
}
