const fs = require('fs'), vm = require('vm');
const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
const m = html.match(/const SONG_DEFS = ([\s\S]*?\n  \};)/);
const src = 'const SONG_DEFS = ' + m[1] + '\nmodule.exports = SONG_DEFS;';
const mod = { exports: {} };
new Function('module', src)(mod);
const SD = mod.exports;
let bad = 0;
for (const name of Object.keys(SD)) {
  const d = SD[name];
  let units = 0;
  for (const pk of Object.keys(d.phrases)) {
    const ph = d.phrases[pk];
    if (ph.chord.length !== 8) { console.log('!! chord', name, pk, ph.chord.length); bad++; }
    if (ph.mel.length !== 8) { console.log('!! mel lines', name, pk, ph.mel.length); bad++; }
    ph.mel.forEach((line, i) => {
      let sum = 0;
      line.trim().split(/\s+/).forEach(t => { sum += parseInt(t.split(':')[1] || 2, 10); });
      if (sum !== 16) { console.log('!! sum', name, pk, i, sum); bad++; }
    });
  }
  units = d.order.length * 8 * 16;
  console.log(name, 'bpm', d.bpm, 'order', d.order.length, 'units', units, 'sec', (units * 15 / d.bpm).toFixed(1), 'arp', d.arp.length, 'drum', d.drum.length);
}
console.log(bad ? 'BAD ' + bad : 'ALL OK');
