// test/verify-v601.js —— v5.99.2：三隻隨從的影片動作圖集（狼／猴／犀牛 × 五動作）
//   ① 15 支圖集全部存在、合法 WEBP、寬度 = 格子 × 12
//   ② meta 與 main.js 的 PetAnim.SHEET 一字不差（cellW／cellH／ax／ay）
//   ③ 五個動作名稱齊全（idle／move／attack／hurt／victory），而且沒有主角那套 walk／hold
//   ④ PetAnim.pick() 的優先序：指定 ＞ 歡呼 ＞ 被打 ＞ 攻擊 ＞ 移動 ＞ 待機
//   ⑤ drawPet 真的先走 PetAnim，而且保留了兩層後備（四幀美術 → 零件骨架）
//   ⑥ 尺寸量綱：charHpx 132、三隻共用同一個縮放基準（與主角同一條管線）
//   ⑦ 素材預算：十五支隨從圖集合計 ≤ 1.5 MB
//   ⑧ 主角的情緒圖示＋特效還在（v5.90 換精靈後漏呼叫，v6.0 補回）
//   ⑨ 版本 ≥ 5.99（版號家族不跳大版：十幾支舊測試硬性要求 major=5）
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

const ROOT = path.join(__dirname, '..');
const SPR = path.join(ROOT, 'spr');
const mainSrc = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');
const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const idxSrc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
function ok(c, m, x) {
  if (c) { pass++; }
  else { fail++; console.log('  ✗ FAIL: ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
}
function sec(t) { console.log('\n' + t); }

const PETS = ['blade', 'bomber', 'guard'];
const ACTS = ['idle', 'move', 'attack', 'hurt', 'victory'];
const metaOf = function (k) {
  return JSON.parse(fs.readFileSync(path.join(SPR, 'pet-anim-' + k + '.json'), 'utf8'));
};

/* ---------------------------------------------------------------- ① */
sec('① 十五支隨從圖集');
let n = 0;
PETS.forEach(function (k) {
  ACTS.forEach(function (a) {
    const f = path.join(SPR, 'pet-anim-' + k + '-' + a + '.webp');
    if (!fs.existsSync(f)) { ok(false, k + ' 缺 ' + a); return; }
    n++;
    const buf = fs.readFileSync(f);
    ok(buf.slice(8, 12).toString() === 'WEBP', k + '-' + a + ' 是合法 WEBP');
    const meta = metaOf(k);
    const vp8x = buf.indexOf('VP8X');
    if (vp8x >= 0) {
      const w = 1 + (buf[vp8x + 12] | (buf[vp8x + 13] << 8) | (buf[vp8x + 14] << 16));
      ok(w === meta.cellW * 12, k + '-' + a + ' 寬度 = 格子 × 12（' + w + '）', [w, meta.cellW * 12]);
    }
    ok(meta.actions[a] && meta.actions[a].frames === 12, k + '-' + a + ' 是 12 格');
  });
});
ok(n === 15, '三隻 × 五動作 = 15 支都檢查過', n);

/* ---------------------------------------------------------------- ② */
sec('② meta 與 SHEET 一致');
PETS.forEach(function (k) {
  const meta = metaOf(k);
  const re = new RegExp(k + ':\\s*\\{ pre: \'' + k + '\',\\s*cellW: (\\d+),\\s*cellH: (\\d+),' +
    '\\s*ax: ([\\d.]+),\\s*ay: ([\\d.]+)(?:, br: [\\d.]+)? \\}');
  const m = mainSrc.match(re);
  if (!m) { ok(false, k + ' 的 SHEET 條目解析不到（佔位值還沒填？）'); return; }
  ok(+m[1] === meta.cellW, k + '：SHEET cellW = meta（' + m[1] + '）');
  ok(+m[2] === meta.cellH, k + '：SHEET cellH = meta（' + m[2] + '）');
  ok(Math.abs(+m[3] - meta.ax) < 0.05, k + '：SHEET ax = meta（' + m[3] + '）');
  ok(Math.abs(+m[4] - meta.ay) < 0.05, k + '：SHEET ay = meta（' + m[4] + '）');
  /* 緊裁（不對稱）：錨點是「對齊中心在格子裡的位置」，必須落在格子內且離邊緣有餘量，
     否則翻面（side<0）時角色會左右跳。 */
  ok(meta.ax > 6 && meta.ax < meta.cellW - 6, k + '：ax 落在格子內（' + meta.ax + ' / ' + meta.cellW + '）');
  ok(meta.ay < meta.cellH, k + '：腳底在格子內（ay ' + meta.ay + ' < cellH ' + meta.cellH + '）');
});
ok(mainSrc.indexOf('__CW1__') < 0 && mainSrc.indexOf('__AY3__') < 0, '沒有殘留佔位值');

/* ---------------------------------------------------------------- ③ */
sec('③ 五個動作名稱');
/* 主角那一支 HeroAnim 也有 ACTS／FPS／LOOP，所以要先切出 PetAnim 這一段再抓，
   否則量到的是主角的表（會出現 walk／hold、沒有 move／attack）。 */
const petSrc = mainSrc.slice(mainSrc.indexOf('const PetAnim = (function'));
ok(petSrc.length > 0, 'PetAnim 模組找得到');
const actsBlk = (petSrc.match(/const ACTS = \[([^\]]*)\];/) || [])[1] || '';
ok(actsBlk.length > 0, 'PetAnim.ACTS 找得到');
ACTS.forEach(function (a) { ok(actsBlk.indexOf("'" + a + "'") >= 0, 'ACTS 有 ' + a); });
['walk', 'hold', 'throw'].forEach(function (a) {
  ok(actsBlk.indexOf("'" + a + "'") < 0, 'ACTS 沒有主角專用的 ' + a);
});
const fpsBlk = (petSrc.match(/const FPS  = \{([^}]*)\}/) || [])[1] || '';
const loopBlk = (petSrc.match(/const LOOP = \{([^}]*)\}/) || [])[1] || '';
ACTS.forEach(function (a) {
  ok(new RegExp('\\b' + a + ':').test(fpsBlk), 'FPS 有 ' + a);
  ok(new RegExp('\\b' + a + ':').test(loopBlk), 'LOOP 有 ' + a);
});
ok(/idle: 1, move: 1, attack: 0, hurt: 0, victory: 0/.test(loopBlk.replace(/\s+/g, ' ').trim()) ||
   (/idle: 1/.test(loopBlk) && /attack: 0/.test(loopBlk) && /victory: 0/.test(loopBlk)),
  '待機／移動循環，攻擊／被打／勝利一次性');
/* 攻擊要夠慢才播得完：0.55 秒 × 22fps ≥ 12 格 */
const afps = +(fpsBlk.match(/attack:\s*(\d+)/) || [])[1];
ok(afps >= 20 && afps * 0.55 >= 11, '攻擊 22fps × 0.55 秒播得完 12 格（' + afps + '）');

/* ---------------------------------------------------------------- ④ */
sec('④ pick() 優先序');
const env = makeEnv();
const PA = env.BH.PetAnim;
ok(!!PA, 'PetAnim 存在');
PETS.forEach(function (k) { ok(PA.has(k) === true, 'PetAnim.has(' + k + ') 為真'); });
ok(PA.has('rabbit') === false, '主角的圖集不會被隨從拿去用');
ok(PA.pick({}) === 'idle', '什麼都沒有 → idle');
ok(PA.pick({ moving: true }) === 'move', 'moving → move');
ok(PA.pick({ atk: true }) === 'attack', 'atk → attack');
ok(PA.pick({ atk: true, hurt: true }) === 'hurt', '被打優先於攻擊');
ok(PA.pick({ atk: true, hurt: true, cheer: true }) === 'victory', '歡呼優先於被打');
ok(PA.pick({ cheer: true, act: 'idle' }) === 'idle', '明確指定勝過一切');
ok(PA.pick({ act: 'walk' }) === 'idle', '不認得的動作退回 idle');

/* ---------------------------------------------------------------- ⑤ */
sec('⑤ drawPet 的接入與後備');
ok(mainSrc.indexOf('PetAnim.draw(ctx, pt.kind') >= 0, 'drawPet 會叫 PetAnim.draw');
ok(/const drewAnim = \(typeof PetAnim[\s\S]{0,260}PetAnim\.draw\(ctx, pt\.kind/.test(mainSrc),
  'drewAnim 是 PetAnim 的回傳值');
ok(/const drewArt = drewAnim \|\| drawPetSprite\(/.test(mainSrc),
  '第二層後備：影片精靈失敗才退回四幀美術');
ok(/if \(!drewArt\)/.test(mainSrc), '第三層：四幀美術也沒有才走零件骨架');
ok(/pt\.atkAnimT/.test(mainSrc), 'atkAnimT 讓攻擊動作播完（slashT 只有 0.28 秒會切斷）');
ok(/pt\.cheerT/.test(mainSrc) && /function petCheer/.test(mainSrc), '通關會讓隨從歡呼');
/* v6.00：新的大招特效（pt.fxT）播放時也不再多畫舊的小弧 */
ok(/if \(pt\.slashT > 0 && !drewAnim/.test(mainSrc), '影片自帶刀光 → 不再多畫一道');
ok(/act: 'hurt', hurt: 1/.test(mainSrc), '倒地也播影片的被打動作');

/* ---------------------------------------------------------------- ⑥ */
sec('⑥ 尺寸量綱');
PETS.forEach(function (k) {
  const meta = metaOf(k);
  ok(meta.charHpx === 132, k + '：charHpx 132（隨從場上 48~58px，約 2.4 倍餘量）', meta.charHpx);
  ok(meta.cellW / meta.charHpx > 0.95 && meta.cellW / meta.charHpx < 1.55,
    k + '：格子寬 / 角色高合理（' + (meta.cellW / meta.charHpx).toFixed(2) + '）');
  ok(meta.cellH * 12 * meta.cellW * 4 < 3 * 1048576,
    k + '：五支全部解碼 < 3 MB', +(meta.cellH * 12 * meta.cellW * 4 / 1048576).toFixed(2));
});
/* 新動作與舊四幀美術要一樣大：charHpx 就是「腳底到頭頂」的可見身高 →
   k 只能寫 bodyH / charHpx。多除一次 bodyRatio 會讓新動作大 14%（實測過）。 */
ok(/const k = bodyH \/ META\.charHpx;/.test(mainSrc), 'PetAnim.draw 的縮放是 bodyH / charHpx（不除 bodyRatio）');
ok(!/bodyH \/ \(sh\.br/.test(mainSrc), '沒有多餘的 bodyRatio 換算');

/* 三隻共用同一個縮放基準：cellH / charHpx 的差別只來自裁切框高度，不能有「大小隻」 */
const ratio = PETS.map(function (k) { return metaOf(k).cellH / metaOf(k).charHpx; });
ok(Math.max.apply(null, ratio) - Math.min.apply(null, ratio) < 0.12,
  '三隻的裁切框比例接近（' + ratio.map(function (x) { return x.toFixed(2); }).join(' / ') + '）');

/* ---------------------------------------------------------------- ⑦ */
sec('⑦ 素材預算');
let petBytes = 0;
fs.readdirSync(SPR).filter(function (f) { return /^pet-anim-.*\.webp$/.test(f); })
  .forEach(function (f) { petBytes += fs.statSync(path.join(SPR, f)).size; });
const mb = function (x) { return +(x / 1048576).toFixed(2); };
console.log('   十五支隨從圖集合計 ' + mb(petBytes) + ' MB');
ok(mb(petBytes) < 1.5, '隨從圖集 ≤ 1.5 MB', mb(petBytes));
let anim = 0;
fs.readdirSync(SPR).filter(function (f) { return /^hero-anim-.*\.webp$/.test(f); })
  .forEach(function (f) { anim += fs.statSync(path.join(SPR, f)).size; });
ok(mb(anim + petBytes) < 7.0, '主角＋隨從動作圖集 ≤ 7.0 MB', mb(anim + petBytes));

/* ---------------------------------------------------------------- ⑧ */
sec('⑧ 主角的情緒圖示＋特效（v6.0 修回）');
/* v5.90 換成影片精靈時 drawRigChar 直接 return，把下面這段整段跳過 →
   玩家看到的是「開心／難哭的圖示都不見了」。這裡釘住「精靈分支內也要畫」。 */
const spriteBlk = (mainSrc.match(/typeof HeroAnim\.has === 'function' && HeroAnim\.has\(key\)[\s\S]{0,1400}?return r;/)
  || [''])[0];
ok(spriteBlk.length > 0, 'drawRigChar 的精靈分支找得到');
ok(spriteBlk.indexOf('heroMood(') >= 0, '精靈分支內有呼叫 heroMood');
ok(spriteBlk.indexOf('heroEmoteIcon(') >= 0, '精靈分支內有呼叫 heroEmoteIcon（頭頂泡泡）');
ok(spriteBlk.indexOf('heroMoodVfx(') >= 0, '精靈分支內有呼叫 heroMoodVfx（星星／眼淚）');
ok(/function heroEmoteIcon/.test(mainSrc) && /function heroMoodVfx/.test(mainSrc) &&
   /function heroMood\b/.test(mainSrc), '三個函式本體都還在');
/* 表情來源：expr（'cry'／'laugh'）→ mood。三個都要對得上。 */
const moodFn = (mainSrc.match(/function heroMood\([\s\S]{0,420}/) || [''])[0];
ok(/cry/.test(moodFn) && /laugh/.test(moodFn), 'heroMood 認得 cry 與 laugh');
ok(/happy/.test(moodFn), 'heroMood 會給 happy');

/* ---------------------------------------------------------------- ⑨ */
sec('⑨ 版本');
const vm = mainSrc.match(/const VERSION = '([\d.]+)'/);
ok(vm && parseFloat(vm[1]) >= 5.99, '主檔版本 ≥ 5.99（' + (vm && vm[1]) + '）');
const swv = swSrc.match(/var SW_VERSION = 'v([\d.]+)'/);
ok(swv && parseFloat(swv[1]) >= 5.99, 'SW 版本 ≥ v5.99（' + (swv && swv[1]) + '）');
const vt = idxSrc.match(/id="verTxt">([\d.]+)</);
ok(vt && parseFloat(vt[1]) >= 5.99, '首頁 verTxt ≥ 5.99（' + (vt && vt[1]) + '）');

console.log('\n' + (fail ? '❌' : '✅') + ' v5.99.2（隨從動作＋情緒圖示）：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
