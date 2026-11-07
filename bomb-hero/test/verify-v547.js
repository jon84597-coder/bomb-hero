// test/verify-v547.js —— v5.47：手機橫屏首頁「左 LOGO／右兩欄選單」＋ 頂部工具列壓扁
//   ① 觸發條件：觸控 + 橫放 + 寬 ≥ 640（body.home-wide 由 JS 開關，旋轉自動切換）
//   ② 版面骨架：一張 grid 分左右兩欄（左：公告／LOGO／版本／暱稱，右：選單）
//   ③ 頂部工具列：27px 扁膠囊、單行不換行、窄機帳號只留圖示
//   ④ 不影響直放／桌機（所有新規則都掛在 .home-wide 底下）
//   ⑤ 接線：relayout／applyCtrl 都會重算，且有匯出給測試
//   ⑥ 版本
const SB = require('./_sandbox');
const env = SB.makeEnv();
const P = env.BH;
const src = SB.rawHtml;
const fs = require('fs');

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log('  ✓ ' + m); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

const body = env.sandbox.document.body;

/* ================= ① 觸發條件 ================= */
head('① 觸發條件：觸控 + 橫放 + 寬 ≥ 640');
ok(P.HOME_WIDE_MIN === 640, 'HOME_WIDE_MIN = 640', P.HOME_WIDE_MIN);
ok(typeof P.homeWideOn === 'function' && typeof P.applyHomeWide === 'function', 'homeWideOn／applyHomeWide 都有匯出');

body.classList.remove('touch'); body.classList.remove('home-wide');
env.sandbox.innerWidth = 844; env.sandbox.innerHeight = 390;
ok(P.homeWideOn() === false, '非觸控裝置 → 不啟用（桌機不動）');

body.classList.add('touch');
ok(P.homeWideOn() === true, '844×390 觸控橫放 → 啟用');
ok(P.applyHomeWide() === true && body.classList.contains('home-wide'), 'applyHomeWide() 真的把 class 加上去');
ok(P.applyHomeWide() === true && body.classList.contains('home-wide'), '重複呼叫不會亂（idempotent）');

env.sandbox.innerWidth = 932; env.sandbox.innerHeight = 430;
ok(P.homeWideOn() === true, '932×430（平板橫放）→ 啟用');

env.sandbox.innerWidth = 640; env.sandbox.innerHeight = 360;
ok(P.homeWideOn() === true, '640×360（窄橫屏下限）→ 啟用');

env.sandbox.innerWidth = 639; env.sandbox.innerHeight = 360;
ok(P.homeWideOn() === false, '639 寬（差 1px）→ 退回原本版面');

env.sandbox.innerWidth = 700; env.sandbox.innerHeight = 620;
ok(P.homeWideOn() === false, '700×620（接近正方形）→ 不算橫放，不啟用');

env.sandbox.innerWidth = 430; env.sandbox.innerHeight = 932;
ok(P.homeWideOn() === false && P.applyHomeWide() === false, '轉回直放 430×932 → 自動關掉');
ok(!body.classList.contains('home-wide'), '直放時 body 上沒有 home-wide');

env.sandbox.innerWidth = 844; env.sandbox.innerHeight = 390;

/* ================= ② 版面骨架 ================= */
head('② 版面骨架：左欄資訊／右欄選單');
const gridRule = (src.match(/body\.touch\.home-wide #scr-title\.on \{[^}]*\}/) || [''])[0];
ok(/display: grid/.test(gridRule), '首頁容器在橫屏改成 grid');
ok(/grid-template-columns: minmax\(0, 45fr\) minmax\(0, 55fr\)/.test(gridRule), '左右兩欄 = 45fr / 55fr（右邊稍寬給兩欄按鈕）', gridRule.slice(0, 120));
ok(/padding-left: 58px/.test(gridRule), '左欄讓開左下角的 📚／🎁 浮動鈕（58px）');
ok(/body\.touch\.home-wide #scr-title \.title-card \{ display: contents; \}/.test(src),
  '標題卡片改成 display:contents（子元素直接進 grid，不用改 DOM）');
ok(/body\.touch\.home-wide #scr-title \.toprow \{[^}]*position: static;[^}]*grid-column: 1; grid-row: 1;/.test(src),
  '版本更新／作者公告：不再浮在右上，回到左欄第一列');
ok(/body\.touch\.home-wide #scr-title \.menu \{[^}]*grid-column: 2; grid-row: 1 \/ -1;/.test(src),
  '選單搬到右欄、跨滿所有列（v5.48：改成 1 / -1，欄數改了也不用回頭改）');
ok(/body\.touch\.home-wide #scr-title \.menu \.mgrid \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/.test(src),
  '右欄選單固定兩欄（直的兩排）');
ok(/body\.touch\.home-wide #scr-title \.title-card \.title-logo \{[^}]*width: 100%;[^}]*max-height: 100%/.test(src),
  'v5.48：LOGO 放到欄寬極限（width:100%，高度用 max-height 夾住）');
ok(/body\.touch\.home-wide #scr-title \.platrow \{ display: none; \}/.test(src),
  '平台小圖示在橫屏收起（省一整行給暱稱）');
ok(/body\.touch\.home-wide #scr-title \.ver \{[^}]*grid-column: 1; grid-row: 3;/.test(src), '版本號在左欄第三列（LOGO 下面）');
ok(/body\.touch\.home-wide #scr-title \.nickwrap \{[^}]*grid-column: 1; grid-row: 4;/.test(src), '暱稱在左欄第四列');
ok(/body\.touch\.home-wide #scr-title \.gap24 \{ display: none !important; \}/.test(src), '原本 24px 的高度間隙在橫屏拿掉');

/* ================= ③ 頂部工具列壓扁 ================= */
head('③ 頂部工具列：27px 扁膠囊');
const navRule = (src.match(/body\.touch\.home-wide #navBar \.navbtn \{[^}]*\}/) || [''])[0];
ok(/height: 27px/.test(navRule), '膠囊高度 27px（原本約 36px）', navRule.slice(0, 100));
ok(/font-size: 11\.5px/.test(navRule), '字級 11.5px —— 縮一級但仍清楚');
ok(/border-radius: 8px/.test(navRule), '從全圓改成 8px 小圓角（視覺更扁）');
ok(/body\.touch\.home-wide #navBar \.navbtn \{ white-space: nowrap; \}/.test(src), '一律不換行（字被拆成兩行就不扁了）');
ok(/body\.touch\.home-wide #navBar #acctChip b \{[^}]*text-overflow: ellipsis/.test(src), '帳號信箱太長自動省略');
ok(/@media \(max-width: 719px\) \{[\s\S]{0,400}body\.touch\.home-wide #navBar #acctChip b \{ display: none; \}/.test(src),
  '窄機（<720）帳號只留圖示，八顆膠囊才排得進一行');
ok(/@media \(max-width: 719px\) \{[\s\S]{0,900}body\.touch\.home-wide #scr-title \.toprow \.verlogbtn b \{ display: none; \}/.test(src),
  '窄機「版本更新內容」收成「📜 v5.47」，把寬度讓給作者公告');

/* ================= ④ 不影響直放／桌機 ================= */
head('④ 直放／桌機不受影響');
const block = src.slice(src.indexOf('/* ===== v5.47'), src.indexOf('</style>'));
const sels = block.match(/body\.touch\.home-wide[^,{]*/g) || [];
ok(sels.length > 20, '新區塊的選擇器全部掛在 body.touch.home-wide 底下（' + sels.length + ' 條）');
ok((block.match(/(?<!home-wide )(?<!\.)body\.touch (?!\.home-wide)[^,{]*\{/g) || []).length === 0,
  '沒有漏掉前綴的裸 body.touch 規則（否則會污染直放）');
ok(/body\.touch #scr-title \.menu \{\s*display: flex; flex-direction: column;/.test(src), '原本橫屏的直排選單規則還在（沒被刪）');
ok(/@media \(min-width: 900px\) \{[\s\S]{0,200}\.menu \{ max-width: none; display: grid; grid-template-columns: repeat\(4, 1fr\)/.test(src),
  '桌機的 4 欄規則原封不動');

/* ================= ⑤ 接線 ================= */
head('⑤ 旋轉／切換模式會重算');
ok(/function relayout\(\) \{\s*updateViewportVars\(\);\s*applyHomeWide\(\);/.test(src), 'relayout() 會呼叫 applyHomeWide()');
ok(/applyHomeWide\(\);\s*\/\/ v5\.47：切換觸控模式後重算橫屏版面/.test(src), 'applyCtrl() 也會呼叫（切換操作模式立即生效）');

/* ================= ⑥ 版本 ================= */
head('⑥ 版本戳記');
const vm = src.match(/const VERSION = '([\d.]+)'/);
ok(vm && parseFloat(vm[1]) >= 5.47, 'VERSION ≥ 5.47', vm && vm[1]);
const vlog = String(SB.vlog || '');
ok(/'5\.47'/.test(vlog), 'VERSION_LOG 有 5.47 條目');
ok(!/v: '5\.47'[\s\S]{0,200}now: true/.test(vlog), '5.47 已改成 now:false（被更新的一版蓋過）');
ok(!/v: '5\.46'[\s\S]{0,200}now: true/.test(vlog), '5.46 已改成 now:false');
const sws = [
  ['bomb-hero/sw.js', fs.readFileSync(__dirname + '/../sw.js', 'utf8')],
  ['public/sw.js', fs.readFileSync(__dirname + '/../../public/sw.js', 'utf8')],
  ['bomberman-online/public/sw.js', fs.readFileSync(__dirname + '/../../bomberman-online/public/sw.js', 'utf8')]
];
sws.forEach(function (it) {
  const m = /SW_VERSION = 'v([\d.]+)'/.exec(it[1]);
  ok(m && parseFloat(m[1]) >= 5.47, it[0] + ' 升到 v5.47（' + (m && m[1]) + '）');
});

console.log('\n' + (fail === 0 ? '✅ 全部 ' + pass + ' 項通過' : '❌ ' + fail + ' 項失敗 / ' + (pass + fail) + ' 項'));
process.exit(fail === 0 ? 0 : 1);
