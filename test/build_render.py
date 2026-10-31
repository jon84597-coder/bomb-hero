# -*- coding: utf-8 -*-
"""
打包「Render 更新包」：只放部署真正需要的檔案，方便直接覆蓋到 GitHub 倉庫
  bomb-hero-render-update/
    server.js          後端（v4.0：統計 API 已移除）
    package.json
    public/index.html  遊戲本體（v4.0：RPG 模式／32 張動態地圖／版本更新面板）
    RENDER.md          部署步驟 ＋ 本次更新說明
"""
import io, os, re, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))          # bomb-hero
PRJ = os.path.dirname(ROOT)                                                  # workspace 根
SRV_DIR = os.path.join(PRJ, 'bomberman-online')
DIST = os.path.join(PRJ, 'dist')

html = io.open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
m = re.search(r"const VERSION = '([\d.]+)';", html)
VER = m.group(1) if m else '0.0'
print('版本：' + VER)

NAME = 'bomb-hero-render-update-v' + VER
STAGE = os.path.join(DIST, '_render')
PKG = os.path.join(STAGE, NAME)
ZIP = os.path.join(DIST, NAME + '.zip')

# ---- 檔案 ----
# 用二進位讀寫：不能讓 Python 偷偷把 CRLF 換成 LF，
# 否則檔案內容跟來源不一樣（md5 對不起來，git 也會顯示整份被改過）
def read_bytes(p):
    with open(p, 'rb') as f:
        return f.read()


server = read_bytes(os.path.join(SRV_DIR, 'server.js')).decode('utf-8')
pkgjson = read_bytes(os.path.join(SRV_DIR, 'package.json')).decode('utf-8')
html_txt = read_bytes(os.path.join(ROOT, 'index.html')).decode('utf-8')
# 記住原本的換行符，寫出時照原樣（通常是 CRLF）
EOL = '\r\n' if '\r\n' in server else '\n'

RENDER_MD = u'''# BOMB HERO — Render 部署更新包（v{ver}）

這個資料夾裡的 3 個檔案，直接覆蓋到你 Render 服務連線的那個 GitHub 倉庫根目錄，
push 之後 Render 會自動重新部署。

```
server.js              ← 覆蓋
package.json           ← 覆蓋
public/index.html      ← 覆蓋
```

覆蓋完等 1～3 分鐘，開 https://bomb-hero-game.onrender.com/ ，
標題下方的版本號應該變成 `v{ver}`。

---

## 這次更新了什麼（v{ver}）

| 項目 | 說明 |
|---|---|
| 🎲 RPG 模式（測試版 Beta） | 首頁多一顆獨立的「RPG 模式」按鈕，跟原本的單人闖關**完全分開**：自己的配點、自己的成長、自己的 32 張地圖，不影響原本玩法 |
| ❤️🛡️👟💥 四維屬性（每項上限 10 格） | 生命／防禦／速度／攻擊。角色初始只有 **9 點** 可配，可「自訂配點」也能「電腦隨機分配」，10 隻角色各自配一組 |
| 👹 怪物血量與防禦 | 基礎小怪 1~2 格（慢）、中階 2~4 格（鐵甲蟲／骷髏兵有硬殼防禦）、飛行 1~3 格（穿牆）；BOSS 10 格以上，血量低於 **40% 暴走**（跑更快、丟彈更兇、同場 6 顆），被丟過來的炸彈砸到會轉星星**暈眩**，抓空檔補刀 |
| 🗺️ 32 張動態地圖 | 8 大主題 × 4 張小地圖（綠野草原／熔岩洞窟／冰雪原／沙漠遺跡／夜光彩城／深海遺跡／天空要塞／暗黑魔王城）。**同主題共用底色與機關**（冰面／輸送帶／傳送門），地形是不規則有機生成（L 形、環形、洞窟、群島、迷宮），4 種尺寸 小 13×11／中 15×13／大 17×15／超大 21×15；生成後做**尋路檢核**，保証起點一定走得到出口 |
| 📜 版本更新內容面板 | 首頁左上角新增「📜 版本更新內容」標籤，從 **Ver 3.0 起**每一版的更新明細都列在裡面，之後每次改版都會持續追加 |
| 🛒 商店（即將開放） | 首頁新增「🛒 商店」按鈕，目前點下去顯示「商店正在準備中…」，等後續版本才會開 |

### 上一版（v3.9）
| 項目 | 說明 |
|---|---|
| 📱 手機按鈕圖示換真美術 | 右下角三顆鈕不再用表情符號：💥放彈 → 黑亮圓球炸彈（引線點燃＋火花）；🧨遙控引爆 → 同顆炸彈插青色 LED 面板；🔥吐火 → 四層水滴火舌 |
| 💍 按鈕精美圓框 | 三顆鈕外加三層同心金屬圓框：盤面 → 金屬環 → 深色外圈，外緣細白線＋上緣玻璃反光 |

### 更早（v3.8）
| 項目 | 說明 |
|---|---|
| 💣 炸彈／火焰圖示全面重繪 | 黑色圓型炸彈＋點燃火苗與火星、快爆時透紅警示；爆炸改成四層水滴火舌＋上升火星（BOSS 專屬紫色火焰） |
| 💬 頭上對話框換新 | 被炸到／炸到人的台詞全部換新（10 國語言同步翻譯） |
| 🏆 勝利過場加長＋勝利音樂 | 對戰分出勝負後橫幅停留 3.4 秒、整段過場約 4.2 秒，並播放全新 8-bit 勝利旋律 |
| 🌋 第二關配色提亮 | 熔岩洞窟的硬牆改冷調紫黑曜石、軟磚改暖亮橙色，一眼分出「炸得動／炸不動」 |
| 🗑️ 移除瀏覽人數／按讚 | 首頁左上角的「👁 瀏覽人數 ｜ 👍 按讚」整組移除（前端＋後端 API 全刪） |

---

## 環境變數

| 變數 | 預設值 | 用途 |
|---|---|---|
| `PORT` | `3000` | Render 會自己帶，不用設 |

v{ver} 起後端不再需要任何統計相關設定；之前有設定過 `STATS_PATH` / `STATS_RESTORE_URL`
的話，留著也不會出錯，但已經沒有作用，可以順手刪掉。

---

## 更新後怎麼確認有成功

1. 開 https://bomb-hero-game.onrender.com/ → 版本號顯示 `v{ver}`
2. 首頁多出「🎲 RPG 模式 測試版 Beta」與「🛒 商店」兩顆鈕，左上角多一顆「📜 版本更新內容 v{ver}」
3. 點「📜 版本更新內容」→ 面板最上面就是 v{ver} 的更新明細，往下可以翻到 Ver 3.0
4. 點「🎲 RPG 模式」→ 選角色、配 9 點（或按「電腦隨機分配」）→ 開始冒險，進場看到自己的血條／護甲與不規則地形
5. 開 `https://bomb-hero-game.onrender.com/api/health` → 回 `{{"ok":true,"rooms":0,"relay":0,"players":0}}`

> 如果第一次開很慢（轉圈 30 秒以上），那是 Render 免費方案的冷啟動，正常的。

---

## 常見問題

**Q：可以直接用 GitHub Pages 嗎？**
可以跑遊戲本體（單人、本機對戰都正常），但**沒有後端**，
所以「線上配對」會連不上並顯示明確提示。要完整功能請用 Render / 任何 Node 主機。
'''.format(ver=VER)

# ---- 組資料夾 ----
try:
    import shutil
    shutil.rmtree(STAGE)
except Exception:
    pass
os.makedirs(os.path.join(PKG, 'public'), exist_ok=True)


def w(rel, txt):
    """原樣寫出：不做換行符轉換，內容跟來源檔逐位元組相同"""
    p = os.path.join(PKG, rel)
    with open(p, 'wb') as f:
        f.write(txt.encode('utf-8'))
    print('  + ' + rel + '  (' + str(os.path.getsize(p)) + ' bytes)')


w('server.js', server)
w('package.json', pkgjson)
w('public/index.html', html_txt)
w('RENDER.md', RENDER_MD.replace('\n', EOL))

# ---- 打包 ----
if os.path.exists(ZIP):
    os.remove(ZIP)
with zipfile.ZipFile(ZIP, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for dirpath, _, files in os.walk(PKG):
        for f in files:
            full = os.path.join(dirpath, f)
            z.write(full, os.path.relpath(full, STAGE).replace('\\', '/'))
print('\n[OK] ' + ZIP)
print('     ' + str(round(os.path.getsize(ZIP) / 1024.0 / 1024.0, 2)) + ' MB')
