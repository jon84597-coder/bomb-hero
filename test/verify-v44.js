// 無頭測試 v44（v3.9）：手機觸控按鈕改成「真實美術圖 ＋ 精美圓框」
//   - 放炸彈 💥  → 黑亮圓球炸彈（引線點燃）
//   - 遙控引爆 🧨 → 同顆炸彈插青色 LED 面板（引線只剩餘燼）
//   - 恐龍吐火 🔥 → 四層水滴火舌
//   三顆鈕外面都要有同心金屬圓框（盤面／金屬環／深色外圈／細白線／玻璃反光）
const { makeEnv, html } = require('./_sandbox');

const P = makeEnv().BH;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function cnt(s, re) { const m = s.match(re); return m ? m.length : 0; }
function cssSeg(startRe) {
  const m = html.match(startRe);
  if (!m) return '';
  return html.slice(m.index, m.index + 2600);
}

console.log('\n=== 0. 版本 ===');
ok(P.VERSION === '4.0', '版本 = 4.0');
ok(/const VERSION = '4\.0';/.test(html), '版本常數是 4.0');

console.log('\n=== 1. HTML：三顆鈕換成內嵌小畫布 ===');
ok(/<div class="tbtn tact"[^>]*><canvas class="ticon" data-icon="bomb"><\/canvas><\/div>/.test(html),
  '放炸彈鈕內是 bomb 畫布');
ok(/<div class="tbtn tdet"[^>]*><canvas class="ticon" data-icon="remote"><\/canvas><\/div>/.test(html),
  '遙控引爆鈕內是 remote 畫布');
ok(/<div class="tbtn tfire hide"[^>]*><canvas class="ticon" data-icon="flame"><\/canvas><\/div>/.test(html),
  '恐龍吐火鈕內是 flame 畫布');
ok(html.indexOf('data-t="action">\u{1F4A5}') < 0 &&
   html.indexOf('data-t="det" title="\u9065\u63A7\u5F15\u7206">\u{1F9E8}') < 0 &&
   html.indexOf('data-t="fire" title="\u6050\u9F8D\u5410\u706B">\u{1F525}') < 0,
  '三個舊的表情符號按鈕內容都換掉了');
// 暫停／全視窗兩顆小鈕維持原樣（使用者沒要求改）
ok(/<div class="tbtn tpause" data-t="pause">/.test(html), '暫停鈕維持原樣');
ok(/<div class="tbtn tfs" data-t="full">/.test(html), '全視窗鈕維持原樣');

console.log('\n=== 2. CSS：精美圓框 ===');
const btnCss = cssSeg(/#touchUI \.tbtn \{/);
ok(btnCss.length > 0, '找得到 #touchUI .tbtn 樣式區塊');
ok(/--tb-face/.test(btnCss) && /--tb-ring/.test(btnCss), '圓框用盤面／金屬環兩個變數分層');
ok(/radial-gradient\(circle at 50% 50%,/.test(btnCss), '圓框本體是同心圓漸層（圓形，不是方形）');
ok(/0 0 0 1\.5px rgba\(255,255,255,\.36\)/.test(btnCss), '外緣有一圈細白線');
ok(/0 0 0 4\.5px var\(--tb-edge\)/.test(btnCss), '外面還有一圈金屬厚邊');
ok(/inset 0 -8px 16px rgba\(0,0,0,\.46\)/.test(btnCss) && /inset 0 6px 12px rgba\(255,255,255,\.16\)/.test(btnCss),
  '內凹立體感（下暗上亮）');
ok(/#touchUI \.tbtn::before \{/.test(html) && /inset: 15%/.test(html), '內圈細線 ::before 存在');
ok(/#touchUI \.tbtn::after \{/.test(html) && /filter: blur\(1\.5px\)/.test(html), '上緣玻璃反光 ::after 存在');
ok(html.indexOf('backdrop-filter: blur(2px);\r\n  }\r\n  #touchUI .tbtn.on') < 0, '舊的單調半透明底色已換掉');
ok(/#touchUI \.ticon \{/.test(html) && /pointer-events: none/.test(html),
  '圖示畫布填滿鈕面且不吃掉觸控事件');
// 三顆鈕各自的主色（橘／青／紅）
ok(/--tb-edge: rgba\(190,104,42/.test(html), '放炸彈鈕是橘銅色框');
ok(/--tb-edge: rgba\(56,150,178/.test(html), '遙控引爆鈕是青色框');
ok(/--tb-edge: rgba\(186,66,34/.test(html), '吐火鈕是火紅色框');

console.log('\n=== 3. JS：paintTouchIcons ===');
ok(typeof P.paintTouchIcons === 'function', '__BH 導出 paintTouchIcons');
ok(typeof P.TICON_BASE === 'object' && P.TICON_BASE.bomb === 92 &&
   P.TICON_BASE.remote === 62 && P.TICON_BASE.flame === 62,
  'TICON_BASE 尺寸正確（放彈 92／遙控 62／吐火 62）');
let threw = null;
try { P.paintTouchIcons(0); } catch (e) { threw = e; }
ok(threw === null, 'paintTouchIcons(0) 在無頭環境也不會炸（' + (threw ? threw.message : 'OK') + '）');
ok(/const TICON_BASE = \{ bomb: 92, remote: 62, flame: 62 \};/.test(html), 'TICON_BASE 常數存在');
ok(/let iconT = 0;/.test(html) && /Game\.gameT = iconT;/.test(html),
  '圖示有自己的時鐘（選單裡火苗也會抖）');
ok(/finally \{ Game\.gameT = saved; \}/.test(html), '畫完一定把 gameT 還回去（不污染遊戲時間）');
ok(/drawBombOn\(g, r, it\.kind === 'bomb' \? 3 : 7/.test(html), '炸彈圖示走 drawBombOn（跟場上同一套畫法）');
ok(/drawFlameOn\(g, \{ cx: 0, cy: 0, t: \.30, dir: null, owner: 0 \}, T\)/.test(html),
  '火焰圖示走 drawFlameOn（四層水滴火舌）');
ok(/it\.kind === 'bomb', it\.kind === 'remote'/.test(html),
  'armed / remote 參數正確（放彈鈕已點燃、遙控鈕插 LED）');

console.log('\n=== 4. 接線：改設定會重畫、遊戲中會動 ===');
ok(/try \{ paintTouchIcons\(0\); \} catch \(e\) \{\}/.test(html), 'applyTouchLayout 結尾會立刻重畫圖示');
ok(/Game\._iconT = \(Game\._iconT \|\| 0\) \+ dt;/.test(html) &&
   /if \(Game\._iconT >= \.05\) \{ paintTouchIcons\(Game\._iconT\); Game\._iconT = 0; \}/.test(html),
  '主循環以 20fps 更新圖示');
ok(/document\.body\.classList\.contains\('touch'\)/.test(html), '只在「手機觸控」模式才畫（電腦不浪費效能）');

console.log('\n=== 5. 舊版殘留檢查 ===');
ok(html.indexOf('font-size: 30px;\r\n    background: rgba(255,138,61,.35)') < 0, '放彈鈕舊的純色底已移除');
ok(cnt(html, /--tb-face: rgba/g) >= 4, '四種盤面色（預設＋三顆鈕）都在');

console.log('\n[v44] ' + pass + ' 通過、' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
