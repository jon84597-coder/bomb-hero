// v5.0b 驗證：隨從比例／青蛙縮小／衝刺只認專用鍵／救援治療特效／八位 BOSS
// 跑法：node test/verify-v501.js
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

let pass = 0, fail = 0;
function ok(cond, msg, extra) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg + (extra === undefined ? '' : ' → ' + JSON.stringify(extra))); }
}
function head(s) { console.log('\n' + s); }

const SRC = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const env = makeEnv();
const B = env.BH, G = env.G, SPR = path.join(__dirname, '..', 'spr');

// ---------------------------------------------------------------
head('① 衝刺：只認專用鍵（不再用「連點同方向」）');
ok(B.DASH_CD === 1.2, '冷卻 1.2 秒（' + B.DASH_CD + '）');
ok(B.DASH_TILES === 1.5, '位移 1.5 格（' + B.DASH_TILES + '）');
ok(B.DASH_IFRAME === .18, '霸體 0.18 秒（' + B.DASH_IFRAME + '）');
ok(B.DASH_T < B.DASH_CD, '衝刺時間 < 冷卻（' + B.DASH_T + ' < ' + B.DASH_CD + '）');
const dw = (SRC.match(/function dashWanted[\s\S]*?\n}/) || [''])[0];
ok(dw.length > 0, '找得到 dashWanted');
ok(dw.indexOf('tapDir') < 0 && dw.indexOf('tapAt') < 0, 'dashWanted 裡沒有連點判定（走路不會誤觸衝刺）');
ok(dw.indexOf('scheme.dash') > 0, 'dashWanted 只看 scheme.dash（Shift／手把 RB／手機 💨）');
ok(SRC.indexOf('TouchA/TouchD/TouchF') >= 0 || SRC.indexOf('edges.TouchX') >= 0, '手機衝刺鍵仍在（TouchX）');

// ---------------------------------------------------------------
head('② 隨從身高＝主角（犀牛再高 20%）');
const PA = B.PET_ART;
ok(PA && PA.blade && PA.bomber && PA.guard, '三位隨從都有美術設定');
ok(PA.blade.k === 1, '狼刀客＝主角高（' + PA.blade.k + '×）');
ok(PA.bomber.k === 1, '猴投彈＝主角高（' + PA.bomber.k + '×）');
ok(PA.guard.k === 1.2, '犀牛＝主角 ×1.2（' + PA.guard.k + '×）');
const T0 = 40;
const hBlade = B.petBodyH(T0, 'blade');
const hGuard = B.petBodyH(T0, 'guard');
ok(Math.abs(hBlade / T0 - 1.215) < .01, '主角可見身高 = 1.215 格（實測 ' + (hBlade / T0).toFixed(3) + '）');
ok(Math.abs(hGuard / hBlade - 1.2) < .001, '犀牛比狼高 20%（' + (hGuard / hBlade).toFixed(3) + '）');
ok(Math.abs(B.petSizeK('guard') - 1.2) < .001, 'petSizeK(guard) = 1.2（影子／徽章跟著放大）');

// ---------------------------------------------------------------
head('③ 青蛙縮小 5%');
ok(B.HERO_SIZE_K.frog === .90, '青蛙尺寸係數 .95 → .90（' + B.HERO_SIZE_K.frog + '）');
ok(B.HERO_SIZE_K.pig === .95 && B.HERO_SIZE_K.chick === .95, '豬／雞維持 .95（沒被連帶改到）');

// ---------------------------------------------------------------
head('④ 救援過程中就有治療特效');
ok(SRC.indexOf('drawPetHeal(x, y, T, prog > 0 ? 1.1') > 0, '救援進度 > 0 就開始畫治療光環');
ok(/function drawPetHeal\(x, y, T, k, pulse\)/.test(SRC), 'drawPetHeal 多了 pulse（呼吸）參數');
ok(SRC.indexOf('pt.healFx') > 0, '救援中持續冒出綠色光點');
const healAfter = SRC.indexOf('pt.healT = 1.1');
ok(healAfter > 0, '救回來後光環再留 1.1 秒（特效保留）');

// ---------------------------------------------------------------
head('⑤ 八位 BOSS：招式表');
const K = B.BOSS_KIT;
ok(K && Object.keys(K).length === 8, '八位 BOSS 都有專屬招式表（' + Object.keys(K || {}).length + '）');
const allSets = [];
let pickOk = 0, colOk = 0;
Object.keys(K || {}).forEach(function (n) {
  const kit = K[n];
  if (typeof kit.pick === 'function') pickOk++;
  if (/^#[0-9a-f]{6}$/i.test(kit.col || '')) colOk++;
});
ok(pickOk === 8, '每位都有「挑招」邏輯（' + pickOk + '/8）');
ok(colOk === 8, '每位都有專屬徵兆顏色（' + colOk + '/8）');
['woolWave', 'lambCall', 'graze', 'burrow', 'sandStorm', 'drag', 'iceFloor', 'snowball', 'iceShell',
 'lavaTide', 'firePillar', 'meteor', 'beatBlast', 'laserSweep', 'drone', 'lureOrbs', 'tentacle',
 'current', 'tornado', 'dive', 'gustBurst', 'curseCard', 'shadowClones', 'shadowRing']
  .forEach(function (sk) { allSets.push(sk); });
let missingFire = allSets.filter(function (sk) { return SRC.indexOf("case '" + sk + "'") < 0; });
ok(missingFire.length === 0, '24 個招式都有實作' + (missingFire.length ? '（缺 ' + missingFire.join(',') + '）' : ''));
ok(SRC.indexOf('function bossCastTick') > 0 && SRC.indexOf('function bossFire') > 0, '有集氣與出手兩個階段');
ok(SRC.indexOf('if (casting) target = null;') > 0, '集氣時 BOSS 站定不動');
ok(SRC.indexOf("e.hitT > 0 && (e.castSkill === 'graze' || e.castSkill === 'iceShell')") > 0,
  '回血／冰封可以被打了斷（⚡ 提示）');

// ---------------------------------------------------------------
head('⑥ 八位 BOSS：四幀美術');
const arts = B.BOSS_ART;
for (let i = 1; i <= 8; i++) {
  const key = 'b' + i;
  const M = arts[key];
  if (!M) { ok(false, key + ' 沒有美術設定'); continue; }
  const frames = [M.u].concat((M.frames || []).filter(Boolean));
  const miss = frames.filter(function (u) { return !fs.existsSync(path.join(__dirname, '..', u)); });
  ok(frames.length === 4 && miss.length === 0,
    key + ' 四幀齊全（' + frames.length + ' 張）' + (miss.length ? '，缺 ' + miss.join(',') : ''));
  ok(M.bodyRatio > .5 && M.bodyRatio < 1, key + ' bodyRatio ' + M.bodyRatio + '（畫布留邊要除回去）');
}

// ---------------------------------------------------------------
head('⑦ i18n：八個名字 × 5 語言');
const LANGS = B.LANGS.map(function (l) { return l.id; });
ok(LANGS.length === 5, '五個語系（' + LANGS.join('/') + '）');
let nameBad = [];
for (let i = 1; i <= 8; i++) {
  LANGS.forEach(function (L) {
    const v = (B.I18N[L] || {})['boss.' + i];
    if (!v || !v.length) nameBad.push('boss.' + i + '@' + L);
  });
}
ok(nameBad.length === 0, '8 × 5 = 40 條名字都翻了' + (nameBad.length ? '（缺 ' + nameBad.slice(0, 4).join(',') + '）' : ''));

// ---------------------------------------------------------------
head('⑧ 招式真的會產生效果');
function setupStage(ch) {
  G.mode = 'solo'; G.T = 40; G.cols = 13; G.rows = 11; G.spdK = 1;
  G.stage = ch * 4;                    // 每一大關的最後一小關
  G.grid = [];
  for (let y = 0; y < G.rows; y++) {
    const row = [];
    for (let x = 0; x < G.cols; x++) row.push((x === 0 || y === 0 || x === G.cols - 1 || y === G.rows - 1) ? 1 : 0);
    G.grid.push(row);
  }
  G.bombs = []; G.flames = []; G.enemies = []; G.particles = [];
  G.foeAoe = []; G.foeHaz = []; G.rollers = []; G.orbs = []; G.pets = [];
  G.bossRush = false; G.daily = null; G.gameT = 1;
  G.door = null; G.hidden = {};
}
function mkPlayer(x, y) {
  return { x: x, y: y, alive: true, invuln: 0, slamGuard: 0, dizzy: 0, facing: 'up',
           team: -1, skull: null, skullT: 0, slide: null, ch: { color: '#fff' }, chIdx: 0,
           speedLv: 0, rpgSpd: 1, moving: false, walkT: 0, score: 0 };
}
let fired = 0, effects = 0;
for (let ch = 1; ch <= 8; ch++) {
  setupStage(ch);
  const p = mkPlayer(4 * 40 + 20, 6 * 40 + 20);
  G.players = [p];
  const boss = {
    boss: true, x: 8 * 40 + 20, y: 6 * 40 + 20, r: 24, hp: 12, maxHp: 12, hitT: 0,
    castT: 0, castSkill: '', castMax: .9, skillCd: 0, skillNo: 0, aggro: true,
    color: '#fff', walkT: 0, dirName: 'left', type: 'slime', dizzy: 0
  };
  G.enemies.push(boss);
  let picked = false, pickedName = '';
  try {
    // 集氣
    const casting = B.bossCastTick(boss, 1 / 60);
    picked = !!boss.castSkill && boss.castT > 0;
    pickedName = boss.castSkill;
    // 直接把集氣時間跑完 → 出手
    let guard = 0;
    while (boss.castT > 0 && guard++ < 400) B.bossCastTick(boss, 1 / 60);
  } catch (e) {
    ok(false, '第 ' + ch + ' 關的 BOSS 出手時丟錯：' + e.message);
    continue;
  }
  const fx = (G.foeAoe || []).length + (G.foeHaz || []).length + (G.rollers || []).length +
             (G.orbs || []).length + Math.max(0, G.enemies.length - 1) + (p.dizzy > 0 ? 1 : 0) +
             (p.skull ? 1 : 0) + (boss.hp > 12 ? 1 : 0);
  if (picked) fired++;
  if (fx > 0) effects++;
  ok(picked, '第 ' + ch + ' 關 BOSS 會挑招集氣（' + (pickedName || '沒挑到') + '）');
  ok(fx > 0, '第 ' + ch + ' 關 BOSS 的招式有留下效果（' + fx + ' 個）');
}
ok(fired === 8, '八位 BOSS 都會集氣（' + fired + '/8）');
ok(effects === 8, '八位 BOSS 的招式都有實際效果（' + effects + '/8）');

// ---------------------------------------------------------------
head('⑨ 八位 BOSS 的徵兆色都不同（看得出來是哪隻王在出招）');
const cols = {};
let dup = 0;
Object.keys(K || {}).forEach(function (n) {
  const c = String(K[n].col).toLowerCase();
  if (cols[c]) dup++;
  cols[c] = 1;
});
ok(dup === 0, '八個徵兆色互不重複（' + Object.keys(cols).join(' ') + '）');

// ---------------------------------------------------------------
head('⑩ 集氣特效不會蓋在 BOSS 身上（v5.1 修的雜訊）');
// BOSS 用 castT 當集氣條，但沒有 castX/castY、也沒有 fx
// → 舊版會在小怪用的兩支函式裡畫出「白十字＋橘色光暈」，看起來像畫面壞掉
const castGround = (SRC.match(/function drawFoeCastGround[\s\S]*?\n}\n/) || [''])[0];
const castFx = (SRC.match(/function drawFoeCastFx[\s\S]*?\n}\n/) || [''])[0];
ok(castGround.length > 0 && castFx.length > 0, '兩支集氣特效函式都還在');
ok(/if \(e\.boss \|\| e\.castX == null/.test(castGround), 'drawFoeCastGround 跳過 BOSS／沒有落點格的怪');
ok(/if \(!\(e\.castT > 0\)\) continue;[\s\S]{0,220}if \(e\.boss\) continue;/.test(castFx), 'drawFoeCastFx 跳過 BOSS');
ok(castFx.indexOf("BOLT_COLOR[e.fx] || '#ffb347'") > 0, '小怪的橘色預設還在（沒有誤刪小怪特效）');
// 王自己的地面光環不能被偷偷關掉
ok(/if \(e\.castT > 0\) \{\n\s+const ck = 1 - e\.castT/.test(SRC), 'BOSS 的地面集氣光環有啟用（不是 if(false…)）');
ok(SRC.indexOf('if (false &&') < 0, '檔案裡沒有殘留的 if (false && …) 停用碼');

// ---------------------------------------------------------------
head('⑪ 版號／紀錄（v5.1）');
function vt(v) { return String(v).split('.').map(function (x) { return parseInt(x, 10) || 0; }); }
function gt(a, b) { const x = vt(a), y = vt(b); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; }
ok(gt(B.VERSION, '5.0'), 'VERSION 比 5.0 新（' + B.VERSION + '）');
ok(B.VERSION_LOG[0].v === B.VERSION, '版本紀錄第一筆 = VERSION');
ok(B.VERSION_LOG[0].now === true && B.VERSION_LOG[1].now === false, '只有最新一筆標 now');
// v5.2：這條原本驗「最新一筆」的清單長度，結果每次改版都要回來改測試 → 改成驗 5.1 那一筆自己的內容
const v51 = B.VERSION_LOG.filter(function (e) { return e.v === '5.1'; })[0];
ok(v51 && v51.items.length >= 5, '5.1 那一筆至少有 5 條說明（' + (v51 ? v51.items.length : 0) + '）');
ok(SRC.indexOf('id="verTxt">' + B.VERSION + '<') > 0, '首頁版本標籤同步');
['../sw.js', '../../public/sw.js'].forEach(function (rel) {
  const p2 = path.join(__dirname, rel);
  if (!fs.existsSync(p2)) { ok(false, rel + ' 不存在'); return; }
  const t = fs.readFileSync(p2, 'utf8');
  const m = /var SW_VERSION = '([^']+)'/.exec(t);
  ok(!!m && ('v' + B.VERSION + '.').indexOf(m[1].slice(0, m[1].lastIndexOf('.'))) === 0,
    rel + ' 的快取版號跟著 VERSION（' + (m && m[1]) + '）');
});

console.log('\n' + (fail === 0 ? '✅' : '❌') + ' v5.0b：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
