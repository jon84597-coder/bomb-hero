import https from 'https';
import zlib from 'zlib';

const URL_ = 'https://jon84597-coder.github.io/bomb-hero/index.html';
function get(u, depth = 0) {
  return new Promise((res, rej) => {
    https.get(u + '?x=' + Date.now(), {
      headers: { 'Accept-Encoding': 'gzip, deflate', 'User-Agent': 'bh-test/4.81' }
    }, r => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location && depth < 3) {
        r.resume(); return get(new URL(r.headers.location, u).href, depth + 1).then(res, rej);
      }
      const chunks = [];
      r.on('data', c => chunks.push(c));
      r.on('end', () => {
        let b = Buffer.concat(chunks);
        const raw = b.length;
        const enc = (r.headers['content-encoding'] || '').toLowerCase();
        if (enc.includes('gzip')) b = zlib.gunzipSync(b);
        else if (enc.includes('deflate')) b = zlib.inflateSync(b);
        res({ status: r.statusCode, enc: enc || 'none', wire: raw, html: b.toString('utf8'), h: r.headers });
      });
    }).on('error', rej);
  });
}

let pass = 0, fail = 0;
const ok = (c, m, extra) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m + (extra !== undefined ? '  → ' + extra : '')); } };

const r = await get(URL_);
const H = r.html;
console.log(`線上 index.html  status=${r.status} enc=${r.enc} wire=${(r.wire / 1024).toFixed(0)}KB  html=${(H.length / 1024).toFixed(0)}KB  字元=${H.length}\n`);

console.log('【1】版本');
ok(/const VERSION = '4\.81'/.test(H), 'VERSION = 4.81');
ok(/id="verTxt">4\.81</.test(H), 'verTxt 顯示 4.81');
ok(/v: '4\.81'/.test(H), 'VERSION_LOG 有 4.81');

console.log('\n【2】新首頁結構');
ok(/id="homeMenu"/.test(H), '#homeMenu 存在');
ok(/class="mbtn c-solo" id="btnSolo"/.test(H), 'btnSolo 卡片');
ok(/class="mbtn c-br has-beta" id="btnBR"/.test(H), 'btnBR 卡片');
ok(/class="mbtn c-daily" id="btnDaily"/.test(H), 'btnDaily 卡片');
ok(/class="mbtn c-multi has-beta" id="btnMulti"/.test(H), 'btnMulti 卡片');
ok(/class="mbtn c-rpg has-beta" id="btnRpg"/.test(H), 'btnRpg 卡片');
ok(/class="mbtn c-more" id="btnMoreMenu"/.test(H), 'btnMoreMenu 卡片');
ok(/class="mdrawer" id="mDrawer"/.test(H), '#mDrawer 抽屜');
['btnStore', 'btnHelp', 'btnSettings', 'btnQuit'].forEach(id => {
  ok(new RegExp('class="drawbtn"[^>]*id="' + id + '"').test(H), '抽屜 ' + id);
});

console.log('\n【3】舊按鈕已從首頁移除');
['btnBoss', 'btnLb', 'btnAcctBig', 'btnBattle', 'btnOnline'].forEach(id => {
  const m = H.match(new RegExp('id="' + id + '"'));
  ok(!m, '首頁不再有 #' + id, m ? '仍存在' : undefined);
});

console.log('\n【4】BOSS 入口搬進單人畫面');
const soloSeg = H.slice(H.indexOf('id="scr-solo"'), H.indexOf('id="scr-solo"') + 3000);
ok(/id="btnSoloBoss"/.test(soloSeg), '#btnSoloBoss 在 #scr-solo 內');
ok(/跳過關卡/.test(soloSeg), '按鈕文案含「跳過關卡」');

console.log('\n【5】多人選擇器');
ok(/id="multiPick"/.test(H), '#multiPick 存在');
ok(/id="mpLocal"/.test(H) && /id="mpOnline"/.test(H), 'mpLocal / mpOnline');
ok(/id="mpBack"/.test(H), 'mpBack');

console.log('\n【6】函式與 i18n');
ok(/function homeFill\(\)/.test(H), 'homeFill() 存在');
ok(/function setDrawer\(open\)/.test(H), 'setDrawer() 存在');
ok(/function showMultiPick\(on\)/.test(H), 'showMultiPick() 存在');
ok(/try \{ homeFill\(\); \} catch/.test(H), 'fillUI() 有呼叫 homeFill');
ok(/home\.namePh/.test(H), 'home.namePh 字典鍵');
ok(/home\.daily\|/.test(H), 'home.daily 字典列存在');
const rows = (H.match(/^[a-z0-9]+\.[a-zA-Z0-9._]+\|/gm) || []).length;

console.log('\n【7】檔案體質');
ok((H.match(/\r/g) || []).length === 0, '整檔 LF（CR 0）', (H.match(/\r/g) || []).length);
ok(H.length < 3900000, '字元數 ' + H.length + ' < 3.9M');
ok(r.enc.includes('gzip'), 'Pages 有 gzip', r.enc);

console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} 通過 / ${fail} 失敗`);
process.exit(fail ? 1 : 0);
