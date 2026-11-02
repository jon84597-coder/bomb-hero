# -*- coding: utf-8 -*-
"""
v4.23 patch C：重畫寒冰地圖的四種元件
玩家回報：硬牆／軟牆／地板／滑地 顏色色系與形狀太像，會搞混。

原本全部都是淡藍色（明度 85~100），只有細節差別 —— 縮到手機小格子根本分不出來。
改法：用「明度階梯」＋「形狀」雙重區隔（灰階也分得開）：

    地板（雪地）  明度 ~92% 低彩度、平的、沒有硬邊
    軟牆（冰塊）  明度 ~68% 高彩度青色、八角切角、深色裂痕
    滑地（鏡面）  明度 ~50% 帶鏡面斜光＋霓虹青邊框＋雪花
    硬牆（冰岩）  明度 ~30% 深藍、厚實立體、深色粗外框＋積雪帽
"""
import io, re

P = 'index.html'
src = io.open(P, encoding='utf-8', newline='').read()
s = src.replace('\r\n', '\n')

def rep_func(name, new_body):
    """把整個 function XXX(...) { ... } 換掉"""
    global s
    pat = re.compile(r'function ' + name + r'\([^)]*\) \{[\s\S]*?\n\}\n')
    m = pat.search(s)
    assert m, '找不到 function ' + name
    assert len(pat.findall(s)) == 1, name + ' 出現多次'
    s = s[:m.start()] + new_body + s[m.end():]

# ------------------------------------------------------------------ 1. 主題色
old_theme = "  { name: '冰雪原', style: 'ice', bg1: '#16324a', bg2: '#1b3c58', floor: '#cfe7f6', floor2: '#bcdcef', hard: '#8ab4cf', soft: '#a8dcf5', soft2: '#6aa8d2', accent: '#e8f8ff', hazards: ['ice'] },"
new_theme = "  // v4.23：原本四種元件都是淡藍（明度 85~100）→ 全部糊在一起。改成明度階梯，灰階也分得開。\n  { name: '冰雪原', style: 'ice', bg1: '#16324a', bg2: '#1b3c58', floor: '#e9f1f6', floor2: '#e1ebf3', hard: '#2b5677', soft: '#57c7e8', soft2: '#2f9dc4', accent: '#8ff0ff', hazards: ['ice'] },"
assert s.count(old_theme) == 1
s = s.replace(old_theme, new_theme)

# ------------------------------------------------------------ 2. 硬牆（冰岩）
rep_func('drawWallIce', '''function drawWallIce(px, py, T, base, seed) {
  // v4.23：深藍厚實冰岩 —— 明度只有 ~30%（雪地 92%／冰塊 68%／滑地 50%），
  //   就算縮到 24px 的小格子、或玩家有色弱，也能靠「深淺」直接分辨。
  const x = px + T * .02, y = py + T * .02, w = T * .96, h = T * .96, r = T * .10;
  const h1 = dhash(seed, 3, 19), h2 = dhash(seed, 7, 23);
  // 立體陰影：往右下丟，看起來是「立起來的一塊石頭」而不是地板貼圖
  ctx.fillStyle = 'rgba(6,22,38,.42)';
  rect3d(x + T * .035, y + T * .075, w, h, r);
  const lg = ctx.createLinearGradient(x, y, x + w * .3, y + h);
  lg.addColorStop(0, '#3d7398'); lg.addColorStop(.46, '#2a5578'); lg.addColorStop(1, '#15314a');
  ctx.fillStyle = lg; rect3d(x, y, w, h, r);
  // 頂面受光的斜切亮面（只有上方一條，不會讓人誤認成地板）
  const tg = ctx.createLinearGradient(x, y, x, y + h * .34);
  tg.addColorStop(0, 'rgba(168,214,240,.85)'); tg.addColorStop(1, 'rgba(168,214,240,0)');
  ctx.fillStyle = tg;
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x + w * .06, y + h * .05, w * .88, h * .30, r * .7); ctx.fill(); }
  // 冰岩結晶面：兩塊淡色斜切（低對比，只是質感）
  ctx.fillStyle = 'rgba(190,228,248,.14)';
  ctx.beginPath();
  ctx.moveTo(x + w * .14, y + h * .34); ctx.lineTo(x + w * .52, y + h * .34);
  ctx.lineTo(x + w * .40, y + h * .86); ctx.lineTo(x + w * .10, y + h * .60);
  ctx.closePath(); ctx.fill();
  // 深色裂縫（不是白色 —— 白色裂縫會跟雪地反光混淆）
  ctx.strokeStyle = 'rgba(8,28,46,.45)';
  ctx.lineWidth = Math.max(1, T * .024);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + w * (.30 + h1 * .06), y + h * .36);
  ctx.lineTo(x + w * (.42 + h1 * .06), y + h * .60);
  ctx.lineTo(x + w * (.34 + h2 * .06), y + h * .88);
  ctx.stroke();
  ctx.lineCap = 'butt';
  // 積雪帽（上緣一小條，保留「冰」的味道，但厚度壓到 8% 避免變成地板）
  ctx.fillStyle = 'rgba(255,255,255,.90)';
  ctx.beginPath();
  ctx.ellipse(x + w * (.52 + h2 * .16), y + h * .055, w * .30, h * .055, 0, 0, 6.283);
  ctx.fill();
  // 深色粗外框：硬牆的「實心」識別
  ctx.strokeStyle = '#0b2236';
  ctx.lineWidth = Math.max(1.6, T * .038);
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x + w * .03, y + h * .03, w * .94, h * .94, r * .9); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(150,205,235,.45)';
  ctx.lineWidth = Math.max(1, T * .016);
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x + w * .07, y + h * .07, w * .86, h * .86, r * .7); ctx.stroke(); }
  ctx.lineWidth = 1;
}
''')

# ------------------------------------------------------------ 3. 軟牆（冰塊）
rep_func('drawCrateIce', '''function drawCrateIce(px, py, T, base, dark, big) {
  // v4.23：可炸的冰塊 —— 八角切角＋亮青色＋深色裂痕，跟硬牆的「深藍方塊」完全不同的形狀
  const inset = big ? T * .035 : T * .075;
  const x = px + inset, y = py + inset, w = T - inset * 2, h = T - inset * 2;
  const cut = w * .26;                 // 切角大小
  const h1 = dhash(px + py, 5, 17), h2 = dhash(px + py, 9, 31);
  const oct = function (dx, dy, ww, hh, cc) {
    ctx.beginPath();
    ctx.moveTo(dx + cc, dy);
    ctx.lineTo(dx + ww - cc, dy);
    ctx.lineTo(dx + ww, dy + cc);
    ctx.lineTo(dx + ww, dy + hh - cc);
    ctx.lineTo(dx + ww - cc, dy + hh);
    ctx.lineTo(dx + cc, dy + hh);
    ctx.lineTo(dx, dy + hh - cc);
    ctx.lineTo(dx, dy + cc);
    ctx.closePath();
  };
  // 陰影
  ctx.save();
  ctx.fillStyle = 'rgba(8,34,54,.28)';
  oct(x + T * .025, y + T * .055, w, h, cut); ctx.fill();
  // 冰塊本體：亮青色（明度 ~68%，比雪地「有色」很多）
  const lg = ctx.createLinearGradient(x, y, x + w * .45, y + h);
  lg.addColorStop(0, '#b6f1ff'); lg.addColorStop(.42, '#5fcbea'); lg.addColorStop(1, '#2b93bd');
  ctx.fillStyle = lg;
  oct(x, y, w, h, cut); ctx.fill();
  // 內部 V 形冰晶切面
  ctx.fillStyle = 'rgba(255,255,255,.42)';
  ctx.beginPath();
  ctx.moveTo(x + w * .50, y + h * .22);
  ctx.lineTo(x + w * .74, y + h * .50);
  ctx.lineTo(x + w * .50, y + h * .78);
  ctx.lineTo(x + w * .26, y + h * .50);
  ctx.closePath(); ctx.fill();
  // 深色裂痕（可破壞感）—— 一定要深色，才不會跟地板反光混淆
  ctx.strokeStyle = 'rgba(12,58,84,.62)';
  ctx.lineWidth = Math.max(1, T * .028);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + w * (.18 + h1 * .10), y + h * .18);
  ctx.lineTo(x + w * (.44 + h1 * .10), y + h * .46);
  ctx.lineTo(x + w * (.30 + h2 * .12), y + h * .82);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + w * .72, y + h * (.20 + h2 * .14));
  ctx.lineTo(x + w * .56, y + h * .52);
  ctx.stroke();
  ctx.lineCap = 'butt';
  // 亮青外框：形狀本身（八角）就是最強的識別
  ctx.strokeStyle = '#c8f6ff';
  ctx.lineWidth = Math.max(1.4, T * .034);
  oct(x + w * .03, y + h * .03, w * .94, h * .94, cut * .9); ctx.stroke();
  ctx.strokeStyle = 'rgba(24,110,146,.55)';
  ctx.lineWidth = Math.max(1, T * .016);
  oct(x, y, w, h, cut); ctx.stroke();
  ctx.restore();
  ctx.lineWidth = 1;
}
''')

# ------------------------------------------------------------ 4. 地板（雪地）
old_floor = """  if (st === 'ice') {
    // 冰面：亮面反光 + 冰裂 + 雪花點
    ctx.fillStyle = 'rgba(255,255,255,.34)';
    ctx.fillRect(px + T * .04, py + T * .04, T * .92, T * .10);
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.beginPath(); ctx.ellipse(px + T * (.3 + h1 * .4), py + T * (.3 + h2 * .4), T * (.26 + h1 * .1), T * .14, h3 * 3, 0, 6.283); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = Math.max(1, T * .022);
    ctx.beginPath();
    ctx.moveTo(px + T * .12, py + T * (.30 + h1 * .2));
    ctx.lineTo(px + T * (.45 + h2 * .15), py + T * .55);
    ctx.lineTo(px + T * .78, py + T * (.62 + h1 * .2));
    ctx.stroke();
    if (h3 > .55) {
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      const sx2 = px + T * (.2 + h2 * .6), sy2 = py + T * (.2 + h1 * .6);
      for (let k = 0; k < 4; k++) {
        const a = k * 1.57;
        ctx.fillRect(sx2 + Math.cos(a) * T * .05 - T * .012, sy2 + Math.sin(a) * T * .05 - T * .012, T * .024, T * .024);
      }
    }
    ctx.strokeStyle = 'rgba(120,170,200,.30)';
    ctx.lineWidth = Math.max(1, T * .02);
    ctx.strokeRect(px + T * .02, py + T * .02, T * .96, T * .96);
    ctx.lineWidth = 1;
    return;
  }"""
new_floor = """  if (st === 'ice') {
    // v4.23：積雪地面 —— 刻意「安靜」：低彩度、沒有硬邊、沒有大面積白色反光。
    //   舊版每格上方都有一條白色亮帶，看起來跟冰牆的上緣一模一樣 → 玩家把地板當牆。
    //   細雪粒（小而散）只用來給質感，不會形成任何幾何形狀。
    if (h1 > .42) {
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      const n = 3 + Math.floor(h2 * 4);
      for (let k = 0; k < n; k++) {
        const rx = px + T * (.10 + ((h1 * 7.3 + k * 2.7) % 1) * .80);
        const ry = py + T * (.10 + ((h2 * 5.1 + k * 3.9) % 1) * .80);
        const rs = T * (.014 + ((h3 + k) % 1) * .016);
        ctx.fillRect(rx, ry, rs, rs);
      }
    }
    // 極淡的磚縫：給格線感但不搶眼（牆的縫是深色粗線，這裡是淡灰細線）
    ctx.strokeStyle = 'rgba(158,182,200,.42)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + .5, py + .5, T - 1, T - 1);
    // 偶爾一片微微凸起的雪堆（大面積但只有 +3% 明度差，不會被看成障礙物）
    if (h3 > .78) {
      ctx.fillStyle = 'rgba(255,255,255,.34)';
      ctx.beginPath();
      ctx.ellipse(px + T * (.28 + h1 * .44), py + T * (.30 + h2 * .40),
                  T * (.22 + h1 * .10), T * .13, h3 * 3, 0, 6.283);
      ctx.fill();
    }
    return;
  }"""
assert s.count(old_floor) == 1, s.count(old_floor)
s = s.replace(old_floor, new_floor)

# ------------------------------------------------------------ 5. 滑地（鏡面）
old_hz = """        if (hz.type === 'ice') {
          // 冰面滑行格：比地板亮很多（一眼看得出哪裡會滑）
          let gx = null;
          if (ctx.createLinearGradient) { try { gx = ctx.createLinearGradient(px, py, px + T, py + T); } catch (e) { gx = null; } }
          if (gx && gx.addColorStop) {
            gx.addColorStop(0, 'rgba(236,252,255,.95)');
            gx.addColorStop(.5, 'rgba(168,226,255,.90)');
            gx.addColorStop(1, 'rgba(116,194,238,.90)');
            ctx.fillStyle = gx;
          } else ctx.fillStyle = 'rgba(190,235,255,.9)';
          ctx.fillRect(px + 3, py + 3, T - 6, T - 6);
          ctx.strokeStyle = 'rgba(255,255,255,.88)';
          ctx.lineWidth = Math.max(1.4, T * .045);
          ctx.beginPath();
          ctx.moveTo(px + T * .18, py + T * .82); ctx.lineTo(px + T * .82, py + T * .18);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(84,186,232,.95)';
          ctx.lineWidth = Math.max(1.2, T * .04);
          ctx.strokeRect(px + 3.5, py + 3.5, T - 7, T - 7);
          // 雪花記號（會呼吸）
          const icx = px + T * .5, icy = py + T * .5;
          const isz = T * .15 * (.92 + .08 * Math.sin(Game.gameT * 4 + px * .05));
          ctx.strokeStyle = 'rgba(255,255,255,.96)';
          ctx.lineWidth = Math.max(1, T * .03);
          for (let k = 0; k < 3; k++) {
            const an = k * Math.PI / 3;
            ctx.beginPath();
            ctx.moveTo(icx - Math.cos(an) * isz, icy - Math.sin(an) * isz);
            ctx.lineTo(icx + Math.cos(an) * isz, icy + Math.sin(an) * isz);
            ctx.stroke();
          }
          ctx.lineWidth = 1;
        } else if (hz.type === 'convey') {"""
new_hz = """        if (hz.type === 'ice') {
          // v4.23：滑冰格改成「鏡面」—— 明度 ~50%（雪地 92%／冰塊 68%），
          //   一眼就知道「這格不一樣、踩上去會滑」：鏡面斜光 + 霓虹青邊框 + 雪花。
          const gx = (function () {
            try {
              const g = ctx.createLinearGradient(px, py, px + T, py + T);
              g.addColorStop(0, '#5fc0dd'); g.addColorStop(.52, '#3d9dc2'); g.addColorStop(1, '#2a7ba3');
              return g;
            } catch (e) { return '#3d9dc2'; }
          })();
          ctx.fillStyle = gx;
          ctx.fillRect(px + 2.5, py + 2.5, T - 5, T - 5);
          // 兩道鏡面斜光（像打亮的冰面，不是固體）
          ctx.save();
          ctx.beginPath(); ctx.rect(px + 2.5, py + 2.5, T - 5, T - 5); ctx.clip();
          ctx.fillStyle = 'rgba(235,253,255,.55)';
          ctx.beginPath();
          ctx.moveTo(px + T * .06, py + T * .62); ctx.lineTo(px + T * .62, py + T * .06);
          ctx.lineTo(px + T * .40, py + T * .06); ctx.lineTo(px + T * .06, py + T * .40);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(235,253,255,.26)';
          ctx.beginPath();
          ctx.moveTo(px + T * .44, py + T * .96); ctx.lineTo(px + T * .96, py + T * .44);
          ctx.lineTo(px + T * .96, py + T * .70); ctx.lineTo(px + T * .70, py + T * .96);
          ctx.closePath(); ctx.fill();
          ctx.restore();
          // 霓虹青邊框（滑地的識別色，跟任何牆都不同）
          ctx.strokeStyle = '#8ff0ff';
          ctx.lineWidth = Math.max(1.6, T * .05);
          ctx.strokeRect(px + 3, py + 3, T - 6, T - 6);
          ctx.strokeStyle = 'rgba(24,90,120,.45)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 1, py + 1, T - 2, T - 2);
          // 雪花記號（會呼吸）
          const icx = px + T * .5, icy = py + T * .5;
          const isz = T * .145 * (.92 + .08 * Math.sin(Game.gameT * 4 + px * .05));
          ctx.strokeStyle = 'rgba(255,255,255,.95)';
          ctx.lineWidth = Math.max(1, T * .028);
          for (let k = 0; k < 3; k++) {
            const an = k * Math.PI / 3;
            ctx.beginPath();
            ctx.moveTo(icx - Math.cos(an) * isz, icy - Math.sin(an) * isz);
            ctx.lineTo(icx + Math.cos(an) * isz, icy + Math.sin(an) * isz);
            ctx.stroke();
          }
          ctx.lineWidth = 1;
        } else if (hz.type === 'convey') {"""
assert s.count(old_hz) == 1, s.count(old_hz)
s = s.replace(old_hz, new_hz)

io.open(P, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n'))
print('patch C 完成')
