# -*- coding: utf-8 -*-
# v4.38 版號升級：VERSION / verTxt / verLogVer / VERSION_LOG[0] + 三份 sw.js
import io, os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = os.path.join(ROOT, 'index.html')
s = io.open(P, encoding='utf-8', newline='').read()
CRLF = '\r\n' in s


def rep(old, new, tag):
    global s
    if CRLF:
        old = old.replace('\n', '\r\n')
        new = new.replace('\n', '\r\n')
    assert s.count(old) == 1, '%s: count=%d' % (tag, s.count(old))
    s = s.replace(old, new)
    print('ok [%s]' % tag)


rep("const VERSION = '4.37';", "const VERSION = '4.38';", 'VERSION')
rep('<span id="verTxt">4.37</span>', '<span id="verTxt">4.38</span>', 'verTxt')
rep('<span id="verLogVer">4.37</span>', '<span id="verLogVer">4.38</span>', 'verLogVer')

OLD_HEAD = """const VERSION_LOG = [
  { v: '4.37', date: '2026-11-02', now: true, items: ["""
NEW_HEAD = """const VERSION_LOG = [
  { v: '4.38', date: '2026-11-02', now: true, items: [
    '坐騎龍在對戰模式現在真的燒得到人了：修掉「面對面吐好幾次火、對手還站著」的判定錯誤',
    '龍被打掉後不再冒出無限護盾：以前 1.8 秒無敵比吐火冷卻還久，怎麼打都復活，現在只給 0.7 秒保護',
    '坐騎吐火的距離回到 2 格 —— 上一版多拉長的那一格其實不是問題點',
    '場外推車只能「垂直往場內」丟：站在哪一邊就只能往對面那條線丟，不會再出現 45 度斜丟',
    '推車的炸彈會跳過牆：先飛滿集氣距離，撞到牆就一路往前跳，直到第一格空地才停（整排牆也能丟進場內）',
    '推車集氣三段改成 3／6／10 格，提示直接寫「近 3 格／中 6 格／遠 10 格」',
    '推車在軌道上的移動速度提升到滑冰鞋 5 級（約 250px/s），倒推仍舊慢、但倒推滿一格就恢復全速',
    '集氣條、落點預告、瞄準線只有自己看得到 —— 別人看不到你在集氣，也看不到你會丟去哪',
    '11 種道具全部換成新畫的立體 ICON：場上多一圈會呼吸的彩色外框，比原本的平面圖更大更顯眼',
    '對戰 AI 的移動速度回歸正常：一開始最多只有滑冰鞋 2 級，想吃更快就得自己搶道具',
    '縮圈落石時 AI 不再只會擠在場中央：會放炸彈逼對手、會躲快爆的炸彈、會繞開火焰，邊躲落石邊搶位置',
    '手機小螢幕對戰時，對手名字不再壓在自己角色頭上（自己的名牌縮成「我」徽章、對手名字移到腳下）',
  ] },
  { v: '4.37', date: '2026-11-02', now: false, items: ["""
rep(OLD_HEAD, NEW_HEAD, 'VERSION_LOG')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('wrote index.html')

for sp in ['sw.js', os.path.join('..', 'public', 'sw.js'), os.path.join('..', 'bomberman-online', 'public', 'sw.js')]:
    fp = os.path.join(ROOT, sp)
    if not os.path.exists(fp):
        print('skip (missing):', sp)
        continue
    t = io.open(fp, encoding='utf-8', newline='').read()
    old = "var SW_VERSION = 'v4.37.0';"
    assert t.count(old) == 1, sp
    io.open(fp, 'w', encoding='utf-8', newline='').write(t.replace(old, "var SW_VERSION = 'v4.38.0';"))
    print('ok [sw]', sp)
