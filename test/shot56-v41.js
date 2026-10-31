// 瀏覽器端到端驗證 v4.2：帳號膠囊 / 綁定彈窗 / 伺服器權威配點 / 過關 / 存檔簽章 / 手機版面
const cdp = require('./cdp');

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}

(async () => {
  const b = await cdp.launch({ w: 1280, h: 900, port: 9430 });
  const p = await b.newPage();
  await p.goto('http://127.0.0.1:3000/', 1600);
  await cdp.sleep(1000);

  console.log('\n=== 1. 首頁：常駐帳號膠囊 ===');
  let r = await p.eval(`(() => {
    const C = window.__BH.Cloud, chip = document.getElementById('acctChip');
    return { ver: window.__BH.VERSION, online: C.online(), guest: C.guest(),
      txt: chip ? chip.textContent.replace(/\\s+/g, ' ').trim() : '',
      hasSig: !!(C.acc() && C.acc().save && C.acc().save.sig) };
  })()`);
  ok(r.ver === '4.3', '版本 4.3');
  ok(r.online === true && r.guest === true, '自動取得遊客身分（免登入就能玩）');
  ok(r.txt.indexOf('綁定帳號') >= 0, '右上角常駐「綁定帳號」：' + r.txt);
  ok(r.hasSig === true, '伺服器已簽發 HMAC 存檔信封');
  await p.shot('test/v41-1-home.png');

  console.log('\n=== 2. 綁定彈窗 ===');
  await p.eval("document.getElementById('acctChip').click()");
  await cdp.sleep(400);
  // v4.3：彈窗預設停在「註冊」分頁，第三方授權按鈕在「第三方」分頁
  await p.eval("(function(){ const b=document.querySelector('#acctBody .accttab[data-tab=\"prov\"]'); if(b) b.click(); })()");
  await cdp.sleep(300);
  r = await p.eval(`(() => {
    const m = document.getElementById('acctModal');
    const btns = Array.from(document.querySelectorAll('#acctBody .acctbtn'));
    return {
      on: m.classList.contains('on'),
      n: btns.length,
      labels: btns.map(x => x.textContent.trim()),
      rows: Array.from(document.querySelectorAll('#acctBody .acctrow')).map(x => x.textContent.replace(/\\s+/g, ' ').trim()),
      note: (document.querySelector('#acctBody .acctnote') || {}).textContent || ''
    };
  })()`);
  ok(r.on === true, '點了會打開帳號彈窗');
  ok(r.n === 3 && r.labels.join('|').indexOf('Google') >= 0 && r.labels.join('|').indexOf('Facebook') >= 0 && r.labels.join('|').indexOf('LINE') >= 0,
    '提供 Google／Facebook／LINE 三種授權登入');
  ok(r.rows.length === 3, '顯示冒險進度／金幣／可用配點');
  ok(r.note.indexOf('合併') >= 0 || r.note.indexOf('開通') >= 0, '有「綁定不覆蓋」或「尚未開通」說明');
  await p.shot('test/v41-2-modal.png');
  await p.eval("document.getElementById('acctClose').click()");
  await cdp.sleep(200);
  r = await p.eval("document.getElementById('acctModal').classList.contains('on')");
  ok(r === false, '關閉鈕可以正常關掉彈窗');

  console.log('\n=== 3. RPG 畫面：帳號列與解鎖 ===');
  await p.eval("document.getElementById('btnRpg').click()");
  await cdp.sleep(600);
  r = await p.eval(`(() => ({
    bar: document.getElementById('rpgAcctBar').textContent.replace(/\\s+/g, ' ').trim(),
    locked: Array.from(document.querySelectorAll('#segRpgMap button')).map(x => x.disabled),
    left: document.getElementById('rpgLeft').textContent
  }))()`);
  ok(r.bar.indexOf('遊客') >= 0, 'RPG 創角畫面有帳號列：' + r.bar);
  ok(r.locked.join(',') === 'false,true,true,true', '新帳號只解鎖第 1 關（1-2 之後上鎖）');
  ok(r.left === '0', '9 點已配完（剩 0）');
  await p.shot('test/v41-3-rpg.png');

  console.log('\n=== 4. 配點由後端執行 ===');
  r = await p.eval(`(async () => {
    const C = window.__BH.Cloud;
    const a0 = JSON.parse(JSON.stringify(C.acc().rpg.alloc));
    await C.spend('hp', -1);
    const a1 = JSON.parse(JSON.stringify(C.acc().rpg.alloc));
    const left1 = document.getElementById('rpgLeft').textContent;
    await C.spend('hp', 1);
    const a2 = JSON.parse(JSON.stringify(C.acc().rpg.alloc));
    return { a0: a0, a1: a1, a2: a2, left1: left1, ver: C.acc().rpg.ver };
  })()`);
  ok(r.a1.hp === 2, '按「−」→ 後端把生命從 3 改成 2');
  ok(r.left1 === '1', '退點後剩餘點數顯示 1');
  ok(r.a2.hp === 3, '按「＋」→ 又回到 3');
  ok(r.ver >= 3, '每次配點都在後端遞增存檔版本（ver=' + r.ver + '）');

  console.log('\n=== 5. 隨機配點也會送後端驗證 ===');
  await p.eval("document.getElementById('btnRpgRandom').click()");
  await cdp.sleep(700);
  r = await p.eval(`(() => {
    const C = window.__BH.Cloud, a = C.acc().rpg.alloc;
    const sum = a.hp + a.def + a.spd + a.atk;
    return { a: a, sum: sum, left: document.getElementById('rpgLeft').textContent };
  })()`);
  ok(r.sum === 9, '隨機配點總和仍是 9 點（' + JSON.stringify(r.a) + '）');
  ok(r.left === '0', '剩餘點數歸零');

  console.log('\n=== 6. 過關：後端驗證順序與獎勵 ===');
  r = await p.eval(`(async () => {
    const C = window.__BH.Cloud;
    await C.clearStage(1);
    const s1 = JSON.parse(JSON.stringify(C.acc().rpg));
    await C.clearStage(5);
    const s2 = JSON.parse(JSON.stringify(C.acc().rpg));
    return { s1: s1, s2: s2, unlocked: C.acc().unlocked,
      maps: Array.from(document.querySelectorAll('#segRpgMap button')).map(x => x.disabled) };
  })()`);
  ok(r.s1.cleared === 1, '打完第 1 關 → cleared = 1');
  ok(r.s1.gold === 40, '金幣由後端給 40（前端沒得改）');
  ok(r.s2.cleared === 1, '直接跳報第 5 關 → 被後端擋下（cleared 不變）');
  ok(r.maps.join(',') === 'false,false,true,true', '第 2 關解鎖、第 3 關之後仍上鎖');

  console.log('\n=== 7. 存檔被改 → 拒絕載入 ===');
  r = await p.eval(`(async () => {
    const C = window.__BH.Cloud;
    const raw = JSON.parse(localStorage.getItem('bombhero-cloud-save'));
    raw.payload.rpg.gold = 999999;
    localStorage.setItem('bombhero-cloud-save', JSON.stringify(raw));
    const okSync = await C.sync();
    const res = await fetch('/api/rpg/sync', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(raw)
    });
    const j = await res.json();
    return { okSync: okSync, status: res.status, err: j.err };
  })()`);
  ok(r.okSync === false, 'Cloud.sync() 回報失敗');
  ok(r.status === 409 && r.err === 'SAVE_TAMPERED', '後端回 409 SAVE_TAMPERED（簽章不符）');

  console.log('\n=== 8. 重新整理：同一個遊客身分、進度還在 ===');
  const before = await p.eval("window.__BH.Cloud.acc().id");
  await p.goto('http://127.0.0.1:3000/', 1600);
  await cdp.sleep(1200);
  r = await p.eval(`(() => {
    const C = window.__BH.Cloud;
    return { id: C.acc() && C.acc().id, cleared: C.acc() && C.acc().rpg.cleared,
             dev: localStorage.getItem('bombhero-device') ? 'yes' : 'no', guest: C.guest() };
  })()`);
  ok(r.id === before, '同一台裝置 → 同一個帳號（' + r.id + '）');
  ok(r.dev === 'yes', 'Device ID 存在 LocalStorage');
  ok(r.cleared === 1, '雲端進度還在（cleared = 1）');

  console.log('\n=== 9. 手機版：版面不溢出、工具列塞得下 ===');
  await p.resize(390, 844, true);
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.goto('http://127.0.0.1:3000/?touch=1', 1600);
  await cdp.sleep(1000);
  r = await p.eval(`(() => {
    const nb = document.getElementById('navBar');
    const rr = nb.querySelector('.navright').getBoundingClientRect();
    return { over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
             right: Math.round(rr.right), vw: innerWidth,
             chip: Math.round(document.getElementById('acctChip').getBoundingClientRect().width) };
  })()`);
  ok(r.over === 0, '沒有橫向溢出');
  ok(r.right <= r.vw, '工具列最右緣在畫面內（' + r.right + ' ≤ ' + r.vw + '）');
  ok(r.chip >= 28, '帳號鈕在手機上仍可點（寬 ' + r.chip + 'px）');
  await p.shot('test/v41-4-mobile-home.png');
  await p.eval("document.getElementById('acctChip').click()");
  await cdp.sleep(500);
  await p.shot('test/v41-5-mobile-modal.png');
  r = await p.eval(`(() => {
    const c = document.querySelector('.acctcard').getBoundingClientRect();
    return { h: Math.round(c.height), y: Math.round(c.y), vh: innerHeight };
  })()`);
  ok(r.h <= r.vh && r.y >= 0, '手機彈窗完整落在畫面內（' + r.h + 'px）');

  console.log('\n[v41-browser] ' + pass + ' 通過、' + fail + ' 失敗');
  b.close();
  process.exit(fail ? 1 : 0);
})().catch(function (e) {
  console.error('測試失敗：', e && e.stack || e);
  process.exit(1);
});
