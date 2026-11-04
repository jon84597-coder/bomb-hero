// test/verify-v478.js —— v4.78
//   ① 大逃殺：別的玩家／AI 扣血不再出現在自己的畫面上（正中央 banner 已移除）
//   ② 別人扣血也不播受傷音效；坐騎被打爆不搖我的畫面
//   ③ 自己受傷仍然有提示＋音效
//   ④ 大逃殺即時提示（受傷／出局／毒圈）10 國都有翻
//   ⑤ 版本與容量
const { makeEnv } = require('./_sandbox');
const fs = require('fs'), path = require('path');
const env = makeEnv();
const P = env.BH, G = P.Game, src = env.html;
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ FAIL: ' + m); } }
function head(t) { console.log('\n=== ' + t + ' ==='); }
const el = (id) => env.getId(id);

// ---------- 0. 開一場 50 人大逃殺 ----------
head('0. 開一場大逃殺');
P.BR.opt = { n: 50, team: 1, dur: 10 };
P.startBR();
G.state = 'play'; G.countdown = 0;
const ais = G.players.filter(function (p) { return p.ai && p.alive; });
const me = G.players[0];
ok(!!me && !me.ai, '玩家 0 是我');
ok(ais.length >= 10, '場上有 AI（' + ais.length + ' 隻）');

// 間諜：記錄受傷音效
let sfxLog = [];
const sfx0 = P.AudioSys.sfx;
P.AudioSys.sfx = function (k) { sfxLog.push(k); };

// 把 banner 的狀態歸零，方便觀察「有沒有被別人觸發」
function bannerState() {
  const b = el('banner'), t = el('bannerTxt');
  return { disp: (b && b.style && b.style.display) || '', txt: (t && t.textContent) || '' };
}
function tipCount() { const box = el('brTips'); return box ? box.children.length : 0; }

// ---------- 1. 別的 AI 扣血：畫面上不能有任何東西 ----------
head('1. 別的 AI 扣血 → 我的畫面乾淨');
const ai = ais[0];
ai.brHp = 8; ai.invuln = 0;
const b0 = bannerState(), t0 = tipCount();
sfxLog = [];
P.killBattlePlayer(ai, null);
const b1 = bannerState(), t1 = tipCount();
ok(ai.brHp === 7, 'AI 真的扣了血（8 → ' + ai.brHp + '）');
ok(ai.invuln > 0, 'AI 有短暫無敵（' + ai.invuln.toFixed(2) + 's）');
ok(b1.disp !== 'flex', '沒有跳正中央 banner（display="' + b1.disp + '"）');
ok(b1.txt === b0.txt, 'banner 文字沒被改（' + JSON.stringify(b1.txt) + '）');
ok(t1 === t0, '右上角提示沒有多一則（' + t0 + ' → ' + t1 + '）');
ok(sfxLog.indexOf('hurt') < 0, '別人的受傷音效不播（' + (sfxLog.join(',') || '無') + '）');

// 連續打 10 隻 AI：不該累積任何提示
const t2 = tipCount(), b2 = bannerState();
for (let i = 1; i <= 10; i++) { const a = ais[i]; if (!a) break; a.brHp = 5; a.invuln = 0; P.killBattlePlayer(a, null); }
ok(tipCount() === t2, '連打 10 隻 AI 也不會堆提示（' + t2 + ' → ' + tipCount() + '）');
ok(bannerState().disp !== 'flex' && bannerState().txt === b2.txt, '連打 10 隻 AI 也不會跳中央字');

// 毒圈扣血也是同一條路：AI 血量歸零前後都不該冒提示
const ai2 = ais[11];
ai2.brHp = 1; ai2.invuln = 0;
const t3 = tipCount();
P.killBattlePlayer(ai2, null);                 // 1 → 0 → 真的出局
ok(!ai2.alive, 'AI 血量歸零 → 出局');
ok(bannerState().disp !== 'flex', 'AI 出局也不跳中央 banner');
ok(tipCount() >= t3, 'AI 出局會有一則「剩 N 人」提示（' + t3 + ' → ' + tipCount() + '）');

// ---------- 2. 坐騎被打爆：不搖我的畫面、不播音效 ----------
head('2. 別人的龍被打爆');
const ai3 = ais[12];
ai3.dino = true; ai3.invuln = 0;
G.shake = 0; sfxLog = [];
P.breakDino(ai3);
ok(!ai3.dino, 'AI 的龍真的被打爆');
ok((G.shake || 0) === 0, '我的畫面沒有震動（shake=' + (G.shake || 0) + '）');
ok(sfxLog.indexOf('hurt') < 0, '沒有播受傷音效');

// ---------- 3. 自己受傷：提示＋音效都要有 ----------
head('3. 自己受傷 → 提示照舊');
me.brHp = 4; me.invuln = 0;
G.shake = 0; sfxLog = [];
const t4 = tipCount();
P.killBattlePlayer(me, null);
ok(me.brHp === 3, '自己扣血（4 → ' + me.brHp + '）');
ok(sfxLog.indexOf('hurt') >= 0, '自己受傷有音效');
ok(tipCount() > t4, '自己受傷有右上角提示（' + t4 + ' → ' + tipCount() + '）');
ok(bannerState().disp !== 'flex', '自己受傷也不會用中央 banner');
me.dino = true; me.invuln = 0;
G.shake = 0;
P.breakDino(me);
ok((G.shake || 0) > 0, '自己的龍被打爆會震（shake=' + (G.shake || 0).toFixed(2) + '）');
P.AudioSys.sfx = sfx0;

// ---------- 4. 程式面：那行 banner 真的不在 ----------
head('4. 原始碼檢查');
ok(!/else banner\('♥/.test(src), 'killBattlePlayer 裡沒有 else banner(\'♥ …\')');
ok(/if \(isMyPlayer\(p\)\) \{\s*\/\/[^\n]*\n?[\s\S]{0,120}?brTip\('💔', t\('br\.hurt'/.test(src) ||
  /if \(isMyPlayer\(p\)\) \{[\s\S]{0,200}?t\('br\.hurt'/.test(src), '受傷提示包在 isMyPlayer() 裡');
ok(/function breakDino\(p\)[\s\S]{0,400}?if \(isMyPlayer\(p\)\) \{[\s\S]{0,160}?AudioSys\.sfx\('hurt'\)/.test(src),
  'breakDino 的震動／音效只給自己');
ok(/t\('br\.zone', \{ n: Math\.round\(z\.tr\) \}\)/.test(src), '毒圈提示走字典（帶半徑）');
ok(/t\(mate \? 'br\.outMate' : 'br\.out', \{ n: p\.name \|\| 'AI', a: Game\.brAlive \}\)/.test(src), '出局提示走字典（名字＋剩幾人）');

// ---------- 5. 10 國翻譯 ----------
head('5. 新增的大逃殺提示 10 國都有');
const C = /[\u4e00-\u9fff]/;
['br.hurt', 'br.out', 'br.outMate', 'br.zone'].forEach(function (k) {
  const zh = P.I18N['zh-TW'][k];
  const bad = ['en', 'ja', 'ko'].filter(function (L) { return !P.I18N[L] || !P.I18N[L][k]; });
  ok(!!zh && bad.length === 0, k + ' 9 國都有' + (bad.length ? '（缺 ' + bad.join('/') + '）' : ''));
});
P.setLang('en');
const tHurt = P.t('br.hurt', { n: 7 });
const tOut = P.t('br.out', { n: 'AI-9', a: 12 });
const tZone = P.t('br.zone', { n: 20 });
ok(!C.test(tHurt) && /7/.test(tHurt), 'en 受傷提示：' + tHurt);
ok(!C.test(tOut) && /AI-9/.test(tOut) && /12/.test(tOut), 'en 出局提示：' + tOut);
ok(!C.test(tZone) && /20/.test(tZone), 'en 毒圈提示：' + tZone);
ok(P.t('br.outMate', { n: 'Amy', a: 5 }) !== P.t('br.out', { n: 'Amy', a: 5 }), '隊友出局有專屬說法');
P.setLang('zh-TW');

// ---------- 6. 版本與容量 ----------
head('6. 版本與容量');
ok(parseFloat(P.VERSION) >= 4.78, 'VERSION ≥ 4.78（實際 ' + P.VERSION + '）');
ok(P.VERSION_LOG[0].v === P.VERSION && P.VERSION_LOG[0].now === true, '版本紀錄最上面是本版 ' + P.VERSION + '（now）');
ok(P.VERSION_LOG[1].now === false, '上一版 ' + P.VERSION_LOG[1].v + ' 已改成 now:false');
ok(!!P.I18N.en['ver.4.78.1'] && !!P.I18N.ja['ver.4.78.2'], '4.78 的 2 條更新每個語系都有翻譯');
['../sw.js', '../../public/sw.js', '../../bomberman-online/public/sw.js'].forEach(function (f) {
  const p2 = path.join(__dirname, f);
  if (!fs.existsSync(p2)) { ok(false, f + ' 不存在'); return; }
  ok(/SW_VERSION = 'v\d+\.\d+\.\d+'/.test(fs.readFileSync(p2, 'utf8')), f + ' 版本跟著升');
});
(function () {
  const chars = src.length, bytes = Buffer.byteLength(src, 'utf8');
  ok(chars <= 3900000, '檔案 ' + chars.toLocaleString() + ' 字元（上限 3,900,000）');
  ok(bytes <= 4250000, '檔案 ' + bytes.toLocaleString() + ' 位元組（上限 4,250,000）');
  ok((src.match(/\r/g) || []).length === 0, '整檔 LF（沒有 \\r）');
})();

console.log('\n' + (fail ? '✗ ' + fail + ' 失敗 / ' + pass + ' 通過' : '✅ v4.78：' + pass + ' 通過 / 0 失敗'));
process.exit(fail ? 1 : 0);
