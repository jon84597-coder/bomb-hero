# -*- coding: utf-8 -*-
"""
補齊 v4.6 未完成的打包收尾（PWA 檔案沒進更新包）＋ v4.7 說明文案。
只改兩個建置腳本，不改遊戲本體。用 newline='' 保留原檔換行符。
"""
import io

def load(p):
    return io.open(p, encoding='utf-8', newline='').read()

def save(p, s):
    io.open(p, 'w', encoding='utf-8', newline='').write(s)

def rep(s, old, new, tag):
    """冪等：一定要「先」檢查 new 是否已在檔案裡。
    很多 new 是「old + 新增行」，若先算 old 的出現次數會永遠是 1，
    重跑時就會一直重複插入（這個坑踩過一次）。"""
    if new in s:
        print('  --  ' + tag + '（已套用，跳過）')
        return s
    c = s.count(old)
    if c != 1:
        raise SystemExit('[FAIL] %s：預期 1 次，實際 %d 次' % (tag, c))
    print('  ok  ' + tag)
    return s.replace(old, new)

# ============================================================
print('--- build_render.py ---')
p = 'bomb-hero/test/build_render.py'
s = load(p)
E = '\r\n' if '\r\n' in s else '\n'

s = rep(s,
    '    public/index.html  遊戲本體（v4.3：傳統帳密註冊／開發者後台／全服公告）',
    '    public/index.html  遊戲本體（v4.7：PWA 桌面捷徑／飛行怪降速／密碼顯示切換）' + E +
    '    public/manifest.json / public/sw.js / public/icons/  （v4.6 PWA）',
    'docstring 檔案清單')

# 讀取 PWA 三個來源
s = rep(s,
    "html_txt = read_bytes(os.path.join(ROOT, 'index.html')).decode('utf-8')",
    "html_txt = read_bytes(os.path.join(ROOT, 'index.html')).decode('utf-8')" + E +
    "manifest_txt = read_bytes(os.path.join(ROOT, 'manifest.json')).decode('utf-8')" + E +
    "swjs_txt = read_bytes(os.path.join(ROOT, 'sw.js')).decode('utf-8')",
    '讀取 manifest / sw.js')

s = rep(s,
    E.join([
        'server.js              ← 覆蓋',
        'cloud.js               ← 新增（帳號 / 登入 / 雲端存檔，沒放會開不起來）',
        'package.json           ← 覆蓋',
        'public/index.html      ← 覆蓋',
    ]),
    E.join([
        'server.js              ← 覆蓋',
        'cloud.js               ← 新增（帳號 / 登入 / 雲端存檔，沒放會開不起來）',
        'package.json           ← 覆蓋',
        'public/index.html      ← 覆蓋',
        'public/manifest.json   ← 新增（v4.6 PWA 安裝資訊，少這顆就不能裝桌面）',
        'public/sw.js           ← 新增（v4.6 Service Worker，離線快取用）',
        'public/icons/          ← 新增（v4.6 捷徑圖示，7 張 PNG，整包資料夾覆蓋）',
    ]),
    'RENDER.md 覆蓋清單補 PWA')

s = rep(s,
    '標題下方的版本號應該變成 `v{ver}`；受傷時畫面中央不會再彈出巨大血量數字，改成頭上飄字＋邊緣紅光＋血量列放大。',
    '標題下方的版本號應該變成 `v{ver}`；首頁右上角會多一顆「📱 下載 App」，'
    '註冊／登入的密碼欄右邊多一顆 👁（按一下顯示密碼）；'
    '闖關時飛行小怪明顯變慢，不會一進場就被追著撞死。',
    'RENDER.md 開頭驗證提示')

# 在「這次更新了什麼」標題後插入 v4.7 / v4.6 表格，原本的 v4.5 表格順勢降為「上一版」
HEAD = '## 這次更新了什麼（v{ver}）' + E + E
NEW_TABLES = E.join([
    '| 項目 | 說明 |',
    '|---|---|',
    '| 🕊️ 飛行小怪降速 | 蝙蝠／幽靈／毒蜂／眼球怪基礎速度調降約 35%，關卡加深的加速度從每關 +2.6 砍到 +1.2；速度上限 118 → **78**（玩家基礎 146）。困難難度第 8 關最快也只有約 56，跑得掉 |',
    '| 🎯 不再一路死追 | 直接朝玩家飛的機率 60% → **35%**，轉向間隔與開場延遲都拉長（開場先給 1.6~3.2 秒喘息），追擊角度也加了一點偏移 |',
    '| 🎲 RPG 同步 | 32 張地圖裡四種飛行怪的速度倍率一併降到 0.80~0.90（原本 1.00~1.12） |',
    '| 👁 密碼可切換顯示 | 登入／註冊／改密碼的密碼欄右側多一顆 👁，按一下顯示內容（變 🙈）、再按一次藏回去。切換**不清值、游標不跑、強度條與兩次密碼檢查照常**；10 語提示 ＋ 鍵盤 focus ＋ `aria-pressed` |',
    '',
    '### 上一版（v4.6）— PWA 桌面捷徑',
    '',
    '| 項目 | 說明 |',
    '|---|---|',
    '| 📱 加入桌面捷徑 | 首頁右上角「📱 下載 App」，按一下就能把遊戲加到電腦桌面或手機主畫面，之後從圖示點開是**全螢幕、沒有網址列**的獨立視窗 |',
    '| 🖼️ 用自己的炸彈 LOGO | 捷徑圖示 192／512 兩種尺寸 ＋ Android 遮罩安全區版本，iPhone 桌面圖示也顧到了 |',
    '| 🍎 iOS 也有引導 | iOS Safari 不支援一鍵安裝，按下去跳出圖文步驟（分享 → 加入主畫面 → 新增） |',
    '| 🔕 裝過就不吵 | 用捷徑開啟時按鈕自動隱藏；安裝完成當下也會自己收起來 |',
    '| 📴 離線也打得開 | Service Worker 快取遊戲本體與圖示；帳號／存檔／線上配對的 `/api/` 一律不快取，永遠拿即時資料 |',
    '',
    '> ⚠️ 部署時 `public/manifest.json`、`public/sw.js`、`public/icons/` 三個都要一起覆蓋，' + E +
    '> 缺任何一個瀏覽器都不會把網站判定為「可安裝」。`server.js` 這次也改了：' + E +
    '> `sw.js` 與 `manifest.json` 一律回 `Cache-Control: no-cache`，改版才吃得到新版。',
    '',
    '### 上一版（v4.5）',
    '',
])
s = rep(s, HEAD, HEAD + NEW_TABLES, 'RENDER.md 新增 v4.7 / v4.6 說明表格')

# 驗證步驟整段換成 v4.7
s = rep(s,
    E.join([
        '## 更新後怎麼確認', '',
        '1. 開 https://bomb-hero-game.onrender.com/ → 版本號顯示 `v{ver}`',
        '2. 進「RPG 模式」第 1 關，站著被怪物撞一下（或讓炸彈炸到）',
        '3. **畫面正中央不該再出現巨大的「4 / 5」** —— 這是最重要的一點',
        '4. 角色頭頂會冒出一個紅色 `-1`，0.5 秒內往上飄並淡出',
        '5. 同一瞬間：畫布四周閃一下柔和紅光（中央不變色）；頂部「❤️ 4/5」放大一點並閃紅光',
        '6. 護甲還沒破時被撞 → 頭上會是**藍色** `-1`、邊緣是藍光（代表護甲在擋）',
        '7. 手機橫放／直放都一樣，飄字貼在角色頭上、不會被資訊列蓋住',
    ]),
    E.join([
        '## 更新後怎麼確認', '',
        '1. 開 https://bomb-hero-game.onrender.com/ → 版本號顯示 `v{ver}`',
        '2. 首頁**右上角**看得到一顆金色的「📱 下載 App」；用已安裝的捷徑開啟時它會自動消失',
        '3. 開發者工具 → Application → Manifest，應該讀得到名稱「爆爆英雄」、`display: standalone`，圖示沒有紅字錯誤',
        '4. Application → Service Workers 顯示 `activated`；`/sw.js` 與 `/manifest.json` 的回應標頭都是 `Cache-Control: no-cache`',
        '5. 點右上「👤 綁定帳號」→ 註冊分頁，密碼欄右邊有 👁；輸入幾個字後按一下 → 內容顯示出來、字沒被清掉，再按一次藏回去',
        '6. 進單人闖關或 RPG 模式，遇到蝙蝠／毒蜂時明顯比以前慢，可以從容走開；被撞到時仍然是頭上飄字＋邊緣紅光（中央不再有巨字）',
        '7. 手機橫放／直放都一樣：眼睛鈕壓在輸入框右側不超框、版本號與桌面捷徑鈕都看得到',
    ]),
    'RENDER.md 驗證步驟')

# 組資料夾：寫出 PWA 檔案並複製 icons
s = rep(s,
    "os.makedirs(os.path.join(PKG, 'public'), exist_ok=True)",
    "os.makedirs(os.path.join(PKG, 'public', 'icons'), exist_ok=True)",
    '建立 public/icons 目錄')

s = rep(s,
    E.join([
        "w('server.js', server)",
        "w('cloud.js', cloudjs)",
        "w('package.json', pkgjson)",
        "w('public/index.html', html_txt)",
    ]),
    E.join([
        "w('server.js', server)",
        "w('cloud.js', cloudjs)",
        "w('package.json', pkgjson)",
        "w('public/index.html', html_txt)",
        "w('public/manifest.json', manifest_txt)",
        "w('public/sw.js', swjs_txt)",
        "# v4.6：圖示是二進位，不能用 w()（那是文字寫出）→ 逐檔原樣複製",
        "import shutil as _shutil",
        "for _ic in sorted(os.listdir(os.path.join(ROOT, 'icons'))):",
        "    if not _ic.lower().endswith('.png'):",
        "        continue",
        "    _shutil.copy2(os.path.join(ROOT, 'icons', _ic), os.path.join(PKG, 'public', 'icons', _ic))",
        "    print('  + public/icons/' + _ic + '  (' + str(os.path.getsize(os.path.join(PKG, 'public', 'icons', _ic))) + ' bytes)')",
    ]),
    '寫出 manifest / sw.js / icons')

save(p, s)

# ============================================================
print('--- build_export.py ---')
p = 'bomb-hero/test/build_export.py'
s = load(p)
E = '\r\n' if '\r\n' in s else '\n'

s = rep(s,
    "# ---------- 2. 前端（遊戲本體，單檔）----------" + E +
    "cp(os.path.join(BH, 'index.html'), os.path.join('public', 'index.html'))",
    "# ---------- 2. 前端（遊戲本體，單檔）＋ v4.6 PWA ----------" + E +
    "cp(os.path.join(BH, 'index.html'), os.path.join('public', 'index.html'))" + E +
    "cp(os.path.join(BH, 'manifest.json'), os.path.join('public', 'manifest.json'))" + E +
    "cp(os.path.join(BH, 'sw.js'), os.path.join('public', 'sw.js'))" + E +
    "shutil.copytree(os.path.join(BH, 'icons'), os.path.join(STAGE, 'public', 'icons'))",
    'export 複製 PWA 三項')

s = rep(s,
    '- 手機操作：**全域隱形滑動區**（半邊畫面任意處＝搖桿中心）或**虛擬搖桿**（可拖曳位置、三段大小）',
    '- 手機操作：**全域隱形滑動區**（半邊畫面任意處＝搖桿中心）或**虛擬搖桿**（可拖曳位置、三段大小）' + E +
    '- PWA：首頁右上角可「📱 下載 App」，裝到電腦桌面／手機主畫面後以全螢幕獨立視窗執行；Service Worker 離線快取',
    'README 特色加 PWA')

s = rep(s,
    '├─ public/' + E +
    '│  └─ index.html           # ★ 遊戲本體（單檔，約 1.6MB，含全部素材與 10 語字典）',
    '├─ public/' + E +
    '│  ├─ index.html           # ★ 遊戲本體（單檔，約 1.8MB，含全部素材與 10 語字典）' + E +
    '│  ├─ manifest.json       # v4.6 PWA 安裝資訊（name / icons / display: standalone）' + E +
    '│  ├─ sw.js                # v4.6 Service Worker（離線快取，/api/ 不快取）' + E +
    '│  └─ icons/               # v4.6 捷徑圖示（192 / 512 / maskable / apple-touch / favicon）',
    'README 目錄樹補 PWA')

s = rep(s,
    '   ├─ verify-v*.js         #   37 組版本驗證（1900+ 斷言）',
    '   ├─ verify-v*.js         #   43 組版本驗證（2100+ 斷言）',
    'README 測試數量')
s = rep(s,
    'node verify-v51.js                     # 逐版跑：node verify-v10.js … verify-v51.js（41 組）',
    'node verify-v53.js                     # 逐版跑：node verify-v10.js … verify-v53.js（43 組）',
    'README 最新驗證範例')

# CHANGELOG：原本最後一列是 v{VER} 但內容其實是 v4.5 → 改成 v4.5，再補 v4.6 / v4.7
s = rep(s, '| **v{VER}** | 🩸 受傷提示輕量化', '| v4.5 | 🩸 受傷提示輕量化',
        'CHANGELOG v4.5 正名')
s = rep(s,
    "♿ 減少動態時關掉彈跳 |" + E + "'''.replace('{VER}', VER)",
    E.join([
        '♿ 減少動態時關掉彈跳 |',
        '| v4.6 | 📱 PWA 桌面捷徑：首頁右上角「📱 下載 App」攔截 `beforeinstallprompt` 一鍵安裝到電腦桌面／手機主畫面，捷徑開啟為 `display: standalone` 全螢幕；192／512／maskable 炸彈 LOGO 圖示＋iPhone apple-touch-icon；iOS Safari 走「分享 → 加入主畫面」圖文引導；已安裝／獨立視窗自動隱藏按鈕；Service Worker 快取本體與圖示（`/api/` 一律不快取），改版自動清舊快取 |',
        '| **v{VER}** | 🕊️ 飛行小怪降速：四種基礎速度 −35%、關卡成長 2.6 → 1.2、上限 118 → 78（玩家 146），追人機率 60% → 35% 且轉向間隔拉長，RPG 倍率同步降到 0.80~0.90；👁 密碼欄位可切換顯示／隱藏（三欄共用產生器、不清值、游標不跑、強度條與一致性檢查照常、10 語提示＋無障礙標籤） |',
        "'''.replace('{VER}', VER)",
    ]),
    'CHANGELOG 補 v4.6 / v{VER}')

save(p, s)
print('\n完成')
