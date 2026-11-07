// v4.88 驗證：鴕鳥神獸「跑動三幀」（翅膀拍動 ＋ 兩腳交替）＋ 三幀對齊
// 跑法：node test/verify-v488.js
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

let pass = 0, fail = 0;
function ok(cond, msg, extra) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
const ROOT = path.join(__dirname, '..');
const SRC = require('./_sandbox').rawHtml;

// webp 尺寸解析（VP8 有損 / VP8L 無損 / VP8X 擴充）
function webpSize(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
  const tag = b.toString('ascii', 12, 16);
  if (tag === 'VP8 ') {
    const off = 12 + 8 + 6;
    return { w: b.readUInt16LE(off) & 0x3fff, h: b.readUInt16LE(off + 2) & 0x3fff, tag: tag };
  }
  if (tag === 'VP8L') {
    const off = 12 + 8 + 1;
    const bits = b.readUInt32LE(off);
    return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1, tag: tag };
  }
  if (tag === 'VP8X') {
    const off = 12 + 8;
    const w = (b[off + 4] | (b[off + 5] << 8) | (b[off + 6] << 16)) + 1;
    const h = (b[off + 7] | (b[off + 8] << 8) | (b[off + 9] << 16)) + 1;
    return { w: w, h: h, tag: tag };
  }
  return null;
}

console.log('=== ① MOUNT_ART 三幀設定 ===');
const env = makeEnv();
const B = env.BH;
const sp = B.MOUNT_ART.ostrich;
ok(!!sp, 'MOUNT_ART 有 ostrich');
ok(Array.isArray(sp.frames) && sp.frames.length === 3, '鴕鳥有三幀（站立＋跑動兩幀）', sp && sp.frames && sp.frames.length);
ok(sp.frames[0] === null, 'frames[0] 用 null 代表就是 u（同一個路徑字面不重複寫，v479 會多計）');
ok(Array.isArray(sp.run) && sp.run.length === 2 && sp.run.indexOf(0) < 0, '跑動只交替 1／2 兩幀（腿互補），站立幀不參與', sp.run);
ok(sp.bodyRatio > .8 && sp.bodyRatio < 1, 'bodyRatio 合理（' + sp.bodyRatio + '，畫布裡本體佔的比例）');
ok(Math.abs(sp.asp - 0.7446) < .05, 'asp 對應新畫布（' + sp.asp + '）');

console.log('=== ② 三張圖存在且同尺寸 ===');
const files = ['mount-art-ostrich.webp', 'mount-art-ostrich-run1.webp', 'mount-art-ostrich-run2.webp'];
const sizes = [];
files.forEach(function (f) {
  const p = path.join(ROOT, 'spr', f);
  const ex = fs.existsSync(p);
  ok(ex, 'spr/' + f + ' 存在');
  sizes.push(ex ? webpSize(p) : null);
});
ok(sizes.every(function (s) { return s && s.w > 0; }), '三張都能解析出寬高', sizes);
const sw = sizes[0] && sizes[0].w, sh = sizes[0] && sizes[0].h;
ok(sizes.every(function (s) { return s && s.w === sw && s.h === sh; }),
   '三張畫布尺寸完全一樣（' + sw + '×' + sh + '）→ 播放時不會位移', sizes.map(function (s) { return s && (s.w + 'x' + s.h); }));
ok(sw && Math.abs(sw / sh - sp.asp) < .02, '畫布比例與 asp 相符（' + (sw / sh).toFixed(4) + ' vs ' + sp.asp + '）');

console.log('=== ③ 載入器支援多幀 ===');
ok(/function slot\(k, i\)/.test(SRC), 'MountArt 有 slot() 分幀鍵');
ok(/sp\.frames && sp\.frames\.length \? sp\.frames\.map\(function \(u\) \{ return u \|\| sp\.u; \}\)/.test(SRC),
   'load() 會把 frames 的 null 補成 u');
ok(/function get\(k, i\) \{ return has\(k, i \|\| 0\)/.test(SRC), 'get(k, i) 可以指定第 i 幀');
ok(/let im = \(typeof MountArt !== 'undefined'\) \? MountArt\.get\(key, fi\) : null;/.test(SRC),
   'drawMountSprite 依 a.frame 取幀');
ok(/if \(!im && fi\) im = \(typeof MountArt !== 'undefined'\) \? MountArt\.get\(key, 0\) : null;/.test(SRC),
   '指定幀還沒載到就退回第 0 幀（不會開天窗）');

console.log('=== ④ 鴕鳥的播放邏輯 ===');
ok(/if \(lift > T \* \.16\) frame = 2;/.test(SRC), '離地時用第 2 幀（翅膀高舉）');
ok(/sp\.run\[Math\.floor\(walkT \* 9\) % sp\.run\.length\]/.test(SRC), '移動時 9 次/秒交替跑動幀');
ok(/const DH = bodyH \/ \(\(sp && sp\.bodyRatio\) \|\| \.93\);/.test(SRC), '貼圖高度依 bodyRatio 換算，角色本體維持 1.86 格');
ok(/const bodyH = T \* 1\.86;/.test(SRC), '本體高度仍是 T×1.86（跟 v4.87 畫面同大）');
// 兩幀交替不能是「同一幀一直播」
ok(sp.run[0] !== sp.run[1], '兩幀是不同索引');

console.log('=== ⑤ 資產清單與其他坐騎不破 ===');
const list = JSON.parse(fs.readFileSync(path.join(ROOT, 'spr', '_list.json'), 'utf8'));
ok(list.indexOf('mount-art-ostrich-run1.webp') >= 0, '_list.json 有 run1（離線預熱）');
ok(list.indexOf('mount-art-ostrich-run2.webp') >= 0, '_list.json 有 run2');
ok(list.filter(function (n) { return /^mount-art-ostrich/.test(n); }).length === 3, '清單裡鴕鳥共 3 筆');
['green', 'red'].forEach(function (k) {
  ok(!B.MOUNT_ART[k].frames, k + ' 龍仍是單幀（沒有被誤加 frames）');
  ok(B.MOUNT_ART[k].bodyRatio === undefined, k + ' 龍沒有 bodyRatio（DH 不會被放大）');
});

console.log('\n========================================');
console.log('v4.88 鴕鳥跑動三幀：' + pass + ' 通過 / ' + fail + ' 失敗');
if (fail) process.exit(1);
