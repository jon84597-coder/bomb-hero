// v4.43：算出內嵌圖檔「解碼後」實際佔用的記憶體（RGBA bitmap）
// 用法：node test/mem-v443.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function webpSize(buf) {
  // RIFF....WEBP + chunk
  let o = 12;
  while (o + 8 <= buf.length) {
    const fourcc = buf.toString('ascii', o, o + 4);
    const size = buf.readUInt32LE(o + 4);
    const d = o + 8;
    if (fourcc === 'VP8 ') {
      // frame tag 3 bytes, sync 9D 01 2A, then w,h (14 bit each)
      if (buf[d + 3] === 0x9d && buf[d + 4] === 0x01 && buf[d + 5] === 0x2a) {
        return [buf.readUInt16LE(d + 6) & 0x3fff, buf.readUInt16LE(d + 8) & 0x3fff];
      }
    } else if (fourcc === 'VP8L') {
      const b = buf.readUInt32LE(d + 1);
      return [(b & 0x3fff) + 1, ((b >> 14) & 0x3fff) + 1];
    } else if (fourcc === 'VP8X') {
      return [buf.readUIntLE(d + 4, 3) + 1, buf.readUIntLE(d + 7, 3) + 1];
    }
    if (fourcc === 'ANIM') { o = d + size + (size & 1); continue; }
    o = d + size + (size & 1);
  }
  return null;
}

function pngSize(buf) {
  // IHDR at 16
  if (buf.toString('ascii', 12, 16) !== 'IHDR') return null;
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

const re = /data:image\/(webp|png|jpeg);base64,([A-Za-z0-9+/=]+)/g;
let m, stats = [];
while ((m = re.exec(html))) {
  const buf = Buffer.from(m[2], 'base64');
  const dim = m[1] === 'webp' ? webpSize(buf) : (m[1] === 'png' ? pngSize(buf) : null);
  stats.push({ fmt: m[1], bytes: buf.length, b64: m[2].length, w: dim ? dim[0] : 0, h: dim ? dim[1] : 0 });
}

let totalBin = 0, totalB64 = 0, totalPix = 0;
const byFmt = {};
stats.forEach(function (s) {
  totalBin += s.bytes; totalB64 += s.b64;
  totalPix += s.w * s.h;
  byFmt[s.fmt] = byFmt[s.fmt] || { n: 0, bin: 0, pix: 0 };
  byFmt[s.fmt].n++; byFmt[s.fmt].bin += s.bytes; byFmt[s.fmt].pix += s.w * s.h;
});

const big = stats.slice().sort(function (a, b) { return b.w * b.h - a.w * a.h; });
const buckets = { '<=96': 0, '97-160': 0, '161-256': 0, '>256': 0 };
stats.forEach(function (s) {
  const mx = Math.max(s.w, s.h);
  if (mx <= 96) buckets['<=96']++; else if (mx <= 160) buckets['97-160']++;
  else if (mx <= 256) buckets['161-256']++; else buckets['>256']++;
});

console.log('內嵌圖檔數量：' + stats.length);
Object.keys(byFmt).forEach(function (k) {
  const f = byFmt[k];
  console.log('  ' + k.padEnd(5) + ' ' + String(f.n).padStart(3) + ' 張 · 檔案 ' +
    (f.bin / 1024).toFixed(0).padStart(4) + ' KB · 解碼 ' + (f.pix * 4 / 1048576).toFixed(2) + ' MB');
});
console.log('檔案合計 ' + (totalBin / 1024).toFixed(0) + ' KB（base64 佔 ' + (totalB64 / 1024).toFixed(0) + ' KB 原始碼）');
console.log('★ 全部解碼成 RGBA bitmap 約 ' + (totalPix * 4 / 1048576).toFixed(2) + ' MB');
console.log('尺寸分佈 ' + JSON.stringify(buckets));
console.log('\n最大的 10 張：');
big.slice(0, 10).forEach(function (s) {
  console.log('  ' + (s.w + 'x' + s.h).padEnd(10) + (s.bytes / 1024).toFixed(1).padStart(7) + ' KB  解碼 ' +
    (s.w * s.h * 4 / 1024).toFixed(0).padStart(5) + ' KB');
});
