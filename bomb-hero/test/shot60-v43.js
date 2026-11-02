// test/shot60-v43.js — v4.3 帳號彈窗在小螢幕上的可用性（註冊表單變高之後的回歸）
//   機型：360×640（最小常見）、390×720、768×1024
//   檢查：卡片不超出視窗、內容需要時可以在卡片內捲動、送出鈕一定按得到
const cdp = require('./cdp');

let pass = 0, fail = 0;
function ok(c, n, x) {
  if (c) { pass++; console.log('  ✓ ' + n + (x === undefined ? '' : '（' + x + '）')); }
  else { fail++; console.log('  ✗ FAIL: ' + n + (x === undefined ? '' : '（' + x + '）')); }
}

(async () => {
  const b = await cdp.launch({ w: 1200, h: 900, port: 9473 });
  const p = await b.newPage();

  const devices = [
    { w: 360, h: 640, name: '360×640 小手機' },
    { w: 390, h: 720, name: '390×720 常見手機' },
    { w: 768, h: 1024, name: '768×1024 平板' }
  ];

  for (const d of devices) {
    console.log('\n=== ' + d.name + ' ===');
    await p.resize(d.w, d.h, true);
    await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await p.goto('http://127.0.0.1:3000/?touch=1', 1500);
    await cdp.sleep(800);
    await p.eval("document.getElementById('acctChip').click()");
    await cdp.sleep(500);

    const r = await p.eval(`(() => {
      const card = document.querySelector('#acctModal .acctcard');
      const cr = card.getBoundingClientRect();
      const body = document.getElementById('acctBody');
      const btn = document.getElementById('acctSubmit');
      const br = btn ? btn.getBoundingClientRect() : null;
      return {
        vw: innerWidth, vh: innerHeight,
        x: Math.round(cr.x), y: Math.round(cr.y), w: Math.round(cr.width), h: Math.round(cr.height),
        bottom: Math.round(cr.bottom),
        overW: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        canScroll: card.scrollHeight > card.clientHeight + 2,
        bodyScroll: body ? (body.scrollHeight > body.clientHeight + 2) : null,
        bodyOverflow: body ? getComputedStyle(body).overflowY : null,
        btnY: br ? Math.round(br.y) : null, btnH: br ? Math.round(br.height) : null,
        tabs: document.querySelectorAll('#acctBody .accttab').length
      };
    })()`);
    console.log('    ' + JSON.stringify(r));

    ok(r.tabs === 3, '三個分頁都在');
    ok(r.overW <= 0, '沒有橫向溢出');
    ok(r.x >= 0 && r.x + r.w <= r.vw + 1, '卡片寬度塞得進畫面', r.w + '/' + r.vw);
    ok(r.y >= 0, '卡片頂端沒被切掉', r.y);
    // 卡片比視窗高時，必須「卡片自己可以捲」而且送出鈕捲得到
    const fits = r.bottom <= r.vh + 1;
    ok(fits || r.canScroll, fits ? '卡片完整落在畫面內' : '卡片比畫面高 → 可在卡片內捲動', r.h + '/' + r.vh);

    if (!fits) {
      const reach = await p.eval(`(() => {
        const card = document.querySelector('#acctModal .acctcard');
        const btn = document.getElementById('acctSubmit');
        btn.scrollIntoView({ block: 'nearest' });
        const br = btn.getBoundingClientRect();
        return { y: Math.round(br.y), bottom: Math.round(br.bottom), vh: innerHeight };
      })()`);
      ok(reach.bottom <= reach.vh + 1 && reach.y >= 0, '捲到底後「註冊並綁定」鈕完全可見',
        'y=' + reach.y + ' bottom=' + reach.bottom + '/' + reach.vh);
    } else {
      ok(r.btnY !== null && r.btnY + r.btnH <= r.vh + 1, '「註冊並綁定」鈕在畫面內', 'y=' + r.btnY);
    }

    if (d.w === 360) await p.shot('test/v43-6-mobile-360.png');
    if (d.w === 390) await p.shot('test/v43-7-mobile-390.png');

    // 已登入狀態的資訊頁（比較矮）也要塞得進
    const acc = await p.eval(`(function(){
      const C = window.__BH.Cloud;
      const st = C.state;
      st.guest = false;
      st.acc = Object.assign({}, st.acc, { kind:'member', name:'player1@test.com',
        email:'player1@test.com', hasPass:true, dev:true, tier:'developer' });
      st.tab = 'info';
      C.open();
      const card = document.querySelector('#acctModal .acctcard');
      const cr = card.getBoundingClientRect();
      return { h: Math.round(cr.height), bottom: Math.round(cr.bottom), vh: innerHeight,
        admin: !!document.querySelector('#acctBody [data-acct="admin"]'),
        overW: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    })()`);
    ok(acc.overW <= 0 && (acc.bottom <= acc.vh + 1 || acc.h <= acc.vh), '已登入資訊頁（含開發者後台鈕）也塞得進',
      acc.h + '/' + acc.vh);
    ok(acc.admin === true, '開發者資訊頁有後台按鈕');
  }

  console.log('\n========================================');
  console.log('  結果：' + pass + ' 通過 / ' + fail + ' 失敗');
  console.log('========================================');
  b.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERR', e && e.stack || e); process.exit(1); });
