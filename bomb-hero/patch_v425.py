# -*- coding: utf-8 -*-
"""v4.25：修 [wire] Cannot read properties of null (reading 'team')
   ＋ GitHub Pages workflow 不再紅叉（真正原因是 Pages 從未啟用，不是 npm run build）"""
import io, os

D = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(D, 'index.html')
raw = io.open(P, 'r', encoding='utf-8', newline='').read()
src = raw.replace('\r\n', '\n')
assert src != raw
n = 0

# ---------- 1. Battle.slots 初始值不要放 null ----------
old = """const Battle = {
  slots: [null, null, null, null],"""
new = """const Battle = {
  // v4.25：原本是 [null,null,null,null] —— 只要在 resetSlots() 之前有人讀 slots（例如
  // 玩家存檔裡 settings.teams>=2、開機時 updateCountHint() 就去算隊名），就會
  // 「Cannot read properties of null (reading 'team')」把整個開機流程炸掉。
  slots: [],"""
assert src.count(old) == 1, 'Battle.slots 比對失敗'
src = src.replace(old, new); n += 1

# ---------- 2. teamSummary() 防空 ----------
old = """  teamSummary() {
    const n = teamCount();
    if (!n) return '';
    const out = [];
    for (let i = 0; i < n; i++) {
      const mem = Battle.slots.filter(function (s) { return (s.team | 0) % n === i; })
        .map(function (s) { return s.label; }).join('／');"""
new = """  teamSummary() {
    const n = teamCount();
    if (!n) return '';
    const out = [];
    // v4.25：slots 可能還沒建立（空陣列）或夾著 null → 一律過濾掉再算
    const slots = (Battle.slots || []).filter(function (s) { return !!s; });
    if (!slots.length) return '';
    for (let i = 0; i < n; i++) {
      const mem = slots.filter(function (s) { return (s.team | 0) % n === i; })
        .map(function (s) { return s.label; }).join('／');"""
assert src.count(old) == 1, 'teamSummary 比對失敗'
src = src.replace(old, new); n += 1

# ---------- 3. 開機每一步各自 try/catch（一步掛掉不會連累後面的音樂／翻譯／控制） ----------
old = """Solo.init();
updateCountHint();
AudioSys.applyVolumes();
applyCtrl();          // 套用控制模式（電腦＝鍵盤 → 不顯示手機按鈕）
applyI18N();          // v2.7：把靜態介面翻成儲存好的語言
updateLangBtn();"""
new = """/* v4.25：這串開機動作以前是「裸呼叫」—— 只要其中一行拋錯，後面全部不執行
   （實例：updateCountHint 撞到 slots 的 null → 音量、控制模式、翻譯、語言鈕全沒套用）。 */
try { Solo.init(); } catch (e) {}
try { Battle.resetSlots(); } catch (e) {}     // v4.25：開機就把 2～8 個位子建好，別讓 UI 先讀到空值
try { updateCountHint(); } catch (e) {}
try { AudioSys.applyVolumes(); } catch (e) {}
try { applyCtrl(); } catch (e) {}            // 套用控制模式（電腦＝鍵盤 → 不顯示手機按鈕）
try { applyI18N(); } catch (e) {}            // v2.7：把靜態介面翻成儲存好的語言
try { updateLangBtn(); } catch (e) {}"""
assert src.count(old) == 1, '開機序列比對失敗'
src = src.replace(old, new); n += 1

# ---------- 4. 版號四處 ----------
assert src.count("const VERSION = '4.24';") == 1
src = src.replace("const VERSION = '4.24';", "const VERSION = '4.25';"); n += 1
assert src.count('<span id="verLogVer">4.24</span>') == 1
src = src.replace('<span id="verLogVer">4.24</span>', '<span id="verLogVer">4.25</span>'); n += 1
assert src.count('<span id="verTxt">4.24</span>') == 1
src = src.replace('<span id="verTxt">4.24</span>', '<span id="verTxt">4.25</span>'); n += 1

old_head = "const VERSION_LOG = [\n  { v: '4.24', date: '2026-11-02', now: true, items: ["
new_head = """const VERSION_LOG = [
  { v: '4.25', date: '2026-11-02', now: true, items: [
    '<b>🛡️ 修好開機時「出問題的模組：wire」的紅色提示卡</b>：只要<b>之前開過「組隊對戰」</b>（隊數設定會被存下來），下次開遊戲時開機流程會去算隊名，卻讀到<b>還沒建好的空位（null）</b> → 整段開機被中斷，音量、控制模式、翻譯、語言鈕都沒套用。現在空位一律跳過，開機也改成<b>每一步各自保護</b>，一步出錯不會連累其他。',
    '<b>🧯 順手加固</b>：開機時先把 2～8 個對戰位子建好，UI 不會再讀到空值。'
  ] },
  { v: '4.24', date: '2026-11-02', now: false, items: ["""
assert src.count(old_head) == 1, 'VERSION_LOG 開頭比對失敗'
src = src.replace(old_head, new_head); n += 1

# ---------- 5. 三份 sw.js ----------
for rel in ['sw.js', '../public/sw.js', '../bomberman-online/public/sw.js']:
    f = os.path.join(D, rel)
    s = io.open(f, 'r', encoding='utf-8', newline='').read()
    s2 = s.replace("v4.24.0", "v4.25.0")
    assert s2 != s, rel + ' 找不到 v4.24.0'
    io.open(f, 'w', encoding='utf-8', newline='').write(s2)
    n += 1

io.open(P, 'w', encoding='utf-8', newline='').write(src.replace('\n', '\r\n'))
print('OK 套用 %d 條' % n)
