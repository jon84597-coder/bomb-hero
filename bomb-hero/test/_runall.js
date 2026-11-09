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
  /* v5.74：再修一次。v5.66 只補了「✗ 9 項失敗（通過 66）」這種「失敗在前」的寫法，
     卻漏掉反過來的主流寫法 ——「結果：75 通過 / 1 失敗」（數字在詞前面）。
     舊規則的 /失敗\s*(\d+)/ 要求數字在「失敗」之後，於是 fail 永遠算成 0：
     verify-v484 明明 75/76（整頁 2.43M 超過 2.35M 上限）也一路印 ✓，
     連續好幾版「170 支全綠」其實有一支一直是紅的。
     這裡把所有實際出現的 summary 格式一次列齊，並加上「有 ✗/❌/FAIL 就一定算紅」的保險。 */
  const lines = out.split('\n').filter(function (l) { return l.trim() !== ''; });
  for (let i = lines.length - 1; i >= 0 && i >= lines.length - 8; i--) {
    const ln = lines[i];
    let m, pass = null, fail = null;
    // （1）「通過 49 / 49」＝ passed / total
    if ((m = ln.match(/通過\s*(\d+)\s*\/\s*(\d+)/))) return { pass: +m[1], fail: +m[2] - +m[1] };
    // （2）「75 通過 / 1 失敗」「75 通過、1 失敗」「76 項通過，7 項失敗」
    if ((m = ln.match(/(\d+)\s*項?\s*通過\s*[/、,，]\s*(\d+)\s*項?\s*失敗/)))
      return { pass: +m[1], fail: +m[2] };
    // （3）「✗ 1 項失敗 / 76 通過」「1 項失敗、76 項通過」
    if ((m = ln.match(/(\d+)\s*項?\s*失敗\s*[/、,，]\s*(\d+)\s*項?\s*通過/)))
      return { pass: +m[2], fail: +m[1] };
    // （4）「通過 76 項，失敗 7 項」
    if ((m = ln.match(/通過\s*(\d+)\s*項?\s*[，,、]\s*失敗\s*(\d+)/)))
      return { pass: +m[1], fail: +m[2] };
    // （5）「✗ 9 項失敗（通過 66）」
    if ((m = ln.match(/(\d+)\s*項\s*失敗[（(]\s*通過\s*(\d+)/)))
      return { pass: +m[2], fail: +m[1] };
  }
  // （6）舊式寬鬆規則（只拿到通過數；失敗數交給呼叫端的 exit code 判斷）
  for (let i = lines.length - 1; i >= 0 && i >= lines.length - 8; i--) {
    const ln = lines[i];
    const p1 = ln.match(/通過\s*(\d+)/);
    const p2 = ln.match(/(\d+)\s*(?:項)?\s*通過/);
    const f1 = ln.match(/(\d+)\s*項\s*失敗/);
    const f2 = ln.match(/失敗\s*(\d+)/);
    const pass = p1 ? +p1[1] : (p2 ? +p2[1] : null);
    if (pass !== null) return { pass: pass, fail: f1 ? +f1[1] : (f2 ? +f2[1] : null) };
  }
  return { pass: null, fail: null };
}

let bad = 0;
files.forEach(f => {
  let out = '';
  let code = 0;
  try {
    out = execFileSync(process.execPath, [path.join(dir, f)], { encoding: 'utf8', timeout: 180000 });
  } catch (e) {
    out = (e.stdout || '') + (e.stderr || '');
    code = typeof e.status === 'number' ? e.status : 1;
  }
  const { pass, fail } = parse(out);
  /* v5.74：**exit code 才是權威**。幾乎每支 verify 都以 process.exit(fail?1:0) 收尾，
     比解析中文字串可靠得多（summary 格式每支都不一樣，光靠正則一定會漏）。
     文字解析只用來「報告通過數」；萬一 exit 0 但輸出裏有 ✗ FAIL／❌，也一律算紅。 */
  const hasFailMark = /✗ ?FAIL|❌|\bFAIL\b/.test(out);
  const textFail = (fail !== null && fail > 0);
  const okk = code === 0 && !hasFailMark && !textFail && pass !== null && pass > 0;
  if (!okk) {
    bad++;
    console.log('  ✗ ' + f.padEnd(24) +
      (pass === null ? '（抓不到 summary）' : pass + ' 通過 / ' + (fail === null ? 0 : fail) + ' 失敗') +
      (code ? '（exit ' + code + '）' : hasFailMark ? '（輸出含失敗標記）' : ''));
    const lines = out.split('\n').filter(l => /FAIL|✗|❌|Error|error/.test(l)).slice(0, 5);
    lines.forEach(l => console.log('       ' + l.trim().slice(0, 110)));
  } else {
    console.log('  ✓ ' + f.padEnd(24) + pass + ' 通過');
  }
});
console.log('\n' + (bad ? '✗ 有 ' + bad + ' 支不是全綠' : '✅ 全部 ' + files.length + ' 支全綠'));
process.exit(bad ? 1 : 0);
