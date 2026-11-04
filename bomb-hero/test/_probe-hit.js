// test/_probe-hit.js — 用「真實滑鼠事件」測試版本號連點，並檢查命中判定
const path = require('path');
const { launch, sleep } = require('./cdp.js');

(async () => {
  const b = await launch({ w: 1280, h: 900 });
  const url = 'file:///' + path.join(__dirname, '..', 'index.html').replace(/\\/g, '/') + '?cb=' + Date.now();
  const p = await b.newPage();
  await p.goto(url, 3000);
  for (let i = 0; i < 80; i++) { if (await p.eval('typeof window.__BH === "object" && !!window.__BH')) break; await sleep(300); }
  await sleep(1200);

  const info = await p.eval(`(function(){
    const v = document.getElementById('verTxt');
    if (!v) return JSON.stringify({err:'no verTxt'});
    const el = v.parentNode;
    const r = el.getBoundingClientRect();
    const cx = Math.round(r.left + r.width/2), cy = Math.round(r.top + r.height/2);
    const hit = document.elementFromPoint(cx, cy);
    function chain(n){ const out=[]; let e=n; while(e && e!==document.body){ out.push(e.tagName+'.'+(e.className||'')+'['+(getComputedStyle(e).pointerEvents)+']'); e=e.parentNode; } return out.join(' < '); }
    const cs = getComputedStyle(el);
    return JSON.stringify({
      rect:{l:Math.round(r.left),t:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)},
      cx, cy,
      hitTag: hit ? hit.tagName : null,
      hitId: hit ? hit.id : null,
      hitCls: hit ? String(hit.className) : null,
      isSelfOrChild: !!(hit && (hit===el || el.contains(hit))),
      disp: cs.display, vis: cs.visibility, pe: cs.pointerEvents, op: cs.opacity, z: cs.zIndex,
      ancestorChain: chain(el),
      innerW: innerWidth, innerH: innerHeight
    }, null, 1);
  })()`);
  console.log('HIT', info);

  const o = JSON.parse(info);
  if (o.cx) {
    for (let i = 0; i < 3; i++) {
      await p.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: o.cx, y: o.cy, button: 'left', clickCount: 1 });
      await p.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: o.cx, y: o.cy, button: 'left', clickCount: 1 });
      await sleep(120);
    }
  }
  await sleep(900);
  console.log('AFTER REAL CLICKS', await p.eval(`JSON.stringify({open: __BH.Admin.state().open, cls: (document.getElementById('bhModal')||{}).className})`));
  await p.shot(path.join(__dirname, '_probe-hit.png'));
  b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
