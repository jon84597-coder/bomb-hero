// test/verify-v542.js —— v5.42：手機橫屏頂部資訊列「壓扁」
//   ① 橫放 chip 從 40px 壓到 21px（min-height／padding／字級都收窄）
//   ② 關卡主題名 <i class="thn"> 一律單行省略 —— 不再被壓成「天空要塞」直排四行
//   ③ 窄橫屏（<700px）索性隱藏主題名，寬度全讓給數字
//   ④ 資訊列上方留白 4px → 2px、下緣 margin 2px → 0（遊戲畫面往上長）
//   ⑤ chip 允許壓縮（min-width:0），窄機不會把最後的計時器截掉
//   ⑥ 直放同步收一級（min-height 21 → 20、line-height:1）
//   ⑦ 桌面／大螢幕的 .chip 完全沒被動到（不是全域改小）
//   ⑧ 版本 / 版本日誌
const SB = require('./_sandbox');
const env = SB.makeEnv();
const P = env.BH;
const src = SB.rawHtml;

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log('  ✓ ' + m); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }
// 取出某一條規則的宣告區塊（selector 之後到第一個 }）
function rule(sel) {
  const i = src.indexOf(sel);
  if (i < 0) return '';
  const j = src.indexOf('{', i), k = src.indexOf('}', j);
  return (j < 0 || k < 0) ? '' : src.slice(j + 1, k);
}

/* ============ ① 橫放 chip 變扁 ============ */
head('① 橫放 chip 壓到 21px');
const lsChip = rule('body.touch.in-game #gameTop .chip {');
ok(/min-height:\s*21px/.test(lsChip), 'chip min-height 21px（原本實測 40px）', lsChip.slice(0, 80));
ok(/padding:\s*0 6px/.test(lsChip), 'chip 上下內距歸零（原本 6px，是撐高的主因）');
ok(/line-height:\s*1/.test(lsChip), 'line-height:1（避免行高把 21px 撐回 30px）');
ok(/font-size:\s*9\.5px/.test(lsChip), 'chip 字級 9.5px');
ok(!/padding:\s*6px/.test(lsChip), '舊的 padding:6px*x 已移除');

/* ============ ② 數字／圖示各降一級 ============ */
head('② 數字與圖示各降一級');
const lsB = rule('body.touch.in-game #gameTop .chip b {');
ok(/font-size:\s*11\.5px/.test(lsB), 'chip b 11.5px（原 16.5px 撐出 40px 高）', lsB);
const lsBig = rule('body.touch.in-game #gameTop .chip.big b {');
ok(/font-size:\s*12\.5px/.test(lsBig), '計時器（.chip.big b）12.5px', lsBig);
const lsIc = rule('body.touch.in-game #gameTop .chip .ic {');
ok(/font-size:\s*10\.5px/.test(lsIc), '圖示 .ic 10.5px', lsIc);
const lsHp = rule('body.touch.in-game #gameTop .chip .hpicks {');
ok(/font-size:\s*9\.5px/.test(lsHp), '生命心 9.5px（3~5 顆心仍塞得下）', lsHp);
ok(/letter-spacing:\s*-1\.7px/.test(lsHp), '生命心字距 -1.7px');

/* ============ ③ 主題名不再直排 ============ */
head('③ 主題名單行省略');
const thn = rule('body.touch.in-game #gameTop .chip .thn {');
ok(/white-space:\s*nowrap/.test(thn), '.thn 加 nowrap —— 這是「天空要塞」被壓成直排四行的根因', thn.slice(0, 120));
ok(/text-overflow:\s*ellipsis/.test(thn), '.thn 超寬用省略號，不是換行');
ok(/max-width:\s*5\.4em/.test(thn), '.thn 有寬度上限，不會把數字擠掉');
ok(/min-width:\s*0/.test(thn), '.thn 允許縮到 0（配合省略號）');
ok(/flex:\s*0 1 auto/.test(thn), '.thn 可壓縮、不可撐大');
ok(/opacity:\s*\.72/.test(thn), '.thn 半透明（次要資訊，不跟數字搶眼');

/* ============ ④ 窄橫屏直接收起主題名 ============ */
head('④ 窄橫屏隱藏主題名');
ok(/@media \(max-width: 700px\) \{\s*body\.touch\.in-game #gameTop \.chip \.thn \{ display: none; \}/.test(src),
  'max-width:700px 時 .thn 隱藏（跟直放一致，寬度全給數字）');

/* ============ ⑤ 讓 chip 可以壓縮 ============ */
head('⑤ 窄機不會截掉最後一格');
ok(/min-width:\s*0/.test(lsChip), '#gameTop chip 有 min-width:0 → 真的能被壓縮（原本壓不動、overflow 直接切掉計時器）');
const gt = rule('body.touch.in-game #gameTop {');
ok(/flex-wrap:\s*nowrap/.test(gt), '#gameTop 維持 nowrap（單排）');
ok(/overflow:\s*hidden/.test(gt), '#gameTop 維持 overflow:hidden（不會撐破版面）');
ok(/align-items:\s*center/.test(gt), '#gameTop align-items:center（21px 的格子垂直居中）');
ok(/margin-bottom:\s*0/.test(gt), '#gameTop 下緣 margin 歸零（原 2px）');

/* ============ ⑥ 上方留白與右側保留區 ============ */
head('⑥ 上方留白與右側保留區');
const gtRow = rule('body.touch.in-game #scr-game.on .game-top {');
ok(/padding-top:\s*calc\(2px \+ env\(safe-area-inset-top, 0px\)\)/.test(gtRow), '資訊列上方留白 4px → 2px', gtRow);
// v5.54：154px 是寫死的，但那一組按鈕的寬度會隨語言／登入狀態變（綁定後會換成暱稱），
//   實測 844×390 會壓到計時器 26px。改成「量多少讓多少」：CSS 吃 --navreserve，
//   154px 只留著當 JS 還沒跑之前的後備值。
ok(/padding-right:[ ]*var\(--navreserve,[ ]*154px\)/.test(gtRow),
  '右側讓位改成 var(--navreserve)（後備 154px）');
ok(/padding-left:\s*5px/.test(gtRow), '左側 5px 保留');
ok(/margin-bottom:\s*0/.test(gtRow), '資訊列下緣 margin 2px → 0');
ok(!/padding-top:\s*calc\(4px/.test(src), '舊的 4px 留白已不存在');

/* ============ ⑦ 直放同步收一級 ============ */
head('⑦ 直放同步收一級');
const ptChip = rule('body.touch.in-game #gameTop .chip {\nmin-height');
ok(/min-height:\s*20px/.test(ptChip), '直放 chip 21px → 20px', ptChip.slice(0, 90));
ok(/line-height:\s*1/.test(ptChip), '直放 chip line-height:1');

/* ============ ⑧ 桌面沒被動到 ============ */
head('⑧ 桌面／平板（非 touch）不受影響');
const baseChip = rule('.chip {\nbackground: #151d33');
ok(/min-height:\s*38px/.test(baseChip), '桌面 .chip 仍 38px（沒有全域改小）', baseChip.slice(0, 90));
const bigChip = rule('.game-top .chip { background: #fffaf0');
ok(/font-size:\s*13px/.test(bigChip), '桌面 .game-top .chip 仍 13px');
ok(/\.game-top \.chip b \{ color: #c9502a; font-size: 16\.5px; \}/.test(src), '桌面 chip b 仍 16.5px');

/* ============ ⑨ 版本 ============ */
head('⑨ 版本');
const V = parseFloat(P.VERSION);
ok(V >= 5.42, 'VERSION ≥ 5.42（實際 ' + P.VERSION + '）');
const vlog = (function () { try { return require('fs').readFileSync(__dirname + '/../js/version-log.js', 'utf8'); } catch (e) { return ''; } })();
ok(vlog.indexOf("{ v: '5.42'") > 0, 'VERSION_LOG 有 5.42 條目');
const i542 = vlog.indexOf("{ v: '5.42'");
const i541 = vlog.indexOf("{ v: '5.41'");
ok(i542 >= 0 && i542 < i541, '5.42 排在 5.41 前面（最新在最上）');
ok(/v: '5\.41'[^}]*now: false/.test(vlog), '5.41 已改 now:false');
const nowCount = (vlog.match(/now: true/g) || []).length;
ok(nowCount === 1, '全檔只有一筆 now:true（實際 ' + nowCount + '）');
const sw = (function () { try { return require('fs').readFileSync(__dirname + '/../sw.js', 'utf8'); } catch (e) { return ''; } })();
{
  /* v5.99.1：補丁版（v5.99.1）也要吃得下。 */
  const m = sw.match(/SW_VERSION = 'v(\d+)\.(\d+)\.\d+'/);
  ok(!!m && (+m[1] * 1000 + +m[2]) >= 5042, 'sw.js SW_VERSION ≥ v5.42（實際 ' + (m ? 'v' + m[1] + '.' + m[2] : '?') + '）');
}

console.log('\n' + (fail === 0 ? '✅ 全部 ' + pass + ' 項通過' : '❌ ' + fail + ' 項失敗 / ' + (pass + fail) + ' 項'));
process.exit(fail === 0 ? 0 : 1);
