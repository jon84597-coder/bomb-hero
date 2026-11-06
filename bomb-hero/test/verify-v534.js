// test/verify-v534.js —— v5.34
//   ① 戰鬥曲：對戰／大逃殺各一首，長度＝地圖長度（誤差 5% 內）
//   ② 五軌等長、鼓等長 → 循環接回不會走音
//   ③ 排程是「步進式絕對時間」（songStart + stepPos × 步長）→ 長曲無縫接軌
//   ④ 鼓組多了 crash／open hat／tom／rim，且句庫裡的鼓字元都有對應音源
//   ⑤ 對戰／大逃殺的 BGM 走戰鬥曲（不是關卡主題曲）
//   ⑥ 核彈本體吃算圖素材（有圖用圖、沒有才退回向量）
//   ⑦ 燒地六層：焦土焦斑／裂縫餘燼／煙／火舌貼圖／根部／火星
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

const env = makeEnv();
const P = env.BH, G = P.Game;
const src = env.html.replace(/\r/g, '');
const A = P.AudioSys;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }
function lens(s) { return s.tracks.map(function (t) { return t.seq.reduce(function (n, x) { return n + x.len; }, 0); }); }

// ================================================================
head('1. 三首戰鬥曲（對戰／大逃殺 10 分／5 分）');
{
  ok(!!A.WAR_DEFS && !!A.WAR_DEFS.battle && !!A.WAR_DEFS.brWar10 && !!A.WAR_DEFS.brWar5,
     '三首：對戰 battle、大逃殺 10 分／5 分');
  const sb = A.songSeconds('battle');
  const b10 = A.songSeconds('brWar10');
  const b5 = A.songSeconds('brWar5');
  ok(sb >= 150 && sb <= 180, '對戰曲 ' + sb.toFixed(1) + ' 秒（≈ 一場對戰 2~3 分鐘）');
  ok(Math.abs(b10 - 600) <= 30, '大逃殺 10 分鐘曲 ' + b10.toFixed(1) + ' 秒（地圖 600 秒）');
  ok(Math.abs(b5 - 300) <= 20, '大逃殺 5 分鐘曲 ' + b5.toFixed(1) + ' 秒（地圖 300 秒）');
  ok(A.compileWar('battle').bpm >= 146, '戰鬥曲是快板 ' + A.compileWar('battle').bpm + ' bpm');
  ok(A.compileWar('brWar10').bpm >= 146, '大逃殺曲 ' + A.compileWar('brWar10').bpm + ' bpm');
}

// ================================================================
head('2. 五軌等長 → 接回第 0 步時和弦與鼓點都在同一格');
{
  ['battle', 'brWar10', 'brWar5'].forEach(function (k) {
    const s = A.compileWar(k);
    const L = lens(s);
    ok(s.tracks.length === 5, k + '：五軌（旋律／貝斯／琶音／power chord ×2）');
    ok(L.every(function (v) { return v === L[0]; }), k + '：五軌等長 ' + L[0] + ' 步');
    ok(s.drums.length === L[0], k + '：鼓組同長（' + s.drums.length + ' 步）');
    ok(L[0] % 128 === 0, k + '：整句 ' + (L[0] / 128) + ' 句（每句 8 小節，循環不會切在半句）');
  });
}

// ================================================================
head('3. 排程是步進式絕對時間（長曲才接得順）');
{
  ok(/const t = songStart \+ stepPos \* stepDur;/.test(src), '每一步的播放時間 = songStart + stepPos × 步長');
  ok(!/tr\.next = Math\.max\(ctx\.currentTime, earliest\)/.test(src), '拿掉舊的「各軌各自 max()」寫法（會漂移）');
  ok(/const late = t < ctx\.currentTime - \.18;/.test(src), '分頁被切到背景回來時，落後的音直接跳過（不會一次爆音）');
  ok(/songGrid\[stepPos % songSteps\]/.test(src), '播到最後一步就接回第 0 步');
  const g = A.buildGrid(A.compileWar('battle'));
  ok(g.steps === lens(A.compileWar('battle'))[0], 'buildGrid 的步數跟曲子一致（' + g.steps + '）');
  ok(g.grid[0] && g.grid[0].some(function (e) { return e.wave === 'drum'; }), '第 0 步就有鼓點（不會有空拍開頭）');
  ok(g.grid[g.steps - 1] !== undefined, '最後一步存在（接回時不會缺格）');
}

// ================================================================
head('4. 鼓組與句庫');
{
  ['c', 'o', '1', '2', '3', 'r'].forEach(function (k) {
    ok(src.indexOf("kind === '" + k + "'") >= 0, "有 '" + k + "' 這個鼓件的音源");
  });
  ok(/kind === 'c' \? \.95 : \.30/.test(src), '銅鈸比開合 hi-hat 長（crash 0.95 秒）');
  const used = {};
  A.WAR_PHRASES.forEach(function (p) {
    ok(p.drum.length === 16, '「' + p.k + '」句鼓型 16 格（' + p.drum + '）');
    for (let i = 0; i < p.drum.length; i++) { const ch = p.drum.charAt(i); if (ch !== '.') used[ch] = 1; }
  });
  const bad = Object.keys(used).filter(function (k) { return 'ksh' !== '' && 'kshco123r'.indexOf(k) < 0; });
  ok(bad.length === 0, '句庫只用了有音源的鼓件' + (bad.length ? '（問題：' + bad.join(',') + '）' : ''));
  ok(!!used.c && !!used.s, '有銅鈸也有小鼓（段落才有衝擊感）');
}

// ================================================================
head('5. 對戰／大逃殺播戰鬥曲');
{
  ok(/if \(Game && Game\.mode === 'battle'\) return 'battle';/.test(src), '對戰 → battle 曲');
  ok(/if \(Game && Game\.mode === 'br'\) return brSongId\(\);/.test(src), '大逃殺 → brSongId()（依場長挑 10 分／5 分）');
  ok(/function brSongId\(\)/.test(src) && /d >= 10 \? 'brWar10' : 'brWar5'/.test(src), '10 分鐘場播 10 分鐘曲、5 分鐘場播 5 分鐘曲');
  // 所有呼叫端都走 stageBGM → 停頓恢復／調音量／重開都會跟著換曲
  const calls = (src.match(/AudioSys\.startBGM\(stageBGM\(/g) || []).length;
  ok(calls >= 5, '所有播放點都走 stageBGM()（' + calls + ' 處，暫停恢復與調音量也吃得到）');
  G.mode = 'battle';
  ok(P.stageBGM(1) === 'battle', 'stageBGM() 在對戰模式回 battle');
  G.mode = 'br';
  P.BR.opt.dur = 10;
  ok(P.stageBGM(1) === 'brWar10', 'stageBGM() 在大逃殺 10 分場回 brWar10');
  P.BR.opt.dur = 5;
  ok(P.stageBGM(1) === 'brWar5', 'stageBGM() 在大逃殺 5 分場回 brWar5');
  G.mode = 'solo';
  ok(/^stage\d$/.test(P.stageBGM(3)), '單人關卡照舊走關卡主題曲');
  P.BR.opt.dur = 10;
}

// ================================================================
head('6. 核彈本體用算圖素材');
{
  ok(/const IMG_NUKE_SRC = 'spr\/nuke-missile\.webp';/.test(src), '素材路徑 spr/nuke-missile.webp');
  ok(/const IMG_FLAME_SRC = 'spr\/flame-tongue\.webp';/.test(src), '火焰貼圖 spr/flame-tongue.webp');
  ok(/const nukeIm = spr\('nuke', IMG_NUKE_SRC\);/.test(src), 'drawNukeArt 會去拿素材');
  ok(/if \(nukeIm\) \{/.test(src) && /ctx\.drawImage\(nukeIm,/.test(src), '有素材就直接畫圖');
  ok(/if \(!nukeIm\) \{/.test(src), '沒有素材時才退回向量畫法（不會開天窗）');
  const spriteOk = fs.existsSync(path.resolve(__dirname, '..', 'spr', 'nuke-missile.webp'));
  ok(spriteOk, 'spr/nuke-missile.webp 檔案存在');
  ok(fs.existsSync(path.resolve(__dirname, '..', 'spr', 'flame-tongue.webp')), 'spr/flame-tongue.webp 檔案存在');
  const list = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'spr', '_list.json'), 'utf8'));
  ok(list.indexOf('nuke-missile.webp') >= 0 && list.indexOf('flame-tongue.webp') >= 0,
     '兩張圖都在預熱清單 _list.json（離線也看得到）');
}

// ================================================================
head('7. 燒地六層特效');
{
  ['① 焦土', '②③ 發光層', '④ 煙', '⑤ 火焰本體', '⑥ 火星'].forEach(function (t) {
    ok(src.indexOf('── ' + t) >= 0, '有「' + t + '」這一層');
  });
  ok(/function burnRnd\(i, k\)/.test(src), '焦斑用穩定偽隨機（不會每格亂跳）');
  ok(/for \(let k = 0; k < 11; k\+\+\)/.test(src) && /ctx\.ellipse\(/.test(src), '焦土疊 11 塊不規則焦斑（不是正圓）');
  ok(/裂縫/.test(src) && /globalCompositeOperation = 'lighter'/.test(src), '裂縫餘燼用加法混合發光');
  ok(/ctx\.drawImage\(im, -fw \* \.5, -fh, fw, fh\)/.test(src), '火焰本體用貼圖畫');
  ok(/globalCompositeOperation = 'source-over'[\s\S]{0,200}drawImage\(im/.test(src),
     '火焰主體走正常混合（加法混合會把橘紅沖成白色）');
  // 沒素材時要能退回火焰舌
  ok(/flameDrop\(bx, by \+ fh \* \.10, fw, fh/.test(src), '素材沒載到時退回程式火舌');
}

// ================================================================
head('8. 版本與預算');
{
  // v5.35：改成「不寫死版號」——這支驗的是 v5.34 的功能還活著，
  // 版號只要求 ≥ 5.34，之後每次升版都不用再回頭改這裡
  ok(parseFloat(P.VERSION) >= 5.34, 'VERSION = ' + P.VERSION + '（≥ 5.34）');
  const e34 = P.VERSION_LOG.filter(function (x) { return x.v === '5.34'; })[0];
  ok(!!e34, 'VERSION_LOG 有 5.34 的條目');
  ok(!!e34 && e34.now === false, '5.34 已標記 now:false（被新版取代）');
  ok(P.VERSION_LOG[0].now === true && P.VERSION_LOG[1].now === false, '只有最新一版 now:true');
  const sw = fs.readFileSync(path.resolve(__dirname, '..', 'sw.js'), 'utf8');
  const swm = sw.match(/var SW_VERSION = '(v\d+\.\d+\.\d+)';/) || [];
  ok(!!swm[1] && parseFloat(swm[1].slice(1)) >= 5.34,
     'sw.js 已升到 5.34 以上（' + (swm[1] || 'undefined') + '）');
  const chars = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8').length;
  ok(chars <= 1950000, '主檔 ' + chars + ' 字元（預算 1,950,000）');
}

console.log('\n' + (fail === 0 ? '✅ ' : '❌ ') + 'v5.34：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
