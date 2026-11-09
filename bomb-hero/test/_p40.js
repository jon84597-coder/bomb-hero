/* v5.63 探針：起手三選一／復仇值／首屏不再下載版本紀錄
   全部走真瀏覽器＋真 localStorage，不靠讀原始碼猜行為。 */
const path = require('path');
const CDP = require('./cdp');

(async function () {
  const br = await CDP.launch({ port: 9421, w: 900, h: 760 });
  const p = await br.newPage();
  let pass = 0, fail = 0;
  const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };
  const sec = (t) => console.log('\n=== ' + t + ' ===');
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  try {
    await p.goto('http://localhost:3999/', 6000);
    await wait(2500);

    sec('① 首屏不含版本紀錄');
    const NAV = JSON.parse(await p.eval(`(function(){
      var r = performance.getEntriesByType('resource') || [];
      var hit = 0, pre = 0;
      for (var i=0;i<r.length;i++){
        if (/version-log\\.js/.test(r[i].name)) hit++;
        if (/preload/.test(r[i].initiatorType || '')) pre++;
      }
      var link = document.querySelector('link[rel="preload"][href*="main.js"]');
      return JSON.stringify({ vlog: hit, hasPreload: !!link });
    })()`) || '{}');
    ok(NAV.vlog === 0, '首屏沒有下載 version-log.js（' + NAV.vlog + ' 次）');
    ok(NAV.hasPreload === true, 'index.html 有 preload 主程式');

    sec('② 點開版本紀錄才載入');
    const VL = JSON.parse(await p.eval(`(async function(){
      try{
        window.__BH.VersionLog.show();
        await new Promise(function(r){ setTimeout(r, 900); });
        var r2 = performance.getEntriesByType('resource') || [];
        var hit = 0;
        for (var i=0;i<r2.length;i++) if (/version-log\\.js/.test(r2[i].name)) hit++;
        var box = document.getElementById('verLogBody');
        return JSON.stringify({ req: hit, items: box ? box.querySelectorAll('.vlog-item').length : 0,
          top: (document.getElementById('verLogVer')||{}).textContent });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok((VL.req | 0) >= 1, '點開後才發出 version-log.js 請求（' + VL.req + ' 次）');
    ok((VL.items | 0) > 5, '面板列出 ' + VL.items + ' 筆版本');
    ok(parseFloat(VL.top) >= 5.63, '面板標題版號 = ' + VL.top);
    await p.eval(`(function(){ try{ window.__BH.VersionLog.hide(); }catch(e){} })()`);

    sec('③ 第一關開場 → 起手三選一');
    const S1 = JSON.parse(await p.eval(`(async function(){
      try{
        localStorage.removeItem('bombhero-revenge');
        window.__BH.startSolo(1);
        await new Promise(function(r){ setTimeout(r, 700); });
        var ov = document.getElementById('ovBox');
        var btn = ov && ov.querySelector('button');
        var shown = !!(ov && ov.offsetParent !== null) || !!(ov && ov.textContent.length > 0);
        if (btn) btn.click();
        await new Promise(function(r){ setTimeout(r, 500); });
        var bp = document.getElementById('buffPick');
        var on = !!(bp && bp.classList.contains('on'));
        var cards = document.querySelectorAll('#bpRow .bpcard').length;
        return JSON.stringify({ ovText: (ov && ov.textContent || '').slice(0, 40), shown: shown,
          bpOn: on, cards: cards });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(S1.shown === true, '開場卡有出現');
    ok(S1.bpOn === true, '點「出發」後彈出起手三選一');
    ok((S1.cards | 0) === 3, '正好三張卡（實際 ' + S1.cards + '）');

    sec('④ 選一張 → 生效、面板關閉、進倒數');
    const S2 = JSON.parse(await p.eval(`(async function(){
      try{
        var before = JSON.parse(JSON.stringify(window.__BH.Game.buffs));
        var card = document.querySelector('#bpRow .bpcard');
        var label = card ? card.textContent : '';
        if (card) card.click();
        await new Promise(function(r){ setTimeout(r, 400); });
        var bp = document.getElementById('buffPick');
        var g = window.__BH.Game;
        var pl = g.players && g.players[0];
        return JSON.stringify({
          closed: !(bp && bp.classList.contains('on')),
          state: g.state,
          bombs: pl ? pl.maxBombs : -1,
          fire: pl ? pl.power : -1,
          pick: label.slice(0, 12),
          buffs: JSON.stringify(g.buffs).slice(0, 80)
        });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(S2.closed === true, '選完面板自動關閉');
    ok(S2.state === 'countdown', '進入倒數（state=' + S2.state + '）');
    ok(S2.pick.length > 0, '卡片有名字（' + S2.pick + '）');

    sec('⑤ 死亡 → 復仇值 +1');
    const R1 = JSON.parse(await p.eval(`(async function(){
      try{
        var g = window.__BH.Game, pl = g.players[0];
        pl.lives = 0; pl.dead = true; pl.respawnT = 0.01; g.state = 'play';
        window.__BH.updateSolo(0.05);
        await new Promise(function(r){ setTimeout(r, 400); });
        return JSON.stringify({
          state: g.state,
          rev: parseInt(localStorage.getItem('bombhero-revenge') || '0', 10),
          endText: (document.getElementById('ovBox') || {}).textContent || ''
        });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(R1.state === 'over', '遊戲進入 over（' + R1.state + '）');
    ok((R1.rev | 0) === 1, '復仇值 = 1（實際 ' + R1.rev + '）');
    ok(/復仇/.test(R1.endText || ''), '結算頁有講復仇值（' + String(R1.endText).replace(/\s+/g, ' ').slice(-40) + '）');

    sec('⑥ 再死一次 → 累積到 2，上限 3');
    const R2 = JSON.parse(await p.eval(`(async function(){
      try{
        for (var k = 0; k < 2; k++) {
          window.__BH.startSolo(1);
          await new Promise(function(r){ setTimeout(r, 300); });
          var g = window.__BH.Game, pl = g.players[0];
          pl.lives = 0; pl.dead = true; pl.respawnT = 0.01; g.state = 'play';
          window.__BH.updateSolo(0.05);
          await new Promise(function(r){ setTimeout(r, 200); });
        }
        var a = parseInt(localStorage.getItem('bombhero-revenge') || '0', 10);
        for (var j = 0; j < 3; j++) {
          window.__BH.startSolo(1);
          await new Promise(function(r){ setTimeout(r, 250); });
          var g2 = window.__BH.Game, p2 = g2.players[0];
          p2.lives = 0; p2.dead = true; p2.respawnT = 0.01; g2.state = 'play';
          window.__BH.updateSolo(0.05);
          await new Promise(function(r){ setTimeout(r, 150); });
        }
        var b = parseInt(localStorage.getItem('bombhero-revenge') || '0', 10);
        return JSON.stringify({ after2: a, capped: b });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok((R2.capped | 0) <= 3, '復仇值上限 3（實際 ' + R2.capped + '）');

    sec('⑦ 兌現：開場多帶炸彈、用完歸零');
    const R3 = JSON.parse(await p.eval(`(async function(){
      try{
        localStorage.setItem('bombhero-revenge', '2');
        var base = 0;
        window.__BH.startSolo(1);
        await new Promise(function(r){ setTimeout(r, 600); });
        var pl = window.__BH.Game.players[0];
        var ovText = (document.getElementById('ovBox') || {}).textContent || '';
        var left = parseInt(localStorage.getItem('bombhero-revenge') || '0', 10);
        return JSON.stringify({ bombs: pl.maxBombs, ov: ovText.replace(/\\s+/g,' ').slice(0, 90), left: left });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok((R3.bombs | 0) >= 2, 'maxBombs 含復仇加成（實測 ' + R3.bombs + '，基準 1）');
    ok((R3.left | 0) === 0, '兌現後歸零（實際 ' + R3.left + '）');
    ok(/復仇/.test(R3.ov || ''), '開場卡有顯示復仇（' + R3.ov + '）');

    sec('⑧ 每日挑戰不給復仇、也不彈起手');
    const R4 = JSON.parse(await p.eval(`(async function(){
      try{
        localStorage.setItem('bombhero-revenge', '3');
        var D = window.__BH.Daily;
        var d = { day: D.today(), seed: D.seed(), stage: D.stage() };
        window.__BH.startSolo(d.stage, false, d);
        await new Promise(function(r){ setTimeout(r, 700); });
        var ov = document.getElementById('ovBox');
        var txt = (ov && ov.textContent || '').replace(/\\s+/g,' ');
        var btn = ov && ov.querySelector('button');
        if (btn) btn.click();
        await new Promise(function(r){ setTimeout(r, 400); });
        var bp = document.getElementById('buffPick');
        var pl = window.__BH.Game.players[0];
        return JSON.stringify({ bpOn: !!(bp && bp.classList.contains('on')),
          bombs: pl ? pl.maxBombs : -1,
          revLeft: parseInt(localStorage.getItem('bombhero-revenge')||'0',10),
          hasRev: /復仇/.test(txt) });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(R4.bpOn === false, '每日挑戰不彈起手三選一');
    ok((R4.revLeft | 0) === 3, '每日挑戰不吃復仇值（仍 ' + R4.revLeft + '）');
    ok(R4.hasRev === false, '每日挑戰開場卡不提復仇');

    sec('⑨ 主控台錯誤');
    const ERR = await p.eval(`JSON.stringify(window.__errs || [])`);
    try {
      const e = JSON.parse(ERR || '[]');
      ok(e.length === 0, '沒有未捕捉例外（' + e.length + ' 筆）');
      if (e.length) console.log('    ' + JSON.stringify(e.slice(0, 3)));
    } catch (x) { ok(false, '讀不到錯誤紀錄'); }

    await p.shot(path.join(__dirname, '_audit', 'v563-buffpick.png'));
  } catch (e) {
    console.log('ERR', e && e.message);
    fail++;
  } finally {
    try { await br.close(); } catch (e) {}
  }
  console.log('\n' + (fail === 0 ? '✅' : '❌') + ' 探針：' + pass + ' 通過 / ' + fail + ' 失敗');
  process.exit(fail === 0 ? 0 : 1);
})();
