// test/verify-v482.js —— v4.82：水晶高光按鈕
//   ① 光學層寫在 background 上（不能新增 ::after，否則會蓋住行內文字）
//   ② 六個按鈕家族都吃到同一套光學：首頁卡／抽屜／彈窗主次／次要鈕／兩顆頂端膠囊
//   ③ inset 陰影撐出「水晶厚度」：頂緣銳光 + 頂部內折射 + 底部吸光
//   ④ 三態（hover / active / newbie 呼吸）都有重寫，動畫不會把內陰影吃掉
//   ⑤ 版面沒被撐壞：min-height、圓角、手機欄數不變
//   ⑥ 沒有引入圖片／backdrop-filter（只准漸層 + 陰影）
//   ⑦ 版本與容量
const { makeEnv } = require('./_sandbox');
const fs = require('fs'), path = require('path');

const env = makeEnv();
const src = env.html;
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ FAIL: ' + m); } }
function head(t) { console.log('\n=== ' + t + ' ==='); }

// 只切出 v4.82 這段 CSS：從自己的註解到下一段註解為止。
// 不切的話，斷言 backdrop-filter／url() 會掃到整包 JS，全部誤判。
const S = src.indexOf('v4.82：水晶高光按鈕');
const E = src.indexOf('/* v4.53：選角卡片放大', S);
const V42 = S < 0 ? '' : src.slice(S, E > S ? E : S + 9000);
ok(V42.length > 1500, 'v4.82 樣式區塊存在（' + V42.length + ' 字元）');

// 從 hay 裡依「選擇器開頭」抓一段大括號區塊（大括號配平）
function rule(selStart, hay) {
  const h = hay || V42;
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
function count(re, s) { return (s.match(re) || []).length; }

head('① 光學層寫在 background，不新增偽元素');
ok(!/\.mbtn::after/.test(src), '沒有 .mbtn::after（絕對定位偽元素會蓋在行內文字上）');
ok(!/\.drawbtn::after/.test(src), '沒有 .drawbtn::after');
ok(!/\.qbtn::after/.test(src), '沒有 .qbtn::after');
ok(/background:[\s\S]{0,80}radial-gradient/.test(V42), '高光用 radial-gradient 疊在 background 上');

const mbtn = rule('#scr-title .menu .mbtn {');
ok(mbtn.length > 100, '.mbtn 區塊抓到了（' + mbtn.length + ' 字元）');
ok(count(/radial-gradient/g, mbtn) >= 2, '.mbtn 至少兩層 radial-gradient（聚光點＋弧形鏡面），實際 ' + count(/radial-gradient/g, mbtn));
ok(/linear-gradient\(180deg, var\(--c1\) 0%, var\(--c2\) 42%, var\(--c3\) 100%\)/.test(mbtn), '.mbtn 本體 c1→c2(42%，正好在鏡面分界)→c3 的上下漸層');

head('② 六個按鈕家族都套用');
const fams = [
  ['#scr-title .menu .mbtn {', '首頁玩法卡'],
  ['#scr-title .drawbtn {', '更多抽屜'],
  ['.qbtn {', '彈窗主鈕'],
  ['.qbtn.ghost {', '彈窗次鈕'],
  ['.ghostbtn {', '次要鈕（回主選單等）'],
  ['.verlogbtn {', '頂端版本膠囊'],
  ['.annbox .annhead {', '作者公告膠囊']
];
for (const [sel, name] of fams) {
  const b = rule(sel);
  ok(b.length > 30 && /radial-gradient|rgba\(255,255,255,\.\d+\) \d+%/.test(b), name + ' 有水晶高光層');
}

head('③ 水晶厚度：三種 inset 陰影');
ok(/inset 0 0 0 2px rgba\(255,255,255,\.22\)/.test(mbtn), '整圈 2px 內亮邊（斜角）');
ok(/inset 0 3px 0 rgba\(255,255,255,\.85\)/.test(mbtn), '上緣 3px 銳光');
ok(/inset 0 -3px 0 rgba\(255,255,255,\.36\)/.test(mbtn), '下緣 3px 反光');
ok(/radial-gradient\(ellipse 88% 44% at 50% -2%/.test(mbtn), '鏡面是弧形（下緣曲線，不是一條直線切過去）');
ok(/rgba\(255,255,255,\.16\) 45%/.test(mbtn), '鏡面正下方有一道回光（深色段的漸層起點）');
ok(/rgba\(0,0,0,\.32\) 100%/.test(mbtn), '深色段漸層一路壓到最暗（不是平色）');
ok(/0 5px 0 var\(--c3\)/.test(mbtn), '實體厚度 0 5px 0');
ok(/border: 2px solid rgba\(0,0,0,\.26\)/.test(mbtn), '外框 2px 深色（水晶邊界）');

head('④ 三態都重寫，動畫不會吃掉內陰影');
const hov = rule('#scr-title .menu .mbtn:hover {');
ok(/inset 0 3px 0 rgba\(255,255,255,\.95\)/.test(hov), 'hover 上緣更亮');
ok(/0 0 18px 2px var\(--g1\)/.test(hov), 'hover 保留主題色外光暈');
const act = rule('#scr-title .menu .mbtn:active {');
ok(/inset 0 3px 9px rgba\(0,0,0,\.30\)/.test(act), 'active 壓下去是凹面內影');
ok(count(/@keyframes mbtnGlow\b/g, src) >= 2, 'mbtnGlow 被就地重新定義（後者勝出）');
const kfI = V42.lastIndexOf('@keyframes mbtnGlow');
const kf = kfI < 0 ? '' : V42.slice(kfI, kfI + 700);
ok(/inset 0 0 0 2px rgba\(255,255,255,\.22\)/.test(kf), '新 keyframes 含邊緣反光（動畫優先序高於一般宣告）');

head('⑤ 版面沒被撐壞');
ok(/min-height: 98px/.test(src), '卡片仍 min-height 98px');
ok(/border-radius: 15px/.test(src), '卡片圓角仍 15px');
ok(/grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/.test(src), '手機仍 2 欄');
ok(!/overflow-wrap|word-break/.test(V42), 'v4.82 沒有動到換行規則');

head('⑥ 沒有引入圖片或 backdrop-filter');
ok(!/backdrop-filter/.test(V42), '沒有 backdrop-filter（Android WebView 會卡）');
ok(!/url\(/.test(V42), '沒有任何 url()／外部圖');
ok(!/data:image/.test(V42), '沒有 base64 圖');
ok(!/filter: blur/.test(V42), '沒有 blur 濾鏡');

head('⑥-2 全遊戲選擇鈕（單人／對戰／設定）');
/* 使用者要求「遊戲內所有選擇按鈕都套這種質感」，所以範圍不能只停在首頁。 */
const grp = rule('.seg button, .stg, .chcard, .minibtn, .keybtn {');
ok(grp.length > 200 && /radial-gradient/.test(grp), '分段鈕／關卡數字／角色卡／小按鈕 共用同一條奶油果凍');
const segSel = rule('.seg button.sel {');
ok(/radial-gradient/.test(segSel) && /#ffc98c/.test(segSel), '分段鈕的已選狀態是橘色果凍');
ok(/inset 0 0 0 2px rgba\(255,255,255,\.22\)/.test(segSel), '橘色果凍也有整圈內亮邊');
const stgSel = rule('.stg.sel, .chcard.sel {');
ok(/border-color: #f4703c/.test(stgSel), '關卡數字／角色卡的已選是橘框（字仍是深色才看得清）');
ok(/radial-gradient/.test(stgSel), '已選也用同一套弧形鏡面');
const big = rule('.biggo {');
ok(/radial-gradient/.test(big) && /inset 0 3px 0/.test(big), '開始遊戲大按鈕是橘色果凍');
const dark = rule('#scr-battle #pSlots .crow button {');
ok(/radial-gradient/.test(dark) && /#1d2842/.test(dark), '對戰選角的暗底小鈕用深色果凍');
ok(/\.crow button\.aibtn/.test(V42), 'AI 開關鈕有獨立配色（不會被深色果凍蓋掉）');
const brs = rule('.brseg b {');
ok(/radial-gradient/.test(brs) && /#1b2740/.test(brs), '大逃殺面板的選項鈕有深色果凍（這一組當初漏掉過）');
ok(/\.brseg b\.on \{[\s\S]{0,600}?radial-gradient/.test(V42), '大逃殺已選項是橘色果凍');
ok(/#brOv #brGo \{[\s\S]{0,600}?radial-gradient/.test(V42), '出發鈕也吃到果凍（它用的是 .mbtn.warm，不在首頁選單底下）');

head('⑦ 版本更新日誌的 10 國譯文');
/* 只有「最新一版」的條目會走字典（ver.<v>.<n>）。漏一列，非中文語系就會整段
   退回 t('verLog.zhOnly')＝「原文為繁中」，等於新版本對外語玩家隱形。 */
const CJK = /[\u4e00-\u9fff]/;
const nItems = (src.match(/v: '4\.82'[\s\S]{0,1200}?items: \[([\s\S]*?)\] \}/) || [])[1];
ok(!!nItems, '抓得到 4.82 的 items 陣列');
const itemCount = nItems ? (nItems.match(/'[^']*\n?\s*'/g) || []).length || nItems.split(/',\s*'/).length : 0;
for (let n = 1; n <= 4; n++) {
  const key = 'ver.4.82.' + n;
  const line = src.split('\n').find(function (x) { return x.indexOf(key + '|') === 0; });
  if (!line) { ok(false, key + ' 字典列存在'); continue; }
  const cols = line.split('|');
  ok(cols.length === 11, key + ' 剛好 11 欄（實際 ' + cols.length + '）');
  const empties = cols.slice(2).filter(function (c) { return !c.trim(); });
  ok(empties.length === 0, key + ' 9 種語言都填了');
  /* 日文（第 5 欄）本來就用漢字，不能當「漏中文」判 —— 只檢查 en/ko/th/vi/ru/de/it */
  const cjkLeak = cols.filter(function (c, i) { return i >= 3 && i !== 4 && CJK.test(c); });
  ok(cjkLeak.length === 0, key + ' 的非中文語系沒有漏中文' + (cjkLeak.length ? '（' + cjkLeak.length + ' 欄）' : ''));
}
ok(itemCount >= 3, '4.82 至少 3 條更新項目（' + itemCount + ' 條）');

head('⑧ 版本與容量');
ok(/^4\.(8[2-9]|9\d)$/.test(env.BH.VERSION), 'VERSION 至少 4.82（實際 ' + env.BH.VERSION + '）');
ok(new RegExp('id="verTxt">' + env.BH.VERSION.replace(/\./g, '\\.') + '<').test(src), 'verTxt 跟著 VERSION 走');
ok(env.BH.VERSION_LOG[0].v === env.BH.VERSION && env.BH.VERSION_LOG[0].now === true, 'VERSION_LOG 首位是當前版號且 now:true');
ok(env.BH.VERSION_LOG[1].now === false, '上一版（' + env.BH.VERSION_LOG[1].v + '）已改 now:false');
const chars = src.length;
ok(chars < 3900000, '字元 ' + chars + ' < 3.9M');
ok((src.match(/\r/g) || []).length === 0, '整檔 LF（CR 0）');
for (const f of ['sw.js', '../public/sw.js', '../bomberman-online/public/sw.js']) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) { ok(false, f + ' 不存在'); continue; }
  const sv = (fs.readFileSync(p, 'utf8').match(/SW_VERSION = '(v[\d.]+)'/) || [])[1] || '';
  ok(/^v4\.(8[2-9]|9\d)\.\d+$/.test(sv), f + ' 版本跟得上主檔（' + sv + '）');
}

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' ' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
