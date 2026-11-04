// test/verify-v485.js —— v4.85：雲端存檔永存（Supabase）＋ 整包存檔同步 ＋ 存檔碼
//   ① 使用者的痛點：雲端存檔會消失，做再多留存功能都沒用
//   ② 真正的原因：Render 免費實例的檔案系統是暫時的（15 分鐘沒流量就休眠清空），
//      持久磁碟只有付費方案能掛；舊程式又用「有沒有設 BH_DATA_DIR」判斷持久化，
//      所以設了 /data 卻沒真的掛盤時，連警告都不印
//   ③ 修法：Supabase（Postgres）當權威來源，本機檔案只當快取；載入失敗時禁止寫回遠端
//   ④ 進度整包上雲：關卡／金幣／隨從／票券／教學／每日最佳
//   ⑤ 最後一道保險：設定頁的存檔碼（匯出／貼上還原）
const { makeEnv } = require('./_sandbox');
const fs = require('fs'), path = require('path');

const env = makeEnv();
const src = env.html;
const ROOT = path.join(__dirname, '..');
const cloud = fs.readFileSync(path.join(ROOT, '..', 'cloud.js'), 'utf8');
const server = fs.readFileSync(path.join(ROOT, '..', 'server.js'), 'utf8');
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ FAIL: ' + m); } }
function head(t) { console.log('\n=== ' + t + ' ==='); }

// ─────────────────────────────────────────────────────────────
head('① 儲存層：Supabase 成為權威來源');
ok(/function createStore\(dir, persist, remote\)/.test(cloud), 'createStore 接受遠端設定');
ok(/const remoteOn = !!\(R\.url && R\.key\)/.test(cloud), '有 URL + KEY 才啟用遠端');
ok(/rest\/v1\//.test(cloud), '走 PostgREST（/rest/v1/）而不是自建 API');
ok(/resolution=merge-duplicates/.test(cloud), 'upsert 用 merge-duplicates（同一鍵覆蓋而非插兩筆）');
ok(/select=key,val/.test(cloud), '啟動時一次抓回所有分片');
ok(/function parts\(\)/.test(cloud) && /accounts: \{ accounts: db\.accounts, devices: db\.devices \}/.test(cloud),
  'db 切成 meta / accounts / lb 三個分片');
ok(/if \(s === lastSent\[k\]\) return;/.test(cloud), '只推有變動的分片（不做全量覆寫）');
ok(/state\.loaded/.test(cloud) && /if \(!state\.loaded\) \{ state\.skipped\+\+; return; \}/.test(cloud),
  '遠端沒載入成功時禁止寫回（避免空資料蓋掉雲端）');
ok(/function scheduleRetry\(\)/.test(cloud), '寫入失敗有指數退避重試');
ok(/BH_SUPABASE_URL/.test(cloud) && /BH_SUPABASE_KEY/.test(cloud), '金鑰走環境變數，不寫死');
ok(/v4\.85/.test(cloud), '原始碼有 v4.85 標記');

head('② 啟動流程不再「先服務後載入」');
ok(/const booted = cloud && cloud\.ready \? cloud\.ready : Promise\.resolve\(\)/.test(server),
  'server.js 等 cloud.ready');
ok(/booted\.then\(function \(\) \{ server\.listen/.test(server), '存檔載入完才 listen（冷啟動不會讀到空庫）');
ok(/儲存層：Supabase/.test(server) || /存檔：Supabase/.test(server), '啟動日誌會說現在用哪種儲存');
ok(/storageLoaded/.test(cloud) && /storageError/.test(cloud), 'stats() 回報載入狀態與錯誤');
ok(/\/api\/save\//.test(server), 'server.js 路由白名單有 /api/save/');

head('③ 整包存檔 API');
ok(/p === '\/api\/save\/get'/.test(cloud), '有 /api/save/get');
ok(/p === '\/api\/save\/put'/.test(cloud), '有 /api/save/put');
ok(/p\.indexOf\('\/api\/save\/'\) === 0/.test(cloud), '/api/save/* 併進需登入的分支');
ok(/acc\.save = sanitizeSave\(body\.save\)/.test(cloud), '寫入前一定過 sanitizeSave');
ok(/acc\.saveRev = \(acc\.saveRev \|\| 0\) \+ 1/.test(cloud), '每次寫入遞增 rev');

head('④ 伺服器端清洗（防改前端刷數值）');
ok(/function sanitizeSave\(obj\)/.test(cloud), '有 sanitizeSave');
ok(/out\.stage = clampInt\(o\.stage, 1, MAX_STAGE, 1\)/.test(cloud), '關卡夾在 1~32');
ok(/out\.gold = clampInt\(o\.gold, 0, SAVE_MAX_GOLD, 0\)/.test(cloud), '金幣夾在 0~1 億');
ok(/const PET_KINDS = \{ blade: 1, bomber: 1, guard: 1 \}/.test(cloud), '隨從只認商店真有的三種');
ok(/\\d\{4\}-\\d\{2\}-\\d\{2\}/.test(cloud), '每日最佳只收 YYYY-MM-DD 鍵');
ok(/slice\(-60\)/.test(cloud), '每日紀錄最多留 60 天');

// ─────────────────────────────────────────────────────────────
head('⑤ 前端統一存檔層');
ok(/const Save = \(function \(\) \{/.test(src), 'Save 模組存在');
ok(/function snapshot\(\)/.test(src), '有 snapshot()');
ok(/function merge\(remote, local\)/.test(src), '有 merge()');
ok(/function apply\(st\)/.test(src), '有 apply()');
ok(/out\.stage = Math\.max\(/.test(src), '合併時關卡只前進不後退');
ok(/const src = isEmpty\(local\) \? remote : local;/.test(src), '金幣／票券以本地為準（新裝置才吃雲端）');
ok(/\[remote\.daily \|\| \{\}, local\.daily \|\| \{\}\]/.test(src) && /ms < out\.daily\[k\]/.test(src),
  '每日最佳取較快的一次');
ok(/window\.Save = Save;/.test(src), '掛到 window（Cloud 才叫得到）');

head('⑥ 各模組的狀態接口');
ok(/state: function \(\) \{\s*return \{\s*gold: gold, tickets: tickets,/.test(src), 'Shop.state() 回金幣／票券／隨從');
ok(/setState: function \(st\) \{/.test(src), 'Shop.setState()');
ok(/state: function \(\) \{ return \{ home: !!doneP\.home, play: !!doneP\.play \}; \}/.test(src), 'Tut.state()');
ok(/setState: function \(st\) \{[\s\S]{0,160}saveDone\(\);/.test(src), 'Tut.setState() 會寫回');

head('⑦ 存檔碼（匯出／還原）');
ok(/id="btnSaveExport"/.test(src) && /id="btnSaveImport"/.test(src), '設定頁有兩顆按鈕');
ok(/id="saveCode"/.test(src), '有輸入框 #saveCode');
ok(/function encodeDoc\(obj\)/.test(src) && /function decodeDoc\(code\)/.test(src), '有編碼／解碼');
ok(/return 'BH1\.' \+ sum36\(j\) \+ '\.' \+ b64e\(j\);/.test(src), '格式 BH1.<校驗>.<base64url>');
ok(/if \(sum36\(j\) !== m\[1\]\) return null;/.test(src), '校驗不符直接拒絕（貼一半不會半套還原）');
ok(/window\.Save\.wireBackup|Save\.wireBackup\(\)/.test(src), '啟動時接線');

head('⑧ 文案（10 語言）');
['save.bak', 'save.bakDesc', 'save.export', 'save.import', 'save.ph',
 'save.copied', 'save.copyFail', 'save.noCode', 'save.bad', 'save.confirm', 'save.done'].forEach(function (k) {
  const re = new RegExp('^' + k.replace('.', '\\.') + '\\|', 'm');
  const line = (src.match(new RegExp('^' + k.replace('.', '\\.') + '\\|.*$', 'm')) || [''])[0];
  ok(re.test(src) && line.split('|').length === 11, k + ' 有 11 欄（key + 10 語言）');
});
ok(/const sbk = \$id\('saveBakLab'\); if \(sbk\) sbk\.textContent = t\('save\.bak'\)/.test(src),
  'fillUI() 注入標題（短標籤即時翻譯層翻不到）');

head('⑨ 版本與體積');
const V = (env.BH && env.BH.VERSION) || '';
ok(/^4\.8[5-9]$/.test(V) || /^4\.9/.test(V), 'VERSION = ' + V);
ok(/SW_VERSION = 'v4\.8[5-9]\.0'/.test(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8')), 'sw.js 跟著升版');
ok(/SW_VERSION = 'v4\.8[5-9]\.0'/.test(fs.readFileSync(path.join(ROOT, '..', 'public', 'sw.js'), 'utf8')), 'public/sw.js 跟著升版');
ok(/SW_VERSION = 'v4\.8[5-9]\.0'/.test(fs.readFileSync(path.join(ROOT, '..', 'bomberman-online', 'public', 'sw.js'), 'utf8')), 'bomberman-online/public/sw.js 跟著升版');
const first = (src.match(/const VERSION_LOG = \[\s*\{ v: '([0-9.]+)'/) || [])[1];
ok(first === V, 'VERSION_LOG 首位＝當前版本');
const block = (src.match(/const VERSION_LOG = \[\s*\{[\s\S]*?\n  \{ v: '4\.84'/) || [''])[0];
ok((block.match(/^    '/gm) || []).length >= 3, '本版至少 3 條更新（實際 ' + (block.match(/^    '/gm) || []).length + '）');
const chars = src.length, bytes = Buffer.byteLength(src, 'utf8');
ok(chars < 3900000, '字元 ' + chars.toLocaleString() + ' < 3.9M');
ok(bytes < 4250000, '位元組 ' + bytes.toLocaleString() + ' < 4.25M');
ok(!/\r/.test(src), '整檔 LF（CR 0）');

// ─────────────────────────────────────────────────────────────
head('⑧ session 密鑰也存雲端（休眠喚醒後不再被登出）');
ok(/sec: db\.sec \|\| ''/.test(cloud), 'meta 分片帶上 sec');
ok(/db\.sec = typeof val\.sec === 'string' \? val\.sec : ''/.test(cloud), '從遠端還原 sec');
ok(/get secret\(\) \{ return secret; \}/.test(cloud), 'secret 改成 getter（雲端載入後才定案）');
ok(/if \(store\.db\.sec\) \{\s*\n\s*secret = store\.db\.sec;/.test(cloud), '雲端已有密鑰就用那一把');
ok(/fs\.writeFileSync\(secretFile, secret\)/.test(cloud), '並寫回本機 secret.key（遠端斷線時仍是對的）');
ok(/const secretFromEnv = !!secret/.test(cloud), '有設 BH_AUTH_SECRET 時不被雲端覆蓋');
ok(/let readyAll = store\.ready;/.test(cloud) && /ready: readyAll,/.test(cloud),
   'cloud.ready 等到密鑰對齊後才算完成（server 才開始接請求）');

console.log('\n========================================');
console.log('v4.85 雲端存檔：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
