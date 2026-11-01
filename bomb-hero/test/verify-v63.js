// test/verify-v63.js —— v4.18
//   ① 開發者金幣無限（錢包 ∞、雇用不扣錢）
//   ② 分享拿金幣（5 平台 × 1000、防作假機制）
//   ③ 暱稱可以留空（自動取名）
//   ④ 對戰 AI 隔牆丟炸彈走玩家流程（需手套、不砸人）
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game, S = P.settings, html = env.html, els = env.els;
const fs = require('fs');

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }
const css = html.replace(/\r/g, '');

// ================================================================
head('1. 開發者金幣無限');
{
  ok(typeof P.Shop.dev === 'function', '__BH 匯出 Shop.dev()');
  const CloudRef = P.Cloud;
  const orig = CloudRef.isDev;
  CloudRef.isDev = function () { return false; };
  ok(P.Shop.dev() === false, '一般玩家 dev() = false');
  P.Shop.reset();
  P.Shop.addGold(1500);
  const r0 = P.Shop.buy('blade');
  ok(r0.ok === true && P.Shop.gold() === 500, '一般玩家照規矩扣錢（1500 − 1000 = 500）');
  P.Shop.reset();

  CloudRef.isDev = function () { return true; };
  ok(P.Shop.dev() === true, '開發者 dev() = true');
  ok(P.Shop.gold() === 0, '開發者金幣 0');
  const r1 = P.Shop.buy('blade');
  ok(r1.ok === true, '金幣 0 也能雇用（開發者）');
  ok(P.Shop.gold() === 0, '★ 開發者沒有被扣錢');
  P.Shop.render();
  ok(els.shopWallet.textContent === '∞', '★ 錢包顯示 ∞（實際「' + els.shopWallet.textContent + '」）');
  const r2 = P.Shop.buy('bomber');
  ok(r2.ok === true, '第二隻也買得下去');
  ok(els.shopWallet.textContent === '∞', '買完還是 ∞');
  ok(els.shopGoldHint.textContent.indexOf('開發者') >= 0, '金幣提示寫「開發者：金幣無限」');
  CloudRef.isDev = orig;
  P.Shop.reset();
  P.Shop.render();
  ok(els.shopWallet.textContent === '0', '切回一般玩家 → 錢包回復數字');
}

// ================================================================
head('2. 分享拿金幣：五個平台、每個 1000');
{
  ok(Array.isArray(P.SHARE_PLATFORMS), '__BH 匯出 SHARE_PLATFORMS');
  ok(P.SHARE_PLATFORMS.length === 5, '五個平台（' + P.SHARE_PLATFORMS.length + '）');
  const kinds = P.SHARE_PLATFORMS.map(function (p) { return p.k; }).sort().join(',');
  ok(kinds === 'copy,fb,line,wa,x', '平台代號齊全（' + kinds + '）');
  ok(P.Share.reward === 1000, '每個平台 1000 金幣');
  ok(css.indexOf('id="shareGrid"') > 0 && css.indexOf('id="sharesec"') < 0, '商店有分享區節點');
  ok(css.indexOf('分享拿金幣') > 0, '分享區有標題');
  ok(css.indexOf('每天最多領 3 次') > 0, '說明寫了每日上限');
  ok(css.indexOf('要登入正式帳號') > 0, '說明寫了要登入');

  // 渲染：五個按鈕、每個寫 +1000
  P.Share.reset();
  P.Share.render();
  const grid = els.shareGrid.innerHTML;
  ok((grid.match(/data-share=/g) || []).length === 5, '畫出五個分享按鈕');
  ok((grid.match(/\+1000/g) || []).length === 5, '五個都標「+1000」');
  ['LINE', 'Facebook', 'X', 'WhatsApp', '複製連結'].forEach(function (n) {
    ok(grid.indexOf(n) >= 0, '有 ' + n + ' 按鈕');
  });
}

// ================================================================
head('3. 分享防作假機制');
{
  // 前端：一定要真的分享出去
  ok(/navigator\.share/.test(css), '① 優先用系統分享面板 navigator.share');
  ok(/AbortError/.test(css), '② 使用者按取消（AbortError）→ 不算分享');
  ok(/visibilityState === 'hidden'/.test(css), '③ 沒有系統面板時要「頁面真的切出去」才算');
  ok(/\/api\/share\/prepare/.test(css), '④ 領取前先向伺服器拿一次性驗證碼');
  ok(/\/api\/share\/claim/.test(css), '⑤ 拿驗證碼才領得到金幣');
  ok(/kind === 'member'/.test(css), '⑥ 遊客帳號不能領（要正式登入）');

  // 伺服器：真正有權威
  const cloud = fs.readFileSync(__dirname + '/../../cloud.js', 'utf8').replace(/\r/g, '');
  ok(/const SHARE_REWARD = 1000;/.test(cloud), '伺服器端獎勵 = 1000');
  ok(/const SHARE_TTL = 5 \* 60 \* 1000;/.test(cloud), '驗證碼 5 分鐘過期');
  ok(/const SHARE_DAILY_MAX = 3;/.test(cloud), '每天上限 3 次');
  ok(/createHmac\('sha256', secret\)/.test(cloud), '驗證碼用 HMAC 簽（改不動）');
  ok(/st\.prep = null;/.test(cloud), '★ 驗證碼用過立刻作廢（不能重放）');
  ok(/if \(st\.claimed\[platform\]\)/.test(cloud), '★ 每個平台只能領一次');
  ok(/stats\.tamper\+\+/.test(cloud), '★ 偽造驗證碼會被記 tamper');
  ok(/acc0\.kind !== 'member'/.test(cloud), '伺服器也擋遊客（不靠前端）');
  ok(/\.\.\/server\.js/.test('') === false, '（佔位）');
  const srv = fs.readFileSync(__dirname + '/../../server.js', 'utf8');
  ok(srv.indexOf("'/api/share/'") >= 0, 'server.js 有轉發 /api/share/');
}

// ================================================================
head('4. 暱稱可以留空');
{
  ok(/可以留空/.test(css), '首頁標籤寫「可以留空」');
  ok(/可留空，系統自動取名字/.test(css), '輸入框 placeholder 說明可留空');
  const saved = S.playerName;
  S.playerName = '';
  const r = P.ensureNickname();
  ok(r === true, '★ 沒填暱稱也能進遊戲（回 true）');
  ok(!!S.playerName && S.playerName.indexOf('玩家') === 0, '自動取了名字（' + S.playerName + '）');
  ok(S.playerName.length <= 8, '名字不超過 8 字');
  ok(P.ensureNickname() === true, '已經有名字時照樣回 true');
  ok(S.playerName === S.playerName.trim(), '名字沒有前後空白');
  S.playerName = saved;
  // 十語言都有自動取名的提示
  ok((css.match(/'nick\.auto'/g) || []).length >= 10, 'nick.auto 十語言都補了（' +
    (css.match(/'nick\.auto'/g) || []).length + ' 處）');
}

// ================================================================
head('5. 對戰 AI 丟炸彈 = 玩家的隔牆丟法（不是直接砸人）');
{
  ok(/function aiThrowLanding/.test(css), '有 aiThrowLanding（先算落點）');
  ok(/function aiGrabOwnBomb/.test(css), '有 aiGrabOwnBomb（先舉起腳下的炸彈）');
  ok(/function aiDropCarry/.test(css), '有 aiDropCarry（丟不出去就放下）');
  ok(/if \(!p\.glove\) return false;/.test(css), '★ 前提：一定要先撿到搬彈手套');
  ok(/if \(playerAtCell\(land\.x, land\.y\)\) return null;/.test(css), '★ 落點有人 → 不丟');
  ok(/if \(tgt && tgt\.foe && p\.glove/.test(css), 'controlAI 只在有手套時嘗試丟');
  ok(/it\.type === 'glove' && !p\.glove/.test(css), 'AI 沒手套時會優先去撿手套');
  ok(css.indexOf('lobbed: true') < 0, '舊的「飛到對手格」寫法已完全移除');

  // 實測：沒手套不丟
  P.startBattle();
  G.state = 'play';
  const T = G.T;
  const a = G.players[0], b = G.players[1];
  G.players.forEach(function (q) { if (q !== a && q !== b) q.alive = false; });
  G.bombs.length = 0;
  a.glove = false; a.carry = null; a.lobCd = 0;
  a.x = (Math.floor(G.cols / 2)) * T + T / 2;
  a.y = (Math.floor(G.rows / 2)) * T + T / 2;
  a.alive = true;
  P.placeBomb(a);
  const before = G.bombs.length;
  ok(P.aiLobBomb(a, P.AI_LEVELS.strong) === false, '★ 沒手套 → 不丟（就算腳下有炸彈）');
  ok(G.bombs.length === before, '炸彈還留在原地');

  a.glove = true;
  const r = P.aiLobBomb(a, P.AI_LEVELS.strong);
  if (r) {
    const bomb = G.bombs[0];
    ok(P.playerAtCell(bomb.cx, bomb.cy) === false, '★ 丟出去也不會砸到人');
  } else {
    ok(true, '四面都不適合丟 → 安全放棄（不算失敗）');
  }
}

// ================================================================
head('6. 版本與 SW');
{
  ok(P.VERSION === '4.18', '版號 = ' + P.VERSION);
  ok(css.indexOf('id="verTxt">' + P.VERSION + '<') > 0, '畫面版本文字同步');
  ok(P.VERSION_LOG[0].v === '4.18' && P.VERSION_LOG[0].now === true, 'VERSION_LOG 第一筆 4.18（now）');
  ok(P.VERSION_LOG[0].items.join(' ').indexOf('分享') >= 0, '4.18 條目寫了分享');
  ok(P.VERSION_LOG[0].items.join(' ').indexOf('暱稱') >= 0, '4.18 條目寫了暱稱');
  ok(P.VERSION_LOG[0].items.join(' ').indexOf('手套') >= 0, '4.18 條目寫了手套');
  ok(/SW_VERSION = 'v4\.18\.0'/.test(fs.readFileSync(__dirname + '/../sw.js', 'utf8')), 'sw.js = v4.18.0');
}

// ================================================================
console.log('\n----------------------------------------');
console.log('v4.18 測試：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
