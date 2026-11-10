#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""v5.82：前期小怪不放招（第 1~2 關）＋第 3 關示範 3 隻會出招的小怪＋教學提示"""
import io, os, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(os.path.join(ROOT, 'bomb-hero'))

def rd(p):
    return io.open(p, encoding='utf-8', newline='').read()

def wr(p, s):
    t = p + '.tmp'
    io.open(t, 'w', encoding='utf-8', newline='').write(s)
    os.replace(t, p)

def rep(s, a, b, tag):
    n = s.count(a)
    if n != 1:
        print('!! anchor %s hit %d' % (tag, n)); sys.exit(1)
    return s.replace(a, b)

# ---------------- 1. main.js ----------------
p = 'js/main.js'
s = rd(p)

HELPERS = '''// ====
//   v5.82：小怪招式「開放階梯」
//   玩家回報：新手第 1 關就被吐彈／鑽地追著打，難度一下跳太高，還以為遊戲壞了。
//   原因很具體 —— 第 1 章 6 隻小怪<b>每一隻都有招式</b>（史萊姆分裂、蹦蹦兔衝撞、
//   小青蛙吐彈、毛毛蟲鑽地、毒菇怪毒地板、鐵甲蟲躲炸彈），等於一開場招式全開。
//   現在：
//     · 第 1~2 關：完全不放招（連鑽地／吐彈／躲炸彈都關掉，只剩「會走、會撞」）
//     · 第 3 關　：示範關 —— 全場只留 3 隻會出招（吐彈／鑽地／衝撞各一隻），
//                  開場跳教學卡，教玩家看警示圈、往左右閃
//     · 第 4 關起：照舊全部開放
//   只影響「單人闖關」；對戰／大逃殺／RPG／深淵／魔王連戰／限制挑戰一律維持原樣。
//   ※ 看的是 Game.stage（這一輪的第幾關），不是 makeEnemy 的 stage 參數
//     （那個是成長等級＝章節 1~8，兩者不能混用）。
// ====
const FOE_SKILL_DEMO_TYPES = ['frog', 'cater', 'bunny'];   // 示範關：吐彈／鑽地／衝撞各一隻
const FOE_SKILL_DEMO_MAX = 3;                             // 示範關最多幾隻會出招
function foeSkillStageMode(stage) {
  const s = (stage | 0) || 1;
  if (s <= 2) return 'none';
  if (s === 3) return 'demo';
  return 'all';
}
// 這一輪的關號；不是「單人闖關」就回 0（＝不限制）
function foeSkillRunStage() {
  if (typeof Game === 'undefined' || !Game) return 0;
  if (Game.mode !== 'solo') return 0;
  if (Game.rpg || Game.bossRush || Game.abyss || Game.wchal || Game.mapTest) return 0;
  return Game.stage | 0;
}
// 這一隻小怪現在能不能有招式
function foeSkillOn(type) {
  const st = foeSkillRunStage();
  if (!st) return true;                          // 其他模式：照舊
  const m = foeSkillStageMode(st);
  if (m === 'all') return true;
  if (m === 'none') return false;                // 第 1~2 關：一律不放招
  if (FOE_SKILL_DEMO_TYPES.indexOf(type) < 0) return false;
  // 示範關：場上最多 3 隻（含已經生出來的），多的同名怪不會再拿到招式
  let n = 0;
  const list = (Game && Game.enemies) || [];
  for (let i = 0; i < list.length; i++) {
    const o = list[i];
    if (o && o.demoSkill && !o.dead) n++;
  }
  return n < FOE_SKILL_DEMO_MAX;
}
function foeSkillTeachStage() { return foeSkillRunStage() === 3; }
// 開場卡多一行「這一關開始小怪會出招」
function foeSkillIntroSub() {
  if (!foeSkillTeachStage()) return '';
  return '\\n⚠️ ' + t('foe.teachSub');
}
// 開場卡的三條教學（吐彈／鑽地／衝撞各一條）
function foeSkillIntroTips() {
  if (!foeSkillTeachStage()) return null;
  const out = [];
  for (let i = 1; i <= 3; i++) {
    const k = 'foe.teach' + i;
    const v = t(k);
    if (v && v !== k) out.push(v);
  }
  return out.length ? out : null;
}
// 倒數結束、真的能動之後才跳（開場說明是全螢幕遮罩，太早跳會被蓋掉）
function foeSkillIntroBanner() {
  if (!foeSkillTeachStage()) return;
  if (Game._foeSkillHinted === Game.stage) return;   // 同一關重試不重複講
  Game._foeSkillHinted = Game.stage;
  setTimeout(function () {
    try {
      if (Game.mode !== 'solo' || (Game.stage | 0) !== 3 || Game.state !== 'play') return;
      doorHintCard('⚠️', t('foe.teachCard'), t('foe.teachCardSub'), 4.2);
    } catch (e) {}
  }, 900);
}
function makeEnemy(x, y, type, stage, spdMul) {
  const M = spdMul || 1;'''

s = rep(s, 'function makeEnemy(x, y, type, stage, spdMul) {\n  const M = spdMul || 1;', HELPERS, 'makeEnemy head')

OLD_SKILL = '''  // v4.17：疾風蜥也會躲炸彈（跑最快的那隻不該傻傻撞火）
  if (sp.id === 'skull' || sp.id === 'crab' || sp.id === 'beetle' || sp.id === 'eye' ||
      sp.id === 'lizard') e.smart = true;   // v4.8：聰明小怪會找掩體躲炸彈
  // v4.13：技能（C 聰明躲炸彈 / A 撿彈 / B 拆彈 / D 放彈）
  if (sp.skill) e.skill = sp.skill;
  if (sp.skill === 'smart') e.smart = true;
  const kit = foeKit(sp.id);
  e.fx = kit.fx || '';
  e.habit = kit.habit || '';
  if (kit.skill) e.skill = kit.skill;
  if (kit.smart) e.smart = true;'''

NEW_SKILL = '''  // v5.82：招式開放階梯 —— 前兩關連「躲炸彈」都不給，第 3 關只留示範用的 3 隻
  const skOn = foeSkillOn(sp.id);
  // v4.17：疾風蜥也會躲炸彈（跑最快的那隻不該傻傻撞火）
  if (skOn) {
    if (sp.id === 'skull' || sp.id === 'crab' || sp.id === 'beetle' || sp.id === 'eye' ||
        sp.id === 'lizard') e.smart = true;   // v4.8：聰明小怪會找掩體躲炸彈
  }
  // v4.13：技能（C 聰明躲炸彈 / A 撿彈 / B 拆彈 / D 放彈）
  if (skOn && sp.skill) e.skill = sp.skill;
  if (skOn && sp.skill === 'smart') e.smart = true;
  const kit = foeKit(sp.id);
  e.fx = kit.fx || '';
  e.habit = kit.habit || '';
  if (skOn && kit.skill) e.skill = kit.skill;
  if (skOn && kit.smart) e.smart = true;
  // 示範關的那 3 隻 → 頭上一直掛 ❗，玩家才知道要盯哪幾隻（見 updateEnemy）
  if (skOn && e.skill && foeSkillStageMode(foeSkillRunStage()) === 'demo') e.demoSkill = true;'''

s = rep(s, OLD_SKILL, NEW_SKILL, 'makeEnemy skill block')

s = rep(s,
  "    const pool = types.slice();     // 先輪流出一輪，保證每種都登場",
  """    const pool = types.slice();     // 先輪流出一輪，保證每種都登場
    /* v5.82：示範關（第 3 關）把「會出招」的三種排到最前面 —— 前 3 隻一定看得到示範，
       後面的同名怪會因為 foeSkillOn 的「場上最多 3 隻」而拿不到招式。 */
    if (foeSkillStageMode(stage) === 'demo') {
      const first = FOE_SKILL_DEMO_TYPES.filter(function (id) { return types.indexOf(id) >= 0; });
      const rest = types.filter(function (id) { return first.indexOf(id) < 0; });
      pool.length = 0;
      first.concat(rest).forEach(function (id) { pool.push(id); });
    }""",
  'pool reorder')

s = rep(s,
  "  showOverlay({\n    title: ovT,\n    sub: ovS,\n    btn: abyssLv ? t('abyss.ovGo') : t('solo.ovGo'),\n    tips: ModeTip.tips(Game.rpg ? 'rpg' : 'solo'),",
  "  showOverlay({\n    title: ovT,\n    sub: ovS + foeSkillIntroSub(),\n    btn: abyssLv ? t('abyss.ovGo') : t('solo.ovGo'),\n    /* v5.82：第 3 關（示範關）改放「小怪會出招」的三條教學，蓋掉一般模式提示 */\n    tips: foeSkillIntroTips() || ModeTip.tips(Game.rpg ? 'rpg' : 'solo'),",
  'overlay tips')

s = rep(s,
  "    AudioSys.sfx('go');\n  }\n}",
  "    AudioSys.sfx('go');\n    try { foeSkillIntroBanner(); } catch (e) {}\n  }\n}",
  'countdown hook')

s = rep(s,
  "function updateEnemy(e, dt) {",
  """function updateEnemy(e, dt) {
  /* v5.82：示範關那 3 隻會出招的小怪，頭上一直掛著 ❗（每 2.6 秒續一次）。
     不這樣做的話玩家根本不知道「哪幾隻特別」—— 教學卡寫了也對不上。 */
  if (e.demoSkill && !e.dead) {
    e.markT = (e.markT || 0) - dt;
    if (e.markT <= 0) {
      e.markT = 2.6;
      try { bubbleSay(e, '\\u2757', 'dead', (e.r || 14) * 2 + 16); } catch (x) {}
    }
  }""",
  'updateEnemy demo mark')

s = rep(s,
  "  if (kit.skill !== 'split' || e.isSplit) return;",
  "  if (kit.skill !== 'split' || e.isSplit) return;\n  if (!foeSkillOn(e.spec)) return;      // v5.82：前兩關不放招 → 史萊姆也不分裂",
  'split gate')

s = rep(s, "const VERSION = '5.81';", "const VERSION = '5.82';", 'VERSION')

wr(p, s)
print('main.js ok, len', len(s))

# ---------------- 2. i18n ----------------
p = 'js/i18n-src.js'
s = rd(p)
anchor = "foe.skillName| <b>招式</b>：{x}。| <b>招式</b>：{x}。| <b>Move</b>: {x}.| <b>技</b>：{x}。| <b>기술</b>: {x}.\n"
assert s.count(anchor) == 1, s.count(anchor)
add = (
"foe.teachSub|⚠️ 這一關開始，小怪會使出招式（場上 3 隻，頭上有 ❗）|⚠️ 这一关开始，小怪会使出招式（场上 3 只，头上有 ❗）|⚠️ From this stage on, minions use moves (3 of them here, marked ❗)|⚠️ このステージから敵が技を使います（場に3体、頭上に ❗）|⚠️ 이 스테이지부터 잡몹이 기술을 씁니다 (3마리, 머리 위 ❗)\n"
"foe.teach1|🎯 吐彈：地上會先亮一個圈，圈鎖定後就不會再動 —— 走開就好|🎯 吐弹：地上会先亮一个圈，圈锁定后就不会再动 —— 走开就好|🎯 Spit shot: a ring lights up on the floor, then locks — just step away|🎯 弾吐き：床に輪が光り、止まったら動かない — 離れれば当たらない|🎯 탄 뱉기: 바닥에 원이 먼저 뜨고 고정됩니다 — 그냥 피하면 됩니다\n"
"foe.teach2|🌀 鑽地：小怪消失時地上會冒沙，0.5 秒後從你旁邊冒出來 —— 別站在沙圈上|🌀 钻地：小怪消失时地上会冒沙，0.5 秒后从你旁边冒出来 —— 别站在沙圈上|🌀 Burrow: it sinks in a puff of sand and pops out beside you 0.5s later — don't stand on the sand ring|🌀 潜り：砂を立てて消え、0.5秒後に近くから出てくる — 砂の輪に立たない|🌀 잠복: 모래를 일으키며 사라졌다가 0.5초 뒤 옆에서 나옵니다 — 모래 원 위에 서지 마세요\n"
"foe.teach3|💥 衝撞：身體一縮就往你的方向直線衝 —— 往左右閃，不要往後退|💥 冲撞：身体一缩就往你的方向直线冲 —— 往左右闪，不要往后退|💥 Charge: it crouches and rushes straight at you — dodge sideways, not backwards|💥 突進：身を縮めて直線的に突っ込む — 左右に避ける（後退は×）|💥 돌진: 몸을 움츠린 뒤 직선으로 돌진 — 옆으로 피하세요(뒤로는 X)\n"
"foe.teachCard|⚠️ 小怪開始會出招了|⚠️ 小怪开始会出招了|⚠️ Minions start using moves|⚠️ 敵が技を使い始めます|⚠️ 잡몹이 기술을 쓰기 시작합니다\n"
"foe.teachCardSub|看到地上的警示圈先走開；頭上有 ❗ 的 3 隻就是會出招的|看到地上的警示圈先走开；头上有 ❗ 的 3 只就是会出招的|Step off any warning ring; the 3 with ❗ above them are the casters|床の警告サークルから離れる。頭上に ❗ の3体が技を使う敵|바닥 경고 원에서 먼저 벗어나세요. 머리 위 ❗ 3마리가 기술을 씁니다\n"
)
s = s.replace(anchor, anchor + add)
wr(p, s)
print('i18n ok')

# ---------------- 3. index.html / package / sw ----------------
p = 'index.html'
s = rd(p)
assert s.count('<span id="verTxt">5.81</span>') == 1
assert s.count('<span id="verLogVer">5.81</span>') == 1
s = s.replace('<span id="verTxt">5.81</span>', '<span id="verTxt">5.82</span>')
s = s.replace('<span id="verLogVer">5.81</span>', '<span id="verLogVer">5.82</span>')
wr(p, s)
print('index.html ok')

p = '../package.json'
s = rd(p)
assert s.count('"version": "5.81.0"') == 1
wr(p, s.replace('"version": "5.81.0"', '"version": "5.82.0"'))
print('package.json ok')

for p in ['sw.js', '../public/sw.js', '../bomberman-online/public/sw.js', '../dist/site/sw.js']:
    s = rd(p)
    assert s.count("var SW_VERSION = 'v5.81.0';") == 1, p
    wr(p, s.replace("var SW_VERSION = 'v5.81.0';", "var SW_VERSION = 'v5.82.0';"))
    print('sw ok', p)

# ---------------- 4. version-log ----------------
p = 'js/version-log.js'
s = rd(p)
s = s.replace("    { v: '5.81', date: '2026-11-12', now: true, items: [",
              "    { v: '5.81', date: '2026-11-12', now: false, items: [", 1)
NEW = """    { v: '5.82', date: '2026-11-12', now: true, items: [
    '👾 <b>前兩關的小怪不會再放招式了（玩家回報：新手一開場就被打爆）</b>：第 1 章 6 隻小怪<b>每一隻都有招式</b>（分裂／衝撞／吐彈／鑽地／毒地板／躲炸彈），等於第一關就把所有招式一次倒給新手。現在 <b>第 1~2 關完全不放招</b> —— 連鑽地、吐彈、躲炸彈都關掉，只剩「會走、會撞」。',
    '🎓 <b>第 3 關是「招式示範關」</b>：全場只留 <b>3 隻</b>會出招的小怪（<b>吐彈／鑽地／衝撞</b>各一隻，頭上有 ❗），其餘照樣不會放招。進場先給一張教學卡，倒數結束再跳一次提示 —— 教玩家看<b>地上的警示圈</b>、<b>往左右閃</b>而不是往後退。',
    '🎯 <b>三種招式各教一次</b>：吐彈＝圈亮起來、鎖定後就不會再動（走開就好）；鑽地＝消失時冒沙、0.5 秒後從旁邊冒出（別站在沙圈上）；衝撞＝身體一縮就直線衝（往左右閃）。第 4 關起照舊全部開放。',
    '🛡️ <b>只動單人闖關</b>：對戰、大逃殺、RPG 養成、深淵、魔王連戰、限制挑戰的招式完全沒變 —— 那些模式的難度曲線是另外設計的。',
    '🧪 新增 <b>verify-v583</b>：第 1~2 關 0 隻有招式、第 3 關剛好 3 隻且是吐彈／鑽地／衝撞、第 4 關全開、其他模式不受影響、教學文案五語齊全。',
    '📦 SW v5.82.0。',
  ] },
"""
anchor = "window.__VERSION_LOG = [\n"
assert s.count(anchor) == 1
s = s.replace(anchor, anchor + NEW)
wr(p, s)
print('version-log ok')
