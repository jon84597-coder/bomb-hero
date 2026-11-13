// test/verify-v585.js —— v5.84：主角群特效 ＋ 音效全面升級
//   ① 音效：30 支主角專屬音（12 基本動作／4 主動技／3 連招／8 角色技／3 核心重製）
//   ② 不再借用：15 個技能以前全部借用 item/place/explode/heal/coin，現在各一支
//   ③ 特效：heroImpact 五層（白金核心／主題環／二段餘韻／速度線／碎片）
//   ④ 起手：heroRune 往內收的蓄力法陣；heroGhost 人形殘影
//   ⑤ 打擊感：hitStop ＋ 分層震屏 shakeLv ＋ 鏡頭微推 camKick（跟隨暈動症開關）
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

const env = makeEnv();
const P = env.BH;
const G = P.Game;
G.state = 'play';
G.T = 40;
G.gameT = 1;
G.rings = []; G.bits = []; G.particles = []; G.ghosts = []; G.pops = [];
G.stopT = 0; G.shake = 0; G.flash = 0; G.camKickX = 0; G.camKickY = 0;
G.enemies = []; G.players = []; G.bombs = [];

/* ================================================================ */
head('1. 主角 30 支專屬音效');
{
  const keys = P.sfxKeys();
  const HERO = ['place', 'kick', 'punch', 'dash', 'hop', 'land', 'slam', 'hurt', 'die', 'item',
    'coin', 'levelup', 'win',
    'sk_det', 'sk_shield', 'sk_frost', 'sk_quake',
    'cb_freeze', 'cb_shield', 'cb_wave',
    'ch_gale', 'ch_roll', 'ch_fuse', 'ch_enchant', 'ch_loot', 'ch_bulwark', 'ch_refill', 'ch_stardust',
    'explode', 'pick'];
  const miss = HERO.filter(k => keys.indexOf(k) < 0);
  ok(miss.length === 0, '★ 30 支主角音效全部在表裡', miss);
  /* v5.98：新增 mount()／mount2() 兩支坐騎獎勵音 → 84 變成 86。
   這裡改成「不低於 84」＋「必需的那幾支都在」，才不會每次加音效就變紅。 */
ok(keys.length >= 86, '音效表至少 86 支（v5.98 加入坐騎 mount／mount2）', keys.length);
ok(keys.indexOf('mount') >= 0 && keys.indexOf('mount2') >= 0, '坐騎獎勵音 mount／mount2 都在表內');
  ok(keys.indexOf('levelup') >= 0, '★ levelup 終於有聲音了（以前 switch 沒有這個 case → 靜音）', true);

  // 每一支都要有「厚度」：至少 3 個合成層（tone/boom/hiss/sub/stack/fm/grit/metal/whoosh/crack/swell）
  const layerRe = /\b(tone|boom|hiss|sub|stack|fm|grit|metal|whoosh|crack|swell)\s*\(/g;
  const body = mainJs.slice(mainJs.indexOf('const HERO_SFX = {'),
                            mainJs.indexOf('const SFX_MAP = {};'));
  const blocks = body.split(/\n    ([a-zA-Z_]+)\(\)\s*\{/).slice(1);
  let thin = [];
  for (let i = 0; i < blocks.length; i += 2) {
    const name = blocks[i], code = blocks[i + 1] || '';
    const n = (code.match(layerRe) || []).length;
    if (n < 3) thin.push(name + ':' + n);
  }
  ok(thin.length === 0, '★ 每一支至少 3 層合成（不是一顆 tone 就打發）', thin);
  ok(/function whoosh\(/.test(mainJs) && /function crack\(/.test(mainJs) && /function swell\(/.test(mainJs),
    '新增 3 個合成原語（whoosh 氣流／crack 脆裂／swell 上漲）');
}

/* ================================================================ */
head('2. 15 個技能不再借用別人的音效');
{
  const borrow = [];
  const need = {
    ch_gale: /sfx\('ch_gale'\)/, ch_roll: /sfx\('ch_roll'\)/, ch_fuse: /sfx\('ch_fuse'\)/,
    ch_enchant: /sfx\('ch_enchant'\)/, ch_loot: /sfx\('ch_loot'\)/, ch_bulwark: /sfx\('ch_bulwark'\)/,
    ch_refill: /sfx\('ch_refill'\)/, ch_stardust: /sfx\('ch_stardust'\)/,
    sk_det: /sfx\('sk_det'\)/, sk_shield: /sfx\('sk_shield'\)/,
    sk_frost: /sfx\('sk_frost'\)/, sk_quake: /sfx\('sk_quake'\)/,
    cb_freeze: /sfx\('cb_freeze'\)/, cb_shield: /sfx\('cb_shield'\)/, cb_wave: /sfx\('cb_wave'\)/
  };
  Object.keys(need).forEach(k => { if (!need[k].test(mainJs)) borrow.push(k); });
  ok(borrow.length === 0, '★ 15 個技能各自播放自己的音效', borrow);

  // charCast 區塊內不該再有 sfx('item') / sfx('place') / sfx('heal') / sfx('explode') / sfx('coin')
  const c0 = mainJs.indexOf('function charCast() {');
  const c1 = mainJs.indexOf('function lv(id) {', c0);
  const charBlock = mainJs.slice(c0, c1);
  const stolen = (charBlock.match(/sfx\('(item|place|heal|explode|coin|hurt)'\)/g) || []);
  ok(stolen.length === 0, '★ 8 個角色技裡沒有殘留「借來的」音效', stolen);

  const c2 = mainJs.indexOf('function castById(id) {');
  const c3 = mainJs.indexOf('function cast(i) {', c2);
  const castBlock = mainJs.slice(c2, c3);
  const stolen2 = (castBlock.match(/sfx\('(item|place|heal|explode|coin)'\)/g) || []);
  ok(stolen2.length === 0, '★ 4 個主動技裡也沒有借用', stolen2);

  // 連招：三段音效必須互不相同（以前三段都是 explode）
  const k0 = mainJs.indexOf('function comboTry(p, id) {');
  const k1 = mainJs.indexOf('function charIdx() {', k0);
  const comboBlock = mainJs.slice(k0, k1);
  ok(/sfx\('cb_freeze'\)/.test(comboBlock) && /sfx\('cb_shield'\)/.test(comboBlock) && /sfx\('cb_wave'\)/.test(comboBlock),
    '★ 三個連招三支不同音效');
  ok((comboBlock.match(/sfx\('explode'\)/g) || []).length === 0, '連招裡不再有共用的 explode');
}

/* ================================================================ */
head('3. 五層主角特效');
{
  ok(typeof P.heroImpact === 'function', '有統一入口 heroImpact()');
  ok(typeof P.heroRune === 'function', '有蓄力法陣 heroRune()');
  ok(typeof P.heroGhost === 'function', '有殘影 heroGhost()');
  ok(typeof P.shakeLv === 'function', '有分層震屏 shakeLv()');
  ok(typeof P.camKick === 'function', '有鏡頭微推 camKick()');

  const f0 = mainJs.indexOf('function heroImpact(');
  const f1 = mainJs.indexOf('function heroRune(', f0);
  const body = mainJs.slice(f0, f1);
  ok(/kind: 'core'/.test(body), '① 白金撞擊核心');
  ok(/kind: 'ring'/.test(body) && /glow: true/.test(body), '② 主題色衝擊環（加亮）');
  ok(/born: gt \+ \.06/.test(body), '③ 二段餘韻（60ms 後再彈一圈）');
  ok(/speedLines\(/.test(body), '④ 方向性速度線');
  ok(/bitsAdd\(/.test(body), '⑤ 主題碎片');
  ok(/hitStop\(/.test(body) && /shakeLv\(/.test(body) && /camKick\(/.test(body),
    '命中回饋三件套（定格＋震屏＋推鏡）都接上了');

  // 碎片與環的新畫法
  ok(/b\.type === 'line'/.test(mainJs), 'drawBits 會畫速度線（line）');
  ok(/b\.type === 'star'/.test(mainJs), 'drawBits 會畫四芒星（star）');
  ok(/rg\.kind === 'gather'/.test(mainJs), 'drawRings 會畫往內收的蓄力環（gather）');

  // 主題表
  ok(Object.keys(P.CH_THEME || {}).length === 8, '8 個角色各有視覺主題', Object.keys(P.CH_THEME || {}));
  ok(Object.keys(P.SK_THEME || {}).length === 4, '4 個主動技各有主題', Object.keys(P.SK_THEME || {}));
  const cols = Object.keys(P.CH_THEME).map(k => P.CH_THEME[k].col);
  ok(new Set(cols).size === 8, '★ 8 個角色的主題色互不相同', cols);
}

/* ================================================================ */
head('4. 實測：一次命中會產生什麼');
{
  G.rings = []; G.bits = []; G.particles = []; G.stopT = 0; G.shake = 0;
  P.heroImpact(200, 200, { power: 1.5, col: '#7fe3ff', bit: 'circ', dir: 0 });
  ok(G.rings.length === 3, '★ 一次命中放 3 個環（核心＋衝擊＋餘韻）', G.rings.length);
  ok(G.rings[0].kind === 'core', '第一個是撞擊核心');
  ok(G.rings[1].kind === 'ring', '第二個是衝擊環');
  ok(G.rings[2].born > G.rings[0].born, '★ 第三個環是「預約」的（born 在未來）→ 有回音感', G.rings[2].born - G.rings[0].born);
  ok(G.particles.length > 0, '有粒子', G.particles.length);
  ok(G.bits.length > 0, '有碎片／速度線', G.bits.length);
  ok(G.bits.some(b => b.type === 'line'), '★ 有給方向的速度線', G.bits.filter(b => b.type === 'line').length);
  ok(G.stopT > 0, '★ 命中定格有生效', G.stopT);
  ok(G.shake > 0, '★ 分層震屏有生效', G.shake);

  // 小招不該給到三級震屏
  G.shake = 0;
  P.heroImpact(200, 200, { power: .6, col: '#fff', bit: 'sq' });
  ok(G.shake <= .20, '小招（power .6）只給最小級震屏', G.shake);
  // 大招給到三級
  G.shake = 0;
  P.heroImpact(200, 200, { power: 2.2, col: '#fff', bit: 'tri' });
  ok(G.shake >= .50, '連招（power 2.2）給三級震屏', G.shake);
  ok(G.flash > 0, '連招另外給螢幕白閃', G.flash);
}

/* ================================================================ */
head('5. 實測：蓄力法陣與殘影');
{
  G.rings = [];
  P.heroRune(300, 300, '#ffd166');
  ok(G.rings.length === 2, '法陣是雙圈', G.rings.length);
  ok(G.rings.every(r => r.kind === 'gather'), '★ 兩圈都是「往內收」的 gather（不是往外炸）', G.rings.map(r => r.kind));

  G.ghosts = [];
  P.heroGhost({ x: 100, y: 100 }, '#9fe8ff', 3);
  ok(G.ghosts.length > 0, '殘影有生出來', G.ghosts.length);
  ok(G.ghosts[0].col === '#9fe8ff', '殘影吃主題色');
  // 上限保護
  for (let i = 0; i < 60; i++) P.heroGhost({ x: 100, y: 100 }, '#fff', 2);
  ok(G.ghosts.length <= 26, '殘影有上限（不會無限堆）', G.ghosts.length);
}

/* ================================================================ */
head('6. 打擊感：定格／震屏／推鏡');
{
  ok(/function hitStop\(sec\)/.test(mainJs), 'hitStop 還在（沿用 v5.21）');
  ok(/Game\.stopT = Math\.min\(\.10/.test(mainJs), '定格有 0.10 秒上限（連續命中不會卡死）');
  ok(/const amp = lv >= 3 \? \.58 : lv === 2 \? \.34 : \.17;/.test(mainJs),
    '★ 震屏分三級（.17／.34／.58）');
  ok(/if \(!settings\.shake\) return;/.test(mainJs),
    '★ 鏡頭微推跟隨「畫面震動」開關（暈動症友善：關掉就完全不推）');
  ok(/Game\.camKickX = clamp\(\(Game\.camKickX \|\| 0\) - ax \* amt, -9, 9\)/.test(mainJs),
    '推鏡幅度夾在 9px 內（不會把畫面推走）');
  ok(/ctx\.translate\(Math\.round\(Game\.camX\) \+ Math\.round\(Game\.camKickX \|\| 0\)/.test(mainJs),
    '★ 推鏡真的接進世界層 translate');
  ok(/Game\.camKickX = \(Game\.camKickX \|\| 0\) \* \(1 - dk\)/.test(mainJs), '推鏡會回彈');
}

/* ================================================================ */
head('7. 27 個動作都接上了');
{
  const SITES = [
    ['放炸彈', /Game\.bombs\.push\(b\);\s*\n\s*AudioSys\.sfx\('place'\);/],
    ['踢彈', /sfx\('kick'\);\s*\n\s*\/\/ v5\.84：踢彈/],
    ['衝刺', /heroGhost\(p, p\.dashColor \|\| '#9fe8ff', 1\)/],
    ['跳躍', /sfx\('hop'\);\s*\n\s*try \{ Gift\.add\('jump'/],
    ['落地', /kind: 'dust', x: d\.x/],
    ['受傷', /col: dh \? '#ff4d5e' : '#5fb6ff'/],
    ['倒下', /heroGhost\(p, p\.ch\.color, 2\)/],
    ['撿道具', /bit: type === 'skull' \? 'sq' : 'star'/],
    ['升級', /heroRune\(_px, _py, '#ffd166', \.70\)/],
    ['打飛炸彈', /const _ang2 = Math\.atan2\(land\.y - by, land\.x - bx\)/]
  ];
  const missing = SITES.filter(([, re]) => !re.test(mainJs)).map(x => x[0]);
  ok(missing.length === 0, '★ 基本動作全部有掛特效', missing);

  // 三處玩家死亡都要有
  const dieSites = (mainJs.match(/heroGhost\(p, p\.ch\.color, 2\)/g) || []).length;
  ok(dieSites === 3, '三種死亡路徑（一般／對戰／冒險）都接上', dieSites);
}

/* ================================================================ */
head('8. 主角與怪物同級（不是只換皮）');
{
  // 怪物：spellImpact 四層；主角：heroImpact 五層
  const sf0 = mainJs.indexOf('function spellImpact(');
  const sf1 = mainJs.indexOf('function bitsTick(', sf0);
  const foeBody = mainJs.slice(sf0, sf1);
  ok(/kind: 'core'/.test(foeBody) && /kind: 'ring'/.test(foeBody), '怪物有核心＋衝擊環');
  ok(/bitsAdd\(/.test(foeBody), '怪物有碎片');

  const hf0 = mainJs.indexOf('function heroImpact(');
  const hf1 = mainJs.indexOf('function heroRune(', hf0);
  const heroBody = mainJs.slice(hf0, hf1);
  ok(heroBody.length > foeBody.length * .8,
    '★ 主角的命中函式份量不輸怪物（不是三行打發）', [heroBody.length, foeBody.length]);
  ok(/speedLines\(/.test(heroBody) && !/speedLines\(/.test(foeBody),
    '★ 主角獨有：方向性速度線（怪物是圓形爆，主角是「打出去」）');
  ok(/born: gt \+ \.06/.test(heroBody) && !/born: gt \+ \.06/.test(foeBody),
    '★ 主角獨有：二段餘韻');

  // 主角核心色是白金（不是純白）
  ok(/kind: 'core'/.test(heroBody), '主角撞擊核心沿用 v5.21 的白金核心（白心＋放射線）');
}

/* ================================================================ */
console.log('\n=== v5.84 主角群特效＋音效：' + pass + ' 通過 / ' + fail + ' 失敗 ===');
process.exit(fail ? 1 : 0);
