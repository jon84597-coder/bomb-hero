#!/usr/bin/env node
'use strict';
/* test/_sec-test.js —— 驗證「session 密鑰跟著 Supabase 走」
 *
 * 為什麼要測：Render 免費實例休眠／重新部署後是一個全新容器，
 *   本機的 secret.key 不見了 → 舊版每次都重新生成密鑰 → 所有玩家 cookie 失效。
 * 這裡用一個假的 PostgREST（本機 HTTP）模擬 Supabase，不需要真的連外：
 *   ① 第一個容器啟動 → 把密鑰寫進 meta 分片
 *   ② 換一個空資料夾（模擬新容器）啟動 → 必須沿用雲端那一把
 */

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createCloud } = require('../../cloud.js');

const PORT = 4010;
const rows = {};                       // key → val（假資料庫）
const writes = [];

const srv = http.createServer(function (req, res) {
  const u = new URL(req.url, 'http://127.0.0.1');
  if (!u.pathname.startsWith('/rest/v1/')) { res.writeHead(404); return res.end('{}'); }
  if (req.method === 'GET') {
    const out = Object.keys(rows).map(function (k) { return { key: k, val: rows[k] }; });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(out));
  }
  if (req.method === 'POST') {
    let buf = '';
    req.on('data', function (d) { buf += d; });
    req.on('end', function () {
      let arr = [];
      try { arr = JSON.parse(buf); } catch (e) {}
      (Array.isArray(arr) ? arr : []).forEach(function (r) {
        if (r && r.key) { rows[r.key] = r.val; writes.push(r.key); }
      });
      res.writeHead(201); res.end('');
    });
    return;
  }
  res.writeHead(405); res.end('');
});

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
const mkdir = function () { return fs.mkdtempSync(path.join(os.tmpdir(), 'bh-sec-')); };

let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ FAIL: ' + m); } }

(async function () {
  await new Promise(function (r) { srv.listen(PORT, '127.0.0.1', r); });
  const env = {
    BH_SUPABASE_URL: 'http://127.0.0.1:' + PORT,
    BH_SUPABASE_KEY: 'sb_secret_fake_for_test_only',
    BH_SUPABASE_TABLE: 'bh_kv'
  };

  console.log('1) 第一個容器（空資料夾、雲端也空）');
  const dirA = mkdir();
  const c1 = createCloud({ env: env, dir: dirA });
  await c1.ready;
  await sleep(900);
  const s1 = c1.secret;
  ok(typeof s1 === 'string' && s1.length >= 32, '產生密鑰（' + String(s1).length + ' 字元）');
  ok(c1.storage.loaded === true, '已從遠端載入');
  ok(rows.meta && rows.meta.sec === s1, '密鑰已寫進 Supabase 的 meta 分片');
  ok(c1.storage.mode === 'supabase', '模式 = supabase');

  console.log('\n2) 第二個容器（全新資料夾，模擬休眠喚醒／重新部署）');
  const dirB = mkdir();
  const c2 = createCloud({ env: env, dir: dirB });
  await c2.ready;
  await sleep(400);
  ok(c2.secret === s1, '沿用雲端那一把密鑰（不再隨機重生）');
  let fileSec = '';
  try { fileSec = fs.readFileSync(path.join(dirB, 'secret.key'), 'utf8').trim(); } catch (e) {}
  ok(fileSec === s1, '雲端那把密鑰已寫回本機 secret.key（下次遠端連不上也能沿用）');

  console.log('\n3) 對照組：沒有設 Supabase 時應各自隨機（證明第 2 點不是巧合）');
  const c3 = createCloud({ env: {}, dir: mkdir() });
  await c3.ready;
  const c4 = createCloud({ env: {}, dir: mkdir() });
  await c4.ready;
  ok(c3.secret !== c4.secret, '純檔案模式：兩個容器密鑰不同（預期行為，已由 Supabase 修掉）');

  console.log('\n4) 有設 BH_AUTH_SECRET 時不得被雲端覆蓋');
  const c5 = createCloud({ env: Object.assign({}, env, { BH_AUTH_SECRET: 'fixed-secret-from-env' }), dir: mkdir() });
  await c5.ready;
  await sleep(200);
  ok(c5.secret === 'fixed-secret-from-env', '環境變數優先（維運可強制指定）');
  ok(rows.meta.sec === s1, '雲端那把沒被環境變數蓋掉');

  console.log('\n寫入紀錄：' + Array.from(new Set(writes)).join(', '));
  [dirA, dirB].forEach(function (d) { try { fs.rmSync(d, { recursive: true, force: true }); } catch (e) {} });
  srv.close();
  console.log('\n密鑰持久化：' + pass + ' 通過 / ' + fail + ' 失敗');
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
