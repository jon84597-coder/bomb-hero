#!/usr/bin/env node
'use strict';

/* tools/check-supabase.js —— 檢查 Supabase 連線與資料表是否就緒
 *
 * 用法（PowerShell / bash 皆可）：
 *   BH_SUPABASE_URL="https://xxxx.supabase.co" \
 *   BH_SUPABASE_KEY="service_role key" \
 *   node tools/check-supabase.js
 *
 * 它會做四件事：
 *   1. 確認 URL／KEY 有填
 *   2. 確認 bh_kv 資料表存在（不存在會印出建表 SQL）
 *   3. 寫入一筆 __selftest 再讀回來（驗證讀寫權限）
 *   4. 清掉那筆測試資料
 */

const argv = process.argv.slice(2);
const argOf = function (name) {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : '';
};
const url = String(argOf('url') || process.env.BH_SUPABASE_URL || '').trim().replace(/\/+$/, '');
const key = String(argOf('key') || process.env.BH_SUPABASE_KEY || '').trim();
const table = String(argOf('table') || process.env.BH_SUPABASE_TABLE || 'bh_kv').trim();

const SQL = `
create table if not exists ${table} (
  key      text primary key,
  val      jsonb not null,
  updated  timestamptz not null default now()
);
alter table ${table} enable row level security;
-- service_role 會繞過 RLS，所以不需要（也不該）給 anon 開 policy
`.trim();

function fail(msg, hint) {
  console.error('\n✗ ' + msg);
  if (hint) console.error(hint);
  process.exit(1);
}

if (!url || !key) {
  fail('沒有設定 BH_SUPABASE_URL / BH_SUPABASE_KEY',
    '請先到 Supabase → Project Settings → API 取得 URL 與 service_role key');
}
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) {
  console.error('⚠ URL 看起來不像 Supabase 專案網址：' + url + '（仍會嘗試連線）');
}
/* v4.85d：Supabase 2025 起改用新版 API key（sb_publishable_ / sb_secret_），
   舊的 eyJ... JWT 仍然可用。這裡先判斷型別，貼錯金鑰要當場講清楚，
   不要等 PostgREST 回一個看不懂的 401。 */
if (/^sb_publishable_/.test(key)) {
  fail('貼成了 publishable key（瀏覽器端用的公開金鑰）',
    '這個金鑰受 RLS 限制，寫不進 bh_kv。請改貼同頁下方 Secret keys 那一組（sb_secret_ 開頭）。');
}
if (/^sb_secret_/.test(key)) {
  console.log('金鑰型別：Secret key（sb_secret_…）✓\n');
} else if (/^eyJ/.test(key)) {
  let role = '';
  try {
    role = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString('utf8')).role || '';
  } catch (e) {}
  if (role && role !== 'service_role') {
    fail('這把 JWT 的 role 是 "' + role + '"，不是 service_role',
      '請到 Project Settings → API 複製 service_role 那一把（不是 anon）。');
  }
  console.log('金鑰型別：Legacy JWT（role=' + (role || '未知') + '）\n');
} else {
  console.error('⚠ 認不出金鑰格式（開頭應為 sb_secret_ 或 eyJ），仍會嘗試連線\n');
}

const headers = {
  apikey: key,
  Authorization: 'Bearer ' + key,
  'Content-Type': 'application/json'
};

async function req(path, opts) {
  const r = await fetch(url + '/rest/v1/' + table + path, Object.assign({ headers }, opts || {}));
  const text = await r.text();
  return { status: r.status, text };
}

(async function main() {
  console.log('目標：' + url);
  console.log('資料表：' + table + '\n');

  console.log('1) 檢查資料表…');
  const probe = await req('?select=key&limit=1', { method: 'GET' });
  if (probe.status === 404) {
    fail('資料表不存在（HTTP 404）',
      '\n請到 Supabase → SQL Editor 貼上以下語句執行：\n\n' + SQL + '\n');
  }
  if (probe.status === 401 || probe.status === 403) {
    fail('沒有權限（HTTP ' + probe.status + '）',
      '請確認用的是 service_role key（不是 anon key），且字串完整');
  }
  if (probe.status !== 200) {
    fail('讀取失敗（HTTP ' + probe.status + '）', probe.text.slice(0, 300));
  }
  console.log('   ✓ 資料表存在（目前 ' + (JSON.parse(probe.text || '[]').length) + ' 筆樣本）\n');

  console.log('2) 測試寫入…');
  const stamp = Date.now();
  const up = await req('', {
    method: 'POST',
    headers: Object.assign({}, headers, { Prefer: 'resolution=merge-duplicates,return=minimal' }),
    body: JSON.stringify([{ key: '__selftest', val: { stamp: stamp }, updated: new Date().toISOString() }])
  });
  if (up.status >= 300) fail('寫入失敗（HTTP ' + up.status + '）', up.text.slice(0, 300));
  console.log('   ✓ 寫入成功\n');

  console.log('3) 讀回確認…');
  const back = await req('?key=eq.__selftest&select=val', { method: 'GET' });
  const rows = JSON.parse(back.text || '[]');
  if (!rows.length || !rows[0].val || rows[0].val.stamp !== stamp) {
    fail('讀回的值不一致', back.text.slice(0, 300));
  }
  console.log('   ✓ 讀回一致（stamp ' + stamp + '）\n');

  console.log('4) 清除測試資料…');
  const del = await req('?key=eq.__selftest', { method: 'DELETE' });
  if (del.status >= 300) {
    console.error('   ⚠ 清除失敗（HTTP ' + del.status + '）—— 不影響使用，可手動刪掉 __selftest 那一列');
  } else {
    console.log('   ✓ 已清除\n');
  }

  console.log('✅ 全部通過。把這兩個值填到 Render → Environment：');
  console.log('   BH_SUPABASE_URL = ' + url);
  console.log('   BH_SUPABASE_KEY = （貼上同一組 service_role key）');
})().catch(function (e) {
  fail('連線失敗：' + (e && e.message || e),
    '請確認網路可連外，且 URL 沒有多餘的斜線或 /rest/v1');
});
