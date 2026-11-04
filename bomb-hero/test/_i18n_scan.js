// test/_i18n_scan.js —— v4.77：掃出「使用者看得到、但沒有翻譯」的中文
// 手法：把每個畫面／模式都跑一遍，收集 fillText 字串與 DOM 文字，再跟現有字典比對。
const { makeEnv } = require('./_sandbox');
const fs = require('fs');

const CJK = /[\u3400-\u9fff\uf900-\ufaff]/;
const seen = new Map();

function add(s) {
  if (typeof s !== 'string') return;
  if (!CJK.test(s)) return;
  const t = s.replace(/\s+/g, ' ').trim();
  if (!t) return;
  if (t.length > 160) return;
  seen.set(t, (seen.get(t) || 0) + 1);
}

const RAW = !!process.env.RAW;   // RAW=1：輸出整條寫入字串（含 HTML）
let TRF = null;   // 用執行期的 trLive 模擬「使用者實際看到的文字」
function drain(env) {
  const rec = env.rec;
  const f = (x) => (TRF && typeof x === 'string') ? TRF(x) : x;
  for (const c of rec.calls) if (c[0] === 'fillText') add(f(c[1]));
  for (const x of rec.texts) {
    const str = String(x);
    if (RAW) { const y = f(str); if (/[\u3400-\u9fff]/.test(y)) add(str); continue; }
    if (str.indexOf('<') >= 0) {                    // innerHTML：每個文字節點分開翻（跟瀏覽器一樣）
      str.split(/<[^>]*>/).forEach(function (seg) { add(String(f(seg)).trim()); });
    } else add(String(f(str)));
  }
  rec.calls.length = 0; rec.texts.length = 0;
}

// 把 HTML 內的字串常值也掃一遍（覆蓋還沒被跑到的分支）
const src = fs.readFileSync(__dirname + '/../index.html', 'utf8');
const code = src.match(/<script>([\s\S]*?)<\/script>/)[1];

const LANG = process.env.SCAN_LANG || 'zh-TW';
function run(label, fn) {
  let env;
  try { env = makeEnv({ storage: LANG === 'zh-TW' ? null : { 'bombhero-lang': LANG } }); } catch (e) { console.log('  !! ' + label + ': ' + e.message); return; }
  const P = env.BH, G = P.Game;
  TRF = (LANG === 'zh-TW') ? null : function (x) { try { return P.trLive(x); } catch (e) { return x; } };
  drain(env);
  try { fn(P, G, env); } catch (e) { console.log('  !! ' + label + ': ' + e.message); }
  for (let i = 0; i < 40; i++) {
    try { P.updateWorld(1 / 60); } catch (e) {}
    try { P.render(); } catch (e) {}
  }
  try { P.updateHud(); } catch (e) {}
  drain(env);
}

// ---- 畫面 ----
const screens = ['title', 'shop', 'settings', 'help', 'learn', 'online', 'char', 'rpg', 'lang'];
for (const s of screens) run('screen ' + s, (P, G) => { P.Screen.show(s); if (P.Help && P.Help.render) P.Help.render(); });

// ---- 單人 8 關 ----
for (let st = 1; st <= 8; st++) run('solo ' + st, (P, G) => { P.startSolo(st, false); });
// ---- RPG 32 章（抽樣） ----
for (const st of [1, 5, 9, 12, 16, 20, 24, 28, 32]) run('rpg ' + st, (P, G) => { try { P.startRpg(st); } catch (e) { P.startSolo(st, false); } });
// ---- BOSS 挑戰 ----
run('bossrush', (P, G) => { P.startBossRush(); });
// ---- 對戰 2~8 人 ----
for (const n of [2, 4, 8]) run('battle ' + n, (P, G) => { try { P.settings.count = n; P.startBattle(n); } catch (e) {} });
// ---- 大逃殺 ----
for (const cfg of [{ n: 30, team: 1, dur: 10 }, { n: 50, team: 1, dur: 5 }, { n: 30, team: 2, dur: 10 }, { n: 30, team: 4, dur: 10 }]) {
  run('br ' + cfg.n + '/' + cfg.team + '/' + cfg.dur, (P, G) => { P.BR.opt = cfg; P.startBR(); });
}
// ---- 地圖測試 ----
for (const i of [1, 3, 5]) run('maptest ' + i, (P, G) => { try { P.startMapTest(i); } catch (e) {} });

if (process.env.SCAN_LANG) {
  const arr = [];
  for (const [k, n] of seen) arr.push([k, n]);
  arr.sort((a, b) => b[1] - a[1] || b[0].length - a[0].length);
  console.log('\n===== 執行期·' + LANG + ' 仍顯示中文 ' + arr.length + ' 條 =====');
  arr.forEach(([k, n]) => console.log(String(n).padStart(3) + ' | ' + k));
  process.exit(0);
}

// ---- 直接掃原始碼裡的漏網之魚（只列出「看起來像畫面文字」的） ----
const literals = new Map();
const re = /'((?:[^'\\\n]|\\.){2,80})'/g;
let m;
while ((m = re.exec(code))) {
  const s = m[1];
  if (!CJK.test(s)) continue;
  if (/^[\s]*$/.test(s)) continue;
  literals.set(s, (literals.get(s) || 0) + 1);
}

// ---- 與現有字典比對 ----
const env0 = makeEnv();
const P0 = env0.BH;
const dict = new Set();
// 用 zh-TW 原文反查（SRC2KEY 的鍵就是原文）
for (const k in (P0.I18N ? P0.I18N['zh-TW'] : {})) {
  const v = P0.I18N['zh-TW'][k];
  if (typeof v === 'string') dict.add(v);
}
console.log('字典現有 zh-TW 條目:', dict.size);

function report(map, title) {
  const miss = [];
  for (const [s, n] of map) {
    if (dict.has(s)) continue;
    // 去掉純符號／emoji
    if (!/[\u3400-\u9fff]/.test(s)) continue;
    miss.push([s, n]);
  }
  miss.sort((a, b) => b[1] - a[1] || b[0].length - a[0].length);
  console.log('\n===== ' + title + ' 未翻譯 ' + miss.length + ' 條 =====');
  miss.forEach(([s, n]) => console.log(String(n).padStart(3) + ' | ' + s));
  return miss;
}

report(seen, '執行期實際顯示');
report(literals, '原始碼字串常值');
