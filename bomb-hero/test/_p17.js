// test/_p17.js — 「逐字比對字典」的精準殘留掃描：抓「畫面上的文字剛好等於某條繁中原文」
// 只用 CJK 判斷對日文無效（日文也用漢字），所以改成跟字典的 zh-TW 值做整串比對。
const fs = require('fs');
const path = require('path');
const { launch, sleep } = require('./cdp');
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const LANG = process.env.L || 'ja';
const OUT = path.join(__dirname, '_audit');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// 從字典抽出 zh-TW 值（只要含中文、長度 >= 2，避免單字誤判）
function zhValues() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'i18n-src.js'), 'utf8');
  const body = src.slice(src.indexOf('`'), src.lastIndexOf('`'));
  const out = [];
  body.split('\n').forEach(function (l) {
    if (!l || l.indexOf('|') < 0) return;
    const c = l.split('|');
    if (c.length !== 6) return;
    const zh = c[1], tv = c[LANG === 'ja' ? 4 : LANG === 'ko' ? 5 : 3];
    if (!zh || zh.length < 2) return;
    if (tv == null || tv === zh) return;
    if (!/[\u4e00-\u9fff]/.test(zh)) return;
    out.push(zh);
  });
  return out;
}

const ZH = zhValues();

(async () => {
  const cdp = await launch({ port: 9488, w: 900, h: 430 });
  const p = await cdp.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.send('Emulation.setUserAgentOverride', { userAgent: UA, platform: 'Android' });
  await p.resize(900, 430, true);
  await p.goto('http://127.0.0.1:3111/index.html', 2600);
  await p.eval(`(function(){ try{localStorage.setItem('bombhero-rotskip','1');}catch(e){} var r=document.getElementById('rotHint'); if(r&&r.parentNode) r.parentNode.removeChild(r); __BH.settings.mapMode='classic'; })()`);
  await p.eval(`window.__ZH = ${JSON.stringify(ZH)}; window.__ZHSET = null;`);

  const sw = await p.eval(`(function(){
    try { var b=document.getElementById('btnLang'); if(b) b.click();
      var it=document.querySelector('#langList [data-lang="${LANG}"]'); if(it){ it.click(); return 'ok'; }
      return 'noitem'; } catch(e){ return 'err:'+e.message; }
  })()`);
  await sleep(900);
  console.log('切語言:', sw, 'lang=', await p.eval('document.documentElement.lang'), '字典zh值', ZH.length);

  const SCAN = `(function(){
    if (!window.__ZHSET) window.__ZHSET = new Set(window.__ZH);
    var root = document.querySelector('.screen.on') || document.body;
    function vis(el){ for (var e=el; e && e!==document.body; e=e.parentElement){ var cs=getComputedStyle(e); if(cs.display==='none'||cs.visibility==='hidden') return false; } return true; }
    var out = [];
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null); var n;
    while ((n = w.nextNode())) {
      var s = (n.nodeValue||'').trim();
      if (!s || !/[\\u4e00-\\u9fff]/.test(s)) continue;
      var pe = n.parentElement; if (!pe || !vis(pe)) continue;
      if (!window.__ZHSET.has(s)) continue;
      out.push((pe.id||pe.className||pe.tagName) + ': ' + s.slice(0,34));
    }
    return JSON.stringify(out);
  })()`;

  let total = 0;
  for (const s of ['title', 'solo', 'rpg', 'settings', 'shop', 'learn', 'daily', 'battle', 'online', 'char']) {
    await p.eval(`(function(){ try{ __BH.Screen.show('${s}'); }catch(e){} })()`);
    await sleep(500);
    const r = JSON.parse(await p.eval(SCAN));
    total += r.length;
    console.log('[' + s + '] 殘留 ' + r.length);
    r.slice(0, 12).forEach(x => console.log('    ' + x));
  }
  console.log('總計', total);
  await p.eval(`(function(){ try{ __BH.Screen.show('learn'); }catch(e){} })()`);
  await sleep(400);
  await p.shot(OUT + 'learn-' + LANG + '.png');
  cdp.close();
})().catch(e => { console.error(e); process.exit(2); });
