/* v5.63 線上驗收：首屏瘦身、版本紀錄懶載入、起手三選一、復仇值 */
const path = require('path');
const CDP = require('./cdp');
const URL = 'https://bomb-hero-game.onrender.com/';

(async function () {
  const br = await CDP.launch({ port: 9441, w: 900, h: 760 });
  const p = await br.newPage();
  let pass = 0, fail = 0;
  const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };
  const sec = (t) => console.log('\n=== ' + t + ' ===');
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  try {
    await p.goto(URL, 20000);
    await wait(5000);

    sec('① 線上版本與首屏');
    const M = JSON.parse(await p.eval(`(function(){
      var r = performance.getEntriesByType('resource') || [];
      var vlog = 0, js = 0, jsn = 0;
      for (var i=0;i<r.length;i++){
        var u = r[i].name.split('?')[0];
        if (/version-log\\.js/.test(u)) vlog++;
        if (/\\.js$/.test(u)) { jsn++; js += (r[i].transferSize||0); }
      }
      var link = document.querySelector('link[rel="preload"][href*="main.js"]');
      return JSON.stringify({ ver: window.__BH.VERSION, vlog: vlog, jsn: jsn,
        jsKB: Math.round(js/1024), preload: !!link });
    })()`) || '{}');
    ok(parseFloat(M.ver) >= 5.63, '線上版本 ≥ 5.63（實際 ' + M.ver + '）');
    ok(M.vlog === 0, '首屏沒有下載 version-log.js（' + M.vlog + ' 次）');
    ok(M.preload === true, 'preload 標籤在線上生效');
    ok((M.jsn | 0) === 9, '首屏只有 9 支 js（少了版本紀錄，實際 ' + M.jsn + '）');

    sec('② 點開版本紀錄才載入');
    const V = JSON.parse(await p.eval(`(async function(){
      try{
        window.__BH.VersionLog.hide();
        await new Promise(function(r){ setTimeout(r, 200); });
        window.__BH.VersionLog.show();
        await new Promise(function(r){ setTimeout(r, 1500); });
        var r2 = performance.getEntriesByType('resource') || [];
        var hit = 0;
        for (var i=0;i<r2.length;i++) if (/version-log\\.js/.test(r2[i].name)) hit++;
        var box = document.getElementById('verLogBody');
        return JSON.stringify({ req: hit, items: box ? box.querySelectorAll('.vlog-item').length : 0 });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok((V.req | 0) >= 1, '點開後才下載（' + V.req + ' 次）');
    ok((V.items | 0) > 5, '面板列出 ' + V.items + ' 筆版本');
    await p.eval(`(function(){ try{ window.__BH.VersionLog.hide(); }catch(e){} })()`);

    sec('③ 起手三選一（線上）');
    const S = JSON.parse(await p.eval(`(async function(){
      try{
        localStorage.removeItem('bombhero-revenge');
        window.__BH.startSolo(1);
        await new Promise(function(r){ setTimeout(r, 900); });
        var b = document.querySelector('#ovBox button');
        if (b) b.click();
        await new Promise(function(r){ setTimeout(r, 700); });
        var bp = document.getElementById('buffPick');
        var title = (document.getElementById('bpTitle') || {}).textContent || '';
        var cards = document.querySelectorAll('#bpRow .bpcard').length;
        return JSON.stringify({ on: !!(bp && bp.classList.contains('on')), title: title, cards: cards,
          bodyOv: document.body.classList.contains('ovopen') });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(S.on === true, '線上點「出發」後彈出起手三選一');
    ok((S.cards | 0) === 3, '正好三張（' + S.cards + '）');
    ok(/起手/.test(S.title || ''), '標題是「起手強化」（' + S.title + '）');
    ok(S.bodyOv === true, '遮罩狀態留著（觸控介面不會冒出來）');

    sec('④ 選完進倒數');
    const S2 = JSON.parse(await p.eval(`(async function(){
      try{
        var c = document.querySelector('#bpRow .bpcard');
        var nm = c ? c.textContent.slice(0, 10) : '';
        if (c) c.click();
        await new Promise(function(r){ setTimeout(r, 600); });
        var g = window.__BH.Game, pl = g.players[0];
        var bp = document.getElementById('buffPick');
        return JSON.stringify({ state: g.state, closed: !(bp && bp.classList.contains('on')),
          bombs: pl ? pl.maxBombs : -1, nm: nm });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(S2.closed === true, '選完面板關閉');
    ok(S2.state === 'countdown', '進入倒數（state=' + S2.state + '）');

    sec('⑤ 復仇值兌現（線上）');
    const R = JSON.parse(await p.eval(`(async function(){
      try{
        localStorage.setItem('bombhero-revenge', '2');
        window.__BH.startSolo(1);
        await new Promise(function(r){ setTimeout(r, 900); });
        var pl = window.__BH.Game.players[0];
        var ov = (document.getElementById('ovBox') || {}).textContent || '';
        var left = parseInt(localStorage.getItem('bombhero-revenge') || '0', 10);
        return JSON.stringify({ bombs: pl ? pl.maxBombs : -1, left: left,
          hasRev: /復仇/.test(ov) });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok((R.bombs | 0) >= 2, '開場多帶炸彈（實測 ' + R.bombs + '，基準 1）');
    ok((R.left | 0) === 0, '兌現後歸零（' + R.left + '）');
    ok(R.hasRev === true, '開場卡有顯示復仇加成');

    sec('⑥ 例外');
    const E = await p.eval(`JSON.stringify(window.__errs || [])`);
    let e = [];
    try { e = JSON.parse(E || '[]'); } catch (x) {}
    ok(e.length === 0, '沒有未捕捉例外（' + e.length + ' 筆）');

    await p.shot(path.join(__dirname, '_audit', 'v563-live-pick.png'));
  } catch (e) {
    console.log('ERR', e && e.message);
    fail++;
  } finally {
    try { await br.close(); } catch (e) {}
  }
  console.log('\n' + (fail === 0 ? '✅' : '❌') + ' 線上探針：' + pass + ' 通過 / ' + fail + ' 失敗');
  process.exit(fail === 0 ? 0 : 1);
})();
