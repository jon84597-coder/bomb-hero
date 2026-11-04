# 雲端存檔設定（Supabase）

> 為什麼要換：Render 的**免費**實例檔案系統是暫時的。只要 15 分鐘沒有流量就會自動休眠，
> 休眠時寫在磁碟上的東西**全部清空**；而持久磁碟只有付費方案才能掛。
> 所以「帳號存在伺服器的 `data/accounts.json`」其實隨時會消失。
> 現在改成存到 Supabase（Postgres），Render 重啟幾次都不受影響。

---

## 目前進度

| 步驟 | 狀態 |
|---|---|
| 1. 建 Supabase 專案 | ✅ 完成（ref `sgchdgcrrpfeliapllny`） |
| 2. 建 `bh_kv` 表 | ✅ 完成（`Success. No rows returned`） |
| 3. 本機實測讀寫 | ✅ 通過（寫入 → 讀回 → 清除，見 `tools/check-supabase.js`） |
| 4. 把兩個值填進 Render | ⬜ **剩下這一步** |

**你的兩個值：**

```
BH_SUPABASE_URL = https://sgchdgcrrpfeliapllny.supabase.co
BH_SUPABASE_KEY = sb_secret_…（完整值在對話裡；或到 Supabase → API Keys 複製）
```

（金鑰在 Supabase → Project Settings → **API Keys** → 下方 **Secret keys**。
新版是 `sb_secret_` 開頭；舊版的 `eyJ...` service_role JWT 也還能用。
⚠ 這個 repo 是公開的，**金鑰不要寫進任何會被 commit 的檔案**。）

---

## 步驟 4：填進 Render（最後一步）

1. 打開 https://dashboard.render.com/
2. 點服務 **bomb-hero-game**
3. 左側 **Environment**
4. 右側 **Add Environment Variable**，填第一組
   - Key：`BH_SUPABASE_URL`
   - Value：`https://sgchdgcrrpfeliapllny.supabase.co`
5. 再點一次 **Add Environment Variable**，填第二組
   - Key：`BH_SUPABASE_KEY`
   - Value：`sb_secret_` 開頭那一整串（從 Supabase → API Keys → Secret keys 複製）
6. 點 **Save Changes** → Render 會自動重新部署（約 1~2 分鐘）

> 若已經存在同名變數，直接改成上面的值再存即可。

### 驗證

```bash
curl https://bomb-hero-game.onrender.com/api/health
```

看到這兩行就是接上了：

```json
{ "storage": "supabase", "storageLoaded": true, "storageError": "" }
```

- `storage: "file"` → 環境變數沒生效（沒重新部署、變數名打錯、或值空白）
- `storageLoaded: false` + `storageError` 有 401 → Key 字串不對（Supabase 直接拒絕）
- `storageDiag` 是給人核對用的遮罩指紋，不會外洩金鑰：

```json
"storageDiag": {
  "urlHost": "sgchdgcrrpfeliapllny.supabase.co",
  "table": "bh_kv",
  "keyLen": 41,
  "keyPfx": "sb_secret_",
  "keyHash": "6ecbf320",
  "keySet": true,
  "keyNameWarn": "",
  "envNames": ["BH_SUPABASE_KEY:41", "BH_SUPABASE_URL:40"]
}
```

- `keyLen` 應為 **41**（`sb_secret_` 10 + 31）；`keyPfx` 是 `sb_secret_` 才算後端金鑰
- `keyHash` 是 key 的 sha256 前 8 碼 —— 用來確認「Render 上那把」跟手上那把是不是同一把
- **`keyNameWarn` 有值** → 變數名被貼歪了（例如 `BH_SUPABASE_KEYsb_secret_`），程式仍然運作，但請去 Render 改名
- `envNames` 列出名稱含 `SUPABASE` 的變數及其值長度（不露值），專門抓「名打錯／只存了一個」
- `bootAt` / `uptimeSec` 是這次容器啟動的時間，用來確認「真的換過一個新容器」

> 實測踩過的坑：在 Render 後台貼值時，若把 `sb_secret_` 前半段黏進 **Key（名稱）** 欄，變數會變成
> `BH_SUPABASE_KEYsb_secret_`，程式找不到正名就**靜默退回本機檔案模式** —— 表面一切正常，直到休眠才發現資料沒了。
> v4.85h 起會容錯接手並用 `keyNameWarn` 提醒。

### 換一組新金鑰（建議，因為舊的貼在聊天裡了）

1. Supabase → **API Keys** → **New secret key** → 建一把新的
2. 複製新的 `sb_secret_...`，到 Render 把 `BH_SUPABASE_KEY` 換掉 → Save
3. 等部署完成、`/api/health` 顯示 `storageLoaded: true`（且 `keyHash` 變了、`keySet: true`）後，
   回 Supabase 把舊金鑰 **Revoke**

### 已完成的端到端驗證（2026-11-04）

| 步驟 | 結果 |
|---|---|
| 建遊客 `g_04dbaeeb39b25e31` | ✅ |
| `/api/save/put`（stage 17 / gold 4321 / tickets 9） | ✅ rev 1 |
| 直接在 Supabase 讀 `accounts` 分片 | ✅ 兩個值都在 |
| 推新 commit 觸發**真正換容器** | ✅ `uptimeSec` 歸零、`storageWrites` 歸零 |
| 用**重啟前**的 cookie 打 `/api/save/get` | ✅ 同一組 cookie 仍認得，回傳 stage 17 / gold 4321 / 同一個 ts、rev 1 |


---

## 附錄：從零重建時要做的事

<details>
<summary>建表 SQL（已經跑過，重灌環境時用）</summary>

```sql
create table if not exists bh_kv (
  key      text primary key,
  val      jsonb not null,
  updated  timestamptz not null default now()
);

-- 打開 RLS 但「不建任何 policy」：
-- secret key 會繞過 RLS 正常讀寫，publishable／anon 則完全碰不到，
-- 所以這張表不會被路過的人用公開金鑰讀走。
alter table bh_kv enable row level security;
```

</details>

<details>
<summary>本機驗證指令</summary>

```bash
node tools/check-supabase.js \
  --url "https://sgchdgcrrpfeliapllny.supabase.co" \
  --key "sb_secret_..."
```

通過的輸出會長這樣：

```
金鑰型別：Secret key（sb_secret_…）✓
1) 檢查資料表…   ✓ 資料表存在
2) 測試寫入…     ✓ 寫入成功
3) 讀回確認…     ✓ 讀回一致
4) 清除測試資料… ✓ 已清除
```

若貼成 `sb_publishable_` 開頭，腳本會直接告訴你「這是公開金鑰，寫不進去」。

</details>

<details>
<summary>免費額度會不會不夠</summary>

- Supabase Free：**500 MB 資料庫**（不是 1 GB；1 GB 是檔案儲存，存圖片用的）
- 一份玩家存檔約 300~600 bytes，含帳號索引 → 500 MB 大約能存 **數十萬名玩家**
- 免費專案「7 天完全沒有 API 請求」才會被暫停；伺服器本身就連著它，正常有玩家就不會閒置
- 真的要保險：Render 升 Starter（$7/月）就不會休眠，Supabase 免費層搭配伺服器連線即可

</details>
