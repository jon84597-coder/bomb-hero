import io, os

HERE = os.path.dirname(os.path.abspath(__file__))
p = os.path.join(HERE, '.workbuddy', 'memory', 'MEMORY.md')
s = io.open(p, encoding='utf-8').read()

add = """- **Service Worker 快取版號（必做）**：`public/sw.js`、`bomberman-online/public/sw.js`、`bomb-hero/sw.js` **三份**都要跟著遊戲版號升（v4.13.0 之前一直卡在 v4.7.0 → 舊 index.html 黏在瀏覽器快取裡，LINE/FB 的 WebView 尤其嚴重 → 「我改了但使用者看不到」）。**每次改版都要記得升。**
- **Render 部署要持久磁碟（否則帳號會消失）**：Render 免費方案的檔案系統是暫時的 → 每次重新部署 `data/` 被清空 → 已註冊帳號全部消失、必須重新註冊。解法：用 repo 根目錄的 `render.yaml`（Render Blueprint：disk mount `/data`、sizeGB 1、`BH_DATA_DIR=/data`、`BH_AUTH_SECRET` generateValue），在 Render 後台按 Blueprint → Apply。程式端也會偵測並回 `persistWarning` 給前端顯示。
- **改伺服器端（cloud.js / server.js）要同步兩份**：遠端 repo 根目錄的那份才是 Render 實際使用的（`bomberman-online/` 整個被 .gitignore）→ 改完務必 `cp cloud.js bomberman-online/cloud.js`。
- **後台／功能開不起來時不要靜默 try/catch**：`try { Admin.open(); } catch (err) {}` 會讓使用者只看到一片空白、還查不出原因 → 改成把錯誤 toast 出來。
"""

anchor = "- **看起來「有黑底／有圓角」時，先量再改**"
assert s.count(anchor) == 1, 'anchor not found'
s = s.replace(anchor, add + anchor)
io.open(p, 'w', encoding='utf-8').write(s)
print('MEMORY.md updated (deployment + SW conventions)')
