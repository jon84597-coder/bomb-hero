// test/_probe-audit2.js — 橫向實機佈局 + 長時間穩定性
// 重點：真正玩起來的畫面（關掉開場卡）、HUD 是否擠壓、記憶體與 DOM 有沒有膨脹。
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');

const PORT = process.env.PORT || 3111;
const URL = 'http://127.0.0.1:' + PORT + '/index.html';
const OUT = path.join(__dirname, '_audit');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const cdp = await launch({ port: 9445, w: 900, h: 430 });
  const p = await cdp.newPage();
  await p.resize(900, 430, true);
  await p.send('Page.addScriptToEvaluateOnNewDocument', {
    source: [
      '(function(){',
      '  window.__PROBE = { errs: [] };',
      '  window.addEventListener("error", function (e) { window.__PROBE.errs.push({t:"error",m:String(e.message||""),s:String((e.error&&e.error.stack)||"").split("\\n").slice(0,3).join(" | ").slice(0,300)}); }, true);',
      '  window.addEventListener("unhandledrejection", function (e) { var r=e.reason; window.__PROBE.errs.push({t:"reject",m:String((r&&r.message)||r).slice(0,240),s:String((r&&r.stack)||"").split("\\n").slice(0,3).join(" | ").slice(0,300)}); });',
      '  var ce=console.error; console.error=function(){ try{ window.__PROBE.errs.push({t:"console",m:Array.prototype.map.call(arguments,function(a){return (a&&a.message)||String(a);}).join(" ").slice(0,300)}); }catch(x){} return ce.apply(console,arguments); };',
      '})();'
    ].join('\n')
  });
  await p.goto(URL, 2200);
  await p.eval(`(function(){
    try { localStorage.setItem('bombhero-rotskip','1'); } catch(e){}
    var r = document.getElementById('rotHint'); if (r && r.parentNode) r.parentNode.removeChild(r);
    try { if (__BH.Social && __BH.Social.close) __BH.Social.close(); } catch(e){}
    try { if (__BH.ovHide) __BH.ovHide(); } catch(e){}
    __BH.settings.mapMode = 'classic';
  })()`);

  const R = [];
  const ok = (s, c, n) => { R.push({ s, c, n }); console.log((c ? '  ✓ ' : '  ✗ ') + s + (n ? '  — ' + n : '')); };
  const errs = async () => JSON.parse(await p.eval('JSON.stringify((window.__PROBE&&window.__PROBE.errs)||[])'));
  const clr = async () => { await p.eval('(function(){ if(window.__PROBE) __PROBE.errs.length=0; })()'); };
  const shot = async n => { try { await p.shot(path.join(OUT, n + '.png')); } catch (e) {} };
  const heap = async () => {
    try {
      const m = await p.send('Performance.getMetrics');
      const g = k => (m.metrics.find(x => x.name === k) || {}).value || 0;
      return { js: Math.round(g('JSHeapUsedSize') / 1048576 * 10) / 10, nodes: g('Nodes'), listeners: g('JSEventListeners') };
    } catch (e) { return { js: -1, nodes: -1, listeners: -1 }; }
  };
  await p.send('Performance.enable');

  // ---------- ① 單人：真玩起來 ----------
  await clr();
  await p.eval(`(function(){ __BH.startSolo(3); })()`);
  await sleep(900);
  // 按掉開場卡（真的按按鈕，順便驗事件綁定）
  const clicked = await p.eval(`(function(){
    var b = document.querySelector('#ovBox button'); if (!b) return false; b.click(); return true;
  })()`);
  await sleep(3600);
  ok('單人：開場卡的「出發」按鈕可點', clicked === true);
  const s1 = JSON.parse(await p.eval(`JSON.stringify({ mode:__BH.Game.mode, T:__BH.Game.T, en:(__BH.Game.enemies||[]).length, running: !!__BH.Game.running, paused: !!__BH.Game.paused })`));
  ok('單人：開局後場上有怪', s1.en > 0, JSON.stringify(s1));
  await shot('l01-solo');

  // canvas 是否填滿、比例正確
  const geo = JSON.parse(await p.eval(`(function(){
    var w = document.getElementById('stageWrap'), c = document.getElementById('cv');
    var a = w.getBoundingClientRect(), b = c.getBoundingClientRect();
    return JSON.stringify({ wrap:[Math.round(a.width),Math.round(a.height)], cv:[Math.round(b.width),Math.round(b.height)],
      dpr: window.devicePixelRatio, cw: c.width, ch: c.height });
  })()`));
  ok('畫布尺寸與容器一致', Math.abs(geo.wrap[0] - geo.cv[0]) <= 2 && Math.abs(geo.wrap[1] - geo.cv[1]) <= 2, JSON.stringify(geo));

  // ---------- ② 記憶體基線 ----------
  const h0 = await heap();
  ok('取得記憶體指標', h0.js >= 0, JSON.stringify(h0));

  // ---------- ③ 大逃殺長跑（縮圈／空投／核彈都可能觸發） ----------
  await clr();
  await p.eval(`(function(){ __BH.startBR(); })()`);
  await sleep(900);
  await p.eval(`(function(){ var b=document.querySelector('#ovBox button'); if(b) b.click(); })()`);
  await sleep(1000);
  let h1 = await heap();
  console.log('    BR 起始:', JSON.stringify(h1));
  // 加速時間：把 Game.time 推快，讓縮圈／核彈有機會真的跑到
  for (let i = 0; i < 6; i++) {
    await sleep(4000);
    const st = JSON.parse(await p.eval(`JSON.stringify({
      alive: (__BH.Game.players||[]).filter(function(p){return p&&p.alive!==false;}).length,
      zone: __BH.Game.brZone ? (__BH.Game.brZone.mode||'?') : '?',
      r: __BH.Game.brZone ? Math.round(__BH.Game.brZone.r||0) : -1,
      nukes: (__BH.Game.brNukes||[]).length,
      drops: (__BH.Game.drops||[]).length,
      t: Math.round(__BH.Game.brT||0)
    })`));
    console.log('    [' + (i + 1) + '] ' + JSON.stringify(st));
  }
  let h2 = await heap();
  const e2 = await errs();
  console.log('    BR 結束:', JSON.stringify(h2));
  ok('大逃殺跑 25 秒無錯誤', e2.length === 0, e2.length ? JSON.stringify(e2[0]).slice(0, 200) : '');
  ok('大逃殺記憶體沒有失控（+' + (h2.js - h1.js).toFixed(1) + ' MB）', h2.js - h1.js < 40, JSON.stringify(h1) + ' → ' + JSON.stringify(h2));
  ok('大逃殺 DOM 節點沒有暴增（+' + (h2.nodes - h1.nodes) + '）', h2.nodes - h1.nodes < 400, '');
  await shot('l02-br');

  // ---------- ④ 回主選單再進關卡（重複 3 次看有沒有累積） ----------
  for (let i = 0; i < 3; i++) {
    await p.eval(`(function(){ try{ __BH.Screen.show('home'); __BH.ovHide(); }catch(e){} })()`);
    await sleep(300);
    await p.eval(`(function(){ __BH.startSolo(2); })()`);
    await sleep(500);
    await p.eval(`(function(){ var b=document.querySelector('#ovBox button'); if(b) b.click(); })()`);
    await sleep(700);
  }
  const h3 = await heap();
  ok('三輪進出關卡沒有明顯累積（' + h1.js.toFixed(1) + ' → ' + h3.js.toFixed(1) + ' MB）', h3.js - h1.js < 30, JSON.stringify(h3));
  ok('事件監聽器沒暴增（' + h1.listeners + ' → ' + h3.listeners + '）', h3.listeners - h1.listeners < 260, '');
  await shot('l03-solo2');

  const all = await errs();
  ok('全程無 console 錯誤', all.length === 0, all.length ? JSON.stringify(all[0]).slice(0, 240) : '');
  if (all.length) all.forEach((x, i) => console.log('   [' + i + ']', x.t, x.m, x.s || ''));

  fs.writeFileSync(path.join(OUT, 'report2.json'), JSON.stringify({ R, all, h0, h1, h2, h3, geo }, null, 2));
  cdp.close();
  const bad = R.filter(x => !x.c);
  console.log('\n' + (bad.length ? '✗ ' + bad.length + ' 項異常' : '✓ 全部 ' + R.length + ' 項通過'));
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error('崩潰', e); process.exit(2); });
