// v3.5 目檢＋實測：首頁「📖 遊戲說明」六個分頁（PC + 手機）
//   A. PC：點開說明頁，逐頁截圖；檢查每張小圖（道具／怪物／坐騎）真的有畫出東西
//   B. 手機直式：說明頁可捲、單欄排版、不爆版
const path = require('path');
const { launch, sleep } = require('./cdp');
const URL = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const OUT = __dirname + '/';

// 檢查畫布是否真的有內容（非全透明）
const CHECK = `(function(){
  var out = { total:0, blank:[], sizes:[] };
  var cs = document.querySelectorAll('#helpBody canvas[data-sp]');
  out.total = cs.length;
  for (var i=0;i<cs.length;i++){
    var c = cs[i];
    var g = c.getContext('2d');
    var d = g.getImageData(0,0,c.width,c.height).data;
    var n=0;
    for (var j=3;j<d.length;j+=4){ if (d[j]>8) n++; }
    out.sizes.push([c.getAttribute('data-sp'), c.width, c.height, n]);
    if (n < 30) out.blank.push(c.getAttribute('data-sp'));
  }
  return out;
})()`;

async function phone(page) {
  await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await page.send('Emulation.setEmulatedMedia', { features: [
    { name: 'pointer', value: 'coarse' }, { name: 'hover', value: 'none' }] });
}

(async () => {
  // ---------- A. PC ----------
  const br = await launch({ w: 1280, h: 900, port: 9491 });
  const page = await br.newPage();
  const errs = [];
  page.send('Runtime.consoleAPICalled').catch(() => {});
  await page.goto(URL, 1800);
  await sleep(500);

  await page.eval(`(function(){ var b=document.getElementById('btnHelp'); if(!b) return 'no btn'; b.click(); return 'ok'; })()`);
  await sleep(400);
  console.log('A1 目前畫面 =', await page.eval(`window.__BH.Screen.current`));
  await page.shot(OUT + 'v35-1-pc-basic.png');

  const tabs = ['item', 'ride', 'stage', 'foe', 'tip'];
  for (let i = 0; i < tabs.length; i++) {
    await page.eval(`(function(){ window.__BH.Help.setTab('${tabs[i]}'); })()`);
    await sleep(350);
    const r = await page.eval(CHECK);
    console.log('A2 [' + tabs[i] + '] 小圖 ' + r.total + ' 張，空白 ' + r.blank.length +
      (r.blank.length ? ' → ' + r.blank.join(',') : '') +
      '，抽樣 ' + JSON.stringify(r.sizes.slice(0, 3)));
    await page.shot(OUT + 'v35-2-pc-' + tabs[i] + '.png');
  }

  // 捲動區高度／是否溢出視窗
  const box = await page.eval(`(function(){
    var b=document.getElementById('helpBody'), c=document.querySelector('#scr-help .card');
    var rb=b.getBoundingClientRect(), rc=c.getBoundingClientRect();
    return { bodyH: Math.round(rb.height), scrollH: b.scrollHeight, cardBottom: Math.round(rc.bottom),
             vh: window.innerHeight, overflowX: document.documentElement.scrollWidth > window.innerWidth };
  })()`);
  console.log('A3 內容區高 ' + box.bodyH + ' / 可捲高 ' + box.scrollH + '，卡片底部 ' + box.cardBottom +
    '（視窗 ' + box.vh + '），橫向溢出 ' + box.overflowX);

  // 回主選單
  await page.eval(`(function(){ document.querySelector('#scr-help [data-back]').click(); })()`);
  await sleep(300);
  console.log('A4 返回後畫面 =', await page.eval(`window.__BH.Screen.current`));
  await br.close();

  // ---------- B. 手機直式 ----------
  const br2 = await launch({ w: 390, h: 844, port: 9492 });
  const p2 = await br2.newPage();
  await phone(p2);
  await p2.goto(URL, 1800);
  await sleep(500);
  await p2.eval(`(function(){ document.getElementById('btnHelp').click(); })()`);
  await sleep(400);
  await p2.shot(OUT + 'v35-3-phone-basic.png');
  const ph = await p2.eval(`(function(){
    var c=document.querySelector('#scr-help .card'), r=c.getBoundingClientRect();
    return { w: Math.round(r.width), vw: window.innerWidth,
             overflowX: document.documentElement.scrollWidth > window.innerWidth + 1 };
  })()`);
  console.log('B1 手機卡片寬 ' + ph.w + ' / 視窗 ' + ph.vw + '，橫向溢出 ' + ph.overflowX);
  await p2.eval(`(function(){ window.__BH.Help.setTab('foe'); })()`);
  await sleep(350);
  await p2.shot(OUT + 'v35-4-phone-foe.png');
  await p2.eval(`(function(){ window.__BH.Help.setTab('ride'); })()`);
  await sleep(350);
  await p2.shot(OUT + 'v35-5-phone-ride.png');
  await br2.close();
  console.log('done');
})().catch(e => { console.error('ERR', e && e.message || e); process.exit(1); });
