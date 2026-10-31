// v3.7：Render 持久化相關的統計後端測試
//  1. STATS_PATH 環境變數：存檔真的指到別的地方（Render Persistent Disk 用）
//  2. SIGTERM 優雅存檔：不等 3 秒定時器，收到結束訊號立刻落盤（Render 休眠／重新部署）
//  3. GET /api/stats/snapshot：完整快照（含 vids / likers）
//  4. STATS_RESTORE_URL：容器重建後自動把數字抓回來
//  5. 落盤間隔縮短為 3 秒
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const PORT = 3425, PORT2 = 3426, PORT3 = 3427, PORT4 = 3428;
const SRV = path.join(__dirname, '../../bomberman-online/server.js');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'bhstats-'));
const CUSTOM = path.join(TMP, 'persist', 'stats.json');   // 模擬 Render 掛載的持久磁碟
const BK_PORT = 3499;                                     // 模擬「遠端備份檔」的靜態空間

let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ FAIL: ' + m); } }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = (port, p) => fetch('http://127.0.0.1:' + port + p).then(r => r.text().then(t => {
  try { return { status: r.status, json: JSON.parse(t || '{}') }; } catch (e) { return { status: r.status, json: {} }; }
}));
function post(port, p, body) {
  return fetch('http://127.0.0.1:' + port + p, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  }).then(r => r.text().then(t => {
    try { return { status: r.status, json: JSON.parse(t || '{}') }; } catch (e) { return { status: r.status, json: {} }; }
  }));
}

function start(port, env) {
  const srv = spawn(process.execPath, [SRV], {
    env: Object.assign({}, process.env, { PORT: String(port) }, env || {}),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let log = '';
  srv.stdout.on('data', d => { log += d; });
  srv.stderr.on('data', d => { log += d; });
  srv._log = () => log;
  return srv;
}
// 可控制「何時送結束訊號」的版本（Windows 只能靠 process.emit 觸發同一個 handler）
function startStoppable(port, env) {
  const srv = spawn(process.execPath, [path.join(__dirname, '_sigterm_helper.js')], {
    env: Object.assign({}, process.env, { TEST_PORT: String(port), TEST_SRV: SRV }, env || {}),
    stdio: ['pipe', 'pipe', 'pipe']
  });
  let log = '';
  srv.stdout.on('data', d => { log += d; });
  srv.stderr.on('data', d => { log += d; });
  srv._log = () => log;
  srv._sigterm = () => new Promise(res => {
    const t = setTimeout(res, 5000);
    srv.on('exit', () => { clearTimeout(t); res(); });
    try { srv.stdin.write('STOP\n'); } catch (e) { clearTimeout(t); res(); }
  });
  return srv;
}
async function waitUp(port) {
  for (let i = 0; i < 60; i++) {
    try { const j = await (await fetch('http://127.0.0.1:' + port + '/api/health')).json(); if (j && j.ok) return true; } catch (e) {}
    await sleep(100);
  }
  return false;
}
async function stop(srv) {
  if (!srv || srv.exitCode !== null) return;
  await new Promise(res => { const t = setTimeout(res, 4000); srv.on('exit', () => { clearTimeout(t); res(); }); srv.kill('SIGTERM'); });
}

(async function () {
  console.log('\n[1] STATS_PATH 環境變數（Render Persistent Disk）');
  let srv = startStoppable(PORT, { STATS_PATH: CUSTOM });
  try {
    ok(await waitUp(PORT), '用 STATS_PATH 指定的路徑啟動成功');
    ok(/存檔位置/.test(srv._log() || ''), '啟動日誌印出存檔位置');
    ok((srv._log() || '').indexOf(CUSTOM.replace(/\\/g, '/')) >= 0 ||
       (srv._log() || '').indexOf(CUSTOM) >= 0, '日誌裡的路徑就是 STATS_PATH 指定的：' + CUSTOM);

    await post(PORT, '/api/stats/view', { vid: 'disk-A' });
    await post(PORT, '/api/stats/like', { vid: 'disk-A' });
    await srv._sigterm();                              // SIGTERM → 應該立刻落盤

    ok(fs.existsSync(CUSTOM), '收到結束訊號後自訂路徑真的出現 stats.json');
    const j = JSON.parse(fs.readFileSync(CUSTOM, 'utf8'));
    ok(j.views === 1, '存檔內容 views=1（代表 SIGTERM 有觸發同步存檔）');
    ok(j.likes === 1, '存檔內容 likes=1');
    ok(Array.isArray(j.vids) && j.vids.indexOf('disk-A') >= 0, '訪客 id 有寫進去');
    ok(Array.isArray(j.likers) && j.likers.indexOf('disk-A') >= 0, '按讚名單有寫進去');
    ok(typeof j.savedAt === 'number' && j.savedAt > 0, '有 savedAt 時間戳');
    ok(!fs.existsSync(CUSTOM + '.tmp'), '沒有留下 .tmp 暫存檔');

    // 重新啟動同一個路徑 → 續讀
    const srv2 = start(PORT2, { STATS_PATH: CUSTOM });
    ok(await waitUp(PORT2), '重開後再次使用同一個持久磁碟');
    const g = await get(PORT2, '/api/stats');
    ok(g.json.views === 1 && g.json.likes === 1, '重開後續讀到 views=1 / likes=1（資料沒掉）');
    await stop(srv2);
  } catch (e) { fail++; console.log('  ✗ EXCEPTION: ' + e.message); await stop(srv); }

  console.log('\n[2] SIGTERM 優雅存檔（不等 3 秒定時器）');
  const T2 = path.join(TMP, 'sigterm', 'stats.json');
  srv = startStoppable(PORT3, { STATS_PATH: T2 });
  try {
    ok(await waitUp(PORT3), '伺服器啟動');
    await post(PORT3, '/api/stats/view', { vid: 'sig-1' });
    await post(PORT3, '/api/stats/view', { vid: 'sig-2' });
    await post(PORT3, '/api/stats/like', { vid: 'sig-1' });
    ok(!fs.existsSync(T2), '剛寫完還沒落盤（此刻檔案不存在，證明不是每次都同步寫）');
    await srv._sigterm();
    await sleep(150);
    ok(fs.existsSync(T2), '收到結束訊號之後檔案立刻出現');
    const j = JSON.parse(fs.readFileSync(T2, 'utf8'));
    ok(j.views === 2 && j.likes === 1, '存到的是最新數字 views=2 / likes=1（沒漏掉最後幾筆）');
    ok(srv.exitCode === 0, '收到結束訊號後乾淨收尾（exitCode=0）');
  } catch (e) { fail++; console.log('  ✗ EXCEPTION: ' + e.message); await stop(srv); }

  console.log('\n[3] GET /api/stats/snapshot（完整備份）');
  srv = start(PORT4, { STATS_PATH: path.join(TMP, 'snap', 'stats.json') });
  try {
    ok(await waitUp(PORT4), '伺服器啟動');
    await post(PORT4, '/api/stats/view', { vid: 'snap-A' });
    await post(PORT4, '/api/stats/view', { vid: 'snap-B' });
    await post(PORT4, '/api/stats/like', { vid: 'snap-A' });
    const s = await get(PORT4, '/api/stats/snapshot');
    ok(s.status === 200 && s.json.ok === true, 'snapshot 回 200 ok');
    ok(s.json.views === 2 && s.json.likes === 1, 'snapshot 數字正確 views=2 / likes=1');
    ok(Array.isArray(s.json.vids) && s.json.vids.length === 2, 'snapshot 含 2 個訪客 id（一般 /api/stats 不給）');
    ok(Array.isArray(s.json.likers) && s.json.likers.length === 1, 'snapshot 含按讚名單');
    ok(typeof s.json.file === 'string' && s.json.file.length > 0, 'snapshot 回報存檔路徑');

    // 把 snapshot 丟到一個假想的「遠端靜態空間」，下一段用它當還原來源
    const backup = JSON.stringify({
      views: s.json.views, likes: s.json.likes, day: s.json.day, dayViews: s.json.dayViews,
      vids: s.json.vids, likers: s.json.likers
    });
    fs.writeFileSync(path.join(TMP, 'backup.json'), backup, 'utf8');
    const bk = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(backup);
    });
    await new Promise(r => bk.listen(BK_PORT, '127.0.0.1', r));
    console.log('  （已把備份放到 http://127.0.0.1:' + BK_PORT + ' 模擬遠端靜態空間）');
    await stop(srv);

    console.log('\n[4] STATS_RESTORE_URL（容器重建後自動還原）');
    const T4 = path.join(TMP, 'restore', 'stats.json');   // 全新空磁碟，模擬 Render 重建後資料歸零
    const srv4 = start(PORT, {
      STATS_PATH: T4,
      STATS_RESTORE_URL: 'http://127.0.0.1:' + BK_PORT + '/backup.json'
    });
    ok(await waitUp(PORT), '新容器（空磁碟）啟動');
    ok(!fs.existsSync(T4), '一開始磁碟真的是空的（沒有 stats.json）');
    await sleep(1200);                                    // 等還原請求跑完
    const g1 = await get(PORT, '/api/stats');
    ok(g1.json.views === 2, '從 STATS_RESTORE_URL 還原回 views=2');
    ok(g1.json.likes === 1, '還原回 likes=1');
    ok(/STATS_RESTORE_URL/.test(srv4._log() || ''), '日誌有印出還原成功');

    // 還原後去重仍然有效：同一個訪客不會再被算一次
    const again = await post(PORT, '/api/stats/view', { vid: 'snap-A' });
    ok(again.json.views === 2 && again.json.fresh === false, '還原後 snap-A 再進來不算新訪客（去重名單也有還原）');

    // 按讚狀態也要跟著回來
    const lk = await get(PORT, '/api/stats?vid=snap-A');
    ok(lk.json.liked === true, '還原後 snap-A 的按讚狀態仍是已按讚');
    await stop(srv4);
    bk.close();
  } catch (e) { fail++; console.log('  ✗ EXCEPTION: ' + e.message); await stop(srv); }

  console.log('\n[5] 落盤間隔 3 秒（原始碼檢查）');
  try {
    const src = fs.readFileSync(SRV, 'utf8');
    ok(/setInterval\(function \(\) \{ if \(statsDirty\) saveStats\(\); \}, 3000\);/.test(src), '定時落盤間隔是 3000ms');
    ok(/process\.on\(sig, function \(\) \{/.test(src), '有註冊 SIGTERM / SIGINT / SIGHUP 處理');
    ok(/flushStatsSync/.test(src), '有同步落盤函式 flushStatsSync');
    ok(/process\.env\.STATS_PATH/.test(src), '有讀 STATS_PATH 環境變數');
    ok(/process\.env\.STATS_RESTORE_URL/.test(src), '有讀 STATS_RESTORE_URL 環境變數');
    ok(/uncaughtException/.test(src), '有攔 uncaughtException 並存檔');
  } catch (e) { fail++; console.log('  ✗ EXCEPTION: ' + e.message); }

  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {}
  console.log('\n[net-stats2] ' + pass + ' 通過、' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
})();
