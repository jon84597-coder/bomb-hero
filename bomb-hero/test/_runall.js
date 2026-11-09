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
  /* v5.66：重寫。原本的寫法在「✗ 9 項失敗（通過 66）」這種結尾上會漏掉失敗數 ——
     失敗數字在前面，`N 通過` 抓不到，於是往上多跑一行抓到某個測試名裡的「通過」，
     fail 被算成 0 → 明明紅的也印 ✓。這種假綠讓 v20／v21 紅了整整十幾版沒人發現。 */
  const lines = out.split('\n').filter(function (l) { return l.trim() !== ''; });
  for (let i = lines.length - 1; i >= 0 && i >= lines.length - 6; i--) {
    const ln = lines[i];
    let m, pass = null, fail = null;
    // （1）「通過 49 / 49」＝ passed / total
    if ((m = ln.match(/通過\s*(\d+)\s*\/\s*(\d+)/))) return { pass: +m[1], fail: +m[2] - +m[1] };
    // （2）「✗ 9 項失敗（通過 66）」「通過 76 項，失敗 7 項」「通過 97 項」
    const f1 = ln.match(/(\d+)\s*項\s*失敗/);
    const f2 = ln.match(/失敗\s*(\d+)/);
    const p1 = ln.match(/通過\s*(\d+)/);
    const p2 = ln.match(/(\d+)\s*(?:項)?\s*通過/);
    if (p1) pass = +p1[1]; else if (p2) pass = +p2[1];
    if (f1) fail = +f1[1]; else if (f2) fail = +f2[1];
    if (pass !== null) return { pass: pass, fail: fail === null ? 0 : fail };
  }
  return { pass: null, fail: null };
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
