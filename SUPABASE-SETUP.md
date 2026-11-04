# 雲端存檔設定（Supabase）— 5 分鐘

> 為什麼要換：Render 的**免費**實例檔案系統是暫時的。只要 15 分鐘沒有流量就會自動休眠，
> 休眠時寫在磁碟上的東西**全部清空**；而持久磁碟只有付費方案才能掛。
> 所以「帳號存在伺服器的 data/accounts.json」其實隨時會消失。
> 現在改成存到 Supabase（Postgres），Render 重啟幾次都不受影響。

---

## 步驟 1：開一個 Supabase 專案（免費）

1. 到 https://supabase.com 註冊（GitHub 帳號可直接登入）
2. **New project**
   - Name：`bomb-hero`
   - Database Password：隨便設一組（**這個不是等等要用的 key，記下來就好**）
   - Region：選 **Southeast Asia (Singapore)**，離台灣最近
3. 等 1~2 分鐘建置完成

## 步驟 2：建一張表

左側 **SQL Editor** → **New query** → 貼上 → **Run**：

```sql
create table if not exists bh_kv (
  key      text primary key,
  val      jsonb not null,
  updated  timestamptz not null default now()
);

-- 打開 RLS 但「不建任何 policy」：
-- service_role 會繞過 RLS 正常讀寫，anon（公開金鑰）則完全碰不到，
-- 所以這張表不會被路過的人用公開金鑰讀走。
alter table bh_kv enable row level security;
```

看到 `Success. No rows returned` 就對了。

## 步驟 3：拿兩組值

左側 **Project Settings**（齒輪）→ **API**：

| 要複製的 | 在哪 | 長相 |
|---|---|---|
| **Project URL** | Project URL 那一行 | `https://abcdefgh.supabase.co` |
| **service_role key** | Project API keys → `service_role` `secret` | 很長一串（`eyJ...`）|

⚠️ **一定是 service_role，不是 anon。** anon 金鑰沒有寫入權限，填錯會一直 401。
⚠️ service_role 等於資料庫管理員密碼，**只能放在伺服器環境變數**，不要貼進前端或 commit。

## 步驟 4：本機先驗證一次

在專案根目錄執行（把兩組值換成你的）：

```bash
BH_SUPABASE_URL="https://abcdefgh.supabase.co" \
BH_SUPABASE_KEY="eyJhbGciOi..." \
node tools/check-supabase.js
```

看到 `✅ 全部通過` 才往下走。若出現「資料表不存在」，回到步驟 2 再跑一次 SQL。

## 步驟 5：填進 Render

Render 後台 → 你的服務 `bomb-hero-game` → **Environment** → **Add Environment Variable**：

| Key | Value |
|---|---|
| `BH_SUPABASE_URL` | `https://abcdefgh.supabase.co` |
| `BH_SUPABASE_KEY` | service_role key |

存檔後按 **Manual Deploy → Deploy latest commit**（或直接推一個 commit）。

部署完打開日誌，應該看到：

```
[cloud] 存檔：Supabase（雲端資料庫）✔ 已載入，寫入 0 次
```

如果是 `⚠ Supabase 連線失敗`，把訊息貼給我，通常是 key 貼錯或表沒建。

---

## 怎麼確認「真的永存」

1. 線上註冊一個帳號、玩到第 2 關
2. Render 後台 **Manual Deploy → Restart service**（模擬休眠／重新部署）
3. 重新整理頁面 → 應該還是第 2 關

或直接看 `https://bomb-hero-game.onrender.com/api/health`：

```json
{ "ok": true, "accounts": 2, "storage": "supabase", "storageLoaded": true, "storageFails": 0 }
```

`storage` 是 `supabase` 且 `storageLoaded: true` 就代表接上了。
若 `storage` 是 `file`，表示環境變數沒生效。

---

## 費用與限制

- **免費**：500 MB 資料庫、每月 5 GB 流量。你的存檔一筆約 2 KB，10 萬個帳號也才 200 MB。
- Supabase 免費專案**閒置 7 天會暫停**（資料不會消失）。下次有請求會自動喚醒，喚醒約 10 秒 —— 對存檔 API 來說就是偶爾一次慢幾秒。
- 如果真的遇到暫停又不想等，升級 Supabase Pro（$25/月）或改回 Render 付費磁碟（$7/月）。

## 備份（可選，但建議）

Supabase 後台 → **Database** → **Backups**，免費方案有每日備份。
另外玩家自己在「設定 → 存檔備份」可以匯出一串存檔碼，那是他們自己的保險。
