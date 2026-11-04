// 共用：確認某個「美術引用」真的指到一個可用的外部圖檔
// v4.79 起美術從 base64 內嵌改成 spr/*.webp（見 test/_x7_final.js 的命名表）
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function isArtRef(u) {
  return typeof u === 'string' && /^spr\/[A-Za-z0-9_\-]+\.webp$/.test(u);
}

function artFile(u) {
  if (!isArtRef(u)) return null;
  const p = path.join(ROOT, u.replace(/^\.?\//, ''));
  try { return fs.readFileSync(p); } catch (e) { return null; }
}

// 合法 = 路徑格式正確 + 檔案存在 + 有 WEBP 檔頭
function isArtOk(u) {
  const b = artFile(u);
  if (!b) return false;
  return b.length > 0 && b.slice(8, 12).toString() === 'WEBP';
}

module.exports = { isArtRef, artFile, isArtOk, ROOT };
