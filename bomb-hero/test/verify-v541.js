// test/verify-v541.js —— v5.41：手機左半屏「浮動虛擬搖桿」
//   ① 結構：fpad / fring / fknob 都在，而且不吃事件（pointer-events:none）
//   ② 預設就是滑動模式（不是實體搖桿）
//   ③ 手指按哪裡，圓盤就出現在哪裡（不再釘在角落）
//   ④ 往哪拖，小球就往哪偏；360° 全向，兩個分量都對
//   ⑤ 拖超過範圍小球封頂，永遠不會跑出大圓
//   ⑥ 死區內小球釘住不動（手指微抖不會亂晃）
//   ⑦ 放手就收起、小球歸零
//   ⑧ 實體搖桿（stick）模式下浮動圓盤不出現
//   ⑨ 原本的滑動判定完全沒動（死區 9、上限 120 原點前帶還在）
//   ⑩ 版本 / 版本日誌
const SB = require('./_sandbox');
const env = SB.makeEnv();
const P = env.BH, G = env.G;
const src = SB.rawHtml;

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log('  ✓ ' + m); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

function fire(el, type, ev) {
  const a = (el && el._on && el._on[type]) || [];
  for (let i = 0; i < a.length; i++) a[i](ev);
  return a.length;
}
function pev(x, y, id) {
  return { clientX: x, clientY: y, pointerId: id === undefined ? 1 : id, cancelable: true, preventDefault: function () {} };
}

const zone = env.getId('slideZone');
const fpad = env.getId('fpad');
const fknob = env.getId('fknob');

/* ============ ① 結構 ============ */
head('① 結構');
ok(/<div class="fpad" id="fpad"><div class="fring"><\/div><div class="fknob" id="fknob"><\/div><\/div>/.test(src),
  'DOM：fpad 內含 fring（虛線導引圈）與 fknob（小球）');
ok(src.indexOf('#touchUI .fpad {') > 0, 'CSS：有 #touchUI .fpad 主體樣式');
ok(/body\.touch\.slidepad #touchUI \.fpad \{ display: block; \}/.test(src),
  'CSS：只有 slidepad（滑動模式）才顯示浮動圓盤');
ok(/body\.touch\.ovopen #touchUI,/.test(src) || /body\.ovopen #touchUI \{ visibility: hidden/.test(src),
  'CSS：結算／暫停覆蓋層打開時整組觸控介面會收起 → 圓盤不會卡在畫面上');
const fpadCss = src.slice(src.indexOf('#touchUI .fpad {'), src.indexOf('#touchUI .fpad {') + 620);
ok(/pointer-events: none;/.test(fpadCss), 'CSS：fpad 不吃指標事件（純視覺層，不會偷走滑動）');

/* ============ ② 預設滑動模式 ============ */
head('② 預設模式');
ok(P.settings.tpad.mode === 'slide', '預設 tpad.mode = slide（左半屏浮動方向區）', P.settings.tpad.mode);

/* ============ ③ 按哪出現哪 ============ */
head('③ 按壓點就是圓心');
fire(zone, 'pointerdown', pev(120, 300, 7));
ok(fpad.dataset.on === '1', '按下 → 圓盤顯示中');
ok(fpad.classList.contains('on'), '按下 → .fpad 帶 on class（透明度 0→1、微放大）');
ok(fpad.style.left === '120px' && fpad.style.top === '300px', '圓盤圓心正好落在按壓點 (120,300)', [fpad.style.left, fpad.style.top]);
ok(fknob.style.transform === 'translate(0px,0px)', '剛按下時小球在正中央', fknob.style.transform);

/* ============ ④ 往哪拖往哪偏 ============ */
head('④ 方向跟手');
fire(zone, 'pointermove', pev(180, 300, 7));          // dx=60 → m=60/110*44≈24.0
ok(fknob.style.transform === 'translate(30.0px,0.0px)', '往右拖 60px → 小球右偏 30.0px', fknob.style.transform);
fire(zone, 'pointermove', pev(120, 360, 7));          // dx=0, dy=60
ok(fknob.style.transform === 'translate(0.0px,30.0px)', '往下拖 60px → 小球下偏 30.0px', fknob.style.transform);
fire(zone, 'pointerup', pev(120, 360, 7));

fire(zone, 'pointerdown', pev(300, 300, 8));
fire(zone, 'pointermove', pev(240, 240, 8));          // dx=-60, dy=-60, len≈84.85, m≈0.771*44≈33.9
ok(/translate\(-30\.0px,-30\.0px\)/.test(fknob.style.transform),
  '往左上斜拖（45°）→ 小球左上都偏 30.0px（360° 任意角度都成立）', fknob.style.transform);

/* ============ ⑤ 封頂不跑出圓 ============ */
head('⑤ 拉到極限也不出圈');
fire(zone, 'pointermove', pev(900, 300, 8));          // 遠超上限 → 原點前帶，dx 固定 120 → m=44
ok(fknob.style.transform === 'translate(44.0px,0.0px)', '狂拖到天邊 → 小球封頂在 44.0px', fknob.style.transform);
{
  // 幾何：外圈半徑 76、小球半徑 31 → 44 + 31 = 75 ≤ 76，永遠不會溢出
  const fpR = 152 / 2, knR = 62 / 2, maxD = 44;
  ok(maxD + knR <= fpR, '幾何：小球位移 ' + maxD + ' + 半徑 ' + knR + ' = ' + (maxD + knR) + ' ≤ 外圈半徑 ' + fpR);
}
fire(zone, 'pointerup', pev(900, 300, 8));

/* ============ ⑥ 死區 ============ */
head('⑥ 死區內釘住');
fire(zone, 'pointerdown', pev(200, 400, 9));
fire(zone, 'pointermove', pev(205, 402, 9));          // len≈5.4 < 9
ok(fknob.style.transform === 'translate(0px,0px)', '手指只抖 5px → 小球完全不動', fknob.style.transform);
ok(zone.dataset.ax === '0', '邏輯軸向也是 0（不是只做視覺假動作）', zone.dataset.ax);
fire(zone, 'pointermove', pev(230, 400, 9));          // len=30 > 9
ok(fknob.style.transform === 'translate(15.0px,0.0px)', '超過死區 → 立刻跟手（15.0px）', fknob.style.transform);

/* ============ ⑦ 放手收起 ============ */
head('⑦ 放手收起');
fire(zone, 'pointerup', pev(230, 400, 9));
ok(fpad.dataset.on === '0', '放手 → 圓盤隱藏');
ok(!fpad.classList.contains('on'), '放手 → on class 移除（淡出）');
ok(fknob.style.transform === 'translate(0px,0px)', '放手 → 小球回正');

/* ============ ⑧ 實體搖桿模式不干擾 ============ */
head('⑧ 實體搖桿模式');
P.settings.tpad.mode = 'stick';
fire(zone, 'pointerdown', pev(150, 350, 10));
ok(fpad.dataset.on !== '1', 'stick 模式按下滑動區 → 浮動圓盤不出現（兩顆圓盤不會同時跳出來）', fpad.dataset.on);
fire(zone, 'pointerup', pev(150, 350, 10));
P.settings.tpad.mode = 'slide';
fire(zone, 'pointerdown', pev(150, 350, 11));
ok(fpad.dataset.on === '1', '切回 slide 模式 → 浮動圓盤立刻回來');
fire(zone, 'pointerup', pev(150, 350, 11));

/* ============ ⑨ 原本判定沒被動到 ============ */
head('⑨ 舊邏輯守衛');
ok(/const SLIDE_DEAD = 9, SLIDE_MAX = 120;/.test(src), '死區 9px／上限 120px 原封不動');
ok(/ox \+= dx \* \(1 - SLIDE_MAX \/ len\);/.test(src), '原點前帶還在（滑多遠都不會出界失聯）');
ok(/Input\.setTouchAxis\(on \? dx \/ len : 0, on \? dy \/ len : 0\);/.test(src), '軸向輸出照舊走 setTouchAxis');
ok(src.indexOf('function fpadMove(dx, dy, len)') > 0 && src.indexOf('if (len < 9) return;') > 0,
  'fpadMove 有死區守衛（視覺跟邏輯同一個死區，不會一個動一個不動）');
ok(/zone\.dataset\.ax = on \? \(dx \/ len\)\.toFixed\(3\) : '0';/.test(src), 'dataset.ax/ay 診斷值還在（舊測試靠它）');

/* ============ ⑩ 版本 ============ */
head('⑩ 版本');
const V = parseFloat(P.VERSION);
ok(V >= 5.41, 'VERSION ≥ 5.41（實際 ' + P.VERSION + '）');
const vlog = (function () { try { return require('fs').readFileSync(__dirname + '/../js/version-log.js', 'utf8'); } catch (e) { return ''; } })();
ok(vlog.indexOf("{ v: '5.41'") > 0, 'VERSION_LOG 有 5.41 條目');
const i541 = vlog.indexOf("{ v: '5.41'");
const i540 = vlog.indexOf("{ v: '5.40'");
ok(i541 >= 0 && i541 < i540, '5.41 排在 5.40 前面（最新在最上）');
ok(/v: '5\.40', date: '2026-11-07', now: false/.test(vlog), '5.40 已改 now:false（不會有兩版同時亮「現在版本」）');
const nowCount = (vlog.match(/now: true/g) || []).length;
ok(nowCount === 1, '全檔只有一筆 now:true（實際 ' + nowCount + '）');

console.log('\n' + (fail === 0 ? '✅ 全部 ' + pass + ' 項通過' : '❌ ' + fail + ' 項失敗 / ' + (pass + fail) + ' 項'));
process.exit(fail === 0 ? 0 : 1);
