// v3.6：統計 API（瀏覽人數 / 按讚）端到端測試 —— 真的開 server 打，含落盤與重啟後續讀
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3422;
const SRV = path.join(__dirname, '../../bomberman-online/server.js');
const DATA = path.join(__dirname, '../../bomberman-online/data/stats.json');
const BASE = 'http://127.0.0.1:' + PORT;
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ FAIL: ' + m); } }

// 每次測試都從乾淨的統計開始
try { fs.unlinkSync(DATA); } catch (e) {}

function post(p, body) {
  return fetch(BASE + p, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  }).then(r => r.text().then(t => { try { return { status: r.status, json: JSON.parse(t || '{}') }; } catch (e) { return { status: r.status, json: {} }; } }));
}
const get = p => fetch(BASE + p).then(r => r.text().then(t => { try { return { status: r.status, json: JSON.parse(t || '{}') }; } catch (e) { return { status: r.status, json: {} }; } }));
const sleep = ms => new Promise(r => setTimeout(r, ms));

function start(port) {
  const srv = spawn(process.execPath, [SRV], {
    env: Object.assign({}, process.env, { PORT: String(port) }), stdio: ['ignore', 'pipe', 'pipe']
  });
  let log = '';
  srv.stdout.on('data', d => log += d);
  srv.stderr.on('data', d => log += d);
  return srv;
}
async function waitUp(port) {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch('http://127.0.0.1:' + port + '/api/health');
      const j = await r.json();
      if (j && j.ok) return true;
    } catch (e) {}
    await sleep(100);
  }
  return false;
}

(async function () {
  const srv = start(PORT);
  try {
    ok(await waitUp(PORT), '伺服器在 ' + PORT + ' 埠啟動');

    // ---- 初始值 ----
    let g = await get('/api/stats');
    ok(g.status === 200, 'GET /api/stats 回 200');
    ok(g.json.ok === true, 'GET /api/stats 回 ok');
    ok(g.json.views === 0 && g.json.likes === 0, '初始 views=0、likes=0');
    ok(typeof g.json.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(g.json.day), '有今天日期 day=' + g.json.day);
    ok(g.json.dayViews === 0, '初始 dayViews=0');

    // ---- 瀏覽：同一訪客只算一次 ----
    let r = await post('/api/stats/view', { vid: 'vid-A' });
    ok(r.json.views === 1 && r.json.fresh === true, '訪客 A 第一次進來 → views=1（fresh）');
    ok(r.json.dayViews === 1, '今日瀏覽 +1');
    r = await post('/api/stats/view', { vid: 'vid-A' });
    ok(r.json.views === 1 && r.json.fresh === false, '訪客 A 再進來 → views 還是 1（不重複算）');
    ok(r.json.dayViews === 1, '今日瀏覽沒有被灌水');
    r = await post('/api/stats/view', { vid: 'vid-B' });
    ok(r.json.views === 2, '訪客 B 進來 → views=2');
    r = await post('/api/stats/view', {});
    ok(r.json.views === 3, '沒帶 vid → 也算一次瀏覽');

    // ---- 按讚：一人一次，可收回 ----
    r = await post('/api/stats/like', { vid: 'vid-A' });
    ok(r.json.likes === 1 && r.json.liked === true, 'A 按讚 → likes=1、liked=true');
    r = await post('/api/stats/like', { vid: 'vid-A' });
    ok(r.json.likes === 1 && r.json.liked === true, 'A 重複按讚 → 仍然是 1（不灌水）');
    r = await post('/api/stats/like', { vid: 'vid-B' });
    ok(r.json.likes === 2, 'B 按讚 → likes=2');
    r = await post('/api/stats/like', { vid: 'vid-B', undo: true });
    ok(r.json.likes === 1 && r.json.liked === false, 'B 收回讚 → likes=1、liked=false');
    r = await post('/api/stats/like', { vid: 'vid-B', undo: true });
    ok(r.json.likes === 1, 'B 重複收回 → 不會變負數');
    r = await post('/api/stats/like', { vid: 'vid-C', d: -1 });
    ok(r.json.likes === 1, '沒按過讚的人收回 → 不會減到別人的讚');

    // ---- 瀏覽與按讚互不干擾 ----
    g = await get('/api/stats');
    ok(g.json.views === 3 && g.json.likes === 1, 'GET 回來 views=3、likes=1');
    ok(g.json.dayViews === 3, '今日瀏覽 3');

    // ---- /api/health 也帶統計 ----
    const h = await get('/api/health');
    ok(h.json.views === 3 && h.json.likes === 1, '/api/health 也回傳 views/likes');

    // ---- 落盤（10 秒寫一次）----
    await sleep(11500);
    let file = null;
    try { file = JSON.parse(fs.readFileSync(DATA, 'utf8')); } catch (e) {}
    ok(!!file, 'data/stats.json 已自動產生');
    if (file) {
      ok(file.views === 3 && file.likes === 1, '檔案內容 views=3、likes=1');
      ok(Array.isArray(file.vids) && file.vids.length === 2, '檔案記住 2 個訪客 id（去重用；沒帶 id 的不記）');
      ok(Array.isArray(file.likers) && file.likers.length === 1, '檔案記住 1 個按讚的人');
    }
  } finally {
    srv.kill();
  }

  // ---- 重新啟動後要續讀（不能歸零）----
  const srv2 = start(PORT + 1);
  try {
    ok(await waitUp(PORT + 1), '重開第二個伺服器');
    const g2 = await fetch('http://127.0.0.1:' + (PORT + 1) + '/api/stats').then(r => r.json());
    ok(g2.views === 3, '重開後讀回 views=3（沒有歸零）');
    ok(g2.likes === 1, '重開後讀回 likes=1');
    const r2 = await fetch('http://127.0.0.1:' + (PORT + 1) + '/api/stats/view', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vid: 'vid-A' })
    }).then(r => r.json());
    ok(r2.views === 3 && r2.fresh === false, '重開後 A 再進來仍然不算新訪客');
  } finally {
    srv2.kill();
  }

  try { fs.unlinkSync(DATA); } catch (e) {}
  console.log('\n[net-stats] ' + pass + ' 通過、' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
