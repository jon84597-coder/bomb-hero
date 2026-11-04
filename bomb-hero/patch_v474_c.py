# -*- coding: utf-8 -*-
"""patch_v474_c.py — v4.74：AI 逃命（不站在自己炸彈上等死）、死亡小卡、入口卡文案、版本 4.74"""
import io, sys
P = 'index.html'
s = io.open(P, encoding='utf-8').read()

def rep(old, new, tag, cnt=1):
    global s
    n = s.count(old)
    if n != cnt:
        print('FAIL[%s] count=%d want=%d' % (tag, n, cnt)); sys.exit(1)
    s = s.replace(old, new)
    print('ok[%s]' % tag)

# ── 1) AI 逃命：BFS 找「不在火線上」的格子，回傳第一步 ──
rep("function controlAI(p, dt) {",
"""// v4.74：AI 逃命方向 —— 舊版站在（自己或別人的）炸彈十字線上時，只要「沒有現成的安全鄰格」
//   就直接 p.aiDir = null 站著不動，看起來就是「電腦傻站在自己的炸彈上等死」。
//   這裡用最多 5 步的 BFS 找一個不在火線上的格子，回傳往那邊的第一步。
function aiEscape(cx, cy) {
  const W = Game.cols, H = Game.rows, maxD = 5;
  const DN = ['up', 'down', 'left', 'right'];
  const q = [{ x: cx, y: cy, d: 0, first: null }];
  const seen = {};
  seen[cy * W + cx] = 1;
  for (let i = 0; i < q.length; i++) {
    const n = q[i];
    if (n.d > 0 && !dangerAt(n.x, n.y) && cellAt(n.x, n.y) === 0) return n.first;
    if (n.d >= maxD) continue;
    for (let k = 0; k < 4; k++) {
      const dn = DN[k], d = DIRS[dn];
      const nx = n.x + d.x, ny = n.y + d.y;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const key = ny * W + nx;
      if (seen[key]) continue;
      if (cellAt(nx, ny) !== 0 || bombAt(nx, ny)) continue;
      seen[key] = 1;
      q.push({ x: nx, y: ny, d: n.d + 1, first: n.d === 0 ? dn : n.first });
    }
  }
  return null;
}

function controlAI(p, dt) {""", 'ai-escape-fn')

# ── 2) 決策主體：只要在危險格上就一定跑，跑不掉也要往離炸彈最遠的方向走 ──
rep("""    if (sdHere) {
      // 石頭要砸在腳下了 → 一定跑（不看難度、不看機率），優先往內圈""",
"""    // v4.74：腳下／十字線上有炸彈（包含自己剛放的）→ 一定要動，不能站著等死
    const inDanger = dangerAt(cx, cy, p);
    if (inDanger) {
      const esc = aiEscape(cx, cy);
      if (esc) p.aiDir = esc;
      else if (opts.length) {
        // 附近全在火線上（死巷／被軟磚圍住）→ 挑「平均離炸彈最遠」的方向硬走
        let bestDir = null, bestV = -1;
        for (let oi = 0; oi < opts.length; oi++) {
          const dn = opts[oi], d = DIRS[dn];
          const nx = cx + d.x, ny = cy + d.y;
          let sum = 0, cnt = 0;
          for (let bi = 0; bi < Game.bombs.length; bi++) {
            const b = Game.bombs[bi];
            if (b.held || b.flying) continue;
            sum += Math.abs(b.cx - nx) + Math.abs(b.cy - ny); cnt++;
          }
          const v = cnt ? sum / cnt : 99;
          if (v > bestV) { bestV = v; bestDir = dn; }
        }
        p.aiDir = bestDir || opts[0];
      }
    } else if (sdHere) {
      // 石頭要砸在腳下了 → 一定跑（不看難度、不看機率），優先往內圈""", 'ai-danger')

# ── 3) 玩家出局：不蓋全螢幕卡，改成上方小卡（鏡頭自動接手觀戰） ──
rep("""  if (!p.ai && Game.state === 'play') {
    Game.state = 'roundover';
    setTimeout(function () { brFinish(null); }, 1400);
  }""",
"""  if (!p.ai && Game.state === 'play') {
    // v4.74：自己出局不再蓋一張全螢幕結算卡（擋住整個畫面）→ 上方小卡，
    //   比賽繼續跑、鏡頭自動切給還活著的人，想看誰死就繼續看
    Game.brSpec = true;
    setTimeout(function () {
      if (Game.endShown) return;
      showBRDeath('☠️ 你被淘汰了', '第 ' + p.brPlace + ' 名 / ' + BR.N +
        '\\n金幣 +' + (BR.GOLD[Math.min(BR.GOLD.length, p.brPlace) - 1] || 80) + '　（觀戰中，鏡頭已切給存活的人）', false);
    }, 1000);
  }""", 'br-death')

# ── 4) brFinish：贏了才開全螢幕；輸了沿用同一張小卡（改成最終名次） ──
rep("""  Game.state = 'over';
  banner(title, 3.2);
  if (win) { AudioSys.sfx('victory'); confetti(me.x, me.y - Game.T * .6, 18); }
  showEnd(title, sub, win, me.chIdx);""",
"""  Game.state = 'over';
  Game.endShown = true;
  if (win) {
    banner(title, 3.2);
    AudioSys.sfx('victory'); confetti(me.x, me.y - Game.T * .6, 18);
    showEnd(title, sub, true, me.chIdx);
  } else {
    // v4.74：輸了不蓋全螢幕（擋視線）→ 小卡直接換成最終名次
    showBRDeath(title, sub, false);
  }""", 'br-finish')

# ── 5) 小卡本體 ──
rep("""// v1.9：頭暈中""".replace('// v1.9：頭暈中', 'function brOnDeath(p) {'),
"""// v4.74：大逃殺結算小卡 —— 固定在畫面上方（HUD 下方），不蓋住遊戲畫面
function showBRDeath(title, sub, good) {
  let el = $id('brEnd');
  if (!el) {
    el = document.createElement('div');
    el.id = 'brEnd'; el.className = 'br-end';
    document.body.appendChild(el);
  }
  el.innerHTML = '<b>' + tr(title) + '</b><i>' + tr(sub).replace(/\\n/g, '<br>') + '</i>' +
    '<div class="br-end-row">' +
    '<button class="mbtn warm" id="brAgain">再來一場</button>' +
    '<button class="ghostbtn" id="brHome2">回首頁</button></div>';
  el.classList.remove('hide');
  const go = $id('brAgain'), hm = $id('brHome2');
  if (go) go.addEventListener('click', function () {
    AudioSys.sfx('click'); el.classList.add('hide');
    Game.endShown = false; Game.brSpec = false;
    startBR();
  });
  if (hm) hm.addEventListener('click', function () {
    AudioSys.sfx('click'); el.classList.add('hide');
    Game.endShown = false; Game.brSpec = false;
    try { hideOverlay(); } catch (e) {}
    AudioSys.startBGM('menu'); Screen.show('title');
  });
  if (good) { try { confetti(VIEW_W / 2, VIEW_H / 2, 12); } catch (e) {} }
  return el;
}

function brOnDeath(p) {""", 'show-br-death')

# ── 6) 開場時把上一場的小卡收掉 ──
rep("""  Game.mode = 'br';
  Game.pets = [];""",
"""  Game.mode = 'br';
  Game.brSpec = false;
  try { const be = $id('brEnd'); if (be) be.classList.add('hide'); } catch (e) {}
  Game.pets = [];""", 'hide-card')

io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('done', len(s))
