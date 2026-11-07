// test/_dump554.js — 在 zh-TW 下把「一句話夾 <b>」的提示區塊 innerHTML 原樣 dump 出來
const fs = require('fs');
const { launch, sleep } = require('./cdp');
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

const SEL = [
  '.soloDiffHint', '.soloTimeHint', '.soloCharHint',
  '.shopDesc', '.shname', '.shdesc', '.shopGoldHint', '.shopHead', '.shopSub',
  '.rpgname', '.rpgdesc', '.lvhint', '.hint', '.desc',
  '.ctrlHint', '.padnone', '.hint2', '.padhint', '.keyhint', '.gphint',
  '.lvhint2', '.rphint', '.okhint'
];

(async () => {
  const cdp = await launch({ port: 9480, w: 900, h: 430 });
  const p = await cdp.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.send('Emulation.setUserAgentOverride', { userAgent: UA, platform: 'Android' });
  await p.resize(900, 430, true);
  await p.goto('http://127.0.0.1:3111/index.html', 2400);
  await p.eval(`(function(){try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}var r=document.getElementById('rotHint');if(r&&r.parentNode)r.parentNode.removeChild(r);__BH.settings.mapMode='classic';})()`);

  const out = {};
  for (const s of ['solo', 'rpg', 'settings', 'shop']) {
    await p.eval(`(function(){ try{ __BH.Screen.show('${s}'); }catch(e){} })()`);
    await sleep(400);
    const got = await p.eval(`(function(){
      var sels = ${JSON.stringify(SEL)};
      var o = {};
      sels.forEach(function(sel){
        var els = document.querySelectorAll(sel);
        for (var i=0;i<els.length;i++){
          var el = els[i];
          if (o[sel + '#' + i]) continue;
          var html = el.innerHTML || '';
          if (!/[\\u4e00-\\u9fff]/.test(html)) continue;
          o[sel + '#' + i] = html;
        }
      });
      return JSON.stringify(o);
    })()`);
    Object.assign(out, { ['@' + s]: JSON.parse(got) });
  }
  fs.writeFileSync(__dirname + '/_dump554.json', JSON.stringify(out, null, 1));
  let n = 0;
  for (const k in out) n += Object.keys(out[k]).length;
  console.log('dumped', n, 'blocks');
  cdp.close();
})().catch(e => { console.error(e); process.exit(2); });
