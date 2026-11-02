# -*- coding: utf-8 -*-
"""v4.37 A：突死縮圈落石
   ① 每圈內縮 2 格 → 中間那一圈永遠不會出現在名單裡（落石漏格、沒落滿就跳過）
   ② 落石節奏 .9s/格 → SD_STEP_T（維持總時長）
   ③ 新增 sdSoon()：接下來 N 格內會不會落到這一格（AI 閃落石用）
   ④ controlAI：站到即將落石的格上一定跑，選路時把預告格當危險格，且優先往內圈
"""
import io

P = 'index.html'
s = io.open(P, encoding='utf-8', newline='').read()
src = s.replace('\r\n', '\n')
orig = src

def rep(old, new, tag, n=1):
    global src
    c = src.count(old)
    assert c == n, '[%s] 預期 %d 次，實際 %d 次' % (tag, n, c)
    src = src.replace(old, new)
    print('ok [%s]' % tag)

# ── ① 環內縮 1（覆蓋每一格）＋ ③ sdSoon ──
rep("""function buildSdList() {
  // 突死縮圈：外圈內縮的落石順序（順時針環）
  const list = [];
  let x0 = 1, y0 = 1, x1 = Game.cols - 2, y1 = Game.rows - 2;
  while (x0 <= x1 && y0 <= y1) {
    for (let x = x0; x <= x1; x++) list.push([x, y0]);
    for (let y = y0 + 1; y <= y1; y++) list.push([x1, y]);
    if (y1 > y0) for (let x = x1 - 1; x >= x0; x--) list.push([x, y1]);
    if (x1 > x0) for (let y = y1 - 1; y > y0; y--) list.push([x0, y]);
    x0 += 2; y0 += 2; x1 -= 2; y1 -= 2;
  }
  Game.sdList = list;
  Game.sdIndex = 0;
  Game.sdTimer = 0;
}""",
"""const SD_STEP_T = .55;          // v4.37：一格落石的間隔（原本 .9；因為現在每格都落，總時長才不變）
function buildSdList() {
  // 突死縮圈：由外往內、順時針一圈一圈收
  // v4.37：環每次只內縮「1 格」—— 舊版內縮 2 格，等於把中間那一圈整圈跳過，
  //   落石永遠落不滿場地（玩家會看到牆一路長到中間卻有幾圈是空的）。
  const list = [];
  let x0 = 1, y0 = 1, x1 = Game.cols - 2, y1 = Game.rows - 2;
  while (x0 <= x1 && y0 <= y1) {
    for (let x = x0; x <= x1; x++) list.push([x, y0]);
    for (let y = y0 + 1; y <= y1; y++) list.push([x1, y]);
    if (y1 > y0) for (let x = x1 - 1; x >= x0; x--) list.push([x, y1]);
    if (x1 > x0) for (let y = y1 - 1; y > y0; y--) list.push([x0, y]);
    x0 += 1; y0 += 1; x1 -= 1; y1 -= 1;
  }
  Game.sdList = list;
  Game.sdIndex = 0;
  Game.sdTimer = 0;
}
// v4.37：落石預告 —— 接下來 ahead 格以內會不會轮到這一格（AI 靠它閃落石）
function sdSoon(x, y, ahead) {
  if (!Game.sdActive || !Game.sdList || !Game.sdList.length) return false;
  const end = Math.min(Game.sdList.length, Game.sdIndex + (ahead || 12));
  for (let i = Game.sdIndex; i < end; i++) {
    const c = Game.sdList[i];
    if (c[0] === x && c[1] === y) return true;
  }
  return false;
}""",
'buildSdList')

# ── ② 節奏改成常數 ──
rep("        Game.sdTimer = .9;", "        Game.sdTimer = SD_STEP_T;", 'sd-step')

# ── ④ controlAI：閃落石 ──
rep("""  p.aiT = (p.aiT || 0) - dt;
  if (atCenter || !p.aiDir || !neighborOk(p.aiDir) || p.aiT <= 0) {
    p.aiT = lv.think[0] + Math.random() * (lv.think[1] - lv.think[0]);
    const opts = ['up', 'down', 'left', 'right'].filter(neighborOk);
    const safeOpts = opts.filter(function (dn) { const d = DIRS[dn]; return !dangerAt(cx + d.x, cy + d.y); });
    if (dangerAt(cx, cy) && Math.random() < lv.flee) {""",
"""  p.aiT = (p.aiT || 0) - dt;
  // v4.37：突死縮圈的落石 —— 腳下三格內會落石就「立刻」重算方向（不等思考冷卻）
  const sdHere = sdSoon(cx, cy, 3);
  const aiD = DIRS[p.aiDir] || DIRS.down;
  const sdAhead = sdSoon(cx + aiD.x, cy + aiD.y, 12);
  if (atCenter || !p.aiDir || !neighborOk(p.aiDir) || p.aiT <= 0 || sdHere || sdAhead) {
    p.aiT = lv.think[0] + Math.random() * (lv.think[1] - lv.think[0]);
    const opts = ['up', 'down', 'left', 'right'].filter(neighborOk);
    // 落石預告格也算危險格（12 格以內會落 = 牠走到那裏大概就被壓了）
    const safeOpts = opts.filter(function (dn) {
      const d = DIRS[dn];
      return !dangerAt(cx + d.x, cy + d.y) && !sdSoon(cx + d.x, cy + d.y, 12);
    });
    // 縮圈中：把最靠場地中心的那格排前面（外圈先塌，往內才活）
    if (Game.sdActive) {
      const mx = (Game.cols - 1) / 2, my = (Game.rows - 1) / 2;
      safeOpts.sort(function (a, b) {
        const da = Math.abs(cx + DIRS[a].x - mx) + Math.abs(cy + DIRS[a].y - my);
        const db = Math.abs(cx + DIRS[b].x - mx) + Math.abs(cy + DIRS[b].y - my);
        return da - db;
      });
    }
    if (sdHere) {
      // 石頭要砸在腳下了 → 一定跑（不看難度、不看機率），優先往內圈
      p.aiDir = safeOpts.length ? safeOpts[0]
        : (opts.length ? opts[0] : null);
    } else if (dangerAt(cx, cy) && Math.random() < lv.flee) {""",
'ai-sdodge')

assert src != orig
out = src.replace('\n', '\r\n')
io.open(P, 'w', encoding='utf-8', newline='').write(out)
print('write ok %d bytes' % len(out.encode('utf-8')))
