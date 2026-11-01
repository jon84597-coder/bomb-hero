// test/verify-v60.js —— v4.15
//   ① 對戰／線上配對人數 2～8（原本只有 4／8）
//   ② 對戰選角精簡（大卡 → 小卡）
//   ③ 組隊對戰：紅／藍／綠／黃 最多 4 隊、最多 8 人、同隊不互炸、以隊計勝場
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game, S = P.settings, html = env.html;

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

const css = html.replace(/\r/g, '');

// ================================================================
head('1. 人數 2～8');
[2, 3, 4, 5, 6, 7, 8].forEach(function (n) {
  ok(P.clampCount(n) === n && P.clampCount(String(n)) === n, n + ' 人：合法（數字與字串都收）');
});
ok(P.clampCount(1) === 4 && P.clampCount(9) === 4 && P.clampCount('xx') === 4,
  '超出範圍／亂填 → 回退成 4 人');
ok(/<div class="seg" id="segCount">[\s\S]{0,260}data-v="8">8<\/button><\/div>/.test(css) &&
   (css.match(/id="segCount"([\s\S]{0,300}?)<\/div>/) || ['', ''])[1].split('data-v="').length - 1 === 7,
  '對戰人數有 7 顆按鈕（2／3／4／5／6／7／8）');
ok(/<div class="seg" id="segNetCount">[\s\S]{0,300}data-v="8">8<\/button><\/div>/.test(css),
  '線上配對房間人數也能選到 8（含 2～7）');

// 每個人都真的建立得出來（含 2、3、5、6、7 這種以前沒有的數字）
{
  const bad = [];
  [2, 3, 4, 5, 6, 7, 8].forEach(function (n) {
    S.count = n;
    P.Battle.resetSlots();
    if (P.Battle.slots.length !== n) bad.push(n + ':' + P.Battle.slots.length);
    const labels = P.Battle.slots.map(function (s) { return s.label; }).join(',');
    if (labels !== P.Battle.slots.map(function (s, i) { return 'P' + (i + 1); }).join(',')) bad.push(n + ':label');
  });
  ok(bad.length === 0, '選角位子數量＝設定人數（2～8 全部正確）' + (bad.length ? '：' + bad.join(' ') : ''));
}
{
  S.count = 6;
  P.startBattle();
  ok(G.players.length === 6, '6 人對戰真的開 6 個角色（' + G.players.length + '）');
  ok(G.players.filter(function (p) { return p.ai; }).length === 5, '沒人坐的位子由 AI 補滿（5 隻 AI）');
  const xs = G.players.map(function (p) { return Math.round(p.x / G.T) + ',' + Math.round(p.y / G.T); });
  ok(new Set(xs).size === 6, '6 個出生點互不重疊');
}

// ================================================================
head('2. 選角精簡（CSS 尺寸）');
ok(/#pSlots, \.slotgrid \{[^}]*minmax\(104px, 132px\)/.test(css),
  '選角格改成 104～132px 的自適應網格（原本 146px 起、會撐滿）');
ok(/\.pbox canvas\.pav \{ width: 34px; height: 34px/.test(css), '頭像 52px → 34px');
ok(/\.crow button \{\s*width: 24px; height: 19px/.test(css), '◀▶🤖 按鈕 30×24 → 24×19');
ok(/\.pbox \.pw \{[^}]*font-size: 9px/.test(css), '底部說明字 11px → 9px（超長自動省略）');
ok(/<div class="slotgrid" id="pSlots"><\/div>/.test(css), '選角容器改用 .slotgrid');
ok(/#pSlots, \.slotgrid \{ grid-template-columns: repeat\(auto-fit, minmax\(78px, 1fr\)\)/.test(css),
  '手機更精簡（78px 起跳，4 個一排）');

// ================================================================
head('3. 組隊對戰：四隊隊色');
ok(P.TEAMS.length === 4, '共 4 隊');
ok(P.TEAMS.map(function (t) { return t.name; }).join('/') === '紅隊/藍隊/綠隊/黃隊', '隊名：紅／藍／綠／黃');
ok(P.TEAMS.map(function (t) { return t.hex; }).join(',') === '#ff5a5a,#4aa8ff,#46d68c,#ffd166',
  '四種顏色都不一樣：' + P.TEAMS.map(function (t) { return t.hex; }).join(' '));
ok(/<div class="seg" id="segTeams">[\s\S]{0,200}data-v="4">4<\/button><\/div>/.test(css) &&
   /組隊對戰（隊數 2～4，同隊不會互炸）/.test(css),
  '對戰設定有「關閉／2／3／4 隊」');
ok(/id="btnTeam"[^>]*>👥 組隊 對戰<small>紅／藍／綠／黃 4 隊/.test(css), '主選單的「組隊 對戰」不再是「未開放」');
ok(!/id="btnTeam"[^>]*class="mbtn soon"/.test(css), '組隊按鈕已經拿掉 soon 灰態');

// 分隊：輪流分（P1紅、P2藍…）
[2, 3, 4].forEach(function (n) {
  S.teams = n; S.count = 8;
  P.Battle.resetSlots();
  const got = P.Battle.slots.map(function (s) { return s.team; }).join('');
  const want = Array.from({ length: 8 }, function (_, i) { return i % n; }).join('');
  ok(got === want, n + ' 隊 → 8 個位子輪流分隊（' + got + '）');
});
{
  S.teams = 4; S.count = 8;
  P.Battle.resetSlots();
  const cnt = [0, 0, 0, 0];
  P.Battle.slots.forEach(function (s) { cnt[s.team]++; });
  ok(cnt.join(',') === '2,2,2,2', '4 隊 × 8 人 = 每隊 2 人（' + cnt.join('/') + '）');
}
{
  // 點隊徽換隊（模擬兩次點擊 → 紅→藍→綠）
  S.teams = 3; S.count = 4;
  P.Battle.resetSlots();
  const s0 = P.Battle.slots[0];
  const t0 = s0.team;
  s0.team = (s0.team + 1) % P.teamCount();
  const t1 = s0.team;
  s0.team = (s0.team + 1) % P.teamCount();
  ok(t1 === (t0 + 1) % 3 && s0.team === (t0 + 2) % 3, '點隊徽可以手動換隊（' + t0 + '→' + t1 + '→' + s0.team + '）');
}

// ================================================================
head('4. 組隊對戰：開局與同隊不互炸');
function startTeamBattle(teams, count) {
  S.teams = teams; S.count = count;
  S.size = 'M'; S.hazards = 'off'; S.sd = 'off'; S.revenge = 'off'; S.wins = 2;
  P.Battle.resetSlots();
  P.startBattle();
  G.state = 'play';
  G.timer = 120;
  G.bombs.length = 0; G.flames.length = 0;
}
startTeamBattle(2, 4);
ok(G.teamsOn === 2, '本局開了 2 隊（Game.teamsOn = ' + G.teamsOn + '）');
ok(G.players.map(function (p) { return p.team; }).join(',') === '0,1,0,1',
  '4 人 2 隊 → 紅藍紅藍（' + G.players.map(function (p) { return p.team; }).join(',') + '）');
{
  // 同隊火焰燒不到；敵隊火焰會死
  const a = G.players[0], b = G.players[2], c = G.players[1];
  G.players.forEach(function (p) { p.alive = true; p.dead = false; p.invuln = 0; p.dino = false; });
  G.flames.length = 0;
  G.flames.push({ cx: Math.floor(b.x / G.T), cy: Math.floor(b.y / G.T), t: .5, owner: a, dir: null });
  P.updateWorld(1 / 60);
  ok(b.alive === true, '隊友的火焰燒不到自己人（' + P.teamName(a.team) + ' 打 ' + P.teamName(b.team) + '）');
  G.flames.length = 0;
  G.flames.push({ cx: Math.floor(c.x / G.T), cy: Math.floor(c.y / G.T), t: .5, owner: a, dir: null });
  P.updateWorld(1 / 60);
  ok(c.alive === false, '敵隊的火焰照樣燒得死（' + P.teamName(c.team) + '）');
}

// ================================================================
head('5. 組隊對戰：勝負以隊計算');
startTeamBattle(2, 4);
{
  // 讓藍隊全滅 → 紅隊應該贏這一局
  G.players.forEach(function (p) { if (p.team === 1) { p.alive = false; p.dead = true; } });
  P.updateBattle(1 / 60);
  ok(G.state === 'roundover', '只剩一隊存活 → 這一局結束');
  ok((G.teamWins[0] | 0) === 1 && (G.teamWins[1] | 0) === 0, '紅隊記 1 勝（teamWins = ' + G.teamWins.join('/') + '）');
  ok(G.players.filter(function (p) { return p.team === 0; }).every(function (p) { return p.wins === 1; }),
    '紅隊每個成員都 +1 星（不是只有最後活著那個）');
}
{
  // 一路贏到 winsNeeded → 整場結束
  startTeamBattle(2, 4);
  S.wins = 1; G.winsNeeded = 1;
  G.players.forEach(function (p) { if (p.team === 1) { p.alive = false; p.dead = true; } });
  P.updateBattle(1 / 60);
  P.nextBattleRound(G.players[0], 0);
  ok(G.state === 'over', '隊伍拿到指定勝場 → 整場結束（state=' + G.state + '）');
}

// ================================================================
head('6. 混戰模式不受影響（回歸）');
startTeamBattle(0, 4);
ok(G.teamsOn === 0, '關閉組隊 → teamsOn = 0');
ok(G.players.every(function (p) { return p.team === -1; }), '混戰時每個人都沒有隊別（-1）');
{
  const a = G.players[0], b = G.players[2];
  G.players.forEach(function (p) { p.alive = true; p.dead = false; p.invuln = 0; });
  G.flames.length = 0;
  G.flames.push({ cx: Math.floor(b.x / G.T), cy: Math.floor(b.y / G.T), t: .5, owner: a, dir: null });
  P.updateWorld(1 / 60);
  ok(b.alive === false, '混戰時誰的火焰都燒得死（沒有隊友豁免）');
}
{
  startTeamBattle(0, 4);
  G.players.forEach(function (p, i) { if (i > 0) { p.alive = false; p.dead = true; } });
  P.updateBattle(1 / 60);
  ok(G.state === 'roundover' && G.players[0].wins === 1, '混戰照舊：最後活著的人拿一勝');
}

// ================================================================
head('7. 組隊但只湊得到一隊 → 自動退回混戰');
{
  S.teams = 2; S.count = 3;
  P.Battle.resetSlots();
  P.Battle.slots.forEach(function (s) { s.team = 0; });   // 大家都同隊
  P.startBattle();
  ok(G.teamsOn === 0, '全部同隊 → 自動改回混戰（不會一開局就結束）');
  ok(G.players.every(function (p) { return p.team === -1; }), '角色的隊別一併清掉');
}

// ================================================================
head('7b. 迴歸：第一次打開對戰頁（slots 還是 [null×4]）不會炸');
{
  P.Battle.slots = [null, null, null, null];
  S.teams = 2; S.count = 4;
  let threw = null;
  try { P.Battle.autoTeams(); P.Battle.resetSlots(); } catch (e) { threw = e; }
  ok(!threw, '空位子也能安全分隊（' + (threw ? '炸了：' + threw.message : 'OK') + '）');
  ok(P.Battle.slots.length === 4 && P.Battle.slots.every(function (x) { return x && typeof x.team === 'number'; }),
    'resetSlots 重建出 4 個帶隊別的位子');
  ok(!/Screen\.show\('battle'\);\s*Battle\.autoTeams\(\);\s*Battle\.resetSlots\(\)/.test(css),
    '組隊按鈕不會在 resetSlots 之前先呼叫 autoTeams（會炸在 null.team）');
}

// ================================================================
head('8. 線上：人數與隊別會同步給客人');
{
  S.teams = 2; S.count = 8;
  P.Battle.resetSlots();
  P.Net.roster = [0, 1, 2, 3].map(function (i) {
    return { pid: 'p' + i, name: 'P' + i, ch: i, slot: i, entry: 1 };
  });
  P.Net.count = 4;
  P.Net.preparePlayers();
  ok(G.players.length === 4, '線上 4 個真人 → 4 個角色');
  ok(G.players.map(function (p) { return p.team; }).join(',') === '0,1,0,1', '線上也會分隊（紅藍紅藍）');
  ok(G.teamsOn === 2, '線上開局 teamsOn = ' + G.teamsOn);
  const snap = P.buildSnap();
  ok(snap.tt === 2, '快照帶隊數（tt = ' + snap.tt + '）');
  ok(snap.p.every(function (row) { return typeof row[11] === 'number'; }),
    '快照每個角色都帶隊別（row[11]）');
}
{
  // 客人端：套用快照後隊別要還原（畫面上才有隊色）
  const snap = P.buildSnap();
  G.players = [];
  P.applySnap(snap);
  ok(G.players.map(function (p) { return p.team; }).join(',') === '0,1,0,1', '客人端套用快照後隊別正確');
  ok(G.teamsOn === 2, '客人端 teamsOn 也同步成 2');
}

// ================================================================
head('9. 版本與說明');
ok(P.VERSION === '4.15', '版號 = ' + P.VERSION);
ok(P.VERSION_LOG[0].v === '4.15' && P.VERSION_LOG[0].now === true, 'VERSION_LOG 第一筆是 4.15（now）');
ok(P.VERSION_LOG[1].v === '4.14' && P.VERSION_LOG[1].now === false, '4.14 已不再是 now');
ok(P.VERSION_LOG[0].items.join(' ').indexOf('組隊對戰') >= 0, '版本紀錄有寫組隊對戰');
ok(/SW_VERSION = 'v4\.15\.0'/.test(require('fs').readFileSync(__dirname + '/../sw.js', 'utf8')),
  'sw.js 快取版號升到 v4.15.0');

// ================================================================
console.log('\n通過 ' + pass + ' / ' + (pass + fail));
process.exit(fail ? 1 : 0);
