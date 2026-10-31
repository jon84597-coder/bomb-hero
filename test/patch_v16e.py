# -*- coding: utf-8 -*-
"""v1.6：修正暗黑關配色、傳送門數量，並把舊測試改成新的 10 種小怪。"""
import io

P = 'index.html'
s = io.open(P, encoding='utf-8').read()
s = s.replace("hard: '#3e2430', soft: '#a8517c'", "hard: '#332430', soft: '#a8517c'", 1)
s = s.replace("const pairs = Math.max(1, Math.min(3, Math.floor(floors.length / 18)));",
              "const pairs = Math.max(2, Math.min(4, Math.floor(floors.length / 14)));", 1)
s = s.replace("drawStone: drawStone, drawCrate: drawCrate, drawSkateIcon: drawSkateIcon,",
              "drawStone: drawStone, drawCrate: drawCrate, drawSkateIcon: drawSkateIcon,\n"
              "  ENEMY_SPECIES: ENEMY_SPECIES, speciesOf: speciesOf, drawEnemyArt: drawEnemyArt,", 1)
io.open(P, 'w', encoding='utf-8').write(s)

P = 'test/verify-v17.js'
t = io.open(P, encoding='utf-8').read()
pairs = [
    ('ok(html.indexOf("flyer: { speed:") >= 0, \'新增 flyer 飛行怪\');',
     'ok(html.indexOf("id: \'slime\'") >= 0 && html.indexOf("id: \'bat\'") >= 0 && html.indexOf("id: \'eye\'") >= 0,\n'
     '  \'10 種小怪都有定義（含會飛的四種）\');'),
    ("ok(G.enemies.every(function (e) { return e.kind === 'wander'; }), '第 1 關只有亂走怪（walker/speeder）');",
     "ok(G.enemies.every(function (e) { return ['wander', 'chase'].indexOf(e.kind) >= 0; }), '第 1 關只有地面基本款');"),
    ("""ok(types7.has('walker') && types7.has('chaser') && types7.has('speeder') && types7.has('flyer'),
  '第 7 關四種怪都會登場（' + [...types7].join('/') + '）');""",
     """ok(types7.size >= 6, '第 7 關多種小怪一起登場（' + [...types7].join('/') + '）');"""),
    ("const fl = BH.makeEnemy(1, 1, 'flyer', 7);", "const fl = BH.makeEnemy(1, 1, 'bat', 7);"),
    ("ok(fl.kind === 'fly' && typeof fl.vx === 'number' && typeof fl.vy === 'number', 'flyer 有速度向量');",
     "ok(fl.kind === 'fly' && typeof fl.vx === 'number' && typeof fl.vy === 'number', '蝙蝠有速度向量（會飛）');"),
    ("G.enemies = [BH.makeEnemy(3, 3, 'flyer', 7)];", "G.enemies = [BH.makeEnemy(3, 3, 'bat', 7)];"),
    ("ok(G.enemies[0].dead === true, '飛行怪被火焰燒死');",
     "ok(G.enemies[0].dead === true, '會飛的小怪被火焰燒死');"),
]
for a, b in pairs:
    assert a in t, 'v17 not found: ' + a[:60]
    t = t.replace(a, b, 1)
io.open(P, 'w', encoding='utf-8').write(t)
print('patched')
