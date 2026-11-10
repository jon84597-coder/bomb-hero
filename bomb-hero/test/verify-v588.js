/* ================================================================
   v5.87 驗收：金幣消耗端（回收池）
   ---------------------------------------------------------------
   ① 磚幣每關封頂 60 —— 收入不再由地圖大小決定
   ② 章節王關首通 +80 —— 推王有明確期待，重刷不給
   ③ 深淵入場費 300 —— 唯一「可以重複付」的金幣出口
   ④ 外觀金幣收藏 —— 5 件、總價 44,000、兩段確認
   ⑤ 外觀跨裝置 —— 已擁有取聯集，舊版前端不會洗掉
   ⑥ 隨從等級進伺服器存檔 —— 換裝置不再退回 Lv.1
   ⑦ 六語字串
   ================================================================ */
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8');
const skinSrc = fs.readFileSync(path.join(ROOT, 'js/skins.js'), 'utf8');
const i18n = fs.readFileSync(path.join(ROOT, 'js/i18n-src.js'), 'utf8');
const CLOUD = require(path.join(ROOT, '..', 'cloud.js'));

let pass = 0, fail = 0;
function ok(c, m, x) {
  if (c) { pass++; console.log('  ✓ ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

const env = makeEnv();
const P = env.BH;
try { P.setDevBuild(false); } catch (e) {}
try { P.WeekMod.pin([]); } catch (e) {}

/* ─────────────────────────────────────────── ① 磚幣封頂 */
head('① 磚幣每關封頂 60');
{
  ok(P.BRICK_COIN_CAP === 60, '上限就是 60 幣', P.BRICK_COIN_CAP);

  const p = { score: 0, coin: 0, brickCoin: 0 };
  let got = 0;
  for (let i = 0; i < 40; i++) { const c = P.brickCoinOf(p, 2); P.addScore(p, 10, c); got += c; }
  ok(got === 60, '40 塊磚只給 60 幣（原本 80）', got);
  ok(p.score === 400, '★ 排行榜分數完全不受影響（仍 10 分／塊）', p.score);
  ok(p.coin === 60, '金幣就是封頂後的 60', p.coin);

  const q = { score: 0, coin: 0, brickCoin: 0 };
  let first30 = 0;
  for (let i = 0; i < 30; i++) first30 += P.brickCoinOf(q, 2);
  ok(first30 === 60, '前 30 塊就吃滿額度（每塊 2 幣）', first30);
  ok(P.brickCoinOf(q, 2) === 0, '第 31 塊起不再給幣');
  ok(P.brickCoinOf({}, 2) === 2, '沒有計數器的物件仍可安全呼叫');

  ok(/addScore\(p, 10, brickCoinOf\(p, 2\)\)/.test(src), '炸磚走封頂通道');
  ok((src.match(/p\.brickCoin = 0;/g) || []).length === 2, '兩處開關重置都會清磚幣計數',
    (src.match(/p\.brickCoin = 0;/g) || []).length);
}

/* ─────────────────────────────────────────── ② 王關首通 */
head('② 章節王關首通 +80');
{
  ok(P.isBossStage(5) === true && P.isBossStage(4) === false, '第 5 關是王關、第 4 關不是');
  ok(/if \(isBossStage\(cleared\) && cleared >= \(Solo\.unlocked \| 0\)\) base \+= 80;/.test(src),
    '首通才給（重刷時 unlocked 已超過 cleared）');

  function clear(stage, unlocked) {
    const e2 = makeEnv();
    const B = e2.BH, G = B.Game;
    try { B.setDevBuild(false); } catch (e) {}
    try { B.WeekMod.pin([]); } catch (e) {}
    B.settings.size = 'M'; B.settings.hazards = 'off'; B.settings.sd = 'off'; B.settings.ctrl = 'kb';
    try { B.Solo.unlocked = unlocked; } catch (e) {}
    B.startSolo(stage, false, false);
    G.state = 'play';
    G.hazards = [];
    G.enemies.length = 0;
    const me = G.players[0];
    me.coin = 0; me.score = 0;
    G.door = { x: 2, y: 2, open: true, revealed: true };
    me.x = 2 * G.T + G.T / 2; me.y = 2 * G.T + G.T / 2;
    const before = B.Shop.gold();
    B.updateSolo(1 / 60);
    return B.Shop.gold() - before;
  }

  const first = clear(5, 5);
  ok(first === 160, '★ 第 5 關首通：80（75＋第 2 章 +5）＋ 王 80 = 160（實得 ' + first + '）', first);
  const again = clear(5, 6);
  ok(again === 80, '重刷第 5 關只有 80 —— 不能刷王洗幣', again);
  const normal = clear(4, 4);
  ok(normal === 75, '普通關沒有王加成', normal);
}

/* ─────────────────────────────────────────── ③ 深淵入場費 */
head('③ 深淵入場費 300');
{
  ok(P.Abyss.entryFee && P.Abyss.entryFee() === 300, '入場費 300', P.Abyss.entryFee && P.Abyss.entryFee());

  const e3 = makeEnv();
  const B = e3.BH;
  try { B.setDevBuild(false); } catch (e) {}
  try { B.Shop.setState({ gold: 0, tickets: 0, pets: [] }); } catch (e) {}
  const r0 = B.Shop.spend(300);
  ok(r0 && r0.ok === false && r0.err === 'GOLD', '金幣 0 時拒絕', r0);
  ok(B.Shop.gold() === 0, '失敗不扣錢', B.Shop.gold());

  try { B.Shop.setState({ gold: 400, tickets: 0, pets: [] }); } catch (e) {}
  const r1 = B.Shop.spend(300);
  ok(r1 && r1.ok === true, '400 幣可以付 300', r1);
  ok(B.Shop.gold() === 100, '★ 實扣 300，剩 100', B.Shop.gold());

  const iSpend = src.indexOf('const r = Shop.spend(fee);');
  const iHide = src.indexOf('showAdvPick(false);', iSpend > 0 ? iSpend : 0);
  ok(iSpend > 0, '原始碼有扣款呼叫');
  ok(iSpend > 0 && iHide > iSpend, '★ 先扣款、後關選單（付不起不會懸空）');
  ok(/if \(!r \|\| !r\.ok\) \{[\s\S]{0,220}?return;/.test(src.slice(iSpend, iSpend + 600)),
    '付不起就中止，不進場');
  ok(/toast\(t\('abyss\.needGold'/.test(src), '有「還差多少」的提示');
}

/* ─────────────────────────────────────────── ④ 外觀金幣收藏 */
head('④ 外觀金幣收藏 5 件 / 總價 44,000');
{
  const golds = (skinSrc.match(/kind: 'gold', v: (\d+)/g) || []).map(function (s) {
    return parseInt(s.replace(/[^0-9]/g, ''), 10);
  });
  ok(golds.length === 5, '五件金幣外觀', golds.length);
  const total = golds.reduce(function (a, b) { return a + b; }, 0);
  ok(total === 44000, '★ 總價 44,000（≈ 功能內容的 13%，接在清空之後）', total);
  ok(Math.min.apply(null, golds) === 5000 && Math.max.apply(null, golds) === 15000,
    '價格階梯 5,000 ～ 15,000', golds.sort(function (a, b) { return a - b; }));

  ok(/case 'gold': return \{ cur: 0, need: 1, ok: false \};/.test(skinSrc),
    '★ 金幣項目「永遠不算達成」—— 否則 syncOwn 會白送');
  ok(/if \(it\.how\.kind === 'gold'\) \{ buy\(id\); return; \}/.test(skinSrc), '點金幣項目走購買流程');
  ok(/_buyAsk\.id !== id \|\| now - _buyAsk\.t > 4000/.test(skinSrc), '兩段式確認（4 秒內再點一次）');
  ok(/var r = \(S && S\.spend\) \? S\.spend\(price\) : null;/.test(skinSrc), '扣款只走 Shop.spend');
  ok(/ST\.eq\[it\.slot\] = id;        \/\/ 買了直接換上/.test(skinSrc), '買到就直接裝備');
  ok(/setState: function \(v\) \{/.test(skinSrc), '有雲端回寫接口');
  ok(/case 'gold': return T\('sk\.how\.gold'/.test(skinSrc), '價格顯示走 i18n');
  ok(/\.skitem\.buy\.ask\{/.test(skinSrc), '待確認有視覺回饋');
}

/* ─────────────────────────────────────────── ⑤ 外觀跨裝置 */
head('⑤ 外觀雲端存檔');
{
  const S = CLOUD.sanitizeSkins;
  ok(typeof S === 'function', '有 sanitizeSkins');

  const a = S({ own: { 'flame.plasma': 1, 'aura.void': 1, 'bomb.jade': 0 }, eq: { flame: 'flame.plasma' }, custom: { aura: '#AABBCC' } });
  ok(a && a.own['flame.plasma'] === 1 && a.own['aura.void'] === 1, '合法 id 保留');
  ok(!a.own['bomb.jade'], '0 不算擁有');
  ok(a.eq.flame === 'flame.plasma' && a.custom.aura === '#aabbcc', '裝備保留、色碼轉小寫', a.custom);

  const bad = S({ own: { '__proto__': 1, '<script>': 1, 'flame.x': 1, 'weapon.gun': 1, 'flame.plasma': 1 } });
  ok(bad && typeof bad.own === 'object', '惡意輸入不會炸');
  ok(!Object.prototype.hasOwnProperty.call(bad.own, '__proto__') && !bad.own['weapon.gun'], '★ 只認 flame/aura/bomb 三類');
  ok(!bad.own['flame.x'] && bad.own['flame.plasma'] === 1, '長度與字元都過濾');

  const big = {};
  for (let i = 0; i < 120; i++) {
    big['flame.' + String.fromCharCode(97 + (i % 26)) + String.fromCharCode(97 + Math.floor(i / 26))] = 1;
  }
  const bb = S({ own: big });
  ok(Object.keys(bb.own).length <= 48, '上限 48 筆', Object.keys(bb.own).length);

  ok(S(null) === null && S('x') === null, '沒有外觀資料時回 null（不是空物件）');

  const save = CLOUD.sanitizeSave({ stage: 3, gold: 10, skins: { own: { 'flame.aurora': 1 } } });
  ok(save.skins && save.skins.own['flame.aurora'] === 1, 'sanitizeSave 保留外觀');

  ok(/fresh\.skins == null && acc\.save && acc\.save\.skins/.test(src === null ? '' : require('fs').readFileSync(path.join(ROOT, '..', 'cloud.js'), 'utf8')),
    '★ 舊版前端送檔（沒 skins 欄位）不會洗掉已買的外觀');

  ok(/st\.skins = \(window\.__BHSkins/.test(src), 'snapshot 會帶上外觀');
  ok(/out\.skins = \{ own: own, eq:/.test(src), 'merge 產生外觀聯集');
  ok(/window\.__BHSkins\.setState\(st\.skins\)/.test(src), 'apply 會回寫外觀');
  ok(/\[SR, SL\]\.forEach/.test(src) && /for \(const id in k\.own\) if \(k\.own\[id\]\) own\[id\] = 1;/.test(src),
    '已擁有取聯集（買過就永久）');
}

/* ─────────────────────────────────────────── ⑥ 隨從等級 */
head('⑥ 隨從等級進伺服器存檔');
{
  const sv = CLOUD.sanitizeSave({ stage: 1, gold: 0, pets: [{ kind: 'blade', ch: 2, lv: 5 }] });
  ok(sv.pets.length === 1 && sv.pets[0].lv === 5, '★ 伺服器不再吃掉 lv（原本只存 kind/ch）', sv.pets[0]);
  const sv2 = CLOUD.sanitizeSave({ pets: [{ kind: 'blade', ch: 0, lv: 99 }] });
  ok(sv2.pets[0].lv === 5, 'lv 夾在 1~5', sv2.pets[0].lv);
  const sv3 = CLOUD.sanitizeSave({ pets: [{ kind: 'guard', ch: 0 }] });
  ok(sv3.pets[0].lv === 1, '舊存檔沒有 lv → 當 Lv.1', sv3.pets[0].lv);
}

/* ─────────────────────────────────────────── ⑦ 字串 */
head('⑦ 六語字串');
{
  ['sk.how.gold|', 'sk.askBuy|', 'sk.noGold|', 'sk.bought|', 'abyss.needGold|'].forEach(function (k) {
    const line = i18n.split('\n').filter(function (l) { return l.indexOf(k) === 0; })[0] || '';
    ok(line.split('|').length === 6, k.replace('|', '') + ' 有六個語言欄位', line.split('|').length);
  });
}

console.log('\n========================================');
console.log('v5.87 金幣消耗端：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail === 0 ? 0 : 1);
