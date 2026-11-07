// test/verify-v506.js —— v5.6：選擇鈕統一／大逃殺水晶鈕／新 LOGO／對戰選角 RPG 化
//   ① 所有分段鈕：未選＝石板灰、已選＝橘（單人與設定不再「全部都是橘」）
//   ② 大逃殺設定鈕同一套（選中橘、未選灰）
//   ③ 新 LOGO 是去背 WEBP（有 ALPH），首頁仍只有一張 #titleLogo
//   ④ 對戰選角＝RPG 人物卡（大頭像／箭頭壓在兩側／AI 紫框／框下無文字）
//   ⑤ 版號四處同步（5.6／SW v5.6.0 ×3／package.json）
// 跑法：node test/verify-v506.js
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log('  ✓ ' + m); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
function head(s) { console.log('\n' + s); }

// v5.38：版本紀錄搬到 js/version-log.js → 掃文案時一起讀進來
const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8') + '\n' +
  (function () { try { return fs.readFileSync(path.join(ROOT, 'js', 'version-log.js'), 'utf8'); } catch (e) { return ''; } })();

// 取一條選擇器開頭的大括號區塊（配平）
function rule(selStart, hay) {
  const h = hay || src;
  const i = h.indexOf(selStart);
  if (i < 0) return '';
  const a = h.indexOf('{', i);
  if (a < 0) return '';
  let d = 0, j = a;
  for (; j < h.length; j++) {
    if (h[j] === '{') d++;
    else if (h[j] === '}') { d--; if (d === 0) break; }
  }
  return h.slice(a, j + 1);
}

// ---------------------------------------------------------------
head('① 分段鈕：未選灰、已選橘（單人／設定不再全橘）');
// v5.6 的元凶：這兩條把 #scr-solo／#scr-settings 的 .seg button 用更高的特異度鎖成橘色，
//   導致「簡單／普通／困難」三顆長得一模一樣。
const orangeBase = rule('.biggo, .qbtn, .seg button, .shopcard .shbuy, .bdbtn');
ok(!!orangeBase, '橘色水晶基礎層還在（大按鈕與已選鈕共用）');
ok(!/#scr-solo \.seg button/.test(orangeBase), '橘色基礎層不再把「單人畫面的所有分段鈕」鎖成橘色');
ok(!/#scr-settings \.seg button/.test(orangeBase), '設定畫面也不再被鎖成橘色');
const slate = rule('.ghostbtn, .qbtn.ghost, .seg button, .bdbtn');
ok(/--c1: #7f92b0/.test(slate) && /--c2: #55647d/.test(slate) && /--c3: #2b3547/.test(slate),
  '未選的分段鈕是石板灰（#7f92b0 → #55647d → #2b3547）');
ok(/color: #eaf1ff/.test(slate), '石板灰鈕的字是亮色（不會黑字看不見）');
// 檔案裡有三條 .seg button.sel（舊深色版／奶油版／v5.0 水晶版）→ 取真的有 --c1 那條
function ruleWith(selStart, needle) {
  let i = -1;
  while ((i = src.indexOf(selStart, i + 1)) >= 0) {
    const r = rule(selStart, src.slice(i));
    if (r.indexOf(needle) >= 0) return r;
  }
  return '';
}
const sel = ruleWith('.seg button.sel {', '--c1:');
ok(/--c1: #ffd9a8/.test(sel) && /--c2: #ff9a4d/.test(sel) && /--c3: #b4541c/.test(sel),
  '已選的分段鈕是橘色水晶');
ok(/color: #2a1400/.test(sel), '橘色鈕的字是深色');
// 順序：石板灰那條一定要排在橘色基礎層之後，否則未選的又會被蓋回橘色
ok(src.indexOf('.ghostbtn, .qbtn.ghost, .seg button, .bdbtn {') > src.indexOf('.biggo, .qbtn, .seg button, .shopcard .shbuy, .bdbtn {'),
  '石板灰規則排在橘色基礎層之後（特異度相同時後者勝）');
ok(!/#scr-solo[^{]*\.seg button[^{]*\{[^}]*--c1: #ffd9a8/.test(src), '單人畫面沒有其他把 .seg button 改成橘色的規則');

head('② 大逃殺設定鈕：同一套水晶（選中橘、未選灰）');
const brs = rule('.brseg b {');
ok(/radial-gradient/.test(brs), '未選：果凍鏡面（不是舊版平板色）');
ok(/#9dabbf/.test(brs) && /#4d5a6f/.test(brs), '未選：石板灰漸層（#9dabbf → #4d5a6f）');
ok(/color: #f2f6ff/.test(brs), '未選：亮色字');
const brsOn = rule('.brseg b.on {');
ok(/radial-gradient/.test(brsOn) && /#f4703c/.test(brsOn), '已選：橘色果凍');
ok(/color: #2a1400/.test(brsOn), '已選：深色字');
ok(!/#1b2740/.test(brs) && !/#2c3d61/.test(brs), '舊的深藍底已經拿掉');

head('③ 新 LOGO（去背 WEBP）');
const logoPath = path.join(ROOT, 'spr', 'title-logo.webp');
ok(fs.existsSync(logoPath), 'spr/title-logo.webp 存在');
const lb = fs.readFileSync(logoPath);
ok(lb.slice(0, 4).toString() === 'RIFF' && lb.slice(8, 12).toString() === 'WEBP', '是合法 WEBP');
ok(lb.indexOf('ALPH') > 0, '含 ALPH 區塊 → 真的有透明通道（去背過）');
ok(lb.length < 220000, '檔案 ' + Math.round(lb.length / 1024) + 'KB（< 220KB，不要為了 LOGO 拖慢首頁）');
// 尺寸：VP8X 擴展格式會把畫布大小寫在 24~29 位元組
let w = 0, h = 0;
if (lb.slice(12, 16).toString() === 'VP8X') {
  w = 1 + (lb[24] | (lb[25] << 8) | (lb[26] << 16));
  h = 1 + (lb[27] | (lb[28] << 8) | (lb[29] << 16));
}
ok(w >= 600 && w <= 1000 && h > 0, '寬度 ' + w + '×' + h + '（夠大又不至於爆版面）');
ok(w / (h || 1) > 1.4 && w / (h || 1) < 2.0, '長寬比 ' + (w / (h || 1)).toFixed(2) + '（徽章構圖，不會太瘦長）');
const logoImgs = src.match(/<img[^>]*class="title-logo"/g) || [];
ok(logoImgs.length === 1, '靜態 <img> 只有 #titleLogo 這一個（其餘是 JS 動態產生的頭像）');
ok(/<img class="title-logo" id="titleLogo"[^>]*src="spr\/title-logo.webp(\?[^"]*)?"/.test(src), '#titleLogo 指向 spr/title-logo.webp');
ok(fs.readFileSync(path.join(ROOT, 'spr', '_list.json'), 'utf8').indexOf('title-logo.webp') > 0,
  'title-logo.webp 仍在預熱清單（spr/_list.json）裡');

head('④ 對戰選角＝RPG 人物卡');
ok(/'<div class="ppf">'/.test(src), '卡片有獨立的人物框 .ppf');
ok(/<canvas class="chpv" width="220" height="200" data-ch=/.test(src), '頭像用 CharPreview 的 .chpv（220×200，v5.7 起改高解析度）');
ok(/class="arr l"/.test(src) && /class="arr r"/.test(src), '換角箭頭壓在頭像左右（.arr.l／.arr.r）');
ok(/data-ai="' \+ i \+ '" class="aibtn/.test(src), '玩家／AI 切換鈕還在（data-ai）');
ok(!/'<div class="pw">'/.test(src), '框底下不再輸出任何說明文字（.pw 整行移除）');
ok(/\.pbox \.pw\{display:none\}/.test(src), '就算別處還有 .pw，也強制不顯示');
ok(/CharPreview\.mount\(wrap\)/.test(src), 'renderSlots 會把新頭像交給 CharPreview 掛載');
ok(/Screen\.current !== 'rpg' && Screen\.current !== 'battle'/.test(src), 'CharPreview 在對戰畫面也會動');
const aiBox = rule('#scr-battle #pSlots .pbox.ai{');
ok(/line/.test(aiBox) || /#eae0ff/.test(aiBox), 'AI 的框換成淡紫底（跟玩家的奶油底分開）');
ok(/#b7a2ea/.test(aiBox), 'AI 的框線是紫色');
const plBox = rule('#scr-battle #pSlots .pbox{');
ok(/#ffeed6/.test(plBox) && /#e8c39a/.test(plBox), '玩家的框是奶油底＋木框（跟 RPG 卡一樣）');
ok(/\.ppf \.arr\{position:absolute/.test(src), '箭頭是絕對定位（不會把卡片撐高、也不會擠到人物）');
ok(/@media \(max-width:520px\)\{[\s\S]{0,300}repeat\(2,minmax\(0,1fr\)\)/.test(src), '手機兩欄');
ok(/@media \(max-width:520px\)\{[\s\S]{0,400}\.arr\{width:30px;height:30px/.test(src), '手機箭頭 30px（v5.17 從 44 縮小，才不會蓋到角色）');
ok(/\.ppf canvas\.chpv\{display:block;width:100%/.test(src), '頭像吃滿卡片寬度（會跟著螢幕縮放）');

head('⑤ 版號與資料同步');
const V = (src.match(/const VERSION = '([\d.]+)'/) || [])[1];
// 不要把版號寫死 —— 之後每一版都要能跑（只驗「不低於 5.6」且格式是純數字）
function vnum2(v) { return String(v).split('.').map(function (n) { return parseInt(n, 10) || 0; }); }
function vlt2(a, b) {
  const A = vnum2(a), B2 = vnum2(b);
  for (let i = 0; i < Math.max(A.length, B2.length); i++) {
    if ((A[i] || 0) !== (B2[i] || 0)) return (A[i] || 0) < (B2[i] || 0);
  }
  return false;
}
ok(/^\d+(\.\d+)*$/.test(V || '') && !vlt2(V, '5.6'), 'VERSION = ' + V + '（純數字且不低於 5.6）');
ok(src.indexOf('<span id="verTxt">' + V + '</span>') > 0, '首頁版本文字同步 ' + V);
ok(src.indexOf('<span id="verLogVer">' + V + '</span>') > 0, '版本面板標題同步 ' + V);
const vl = (src.match(/(?:const VERSION_LOG|window\.__VERSION_LOG) = \[\s*\{ v: '([\d.]+)'/) || [])[1];
ok(vl === V, 'VERSION_LOG 第一筆 = ' + vl);
const itemN = (src.match(/(?:const VERSION_LOG|window\.__VERSION_LOG) = \[[\s\S]{0,4000}?items: \[([\s\S]*?)\] \}/) || [])[1] || '';
ok((itemN.match(/'/g) || []).length >= 8, '本版至少 4 條更新（' + Math.floor((itemN.match(/'/g) || []).length / 2) + ' 條）');
['bomb-hero/sw.js', 'public/sw.js', 'bomberman-online/public/sw.js'].forEach(function (f) {
  const t = fs.readFileSync(path.join(ROOT, '..', f), 'utf8');
  ok(t.indexOf("var SW_VERSION = 'v" + V + ".0'") > 0, f + ' 的 SW 版號 = v' + V + '.0');
});
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, '..', 'package.json'), 'utf8'));
ok(pkg.version === V + '.0', 'package.json = ' + pkg.version);
ok(fs.readFileSync(path.join(ROOT, '..', 'public', 'index.html'), 'utf8') ===
  fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), 'public/index.html 與主檔一致');

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' v5.6：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail === 0 ? 0 : 1);
