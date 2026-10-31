// test/layout-check.js — 用 CDP 精确模拟手机视口，量测设定页/菜单页是否有横向溢出
const path = require('path');
const { launch, sleep } = require('./cdp');

const URL = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

const CASES = [
  { w: 320, h: 568, name: 'SE 320x568', mobile: true },
  { w: 360, h: 780, name: 'Android 360x780', mobile: true },
  { w: 390, h: 844, name: 'iPhone14 390x844', mobile: true },
  { w: 430, h: 932, name: 'iPhone14PM 430x932', mobile: true },
  { w: 768, h: 1024, name: 'iPad 768x1024', mobile: true },
  { w: 1280, h: 900, name: 'Desktop 1280x900', mobile: false }
];

const PROBE = `(function(){
  const de = document.documentElement;
  const vw = de.clientWidth;
  const bad = [];
  document.querySelectorAll('.card,.seg,.seg button,.row,.keyrow,.keybtn,.stagegrid,.menu,.mbtn,.chargrid,.chcard,.pmset,.tinput,.title-card,.onlineroom,.netcol').forEach(el=>{
    if (!el.getClientRects().length) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0) return;
    if (r.right > vw + 1 || r.left < -1) {
      bad.push((el.id ? '#'+el.id : '.'+String(el.className).split(' ')[0]) +
        ' L'+Math.round(r.left)+' R'+Math.round(r.right)+' W'+Math.round(r.width)+' "'+(el.textContent||'').trim().slice(0,14)+'"');
    }
  });
  const card = document.querySelector('#scr-settings .card');
  const seg = document.getElementById('segSize2');
  const last = seg && seg.lastElementChild;
  let info = null;
  if (card && last) {
    const rc = card.getBoundingClientRect(), rl = last.getBoundingClientRect();
    info = { cardW: Math.round(rc.width), cardR: Math.round(rc.right), lastR: Math.round(rl.right),
             lastTxt: last.textContent.trim(), lastVisible: rl.right <= vw + 1 };
  }
  return { vw, scrollW: de.scrollWidth, scrollH: de.scrollHeight, over: de.scrollWidth - vw,
           bodyCls: document.body.className, bad, info,
           canScroll: de.scrollHeight > window.innerHeight };
})()`;

function showState(page, scr) {
  return page.eval(`(function(){
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
    var s = document.getElementById('${scr}'); if (s) s.classList.add('on');
    return !!s;
  })()`).then(ok => sleep(200).then(() => ok));
}

(async () => {
  const br = await launch({ w: 1280, h: 900, port: 9333 });
  const page = await br.newPage();
  const lines = [];
  const say = s => { lines.push(s); console.log(s); };

  for (const c of CASES) {
    await page.resize(c.w, c.h, c.mobile);
    await page.goto(URL + '?touch=' + (c.mobile ? '1' : '0'), 1400);
    // 觸控裝置強制 body.touch（模擬真機 1 指）
    if (c.mobile) {
      await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    }
    await sleep(300);
    say('=== ' + c.name + ' | body="' + (await page.eval('document.body.className')) + '"');
    for (const scr of ['scr-title', 'scr-solo', 'scr-battle', 'scr-settings']) {
      await showState(page, scr);
      const r = await page.eval(PROBE);
      say('  [' + scr + '] vw=' + r.vw + ' scrollW=' + r.scrollW + ' over=' + r.over +
          ' scrollH=' + r.scrollH + ' canScroll=' + r.canScroll);
      if (r.bad.length) {
        say('    OVERFLOW:');
        r.bad.slice(0, 12).forEach(b => say('      - ' + b));
      }
      if (scr === 'scr-settings' && r.info) {
        say('    card W' + r.info.cardW + ' R' + r.info.cardR + ' | last "' + r.info.lastTxt +
            '" R' + r.info.lastR + ' visible=' + r.info.lastVisible);
      }
    }
    await page.shot(path.join(__dirname, 'lc-' + c.w + '-settings.png'));
  }
  await br.close();
  console.log('\nDONE');
})().catch(e => { console.error('ERR', e); process.exit(1); });
