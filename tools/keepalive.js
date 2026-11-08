/* ================================================================
   keepalive.js —— 讓 Render 免費實例別睡著（v5.55 新增）

   【為什麼要這個】
   Render 免費 web service 連續 15 分鐘沒有流量就會休眠（spin down），
   下次有人打開要等 30~60 秒把容器重新拉起來；偶爾還會「拉不起來」，
   變成整站無回應（2026-11-08 就發生過一次，得靠重新部署才救回來）。

   【原理】
   在它睡著之前發一個請求，讓 Render 的空閒計時歸零。
   只戳 /api/health（不打遊戲本體、不碰 Supabase 寫入），成本極低。

   【成本 —— 這點很重要，不要無腦 24 小時跑】
   免費額度 = 每月 750 實例小時。
     · 24 小時不間斷 = 730 小時 → 幾乎吃滿，再加一次長時間除錯就超額
     · 只開 09:00–24:00  = 450 小時 → 留 300 小時餘量（預設就是這個）
   用 BH_FROM / BH_TO 調整。時段外完全不發請求，讓它睡。

   【用法】
     node tools/keepalive.js                 # 預設 09:00~24:00，每 10 分鐘
     BH_EVERY_MIN=8 node tools/keepalive.js   # 改間隔（最小 4 分鐘）
     BH_FROM=8 BH_TO=25 node tools/keepalive.js
     BH_URL=http://127.0.0.1:8080/api/health node tools/keepalive.js   # 測本機

   注意：這是「在你電腦開著、腳本跑著」期間才有效。
   電腦關機就停 —— 要真正 24/7 得靠外部 cron（cron-job.org / UptimeRobot），
   或用 Render 的付費方案（不休眠，約 $7/月）。
   ================================================================ */

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const TARGET = process.env.BH_URL || 'https://bomb-hero-game.onrender.com/api/health';
const EVERY = Math.max(4, Number(process.env.BH_EVERY_MIN) || 10) * 60000;
const FROM = Number(process.env.BH_FROM || 9);
const TO = Number(process.env.BH_TO || 24);
const LOG = path.join(__dirname, 'keepalive.log');

function two(n) { return (n < 10 ? '0' : '') + n; }
function stamp() {
  const d = new Date();
  return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate()) +
    ' ' + two(d.getHours()) + ':' + two(d.getMinutes()) + ':' + two(d.getSeconds());
}
function log(msg) {
  const line = '[' + stamp() + '] ' + msg;
  console.log(line);
  try { fs.appendFileSync(LOG, line + '\n'); } catch (e) {}
}

/* 活躍時段：支援跨午夜（例如 BH_FROM=22 BH_TO=4） */
function active() {
  const h = new Date().getHours();
  return FROM <= TO ? (h >= FROM && h < TO) : (h >= FROM || h < TO);
}

/* 用 curl 而不是 node 的 https —— 這樣會自動吃到系統／環境的 http(s)_proxy，
   在公司網路或有代理的機器上才連得出去。 */
function ping() {
  return new Promise(function (resolve) {
    const t0 = Date.now();
    execFile('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', '-m', '20', TARGET],
      { timeout: 25000, windowsHide: true }, function (err, stdout) {
        const code = parseInt(String(stdout || '0').trim(), 10) || 0;
        resolve({
          ok: code >= 200 && code < 400,
          code: code,
          ms: Date.now() - t0,
          err: err ? String(err.message).slice(0, 70) : ''
        });
      });
  });
}

let fails = 0, total = 0, okCount = 0;

async function tick() {
  if (!active()) {
    log('非活躍時段（' + FROM + ':00–' + TO + ':00），跳過，讓它睡');
    return schedule();
  }
  total++;
  const r = await ping();
  if (r.ok) {
    fails = 0; okCount++;
    log('OK   ' + r.code + '  ' + r.ms + 'ms   （累計 ' + okCount + '/' + total + '）');
  } else {
    fails++;
    log('FAIL ' + (r.err || ('HTTP ' + r.code)) + '  ' + r.ms + 'ms   連續 ' + fails + ' 次');
    if (fails === 3) {
      log('⚠ 連續 3 次叫不醒 —— 實例可能假死。處置：git commit --allow-empty -m redeploy && git push');
    }
  }
  schedule();
}

function schedule() {
  const t = setTimeout(tick, EVERY);
  if (t.unref) t.unref();
}

log('keepalive 啟動：' + TARGET);
log('間隔 ' + (EVERY / 60000) + ' 分鐘 · 活躍時段 ' + FROM + ':00–' + TO + ':00 · 預估每月 ' +
  Math.round((TO - FROM + 24) % 24 * 30) + ' 小時（額度 750）');
tick();

process.on('SIGINT', function () { log('收到 SIGINT，結束'); process.exit(0); });
