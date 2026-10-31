// v3.8-A 目檢 2：借用遊戲自己的繪圖函式（drawBombOn/drawFlameOn），大畫布放大檢視
const path = require('path');
const { launch, sleep } = require('./cdp');

(async function () {
  const br = await launch({ w: 1100, h: 860, port: 9522 });
  const page = await br.newPage();
  await page.goto('file:///' + path.resolve(__dirname, '..').replace(/\\/g, '/') + '/index.html', 2200);
  await sleep(800);

  const r = await page.eval(`(function(){
    var B = window.__BH;
    if (!B || !B.drawBombOn || !B.drawFlameOn) return { err: 'drawBombOn/drawFlameOn 沒導出' };
    var cv = document.createElement('canvas');
    cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#22304a';
    cv.width = 1080; cv.height = 820;
    document.body.appendChild(cv);
    var g = cv.getContext('2d');
    if (!B.Game.gameT) B.Game.gameT = 1.23;

    function cell(x0, y0, label, fn) {
      g.save();
      g.translate(x0, y0);
      fn();
      g.restore();
      g.fillStyle = '#cfe0ff';
      g.font = '15px sans-serif';
      g.fillText(label, x0 - 70, y0 + 112);
    }
    g.fillStyle = '#22304a'; g.fillRect(0, 0, 1080, 820);
    g.strokeStyle = 'rgba(255,255,255,.06)';
    for (var i = 0; i < 1080; i += 60) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 820); g.stroke(); }
    for (var j = 0; j < 820; j += 60) { g.beginPath(); g.moveTo(0, j); g.lineTo(1080, j); g.stroke(); }

    var T = 62, R = T * .32;
    cell(180, 220, '燃燒中', function () { B.drawBombOn(g, R, 3, false, true, false); });
    cell(400, 220, '快爆（透紅）', function () { B.drawBombOn(g, R, 7, true, true, false); });
    cell(620, 220, '遙控彈（待爆）', function () { B.drawBombOn(g, R, 11, false, false, true); });
    cell(840, 220, '遙控彈（透紅）', function () { B.drawBombOn(g, R, 11, true, false, true); });
    // 放大 2.4 倍看清細節
    cell(180, 490, '燃燒中（放大）', function () { g.scale(2.4, 2.4); B.drawBombOn(g, R, 3, false, true, false); });
    cell(500, 490, '遙控彈（放大）', function () { g.scale(2.4, 2.4); B.drawBombOn(g, R, 11, false, false, true); });
    // 火焰四種
    cell(180, 740, '火焰（中心）', function () { B.drawFlameOn(g, { cx: 0, cy: 0, owner: {}, t: .30, dir: null }, 100); });
    cell(400, 740, '火焰（往外）', function () { B.drawFlameOn(g, { cx: 0, cy: 0, owner: {}, t: .30, dir: 'right' }, 100); });
    cell(620, 740, 'BOSS 紫焰', function () { B.drawFlameOn(g, { cx: 0, cy: 0, owner: null, t: .30, dir: null }, 100); });
    cell(840, 740, 'BOSS 紫焰（往外）', function () { B.drawFlameOn(g, { cx: 0, cy: 0, owner: null, t: .30, dir: 'right' }, 100); });

    return { ok: true };
  })()`);
  console.log(JSON.stringify(r));
  await sleep(500);
  await page.shot('test/v38a-2-zoom.png');
  await br.close();
  console.log('done');
})().catch(e => { console.error(e.message); process.exit(1); });
