const path = require('path');
const { launch, sleep } = require(path.join(__dirname, '..', '..', 'test', 'cdp.js'));
const OUT = path.join(__dirname, 'shots');
require('fs').mkdirSync(OUT, { recursive: true });
const FILE = 'file:///' + path.join(__dirname, 'walk-video.html').replace(/\\/g, '/');
(async () => {
  const b = await launch({ w: 1120, h: 3600 });
  const p = await b.newPage();
  await p.goto(FILE, 6000);
  await sleep(1200);
  await p.shot(path.join(OUT, 'vid.png'), { fullPage: true });
  b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
