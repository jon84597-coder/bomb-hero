// verify-v528.js — v5.28 專屬驗證
//   ① 效能：伺服器 gzip／ETag／304／圖片長快取（且 Service Worker、HTML 仍 no-cache）
//   ② 死因卡：記錄兇手、王剩幾格、最後 5 秒走位；只在失敗且單人／對戰時出現
//   ③ 觀戰跟隨：cameraTarget 吃 Game.specIdx、出局才出現名字列
//   ④ 新手里程碑：第一次放彈／炸牆／吃道具，只記一次；沒放彈就死會給按鍵提示
//   ⑤ 無障礙：文字大小、減少動態（加 class）、鍵盤焦點框
//   ⑥ 排行榜：成長速率上限、舊資料先建立基準、被夾次數進 /api/health
//   ⑦ i18n：新文案五語齊全、沒有空欄位；版本 5.28
const fs = require('fs');
const path = require('path');
const { makeEnv, html } = require('./_sandbox');

const env = makeEnv();
const P = env.BH, G = P.Game;
const src = html.replace(/\r/g, '');
const root = path.resolve(__dirname, '..', '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8').replace(/\r/g, '');
const cloud = fs.readFileSync(path.join(root, 'cloud.js'), 'utf8').replace(/\r/g, '');
const i18 = fs.readFileSync(path.join(__dirname, '..', 'js', 'i18n-src.js'), 'utf8').replace(/\r/g, '');

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

// ================================================================
head('1. 伺服器：壓縮、ETag、快取');
{
  ok(/require\('zlib'\)/.test(server), '有 require zlib');
  ok(/function gzipBuf\(file, buf, st\)/.test(server), '有 gzipBuf（壓好的結果放記憶體）');
  ok(/GZ_CACHE\.get\(file\)[\s\S]{0,80}hit\.key === key/.test(server), '快取鍵含大小與 mtime，改檔立刻失效');
  ok(/level: 6/.test(server), '壓縮等級 6（不是每次最大壓）');
  ok(/'ETag': etag/.test(server), '回應帶 ETag');
  ok(/if-none-match/.test(server) && /writeHead\(304/.test(server), '帶 If-None-Match 就回 304');
  ok(/ext === '\.html' \|\|[\s\S]{0,80}sw\\\.js/.test(server), 'HTML 與 sw.js 維持 no-cache（改版才吃得到）');
  ok(/max-age=604800/.test(server), '圖片七天長快取（網址帶 ?v=）');
  ok(/head\['Content-Encoding'\] = 'gzip'/.test(server), '有壓就標 Content-Encoding');
  ok(/serveStatic\(url\.pathname, req, res\)/.test(server), '呼叫端有把 req 傳進去（才判斷得了 Accept-Encoding）');
}

// ================================================================
head('2. 死因卡');
{
  ok(/const DeathCard = \(function \(\) \{/.test(src), '有 DeathCard 模組');
  const mod = (src.match(/const DeathCard = \(function \(\) \{[\s\S]*?\n\}\)\(\);/) || [''])[0];
  ok(!!mod, 'DeathCard 區塊抓得到');
  ok(/if \(Game\.state !== 'play'\) return;/.test(mod), '只在 play 記錄（選單／結算不會污染軌跡）');
  ok(/const MAXP = 62/.test(mod), '軌跡 62 筆 × 80ms ≈ 5 秒');
  ok(/lim = \(Game\.T \|\| 40\) \* 5/.test(mod), '只記玩家附近 5 格的爆點（遠處 AI 互炸不算）');
  ok(/killer === me\) who = t\('death\.selfBomb'\)/.test(mod), '自己炸到自己時說「你自己的炸彈」');
  ok(/Game\.players\.indexOf\(killer\) >= 0\) who = t\('death\.rivalBomb'\)/.test(mod), '對手放的分得出來');
  ok(/\.boss && \(list\[i\]\.hp \| 0\) > 0/.test(mod), '會算王剩幾格血');
  ok(/dTrailCv/.test(mod) && /function draw\(\)/.test(mod), '有軌跡小畫布與繪製');
  ok(/trail\.length < 8/.test(mod), '資料太少就不畫（避免一條直線）');

  ok((src.match(/DeathCard\.reset\(\)/g) || []).length >= 3, '單人／對戰／大逃殺開局都會清空');
  ok(/DeathCard\.note\(killer\)/.test(src), '死亡時記下兇手');
  ok(/DeathCard\.boom\(/.test(src), '爆炸時記爆點');
  ok(/DeathCard\.rec\(dt\)/.test(src), '主迴圈每幀餵資料');
  ok(/DeathCard\.finish\(\)/.test(src), '命用完時把死因定案');
  ok(/\(!good && \(Game\.mode === 'solo' \|\| Game\.mode === 'battle'\)\) \? DeathCard\.html\(\)/.test(src),
    '只有失敗的單人／對戰才掛死因卡');
  ok(/if \(dcard\) \{ try \{ DeathCard\.draw\(\); \}/.test(src), '掛上去之後才畫（畫布要存在）');
}

// ================================================================
head('3. 觀戰跟隨');
{
  const ct = (src.match(/function cameraTarget\(\) \{[\s\S]*?\n\}/) || [''])[0];
  ok(/if \(Game\.specIdx != null\) \{/.test(ct), 'cameraTarget 支援指定對象');
  ok(/if \(sp && sp\.alive\) return sp;[\s\S]{0,40}Game\.specIdx = null/.test(ct), '指定的人陣亡就自動退回');
  ok(/if \(Net\.on\) return false;/.test(src), '線上不自作主張切鏡頭');
  ok(/Game\.mode !== 'br' && Game\.mode !== 'battle'/.test(src), '只有大逃殺／對戰有觀戰列');
  ok(/const me = Game\.players && Game\.players\[0\];\s*\n\s*return !!\(me && !me\.alive\);/.test(src), '自己出局才出現');
  ok(/data-sp="-1"/.test(src) && /spchip/.test(src), '有「自動」與名字按鈕');
  ok(/Game\.specIdx = \(v >= 0 && Game\.players\[v\] && Game\.players\[v\]\.alive\) \? v : null/.test(src), '點的名字必須還活著');
  ok(/try \{ Spec\.hide\(\); Game\.specIdx = null; \}/.test(src), '開局會清掉上局的跟拍對象');
}

// ================================================================
head('4. 新手里程碑');
{
  ok(/const FirstRun = \(function \(\) \{/.test(src), '有 FirstRun 模組');
  const m = (src.match(/const FirstRun = \(function \(\) \{[\s\S]*?\n\}\)\(\);/) || [''])[0];
  ok(/if \(st\[k\]\) return;/.test(m), '同一個里程碑只提示一次');
  ok(/if \(Game\.state !== 'play'\) return;/.test(m), '選單裡不會觸發');
  ok(/st\[k\] = 1; save\(\)/.test(m), '做到才寫進本機');
  ok(/if \(Game\.mode !== 'solo' \|\| \(Game\.stage \| 0\) > 3\) return '';/.test(m), '沒放彈提示只在前三關給');
  ok(/FirstRun\.hit\('b'\)/.test(src) && /FirstRun\.hit\('w'\)/.test(src) && /FirstRun\.hit\('i'\)/.test(src),
    '放彈／炸軟磚／吃道具三個點都接上了');
  ok(/tip = FirstRun\.missTip\(\)/.test(src), '死因卡會帶新手建議');
  ok(/trail\.length >> 1\) < 14\) tip = t\('first\.stuck'\)/.test(src), '幾乎沒移動會說「站著不動最容易被自己的火燒到」');
}

// ================================================================
head('5. 無障礙');
{
  ok(/font: 'n',/.test(src) && /calm: 0,/.test(src), 'settings 有 font／calm 預設');
  ok(/function applyA11y\(\) \{/.test(src), '有 applyA11y');
  ok(/b\.classList\.toggle\('bigtext', settings\.font === 'l'\)/.test(src), '大字＝body.bigtext');
  ok(/b\.classList\.toggle\('calm', !!settings\.calm\)/.test(src), '減少動態＝body.calm');
  ok(/body\.bigtext \.card, body\.bigtext #ovBox/.test(src), '大字套在卡片與對話框');
  ok(/body\.calm \*, body\.calm \*::before/.test(src), '減少動態會停掉 CSS 動畫與轉場');
  ok(/:focus-visible \{ outline: 3px solid/.test(src), '鍵盤有明顯焦點框');
  ok(/settings\.calm \? \.45 : 1/.test(src), '減少動態也把環境粒子降到 45%');
  ok(/segWire\('segFont'/.test(src) && /segWire\('segCalm'/.test(src), '兩個新設定都接上分段按鈕');
  ok(/try \{ applyA11y\(\); \}/.test(src), '開機就套用（不用進設定頁）');
  const m = (src.match(/function ambN\(n\)[^\n]*/) || [''])[0];
  ok(/Math\.max\(1,/.test(m), '粒子數不會變成 0（場景不會完全空掉）');
}

// ================================================================
head('6. 排行榜合理性');
{
  ok(/const RANK_RATE = \{/.test(cloud), '有每個分類的成長速率表');
  ['soloKill', 'soloBoss', 'rpgKill', 'rpgBoss', 'brKill', 'brWin', 'btKill', 'btWin', 'onKill', 'onWin']
    .forEach(function (k) { ok(new RegExp(k + ':').test(cloud), '速率表含 ' + k); });
  ok(/const trusted = \(a\.v === 2\)/.test(cloud), '舊紀錄第一次只建立基準（不會誤砍老玩家）');
  ok(/a\.v = 2;/.test(cloud), '存檔後標記為已建立基準');
  ok(/Math\.max\(5, Math\.ceil\(Math\.max\(0, secs\) \* rate\)\)/.test(cloud), '寬限 +5，之後照秒數算');
  ok(/rankClamped\+\+/.test(cloud), '被夾住會計數');
  ok(/rankClamped: rankClamped/.test(cloud), '/api/health 看得到');
  ok(/clampInt\(cats && cats\[k\], 0, 1e7, 0\)/.test(cloud), '單一分類上限 1e7');
}

// ================================================================
head('7. i18n 與版本');
{
  const keys = ['death.unknown', 'death.selfBomb', 'death.rivalBomb', 'death.byFoe', 'death.left', 'death.stage',
    'death.trailTip', 'spec.title', 'spec.auto', 'spec.hint', 'first.b', 'first.w', 'first.i', 'first.noBomb',
    'first.stuck', 'ui.font', 'ui.fontHint', 'ui.calm', 'ui.calmHint', 'foe.bossName', 'foe.someName'];
  const miss = keys.filter(function (k) { return i18.indexOf('\n' + k + '|') < 0; });
  ok(miss.length === 0, '新文案都在字典裡（缺：' + miss.join(',') + '）');
  const bad = keys.filter(function (k) {
    const ln = i18.split('\n').filter(function (x) { return x.indexOf(k + '|') === 0; })[0] || '';
    return ln.split('|').length !== 6 || ln.split('|').slice(1).some(function (v) { return !v; });
  });
  ok(bad.length === 0, '五個語言都沒有空欄位（缺：' + bad.join(',') + '）');
  // 整份字典：欄位數與空欄位
  const rows = i18.split('\n').filter(function (x) { return /^[a-z]/.test(x) && x.indexOf('|') > 0; });
  ok(rows.every(function (r) { return r.split('|').length === 6; }), '整份字典每列都是 6 欄（' + rows.length + ' 列）');

  const vv = P.VERSION.split('.').map(Number);
  ok(vv[0] > 5 || (vv[0] === 5 && vv[1] >= 28), 'VERSION ≥ 5.28（目前 ' + P.VERSION + '）');
  ok(/id="verTxt">5\.(2[8-9]|[3-9]\d)</.test(src), '首頁徽章同步 ≥ 5.28');
  const logHead = src.slice(src.indexOf('const VERSION_LOG = ['), src.indexOf('const VERSION_LOG = [') + 120);
  ok(/now: true/.test(logHead), 'VERSION_LOG 第一筆 now:true');
  ok(/\{ v: '5\.27'[^\n]*now: false/.test(src), '5.27 已標 now:false');
  const entry = (src.match(/\{ v: '5\.28'[\s\S]*?\n  \] \},/) || [''])[0];
  ok((entry.match(/'\s{0,2}[⚡💀👁🎓🔠🛡🌏]/g) || []).length >= 4, 'VERSION_LOG 5.28 至少 4 條');
  ['bomb-hero/sw.js', 'public/sw.js', 'bomberman-online/public/sw.js'].forEach(function (rel) {
    const f = path.join(root, rel);
    const w = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
    ok(/var SW_VERSION = 'v5\.(2[89]|[3-9]\d)\.\d+';/.test(w), rel + ' SW_VERSION ≥ 5.28');
  });
  const pw = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  ok(/^5\.(2[89]|[3-9]\d)\./.test(pw.version), 'package.json ≥ 5.28（目前 ' + pw.version + '）');
  const rawLen = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').length;
  ok(rawLen < 1900000, '主檔 ' + rawLen + ' 字元（預算 1,900,000）');
}

console.log('\n========================================');
console.log('v5.28：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
