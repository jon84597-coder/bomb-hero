# -*- coding: utf-8 -*-
# v3.5-b：遊戲說明頁的資料（道具／坐騎／場景／怪物／操作／訣竅）＋ 小圖繪製 ＋ 按鈕與分頁接線
import io, sys

P = 'index.html'
s = io.open(P, encoding='utf-8').read()
orig = s

JS = r"""
/* ================================================================
   v3.5：遊戲說明（首頁「📖 遊戲說明」）
   6 個分頁：基本操作／道具總覽／坐騎招式／場景機關／怪物圖鑑／實戰訣竅
   道具、怪物、坐騎的小圖示直接用「遊戲自己的畫法」畫在小畫布上：
   暫時把全域 ctx 指向該畫布（畫完立刻換回來）→ 圖示跟遊戲裡長得一模一樣。
   ================================================================ */
const HELP_TABS = ['basic', 'item', 'ride', 'stage', 'foe', 'tip'];
const HELP_TAB_TXT = {
  basic: { tw: '🎮 基本操作', cn: '🎮 基本操作', en: '🎮 Controls' },
  item:  { tw: '🎁 道具總覽', cn: '🎁 道具总览', en: '🎁 Items' },
  ride:  { tw: '🦖 坐騎招式', cn: '🦖 坐骑招式', en: '🦖 Mounts' },
  stage: { tw: '🗺️ 場景機關', cn: '🗺️ 场景机关', en: '🗺️ Stages' },
  foe:   { tw: '👾 怪物圖鑑', cn: '👾 怪物图鉴', en: '👾 Monsters' },
  tip:   { tw: '💡 實戰訣竅', cn: '💡 实战诀窍', en: '💡 Tips' }
};

/* ---------- 道具：d=效果 u=用法 k=訣竅 ---------- */
const HELP_ITEMS = [
  { id: 'fire', en: 'Fire Up',
    d: { tw: '火焰範圍 <b>+1 格</b>（最多 10 格），爆炸時火舌打得更遠。', cn: '火焰范围 <b>+1 格</b>（最多 10 格），爆炸时火舌打得更远。', en: 'Flame range <b>+1 tile</b> (max 10) — your blast reaches further.' },
    u: { tw: '走上去自動撿起，立刻永久生效（陣亡才歸零）。', cn: '走上去自动捡起，立刻永久生效（阵亡才归零）。', en: 'Walk over it to pick it up — permanent until you die.' },
    k: { tw: '配「穿透彈」可以一次燒穿整排軟磚。', cn: '配「穿透弹」可以一次烧穿整排软砖。', en: 'Combine with Pierce to burn through a whole row of bricks.' } },
  { id: 'bomb', en: 'Bomb Up',
    d: { tw: '同時能放在場上的炸彈數 <b>+1</b>（最多 8 顆）。', cn: '同时能放在场上的炸弹数 <b>+1</b>（最多 8 颗）。', en: 'Bombs you can place at once <b>+1</b> (max 8).' },
    u: { tw: '走上去自動撿起。', cn: '走上去自动捡起。', en: 'Walk over it to pick it up.' },
    k: { tw: '彈量夠多才能一次開好幾條路、或把對手包圍。', cn: '弹量够多才能一次开好几条路、或把对手包围。', en: 'More bombs = more routes, or you can box opponents in.' } },
  { id: 'speed', en: 'Skates',
    d: { tw: '移動速度 <b>+1 級</b>（最多 6 級）。', cn: '移动速度 <b>+1 级</b>（最多 6 级）。', en: 'Move speed <b>+1 level</b> (max 6).' },
    u: { tw: '走上去自動撿起。', cn: '走上去自动捡起。', en: 'Walk over it to pick it up.' },
    k: { tw: '甩掉追擊型怪物（骷髏兵、疾風蜥）最好用。', cn: '甩掉追击型怪物（骷髅兵、疾风蜥）最好用。', en: 'Best tool to outrun chasers (Skeleton, Wind Lizard).' } },
  { id: 'kick', en: 'Kick',
    d: { tw: '走路撞到炸彈會把它<b>踢走</b>，一路滑到撞牆才停。', cn: '走路撞到炸弹会把它<b>踢走</b>，一路滑到撞墙才停。', en: 'Walking into a bomb <b>kicks</b> it away until it hits a wall.' },
    u: { tw: '撿起後自動生效：用身體去撞炸彈即可。', cn: '捡起后自动生效：用身体去撞炸弹即可。', en: 'Auto effect after pickup — just bump into a bomb.' },
    k: { tw: '把炸彈踢到對手腳下，或踢去炸遠處的軟磚。', cn: '把炸弹踢到对手脚下，或踢去炸远处的软砖。', en: 'Kick bombs under opponents or into far-away bricks.' } },
  { id: 'glove', en: 'Glove',
    d: { tw: '可以<b>撿起炸彈再丟出去</b>，丟出去時會<b>越過牆壁</b>。', cn: '可以<b>捡起炸弹再丢出去</b>，丢出去时会<b>越过墙壁</b>。', en: '<b>Pick up</b> a bomb and <b>throw</b> it — it flies over walls.' },
    u: { tw: '走到炸彈上按「動作鍵」撿起，再按一次丟出。', cn: '走到炸弹上按「动作键」捡起，再按一次丢出。', en: 'Stand on a bomb and press Action to grab, press again to throw.' },
    k: { tw: '隔牆偷襲；也能把快爆的炸彈丟到安全處。', cn: '隔墙偷袭；也能把快爆的炸弹丢到安全处。', en: 'Ambush over walls, or toss a ticking bomb to safety.' } },
  { id: 'punch', en: 'Punch',
    d: { tw: '撞到炸彈會把它<b>一路打到地圖另一端</b>。', cn: '撞到炸弹会把它<b>一路打到地图另一端</b>。', en: 'Bumping a bomb <b>punches</b> it all the way across the map.' },
    u: { tw: '撿起後自動生效：用身體撞炸彈。', cn: '捡起后自动生效：用身体撞炸弹。', en: 'Auto effect after pickup — bump into a bomb.' },
    k: { tw: '比踢彈更快，長直走廊最有效率。', cn: '比踢弹更快，长直走廊最有效率。', en: 'Faster than Kick; deadly in long straight corridors.' } },
  { id: 'remote', en: 'Remote',
    d: { tw: '炸彈<b>不會自己爆</b>，按遙控鍵一次全部引爆；同時彈量 <b>+1</b>（最多 8）。', cn: '炸弹<b>不会自己爆</b>，按遥控键一次全部引爆；同时弹量 <b>+1</b>（最多 8）。', en: 'Bombs <b>never self-detonate</b>; press Remote to blow them all up. Bomb cap <b>+1</b> (max 8).' },
    u: { tw: '放彈後按 <b>E</b>／📱 引爆（手機按 📱 鈕）。', cn: '放弹后按 <b>E</b>／📱 引爆（手机按 📱 钮）。', en: 'Press <b>E</b> / 📱 after placing bombs.' },
    k: { tw: '先繞場放一排，退到安全處再一次引爆，清場超快。', cn: '先绕场放一排，退到安全处再一次引爆，清场超快。', en: 'Lay a row, retreat, then detonate everything at once.' } },
  { id: 'pierce', en: 'Pierce',
    d: { tw: '火焰可以<b>穿透軟磚</b>繼續燒，不會被第一塊磚擋住。', cn: '火焰可以<b>穿透软砖</b>继续烧，不会被第一块砖挡住。', en: 'Flames <b>pierce through</b> soft bricks instead of stopping at the first one.' },
    u: { tw: '走上去自動撿起。', cn: '走上去自动捡起。', en: 'Walk over it to pick it up.' },
    k: { tw: '找出藏在軟磚底下的傳送門最快的方法。', cn: '找出藏在软砖底下的传送门最快的方法。', en: 'Fastest way to reveal the portal hidden under bricks.' } },
  { id: 'heart', en: 'Heart',
    d: { tw: '生命 <b>+1</b>（多一次犯錯機會）。', cn: '生命 <b>+1</b>（多一次犯错机会）。', en: 'Lives <b>+1</b> — one more mistake allowed.' },
    u: { tw: '走上去自動撿起。', cn: '走上去自动捡起。', en: 'Walk over it to pick it up.' },
    k: { tw: '單人「♾️ 無限時間」時慢慢收集最穩。', cn: '单人「♾️ 无限时间」时慢慢收集最稳。', en: 'Collect them at leisure in ♾️ Endless Time mode.' } },
  { id: 'line', en: 'Line Bomb',
    d: { tw: '一次在面前<b>排出一整排炸彈</b>，全部同時爆炸。', cn: '一次在面前<b>排出一整排炸弹</b>，全部同时爆炸。', en: 'Lay a <b>whole row of bombs</b> in front of you at once; all explode together.' },
    u: { tw: '按「動作鍵」觸發。', cn: '按「动作键」触发。', en: 'Press the Action button.' },
    k: { tw: '對著長排軟磚或一群怪使用，一次清光。', cn: '对着长排软砖或一群怪使用，一次清光。', en: 'Aim at a long brick row or a crowd to wipe them out.' } },
  { id: 'skull', en: 'Skull', badge: 'bad',
    d: { tw: '詛咒！隨機中一種：<b>移動超慢</b>／<b>狂放炸彈</b>／<b>火焰變小</b>／<b>操作相反</b>，持續 <b>8 秒</b>。', cn: '诅咒！随机中一种：<b>移动超慢</b>／<b>狂放炸弹</b>／<b>火焰变小</b>／<b>操作相反</b>，持续 <b>8 秒</b>。', en: 'A curse! Random effect for <b>8s</b>: <b>crawling slow</b> / <b>bomb spam</b> / <b>tiny flames</b> / <b>reversed controls</b>.' },
    u: { tw: '踩到就中獎；去撞其他玩家或怪物可以把詛咒<b>傳給他</b>。', cn: '踩到就中奖；去撞其他玩家或怪物可以把诅咒<b>传给他</b>。', en: 'Step on it and you are cursed — touch someone else to <b>pass it on</b>.' },
    k: { tw: '單人模式盡量別踩；對戰時故意撞對手害人。', cn: '单人模式尽量别踩；对战时故意撞对手害人。', en: 'Avoid it in solo; in battle, body-check rivals to infect them.' } }
];

/* ---------- 坐騎 ---------- */
const HELP_RIDES = [
  { id: 'egg', ico: '🥚', sp: 'item:egg',
    n: { tw: '恐龍蛋', cn: '恐龙蛋', en: 'Dino Egg' },
    d: { tw: '地圖上隨機出現的蛋，<b>走上去就孵化</b>並立刻騎上。', cn: '地图上随机出现的蛋，<b>走上去就孵化</b>并立刻骑上。', en: 'Randomly spawned eggs — <b>walk onto one</b> to hatch and ride.' },
    u: { tw: '數量：😇 簡單 3 顆／🙂 普通 2 顆／😈 困難 1 顆（BOSS 關固定 2 顆）。', cn: '数量：😇 简单 3 颗／🙂 普通 2 颗／😈 困难 1 颗（BOSS 关固定 2 颗）。', en: 'Count: 😇 Easy 3 / 🙂 Normal 2 / 😈 Hard 1 (boss stage always 2).' },
    k: { tw: '⚠️ <b>火焰會把蛋炸掉</b>（道具不會），想騎龍就別炸到蛋。', cn: '⚠️ <b>火焰会把蛋炸掉</b>（道具不会），想骑龙就别炸到蛋。', en: '⚠️ <b>Flames destroy eggs</b> (items survive) — keep your blasts away from them.' } },
  { id: 'green', ico: '🦖', sp: 'ride:green',
    n: { tw: '小龍（吃第 1 顆蛋）', cn: '小龙（吃第 1 颗蛋）', en: 'Green Dino (1st egg)' },
    d: { tw: '騎上後<b>多擋一次傷害</b>；按 <b>F</b>／🔥 朝<b>面向</b>吐火 <b>2 格</b>（冷卻 3 秒）。自己的火不會燒到自己，只燒別人。', cn: '骑上后<b>多挡一次伤害</b>；按 <b>F</b>／🔥 朝<b>面向</b>吐火 <b>2 格</b>（冷却 3 秒）。自己的火不会烧到自己，只烧别人。', en: 'Blocks <b>one hit</b>; press <b>F</b> / 🔥 to breathe fire <b>2 tiles</b> ahead (3s cooldown). Your own flame never hurts you.' },
    u: { tw: '被炸彈／火焰／怪物碰到時，小龍<b>替你擋下那一次</b>然後消失（獲得 1.8 秒無敵）。', cn: '被炸弹／火焰／怪物碰到时，小龙<b>替你挡下那一次</b>然后消失（获得 1.8 秒无敌）。', en: 'When hit, the dino <b>takes the hit for you</b> and vanishes (1.8s invulnerability).' },
    k: { tw: '單方向清怪最好用；先轉身再按就能換方向。', cn: '单方向清怪最好用；先转身再按就能换方向。', en: 'Great for one-direction clearing — turn first, then breathe.' } },
  { id: 'red', ico: '🐲', sp: 'ride:red',
    n: { tw: '紅龍（騎乘中再吃第 2 顆蛋）', cn: '红龙（骑乘中再吃第 2 颗蛋）', en: 'Red Dragon (2nd egg while riding)' },
    d: { tw: '體型更大、全身紅光；吐火升級成<b>上下左右四個方向各 2 格</b>。', cn: '体型更大、全身红光；吐火升级成<b>上下左右四个方向各 2 格</b>。', en: 'Bigger and glowing red; its breath hits <b>all four directions, 2 tiles each</b>.' },
    u: { tw: '一樣只能擋一次傷害，被炸到龍就消失。', cn: '一样只能挡一次伤害，被炸到龙就消失。', en: 'Still blocks only one hit — a blast and the dragon is gone.' },
    k: { tw: '被怪包圍時按一下就清場，是闖關神技。', cn: '被怪包围时按一下就清场，是闯关神技。', en: 'Surrounded? One press clears the room. A run-saving move.' } }
];
const HELP_RIDE_TABLE = {
  head: { tw: '項目', cn: '项目', en: '' },
  rows: [
    { k: { tw: '取得方式', cn: '取得方式', en: 'How to get' }, a: { tw: '吃第 1 顆蛋', cn: '吃第 1 颗蛋', en: '1st egg' }, b: { tw: '騎乘中再吃第 2 顆蛋', cn: '骑乘中再吃第 2 颗蛋', en: '2nd egg while riding' } },
    { k: { tw: '外觀', cn: '外观', en: 'Look' }, a: { tw: '綠色小龍', cn: '绿色小龙', en: 'Small green dino' }, b: { tw: '更大、紅光閃爍', cn: '更大、红光闪烁', en: 'Bigger, glowing red' } },
    { k: { tw: '吐火範圍', cn: '吐火范围', en: 'Flame' }, a: { tw: '面向 <b>1 個方向</b> 2 格', cn: '面向 <b>1 个方向</b> 2 格', en: '<b>1 direction</b>, 2 tiles' }, b: { tw: '上下左右 <b>4 個方向</b>各 2 格', cn: '上下左右 <b>4 个方向</b>各 2 格', en: '<b>4 directions</b>, 2 tiles each' } },
    { k: { tw: '冷卻時間', cn: '冷却时间', en: 'Cooldown' }, a: { tw: '3 秒', cn: '3 秒', en: '3s' }, b: { tw: '3 秒', cn: '3 秒', en: '3s' } },
    { k: { tw: '擋傷害', cn: '挡伤害', en: 'Blocks' }, a: { tw: '1 次', cn: '1 次', en: '1 hit' }, b: { tw: '1 次', cn: '1 次', en: '1 hit' } },
    { k: { tw: '自傷', cn: '自伤', en: 'Self-damage' }, a: { tw: '自己的火燒不到自己', cn: '自己的火烧不到自己', en: 'Own flame is harmless' }, b: { tw: '自己的火燒不到自己', cn: '自己的火烧不到自己', en: 'Own flame is harmless' } }
  ]
};

/* ---------- 場景 ---------- */
const HELP_HAZ = {
  convey: { tw: '輸送帶', cn: '传送带', en: 'Conveyor' },
  ice: { tw: '冰面滑行', cn: '冰面滑行', en: 'Ice Slide' },
  warp: { tw: '傳送門', cn: '传送门', en: 'Warp' }
};
const HELP_HAZ_D = {
  convey: { tw: '順著箭頭方向<b>加速</b>、逆向會<b>變慢</b>，橫著穿越則略減速。', cn: '顺着箭头方向<b>加速</b>、逆向会<b>变慢</b>，横着穿越则略减速。', en: 'Moving with the arrow <b>speeds you up</b>, against it <b>slows you down</b>.' },
  ice: { tw: '踩上去會<b>一路滑到底</b>，轉彎困難，很容易滑進火裡。', cn: '踩上去会<b>一路滑到底</b>，转弯困难，很容易滑进火里。', en: 'You <b>slide until you hit something</b> — turning is hard, easy to slide into fire.' },
  warp: { tw: '踩進去會被<b>傳到另一個門</b>；追人、逃跑、繞路都好用。', cn: '踩进去会被<b>传到另一个门</b>；追人、逃跑、绕路都好用。', en: 'Step in and you are <b>teleported to the paired portal</b> — great for chasing or escaping.' }
};
const HELP_STAGES = [
  { i: 0, en: 'Green Plains',   n: { cn: '绿野草原' },   d: { tw: '沒有任何機關，適合熟悉操作、安心撿道具。', cn: '没有任何机关，适合熟悉操作、安心捡道具。', en: 'No hazards — perfect for learning the basics and hoarding items.' } },
  { i: 1, en: 'Lava Cave',      n: { cn: '熔岩洞窟' },   d: { tw: '開始出現<b>輸送帶</b>，走位會被推著跑。', cn: '开始出现<b>传送带</b>，走位会被推着跑。', en: '<b>Conveyors</b> appear and push your movement around.' } },
  { i: 2, en: 'Ice Field',      n: { cn: '冰雪原' },     d: { tw: '<b>冰面滑行</b>：踩上去滑到底，放彈要算好落點。', cn: '<b>冰面滑行</b>：踩上去滑到底，放弹要算好落点。', en: '<b>Ice sliding</b> — plan where you will stop before dropping a bomb.' } },
  { i: 3, en: 'Desert Ruins',   n: { cn: '沙漠遗迹' },   d: { tw: '<b>傳送門</b>登場：踩進去會被傳到另一個門。', cn: '<b>传送门</b>登场：踩进去会被传到另一个门。', en: '<b>Warp portals</b> show up and teleport you across the map.' } },
  { i: 4, en: 'Neon City',      n: { cn: '夜光彩城' },   d: { tw: '冰面 ＋ 輸送帶<b>雙重機關</b>，走位要特別小心。', cn: '冰面 ＋ 传送带<b>双重机关</b>，走位要特别小心。', en: 'Ice <b>+</b> conveyor — double trouble, watch your step.' } },
  { i: 5, en: 'Deep Sea Ruins', n: { cn: '深海遗迹' },   d: { tw: '傳送門 ＋ 冰面；被追時用門甩開最有效。', cn: '传送门 ＋ 冰面；被追时用门甩开最有效。', en: 'Warp + ice — use a portal to shake off chasers.' } },
  { i: 6, en: 'Sky Fortress',   n: { cn: '天空要塞' },   d: { tw: '輸送帶 ＋ 傳送門；注意別被帶進死角。', cn: '传送带 ＋ 传送门；注意别被带进死角。', en: 'Conveyor + warp — do not get pushed into a dead end.' } },
  { i: 7, en: 'Demon Castle',   n: { cn: '暗黑魔王城' }, d: { tw: '三種機關<b>全部登場</b>，還有 <b>👑 暗黑魔王</b> 鎮守最終關。', cn: '三种机关<b>全部登场</b>，还有 <b>👑 暗黑魔王</b> 镇守最终关。', en: 'All three hazards <b>at once</b>, guarded by the <b>👑 Dark Demon Lord</b>.' } }
];

/* ---------- 怪物 ---------- */
const HELP_FOES = [
  { id: 'slime', k: 'ground', hp: 1, spd: { tw: '慢', cn: '慢', en: 'Slow' }, en: 'Slime',
    d: { tw: '最基礎的小怪，隨機亂走。<b>炸一下就解決</b>，常一次來好幾隻。', cn: '最基础的小怪，随机乱走。<b>炸一下就解决</b>，常一次来好几只。', en: 'Basic wanderer. <b>One blast</b> kills it; they often come in groups.' } },
  { id: 'beetle', k: 'ground', hp: 2, spd: { tw: '中', cn: '中', en: 'Medium' }, en: 'Iron Beetle',
    d: { tw: '會<b>主動追人</b>。有硬甲，<b>要炸 2 次</b>才會倒。', cn: '会<b>主动追人</b>。有硬甲，<b>要炸 2 次</b>才会倒。', en: '<b>Chases you</b>. Armoured — <b>takes 2 hits</b>.' } },
  { id: 'crab', k: 'ground', hp: 1, spd: { tw: '中', cn: '中', en: 'Medium' }, en: 'Crab',
    d: { tw: '橫著亂走，路線很難抓。<b>一發就爆</b>，但常堵在窄路上。', cn: '横着乱走，路线很难抓。<b>一发就爆</b>，但常堵在窄路上。', en: 'Sidesteps unpredictably. <b>One hit</b>, but loves to block narrow paths.' } },
  { id: 'skull', k: 'ground', hp: 2, spd: { tw: '偏快', cn: '偏快', en: 'Fast' }, en: 'Skeleton',
    d: { tw: '骷髏兵會<b>追人</b>、速度偏快，<b>要炸 2 次</b>。被盯上時最危險。', cn: '骷髅兵会<b>追人</b>、速度偏快，<b>要炸 2 次</b>。被盯上时最危险。', en: '<b>Chases you</b> and is fast. <b>2 hits</b> to kill. Deadly when it locks on.' } },
  { id: 'mush', k: 'ground', hp: 1, spd: { tw: '最慢', cn: '最慢', en: 'Slowest' }, en: 'Poison Shroom',
    d: { tw: '毒菇怪亂走、<b>速度最慢</b>，最好欺負，但常常擠成一團。', cn: '毒菇怪乱走、<b>速度最慢</b>，最好欺负，但常常挤成一团。', en: '<b>Slowest</b> wanderer and easy prey — but they clump together.' } },
  { id: 'lizard', k: 'ground', hp: 1, spd: { tw: '最快', cn: '最快', en: 'Fastest' }, en: 'Wind Lizard',
    d: { tw: '疾風蜥：<b>地面最快的追擊怪</b>，直直朝你衝。甩不掉就用滑冰鞋。', cn: '疾风蜥：<b>地面最快的追击怪</b>，直直朝你冲。甩不掉就用滑冰鞋。', en: '<b>Fastest ground chaser</b> — it beelines at you. Out-run it with Skates.' } },
  { id: 'bat', k: 'fly', hp: 1, spd: { tw: '中', cn: '中', en: 'Medium' }, en: 'Bat',
    d: { tw: '飛行怪：<b>可以越過牆壁</b>，躲牆後沒用。直線飛、撞到邊界反彈。', cn: '飞行怪：<b>可以越过墙壁</b>，躲墙后没用。直线飞、撞到边界反弹。', en: '<b>Flies over walls</b> — hiding behind bricks does not help. Bounces off edges.' } },
  { id: 'ghost', k: 'fly', hp: 1, spd: { tw: '慢', cn: '慢', en: 'Slow' }, en: 'Ghost',
    d: { tw: '幽靈：穿牆飛行、速度慢，但會<b>慢慢飄向你</b>。', cn: '幽灵：穿墙飞行、速度慢，但会<b>慢慢飘向你</b>。', en: 'Phases through walls. Slow, but <b>drifts toward you</b>.' } },
  { id: 'bee', k: 'fly', hp: 1, spd: { tw: '快', cn: '快', en: 'Fast' }, en: 'Poison Bee',
    d: { tw: '毒蜂：穿牆飛行、<b>速度快</b>，還會慢慢往你靠。', cn: '毒蜂：穿墙飞行、<b>速度快</b>，还会慢慢往你靠。', en: 'Flies through walls, <b>fast</b>, and slowly homes in on you.' } },
  { id: 'eye', k: 'fly', hp: 1, spd: { tw: '中', cn: '中', en: 'Medium' }, en: 'Evil Eye',
    d: { tw: '眼球怪：穿牆飛行，會<b>直直盯著你靠過來</b>。', cn: '眼球怪：穿墙飞行，会<b>直直盯着你靠过来</b>。', en: 'Flies through walls and <b>locks onto you</b>.' } }
];
const HELP_BOSS = {
  n: { tw: '👑 暗黑魔王（BOSS）', cn: '👑 暗黑魔王（BOSS）', en: '👑 Dark Demon Lord (BOSS)' },
  d: { tw: '第 8 關（或直接選「挑戰 BOSS」）登場。<b>血量 5 點</b>、火焰 2 格，頭上有血條與 👑。', cn: '第 8 关（或直接选「挑战 BOSS」）登场。<b>血量 5 点</b>、火焰 2 格，头上有血条与 👑。', en: 'Appears on stage 8 (or via Boss Raid). <b>5 HP</b>, 2-tile flames, HP bar and 👑 overhead.' },
  bullets: [
    { tw: '會<b>躲炸彈</b>：腳下有危險會先跑開，只走安全格。', cn: '会<b>躲炸弹</b>：脚下有危险会先跑开，只走安全格。', en: '<b>Dodges bombs</b> — flees danger tiles and only walks safe ones.' },
    { tw: '會<b>追著你</b>放炸彈；你在遠處時牠會把炸彈<b>丟過來越過牆壁</b>。', cn: '会<b>追着你</b>放炸弹；你在远处时它会把炸弹<b>丢过来越过墙壁</b>。', en: '<b>Chases you</b> and drops bombs; from range it <b>throws bombs over walls</b>.' },
    { tw: '血量降到 <b>40% 以下進入爆走</b>：跑更快、丟彈更兇（同場最多 6 顆）。', cn: '血量降到 <b>40% 以下进入暴走</b>：跑更快、丢弹更凶（同场最多 6 颗）。', en: 'Below <b>40% HP it enrages</b>: faster and more bombs (up to 6 at once).' },
    { tw: '被炸彈砸到會<b>暈一下</b>（頭上轉圈圈），趁這時候補刀。', cn: '被炸弹砸到会<b>晕一下</b>（头上转圈圈），趁这时候补刀。', en: 'A bomb landing on it <b>stuns</b> it briefly — punish that window.' },
    { tw: '打完 <b>5 下</b>就討伐成功 🎉', cn: '打完 <b>5 下</b>就讨伐成功 🎉', en: '<b>5 hits</b> and the raid is clear 🎉' }
  ]
};

/* ---------- 基本操作 ---------- */
const HELP_BASIC = {
  goalSolo: { tw: '炸開軟磚 → 撿道具 → <b>清光所有怪物</b> → 找出傳送門 🚪 → 走進去過關。共 <b>8 大關</b>，第 8 關就是魔王城。', cn: '炸开软砖 → 捡道具 → <b>清光所有怪物</b> → 找出传送门 🚪 → 走进去过关。共 <b>8 大关</b>，第 8 关就是魔王城。', en: 'Blast bricks → grab items → <b>wipe out every enemy</b> → find the portal 🚪 → step in. <b>8 stages</b>, stage 8 is the Demon Castle.' },
  goalBattle: { tw: '把對手炸光就得分，先拿到<b>指定勝場數</b>的人獲勝；沒人加入的位子由 🤖 AI 補位。', cn: '把对手炸光就得分，先拿到<b>指定胜场数</b>的人获胜；没人加入的位置由 🤖 AI 补位。', en: 'Blast rivals to score; first to the <b>target number of wins</b> takes it. Empty slots are filled by 🤖 AI.' },
  goalOnline: { tw: '線上配對：用<b>房號</b>開房／加入朋友的房間，或快速配對。手機連 PC 房也能一起玩。', cn: '在线配对：用<b>房号</b>开房／加入朋友的房间，或快速配对。手机连 PC 房也能一起玩。', en: 'Play online: create or join a room with a <b>4-digit code</b>, or use quick match. Phone can join a PC host.' },
  elems: [
    { i: '🧱', tw: '<b>軟磚</b>：炸得掉，裡面藏道具、恐龍蛋，甚至過關傳送門。', cn: '<b>软砖</b>：炸得掉，里面藏道具、恐龙蛋，甚至过关传送门。', en: '<b>Soft brick</b>: breakable — hides items, dino eggs and even the portal.' },
    { i: '🪨', tw: '<b>硬牆</b>：炸不掉的固定石柱，用來規劃路線與躲火焰。', cn: '<b>硬墙</b>：炸不掉的固定石柱，用来规划路线与躲火焰。', en: '<b>Hard wall</b>: indestructible pillar — use it to route and to hide from flames.' },
    { i: '💣', tw: '<b>炸彈</b>：放下後約 2.4 秒爆炸（拿遙控器則等你引爆）。', cn: '<b>炸弹</b>：放下后约 2.4 秒爆炸（拿遥控器则等你引爆）。', en: '<b>Bomb</b>: explodes after ~2.4s (with Remote it waits for you).' },
    { i: '🔥', tw: '<b>火焰</b>：十字噴發，碰到就扣一條命（連鎖會引爆其他炸彈）。', cn: '<b>火焰</b>：十字喷发，碰到就扣一条命（连锁会引爆其他炸弹）。', en: '<b>Flame</b>: cross-shaped; touching it costs a life (and chains other bombs).' },
    { i: '🚪', tw: '<b>過關傳送門</b>：殲滅所有敵人後才會開啟，走進去就過關。', cn: '<b>过关传送门</b>：歼灭所有敌人后才会开启，走进去就过关。', en: '<b>Exit portal</b>: opens once every enemy is gone — step in to clear the stage.' }
  ],
  lives: { tw: '初始 <b>3 條命</b>；碰到怪物、火焰或被別人炸到就扣 1 條，❤️ 愛心可以 +1。', cn: '初始 <b>3 条命</b>；碰到怪物、火焰或被别人炸到就扣 1 条，❤️ 爱心可以 +1。', en: 'You start with <b>3 lives</b>; enemies, flames and rival blasts each cost one. ❤️ adds one.' },
  time: { tw: '單人可選 3／5／10 分或 <b>♾️ 無限時間</b>；時間到會陣亡，無限時間則慢慢玩也沒關係。', cn: '单人可选 3／5／10 分或 <b>♾️ 无限时间</b>；时间到会阵亡，无限时间则慢慢玩也没关系。', en: 'Solo offers 3 / 5 / 10 min or <b>♾️ Endless</b>. With Endless the timer never kills you.' }
};

/* ---------- 實戰訣竅 ---------- */
const HELP_TIPS = [
  { i: '🧭', tw: '開局先炸<b>自己旁邊的軟磚</b>擴張空間，別一開始就把自己關進死巷。', cn: '开局先炸<b>自己旁边的软砖</b>扩张空间，别一开始就把自己关进死巷。', en: 'Open up the bricks <b>next to your spawn</b> first — never box yourself into a dead end.' },
  { i: '📱', tw: '拿到遙控器：先繞場<b>放一排</b>，退到安全處按一次 E 全部引爆，效率最高。', cn: '拿到遥控器：先绕场<b>放一排</b>，退到安全处按一次 E 全部引爆，效率最高。', en: 'With Remote: lay a row, retreat, then one <b>E</b> detonates everything.' },
  { i: '🧨', tw: '穿透彈 ＋ 火力 ＝ <b>一次燒穿整排軟磚</b>，找傳送門最快。', cn: '穿透弹 ＋ 火力 ＝ <b>一次烧穿整排软砖</b>，找传送门最快。', en: 'Pierce + Fire Up = <b>burn a whole row</b>; fastest way to expose the portal.' },
  { i: '🥚', tw: '看到恐龍蛋一定要吃；但<b>火焰會把蛋炸掉</b>，放彈時要避開蛋那一格。', cn: '看到恐龙蛋一定要吃；但<b>火焰会把蛋炸掉</b>，放弹时要避开蛋那一格。', en: 'Always grab eggs — but <b>flames destroy them</b>, so keep blasts off that tile.' },
  { i: '🐲', tw: '騎上小龍後再吃第 2 顆蛋變<b>紅龍</b>：四方向吐火，被包圍時一鍵清場。', cn: '骑上小龙后再吃第 2 颗蛋变<b>红龙</b>：四方向吐火，被包围时一键清场。', en: 'Riding? Grab a 2nd egg for the <b>Red Dragon</b> — 4-way breath clears a crowd.' },
  { i: '💀', tw: '中💀 詛咒別慌：去撞對手或怪物就能<b>把詛咒傳出去</b>。', cn: '中💀 诅咒别慌：去撞对手或怪物就能<b>把诅咒传出去</b>。', en: 'Cursed? Body-check a rival or monster to <b>pass the curse on</b>.' },
  { i: '🛼', tw: '追擊型怪物（骷髏兵、疾風蜥）甩不掉時，靠滑冰鞋或繞柱子轉彎。', cn: '追击型怪物（骷髅兵、疾风蜥）甩不掉时，靠滑冰鞋或绕柱子转弯。', en: 'Can not shake a chaser? Use Skates or loop around pillars.' },
  { i: '🦇', tw: '飛行怪會<b>穿牆</b>，躲牆後沒用 —— 用火焰封住牠們的直線路徑。', cn: '飞行怪会<b>穿墙</b>，躲墙后没用 —— 用火焰封住它们的直线路径。', en: 'Flyers <b>pass through walls</b> — cut off their straight flight path with flames.' },
  { i: '👑', tw: '打 BOSS 別站在同一直線上：牠會把炸彈<b>丟過來越牆</b>，保持斜角最安全。', cn: '打 BOSS 别站在同一直线上：它会把炸弹<b>丢过来越墙</b>，保持斜角最安全。', en: 'Against the boss stay off its row/column — it <b>throws bombs over walls</b>. Stay diagonal.' },
  { i: '⏳', tw: '對戰時間到會進入<b>突死縮圈</b>，外圈開始落石 → 快往中間跑；淘汰後還能坐<b>復仇推車</b>繼續丟彈。', cn: '对战时间到会进入<b>突死缩圈</b>，外圈开始落石 → 快往中间跑；淘汰后还能坐<b>复仇推车</b>继续丢弹。', en: 'When time runs out <b>Sudden Death</b> drops rocks on the outer ring — move to the centre. Eliminated? You still ride the <b>revenge cart</b>.' }
];

/* ---------- 小工具 ---------- */
function hp(o) {
  if (o == null) return '';
  if (typeof o === 'string') return o;
  if (o[LANG] != null) return o[LANG];
  if (o['zh-TW'] != null) return o['zh-TW'];
  if (o.tw != null) return o.tw;
  return '';
}
function hesc(v) {
  return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function foeName(id) { return t(id === 'mush' ? 'sp.shroom' : 'sp.' + id); }

/* ---------- 說明頁本體 ---------- */
const Help = (function () {
  let tab = 'basic';
  let ready = false;

  /* --- 小圖示：把全域 ctx 暫時指向說明頁的小畫布，直接用遊戲的畫法 --- */
  function paint(cnv) {
    const w = parseInt(cnv.getAttribute('data-w'), 10) || parseInt(cnv.getAttribute('data-size'), 10) || 84;
    const h = parseInt(cnv.getAttribute('data-h'), 10) || parseInt(cnv.getAttribute('data-size'), 10) || 84;
    const dpr = Math.min(2, (window.devicePixelRatio || 1));
    cnv.width = Math.round(w * dpr); cnv.height = Math.round(h * dpr);
    cnv.style.width = w + 'px'; cnv.style.height = h + 'px';
    const g = cnv.getContext('2d');
    if (!g) return;
    g.scale(dpr, dpr);
    const v = String(cnv.getAttribute('data-sp') || '').split(':');
    const kind = v[0], id = v[1];
    const oldT = (typeof Game !== 'undefined') ? Game.T : 40;
    const oldCtx = ctx;
    ctx = g;
    try {
      if (typeof Game !== 'undefined') Game.T = 62;      // 讓美術尺寸跟 PC 上一致
      if (kind === 'item') drawHelpItem(g, w, h, id);
      else if (kind === 'foe') drawHelpFoe(g, w, h, id);
      else if (kind === 'ride') drawHelpRide(g, w, h, id === 'red');
    } catch (e) {}
    ctx = oldCtx;
    if (typeof Game !== 'undefined') Game.T = oldT;
  }
  function itemGlow(g, cx, cy) {
    const T = 62;
    g.fillStyle = 'rgba(255,240,180,.22)';
    g.beginPath(); g.arc(cx, cy, T * .40, 0, 6.283); g.fill();
    g.fillStyle = 'rgba(255,255,255,.34)';
    g.beginPath(); g.arc(cx, cy, T * .30, 0, 6.283); g.fill();
    g.strokeStyle = 'rgba(214,172,124,.95)'; g.lineWidth = 1.6;
    g.beginPath(); g.arc(cx, cy, T * .30, 0, 6.283); g.stroke();
    g.lineWidth = 1;
  }
  function drawHelpItem(g, w, h, type) {
    const T = 62, cx = w / 2, cy = h / 2;
    itemGlow(g, cx, cy);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (type === 'speed' && typeof drawSkateIcon === 'function') {
      drawSkateIcon(cx, cy + 1, T * .40);
    } else if (type === 'egg') {
      g.font = '700 ' + Math.round(T * .40) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
      g.fillText('🥚', cx, cy + 1);
    } else {
      const info = ITEMS[type] || {};
      g.font = '700 ' + Math.round(T * .42) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
      g.fillText(info.icon || '?', cx, cy + 1);
    }
    g.textAlign = 'start'; g.textBaseline = 'alphabetic';
  }
  function drawHelpFoe(g, w, h, id) {
    if (id === 'boss') {
      const b = makeBoss(0, 0, 5);
      b.r = 14;                       // 縮小一點才塞得進說明卡
      b.x = w / 2; b.y = h * .71;
      b.dirName = 'down'; b.walkT = .4; b.hitT = -1; b.bombT = 3; b.dizzy = 0;
      drawEnemy(b, 62);
      return;
    }
    const sp = speciesOf(id);
    const e = {
      type: sp.id, spec: sp.id, eName: sp.name, wing: sp.wing,
      x: w / 2, y: h * .58, speed: sp.spd, color: sp.color, color2: sp.color2,
      kind: sp.kind, r: sp.r, hp: 1, dirT: 0, dirName: 'right', walkT: .35,
      vx: 60, bobP: 1.1, dead: false
    };
    drawEnemyArt(e, e.x, e.y, false, 0);
  }
  function drawHelpRide(g, w, h, red) {
    const p = {
      x: w / 2, y: h * .66, facing: 'right', dino: true, redDragon: !!red,
      dinoT: 1.2, walkT: .3, moving: false, fireCd: 0, chIdx: 0
    };
    drawDino(p, 62);
  }

  /* --- 各分頁 --- */
  function card(sp, size, ico, name, en, desc, use, tip, badge) {
    let h = '<div class="hcard">';
    h += '<canvas class="hico" data-sp="' + sp + '" data-size="' + (size || 76) + '"></canvas>';
    h += '<div class="htx"><div class="hn">' + ico + ' ' + name +
      (en ? '<span class="hen">' + hesc(en) + '</span>' : '') +
      (badge ? ' <span class="hbadge ' + badge.cls + '">' + hesc(badge.txt) + '</span>' : '') + '</div>';
    h += '<div class="hd">' + desc + '</div>';
    if (use) h += '<div class="hh">📌 ' + use + '</div>';
    if (tip) h += '<div class="hh">💡 ' + tip + '</div>';
    h += '</div></div>';
    return h;
  }
  function buildBasic() {
    const k1 = (typeof settings !== 'undefined' && settings.keys1) ? settings.keys1 : {};
    const kn = (typeof keyName === 'function') ? keyName : function (c) { return c || ''; };
    let h = '<div class="hlead">' + hp(HELP_BASIC.goalSolo) + '</div>';
    h += '<div class="hlead">' + hp(HELP_BASIC.goalBattle) + '</div>';
    h += '<div class="hlead">' + hp(HELP_BASIC.goalOnline) + '</div>';

    h += '<div class="hsub">🕹️ 操作方式</div>';
    h += '<div class="hcard wide"><div class="htx"><div class="hn">💻 電腦（鍵盤）</div>';
    h += '<dl class="hkv">';
    h += '<dt>移動</dt><dd><kbd>' + hesc(kn(k1.up)) + '</kbd> <kbd>' + hesc(kn(k1.left)) + '</kbd> <kbd>' + hesc(kn(k1.down)) + '</kbd> <kbd>' + hesc(kn(k1.right)) + '</kbd>（預設 WASD 或方向鍵）</dd>';
    h += '<dt>放彈／動作</dt><dd><kbd>' + hesc(kn(k1.act)) + '</kbd>（預設 空白鍵／Enter；撿彈、丟彈、線圈彈都用它）</dd>';
    h += '<dt>遙控引爆</dt><dd><kbd>' + hesc(kn(k1.det)) + '</kbd>（預設 E，要有 📱 才有用）</dd>';
    h += '<dt>恐龍吐火</dt><dd><kbd>' + hesc(kn(k1.fire)) + '</kbd>（預設 F，要有坐騎才有用）</dd>';
    h += '<dt>暫停</dt><dd><kbd>ESC</kbd> 或右上角 ⏸</dd>';
    h += '</dl></div></div>';
    h += '<div class="hcard wide"><div class="htx"><div class="hn">📱 手機／平板（觸控）</div>';
    h += '<dl class="hkv">';
    h += '<dt>移動</dt><dd>左下角 <b>搖桿</b>（往哪推就往哪走）</dd>';
    h += '<dt>按鈕</dt><dd>右下角 <b>💣 放彈／動作</b>、<b>🔥 吐火</b>、<b>📱 引爆</b></dd>';
    h += '<dt>暫停</dt><dd>右上角 <b>⏸</b> 或「← 上一頁」</dd>';
    h += '<dt>小提醒</dt><dd>手機玩到一半想離開，請按 ⏸；邊緣滑動的系統返回手勢已自動擋掉，不會誤觸</dd>';
    h += '</dl></div></div>';
    h += '<div class="hcard wide"><div class="htx"><div class="hn">🎮 手把</div>';
    h += '<div class="hd">接上手把就會自動偵測，可在「設定 → 控制方式」指定把手與按鍵；沒手把也能用 🤖 AI 補位或直接對戰。</div>';
    h += '</div></div>';

    h += '<div class="hsub">🧱 地圖上會看到什麼</div><div class="hgrid">';
    HELP_BASIC.elems.forEach(function (el) {
      h += '<div class="hcard"><div class="htx"><div class="hn">' + el.i + '</div>' +
        '<div class="hd">' + hp(el) + '</div></div></div>';
    });
    h += '</div>';

    h += '<div class="hsub">❤️ 生命與時間</div>';
    h += '<div class="hcard wide"><div class="htx"><div class="hd">・' + hp(HELP_BASIC.lives) + '</div>' +
      '<div class="hd">・' + hp(HELP_BASIC.time) + '</div>' +
      '<div class="hd">・單人闖關：<b>道具與坐騎會跟著你帶到下一關</b>，陣亡則從該關重新開始。</div>' +
      '</div></div>';
    return h;
  }
  function buildItems() {
    let h = '<div class="hlead">道具藏在<b>軟磚</b>裡，炸開就掉出來，走上去自動撿起。<b>火焰不會把道具燒掉</b>（只會亮一下），放心炸。</div>';
    h += '<div class="hgrid">';
    HELP_ITEMS.forEach(function (it) {
      const info = ITEMS[it.id] || {};
      const badge = it.badge === 'bad'
        ? { cls: 'bad', txt: LANG === 'zh-CN' ? '负面' : (LANG === 'en' ? 'Curse' : '負面') } : null;
      h += card('item:' + it.id, 76, info.icon || '', hesc(itemName(it.id)), it.en,
        hp(it.d), hp(it.u), hp(it.k), badge);
    });
    h += '</div>';
    return h;
  }
  function buildRides() {
    let h = '<div class="hlead">坐騎是這款遊戲最大的特色：<b>恐龍蛋孵化後騎上龍</b>，不只幫你擋傷害，還能<b>吐火</b>當招式用。</div>';
    h += '<div class="hride">';
    HELP_RIDES.forEach(function (r) {
      h += '<div class="hcard">';
      if (r.id === 'egg') {
        h += '<canvas class="hico" data-sp="item:egg" data-size="76"></canvas>';
      } else {
        h += '<canvas class="hico" data-sp="' + r.sp + '" data-w="120" data-h="170"></canvas>';
      }
      h += '<div class="htx"><div class="hn">' + r.ico + ' ' + hesc(hp(r.n)) +
        '<span class="hen">' + hesc(r.en || '') + '</span></div>' +
        '<div class="hd">' + hp(r.d) + '</div>' +
        '<div class="hh">📌 ' + hp(r.u) + '</div>' +
        '<div class="hh">💡 ' + hp(r.k) + '</div></div></div>';
    });
    h += '</div>';
    h += '<div class="hsub">🆚 小龍 vs 紅龍：差在哪？</div>';
    h += '<table class="htable"><tr><th>' + hp(HELP_RIDE_TABLE.head) + '</th><th>🦖 小龍</th><th>🐲 紅龍</th></tr>';
    HELP_RIDE_TABLE.rows.forEach(function (r) {
      h += '<tr><td>' + hp(r.k) + '</td><td>' + hp(r.a) + '</td><td>' + hp(r.b) + '</td></tr>';
    });
    h += '</table>';
    h += '<div class="hsub">🎯 招式怎麼用</div>';
    h += '<div class="hcard wide"><div class="htx">';
    h += '<div class="hd">1️⃣ 吃蛋騎龍 → HUD 會多一顆 🦖（或 🐲）標記，右上角／螢幕上出現 <b>🔥 吐火鈕</b>。</div>';
    h += '<div class="hd">2️⃣ 按 <b>F 鍵</b>（手機按 <b>🔥</b>）吐火：小龍只燒<b>面向的那個方向</b>，紅龍<b>四個方向同時燒</b>，各 2 格。</div>';
    h += '<div class="hd">3️⃣ 冷卻 <b>3 秒</b>（龍頭上方會顯示倒數），冷卻中按了沒反應，等數字消失再按。</div>';
    h += '<div class="hd">4️⃣ 火焰會<b>炸掉恐龍蛋、點燃別的炸彈</b>，但<b>不會傷到自己</b> —— 可以放心邊跑邊噴。</div>';
    h += '<div class="hd">5️⃣ 龍<b>只能擋一次傷害</b>：被炸到龍就消失（有 1.8 秒無敵），想再騎要再吃一顆蛋。</div>';
    h += '</div></div>';
    return h;
  }
  function buildStages() {
    let h = '<div class="hlead">單人闖關共 <b>8 大關</b>，每關有專屬配色與地形機關；關卡越後面機關越多、怪物越兇。</div>';
    h += '<div class="hgrid">';
    HELP_STAGES.forEach(function (st) {
      const th = THEMES[st.i] || THEMES[0];
      const sw = 'background:linear-gradient(140deg,' + th.bg1 + ' 0%,' + th.floor + ' 52%,' + th.soft + ' 100%)';
      let chips = '';
      (th.hazards || []).forEach(function (hz) {
        chips += '<span class="hbadge info">' + hesc(hp(HELP_HAZ[hz])) + '</span>';
      });
      if (!(th.hazards || []).length) chips = '<span class="hbadge good">' + (LANG === 'zh-CN' ? '无机关' : (LANG === 'en' ? 'No hazard' : '無機關')) + '</span>';
      const sName = (LANG === 'zh-CN' && st.n && st.n.cn) ? st.n.cn : th.name;
      h += '<div class="hcard"><span class="hsw" style="' + sw + '"></span><div class="htx">' +
        '<div class="hn">' + (st.i + 1) + '. ' + hesc(sName) +
        '<span class="hen">' + hesc(st.en) + '</span></div>' +
        '<div class="hd">' + hp(st.d) + '</div><div>' + chips + '</div></div></div>';
    });
    h += '</div>';
    h += '<div class="hsub">⚙️ 地形機關怎麼運作</div><div class="hgrid">';
    ['ice', 'warp', 'convey'].forEach(function (hz) {
      h += '<div class="hcard"><div class="htx"><div class="hn">' + hesc(hp(HELP_HAZ[hz])) + '</div>' +
        '<div class="hd">' + hp(HELP_HAZ_D[hz]) + '</div></div></div>';
    });
    h += '<div class="hcard"><div class="htx"><div class="hn">🌀 突死縮圈<span class="hen">Sudden Death</span></div>' +
      '<div class="hd">對戰時間到還沒分出勝負時，<b>外圈開始落石</b>，場地越縮越小 —— 快往中間跑。</div></div></div>';
    h += '<div class="hcard"><div class="htx"><div class="hn">🛒 復仇推車<span class="hen">Revenge Cart</span></div>' +
      '<div class="hd">對戰被淘汰後不用乾等：坐上推車沿外圈移動，<b>繼續往場內丟炸彈</b>報仇。</div></div></div>';
    h += '</div>';
    return h;
  }
  function buildFoes() {
    let h = '<div class="hlead">小怪分兩大類：<b>地面怪</b>（會被牆擋住，可以躲）與 <b>飛行怪</b>（有翅膀，<b>可以越過牆壁</b>）。碰到任何一隻就扣一條命。</div>';
    h += '<div class="hsub">🌱 地面怪（會被牆擋住）</div><div class="hgrid">';
    HELP_FOES.forEach(function (f) {
      if (f.k !== 'ground') return;
      h += '<div class="hcard"><canvas class="hico" data-sp="foe:' + f.id + '" data-size="86"></canvas><div class="htx">' +
        '<div class="hn">' + hesc(foeName(f.id)) + '<span class="hen">' + hesc(f.en) + '</span></div>' +
        '<div><span class="hbadge hot">❤️ ' + f.hp + '</span><span class="hbadge info">速度 ' + hesc(hp(f.spd)) + '</span></div>' +
        '<div class="hd">' + hp(f.d) + '</div></div></div>';
    });
    h += '</div>';
    h += '<div class="hsub">🕊️ 飛行怪（有翅膀、可穿牆）</div><div class="hgrid">';
    HELP_FOES.forEach(function (f) {
      if (f.k !== 'fly') return;
      h += '<div class="hcard"><canvas class="hico" data-sp="foe:' + f.id + '" data-size="86"></canvas><div class="htx">' +
        '<div class="hn">' + hesc(foeName(f.id)) + '<span class="hen">' + hesc(f.en) + '</span></div>' +
        '<div><span class="hbadge hot">❤️ ' + f.hp + '</span><span class="hbadge info">速度 ' + hesc(hp(f.spd)) + '</span>' +
        '<span class="hbadge bad">' + (LANG === 'zh-CN' ? '穿墙' : (LANG === 'en' ? 'Through walls' : '穿牆')) + '</span></div>' +
        '<div class="hd">' + hp(f.d) + '</div></div></div>';
    });
    h += '</div>';
    h += '<div class="hsub">👑 BOSS</div>';
    h += '<div class="hcard wide"><canvas class="hico" data-sp="foe:boss" data-w="122" data-h="150"></canvas><div class="htx">' +
      '<div class="hn">' + hesc(hp(HELP_BOSS.n)) + '</div><div class="hd">' + hp(HELP_BOSS.d) + '</div><ul style="margin:6px 0 0;padding-left:18px">';
    HELP_BOSS.bullets.forEach(function (b) { h += '<li class="hd">' + hp(b) + '</li>'; });
    h += '</ul></div></div>';
    return h;
  }
  function buildTips() {
    let h = '<div class="hlead">老手常用的 <b>10 個實戰技巧</b>，看完馬上變強 💪</div><div class="hgrid">';
    HELP_TIPS.forEach(function (tp, i) {
      h += '<div class="hcard"><div class="htx"><div class="hn">' + tp.i + ' ' + (i + 1) + '.</div>' +
        '<div class="hd">' + hp(tp) + '</div></div></div>';
    });
    h += '</div>';
    return h;
  }

  function render() {
    const box = $id('helpBody');
    if (!box) return;
    const tb = $id('helpTabs');
    if (tb) {
      Array.prototype.forEach.call(tb.querySelectorAll('button'), function (b) {
        b.classList.toggle('on', b.getAttribute('data-ht') === tab);
        const id = b.getAttribute('data-ht');
        b.textContent = hp(HELP_TAB_TXT[id] || {});
      });
    }
    let h = '';
    if (tab === 'item') h = buildItems();
    else if (tab === 'ride') h = buildRides();
    else if (tab === 'stage') h = buildStages();
    else if (tab === 'foe') h = buildFoes();
    else if (tab === 'tip') h = buildTips();
    else h = buildBasic();
    box.innerHTML = h;
    Array.prototype.forEach.call(box.querySelectorAll('canvas[data-sp]'), paint);
    ready = true;
  }
  function show() {
    render();
    Screen.show('help');
  }
  function setTab(id) {
    if (HELP_TABS.indexOf(id) < 0) return;
    tab = id;
    render();
  }
  return { render: render, show: show, setTab: setTab,
    get tab() { return tab; }, get ready() { return ready; } };
})();

/* 分頁切換 */
(function () {
  const tb = $id('helpTabs');
  if (!tb) return;
  tb.addEventListener('click', function (e) {
    const b = e.target && e.target.closest ? e.target.closest('button[data-ht]') : null;
    if (!b) return;
    try { AudioSys.sfx('click'); } catch (err) {}
    Help.setTab(b.getAttribute('data-ht'));
  });
})();
/* 語言切換時重畫（文字跟著換） */
refreshers.push(function () { if (Screen.current === 'help') Help.render(); });

"""

anchor = "$id('btnBattle').addEventListener('click', function () {"
if s.count(anchor) != 1:
    print('MISS anchor (btnBattle)'); sys.exit(1)
i = s.index(anchor)
s = s[:i] + JS + s[i:]

# 說明頁按鈕接線（放在設定按鈕前面）
BTN_JS = """$id('btnHelp').addEventListener('click', function () {
  AudioSys.ensure(); AudioSys.sfx('click');
  Help.show();
});
"""
anchor2 = "$id('btnSettings').addEventListener('click', function () {"
if s.count(anchor2) != 1:
    print('MISS anchor (btnSettings)'); sys.exit(1)
j = s.index(anchor2)
s = s[:j] + BTN_JS + s[j:]

# refreshI18NUI：語言切換時重畫說明頁
old = "  try { if (typeof updateNavUI === 'function') updateNavUI(); } catch (e) {}\n}"
if s.count(old) != 1:
    print('MISS anchor (refreshI18NUI)'); sys.exit(1)
s = s.replace(old, "  try { if (typeof updateNavUI === 'function') updateNavUI(); } catch (e) {}\n"
                   "  try { if (typeof Help !== 'undefined' && Help && Help.render) Help.render(); } catch (e) {}\n}")

# __BH 匯出
old2 = "  VERSION: VERSION, tryMoveDiag: tryMoveDiag,"
if s.count(old2) != 1:
    print('MISS anchor (__BH)'); sys.exit(1)
s = s.replace(old2, "  VERSION: VERSION, Help: (typeof Help !== 'undefined' ? Help : null),\n  HELP_ITEMS: (typeof HELP_ITEMS !== 'undefined' ? HELP_ITEMS : null),\n  HELP_FOES: (typeof HELP_FOES !== 'undefined' ? HELP_FOES : null),\n  tryMoveDiag: tryMoveDiag,")

io.open(P, 'w', encoding='utf-8').write(s)
print('patch_v35b OK，%d → %d 位元組' % (len(orig), len(s)))
