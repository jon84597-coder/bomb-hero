// tools/music/extract.js —— 把 midi-js-soundfonts 的 base64 MP3 樣本
//   解成 44.1kHz / 立體聲 / float32 的裸 PCM，並寫一份 index.json。
//
// 用法：node tools/music/extract.js piano strings ...
//   參數是 outputs/music/sf/<name>-mp3.js 的 <name>；不給就全部解。
// 產出：outputs/music/pcm/<inst>/<note>.f32 + outputs/music/pcm/<inst>/index.json

const fs = require('fs');
const path = require('path');
const { execFileSync, spawn } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const SF = path.join(ROOT, 'outputs', 'music', 'sf');
const OUT = path.join(ROOT, 'outputs', 'music', 'pcm');
const SR = 44100;

const NOTE_BASE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function noteToMidi(n) {
  const m = /^([A-G])([#b]?)(-?\d+)$/.exec(n);
  if (!m) return null;
  let v = NOTE_BASE[m[1]];
  if (m[2] === '#') v += 1;
  if (m[2] === 'b') v -= 1;
  return v + (parseInt(m[3], 10) + 1) * 12;
}

function decodeMp3(buf) {
  // 一次叫 ffmpeg 解一首：輸出 float32 LE 立體聲 44.1k
  const out = execFileSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-i', 'pipe:0',
    '-f', 'f32le', '-acodec', 'pcm_f32le', '-ac', '2', '-ar', String(SR), 'pipe:1'
  ], { input: buf, maxBuffer: 1 << 30 });
  return out;
}

function extractOne(inst) {
  const src = path.join(SF, inst + '-mp3.js');
  if (!fs.existsSync(src)) { console.log(`  ✗ ${inst}（沒有樣本檔）`); return null; }
  const txt = fs.readFileSync(src, 'utf8');
  const re = /"([A-G][#b]?-?\d+)"\s*:\s*"data:audio\/mp3;base64,([A-Za-z0-9+/=]+)"/g;
  const dir = path.join(OUT, inst);
  fs.mkdirSync(dir, { recursive: true });
  const index = [];
  let m, n = 0;
  while ((m = re.exec(txt))) {
    const note = m[1], midi = noteToMidi(note);
    if (midi == null) continue;
    let pcm;
    try { pcm = decodeMp3(Buffer.from(m[2], 'base64')); }
    catch (e) { console.log(`    ! ${inst}/${note} 解碼失敗`); continue; }
    const frames = pcm.length / 8;            // 2ch × f32
    if (!frames) continue;
    fs.writeFileSync(path.join(dir, note + '.f32'), pcm);
    index.push({ note, midi, frames });
    n++;
  }
  index.sort((a, b) => a.midi - b.midi);
  fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(index));
  const kb = index.reduce((s, x) => s + x.frames * 8, 0) / 1024;
  const dur = index.reduce((s, x) => s + x.frames, 0) / index.length / SR;
  console.log(`  ✓ ${inst}: ${n} 個音, 平均 ${dur.toFixed(2)}s, ${(kb / 1024).toFixed(1)} MB`);
  return index;
}

function main() {
  let names = process.argv.slice(2);
  if (!names.length) names = fs.readdirSync(SF).filter(f => f.endsWith('-mp3.js')).map(f => f.replace('-mp3.js', ''));
  fs.mkdirSync(OUT, { recursive: true });
  for (const inst of names) extractOne(inst);
}

main();
