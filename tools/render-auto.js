#!/usr/bin/env node
/*
 * tools/render-auto.js —— 用 Render API 開啟 Auto-Deploy 並觸發一次部署
 *
 * 為什麼要有這支：Render 後台的 Auto-Deploy 開關在「Settings → Build & Deploy」，
 *   但這個服務可能由 Blueprint（render.yaml）托管，後台欄位會變唯讀，
 *   而且免費實例常常在你想點的時候正在休眠。用 API 做只有兩個請求，可重複執行。
 *
 * 用法（在專案根目錄）：
 *   RENDER_API_KEY=rnd_xxxxxxxx node tools/render-auto.js
 *   RENDER_API_KEY=rnd_xxxxxxxx node tools/render-auto.js --dry          # 只看現況，不改
 *   RENDER_API_KEY=rnd_xxxxxxxx node tools/render-auto.js --no-deploy    # 只改設定
 *
 * 金鑰取得：https://dashboard.render.com/u/settings#api-keys → Create API Key
 *   它只給 API 用、可以隨時撤銷，跟帳號密碼無關；本腳本不寫入任何檔案。
 *
 * 只做三件事：列出服務 → 把 autoDeploy 設成 yes → 觸發一次部署並等到 live。
 * 不碰環境變數、不碰方案、不刪任何東西。
 */

const fs = require('fs');
const path = require('path');

// 金鑰來源（依序）：環境變數 → 專案根目錄的 .render_key 檔
// 用檔案的好處：不必把 key 貼進對話紀錄，也不會留在 shell history。
function readKey() {
  if (process.env.RENDER_API_KEY) return process.env.RENDER_API_KEY.trim();
  const f = path.join(__dirname, '..', '.render_key');
  try {
    const t = fs.readFileSync(f, 'utf8').trim();
    if (t) return t.split(/\s+/)[0];
  } catch (e) { /* 沒有檔案是正常的 */ }
  return '';
}

const KEY = readKey();
const API = 'https://api.render.com/v1';
const WANT = process.env.RENDER_SERVICE || 'bomb-hero-game';
const DRY = process.argv.includes('--dry');
const NO_DEPLOY = process.argv.includes('--no-deploy');

if (!KEY) {
  console.error('缺少 RENDER_API_KEY。用法：RENDER_API_KEY=rnd_xxx node tools/render-auto.js [--dry]');
  process.exit(1);
}

function mask(k) {
  return k.slice(0, 6) + '…' + k.slice(-4) + '（' + k.length + ' 字）';
}

async function api(path, opt) {
  opt = opt || {};
  const res = await fetch(API + path, {
    method: opt.method || 'GET',
    headers: Object.assign({
      Authorization: 'Bearer ' + KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }, opt.headers || {}),
    body: opt.body ? JSON.stringify(opt.body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!res.ok) {
    const msg = (data && (data.message || (data.error && data.error.message))) || text || '';
    const err = new Error('HTTP ' + res.status + ' ' + path + (msg ? ' — ' + msg : ''));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function listServices() {
  const out = [];
  let cursor = '';
  for (let i = 0; i < 10; i++) {
    const r = await api('/services?limit=50' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''));
    const rows = Array.isArray(r) ? r : [];
    rows.forEach(function (row) { out.push(row.service || row); });
    if (rows.length < 50) break;
    const last = rows[rows.length - 1];
    cursor = (last && last.cursor) || '';
    if (!cursor) break;
  }
  return out;
}

async function onlineVersion() {
  try {
    const r = await fetch('https://bomb-hero-game.onrender.com/');
    const t = await r.text();
    const m = /const VERSION = '([0-9.]+)'/.exec(t);
    return m ? m[1] : '（抓不到）';
  } catch (e) {
    return '（連不上：' + e.message + '）';
  }
}

const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

(async function main() {
  console.log('金鑰 ' + mask(KEY));
  console.log('');

  // ---------- 1. 找服務 ----------
  console.log('① 列出服務…');
  const all = await listServices();
  if (!all.length) {
    console.error('這個帳號下沒有任何服務。金鑰是不是別的公司／團隊（Team）底下的？');
    process.exit(1);
  }
  all.forEach(function (s) {
    console.log('   - ' + s.name + '  [' + s.type + ']  id=' + s.id +
      '  autoDeploy=' + (s.autoDeploy || '?') + '  branch=' + (s.branch || '-') +
      (s.name === WANT ? '   ← 目標' : ''));
  });

  const svc = all.find(function (s) { return s.name === WANT; }) || all.find(function (s) { return s.type === 'web_service'; });
  if (!svc) {
    console.error('找不到 ' + WANT + '。用 RENDER_SERVICE=服務名稱 指定。');
    process.exit(1);
  }
  console.log('');
  console.log('目標：' + svc.name + '（' + svc.id + '）');
  console.log('   repo     ' + (svc.repo || '-'));
  console.log('   branch   ' + (svc.branch || '-'));
  console.log('   autoDeploy 現在 = ' + (svc.autoDeploy || '?') +
    '   （值域：yes / no / create_only；create_only 只在建立時部署，等於沒有自動部署）');
  console.log('   線上版本 ' + (await onlineVersion()));

  if (DRY) {
    console.log('');
    console.log('--dry：到此為止，沒有做任何修改。');
    return;
  }

  // ---------- 2. 開啟 autoDeploy ----------
  console.log('');
  console.log('② 設定 autoDeploy = yes …');
  try {
    const upd = await api('/services/' + svc.id, { method: 'PATCH', body: { autoDeploy: 'yes' } });
    const now = (upd && upd.autoDeploy) || '(未回傳)';
    console.log('   → 完成，現在 = ' + now);
    if (now !== 'yes') console.log('   ⚠ 回傳不是 yes，請到後台確認一次。');
  } catch (e) {
    console.log('   ✗ ' + e.message);
    if (e.status === 400 && /blueprint|managed/i.test(e.message)) {
      console.log('   → 這個服務由 Blueprint 托管，欄位唯讀。改用：後台 → Blueprints → Manual Sync（會讀 render.yaml 的 autoDeploy: true）。');
    } else if (e.status === 403) {
      console.log('   → 金鑰權限不足：建立時要選「Full access」或至少包含 services:write。');
    }
    if (NO_DEPLOY) process.exit(2);
  }

  if (NO_DEPLOY) { console.log(''); console.log('--no-deploy：不觸發部署。'); return; }

  // ---------- 3. 觸發部署 ----------
  console.log('');
  console.log('③ 觸發部署（deploy latest commit）…');
  let dep = null;
  try {
    dep = await api('/services/' + svc.id + '/deploys', { method: 'POST', body: { clearCache: 'do_not_clear' } });
    console.log('   → 已送出，deploy id = ' + (dep && dep.id));
  } catch (e) {
    console.log('   ✗ ' + e.message);
    process.exit(2);
  }
  if (!dep || !dep.id) return;

  // ---------- 4. 等它上線 ----------
  console.log('');
  console.log('④ 等待建置（免費實例通常 2~4 分鐘，冷啟動再加 50 秒）…');
  const t0 = Date.now();
  let last = '';
  for (let i = 0; i < 80; i++) {
    await sleep(6000);
    let d;
    try {
      d = await api('/services/' + svc.id + '/deploys/' + dep.id);
    } catch (e) {
      if (i % 5 === 0) console.log('   （查詢失敗，重試：' + e.message + '）');
      continue;
    }
    const st = (d && d.status) || '?';
    if (st !== last) {
      const sec = Math.round((Date.now() - t0) / 1000);
      console.log('   [' + sec + 's] ' + st);
      last = st;
    }
    if (st === 'live') break;
    if (/failed|canceled|deactivated/.test(st)) {
      console.log('   ✗ 部署失敗：' + st);
      if (d && d.commit) console.log('   commit ' + (d.commit.id || ''));
      process.exit(3);
    }
  }

  // ---------- 5. 驗證 ----------
  console.log('');
  console.log('⑤ 驗證線上版本…');
  for (let i = 0; i < 10; i++) {
    const v = await onlineVersion();
    console.log('   ' + v);
    if (/^[0-9.]+$/.test(v)) {
      console.log('');
      console.log('完成：線上 ' + v + '。之後 push 到 main 會自動部署。');
      return;
    }
    await sleep(8000);
  }
  console.log('（部署已送出，但線上還沒回應；免費實例睡醒要一點時間，過一會再開就好。）');
})().catch(function (e) {
  if (e.status === 401) {
    console.error('✗ 金鑰無效（401）。到 https://dashboard.render.com/u/settings#api-keys 重新建一把。');
  } else {
    console.error('✗ ' + e.message);
  }
  process.exit(1);
});
