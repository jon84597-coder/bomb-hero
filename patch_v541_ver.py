import io, os

# ---- version-log.js ----
P = 'bomb-hero/js/version-log.js'
s = io.open(P, encoding='utf-8', newline='').read()

a40 = "{ v: '5.40', date: '2026-11-07', now: true, items: ["
b40 = "{ v: '5.40', date: '2026-11-07', now: false, items: ["
assert s.count(a40) == 1
s = s.replace(a40, b40, 1)

head = "window.__VERSION_LOG = [\n"
new_entry = """window.__VERSION_LOG = [
  { v: '5.41', date: '2026-11-07', now: true, items: [
    '\U0001F579\uFE0F <b>手機左半屏變成浮動虛擬搖桿</b>：手指按在左半屏<b>哪裡</b>，圓盤就出現在<b>那裡</b>（不再固定釘在角落）。半透明外圈 + 可拖的小球，往哪拖小球就往哪偏，360° 全向，放手就淡出。',
    '\u27A1\uFE0F <b>不是新增一套操作，是給原本的隱形滑動區裝上眼睛</b>：判定邏輯完全沒動（9px 死區、拖超過 120px 會把原點往前帶所以滑多遠都不會失聯），只是把「你正在往哪走」畫出來 —— 手感零變化，但第一次玩的人終於看得懂自己在按什麼。',
    '\u2699\uFE0F <b>兩種手機模式各自安好</b>：選「隱形滑動」才會出現浮動圓盤；選「實體搖桿」維持原本左下角那顆固定圓盤，不會兩顆一起跳出來。切換模式或打開結算／暫停時，浮動圓盤會自動收起，不會卡在畫面上。',
    '\U0001F4D0 <b>圓盤尺寸刻意做小一點</b>（152px，比實體搖桿的 168px 小）：浮動式會跟著手指跑，太大會擋住戰場；小球最大位移 44px，拖 110px 就拉滿，視覺細膩又不遲鈍。',
    '\U0001F4E6 版本／Service Worker 升到 <b>5.41</b>，舊快取會自動換掉。'
  ]},
"""
assert s.count(head) == 1
s = s.replace(head, new_entry, 1)

tmp = P + '.tmp'
with io.open(tmp, 'w', encoding='utf-8', newline='\n') as f:
    f.write(s)
os.replace(tmp, P)
print('version-log ok', len(s))

# ---- package.json ----
P = 'package.json'
s = io.open(P, encoding='utf-8', newline='').read()
assert s.count('"version": "5.40.0"') == 1
s = s.replace('"version": "5.40.0"', '"version": "5.41.0"', 1)
tmp = P + '.tmp'
with io.open(tmp, 'w', encoding='utf-8', newline='\n') as f:
    f.write(s)
os.replace(tmp, P)
print('package.json ok')

# ---- sw.js ----
for P in ['bomb-hero/sw.js', 'public/sw.js', 'bomberman-online/sw.js']:
    s = io.open(P, encoding='utf-8', newline='').read()
    assert s.count("var SW_VERSION = 'v5.40.0';") == 1, P
    s = s.replace("var SW_VERSION = 'v5.40.0';", "var SW_VERSION = 'v5.41.0';", 1)
    tmp = P + '.tmp'
    with io.open(tmp, 'w', encoding='utf-8', newline='\n') as f:
        f.write(s)
    os.replace(tmp, P)
    print(P, 'ok')
