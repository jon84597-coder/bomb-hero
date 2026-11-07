const { launch, sleep } = require('./cdp');
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

(async () => {
  const cdp = await launch({ port: 9452, w: 844, h: 390 });
  const p = await cdp.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.send('Emulation.setUserAgentOverride', { userAgent: UA, platform: 'Android' });

  for (const [w, h] of [[844, 390], [900, 430], [1024, 480], [740, 360]]) {
    await p.resize(w, h, true);
    await p.goto('http://127.0.0.1:3111/index.html', 2200);
    await p.eval(`(function(){try{localStorage.setItem('bombhero-rotskip','1');}catch(e){}var r=document.getElementById('rotHint');if(r&&r.parentNode)r.parentNode.removeChild(r);__BH.settings.mapMode='classic';})()`);
    await p.eval(`__BH.startSolo(3)`);
    await sleep(700);
    await p.eval(`(function(){var b=document.querySelector('#ovBox button'); if(b) b.click();})()`);
    await sleep(3000);
    const d = JSON.parse(await p.eval(`(function(){
      function R(e){ if(!e) return null; var r=e.getBoundingClientRect(); var s=getComputedStyle(e);
        return { x:Math.round(r.left), y:Math.round(r.top), w:Math.round(r.width), h:Math.round(r.height), disp:s.display, vis:s.visibility, z:s.zIndex }; }
      var nav=document.getElementById('navBar');
      var timer=document.querySelector('#gameTop .chip.big');
      var top=document.getElementById('gameTop');
      return JSON.stringify({ nav:R(nav), back:R(document.getElementById('btnBack')), acct:R(document.getElementById('acctChip')),
        more:R(document.getElementById('btnMore')), timer:R(timer), timerTxt: timer&&timer.textContent.trim(), top:R(top),
        navCls: nav && nav.className });
    })()`));
    console.log('\n=== ' + w + 'x' + h + ' ===');
    console.log('  navBar', JSON.stringify(d.nav), 'cls="' + (d.navCls || '') + '"');
    console.log('  back  ', JSON.stringify(d.back));
    console.log('  acct  ', JSON.stringify(d.acct));
    console.log('  more  ', JSON.stringify(d.more));
    console.log('  top   ', JSON.stringify(d.top));
    console.log('  timer ', JSON.stringify(d.timer), '「' + d.timerTxt + '」');
    if (d.timer && d.back && d.back.x < d.timer.x + d.timer.w) {
      console.log('  ⚠ 導覽列壓到計時器 ' + (d.timer.x + d.timer.w - d.back.x) + 'px');
    }
  }
  cdp.close();
})().catch(e => { console.error(e); process.exit(2); });
