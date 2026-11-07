// test/_probe-robust.js — 存檔損壞 / 極端視窗 / 重複開局的健壯性
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');

const PORT = process.env.PORT || 3111;
const URL = 'http://127.0.0.1:' + PORT + '/index.html';
const OUT = path.join(__dirname, '_audit');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const KEYS = [
  'bombhero-settings', 'bombhero-stage', 'bombhero-coins', 'bombhero-ach',
  'bombhero-daily-v1', 'bombhero-daily-prize', 'bombhero-gift', 'bombhero-rpg',
  'bombhero-season', 'bombhero-shop', 'bombhero-ghost', 'bombhero-br-char',
  'bombhero-titles', 'bombhero-save', 'bombhero-onb-v1', 'bombhero-pad-slots'
];

(async () => {
  const cdp = await launch({ port: 9447, w: 900, h: 430 });
  const p = await cdp.newPage();
  await p.resize(900, 430, true);
  await p.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `(function(){
      window.__PROBE={errs:[]};
      window.addEventListener('error',function(e){window.__PROBE.errs.push({t:'error',m:String(e.message||''),s:String((e.error&&e.error.stack)||'').split('\\n').slice(0,3).join(' | ').slice(0,260)});},true);
      window.addEventListener('unhandledrejection',function(e){var r=e.reason;window.__PROBE.errs.push({t:'reject',m:String((r&&r.message)||r).slice(0,200)});});
    })();`
  });

  const R = [];
  const ok = (s, c, n) => { R.push({ s, c, n }); console.log((c ? '  ✓ ' : '  ✗ ') + s + (n ? '  — ' + n : '')); };
  const errs = async () => JSON.parse(await p.eval('JSON.stringify((window.__PROBE&&__PROBE.errs)||[])'));
  const shot = async n => { try { await p.shot(path.join(OUT, n + '.png')); } catch (e) {} };

  // ---------- ① 正常開一次，取得真實的 key 名稱 ----------
  await p.goto(URL, 2200);
  const realKeys = JSON.parse(await p.eval('JSON.stringify(Object.keys(localStorage))'));
  console.log('   localStorage keys:', realKeys.join(', ').slice(0, 400));

  // ---------- ② 把所有 key 塞成壞 JSON 再重載 ----------
  await p.eval(`(function(keys){
    keys.forEach(function(k){ try { localStorage.setItem(k, '{'); } catch(e){} });
    return true;
  })(${JSON.stringify(realKeys)})`);
  await p.goto(URL, 2800);
  let e1 = await errs();
  const booted = await p.eval(`(function(){ try { return { ver: __BH && __BH.VERSION, home: !!(document.getElementById('scr-home')||document.querySelector('.screen')), shop: typeof (__BH&&__BH.Shop) }; } catch(e){ return { err: String(e.message) }; } })()`);
  ok('存檔全毀仍能開機', !!(booted && booted.ver), JSON.stringify(booted));
  ok('存檔全毀沒有拋錯', e1.length === 0, e1.length ? JSON.stringify(e1[0]).slice(0, 260) : '');
  // 能不能真的開一場
  await p.eval(`(function(){ try{ __BH.settings.mapMode='classic'; __BH.startSolo(1);}catch(e){} })()`);
  await sleep(2600);
  const play1 = await p.eval(`JSON.stringify({ state: __BH.Game.state, en: (__BH.Game.enemies||[]).length })`).then(JSON.parse);
  ok('存檔全毀仍能開關卡', play1.state === 'countdown' || play1.state === 'play', JSON.stringify(play1));
  await shot('r01-bad-save');
  let e2 = await errs();
  if (e2.length) e2.slice(0, 6).forEach((x, i) => console.log('   [' + i + ']', x.t, x.m, x.s || ''));

  // ---------- ③ 極端視窗 ----------
  for (const [w, h, label] of [[320, 568, 'r02-320'], [768, 1024, 'r03-768'], [1280, 720, 'r04-1280'], [1920, 1080, 'r05-1920']]) {
    await p.resize(w, h, w < 900);
    await sleep(700);
    const g = JSON.parse(await p.eval(`(function(){
      var c=document.getElementById('cv'), w2=document.getElementById('stageWrap');
      var a=c.getBoundingClientRect(), b=w2.getBoundingClientRect();
      var de=document.documentElement;
      return JSON.stringify({ cv:[Math.round(a.width),Math.round(a.height)], wrap:[Math.round(b.width),Math.round(b.height)], ovfX: de.scrollWidth>de.clientWidth, ovfY: de.scrollHeight>de.clientHeight, T: __BH.Game.T });
    })()`));
    ok(w + '×' + h + ' 版面不溢出', !g.ovfX && !g.ovfY, JSON.stringify(g));
    await shot(label);
  }

  // ---------- ④ 連續 12 次開局／離開（監聽器與節點） ----------
  await p.resize(900, 430, true);
  await p.send('Performance.enable');
  const metric = async () => {
    const m = await p.send('Performance.getMetrics');
    const g = k => (m.metrics.find(x => x.name === k) || {}).value || 0;
    return { nodes: g('Nodes'), listeners: g('JSEventListeners'), js: Math.round(g('JSHeapUsedSize') / 1048576 * 10) / 10 };
  };
  const m0 = await metric();
  for (let i = 0; i < 12; i++) {
    await p.eval(`(function(){ try{ __BH.startSolo(${(i % 8) + 1}); }catch(e){} })()`);
    await sleep(220);
    await p.eval(`(function(){ try{ __BH.ovHide(); __BH.Screen.show('home'); }catch(e){} })()`);
    await sleep(160);
  }
  const m1 = await metric();
  ok('12 次開局後節點沒膨脹（' + m0.nodes + ' → ' + m1.nodes + '）', m1.nodes - m0.nodes < 600, '');
  ok('12 次開局後監聽器沒膨脹（' + m0.listeners + ' → ' + m1.listeners + '）', m1.listeners - m0.listeners < 300, '');
  ok('12 次開局後記憶體沒失控（' + m0.js + ' → ' + m1.js + ' MB）', m1.js - m0.js < 30, '');

  const all = await errs();
  ok('全程無錯誤', all.length === 0, all.length ? JSON.stringify(all[0]).slice(0, 240) : '');
  if (all.length) all.slice(0, 8).forEach((x, i) => console.log('   [' + i + ']', x.t, x.m, x.s || ''));

  fs.writeFileSync(path.join(OUT, 'report3.json'), JSON.stringify({ R, all, realKeys }, null, 2));
  cdp.close();
  const bad = R.filter(x => !x.c);
  console.log('\n' + (bad.length ? '✗ ' + bad.length + ' 項異常' : '✓ 全部 ' + R.length + ' 項通過'));
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error('崩潰', e); process.exit(2); });
