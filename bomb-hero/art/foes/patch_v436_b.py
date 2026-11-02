# -*- coding: utf-8 -*-
# v4.36 patch 2：48 隻小怪的「個人習性＋特殊技能＋元素特效」
import io, sys

P = r'C:\Users\jon84\WorkBuddy\2026-10-30-12-58-54\bomb-hero\index.html'
s = io.open(P, encoding='utf-8', newline='').read()
orig = s

def rep(old, new, n=1, tag=''):
    global s
    old = old.replace('\r\n', '\n'); new = new.replace('\r\n', '\n')
    lf = s.replace('\r\n', '\n')
    c = lf.count(old)
    if c != n:
        print('!! [%s] 命中 %d 次（預期 %d）\n---\n%s\n---' % (tag, c, n, old[:300])); sys.exit(1)
    s = lf.replace(old, new).replace('\n', '\r\n')
    print('ok  [%s]' % tag)

# ---------------------------------------------------------------
# 1. FOE_KIT：每隻小怪的習性 / 技能 / 元素
# ---------------------------------------------------------------
KIT = """
// ================================================================
//   v4.36：每隻小怪的「個人習性 ＋ 特殊技能 ＋ 元素特效」
//   ── 這是圖鑑文字與實際行為的「唯一來源」：
//      habit  → 圖鑑寫的習性，同時決定牠怎麼動（慢爬／橫走／直衝…）
//      skill  → 實際會做的特殊行為（見 enemySkillTick）
//      fx     → 身上的元素特效（火／雷／冰霧／邪氣…），drawFoeElement 會畫
//   之前 48 隻只有「換皮」，行為完全一樣（亂走／追人／飛），這一版補上個別差異。
// ================================================================
const FOE_FX_NAME = {
  fire: '火焰', ice: '冰霜', thunder: '雷電', dark: '暗黑邪氣', water: '水霧',
  wind: '疾風', neon: '霓虹', poison: '毒霧', earth: '砂塵', nature: '自然氣息'
};
const FOE_FX_STYLE = {
  fire: { glow: '255,150,60', dot: '#ffb347' },
  ice: { glow: '150,220,255', dot: '#cdefff' },
  thunder: { glow: '255,240,140', dot: '#fff7a8' },
  dark: { glow: '160,90,220', dot: '#c79bff' },
  water: { glow: '90,180,255', dot: '#9fdcff' },
  wind: { glow: '200,255,240', dot: '#d8fff4' },
  neon: { glow: '90,240,220', dot: '#58f0d8' },
  poison: { glow: '150,220,90', dot: '#b6f06a' },
  earth: { glow: '200,160,100', dot: '#d9b077' },
  nature: { glow: '150,230,120', dot: '#9be15d' }
};
const FOE_KIT = {
  // ── 第 1 大關 綠野草原 ──
  slime: { fx: 'nature', skill: 'split', habit: '慢吞吞地亂走，一群一群擠在一起', sp: '被炸倒會分裂成兩隻小史萊姆' },
  bunny: { fx: '', skill: 'charge', habit: '蹦蹦跳跳地靠近，跳得比走得快', sp: '鎖定你之後會直線撲撞' },
  frog: { fx: 'water', skill: 'spit', habit: '蹲著不太動，舌頭一彈就是水彈', sp: '朝你站的格子吐水彈（有落點提示）' },
  cater: { fx: 'nature', skill: 'blink', habit: '一節一節慢慢爬，鑽進落葉底下就不見了', sp: '鑽土：消失一下，再從你旁邊冒出來' },
  mush: { fx: 'poison', skill: 'spit', habit: '孢子一團一團飄，走得像在散步', sp: '吐出毒孢彈，被打到會晃一下' },
  beetle: { fx: 'earth', skill: 'smart', habit: '硬甲很重，走直線不太轉彎', sp: '看到你放炸彈會找石柱躲起來' },
  // ── 第 2 大關 沙漠遺跡 ──
  crab: { fx: 'earth', skill: 'charge', habit: '橫著走，路線很難抓', sp: '側身夾擊：橫向突然加速撞人' },
  mummy: { fx: 'dark', skill: 'smart', habit: '繃帶很厚，動作慢但很會繞路', sp: '會判斷炸彈範圍，躲到牆後' },
  eye: { fx: 'dark', skill: 'stun', habit: '飄在半空盯著你看，越看越暈', sp: '目光催眠：靠近會被定住一下' },
  sandworm: { fx: 'earth', skill: 'blink', habit: '在沙子裡鑽進鑽出，只看得到沙痕', sp: '鑽沙潛行，從你附近的沙面衝出來' },
  dune: { fx: 'earth', skill: 'charge', habit: '低著頭一步一步走，像一台小推土機', sp: '沙丘衝撞：撞到牆才停' },
  scorp: { fx: 'poison', skill: 'spit', habit: '翹著尾巴橫行，喜歡保持距離', sp: '尾針射毒（有落點提示）' },
  // ── 第 3 大關 冰雪原 ──
  penguin: { fx: 'ice', skill: 'charge', habit: '搖搖擺擺走路，偶爾趴下來滑', sp: '貼地滑行撞擊，滑過去看起來很快' },
  crystal: { fx: 'ice', skill: 'spit', habit: '一步一閃，身體會自己發亮', sp: '射冰晶，被打到會冷得動不了' },
  bat: { fx: 'dark', skill: '', habit: '直線亂飛，撞到邊界就反彈', sp: '穿牆飛行（躲牆後沒用）' },
  snowball: { fx: 'ice', skill: 'split', habit: '滾來滾去，越滾越圓', sp: '炸開會變成兩顆小雪球' },
  seal: { fx: 'ice', skill: 'gust', habit: '拍著鰭慢慢挪，看起來很無害', sp: '拍手吹出冷風，把你往後推一格' },
  panda: { fx: '', skill: 'charge', habit: '圓滾滾、超慢，但真的很胖', sp: '滾過來壓人，被壓到會退一步' },
  // ── 第 4 大關 熔岩洞窟 ──
  lavaslime: { fx: 'fire', skill: 'split', habit: '身體一直在冒泡，走過的痕跡會發亮', sp: '炸開會濺出兩隻小火苗' },
  lavaworm: { fx: 'fire', skill: 'blink', habit: '鑽進岩漿裡，只露出一截背', sp: '潛進岩漿再從你旁邊冒出來' },
  bee: { fx: 'poison', skill: 'spit', habit: '飛得很快，繞著你打轉', sp: '射毒針（有落點提示）' },
  bomber: { fx: 'fire', skill: 'bomber', habit: '背著一整袋炸彈，走起來鏗鏗響', sp: '自己放炸彈（火焰 1 格）' },
  lizard: { fx: 'wind', skill: 'charge', habit: '貼著地面高速衝刺，煞不住', sp: '全場最快的直線衝鋒' },
  rockling: { fx: 'earth', skill: 'spit', habit: '石頭做的身體，每一步都碰碰響', sp: '丟石塊砸你站的格子' },
  // ── 第 5 大關 夜光彩城 ──
  wisp: { fx: 'fire', skill: 'blink', habit: '飄忽不定，像一團會呼吸的火', sp: '瞬間移動，抓不到牠的位置' },
  scavenger: { fx: '', skill: 'scavenger', habit: '鬼鬼祟祟，專門跟在炸彈後面', sp: '把你的炸彈撿起來丟回你身上' },
  robot: { fx: 'neon', skill: 'charge', habit: '機械式前進，一步一格', sp: '直線衝撞，撞牆才停下' },
  pulser: { fx: 'neon', skill: 'spit', habit: '跟著節拍抖動，全身是霓虹燈', sp: '射出音波彈（有落點提示）' },
  laserbee: { fx: 'neon', skill: 'spit', habit: '懸停在空中校準，光點會先亮起來', sp: '雷射射擊，落點會先顯示' },
  neonbot: { fx: 'neon', skill: 'summon', habit: '走路帶電流聲，像一台巡邏機', sp: '召喚巡邏小機兵（場上最多 12 隻）' },
  // ── 第 6 大關 深海遺跡 ──
  octopus: { fx: 'water', skill: 'gust', habit: '八條觸手在地上爬，看不出方向', sp: '觸手橫掃，把你推開一格' },
  angler: { fx: 'water', skill: 'stun', habit: '提著燈籠慢慢靠近，燈光很催眠', sp: '燈光催眠：被照到會頭暈一下' },
  ghost: { fx: 'dark', skill: 'blink', habit: '半透明地飄，穿牆而過', sp: '穿牆瞬移，突然出現在你旁邊' },
  hermit: { fx: 'water', skill: 'smart', habit: '揹著殼慢慢走，遇到危險就縮進去', sp: '躲炸彈：會退到安全格' },
  jelly: { fx: 'thunder', skill: 'spit', habit: '一縮一放地漂，觸手帶著靜電', sp: '放電攻擊，落點會先閃電光' },
  urchin: { fx: 'water', skill: 'charge', habit: '全身是刺，滾動起來像顆刺球', sp: '旋轉衝刺，撞到人會彈開' },
  // ── 第 7 大關 天空要塞 ──
  hornet: { fx: 'poison', skill: 'charge', habit: '翅膀聲很大，速度快得看不清', sp: '高速俯衝，衝完會停一下' },
  airship: { fx: 'thunder', skill: 'spit', habit: '慢慢飄，肚子底下掛著一顆雷彈', sp: '投下雷彈（有落點提示）' },
  sapper: { fx: '', skill: 'sapper', habit: '低著頭找炸彈，動作很機械', sp: '拆掉你的炸彈（拆掉不會爆）' },
  thunder: { fx: 'thunder', skill: 'spit', habit: '浮在空中滋滋作響，越靠近越亮', sp: '落雷：在你附近打下一道雷' },
  windwisp: { fx: 'wind', skill: 'gust', habit: '被風推著飄，路線是弧線', sp: '吹出強風把你往後推' },
  galehawk: { fx: 'wind', skill: 'charge', habit: '在高空盤旋，突然收翅俯衝', sp: '俯衝撞擊，速度是全場最快' },
  // ── 第 8 大關 暗黑魔王城 ──
  skull: { fx: 'dark', skill: 'charge', habit: '喀啦喀啦地衝過來，速度偏快', sp: '骨頭衝撞，被撞到會後退' },
  imp: { fx: 'fire', skill: 'blink', habit: '蹦來蹦去，笑聲很吵', sp: '瞬移突襲，會出現在你身後' },
  darkbat: { fx: 'dark', skill: 'spit', habit: '成群飛舞，翅膀帶著黑霧', sp: '射暗影彈（有落點提示）' },
  wizard: { fx: 'dark', skill: 'spit', habit: '邊走邊念咒，帽尖會發光', sp: '魔法彈，落點會先亮起符文' },
  royalguard: { fx: 'dark', skill: 'summon', habit: '站得直挺挺，守在王座前面', sp: '召喚骷髏衛兵（場上最多 12 隻）' },
  deathknight: { fx: 'dark', skill: 'charge', smart: true, habit: '盔甲底下什麼都沒有，只有一團黑氣', sp: '衝鋒＋會躲炸彈，難纏的對手' }
};
function foeKit(id) { return FOE_KIT[id] || {}; }
// 圖鑑用：把習性／技能／元素串成一句
function foeKitText(id) {
  const k = foeKit(id);
  let s = '';
  if (k.habit) s += ' <b>習性</b>：' + k.habit + '。';
  if (k.sp) s += ' <b>特殊技能</b>：' + k.sp + '。';
  if (k.fx && FOE_FX_NAME[k.fx]) s += ' 身上纏著<b>' + FOE_FX_NAME[k.fx] + '</b>。';
  return s;
}
"""

rep("""function speciesOf(id) {
  for (let i = 0; i < ENEMY_SPECIES.length; i++) { if (ENEMY_SPECIES[i].id === id) return ENEMY_SPECIES[i]; }
  return ENEMY_SPECIES[0];
}""",
"""function speciesOf(id) {
  for (let i = 0; i < ENEMY_SPECIES.length; i++) { if (ENEMY_SPECIES[i].id === id) return ENEMY_SPECIES[i]; }
  return ENEMY_SPECIES[0];
}
""" + KIT, 1, 'FOE_KIT')

# ---------------------------------------------------------------
# 2. makeEnemy：把 kit 套上去
# ---------------------------------------------------------------
rep("""  // v4.13：技能（C 聰明躲炸彈 / A 撿彈 / B 拆彈 / D 放彈）
  if (sp.skill) e.skill = sp.skill;
  if (sp.skill === 'smart') e.smart = true;""",
"""  // v4.13：技能（C 聰明躲炸彈 / A 撿彈 / B 拆彈 / D 放彈）
  if (sp.skill) e.skill = sp.skill;
  if (sp.skill === 'smart') e.smart = true;
  // v4.36：個別習性＋元素（FOE_KIT）—— 每一隻都有自己的行為與特效
  const kit = foeKit(sp.id);
  e.fx = kit.fx || '';
  e.habit = kit.habit || '';
  if (kit.skill) e.skill = kit.skill;
  if (kit.smart) e.smart = true;
  e.skCd = .9 + Math.random() * 1.6;        // 技能冷卻（各技能自己重設）
  e.blinkT = 0;                             // 鑽地／瞬移的消失計時
  e.maxHp = e.maxHp || hpBase;""", 1, 'makeEnemy-kit')

# ---------------------------------------------------------------
# 3. enemySkillTick：新增 split / spit / charge / blink / gust / stun / summon
# ---------------------------------------------------------------
rep("""function enemySkillTick(e, dt) {
  const T = Game.T;
  const cx = Math.floor(e.x / T), cy = Math.floor(e.y / T);

  // ---- A. 撿彈怪：撿起炸彈再丟回去 ----""",
"""function nearestPlayerTo(e, maxD) {
  let best = null, bd = maxD * maxD;
  Game.players.forEach(function (p) {
    if (!p || !p.alive || p.cart) return;
    if (playerHiding(p)) return;                 // 躲在樹叢裡看不到
    const d = dist2(p.x, p.y, e.x, e.y);
    if (d < bd) { bd = d; best = p; }
  });
  return best;
}

function enemySkillTick(e, dt) {
  const T = Game.T;
  const cx = Math.floor(e.x / T), cy = Math.floor(e.y / T);

  // ---- v4.36：分裂 ----
  //   分裂發生在死亡那一刻（foeOnDeath），這裡不用做事
  if (e.skill === 'split') return;

  // ---- v4.36：吐元素彈（水／毒／冰／雷／暗影…依 fx 變色）----
  if (e.skill === 'spit') {
    e.skCd = (e.skCd || 0) - dt;
    if (!e.aggro || e.skCd > 0) return;
    const tgt = nearestPlayerTo(e, T * 6.5);
    if (!tgt) return;
    e.skCd = 2.6 + Math.random() * 1.8;
    foeCastBolt(e, Math.floor(tgt.x / T), Math.floor(tgt.y / T));
    return;
  }

  // ---- v4.36：直線衝撞 ----
  if (e.skill === 'charge') {
    e.skCd = (e.skCd || 0) - dt;
    if (!e.aggro || e.dashT > 0 || e.skCd > 0) return;
    const tgt = nearestPlayerTo(e, T * 6);
    if (!tgt) return;
    const dx = tgt.x - e.x, dy = tgt.y - e.y;
    let dn = null;
    if (Math.abs(dx) > Math.abs(dy)) { if (Math.abs(dy) < T * .62) dn = dx > 0 ? 'right' : 'left'; }
    else if (Math.abs(dx) < T * .62) dn = dy > 0 ? 'down' : 'up';
    if (!dn) return;
    e.dirName = dn;
    e.dashT = .95;
    e.skCd = 2.4 + Math.random() * 1.4;
    e.windT = 0;
    burst(e.x, e.y, e.color, 6, 90);
    return;
  }

  // ---- v4.36：鑽地／瞬移（消失 → 從玩家附近冒出來）----
  if (e.skill === 'blink') {
    if (e.blinkT < 0) e.blinkT = 0;
    e.skCd = (e.skCd || 0) - dt;
    if (!e.aggro || e.blinkT > 0 || e.skCd > 0) return;
    e.skCd = 4.2 + Math.random() * 2.2;
    e.blinkT = .5;                    // 更新迴圈會倒數，歸零時移動
    burst(e.x, e.y, e.fx === 'earth' ? '#d9b077' : '#c79bff', 10, 120);
    AudioSys.sfx('warp');
    return;
  }

  // ---- v4.36：吹風推人 ----
  if (e.skill === 'gust') {
    e.skCd = (e.skCd || 0) - dt;
    if (!e.aggro || e.skCd > 0) return;
    const tgt = nearestPlayerTo(e, T * 2.6);
    if (!tgt) return;
    e.skCd = 2.8 + Math.random() * 1.2;
    foeGust(e, tgt);
    return;
  }

  // ---- v4.36：催眠／尖叫（靠近就被定住）----
  if (e.skill === 'stun') {
    e.skCd = (e.skCd || 0) - dt;
    if (!e.aggro || e.skCd > 0) return;
    const tgt = nearestPlayerTo(e, T * 2.4);
    if (!tgt) return;
    e.skCd = 4.5 + Math.random() * 1.5;
    tgt.dizzy = Math.max(tgt.dizzy || 0, .85);
    burst(tgt.x, tgt.y - T * .3, '#c79bff', 12, 130);
    bubbleSay(tgt, '😵', 'dead', T * 1.9);
    AudioSys.sfx('warp');
    return;
  }

  // ---- v4.36：召喚同伴（場上上限 12 隻）----
  if (e.skill === 'summon') {
    e.skCd = (e.skCd || 0) - dt;
    if (!e.aggro || e.skCd > 0) return;
    if (Game.enemies.length >= FOE_MAX_LIVE) { e.skCd = 2; return; }
    e.skCd = 7 + Math.random() * 3;
    const opts = ['up', 'down', 'left', 'right'].filter(function (dn) {
      const d = DIRS[dn];
      return cellAt(cx + d.x, cy + d.y) === 0 && !bombAt(cx + d.x, cy + d.y);
    });
    if (!opts.length) return;
    const d = DIRS[pick(opts)];
    const kid = makeEnemy(cx + d.x, cy + d.y, e.type, 1, 1);
    kid.summoned = true;
    kid.hp = 1; kid.maxHp = 1;
    kid.aggro = true;
    Game.enemies.push(kid);
    burst(kid.x, kid.y, e.color, 14, 150);
    AudioSys.sfx('item');
    return;
  }

  // ---- A. 撿彈怪：撿起炸彈再丟回去 ----""", 1, 'skill-new')

# ---------------------------------------------------------------
# 4. 元素彈 / 陣風 / 死亡分裂 / 瞬移
# ---------------------------------------------------------------
rep("""// BOSS 專用：自己的炸彈（owner 為 null）對自己無害，不列入危險""",
"""// ===== v4.36：小怪的元素彈（吐彈／落雷都用這個）=====
const BOLT_COLOR = {
  fire: '#ff9a3c', ice: '#a8ecff', thunder: '#fff28a', dark: '#b06ef7',
  water: '#7fd0ff', wind: '#d8fff4', neon: '#58f0d8', poison: '#b6f06a',
  earth: '#dcb877', nature: '#9be15d'
};
function foeCastBolt(e, tcx, tcy) {
  const T = Game.T;
  if (!Game.bolts) Game.bolts = [];
  if (Game.bolts.length > 18) Game.bolts.shift();
  // 落點不能是硬牆；軟磚就炸掉它
  if (cellAt(tcx, tcy) === 1) return false;
  const kind = e.fx || 'fire';
  Game.bolts.push({
    sx: e.x, sy: e.y - (e.r || 12) * .5,
    tx: tcx * T + T / 2, ty: tcy * T + T / 2,
    cx: tcx, cy: tcy, t: 0, dur: .55, kind: kind, owner: e
  });
  AudioSys.sfx('throw');
  return true;
}
function updateBolts(dt) {
  if (!Game.bolts || !Game.bolts.length) return;
  const T = Game.T;
  for (let i = Game.bolts.length - 1; i >= 0; i--) {
    const b = Game.bolts[i];
    b.t += dt;
    if (b.t < b.dur) continue;
    Game.bolts.splice(i, 1);
    const col = BOLT_COLOR[b.kind] || '#ffb347';
    burst(b.tx, b.ty, col, 14, 175);
    // 軟磚被打碎
    if (cellAt(b.cx, b.cy) === 2) { destroySoft(b.cx, b.cy); continue; }
    // 站在落點上的人受傷
    Game.players.forEach(function (p) {
      if (!p || !p.alive || p.invuln > 0) return;
      if (Math.floor(p.x / T) !== b.cx || Math.floor(p.y / T) !== b.cy) return;
      if (Game.mode === 'battle') killBattlePlayer(p, b.owner);
      else killPlayer(p, false, b.owner);
    });
  }
}
// 風系：把玩家往後推一格（撞牆就不推）
function foeGust(e, p) {
  const T = Game.T;
  const dx = Math.sign(p.x - e.x), dy = Math.sign(p.y - e.y);
  const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);
  const sx = Math.abs(p.x - e.x) > Math.abs(p.y - e.y) ? dx : 0;
  const sy = sx ? 0 : dy;
  if (!sx && !sy) return;
  if (cellAt(cx + sx, cy + sy) !== 0 || bombAt(cx + sx, cy + sy)) return;
  p.x = (cx + sx) * T + T / 2;
  p.y = (cy + sy) * T + T / 2;
  p.slide = null;
  burst(p.x, p.y, '#d8fff4', 12, 140);
  AudioSys.sfx('throw');
}
// 瞬移／鑽地：從玩家附近的空格冒出來
function foeBlinkTo(e) {
  const T = Game.T;
  const cx = Math.floor(e.x / T), cy = Math.floor(e.y / T);
  const tgt = nearestPlayerTo(e, T * 8);
  let tx = cx, ty = cy;
  if (tgt) {
    const pcx = Math.floor(tgt.x / T), pcy = Math.floor(tgt.y / T);
    const cand = [];
    for (let r = 1; r <= 3; r++) {
      [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, r], [r, -r], [-r, -r]].forEach(function (v) {
        const x = pcx + v[0], y = pcy + v[1];
        if (x < 1 || y < 1 || x > Game.cols - 2 || y > Game.rows - 2) return;
        if (cellAt(x, y) !== 0 || bombAt(x, y)) return;
        cand.push([x, y]);
      });
      if (cand.length) break;
    }
    if (cand.length) { const c = pick(cand); tx = c[0]; ty = c[1]; }
  }
  burst(e.x, e.y, e.fx === 'earth' ? '#d9b077' : '#c79bff', 12, 140);
  e.x = tx * T + T / 2;
  e.y = ty * T + T / 2;
  e.dirT = 0;
  burst(e.x, e.y, e.fx === 'earth' ? '#d9b077' : '#c79bff', 14, 150);
  AudioSys.sfx('warp');
}
// 死亡時的特殊行為（目前只有分裂）
function foeOnDeath(e) {
  if (!e || !e.spec) return;
  const kit = foeKit(e.spec);
  if (kit.skill !== 'split' || e.isSplit) return;
  const T = Game.T;
  if (Game.enemies.length >= FOE_MAX_LIVE) return;      // 場上上限，避免爆量
  const cx = Math.floor(e.x / T), cy = Math.floor(e.y / T);
  let n = 0;
  ['left', 'right', 'up', 'down'].forEach(function (dn) {
    if (n >= 2 || Game.enemies.length >= FOE_MAX_LIVE) return;
    const d = DIRS[dn];
    const x = cx + d.x, y = cy + d.y;
    if (cellAt(x, y) !== 0 || bombAt(x, y)) return;
    const kid = makeEnemy(x, y, e.spec, 1, 1);
    kid.hp = 1; kid.maxHp = 1; kid.isSplit = true;
    kid.r = (e.r || 14) * .74;
    kid.aggro = true;
    Game.enemies.push(kid);
    burst(kid.x, kid.y, e.color, 10, 120);
    n++;
  });
}

// BOSS 專用：自己的炸彈（owner 為 null）對自己無害，不列入危險""", 1, 'bolts')

# ---------------------------------------------------------------
# 5. updateEnemy：瞬移中不動、不畫（damage 也要免疫）
# ---------------------------------------------------------------
rep("""  const stunned = e.dizzy > 0;
  if (stunned) { e.dizzy -= dt; enemyFlameDamage(e, dt); return; }   // v1.9：被炸彈砸到 → 暈 1 秒不動""",
"""  // v4.36：鑽地／瞬移中 → 消失在原地（無敵、不能動），時間到從玩家附近冒出來
  if (e.blinkT > 0) {
    e.blinkT -= dt;
    if (e.blinkT <= 0) { e.blinkT = 0; foeBlinkTo(e); }
    return;
  }
  const stunned = e.dizzy > 0;
  if (stunned) { e.dizzy -= dt; enemyFlameDamage(e, dt); return; }   // v1.9：被炸彈砸到 → 暈 1 秒不動""", 1, 'updateEnemy-blink')

# ---------------------------------------------------------------
# 6. 更新迴圈：updateBolts（放在火焰之後、玩家判定之前）
# ---------------------------------------------------------------
rep("""  // 火焰燒到恐龍蛋 → 蛋被炸掉（道具則不會消失，只會被震一下）""",
"""  // v4.36：小怪的元素彈
  updateBolts(dt);
  // 火焰燒到恐龍蛋 → 蛋被炸掉（道具則不會消失，只會被震一下）""", 1, 'updateBolts-call')

# ---------------------------------------------------------------
# 7. 清掉死亡敵人時觸發分裂
# ---------------------------------------------------------------
rep("""  // 清掉死亡敵人
  for (let i = Game.enemies.length - 1; i >= 0; i--) {
    if (Game.enemies[i].dead) Game.enemies.splice(i, 1);
  }""",
"""  // 清掉死亡敵人（v4.36：先跑一次死亡行為，例如分裂）
  for (let i = Game.enemies.length - 1; i >= 0; i--) {
    if (Game.enemies[i].dead) {
      const de = Game.enemies[i];
      Game.enemies.splice(i, 1);
      try { foeOnDeath(de); } catch (err) {}
    }
  }""", 1, 'cleanup-split')

# ---------------------------------------------------------------
# 8. 繪製：元素特效 ＋ 元素彈
# ---------------------------------------------------------------
rep("""  // ---------- 10 種小怪的外型（有翅膀的飛、沒翅膀的走） ----------
  drawEnemyArt(e, x, y, flash, wob);""",
"""  // ---------- 10 種小怪的外型（有翅膀的飛、沒翅膀的走） ----------
  // v4.36：鑽地／瞬移中 → 只留一圈殘影，看不到本體
  if (e.blinkT > 0) {
    ctx.fillStyle = 'rgba(160,140,220,.28)';
    ctx.beginPath(); ctx.ellipse(x, y + ar * .5, ar * .5, ar * .16, 0, 0, 6.283); ctx.fill();
    return;
  }
  drawFoeElement(e, x, y, ar, flash, 'back');
  drawEnemyArt(e, x, y, flash, wob);
  drawFoeElement(e, x, y, ar, flash, 'front');""", 1, 'draw-aura-call')

rep("""  // 敵人
  Game.enemies.forEach(function (e) { drawEnemy(e, T); });""",
"""  // v4.36：小怪的元素彈（畫在敵人下面，才不會蓋住臉）
  if (Game.bolts && Game.bolts.length) drawBolts(T);
  // 敵人
  Game.enemies.forEach(function (e) { drawEnemy(e, T); });""", 1, 'draw-bolts-call')

# ---------------------------------------------------------------
# 9. 圖鑑文字：把習性／技能／元素接上去
# ---------------------------------------------------------------
rep("""function foeDesc(id) {
  for (let i = 0; i < HELP_FOES.length; i++) {
    if (HELP_FOES[i].id === id) return hp(HELP_FOES[i].d);
  }
  const sp = speciesOf(id), tr = foeTier(id);
  let s = sp.wing ? '飛在空中（可以越過牆壁），' : '走在地上（會被牆擋住），';
  s += sp.kind === 'chase' ? '會主動追人' : '自己亂走';
  if (sp.skill === 'scavenger') s += '，還會把你放的炸彈撿起來丟回去';
  else if (sp.skill === 'sapper') s += '，會拆掉附近的炸彈';
  else if (sp.skill === 'bomber') s += '，自己會放炸彈（火焰只有 1 格）';
  else if (sp.skill === 'smart') s += '，還會找掩體躲炸彈';
  s += tr === 'high' ? '。被盯上會先蓄力再加速撲過來 —— 不好惹。'
    : tr === 'mid' ? '。被盯上會先生氣、再加速撲過來。'
      : '。節奏慢，適合練手感。';
  return s;
}""",
"""function foeDesc(id) {
  let s = '';
  for (let i = 0; i < HELP_FOES.length; i++) {
    if (HELP_FOES[i].id === id) { s = hp(HELP_FOES[i].d); break; }
  }
  if (!s) {
    const sp = speciesOf(id), tr = foeTier(id);
    s = sp.wing ? '飛在空中（可以越過牆壁），' : '走在地上（會被牆擋住），';
    s += sp.kind === 'chase' ? '會主動追人' : '自己亂走';
    if (sp.skill === 'scavenger') s += '，還會把你放的炸彈撿起來丟回去';
    else if (sp.skill === 'sapper') s += '，會拆掉附近的炸彈';
    else if (sp.skill === 'bomber') s += '，自己會放炸彈（火焰只有 1 格）';
    else if (sp.skill === 'smart') s += '，還會找掩體躲炸彈';
    s += tr === 'high' ? '。被盯上會先蓄力再加速撲過來 —— 不好惹。'
      : tr === 'mid' ? '。被盯上會先生氣、再加速撲過來。'
        : '。節奏慢，適合練手感。';
  }
  // v4.36：每一隻的個人習性＋特殊技能＋元素（跟實際行為同一份資料）
  return s + foeKitText(id);
}""", 1, 'foeDesc')

# ---------------------------------------------------------------
# 10. Game 物件補 bolts
# ---------------------------------------------------------------
rep("""  players: [], enemies: [], bombs: [], flames: [], items: [], eggs: [], particles: [], bubbles: [],""",
"""  players: [], enemies: [], bombs: [], flames: [], items: [], eggs: [], particles: [], bubbles: [],
  bolts: [],                                  // v4.36：小怪的元素彈（吐彈／落雷）""", 1, 'game-bolts')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('\nDONE  chars %d -> %d' % (len(orig), len(s)))
