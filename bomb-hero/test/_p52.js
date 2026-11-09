// test/_p52.js —— v5.71 真瀏覽器探針（線上 Render）：首頁招呼語 ＋ 暱稱定案 ＋ 我的資料改名
//   驗：① 沒定案 → 首頁仍是輸入框（沒有招呼語）
//       ② 定案 → 輸入框收起、招呼語出現、暱稱是金色漸層字、版面不壓到下方按鈕
//       ③ 直放／橫放都放得下
//       ④ 我的資料 → 更改暱稱 → 花 5,000 金幣改名 → 首頁招呼語同步
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, '_v564');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

let pass = 0, fail = 0;
function ok(c, m, extra) {
  if (c) { pass++; console.log('  ✓ ' + m); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
const wait = ms => new Promise(r => setTimeout(r, ms));

const MEASURE = `(function(){
  function R(e){ if(!e) return null; var b=e.getBoundingClientRect();
    return { x:Math.round(b.x), y:Math.round(b.y), w:Math.round(b.width), h:Math.round(b.height),
             r:Math.round(b.right), b:Math.round(b.bottom) }; }
  var P = window.__BH;
  var wrap = document.getElementById('nickWrap');
  var box  = document.getElementById('greetLine');
  var inp  = document.getElementById('playerName');
  var gname = box ? box.querySelector('.gname') : null;
  var cs = gname ? getComputedStyle(gname) : null;
  var menu = document.querySelector('#scr-title .menu');
  var csInp = inp ? getComputedStyle(inp) : null;
  var csBox = box ? getComputedStyle(box) : null;
  return {
    ver: P.VERSION,
    lock: wrap ? wrap.classList.contains('lock') : null,
    greet: box ? R(box) : null,
    greetTxt: box ? box.textContent : '',
    inp: inp ? R(inp) : null,
    inpDisp: csInp ? csInp.display : '',
    boxDisp: csBox ? csBox.display : '',
    name: gname ? gname.textContent : '',
    gsize: cs ? Math.round(parseFloat(cs.fontSize)) : 0,
    gfill: cs ? (cs.webkitTextFillColor || cs.color) : '',
    gbg: cs ? String(cs.backgroundImage).slice(0, 40) : '',
    hasEdit: !!(box && box.querySelector('.gedit')),
    menu: menu ? R(menu) : null,
    vw: window.innerWidth, vh: window.innerHeight,
    nm: P.settings.playerName, nameLock: P.settings.nameLock, nameAuto: P.settings.nameAuto,
    gold: (function(){ try { return P.Shop.gold(); } catch(e){ return -1; } })()
  };
})()`;

(async () => {
  const b = await launch({ w: 430, h: 932, port: 9471 });
  const p = await b.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });

  const URL = 'https://bomb-hero-game.onrender.com/?unlock=all';
  async function boot(name, lock, auto) {
    await p.goto(URL, 2500);
    for (var i = 0; i < 30; i++) { if (await p.eval('!!window.__BH')) break; await wait(500); }
    await p.eval(`(function(){
      try{
        localStorage.setItem('bombhero-rotskip','1');
        localStorage.setItem('bombhero-zoomtip','1');
        var st = JSON.parse(localStorage.getItem('bombhero-settings-v1') || '{}');
        st.playerName = ${JSON.stringify(name)};
        st.nameLock = ${lock ? 1 : 0};
        st.nameAuto = ${auto ? 1 : 0};
        localStorage.setItem('bombhero-settings-v1', JSON.stringify(st));
      }catch(e){}
    })()`);
    await p.goto(URL, 2500);
    for (var j = 0; j < 30; j++) { if (await p.eval('!!window.__BH')) break; await wait(500); }
    await p.eval("try{document.getElementById('rotHint')&&document.getElementById('rotHint').remove();}catch(e){}");
    await wait(700);
  }

  /* ① 還沒定案 */
  await p.resize(430, 932, true);
  await boot('', 0, 0);
  let m = await p.eval(MEASURE);
  console.log('\n--- ① 全新玩家 430x932 ---');
  console.log('  ' + JSON.stringify({ lock: m.lock, lock2: m.nameLock, inpDisp: m.inpDisp, boxDisp: m.boxDisp }));
  ok(m.lock === false, '沒有 .lock（首頁仍是輸入框）');
  ok(m.inpDisp !== 'none' && m.boxDisp === 'none', '輸入框看得見、招呼語收起來', [m.inpDisp, m.boxDisp]);
  ok(m.greetTxt.trim() === '', '招呼語是空的');

  /* ② 已定案（直放） */
  await boot('小明', 1, 0);
  m = await p.eval(MEASURE);
  console.log('\n--- ② 已定案 430x932 ---');
  console.log('  ' + JSON.stringify({ lock: m.lock, greet: m.greet, inpDisp: m.inpDisp, boxDisp: m.boxDisp, name: m.name, gsize: m.gsize, gfill: m.gfill, menu: m.menu }));
  ok(m.ver === '5.71', '線上版本 5.71', m.ver);
  ok(m.lock === true, '有 .lock（切換成招呼語）');
  ok(m.inpDisp === 'none' && m.boxDisp === 'flex', '輸入框收起、招呼語顯示', [m.inpDisp, m.boxDisp]);
  ok(m.greet && m.greet.w > 120, '招呼語有寬度（不是 0）', m.greet);
  ok(m.greetTxt.indexOf('小明') >= 0, '招呼語裡有暱稱', m.greetTxt);
  ok(m.name === '小明', '.gname 包住的正是暱稱', m.name);
  ok(/gradient/.test(m.gbg) && /rgba\(0, 0, 0, 0\)/.test(m.gfill), '暱稱是漸層字（透明填色＋漸層背景）', [m.gfill, m.gbg]);
  ok(m.gsize >= m.gsize && m.gsize >= 14, '暱稱字級比內文大（' + m.gsize + 'px）');
  ok(m.hasEdit, '右邊有 ✏️');
  ok(m.greet.x >= 0 && m.greet.r <= m.vw, '招呼語在畫面內（' + m.greet.x + '..' + m.greet.r + ' / ' + m.vw + '）');
  ok(!m.menu || m.greet.b <= m.menu.y + 1, '沒有壓到下方按鈕列（' + m.greet.b + ' ≤ ' + (m.menu && m.menu.y) + '）');
  await p.shot(path.join(OUT, 'p52-home-port.png'));

  /* ③ 橫放 */
  await p.resize(844, 390, true);
  await boot('小明', 1, 0);
  m = await p.eval(MEASURE);
  console.log('\n--- ③ 已定案 844x390 ---');
  console.log('  ' + JSON.stringify({ greet: m.greet, menu: m.menu, gsize: m.gsize }));
  ok(m.lock === true && m.boxDisp === 'flex', '橫放同樣顯示招呼語');
  ok(m.greet && m.greet.r <= m.vw && m.greet.x >= 0, '橫放也不超出畫面（' + (m.greet && m.greet.x) + '..' + (m.greet && m.greet.r) + ' / ' + m.vw + '）');
  ok(m.greet && m.greet.w <= 300, '左欄寬度內放得下（w=' + (m.greet && m.greet.w) + '）');
  await p.shot(path.join(OUT, 'p52-home-land.png'));

  /* ④ 我的資料 → 改名 */
  await p.resize(430, 932, true);
  await boot('小明', 1, 0);
  await p.eval("(function(){ try{ window.__BH.setDevBuild(false); window.__BH.Shop.addGold(6000); }catch(e){} })()");
  await p.eval("window.__BH.Social.open('me')");
  await wait(500);
  let s = await p.eval(`(function(){
    var btn = document.getElementById('socNickEdit');
    return { has: !!btn, txt: btn ? btn.textContent : '', gold: window.__BH.Shop.gold() };
  })()`);
  console.log('\n--- ④ 我的資料 ---');
  console.log('  ' + JSON.stringify(s));
  ok(s.has, '我的資料裡有「更改暱稱」');
  ok(/5000|5,000/.test(s.txt), '按鈕寫出 5,000', s.txt);
  ok(s.gold === 6000, '金幣 6,000（開發者版關掉後真的記帳）', s.gold);

  await p.eval("document.getElementById('socNickEdit').click()");
  await wait(400);
  const hasIn = await p.eval("!!document.getElementById('socNickIn')");
  ok(hasIn, '按下去長出輸入框');
  await p.eval(`(function(){ var i=document.getElementById('socNickIn'); i.value='炸彈王'; })()`);
  await p.eval("document.getElementById('socNickOk').click()");
  await wait(600);
  s = await p.eval(`(function(){
    var P = window.__BH;
    return { nm: P.settings.playerName, lock: P.settings.nameLock, gold: P.Shop.gold(),
             greet: document.getElementById('greetLine').textContent,
             toast: (document.getElementById('toast') || {}).textContent || '',
             stillIn: !!document.getElementById('socNickIn') };
  })()`);
  console.log('  ' + JSON.stringify(s));
  ok(s.nm === '炸彈王' && s.lock === 1, '暱稱真的換了', s.nm);
  ok(s.gold === 1000, '扣了 5,000 金幣', s.gold);
  ok(s.greet.indexOf('炸彈王') >= 0, '首頁招呼語同步成新名字', s.greet);
  ok(s.stillIn === false, '改名表單自動收起來');
  ok(/炸彈王/.test(s.toast), '有跳「暱稱換成…」提示', s.toast);
  await p.eval("window.__BH.Social.close()");
  await wait(300);
  await p.shot(path.join(OUT, 'p52-home-renamed.png'));

  /* 金幣不足 */
  await p.eval("(function(){ try{ window.__BH.Shop.addGold(-window.__BH.Shop.gold()); }catch(e){} })()");
  await p.eval("window.__BH.Social.open('me')");
  await wait(300);
  await p.eval("document.getElementById('socNickEdit').click()");
  await wait(250);
  await p.eval("(function(){ var i=document.getElementById('socNickIn'); i.value='窮光蛋'; })()");
  await p.eval("document.getElementById('socNickOk').click()");
  await wait(400);
  s = await p.eval(`(function(){
    return { nm: window.__BH.settings.playerName,
             toast: (document.getElementById('toast') || {}).textContent || '' }; })()`);
  ok(s.nm === '炸彈王', '金幣不足時名字不變', s.nm);
  ok(/金幣不足|不足/.test(s.toast), '有跳金幣不足', s.toast);
  await p.eval("window.__BH.Social.close()");

  console.log('\n' + (fail ? '✗ ' + fail + ' 項失敗（通過 ' + pass + '）' : '✓ 全部通過（' + pass + ' 項）'));
  b.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('PROBE FAIL', e && e.stack || e); process.exit(1); });
