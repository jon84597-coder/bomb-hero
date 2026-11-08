// test/cdp.js — 极简 CDP 客户端（无依赖，node 22 内置 WebSocket）
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getJSON(url) {
  const res = await fetch(url);
  return res.json();
}

async function launch(opts = {}) {
  const port = opts.port || 9333;
  const userDir = path.join(os.tmpdir(), 'bh-cdp-' + port);
  try { fs.rmSync(userDir, { recursive: true, force: true }); } catch (e) {}
  const args = [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--no-first-run', '--no-default-browser-check',
    /* v5.64：這台機器有系統 proxy（127.0.0.1:13608），它不會轉 localhost ——
       headless Chrome 會乖乖照系統設定走，於是本地探針全部連不上（拿到 proxy 的錯誤頁，
       症狀是 __BH undefined）。繞過 proxy 直接連本地。 */
    '--no-proxy-server', '--proxy-bypass-list=*',
    '--remote-debugging-port=' + port,
    '--user-data-dir=' + userDir,
    '--window-size=' + (opts.w || 1280) + ',' + (opts.h || 900),
    'about:blank'
  ];
  const proc = spawn(CHROME, args, { stdio: 'ignore' });
  let info = null;
  for (let i = 0; i < 60; i++) {
    await sleep(120);
    try { info = await getJSON('http://127.0.0.1:' + port + '/json/version'); break; } catch (e) {}
  }
  if (!info) { proc.kill(); throw new Error('Chrome CDP 未就绪'); }
  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const waiting = new Map();
  const events = [];
  ws.onmessage = ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id && waiting.has(msg.id)) {
      const { res, rej } = waiting.get(msg.id);
      waiting.delete(msg.id);
      msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
    } else if (msg.method) {
      events.push(msg);
    }
  };
  function send(method, params = {}, sessionId) {
    const mid = ++id;
    return new Promise((res, rej) => {
      waiting.set(mid, { res, rej });
      ws.send(JSON.stringify({ id: mid, method, params, sessionId }));
      setTimeout(() => { if (waiting.has(mid)) { waiting.delete(mid); rej(new Error('CDP timeout ' + method)); } }, 30000);
    });
  }
  async function newPage() {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const S = (m, p) => send(m, p, sessionId);
    await S('Page.enable');
    await S('Runtime.enable');
    await S('Emulation.setDeviceMetricsOverride', {
      width: opts.w || 1280, height: opts.h || 900, deviceScaleFactor: 1, mobile: false
    });
    return {
      targetId, sessionId,
      send: S,
      async goto(url, waitMs = 800) {
        await S('Page.navigate', { url });
        await sleep(waitMs);
      },
      async eval(expr) {
        const r = await S('Runtime.evaluate', {
          expression: expr, returnByValue: true, awaitPromise: true, allowUnsafeEvalBlockedByCSP: true
        });
        if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text));
        return r.result.value;
      },
      async resize(w, h, mobile) {
        await S('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: !!mobile });
      },
      async shot(file) {
        const r = await S('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
        return file;
      },
      async fullShot(file) {
        const m = await S('Page.getLayoutMetrics');
        const cs = m.cssContentSize || m.contentSize;
        const r = await S('Page.captureScreenshot', {
          format: 'png',
          clip: { x: 0, y: 0, width: Math.ceil(cs.width), height: Math.ceil(cs.height), scale: 1 },
          captureBeyondViewport: true
        });
        fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
        return file;
      }
    };
  }
  return {
    port, send, newPage,
    close() { try { ws.close(); } catch (e) {} try { proc.kill(); } catch (e) {} }
  };
}

module.exports = { launch, sleep };
