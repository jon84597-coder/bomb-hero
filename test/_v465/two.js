const { launch, sleep } = require('../cdp');
const { spawn } = require('child_process');
const path = require('path');
const PORT = 3441, BASE = 'http://127.0.0.1:' + PORT;
(async function () {
  const srv = spawn(process.execPath, [path.join(__dirname, '../../bomberman-online/server.js')], {
    env: Object.assign({}, process.env, { PORT: String(PORT) }), stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  srv.stdout.on('data', d => log += d); srv.stderr.on('data', d => log += d);
  await sleep(1500);
  console.log('srv log:', log.trim().slice(0, 120));
  const a = await launch({ port: 9461, w: 1180, h: 520 });
  const b = await launch({ port: 9462, w: 860, h: 1180 });
  console.log('launched both');
  const pa = await a.newPage(); const pb = await b.newPage();
  await pa.goto(BASE + '/index.html', 3000);
  await pb.goto(BASE + '/index.html', 3000);
  console.log('A:', await pa.eval('typeof __BH + " / " + document.readyState + " / " + location.href'));
  console.log('B:', await pb.eval('typeof __BH + " / " + document.readyState + " / " + location.href'));
  a.close(); b.close(); srv.kill();
})();
