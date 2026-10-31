# -*- coding: utf-8 -*-
# 把炸彈超人（爆爆英雄 BOMB HERO）專案打包成可上傳 GitHub 的完整壓縮檔
# 產出：
#   dist/bomb-hero-v3.2-complete.zip   ← 全部（含美術素材、測試截圖）
#   dist/bomb-hero-v3.2-code.zip       ← 純程式碼（不含 87MB 截圖與大型原始圖，約 5MB）
import io, os, shutil, zipfile, hashlib

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BH = os.path.join(ROOT, 'bomb-hero')
BO = os.path.join(ROOT, 'bomberman-online')
DIST = os.path.join(ROOT, 'dist')
STAGE = os.path.join(DIST, '_stage', 'bomb-hero-v3.2')

if os.path.isdir(STAGE):
    shutil.rmtree(STAGE)
os.makedirs(STAGE)

def cp(src, dst_rel):
    dst = os.path.join(STAGE, dst_rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy2(src, dst)
    return dst

# ---------- 1. 後端 ----------
cp(os.path.join(BO, 'server.js'), 'server.js')
cp(os.path.join(BO, 'package.json'), 'package.json')

# ---------- 2. 前端（遊戲本體）----------
cp(os.path.join(BH, 'index.html'), os.path.join('public', 'index.html'))

# ---------- 3. 舊版原型 HTML ----------
for name, src in [
    ('bomb-hero.html', os.path.join(BO, 'public', 'bomb-hero.html')),
    ('index-old.html', os.path.join(BO, 'public', 'index-old.html')),
    ('solo.html', os.path.join(BO, 'public', 'solo.html')),
    ('multi.html', os.path.join(BO, 'public', 'multi.html')),
    ('index-prototype.html', os.path.join(ROOT, 'bomberman', 'index.html')),
]:
    if os.path.exists(src):
        cp(src, os.path.join('legacy', name))

# ---------- 4. 建置工具 ----------
for name in ['_build_spa.py', '_spa_test.js']:
    src = os.path.join(BO, name)
    if os.path.exists(src):
        cp(src, os.path.join('tools', name))

# ---------- 5. 美術素材 ----------
shutil.copytree(os.path.join(BH, 'art'), os.path.join(STAGE, 'art'))

# ---------- 6. 測試（腳本＋截圖）----------
shutil.copytree(os.path.join(BH, 'test'), os.path.join(STAGE, 'test'))

# ---------- 7. README / .gitignore ----------
README = u'''# 炸彈超人 網頁版（爆爆英雄 BOMB HERO）v3.2

單檔、零依賴的炸彈超人遊戲 + Node.js 後端（房間制即時對戰）。
前端 `public/index.html` 是**一個檔案就包含全部 HTML / CSS / JavaScript 與圖片**，不需 npm install、不需打包工具。

- 版本：**v3.2**
- 前端：原生 HTML5 / Canvas / ES5+ 相容語法，**零第三方套件**
- 後端：`server.js`（只用 Node 內建 `http` / `fs` / `path`，**零依賴**）
- 連線方式：HTTP 短輪詢 `/api/relay/*`（不需 WebSocket，反向代理友善）

---

## 目錄結構

```
bomb-hero-v3.2/
├─ package.json            # npm start 進入點（無任何 dependencies）
├─ server.js               # 後端：房間管理 / 狀態同步 / 靜態檔案（零依賴 Node）
├─ public/
│  └─ index.html           # ★ 遊戲本體（單檔，含全部 HTML/CSS/JS/素材，約 1.5MB）
├─ legacy/                 # 早期原型 HTML（solo / multi / bomb-hero / 舊版 index）
├─ tools/                  # 建置與 SPA 測試腳本（_build_spa.py、_spa_test.js）
├─ art/                    # 美術素材與產生器（LOGO 去背、角色/BOSS 切圖、assets.js、parts.js）
└─ test/                   # 無頭測試：verify-v*.js（29 組）、net-relay / net-live、smoke-v15
                           #   + patch_v*.py（版本修補腳本）、i18n_*.js（10 語字典）、screenshots
```

---

## 本機執行

```bash
node server.js              # 或：npm start
# 開啟 http://localhost:3000
```

也可以用任何靜態伺服器只跑前端（`public/index.html` 會自動以目前網址作為 API 來源）：

```bash
npx serve public            # 或 python -m http.server -d public 8000
```

> 注意：**單人闖關、本機對戰**純前端就能玩；
> **「線上配對」**需要 `server.js` 提供 `/api/relay/*`，否則會顯示連線失敗。

---

## 部署

### A. GitHub Pages（純靜態，單人／本機對戰可玩）
1. 把本專案推上 GitHub。
2. Settings → Pages → Source 選 `main` / 分支根目錄（或 `/docs`）。
3. 若只想放遊戲檔：把 `public/index.html` 改名成 `index.html` 放到根目錄即可（單檔自足）。
4. 線上配對功能在純靜態環境無法使用（沒有 Node 後端）。

### B. Render / Railway / Fly.io / VPS（完整功能含線上配對）
- Build：無（`npm install` 也沒有套件要裝）
- Start：`node server.js`
- Port：讀 `process.env.PORT`（預設 3000），已綁定 `0.0.0.0`
- Node 版本：>= 18

### C. Docker（選用）
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## 遊戲功能

- **單人闖關**：7 關主題地圖、道具（炸彈數／火力／踢彈／手套／穿牆彈／遙控／滑板／坐騎恐龍）、BOSS 討伐
- **對戰模式**：2～8 人（可加 AI），三種難度，計時與勝場累計
- **線上配對**：房間制（4 碼房號）、房主開局、跨裝置即時同步
- **操作**：鍵盤 WASD / 方向鍵 + 空白鍵放彈；手機支援虛擬搖桿與觸控按鍵（直式／橫式都能玩）
- **多語言**：繁中、簡中、English、日本語、한국어、ไทย、Tiếng Việt、Русский、Deutsch、Italiano
- **作者公告欄**：首頁左上角可開合的公告（含 FB 連結）
- **儲存**：進度與設定存在 `localStorage`

---

## 測試

```bash
cd test
node _syntax.js          # 語法檢查
node verify.js
node verify-v10.js … node verify-v38.js   # 29 組無頭驗證（共 1500+ 斷言）
node smoke-v15.js        # 瀏覽器煙霧測試
node net-relay.js        # 後端 relay API 測試
node net-live.js         # 端到端線上對戰測試
```

---

## 版本演進（摘錄）

| 版本 | 重點 |
|------|------|
| v2.1 | LOGO 去背圖內嵌 |
| v2.4 | 「我」標記、BOSS 血量統一 |
| v2.5~v2.6 | 手機直式／橫式版面、坐騎招式鍵位置 |
| v2.7 | 10 語多語言系統 |
| v2.8 | PC／手機尺寸各自獨立、LOGO 放大、怪量與道具增加 |
| v2.9 | 對戰 HUD 改右上一橫排、遊戲中鎖定畫面 |
| v3.0 | 首頁左上角作者公告欄 |
| v3.1 | 獲獎人物縮小、右上角「下一步」快捷鈕 |
| **v3.2** | 玩家資訊欄移到最上面工具列左側、遊戲可視範圍再放大 |

---

## 授權與版權

本專案為**非營利興趣研究作品**，遊戲內美術素材與程式碼皆由作者以 AI 輔助製作。
若要做為公開用途，請自行替換素材或確認授權；程式碼部分可自由參考、修改與散佈（建議標註來源）。

作者：Jon.　FB：https://www.facebook.com/jon84597
'''
io.open(os.path.join(STAGE, 'README.md'), 'w', encoding='utf-8', newline='\n').write(README)

GITIGNORE = u'''node_modules/
npm-debug.log*
*.log
.DS_Store
Thumbs.db
.workbuddy/
*.genie
'''
io.open(os.path.join(STAGE, '.gitignore'), 'w', encoding='utf-8', newline='\n').write(GITIGNORE)

# ---------- 8. 打包 ----------
def md5(p):
    h = hashlib.md5()
    with open(p, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()

os.makedirs(DIST, exist_ok=True)
def make_zip(out_name, exclude_dirs=(), exclude_ext=()):
    out = os.path.join(DIST, out_name)
    n = 0
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for base, dirs, files in os.walk(STAGE):
            rel_base = os.path.relpath(base, STAGE).replace('\\', '/')
            if rel_base == '.':
                rel_base = ''
            skip_dirs = [d for d in dirs if any(
                (rel_base + '/' + d).lstrip('/') == e or
                (rel_base + '/' + d).lstrip('/').startswith(e + '/') for e in exclude_dirs)]
            for d in skip_dirs:
                dirs.remove(d)
            for fn in files:
                if fn.lower().endswith(exclude_ext):
                    continue
                p = os.path.join(base, fn)
                arc = ('bomb-hero-v3.2/' + (rel_base + '/' + fn).lstrip('/')) if rel_base else ('bomb-hero-v3.2/' + fn)
                z.write(p, arc)
                n += 1
    print('%s：%d 檔、%d bytes、md5=%s' % (out_name, n, os.path.getsize(out), md5(out)))
    return out

make_zip('bomb-hero-v3.2-complete.zip')
make_zip('bomb-hero-v3.2-code.zip', exclude_ext=('.png', '.jpg', '.jpeg'))

# ---------- 9. 校驗：zip 內遊戲檔與部署檔一致 ----------
with zipfile.ZipFile(os.path.join(DIST, 'bomb-hero-v3.2-complete.zip')) as z:
    data = z.read('bomb-hero-v3.2/public/index.html')
print('zip 內 public/index.html md5 =', hashlib.md5(data).hexdigest(), '、bytes =', len(data))
print('來源 bomb-hero/index.html md5 =', md5(os.path.join(BH, 'index.html')))
