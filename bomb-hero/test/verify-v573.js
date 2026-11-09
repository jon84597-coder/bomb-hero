// test/verify-v573.js —— v5.72：對戰／線上連線的「八大張風格地圖」全部上場
//   症狀：玩家說「地圖要全八大張風格地圖都有，目前好像只有看到 4 張」。
//   真凶兩層：
//     ① buildBattleRound 寫死 `THEMES[rand(7)]` → 索引只到 6，第 8 張「暗黑魔王城」永遠抽不到
//     ② 純亂數會一直撞同一張（12 回合隨機實測只看得到 4~5 種）
//   本支分成：① 主題池 ② 洗牌輪替（八回合不重複／跨袋不連莊）③ 指定單張
//             ④ 選單（對戰＋線上房間）⑤ 版本戳記與字典
const fs = require('fs');
const { makeEnv } = require('./_sandbox');

const env = makeEnv();
const P = env.BH, G = P.Game;
const SRC = fs.readFileSync(__dirname + '/../js/main.js', 'utf8');
const HTML = fs.readFileSync(__dirname + '/../index.html', 'utf8');
const I18N = fs.readFileSync(__dirname + '/../js/i18n-src.js', 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg, extra) {
  if (cond) { pass++; console.log('  ✓ ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
function sec(t) { console.log('\n=== ' + t + ' ==='); }

/* ---------------- ① 主題池 ---------------- */
sec('① 主題池：八張都在、第七張不再是孤兒');
ok(P.THEMES.length === 8, 'THEMES 有八張', P.THEMES.map(function (x) { return x.name; }));
ok(P.THEMES[7] && P.THEMES[7].name === '暗黑魔王城', '第 8 張＝暗黑魔王城');
// 注意：註解裡還會提到舊寫法（那是在解釋病根），這裡只檢查「可執行的程式碼」
ok(SRC.indexOf('const theme = THEMES[rand(7)]') < 0, '舊的 rand(7) 已經不在主檔裡');
ok(/function battleThemeIdx\(\)/.test(SRC), '有 battleThemeIdx()（指定／輪替的唯一入口）');
ok(/const ti = battleThemeIdx\(\);\n\s*const theme = THEMES\[ti\] \|\| THEMES\[0\];/.test(SRC),
  'buildBattleRound 走 battleThemeIdx()');
ok(/Game\.themeIdx = ti;/.test(SRC), '回合開始會記下 Game.themeIdx');
ok(P.settings.battleTheme === 'r', '預設是 r（隨機輪替）', P.settings.battleTheme);

/* ---------------- ② 洗牌輪替 ---------------- */
sec('② 洗牌輪替：每八回合八張不重複、跨袋不連莊');
P.startBattle();
G.state = 'play';
P.BattleTheme.reset();
const seq = [];
for (let r = 0; r < 24; r++) { P.buildBattleRound(); seq.push(P.THEMES.indexOf(G.theme)); }
ok(seq.length === 24, '跑了 24 回合');
for (let b = 0; b < 3; b++) {
  const g = seq.slice(b * 8, b * 8 + 8);
  ok(new Set(g).size === 8, '第 ' + (b + 1) + ' 袋八張都不重複', g);
}
ok(new Set(seq).size === 8, '24 回合內八種風格全部出現過');
let consec = 0;
for (let i = 1; i < seq.length; i++) if (seq[i] === seq[i - 1]) consec++;
ok(consec === 0, '沒有連兩回合同一張（含跨袋）', consec);
ok(seq.indexOf(7) >= 0, '第 8 張（暗黑魔王城）真的抽得到', seq.indexOf(7));
ok(seq.indexOf(7) < 8, '第一袋就會出現第 8 張（不用等運氣）', seq.indexOf(7));

sec('②-2 Game.themeIdx / stage / theme 三者一致');
let bad = 0;
for (let r = 0; r < 8; r++) {
  P.buildBattleRound();
  if (G.theme !== P.THEMES[G.themeIdx]) bad++;
  if (G.stage !== G.themeIdx + 1) bad++;
}
ok(bad === 0, 'themeIdx 對得上 THEMES 與 stage', bad);

/* ---------------- ③ 指定單張 ---------------- */
sec('③ 指定單張：固定那一張、切回隨機重新洗牌');
P.settings.battleTheme = '3';
let fixedBad = 0;
for (let r = 0; r < 6; r++) {
  P.buildBattleRound();
  if (G.themeIdx !== 3 || G.theme !== P.THEMES[3]) fixedBad++;
}
ok(fixedBad === 0, '指定第 4 張（熔岩洞窟）→ 六回合都是它', fixedBad);

P.settings.battleTheme = 'r';
P.BattleTheme.reset();
const again = [];
for (let r = 0; r < 8; r++) { P.buildBattleRound(); again.push(G.themeIdx); }
ok(new Set(again).size === 8, '切回隨機 → 重新洗牌，八回合八張', again);

P.settings.battleTheme = '7';
P.buildBattleRound();
ok(G.themeIdx === 7 && G.theme.name === '暗黑魔王城', '也可以指定最後一張');
P.settings.battleTheme = 'r';

sec('③-2 壞值不會炸');
ok(/\/\^\(r\|\[0-7\]\)\$\/\.test\(bt0\)/.test(SRC), '存檔正規化：只收 r 與 0~7');
ok(/if \(v !== 'r' && i >= 0 && i < THEMES\.length\) return i;/.test(SRC), 'battleThemeIdx 自己也會擋壞值');

/* ---------------- ④ 選單 ---------------- */
sec('④ 選單：對戰設定＋線上房間都是九顆');
const seg = env.getId('segTheme');
const nt = env.getId('netTheme');
ok(!!seg, '有 #segTheme（對戰設定）');
ok(!!nt, '有 #netTheme（線上房間）');
ok(/<div class="field"><label>地圖風格<\/label>\s*<div class="seg" id="segTheme">/.test(HTML),
  'HTML：地圖風格排在對戰設定裡');
ok(/<span class="netoptl">地圖風格<\/span>\s*<div class="seg" id="netTheme">/.test(HTML),
  'HTML：線上房間也有同一列');
P.paintThemeSegs();
const segHTML = seg.innerHTML;
ok((segHTML.match(/<button/g) || []).length === 9, '九顆按鈕（隨機 ＋ 八張）',
  (segHTML.match(/<button/g) || []).length);
ok(/data-v="r"/.test(segHTML), '第一顆是「隨機輪替」');
const names = P.THEMES.map(function (x, i) { return P.themeName(i); });
ok(names.every(function (n) { return segHTML.indexOf(n) >= 0; }), '八張主題名都在按鈕上', names);
ok((nt.innerHTML.match(/<button/g) || []).length === 9, '線上房間也是九顆');
ok(/bt\.addEventListener\('click'/.test(SRC) && /nt\.addEventListener\('click'/.test(SRC),
  '監聽掛在 .seg 上（重鋪 innerHTML 也不會掉）');
ok(/Net\.setOpt\('netTheme'/.test(SRC), '線上房間走 Net.setOpt（房主設定、其他人唯讀）');
ok(/\{ id: 'netTheme', k: 'battleTheme', t: 'str' \}/.test(SRC), 'netOptDefs 收進 battleTheme');
ok(/battleTheme: String\(settings\.battleTheme == null \? 'r' : settings\.battleTheme\),/.test(SRC),
  'Net.curOpts 會把地圖風格推給房間');

sec('④-2 回合開始報地圖名');
ok(typeof P.mapIntroCard === 'function', 'mapIntroCard 已匯出');
ok(/try \{ setTimeout\(mapIntroCard, 0\); \} catch \(e\) \{ mapIntroCard\(\); \}/.test(SRC),
  'buildBattleRound 結束時排一張提示卡（延一輪事件迴圈）');
ok(/if \(Game\.ovInfo\) return;/.test(SRC), '開場說明還開著就先不報（不跟說明卡疊在一起）');
ok(/if \(key === _miKey\) return;/.test(SRC), '同一回合同一張圖只報一次');
ok(/if \(Game\.mode === 'battle'\) \{ try \{ mapIntroCard\(\); \} catch \(e\) \{\} \}/.test(SRC),
  '按下「開戰」進倒數時補報（第一回合）');
ok(/if \(thChanged && rebuild\) \{ try \{ mapIntroCard\(\); \} catch \(e\) \{\} \}/.test(SRC),
  '線上客人端換圖也會跳一次');
let threw = null;
try { P.mapIntroCard(); } catch (e) { threw = e && e.message; }
ok(!threw, 'mapIntroCard 在沒有 doorHint 元素時也不會拋錯', threw);

/* ---------------- ⑤ 版本與字典 ---------------- */
sec('⑤ 版本戳記與字典');
ok(parseFloat(P.VERSION) >= 5.72, 'VERSION ≥ 5.72（' + P.VERSION + '）');
/* v5.74：版本斷言不再寫死。舊寫法 `SW_VERSION = 'v5.68.0'` 每升一版就變紅一次
   （而且被舊的 _runall 解析漏洞蓋住，紅了好幾版沒人發現）。改成「≥ 這個版本」。 */
function swNum(t) { const m = /SW_VERSION = 'v(\d+)\.(\d+)\.(\d+)'/.exec(t); return m ? (+m[1]) * 1e6 + (+m[2]) * 1e3 + (+m[3]) : 0; }
ok(swNum(fs.readFileSync(__dirname + '/../sw.js', 'utf8')) >= 5072000,
  'SW ≥ v5.72.0（實際 ' + swNum(fs.readFileSync(__dirname + '/../sw.js', 'utf8')) + '）');
['bt.theme|', 'bt.themeRandom|', 'bt.round|', 'bt.themeHint|'].forEach(function (k) {
  ok(I18N.indexOf('\n' + k) >= 0, '字典有 ' + k.replace('|', ''));
});
ok(/mapIntroCard: mapIntroCard/.test(SRC), 'mapIntroCard 有匯出（測試可直接叫）');

console.log('\n========================================');
console.log('v5.72 八大張風格地圖：' + pass + ' 通過 / ' + fail + ' 失敗');
if (fail) process.exitCode = 1;
