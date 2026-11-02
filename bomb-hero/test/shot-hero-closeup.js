/**
 * 單隻特寫：驗證手臂分層、走路擺腿、攻擊弧光、三種表情特效的細節。
 * 用法：node test/shot-hero-closeup.js [角色id]
 */
const path = require('path');
const { launch, sleep } = require('./cdp');

const OUT = path.join(__dirname, '_heroes');
const URL = 'file:///' + path.resolve(__dirname, '../art/foes/heroes-playground.html').replace(/\\/g, '/');
const ID = process.argv[2] || '07-frog';

(async () => {
  const b = await launch({ port: 9471, w: 1200, h: 900 });
  const p = await b.newPage();
  await p.send('Emulation.setDeviceMetricsOverride', {
    width: 1200, height: 900, deviceScaleFactor: 2, mobile: false
  });
  await p.goto(URL, 3000);
  await sleep(800);

  // 只留一隻，放在畫面中央
  await p.eval("document.getElementById('btnClr').click()");
  await p.eval(`(function(){var h=spawn('${ID}',7,4); h.x=480; h.y=330; h.face=BASE_DIR['${ID}']; window.__one=h; return h.id;})()`);
  await sleep(500);

  await p.shot(path.join(OUT, 'cu-idle.png'));

  // 凍結時間：之後每一張都指定「狀態 + 帧」，位置不會跑掉，可以逐帧比對
  await p.eval("speed = 0");
  const poses = [
    ['idle', "h.state='idle'; h.stT=0.45;"],
    ['move-a', "h.state='move'; h.stT=0.14; h.tx=null;"],
    ['move-b', "h.state='move'; h.stT=0.55; h.tx=null;"],
    ['attack-windup', "h.state='attack'; h.stT=0.20;"],
    ['attack-lunge', "h.state='attack'; h.stT=0.42;"],
    ['hurt', "h.state='hurt'; h.stT=0.05;"],
    ['die', "h.state='die'; h.stT=0.85;"],
  ];
  for (const [name, code] of poses) {
    await p.eval(`(function(){var h=window.__one; ${code}; forceExpr='auto';})()`);
    await sleep(180);
    await p.shot(path.join(OUT, `cu-${name}.png`));
  }
  for (const ex of ['happy', 'pain', 'cry']) {
    await p.eval(`(function(){var h=window.__one; h.state='idle'; h.stT=0.45; forceExpr='${ex}';})()`);
    await sleep(220);
    await p.shot(path.join(OUT, `cu-${ex}.png`));
  }
  await p.eval("forceExpr='auto'; speed=1");

  console.log('ERR', await p.eval('JSON.stringify(window.__err)'));
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
