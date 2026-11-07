// test/verify-v543.js —— v5.43：浮動方向圓盤整組縮小 35%
//   ① 外圈 152 → 99px、中央小球 62 → 40px（等比 65%）
//   ② 小球可推距離 44 → 29、拉滿距離 88 → 58（等比 65%）
//   ③ 幾何仍然「球邊不會跑出圈邊」（29 + 20 = 49 ≤ 49.5）
//   ④ 虛線導引圈與球心圓點一起等比縮（19.5 / 10px），不會出現大圈配小點
//   ⑤ 判定完全沒動：9px 死區、120px 原點前帶、軸向輸出照舊
//   ⑥ 只有「滑動模式」才顯示（實體搖桿不受影響）
//   ⑦ 版本 / 版本日誌
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
function rule(sel) {
  const i = src.indexOf(sel);
  if (i < 0) return '';
  const j = src.indexOf('{', i), k = src.indexOf('}', j);
  return (j < 0 || k < 0) ? '' : src.slice(j + 1, k);
}

/* ============ ① 尺寸 ============ */
head('① 外圈與小球');
const pad = rule('#touchUI .fpad {');
ok(/width:\s*99px;\s*height:\s*99px/.test(pad), '外圈 99×99px（原 152 → 縮 35%）', pad.replace(/\s+/g, ' ').slice(0, 120));
ok(/margin:\s*-49\.5px 0 0 -49\.5px/.test(pad), '外圈 margin -49.5（圓心對準按壓點，縮小後沒跑掉）');
ok(/border:\s*1\.5px solid/.test(pad), '外圈邊框 2px → 1.5px（等比，不然小圈會顯得粗）');
ok(/pointer-events:\s*none/.test(pad), '仍不吃指標事件（純視覺層）');
const knob = rule('#touchUI .fpad .fknob {');
ok(/width:\s*40px;\s*height:\s*40px/.test(knob), '小球 40×40px（原 62 → 縮 35%）', knob.replace(/\s+/g, ' ').slice(0, 120));
ok(/margin:\s*-20px 0 0 -20px/.test(knob), '小球 margin -20（正中央）');
ok(/border:\s*1\.5px solid/.test(knob), '小球邊框 2px → 1.5px');
const ring = rule('#touchUI .fpad .fring {');
ok(/inset:\s*19\.5px/.test(ring), '虛線導引圈 inset 30 → 19.5px（跟著縮，仍在滿舵半徑附近）', ring.replace(/\s+/g, ' '));
const dot = rule('#touchUI .fpad .fknob::after {');
ok(/width:\s*10px;\s*height:\s*10px/.test(dot), '球心圓點 16 → 10px', dot.replace(/\s+/g, ' '));

/* ============ ② 位移 ============ */
head('② 位移與拉滿距離');
ok(/const FP_KNB = 29;/.test(src), '球最大位移 44 → 29');
ok(/Math\.min\(1, len \/ 58\) \* FP_KNB/.test(src), '拉滿距離 88 → 58px（等比，跟手感比例不變）');
ok(!/len \/ 88/.test(src), '舊的 88px 拉滿已不存在');
ok(!/FP_KNB = 44/.test(src), '舊的 44 位移已不存在');

/* ============ ③ 幾何 ============ */
head('③ 幾何守衛');
{
  const fpR = 99 / 2, knR = 40 / 2, maxD = 29, ringR = (99 - 2 * 19.5) / 2;
  ok(maxD + knR <= fpR, '球位移 29 + 半徑 20 = ' + (maxD + knR) + ' ≤ 外圈半徑 ' + fpR + '（永遠不出圈）');
  ok(maxD + knR > fpR - 1.6, '滿舵時球邊幾乎貼住圈邊（留 ' + (fpR - maxD - knR).toFixed(1) + 'px，不會看起來「推不到底」）');
  ok(ringR <= fpR, '虛線圈半徑 ' + ringR + ' ≤ 外圈 ' + fpR);
}

/* ============ ④ 判定沒動 ============ */
head('④ 判定照舊');
ok(/const SLIDE_DEAD = 9, SLIDE_MAX = 120;/.test(src), '死區 9px／原點前帶 120px 原封不動');
ok(src.indexOf('if (len < 9) return;') > 0, 'fpadMove 的死區守衛還在');
ok(/Input\.setTouchAxis\(on \? dx \/ len : 0, on \? dy \/ len : 0\);/.test(src), '軸向輸出照舊走 setTouchAxis（走位手感不變）');

/* ============ ⑤ 只有滑動模式顯示 ============ */
head('⑤ 顯示條件');
ok(/body\.touch\.slidepad #touchUI \.fpad \{ display: block; \}/.test(src), '只有 slidepad（滑動模式）才顯示浮動圓盤');
ok(/#touchUI \.fpad \.tpad/.test(src) === false, '沒有誤改到實體搖桿 .tpad');
ok(/body\.touch\.slidepad #touchUI \.tpad \{ visibility: hidden/.test(src), '滑動模式下實體圓盤仍隱藏');

/* ============ ⑥ 版本 ============ */
head('⑥ 版本');
const V = parseFloat(P.VERSION);
ok(V >= 5.43, 'VERSION ≥ 5.43（實際 ' + P.VERSION + '）');
const vlog = (function () { try { return fs.readFileSync(__dirname + '/../js/version-log.js', 'utf8'); } catch (e) { return ''; } })();
ok(vlog.indexOf("{ v: '5.43'") > 0, 'VERSION_LOG 有 5.43 條目');
const i543 = vlog.indexOf("{ v: '5.43'");
const i542 = vlog.indexOf("{ v: '5.42'");
ok(i543 >= 0 && i543 < i542, '5.43 排在 5.42 前面（最新在最上）');
ok(/v: '5\.42'[^}]*now: false/.test(vlog), '5.42 已改 now:false');
const nowCount = (vlog.match(/now: true/g) || []).length;
ok(nowCount === 1, '全檔只有一筆 now:true（實際 ' + nowCount + '）');
const sw = (function () { try { return fs.readFileSync(__dirname + '/../sw.js', 'utf8'); } catch (e) { return ''; } })();
const swm = sw.match(/SW_VERSION = 'v([\d.]+)'/);
ok(swm && parseFloat(swm[1]) >= 5.44, 'sw.js SW_VERSION ≥ v5.44（現為 ' + (swm ? swm[0] : '?') + '）');

console.log('\n' + (fail === 0 ? '✅ 全部 ' + pass + ' 項通過' : '❌ ' + fail + ' 項失敗 / ' + (pass + fail) + ' 項'));
process.exit(fail === 0 ? 0 : 1);
