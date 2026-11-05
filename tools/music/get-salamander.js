// tools/music/get-salamander.js —— 抓 Salamander 鋼琴（真實 Yamaha C5 錄音、全頻寬）
//   來源：jsdelivr 上的 Tonejs/audio@salamander（可避開 github.io 被擋）
//   產出：outputs/music/pcm/salamander/<note>.f32 + index.json（格式與 extract.js 相同）
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const BASE = 'https://cdn.jsdelivr.net/gh/Tonejs/audio@master/salamander';
const OUT = path.join(__dirname, '..', '..', 'outputs', 'music', 'pcm', 'salamander');
const TMP = path.join(OUT, '_tmp');
const SR = 44100;

const NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const NOTE_BASE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function midiOf(n) {
  const m = /^([A-G])([#b]?)(-?\d+)$/.exec(n);
  let v = NOTE_BASE[m[1]];
  if (m[2] === 'b') v -= 1;
  return v + (parseInt(m[3], 10) + 1) * 12;
}

// Salamander 用 Db/Eb/Gb/Ab/Bb 命名（不是 C#）
function allNotes() {
  const out = [];
  for (let oct = 0; oct <= 8; oct++) {
    for (const n of NAMES) {
      const name = n + oct;
      const midi = midiOf(name);
      if (midi >= 21 && midi <= 108) out.push({ name, midi });
    }
  }
  return out;
}

function curl(url, dest) {
  execFileSync('curl', ['-sSL', '-m', '90', '-o', dest, url], { stdio: 'pipe' });
  return fs.existsSync(dest) && fs.statSync(dest).size > 2000;
}

function main() {
  fs.mkdirSync(TMP, { recursive: true });
  const notes = allNotes();
  const index = [];
  let ok = 0, skip = 0;
  for (const { name, midi } of notes) {
    const mp3 = path.join(TMP, name + '.mp3');
    const f32 = path.join(OUT, name + '.f32');
    if (fs.existsSync(f32) && fs.statSync(f32).size > 4000) {
      index.push({ note: name, midi, frames: fs.statSync(f32).size / 8 }); ok++; continue;
    }
    let got = false;
    for (let attempt = 0; attempt < 3 && !got; attempt++) {
      try { got = curl(`${BASE}/${name}.mp3`, mp3); } catch (e) { got = false; }
      if (!got) execFileSync('sleep', ['1']);
    }
    if (!got) { skip++; continue; }
    try {
      const raw = execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', mp3,
        '-f', 'f32le', '-acodec', 'pcm_f32le', '-ac', '2', '-ar', String(SR), 'pipe:1'],
        { maxBuffer: 1 << 30 });
      fs.writeFileSync(f32, raw);
      index.push({ note: name, midi, frames: raw.length / 8 });
      ok++;
    } catch (e) { skip++; }
    fs.unlinkSync(mp3);
  }
  index.sort((a, b) => a.midi - b.midi);
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index));
  fs.rmSync(TMP, { recursive: true, force: true });
  const mb = index.reduce((s, x) => s + x.frames * 8, 0) / 1048576;
  const avg = index.reduce((s, x) => s + x.frames, 0) / index.length / SR;
  console.log(`  ✓ salamander: ${ok} 音（缺 ${skip}）, 平均 ${avg.toFixed(2)}s, ${mb.toFixed(0)} MB`);
}

main();
