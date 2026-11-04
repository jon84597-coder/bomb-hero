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
{ "storage": "supabase", "storageLoaded": true, "storageAccounts": 0, "storageError": null }
```

- `storage: "file"` → 環境變數還沒生效（多半是存檔後沒重新部署，或 Key 打錯）
- `storageLoaded: false` → 遠端連不上（URL／Key 有誤），此時**不會**寫回雲端，不會蓋掉資料

### 換一組新金鑰（建議，因為舊的貼在聊天裡了）

1. Supabase → **API Keys** → **New secret key** → 建一把新的
2. 複製新的 `sb_secret_...`，到 Render 把 `BH_SUPABASE_KEY` 換掉 → Save
3. 等部署完成、`/api/health` 顯示 `storageLoaded: true` 後，回 Supabase 把舊金鑰 **Revoke**

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
