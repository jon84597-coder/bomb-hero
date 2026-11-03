// 檢查「說明頁最下方 → 地圖測試關」的入口真的能點（不是只有 DOM）
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

let pass = 0, fail = 0;
function ok(c, n, extra) {
  if (c) { pass++; console.log('  ✓ ' + n); }
  else { fail++; console.log('  ✗ FAIL: ' + n + (extra ? ' :: ' + extra : '')); }
}

(async () => {
  const b = await launch({ port: 9621, w: 1280, h: 800 });
  const p = await b.newPage();
  await p.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await p.goto(URL + '?go=help', 3000);

  const dom = JSON.parse(await p.eval([
    '(function(){',
    '  var row=document.getElementById("mapTestRow");',
    '  var sp=row?row.querySelectorAll("span"):[];',
    '  return JSON.stringify({ n:sp.length, texts:Array.prototype.map.call(sp,function(s){return s.textContent;}),',
    '    visible:!!(row&&row.offsetHeight>0), screen: document.getElementById("scr-help").classList.contains("on") });',
    '})()'
  ].join('\n')));
  console.log('入口：' + JSON.stringify(dom));
  ok(dom.visible, '說明頁看得到測試入口');
  ok(dom.n === 5, '5 個關卡按鈕（實測 ' + dom.n + '）');
  ok(dom.texts[0] && dom.texts[0].indexOf('100') >= 0, '第一顆寫著 100 格');

  // 點第 3 顆（T3）
  const box = JSON.parse(await p.eval([
    '(function(){',
    '  var s=document.querySelectorAll("#mapTestRow span")[2];',
    '  var r=s.getBoundingClientRect();',
    '  return JSON.stringify({x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2)});',
    '})()'
  ].join('\n')));
  await p.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await p.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await sleep(2200);

  const st = JSON.parse(await p.eval([
    '(function(){var B=window.__BH,G=B.Game;',
    ' return JSON.stringify({screen:document.querySelector(".screen.on")?document.querySelector(".screen.on").id:null,',
    '  cols:G.cols, rows:G.rows, mt:G.mapTest?G.mapTest.n:null, state:G.state});})()'
  ].join('\n')));
  console.log('點擊後：' + JSON.stringify(st));
  ok(st.mt === 3, '點第 3 顆真的開 T3（mapTest=' + st.mt + '）');
  ok(st.cols === 23 && st.rows === 21, 'T3 尺寸 23×21（' + st.cols + '×' + st.rows + '）');
  ok(st.screen === 'scr-game', '切到遊戲畫面');

  await b.close();
  console.log('\nv4.51 入口：' + pass + ' 通過 / ' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
