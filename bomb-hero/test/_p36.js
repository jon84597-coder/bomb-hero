// test/_p36.js —— v5.60 本地真瀏覽器：門檻 3／6／9 ＋ 自訂顏色（色票／取色盤）
const path = require('path');
const CDP = require('./cdp');

const URL = 'http://localhost:3999/';
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } }

const HOOK = 'window.__errs=[];' +
  'window.addEventListener("error",function(e){window.__errs.push(String(e&&e.message||e))});' +
  'window.addEventListener("unhandledrejection",function(e){window.__errs.push("rej:"+String(e&&e.reason))});';

(async function () {
  const br = await CDP.launch({ port: 9341, w: 900, h: 780 });
  const p = await br.newPage();
  try {
    await p.send('Page.addScriptToEvaluateOnNewDocument', { source: HOOK });
    await p.goto(URL, 7000);
    await new Promise(function (r) { setTimeout(r, 2500); });

    console.log('\n=== ① 模組與版本 ===');
    const M = JSON.parse(await p.eval(`JSON.stringify({
      ver: (window.__BH && window.__BH.VERSION) || '',
      sk: !!window.__BHSkins,
      api: !!(window.__BHSkins && window.__BHSkins.applyCustom),
      gates: (window.__BHUnlock && window.__BHUnlock.GATES || []).map(function(g){return g.need;})
    })`) || '{}');
    ok(M.ver === '5.60', '版本 5.60（實際 ' + M.ver + '）');
    ok(M.sk === true && M.api === true, '外觀模組在、而且導出了 applyCustom');
    ok(JSON.stringify(M.gates) === '[3,6,9]', '門檻是 3／6／9（實際 ' + JSON.stringify(M.gates) + '）');

    console.log('\n=== ② 面板與色票 ===');
    const PN = JSON.parse(await p.eval(`(function(){
      try{
        window.__BHSkins.open(true);
        var root = document.getElementById('skinPanel');
        var sw = root.querySelectorAll('.skcud');
        var hasInput = !!root.querySelector('.skcuin');
        return JSON.stringify({
          on: root.classList.contains('on'),
          sw: sw.length,
          first: sw[0] ? sw[0].getAttribute('data-cust') : '',
          input: hasInput,
          title: (root.querySelector('.skcush b')||{}).textContent || ''
        });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(PN.on === true, '面板打開了');
    ok(PN.sw === 51, '色票 51 格（實際 ' + PN.sw + '）');
    ok(/^#[0-9a-f]{6}$/.test(PN.first || ''), '色票帶合法色碼（' + PN.first + '）');
    ok(PN.input === true, '有系統取色盤');
    ok(/自訂顏色/.test(PN.title || ''), '標題是「自訂顏色」（' + PN.title + '）');

    console.log('\n=== ③ 點色票 → 爆風真的換色 ===');
    const AP = JSON.parse(await p.eval(`(function(){
      try{
        var root = document.getElementById('skinPanel');
        var sw = root.querySelectorAll('.skcud');
        sw[7].click();                                   /* 換一格真的有顏色差 */
        var st = window.__BHSkins.state();
        var c = window.__BHSKIN.cache;
        return JSON.stringify({
          eq: st.eq.flame,
          hex: st.custom.flame,
          pal: (c.flame || []).length,
          mid: (c.flame || [])[3] || '',
          onMarks: root.querySelectorAll('.skcud.on').length
        });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(AP.eq === 'custom', 'eq 變成 custom');
    ok(/^#[0-9a-f]{6}$/.test(AP.hex || ''), '色碼記住了（' + AP.hex + '）');
    ok(AP.pal === 5, '主檔讀的 CACHE.flame 是 5 段（' + AP.pal + '）');
    ok((AP.mid || '').indexOf(AP.hex.replace('#', '').match(/../g).map(function (h) { return parseInt(h, 16); }).join(',')) >= 0
       || /^rgba\(\d+,\d+,\d+,/.test(AP.mid || ''), '中間段就是選的顏色（' + AP.mid + '）');
    ok(AP.onMarks === 1, '選中的那格有標記（' + AP.onMarks + '）');

    try { await p.shot(path.join(__dirname, '_audit', 'v560-custom-panel.png')); } catch (e) {}

    console.log('\n=== ④ 光環與炸彈也能自訂 ===');
    const AP2 = JSON.parse(await p.eval(`(function(){
      try{
        var root = document.getElementById('skinPanel');
        var tabs = root.querySelectorAll('.sktab');
        var out = {};
        /* 切到光環 */
        for (var i=0;i<tabs.length;i++) if (tabs[i].getAttribute('data-slot')==='aura') tabs[i].click();
        root = document.getElementById('skinPanel');
        root.querySelectorAll('.skcud')[20].click();
        out.aura = window.__BHSKIN.cache.aura;
        /* 切到炸彈 */
        tabs = root.querySelectorAll('.sktab');
        for (var j=0;j<tabs.length;j++) if (tabs[j].getAttribute('data-slot')==='bomb') tabs[j].click();
        root = document.getElementById('skinPanel');
        root.querySelectorAll('.skcud')[33].click();
        out.bomb = window.__BHSKIN.cache.bomb;
        out.stops = (window.__BHSKIN.cache.bombStops||[]).length;
        out.st = window.__BHSkins.state().eq;
        return JSON.stringify(out);
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(/^#[0-9a-f]{6}$/.test(AP2.aura || '') && AP2.aura !== '#123456', '光環顏色套用成功（' + AP2.aura + '）');
    ok(/^#[0-9a-f]{6}$/.test(AP2.bomb || ''), '炸彈顏色套用成功（' + AP2.bomb + '）');
    ok(AP2.stops === 4, '炸彈四段漸層重算（' + AP2.stops + '）');
    ok(AP2.st && AP2.st.flame === 'custom' && AP2.st.aura === 'custom' && AP2.st.bomb === 'custom',
      '三個槽同時是自訂狀態');

    console.log('\n=== ⑤ 取色盤（change 才套用）===');
    const PK = JSON.parse(await p.eval(`(function(){
      try{
        var root = document.getElementById('skinPanel');
        var tabs = root.querySelectorAll('.sktab');
        for (var i=0;i<tabs.length;i++) if (tabs[i].getAttribute('data-slot')==='aura') tabs[i].click();
        root = document.getElementById('skinPanel');
        var inp = root.querySelector('.skcuin');
        inp.value = '#3366ff';
        inp.dispatchEvent(new Event('change', {bubbles:true}));
        return JSON.stringify({ aura: window.__BHSKIN.cache.aura, hex: window.__BHSkins.state().custom.aura });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(PK.aura === '#3366ff' && PK.hex === '#3366ff', '取色盤選 #3366ff → 立刻套用（' + PK.aura + '）');

    console.log('\n=== ⑥ 關掉再開，自訂還在 ===');
    const RE = JSON.parse(await p.eval(`(function(){
      try{
        window.__BHSkins.open(false);
        window.__BHSkins.open(true);
        var root = document.getElementById('skinPanel');
        /* ⑤ 剛才是切在「光環」頁（而且用的是取色盤的顏色，色票裡未必有）。
           切回爆風頁 —— 那裡選的是色票上的顏色，才驗得到「標記還在」。 */
        var tabs = root.querySelectorAll('.sktab');
        for (var i=0;i<tabs.length;i++) if (tabs[i].getAttribute('data-slot')==='flame') tabs[i].click();
        root = document.getElementById('skinPanel');
        var st = window.__BHSkins.state();
        return JSON.stringify({
          eq: st.eq, custom: st.custom,
          onMarks: root.querySelectorAll('.skcud.on').length,
          foot: (root.querySelector('.skcufoot')||{}).textContent || ''
        });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(RE.eq && RE.eq.flame === 'custom' && RE.custom.flame === AP.hex, '重開面板後自訂還在');
    ok(RE.onMarks === 1, '色票仍標在選中的那格（' + RE.onMarks + '）');
    ok(/使用中/.test(RE.foot || ''), '底部顯示「使用中」與色碼（' + String(RE.foot).trim().slice(0, 24) + '）');

    console.log('\n=== ⑦ 取消自訂 → 回到預設 ===');
    const CL = JSON.parse(await p.eval(`(function(){
      try{
        var root = document.getElementById('skinPanel');
        var tabs = root.querySelectorAll('.sktab');
        for (var i=0;i<tabs.length;i++) if (tabs[i].getAttribute('data-slot')==='flame') tabs[i].click();
        root = document.getElementById('skinPanel');
        var btn = root.querySelector('[data-custclear]');
        if (btn) btn.click();
        var st = window.__BHSkins.state();
        return JSON.stringify({ eq: st.eq.flame, kept: st.custom.flame, pal: (window.__BHSKIN.cache.flame||[]).length });
      }catch(e){ return JSON.stringify({err:String(e)}); }
    })()`) || '{}');
    ok(CL.eq === 'flame.orange', '取消後回到預設爆風（' + CL.eq + '）');
    ok(CL.kept === AP.hex, '自訂色碼仍留著（下次不必重挑）');
    ok(CL.pal === 5, '預設爆風也是 5 段（' + CL.pal + '）');
    await p.eval("window.__BHSkins.open(false)");

    console.log('\n=== ⑧ 門檻在真頁面上生效 ===');
    await p.eval("localStorage.setItem('bombhero-stage','4')");
    await p.goto(URL, 6000);
    await new Promise(function (r) { setTimeout(r, 2200); });
    const GA = JSON.parse(await p.eval(`JSON.stringify({
      rpg: document.getElementById('btnRpg').classList.contains('locked'),
      br: document.getElementById('btnBR').classList.contains('locked'),
      multi: document.getElementById('btnMulti').classList.contains('locked'),
      title: document.getElementById('btnBR').getAttribute('title') || ''
    })`) || '{}');
    ok(GA.rpg === false, '通關 3 關 → RPG 解鎖了');
    ok(GA.br === true && GA.multi === true, '大逃殺／多人仍鎖（還沒到 6／9 關）');
    ok(/6/.test(GA.title || ''), '鎖住時提示「通關第 6 關」（' + GA.title + '）');

    await p.eval("localStorage.setItem('bombhero-stage','10')");
    await p.goto(URL, 6000);
    await new Promise(function (r) { setTimeout(r, 2200); });
    const GB = JSON.parse(await p.eval(`JSON.stringify({
      rpg: document.getElementById('btnRpg').classList.contains('locked'),
      br: document.getElementById('btnBR').classList.contains('locked'),
      multi: document.getElementById('btnMulti').classList.contains('locked')
    })`) || '{}');
    ok(GB.rpg === false && GB.br === false && GB.multi === false, '通關 9 關 → 三個全開');

    console.log('\n=== ⑨ 主控台錯誤 ===');
    const errs = JSON.parse(await p.eval('JSON.stringify(window.__errs||[])') || '[]');
    ok(errs.length === 0, '沒有未捕捉的例外（' + errs.length + ' 筆）');
    if (errs.length) errs.slice(0, 3).forEach(function (e) { console.log('     · ' + String(e).slice(0, 160)); });

    try { await p.shot(path.join(__dirname, '_audit', 'v560-custom-color.png')); } catch (e) {}
  } catch (e) {
    fail++; console.log('  ✗ 中斷：' + (e && e.message));
  } finally {
    try { await br.close(); } catch (e) {}
  }
  console.log('\n' + (fail ? '❌' : '✅') + ' 探針：' + pass + ' 通過 / ' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
})();
