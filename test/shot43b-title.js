// v3.5 額外檢查：首頁選單新增「📖 遊戲說明」後排版是否正常（PC + 手機）
const path = require('path');
const { launch, sleep } = require('./cdp');
const FILE = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

(async () => {
  const br = await launch({ w: 1280, h: 900, port: 9493 });
  const p = await br.newPage();
  await p.goto(FILE, 1800); await sleep(600);
  await p.shot(__dirname + '/v35-0-pc-title.png');
  const r = await p.eval(`(function(){
    var m=document.querySelector('.menu').getBoundingClientRect();
    var b=document.getElementById('btnHelp').getBoundingClientRect();
    return { menuBottom: Math.round(m.bottom), helpBtnBottom: Math.round(b.bottom),
             vh: innerHeight, overflowX: document.documentElement.scrollWidth > innerWidth };
  })()`);
  console.log('PC', JSON.stringify(r));
  await br.close();

  const br2 = await launch({ w: 390, h: 844, port: 9494 });
  const p2 = await br2.newPage();
  await p2.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p2.send('Emulation.setEmulatedMedia', { features: [
    { name: 'pointer', value: 'coarse' }, { name: 'hover', value: 'none' }] });
  await p2.goto(FILE, 1800); await sleep(600);
  await p2.shot(__dirname + '/v35-6-phone-title.png');
  const r2 = await p2.eval(`(function(){
    var b=document.getElementById('btnHelp').getBoundingClientRect();
    return { btnH: Math.round(b.height), overflowX: document.documentElement.scrollWidth > innerWidth + 1 };
  })()`);
  console.log('Phone', JSON.stringify(r2));
  await br2.close();
})().catch(e => { console.error('ERR', e && e.message || e); process.exit(1); });
