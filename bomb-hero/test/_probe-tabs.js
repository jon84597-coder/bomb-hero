// 量測三個面板（成就／排名／線上玩家）的頁籤列在手機上的實際位置與可視狀況
//   node test/_probe-tabs.js [before|after]
const { launch, sleep } = require('./cdp');
const path = require('path');
const fs = require('fs');

const TAG = process.argv[2] || 'before';
const OUT = path.join(__dirname, '_tabs');
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

const probe = (mid, tid, bid) => `
(function(){
  var pn = document.querySelector('#` + mid + ` .bhpanel');
  var tb = document.getElementById('` + tid + `');
  var bd = document.getElementById('` + bid + `');
  if (!pn || !tb) return null;
  var pr = pn.getBoundingClientRect(), tr = tb.getBoundingClientRect(), br = bd.getBoundingClientRect();
  var chips = tb.children, first = chips[0] && chips[0].getBoundingClientRect();
  var lastR = 0, rows = 0, prevTop = -999, maxR = 0;
  for (var i = 0; i < chips.length; i++) {
    var cr = chips[i].getBoundingClientRect();
    lastR = Math.max(lastR, cr.right);
    maxR = Math.max(maxR, cr.bottom);
    if (Math.abs(cr.top - prevTop) > 4) { rows++; prevTop = cr.top; }
  }
  return {
    n: chips.length, rows: rows,
    panelH: Math.round(pr.height),
    tabTop: Math.round(tr.top - pr.top),
    tabBottom: Math.round(pr.bottom - tr.bottom),
    tabH: Math.round(tr.height),
    chipH: Math.round(first ? first.height : 0),
    chipW: Math.round(first ? first.width : 0),
    hidden: Math.round(Math.max(0, lastR - pr.right)),
    below: Math.round(Math.max(0, maxR - pr.bottom)),
    bodyTop: Math.round(br.top - pr.top),
    bodyH: Math.round(br.height),
    order: getComputedStyle(tb).order
  };
})()`;

(async () => {
  const b = await launch({ port: 9821, w: 430, h: 932 });
  const p = await b.newPage();
  await p.resize(430, 932, true);
  await p.goto('file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/'), 5000);
  for (let i = 0; i < 60; i++) {
    if (await p.eval('!!(window.__BH && window.__BH.Game)')) break;
    await sleep(250);
  }
  await sleep(800);

  const rows = [['ach', 'AchUI', 'achModal', 'achTabs', 'achBody'],
                ['rk', 'RankUI', 'rankModal', 'rkTabs', 'rkBody'],
                ['on', 'Social', 'onModal', 'onTabs', 'onBody']];
  console.log(TAG);
  for (const [k, fn, mid, tid, bid] of rows) {
    await p.eval(`(function(){ try{ document.querySelectorAll('.bhmodal').forEach(function(m){m.classList.remove('on');}); window.${fn}.open(); return 1; }catch(e){ return 'ERR ' + e.message; } })()`);
    await sleep(700);
    const o = await p.eval(probe(mid, tid, bid));
    if (o) {
      console.log(' ' + k + '  ' + o.n + ' 項／' + o.rows + ' 列  列高 ' + o.tabH +
        ' (chip ' + o.chipW + 'x' + o.chipH + ')  距頂 ' + o.tabTop + '  距底 ' + o.tabBottom +
        '  溢出右 ' + o.hidden + '  溢出底 ' + o.below + '  order=' + o.order +
        '  內文高 ' + o.bodyH);
    }
    await p.shot(path.join(OUT, TAG + '-' + k + '.png'));
  }
  b.close();
})();
