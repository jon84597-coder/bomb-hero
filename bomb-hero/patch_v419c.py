# -*- coding: utf-8 -*-
"""v4.19 patch C：補齊 10 種怪物的名稱（圖鑑原本顯示 sp.bomber / sp.panda …）

v4.13 新增的 10 隻小怪只加了在 ENEMY_SPECIES，i18n 的 sp.* 名稱一直沒補，
說明書的怪物圖鑑因此直接印出 key（sp.scavenger、sp.bomber…）。這裡十語言一起補。
"""
import io, sys

PATH = 'index.html'

# (語言, 錨點（該語言 sp.eye 那一行）, 追加之內容)
LANGS = [
    ('zh-TW',
     "  'sp.shroom': '毒菇怪', 'sp.lizard': '疾風蜥', 'sp.bat': '蝙蝠', 'sp.ghost': '幽靈',\n"
     "  'sp.bee': '毒蜂', 'sp.eye': '眼球怪',",
     "  'sp.shroom': '毒菇怪', 'sp.lizard': '疾風蜥', 'sp.bat': '蝙蝠', 'sp.ghost': '幽靈',\n"
     "  'sp.bee': '毒蜂', 'sp.eye': '眼球怪',\n"
     "  // v4.19：補齊 v4.13 新增的 10 隻（圖鑑原本會顯示 sp.xxx）\n"
     "  'sp.scavenger': '撿彈怪', 'sp.sapper': '拆彈怪', 'sp.bomber': '放彈怪',\n"
     "  'sp.panda': '貓熊', 'sp.penguin': '企鵝', 'sp.octopus': '章魚',\n"
     "  'sp.robot': '機器人', 'sp.wisp': '鬼火', 'sp.wizard': '小巫師', 'sp.hornet': '大黃蜂',"),
    ('zh-CN',
     "  'sp.slime': '史莱姆', 'sp.beetle': '铁甲虫', 'sp.crab': '螃蟹', 'sp.skull': '骷髅兵',\n"
     "  'sp.shroom': '毒菇怪', 'sp.lizard': '疾风蜥', 'sp.bat': '蝙蝠', 'sp.ghost': '幽灵',\n"
     "  'sp.bee': '毒蜂', 'sp.eye': '眼球怪',",
     "  'sp.slime': '史莱姆', 'sp.beetle': '铁甲虫', 'sp.crab': '螃蟹', 'sp.skull': '骷髅兵',\n"
     "  'sp.shroom': '毒菇怪', 'sp.lizard': '疾风蜥', 'sp.bat': '蝙蝠', 'sp.ghost': '幽灵',\n"
     "  'sp.bee': '毒蜂', 'sp.eye': '眼球怪',\n"
     "  'sp.scavenger': '捡弹怪', 'sp.sapper': '拆弹怪', 'sp.bomber': '放弹怪',\n"
     "  'sp.panda': '猫熊', 'sp.penguin': '企鹅', 'sp.octopus': '章鱼',\n"
     "  'sp.robot': '机器人', 'sp.wisp': '鬼火', 'sp.wizard': '小巫师', 'sp.hornet': '大黄蜂',"),
    ('en',
     "  'sp.bee': 'Poison Bee', 'sp.eye': 'Eyeball',",
     "  'sp.bee': 'Poison Bee', 'sp.eye': 'Eyeball',\n"
     "  'sp.scavenger': 'Scavenger', 'sp.sapper': 'Sapper', 'sp.bomber': 'Bomber',\n"
     "  'sp.panda': 'Panda', 'sp.penguin': 'Penguin', 'sp.octopus': 'Octopus',\n"
     "  'sp.robot': 'Robot', 'sp.wisp': 'Wisp', 'sp.wizard': 'Little Wizard', 'sp.hornet': 'Giant Hornet',"),
    ('ja',
     "  'sp.bee': '毒蜂', 'sp.eye': '目玉',",
     "  'sp.bee': '毒蜂', 'sp.eye': '目玉',\n"
     "  'sp.scavenger': '拾い屋', 'sp.sapper': '解体屋', 'sp.bomber': '爆弾屋',\n"
     "  'sp.panda': 'パンダ', 'sp.penguin': 'ペンギン', 'sp.octopus': 'タコ',\n"
     "  'sp.robot': 'ロボット', 'sp.wisp': '鬼火', 'sp.wizard': '小さな魔法使い', 'sp.hornet': 'オオスズメバチ',"),
    ('ko',
     "  'sp.bee': '독벌', 'sp.eye': '눈알',",
     "  'sp.bee': '독벌', 'sp.eye': '눈알',\n"
     "  'sp.scavenger': '회수꾼', 'sp.sapper': '해체꾼', 'sp.bomber': '폭탄꾼',\n"
     "  'sp.panda': '판다', 'sp.penguin': '펭귄', 'sp.octopus': '문어',\n"
     "  'sp.robot': '로봇', 'sp.wisp': '도깨비불', 'sp.wizard': '꼬마 마법사', 'sp.hornet': '왕말벌',"),
    ('th',
     "  'sp.bee': 'ผึ้งพิษ', 'sp.eye': 'ลูกตา',",
     "  'sp.bee': 'ผึ้งพิษ', 'sp.eye': 'ลูกตา',\n"
     "  'sp.scavenger': 'นักเก็บระเบิด', 'sp.sapper': 'นักถอดระเบิด', 'sp.bomber': 'นักวางระเบิด',\n"
     "  'sp.panda': 'แพนด้า', 'sp.penguin': 'เพนกวิน', 'sp.octopus': 'ปลาหมึก',\n"
     "  'sp.robot': 'หุ่นยนต์', 'sp.wisp': 'วิสป์', 'sp.wizard': 'จอมเวทน้อย', 'sp.hornet': 'แตนยักษ์',"),
    ('vi',
     "  'sp.bee': 'Ong độc', 'sp.eye': 'Nhãn cầu',",
     "  'sp.bee': 'Ong độc', 'sp.eye': 'Nhãn cầu',\n"
     "  'sp.scavenger': 'Kẻ nhặt bom', 'sp.sapper': 'Kẻ gỡ bom', 'sp.bomber': 'Kẻ đặt bom',\n"
     "  'sp.panda': 'Gấu trúc', 'sp.penguin': 'Chim cánh cụt', 'sp.octopus': 'Bạch tuộc',\n"
     "  'sp.robot': 'Người máy', 'sp.wisp': 'Ma trơi', 'sp.wizard': 'Pháp sư nhỏ', 'sp.hornet': 'Ong bắp cày',"),
    ('ru',
     "  'sp.bee': 'Ядовитая пчела', 'sp.eye': 'Глаз',",
     "  'sp.bee': 'Ядовитая пчела', 'sp.eye': 'Глаз',\n"
     "  'sp.scavenger': 'Собиратель', 'sp.sapper': 'Сапёр', 'sp.bomber': 'Бомбардир',\n"
     "  'sp.panda': 'Панда', 'sp.penguin': 'Пингвин', 'sp.octopus': 'Осьминог',\n"
     "  'sp.robot': 'Робот', 'sp.wisp': 'Огонёк', 'sp.wizard': 'Малый маг', 'sp.hornet': 'Огромный шершень',"),
    ('de',
     "  'sp.bee': 'Giftbiene', 'sp.eye': 'Augapfel',",
     "  'sp.bee': 'Giftbiene', 'sp.eye': 'Augapfel',\n"
     "  'sp.scavenger': 'Sammler', 'sp.sapper': 'Entschärfer', 'sp.bomber': 'Bomber',\n"
     "  'sp.panda': 'Panda', 'sp.penguin': 'Pinguin', 'sp.octopus': 'Oktopus',\n"
     "  'sp.robot': 'Roboter', 'sp.wisp': 'Irrlicht', 'sp.wizard': 'Kleiner Zauberer', 'sp.hornet': 'Riesenhornisse',"),
    ('it',
     "  'sp.bee': 'Ape velenosa', 'sp.eye': 'Occhio',",
     "  'sp.bee': 'Ape velenosa', 'sp.eye': 'Occhio',\n"
     "  'sp.scavenger': 'Raccoglitore', 'sp.sapper': 'Artificiere', 'sp.bomber': 'Bombardiere',\n"
     "  'sp.panda': 'Panda', 'sp.penguin': 'Pinguino', 'sp.octopus': 'Polpo',\n"
     "  'sp.robot': 'Robot', 'sp.wisp': 'Fuoco fatuo', 'sp.wizard': 'Piccolo mago', 'sp.hornet': 'Calabrone gigante',"),
]

if __name__ == '__main__':
    raw = io.open(PATH, 'rb').read().decode('utf-8')
    crlf = '\r\n' in raw
    s = raw.replace('\r\n', '\n')
    # 順序有差：zh-CN 用三行錨點先處理，zh-TW 的單行錨點之後才會唯一
    order = sorted(LANGS, key=lambda x: 0 if x[0] == 'zh-CN' else 1)
    for lang, anchor, repl in order:
        n = s.count(anchor)
        if n != 1:
            print('  ! %s -> hits %d' % (lang, n)); sys.exit(1)
        s = s.replace(anchor, repl)
        print('  ok %s' % lang)
    if crlf:
        s = s.replace('\n', '\r\n')
    io.open(PATH, 'wb').write(s.encode('utf-8'))
    print('saved', PATH)
