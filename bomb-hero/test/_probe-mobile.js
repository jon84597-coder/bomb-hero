// test/_probe-mobile.js — 真正的「手機」路徑（觸控模擬 + Android UA）
// 之前所有探針都沒開 setTouchEmulationEnabled → IS_TOUCH=false，跑的是桌面版。
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');

const PORT = process.env.PORT || 3111;
const URL = 'http://127.0.0.1:' + PORT + '/index.html';
const OUT = path.join(__dirname, '_audit');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

(async () => {
  const cdp = await launch({ port: 9449, w: 900, h: 430 });
  const p = await cdp.newPage();

  // 真正的觸控模擬
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
  await p.send('Emulation.setUserAgentOverride', { userAgent: UA, platform: 'Android' });
  await p.resize(900, 430, true);

  await p.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `(function(){
      window.__PROBE={errs:[]};
      window.addEventListener('error',function(e){window.__PROBE.errs.push({t:'error',m:String(e.message||''),s:String((e.error&&e.error.stack)||'').split('\\n').slice(0,3).join(' | ').slice(0,240)});},true);
      window.addEventListener('unhandledrejection',function(e){var r=e.reason;window.__PROBE.errs.push({t:'reject',m:String((r&&r.message)||r).slice(0,200)});});
    })();`
  });

  await p.goto(URL, 2600);
  await p.eval(`(function(){
    try{ localStorage.setItem('bombhero-rotskip','1'); }catch(e){}
    var r=document.getElementById('rotHint'); if(r&&r.parentNode) r.parentNode.removeChild(r);
    __BH.settings.mapMode='classic';
  })()`);
  await sleep(400);

  const R = [];
  const ok = (s, c, n) => { R.push({ s, c, n }); console.log((c ? '  ✓ ' : '  ✗ ') + s + (n ? '  — ' + n : '')); };
  const shot = async n => { try { await p.shot(path.join(OUT, n + '.png')); } catch (e) {} };
  const errs = async () => JSON.parse(await p.eval('JSON.stringify((window.__PROBE&&__PROBE.errs)||[])'));

  const t = await p.eval(`JSON.stringify({
    touch: document.body.classList.contains('touch'),
    coarse: matchMedia('(pointer: coarse)').matches,
    nohover: matchMedia('(hover: none)').matches,
    mtp: navigator.maxTouchPoints
  })`);
  ok('觸控模擬生效', JSON.parse(t).touch === true, t);

  await shot('m00-home');

  // 首頁各分頁
  const screens = await p.eval(`JSON.stringify((function(){
    var ids = []; document.querySelectorAll('.screen').forEach(function(s){ ids.push(s.id); }); return ids;
  })())`).then(JSON.parse);
  console.log('   screens:', screens.join(','));

  // ---------- 單人開場卡（手機）----------
  await p.eval(`__BH.startSolo(3)`);
  await sleep(1200);
  // 量測：出發鈕是否在可視範圍內
  const cta = JSON.parse(await p.eval(`(function(){
    var b = document.querySelector('#ovBox button');
    if (!b) return JSON.stringify({ none: true });
    var r = b.getBoundingClientRect(), box = document.getElementById('ovBox').getBoundingClientRect();
    var inEl = document.getElementById('ovIn').getBoundingClientRect();
    return JSON.stringify({ btn:[Math.round(r.top),Math.round(r.bottom)], box:[Math.round(box.top),Math.round(box.bottom)], win:[innerWidth,innerHeight],
      visible: r.top >= 0 && r.bottom <= innerHeight, clipped: box.bottom > inEl.bottom + 1 });
  })()`));
  ok('手機開場卡：出發鈕看得到（' + JSON.stringify(cta.btn) + '）', cta.visible === true, JSON.stringify(cta));
  await shot('m01-solo-intro');

  // 按鈕可點
  await p.eval(`(function(){var b=document.querySelector('#ovBox button'); if(b) b.click();})()`);
  await sleep(3800);
  await shot('m02-solo-play');
  const g = JSON.parse(await p.eval(`JSON.stringify({ T:__BH.Game.T, cols:__BH.Game.cols, rows:__BH.Game.rows, state:__BH.Game.state,
     board:[__BH.Game.T*__BH.Game.cols, __BH.Game.T*__BH.Game.rows], cv:[document.getElementById('cv').clientWidth, document.getElementById('cv').clientHeight],
     touchUI: !!document.querySelector('#touchUI'), tuVisible: (function(){ var e=document.querySelector('#touchUI'); if(!e) return false; var s=getComputedStyle(e); return s.display!=='none' && s.visibility!=='hidden'; })() })`));
  ok('手機單人：進入 play 且有觸控介面', g.state === 'play' && g.touchUI, JSON.stringify(g));
  ok('手機單人：地圖整張或接近整張看得到', g.board[0] <= g.cv[0] + 4, 'board ' + g.board[0] + ' vs cv ' + g.cv[0]);

  // ---------- 大逃殺（手機）----------
  await p.eval(`(function(){ try{ __BH.Screen.show('home'); __BH.ovHide(); }catch(e){} })()`);
  await sleep(300);
  await p.eval(`__BH.startBR()`);
  await sleep(1400);
  const cta2 = JSON.parse(await p.eval(`(function(){
    var b = document.querySelector('#ovBox button');
    if (!b) return JSON.stringify({ none: true });
    var r = b.getBoundingClientRect();
    return JSON.stringify({ btn:[Math.round(r.top),Math.round(r.bottom)], visible: r.top >= 0 && r.bottom <= innerHeight });
  })()`));
  ok('手機大逃殺：出發鈕看得到', cta2.visible === true, JSON.stringify(cta2));
  await shot('m03-br-intro');
  await p.eval(`(function(){var b=document.querySelector('#ovBox button'); if(b) b.click();})()`);
  await sleep(4200);
  await shot('m04-br-play');

  const errs1 = await errs();
  ok('手機流程無錯誤', errs1.length === 0, errs1.length ? JSON.stringify(errs1[0]).slice(0, 240) : '');

  fs.writeFileSync(path.join(OUT, 'report-mobile.json'), JSON.stringify({ R, cta, cta2, g, errs: errs1 }, null, 2));
  cdp.close();
  const bad = R.filter(x => !x.c);
  console.log('\n' + (bad.length ? '✗ ' + bad.length + ' 項異常' : '✓ 全部 ' + R.length + ' 項通過'));
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error('崩潰', e); process.exit(2); });
