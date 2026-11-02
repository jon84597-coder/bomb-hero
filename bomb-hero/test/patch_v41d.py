# -*- coding: utf-8 -*-
"""patch_v41d.py —— 更新匯出打包腳本（cloud.js、帳號/雲端功能、環境變數、CHANGELOG v4.0/v4.1）"""
import io
P='test/build_export.py'
s=io.open(P,encoding='utf-8').read()

def rep(a,b,tag):
    global s
    assert s.count(a)==1, '[%s] %d' % (tag, s.count(a))
    s=s.replace(a,b)
    print('  ok '+tag)

rep("""cp(os.path.join(BO, 'server.js'), 'server.js')
cp(os.path.join(BO, 'package.json'), 'package.json')""",
"""cp(os.path.join(BO, 'server.js'), 'server.js')
cp(os.path.join(BO, 'cloud.js'), 'cloud.js')     # v4.1：帳號 / 登入 / 雲端存檔
cp(os.path.join(BO, 'package.json'), 'package.json')""", 'copy cloud.js')

rep("- 後端：`server.js`（只用 Node 內建 `http` / `fs` / `path`，**零依賴**）",
    "- 後端：`server.js` ＋ `cloud.js`（只用 Node 內建 `http` / `fs` / `path` / `crypto`，**零依賴**）\n"
    "- 帳號：Google / Facebook（另支援 LINE）OAuth 登入、遊客模式、雲端存檔、HMAC 簽章、限流", 'backend desc')

rep("├─ server.js               # ★ 後端：房間管理 / 狀態同步 / 靜態檔案（982 行，零依賴）",
    "├─ server.js               # ★ 後端：房間管理 / 狀態同步 / 靜態檔案（零依賴）\n"
    "├─ cloud.js                # ★ 帳號 / 第三方登入 / 雲端存檔 / 資安（零依賴）", 'tree server')

rep("   ├─ verify-v*.js         #   35 組版本驗證（1600+ 斷言）",
    "   ├─ verify-v*.js         #   37 組版本驗證（1900+ 斷言）\n"
    "   ├─ net-auth.js          #   帳號 / 存檔簽章 / 限流 / HTTPS 端到端測試", 'tree test')

rep("""| 變數 | 預設值 | 用途 |
|------|--------|------|
| `PORT` | `3000` | Render / Railway 會自己帶，本地不用設 |

> 後端零依賴、零設定：只要 `node server.js` 就能跑，沒有必填的環境變數。
> v3.6 曾內建「瀏覽人數／按讚」統計（`STATS_PATH` 等），v3.8 起已整組移除，不再需要任何統計設定。""",
"""| 變數 | 預設值 | 用途 |
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
> 正式上線請加掛 Render Disk（Mount `/data`）並設 `BH_DATA_DIR=/data`。""", 'env vars')

rep("""- **單人闖關**：7 關主題地圖""",
"""- **👤 帳號系統**：右上角常駐「綁定帳號」—— Google / Facebook（另支援 LINE）一鍵授權登入，
  不用記密碼；沒登入也能用**遊客模式**直接玩 RPG（本機身分基於 LocalStorage Device ID）
- **🔗 遊客無痛升級**：綁定時把遊客的關卡進度、配點、金幣**合併**進正式帳號（取聯集，不覆蓋、不歸零）
- **☁️ 雲端存檔**：進度存伺服器，換手機／換瀏覽器／清快取都還在；右上角綠燈＝已同步、紅燈＝離線
- **🛡️ 伺服器權威**：配點、10 格上限、關卡解鎖順序、金幣全部由後端計算，前端只能送「加哪一項」，
  亂改的數值一律不採信（`POST /api/rpg/spend`、`/api/rpg/stage-clear`）
- **🔐 資安**：全程強制 HTTPS ＋ HSTS、存檔 HMAC-SHA256 簽章（改檔即 409 `SAVE_TAMPERED`）、
  存檔 API 每秒 1 次限流、HttpOnly / SameSite Cookie
- **單人闖關**：7 關主題地圖""", 'features')

rep("""node _syntax.js                        # 語法檢查
node verify-v45.js                     # 逐版跑：node verify-v10.js … verify-v46.js（35 組）
node net-relay.js                      # 後端 relay API（線上配對）
node net-live.js                       # 端到端線上對戰
node smoke-v15.js                      # 瀏覽器煙霧測試（需本機 Chrome）""",
"""node _syntax.js                        # 語法檢查
node verify-v47.js                     # 逐版跑：node verify-v10.js … verify-v47.js（37 組）
node net-relay.js                      # 後端 relay API（線上配對）
node net-auth.js                       # 帳號 / 雲端存檔 / 簽章 / 限流（會自己起一個測試伺服器）
node net-live.js                       # 端到端線上對戰
node smoke-v15.js                      # 瀏覽器煙霧測試（需本機 Chrome）""", 'test cmds')

rep("""| **v{VER}** | 🎲 RPG 模式（測試版 Beta，獨立於一般闖關）：四維屬性 ❤️生命／🛡️防禦／👟速度／💥攻擊 各上限 10 格、初始 9 點配點（自訂或隨機）；👹 怪物導入血量與防禦分級（基礎 1~2／中階 2~4／飛行 1~3／BOSS 10+，40% 暴走、被炸彈砸到暈眩）；🗺️ 32 張動態地圖（8 主題 × 4 張，同主題共用調色盤與機關、不規則有機地形、4 種尺寸、尋路檢核）；📜 首頁左上角「版本更新內容」面板（自 Ver 3.0 起）；🛒 首頁商店鈕（即將開放） |""",
"""| v4.0 | 🎲 RPG 模式（測試版 Beta，獨立於一般闖關）：四維屬性 ❤️生命／🛡️防禦／👟速度／💥攻擊 各上限 10 格、初始 9 點配點（自訂或隨機）；👹 怪物導入血量與防禦分級（基礎 1~2／中階 2~4／飛行 1~3／BOSS 10+，40% 暴走、被炸彈砸到暈眩）；🗺️ 32 張動態地圖（8 主題 × 4 張，同主題共用調色盤與機關、不規則有機地形、4 種尺寸、尋路檢核）；📜 首頁左上角「版本更新內容」面板（自 Ver 3.0 起）；🛒 首頁商店鈕（即將開放） |
| **v{VER}** | 👤 帳號系統：右上角常駐「綁定帳號」，Google / Facebook（另支援 LINE）OAuth 一鍵登入；🎭 遊客模式免登入直接玩，綁定時把進度**合併**進正式帳號（不覆蓋）；☁️ 雲端存檔跨裝置續玩；🛡️ 配點／上限／解鎖順序／金幣全部改由後端計算；🔐 強制 HTTPS ＋ HSTS、存檔 HMAC 簽章、存檔 API 每秒 1 次限流、HttpOnly Cookie |""", 'changelog')

io.open(P,'w',encoding='utf-8',newline='\n').write(s)
print('[OK]')
