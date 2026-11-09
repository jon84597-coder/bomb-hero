# -*- coding: utf-8 -*-
"""v5.73 patch N: i18n 字典（深淵 / 每週挑戰 / 每日特惠 / 新手 / 今日進度）"""
import io, os

P = os.path.join(os.path.dirname(__file__), 'bomb-hero', 'js', 'i18n-src.js')
s = io.open(P, 'r', encoding='utf-8', newline='').read()
o = len(s)

ROWS = [
 ("abyss.layer", "第 {n} 層", "第 {n} 层", "Layer {n}", "第 {n} 層", "{n}층"),
 ("abyss.layerSub", "目前最深 {best} 層", "目前最深 {best} 层", "Deepest so far: {best}", "最深記録 {best} 層", "최고 기록 {best}층"),
 ("abyss.layerShort", "{n} 層", "{n} 层", "Lv.{n}", "{n} 層", "{n}층"),
 ("abyss.bestShort", "最深 {n} 層", "最深 {n} 层", "Best {n}", "最深 {n} 層", "최고 {n}층"),
 ("abyss.newBest", "🕳️ 新紀錄！第 {n} 層", "🕳️ 新纪录！第 {n} 层", "🕳️ New record! Layer {n}", "🕳️ 新記録！第 {n} 層", "🕳️ 신기록! {n}층"),
 ("abyss.over", "🕳️ 深淵止步第 {n} 層", "🕳️ 深渊止步第 {n} 层", "🕳️ The abyss stops at layer {n}", "🕳️ 深淵は第 {n} 層で終了", "🕳️ 심연은 {n}층에서 끝났습니다"),
 ("abyss.bestLine", "你的最深紀錄：第 {n} 層", "你的最深纪录：第 {n} 层", "Your deepest run: layer {n}", "あなたの最深記録：第 {n} 層", "최고 기록: {n}층"),
 ("abyss.retry", "🕳️ 再挑戰一次", "🕳️ 再挑战一次", "🕳️ Dive again", "🕳️ もう一度挑戦", "🕳️ 다시 도전"),
 ("abyss.locked", "深淵要 40 關全破之後才會開啟", "深渊要 40 关全破之后才会开启", "The Abyss opens after clearing all 40 stages", "深淵は 40 ステージ全クリアで解放", "심연은 40 스테이지 완주 후 열립니다"),
 ("abyss.needMore", "還差 {n} 關全破", "还差 {n} 关全破", "{n} more stages to go", "あと {n} ステージ", "{n} 스테이지 남음"),
 ("wk.title", "本週限制挑戰", "本周限制挑战", "Weekly Challenge", "今週の制限チャレンジ", "주간 제한 챌린지"),
 ("wk.mod.fuse", "引信固定 +60%，不能靠強化縮短", "引信固定 +60%，不能靠强化缩短", "Fuse is fixed at +60% — upgrades can't shorten it", "導火線は固定 +60%（強化で短縮不可）", "도화선 고정 +60% (강화로 단축 불가)"),
 ("wk.mod.nopet", "不能帶隨從上場", "不能带随从上场", "No companions allowed", "仲間は連れて行けません", "동료 없이 도전"),
 ("wk.mod.noitem", "場上沒有補給道具", "场上没有补给道具", "No items spawn on the map", "マップにアイテムが出ません", "맵에 아이템이 없습니다"),
 ("wk.modName.fuse", "長引信", "长引信", "Long Fuse", "長い導火線", "긴 도화선"),
 ("wk.modName.nopet", "孤軍奮戰", "孤军奋战", "Lone Wolf", "単独行", "단독 행동"),
 ("wk.modName.noitem", "空手", "空手", "Empty Handed", "手ぶら", "맨손"),
 ("wk.stageLine", "第 {n} 關・{name}", "第 {n} 关・{name}", "Stage {n} · {name}", "第 {n} ステージ・{name}", "{n} 스테이지 · {name}"),
 ("wk.bestHave", "我的最佳 {t}", "我的最佳 {t}", "My best: {t}", "自己ベスト {t}", "내 최고 {t}"),
 ("wk.bestNone", "本週還沒挑戰", "本周还没挑战", "Not attempted this week", "今週はまだ未挑戦", "이번 주 미도전"),
 ("wk.go", "開始挑戰 →", "开始挑战 →", "Start challenge →", "チャレンジ開始 →", "도전 시작 →"),
 ("wk.empty", "本週還沒有人完成", "本周还没有人完成", "No one has finished this week", "今週のクリア者はいません", "이번 주 완료자 없음"),
 ("wk.rank", "本週第 {r} 名・{t}", "本周第 {r} 名・{t}", "Weekly #{r} · {t}", "今週 {r} 位・{t}", "주간 {r}위 · {t}"),
 ("wk.record", "本週紀錄 {t}", "本周纪录 {t}", "New weekly record {t}", "今週の記録 {t}", "주간 기록 {t}"),
 ("deal.title", "今日特惠", "今日特惠", "Today's Deals", "本日のお買い得", "오늘의 특가"),
 ("deal.sub", "每天換一批・每件限購一次", "每天换一批・每件限购一次", "Rotates daily · one per item", "毎日入れ替え・各1回限り", "매일 교체 · 품목당 1회"),
 ("deal.off", "−{n}%", "−{n}%", "−{n}%", "−{n}%", "−{n}%"),
 ("deal.done", "已購買", "已购买", "Bought", "購入済み", "구매 완료"),
 ("deal.lvup", "升級", "升级", "Upgrade", "強化", "업그레이드"),
 ("deal.bagN", "補給三件組", "补给三件组", "Supply Bundle ×3", "補給3点セット", "보급 3종 세트"),
 ("deal.ticketN", "大逃殺門票", "大逃杀门票", "Battle Royale ticket", "バトロワチケット", "배틀로얄 티켓"),
 ("deal.pet", "🎉 雇用成功！隨從會在關卡裡跟著你", "🎉 雇用成功！随从会在关卡里跟着你", "🎉 Hired! Your companion joins you in stages", "🎉 雇用成功！ステージで一緒に戦います", "🎉 고용 완료! 스테이지에서 함께합니다"),
 ("deal.petup", "🎉 升級完成！", "🎉 升级完成！", "🎉 Upgrade complete!", "🎉 強化完了！", "🎉 업그레이드 완료!"),
 ("deal.ticket", "🎟️ 買到 1 張大逃殺門票", "🎟️ 买到 1 张大逃杀门票", "🎟️ Got 1 Battle Royale ticket", "🎟️ バトロワチケットを1枚獲得", "🎟️ 배틀로얄 티켓 1장 획득"),
 ("deal.bag", "🎒 3 件補給已放進背包", "🎒 3 件补给已放进背包", "🎒 3 supplies added to your bag", "🎒 補給3点をバッグに入れました", "🎒 보급 3종을 가방에 넣었습니다"),
 ("starter.tip", "再通關 {n} 關，會解鎖更多模式", "再通关 {n} 关，会解锁更多模式", "Clear {n} more stages to unlock more modes", "あと {n} ステージで他のモードが解放", "{n} 스테이지 더 클리어하면 모드가 열립니다"),
 ("today.stage", "第 {n}/{m} 關", "第 {n}/{m} 关", "Stage {n}/{m}", "第 {n}/{m} 面", "{n}/{m} 스테이지"),
 ("today.stars", "★ {n}/{m}", "★ {n}/{m}", "★ {n}/{m}", "★ {n}/{m}", "★ {n}/{m}"),
 ("today.abyss", "深淵 {n} 層", "深渊 {n} 层", "Abyss {n}", "深淵 {n} 層", "심연 {n}층"),
]

body = ''.join('|'.join(r) + '\n' for r in ROWS)
A = "`;\n"
# 只替换最后一个（字典结尾）
idx = s.rfind(A)
assert idx > 0
s = s[:idx] + body + s[idx:]

assert s.count('\r\n') == 0, 'CRLF!'
tmp = P + '.tmp'
io.open(tmp, 'w', encoding='utf-8', newline='\n').write(s)
os.replace(tmp, P)
print('OK', o, '->', len(s), 'rows', len(ROWS))
