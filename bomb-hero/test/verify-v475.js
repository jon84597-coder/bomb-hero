// test/verify-v475.js —— v4.75
//   ① 開發者預設（全關卡、金幣無限）
//   ② 八大關卡氛圍底圖（bg/*.webp）與對戰／大逃殺用首頁封面
//   ③ 大逃殺開局選項：30/50 人、單人/2/3/4 人組隊、5 分鐘 5 圈 / 10 分鐘 10 圈
//   ④ 提示不擋畫面（大逃殺不再用 banner 巨字）
const { makeEnv } = require('./_sandbox');
const fs = require('fs'), path = require('path');
const env = makeEnv();
const P = env.BH, G = P.Game, src = env.html;
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ FAIL: ' + m); } }
function head(t) { console.log('\n=== ' + t + ' ==='); }

head('1. 開發者預設（這份 index.html）');
ok(P.DEV_BUILD !== undefined || /let DEV_BUILD = true;/.test(src), '主檔標了 DEV_BUILD = true');
ok(P.Solo.maxUnlocked() === P.SOLO_STAGES, '預設全 32 關解鎖（' + P.Solo.maxUnlocked() + '）');
ok(P.Shop.dev() === true, '預設視為開發者');
P.Shop.reset(); P.Shop.render();
ok(env.els.shopWallet.textContent === '∞', '錢包顯示 ∞');
P.Shop.addGold(100); const g0 = P.Shop.gold();
P.Shop.buy('blade');
ok(P.Shop.gold() === g0, '開發者買東西不扣錢');
P.setDevBuild(false);
ok(P.Shop.dev() === false && P.Solo.maxUnlocked() === P.Solo.unlocked, '關掉 DEV_BUILD 就回到一般玩家');
P.setDevBuild(true);

head('2. 八大關卡氛圍底圖');
const BGS = ['forest', 'sand', 'ice', 'lava', 'neon', 'sea', 'sky', 'dark'];
let allOk = true, tot = 0;
BGS.forEach(function (st) {
  const f = path.join(__dirname, '../bg/' + st + '.webp');
  if (!fs.existsSync(f)) { allOk = false; return; }
  const b = fs.readFileSync(f);
  tot += b.length;
  // WebP 檔頭：RIFF....WEBP
  if (String(b.slice(0, 4)) !== 'RIFF' || String(b.slice(8, 12)) !== 'WEBP') allOk = false;
});
ok(allOk, '8 張 bg/*.webp 都在、檔頭是 WebP（合計 ' + Math.round(tot / 1024) + 'KB）');
// v5.11：底圖改成「會重試」的 bgTryLoad／bgSrcOf，網址仍必須是 bg/<style>.webp
ok(/function bgSrcOf\(key\)[\s\S]{0,120}'bg\/' \+ key \+ '\.webp'/.test(src), '底圖網址由 bgSrcOf 產生（bg/<style>.webp）');
ok(/function bgTryLoad\(key\)[\s\S]{0,400}im\.src = bgSrcOf\(key\)/.test(src), '載入失敗會重試（bgTryLoad → bgSrcOf）');
ok(/Game\.mode === 'battle' \|\| Game\.mode === 'br'/.test(src) && /IMG_TITLEBG/.test(src),
  '對戰／大逃殺改用首頁封面底圖');
ok(/globalCompositeOperation = 'overlay'/.test(src), '氛圍照片會用 overlay 混到地板上');
ok(/^bg\/title\.webp$/.test(P.IMG_TITLEBG), '首頁底圖獨立成 bg/title.webp（順便空出 100KB）');

head('3. 大逃殺開局選項');
ok(P.BR.opt && P.BR.opt.n === 30 && P.BR.opt.team === 1 && P.BR.opt.dur === 10, '預設 30 人／單人／10 分鐘');
ok(P.BR.PH10.length === 10 && P.BR.PH5.length === 5, '兩套毒圈表（10 段／5 段）');
P.BR.opt = { n: 50, team: 3, dur: 5 };
ok(P.startBR() === true, '50 人 / 3 人組隊 / 5 分鐘 開得起來');
ok(G.players.length === 50, '50 人同場（' + G.players.length + '）');
ok(G.players.every(function (p) { return p.team >= 0; }), '每個人都被分到隊伍');
ok(G.players[0].team === 0 && G.players[1].team === 0 && G.players[2].team === 0 && G.players[3].team === 1,
  '每 3 人一隊（我 / 2 / 3 同隊，第 4 人換隊）');
ok(new Set(G.players.map(function (p) { return p.team; })).size === 17, '共 17 隊（' + new Set(G.players.map(function (p) { return p.team; })).size + '）');
ok(G.teamsOn === 3, 'Game.teamsOn = 3（火焰判定會跳過同隊）');
ok(P.BR.PH.length === 5 && Math.abs(G.brZone.t - (60 - P.BR.SHRINK)) < .5,
  '5 分鐘模式：5 段、第一段等待 60 秒（扣掉 8 秒收圈 = ' + G.brZone.t + '）');
ok(G.players[0].brHp === 10, '10 點血');
ok(/Game\.teamsOn >= 2 && b\.owner && b\.owner !== p && b\.owner\.team >= 0 && b\.owner\.team === p\.team/.test(src), '投射物也不會打到自己人');
ok(/function sameTeam\(a, b\)/.test(src) && (src.match(/sameTeam\(p, q\)/g) || []).length >= 2, 'AI 選目標時跳過隊友（兩處）');

// 勝負：只剩一隊 → 奪冠（不必等到只剩 1 人）
(function () {
  G.state = 'play';
  const alive = G.players.filter(function (p) { return p.alive; });
  alive.forEach(function (p, i) { if (p.team !== 0) { p.alive = false; } });
  G.brAlive = G.players.filter(function (p) { return p.alive; }).length;
  let n = 0;
  for (let i = 0; i < 60 * 4; i++) { try { P.updateBR(1 / 60); } catch (e) {} if (G.endShown) { n++; break; } }
  ok(G.endShown === true, '只剩自己這一隊 → 直接結算奪冠');
})();

P.BR.opt = { n: 30, team: 1, dur: 10 };
P.startBR();
ok(G.players.length === 30 && G.teamsOn === 0 && P.BR.PH.length === 10, '切回單人 30 人 / 10 分鐘');

head('4. 提示不擋畫面中央');
ok(/function brTip\(/.test(src) && /box\.id = 'brTips'/.test(src), '大逃殺提示走右上角膠囊（#brTips）');
ok(!/if \(win\) \{\s*banner\(title, 3\.2\);/.test(src), '奪冠不再用中央巨字 banner');
ok(/brTip\('🌀'/.test(src), '縮圈提示改成膠囊');
ok(/#brTips \{ position: fixed; right: 8px; top: 58px/.test(src), '膠囊固定在右上（不動到畫面中央）');

head('5. 入口卡選項 UI');
ok(/seg\('n',/.test(src) && /seg\('team',/.test(src) && /seg\('dur',/.test(src), '三個分段控制器（人數／組隊／時間）');
ok(/50 人/.test(src) && /4 人/.test(src) && /5 分鐘 · 5 圈/.test(src), '有 50 人 / 4 人 / 5 分鐘選項');
ok(/\.brseg b\.on/.test(src), '選中的選項有高亮樣式');
ok(/!BR\.FREE && tkN <= 0/.test(src), '免費期間就算 0 張票也能出發（舊版會跳去商店）');

console.log('\n' + (fail ? '✗ ' + fail + ' 失敗 / ' + pass + ' 通過' : '✅ v4.75：' + pass + ' 通過 / 0 失敗'));
process.exit(fail ? 1 : 0);
