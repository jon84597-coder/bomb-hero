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
cp(os.path.join(BO, 'package.json'), 'package.json')

# ---------- 2. 前端（遊戲本體，單檔）----------
cp(os.path.join(BH, 'index.html'), os.path.join('public', 'index.html'))

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
- 後端：`server.js`（只用 Node 內建 `http` / `fs` / `path`，**零依賴**）
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
├─ server.js               # ★ 後端：房間管理 / 狀態同步 / 靜態檔案（982 行，零依賴）
├─ public/
│  └─ index.html           # ★ 遊戲本體（單檔，約 1.6MB，含全部素材與 10 語字典）
├─ legacy/                 # 早期原型 HTML（solo / multi / bomb-hero / 舊版 index）
├─ tools/                  # 建置與 SPA 測試腳本（_build_spa.py、_spa_test.js）
├─ art/                    # 美術素材原始切圖 + 產生器（assets.js / parts.js，35MB）
└─ test/                   # 無頭測試與版本修補腳本
   ├─ _sandbox.js          #   假 DOM 沙盒（可在 Node 裡跑整支遊戲）
   ├─ _syntax.js           #   語法檢查
   ├─ verify-v*.js         #   35 組版本驗證（1600+ 斷言）
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

> 後端零依賴、零設定：只要 `node server.js` 就能跑，沒有必填的環境變數。
> v3.6 曾內建「瀏覽人數／按讚」統計（`STATS_PATH` 等），v3.8 起已整組移除，不再需要任何統計設定。

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
- **單人闖關**：7 關主題地圖（森林／沙漠／冰原／火山／機械／幽冥／魔王城）、BOSS 討伐、恐龍坐騎
- **道具**：炸彈數↑、火力↑、踢彈、手套、穿牆彈、遙控器、滑板、藥水、骷髏詛咒…共 11 種
- **坐騎**：恐龍蛋孵化 → 小龍（單向吐火）→ 進化紅龍（四方向吐火），可擋一次傷害
- **對戰模式**：2～8 人（可加 AI），三種難度，突死縮圈、復仇推車
- **線上配對**：4 碼房號、房主開局、跨裝置即時同步
- **📖 遊戲說明**：首頁內建六大分頁教學（基本操作／道具總覽／坐騎招式／場景機關／怪物圖鑑／實戰訣竅），
  小圖直接用遊戲自己的繪圖函式畫出來，跟實機一模一樣
- **📜 版本更新內容**：首頁左上角標籤，從 **Ver 3.0** 起每一版的更新明細都在裡面（每版持續追加）
- **🛒 商店**：首頁按鈕（目前顯示「準備中」，未來開放）
- **操作**：PC 鍵盤 WASD / 方向鍵 + 空白鍵；手機虛擬搖桿 + 觸控按鍵（直式／橫式都可玩）
- **多語言**：繁中、簡中、English、日本語、한국어、ไทย、Tiếng Việt、Русский、Deutsch、Italiano
- **精緻圖示**：黑色圓型炸彈（點燃火苗＋火星）、遙控彈 LED 面板、四層水滴火焰、頭上對話框台詞（10 語）；
  手機觸控按鈕直接用同一套美術畫在按鈕裡，外加三層同心金屬圓框
- **其它**：作者公告欄、進度與設定存 localStorage

---

## 測試

```bash
cd test
node _syntax.js                        # 語法檢查
node verify-v45.js                     # 逐版跑：node verify-v10.js … verify-v46.js（35 組）
node net-relay.js                      # 後端 relay API（線上配對）
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
| **v{VER}** | 🎲 RPG 模式（測試版 Beta，獨立於一般闖關）：四維屬性 ❤️生命／🛡️防禦／👟速度／💥攻擊 各上限 10 格、初始 9 點配點（自訂或隨機）；👹 怪物導入血量與防禦分級（基礎 1~2／中階 2~4／飛行 1~3／BOSS 10+，40% 暴走、被炸彈砸到暈眩）；🗺️ 32 張動態地圖（8 主題 × 4 張，同主題共用調色盤與機關、不規則有機地形、4 種尺寸、尋路檢核）；📜 首頁左上角「版本更新內容」面板（自 Ver 3.0 起）；🛒 首頁商店鈕（即將開放） |
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
