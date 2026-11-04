// test/verify-v480.js —— v4.80：每日挑戰 ＋ 排行榜
//   ① 每日挑戰：日期→種子→關卡（1~31），規則固定（普通難度／3 分鐘），同一天同一張圖
//   ② 計時：只算「真的在玩」的時間，到門結算、超時／陣亡不進榜
//   ③ 排行榜前端：後端位址判斷、本機快取、裝置指紋、送出內容
//   ④ 排行榜後端：/api/lb/top 與 /api/lb/submit（真的起一台伺服器測）
//   ⑤ 10 國語系：新文案 0 缺、非中文語系不含中文
//   ⑥ 說明頁 8 分頁（新增大逃殺之後的「每日挑戰」）
//   ⑦ 版本與容量
const { makeEnv } = require('./_sandbox');
const fs = require('fs'), path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const env = makeEnv();
const P = env.BH;
const src = env.html;
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ FAIL: ' + m); } }
function head(t) { console.log('\n=== ' + t + ' ==='); }
const CJK = /[\u4e00-\u9fff]/;

// ---------- 1. 每日挑戰核心 ----------
head('1. 每日挑戰：種子與規則');
ok(typeof P.dailyDayKey === 'function' && typeof P.dailySeedOf === 'function' && typeof P.dailyStageOf === 'function',
  '三個核心函式都在（dayKey／seedOf／stageOf）');
ok(P.dailyDayKey(new Date('2026-11-04T03:00:00Z')) === '2026-11-04', 'UTC+8 換日：03:00Z 是 11:00 → 11-04');
ok(P.dailyDayKey(new Date('2026-11-04T17:00:00Z')) === '2026-11-05', 'UTC+8 換日：17:00Z 是隔天 01:00 → 11-05');
ok(P.dailySeedOf('2026-11-04') === P.dailySeedOf('2026-11-04'), '同一天 → 同一個種子');
ok(P.dailySeedOf('2026-11-04') !== P.dailySeedOf('2026-11-05'), '不同天 → 不同種子');
let stageOk = true, stages = {};
for (let d = 1; d <= 28; d++) {
  const key = '2026-03-' + (d < 10 ? '0' + d : d);
  const s = P.dailyStageOf(P.dailySeedOf(key));
  if (!(s >= 1 && s <= 31)) stageOk = false;
  stages[s] = 1;
}
ok(stageOk, '任何一天的關卡都落在 1~31（第 32 關是純魔王關，不排每日）');
ok(Object.keys(stages).length >= 10, '一個月內會打到很多不同關卡（' + Object.keys(stages).length + ' 種）');

ok(P.DAILY_TIME === 180, '每日固定 3 分鐘');
ok(P.DAILY_DIFF === 'normal', '每日固定普通難度');

// 規則不管玩家設定怎麼調都要一樣
const G = P.Game;
const oldDiff = P.settings.soloDiff, oldTime = P.settings.soloTime;
P.settings.soloDiff = 'hard'; P.settings.soloTime = '0';
G.daily = { day: '2026-11-04', seed: 1, stage: 3, ms: 0, done: false };
ok(P.buildSoloStage && true, 'buildSoloStage 存在');
// soloDiffCfg / soloTimeVal 是內部函式，用行為驗證：每日時 Game.timer 一定是 180
const st = P.Daily.stage();
P.startSolo(st, false, { day: P.Daily.today(), seed: P.Daily.seed(), stage: st, ms: 0, done: false });
ok(Math.round(G.timer) === 180, '每日挑戰的計時器固定 180 秒（玩家把時間設成無限也一樣）');
ok(G.bossRush === false, '每日挑戰不會變成 BOSS 連戰');
P.settings.soloDiff = oldDiff; P.settings.soloTime = oldTime;

// ---------- 2. 同一張圖 ----------
head('2. 決定性：同一天同一張圖');
function fingerprint(day) {
  const e = makeEnv();
  const B = e.BH;
  const seed = B.dailySeedOf(day), stage = B.dailyStageOf(seed);
  B.startSolo(stage, false, { day: day, seed: seed, stage: stage, ms: 0, done: false });
  const g = B.Game;
  const grid = g.grid.map(function (r) { return r.join(''); }).join('');
  const foes = g.enemies.map(function (x) { return x.sp + '@' + Math.round(x.x) + ',' + Math.round(x.y); }).join('|');
  const door = g.door ? g.door.x + ',' + g.door.y : '-';
  let h = 0; const all = grid + foes + door;
  for (let i = 0; i < all.length; i++) h = (h * 31 + all.charCodeAt(i)) | 0;
  return { h: h, foes: g.enemies.length, door: door, stage: stage, cells: grid.length };
}
const f1 = fingerprint('2026-11-04');
const f2 = fingerprint('2026-11-04');
const f3 = fingerprint('2026-11-05');
ok(f1.h === f2.h && f1.foes === f2.foes && f1.door === f2.door, '同一天跑兩次：地圖＋怪物＋出口完全一樣（' + f1.foes + ' 隻）');
ok(f1.h !== f3.h, '換一天就換一張圖');
ok(f1.cells > 200 && f3.cells > 200, '兩張圖都有實際內容（' + f1.cells + ' / ' + f3.cells + ' 格）');

// ---------- 3. 計時與結算 ----------
head('3. 計時與結算');
const e2 = makeEnv();
const B2 = e2.BH;
const seed2 = B2.dailySeedOf(B2.Daily.today()), stage2 = B2.dailyStageOf(seed2);
B2.startSolo(stage2, false, { day: B2.Daily.today(), seed: seed2, stage: stage2, ms: 0, done: false });
const G2 = B2.Game;
G2.state = 'play'; G2.countdown = 0;
for (let i = 0; i < 60; i++) B2.updateSolo(1 / 60);
ok(Math.round(G2.daily.ms) >= 950 && Math.round(G2.daily.ms) <= 1050, '跑 60 幀 ≈ 1000ms（實際 ' + Math.round(G2.daily.ms) + 'ms）');
G2.state = 'roundover';
const before = G2.daily.ms;
B2.updateSolo(1 / 60);
ok(G2.daily.ms === before, '過關後不再累加時間');

// 到門 → 結算
const e3 = makeEnv();
const B3 = e3.BH;
const s3 = B3.dailySeedOf(B3.Daily.today()), st3 = B3.dailyStageOf(s3);
B3.startSolo(st3, false, { day: B3.Daily.today(), seed: s3, stage: st3, ms: 42000, done: false });
const G3 = B3.Game;
G3.state = 'play';
G3.door.open = true;
const pl = G3.players[0];
pl.x = (G3.door.x + .5) * G3.T; pl.y = (G3.door.y + .5) * G3.T; pl.alive = true; pl.invuln = 0;
B3.updateSolo(1 / 60);
ok(G3.daily.done === true, '走到出口 → 挑戰結束');
ok(Math.round(G3.daily.ms) >= 42000, '結算時間保留（' + Math.round(G3.daily.ms) + 'ms）');
ok(B3.Daily.best(B3.Daily.today()) >= 42000, '本機最佳有記錄下來');

// 超時 → 結束（不是扣一條命重來）
const e4 = makeEnv();
const B4 = e4.BH;
B4.startSolo(3, false, { day: '2026-11-04', seed: 12345, stage: 3, ms: 0, done: false });
const G4 = B4.Game;
G4.state = 'play'; G4.timer = 0.001;
B4.updateSolo(1 / 60);
ok(G4.daily.done === true && G4.state === 'over', '時間到 → 直接結束（不會回滿血繼續打）');

// ---------- 4. 排行榜前端 ----------
head('4. 排行榜（前端）');
ok(typeof P.Lb === 'object' && typeof P.Lb.top === 'function' && typeof P.Lb.submit === 'function',
  'Lb.top / Lb.submit 都在');
ok(/\.github\.\(io\|com\)\$\/i\.test\(h\)\) return 'https:\/\/bomb-hero-game\.onrender\.com'/.test(src) ||
   /onrender\.com/.test(src), '靜態空間（GitHub Pages）會指向 Render 後端');
ok(/proto === 'file:'\) return 'https:\/\/bomb-hero-game\.onrender\.com'/.test(src), 'file:// 直接開也能送成績');
ok(/api\/lb\/top\?mode=daily/.test(src) && /api\/lb\/submit/.test(src), '呼叫的端點正確');
ok(/cache: 'no-store'/.test(src), '排行榜請求不吃瀏覽器快取（才看得到別人的新成績）');
const dl = P.Lb.deviceId();
ok(typeof dl === 'string' && dl.length >= 8, '有裝置指紋（' + dl.length + ' 字）');
ok(P.Lb.deviceId() === dl, '同一台裝置指紋穩定（送榜才不會重複）');
ok(/bombhero-lb-/.test(src) && /bombhero-daily-best/.test(src), '本機快取 key 存在（離線看得到上一次的榜）');
ok(/MAX_KEEP: 30/.test(src), '本機最佳只留 30 天（不會撐爆 localStorage）');

// v4.80 修正：第一次連 Render 會卡 7 秒以上才通，單次 9 秒逾時會誤判離線
ok(typeof P.Lb._retry === 'function', 'Lb 有 _retry（失敗會再試一次）');
ok(/if \(j && \(j\.err === 'TIMEOUT' \|\| j\.err === 'NET'\)\) return Lb\._once\(url, method, body\)/.test(src),
  '逾時／斷線會自動重試一次');
ok(/TIMEOUT: 10000/.test(src), '單次逾時放寬到 10 秒');
ok(/\$id\('btnLbReload'\)\.addEventListener\('click'/.test(src), '「重新整理」按鈕真的有綁 click（v4.80 之前只換文字）');
ok(/Lb\.last = null;[\s\S]{0,40}renderLbList\(true\)/.test(src), '重新整理會清掉 Lb.last 並強制重抓');
ok(/function renderLbList\(force\)/.test(src), 'renderLbList 吃 force 參數');

// ---------- 5. 排行榜後端 ----------
head('5. 排行榜（後端）');
const cloudSrc = fs.readFileSync(path.join(ROOT, '..', 'cloud.js'), 'utf8');
const srvSrc = fs.readFileSync(path.join(ROOT, '..', 'server.js'), 'utf8');
ok(/isLb\) return false/.test(cloudSrc) && /p\.indexOf\('\/api\/lb\/'\) === 0/.test(cloudSrc), 'cloud.js 接了 /api/lb/* 路由');
ok(/url\.pathname\.indexOf\('\/api\/lb\/'\) === 0/.test(srvSrc), 'server.js 把 /api/lb/* 轉給 cloud');
ok(/Access-Control-Allow-Origin': '\*'/.test(cloudSrc), '排行榜端點回 CORS 萬用字元（Pages 才讀得到）');
ok(/LB_MAX_MS = 3600000, LB_MIN_MS = 3000/.test(cloudSrc), '只收 3 秒 ~ 60 分鐘的時間（亂填的直接擋掉）');
ok(/if \(day !== today\)/.test(cloudSrc) || /day !== today/.test(cloudSrc), '只接受「今天」的成績（改日期洗榜無效）');
ok(/d === dev/.test(cloudSrc) && /improved/.test(cloudSrc), '同裝置只保留最佳成績');

// 真的起一台伺服器，走一次完整的送榜／讀榜
const PORT = 3199;
async function apiTest() {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: path.join(ROOT, '..'),
    env: Object.assign({}, process.env, { PORT: String(PORT), BH_DATA_DIR: path.join(__dirname, '_lbdata') }),
    stdio: 'ignore'
  });
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const call = (method, p, body) => new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : '';
    const req = http.request({
      host: '127.0.0.1', port: PORT, path: p, method: method,
      headers: body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}
    }, res => {
      let s = ''; res.on('data', c => s += c);
      res.on('end', () => { try { resolve(JSON.parse(s)); } catch (e) { resolve({ ok: false, err: 'BAD_JSON' }); } });
    });
    req.on('error', () => resolve({ ok: false, err: 'NET' }));
    req.setTimeout(4000, () => { req.destroy(); resolve({ ok: false, err: 'TIMEOUT' }); });
    if (body) req.write(data);
    req.end();
  });
  try {
    let up = false;
    for (let i = 0; i < 30; i++) {
      const h = await call('GET', '/api/health');
      if (h && h.ok) { up = true; break; }
      await wait(200);
    }
    if (!up) { ok(false, '伺服器起不來（無法測排行榜 API）'); return; }
    const today = P.dailyDayKey();
    const empty = await call('GET', '/api/lb/top?mode=daily&day=' + today);
    ok(empty && empty.ok && Array.isArray(empty.list), 'GET /api/lb/top 回空榜單也不報錯');
    const r1 = await call('POST', '/api/lb/submit',
      { mode: 'daily', day: today, name: '測試小明', ms: 88800, deviceId: 'dev-verify480aaaa' });
    ok(r1 && r1.ok && r1.rank === 1, '送出成績 → 第 1 名（' + (r1 && r1.rank) + '）');
    const r2 = await call('POST', '/api/lb/submit',
      { mode: 'daily', day: today, name: '測試小明', ms: 99900, deviceId: 'dev-verify480aaaa' });
    ok(r2 && r2.ok && r2.improved === false && r2.best === 88800, '同一台裝置送更慢的成績 → 不覆蓋');
    const r3 = await call('POST', '/api/lb/submit',
      { mode: 'daily', day: today, name: '測試小明', ms: 50000, deviceId: 'dev-verify480aaaa' });
    ok(r3 && r3.ok && r3.improved === true && r3.best === 50000, '同一台裝置送更快的成績 → 蓋過去');
    const r4 = await call('POST', '/api/lb/submit',
      { mode: 'daily', day: today, name: '駭客', ms: 100, deviceId: 'dev-verify480bbbb' });
    ok(r4 && r4.ok === false && r4.err === 'BAD_TIME', '1 秒以内的假成績被擋（BAD_TIME）');
    const r5 = await call('POST', '/api/lb/submit',
      { mode: 'daily', day: '2020-01-01', name: '駭客', ms: 60000, deviceId: 'dev-verify480cccc' });
    ok(r5 && r5.ok === false && r5.err === 'WRONG_DAY', '拿舊日期洗榜被擋（WRONG_DAY）');
    const top = await call('GET', '/api/lb/top?mode=daily&day=' + today);
    ok(top && top.ok && top.list.length === 1 && top.list[0].ms === 50000, '榜單只剩 1 筆且是最快的那次');
    ok(top.list[0].n === '測試小明', '暱稱正確回傳');
    const bad = await call('GET', '/api/lb/top?mode=nope');
    ok(bad && bad.ok === false, '亂給 mode 會被拒');
  } finally {
    try { child.kill(); } catch (e) {}
    await wait(150);
    try { fs.rmSync(path.join(__dirname, '_lbdata'), { recursive: true, force: true }); } catch (e) {}
  }
}

// ---------- 6. 5 國語系（v5.0 砍掉 th/vi/ru/de/it，只留繁中／簡中／英／日／韓） ----------
head('6. 5 國語系');
const LANGS = ['zh-TW', 'zh-CN', 'en', 'ja', 'ko'];
const KEYS = ['menu.daily', 'menu.daily.sub', 'menu.lb', 'menu.lb.sub',
  'daily.title', 'daily.desc', 'daily.labDay', 'daily.labSeed', 'daily.labStage', 'daily.labBest',
  'daily.stageVal', 'daily.noBest', 'daily.go', 'daily.ovTitle', 'daily.ovSub', 'daily.ovRule',
  'daily.fixedDiff', 'daily.winTitle', 'daily.loseTitle', 'daily.winSub', 'daily.loseSub',
  'daily.rankLine', 'daily.again',
  'lb.titleToday', 'lb.open', 'lb.empty', 'lb.loading', 'lb.online', 'lb.cached', 'lb.offline', 'lb.reload',
  'help.tab.daily', 'help.daily.lead', 'help.daily.goal', 'help.daily.seed', 'help.daily.rules',
  'help.daily.rank', 'help.daily.offline', 'help.daily.tip',
  'ver.4.80.1', 'ver.4.80.2', 'ver.4.80.3', 'ver.4.80.4'];
let missing = 0;
LANGS.forEach(function (L) {
  const dict = P.I18N[L] || {};
  KEYS.forEach(function (k) { if (!dict[k]) { missing++; console.log('    缺 ' + L + ' / ' + k); } });
});
ok(missing === 0, '新增的 ' + KEYS.length + ' 條文案 × 5 語言，0 缺（缺 ' + missing + '）');

// 非中文語系不可以留中文（專有名詞如「關」允許出現在 number+關 的格式，這裡只看整句）
let cnLeft = [];
['en', 'ja', 'ko'].forEach(function (L) {
  P.setLang(L);
  KEYS.forEach(function (k) {
    const v = P.t(k);
    if (!v || v === k) return;
    const stripped = v.replace(/<[^>]+>/g, '');
    if (CJK.test(stripped)) {
      // 日文允許漢字（它本來就是漢字語言）
      if (L === 'ja') { if (!/[\u3040-\u30ff]/.test(stripped)) cnLeft.push(L + '/' + k); }
      else cnLeft.push(L + '/' + k);
    }
  });
});
ok(cnLeft.length === 0, '非中文語系沒有殘留中文（' + (cnLeft.slice(0, 4).join(', ') || '0 條') + '）');
P.setLang('zh-TW');

// ---------- 7. 說明頁 ----------
head('7. 說明頁');
ok(/const HELP_TABS = \['basic', 'item', 'ride', 'stage', 'br', 'daily', 'foe', 'tip'\]/.test(src), '說明頁 8 分頁，新增「每日挑戰」');
ok(/data-ht="daily"/.test(src), '分頁按鈕存在');
ok(/function buildDaily\(\)/.test(src) && /else if \(tab === 'daily'\) h = buildDaily\(\);/.test(src), 'buildDaily 接上了');
ok(/\['goal', 'seed', 'rules', 'rank', 'offline', 'tip'\]\.forEach/.test(src), '每日挑戰 6 張卡（目標／種子／規則／榜／離線／訣竅）');
ok(/daily: \{ tw: '📅 每日挑戰'/.test(src), '分頁標題走 HELP_TAB_TXT（可被即時翻譯層接手）');

// ---------- 8. 版本與容量 ----------
head('8. 版本與容量');
// 版號不寫死：這一支講的是「每日挑戰/排行榜」這件事，後面版本不該讓它紅
ok(parseFloat(P.VERSION) >= 4.80, 'VERSION = ' + P.VERSION);
ok(P.VERSION_LOG.filter(function (x) { return x.now; }).length === 1, '版本紀錄只有一筆 now（現在版本）');
ok(P.VERSION_LOG[0].now === true && parseFloat(P.VERSION_LOG[0].v) >= 4.80, '最上面那筆 = 現在版本（' + P.VERSION_LOG[0].v + '）');
// 版號寫法 4.9 → 4.10 不是數值序，日期也有幾筆歷史筆誤 → 只驗「筆數夠多、格式對」
ok(P.VERSION_LOG.length > 50, '版本紀錄有 ' + P.VERSION_LOG.length + ' 筆');
ok(P.VERSION_LOG.every(function (x) { return /^\d+\.\d+$/.test(x.v) && /^\d{4}-\d{2}-\d{2}$/.test(x.date) && Array.isArray(x.items) && x.items.length > 0; }),
  '每筆都有版號、日期、至少一條內容');
ok(P.VERSION_LOG.some(function (x) { return x.v === '4.80' && x.now === false; }), '4.80 已改成 now:false');
['../sw.js', '../../public/sw.js', '../../bomberman-online/public/sw.js'].forEach(function (p2) {
  const t2 = fs.readFileSync(path.join(__dirname, p2), 'utf8');
  ok(/SW_VERSION = 'v\d+\.\d+\.\d+'/.test(t2), p2 + ' 版本有跟上（' + (/SW_VERSION = '([^']+)'/.exec(t2) || [])[1] + '）');
});
ok(src.length < 3900000, '字元數 ' + src.length.toLocaleString() + ' < 3.9M');
ok(Buffer.byteLength(src, 'utf8') < 4250000, '位元組 ' + Buffer.byteLength(src, 'utf8').toLocaleString() + ' < 4.25M');
ok((src.match(/\r/g) || []).length === 0, '整檔 LF（0 個 \\r）');

// ---------- 9. 非同步的後端測試收尾 ----------
(async () => {
  await apiTest();
  console.log('\n' + (fail ? '✗ ' + fail + ' 失敗 / ' + pass + ' 通過' : '✅ v4.80：' + pass + ' 通過 / 0 失敗'));
  process.exit(fail ? 1 : 0);
})();
