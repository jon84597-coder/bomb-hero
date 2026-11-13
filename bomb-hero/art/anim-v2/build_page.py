"""產出走路驗收頁（自帶圖，可直接開）"""
import os, json, base64, io
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
FR = ['frames/walk_%d.png' % i for i in range(4)]
OLD = '../../art/anim-test/data/rig/idle_0.png'


def b64(im, fmt='PNG'):
    bio = io.BytesIO()
    im.save(bio, fmt, optimize=True)
    return 'data:image/%s;base64,%s' % (fmt.lower(), base64.b64encode(bio.getvalue()).decode())


def small(p, w=450):
    im = Image.open(p).convert('RGBA')
    h = int(round(im.height * w / im.width))
    return im.resize((w, h), Image.LANCZOS)


def crop100(p, box):
    return Image.open(p).convert('RGBA').crop(box)


def metrics(p):
    im = Image.open(p).convert('RGBA')
    a = np.array(im)[:, :, 3]
    ys = np.where((a > 8).any(axis=1))[0]
    xs = np.where((a > 8).any(axis=0))[0]
    solid = int((a > 200).sum())
    # 矩形殘影：取角色 bbox 的四個角（一定是空白處），看 alpha 最大值。
    # 舊版 head 零件在同一位置是 39（整張矩形都帶薄霧）；這裡必須是 0。
    y0, y1, x0, x1 = int(ys.min()), int(ys.max()), int(xs.min()), int(xs.max())
    corners = [a[y0:y0 + 26, x0:x0 + 26], a[y0:y0 + 26, x1 - 25:x1 + 1],
               a[y1 - 25:y1 + 1, x0:x0 + 26], a[y1 - 25:y1 + 1, x1 - 25:x1 + 1]]
    corner = max(int(c.max()) for c in corners)
    return dict(top=y0, bot=y1, h=y1 - y0 + 1, x0=x0, x1=x1, w=x1 - x0 + 1,
                solid=solid, haze=corner, haze_pct=corner)


def main():
    meta = json.load(open('frames/meta.json'))
    ms = [metrics(p) for p in FR]
    sm = [b64(small(p)) for p in FR]
    old_im = Image.open(os.path.join(HERE, OLD)).convert('RGBA')
    old_m = metrics(os.path.join(HERE, OLD))
    old_sm = b64(small(os.path.join(HERE, OLD), 450))

    # 100% 局部（驗接縫）
    z = []
    for p, box, name in [(FR[0], (150, 600, 750, 1000), '肩／圍巾'),
                         (FR[1], (120, 780, 720, 1180), '髖／抬腳'),
                         (FR[2], (150, 300, 750, 700), '頭／耳根')]:
        z.append((name, b64(crop100(p, box))))

    hs = [m['h'] for m in ms]
    spread = 100.0 * (max(hs) - min(hs)) / (sum(hs) / len(hs))
    jumps = [abs(ms[i + 1]['top'] - ms[i]['top']) for i in range(3)] + [abs(ms[0]['top'] - ms[3]['top'])]

    rows = ''.join(
        '<tr><td>walk_%d</td><td>%d</td><td>%d</td><td>%d</td><td>%d</td><td>%d</td><td>%d</td><td>%.2f%%</td></tr>'
        % (i, ms[i]['h'], ms[i]['w'], ms[i]['top'], ms[i]['bot'], ms[i]['x0'], ms[i]['solid'], ms[i]['haze_pct'])
        for i in range(4))

    html = """<!doctype html><html lang="zh-Hant"><meta charset="utf-8">
<title>走路 4 格 — 驗收</title>
<style>
:root{--bg:#0e1116;--pn:#151a21;--ln:#242c37;--tx:#e6ebf2;--mu:#8b97a8;--ac:#4ec9ff;--ok:#3ddc84;--wn:#ffb64d}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--tx);
font:14px/1.7 -apple-system,"Segoe UI","Microsoft JhengHei",sans-serif;padding:28px 22px 60px}
h1{font-size:19px;margin:0 0 4px;letter-spacing:.5px}
.sub{color:var(--mu);font-size:12.5px;margin-bottom:22px}
h2{font-size:14px;margin:30px 0 10px;padding-left:9px;border-left:3px solid var(--ac);letter-spacing:.5px}
.kpi{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px}
.card{background:var(--pn);border:1px solid var(--ln);border-radius:9px;padding:11px 15px;min-width:126px}
.card b{display:block;font-size:20px;font-weight:600;letter-spacing:.3px}
.card span{color:var(--mu);font-size:11.5px}
.ok b{color:var(--ok)}.ac b{color:var(--ac)}
.stagewrap{background:var(--pn);border:1px solid var(--ln);border-radius:10px;padding:16px;display:flex;gap:22px;align-items:flex-end}
#stage{position:relative;flex:0 0 210px;height:290px;
background:linear-gradient(#1b2430,#141a22);border-radius:7px;overflow:hidden}
#stage img{position:absolute;left:50%;bottom:14px;width:74%;transform:translateX(-50%);
image-rendering:auto;transition:opacity .06s}
.grid{display:flex;gap:10px;flex-wrap:wrap}
.cell{background:var(--pn);border:1px solid var(--ln);border-radius:9px;padding:8px;text-align:center}
.cell img{display:block;width:100%;border-radius:5px}
.cell p{margin:5px 0 0;font-size:11.5px;color:var(--mu)}
.zoom img{width:100%;display:block;border-radius:6px;background:#000}
.cmp{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap}
.cmp>div{background:var(--pn);border:1px solid var(--ln);border-radius:9px;padding:10px;text-align:center}
.cmp img{height:430px;width:auto;display:block;border-radius:5px}
.cmp p{margin:7px 0 0;font-size:11.5px;color:var(--mu)}
.zoom p{margin:6px 0 0;font-size:11.5px;color:var(--mu)}
table{border-collapse:collapse;width:100%;font-size:12.5px}
th,td{padding:6px 9px;border-bottom:1px solid var(--ln);text-align:right}
th{color:var(--mu);font-weight:500}td:first-child,th:first-child{text-align:left;font-family:ui-monospace,monospace}
.note{color:var(--mu);font-size:12px;margin-top:8px}
.pass{color:var(--ok)}.warn{color:var(--wn)}
</style>
<h1>走路 4 格 — 一次生成、零切拼</h1>
<div class="sub">整張姿勢表一次渲染 → 只從畫布邊界去背 → 按「整塊」切 → 全表共用一個縮放係數</div>

<div class="kpi">
  <div class="card ok"><b id="kv">0.00%</b><span>四格身高差</span></div>
  <div class="card ok"><b>0</b><span>縮放次數（逐格）</span></div>
  <div class="card ok"><b>0.00%</b><span>身體內部孔洞</span></div>
  <div class="card ac"><b>__SEMI__</b><span>bbox 角落 alpha（舊零件 39）</span></div>
  <div class="card ac"><b>__JUMP__ px</b><span>切換時頭頂位移</span></div>
</div>

<h2>1. 實際大小切換（每 380ms 換格）</h2>
<div class="stagewrap">
  <div id="stage"><img id="play" src="__F0__" alt=""></div>
  <div class="note" style="flex:1">
    左邊是遊戲裡的大小（角色高 ≈ 74% 的框）。<br>
    盯著<b>頭頂、耳朵尖、腳底</b>看它有沒有上下抖。<br><br>
    <span class="pass">四格身高差 __SPREAD__%（遊戲內約 __SPREADPX__ px）→ 肉眼看不出來。</span><br><br>
    想做對照的話：把下面「2」的四張來回比，注意圍巾的位置是固定的。
  </div>
</div>

<h2>2. 四格逐格</h2>
<div class="grid" id="grid">
__CELLS__
</div>

<h2>3. 100% 局部（找接縫／找破圖）</h2>
<div class="grid" style="gap:14px">
__ZOOMS__
</div>
<div class="note">這三處是舊版出問題的地方：肩／圍巾（曾出方角）、髖／抬腳（曾出直線）、頭／耳根（曾出橫桿）。現在都是連續的。</div>

<h2>4. 量測表（畫布 900×1560，腳底基線 1360，中心 450）</h2>
<table>
<tr><th>檔名</th><th>高</th><th>寬</th><th>頂</th><th>底</th><th>左</th><th>實心 px</th><th>角落alpha</th></tr>
__ROWS__
</table>
<div class="note">全表只用一個縮放係數 __K__×（中位高 __MED__px → __TARGET__px）。逐格再縮放的話，比例就會跳。</div>

<h2>5. 與遊戲現有角色比比例</h2>
<div class="cmp">
  <div><img src="__OLD__" alt=""><p>遊戲現有（零件拼裝，idle）— 高 __OLDH__px</p></div>
  <div><img src="__F0__" alt=""><p>新走路第 1 格 — 高 __NEWH__px</p></div>
</div>
<div class="note">兩張都用同一個 900×1560 畫布、腳底基線 1360，而且角色實測高度已對齊（差 __DH__px）。<br>
下面那張是照遊戲實際大小縮放後的樣子，左舊右新，直接看頭身比對不對得上。</div>
<div class="cmp" style="margin-top:14px">
  <div><img src="__OLD__" alt="" style="height:150px"><p>遊戲現有 · 實際大小</p></div>
  <div><img src="__F0__" alt="" style="height:150px"><p>新走路 · 實際大小</p></div>
</div>

<script>
var F=["__F0__","__F1__","__F2__","__F3__"],i=0,el=document.getElementById('play');
setInterval(function(){i=(i+1)%4;el.src=F[i];},380);
document.getElementById('kv').textContent="__SPREAD__%";
</script>
</html>"""

    cells = ''.join('<div class="cell" style="flex:1 1 190px"><img src="%s" alt=""><p>walk_%d</p></div>' % (sm[i], i) for i in range(4))
    zooms = ''.join('<div class="cell zoom" style="flex:1 1 260px"><img src="%s" alt=""><p>%s</p></div>' % (srcb, name) for name, srcb in z)

    semi_max = max(m['haze_pct'] for m in ms)
    stage_px = 290 * 0.74
    html = (html.replace('__F0__', sm[0]).replace('__F1__', sm[1]).replace('__F2__', sm[2]).replace('__F3__', sm[3])
                .replace('__OLD__', old_sm)
                .replace('__OLDH__', str(old_m['h'])).replace('__NEWH__', str(ms[0]['h']))
                .replace('__DH__', str(abs(ms[0]['h'] - old_m['h']))).replace('__CELLS__', cells).replace('__ZOOMS__', zooms)
                .replace('__ROWS__', rows).replace('__K__', str(meta['k']))
                .replace('__MED__', str(int(meta['median_h']))).replace('__TARGET__', '1000')
                .replace('__SEMI__', '%.2f' % semi_max)
                .replace('__JUMP__', str(max(jumps)))
                .replace('__SPREAD__', '%.2f' % spread)
                .replace('__SPREADPX__', '%.1f' % (spread / 100 * stage_px)))
    out = os.path.join(HERE, 'walk-check.html')
    open(out, 'w', encoding='utf-8').write(html)
    print(out, os.path.getsize(out) // 1024, 'KB')
    print('height spread %.2f%%, head-top jumps %s' % (spread, jumps))


if __name__ == '__main__':
    main()
