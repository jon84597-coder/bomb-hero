# -*- coding: utf-8 -*-
import io, os

def patch(p, pairs):
    s = io.open(p, encoding='utf-8').read()
    for a, b in pairs:
        c = s.count(a)
        assert c == 1, (p, c, a[:70])
        s = s.replace(a, b, 1)
    io.open(p + '.tmp', 'w', encoding='utf-8', newline='\n').write(s.replace('\r\n', '\n'))
    os.replace(p + '.tmp', p)
    print('ok', p)

# ① v480：每日關卡改成「非 BOSS 的一般關卡」（40 關制共 32 個）
patch('test/verify-v480.js', [
    ("//   ① 每日挑戰：日期→種子→關卡（1~31），規則固定（普通難度／3 分鐘），同一天同一張圖",
     "//   ① 每日挑戰：日期→種子→關卡（1~40 之間的一般關卡，跳過 BOSS 決戰場），規則固定（普通難度／3 分鐘），同一天同一張圖"),
    ("""for (let d = 1; d <= 28; d++) {
  const key = '2026-03-' + (d < 10 ? '0' + d : d);
  const s = P.dailyStageOf(P.dailySeedOf(key));
  if (!(s >= 1 && s <= 31)) stageOk = false;
  stages[s] = 1;
}
ok(stageOk, '任何一天的關卡都落在 1~31（第 32 關是純魔王關，不排每日）');""",
     """/* v5.39：40 關制下每日只排「一般關卡」—— 每章第 5 關是 BOSS 決戰場，
   排進每日會變成一場純打王，所以跳過（1~40 內非 5 的倍數）。 */
for (let d = 1; d <= 28; d++) {
  const key = '2026-03-' + (d < 10 ? '0' + d : d);
  const s = P.dailyStageOf(P.dailySeedOf(key));
  if (!(s >= 1 && s <= 40) || P.isBossStage(s)) stageOk = false;
  stages[s] = 1;
}
ok(stageOk, '任何一天的關卡都落在 1~40 且不是 BOSS 決戰場');"""),
])

# ② v502：brStage 改成 5 的倍數（40 關制的魔王關）
patch('test/verify-v502.js', [
    ("ok(got.every(function (e) { return e.brStage % 4 === 0; }), 'brStage 落在魔王關（4 的倍數）');",
     "ok(got.every(function (e) { return e.brStage % 5 === 0; }), 'brStage 落在魔王關（40 關制：5 的倍數）');\n"
     "  ok(got.every(function (e) { return P.isBossStage(e.brStage) && P.chapterOf(e.brStage) === e.brBlock; }), 'brStage 的章節與美術區塊一致');"),
])

# ③ v520：全破門檻改成 SOLO_STAGES
patch('test/verify-v520.js', [
    ("head('④ R6：32 關全破有成績單');", "head('④ R6：40 關全破有成績單');"),
    ("ok(html.indexOf('if (cleared >= 32) { try { RpgUI.finish(); }') > 0, '第 32 關過關會觸發成績單');",
     "ok(html.indexOf('if (cleared >= SOLO_STAGES) { try { RpgUI.finish(); }') > 0, '第 40 關（最後一關）過關會觸發成績單');"),
])
