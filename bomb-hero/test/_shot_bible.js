const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '../art/foes/stage1-preview.html').replace(/\\/g, '/');
(async () => {
  const b = await launch({ port: 9472, w: 1280, h: 900 });
  const p = await b.newPage();
  await p.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await p.goto(URL, 2500);
  await sleep(600);
  await p.shot(path.join(__dirname, '_v427', '_bible_top.png'));
  await p.eval('window.scrollTo(0, 1750)'); await sleep(400);
  await p.shot(path.join(__dirname, '_v427', '_bible_foes.png'));
  await p.eval('window.scrollTo(0, 3900)'); await sleep(400);
  await p.shot(path.join(__dirname, '_v427', '_bible_cards.png'));
  const h = await p.eval('document.body.scrollHeight');
  console.log('height', h);
  await p.eval('window.scrollTo(0, 7350)'); await sleep(400); await p.shot(path.join(__dirname, '_v427', '_bible_rig.png')); await b.close();
})();
