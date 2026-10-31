# 炸彈超人 網頁版（爆爆英雄 BOMB HERO）v3.2

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
