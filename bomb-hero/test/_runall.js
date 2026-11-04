// 批量跑 test/verify-*.js，抓每支的 summary（通過／失敗）
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir)
  .filter(f => /^verify-.*\.js$/.test(f))
  .sort((a, b) => {
    const na = parseInt((a.match(/v(\d+)/) || [])[1] || 0, 10);
    const nb = parseInt((b.match(/v(\d+)/) || [])[1] || 0, 10);
    return na - nb || a.localeCompare(b);
  });

function parse(out) {
  const lines = out.split('\n');
  let pass = null, fail = null;
  for (let i = lines.length - 1; i >= 0 && pass === null && i >= lines.length - 6; i--) {
    const ln = lines[i];
    let m;
    // 「通過 49 / 49」＝ passed / total
    if ((m = ln.match(/通過\s*(\d+)\s*\/\s*(\d+)/))) { pass = +m[1]; fail = +m[2] - +m[1]; break; }
    // v4.78：先抓「N 失敗 / M 通過」——舊版只看「M 通過」→ 失敗被吃掉，測試明明紅的也報綠
    const pf = ln.match(/(\d+)\s*(?:項)?\s*通過/);
    const ff = ln.match(/(\d+)\s*(?:項)?\s*失敗/);
    if (pf) { pass = +pf[1]; fail = ff ? +ff[1] : 0; break; }
    // 「通過 97 項」「通過 28」
    if ((m = ln.match(/通過\s*(\d+)\s*(?:項)?/))) { pass = +m[1]; fail = 0; break; }
  }
  return { pass, fail };
}

let bad = 0;
files.forEach(f => {
  let out = '';
  try {
    out = execFileSync(process.execPath, [path.join(dir, f)], { encoding: 'utf8', timeout: 180000 });
  } catch (e) {
    out = (e.stdout || '') + (e.stderr || '');
  }
  const { pass, fail } = parse(out);
  const okk = fail === 0 && pass !== null && pass > 0;
  if (!okk) {
    bad++;
    console.log('  ✗ ' + f.padEnd(24) +
      (pass === null ? '（抓不到 summary）' : pass + ' 通過 / ' + fail + ' 失敗'));
    const lines = out.split('\n').filter(l => /FAIL|✗|Error|error/.test(l)).slice(0, 4);
    lines.forEach(l => console.log('       ' + l.trim().slice(0, 110)));
  } else {
    console.log('  ✓ ' + f.padEnd(24) + pass + ' 通過');
  }
});
console.log('\n' + (bad ? '✗ 有 ' + bad + ' 支不是全綠' : '✅ 全部 ' + files.length + ' 支全綠'));
process.exit(bad ? 1 : 0);
