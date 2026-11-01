// test/verify-v59.js —— v4.14
//   ① 拿了遙控器（計時炸彈）／手套之後：踢彈、打彈、撿彈、投彈都要正常
//   ② 單人闖關 8 關 → 32 張地圖（8 大主題 × 4 張，每區第 4 張是魔王關）
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, G = P.Game, html = env.html;

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

P.settings.size = 'M'; P.settings.hazards = 'off'; P.settings.sd = 'off';
P.settings.ctrl = 'kb'; P.settings.soloDiff = 'normal'; P.settings.soloTime = 300;
P.startSolo(1, false);
G.state = 'play';

const T = G.T;
const IN = { dir: null, act: false };
function fakeScheme() {
  return {
    dirs: function () { return IN.dir ? [IN.dir] : []; },
    action: function () { return IN.act; },
    actionHeld: function () { return IN.act; },
    detonate: function () { return false; },
    fire: function () { return false; }
  };
}
function clearRow(y, x0, x1) {
  for (let x = x0; x <= x1; x++) { G.grid[y][x] = 0; if (G.hidden) delete G.hidden[y + ',' + x]; }
}
function fresh(opts) {
  opts = opts || {};
  const p = G.players[0];
  G.bombs.length = 0; G.flames.length = 0; G.items.length = 0; G.enemies.length = 0;
  p.alive = true; p.dead = false; p.carry = null; p.facing = 'right'; p.dizzy = 0; p.skull = null;
  p.kick = !!opts.kick; p.glove = !!opts.glove; p.punch = !!opts.punch;
  p.remote = !!opts.remote; p.line = !!opts.line;
  p.maxBombs = 8; p.power = 2;
  p.x = 5 * T + T / 2; p.y = 5 * T + T / 2;
  p.scheme = fakeScheme();
  clearRow(5, 1, 13); clearRow(4, 1, 13); clearRow(6, 1, 13);
  IN.dir = null; IN.act = false;
  return p;
}
function putBomb(p, cx, cy, remote) {
  const b = {
    cx: cx, cy: cy, px: cx * T + T / 2, py: cy * T + T / 2,
    timer: remote ? 9999 : 2.4, power: 2, owner: p, passers: [], remoteArmed: !!remote,
    mine: false, mineLife: 10, moving: null, flying: null, held: false, seed: 1, armT: 40
  };
  G.bombs.push(b);
  return b;
}
function frame(p, n) { for (let i = 0; i < (n || 1); i++) P.controlHuman(p, 1 / 60); }

// ================================================================
head('0. 版本');
ok(/^\d+\.\d+$/.test(P.VERSION), 'VERSION 格式正確（' + P.VERSION + '）');
ok(P.VERSION_LOG[0].v === P.VERSION && P.VERSION_LOG[0].now === true, '更新紀錄最新一筆 = 當前版本');
const v414 = P.VERSION_LOG.filter(function (x) { return x.v === '4.14'; })[0] || { items: [] };
const vtext = v414.items.join('|');
ok(v414.items.length >= 5, 'v4.14 記錄了 ' + v414.items.length + ' 項更新');
['撿炸彈', '32 張', '魔王關'].forEach(function (k) {
  ok(vtext.indexOf(k) >= 0, 'v4.14 條列提到「' + k + '」');
});

// ================================================================
head('1. 踢彈：不再被手套擋掉（遙控彈也踢得動）');
function kickCase(opts, label) {
  const p = fresh(opts);
  const b = putBomb(p, 6, 5, opts.remote);
  IN.dir = 'right';
  frame(p, 30);
  IN.dir = null;
  ok(!!b.moving, label + ' → 炸彈被踢出去');
}
kickCase({ kick: true }, '踢彈鞋');
kickCase({ kick: true, glove: true }, '踢彈鞋＋搬彈手套');
kickCase({ kick: true, remote: true }, '踢彈鞋＋遙控器');
kickCase({ kick: true, glove: true, remote: true }, '踢彈鞋＋手套＋遙控器');

// 拳擊（用 flying 判定）
{
  const p = fresh({ punch: true, glove: true, remote: true });
  const b = putBomb(p, 6, 5, true);
  IN.dir = 'right';
  frame(p, 20);
  IN.dir = null;
  ok(!!b.flying, '打彈拳擊＋手套＋遙控器 → 炸彈被打飛（flying）');
}

// ================================================================
head('2. 撿彈：動作鍵撿彈優先（線圈炸彈也搶不走）');
function pickCase(opts, label) {
  const p = fresh(opts);
  const b = putBomb(p, 6, 5, opts.remote);
  IN.act = true; frame(p, 1); IN.act = false;
  ok(p.carry === b && b.held === true, label + ' → 撿起炸彈');
  return { p: p, b: b };
}
pickCase({ glove: true }, '搬彈手套');
pickCase({ glove: true, remote: true }, '手套＋遙控器');
pickCase({ glove: true, line: true }, '手套＋線圈炸彈');
pickCase({ glove: true, kick: true, remote: true }, '手套＋踢彈鞋＋遙控器');
// 撿起 → 再按一次 → 投出去
{
  const r = pickCase({ glove: true, remote: true }, '手套＋遙控器（測投擲）');
  IN.act = true; frame(r.p, 1); IN.act = false;
  ok(r.p.carry === null && !!r.b.flying, '再按一次動作鍵 → 投出去（flying）');
}
// 沒手套的人按動作鍵 → 是放彈，不會誤撿
{
  const p = fresh({});
  const b = putBomb(p, 6, 5, false);
  IN.act = true; frame(p, 1); IN.act = false;
  ok(!p.carry && !b.held, '沒有手套 → 按動作鍵不會撿炸彈');
}

// ================================================================
head('3. 炸彈是實體：戴手套也不會穿過去');
{
  const p = fresh({ glove: true });
  putBomb(p, 6, 5, false);
  ok(P.solidOrBomb(6, 5, p) === true, '戴手套 → 前方有炸彈仍然是障礙（solidOrBomb 回 true）');
  // 自己的炸彈（passers 內）可以走開
  const b2 = putBomb(p, 5, 5, false);
  b2.passers = [p];
  ok(P.solidOrBomb(5, 5, p) === false, '站在自己的炸彈上 → 可以離開（passers 例外）');
}

// ================================================================
head('4. 遙控引爆：不會炸到手上拿著的那一顆');
{
  const p = fresh({ glove: true, remote: true });
  const held = putBomb(p, 6, 5, true);
  IN.act = true; frame(p, 1); IN.act = false;
  ok(p.carry === held, '先用手套撿起遙控彈');
  const other = putBomb(p, 9, 5, true);
  const n = P.detonateRemote(p);
  ok(n === 1 && other.remoteArmed === false, '按 E 只引爆地上那一顆（n=' + n + '）');
  ok(held.remoteArmed === true && held.timer === 9999, '手上那一顆不會被引爆（還在手上）');
}

// ================================================================
head('5. 單人闖關 32 張地圖');
ok(P.SOLO_STAGES === 32, 'SOLO_STAGES = 32');
ok(P.MAP32.length === 32, 'MAP32 有 32 張地圖');
ok(typeof P.soloInfo === 'function' && P.soloInfo(1).n === '微風草原' && P.soloInfo(32).n === '魔王之間',
  'soloInfo(1) = 微風草原、soloInfo(32) = 魔王之間');
ok(/SOLO_STAGES/.test(html), '原始碼有 SOLO_STAGES 常數');
ok(/const maxStage = SOLO_STAGES;/.test(html), '過關上限 = SOLO_STAGES（32 關）');
ok(/buildOrganicMap\(cols, rows, theme, info, rngFrom\(seed\)/.test(html),
  '單人關卡改用有機地形（與 RPG 同一套）');

{
  let bad = [];
  const seen = [];
  for (let st = 1; st <= 32; st++) {
    try {
      P.startSolo(st, false);
      const boss = G.enemies.filter(function (e) { return e.type === 'boss'; }).length;
      const wantBoss = ((st - 1) % 4 === 3) ? 1 : 0;
      if (boss !== wantBoss) bad.push(st + ':boss' + boss + '/' + wantBoss);
      if (G.grid[1][1] !== 0) bad.push(st + ':spawn');
      if (!G.door) bad.push(st + ':door');
      if (G.stage !== st) bad.push(st + ':stage');
      if (!G.theme) bad.push(st + ':theme');
      // 魔王血量：第一區 5 → 第八區 12
      if (wantBoss) {
        const b = G.enemies.filter(function (e) { return e.type === 'boss'; })[0];
        const want = Math.min(12, 5 + Math.floor((st - 1) / 4));
        if (b.maxHp !== want) bad.push(st + ':hp' + b.maxHp + '/' + want);
      }
      seen.push(G.mapInfo.n);
    } catch (e) { bad.push(st + ':ERR ' + e.message); }
  }
  ok(bad.length === 0, '32 關全部生成正常（出生點空地／有門／魔王關位置與血量都對）' + (bad.length ? '：' + bad.join(',') : ''));
  ok(new Set(seen).size === 32, '32 關的地圖名都不重複（' + new Set(seen).size + ' 種）');
}

// ================================================================
head('6. 選關畫面');
ok(/MAP32\.forEach\(function \(m, i\) \{/.test(html), '選關格由 MAP32 產生（32 格）');
ok(/\(boss \? '👑' : ''\) \+ m\.n/.test(html), '魔王關標 👑');
ok(/body\.touch #scr-solo \.stagegrid \{[^}]*repeat\(8, (?:minmax\(0, )?1fr\)/.test(html.replace(/\r/g, '')),
  '手機：32 格排成 8 欄');
// v4.14b：地圖名 nowrap 的 min-content 會把 8 欄撐爆（實測手機橫向溢出 257px）
// → 欄寬下限改 minmax(0,1fr)、格子加 min-width:0，名字才會走 ellipsis 而不是頂出版面
ok(/\.stagegrid \{ display: grid; grid-template-columns: repeat\(8, minmax\(0, 1fr\)\)/.test(html) &&
   /\.stg \{[^}]*min-width: 0/.test(html.replace(/\r/g, '')) &&
   !/\.stagegrid \{[^}]*overflow-y: auto/.test(html.replace(/\r/g, '')),
  '桌面：8 欄排成 4 排、欄寬可壓縮不溢出，且沒有內部捲動區（靠整頁捲動）');
// v4.14b：舊的窄螢幕 3 欄規則已移除（會讓 32 格變 11 排又橫向溢出）
ok(!/@media \(max-width: 640px\)[\s\S]*?\.stagegrid \{ grid-template-columns: repeat\(3,/.test(html.replace(/\r/g, '')),
  '窄螢幕不再有 3 欄 stagegrid 規則');

// ================================================================
head('7. 整體回歸：跑 frames 不報錯');
[
  [1, '第 1 關'],
  [4, '第 4 關（魔王關）'],
  [32, '第 32 關（最終魔王）']
].forEach(function (c) {
  let threw = null;
  try {
    P.startSolo(c[0], false);
    G.state = 'play';
    for (let i = 0; i < 240; i++) { P.updateWorld(1 / 60); P.updateSolo(1 / 60); }
  } catch (e) { threw = e; }
  ok(threw === null, c[1] + ' 跑 240 幀不報錯' + (threw ? '（' + threw.message + '）' : ''));
});
{
  let threw = null;
  try {
    P.startBossRush();
    ok(G.stage === 32 && G.bossRush === true, '「挑戰 BOSS」直接打第 32 關最終魔王');
    for (let i = 0; i < 120; i++) { P.updateWorld(1 / 60); P.updateSolo(1 / 60); }
  } catch (e) { threw = e; }
  ok(threw === null, 'BOSS 連戰跑 120 幀不報錯' + (threw ? '（' + threw.message + '）' : ''));
}

console.log('\n通過 ' + pass + ' / ' + (pass + fail));
process.exit(fail ? 1 : 0);
