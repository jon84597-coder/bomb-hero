// test/_live479.js — 線上驗證：美術外部化後真的從網路載得到、且主檔變小
// 檔案層面的檢查走 Node（避免在頁面裡 fetch 造成 CDP 逾時），渲染層面的檢查走瀏覽器。
const fs = require('fs');
const path = require('path');
const https = require('https');
const zlib = require('zlib');
const { launch, sleep } = require('./cdp');
const URL = process.argv[2] || 'https://jon84597-coder.github.io/bomb-hero/';
const BASE = URL.replace(/\/?$/, '/');
const WANT = /const VERSION = '([^']+)'/.exec(fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8'))[1];
let pass = 0, fail = 0;
const ok = (n, c, e) => { if (c) { pass++; console.log('  ✓ ' + n + (e ? '（' + e + '）' : '')); } else { fail++; console.log('  ✗ ' + n + (e ? '（' + e + '）' : '')); } };

function get(u) {
  return new Promise((res, rej) => {
    const req = https.get(u, { headers: { 'Cache-Control': 'no-cache', 'Accept-Encoding': 'gzip' } }, r => {
      const chunks = [];
      r.on('data', c => chunks.push(c));
      r.on('end', () => {
        let body = Buffer.concat(chunks);
        const raw = body.length;
        if ((r.headers['content-encoding'] || '') === 'gzip') {
          try { body = zlib.gunzipSync(body); } catch (e) {}
        }
        res({ status: r.statusCode, head: r.headers, body, wire: raw });
      });
    });
    req.on('error', rej);
    req.setTimeout(15000, () => { req.destroy(new Error('timeout')); });
  });
}

(async () => {
  console.log('=== 1. 檔案層（Node 直連）===');
  const idx = await get(BASE + 'index.html?x=' + Date.now());
  ok('index.html HTTP 200', idx.status === 200, String(idx.status));
  ok('HTML 沒有 base64 圖', idx.body.toString().indexOf('data:image') === -1);
  const refs = (idx.body.toString().match(/spr\/[A-Za-z0-9_\-]+\.webp/g) || []).length;
  ok('HTML 有 175 個 spr 引用', refs === 175, String(refs));
  ok('HTML 傳輸量 < 800 KB', idx.wire < 800000, Math.round(idx.wire / 1024) + ' KB gzip / ' + Math.round(idx.body.length / 1024) + ' KB 原始');
  const enc = idx.head['content-encoding'];
  ok('伺服器有壓縮（gzip/br）', !!enc, enc || '(none)');

  const names = ['spr/foe-art-slime.webp', 'spr/hero-parts-rabbit-head.webp', 'spr/tile-art-floor-1.webp',
    'spr/boss-art-b1.webp', 'spr/mount-art-green.webp', 'spr/item-art-bomb.webp', 'spr/title-logo.webp'];
  let allOk = true, detail = [];
  for (const n of names) {
    const r = await get(BASE + n);
    const magic = r.body.slice(8, 12).toString();
    const good = r.status === 200 && magic === 'WEBP';
    if (!good) allOk = false;
    detail.push(n.replace('spr/', '') + ':' + r.status + '/' + magic);
  }
  ok('7 張貼圖都 200 + WEBP', allOk, detail.join(' '));

  const lst = await get(BASE + 'spr/_list.json');
  let listLen = -1;
  try { listLen = JSON.parse(lst.body.toString()).length; } catch (e) {}
  ok('_list.json 175 筆', listLen === 175, String(listLen));

  const sw = await get(BASE + 'sw.js?x=' + Date.now());
  const swv = (/SW_VERSION = '([^']+)'/.exec(sw.body.toString()) || [])[1];
  ok('線上 sw.js = v4.79.0', swv === 'v4.79.0', swv);

  console.log('\n=== 2. 瀏覽器層 ===');
  const b = await launch({ w: 390, h: 800 });
  const p = await b.newPage();
  await p.send('Runtime.enable');
  await p.goto(BASE, 3000);
  for (let i = 0; i < 40; i++) { if (await p.eval('typeof __BH') === 'object') break; await sleep(300); }
  ok('線上版本 = ' + WANT, (await p.eval('__BH.VERSION')) === WANT, await p.eval('__BH.VERSION'));

  let logo = '';
  for (let i = 0; i < 30; i++) {
    logo = await p.eval("(function(){var i=document.getElementById('titleLogo');return i? i.complete+'|'+i.naturalWidth : 'no-el';})()");
    if (/^true\|[1-9]/.test(logo)) break;
    await sleep(600);
  }
  ok('首頁 LOGO 載入', /^true\|[1-9]/.test(logo), logo);

  await p.eval("try{__BH.startSolo(1,false);var G=__BH.Game;G.state='play';G.countdown=0;G.camSnap=true;__BH.updateCamera(1/60);__BH.render();}catch(e){}; 1");
  for (let i = 0; i < 40; i++) { if ((await p.eval('__BH.FoeArt.readyCount()')) === 48) break; await sleep(600); }
  ok('怪物貼圖 48/48', (await p.eval('__BH.FoeArt.readyCount()')) === 48, String(await p.eval('__BH.FoeArt.readyCount()')));

  const errs = await p.eval("(typeof __BH_ERRS==='undefined'?0:__BH_ERRS.length)");
  ok('執行期錯誤 0', errs === 0, String(errs));

  try { await b.close(); } catch (e) {}
  console.log('\n' + (fail ? '✗ ' + fail + ' 失敗 / ' + pass + ' 通過' : '✅ ' + pass + ' 項全通過'));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
