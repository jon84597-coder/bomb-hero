// test/verify-v572.js —— v5.71：首頁招呼語 ＋ 暱稱定案（改名要 5,000 金幣）
//   需求：取過暱稱之後，每次回到首頁都用一句招呼語叫玩家（五組隨機）；
//         招呼語裡的名字要是「設計過的文字」（金色漸層 .gname），其餘是一般文字；
//         想換暱稱只能進「線上玩家 → 我的資料」，而且要花 5,000 金幣。
//   本支分成：① 模組與常數 ② 招呼語字典（五語言 × 五組） ③ 首頁渲染
//             ④ 定案的時機（含舊存檔遷移） ⑤ 改名（三種錯誤 ＋ 成功扣款） ⑥ 介面與版本
const fs = require('fs');
const { makeEnv } = require('./_sandbox');

const env = makeEnv();
const P = env.BH, G = P.Game, S = P.settings, N = P.Nick;
const SRC = fs.readFileSync(__dirname + '/../js/main.js', 'utf8');
const HTML = fs.readFileSync(__dirname + '/../index.html', 'utf8');
const DICT = fs.readFileSync(__dirname + '/../js/i18n-src.js', 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg, extra) {
  if (cond) { pass++; console.log('  ✓ ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
function sec(t) { console.log('\n=== ' + t + ' ==='); }

const wrap = env.getId('nickWrap');
const box = env.getId('greetLine');
const inp = env.getId('playerName');
function reset(name, lock, auto) {
  S.playerName = name || '';
  S.nameLock = lock ? 1 : 0;
  S.nameAuto = auto ? 1 : 0;
  if (inp) inp.value = name || '';
  if (box) { box.innerHTML = ''; box.setAttribute('data-g', ''); }
  if (wrap) wrap._cls.delete('lock');
}

/* ---------------------------------------------------------------- ① */
sec('① 模組與常數');
ok(P.NICK_PRICE === 3000, '改名價格＝3,000 金幣', P.NICK_PRICE);
ok(P.NICK_GREETS === 5, '招呼語共 5 組', P.NICK_GREETS);
ok(!!N && typeof N.rename === 'function' && typeof N.greet === 'function', 'Nick 已匯出並有 greet／rename');
ok(N.MAX === 8 && S.nameLock === 0 && S.nameAuto === 0, '暱稱上限 8 字、兩個新欄位預設 0');
ok(/const NICK_PRICE = 3000;/.test(SRC), '原始碼：NICK_PRICE 常數寫死 3000');

/* ---------------------------------------------------------------- ② */
sec('② 招呼語字典（5 語言 × 5 組）');
const rows = {};
DICT.split('\n').forEach(function (l) {
  const m = /^([a-z0-9][a-zA-Z0-9._]*)\|(.*)$/.exec(l);
  if (!m) return;
  const f = m[2].split('|');
  if (f.length === 5) rows[m[1]] = f;
});
const LANGS = P.LANGS.map(function (l) { return l.id; });
let langHit = 0, braceHit = 0;
for (let k = 1; k <= 5; k++) {
  const f = rows['nick.greet.' + k];
  if (f && f.length === 5 && f.every(function (x) { return x.trim() !== ''; })) langHit++;
  if (f && f.every(function (x) { return x.indexOf('{n}') >= 0; })) braceHit++;
}
ok(langHit === 5, '五組招呼語、五個語言都填滿', langHit + '/5');
ok(braceHit === 5, '每一句都保留 {n} 讓暱稱插進去', braceHit + '/5');
ok(LANGS.every(function (L) { return !!P.I18N[L] && !!P.I18N[L]['nick.greet.3']; }), '執行期 I18N 每個語言都吃得到招呼語');
const uiKeys = ['nick.cur', 'nick.new', 'nick.btn', 'nick.ph', 'nick.okPay', 'nick.cancel', 'nick.cost', 'nick.same', 'nick.empty', 'nick.done', 'nick.noGold', 'nick.editTip'];
ok(uiKeys.every(function (k) { return rows[k] && rows[k].length === 5; }), '改名介面 12 條文案五語言齊全', uiKeys.filter(function (k) { return !rows[k]; }));

/* ---------------------------------------------------------------- ③ */
sec('③ 首頁渲染（未定案 / 定案）');
reset('小明', 0, 0);
let h = N.render();
ok(h === '' && box.innerHTML === '', '還沒定案：招呼語不出現（首頁仍是輸入框）');
ok(wrap._cls.has('lock') === false, '還沒定案：nickwrap 不加 .lock');

reset('小明', 1, 0);
h = N.greet();
ok(wrap._cls.has('lock') === true, '定案後：nickwrap 加上 .lock（CSS 會收起輸入框）');
ok(h.indexOf('class="gname"') > 0, '定案後：招呼語裡有 .gname（設計過的名字）');
ok(h.indexOf('>小明<') > 0, '定案後：招呼語裡真的有暱稱');
ok(h.indexOf('gedit') > 0, '定案後：右邊有 ✏️（跳「我的資料」）');
ok(/^<span class="gi">/.test(h) && h.indexOf('class="gt"') > 0, '招呼語結構：圖示 ＋ 文字 兩段');
const picked = [];
for (let i = 0; i < 40; i++) { N.greet(); picked.push(parseInt(box.getAttribute('data-g'), 10)); }
ok(picked.every(function (k) { return k >= 1 && k <= 5; }), '抽到的永遠是第 1~5 組', picked.slice(0, 8));
let rep = 0;
for (let i = 1; i < picked.length; i++) if (picked[i] === picked[i - 1]) rep++;
ok(rep === 0, '同一句不會連著出現兩次', rep);
const five = {};
picked.forEach(function (k) { five[k] = 1; });
ok(Object.keys(five).length === 5, '40 次之內五組都出現過', Object.keys(five));

reset('<b>阿呆', 1, 0);
h = N.greet();
ok(h.indexOf('&lt;b&gt;阿呆') > 0 && h.indexOf('<b>阿呆') < 0, '暱稱有做 HTML 跳脫（不會被當標籤）');

/* ---------------------------------------------------------------- ④ */
sec('④ 定案的時機');
reset('小明', 0, 0);
ok(N.locked() === false, '還沒定案時 locked() = false');
ok(N.commit() === true && S.nameLock === 1, '離開首頁 → commit() 把名字定案');
ok(N.locked() === true, '定案後 locked() = true');

reset('玩家123', 0, 1);            // 系統自動取的名字
ok(N.commit() === false && S.nameLock === 0, '系統自動取的名字不算定案（可以免費自己取名）');
reset('', 0, 0);
ok(N.commit() === false && S.nameLock === 0, '名字還是空的時候不定案');

reset('老玩家', 0, 0);
ok(N.migrate() === true && S.nameLock === 1, '舊存檔：已經有名字 → 遷移成定案');
reset('玩家456', 0, 0);
ok(N.migrate() === false && S.nameAuto === 1, '舊存檔：看起來是自動取的名字 → 標成 nameAuto，不鎖');
reset('小明', 1, 0);
ok(N.migrate() === false && S.nameLock === 1, '已經定案過的不會被重複遷移');

/* v5.74：中間插了 Starter.apply()（新手起手禮），改成「先 greet 後 commit」的寬鬆比對。 */
ok(/if \(name === 'title'\)[\s\S]{0,90}Nick\.greet\(\)[\s\S]{0,40}else Nick\.commit\(\)/.test(SRC), 'Screen 換頁：回首頁換招呼語、離開就定案');
ok(/settings\.nameAuto = 0;[^]*?\n    \}\);/.test(SRC), '首頁手動打字 → 取消 nameAuto');
ok(/settings\.nameAuto = 1;/.test(SRC), 'autoNickname() 會標記 nameAuto');

/* ---------------------------------------------------------------- ⑤ */
sec('⑤ 改名（我的資料 → 花 5,000 金幣）');
P.setDevBuild(false);
reset('小明', 1, 0);
P.Shop.addGold(-P.Shop.gold());          // 歸零，確保金幣不足
let g0 = P.Shop.gold();
let r = N.rename('');
ok(r.ok === false && r.err === 'EMPTY', '空白暱稱被擋下', r);
r = N.rename('小明');
ok(r.ok === false && r.err === 'SAME', '同名被擋下', r);
r = N.rename('阿呆');
ok(r.ok === false && r.err === 'GOLD', '金幣不足被擋下', r);
ok(r.need === 3000 && P.Shop.gold() === g0, '金幣不足時一毛都沒扣', { need: r.need, gold: P.Shop.gold() });

P.Shop.addGold(6000);
S.brName = '小明';                        // 大逃殺用的是同一組名字
r = N.rename('阿呆');
ok(r.ok === true && r.price === 3000, '金幣夠就改名成功', r);
ok(P.Shop.gold() === 3000, '確實扣了 3,000 金幣', P.Shop.gold());
ok(S.playerName === '阿呆' && S.nameLock === 1, '暱稱與定案狀態都更新');
ok(S.brName === '', '大逃殺用的名字跟著換（清掉舊的 brName）');
ok(inp.value === '阿呆', '首頁那格 input 同步成新名字', inp.value);
ok(box.innerHTML.indexOf('阿呆') > 0, '招呼語立刻換成新名字');

P.Shop.addGold(6000);
S.brName = '我自己取的';
r = N.rename('炸彈王');
ok(r.ok === true && S.brName === '我自己取的', '玩家自己另外取過的大逃殺名字不動');
ok(N.rename('   ') .err === 'EMPTY', '全空白也算空白');

/* ---------------------------------------------------------------- ⑥ */
sec('⑥ 介面與版本');
ok(/id="nickWrap"/.test(HTML) && /id="greetLine"/.test(HTML), 'HTML：nickwrap 有 id、招呼語節點存在');
ok(/#scr-title \.nickwrap\.lock \.nklabel,[\s\S]{0,80}#scr-title \.nickwrap\.lock \.tinput \{ display: none; \}/.test(HTML), 'CSS：定案後收起標籤與輸入框');
ok(/#scr-title \.nickwrap\.lock \.greet \{ display: flex; \}/.test(HTML), 'CSS：定案後改成顯示招呼語');
ok(/\.greet \.gname \{[\s\S]{0,240}-webkit-background-clip: text/.test(HTML), 'CSS：暱稱是漸層字（background-clip）');
ok(/#scr-title \.nickwrap \{ display: flex; flex-direction: column/.test(HTML), '舊的暱稱列版面沒被動到（桌機／豎屏仍直排）');

P.setDevBuild(false);
S.playerName = '小明';
P.Social.open('me');
const meHtml = env.getId('onBody').innerHTML;
ok(meHtml.indexOf('id="socNickEdit"') > 0, '我的資料裡有「更改暱稱」按鈕');
ok(meHtml.indexOf('3000') > 0 || meHtml.indexOf('3,000') > 0, '按鈕上直接寫出價格', /💰\s*3000/.test(meHtml));
ok(/nickRowHTML\(\) \+/.test(SRC), 'renderMe() 有把暱稱區塊插進去');

ok(String(P.VERSION) >= '5.71', 'VERSION ≥ 5.71（' + P.VERSION + '）');
const vl = (P.VERSION_LOG || [])[0] || {};
/* v5.74：版本斷言改成「不寫死」—— VERSION_LOG[0] 永遠是當前版本，
   5.71／5.70 這種歷史條目只要「還在表裡、且已收成 now:false」就算過。 */
ok(vl.v === String(P.VERSION) && vl.now === true, 'VERSION_LOG 第一筆＝當前版本且 now:true（' + vl.v + '）');
const vlLog = P.VERSION_LOG || [];
const e571 = vlLog.filter(function (x) { return x.v === '5.71'; })[0];
const e570 = vlLog.filter(function (x) { return x.v === '5.70'; })[0];
ok(!!e571 && e571.now === false, '5.71 那筆還在表裡、已收成 now:false');
ok(!!e570 && e570.now === false, '5.70 那筆還在表裡、已收成 now:false');

console.log('\n========================================');
console.log('v5.71 首頁招呼語／暱稱定案：' + pass + ' 通過 / ' + fail + ' 失敗');
if (fail) process.exitCode = 1;
