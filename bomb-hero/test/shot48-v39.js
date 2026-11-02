// v3.9 目檢：手機觸控按鈕的新圖示（黑亮圓球炸彈／遙控 LED 彈／四層水滴火焰）＋精美圓框
const path = require('path');
const { launch, sleep } = require('./cdp');

let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ FAIL: ' + m); } }

(async function () {
  // 用手機視口（直放 390x844）→ 遊戲畫面會自動轉 90°，按鈕照實機顯示
  const br = await launch({ w: 932, h: 430, port: 9548 });
  const page = await br.newPage();
  await page.resize(932, 430, true);          // 手機視口（橫向，含 touch 事件模擬）
  await page.goto('file:///' + path.resolve(__dirname, '..').replace(/\\/g, '/') + '/index.html', 2500);
  await sleep(800);

  // 強制切成「手機觸控」→ 顯示搖桿與按鈕
  await page.eval(`(function(){
    var B = window.__BH;
    B.settings.ctrl = 'touch';
    B.applyCtrl();
    B.applyTouchLayout();
  })()`);
  await sleep(300);

  // 進單人遊戲（按鈕只在遊戲畫面裡）
  await page.eval(`(function(){ window.__BH.startSolo(1); })()`);
  await sleep(600);
  await page.eval(`(function(){
    var b = document.querySelector('.overlay-in .mbtn');
    if (b && b.click) b.click();
    var G = window.__BH.Game;
    G.state = 'play'; G.countdown = 0;
    if (G.players[0]) { G.players[0].invuln = 999; }
    if (G.enemies) G.enemies.length = 0;      // 畫面乾淨好目檢
  })()`);
  await sleep(500);

  // 讓「吐火」鈕出現（updateHud 只在騎龍時顯示 → 給玩家掛一隻龍）
  await page.eval(`(function(){
    var G = window.__BH.Game;
    if (G.players[0] && !G.players[0].dino) G.players[0].dino = { lv: 1, cd: 0 };
    window.__BH.paintTouchIcons(0);
  })()`);
  await sleep(900);
  await page.shot('test/v39-1-buttons.png');

  // ---- 斷言：三顆鈕的畫布真的有畫東西（不是全透明）----
  const r = await page.eval(`JSON.stringify((function(){
    function ink(sel){
      var cv = document.querySelector(sel);
      if (!cv || !cv.getContext) return null;
      var g = cv.getContext('2d');
      var d = g.getImageData(0, 0, cv.width, cv.height).data;
      var n = 0, minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
      for (var i = 0; i < d.length; i += 4) {
        if (d[i+3] > 24) {
          n++;
          var px = (i/4) % cv.width, py = Math.floor((i/4) / cv.width);
          if (px < minX) minX = px; if (px > maxX) maxX = px;
          if (py < minY) minY = py; if (py > maxY) maxY = py;
        }
      }
      return { w: cv.width, h: cv.height, n: n,
               cxOff: n ? Math.round((minX+maxX)/2 - cv.width/2) : 0,
               cyOff: n ? Math.round((minY+maxY)/2 - cv.height/2) : 0,
               fill: n ? +(n / (cv.width*cv.height)).toFixed(3) : 0 };
    }
    return {
      bomb:   ink('#touchUI .tact canvas'),
      remote: ink('#touchUI .tdet canvas'),
      flame:  ink('#touchUI .tfire canvas'),
      boxes: (function(){
        function box(sel){ var e = document.querySelector(sel); if (!e) return null;
          var b = e.getBoundingClientRect();
          return { w: Math.round(b.width), h: Math.round(b.height),
                   vis: getComputedStyle(e).display !== 'none' }; }
        return { tact: box('#touchUI .tact'), tdet: box('#touchUI .tdet'), tfire: box('#touchUI .tfire') };
      })()
    };
  })())`);
  const j = JSON.parse(r);

  console.log('\n=== 圖示有畫出東西 ===');
  ok(j.bomb && j.bomb.n > 400, '放炸彈鈕有圖（' + (j.bomb ? j.bomb.n : 0) + ' 個不透明像素）');
  ok(j.remote && j.remote.n > 400, '遙控引爆鈕有圖（' + (j.remote ? j.remote.n : 0) + '）');
  ok(j.flame && j.flame.n > 400, '吐火鈕有圖（' + (j.flame ? j.flame.n : 0) + '）');

  console.log('\n=== 圖示大小合理（不溢出、不過小）===');
  ok(j.bomb && j.bomb.fill > .10 && j.bomb.fill < .92, '炸彈占鈕面 ' + (j.bomb ? j.bomb.fill : '-') + '（10%~92%）');
  ok(j.flame && j.flame.fill > .06 && j.flame.fill < .92, '火焰占鈕面 ' + (j.flame ? j.flame.fill : '-'));
  ok(j.remote && j.remote.fill > .08 && j.remote.fill < .92, '遙控彈占鈕面 ' + (j.remote ? j.remote.fill : '-'));

  console.log('\n=== 圖示置中（偏移不超過鈕寬 12%）===');
  ['bomb', 'remote', 'flame'].forEach(function (k) {
    const o = j[k];
    const lim = Math.round(o.w * .12);
    ok(Math.abs(o.cxOff) <= lim && Math.abs(o.cyOff) <= lim * 1.6,
      k + ' 置中（x 偏 ' + o.cxOff + '、y 偏 ' + o.cyOff + '，容許 ±' + lim + '）');
  });

  console.log('\n=== 按鈕尺寸（實際 = 基準 × tpad.size）===');
  const sz = JSON.parse(await page.eval(`JSON.stringify({ sc: window.__BH.settings.tpad.size, base: window.__BH.TICON_BASE })`));
  ok(j.boxes.tact && Math.abs(j.boxes.tact.w - Math.round(sz.base.bomb * sz.sc)) <= 2,
    '放彈鈕 ' + (j.boxes.tact || {}).w + 'px（預期 ' + Math.round(sz.base.bomb * sz.sc) + '）');
  ok(j.boxes.tdet && Math.abs(j.boxes.tdet.w - Math.round(sz.base.remote * sz.sc)) <= 2,
    '遙控鈕 ' + (j.boxes.tdet || {}).w + 'px（預期 ' + Math.round(sz.base.remote * sz.sc) + '）');
  ok(j.boxes.tfire && j.boxes.tfire.vis === true, '吐火鈕已顯示');

  // ---- 放大目檢：把三顆鈕的畫布放大畫到一張大圖 ----
  await page.eval(`(function(){
    var big = document.createElement('canvas');
    big.width = 900; big.height = 320; big.id = 'zoomCv';
    big.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#12182a';
    document.body.appendChild(big);
    var g = big.getContext('2d');
    g.imageSmoothingEnabled = false;
    var list = [['#touchUI .tact canvas', 30], ['#touchUI .tdet canvas', 340], ['#touchUI .tfire canvas', 620]];
    list.forEach(function (it) {
      var cv = document.querySelector(it[0]);
      if (!cv) return;
      g.drawImage(cv, it[1], 30, 240, 240);
      g.strokeStyle = 'rgba(255,255,255,.25)';
      g.strokeRect(it[1], 30, 240, 240);
    });
  })()`);
  await sleep(400);
  await page.shot('test/v39-2-zoom.png');

  await br.close();
  console.log('\n[shot48] ' + pass + ' 通過、' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e.message); process.exit(1); });
