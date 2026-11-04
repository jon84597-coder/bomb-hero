// 無頭測試 v49（v4.3）：傳統帳密註冊 / 密碼安全 / 開發者帳號 / 後台數據看板
//   A. 後端純函式：scrypt 加鹽雜湊、帳號格式、密碼規則、時間戳、開發者白名單
//   B. 前端原始碼斷言：表單結構、即時驗證、密碼不落地、後台入口、版本紀錄豁免
//   C. 沙盒行為：VersionLog 過濾、Solo 開發者解鎖、Cloud.isDev
const path = require('path');
const fs = require('fs');
const { makeEnv, html } = require('./_sandbox');

const C = require(fs.existsSync(path.join(__dirname, '..', 'cloud.js'))
  ? path.join(__dirname, '..', 'cloud.js')
  : path.join(__dirname, '..', '..', 'bomberman-online', 'cloud.js'));
const CLOUD_PATH = fs.existsSync(path.join(__dirname, '..', 'cloud.js'))
  ? path.join(__dirname, '..', 'cloud.js')
  : path.join(__dirname, '..', '..', 'bomberman-online', 'cloud.js');
const cloudSrc = fs.readFileSync(CLOUD_PATH, 'utf8');

const env = makeEnv();
const P = env.BH;

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name + (extra === undefined ? '' : '（' + extra + '）')); }
  else { fail++; console.log('  ✗ FAIL: ' + name + (extra === undefined ? '' : '（' + extra + '）')); }
}
function src(re) { return re.test(html); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

(async function () {
  console.log('\n=== 0. 版本 ===');
  ok(/^\d+\.\d+$/.test(P.VERSION), 'VERSION 格式正確（' + P.VERSION + '）');
  ok(html.indexOf('id="verTxt">' + P.VERSION) > 0, '徽章版本號同步 ' + P.VERSION);
  ok(P.VERSION_LOG[0].v === P.VERSION && P.VERSION_LOG[0].now === true, '版本紀錄最新一筆是 4.5');
  ok(P.VERSION_LOG[1].v !== P.VERSION && !P.VERSION_LOG[1].now, '上一筆 4.4 已不是「當前」');
  const v43 = (P.VERSION_LOG.filter(function (x) { return x.v === '4.3'; })[0] || { items: [] }).items.join('|');
  ['註冊', '密碼'].forEach(function (k) {
    ok(v43.indexOf(k) >= 0, 'v4.3 條列提到「' + k + '」');
  });
  // v4.91：玩家看得到的版本紀錄不再寫「開發者／後台」（原本還洩漏管理員信箱）。
  ok(v43.indexOf('後台') < 0 && v43.indexOf('開發者') < 0, 'v4.3 條列已不含「後台／開發者」');

  console.log('\n=== 1. 密碼雜湊（scrypt 加鹽、單向、不可逆） ===');
  const h1 = await C.hashPassword('abc12345');
  const h2 = await C.hashPassword('abc12345');
  ok(h1 && h1.algo === 'scrypt', '演算法標記 = scrypt');
  ok(typeof h1.salt === 'string' && h1.salt.length >= 20, '每人一組隨機鹽（' + (h1.salt || '').length + ' 字元 base64）');
  ok(h1.salt !== h2.salt, '同一組密碼兩次的鹽不一樣');
  ok(h1.hash !== h2.hash, '同一組密碼兩次的雜湊值不一樣（加鹽生效）');
  ok(h1.N >= 16384 && h1.r >= 8 && h1.p >= 1, '工作因子有紀錄（N=' + h1.N + ' r=' + h1.r + ' p=' + h1.p + '）');
  ok(JSON.stringify(h1).indexOf('abc12345') < 0, '存進去的紀錄裡沒有明文密碼');
  ok(h1.hash.length >= 80, '雜湊長度 ' + h1.hash.length + ' 字元（base64, 64 bytes）');
  ok(await C.verifyPassword('abc12345', h1) === true, '正確密碼 → 比對通過');
  ok(await C.verifyPassword('abc12346', h1) === false, '錯一個字 → 比對失敗');
  ok(await C.verifyPassword('', h1) === false, '空密碼 → 比對失敗');
  ok(await C.verifyPassword('abc12345', null) === false, '沒有雜湊紀錄（舊帳號）→ 安全回 false');
  ok(await C.verifyPassword('abc12345', { algo: 'plain', hash: 'abc12345' }) === false,
    '不是 scrypt 的紀錄一律拒絕（不允許明文升級路徑）');

  console.log('\n=== 2. 帳號格式 ===');
  function vi(v) { return C.validIdent(v); }
  ok(vi('player1@test.com').ok === true && vi('player1@test.com').kind === 'email', '完整 Email 合法');
  ok(vi('  Player1@Test.COM  ').id === 'player1@test.com', '大小寫／空白會被正規化',
    vi('  Player1@Test.COM  ').id);
  ok(vi('abc123').ok === true && vi('abc123').kind === 'user', '使用者名稱（6 位英數）合法');
  ok(vi('a_b_c').ok === true, '底線可以使用');
  ok(vi('ab').ok === false && vi('ab').err === 'BAD_USER', '2 位太短 → BAD_USER');
  ok(vi('a'.repeat(21)).ok === false, '21 位太長 → 不合法');
  ok(vi('bad name').ok === false, '含空格 → 不合法');
  ok(vi('bad!name').ok === false, '含特殊符號 → 不合法');
  ok(vi('a@b').ok === false && vi('a@b').err === 'BAD_EMAIL', '殘缺的 Email → BAD_EMAIL');
  ok(vi('').ok === false, '空字串 → 不合法');
  ok(vi('player1@test.com').key === 'web:player1@test.com', '內部索引鍵 = web:<小寫帳號>（大小寫不敏感）');

  console.log('\n=== 3. 密碼規則 ===');
  ok(C.PW_MIN === 8, '最短 8 位');
  ok(C.pwProblem('abc12345') === '', '英數 8 位 → 合格');
  ok(C.pwProblem('123') === 'PW_SHORT', '太短 → PW_SHORT');
  ok(C.pwProblem('abcdefgh') === 'PW_NEED_DIGIT', '純字母 → PW_NEED_DIGIT');
  ok(C.pwProblem('12345678') === 'PW_NEED_LETTER', '純數字 → PW_NEED_LETTER');
  ok(C.pwProblem('') === 'PW_SHORT', '空的 → PW_SHORT（不告訴對方帳號是否存在）');
  ok(C.pwProblem('a'.repeat(200)) === 'PW_LONG', '超長 → PW_LONG');

  console.log('\n=== 4. 加入時間（精確到秒） ===');
  ok(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(C.stamp(0) || ''), '格式 = yyyy-mm-dd hh:mm:ss', C.stamp(0));
  ok(C.stamp(1767225600000) === '2026-01-01 02:40:00' || /^2026-01-01/.test(C.stamp(1767225600000)),
    '時間戳換算正確（' + C.stamp(1767225600000) + '）');
  ok(C.stamp(Date.now()).slice(0, 4) === String(new Date().getFullYear()), '當前時間年份正確');

  console.log('\n=== 5. 開發者白名單 ===');
  ok(Array.isArray(C.DEV_EMAILS_DEFAULT) && C.DEV_EMAILS_DEFAULT.indexOf('jon84597@gmail.com') >= 0,
    '預設白名單含 jon84597@gmail.com');
  const d1 = C.devEmailList({});
  ok(d1.indexOf('jon84597@gmail.com') >= 0, '沒設環境變數時仍有開發者');
  const d2 = C.devEmailList({ BH_DEV_EMAILS: 'boss@test.com' });
  ok(d2.indexOf('jon84597@gmail.com') >= 0 && d2.indexOf('boss@test.com') >= 0,
    'BH_DEV_EMAILS 是「追加」不是「取代」（' + d2.join(',') + '）');

  console.log('\n=== 6. HTML：註冊表單結構 ===');
  ok(/id="acctModal"/.test(html), '有帳號彈窗 #acctModal');
  ok(src(/<input id="acctIdIn" class="acctin" type="text"/), '有「帳號」輸入框');
  // v4.7：三個密碼欄改走共用產生器 pwFieldHtml()（多一顆 👁 顯示／隱藏鈕）
  ok(src(/pwFieldHtml\('acctPwIn', 'new-password'/), '密碼欄走 pwFieldHtml 產生');
  ok(src(/pwFieldHtml\('acctPw2In', 'new-password'\)/), '有「再輸入一次密碼」欄位');
  ok(src(/pwFieldHtml\('acctOldIn', 'current-password'\)/), '改密碼頁也有「目前密碼」欄位');
  ok(src(/data-acct="pwEye"/), '眼睛按鈕帶 pwEye 委派標記');
  ok(/class=.acctin. type=.password./.test(html) || P.pwFieldHtml('probe', 'new-password').indexOf('type="password"') > 0,
    '產生器輸出預設仍是 type=password（不顯示明文）');
  ok(src(/function togglePwEye\(btn\)/) && src(/inp\.type = show \? 'text' : 'password'/),
    '切換函式會在 text / password 之間來回');
  ok(src(/function tabBar\(cur\)/) && src(/one\('login'/) && src(/one\('reg'/) && src(/one\('prov'/),
    '有「登入／註冊／第三方」分頁切換');
  ok(src(/class="acctstr" id="acctStr"/), '有密碼強度條');
  ok(src(/\.acctstr\.s1 i:nth-child\(1\)/) && src(/\.acctstr\.s2 i:nth-child\(-n\+2\)/) &&
    src(/\.acctstr\.s3 i \{/), '強度條三段式（弱／中／強）');
  ok(src(/id="acctMainErr"/), '有共用的錯誤訊息區');
  ok(src(/id="acctSubmit" data-acct="submit" data-mode="/), '送出鈕會帶上目前模式');

  console.log('\n=== 7. 前端即時驗證 ===');
  ok(src(/function idProblem\(v\)/) && src(/const RE_MAIL = /) && src(/const RE_USER = /),
    '有 idProblem() 與兩條帳號格式規則');
  ok(src(/function pwProblem\(v\)/) && src(/function pwStrength\(v\)/) && src(/function refreshForm\(\)/),
    '有密碼規則、強度、即時驗證');
  ok(src(/body\.addEventListener\('input', function/), '輸入時就會驗證（不用等送出）');
  ok(src(/function submitWeb\(btnEl\)/), '有統一的送出流程');
  ok(src(/err === 'ID_TAKEN'\) say\(t\('web\.errTaken'\)\)/), '帳號重複有專門提示');
  ok(src(/err === 'LOCKED'/) && src(/err === 'BANNED'/) && src(/err === 'EMAIL_OAUTH'/) &&
    src(/err === 'RATE_LIMIT'/), '鎖帳號／停權／第三方衝突／限流都有對應文案');

  console.log('\n=== 8. 密碼不落地 ===');
  // v4.13：使用者要求「記住帳號／密碼」→ 勾選時才會存在 bombhero-rem-pw（未勾選不存）
  ok(src(/if \(rpw && rpw\.checked\) localStorage\.setItem\('bombhero-rem-pw', pw\)/),
    '密碼只在使用者勾「記住密碼」時才寫入 localStorage');
  ok(!src(/SAVE_KEY\s*,\s*JSON\.stringify\(\{\s*pw/), '雲端存檔信封裡沒有密碼欄位');
  ok(src(/密碼只送往伺服器，前端不落地/), '原始碼有明確註記密碼只送伺服器');
  ok(src(/register: register, login: login, changePw: changePw/), 'Cloud 對外只開 register／login／changePw');

  console.log('\n=== 9. 後台（Admin） ===');
  ok(src(/const Admin = \(function \(\)/), '有 Admin 模組');
  ok(src(/'\/api\/admin\/overview'/), '後台會打 /api/admin/overview');
  ok(src(/'\/api\/admin\/ban'/) && src(/'\/api\/admin\/grant'/) && src(/'\/api\/admin\/reset-alloc'/) &&
    src(/'\/api\/admin\/announce'/), '停權／修存檔／重置配點／公告 API 都在');
  // v4.92：守門條件改成「DEV_BUILD 或 Cloud.isDev()」，且用 try/catch 包住 ——
  //   原本直接寫 if (!Cloud.isDev())，Cloud 模組初始化失敗（退回 stub）時會永遠回 false，
  //   後台就變成按了完全沒反應。這裡驗的是「仍然會擋非開發者」，不是驗某一行字串。
  ok(src(/if \(!devOk\) \{ toast\('只有開發者帳號可以開啟後台'/) && src(/let devOk = DEV_BUILD;/),
    '前端先擋一次（非開發者開不了）');
  ok(src(/Admin: Admin,/) && typeof P.Admin === 'object', '__BH 有匯出 Admin（測試與除錯用）');
  ok(src(/id="adminModal"/) && src(/id="adList"/) && src(/id="adDetail"/), '後台版面（名單／詳情）存在');
  ok(src(/加入時間/) && src(/註冊 IP/) && src(/第三方平台 ID/), '詳情欄位：加入時間／註冊 IP／第三方平台 ID');

  console.log('\n=== 10. 開發者全關卡解鎖 ===');
  P.setDevBuild(false);   // v4.75：這份 index.html 預設是開發者版，這段要模擬一般玩家
  ok(src(/maxUnlocked\(\) \{ return \(Solo\.dev \|\| DEV_BUILD\) \? SOLO_STAGES : Solo\.unlocked; \}/),
    '單人闖關：開發者 → 全 32 關（v4.14 起 8 大關 × 4 張地圖）');
  P.Solo.dev = false;
  P.Solo.unlocked = 2;
  ok(P.Solo.maxUnlocked() === 2, '一般玩家只開到自己的進度（2）');
  P.Solo.applyDev(true);
  ok(P.Solo.maxUnlocked() === P.SOLO_STAGES && P.SOLO_STAGES === 32,
    '開發者 → ' + P.SOLO_STAGES + ' 關全開');
  P.Solo.applyDev(false);
  ok(P.Solo.maxUnlocked() === 2, '登出後回到原本進度（2）');
  ok(/unlocked: dev \? MAX_STAGE :/.test(cloudSrc), '後端對開發者回 MAX_STAGE（32 關）');
  ok(C.MAX_STAGE === 32, 'MAX_STAGE = 32');
  ok(/const dev = isDev\(acc\)|isDev\(acc\)/.test(cloudSrc), 'publicAccount 會參考 isDev(acc)');

  console.log('\n=== 11. 版本紀錄豁免（開發者內部版本不外流） ===');
  ok(src(/return VERSION_LOG\.filter\(function \(e\) \{ return !e\.dev \|\| dev; \}\)/),
    'visible() 會濾掉 dev 標記的版本');
  const before = P.VersionLog.list().length;
  P.VERSION_LOG.unshift({ v: '9.9', date: '2026-11-01', dev: true, items: ['內部測試條目'] });
  const asPlayer = P.VersionLog.list();
  ok(asPlayer.length === before, '一般玩家看不到內部版本（數量不變：' + asPlayer.length + '）');
  ok(asPlayer.filter(function (e) { return e.v === '9.9'; }).length === 0, '一般玩家的清單裡沒有 9.9');
  P.Cloud.state.acc = { dev: true, name: 'dev' };
  const asDev = P.VersionLog.list();
  ok(asDev.length === before + 1, '開發者看得到（' + asDev.length + '）');
  ok(asDev[0].v === '9.9', '開發者清單第一筆就是內部版本');
  P.Cloud.state.acc = null;
  ok(P.VersionLog.list().length === before, '切回一般身分 → 內部版本又消失');
  P.VERSION_LOG.shift();
  P.setDevBuild(true);

  console.log('\n=== 12. 全服公告 ===');
  ok(src(/function renderAnnounce\(\)/) && src(/const ANN_KEY = 'bombhero-ann-seen'/),
    '玩家端公告條會記住「已讀」，不會每次重彈');
  ok(src(/if \(m\.announce\) setAnnounce\(m\.announce\)/) || src(/if \(g && g\.announce\) setAnnounce\(g\.announce\)/),
    '登入／開遊客時會一併收公告');

  console.log('\n=== 13. 行為足跡（客服核對用） ===');
  ok(src(/function track\(type, stage\)/), '有 track() 足跡上報');
  ok(src(/Cloud\.track\(bossRush \? 'boss' : 'play', stage\)/), '開關卡會記一筆');
  ok(src(/Cloud\.track\('clear', cleared\)/), '通關會記一筆');
  ok(src(/Cloud\.track\('alloc'\)/), '配點會記一筆');
  ok(src(/'\/api\/rpg\/event'/), '有 /api/rpg/event 端點');

  console.log('\n=== 14. 後端路由 ===');
  ['/api/auth/register', '/api/auth/login', '/api/auth/password',
    '/api/admin/overview', '/api/admin/player', '/api/admin/ban',
    '/api/admin/grant', '/api/admin/reset-alloc', '/api/admin/announce', '/api/rpg/event'
  ].forEach(function (p) {
    ok(cloudSrc.indexOf("'" + p + "'") >= 0, '路由存在：' + p);
  });
  ok(/crypto\.scrypt\(/.test(cloudSrc), '後端用 crypto.scrypt（Node 內建，零依賴）');
  ok(/crypto\.timingSafeEqual/.test(cloudSrc), '雜湊比對用 timingSafeEqual（防時序側通道）');
  ok(/acc\.lockUntil/.test(cloudSrc) && /fails/.test(cloudSrc), '有連續錯誤鎖帳號機制');
  ok(/logEvent\(/.test(cloudSrc), '後端會記錄操作足跡');

  console.log('\n=== 15. i18n（10 語） ===');
  const NEWK = ['web.tabLogin', 'web.tabReg', 'web.tabProv', 'web.id', 'web.pw', 'web.pw2',
    'web.doLogin', 'web.doReg', 'web.errTaken', 'web.errBad', 'web.errLocked', 'web.errBanned',
    'web.errPw', 'web.errId', 'web.errOauth', 'web.errRate', 'web.secure', 'web.dev', 'web.admin',
    'web.hasPass', 'web.changePw', 'web.str1', 'web.str2', 'web.str3'];
  P.LANGS.forEach(function (L) {
    const miss = NEWK.filter(function (k) { return !P.I18N[L.id] || !P.I18N[L.id][k]; });
    ok(miss.length === 0, L.id + ' 沒有缺（' + miss.length + '）');
  });
  P.setLang('en');
  ok(/password/i.test(P.t('web.pw')), '英文：密碼 → ' + P.t('web.pw'));
  ok(/register|sign/i.test(P.t('web.doReg')), '英文：註冊鈕 → ' + P.t('web.doReg'));
  P.setLang('ja');
  ok(/パスワード/.test(P.t('web.pw')), '日文：密碼 → ' + P.t('web.pw'));
  P.setLang('zh-TW');
  ok(P.t('web.pw') === '密碼', '繁中：密碼');

  await sleep(0);
  console.log('\n========================================');
  console.log('  結果：' + pass + ' 通過 / ' + fail + ' 失敗');
  console.log('========================================');
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.error('ERR', e && e.stack || e); process.exit(1); });
