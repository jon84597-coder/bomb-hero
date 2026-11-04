const fs = require('fs');
const f = 'CHANGELOG.md';
let s = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
s = s.replace(/\s*$/, '');

const add = [
  '| **v4.93** | 🎯 **真正的原因：Chrome 開不了、Edge 可以** —— 兩個都是 Chromium，差別只有 **Service Worker 快取**。`sw.js` 的導覽策略是「網路優先、2.2 秒逾時就回快取」，而 Render 免費實例冷啟動一定超過 2.2 秒 → 平常常用的 Chrome 一直拿到 **v4.92 之前的舊 index.html**（那版沒有連點、沒有 `Ctrl+Alt+D`、沒有 `#admin`），所以「三種方式都無法」；Edge 是第一次開、直接吃網路，所以正常。 |',
  '| | 🛠 **新增看得見的入口 `#devBtn`**：首頁頂部多一顆 `🛠` 小晶片（只有 `DEV_BUILD` 或白名單帳號才 `display`），點一下就開，不必再記手勢、不必打網址。手機 36×27px，排在「版本更新內容／作者公告」中間不擠不疊。 |',
  '| | 🧱 **修掉 `wire()` 的早退陷阱**：原本第一行是 `const m = 取 #adminModal; if (!m) return;`，但 `#adminModal` 的 HTML 寫在 script 結束標籤之後 —— 只要 `wire()` 比 DOM 早一步被叫到，整個函式直接 return，**連點／快捷鍵／`#admin` 三條監聽器一條都沒綁上**。改成入口監聽（不依賴 DOM）先綁一次（`A.entryWired`），modal 內部按鈕等元素出現再用 `A.pending` 補綁（`A.wiredModal`）。 |',
  '| | ⚠️ **踩到的坑**：新加的註解裡寫了字面的 script 結束標籤，HTML 解析器直接把它當成真的結束標籤 → 整份 JS 被截斷，`node --check` 報 `Unexpected end of input`。之後註解提到它一律寫成「script 標籤」。 |',
  '| | 🔄 SW 版本 `v4.93.0`（三份副本）＋ `package.json` 4.93.0；遊戲內 `VERSION_LOG` 只寫「舊快取頁面／診斷面板入口／新版偵測」，**不含後台字樣**。 |'
].join('\n');

fs.writeFileSync(f, s + '\n' + add + '\n');

const rows = fs.readFileSync(f, 'utf8').split('\n').filter(l => l.startsWith('|'));
const bad = rows.filter(l => (l.match(/\|/g) || []).length !== 3);
console.log('rows', rows.length, 'bad', bad.length);
bad.slice(0, 3).forEach(l => console.log('BAD:', l.slice(0, 90)));
