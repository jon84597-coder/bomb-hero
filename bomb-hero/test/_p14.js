const { launch, sleep } = require('./cdp');
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const OUT = __dirname + '/_audit/';

(async () => {
  const cdp = await launch({ port: 9472, w: 900, h: 430 });
  const p = await cdp.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.send('Emulation.setUserAgentOverride', { userAgent: UA, platform: 'Android' });
  await p.resize(900, 430, true);
  await p.goto('http://127.0.0.1:3111/index.html', 2600);
  await p.eval(`(function(){ try{localStorage.setItem('bombhero-rotskip','1');}catch(e){} var r=document.getElementById('rotHint'); if(r&&r.parentNode) r.parentNode.removeChild(r); })()`);

  // 切英文
  const sw = await p.eval(`(function(){
    try { var b=document.getElementById('btnLang'); if(b) b.click();
      var it=document.querySelector('#langList [data-lang="en"]'); if(it){ it.click(); return 'ok'; }
      return 'noitem'; } catch(e){ return 'err:'+e.message; }
  })()`);
  await sleep(900);
  console.log('切語言:', sw, 'lang=', await p.eval('document.documentElement.lang'));

  async function scan(sel) {
    return await p.eval(`(function(){
      var root = document.querySelector(${JSON.stringify(sel)}) || document.body;
      var txt = (root.innerText || root.textContent || '');
      var re = /[\\u4e00-\\u9fff]/g;
      var hits = (txt.match(re) || []);
      return JSON.stringify({ cjk: hits.length, sample: (txt.replace(/\\s+/g,' ').slice(0, 260)) });
    })()`);
  }

  console.log('首頁新手卡:', await scan('#bhoCard'));
  // 開面板
  await p.eval(`(function(){ try{ window.BHOnboard.open(); }catch(e){} })()`);
  await sleep(600);
  console.log('新手面板:', await scan('#bhOnb'));
  await p.shot(OUT + 'en-onboard.png');
  await p.eval(`(function(){ try{ window.BHOnboard.close(); }catch(e){} })()`);

  // 按鍵面板
  await p.eval(`(function(){ try{ document.getElementById('btnKeys').click(); }catch(e){} })()`);
  await sleep(700);
  console.log('按鍵面板:', await scan('#bhKeys'));
  await p.shot(OUT + 'en-keys.png');
  await p.eval(`(function(){ try{ var b=document.querySelector('#bhKeys .kx'); if(b) b.click(); }catch(e){} })()`);

  // 原始 key 洩漏檢查
  const leak = await p.eval(`(function(){
    var t = document.body.innerText || '';
    var m = t.match(/(onb|kx|zh)\\.[a-zA-Z]+/g);
    return JSON.stringify(m ? m.slice(0,10) : []);
  })()`);
  console.log('原始 key 洩漏:', leak);
  cdp.close();
})().catch(e => { console.error(e); process.exit(2); });
