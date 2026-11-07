// test/_probe-i18n.js — 逐語言掃「沒被翻譯的中文」
// 做法：切到某個語言 → 走過每一頁 → 收集畫面上仍含中日韓字的可見文字。
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp');

const PORT = process.env.PORT || 3111;
const URL = 'http://127.0.0.1:' + PORT + '/index.html';
const OUT = path.join(__dirname, '_audit');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

const LANGS = ['en', 'ja', 'ko'];
const SCREENS = ['title', 'solo', 'rpg', 'settings', 'shop', 'daily', 'battle', 'online', 'learn', 'char'];

const CJK = '\\u3000-\\u303f\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff\\uff01-\\uff60';

const SCAN = `(function(){
  var RE = new RegExp('[' + ${JSON.stringify(CJK)} + ']');
  var out = [];
  var main = document.querySelector('.screen.on') || document.body;
  var walk = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, null);
  var n;
  while ((n = walk.nextNode())) {
    var s = (n.nodeValue || '').trim();
    if (!s || !RE.test(s)) continue;
    var p = n.parentElement;
    if (!p) continue;
    var cs = getComputedStyle(p);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue;
    var r = p.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (r.bottom < 0 || r.top > innerHeight * 3) continue;
    out.push({ t: s.slice(0, 34), tag: p.tagName.toLowerCase(), id: p.id || '', cls: (typeof p.className === 'string' ? p.className : '').slice(0, 24) });
  }
  return JSON.stringify(out);
})()`;

(async () => {
  const cdp = await launch({ port: 9455, w: 900, h: 430 });
  const p = await cdp.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.send('Emulation.setUserAgentOverride', { userAgent: UA, platform: 'Android' });
  await p.resize(900, 430, true);
  await p.goto(URL, 2400);
  await p.eval(`(function(){try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}var r=document.getElementById('rotHint');if(r&&r.parentNode)r.parentNode.removeChild(r);__BH.settings.mapMode='classic';})()`);

  const all = {};
  for (const lang of LANGS) {
    await p.eval(`(function(){ try{ window.__BH && null; }catch(e){} })()`);
    // 直接呼叫 setLang（沒匯出就走 UI 選單）
    const sw = await p.eval(`(function(){
      try {
        var b=document.getElementById('btnLang'); if(b) b.click();
        var it=document.querySelector('#langList [data-lang="'+${JSON.stringify(lang)}+'"]');
        if (it) { it.click(); return 'ok'; }
        return 'noitem';
      } catch(e) { return 'err:' + e.message; }
    })()`);
    if (sw !== 'ok') { console.log(lang, '切換失敗', sw); continue; }
    await sleep(500);
    const cur = await p.eval('document.documentElement.lang');
    const res = {};
    for (const s of SCREENS) {
      await p.eval(`(function(){ try{ __BH.Screen.show('${s}'); }catch(e){} })()`);
      await sleep(420);
      let items = [];
      try { items = JSON.parse(await p.eval(SCAN)); } catch (e) {}
      // 同一段文字只留一次
      const uniq = [];
      const seen = new Set();
      items.forEach(it => { const k = it.t; if (!seen.has(k)) { seen.add(k); uniq.push(it); } });
      if (uniq.length) res[s] = uniq;
    }
    all[lang] = { lang: cur, res };
    const total = Object.values(res).reduce((a, b) => a + b.length, 0);
    console.log('\n[' + lang + '] lang=' + cur + '  未翻譯片段 ' + total + ' 處');
    for (const [s, list] of Object.entries(res)) {
      if (!list.length) continue;
      console.log('  · ' + s + ' (' + list.length + ')');
      list.slice(0, 10).forEach(it => console.log('      "' + it.t + '"  <' + it.tag + ' ' + (it.id || it.cls) + '>'));
      if (list.length > 10) console.log('      …還有 ' + (list.length - 10) + ' 處');
    }
    await p.eval(`(function(){ try{ __BH.Screen.show('title'); }catch(e){} })()`);
  }

  fs.writeFileSync(path.join(OUT, 'i18n-report.json'), JSON.stringify(all, null, 2));
  cdp.close();
})().catch(e => { console.error(e); process.exit(2); });
