// test/_v484-dom.js —— v4.84 下滑提示的實機行為（真 DOM，CDP）
//   ① 橫屏首頁第一屏就要出現、2.2 秒後淡化
//   ② 滑到底自動消失、滑回頂端重新亮起
//   ③ 點膠囊會往下翻一屏
//   ④ 各選項頁按需出現（有得滑才出現）
//   ⑤ 遊戲中／桌機不出現
//   ⑥ 換語言文字跟著換
const { launch, sleep } = require('./cdp');
const path = require('path');
const F = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ FAIL: ' + m); } }
function head(t) { console.log('\n=== ' + t + ' ==='); }

async function open(w, h, touch) {
  const b = await launch({ w, h });
  const p = await b.newPage();
  await p.send('Runtime.enable');
  await p.goto(F, 2400);
  for (let i = 0; i < 40; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(200); }
  if (touch) await p.eval("document.body.classList.add('touch');1");
  await sleep(300);
  await p.eval("try{window.ScrollHint&&window.ScrollHint.sync();}catch(e){}1");
  await sleep(400);
  return { b, p };
}
const cls = p => p.eval("document.getElementById('scrollHint').className");
const opa = p => p.eval("getComputedStyle(document.getElementById('scrollHint')).opacity");

(async () => {
  head('① 橫屏首頁');
  let { b, p } = await open(844, 390, true);
  ok((await cls(p)).indexOf('on') >= 0, '第一屏就出現（class = ' + (await cls(p)) + '）');
  ok((await opa(p)) === '1', 'opacity 1（現在 fadeIn 結束了）');
  const menuY = await p.eval("Math.round(document.getElementById('homeMenu').getBoundingClientRect().y)");
  ok(menuY + 54 <= 390, '新手教學條完全落在第一屏內（menu.y=' + menuY + ' + 54 <= 390）');
  const learnBox = await p.eval(`(function(){var b=document.getElementById('btnLearn').getBoundingClientRect();
    return JSON.stringify({w:Math.round(b.width),h:Math.round(b.height)});})()`);
  const lb = JSON.parse(learnBox);
  ok(lb.h <= 64, '新手教學條是橫條不是方塊（高 ' + lb.h + 'px）');
  ok(lb.w > 600, '新手教學條吃滿整列（寬 ' + lb.w + 'px）');

  head('② 2.2 秒後淡化');
  await sleep(2400);
  ok((await cls(p)).indexOf('dim') >= 0, '自動加上 dim');
  const dimBox = JSON.parse(await p.eval(`(function(){var e=document.getElementById('scrollHint');
    var b=e.getBoundingClientRect();var t=document.querySelector('#scrollHint .sh-t');
    return JSON.stringify({w:Math.round(b.width),h:Math.round(b.height),
      txt:getComputedStyle(t).display, pe:getComputedStyle(e).pointerEvents,
      op:getComputedStyle(e).opacity});})()`));
  ok(dimBox.w <= 40 && dimBox.h <= 40, '收成小圓點（' + dimBox.w + '×' + dimBox.h + 'px，不再壓住卡片文字）');
  ok(dimBox.txt === 'none', '文字收起（只留箭頭）');
  ok(dimBox.pe === 'none', '收起來後不攔截點擊');
  ok(parseFloat(dimBox.op) > 0.6, '仍看得見（opacity ' + dimBox.op + '）');

  head('③ 滑到底 → 消失；滑回頂端 → 重新亮起');
  await p.eval("window.scrollTo(0, 99999);1");
  await sleep(500);
  ok(await cls(p) === '', '滑到底自動消失');
  await p.eval("window.scrollTo(0, 0);1");
  await sleep(500);
  const back = await cls(p);
  ok(back.indexOf('on') >= 0, '滑回頂端重新出現');
  ok(back.indexOf('dim') < 0, '重新出現是完整亮度（沒有 dim）');

  head('④ 點膠囊會往下翻');
  await sleep(2600);            // 等它變 dim… 但 dim 後不可點 → 先滑回頂端重新亮
  await p.eval("window.scrollTo(0, 0);1"); await sleep(400);
  const y0 = await p.eval('Math.round(window.pageYOffset)');
  await p.eval("document.getElementById('scrollHint').click();1");
  await sleep(900);
  const y1 = await p.eval('Math.round(window.pageYOffset)');
  ok(y1 > y0 + 100, '點一下往下翻（' + y0 + ' → ' + y1 + '）');
  try { await b.close(); } catch (e) {}

  head('⑤ 各選項頁（有得滑才出現）');
  const pages = ['settings', 'help', 'solo', 'daily', 'shop'];
  for (const nm of pages) {
    ({ b, p } = await open(844, 390, true));
    await p.eval(`__BH.Screen.show(${JSON.stringify(nm)});1`);
    await sleep(800);
    const c = await cls(p);
    const info = JSON.parse(await p.eval(`(function(){
      var w=document.querySelector('.wrap');
      var on=c=document.getElementById('scrollHint').className;
      return JSON.stringify({hint:on, docGap:document.documentElement.scrollHeight-window.innerHeight,
        wrapGap:w.scrollHeight-w.clientHeight});
    })()`));
    const needScroll = info.docGap > 16 || info.wrapGap > 16;
    ok((c === 'on') === needScroll,
      nm + '：需要滑=' + needScroll + ' / 提示=' + (c || 'off') + '（docGap ' + info.docGap + ' / wrapGap ' + info.wrapGap + '）');
    try { await b.close(); } catch (e) {}
  }

  head('⑥ 遊戲中不出現');
  ({ b, p } = await open(844, 390, true));
  await p.eval("__BH.Screen.show('game');1");
  await sleep(800);
  ok(await cls(p) === '', '遊戲畫面沒有膠囊');
  try { await b.close(); } catch (e) {}

  head('⑦ 豎屏首頁（一屏放得下 → 不出現）');
  ({ b, p } = await open(390, 844, true));
  const gapP = await p.eval('document.documentElement.scrollHeight - window.innerHeight');
  ok((await cls(p) === '') === (gapP <= 16), '豎屏 docGap=' + gapP + ' → 提示 ' + ((await cls(p)) || 'off'));
  try { await b.close(); } catch (e) {}

  head('⑧ 換語言');
  ({ b, p } = await open(844, 390, true));
  await p.eval("try{__BH.setLang&&__BH.setLang('ja');}catch(e){}1");
  await sleep(600);
  const ja = await p.eval("document.getElementById('scrollHintTxt').textContent");
  ok(/スクロール/.test(ja), '日文文案（' + ja + '）');
  await p.eval("try{__BH.setLang&&__BH.setLang('en');}catch(e){}1");
  await sleep(500);
  const en = await p.eval("document.getElementById('scrollHintTxt').textContent");
  ok(/Scroll down/i.test(en), '英文文案（' + en + '）');
  try { await b.close(); } catch (e) {}

  console.log('\n========================================');
  console.log('v4.84 DOM 行為：' + pass + ' 通過 / ' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
