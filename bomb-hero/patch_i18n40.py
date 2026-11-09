# -*- coding: utf-8 -*-
# v5.73：把 32 關時代殘留的 i18n 文案改成 40 關制（8 章 × 5 關 = 32 張手工地圖 + 8 座決戰場）
import io, os, sys

P = 'js/i18n-src.js'
p = P
s = io.open(p, encoding='utf-8', newline='').read()
assert '\r\n' not in s, '檔案不是純 LF！'

NEW = {
 'home.adv.sub': '單人 40 關 · RPG 養成|单人 40 关 · RPG 养成|40 levels · RPG growth|全40面 · RPG育成|40개 · RPG 육성',
 'adv.solo': '🎯 單人闖關（40 關）|🎯 单人闯关（40 关）|🎯 Solo Quest (40 levels)|🎯 一人で挑戦（全40面）|🎯 싱글 모험(40 스테이지)',
 'home.solo.sub': '40 關 · 難度自選|40 关 · 难度可选|40 levels · any difficulty|全40面 · 難易度自由|40개 · 난이도 자유',
 'end.t': '40 關全破！|40 关全破！|All 40 stages cleared!|40 ステージ制覇！|40 스테이지 클리어!',
 'rpg.sub': '四維屬性 · 血量防禦 · 40 關|四维属性 · 血量防御 · 40 关|4 attributes · HP & armor · 40 stages|4つの能力値 · HPと防御 · 全40面|4대 능력치 · HP와 방어 · 40 스테이지',
 'tip.rpg.3': '每 5 關一隻章節王，第 40 關是最終魔王——王有專屬招式，看頭上的 💥／⚡ 決定要閃還是打斷。|每 5 关一只章节王，第 40 关是最终魔王——王有专属招式，看头上的 💥／⚡ 决定要闪还是打断。|A chapter boss every 5 stages; stage 40 is the final one. Watch the 💥/⚡ icon above it — dodge or interrupt.|5 ステージごとに章ボス、40 がラスボス。頭上に出る 💥／⚡ で避けるか中断するかを判断。|5스테이지마다 챕터 보스, 40스테이지가 최종 보스입니다. 머리 위 💥／⚡ 표시를 보고 회피할지 끊을지 판단하세요.',
 'z213': '40 關（32 張手工地圖 ＋ 8 座決戰場）|40 关（32 张手工地图 ＋ 8 座决战場）|40 stages (32 maps + 8 boss arenas)|全40面（32枚のマップ＋8つの決戦場）|40 스테이지(32개 맵 + 8개 결전장)',
 'z214': '每一章的第 5 關是魔王決戰場，第 40 關＝最終魔王「魔王之間」。|每一章的第 5 关是魔王决战場，第 40 关＝最终魔王“魔王之间”。|The 5th stage of each chapter is a boss arena; stage 40 is the final boss, the Demon Lord\'s Chamber.|各章の5面目がボス決戦場、40面が最終ボス「魔王の間」。|각 장의 5번째가 보스 결전장, 40스테이지=최종 보스 «마왕의 방».',
 'z149': '單人闖關共 <b>40 關</b>：8 大主題各 5 關（4 張手工地圖 ＋ 1 座魔王決戰場），每一章的第 5 關是 BOSS 決戰場；關卡越後面機關越多、怪物越兇。|单人闯关共 <b>40 关</b>：8 大主题各 5 关（4 张手工地图 ＋ 1 座魔王决战場），每一章的第 5 关是 BOSS 决战場；关卡越后面机关越多、怪物越凶。|Solo has <b>40 stages</b>: 8 chapters of 5 (4 hand-made maps + 1 boss arena), and the 5th stage of each chapter is a boss arena. Later stages bring more hazards and nastier monsters.|ソロは全 <b>40 面</b>。8テーマ各5面（手作りマップ4枚＋ボス決戦場1つ）で、各章の5面目がボス決戦場です。後半ほどギミックが増え、敵も凶暴になります。|솔로는 총 <b>40 스테이지</b>. 8테마 각 5스테이지(수작업 맵 4장 + 보스 결전장 1개)이며, 각 장의 5번째가 보스 결전장입니다. 뒤로 갈수록 장치가 늘고 몬스터가 사나워집니다.',
 'help.br.boss': '🦖 <b>亂入 BOSS（v4.77 新）</b>：場上會有 2 隻從 40 關隨機抽來的 BOSS 到處亂走。<b>打死牠最後一下的人直接騎上恐龍</b>（不用撿蛋）—— 多一層護盾，還能吐火，火力立刻翻一倍。|🦖 <b>乱入 BOSS（v4.77 新）</b>：场上会有 2 只从 40 关随机抽来的 BOSS 到处乱走。<b>打死它最后一下的人直接骑上恐龙</b>（不用捡蛋）—— 多一层护盾，还能吐火，火力立刻翻一倍。|🦖 <b>Roaming boss (new in v4.77)</b>: 2 bosses picked at random from the 40 stages wander the map. <b>Whoever lands the last hit mounts the dino right away</b> (no egg needed) — a free shield plus flame breath, so your firepower doubles instantly.|🦖 <b>乱入ボス（v4.77 新）</b>：40面からランダムに選ばれたボスが2体うろつきます。<b>最後の一撃を入れた人がそのまま恐竜に騎乗</b>（卵不要）—— シールド1枚＋火吹きで火力が倍に。|🦖 <b>난입 BOSS (v4.77 신규)</b>: 40개 스테이지에서 무작위로 뽑힌 BOSS 2마리가 돌아다닙니다. <b>마지막 일격을 넣은 사람이 바로 공룡에 탑승</b>(알 필요 없음) — 보호막 하나에 불뿜기까지, 화력이 두 배.',
 'doc.97': '跟一般闖關完全不同的養成規則：怪物有血量與防禦，炸一次不會死；你自己也有生命與護甲。先配點、再出發，一路打過 40 關。|跟一般闯关完全不同的养成规则：怪物有血量与防御，炸一次不会死；你自己也有生命与护甲。先配点、再出发，一路打过 40 关。|Progression rules completely unlike the normal campaign: monsters have HP and defence, so one blast will not kill them, and you also have HP and armour. Allocate points first, then set out and fight through all 40 stages.|通常の攻略とはまったく違う育成ルールです。敵には HP と防御があり、1回の爆発では倒せません。自分にも HP とアーマーがあります。まずポイントを振ってから出発し、40面を進んでいきます。|일반 스테이지와 전혀 다른 육성 규칙입니다. 적에게 HP와 방어력이 있어 한 번의 폭발로는 죽지 않으며, 자신도 HP와 방어력을 가집니다. 먼저 포인트를 배분한 뒤 출발해 40 스테이지를 통과합니다.',
}

lines = s.split('\n')
done = {}
for i, ln in enumerate(lines):
    if '|' not in ln:
        continue
    k = ln.split('|', 1)[0]
    if k in NEW:
        if k in done:
            print('!! 重複 key: ' + k); sys.exit(1)
        lines[i] = k + '|' + NEW[k]
        done[k] = i

missing = [k for k in NEW if k not in done]
if missing:
    print('!! 找不到 key: ' + ', '.join(missing)); sys.exit(1)

out = '\n'.join(lines)
assert out.count('\r') == 0
io.open(p + '.tmp', 'w', encoding='utf-8', newline='\n').write(out)
os.replace(p + '.tmp', p)
print('OK 改了 %d 條 i18n' % len(done))
for k in NEW:
    print('  ·', k, '→ 第', done[k] + 1, '行')
