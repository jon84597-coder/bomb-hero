const path = require('path');
const { launch, sleep } = require(path.join(__dirname, '..', '..', 'test', 'cdp.js'));
const OUT = path.join(__dirname, 'shots');
require('fs').mkdirSync(OUT, { recursive: true });
const FILE = 'file:///' + path.join(__dirname, 'anim-all.html').replace(/\\/g, '/');
(async () => {
  const b = await launch({ w: 1220, h: 4600 });
  const p = await b.newPage();
  await p.goto(FILE, 8000);
  await sleep(1500);
  await p.shot(path.join(OUT, 'all.png'), { fullPage: true });
  b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
