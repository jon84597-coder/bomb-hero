// test/verify-v551.js —— v5.51：空投箱「從天而降」換成大型降落傘美術圖
//   ① 貼圖檔案 / 設定 / 預熱清單 / 啟動載入
//   ② 下落時走貼圖（有圖 → drawImage；沒圖 → 原本的紅色半圓傘）
//   ③ 「奇怪的白色圓圓的東西」＝硬邊正圓光暈 → 改成橢圓、只在落地後亮
//   ④ 抬升高度 5.4 格（傘蓋才進得了畫面）
//   ⑤ 版本戳記
const SB = require('./_sandbox');
const fs = require('fs'), path = require('path');
const env = SB.makeEnv();
const P = env.BH, G = env.G, rec = env.rec;
const src = SB.rawHtml;
try { P.WeekMod.pin([]); } catch (e) {}

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log('  ✓ ' + m); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

/* ================================================================ ① */
head('① 貼圖與設定');
{
  const f = path.join(__dirname, '..', 'spr', 'drop-art-para.webp');
  ok(fs.existsSync(f), 'spr/drop-art-para.webp 存在');
  const buf = fs.existsSync(f) ? fs.readFileSync(f) : Buffer.alloc(0);
  ok(buf.length > 12000, '檔案有內容（' + buf.length + ' bytes）');
  ok(buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP', 'WEBP 檔頭合法');

  ok(P.DROP_PARA && P.DROP_PARA.u === 'spr/drop-art-para.webp', '主檔有 DROP_PARA 設定');
  ok(P.DROP_PARA.w === 320 && P.DROP_PARA.h === 472, '宣告尺寸 320×472',
    { w: P.DROP_PARA.w, h: P.DROP_PARA.h });
  ok(Math.abs(P.DROP_PARA.asp - 320 / 472) < 1e-9, 'asp 與宣告尺寸一致（' + P.DROP_PARA.asp.toFixed(4) + '）');

  const list = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'spr', '_list.json'), 'utf8'));
  ok(list.indexOf('drop-art-para.webp') >= 0, '在 spr/_list.json 預熱清單裡');
  ok(typeof P.DropPara.get === 'function' && P.DropPara.get() === null, '未載入時 get() 回 null（不會破圖）');
  ok(/DropPara\.load\(\);/.test(src), '啟動時會載入降落傘貼圖');
  ok(fs.existsSync(path.join(__dirname, '..', 'art', 'drop-para-src.png')), '原圖留在 art/drop-para-src.png');
}

/* ================================================================ ② */
head('② 下落：有貼圖畫貼圖、沒貼圖退回程序繪製');
{
  const T = 36;
  G.brDrops = [{ x: 5, y: 5, h: .5, st: 'fall', t: 1, glow: 0 }];

  // (a) 沒貼圖 → 走原本的紅色半圓傘（arc ＋ brDropBoxArt）
  rec.calls.length = 0;
  P.drawBRDrop(T, true);
  const di0 = rec.calls.filter(c => c[0] === 'drawImage').length;
  const arc0 = rec.calls.filter(c => c[0] === 'arc').length;
  ok(di0 === 0, '沒有貼圖時不呼叫 drawImage');
  ok(arc0 > 0, '沒有貼圖時仍畫得出傘（arc ' + arc0 + ' 次）');

  // (b) 有貼圖 → 一張圖搞定
  const fake = { naturalWidth: 320, height: 472, width: 320 };
  const origGet = P.DropPara.get;
  P.DropPara.get = function () { return fake; };
  rec.calls.length = 0;
  P.drawBRDrop(T, true);
  const di1 = rec.calls.filter(c => c[0] === 'drawImage');
  ok(di1.length === 1, '有貼圖時只畫一張圖（drawImage ' + di1.length + ' 次）');
  ok(di1.length === 1 && di1[0][1] === fake, '畫的是 DropPara 那張圖');
  const dw = di1.length ? di1[0][4] : 0;
  ok(dw > T * 3 && dw < T * 4.5, '寬度約 3.8 格（' + Math.round(dw) + 'px，T=' + T + '）');
  const dh = di1.length ? di1[0][5] : 0;
  ok(Math.abs(dh / dw - 472 / 320) < .01, '高度照原圖比例（' + Math.round(dh) + '×' + Math.round(dw) + '）');
  const rot = rec.calls.filter(c => c[0] === 'rotate');
  ok(rot.length === 1 && Math.abs(rot[0][1]) <= .06, '有輕微搖擺（|' + (rot[0] ? rot[0][1].toFixed(3) : '?') + '| ≤ 0.06 rad）');

  // (c) 落地後（st=land）不能再畫傘
  G.brDrops = [{ x: 5, y: 5, h: 0, st: 'land', t: 0, glow: 0 }];
  rec.calls.length = 0;
  P.drawBRDrop(T, true);
  ok(rec.calls.filter(c => c[0] === 'drawImage').length === 0, '落地後不會再畫傘（只有 onlyFall=true 不處理）');

  P.DropPara.get = origGet;
  G.brDrops = [];
}

/* ================================================================ ③ */
head('③ 白色圓盤光暈 → 橢圓、只在落地後亮');
{
  const fakeChest = { naturalWidth: 240, height: 228, width: 240 };
  const origChest = P.DropArt.get;
  P.DropArt.get = function () { return fakeChest; };   // 有貼圖才會走到柔光那一段

  // 落地（k=1）：要有柔光，而且是 ellipse 不是正圓
  rec.calls.length = 0;
  P.brDropBoxArt(100, 100, 36, 1, 0);
  // 影子那顆 rx 只有 DW×.36（≈16px），柔光是 DW×.58（≈26px）→ 用大小區分
  const el = rec.calls.filter(c => c[0] === 'ellipse' && c[3] > 20);
  ok(el.length === 1, '落地有柔光（rx 較大的 ellipse 1 顆）');
  ok(el.length === 1 && el[0][4] < el[0][3] * .9,
    '柔光是壓扁的橢圓（rx ' + Math.round(el[0] ? el[0][3] : 0) + ' > ry ' + Math.round(el[0] ? el[0][4] : 0) + '）');

  // 下落（k<1）：連柔光都不畫
  rec.calls.length = 0;
  P.brDropBoxArt(100, 100, 36, .92, 0);
  ok(rec.calls.filter(c => c[0] === 'ellipse' && c[3] > 20).length === 0,
    '下落中不畫柔光（箱底那張圖本身就有光）');

  // 原本的半徑 DW×.70 正圓已經沒有了
  ok(!/ctx\.arc\(bx, cy, DW \* \.70/.test(src), '已無「半徑 DW×.70 的正圓」光暈');
  ok(!/rgba\(255,226,145,' \+ \(\.40 \+ \.30 \* pulse\)/.test(src), '中心不透明度 .70 的舊參數已移除');
  ok(/if \(k >= 1\) \{/.test(src), '柔光被包在「落地才畫」的條件裡');
  P.DropArt.get = origChest;
}

/* ================================================================ ④ */
head('④ 抬升高度與流程');
{
  ok(/const lift = T \* 5\.4 \* d\.h;/.test(src), '抬升 5.4 格（原本 7.5，傘蓋會跑到畫面外）');
  ok(/DropPara\.get\(\) : null;/.test(src) && /brDropBoxArt\(bx, by, T, \.92, 0\);/.test(src),
    '貼圖分支與程序繪製備援都還在');
  ok(/DROP_FALL: 3\.4/.test(src), '下落時間仍是 3.4 秒（節奏沒變）');

  // 真的跑一段：5 個空投週期不會炸
  let err = null;
  try {
    P.startBR(); G.state = 'play';
    for (let i = 0; i < 60 * 40; i++) P.updateBR(1 / 60);
  } catch (e) { err = e.message; }
  ok(!err, '跑 40 秒大逃殺不報錯' + (err ? '：' + err : ''));
}

/* ================================================================ ⑤ */
head('⑤ 版本');
{
  const vlog = fs.readFileSync(path.join(__dirname, '..', 'js', 'version-log.js'), 'utf8');
  ok(parseFloat(P.VERSION) >= 5.51, 'VERSION ≥ 5.51（實際 ' + P.VERSION + '）');
  ok(src.indexOf('id="verTxt">' + P.VERSION + '<') >= 0, '#verTxt 顯示 ' + P.VERSION);
  ok(src.indexOf('id="verLogVer">' + P.VERSION + '<') >= 0, '#verLogVer 顯示 ' + P.VERSION);
  ok(P.VERSION_LOG[0].v === P.VERSION && P.VERSION_LOG[0].now === true, '版本紀錄首位＝' + P.VERSION + '（now）');
  ok(P.VERSION_LOG[1] && P.VERSION_LOG[1].now === false, '上一版 ' + (P.VERSION_LOG[1] || {}).v + ' 已標成非 now');
  ok(!/v: '5\.50'[\s\S]{0,240}now: true/.test(vlog), '5.50 已改成 now:false');
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  const swm = /SW_VERSION = 'v([0-9.]+)'/.exec(sw);
  ok(swm && parseFloat(swm[1]) >= 5.51, 'sw.js SW_VERSION ≥ v5.51（' + (swm ? swm[1] : '?') + '）');
}

console.log('\n' + (fail ? '❌' : '✅') + ' v5.51：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
