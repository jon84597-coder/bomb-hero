// 測試用：驗證「收到 SIGTERM 會同步落盤」這條路徑
//
// Windows 上沒辦法真的送 SIGTERM 給子行程（Node 的 child.kill('SIGTERM') 會直接
// TerminateProcess，handler 根本來不及跑），所以用 process.emit('SIGTERM') 觸發
// 同一個 handler —— 在 Linux（Render）上則是作業系統真的送訊號，行為一致。
//
// 用法：TEST_SRV=<server.js 路徑> TEST_PORT=<埠> node _sigterm_helper.js
//       從 stdin 收到一行 STOP 就 emit SIGTERM（等測試打完 API 再送）
process.env.PORT = process.env.TEST_PORT || '3501';
require(process.env.TEST_SRV);

let buf = '';
process.stdin.resume();
process.stdin.setEncoding('utf8');
process.stdin.on('data', function (d) {
  buf += d;
  if (buf.indexOf('STOP') >= 0) {
    process.emit('SIGTERM');
    setTimeout(function () { process.exit(0); }, 500);   // 保險：handler 沒exit就自己收
  }
});
