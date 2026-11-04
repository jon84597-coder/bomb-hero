// 把後台面板的 id / class 從 ad* 改成 bh*，避開廣告過濾清單的 [id^="ad"] / [class^="ad"] 規則
const fs = require('fs');
const path = require('path');

const TOKENS = [
  // ids（長的在前面，雖然有 \b 邊界，排序仍保險）
  'adminModal',
  'adAnnHours', 'adAnnText', 'adAnnGo', 'adCleared', 'adClose', 'adCopyRaw',
  'adDetail', 'adDevMail', 'adExportAcc', 'adExportRaw', 'adGold', 'adHealthTag',
  'adHealth', 'adHelp', 'adLbList', 'adLbMeta', 'adLbMode', 'adLbGo',
  'adList', 'adQGo', 'adQ', 'adRaw', 'adRecent', 'adRefresh', 'adSplit',
  'adStats', 'adSys', 'adTabs', 'adWarn',
  // classes
  'adstats', 'adstat', 'adsec2', 'adsec', 'adrow2', 'adrow', 'adsearch',
  'adsplit', 'adtabs', 'adtag', 'adactions', 'adann', 'adback', 'adbtnrow',
  'adcard', 'addetail', 'adempty', 'adev', 'adgrant', 'adheadr', 'adhead',
  'adkv', 'adlist', 'adlogin', 'admt', 'adnm', 'adpane', 'adpill', 'adpre',
  'adst', 'adsub', 'aduid', 'adwarn', 'adwho'
];

function bv(t) {
  if (t === 'adminModal') return 'bhModal';
  return 'bh' + t.slice(2);          // adcard → bhcard, adList → bhList
}

const files = ['bomb-hero/index.html'];
const testDir = 'bomb-hero/test';
fs.readdirSync(testDir).forEach(f => {
  if (/\.js$/.test(f)) files.push(path.join(testDir, f));
});

let grand = 0;
files.forEach(f => {
  let s = fs.readFileSync(f, 'utf8');
  const orig = s;
  let n = 0;
  TOKENS.forEach(t => {
    const re = new RegExp('\\b' + t + '\\b', 'g');
    const hits = (s.match(re) || []).length;
    if (hits) { s = s.replace(re, bv(t)); n += hits; }
  });
  if (s !== orig) {
    s = s.replace(/\r\n/g, '\n');
    fs.writeFileSync(f, s);
    console.log('  ' + f + '  替換 ' + n + ' 處');
    grand += n;
  }
});
console.log('總計 ' + grand + ' 處');
