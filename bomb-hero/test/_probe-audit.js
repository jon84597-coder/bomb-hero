// test/_probe-audit.js — 全模式煙霧測試（真瀏覽器）
// 目的：把每一種模式都真的開一場、跑幾秒，然後抓 console / window error。
// 用法：node test/_probe-audit.js [--keep]
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');

const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 3111;
const URL = 'http://127.0.0.1:' + PORT + '/index.html';
const OUT = path.join(__dirname, '_audit');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const which = process.argv[2] || 'all';

(async () => {
  const cdp = await launch({ port: 9444, w: 430, h: 900 });
  const p = await cdp.newPage();
  await p.resize(430, 900, true);

  // 在「新文件」階段就掛收集器 → 載入期的錯誤也抓得到
  await p.send('Page.addScriptToEvaluateOnNewDocument', {
    source: [
      '(function(){',
      '  window.__PROBE = { errs: [], warns: [] };',
      '  window.addEventListener("error", function (e) {',
      '    window.__PROBE.errs.push({ t: "error", m: String(e.message || ""), s: String((e.error && e.error.stack) || "").split("\\n").slice(0,3).join(" | ").slice(0,400), at: (location.pathname.split("/").pop() || "") + ":" + e.lineno });',
      '  }, true);',
      '  window.addEventListener("unhandledrejection", function (e) {',
      '    var r = e.reason; window.__PROBE.errs.push({ t: "reject", m: String((r && r.message) || r).slice(0,300), s: String((r && r.stack) || "").split("\\n").slice(0,3).join(" | ").slice(0,400) });',
      '  });',
      '  var ce = console.error; console.error = function () {',
      '    try { window.__PROBE.errs.push({ t: "console", m: Array.prototype.map.call(arguments, function (a) { return (a && a.message) || String(a); }).join(" ").slice(0,400) }); } catch (x) {}',
      '    return ce.apply(console, arguments);',
      '  };',
      '  var cw = console.warn; console.warn = function () {',
      '    try { window.__PROBE.warns.push(Array.prototype.map.call(arguments, function (a) { return (a && a.message) || String(a); }).join(" ").slice(0,240)); } catch (x) {}',
      '    return cw.apply(console, arguments);',
      '  };',
      '})();'
    ].join('\n')
  });

  await p.goto(URL, 2200);
  // 關掉轉屏提示與遮罩
  await p.eval(`(function(){
    try { localStorage.setItem('bombhero-rotskip','1'); } catch(e){}
    var r = document.getElementById('rotHint'); if (r && r.parentNode) r.parentNode.removeChild(r);
    try { if (window.__BH && __BH.Social && __BH.Social.close) __BH.Social.close(); } catch(e){}
    try { if (window.__BH && __BH.ovHide) __BH.ovHide(); } catch(e){}
  })()`);

  const report = [];
  function add(sec, ok, note) {
    report.push({ sec, ok, note });
    console.log((ok ? '  ✓ ' : '  ✗ ') + sec + (note ? '  — ' + note : ''));
  }

  async function errs() {
    return await p.eval('JSON.stringify((window.__PROBE && window.__PROBE.errs) || [])').then(JSON.parse);
  }
  async function clearErrs() {
    await p.eval('(function(){ if(window.__PROBE) window.__PROBE.errs.length=0; })()');
  }
  async function shot(name) {
    const f = path.join(OUT, name + '.png');
    try { await p.shot(f); } catch (e) {}
    return f;
  }

  // ---- ① 載入期 ----
  let bootErrs = await errs();
  let bhbErrs = await p.eval('JSON.stringify((window.__BHB && window.__BHB.errs) || [])').then(JSON.parse);
  add('載入無錯誤', bootErrs.length === 0 && bhbErrs.length === 0,
    bootErrs.length ? JSON.stringify(bootErrs[0]).slice(0, 200) : (bhbErrs.length ? JSON.stringify(bhbErrs[0]).slice(0, 200) : ''));

  const ver = await p.eval('window.__BH && __BH.VERSION');
  add('主程式載入（VERSION=' + ver + '）', !!ver);

  const api = await p.eval(`JSON.stringify({
    solo: typeof (window.__BH&&__BH.startSolo), rpg: typeof (window.__BH&&__BH.RPG),
    br: typeof (window.__BH&&__BH.startBR), shop: typeof (window.__BH&&__BH.Shop),
    season: typeof (window.__BH&&__BH.Season), ach: typeof (window.__BH&&__BH.AchUI),
    gift: typeof (window.__BH&&__BH.GiftUI), onb: typeof window.BHOnboard
  })`).then(JSON.parse);
  add('關鍵模組都在', api.br === 'function' && api.shop === 'object' && api.season === 'object', JSON.stringify(api));

  // ---- ② 單人闖關 ----
  await clearErrs();
  await p.eval(`(function(){ try { __BH.settings.mapMode='classic'; __BH.startSolo(1); } catch(e){ window.__PROBE.errs.push({t:'call',m:String(e.message)}); } })()`);
  await sleep(2600);
  let e1 = await errs();
  const st1 = await p.eval(`JSON.stringify({ mode: __BH.Game.mode, paused: !!__BH.Game.paused, foes: (__BH.Game.foes||[]).length, T: __BH.Game.T })`).then(JSON.parse);
  add('單人第 1 關可玩', st1.mode === 'solo' && st1.T > 0 && e1.length === 0, JSON.stringify(st1) + (e1.length ? ' err=' + JSON.stringify(e1[0]).slice(0, 180) : ''));
  await shot('01-solo');

  // ---- ③ 凍結偵測：連續 90 幀的時間戳有沒有前進 ----
  const frames = await p.eval(`(function(){
    return new Promise(function (res) {
      var n = 0, t0 = performance.now(), last = 0, gaps = [];
      function tick(ts) {
        if (last) gaps.push(+(ts - last).toFixed(1));
        last = ts; n++;
        if (n >= 90) return res(JSON.stringify({ n: n, ms: +(performance.now()-t0).toFixed(0), gaps: gaps }));
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  })()`).then(JSON.parse);
  const avgGap = frames.gaps.reduce((a, b) => a + b, 0) / Math.max(1, frames.gaps.length);
  const worst = Math.max.apply(null, frames.gaps);
  add('單人幀率健康（平均 ' + avgGap.toFixed(1) + 'ms，最差 ' + worst.toFixed(1) + 'ms）', avgGap < 30, '90 幀共 ' + frames.ms + 'ms');

  // ---- ④ BOSS 決戰場 ----
  await clearErrs();
  await p.eval(`(function(){ try { __BH.startSolo(5); } catch(e){ window.__PROBE.errs.push({t:'call',m:String(e.message)}); } })()`);
  await sleep(2600);
  let e2 = await errs();
  const st2 = await p.eval(`JSON.stringify({ arena: !!(__BH.Game.bossArena), boss: !!(__BH.Game.bossArena && __BH.Game.bossArena.boss), shield: __BH.Game.bossArena && __BH.Game.bossArena.shield })`).then(JSON.parse);
  add('BOSS 決戰場（第 5 關）', st2.arena && st2.boss && e2.length === 0, JSON.stringify(st2) + (e2.length ? ' err=' + JSON.stringify(e2[0]).slice(0, 180) : ''));
  await shot('02-boss');

  // ---- ⑤ 大逃殺 ----
  await clearErrs();
  await p.eval(`(function(){ try { __BH.startBR(); } catch(e){ window.__PROBE.errs.push({t:'call',m:String(e.message) + ' | ' + (e.stack||'').split('\\n')[1]}); } })()`);
  await sleep(3200);
  let e3 = await errs();
  const st3 = await p.eval(`JSON.stringify({ mode: __BH.Game.mode, W: __BH.BR && __BH.BR.W, players: (__BH.Game.players||[]).length, foes: (__BH.Game.foes||[]).length })`).then(JSON.parse);
  add('大逃殺可開局', st3.mode === 'br' && st3.players > 1 && e3.length === 0, JSON.stringify(st3) + (e3.length ? ' err=' + JSON.stringify(e3[0]).slice(0, 200) : ''));
  await shot('03-br');

  // 大逃殺跑 5 秒（AI / 縮圈 / 空投）
  await sleep(5000);
  let e3b = await errs();
  add('大逃殺持續 5 秒無錯', e3b.length === 0, e3b.length ? JSON.stringify(e3b[0]).slice(0, 200) : '');

  // ---- ⑥ RPG ----
  await clearErrs();
  await p.eval(`(function(){ try { __BH.RPG.unlocked = __BH.SOLO_STAGES; __BH.startRpg(1); } catch(e){ window.__PROBE.errs.push({t:'call',m:String(e.message) + ' | ' + (e.stack||'').split('\\n')[1]}); } })()`);
  await sleep(2600);
  let e4 = await errs();
  const st4 = await p.eval(`JSON.stringify({ mode: __BH.Game.mode, rpg: !!__BH.RPG.on })`).then(JSON.parse);
  add('RPG 第 1 關', st4.mode === 'rpg' && e4.length === 0, JSON.stringify(st4) + (e4.length ? ' err=' + JSON.stringify(e4[0]).slice(0, 200) : ''));
  await shot('04-rpg');

  // ---- ⑦ 對戰 ----
  await clearErrs();
  await p.eval(`(function(){ try { __BH.startBattle(); } catch(e){ window.__PROBE.errs.push({t:'call',m:String(e.message)}); } })()`);
  await sleep(2600);
  let e5 = await errs();
  const st5 = await p.eval(`JSON.stringify({ mode: __BH.Game.mode })`).then(JSON.parse);
  add('對戰模式', st5.mode === 'battle' && e5.length === 0, JSON.stringify(st5) + (e5.length ? ' err=' + JSON.stringify(e5[0]).slice(0, 200) : ''));
  await shot('05-battle');

  console.log('\n=== 錯誤總表 ===');
  const all = await errs();
  if (!all.length) console.log('（無）');
  else all.forEach((x, i) => console.log('[' + i + ']', x.t, '|', x.m, '|', x.s || ''));

  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ report, errs: all, ver, api }, null, 2));

  if (process.argv.indexOf('--keep') < 0) cdp.close();
  const bad = report.filter(r => !r.ok);
  console.log('\n' + (bad.length ? '✗ ' + bad.length + ' 項異常' : '✓ 全部 ' + report.length + ' 項通過'));
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error('probe 崩潰', e); process.exit(2); });
