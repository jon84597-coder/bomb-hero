// 一次性分析：深淵曲 23 句的能量曲線（有聲音符總數＋鼓點），用來確認「起伏」真的存在
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const A = env.BH.AudioSys;
const song = A.compileWar('abyssWar');
const def = A.WAR_DEFS.abyssWar;
const PER = 128;
const plan = def.plan;

function energy(i) {
  const a0 = i * PER, a1 = a0 + PER;
  let total = 0, per = [];
  song.tracks.forEach(t => {
    let pos = 0, n = 0;
    t.seq.forEach(e => { if (pos >= a0 && pos < a1 && e.midi !== null) n++; pos += e.len; });
    per.push(n); total += n;
  });
  // 鼓：每格 1 單位，第 i 句 = drums[i*PER ... i*PER+PER)
  let dn = 0;
  for (let j = a0; j < a1; j++) if (song.drums[j] && song.drums[j].kind) dn++;
  per.push(dn);
  return { total: total + dn, per, drum: dn };
}

const rows = plan.map((k, i) => {
  const e = energy(i);
  return { i: i + 1, k, total: e.total, tr: e.per, dn: e.drum };
});
const mx = Math.max.apply(null, rows.map(r => r.total));
const mn = Math.min.apply(null, rows.map(r => r.total));
console.log('軌數', song.tracks.length, '句數', rows.length, '每句單位', PER);
console.log('能量 min/max =', mn, '/', mx, '比值', (mx / mn).toFixed(2));
console.log('');
rows.forEach(r => {
  const bar = '█'.repeat(Math.round(r.total / mx * 34));
  console.log(String(r.i).padStart(2) + ' ' + r.k + ' ' + String(r.total).padStart(4) + ' (鼓' + String(r.dn).padStart(2) + ') ' + bar);
});
// 段落小結
const secs = [[0, 2, '序'], [2, 6, '主體'], [6, 10, '展開'], [10, 14, '高潮'], [14, 16, '呼吸'], [16, 22, '再起'], [22, 23, '收']];
console.log('');
secs.forEach(s => {
  const seg = rows.slice(s[0], s[1]);
  const avg = seg.reduce((n, r) => n + r.total, 0) / seg.length;
  console.log(s[2].padEnd(3), '平均', avg.toFixed(1));
});
// 相鄰句是否完全相同（聽起來會像卡住）
let same = 0;
for (let i = 1; i < rows.length; i++) {
  if (rows[i].total === rows[i - 1].total && plan[i] === plan[i - 1]) same++;
}
console.log('\n相鄰同型句數', same);
