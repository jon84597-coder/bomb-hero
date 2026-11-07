# -*- coding: utf-8 -*-
import io, os
P = 'bomb-hero/index.html'
s = io.open(P, encoding='utf-8').read()
steps = []

def rep(a, b, n=1, tag=''):
    global s
    c = s.count(a)
    assert c == n, ('COUNT %d != %d :: %s :: %r' % (c, n, tag, a[:80]))
    s = s.replace(a, b, n)
    steps.append(tag or a[:24])

# ① RPG 選關：每章 4 關 → 每章 5 關（兩處）
rep("const st = RPG.theme * 4 + RPG.sub + 1;",
    "const st = RPG.theme * BOSS_SLOT + RPG.sub + 1;   /* v5.39：每章 5 關（含 BOSS），原本 ×4 會整章錯位 */",
    2, 'rpgSelectSt')

# ② RPG 預設解鎖關數
rep("  unlocked: 32     // 32 = 沒有雲端時全部開放",
    "  unlocked: SOLO_STAGES   // v5.39：沒有雲端時全部開放（40 關）", 1, 'rpgUnlocked')

# ③ RPG 怪物等級上限
rep("  const st = Math.max(1, Math.min(32, stage | 0 || 1));",
    "  const st = Math.max(1, Math.min(SOLO_STAGES, stage | 0 || 1));", 1, 'rpgFoeLv')

# ④ 冒險進度計數
rep("    return Math.max(0, Math.min(32, c));",
    "    return Math.max(0, Math.min(SOLO_STAGES, c));", 1, 'clearedCount')
rep("$id('charProgTxt').textContent = cr + ' / 32';",
    "$id('charProgTxt').textContent = cr + ' / ' + SOLO_STAGES;", 1, 'progTxt')

# ⑤ 角色頁的 8×4 進度格 → 8×5
rep("""        for (let k = 0; k < 4; k++) h += '<i class="' + (g * 4 + k + 1 <= cr ? 'on' : '') + '"></i>';""",
    """        for (let k = 0; k < BOSS_SLOT; k++) h += '<i class="' + (g * BOSS_SLOT + k + 1 <= cr ? 'on' : '') + '"></i>';""",
    1, 'progGrid')

# ⑥ 圖鑑魔王解鎖線（第 4／8… 關 → 第 5／10… 關）
rep("got: Codex.has('b', 'b' + i) || (RPG.cleared | 0) >= i * 4",
    "got: Codex.has('b', 'b' + i) || (RPG.cleared | 0) >= i * BOSS_SLOT", 1, 'codexBoss')

# ⑦ 全破判定
rep("if (cleared >= 32) { try { RpgUI.finish(); } catch (e2) {} }",
    "if (cleared >= SOLO_STAGES) { try { RpgUI.finish(); } catch (e2) {} }", 1, 'finishGate')

# ⑧ UI 文案
rep("\u55ae\u4eba 32 \u95dc \u00b7 RPG \u990a\u6210",
    "\u55ae\u4eba 40 \u95dc \u00b7 RPG \u990a\u6210", 1, 'btnAdventure')
rep("\u55ae\u4eba\u95d6\u95dc\uff0832 \u95dc\uff09",
    "\u55ae\u4eba\u95d6\u95dc\uff0840 \u95dc\uff09", 1, 'btnSolo')
rep('<b id="charProgTxt">0 / 32</b>', '<b id="charProgTxt">0 / 40</b>', 1, 'progHtml')

# ⑨ 每日／每週榜：40 關制下只能挑一般關卡（跳過 BOSS 關）
rep("""/* \u7a2e\u5b50 \u2192 \u4eca\u5929\u7684\u95dc\u5361\uff081~31\uff1b\u7b2c 32 \u95dc\u662f\u7d14\u9b54\u738b\u95dc\uff0c\u6392\u9032\u53bb\u53ea\u6703\u8b8a\u6210\u62bd\u5361\uff09 */
function dailyStageOf(seed) { return 1 + (((seed >>> 7) >>> 0) % 31); }""",
    """/* v5.39\uff1a40 \u95dc\u5236\u4e0b\u300c\u4e00\u822c\u95dc\u5361\u300d\u5171 32 \u95dc\uff08\u6bcf\u7ae0\u7b2c 5 \u95dc\u662f BOSS \u6c7a\u6230\u5834\uff09\u3002
   0~31 \u5c0d\u61c9\u5230\u975e BOSS \u7684\u95dc\u865f\uff0c\u7dad\u6301\u300c32 \u5f35\u5730\u5716\u8f2a\u6d41\u300d\u7684\u539f\u672c\u624b\u611f\u3002 */
function normalStageOf(k) {
  const i = ((k | 0) % 32 + 32) % 32;
  return Math.floor(i / 4) * BOSS_SLOT + (i % 4) + 1;
}
function dailyStageOf(seed) { return normalStageOf((seed >>> 7) >>> 0); }""",
    1, 'dailyStage')

rep("""        return 1 + ((((h >>> 0) >>> 9) % 31));""",
    """        return normalStageOf(((h >>> 0) >>> 9));""", 1, 'weekStage')
rep("// \u7528\u9031 key \u7576\u7a2e\u5b50 \u2192 \u6bcf\u9031\u63db\u4e00\u95dc\uff0832 \u95dc\u8f2a\u6d41\uff0c\u8b93\u820a\u5167\u5bb9\u6709\u7b2c\u4e8c\u6b21\u50f9\u503c\uff09",
    "// \u7528\u9031 key \u7576\u7a2e\u5b50 \u2192 \u6bcf\u9031\u63db\u4e00\u95dc\uff0832 \u5f35\u4e00\u822c\u5730\u5716\u8f2a\u6d41\uff0c\u8b93\u820a\u5167\u5bb9\u6709\u7b2c\u4e8c\u6b21\u50f9\u503c\uff09", 1, 'weekStageCmt')

# ⑩ 教學／說明文案
rep("""  d: { tw: '\u6bcf\u5927\u95dc\u7684\u7b2c 4 \u5f35\u5730\u5716\uff08\u7b2c 4\uff0f8\uff0f12 \u2026 32 \u95dc\uff09\u767b\u5834\uff0c\u4e5f\u53ef\u4ee5\u76f4\u63a5\u9078\u300c\u6311\u6230 BOSS\u300d\u3002""",
    """  d: { tw: '\u6bcf\u7ae0\u7684\u6700\u5f8c\u4e00\u95dc\uff08\u7b2c 5\uff0f10\uff0f\u2026\uff0f40 \u95dc\u7684 BOSS \u6c7a\u6230\u5834\uff09\u767b\u5834\uff0c\u4e5f\u53ef\u4ee5\u76f4\u63a5\u9078\u300c\u6311\u6230 BOSS\u300d\u3002""",
    1, 'helpBossTw')

rep("""\u6bcf\u5927\u5173\u7684\u7b2c 4 \u5f20\u5730\u56fe\uff08\u7b2c 4\uff0f8\uff0f12 \u2026 32 \u5173\uff09\u767b\u573a\uff0c\u4e5f\u53ef\u4ee5\u76f4\u63a5\u9009\u300c\u6311\u6218 BOSS\u300d\u3002""",
    """\u6bcf\u7ae0\u7684\u6700\u540e\u4e00\u5173\uff08\u7b2c 5\uff0f10\uff0f\u2026\uff0f40 \u5173\u7684 BOSS \u51b3\u6218\u573a\uff09\u767b\u573a\uff0c\u4e5f\u53ef\u4ee5\u76f4\u63a5\u9009\u300c\u6311\u6218 BOSS\u300d\u3002""",
    1, 'helpBossCn')

rep("""Appears on the 4th map of every chapter (stages 4/8/12 \u2026 32), or via Boss Raid.""",
    """Appears in the last stage of every chapter (stages 5/10/\u2026/40, the boss arena), or via Boss Raid.""",
    1, 'helpBossEn')

rep("""\u5171 <b>32 \u5f35\u5730\u5716</b>\uff088 \u5927\u4e3b\u984c \u00d7 4 \u5f35\uff09\uff0c\u6bcf\u4e00\u5340\u7684\u7b2c 4 \u5f35\u662f\u9b54\u738b\u95dc\uff0c\u7b2c 32 \u95dc\uff1d\u6700\u7d42\u9b54\u738b\u300c\u9b54\u738b\u4e4b\u9593\u300d\u3002""",
    """\u5171 <b>40 \u95dc</b>\uff088 \u5927\u4e3b\u984c \u00d7 4 \u5f35\u5730\u5716 \uff0b \u6bcf\u7ae0\u7b2c 5 \u95dc\u7684 BOSS \u6c7a\u6230\u5834\uff09\uff0c\u7b2c 40 \u95dc\uff1d\u6700\u7d42\u9b54\u738b\u300c\u9b54\u738b\u4e4b\u9593\u300d\u3002""",
    1, 'goalSoloTw')

rep("""\u5171 <b>32 \u5f20\u5730\u56fe</b>\uff088 \u5927\u4e3b\u9898 \u00d7 4 \u5f20\uff09\uff0c\u6bcf\u4e00\u533a\u7684\u7b2c 4 \u5f20\u662f\u9b54\u738b\u5173\uff0c\u7b2c 32 \u5173\uff1d\u6700\u7ec8\u9b54\u738b\u300c\u9b54\u738b\u4e4b\u95f4\u300d\u3002""",
    """\u5171 <b>40 \u5173</b>\uff088 \u5927\u4e3b\u9898 \u00d7 4 \u5f20\u5730\u56fe \uff0b \u6bcf\u7ae0\u7b2c 5 \u5173\u7684 BOSS \u51b3\u6218\u573a\uff09\uff0c\u7b2c 40 \u5173\uff1d\u6700\u7ec8\u9b54\u738b\u300c\u9b54\u738b\u4e4b\u95f4\u300d\u3002""",
    1, 'goalSoloCn')

rep("""<b>32 maps</b> (8 chapters \u00d7 4), the 4th map of each chapter is a boss fight, stage 32 is the final boss.""",
    """<b>40 stages</b> (8 chapters \u00d7 4 maps + a boss arena as the 5th stage of each chapter); stage 40 is the final boss.""",
    1, 'goalSoloEn')

io.open(P + '.tmp', 'w', encoding='utf-8', newline='\n').write(s.replace('\r\n', '\n'))
os.replace(P + '.tmp', P)
print('OK ->', len(s))
print(' | '.join(steps))
