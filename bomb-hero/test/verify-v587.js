// test/verify-v587.js —— v5.86：金幣經濟重構 ＋ 兩個線上問題
//   ① addScore：分數與金幣分流（p.score 不動、p.coin 才是錢）
//   ② 關卡內：磚 10/2、小怪 3~7、BOSS 30~45、擊殺 8/15/30/60
//   ③ 過關：65＋每 4 關 +5；前 3 關首通 +100；結算看 p.coin
//   ④ 外圍：分享／簽到／任務／週榜／BR／門票／改名／深淵 全部下修
//   ⑤ 商品：消耗品降到「一局一瓶」；隨從維持 8,000
//   ⑥ 存檔：Save.merge 不再吃掉隨從等級（Lv.5 上線後退回 1 的元兇）
//   ⑦ 音效：核彈爆炸帶爆點 → 吃六格半徑
const fs = require('fs');
const path = require('path');
const { makeEnv } = require('./_sandbox');

const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'js/main.js'), 'utf8');

let pass = 0, fail = 0;
function ok(c, m, x) {
  if (c) { pass++; console.log('  ✓ ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
  else { fail++; console.log('  ✗ FAIL: ' + m + (x === undefined ? '' : ' → ' + JSON.stringify(x))); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

const env = makeEnv();
const P = env.BH;
const G = P.Game;
try { P.setDevBuild(false); } catch (e) {}
try { P.WeekMod.pin([]); } catch (e) {}

/* ─────────────────────────────────────────── ① 分流 */
head('① addScore：分數歸排行榜、金幣歸商店');
{
  const p = { score: 0, coin: 0 };
  P.addScore(p, 10, 2);
  ok(p.score === 10 && p.coin === 2, '磚：score +10／coin +2（不再 1:1）', p);
  P.addScore(p, 500, 30);
  ok(p.score === 510 && p.coin === 32, '踢殺：score +500／coin +30', p);
  P.addScore(p, 1000, 60);
  ok(p.score === 1510 && p.coin === 92, '踩殺：score +1000／coin +60', p);
  const q = { score: 0 };
  P.addScore(q, 7, 7);
  ok(q.coin === 7, '沒有 coin 欄位也能安全累加');
  ok(/function addScore\(p, n, coin\)/.test(src), '原始碼有 addScore（單一分流入口）');
}

head('② 八個計分點都走 addScore');
{
  const spots = [
    [/addScore\(p, 10, 2\)/, '炸軟磚'],
    [/addScore\(q, 500, 30\)/, '踢炸彈擊殺'],
    [/addScore\(q, 1000, 60\)/, '坐騎踩殺'],
    [/addScore\(p, 200, 15\)/, '技能擊殺'],
    [/addScore\(p, 100, 8\)/, '範圍技擊殺'],
    [/addScore\(p2, 1000, 60\)/, '大招擊殺']
  ];
  spots.forEach(function (s) { ok(s[0].test(src), s[1] + ' → ' + s[0].source); });
  ok((src.match(/addScore\(p, 100, 8\)/g) || []).length === 2, '兩處 100 分擊殺都改了（不是改一漏一）');
  ok(!/p\.score \+= 10;/.test(src), '沒有殘留「炸磚直接加 score」');
  ok(/addScore\(p, n, n\)/.test(src), 'coinTo 掉幣 1:1（撿到多少就是多少）');
}

/* ─────────────────────────────────────────── ③ 產出 */
head('③ 關卡內產出量');
{
  const env2 = makeEnv();
  const B2 = env2.BH;
  const G2 = B2.Game;
  try { B2.setDevBuild(false); } catch (e) {}
  try { B2.WeekMod.pin([]); } catch (e) {}
  B2.startSolo(4, false, false);
  const me = G2.players[0];
  const coin0 = me.coin | 0;
  ok(coin0 === 0, '開局金幣歸零', coin0);

  // 掉幣量：連殺 200 隻，統計每次掉出來的 amount
  const seen = [];
  for (let i = 0; i < 200; i++) {
    G2.items.length = 0;
    B2.foeDrop({ x: me.x, y: me.y, r: 12, color: '#fff' });
    const c = G2.items.filter(function (it) { return it.type === 'coin'; })[0];
    if (c) seen.push(c.amount);
  }
  ok(seen.length > 60, '小怪確實會掉金幣（' + seen.length + '/200）');
  ok(seen.every(function (n) { return n >= 3 && n <= 7; }), '小怪掉幣 3~7（原本 5~14）',
    { min: Math.min.apply(null, seen), max: Math.max.apply(null, seen) });
  ok(/coin\(3 \+ rand\(5\)\)/.test(src), '原始碼：coin(3 + rand(5))');
  ok(/coin\(30 \+ rand\(15\)\)/.test(src), 'BOSS 掉幣 coin(30 + rand(15))（30~45）');
}

/* ─────────────────────────────────────────── ④ 過關結算 */
head('④ 過關獎勵與結算');
{
  const env3 = makeEnv();
  const B3 = env3.BH;
  const G3 = B3.Game;
  try { B3.setDevBuild(false); } catch (e) {}
  try { B3.WeekMod.pin([]); } catch (e) {}
  B3.settings.size = 'M'; B3.settings.hazards = 'off'; B3.settings.sd = 'off'; B3.settings.ctrl = 'kb';
  B3.startSolo(4, false, false);
  G3.state = 'play';
  G3.hazards = [];
  const me = G3.players[0];
  G3.enemies.length = 0;
  me.score = 999; me.coin = 120;          // 分數故意給很大 → 不可以影響金幣
  G3.door = { x: 2, y: 2, open: true, revealed: true };
  me.x = 2 * G3.T + G3.T / 2; me.y = 2 * G3.T + G3.T / 2;
  const before = B3.Shop.gold();
  B3.updateSolo(1 / 60);
  const gain = B3.Shop.gold() - before;
  const base = 65 + Math.floor((4 - 1) / 4) * 5;
  ok(gain === 120 + base, '第 4 關：本關金幣 120 ＋ 過關 65 = 185（實得 ' + gain + '）');
  ok(gain < 300, '★ 999 分的排行榜分數沒有被換成金幣（舊版會給 1,000+）', gain);
  ok(/const base = 65 \+ Math\.floor\(\(cleared - 1\) \/ 4\) \* 5;|let base = 65 \+ Math\.floor\(\(cleared - 1\) \/ 4\) \* 5;/.test(src),
    '過關公式 65＋每 4 關 +5');
}

head('⑤ 前 3 關首通 +100（起手保護）');
{
  const env4 = makeEnv();
  const B4 = env4.BH;
  const G4 = B4.Game;
  try { B4.setDevBuild(false); } catch (e) {}
  try { B4.WeekMod.pin([]); } catch (e) {}
  B4.settings.size = 'M'; B4.settings.hazards = 'off'; B4.settings.sd = 'off'; B4.settings.ctrl = 'kb';
  B4.startSolo(3, false, false);
  G4.state = 'play';
  G4.hazards = [];
  const me = G4.players[0];
  G4.enemies.length = 0;
  me.coin = 0;
  G4.door = { x: 2, y: 2, open: true, revealed: true };
  me.x = 2 * G4.T + G4.T / 2; me.y = 2 * G4.T + G4.T / 2;
  const before = B4.Shop.gold();
  B4.updateSolo(1 / 60);
  const gain = B4.Shop.gold() - before;
  ok(gain === 65 + 100, '第 3 關首通 = 65 ＋ 100 起手金 = 165（實得 ' + gain + '）');
}

head('⑥ 陣亡也把本關金幣帶走');
{
  const env5 = makeEnv();
  const B5 = env5.BH;
  const G5 = B5.Game;
  try { B5.setDevBuild(false); } catch (e) {}
  try { B5.WeekMod.pin([]); } catch (e) {}
  B5.startSolo(6, false, false);
  G5.state = 'play';
  G5.hazards = [];
  const me = G5.players[0];
  G5.enemies.length = 0;
  me.score = 5000; me.coin = 90;
  me.alive = false; me.dead = true; me.lives = 0; me.respawnT = 0;
  const b = B5.Shop.gold();
  B5.updateSolo(1 / 60);
  ok(B5.Shop.gold() - b === 90, '只發 p.coin 的 90（5,000 分不算錢）', B5.Shop.gold() - b);
}

/* ─────────────────────────────────────────── ⑦ 外圍 */
head('⑦ 外圍產出下修');
{
  ok(P.Share.reward === 150, '分享：1,000 → 150', P.Share.reward);
  ok(P.Gift.REWARDS.map(function (r) { return r.g; }).join(',') === '70,100,60,140,90,180,260',
    '簽到 7 天：1,640 → 900', P.Gift.REWARDS.map(function (r) { return r.g; }).join(','));
  const pool = P.Gift.POOL.map(function (m) { return m.g; });
  ok(Math.max.apply(null, pool) <= 125, '每日任務單項 ≤125（原本最高 220）', Math.max.apply(null, pool));
  ok(P.Rank.REWARD[0] === 400 && P.Rank.REWARD.length === 10, '週榜冠軍 1,000 → 400', P.Rank.REWARD[0]);
  ok(P.BR.GOLD[0] === 420 && P.BR.GOLD[7] === 75, 'BR 名次 1,200／80 → 420／75', P.BR.GOLD);
  ok(P.Shop.ticketPrice() === 900, 'BR 門票 2,000 → 900', P.Shop.ticketPrice());
  ok(P.NICK_PRICE === 3000, '改名 5,000 → 3,000', P.NICK_PRICE);
  ok(/let g = 20 \+ \(n > best \? 40 : 0\)/.test(src), '深淵每層 15 → 20（破紀錄 +40）');
  ok(/Math\.min\(300, Math\.max\(0, Game\.brLootGold \| 0\)\)/.test(src), 'BR 戰場撿幣封頂 300');
}

/* ─────────────────────────────────────────── ⑧ 商品 */
head('⑧ 商品定價：一局一瓶');
{
  const bag = {};
  P.RPG_BAG.forEach(function (it) { bag[it.id] = it.price; });
  ok(bag.hp1 === 180, '小藥水 250 → 180（≈0.9 局）', bag.hp1);
  ok(bag.hp2 === 420, '大藥水 600 → 420', bag.hp2);
  ok(bag.arm1 === 280, '護甲片 400 → 280', bag.arm1);
  ok(bag.fire1 === 350, '火力符 500 → 350', bag.fire1);
  ok(bag.rem1 === 480, '遙控器 700 → 480', bag.rem1);
  ok(bag.rev1 === 800, '復活幣 1,200 → 800（≈4 局）', bag.rev1);
  ok(bag.xray === 520 && bag.smoke === 400 && bag.warp === 600, '透視 520／煙霧 400／傳送 600');
  ok(P.PET_KINDS.every(function (k) { return k.price === 8000; }), '隨從維持 8,000（產出降 63% 已等於漲價）');
  ok(P.PET_KINDS.every(function (k) { return k.ups.join(',') === '4000,8000,16000,32000'; }), '隨從升級價目不變');
}

/* ─────────────────────────────────────────── ⑨ 存檔 */
head('⑨ 隨從等級不會被雲端合併吃掉');
{
  const env6 = makeEnv();
  const B6 = env6.BH;
  B6.Shop.reset();
  B6.Shop.addGold(200000);
  B6.Shop.buy('blade');
  B6.Shop.upgrade('blade');
  B6.Shop.upgrade('blade');
  ok(B6.Shop.lvOf('blade') === 3, '升到 Lv.3', B6.Shop.lvOf('blade'));

  const local = B6.Shop.state();
  ok(local.pets[0].lv === 3, 'state() 有帶 lv');

  // 舊版雲端快照（沒有 lv 欄位）→ 合併後不可以退回 1
  const legacy = { stage: 1, gold: 100, tickets: 0, pets: [{ kind: 'blade', ch: 0 }] };
  const merged = B6.Save.merge(legacy, local);
  ok(merged.pets[0].lv === 3, '★ 舊雲端快照沒有 lv → 保留本地 Lv.3（這就是「下次上線變回 1」的元兇）', merged.pets[0]);

  // 另一台裝置等級較高 → 取較高
  const remote5 = { stage: 1, gold: 100, tickets: 0, pets: [{ kind: 'blade', ch: 0, lv: 5 }] };
  ok(B6.Save.merge(remote5, local).pets[0].lv === 5, '兩邊都有 → 取較高的 Lv.5');
  // 反過來：本地較高，雲端較低
  const remote1 = { stage: 1, gold: 0, tickets: 0, pets: [{ kind: 'blade', ch: 0, lv: 1 }] };
  ok(B6.Save.merge(remote1, local).pets[0].lv === 3, '雲端 Lv.1、本地 Lv.3 → 不會被降級');

  // 套回 Shop 後仍然是 3（apply 不會洗掉）
  B6.Shop.setState({ gold: 999, tickets: 2, pets: merged.pets });
  ok(B6.Shop.lvOf('blade') === 3, 'setState 套用後仍是 Lv.3');
}

/* ─────────────────────────────────────────── ⑩ 音效 */
head('⑩ 核彈爆炸吃六格半徑');
{
  ok(/AudioSys\.sfx\('nukeBoom', px, py\)/.test(src), '核彈爆炸有帶爆點座標（px／py）');
  const globalBlock = src.match(/const SND_GLOBAL = \{[\s\S]*?\};/)[0];
  ok(globalBlock.indexOf('nukeBoom') < 0, 'nukeBoom 不在全場廣播白名單（會走距離判定）');
  ok(globalBlock.indexOf('nukeAlarm') >= 0, '但「核彈警報」仍在白名單（來襲要全場聽到）');
}

console.log('\n' + (fail === 0 ? '✅ ' : '❌ ') + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail === 0 ? 0 : 1);
