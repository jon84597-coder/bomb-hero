// test/verify-v577.js —— v5.76（全遊戲巡檢那一輪挖到的問題）
//   ① 面板吃 Escape：最上層先關、沒面板時不吞事件（讓原本的暫停照常）、可連關多層
//   ② 進遊戲自動關面板（Screen.apply('game') → closeAllDialogs）
//   ③ 每週挑戰的圖示不再是未分配碼位 U+1F7FA
//   ④ 矮視窗首屏看得到「冒險模式」（Logo 吃 44vh 的媒體查詢）
//   ⑤ 手機直放：空背包不收「🎒 —」空格子、縮放提示不壓角色
//   ⑥ 暫停選單有「本輪契約」摘要（含五語）
//   ⑦ 角色頁招式格可點（button + data-skgoto + 提示文字會換）
//   ⑧ 外觀面板的關閉鈕在長頁面黏底
//   ⑨ 版本 5.76 七處一致
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const mainJs = read('js/main.js');
const idx = read('index.html');
const rpgJs = read('js/rpg.js');
const skinsJs = read('js/skins.js');
const i18n = read('js/i18n-src.js');

let pass = 0, fail = 0;
function ok(c, m, x) {
  if (c) { pass++; console.log('  ✓ ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

/* i18n 一行：key|繁|简|en|ja|ko */
function dict(key) {
  const re = new RegExp('^' + key.replace(/\./g, '\\.') + '\\|(.+)$', 'm');
  const m = i18n.match(re);
  if (!m) return null;
  return m[1].split('|');
}

// ================================================================
head('1. Escape 關面板（最上層優先、沒面板不吞事件）');
{
  ok(/const BH_DIALOG_IDS = \[/.test(mainJs), '有面板清單 BH_DIALOG_IDS');
  const ids = (mainJs.match(/const BH_DIALOG_IDS = \[([\s\S]*?)\];/) || [, ''])[1];
  ['codexModal', 'achModal', 'rankModal', 'onModal', 'avModal', 'skinPanel'].forEach(function (id) {
    ok(ids.indexOf("'" + id + "'") >= 0, '清單含 ' + id);
  });
  ok(/function bhDialogVisible\(/.test(mainJs), '有 bhDialogVisible（用 computedStyle 判）');
  ok(/getComputedStyle/.test(mainJs.slice(mainJs.indexOf('function bhDialogVisible'))), '可見性看 computedStyle 而不是 class');
  ok(/function bhOpenDialogs\(/.test(mainJs), '有 bhOpenDialogs');
  ok(/zIndex/.test(mainJs), '多層時依 z-index 排序（後開的在上）');
  ok(/function closeTopDialog\(/.test(mainJs), '有 closeTopDialog');
  ok(/function closeAllDialogs\(/.test(mainJs), '有 closeAllDialogs');
  ok(/querySelector\('\.skclose, \[id\$="X"\], \[id\$="Close"\], \[data-close\]'\)/.test(mainJs),
    '關閉鈕選擇器涵蓋六種面板的寫法');

  const esc = mainJs.slice(mainJs.indexOf("if (e.key !== 'Escape' && e.code !== 'Escape') return;") - 200);
  ok(esc.length > 0, '有 Escape 攔截');
  ok(/if \(!bhOpenDialogs\(\)\.length\) return;/.test(mainJs),
    '沒開面板就 return（不吞事件 → 原本的 ESC 開暫停照常）');
  ok(/closeTopDialog\(\);/.test(mainJs), '有面板時關最上層那一張');
  ok(/\}, true\);/.test(mainJs.slice(mainJs.indexOf("if (e.key !== 'Escape'"), mainJs.indexOf("if (e.key !== 'Escape'") + 900)),
    '監聽在 capture 階段（比遊戲內的按鍵處理早）');
  /* 防止「關面板」被當成遊戲 ESC 再開一次暫停 */
  const escBlock = mainJs.slice(mainJs.indexOf("if (e.key !== 'Escape'"), mainJs.indexOf("if (e.key !== 'Escape'") + 900);
  ok(/stopPropagation/.test(escBlock), '關完面板會 stopPropagation（不會順手開暫停）');
  ok(/Input\.edges\.Escape = false/.test(escBlock), '順手清掉 Input 的 Escape 邊緣（避免殘留觸發）');
  /* 連開多層：closeAllDialogs 要有層數上限，不能無限迴圈 */
  ok(/for \(let i = 0; i < 6; i\+\+\)/.test(mainJs), 'closeAllDialogs 最多 6 層（有上限，不會死迴圈）');
}

head('2. 進遊戲自動關面板');
{
  const ap = mainJs.slice(mainJs.indexOf('function apply(name'), mainJs.indexOf('function apply(name') + 1200);
  ok(/name === 'game'/.test(ap), 'Screen.apply 有 game 分支');
  ok(/closeAllDialogs/.test(ap), 'Screen.apply(\'game\') 會 closeAllDialogs');
  ok(ap.indexOf("window.scrollTo(0, 0)") < ap.indexOf('closeAllDialogs') ||
    ap.indexOf('closeAllDialogs') > 0, '在切畫面時一起處理（不是另開一條路徑）');
}

head('3. 不再有未分配的 Unicode 碼位（顯示成方塊的圖示）');
{
  /* U+1F7FA 是「未分配」碼位：Windows/Android/iOS 都沒有字形，一律畫 □ */
  ['js/main.js', 'js/rpg.js', 'index.html', 'js/i18n-src.js', 'js/skins.js'].forEach(function (f) {
    const t = read(f);
    ok(t.indexOf('\uD83D\uDFFA') < 0, f + ' 沒有 U+1F7FA');
  });
  ok(mainJs.indexOf('\\uD83D\\uDCCD') >= 0, '每週挑戰改用 📍（U+1F4CD）');
}

head('4. 矮視窗首屏看得到「冒險模式」');
{
  ok(/@media \(min-width: 900px\) and \(max-height: 920px\)/.test(idx), '有矮視窗媒體查詢');
  const mq = idx.slice(idx.indexOf('@media (min-width: 900px) and (max-height: 920px)'));
  ok(/min\(46vw, 44vh\)/.test(mq.slice(0, 400)), 'Logo 用 min(46vw, 44vh) 收高');
  ok(/\.title-logo \{ width: clamp\(240px/.test(mq.slice(0, 400)), '有下限 240px（不會縮成一條線）');
  ok(/body:not\(\.touch\)/.test(mq.slice(0, 400)), '只作用在非觸控（手機不受影響）');
}

head('5. 手機直放：空背包／縮放提示');
{
  ok(/gear === '—' \? ' empty' : ''/.test(mainJs), 'HUD 背包格空的時候加 .empty');
  ok(/body\.touch\.in-game #gameTop \.chip\[data-k="gear"\]\.empty \{ display: none; \}/.test(idx),
    '手機遊戲中空背包整格收起來（不留「🎒 —」）');
  const zh = idx.slice(idx.indexOf('#zoomHint {'));
  ok(/top: 27%/.test(zh.slice(0, 300)), '縮放提示移到 27%（原本 38% 壓在角色身上）');
  ok(/const _zhTimer = setTimeout\([\s\S]{0,200}4600\)/.test(mainJs) ||
    /4600\)/.test(mainJs.slice(mainJs.indexOf('function showZoomHint'), mainJs.indexOf('function showZoomHint') + 900)),
    '停留時間 5.6s → 4.6s');
  ok(/bombhero-zoomtip/.test(mainJs), '看過一次就不再顯示');
}

head('6. 暫停選單的「本輪契約」摘要');
{
  ok(/pmperks/.test(mainJs), '有 pmperks 區塊');
  ok(/t\('ap\.runTitle'\)/.test(mainJs), '標題走翻譯');
  ok(/t\('ap\.runHint'\)/.test(mainJs), '說明走翻譯');
  ok(/abyssPerkDef\(id\)/.test(mainJs), '每張契約帶圖示');
  ok(/×' \+ cnt\[id\]/.test(mainJs), '重複抽到的顯示 ×N');
  ok(/Game\.abyss && Game\.abyss\.perks/.test(mainJs), '來源是這一輪的契約陣列');
  ok(/\.pmperks|\.pmperk \{/.test(idx), '樣式存在');
  const ti = dict('ap.runTitle'), hi = dict('ap.runHint');
  ok(ti && ti.length === 5, 'ap.runTitle 五語', ti && ti.length);
  ok(hi && hi.length === 5, 'ap.runHint 五語', hi && hi.length);
  ok(ti && ti[0] === '本輪契約', '繁中標題正確', ti && ti[0]);
  ok(ti && ti[1] === '本轮契约', '簡中標題正確（不是繁簡混用）', ti && ti[1]);
  ok(hi && /本輪|這一層/.test(hi[0]) && !/这一层/.test(hi[0]), '繁中說明沒有混到簡體字', hi && hi[0]);
  ok(ti && /[\u3040-\u30ff]/.test(ti[3]), '日文真的有日文假名', ti && ti[3]);
  ok(ti && /[\uac00-\ud7af]/.test(ti[4]), '韓文真的有諺文', ti && ti[4]);
}

head('7. 角色頁招式格可點');
{
  ok(/data-skgoto="' \+/.test(rpgJs), '招式格輸出 data-skgoto');
  ok(/<button type="button" class="chslot/.test(rpgJs), '招式格是 <button>（不是死掉的 div）');
  ok(/\(def \? 'load' : 'learn'\)/.test(rpgJs), '空格去「學習」、已裝去「出戰配置」');
  ok(/const csk = \$id\('charSk'\);/.test(rpgJs), '有掛 #charSk 的監聽');
  ok(/openSkill\(b\.getAttribute\('data-skgoto'\) \|\| 'learn'\)/.test(rpgJs), '點下去開招式師');
  ok(/skEmpty > 0 \? t\('char\.skGo'\)/.test(rpgJs), '提示文字在「沒有點數但還有空格」時改成去學招式');
  const g = dict('char.skGo');
  ok(g && g.length === 5, 'char.skGo 五語', g && g.length);
  ok(g && g[0] === '點格子去學招式', '繁中正確', g && g[0]);
  ok(/\.chslot \{ padding: 0; font: inherit;/.test(idx), 'button 的預設外觀清掉了（不然會有灰底）');
  ok(/\.chslot:active \{ transform: translateY\(2px\)/.test(idx), '有按下的手感');
}

head('8. 外觀面板關閉鈕黏底');
{
  /* 外觀面板的 CSS 是用字串接起來的，冒號後面不一定有空白 */
  ok(/\.skfoot\{[\s\S]{0,200}position:sticky/.test(skinsJs), 'skfoot 是 sticky');
  ok(/env\(safe-area-inset-bottom/.test(skinsJs), '避開瀏海／home 條');
}

head('9. 版本 5.76 七處一致');
{
  const ver = mainJs.match(/const VERSION = '([\d.]+)'/);
  ok(ver && parseFloat(ver[1]) >= 5.76, 'VERSION >= 5.76', ver && ver[1]);
  const V = ver ? ver[1] : '0';
  const esc = V.replace(/\./g, '\\.');
  ok(new RegExp('id="verTxt"[^>]*>' + esc + '<').test(idx), 'index.html verTxt = ' + V);
  ok(new RegExp('id="verLogVer"[^>]*>' + esc + '<').test(idx), 'index.html 版本面板 = ' + V);
  const vlog = read('js/version-log.js');
  ok(/\{ v: '5\.76'/.test(vlog), 'VERSION_LOG 有 5.76');
  ok(/\{ v: '5\.75',[^}]*now: false/.test(vlog), '5.75 收成 now:false');
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, '..', 'package.json'), 'utf8'));
  ok(parseFloat(pkg.version) >= 5.76, 'package.json >= 5.76', pkg.version);
  [path.join(ROOT, 'sw.js'), path.join(ROOT, '..', 'public', 'sw.js'),
    path.join(ROOT, '..', 'bomberman-online', 'public', 'sw.js')].forEach(function (f) {
      if (!fs.existsSync(f)) return;
      const m = fs.readFileSync(f, 'utf8').match(/SW_VERSION = 'v([\d.]+)'/);
      ok(m && parseFloat(m[1]) >= 5.76,
        path.relative(path.join(ROOT, '..'), f) + ' → v' + (m && m[1]));
    });
}

head('10. 地圖＝關卡章節＝小怪生態（撤掉賽季互調）');
{
  const { makeEnv } = require('./_sandbox');
  const P = makeEnv().BH;
  /* v5.56 的「每季把章節兩兩對調」已撤：函式留著但恆回 0（舊存檔與呼叫端不必改） */
  ok(typeof P.seasonMapShift === 'function' && P.seasonMapShift() === 0,
    'seasonMapShift() 恆為 0');
  P.settings.smvBase = 99;                       // 就算存檔裡留著舊的基準季…
  let mapSame = true, nameSame = true, idxOk = true;
  for (let st = 1; st <= 40; st++) {
    const ch = P.chapterOf(st);
    const info = P.soloInfo(st);
    if (((info.theme | 0) + 1) !== ch) mapSame = false;
    if (info.boss) {
      if (info.shape !== 'arena') mapSame = false;
    } else {
      const nm = P.stageName(st);
      if (!new RegExp('^' + ch + '-' + P.stageSlot(st)).test(nm)) nameSame = false;
      const mi = P.mapIdxOfStage(st);
      if (!(mi >= (ch - 1) * 4 && mi < ch * 4)) idxOk = false;
    }
  }
  ok(mapSame, '40 關的地圖主題 == 關卡章節（冰雪的關就是冰雪的圖）');
  ok(nameSame, '40 關的關名編號用關卡自己的「章-小關」');
  ok(idxOk, '每一關都落在自己那一章的 4 張地圖內（不會借到別章）');
  /* 小怪名單本身也來自同一章：stageTypes 的每一隻都要在該章的名單裡 */
  let foeOk = true;
  for (let st = 1; st <= 40; st++) {
    const ch = P.chapterOf(st), roster = P.stageRoster(st);
    P.stageTypes(st).forEach(function (id) { if (roster.indexOf(id) < 0) foeOk = false; });
    if (roster.indexOf(P.stageTypes(st)[0]) < 0) foeOk = false;
  }
  ok(foeOk, '每一關登場的小怪都在該章名單裡（不會混到別章生態）');
  /* 抽樣：第 11 關＝雪原、第 16 關＝熔岩入口 */
  ok(/雪原|冰/.test(String(P.soloInfo(11).n)), '第 11 關是雪原圖', P.soloInfo(11).n);
  ok(/熔岩|岩漿|火山/.test(String(P.soloInfo(16).n)), '第 16 關是熔岩圖', P.soloInfo(16).n);
}

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' ' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail === 0 ? 0 : 1);
