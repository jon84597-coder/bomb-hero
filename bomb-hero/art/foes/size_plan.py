# -*- coding: utf-8 -*-
"""v4.37 小怪尺寸重订算表

依据：每只的 R（enemyArtR）与 asp（宽高比）已知，目标显示高 = k * 主角高。
      hs_new = k * HERO_H / R；宽度 W = hs_new * R * asp 超过 W_MAX 就把 k 压回去。
"""
import io, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
W_MAX = 85.0

TARGET = {
    'slime': (.68, '雜兵'), 'bunny': (.66, '雜兵'), 'frog': (.66, '雜兵'),
    'cater': (.62, '雜兵'), 'mush': (.70, '矮胖'), 'beetle': (.74, '寬扁'),
    'crab': (.78, '寬甲'), 'mummy': (.82, '中'), 'eye': (.80, '飄浮'),
    'sandworm': (.80, '高瘦'), 'dune': (.92, '厚重'), 'scorp': (.84, '中'),
    'penguin': (.74, '矮'), 'crystal': (.80, '中'), 'bat': (.66, '小飛'),
    'snowball': (.80, '圓'), 'seal': (.82, '趴地長'), 'panda': (1.10, '大型'),
    'lavaslime': (.86, '中'), 'lavaworm': (.82, '中'), 'bee': (.64, '小飛'),
    'bomber': (1.00, '精英'), 'lizard': (.67, '趴地寬'), 'rockling': (.88, '厚重'),
    'wisp': (.72, '小光'), 'scavenger': (.82, '中'), 'robot': (1.02, '重型'),
    'pulser': (.84, '中'), 'laserbee': (.70, '小飛'), 'neonbot': (1.04, '重型'),
    'octopus': (.94, '多觸手'), 'angler': (1.10, '大型'), 'ghost': (.74, '飄浮'),
    'hermit': (.82, '寬甲'), 'jelly': (.72, '軟'), 'urchin': (.84, '多刺'),
    'hornet': (1.00, '精英'), 'airship': (.92, '長條'), 'sapper': (.86, '中'),
    'thunder': (.88, '中'), 'windwisp': (.96, '精英'), 'galehawk': (.95, '展翅'),
    'skull': (.80, '中'), 'imp': (.94, '精英'), 'darkbat': (.72, '小飛'),
    'wizard': (.96, '精英'), 'royalguard': (1.12, '大型'), 'deathknight': (1.14, '大型'),
}


def main():
    dump = json.load(io.open(os.path.join(HERE, '_rdump.json'), encoding='utf-8'))
    HERO_H = dump['heroH']
    plan = {}
    print('%-12s %5s %5s %6s %6s %6s %5s %5s' %
          ('id', 'R', 'asp', 'k_old', 'k_new', 'hs_old', 'hs_new', 'W'))
    for row in dump['rows']:
        i = row['id']
        if i not in TARGET:
            raise SystemExit('缺目标: ' + i)
        k, note = TARGET[i]
        R, asp, hs = row['R'], row['asp'], row['hs']
        k_old = hs * R / HERO_H
        # 宽度上限回压
        if k * HERO_H * asp > W_MAX:
            k = W_MAX / (HERO_H * asp)
        hs_new = k * HERO_H / R
        W = hs_new * R * asp
        plan[i] = round(hs_new, 3)
        print('%-12s %5.1f %5.2f %6.2f %6.2f %6.2f %6.3f %5.1f  %s%s' %
              (i, R, asp, k_old, k, hs, hs_new, W, note,
               '  (壓寬)' if hs_new * R / HERO_H < TARGET[i][0] - 1e-6 else ''))
    io.open(os.path.join(HERE, '_hs_plan.json'), 'w', encoding='utf-8').write(
        json.dumps(plan, ensure_ascii=False, indent=1, sort_keys=True))
    print('\n寫出 _hs_plan.json，共 %d 隻' % len(plan))


if __name__ == '__main__':
    main()
