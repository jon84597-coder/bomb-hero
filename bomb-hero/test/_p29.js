/* _p29.js —— 真瀏覽器驗證「伺服器假死 → 出現喚醒頁」
   為什麼不用 CDP 的 Network.emulateNetworkConditions：
     它只影響「頁面」這個 target，Service Worker 的 fetch 走的是另一個 target，
     設了也不會掛住（實測：畫面照樣載入遊戲本體，假陰性）。
   所以改用最精確的模擬：起一個「只 accept、永不回應」的 HTTP server ——
   這正是 2026-11-08 Render 假死的形態（TCP 連得上，資料永遠不回來）。
   流程：正常 server 開一次（讓 SW 註冊＋快取）→ 清快取（模擬新裝置）
        → 換成掛住的 server → 導航 → 應在 10 秒後出現喚醒頁。 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { launch, sleep } = require('./cdp');

const PORT = 8090;
/* 注意：sync-public.js 的產物在「專案根目錄/public」，不是 bomb-hero/public */
const ROOT = path.join(__dirname, '..', '..', 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png',
  '.css': 'text/css; charset=utf-8', '.ico': 'image/x-icon', '.svg': 'image/svg+xml'
};

function startStatic() {
  return new Promise(function (resolve) {
    const s = http.createServer(function (req, res) {
      let p = req.url.split('?')[0];
      if (p === '/') p = '/index.html';
      const f = path.join(ROOT, decodeURIComponent(p));
      fs.readFile(f, function (e, d) {
        if (e) { res.writeHead(404); res.end('nf'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
        res.end(d);
      });
    });
    s.listen(PORT, '127.0.0.1', function () { resolve(s); });
  });
}

/* 只 accept、永不回應 */
function startHang() {
  return new Promise(function (resolve, reject) {
    const s = http.createServer(function () { /* 刻意不 reply */ });
    let tries = 0;
    function go() {
      s.listen(PORT, '127.0.0.1', function () { resolve(s); });
      s.on('error', function (e) {
        if (e.code === 'EADDRINUSE' && tries++ < 20) { setTimeout(go, 150); return; }
        reject(e);
      });
    }
    go();
  });
}

function stop(s) {
  return new Promise(function (resolve) {
    try { if (s.closeAllConnections) s.closeAllConnections(); } catch (e) {}
    s.close(function () { resolve(); });
  });
}

(async function () {
  let srv = await startStatic();
  const cdp = await launch({ port: 9518, w: 900, h: 430 });
  const p = await cdp.newPage();
  await p.resize(900, 430, true);

  /* ① 正常開一次 → SW 註冊（第一次訪問 controller 本來就是 null，要再開一次才接管） */
  await p.goto('http://127.0.0.1:' + PORT + '/index.html', 4000);
  await sleep(1500);
  console.log('① 首次載入:', await p.eval(`(function(){
    return JSON.stringify({
      title: document.title,
      ver: (document.getElementById('verTxt')||{}).textContent || null,
      sv: !!(navigator.serviceWorker && navigator.serviceWorker.controller)
    });
  })()`));

  await p.goto('http://127.0.0.1:' + PORT + '/index.html', 4000);
  await sleep(1200);
  console.log('①b 第二次載入（SW 應已接管）:', await p.eval(`(function(){
    return JSON.stringify({
      ver: (document.getElementById('verTxt')||{}).textContent || null,
      sv: !!(navigator.serviceWorker && navigator.serviceWorker.controller),
      caches: '待查'
    });
  })()`));

  /* ② 清快取 → 模擬「沒開過這個站」的裝置 */
  console.log('② 清快取:', await p.eval(`(function(){
    return caches.keys().then(function(k){
      return Promise.all(k.map(function(n){ return caches.delete(n); }));
    }).then(function(){ return caches.keys(); })
      .then(function(left){ return '剩下 ' + left.length + ' 個'; });
  })()`));

  /* ③ 擋掉喚醒頁自己的自動重試，方便穩定讀取 */
  await p.send('Page.addScriptToEvaluateOnNewDocument', {
    source: 'try{Location.prototype.reload=function(){window.__rb=(window.__rb||0)+1;};}catch(e){}'
  });

  /* ④ 換成「掛住」的 server */
  await stop(srv);
  srv = await startHang();
  console.log('④ 已切換成「只 accept、永不回應」（模擬 Render 假死）');

  const t0 = Date.now();
  /* 用 eval 觸發導航再放掉 —— Page.navigate 會一直等到回應，而這裡的請求永遠不回應 */
  await p.eval('setTimeout(function(){location.href="/index.html?dead=1"},60); 1');
  await sleep(11500);

  const r = await p.eval(`(function(){
    var b = document.body;
    return JSON.stringify({
      title: document.title,
      txt: (b ? (b.innerText || '') : '').replace(/\\s+/g, ' ').slice(0, 80),
      hasBtn: !!document.querySelector('button')
    });
  })()`);
  console.log('③ 掛住 ' + Math.round((Date.now() - t0) / 1000) + ' 秒後:', r);

  const ok1 = /伺服器正在喚醒|Waking the server/.test(r);
  console.log(ok1 ? '✅ 出現喚醒頁（舊版這裡會一直轉圈）' : '❌ 沒看到喚醒頁');

  /* ⑤ 恢復正常 server，確認能打開遊戲 */
  await stop(srv);
  srv = await startStatic();
  await p.send('Page.addScriptToEvaluateOnNewDocument', {
    source: 'try{delete Location.prototype.reload;}catch(e){}'
  }).catch(function () {});
  await p.goto('http://127.0.0.1:' + PORT + '/index.html', 5000);
  await sleep(700);
  console.log('④ 恢復後:', await p.eval(`(function(){
    return JSON.stringify({
      ver: (document.getElementById('verTxt')||{}).textContent,
      on: (document.querySelector('.screen.on')||{}).id
    });
  })()`));

  cdp.close();
  await stop(srv);
  process.exit(ok1 ? 0 : 1);
})().catch(function (e) { console.error('FAIL', e && e.message); process.exit(2); });
