"""build_all_page.py — 五個動作的驗收頁

產出 anim-all.html：
  1. 頂部 KPI
  2. 比例跳動測試舞台（每 420ms 在所有動作的所有格之間隨機切換，看角色會不會忽然變大變小）
  3. 每個動作的 12 格條圖 + GIF
  4. 量測表（高 / 頭寬 / 腳底 / 實心像素）＋ 與遊戲原角色對照
"""
import os, io, base64, json
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'anim-all.html')
CELL = (280, 486)          # 頁面內縮圖尺寸（維持 900x1560 比例）
STAGE = (320, 555)

ACTIONS = [
    ('walk',    '走路',    '原地行走・手腳交替・身體起伏',     '循環 25 格（1.04s）'),
    ('idle',    '待機',    '呼吸起伏・耳朵前後擺・兩次眨眼', '循環 20 格（0.83s）'),
    ('hold',    '舉彈',    '雙手舉過頭頂・托舉下沉再撐起',   '循環 46 格（1.92s）'),
    ('throw',   '投擲',    '後拉蓄力・前傾甩出・收勢',       '一次性 103 格'),
    ('hurt',    '受傷',    '後仰・張臂・腳步踉蹌・暈眩',     '一次性 124 格'),
    ('victory', '勝利歡呼', '下蹲蓄力・起跳・雙臂全開',       '循環 19 格（0.79s）'),
]


def b64(im, fmt='WEBP', **kw):
    b = io.BytesIO()
    im.save(b, fmt, quality=84, method=4, **kw)
    return 'data:image/%s;base64,%s' % (fmt.lower(), base64.b64encode(b.getvalue()).decode())


def load(act, i):
    if act == 'walk':
        p = os.path.join(HERE, 'frames_game', 'w%02d.png' % i)
    else:
        p = os.path.join(HERE, 'frames_anim', act, '%02d.png' % i)
    return Image.open(p).convert('RGBA')


def fit(im, box, bg=(232, 236, 242)):
    w, h = box
    c = Image.new('RGBA', (w, h), bg + (255,))
    r = min(w / im.width, h / im.height)
    s = im.resize((max(1, int(im.width * r)), max(1, int(im.height * r))), Image.LANCZOS)
    c.alpha_composite(s, ((w - s.width) // 2, (h - s.height) // 2))
    return c.convert('RGB')


def metrics(im):
    a = np.array(im)[:, :, 3]
    ys = np.where((a > 8).any(axis=1))[0]
    if not len(ys):
        return dict(h=0, top=0, bot=0, headw=0, w=0, solid=0)
    y0, y1 = int(ys.min()), int(ys.max())
    h = y1 - y0 + 1
    ext = []
    for y in range(y0, y1 + 1):
        xs = np.where(a[y] > 60)[0]
        ext.append(int(xs.max() - xs.min() + 1) if len(xs) else 0)
    ext = np.array(ext)
    xs2 = np.where((a > 60).any(axis=0))[0]
    # 臉寬：用固定畫布座標（所有幀都對齊到腳底 1360 / 中心 450），
    # 這樣跨動作可以直接比，不受 bbox 高度變化影響。
    fw = 0
    for y in range(520, 821):
        xs = np.where(a[y] > 60)[0]
        if len(xs):
            fw = max(fw, int(xs.max() - xs.min() + 1))
    return dict(h=h, top=y0, bot=y1, headw=int(ext[:int(h * .42)].max()), facew=fw,
                w=int(xs2.max() - xs2.min() + 1) if len(xs2) else 0,
                solid=int((a > 200).sum()))


def main():
    cards, sections, rows = [], [], []
    all_thumbs = []
    k_used = None

    for act, name, desc, loop in ACTIONS:
        meta = {}
        mp = os.path.join(HERE, 'frames_anim', act, 'meta.json')
        if act == 'walk':
            mp = os.path.join(HERE, 'frames_vid', 'meta.json')
        if os.path.exists(mp):
            meta = json.load(open(mp, encoding='utf-8'))
        k_used = meta.get('k', k_used)

        cells, thumbs, ms = [], [], []
        for i in range(12):
            im = load(act, i)
            ms.append(metrics(im))
            small = fit(im, CELL)
            thumbs.append(b64(small))
            cells.append('<div class="cell"><img src="%s" alt=""><span>%02d</span></div>' % (thumbs[-1], i))
        all_thumbs.append((act, thumbs))
        hs = [m['h'] for m in ms]
        hw = [m['headw'] for m in ms]
        bt = [m['bot'] for m in ms]

        # GIF（用頁面縮圖，統一邊界）
        S = 300
        ux0 = uy0 = 10 ** 9; ux1 = uy1 = -1
        for i in range(12):
            a = np.array(load(act, i))[:, :, 3]
            ys = np.where((a > 8).any(axis=1))[0]
            xs = np.where((a > 8).any(axis=0))[0]
            ux0 = min(ux0, int(xs.min())); ux1 = max(ux1, int(xs.max()))
            uy0 = min(uy0, int(ys.min())); uy1 = max(uy1, int(ys.max()))
        pad = 24
        bw, bh = ux1 - ux0 + pad * 2, uy1 - uy0 + pad * 2
        side = max(bw, bh)
        bx = ux0 - pad - (side - bw) // 2
        by = uy0 - pad - (side - bh) // 2
        gifs = []
        for i in range(12):
            c = load(act, i).crop((bx, by, bx + side, by + side)).resize((S, S), Image.LANCZOS)
            bg = Image.new('RGBA', (S, S), (28, 32, 40, 255))
            bg.alpha_composite(c)
            gifs.append(bg.convert('P', palette=Image.ADAPTIVE, colors=128))
        gp = os.path.join(HERE, 'gif-%s.gif' % act)
        gifs[0].save(gp, save_all=True, append_images=gifs[1:], duration=70,
                     loop=0, optimize=True, disposal=2)

        cards.append("""<div class="kpi"><b>%s</b><span>%s</span><em>%s</em></div>"""
                     % (name, desc, loop))

        sections.append("""
<section>
  <h2>%s <span class="tag">%s</span></h2>
  <p class="sub">%s</p>
  <div class="row">
    <div class="gifbox"><img src="gif-%s.gif" alt=""><p>循環預覽</p></div>
    <div class="strip">%s</div>
  </div>
</section>""" % (name, loop, desc, act, ''.join(cells)))

        for i, m in enumerate(ms):
            rows.append('<tr><td>%s</td><td>%02d</td><td>%d</td><td>%d</td><td>%d</td><td>%d</td><td>%d</td></tr>'
                        % (name, i, m['h'], m['facew'], m['w'], m['bot'], m['solid']))

    # 舞台：所有動作所有格
    stage_srcs = []
    for act, thumbs in all_thumbs:
        for t in thumbs:
            stage_srcs.append(t)
    stage_json = json.dumps(stage_srcs)

    old = os.path.join(HERE, '..', 'anim-test', 'data', 'rig', 'idle_0.png')
    old_html = ''
    old_m = None
    if os.path.exists(old):
        oi = Image.open(old).convert('RGBA')
        old_m = metrics(oi)
        old_html = '<div class="cmpbox"><img src="%s" alt=""><p>遊戲現有角色（零件拼裝）<br>高 %d · 臉寬 %d</p></div>' % (
            b64(fit(oi, CELL)), old_m['h'], old_m['headw'])

    html = TEMPLATE
    html = html.replace('__CARDS__', ''.join(cards))
    html = html.replace('__SECTIONS__', ''.join(sections))
    html = html.replace('__ROWS__', ''.join(rows))
    html = html.replace('__STAGE__', stage_json)
    html = html.replace('__OLD__', old_html)
    html = html.replace('__K__', '%.4f' % (k_used or 0))
    html = html.replace('__OLDM__', '' if not old_m else '遊戲現有 %d' % old_m['h'])
    open(OUT, 'w', encoding='utf-8').write(html)
    print('寫出', OUT, '%.1f KB' % (os.path.getsize(OUT) / 1024))


TEMPLATE = r"""<!DOCTYPE html>
<html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>五個動作驗收 — 兔子</title>
<style>
:root{--bg:#f4f6f9;--pn:#fff;--tx:#1c2330;--mu:#6b7789;--ln:#e2e7ef;--ac:#2f6df6;--gd:#16a34a}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--tx);
 font-family:-apple-system,"Segoe UI","Noto Sans TC","PingFang TC",sans-serif;line-height:1.65}
.wrap{max-width:1180px;margin:0 auto;padding:34px 22px 80px}
h1{font-size:25px;margin:0 0 4px;letter-spacing:-.4px}
.lead{color:var(--mu);font-size:13.5px;margin:0 0 22px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:11px;margin-bottom:26px}
.kpi{background:var(--pn);border:1px solid var(--ln);border-radius:11px;padding:13px 15px}
.kpi b{display:block;font-size:15px}
.kpi span{display:block;font-size:11.5px;color:var(--mu);margin-top:3px}
.kpi em{display:block;font-size:10.5px;color:var(--ac);font-style:normal;margin-top:6px;font-weight:600}
section{background:var(--pn);border:1px solid var(--ln);border-radius:13px;padding:18px 20px 20px;margin-bottom:18px}
h2{font-size:16px;margin:0 0 2px;display:flex;align-items:center;gap:9px}
.tag{font-size:10px;font-weight:600;color:var(--ac);background:#eaf0ff;border-radius:20px;padding:2px 9px}
.sub{color:var(--mu);font-size:12.5px;margin:0 0 14px}
.row{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap}
.gifbox{flex:0 0 190px;text-align:center}
.gifbox img{width:190px;border-radius:8px;background:#1c2028;display:block}
.gifbox p{font-size:11px;color:var(--mu);margin:6px 0 0}
.strip{flex:1 1 560px;display:grid;grid-template-columns:repeat(6,1fr);gap:6px}
.cell{position:relative;background:#e8ecf2;border-radius:6px;overflow:hidden}
.cell img{width:100%;display:block}
.cell span{position:absolute;left:4px;top:3px;font-size:9.5px;font-weight:700;color:#fff;
 background:rgba(20,26,36,.55);border-radius:3px;padding:0 4px}
.stagebox{display:flex;gap:20px;align-items:center;flex-wrap:wrap}
#stage{flex:0 0 320px;background:#1b1f27;border-radius:12px;overflow:hidden}
#stage img{width:100%;display:block}
.stagetxt{flex:1 1 320px;font-size:13px;color:var(--mu)}
.stagetxt b{color:var(--tx)}
table{width:100%;border-collapse:collapse;font-size:11.5px;font-variant-numeric:tabular-nums}
th,td{padding:5px 7px;border-bottom:1px solid var(--ln);text-align:right}
th:first-child,td:first-child{text-align:left}
th{color:var(--mu);font-weight:600;background:#f8fafc}
.cmpbox{text-align:center;flex:0 0 220px}
.cmpbox img{width:100%;border-radius:8px;background:#e8ecf2}
.cmpbox p{font-size:11px;color:var(--mu);margin:6px 0 0}
.note{background:#f0f6ff;border-left:3px solid var(--ac);border-radius:0 8px 8px 0;
 padding:10px 14px;font-size:12.5px;color:#3a4a63;margin:14px 0 0}
.grid2{display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start}
</style></head><body><div class="wrap">
<h1>六個動作 — 影片生成驗收</h1>
<p class="lead">全部由同一支站姿首幀圖生成，去背後以<b>同一個縮放係數 __K__</b>、同一個腳底基線輸出到 900×1560 畫布。切換動作不應該出現比例跳動。</p>
<div class="kpis">__CARDS__</div>

<section>
  <h2>比例跳動測試</h2>
  <p class="sub">每 420 毫秒在六個動作共 72 格之間隨機切換。盯著頭的大小與身體寬度看 —— 如果有任何一格讓角色忽然變大或變小，就是比例沒對上。</p>
  <div class="stagebox">
    <div id="stage"><img id="play" src="" alt=""></div>
    <div class="stagetxt">
      <p><b>怎麼看：</b>頭寬在所有格之間應該幾乎不變（誤差 &lt; 5%）。耳朵、手臂、腳本來就會動，那是動作；<b>頭和軀幹不該變</b>。</p>
      <p>下面量測表列出每一格的實際數字。__OLDM__ 的身高當基準。</p>
    </div>
    <div class="cmpbox"><div id="oldslot">__OLD__</div></div>
  </div>
</section>

__SECTIONS__

<section>
  <h2>逐格量測</h2>
  <p class="sub">同一支影片內「腳底」允許小幅浮動（呼吸、跳躍）；「頭寬」在同一動作內浮動應該 &lt; 8%。跨動作比對看最後一節。</p>
  <table>
    <thead><tr><th>動作</th><th>格</th><th>高</th><th>臉寬</th><th>總寬</th><th>腳底y</th><th>實心px</th></tr></thead>
    <tbody>__ROWS__</tbody>
  </table>
</section>

<section>
  <h2>誠實說明</h2>
  <div class="note">
    <b>舉彈那支的球是我抹掉的。</b>模型自己在頭頂畫了一顆淺藍大球，和手掌無縫相接。我用圓擬合（球心 377,94·半徑 141.7，逐幀誤差 &lt; 1px）把它還原成背景色，
    挖除半徑取 1.015 倍，剛好把手掌與手指留在外面。效果是「雙手托著空氣」—— 遊戲的炸彈畫上去就剛好落在那個位置。<br><br>
    <b>待機仍然是微動。</b>呼吸起伏、耳朵擺、兩次眨眼都在，但幅度天生比走路小很多。如果你要它更「有戲」，我可以重出一支（加跺腳、左右踏步）。
  </div>
</section>

</div>
<script>
var SRC = __STAGE__;
var el = document.getElementById('play'), i = 0;
el.src = SRC[0];
setInterval(function(){
  i = (i + 1 + Math.floor(Math.random()*7)) % SRC.length;
  el.src = SRC[i];
}, 420);
</script>
</body></html>"""


if __name__ == '__main__':
    main()
