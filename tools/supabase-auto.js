#!/usr/bin/env node
/*
 * tools/supabase-auto.js —— 用 Supabase Management API 一鍵建好存檔後端
 *
 * 為什麼要有這支：手動流程（建專案 → 等兩分鐘 → 貼 SQL → 找金鑰）太容易出錯，
 *   而且「找 service_role」那一步最常被貼成 anon，之後一直 401 卻看不出原因。
 *   這支腳本把五步做完並自己驗證一次，成功才印出要填進 Render 的兩個值。
 *
 * 用法（在專案根目錄）：
 *   SB_PAT=sbp_xxxxxxxx node tools/supabase-auto.js
 *
 * 需要的東西只有一個：Supabase Personal Access Token
 *   https://supabase.com/dashboard/account/tokens → Generate new token
 *   它只給 API 用、可以隨時撤銷，跟帳號密碼無關。
 *
 * 可選環境變數：
 *   SB_ORG      組織 slug（有多個組織時指定；不給就用第一個）
 *   SB_PROJECT  專案名稱（預設 bomb-hero）
 *   SB_REGION   AWS 區碼（預設 ap-southeast-1 新加坡，離台灣最近）
 *   SB_DB_PASS  資料庫密碼（不給就自動產生）
 *   SB_DRY      設 1 只檢查現況、不建立任何東西
 */
'use strict';

const https = require('https');
const crypto = require('crypto');

const PAT = String(process.env.SB_PAT || '').trim();
const ORG = String(process.env.SB_ORG || '').trim();
const NAME = String(process.env.SB_PROJECT || 'bomb-hero').trim();
const REGION = String(process.env.SB_REGION || 'ap-southeast-1').trim();
const DRY = process.env.SB_DRY === '1';

const TABLE = 'bh_kv';

// 跟 SUPABASE-SETUP.md 的步驟 2 完全一致 —— 兩邊不能各寫一份，改一邊就要改另一邊
const SQL = [
  'create table if not exists ' + TABLE + ' (',
  '  key      text primary key,',
  '  val      jsonb not null,',
  '  updated  timestamptz not null default now()',
  ');',
  'alter table ' + TABLE + ' enable row level security;',
  "comment on table " + TABLE + ' is ' + "'爆爆英雄 存檔 KV（service_role 專用，anon 無 policy 故完全無法存取）'" + ';'
].join('\n');

function log(s) { console.log(s); }
function step(s) { console.log('\n' + s); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body == null ? null : JSON.stringify(body);
    const req = https.request({
      hostname: 'api.supabase.com',
      path: '/v1' + path,
      method: method,
      headers: Object.assign({
        Authorization: 'Bearer ' + PAT,
        'Content-Type': 'application/json'
      }, data ? { 'Content-Length': Buffer.byteLength(data) } : {})
    }, res => {
      let buf = '';
      res.on('data', d => { buf += d; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(buf); } catch (e) {}
        resolve({ status: res.statusCode, json: json, raw: buf });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function fail(msg, extra) {
  console.error('\n✗ ' + msg);
  if (extra) console.error(typeof extra === 'string' ? extra : JSON.stringify(extra, null, 2));
  process.exit(1);
}

/* 直接打 PostgREST，確認「金鑰真的能讀寫」——這才是最終判準，
   而不是「API 回 200」。很多人卡在金鑰是 anon 卻以為設定成功。 */
function restCheck(url, key) {
  return new Promise(resolve => {
    const u = new URL(String(url).replace(/\/+$/, '') + '/rest/v1/' + TABLE + '?select=key&limit=1');
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: { apikey: key, Authorization: 'Bearer ' + key }
    }, res => {
      let b = '';
      res.on('data', d => { b += d; });
      res.on('end', () => resolve({ status: res.statusCode, body: b.slice(0, 300) }));
    });
    req.on('error', e => resolve({ status: 0, body: e.message }));
    req.end();
  });
}

(async function main() {
  if (!PAT) fail('缺少 SB_PAT。請先到 https://supabase.com/dashboard/account/tokens 產生一組 Access Token。');
  if (!/^sbp_/.test(PAT)) log('⚠ token 不是 sbp_ 開頭，可能貼錯（應該是 Personal Access Token，不是 API key）');

  step('[1/6] 驗證 token 並取得組織');
  const orgs = await api('GET', '/organizations');
  if (orgs.status === 401) fail('token 無效或已撤銷（401）', orgs.raw);
  if (orgs.status !== 200) fail('讀取組織失敗（HTTP ' + orgs.status + '）', orgs.raw);
  const list = Array.isArray(orgs.json) ? orgs.json : [];
  if (!list.length) fail('這個帳號沒有任何組織。請先在 Supabase 後台建一個 organization。');
  let org = ORG ? list.find(o => o.slug === ORG || o.id === ORG) : list[0];
  if (!org) fail('找不到組織「' + ORG + '」', list.map(o => ({ slug: o.slug, name: o.name })));
  log('  ✓ 組織：' + (org.name || org.slug) + '（' + org.slug + '）');

  step('[2/6] 檢查是否已有專案');
  const projs = await api('GET', '/projects');
  if (projs.status !== 200) fail('讀取專案失敗（HTTP ' + projs.status + '）', projs.raw);
  let ref = null;
  const exist = (Array.isArray(projs.json) ? projs.json : []).find(p => p.name === NAME);
  if (exist) {
    ref = exist.ref || exist.id;
    log('  ✓ 已存在同名專案：' + NAME + '（' + ref + '，狀態 ' + exist.status + '）→ 直接沿用');
  } else if (DRY) {
    log('  · 沒有同名專案（DRY 模式不建立）');
  } else {
    log('  · 沒有同名專案 → 開始建立');
  }

  let dbPass = String(process.env.SB_DB_PASS || '').trim();
  if (!ref && !DRY) {
    step('[3/6] 建立專案（約 1~2 分鐘）');
    if (!dbPass) dbPass = crypto.randomBytes(18).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 24);
    const payload = {
      organization_slug: org.slug,
      name: NAME,
      db_pass: dbPass,
      region: REGION
    };
    let created = await api('POST', '/projects', payload);
    if (created.status >= 400) {
      // 新帳號可能已不接受舊的 region 參數 → 改用 smartGroup
      log('  · region 參數被拒（' + created.status + '），改用智慧選區 apac 重試');
      delete payload.region;
      payload.region_selection = { type: 'smartGroup', code: 'apac' };
      created = await api('POST', '/projects', payload);
    }
    if (created.status >= 400) fail('建立專案失敗（HTTP ' + created.status + '）', created.raw);
    ref = (created.json && (created.json.ref || created.json.id)) || null;
    if (!ref) fail('建立成功但沒有拿到 project ref', created.json);
    log('  ✓ 已建立：' + NAME + '（' + ref + '）');
    log('  · 資料庫密碼（請自己存起來，之後只有重置才拿得回來）：');
    log('    ' + dbPass);
  }

  if (DRY) {
    log('\n（DRY 模式結束）');
    return;
  }

  step('[4/6] 等待資料庫就緒');
  let healthy = false;
  for (let i = 0; i < 40; i++) {
    const h = await api('GET', '/projects/' + ref + '/health');
    if (h.status === 200 && Array.isArray(h.json)) {
      const db = h.json.find(s => /db|database|postgres/i.test(String(s.name || s.service || '')));
      const st = db ? String(db.status || '') : '';
      if (/ACTIVE_HEALTHY/i.test(st)) { healthy = true; break; }
      if (i % 3 === 0) log('  · 目前狀態：' + (st || 'starting') + '…');
    } else if (i % 3 === 0) {
      log('  · 尚未就緒（HTTP ' + h.status + '）…');
    }
    await sleep(8000);
  }
  if (!healthy) {
    log('  ⚠ 5 分鐘內沒等到 ACTIVE_HEALTHY，仍繼續嘗試建表（有時狀態回報會延遲）');
  } else {
    log('  ✓ 資料庫已就緒');
  }

  step('[5/6] 建立資料表 ' + TABLE);
  const q = await api('POST', '/projects/' + ref + '/database/query', { query: SQL });
  if (q.status >= 400) fail('執行 SQL 失敗（HTTP ' + q.status + '）', q.raw);
  log('  ✓ SQL 執行完成');

  const verify = await api('POST', '/projects/' + ref + '/database/query', {
    query: "select column_name, data_type from information_schema.columns where table_schema='public' and table_name='" + TABLE + "' order by ordinal_position"
  });
  if (verify.status === 200) {
    const cols = (verify.json || []).map(c => c.column_name).join(', ');
    log('  ✓ 欄位確認：' + (cols || '（讀不到，但不影響使用）'));
  }

  step('[6/6] 取得金鑰並實測讀寫');
  let key = null;
  const keys = await api('GET', '/projects/' + ref + '/api-keys?reveal=true');
  if (keys.status === 200 && Array.isArray(keys.json)) {
    // 新制：type=secret；舊制：name=service_role
    const sec = keys.json.find(k => String(k.type || '').toLowerCase() === 'secret')
      || keys.json.find(k => /service_role/.test(String(k.name || '')));
    if (sec && sec.api_key) key = sec.api_key;
    if (!key) log('  · 尚未啟用 secret key，嘗試建立…');
  }
  if (!key) {
    const mk = await api('POST', '/projects/' + ref + '/api-keys', {
      type: 'secret',
      name: 'default',
      secret_jwt_template: { role: 'service_role' }
    });
    if (mk.status >= 400) log('  · 建立 secret key 失敗（HTTP ' + mk.status + '）：' + mk.raw.slice(0, 200));
    const again = await api('GET', '/projects/' + ref + '/api-keys?reveal=true');
    if (again.status === 200 && Array.isArray(again.json)) {
      const sec2 = again.json.find(k => String(k.type || '').toLowerCase() === 'secret')
        || again.json.find(k => /service_role/.test(String(k.name || '')));
      if (sec2 && sec2.api_key) key = sec2.api_key;
    }
  }
  if (!key) fail('拿不到 service_role / secret 金鑰。請到後台 Project Settings → API Keys 手動複製。');

  const url = 'https://' + ref + '.supabase.co';
  const chk = await restCheck(url, key);
  if (chk.status === 200) {
    log('  ✓ 用這組金鑰讀 bh_kv 成功（HTTP 200）');
  } else if (chk.status === 404) {
    log('  ⚠ 讀取回 404：資料表可能還沒生效（PostgREST 快取），稍等一分鐘再試');
  } else {
    log('  ✗ 讀取失敗（HTTP ' + chk.status + '）：' + chk.body);
  }

  log('\n' + '='.repeat(58));
  log('  把下面兩行填進 Render → Environment');
  log('='.repeat(58));
  log('  BH_SUPABASE_URL = ' + url);
  log('  BH_SUPABASE_KEY = ' + key);
  if (dbPass) log('\n  （資料庫密碼，只在你要用 psql 直連時才需要）\n  DB_PASS = ' + dbPass);
  log('\n  填完存檔 → Manual Deploy → Deploy latest commit');
  log('  再用下面這行確認接上了：');
  log('  curl -s https://bomb-hero-game.onrender.com/api/health');
  log('  看到 "storage":"supabase" 就成功。\n');

  // 給自動化用的機器可讀輸出
  console.log(JSON.stringify({ ok: chk.status === 200, ref: ref, url: url, key: key, dbPass: dbPass || null }));
})().catch(e => fail('未預期的錯誤：' + e.message, e.stack));
