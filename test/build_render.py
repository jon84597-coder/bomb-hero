# -*- coding: utf-8 -*-
"""
打包「Render 更新包」：只放部署真正需要的檔案，方便直接覆蓋到 GitHub 倉庫
  bomb-hero-render-update/
    server.js          後端主程式（v4.1：掛上 cloud.js）
    cloud.js           帳號 / 第三方登入 / 雲端存檔 / 資安（零依賴）
    package.json
    public/index.html  遊戲本體（v4.1：帳號系統／雲端存檔／版本紀錄）
    RENDER.md          部署步驟 ＋ 環境變數 ＋ 本次更新說明
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


# 用二進位讀寫：不能讓 Python 偷偷把 CRLF 換成 LF，
# 否則檔案內容跟來源不一樣（md5 對不起來，git 也會顯示整份被改過）
def read_bytes(p):
    with open(p, 'rb') as f:
        return f.read()


server = read_bytes(os.path.join(SRV_DIR, 'server.js')).decode('utf-8')
cloudjs = read_bytes(os.path.join(SRV_DIR, 'cloud.js')).decode('utf-8')
pkgjson = read_bytes(os.path.join(SRV_DIR, 'package.json')).decode('utf-8')
html_txt = read_bytes(os.path.join(ROOT, 'index.html')).decode('utf-8')
EOL = '\r\n' if '\r\n' in server else '\n'

RENDER_MD = u'''# BOMB HERO — Render 部署更新包（v{ver}）

這個資料夾裡的 4 個檔案，直接覆蓋到你 Render 服務連線的那個 GitHub 倉庫根目錄，
push 之後 Render 會自動重新部署。

```
server.js              ← 覆蓋
cloud.js               ← 新增（帳號 / 登入 / 雲端存檔，沒放會開不起來）
package.json           ← 覆蓋
public/index.html      ← 覆蓋
```

覆蓋完等 1～3 分鐘，開 https://bomb-hero-game.onrender.com/ ，
標題下方的版本號應該變成 `v{ver}`，右上角會多一顆「👤 綁定帳號」。

---

## 這次更新了什麼（v{ver}）

| 項目 | 說明 |
|---|---|
| 🕹️ 隱形滑動區 | 手機移動操作新模式（預設）：指定半邊畫面的**任意空白處按下就是搖桿中心**，往哪裡滑就往哪裡走；區內完全不畫任何圖示，滑多遠都不會斷線 |
| 🎯 虛擬搖桿 | 傳統圓盤搖桿保留下來，可**拖曳到螢幕上任何順手的位置**（比例記錄，換手機不跑位）、大小小／中／大三段 |
| 🧈 死區容錯 | 9px 死區（手抖不會亂走）；手指滑超過 120px 會自動把中心往前帶，方向不變但永遠轉得回來 |
| 🚫 觸控不打架 | 隱形區壓在按鈕下面一層，放彈／遙控引爆／恐龍吐火鍵永遠優先；按住移動的同時按放彈也不會讓角色停下來 |
| ☁️ 版面同步 | 操作模式、操作區左右、大小、自訂位置都寫進雲端存檔，換一支手機直接接回來 |
| 📐 橫放／直放滿版 | 修正畫布被 4:3 比例撐高的老問題：橫放時 390px 的螢幕原本用了 705px（放彈鍵跑到畫面外），現在**剛好塞進可視高度**、HUD 壓成一行；直放也從 171px 一條變成填滿畫面 |

### 上一版（v4.1）

| 項目 | 說明 |
|---|---|
| 👤 帳號系統 | 右上角常駐「👤 綁定帳號」。用 **Google / Facebook** 一鍵授權登入（另支援 LINE），不用另外記密碼 |
| 🎭 遊客模式 | 第一次進遊戲自動配發本機身分（LocalStorage Device ID），**免登入就能玩 RPG**；之後想綁定再綁 |
| 🔗 無痛升級 | 綁定時把遊客的關卡進度、配點、金幣**合併**進正式帳號，取聯集不覆蓋（關卡取最遠、金幣取多、配點取較強） |
| ☁️ 雲端存檔 | 進度存在伺服器，換手機／換瀏覽器／清快取都還在。右上角綠燈＝已同步、橘燈＝遊客、紅燈＝離線 |
| 🛡️ 伺服器權威 | 配點、每項 10 格上限、關卡解鎖順序、金幣全部由後端計算；前端只能送「我要加哪一項」，亂送的數值一律不採信 |
| 🔐 存檔簽章 | 存檔用 HMAC-SHA256 簽章，前端改一個數字就會驗章失敗 → 拒絕載入並計入 tamper 次數 |
| 🚦 防刷限流 | 存檔 API 每個帳號每秒 1 次（burst 3），配點 4 次/秒，登入 0.5 次/秒，超過回 429 + Retry-After |
| 🔒 傳輸加密 | 強制 HTTPS（`x-forwarded-proto: http` → 308 轉址）＋ HSTS ＋ HttpOnly / SameSite Cookie |

### 上一版（v4.0）
| 項目 | 說明 |
|---|---|
| 🎲 RPG 模式（Beta） | 四維屬性（生命／防禦／速度／攻擊，各上限 10 格、初始 9 點）、怪物血量與防禦、BOSS 40% 暴走＋被炸彈砸到暈眩 |
| 🗺️ 32 張動態地圖 | 8 主題 × 4 張，同主題共用色系與機關，不規則有機地形，4 種尺寸並做尋路檢核 |
| 📜 版本更新內容 | 首頁左上角面板，從 Ver 3.0 起每一版明細 |
| 🛒 商店 | 首頁按鈕（即將開放） |

---

## 環境變數（要開第三方登入一定要看這段）

到 Render → 你的服務 → **Environment** 新增：

| 變數 | 必填 | 說明 |
|---|---|---|
| `GOOGLE_CLIENT_ID` | 想用 Google 登入 | Google Cloud Console → OAuth 2.0 用戶端 ID |
| `GOOGLE_CLIENT_SECRET` | 同上 | 對應的密鑰 |
| `FACEBOOK_APP_ID` | 想用 FB 登入 | Meta for Developers → 應用程式 ID |
| `FACEBOOK_APP_SECRET` | 同上 | 應用程式密鑰 |
| `LINE_CHANNEL_ID` / `LINE_CHANNEL_SECRET` | 選用 | LINE Login channel |
| `BH_AUTH_SECRET` | 建議設定 | 簽 session / 存檔的密鑰；沒設會自動產生並存在資料夾 |
| `BH_PUBLIC_URL` | 建議設定 | 例：`https://bomb-hero-game.onrender.com`（OAuth 回呼網址用） |
| `BH_DATA_DIR` | 建議設定 | 帳號資料夾；免費方案請見下面「資料會不會不見」 |
| `BH_FORCE_HTTPS` | 不用設 | 預設 `1`（強制 https）；本機測試可設 `0` |

### 回呼網址（填在 Google / FB / LINE 後台）

```
https://bomb-hero-game.onrender.com/api/auth/google/callback
https://bomb-hero-game.onrender.com/api/auth/facebook/callback
https://bomb-hero-game.onrender.com/api/auth/line/callback
```

> 沒設定任何一組也**不會壞**：遊戲照常玩，彈窗裡的登入鈕會變灰並顯示
> 「站長還沒開通第三方登入」，玩家仍可用遊客模式。

### 資料會不會不見？（重要）

Render 免費方案的磁碟是**暫時的**，每次重新部署或服務重啟，`data/accounts.json` 會消失
→ 玩家帳號與雲端進度會歸零。正式上線請二選一：

1. **加掛 Render Disk**（Dashboard → Disks，1GB 即可），Mount Path 設 `/data`，
   再設環境變數 `BH_DATA_DIR=/data`（最簡單，推薦）。
2. 之後改接外部資料庫（Firebase / Supabase / PostgreSQL），把 `cloud.js` 的
   `createStore()` 換掉即可，其他驗證邏輯不用動。

---

## 更新後怎麼確認有成功

1. 開 https://bomb-hero-game.onrender.com/ → 版本號顯示 `v{ver}`
2. 右上角多一顆「👤 綁定帳號」（手機上是 👤 圖示），點開會看到「遊客」與三顆登入鈕
3. 玩一場 RPG 第 1 關 → 過關時右上角跳「☁️ 第 1 關進度已存到雲端」，回首頁重進仍在
4. 重新整理頁面 → 還是同一個遊客身分（不用重新配點）
5. 開 `https://bomb-hero-game.onrender.com/api/health` → 多出 `accounts` 與 `tamper` 兩個欄位

---

## 常見問題

**Q：一定要設定 Google / Facebook 才能玩嗎？**
不用。沒設定就是純遊客模式（進度一樣存在伺服器、一樣能跨裝置，只是綁不到正式帳號）。

**Q：玩家用 F12 改 LocalStorage 會怎樣？**
存檔信封有 HMAC 簽章，改一個字就驗不過 → 伺服器回 409 `SAVE_TAMPERED` 並拒絕載入；
`/api/health` 的 `tamper` 會 +1，方便你觀察有沒有有人在試。

**Q：可以放 GitHub Pages 嗎？**
只能玩單機（沒有後端 → 沒有雲端存檔與線上配對）。要完整功能請用 Render 或任何 Node 主機。
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
w('cloud.js', cloudjs)
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
