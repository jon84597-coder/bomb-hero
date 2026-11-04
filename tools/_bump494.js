const fs = require('fs');

// 1) index.html：版號 + 更新紀錄 + 文字標籤
let s = fs.readFileSync('bomb-hero/index.html', 'utf8');
s = s.replace("const VERSION = '4.93';", "const VERSION = '4.94';");
s = s.replace('id="verTxt">4.93<', 'id="verTxt">4.94<');
s = s.replace('id="verLogVer">4.93<', 'id="verLogVer">4.94<');

const entry = [
  "  { v: '4.94', date: '2026-11-05', now: true, items: [",
  "    '🛡️ 修正廣告封鎖類擴充功能會誤判、把某些面板整塊隱藏的問題（按了看起來沒反應）',",
  "    '🎨 內部樣式命名整理：不再和常見的廣告元素名稱撞名',",
  "    '🔧 版面穩定性修正，不影響遊戲內容' ] },",
  "  { v: '4.93', date: '2026-11-05', now: false, items: ["
].join('\n');
s = s.replace("  { v: '4.93', date: '2026-11-05', now: true, items: [", entry);

s = s.replace(/\r\n/g, '\n');
fs.writeFileSync('bomb-hero/index.html', s);

// 2) 副本
fs.copyFileSync('bomb-hero/index.html', 'public/index.html');
fs.copyFileSync('bomb-hero/index.html', 'bomberman-online/public/index.html');

// 3) SW 版本
['bomb-hero/sw.js', 'public/sw.js', 'bomberman-online/public/sw.js'].forEach(f => {
  let t = fs.readFileSync(f, 'utf8');
  t = t.replace(/var SW_VERSION = '[^']+';/, "var SW_VERSION = 'v4.94.0';");
  fs.writeFileSync(f, t);
});

// 4) package.json
const p = JSON.parse(fs.readFileSync('package.json', 'utf8'));
p.version = '4.94.0';
fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');

console.log('done');
