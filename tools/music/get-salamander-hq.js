// tools/music/get-salamander-hq.js —— 抓 Salamander Grand Piano 原始 FLAC（48kHz / 16 力度層）
//   只取 3 個力度層（弱／中／強），中低音域，夠這批遊戲配樂用。
//   產出：outputs/music/pcm/salamander_hq/<note>v<layer>.f32 + index.json
//   index 每筆：{ note, midi, layer, vel, frames }
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const BASE = 'https://cdn.jsdelivr.net/gh/sfzinstruments/SalamanderGrandPiano@master/Samples';
const OUT = path.join(__dirname, '..', '..', 'outputs', 'music', 'pcm', 'salamander_hq');
const TMP = path.join(OUT, '_tmp');
const SR = 44100;
const LAYERS = [2, 7, 12];          // 1..16
const MIDI_MIN = 33, MIDI_MAX = 96; // 只收 A1..C7，這批曲子用不到更低

const PITCH = { 'A': 9, 'C': 0, 'D#': 3, 'F#': 6 };
const NOTE_BASE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function midiOf(name, oct) {
  const isSharp = name.endsWith('#');
  const base = NOTE_BASE[name[0]];
  return base + (isSharp ? 1 : 0) + (oct + 1) * 12;
}

function targets() {
  const out = [];
  for (let oct = 0; oct <= 8; oct++) {
    for (const p of Object.keys(PITCH)) {
      const midi = midiOf(p, oct);
      if (midi < MIDI_MIN || midi > MIDI_MAX) continue;
      out.push({ note: p + oct, midi });
    }
  }
  return out;
}

function fetchFlac(note, layer) {
  const rel = note.replace('#', '%23') + 'v' + layer + '.flac';
  const dest = path.join(TMP, note.replace('#', 's') + 'v' + layer + '.flac');
  for (let i = 0; i < 4; i++) {
    try {
      execFileSync('curl', ['-sSL', '--retry', '2', '-m', '120', '-o', dest, `${BASE}/${rel}`], { stdio: 'pipe' });
      if (fs.existsSync(dest) && fs.statSync(dest).size > 50000) return dest;
    } catch (e) {}
    fs.rmSync(dest, { force: true });
    execFileSync('sleep', [String(1 + i * 2)]);
  }
  return null;
}

function main() {
  fs.mkdirSync(TMP, { recursive: true });
  const list = targets();
  const index = [];
  let ok = 0, fail = 0;
  for (const { note, midi } of list) {
    for (const layer of LAYERS) {
      const safe = note.replace('#', 's');
      const f32 = path.join(OUT, safe + 'v' + layer + '.f32');
      if (fs.existsSync(f32) && fs.statSync(f32).size > 4000) {
        index.push({ note: safe, midi, layer, vel: (layer - 0.5) / 16, frames: fs.statSync(f32).size / 8 });
        ok++; continue;
      }
      const flac = fetchFlac(note, layer);
      if (!flac) { fail++; process.stdout.write(`  ! ${note}v${layer} 失敗\n`); continue; }
      try {
        const raw = execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', flac,
          '-f', 'f32le', '-acodec', 'pcm_f32le', '-ac', '2', '-ar', String(SR), 'pipe:1'],
          { maxBuffer: 1 << 30 });
        fs.writeFileSync(f32, raw);
        index.push({ note: safe, midi, layer, vel: (layer - 0.5) / 16, frames: raw.length / 8 });
        ok++;
      } catch (e) { fail++; process.stdout.write(`  ! ${note}v${layer} 解碼失敗\n`); }
      fs.rmSync(flac, { force: true });
    }
    process.stdout.write(`\r  ${note} … ${ok} 筆`);
  }
  index.sort((a, b) => a.midi - b.midi || a.layer - b.layer);
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index));
  fs.rmSync(TMP, { recursive: true, force: true });
  const mb = index.reduce((s, x) => s + x.frames * 8, 0) / 1048576;
  console.log(`\n  ✓ salamander_hq: ${ok} 筆（失敗 ${fail}）, ${mb.toFixed(0)} MB`);
}

main();
