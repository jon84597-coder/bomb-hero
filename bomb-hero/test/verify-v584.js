// test/verify-v584.js —— v5.83：招式起手圖示 ＋ 特效強化 ＋ 45 招專屬音效 ＋ 平衡
//   ① 起手：19 個會傷人的招式都有起手時間，起手時 castSkill 有值、castT>0、且「還沒出手」
//   ② 圖示：44 張專屬圖示蓋住 45 個招式欄位（dive 小怪／王共用）；困難模式只藏圖示
//   ③ 音效：45 招各一支專屬音 ＋ 11 個起手音 ＋ 5 個核心打擊音重製
//   ④ 特效：命中不再只是 burst()，而是「核心＋衝擊環＋元素碎片」
//   ⑤ 平衡：pulse 2 環 / chain 2 發 cd 4.6 / beam 7 格 / roller 10 格 0.11 秒
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const mainJs = read('js/main.js');

let pass = 0, fail = 0;
function ok(c, m, x) {
  if (c) { pass++; console.log('  ✓ ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

/* 小怪 21 招（含沒有圖示的 smart／split）與王 24 招 */
const FOE_SKILLS = ['split', 'charge', 'spit', 'blink', 'hazard', 'smart', 'pull', 'stun', 'roller',
  'gust', 'dive', 'bomber', 'curse', 'homing', 'swoop', 'summon', 'sapper', 'scavenger', 'pulse', 'beam', 'chain'];
const BOSS_SKILLS = ['woolWave', 'lambCall', 'graze', 'burrow', 'sandStorm', 'drag', 'iceFloor', 'snowball',
  'iceShell', 'lavaTide', 'firePillar', 'meteor', 'beatBlast', 'laserSweep', 'drone', 'lureOrbs',
  'tentacle', 'current', 'tornado', 'dive', 'gustBurst', 'curseCard', 'shadowClones', 'shadowRing'];

const P0 = makeEnv().BH;
const G0 = P0.Game;

/* ================================================================ */
head('1. 起手時間表（FOE_WINDUP）');
{
  const T = P0.FOE_WINDUP || {};
  ok(typeof T === 'object' && Object.keys(T).length === 19, 'FOE_WINDUP 有 19 個會傷人的招式', Object.keys(T));
  ok(T.pulse >= 1.25, '★ 震波起手 1.30 秒（原本最短 1.04 秒）', T.pulse);
  ok(T.beam >= 1.1 && T.chain >= 1.0 && T.blink >= 1.1, '十字／連鎖／鑽地起手都 ≥1 秒', [T.beam, T.chain, T.blink]);
  ok(!T.smart && !T.split, 'smart（躲炸彈）與 split（死亡才分裂）不算起手 —— 它們不是「出招」');
  ok(/function foeWindup\(e, sk, dt\)/.test(mainJs), '有統一閘門 foeWindup()');
  ok(/e\.castSkill = sk;\s*\n\s*e\.castT = w;\s*\n\s*e\.castMax = w;/.test(mainJs), '★ 起手時寫入 castSkill／castT／castMax');
  ok(/function foeChargeSfx\(e\)/.test(mainJs), '有起手音 foeChargeSfx()');
}

/* ================================================================ */
head('2. 圖示：44 張專屬圖示，蓋住 45 個招式欄位');
{
  const IC = P0.CAST_ICONS || {};
  const keys = Object.keys(IC);
  ok(keys.length === 44, 'CAST_ICONS 共 44 張（dive 小怪／王共用）', keys.length);
  const missFoe = FOE_SKILLS.filter(k => !IC[k]);
  ok(missFoe.length === 0, '★ 小怪 21 招全都有圖示', missFoe);
  const missBoss = BOSS_SKILLS.filter(k => !IC[k]);
  ok(missBoss.length === 0, '★ 王 24 招全都有圖示', missBoss);
  ok(keys.every(k => Array.isArray(IC[k]) && IC[k].length > 0), '每一張都是「路徑指令陣列」（不是空白佔位）');
  const ops = new Set();
  keys.forEach(k => IC[k].forEach(p => ops.add(p[0])));
  ok(ops.size >= 6, '圖示用了 ≥6 種繪圖指令（圓／線／折線／三角／弧／方框…）', Array.from(ops).join(''));
  ok(/function drawCastIcons\(T\)/.test(mainJs), '有繪製入口 drawCastIcons()');
  ok(/drawCastIcons\(T\);\s+.*招前頭頂圖示/.test(mainJs), '★ 圖示接進繪製流程（敵人之後、最上層）');
  ok(/底部蓄力條/.test(mainJs) && /const bw = h \* \.72, bh = Math\.max\(1\.6, size \* \.055\)/.test(mainJs),
    '★ 徽章底部有「蓄力條」（長滿＝要出手了）');
  ok(/lg\.addColorStop\(0, col\)/.test(mainJs), '牌面有由下往上的元素色蓄力光');
  ok(!/ctx\.translate\(12, 12\);\s+ctx\.translate\(-12, -12\);/.test(mainJs),
    '★ 圖示有置中（不是歪到右下角）');
  /* v5.83e：牌子「掛在哪裡」——王的第一版直接蓋在臉上 */
  ok(/const upH = e\.boss \? e\.r \* 4\.9 \* _bBS \* _bAK : enemyArtR\(e\) \* 1\.95/.test(mainJs),
    '★ 頭頂高度照「王實際身高 4.9r」算（不是憑感覺的 2.5r）');
  ok(/if \(by < vy0\) \{\s*\n\s*side = /.test(mainJs), '★ 上方放不下時改掛左右側');
  ok(/const ex = -side \* \(size \* \.5 \* pulse - 1\)/.test(mainJs), '掛側邊時小三角跟著轉向');
  ok(/if \(e\.castSkill && castIconOn\(\)\) continue;/.test(mainJs),
    '★ 有頭頂圖示就不再畫舊的集氣球（兩顆會搶位置）');
  ok(/const size = e\.boss \? T \* 1\.12 : T \* \.95;/.test(mainJs), '圖示尺寸：小怪 .95T／王 1.12T');
}

/* ================================================================ */
head('3. 困難模式：只藏頭頂圖示，地面警示圈照樣亮');
{
  const env = makeEnv(); const Q = env.BH, H = Q.Game;
  Q.WeekMod.pin([]);
  Q.settings.soloDiff = 'normal';
  ok(Q.castIconOn() === true, '普通難度會顯示圖示');
  Q.settings.soloDiff = 'easy';
  ok(Q.castIconOn() === true, '簡單難度會顯示圖示');
  Q.settings.soloDiff = 'hard';
  ok(Q.castIconOn() === false, '★ 困難難度不顯示頭頂圖示');
  ok(/if \(!castIconOn\(\)\) return;/.test(mainJs), '★ 只影響「畫圖示」這一步（不是把招式關掉）');
  ok(/castIconOn\(\)[\s\S]{0,220}settings\.soloDiff !== 'hard'/.test(mainJs), '判斷只看難度（不碰招式資料）');
  H.daily = { seed: 1, ms: 0 };
  ok(Q.castIconOn() === true, '每日挑戰固定顯示（難度固定，不該被玩家的設定影響）');
  H.daily = null;
}

/* ================================================================ */
head('4. 音效：45 招專屬 ＋ 11 起手音 ＋ 5 核心重製');
{
  const keys = P0.sfxKeys();
  ok(keys.length === 59, '音效表共 59 支（5 核心＋43 招式＋11 起手）', keys.length);
  const missSkill = FOE_SKILLS.filter(k => k !== 'smart' && keys.indexOf(k) < 0);
  ok(missSkill.length === 0, '★ 小怪 20 招（smart 除外）都有專屬音', missSkill);
  const missBoss = BOSS_SKILLS.filter(k => keys.indexOf(k) < 0);
  ok(missBoss.length === 0, '★ 王 24 招都有專屬音', missBoss);
  const charges = keys.filter(k => /^charge_/.test(k));
  ok(charges.length === 11, '起手音 11 支（10 屬性 ＋ 王專用）', charges.length);
  ['explode', 'hurt', 'die', 'pick', 'coin'].forEach(k => ok(keys.indexOf(k) >= 0, '核心打擊音重製：' + k));
  // 合成工具箱：不再是單一 tone()
  ok(/function hiss\(/.test(mainJs) && /function grit\(/.test(mainJs) && /function metal\(/.test(mainJs), '合成工具有噪音／失真／金屬三層');
  ok(/function stack\(/.test(mainJs) && /function fm\(/.test(mainJs), '有鋸齒堆疊與 FM（王招的厚度）');
  ok(/const SFX_MAP = \{\};/.test(mainJs), '新音效走 SFX_MAP（舊 switch 保留相容）');
  ok(/const S = SFX_MAP\[name\];\s*\n\s*if \(S\)/.test(mainJs), 'sfx() 先查新表');
  // 至少有一支招式音用了三層以上（起音＋body＋尾韻）
  const shard = (mainJs.match(/pulse\(\) \{[\s\S]*?\n    \},/) || [''])[0];
  ok((shard.match(/boom\(|sub\(|hiss\(|tone\(/g) || []).length >= 4, '★ 震波音是四層疊出來的（不是一個 tone）');
}

/* ================================================================ */
head('5. 特效：命中有四層，不再是單一 burst');
{
  const env = makeEnv(); const Q = env.BH, H = Q.Game;
  Q.WeekMod.pin([]);
  Q.startSolo(9, false, false);
  H.state = 'play';
  const T = H.T;
  H.bits = []; H.rings = [];
  Q.spellImpact(3.5 * T, 3.5 * T, 'fire', 1.2);
  ok(H.rings.length >= 2, '★ 命中會產生撞擊核心＋衝擊環', H.rings.length);
  ok(H.rings.some(r => r.kind === 'core'), '有白色撞擊核心');
  ok(H.rings.some(r => r.kind === 'ring' && r.color), '有元素色衝擊環');
  ok((H.bits || []).length > 0, '★ 有元素碎片（火→火星）', (H.bits || []).length);
  ok((H.particles || []).length > 0, '仍有粒子層');
  // 碎片會過期（不會無限長大）
  const n0 = H.bits.length;
  for (let i = 0; i < 60; i++) Q.bitsTick(1 / 60);
  ok(H.bits.length < n0, '碎片 1 秒後會自己消失', { before: n0, after: H.bits.length });
  // 上限保護
  H.bits = [];
  for (let i = 0; i < 400; i++) Q.spellImpact(2 * T, 2 * T, 'ice', .8);
  ok(H.bits.length <= 140, '碎片有硬上限 140（低階機不會被拖垮）', H.bits.length);
  ok(/function drawCastRunes\(T\)/.test(mainJs), '起手時地面有法陣（drawCastRunes）');
  ok(/if \(settings\.calm \? \.45 : 1\)/.test(mainJs) || /calm \? \.45 : 1/.test(mainJs), 'calm（減少動態）模式會減量');
}

/* ================================================================ */
head('6. 平衡：四招按建議調整');
{
  // pulse：2 環、最短 1.35 秒
  ok(/for \(let r = 1; r <= 2; r\+\+\)/.test(mainJs), '★ 震波 3 環 → 2 環');
  ok(/foeAoeAdd\(cx \+ ax, cy \+ ay, 1\.35 \+ \(r - 1\) \* \.26, kind\)/.test(mainJs), '★ 震波最短預告 1.35 秒');
  ok(/if \(e\.skill === 'pulse'\)[\s\S]{0,400}e\.skCd = 4\.6;/.test(mainJs), '震波冷卻 4.6 秒');
  // chain：2 發、cd 4.6
  ok(/for \(let i = 0; i < 2; i\+\+\) \{\s*\n\s*const ox = clamp\(tx \+ rand\(5\) - 2/.test(mainJs), '★ 連鎖落雷 3 發 → 2 發');
  ok(/foeAoeAdd\(ox, oy, \.95 \+ i \* \.30, kind\);\s*\n\s*\}\s*\n\s*e\.skCd = 4\.6;/.test(mainJs), '★ 連鎖落雷 cd 3.4 → 4.6 秒');
  // beam：3 格
  ok(/for \(let k = 1; k <= 3; k\+\+\) \{ foeAoeAdd\(cx \+ k, cy, 1\.05, kind\); foeAoeAdd\(cx - k, cy, 1\.05, kind\); \}/.test(mainJs), '★ 十字雷射每向 4 → 3 格（9 → 7 格）');
  // roller：10 格、0.11 秒
  ok(/step: \.11, cells: 0/.test(mainJs), '★ 滾石每格 0.085 → 0.11 秒');
  ok(/if \(r\.cells > 10\)/.test(mainJs), '★ 滾石 14 → 10 格');
  // 實測：真的只鋪 2 環
  const env = makeEnv(); const Q = env.BH, H = Q.Game;
  Q.WeekMod.pin([]);
  Q.startSolo(25, false, false);
  H.state = 'play';
  const TT = H.T;
  const me = H.players[0];
  me.x = 5.5 * TT; me.y = 5.5 * TT; me.alive = true;
  const e = Q.makeEnemy(6, 5, 'wisp', 1, 1);
  e.aggro = true; e.skCd = 0;
  H.enemies.length = 0; H.enemies.push(e);
  H.foeAoe = [];
  let sawCast = false, firedWhileCast = false;
  for (let i = 0; i < 200; i++) {
    Q.updateEnemy(e, 1 / 60);
    if (e.castSkill) sawCast = true;
    if (e.castSkill && (H.foeAoe || []).length) firedWhileCast = true;
  }
  ok(sawCast, '★ 震波怪出招前真的有起手（castSkill 有值）');
  ok(!firedWhileCast, '★ 起手期間不會偷偷鋪落點（圖示不是裝飾）');
  ok((H.foeAoe || []).length > 0, '起手結束後才鋪落點', (H.foeAoe || []).length);
  ok((H.foeAoe || []).length <= 24, '★ 落點總數 ≤24 格（舊版 48 格）', (H.foeAoe || []).length);
}

/* ================================================================ */
head('7. 王的起手與音效');
{
  ok(/e\.castSkill = sk;\s*\n\s*e\.castT = K\.wind;/.test(mainJs), '王出招前有 castSkill（圖示就靠它）');
  ok(/foeChargeSfx\(e\);\s+\/\/ v5\.83：王也有起手音/.test(mainJs), '★ 王有起手音');
  ok(/try \{ AudioSys\.sfx\(name\); \} catch \(err\) \{\}/.test(mainJs), '★ 王每一招用自己的名字當音效 id（24 招各一支）');
  const bossBody = (mainJs.match(/function bossFire\(e, name\) \{[\s\S]*?\n\}\n/) || [''])[0];
  ok(!/AudioSys\.sfx\('cast'\)/.test(bossBody), '王招式裡不再共用 cast 音');
  ok(/spellImpact\(e\.x, e\.y - e\.r \* \.25, bossKindOf\(e\), 1\.45\)/.test(bossBody), '★ 王出招有統一壓迫感特效層');
  ok(/const BOSS_FX = \{ 1: 'nature'/.test(mainJs), '王依章節決定特效屬性（8 章 8 色）');
}

/* ================================================================ */
head('8. 全招 coverage：每個 sk 都有音效或明確豁免');
{
  const keys = P0.sfxKeys();
  const src = mainJs;
  const used = new Set();
  const re = /foeWindup\(e, '([a-z]+)'/g;
  let m;
  while ((m = re.exec(src))) used.add(m[1]);
  ok(used.size >= 12, '逐招呼叫 foeWindup 的招式數', used.size);
  const noSfx = Array.from(used).filter(k => keys.indexOf(k) < 0);
  ok(noSfx.length === 0, '★ 每一支有起手的招式都有自己的音效', noSfx);
  ok(/foeWindup\(e, e\.skill, dt\)/.test(src), '多格落點四招（beam/pulse/chain/dive）共用同一個閘門');
}

console.log('\n=== v5.83 招式起手圖示＋特效＋音效：' + pass + ' 通過 / ' + fail + ' 失敗 ===');
process.exit(fail ? 1 : 0);
