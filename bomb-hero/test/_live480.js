// test/_live480.js — 線上驗證 v4.80：每日挑戰 + 排行榜（Pages 前端 / Render 後端）
//   用法：node test/_live480.js [網址]
//   預設打 GitHub Pages；排行榜 API 另外直連 Render（Pages 是純靜態，/api/* 一定 404）。
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL: NodeURL } = require('url');
const { launch, sleep } = require('./cdp');

const PAGE = process.argv[2] || 'https://jon84597-coder.github.io/bomb-hero/';
const BASE = PAGE.replace(/\/?$/, '/');
const API = process.env.BH_API || 'https://bomb-hero-game.onrender.com';
const WANT = /const VERSION = '([^']+)'/.exec(fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8'))[1];

let pass = 0, fail = 0;
const ok = (n, c, e) => { if (c) { pass++; console.log('  ✓ ' + n + (e ? '（' + e + '）' : '')); } else { fail++; console.log('  ✗ ' + n + (e ? '（' + e + '）' : '')); } };

// ── 通用請求（GET / POST JSON），http+https 都吃
function req(u, opt) {
  opt = opt || {};
  return new Promise((res, rej) => {
    const U = new NodeURL(u);
    const lib = U.protocol === 'https:' ? https : http;
    const body = opt.body ? Buffer.from(JSON.stringify(opt.body)) : null;
    const headers = Object.assign({
      'Cache-Control': 'no-cache',
      'User-Agent': 'bh-live-test/4.80',
      'Accept-Encoding': 'gzip'
    }, opt.headers || {});
    if (body) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = String(body.length); }
    const r = lib.request({
      protocol: U.protocol, hostname: U.hostname, port: U.port,
      path: U.pathname + (U.search || ''), method: opt.method || (body ? 'POST' : 'GET'), headers
    }, resp => {
      const ch = [];
      resp.on('data', c => ch.push(c));
      resp.on('end', () => {
        let raw = Buffer.concat(ch);
        if ((resp.headers['content-encoding'] || '') === 'gzip') {
          try { raw = require('zlib').gunzipSync(raw); } catch (e) {}
        }
        const txt = raw.toString('utf8');
        let json = null;
        try { json = JSON.parse(txt); } catch (e) {}
        res({ status: resp.statusCode, head: resp.headers, text: txt, json });
      });
    });
    r.on('error', rej);
    r.setTimeout(opt.timeout || 25000, () => r.destroy(new Error('timeout')));
    if (body) r.write(body);
    r.end();
  });
}

function pad2(n) { return (n < 10 ? '0' : '') + n; }
function todayKey() {           // 與前端 dailyDayKey() 相同的 UTC+8 換日
  const u = new Date(Date.now() + 8 * 3600000);
  return u.getUTCFullYear() + '-' + pad2(u.getUTCMonth() + 1) + '-' + pad2(u.getUTCDate());
}

(async () => {
  const DAY = todayKey();
  console.log('=== 1. 前端檔案層（' + BASE + '）===');
  const idx = await req(BASE + 'index.html?x=' + Date.now());
  ok('index.html HTTP 200', idx.status === 200, String(idx.status));
  const ver = (/const VERSION = '([^']+)'/.exec(idx.text) || [])[1];
  ok('線上版本 = ' + WANT, ver === WANT, ver);
  ok('HTML 有 btnDaily', idx.text.indexOf('id="btnDaily"') > 0);
  ok('HTML 有 scr-daily', idx.text.indexOf('id="scr-daily"') > 0);
  ok('HTML 有 /api/lb/ 端點字串', idx.text.indexOf('/api/lb/') > 0);

  const sw = await req(BASE + 'sw.js?x=' + Date.now());
  const swv = (/SW_VERSION = '([^']+)'/.exec(sw.text) || [])[1];
  ok('線上 sw.js = v' + WANT + '.0', swv === 'v' + WANT + '.0', swv);

  console.log('\n=== 2. 後端排行榜 API（' + API + '）===');
  let top = null;
  for (let i = 0; i < 12; i++) {          // Render 冷啟動：最多等 60 秒
    try {
      top = await req(API + '/api/lb/top?mode=daily&day=' + DAY + '&limit=50');
      if (top.status === 200) break;
    } catch (e) { top = { status: 0, text: String(e.message) }; }
    await sleep(5000);
  }
  ok('/api/lb/top HTTP 200', !!top && top.status === 200, top ? String(top.status) : 'no-resp');
  ok('top 回傳 ok:true', !!(top && top.json && top.json.ok === true), top && top.json ? JSON.stringify(top.json).slice(0, 80) : (top ? top.text.slice(0, 80) : ''));
  ok('top.day = 今天（UTC+8）', !!(top && top.json && top.json.day === DAY), top && top.json ? top.json.day : '-');
  ok('top.list 是陣列', !!(top && top.json && Array.isArray(top.json.list)), top && top.json ? 'len=' + top.json.list.length : '-');
  ok('top 有 CORS（ACAO:*）', !!(top && top.head && top.head['access-control-allow-origin'] === '*'), top && top.head ? String(top.head['access-control-allow-origin']) : '-');
  const pre = await req(API + '/api/lb/submit', { method: 'OPTIONS', headers: { Origin: PAGE.replace(/\/$/, ''), 'Access-Control-Request-Method': 'POST' } });
  ok('submit 的 OPTIONS 預檢放行', pre.status === 200 || pre.status === 204, String(pre.status));

  // 送一筆「最慢」的測試成績：一定排在榜尾，不會干擾真實玩家
  // deviceId 固定 → 重複跑只會走「只升級不降級」那條，不會每天多一筆垃圾紀錄
  const devId = 'bh-livetest-fixed-device';
  const sub = await req(API + '/api/lb/submit', {
    body: { mode: 'daily', day: DAY, name: 'TESTER', ms: 3599000, deviceId: devId }
  });
  ok('submit HTTP 200', sub.status === 200, String(sub.status));
  ok('submit 回 ok:true', !!(sub.json && sub.json.ok === true), sub.json ? JSON.stringify(sub.json).slice(0, 100) : sub.text.slice(0, 100));
  ok('submit 回 rank 數字', !!(sub.json && typeof sub.json.rank === 'number'), sub.json ? String(sub.json.rank) + '/' + sub.json.total : '-');

  const top2 = await req(API + '/api/lb/top?mode=daily&day=' + DAY + '&limit=50');
  const list2 = (top2.json && top2.json.list) || [];
  ok('送出後 top 看得到 TESTER', list2.some(e => e.n === 'TESTER'), '共 ' + list2.length + ' 筆');
  ok('榜單照秒數排序', list2.every((e, i) => i === 0 || list2[i - 1].ms <= e.ms), list2.map(e => e.ms).slice(0, 4).join(','));

  const bad = await req(API + '/api/lb/submit', { body: { mode: 'daily', day: DAY, name: 'X', ms: 100, deviceId: devId } });
  ok('不合理的秒數被擋（BAD_TIME）', !!(bad.json && bad.json.err === 'BAD_TIME'), bad.json ? bad.json.err : bad.text.slice(0, 60));
  const wrongDay = await req(API + '/api/lb/submit', { body: { mode: 'daily', day: '2020-01-01', name: 'X', ms: 60000, deviceId: devId } });
  ok('非今天的日期被擋（WRONG_DAY）', !!(wrongDay.json && wrongDay.json.err === 'WRONG_DAY'), wrongDay.json ? wrongDay.json.err : wrongDay.text.slice(0, 60));
  const badMode = await req(API + '/api/lb/top?mode=nope');
  ok('未知模式回 400', badMode.status === 400, String(badMode.status));

  console.log('\n=== 3. 瀏覽器層 ===');
  const b = await launch({ w: 1280, h: 800 });
  const p = await b.newPage();
  await p.send('Runtime.enable');
  await p.goto(BASE, 3000);
  await p.eval("window.__BH_ERRS=[];window.addEventListener('error',function(e){window.__BH_ERRS.push(String(e.message))});window.addEventListener('unhandledrejection',function(e){window.__BH_ERRS.push('rej:'+e.reason)});1");
  for (let i = 0; i < 50; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(300); }
  ok('頁面載入 __BH', (await p.eval('typeof __BH')) === 'object');
  ok('瀏覽器內版本 = ' + WANT, (await p.eval('__BH.VERSION')) === WANT, await p.eval('__BH.VERSION'));

  ok('主選單有每日挑戰按鈕', (await p.eval("!!document.getElementById('btnDaily')")) === true);
  ok('主選單有排行榜按鈕', (await p.eval("!!document.getElementById('btnLb')")) === true);

  // 直接開每日挑戰畫面（跳過暱稱彈窗）
  await p.eval("try{__BH.Screen.show('daily');__BH.renderDailyScreen();}catch(e){window.__BH_ERRS.push('daily:'+e.message)};1");
  await sleep(600);
  ok('scr-daily 已顯示', (await p.eval("document.getElementById('scr-daily').classList.contains('on')")) === true);
  const dayTxt = await p.eval("document.getElementById('dailyDay').textContent");
  ok('畫面日期 = 今天', dayTxt === DAY, dayTxt);
  const seedTxt = await p.eval("document.getElementById('dailySeed').textContent");
  ok('畫面有 5 碼種子', /^[0-9A-Z]{5}$/.test(seedTxt || ''), seedTxt);
  const stTxt = await p.eval("document.getElementById('dailyStage').textContent");
  ok('畫面有今日關卡', /\d/.test(stTxt || ''), stTxt);
  const goTxt = await p.eval("document.getElementById('btnDailyGo').textContent");
  ok('開始按鈕標示 3:00', goTxt.indexOf('3:00') >= 0, goTxt.trim());
  ok('Lb.origin() 指向後端', (await p.eval('__BH.Lb.origin()')) === API.replace('https://', 'https://'), await p.eval('__BH.Lb.origin()'));

  // 榜單是否真的從網路拉回來（首次連線可能 10~20 秒，等寬一點）
  let lbTxt = '';
  for (let i = 0; i < 35; i++) {
    lbTxt = await p.eval("(document.getElementById('lbList').textContent||'')+'|'+(document.getElementById('lbHint').textContent||'')");
    if (lbTxt.indexOf('TESTER') >= 0) break;
    await sleep(1000);
  }
  ok('線上榜單抓到 TESTER', lbTxt.indexOf('TESTER') >= 0, lbTxt.replace(/\s+/g, ' ').slice(0, 90));
  ok('榜單沒有「離線」提示', lbTxt.indexOf('離線') < 0, lbTxt.indexOf('離線') >= 0 ? '出現離線字樣' : 'ok');

  // 重新整理按鈕：按了要真的再打一次（曾經只換文字、沒有 click 監聽）
  const before = await p.eval('__BH.Lb.last && __BH.Lb.last.at');
  await p.eval("document.getElementById('btnLbReload').click();1");
  let reloaded = 0;
  for (let i = 0; i < 25; i++) {
    reloaded = await p.eval('(__BH.Lb.last && __BH.Lb.last.at) || 0');
    if (reloaded && reloaded !== before) break;
    await sleep(800);
  }
  ok('重新整理會重新抓榜（last.at 有變）', reloaded && reloaded !== before, String(before) + ' → ' + String(reloaded));

  // 每日挑戰真的開得起來、且地圖是決定性的
  const run = await p.eval(`(function(){
    try{
      __BH.Daily.begin();
      var G = __BH.Game;
      G.state='play'; G.countdown=0; G.camSnap=true; __BH.updateCamera(1/60); __BH.render();
      return JSON.stringify({ state:G.state, daily:!!G.daily, day:G.daily&&G.daily.day,
        seed:G.daily&&G.daily.seed, timer:Math.round(G.timer), foes:G.enemies.length,
        door:G.door? (G.door.x+','+G.door.y) : null,
        hidden:G.hidden? Object.keys(G.hidden).length : 0, gems:G.gems? G.gems.length : 0 });
    }catch(e){ return 'ERR:'+e.message; }
  })()`);
  let R = {};
  try { R = JSON.parse(run); } catch (e) { R = { err: run }; }
  ok('Daily.begin() 進得去', R.state === 'play', JSON.stringify(R).slice(0, 150));
  ok('Game.daily 帶著今天的日期', R.day === DAY, R.day);
  ok('每日挑戰計時 180 秒', R.timer === 180, String(R.timer));
  // 道具是藏在軟磚裡、開局一定是 0，所以驗「藏寶」而不是 Game.items
  ok('每日挑戰有小怪與藏寶', R.foes > 0 && R.hidden > 0, R.foes + ' 隻 / 藏寶 ' + R.hidden + ' 處');
  const fp = await p.eval(`(function(){
    try{
      var a=__BH.dailySeedOf(__BH.dailyDayKey()), s=__BH.dailyStageOf(a);
      function sig(){
        var G=__BH.Game, h=G.hidden? Object.keys(G.hidden).sort().join(',') : '';
        return [G.enemies.length, (G.door.x+','+G.door.y), h.length, h.slice(0,1)].join('|');
      }
      __BH.Game.daily=null; __BH.startSolo(s,false); var g1=sig();
      __BH.Game.daily=null; __BH.startSolo(s,false); var g2=sig();
      return g1+' :: '+g2;
    }catch(e){ return 'ERR:'+e.message; }
  })()`);
  ok('一般模式兩次生成一致（不誤觸種子）', String(fp).split(' :: ')[0] === String(fp).split(' :: ')[1], String(fp));

  const errs = await p.eval("(window.__BH_ERRS||[]).length");
  ok('執行期錯誤 0', errs === 0, (errs ? JSON.stringify(await p.eval('window.__BH_ERRS.slice(0,3)')) : '0'));

  try { await b.close(); } catch (e) {}
  console.log('\n' + (fail ? '✗ ' + fail + ' 失敗 / ' + pass + ' 通過' : '✅ ' + pass + ' 項全通過'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
