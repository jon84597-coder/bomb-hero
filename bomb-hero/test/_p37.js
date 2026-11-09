// test/_p37.js —— v5.60 線上驗收：門檻 3／6／9 ＋ 自訂顏色在真主機上活著
const path = require('path');
const CDP = require('./cdp');

const URL = 'https://bomb-hero-game.onrender.com/';
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } }

const HOOK = 'window.__errs=[];' +
  'window.addEventListener("error",function(e){window.__errs.push(String(e&&e.message||e))});' +
  'window.addEventListener("unhandledrejection",function(e){window.__errs.push("rej:"+String(e&&e.reason))});';

(async function () {
  const br = await CDP.launch({ port: 9342, w: 900, h: 780 });
  const p = await br.newPage();
  try {
    await p.send('Page.addScriptToEvaluateOnNewDocument', { source: HOOK });
    await p.goto(URL, 9000);
    await new Promise(function (r) { setTimeout(r, 4000); });

    console.log('\n=== ① 版本與模組 ===');
    const M = JSON.parse(await p.eval(`JSON.stringify({
      ver: (window.__BH && window.__BH.VERSION) || '',
      sk: !!(window.__BHSkins && window.__BHSkins.applyCustom),
      gates: (window.__BHUnlock && window.__BHUnlock.GATES || []).map(function(g){return g.need;}),
      sw: (function(){ try { return window.__SWVER || ''; } catch(e){ return ''; } })()
    })`) || '{}');
    ok(M.ver === '5.60', '線上版本 5.60（實際 ' + M.ver + '）');
    ok(M.sk === true, 'skins 模組載入且導出 applyCustom');
    ok(JSON.stringify(M.gates) === '[3,6,9]', '門檻 3／6／9（實際 ' + JSON.stringify(M.gates) + '）');

    console.log('\n=== ② 面板與色票 ===');
    const PN = JSON.parse(await p.eval(`(function(){
      try{
        window.__BHSkins.open(true);
        var root = document.getElementById('skinPanel');
        return JSON.stringify({
          on: root.classList.contains('on'),
          sw: root.querySelectorAll('.skcud').length,
          input: !!root.querySelector('.skcuin'),
          title: (root.querySelector('.skcush b')||{}).textContent || ''
        });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(PN.on === true, '外觀面板打得開');
    ok(PN.sw === 51, '色票 51 格（實際 ' + PN.sw + '）');
    ok(PN.input === true, '有系統取色盤');
    ok(/自訂顏色/.test(PN.title || ''), '標題正確（' + PN.title + '）');

    console.log('\n=== ③ 點色票 → 立刻換色 ===');
    const AP = JSON.parse(await p.eval(`(function(){
      try{
        var root = document.getElementById('skinPanel');
        var sw = root.querySelectorAll('.skcud');
        sw[7].click();
        var st = window.__BHSkins.state();
        var c = window.__BHSKIN.cache;
        return JSON.stringify({
          eq: st.eq.flame, hex: st.custom.flame,
          pal: (c.flame||[]).length, mid: (c.flame||[])[3] || ''
        });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(AP.eq === 'custom', '爆風切成自訂');
    ok(AP.pal === 5, '五段色停（' + AP.pal + '）');
    ok(/^rgba\(\d+,\d+,\d+,/.test(AP.mid || ''), '中間段是選的顏色（' + AP.mid + '）');

    console.log('\n=== ④ 光環與炸彈 ===');
    const A2 = JSON.parse(await p.eval(`(function(){
      try{
        var root = document.getElementById('skinPanel');
        var tabs = root.querySelectorAll('.sktab'), i;
        for (i=0;i<tabs.length;i++) if (tabs[i].getAttribute('data-slot')==='aura') tabs[i].click();
        root = document.getElementById('skinPanel');
        root.querySelectorAll('.skcud')[20].click();
        var aura = window.__BHSKIN.cache.aura;
        tabs = root.querySelectorAll('.sktab');
        for (i=0;i<tabs.length;i++) if (tabs[i].getAttribute('data-slot')==='bomb') tabs[i].click();
        root = document.getElementById('skinPanel');
        root.querySelectorAll('.skcud')[33].click();
        return JSON.stringify({ aura: aura, bomb: window.__BHSKIN.cache.bomb,
          stops: (window.__BHSKIN.cache.bombStops||[]).length });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(/^#[0-9a-f]{6}$/.test(A2.aura || ''), '光環換色（' + A2.aura + '）');
    ok(/^#[0-9a-f]{6}$/.test(A2.bomb || ''), '炸彈換色（' + A2.bomb + '）');
    ok(A2.stops === 4, '炸彈四段漸層（' + A2.stops + '）');

    console.log('\n=== ⑤ 重開還在 ===');
    const RE = JSON.parse(await p.eval(`(function(){
      try{
        window.__BHSkins.open(false);
        window.__BHSkins.open(true);
        var root = document.getElementById('skinPanel');
        var tabs = root.querySelectorAll('.sktab');
        for (var i=0;i<tabs.length;i++) if (tabs[i].getAttribute('data-slot')==='flame') tabs[i].click();
        root = document.getElementById('skinPanel');
        var st = window.__BHSkins.state();
        return JSON.stringify({ eq: st.eq, hex: st.custom.flame,
          onMarks: root.querySelectorAll('.skcud.on').length,
          foot: (root.querySelector('.skcufoot')||{}).textContent || '' });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(RE.eq && RE.eq.flame === 'custom', '關掉再開仍是自訂');
    ok(RE.onMarks === 1, '色票標在選中的那格（' + RE.onMarks + '）');
    ok(/使用中/.test(RE.foot || ''), '底部有「使用中」（' + String(RE.foot).trim().slice(0, 22) + '）');

    console.log('\n=== ⑥ 取消 → 回預設 ===');
    const CL = JSON.parse(await p.eval(`(function(){
      try{
        var root = document.getElementById('skinPanel');
        var b = root.querySelector('[data-custclear]');
        if (b) b.click();
        return JSON.stringify({ eq: window.__BHSkins.state().eq.flame,
          kept: window.__BHSkins.state().custom.flame });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(CL.eq === 'flame.orange', '回到預設爆風（' + CL.eq + '）');
    ok(!!CL.kept, '自訂色碼仍留著（' + CL.kept + '）');
    await p.eval("window.__BHSkins.open(false)");

    console.log('\n=== ⑦ 主控台錯誤 ===');
    const errs = JSON.parse(await p.eval('JSON.stringify(window.__errs||[])') || '[]');
    ok(errs.length === 0, '沒有未捕捉的例外（' + errs.length + ' 筆）');
    if (errs.length) errs.slice(0, 3).forEach(function (e) { console.log('     · ' + String(e).slice(0, 150)); });

    try { await p.shot(path.join(__dirname, '_audit', 'v560-live-color.png')); } catch (e) {}
  } catch (e) {
    fail++; console.log('  ✗ 中斷：' + (e && e.message));
  } finally {
    try { await br.close(); } catch (e) {}
  }
  console.log('\n' + (fail ? '❌' : '✅') + ' 線上：' + pass + ' 通過 / ' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
})();
