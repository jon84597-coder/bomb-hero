const fs = require('fs');
const f = 'CHANGELOG.md';
let s = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n').replace(/\s*$/, '');

const add = [
  '| **v4.94** | 🛡️ **AdBlock 一開，後台面板整塊消失** —— 面板的 id／class 全是 `ad` 開頭（`.adcard`／`.adrow`／`.adpane`／`#adminModal`），而廣告封鎖清單（尤其中文清單）有 `[id^="ad"]`／`[class^="ad"]` 這種規則，會把整批元素 `display:none !important`。元素被隱藏 → 按鈕按下去「看起來完全沒反應」，其實 `open()` 已經回 `true`。 |',
  '| | 🔤 **改名**：34 個 class ＋ 30 個 id 全部 `ad*` → `bh*`（`.adcard`→`.bhcard`、`#adminModal`→`#bhModal`），`index.html` 內共 274 處；測試腳本同步 606 處。改完 CSS 無新衝突、`_runall` 101 支全綠。 |',
  '| | 🧪 **新增 `verify-v494`（17 項）**：CSS 不得再有 `.ad*` 類別、JS 不得再 `$id("ad*")`、每個 `bh*` 樣式都要真的被用到、`$id()` 取的 id 都必須存在於 HTML、四個入口都還在。 |',
  '| | 📌 **教訓**：`#adminModal` 這種「admin 剛好也是 ad 開頭」的命名，是 AdBlock 誤殺的高風險區。以後後台 UI 一律用 `bh` 前綴。另外 `verify-v492`／`verify-v493` 原本把版號寫死，改成跟著 `VERSION` 走，升版不會再整支紅。 |'
].join('\n');

fs.writeFileSync(f, (s + '\n' + add + '\n').replace(/\n/g, '\r\n'));

const rows = fs.readFileSync(f, 'utf8').split('\r\n').filter(l => l.startsWith('|'));
const bad = rows.filter(l => (l.match(/\|/g) || []).length !== 3);
console.log('rows', rows.length, 'bad', bad.length);
