/* _p28.js —— 真浏览器驗證 v5.55 的「喚醒頁」
   做法：用 CDP 把網路延遲拉到 60 秒（模擬 Render 假死：TCP 連得上但永遠不回），
        並清掉 CacheStorage（模擬新裝置／無痕），看導覽請求會不會在 10 秒後
        給出「伺服器正在喚醒」，而不是一直轉圈。 */
const path = require('path');
const { launch, sleep } = require('./cdp');

const URL0 = process.env.BH_LIVE || 'https://bomb-hero-game.onrender.com/index.html';
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

(async () => {
  const cdp = await launch({ port: 9516, w: 900, h: 430 });
  const p = await cdp.newPage();
  await p.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await p.send('Emulation.setUserAgentOverride', { userAgent: UA, platform: 'Android' });
  await p.resize(900, 430, true);

  await p.goto(URL0, 5000);
  console.log('① 首次載入:', await p.eval(`(function(){
    return JSON.stringify({
      ver: (document.getElementById('verTxt')||{}).textContent,
      sv: !!(navigator.serviceWorker && navigator.serviceWorker.controller)
    });
  })()`));

  /* ② 清掉所有快取 → 模擬「沒開過這個站」的裝置 */
  console.log('② 清快取:', await p.eval(`(function(){
    return caches.keys().then(function(k){
      return Promise.all(k.map(function(n){ return caches.delete(n); })).then(function(){
        return caches.keys();
      });
    }).then(function(left){ return '剩下 ' + left.length + ' 個 cache'; });
  })()`));

  /* ③ 擋掉喚醒頁自己的自動重試，方便從容讀取 */
  await p.send('Page.addScriptToEvaluateOnNewDocument', {
    source: 'try{Location.prototype.reload=function(){window.__rb=(window.__rb||0)+1;};}catch(e){}'
  });

  /* ④ 網路延遲 60 秒 —— 請求會掛住，不會立刻失敗 */
  await p.send('Network.enable');
  await p.send('Network.emulateNetworkConditions', {
    offline: false, latency: 60000, downloadThroughput: 1000000, uploadThroughput: 500000
  });

  const t0 = Date.now();
  await p.send('Page.navigate', { url: URL0 + '?dead=1' });
  await sleep(11500);

  const r = await p.eval(`(function(){
    var b = document.body;
    return JSON.stringify({
      title: document.title,
      txt: (b ? (b.innerText || '') : '').replace(/\\s+/g, ' ').slice(0, 90),
      hasBtn: !!document.querySelector('button')
    });
  })()`);
  console.log('③ 掛住 ' + Math.round((Date.now() - t0) / 1000) + ' 秒後:', r);

  const ok1 = /伺服器正在喚醒|Waking the server|目前沒有網路/.test(r);
  console.log(ok1 ? '✅ 有給出可讀的頁面（不再無限轉圈）' : '❌ 沒看到喚醒頁');

  /* ⑤ 恢復網路，確認能正常回到遊戲 */
  await p.send('Network.emulateNetworkConditions', {
    offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1
  });
  await p.goto(URL0, 6000);
  await sleep(600);
  console.log('④ 恢復後:', await p.eval(`(function(){
    return JSON.stringify({
      ver: (document.getElementById('verTxt')||{}).textContent,
      on: (document.querySelector('.screen.on')||{}).id
    });
  })()`));

  cdp.close();
  process.exit(ok1 ? 0 : 1);
})().catch(e => { console.error('FAIL', e && e.message); process.exit(2); });
