// v3.6 瀏覽器實測：真的開 server + 真的用滑鼠點「按讚」
const { spawn } = require('child_process');
const path = require('path');
const { launch, sleep } = require('./cdp');

const PORT = 3511;
const BASE = 'http://127.0.0.1:' + PORT;
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ FAIL: ' + m); } }

async function clickAt(page, sel) {
  const r = JSON.parse(await page.eval(`JSON.stringify((function(){var e=document.querySelector('${sel}');var b=e.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})())`));
  for (const type of ['mousePressed', 'mouseReleased']) {
    await page.send('Input.dispatchMouseEvent', {
      type, x: r.x, y: r.y, button: 'left', clickCount: 1,
      buttons: type === 'mousePressed' ? 1 : 0
    });
  }
  return r;
}
const read = page => page.eval(`JSON.stringify({
  views: document.getElementById('stViews').textContent,
  likes: document.getElementById('stLikes').textContent,
  heart: document.getElementById('stHeart').textContent,
  on: document.getElementById('stLike').classList.contains('on'),
  localHidden: document.getElementById('stLocal').className.indexOf('hide') >= 0,
  tip: document.getElementById('stViewItem').title,
  box: (function(){ var b=document.getElementById('statBox').getBoundingClientRect();
        return {x:Math.round(b.left),y:Math.round(b.top),w:Math.round(b.width),h:Math.round(b.height)}; })(),
  ann: (function(){ var b=document.getElementById('annBox').getBoundingClientRect(); return {y:Math.round(b.top)}; })(),
  ver: window.__BH.VERSION
})`);

(async function () {
  // 每次都從乾淨的統計開始
  try { require('fs').unlinkSync(path.join(__dirname, '../../bomberman-online/data/stats.json')); } catch (e) {}
  const srv = spawn(process.execPath, [path.join(__dirname, '../../bomberman-online/server.js')], {
    env: Object.assign({}, process.env, { PORT: String(PORT) }), stdio: ['ignore', 'pipe', 'pipe']
  });
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(BASE + '/api/health'); if ((await r.json()).ok) break; } catch (e) {}
    await sleep(100);
  }
  const br = await launch({ w: 1280, h: 800, port: 9444 });
  try {
    const page = await br.newPage();
    await page.goto(BASE + '/', 2500);
    await sleep(900);

    let s = JSON.parse(await read(page));
    console.log('  載入：' + JSON.stringify(s));
    ok(s.ver === '3.7', '版本 v3.7');
    ok(s.views === '1', '第一個人進來 → 瀏覽 1');
    ok(s.likes === '0', '還沒有人按讚 → 0');
    ok(s.localHidden === true, '有後端 → 不秀「本機」標記');
    ok(s.box.x >= 0 && s.box.x < 40, '在左上角（x=' + s.box.x + '）');
    ok(s.box.y > 40 && s.box.y < 80, '讓開上方工具列（y=' + s.box.y + '）');
    ok(s.ann.y > s.box.y + s.box.h - 5, '公告欄在統計列下面，沒有疊在一起');
    ok(/瀏覽/.test(s.tip), '滑鼠停上去有說明文字：' + s.tip);
    await page.shot('test/v36-1-pc-title.png');

    console.log('\n-- 按一下讚（真的用滑鼠點）--');
    await clickAt(page, '#stLike');
    await sleep(500);
    s = JSON.parse(await read(page));
    ok(s.likes === '1', '按讚後 → 1 讚');
    ok(s.on === true, '按鈕進入「已按讚」樣式');
    ok(s.heart === '❤️', '圖示變成愛心');
    await page.shot('test/v36-2-pc-liked.png');

    console.log('\n-- 重新整理（同一個人不重複計算）--');
    await page.goto(BASE + '/', 2500);
    await sleep(900);
    s = JSON.parse(await read(page));
    ok(s.views === '1', '同一個人再進來 → 瀏覽還是 1（沒有灌水）');
    ok(s.likes === '1', '按讚數保留 1');
    ok(s.heart === '❤️', '重整後仍然記得我按過讚');
    ok(s.on === true, '重整後按鈕還是「已按讚」');

    console.log('\n-- 再點一下收回讚 --');
    await clickAt(page, '#stLike');
    await sleep(500);
    s = JSON.parse(await read(page));
    ok(s.likes === '0', '收回讚 → 0');
    ok(s.heart === '👍', '圖示變回讚');

    console.log('\n-- 換一台裝置（新的訪客）--');
    const page2 = await br.newPage();
    await page2.goto(BASE + '/', 2500);
    await page2.eval('try{localStorage.clear();sessionStorage.clear();}catch(e){}');   // 模擬換一台裝置
    await page2.goto(BASE + '/', 2500);
    await sleep(900);
    let s2 = JSON.parse(await read(page2));
    ok(s2.views === '2', '第二個人進來 → 瀏覽 2');
    ok(s2.likes === '0' && s2.heart === '👍', '新訪客是未按讚狀態');

    console.log('\n-- 手機版面 --');
    const m = await br.newPage();
    await m.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await m.goto(BASE + '/', 2500);
    await sleep(900);
    let sm = JSON.parse(await read(m));
    console.log('  手機：' + JSON.stringify(sm.box));
    ok(sm.box.x >= 0 && sm.box.x < 30, '手機也在左上角（x=' + sm.box.x + '）');
    ok(sm.box.x + sm.box.w <= 390, '沒有超出螢幕（右緣 ' + (sm.box.x + sm.box.w) + '）');
    ok(sm.ann.y > sm.box.y + sm.box.h - 5, '手機公告欄也沒跟統計列疊在一起');
    await m.shot('test/v36-3-phone-title.png');
  } finally {
    await br.close();
    srv.kill();
  }
  console.log('\n[shot44] ' + pass + ' 通過、' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
