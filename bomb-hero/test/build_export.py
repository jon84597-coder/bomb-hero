# -*- coding: utf-8 -*-
# 把「爆爆英雄 BOMB HERO（炸彈超人網頁版）」專案打包成可直接上傳 GitHub 的壓縮檔。
# 版本號自動從 bomb-hero/index.html 的 `const VERSION = 'x.y'` 讀取，檔名跟著走。
#
# 產出三種包（放在 workspace 根目錄的 dist/）：
#   bomb-hero-vX.Y-complete.zip  ← 完整封存（含美術素材 + 全部測試截圖，體積最大）
#   bomb-hero-vX.Y-github.zip    ← ★ 建議上傳 GitHub：全部程式碼 + 美術素材，剔除 93MB 測試截圖
#   bomb-hero-vX.Y-code.zip      ← 純程式碼（不含任何圖片，幾 MB）
import io, os, re, shutil, tempfile, zipfile, hashlib

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BH = os.path.join(ROOT, 'bomb-hero')
BO = os.path.join(ROOT, 'bomberman-online')
DIST = os.path.join(ROOT, 'dist')

# ---------- 0. 讀版本號 ----------
def read_version():
    s = io.open(os.path.join(BH, 'index.html'), encoding='utf-8').read()
    m = re.search(r"const\s+VERSION\s*=\s*'([0-9]+\.[0-9]+)'", s)
    if not m:
        raise SystemExit('index.html 裡找不到 const VERSION')
    return m.group(1)

VER = read_version()
TAG = 'bomb-hero-v' + VER          # bomb-hero-v3.5
# 每次用一個全新的暫存目錄（系統 temp，交給 OS 自己清），
# 不去整包砍掉上一版的 _stage —— 那樣一次要刪 500+ 檔，會踩到批次刪除的安全確認
STAGE = tempfile.mkdtemp(prefix='bh-export-' + TAG + '-')
print('暫存：' + STAGE)

def cp(src, dst_rel):
    dst = os.path.join(STAGE, dst_rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy2(src, dst)
    return dst

print('版本：v' + VER + '　→　' + TAG)

# ---------- 1. 後端 ----------
cp(os.path.join(BO, 'server.js'), 'server.js')
cp(os.path.join(BO, 'cloud.js'), 'cloud.js')     # v4.1：帳號 / 登入 / 雲端存檔
cp(os.path.join(BO, 'package.json'), 'package.json')

# ---------- 2. 前端（遊戲本體，單檔）＋ v4.6 PWA ----------
cp(os.path.join(BH, 'index.html'), os.path.join('public', 'index.html'))
cp(os.path.join(BH, 'manifest.json'), os.path.join('public', 'manifest.json'))
cp(os.path.join(BH, 'sw.js'), os.path.join('public', 'sw.js'))
shutil.copytree(os.path.join(BH, 'icons'), os.path.join(STAGE, 'public', 'icons'))

# ---------- 3. 早期原型 HTML ----------
for name, src in [
    ('bomb-hero.html', os.path.join(BO, 'public', 'bomb-hero.html')),
    ('index-old.html', os.path.join(BO, 'public', 'index-old.html')),
    ('solo.html', os.path.join(BO, 'public', 'solo.html')),
    ('multi.html', os.path.join(BO, 'public', 'multi.html')),
    ('index-prototype.html', os.path.join(ROOT, 'bomberman', 'index.html')),
]:
    if os.path.exists(src):
        cp(src, os.path.join('legacy', name))

# ---------- 4. 建置／SPA 工具 ----------
for name in ['_build_spa.py', '_spa_test.js']:
    src = os.path.join(BO, name)
    if os.path.exists(src):
        cp(src, os.path.join('tools', name))

# ---------- 5. 美術素材（切圖來源 + 產生器）----------
shutil.copytree(os.path.join(BH, 'art'), os.path.join(STAGE, 'art'))

# ---------- 6. 測試腳本（含截圖，後面再由 zip 規則決定要不要帶）----------
shutil.copytree(os.path.join(BH, 'test'), os.path.join(STAGE, 'test'))

# ---------- 7. GitHub Pages 自動部署 ----------
os.makedirs(os.path.join(STAGE, '.github', 'workflows'), exist_ok=True)
PAGES_YML = u'''# 把 public/ 丟上 GitHub Pages（靜態託管，單人闖關／本機對戰可玩）
# 啟用方式：Repo → Settings → Pages → Source 選「GitHub Actions」
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./public
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
'''
io.open(os.path.join(STAGE, '.github', 'workflows', 'pages.yml'), 'w',
        encoding='utf-8', newline='\n').write(PAGES_YML)

# ---------- 8. README / CHANGELOG / .gitignore ----------
README = u'''# 炸彈超人 網頁版 — 爆爆英雄 BOMB HERO v{VER}

單檔、零依賴的炸彈超人遊戲，外加一支零依賴的 Node.js 後端（房間制即時對戰）。
前端 `public/index.html` **一個檔案就包含全部 HTML / CSS / JavaScript 與圖片**，
不用 npm install、不用打包工具，雙擊就能玩。

- 版本：**v{VER}**
- 前端：原生 HTML5 / Canvas / ES5+ 相容語法，**零第三方套件**
- 後端：`server.js` ＋ `cloud.js`（只用 Node 內建 `http` / `fs` / `path` / `crypto`，**零依賴**）
- 帳號：Google / Facebook（另支援 LINE）OAuth 登入、遊客模式、雲端存檔、HMAC 簽章、限流
- 手機操作：**全域隱形滑動區**（半邊畫面任意處＝搖桿中心）或**虛擬搖桿**（可拖曳位置、三段大小）
- PWA：首頁右上角可「📱 下載 App」，裝到電腦桌面／手機主畫面後以全螢幕獨立視窗執行；Service Worker 離線快取
- 版面：橫放／直放都自動塞滿可視高度（畫布不再被 4:3 撐高、觸控鍵不會跑到畫面外）
- 連線方式：HTTP 短輪詢 `/api/relay/*`（不需 WebSocket，任何反向代理都吃）

---

## 目錄結構

```
{TAG}/
├─ README.md               # 本文件（含 GitHub 上傳、部署步驟）
├─ CHANGELOG.md            # v2.1 ~ v{VER} 完整版本演進
├─ .gitignore
├─ .github/
│  └─ workflows/pages.yml  # GitHub Pages 自動部署（把 public/ 發布出去）
├─ package.json            # npm start 進入點（dependencies 為空）
├─ server.js               # ★ 後端：房間管理 / 狀態同步 / 靜態檔案（零依賴）
├─ cloud.js                # ★ 帳號 / 第三方登入 / 雲端存檔 / 資安（零依賴）
├─ public/
│  ├─ index.html           # ★ 遊戲本體（單檔，約 1.8MB，含全部素材與 10 語字典）
│  ├─ manifest.json       # v4.6 PWA 安裝資訊（name / icons / display: standalone）
│  ├─ sw.js                # v4.6 Service Worker（離線快取，/api/ 不快取）
│  └─ icons/               # v4.6 捷徑圖示（192 / 512 / maskable / apple-touch / favicon）
├─ legacy/                 # 早期原型 HTML（solo / multi / bomb-hero / 舊版 index）
├─ tools/                  # 建置與 SPA 測試腳本（_build_spa.py、_spa_test.js）
├─ art/                    # 美術素材原始切圖 + 產生器（assets.js / parts.js，35MB）
└─ test/                   # 無頭測試與版本修補腳本
   ├─ _sandbox.js          #   假 DOM 沙盒（可在 Node 裡跑整支遊戲）
   ├─ _syntax.js           #   語法檢查
   ├─ verify-v*.js         #   43 組版本驗證（2100+ 斷言）
   ├─ net-auth.js          #   帳號 / 存檔簽章 / 限流 / HTTPS 端到端測試
   ├─ net-relay.js         #   後端 relay API 測試
   ├─ net-live.js          #   端到端線上對戰測試
   ├─ smoke-v15.js         #   真實瀏覽器（CDP）煙霧測試
   ├─ cdp.js               #   Chrome DevTools Protocol 小工具（截圖用）
   ├─ patch_v*.py          #   每個版本的修補腳本（永久保存開發歷程）
   ├─ i18n_*.js            #   10 語字典
   └─ *.png                #   版面截圖（僅 -complete.zip 有，佔 93MB）
```

---

## 本機執行

```bash
node server.js              # 或：npm start
# 打開 http://localhost:3000
```

只想跑前端的話，任何靜態伺服器都行（`public/index.html` 會自動用目前網址當 API 來源）：

```bash
npx serve public            # 或 python -m http.server -d public 8000
```

> **單人闖關、本機對戰**：純前端就能玩（直接開 `public/index.html` 也行）。
> **「線上配對」**：需要 `server.js` 提供 `/api/relay/*`，否則會顯示明確的連線失敗指引。

---

## 上傳 GitHub（永久保存 + 部署）

### 1. 建立 Repo 並推上去

```bash
# 解壓後進入資料夾
cd {TAG}
git init
git add -A
git commit -m "BOMB HERO v{VER}"
git branch -M main
git remote add origin https://github.com/<你的帳號>/<repo 名稱>.git
git push -u origin main
```

> 建議上傳 **`-github.zip`**（已剔除 93MB 測試截圖，約 40MB）。
> 若要連同所有歷史截圖一起永久保存，改用 `-complete.zip`。

### 2. 部署

#### A. GitHub Pages（純靜態 → 單人闖關、本機對戰可玩）

1. Repo → **Settings → Pages → Source** 選 **GitHub Actions**。
2. 內附的 `.github/workflows/pages.yml` 會在 push 到 `main` 時自動把 `public/` 發布出去。
3. 網址為 `https://<帳號>.github.io/<repo>/`。
4. 線上配對在純靜態環境**無法**使用（沒有 Node 後端），遊戲會顯示對應提示。

> 想最單純：把 `public/index.html` 改名搬到 repo 根目錄，Pages 選「Deploy from branch / root」即可，
> 因為那是單檔自足的檔案。

#### B. Render / Railway / Fly.io / VPS（完整功能含線上配對）

| 項目 | 值 |
|------|------|
| Build Command | 無（沒有套件要裝） |
| Start Command | `node server.js` |
| Port | 讀 `process.env.PORT`（預設 3000），已綁 `0.0.0.0` |
| Node | >= 18 |

##### 環境變數

| 變數 | 預設值 | 用途 |
|------|--------|------|
| `PORT` | `3000` | Render / Railway 會自己帶，本地不用設 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | 無 | Google 登入（沒設＝該按鈕變灰，其他功能照常） |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` | 無 | Facebook 登入 |
| `LINE_CHANNEL_ID` / `LINE_CHANNEL_SECRET` | 無 | LINE 登入（選用） |
| `BH_AUTH_SECRET` | 自動產生 | 簽 session 與存檔的密鑰，正式環境建議自己設一組長字串 |
| `BH_PUBLIC_URL` | 自動判斷 | 例 `https://bomb-hero-game.onrender.com`，OAuth 回呼網址用 |
| `BH_DATA_DIR` | `./data` | 帳號資料夾；雲端平台請指向持久磁碟（如 `/data`） |
| `BH_FORCE_HTTPS` | `1` | 強制 https 轉址；本機測試可設 `0` |

> 除了資料庫路徑以外都**不是必填**：沒設第三方登入金鑰也能跑，玩家用遊客模式玩，
> 登入鈕會變灰並提示「站長還沒開通」。
>
> ⚠️ Render 免費方案的磁碟是暫時的 —— 沒掛持久磁碟的話，重新部署會讓帳號與雲端進度歸零。
> 正式上線請加掛 Render Disk（Mount `/data`）並設 `BH_DATA_DIR=/data`。

#### C. Docker（選用）

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## 遊戲功能

- **🎲 RPG 模式（測試版 Beta）**：首頁獨立入口，與一般闖關完全分開。四維屬性
  ❤️生命／🛡️防禦／👟速度／💥攻擊 **各上限 10 格**，角色初始只有 **9 點** 可配
  （可自訂或「電腦隨機分配」），配點即時換算成血量／護甲／移速／火力與傷害
- **32 張動態地圖（RPG）**：8 大主題 × 4 張小地圖（綠野草原／熔岩洞窟／冰雪原／沙漠遺跡／
  夜光彩城／深海遺跡／天空要塞／暗黑魔王城）。同主題共用底色與機關（冰面／輸送帶／傳送門），
  不規則有機地形（L 形、環形、洞窟、群島、迷宮），尺寸 小 13×11／中 15×13／大 17×15／超大 21×15，
  生成後做**尋路檢核**，起點一定走得到出口
- **怪物分級（RPG）**：基礎小怪 1~2 格、中階 2~4 格（鐵甲蟲／骷髏兵有硬殼防禦）、飛行 1~3 格（穿牆）；
  BOSS 10 格以上，血量低於 **40% 暴走**（更快、丟彈更兇、同場 6 顆），被炸彈砸到會**暈眩**
- **🩸 受傷提示輕量化**：以前受傷會在**畫面正中央**彈出 `clamp(52px,10vmin,110px)` 的巨大
  「❤️ 4 / 5　🛡️ 0 / 2」，手機上還會換成兩行、整片蓋住戰場；這組中央大字**已完全移除**，改成三件事：
  ① 角色**頭頂**冒出小紅字 `-1`（護甲在擋時是藍字），0.5 秒往上輕飄並淡出，深色外框＋白色內框三層描邊；
  ② 畫布**四邊**閃一圈柔和紅光（中央完全透明、約 0.3 秒收完，護甲擋下時是藍光）；
  ③ 頂部「❤️ 4/5」放大 **1.2 倍**並閃一次紅光、數字轉紅；只扣護甲時改成 **🛡️ 護甲列轉藍**
     （和藍字、藍光同一套顏色語言；道具的「好東西」仍是金色 1.38 倍，三種回饋不會搞混）
- **📢 道具提示輕量化**：吃到道具／恐龍蛋時，原本蓋在地圖左上角的大方塊（寬 46%、不透明深底）已移除，
  改成貼在**頂部資訊列下緣**的細長半透明橫幅（毛玻璃＋圓角 14px，手機上也只有 32px 高）：
  淡入 → 停留 2 秒 → 淡出，全程 `pointer-events:none`，**不擋點擊也不擋走位**
- **✨ 狀態列聯動**：拿到什麼，對應的頂部圖示就彈一下（scale 1 → 1.38 → 1）＋亮一圈金色光圈 ——
  火力 🔥／炸彈 💣／速度 🛼／生命 ❤️，以及背包 🎒 裡剛拿到的那一格（手套 🧤、踢鞋 🥾、遙控器 📱…）；
  遙控器因為順便 +1 彈量，會同時亮 📱 與 💣；坐騎則同步閃 🦖
- **🔁 連吃不亂跳**：2 秒內再吃到第二個只換文字並重置停留時間，不重播上浮動畫、也不會疊成兩條
- **🔑 傳統帳密註冊**：帳號彈窗有「登入／註冊／第三方」三分頁，可直接用 **Email 或使用者名稱 + 密碼**
  註冊；打字當下即時驗證（帳號 3~20 位英數字或完整 Email、密碼至少 8 位且需英數混合）＋
  三段式強度條＋兩次密碼一致性檢查
- **🔐 密碼絕不明文**：`crypto.scrypt`（N=16384, r=8, p=1, 64 bytes）＋每人一組 16 bytes 隨機鹽單向雜湊，
  只存鹽與雜湊值；比對用 `timingSafeEqual`，帳號不存在時也跑一次同樣的雜湊（不洩漏帳號是否存在）；
  連錯 5 次鎖 5 分鐘，註冊／登入／改密碼／後台各自限流
- **🛠️ 開發者帳號**：`jon84597@gmail.com` 由後端標記 Developer —— RPG 32 張地圖＋單人 8 關（含 BOSS）
  全部解鎖、可跳關測試；內部版本（`dev:true`）與測試條目**不會出現在玩家的版本更新面板**
- **📊 後台數據看板**（僅開發者）：會員名單含 UID／來源平台／第三方平台 ID／註冊 IP／加入時間（精確到秒）、
  上線次數、各關卡遊玩頻率、停留時間；操作足跡（配點／通關／道具）＋客服工具（查詢、修存檔、重置配點、
  停權／解除）＋**全服公告**（免重新部署即時發布）
- **👤 帳號系統**：右上角常駐「綁定帳號」—— Google / Facebook（另支援 LINE）一鍵授權登入，
  不用記密碼；沒登入也能用**遊客模式**直接玩 RPG（本機身分基於 LocalStorage Device ID）
- **🔗 遊客無痛升級**：綁定時把遊客的關卡進度、配點、金幣**合併**進正式帳號（取聯集，不覆蓋、不歸零）
- **☁️ 雲端存檔**：進度存伺服器，換手機／換瀏覽器／清快取都還在；右上角綠燈＝已同步、紅燈＝離線
- **🛡️ 伺服器權威**：配點、10 格上限、關卡解鎖順序、金幣全部由後端計算，前端只能送「加哪一項」，
  亂改的數值一律不採信（`POST /api/rpg/spend`、`/api/rpg/stage-clear`）
- **🔐 資安**：全程強制 HTTPS ＋ HSTS、存檔 HMAC-SHA256 簽章（改檔即 409 `SAVE_TAMPERED`）、
  存檔 API 每秒 1 次限流、HttpOnly / SameSite Cookie
- **單人闖關**：7 關主題地圖（森林／沙漠／冰原／火山／機械／幽冥／魔王城）、BOSS 討伐、恐龍坐騎
- **道具**：炸彈數↑、火力↑、踢彈、手套、穿牆彈、遙控器、滑板、藥水、骷髏詛咒…共 11 種
- **坐騎**：恐龍蛋孵化 → 小龍（單向吐火）→ 進化紅龍（四方向吐火），可擋一次傷害
- **對戰模式**：2～8 人（可加 AI），三種難度，突死縮圈、復仇推車
- **線上配對**：4 碼房號、房主開局、跨裝置即時同步
- **📖 遊戲說明**：首頁內建六大分頁教學（基本操作／道具總覽／坐騎招式／場景機關／怪物圖鑑／實戰訣竅），
  小圖直接用遊戲自己的繪圖函式畫出來，跟實機一模一樣
- **📜 版本更新內容**：首頁左上角標籤，從 **Ver 3.0** 起每一版的更新明細都在裡面（每版持續追加）
- **🛒 商店**：首頁按鈕（目前顯示「準備中」，未來開放）
- **操作**：PC 鍵盤 WASD / 方向鍵 + 空白鍵；手機兩種模式可切換 —— **隱形滑動區**（推薦，半邊畫面按下去就往那個方向走，區內沒有任何圖示）或**虛擬搖桿**（可拖曳到順手的位置、大小小／中／大）；直式／橫式都可玩，畫面自動塞滿可視高度
- **多語言**：繁中、簡中、English、日本語、한국어、ไทย、Tiếng Việt、Русский、Deutsch、Italiano
- **精緻圖示**：黑色圓型炸彈（點燃火苗＋火星）、遙控彈 LED 面板、四層水滴火焰、頭上對話框台詞（10 語）；
  手機觸控按鈕直接用同一套美術畫在按鈕裡，外加三層同心金屬圓框
- **其它**：作者公告欄、進度與設定存 localStorage

---

## 測試

```bash
cd test
node _syntax.js                        # 語法檢查
node verify-v53.js                     # 逐版跑：node verify-v10.js … verify-v53.js（43 組）
node net-relay.js                      # 後端 relay API（線上配對）
node net-auth.js                       # 帳號 / 雲端存檔 / 簽章 / 限流（會自己起一個測試伺服器）
node net-live.js                       # 端到端線上對戰
node smoke-v15.js                      # 瀏覽器煙霧測試（需本機 Chrome）
```

---

## 版權

本專案為**非營利興趣研究作品**，遊戲內美術素材與程式碼皆由作者以 AI 輔助製作。
若要公開或商業使用，請自行替換素材並確認授權；程式碼可自由參考、修改與散佈（建議標註來源）。

作者：Jon.　FB：https://www.facebook.com/jon84597
'''.replace('{VER}', VER).replace('{TAG}', TAG)
io.open(os.path.join(STAGE, 'README.md'), 'w', encoding='utf-8', newline='\n').write(README)

CHANGELOG = u'''# 版本演進

| 版本 | 重點 |
|------|------|
| v2.1 | LOGO 去背圖內嵌 |
| v2.4 | 「我」標記、BOSS 血量統一 |
| v2.5 ~ v2.6 | 手機直式／橫式版面、坐騎招式鍵位置 |
| v2.7 | 10 語多語言系統 |
| v2.8 | PC／手機尺寸各自獨立、LOGO 放大貼邊、怪量與道具數量提升 |
| v2.9 | 對戰 HUD 改右上橫排、遊戲中鎖定畫面捲動 |
| v3.0 | 首頁左上角作者公告欄（含 FB 連結、可收合） |
| v3.1 | 獲獎人物縮小、右上角「下一步」快捷鈕 |
| v3.2 | 玩家資訊欄移到最上方工具列左側、遊戲可視範圍再放大 |
| v3.3 | 線上配對錯誤訊息人話化（file://／無後端都給明確指引） |
| v3.4 | 修手機誤觸系統返回手勢，導致玩到一半跳出暫停選單 |
| v3.5 | 首頁新增「📖 遊戲說明」六大分頁教學（道具圖鑑／坐騎比較表／場景機關／怪物圖鑑／實戰訣竅），小圖直接重用遊戲自己的畫法 |
| v3.6 | 首頁左上角「👁 實際瀏覽人數 ＋ 👍 按讚」；後端新增 /api/stats/*；沒有後端時自動退回本機統計 |
| v3.7 | 統計針對雲端平台更耐用：請求逾時＋背景重試、持久磁碟（STATS_PATH）、結束訊號同步落盤、自動還原（STATS_RESTORE_URL） |
| v3.8 | 💣 炸彈／遙控彈／火焰圖示重繪；💬 頭上對話框台詞換新（10 語）；🏆 勝利過場加長＋8-bit 勝利音樂；🌋 第二關配色提亮；🗑️ 移除瀏覽人數／按讚 |
| v3.9 | 📱 手機觸控按鈕圖示換成場上真實美術（黑亮圓球炸彈／LED 遙控彈／四層水滴火焰），並加上三層同心金屬圓框（放彈橘銅、遙控青色、吐火火紅＋外緣細白線＋玻璃反光） |
| v4.0 | 🎲 RPG 模式（測試版 Beta，獨立於一般闖關）：四維屬性 ❤️生命／🛡️防禦／👟速度／💥攻擊 各上限 10 格、初始 9 點配點（自訂或隨機）；👹 怪物導入血量與防禦分級（基礎 1~2／中階 2~4／飛行 1~3／BOSS 10+，40% 暴走、被炸彈砸到暈眩）；🗺️ 32 張動態地圖（8 主題 × 4 張，同主題共用調色盤與機關、不規則有機地形、4 種尺寸、尋路檢核）；📜 首頁左上角「版本更新內容」面板（自 Ver 3.0 起）；🛒 首頁商店鈕（即將開放） |
| v4.1 | 👤 帳號系統：右上角常駐「綁定帳號」，Google / Facebook（另支援 LINE）OAuth 一鍵登入；🎭 遊客模式免登入直接玩，綁定時把進度**合併**進正式帳號（不覆蓋）；☁️ 雲端存檔跨裝置續玩；🛡️ 配點／上限／解鎖順序／金幣全部改由後端計算；🔐 強制 HTTPS ＋ HSTS、存檔 HMAC 簽章、存檔 API 每秒 1 次限流、HttpOnly Cookie |
| v4.2 | 📱 手機移動操作雙軌：**全域隱形滑動區**（半邊畫面任意處按下即為搖桿中心、區內零圖示、9px 死區、滑多遠都不斷線）與**虛擬搖桿**（可拖曳到任意位置、大小小／中／大）；🚫 隱形區壓在按鈕下層，放彈／引爆／吐火鍵永遠優先且互不吃事件；☁️ 操作版面（模式／左右／大小／自訂位置）一併寫進雲端存檔；📐 修正橫放／直放版面 —— 畫布不再被 4:3 比例撐高（橫放 390px 螢幕原本用了 705px，放彈鍵跑到畫面外），HUD 壓成一行，直放也從 171px 一條變成填滿畫面 |
| v4.3 | 🔑 傳統帳密註冊：帳號彈窗「登入／註冊／第三方」三分頁，可用 Email 或使用者名稱 + 密碼註冊；前端即時驗證（帳號 3~20 位英數字或完整 Email、密碼 ≥8 位需英數混合）＋三段式強度條＋兩次密碼一致性檢查；🔐 密碼以 `crypto.scrypt`（N=16384,r=8,p=1,64B）＋每人 16B 隨機鹽單向雜湊，只存鹽與雜湊值、比對用 `timingSafeEqual`、帳號不存在也跑一次雜湊（不洩漏存在性）；連錯 5 次鎖 5 分鐘；🎭 遊客註冊時整包轉移進度；🛠️ 開發者帳號 `jon84597@gmail.com` 全關卡解鎖（RPG 32 張＋單人 8 關含 BOSS）、可跳關；🙈 內部版本與測試條目對玩家隱藏（版本紀錄豁免）；📊 後台數據看板（UID／來源／第三方 ID／註冊 IP／加入時間到秒、上線次數、各關卡頻率、停留時間）；🔎 操作足跡；🧰 客服工具（查詢、修存檔、重置配點、停權）＋全服公告 |
| v4.4 | 📢 道具／坐騎提示輕量化：移除蓋在地圖左上角的大方塊（寬 46%、不透明深底），改成貼在**頂部資訊列下緣**的細長半透明橫幅（毛玻璃＋圓角 14px、手機僅 32px 高），淡入 → 停留 2 秒 → 淡出，全程 `pointer-events:none` 不擋點擊與走位；2 秒內連吃只換文字不重播；✨ 頂部狀態列聯動 —— 火力 🔥／炸彈 💣／速度 🛼／生命 ❤️ 與背包 🎒 剛拿到的那一格（手套／踢鞋／遙控器／穿透彈／恐龍…）同步彈跳＋亮光圈，遙控器同時亮 📱 與 💣；♿ 系統「減少動態」時自動關掉彈跳 |
| v4.5 | 🩸 受傷提示輕量化：移除**畫面正中央**的巨大血量數字（`clamp(52px,10vmin,110px)` 的「❤️ 4 / 5　🛡️ 0 / 2」，手機上會換成兩行整片蓋住地圖）；改成 ① 角色頭頂冒出 `-1` 小紅字（護甲擋下時藍字），0.5 秒往上飄並淡出、三層描邊（深外框＋白內框）② 畫布四邊柔和紅光一閃（中央 `alpha 0` 完全透明、約 0.3 秒收完，護甲時轉藍）③ 頂部「❤️ 4/5」放大 1.2 倍＋閃一次紅光並轉紅、只扣護甲時改轉藍（道具仍是金色 1.38 倍）；連續受傷最多 8 顆、換場自動清空；♿ 減少動態時關掉彈跳 |
| v4.6 | 📱 PWA 桌面捷徑：首頁右上角「📱 下載 App」攔截 `beforeinstallprompt` 一鍵安裝到電腦桌面／手機主畫面，捷徑開啟為 `display: standalone` 全螢幕；192／512／maskable 炸彈 LOGO 圖示＋iPhone apple-touch-icon；iOS Safari 走「分享 → 加入主畫面」圖文引導；已安裝／獨立視窗自動隱藏按鈕；Service Worker 快取本體與圖示（`/api/` 一律不快取），改版自動清舊快取 |
| **v{VER}** | 🕊️ 飛行小怪降速：四種基礎速度 −35%、關卡成長 2.6 → 1.2、上限 118 → 78（玩家 146），追人機率 60% → 35% 且轉向間隔拉長，RPG 倍率同步降到 0.80~0.90；👁 密碼欄位可切換顯示／隱藏（三欄共用產生器、不清值、游標不跑、強度條與一致性檢查照常、10 語提示＋無障礙標籤） |
'''.replace('{VER}', VER)
io.open(os.path.join(STAGE, 'CHANGELOG.md'), 'w', encoding='utf-8', newline='\n').write(CHANGELOG)

GITIGNORE = u'''node_modules/
npm-debug.log*
*.log
.DS_Store
Thumbs.db
__pycache__/
.workbuddy/
*.genie
# v4.1：帳號資料（含個資與 session 密鑰）絕對不要進 git
data/
*.bad-*
'''
io.open(os.path.join(STAGE, '.gitignore'), 'w', encoding='utf-8', newline='\n').write(GITIGNORE)

# ---------- 9. 打包 ----------
def md5(p):
    h = hashlib.md5()
    with open(p, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()

IMG_EXT = ('.png', '.jpg', '.jpeg', '.gif', '.webp')
SKIP_DIRS = ('__pycache__', '.git', 'node_modules', '.workbuddy')

os.makedirs(DIST, exist_ok=True)

def make_zip(out_name, keep=None):
    """keep(rel_path_lower, name_lower) -> True 表示保留"""
    out = os.path.join(DIST, out_name)
    n = 0
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for base, dirs, files in os.walk(STAGE):
            for d in list(dirs):
                if d.lower() in SKIP_DIRS:
                    dirs.remove(d)
            for fn in files:
                rel = os.path.relpath(os.path.join(base, fn), STAGE).replace('\\', '/')
                if keep and not keep(rel.lower(), fn.lower()):
                    continue
                z.write(os.path.join(base, fn), TAG + '/' + rel)
                n += 1
    print('%-34s %4d 檔  %8.2f MB  md5=%s' % (out_name, n, os.path.getsize(out) / 1048576.0, md5(out)))
    return n

# 完整封存：什麼都收
make_zip(TAG + '-complete.zip')

# GitHub 建議包：全部程式碼 + 美術素材，剔除 test/ 底下的圖片（93MB 截圖）
def keep_github(rel, fn):
    if rel.startswith('test/') and fn.endswith(IMG_EXT):
        return False
    return True

make_zip(TAG + '-github.zip', keep_github)

# 純程式碼：不含任何圖片
def keep_code(rel, fn):
    return not fn.endswith(IMG_EXT)

make_zip(TAG + '-code.zip', keep_code)

# ---------- 10. 校驗 ----------
src_md5 = md5(os.path.join(BH, 'index.html'))
for zn in (TAG + '-complete.zip', TAG + '-github.zip', TAG + '-code.zip'):
    with zipfile.ZipFile(os.path.join(DIST, zn)) as z:
        d = z.read(TAG + '/public/index.html')
    assert hashlib.md5(d).hexdigest() == src_md5, zn + ' 內的 index.html 與來源不一致'
    print('%-34s public/index.html md5 一致（%d bytes）' % (zn, len(d)))
print('來源 bomb-hero/index.html md5 =', src_md5)
print('完成：v' + VER)
