// test/_smoke490.js —— v4.90 實機：開發者後台（桌機／手機）＋ 手把面板
// 跑法：node test/_smoke490.js
const { launch, sleep } = require('./cdp');
const URL = process.env.BH_URL || 'file:///C:/Users/jon84/WorkBuddy/2026-10-30-12-58-54/bomb-hero/index.html';

// 假資料：24 個帳號（含長名稱、停權、DEV、超長 Email），用來壓力測版面
const FAKE = `(function(){
  const accts = [];
  const names = ['阿明','小美','BomberKing','超長的名字測試用帳號看看會不會擠爆版面','遊客7712','Ken','小龍女','玩家' + 1];
  for (let i = 0; i < 24; i++) {
    accts.push({
      id: 'u' + (1000 + i) + 'abcdef0123456789',
      kind: i % 3 === 0 ? 'guest' : 'member',
      name: names[i % names.length] + (i > 7 ? i : ''),
      username: i % 2 ? ('user' + i) : '',
      email: i % 2 ? ('very.long.address.for.testing.scroll.' + i + '@example.com') : '',
      provider: ['google','facebook','line','web','guest'][i % 5],
      sub: i % 3 ? ('1180' + (100000000 + i)) : '',
      dev: i === 0, banned: i === 5 ? { at: Date.now() - 86400000, reason: '測試停權' } : null,
      ip: '203.0.113.' + (i + 1), firstIp: '198.51.100.' + (i + 1),
      ips: ['203.0.113.' + (i + 1), '198.51.100.' + (i + 1), '10.0.0.' + (i + 1)],
      created: Date.now() - i * 3600000, createdStr: '2026-11-0' + (1 + (i % 5)) + ' 1' + (i % 9) + ':00:00',
      lastSeen: Date.now() - i * 600000, lastSeenStr: '2026-11-05 02:0' + (i % 9) + ':00',
      logins: 40 - i, cleared: (i * 3) % 33, gold: i * 137,
      hasPass: i % 3 === 0
    });
  }
  const overview = {
    ok: true,
    stats: { accounts: 24, members: 16, guests: 8, devs: 1, banned: 1, newToday: 6, online24h: 11,
      tamper: 3, rateLimited: 12, registers: 31, webLogins: 18, logins: 96, bindings: 4 },
    announce: { text: '今晚 10 點維護，約 10 分鐘', until: Date.now() + 86400000 },
    accounts: accts, devEmails: ['jon84597@gmail.com'],
    dataEphemeral: false, persistWarning: ''
  };
  const detail = Object.assign({}, accts[0], {
    alloc: { hp: 3, def: 2, spd: 1, atk: 4 }, points: 22, spent: 10, playSec: 3725,
    stages: { '1': 4, '2': 3, '5': 1, '12': 2 },
    events: [
      { t: Date.now(), str: '2026-11-05 02:00:01', type: 'stage_clear', stage: 12, cleared: 13 },
      { t: Date.now(), str: '2026-11-05 01:58:22', type: 'item', stage: 12 },
      { t: Date.now(), str: '2026-11-05 01:55:09', type: 'alloc' }
    ]
  });
  const dump = {
    ok: true, at: Date.now(), stats: overview.stats, accounts: accts,
    devices: { 'd1': 'u1000', 'd2': 'u1001' }, lb: { v: 1, days: { '2026-11-05': { list: [] } } },
    announce: overview.announce,
    flags: { version: '4.90.0', ephemeral: false, persistWarning: '', devEmails: ['jon84597@gmail.com'] }
  };
  const health = { ok: true, rooms: 2, relay: 2, players: 5, accounts: 14, tamper: 3,
    storage: 'supabase', storageLoaded: true, storageError: '', storageWrites: 36, storageFails: 0,
    storageDiag: { urlHost: 'xxxx.supabase.co', table: 'bh_kv', keyLen: 41, keyPfx: 'sb_secret_',
      keyHash: '6ecbf320', keySet: true, keyNameWarn: '', envNames: ['BH_SUPABASE_KEY:41', 'BH_SUPABASE_URL:40'] },
    bootAt: Date.now() - 3600000, uptimeSec: 3600 };
  const lb = { ok: true, mode: 'daily', day: '2026-11-05', count: 3, today: '2026-11-05',
    list: [{ name: '阿明', score: 1240, at: Date.now() }, { name: 'BomberKing', score: 980, at: Date.now() }, { name: 'Ken', score: 640, at: Date.now() }] };

  window.__FAKE = { overview: overview, detail: detail, dump: dump, health: health, lb: lb };
  window.fetch = function (u) {
    const s = String(u);
    let body = { ok: false, err: 'NET' };
    if (s.indexOf('/api/admin/overview') >= 0) body = overview;
    else if (s.indexOf('/api/admin/dump') >= 0) body = dump;
    else if (s.indexOf('/api/admin/player') >= 0) body = { ok: true, account: detail };
    else if (s.indexOf('/api/health') >= 0) body = health;
    else if (s.indexOf('/api/lb/top') >= 0) body = lb;
    return Promise.resolve({ status: 200, json: function () { return Promise.resolve(body); } });
  };
  try { __BH.Cloud.isDev = function () { return true; }; } catch (e) {}
  return 1;
})()`;

const PROBE = `(function(){
  const q = function (s) { return document.querySelector(s); };
  const qa = function (s) { return document.querySelectorAll(s); };
  const card = q('.adcard');
  const list = q('#adList');
  return {
    on: !!(q('#adminModal') && q('#adminModal').classList.contains('on')),
    tabs: qa('#adTabs button[data-tab]').length,
    panes: qa('#adminModal .adpane').length,
    activePanes: qa('#adminModal .adpane.on').length,
    rows: qa('#adList .adrow').length,
    stats: qa('#adStats .adstat').length,
    healthRows: qa('#adHealth > div').length,
    recentRows: qa('#adRecent .adrow').length,
    cardW: card ? Math.round(card.getBoundingClientRect().width) : 0,
    cardH: card ? Math.round(card.getBoundingClientRect().height) : 0,
    listH: list ? Math.round(list.getBoundingClientRect().height) : 0,
    docW: Math.round(document.documentElement.scrollWidth),
    winW: window.innerWidth,
    detailShown: !!(q('#adDetail') && q('#adDetail').getBoundingClientRect().height > 40),
    splitDetail: !!(q('#adSplit') && q('#adSplit').classList.contains('show-detail')),
    rawLen: (q('#adRaw') ? q('#adRaw').textContent.length : 0)
  };
})()`;

(async () => {
  const b = await launch({ w: 1366, h: 860 });
  const p = await b.newPage();
  await p.goto(URL + '?cb=' + Date.now(), 1500);
  for (let i = 0; i < 80; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(250); }
  await sleep(500);
  console.log('VERSION', await p.eval('__BH.VERSION'));

  await p.eval(FAKE);
  await p.eval("__BH.Admin.open();1");
  await sleep(800);
  const desk = await p.eval(PROBE);
  console.log('desktop', JSON.stringify(desk));
  await p.shot('test/_smoke490-desktop-home.png');

  // 會員頁：左清單 + 右詳情
  await p.eval("(function(){document.querySelector('#adTabs button[data-tab=members]').click();return 1;})()");
  await sleep(200);
  await p.eval("(function(){var r=document.querySelector('#adList .adrow'); if(r) r.click(); return 1;})()");
  await sleep(300);
  const mem = await p.eval(PROBE);
  console.log('desktop-members', JSON.stringify(mem));
  await p.shot('test/_smoke490-desktop-members.png');

  // 系統頁：原始 JSON 要出來
  await p.eval("(function(){document.querySelector('#adTabs button[data-tab=system]').click();return 1;})()");
  await sleep(250);
  const sys = await p.eval(PROBE);
  console.log('desktop-system', JSON.stringify({ rawLen: sys.rawLen, activePanes: sys.activePanes }));
  await p.shot('test/_smoke490-desktop-system.png');

  // 即時頁：排行榜
  await p.eval("(function(){document.querySelector('#adTabs button[data-tab=live]').click();return 1;})()");
  await sleep(500);
  console.log('lb rows', await p.eval("document.querySelectorAll('#adLbList .adrow').length"));

  // ---------- 手機 ----------
  await p.resize(390, 844, true);
  await sleep(400);
  await p.eval("(function(){document.querySelector('#adTabs button[data-tab=members]').click();return 1;})()");
  await sleep(250);
  await p.eval("(function(){var s=document.querySelector('#adSplit'); if(s) s.classList.remove('show-detail'); return 1;})()");
  const m1 = await p.eval(PROBE);
  console.log('mobile-list', JSON.stringify(m1));
  await p.shot('test/_smoke490-mobile-list.png');

  await p.eval("(function(){var r=document.querySelector('#adList .adrow'); if(r) r.click(); return 1;})()");
  await sleep(350);
  const m2 = await p.eval(PROBE);
  console.log('mobile-detail', JSON.stringify({ splitDetail: m2.splitDetail, detailShown: m2.detailShown, docW: m2.docW, winW: m2.winW }));
  await p.shot('test/_smoke490-mobile-detail.png');

  // 返回名單
  await p.eval("(function(){var b=document.querySelector('[data-adm=back]'); if(b) b.click(); return 1;})()");
  await sleep(250);
  console.log('back to list', await p.eval("!(document.querySelector('#adSplit').classList.contains('show-detail'))"));

  // ---------- 手把面板（無手把時要有說明文字） ----------
  await p.eval("(function(){ __BH.Admin.close(); __BH.Screen.show('settings'); return 1; })()");
  await sleep(400);
  console.log('pad panel', await p.eval(`(function(){
    const el = document.querySelector('#padList');
    return el ? { exists: true, text: (el.textContent||'').slice(0, 40), visible: !!el.offsetParent } : { exists: false };
  })()`));
  await p.shot('test/_smoke490-pad-panel.png');

  // ---------- 模擬兩支手把：看得到列、可以改派、即時按鍵 ----------
  await p.eval(`(function(){
    const mk = function (id, idx) {
      return { id: id, index: idx, connected: true, mapping: 'standard',
        buttons: new Array(17).fill(0).map(function () { return { pressed: false, value: 0 }; }),
        axes: [0.12, -0.34, 0, 0] };
    };
    window.__pads = [
      mk('Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e)', 0),
      mk('DUALSHOCK 4 Wireless Controller (STANDARD GAMEPAD Vendor: 054c)', 1)
    ];
    navigator.getGamepads = function () { return window.__pads; };
    window.dispatchEvent(new Event('gamepadconnected'));
    return 1;
  })()`);
  await sleep(400);
  console.log('pads', JSON.stringify(await p.eval(`(function(){
    const rows = document.querySelectorAll('#padList .padrow');
    return { rows: rows.length,
      names: [].map.call(rows, function (r) { return (r.querySelector('b')||{}).textContent; }),
      slots: [].map.call(rows, function (r) { const s = r.querySelector('.padslot'); return s ? s.textContent : '-'; }) };
  })()`)));
  await p.shot('test/_smoke490-pad-two.png');

  // 按下 1P 的 A 鍵 → 即時面板要顯示出來
  await p.eval('(function(){ window.__pads[0].buttons[0].pressed = true; return 1; })()');
  await sleep(400);
  console.log('live', JSON.stringify(await p.eval("(document.querySelector('#padLive')||{}).textContent")));
  await p.shot('test/_smoke490-pad-live.png');

  // 把第 2 支改派到 4P
  const reassign = await p.eval(`(function(){
    const sel = document.querySelectorAll('#padList .padsel')[1];
    if (!sel) return 'no sel';
    sel.value = '3';
    sel.dispatchEvent(new Event('change', {bubbles:true}));
    const info = __BH.Input.padInfo();
    return JSON.stringify({ slots: info.slots, saved: localStorage.getItem('bombhero-pads-v1') });
  })()`);
  console.log('reassign', reassign);

  b.close();
  console.log('done');
})().catch(e => { console.error(e); process.exit(1); });
