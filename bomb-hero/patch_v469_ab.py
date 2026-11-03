# -*- coding: utf-8 -*-
# v4.69 A+B：出生點只清 1 格（第 2 格起要有牆）＋ RPG 小怪改成跟單人同一套大關生態
import io, sys
P = 'index.html'
s = io.open(P, encoding='utf-8').read()


def rep(old, new, tag):
    global s
    n = s.count(old)
    if n != 1:
        sys.stderr.write('[FAIL] %s count=%d\n' % (tag, n))
        if n:
            i = s.find(old)
            sys.stderr.write(repr(s[max(0, i - 150):i + 250]) + '\n')
        sys.exit(1)
    s = s.replace(old, new)
    print('[ok] ' + tag)


# ---------- A. 出生點：只清 1 格，第 2 格起就要有牆 ----------
rep("""    if (Math.abs(px2 - sp.x) < 3 && Math.abs(py2 - sp.y) < 3) continue;""",
    """    // v4.69：岩柱只避開出生點周圍 1 格（原本 3×3 全避）——使用者要「第 2 格起就要有牆」
    if (Math.abs(px2 - sp.x) < 2 && Math.abs(py2 - sp.y) < 2) continue;""",
    'rock-near-spawn')

rep("""  const clearR = Game.bigMap ? 2 : 3;""",
    """  // v4.69：軟磚只在出生點「半徑 1」留白（原本大圖 2、小圖 3）——
  //   以前一開場四周三大圈全是空地，看起來像被清場；現在第 2 格起就照一般機率鋪。
  const clearR = 1;""",
    'soft-clearR')

# ---------- B. RPG 小怪：跟單人同一套大關生態＋同樣的數量 ----------
rep("""function rpgFoePool(stage) {
  // v4.13：新增的 10 隻也進 RPG 怪池
  const ground = ['slime', 'beetle', 'crab', 'skull', 'mush', 'lizard', 'panda', 'penguin', 'octopus', 'robot'];
  const flying = ['bat', 'ghost', 'bee', 'eye', 'wisp', 'hornet'];
  const skills = ['scavenger', 'sapper', 'bomber', 'wizard'];
  if (stage <= 2) return ground.slice(0, 3);
  if (stage <= 5) return ground.slice(0, 4).concat(['bat']);
  if (stage <= 9) return ground.slice(0, 5).concat(flying.slice(0, 2));
  if (stage <= 16) return ground.concat(flying.slice(0, 3)).concat(skills.slice(0, 2));
  return ground.concat(flying).concat(skills);
}""",
    """function rpgFoePool(stage) {
  // v4.69：以前 RPG 是「草原史萊姆＋骷髏＋章魚＋機器人」全部混在一起放，
  //   第 1 關就遇得到深海／魔王城的怪，跟場景完全對不起來。
  //   現在直接沿用單人模式的「八大關卡生態表」：同一個大關只會出現那 6 隻，
  //   大關裡第 1 小關先出 4 種、第 2 小關 5 種、之後全員登場（跟單人一模一樣）。
  return stageTypes(stage).slice();
}""",
    'rpgFoePool')

rep("""  const pool = rpgFoePool(stage);
  // v4.17：RPG 的小怪也變多（原 5 + 關號×0.7）
  const n = Math.max(6, Math.round((7 + stage * .95) * (cols * rows) / (15 * 13)));
  for (let i = 0; i < n; i++) {
    let x = 1, y = 1, tries = 0;
    do {
      x = 1 + Math.floor(Math.random() * (cols - 2));
      y = 1 + Math.floor(Math.random() * (rows - 2));
      tries++;
    } while ((cellAt(x, y) !== 0 || nearSpawn(x, y, 2) || bombAt(x, y)) && tries < 200);
    const type = pool[i % pool.length];""",
    """  const types = rpgFoePool(stage);
  const pool = types.slice();           // 先輪流出一輪，保證每種都登場
  // v4.69：數量改成跟單人闖關同一條曲線（原本 7 + 關號×0.95，後段比單人多快 3 倍）
  const n = Math.max(2, Math.min(FOE_MAX_LIVE,
    Math.round(Math.round(4 + stage * .25) * (cols * rows) / (15 * 13))));
  // v4.69：跟單人一樣「先列出合法格再抽」，不會抽不到就硬塞在出生點旁邊
  const spots = [];
  for (let yy = 1; yy < rows - 1; yy++) for (let xx = 1; xx < cols - 1; xx++) {
    if (cellAt(xx, yy) !== 0 || bombAt(xx, yy) || nearSpawn(xx, yy, 2)) continue;
    spots.push([xx, yy]);
  }
  for (let i = 0; i < n; i++) {
    let x, y;
    if (spots.length) {
      const c2 = spots.splice(Math.floor(Math.random() * spots.length), 1)[0];
      x = c2[0]; y = c2[1];
    } else {
      let tries = 0;
      do {
        x = 1 + Math.floor(Math.random() * (cols - 2));
        y = 1 + Math.floor(Math.random() * (rows - 2));
        tries++;
      } while ((cellAt(x, y) !== 0 || nearSpawn(x, y, 1) || bombAt(x, y)) && tries < 200);
    }
    const type = pool.length ? pool.shift() : pick(types);""",
    'rpg-spawn')

io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('chars:', len(s))
