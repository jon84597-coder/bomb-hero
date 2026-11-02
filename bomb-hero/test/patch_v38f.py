# -*- coding: utf-8 -*-
"""
v3.8 補丁 F：10 語字典的 dead.* / kill.1 台詞跟著換新
（tr() 靠 zh-TW 字典反查，字典不更新英文語系就會講中文）
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, 'index.html')

s = io.open(HTML, encoding='utf-8').read()
orig = s


def rep(old, new, tag):
    global s
    if s.count(old) != 1:
        sys.exit('[FAIL] 找不到唯一目標（%d 處）：%s' % (s.count(old), tag))
    s = s.replace(old, new, 1)
    print('  OK  ' + tag)


rep("'dead.1': '哎呀！該死！', 'dead.2': '可惡..我會回來報仇...！', 'dead.3': '媽的！幹！',",
    "'dead.1': '哎呀！糟糕糟糕！！', 'dead.2': '可惡..我下次一定會贏...！', 'dead.3': '天啊！不～！',",
    'zh-TW dead.*')
rep("'kill.1': '哈哈！傻B！', 'kill.2': '還是我厲害！', 'kill.3': '我的炸彈好吃嗎？',",
    "'kill.1': '哈哈！你還得加把勁！', 'kill.2': '還是我厲害！', 'kill.3': '我的炸彈好吃嗎？',",
    'zh-TW kill.*')

rep("'dead.1': '哎呀！该死！', 'dead.2': '可恶..我会回来报仇...！', 'dead.3': '妈的！干！',",
    "'dead.1': '哎呀！糟糕糟糕！！', 'dead.2': '可恶..我下次一定会赢...！', 'dead.3': '天啊！不～！',",
    'zh-CN dead.*')
rep("'kill.1': '哈哈！傻B！', 'kill.2': '还是我厉害！', 'kill.3': '我的炸弹好吃吗？',",
    "'kill.1': '哈哈！你还得加把劲！', 'kill.2': '还是我厉害！', 'kill.3': '我的炸弹好吃吗？',",
    'zh-CN kill.*')

rep("'dead.1': 'Aw, damn it!', 'dead.2': 'Curse you.. I will be back...!', 'dead.3': 'Oh come on!!'",
    "'dead.1': 'Oops! This is bad!!', 'dead.2': 'Darn it.. I will win next time...!', 'dead.3': 'Oh no! Not aga-in~!'",
    'en dead.*')
rep("'kill.1': 'Haha! Gotcha!',",
    "'kill.1': 'Haha! You gotta try harder!',",
    'en kill.1')

rep("'dead.1': 'うわ！やられた！', 'dead.2': 'くそっ..必ず復讐してやる...！', 'dead.3': 'ちくしょう！！'",
    "'dead.1': 'うわ！やばいやばい！！', 'dead.2': 'くそっ..今度こそ勝つ...！', 'dead.3': 'うわあ！やだ～！'",
    'ja dead.*')
rep("'kill.1': 'ははっ！ばかだな！'",
    "'kill.1': 'ははっ！まだまだだね！'",
    'ja kill.1')

rep("'dead.1': '아, 젠장!', 'dead.2': '으악..꼭 복수하러 온다...!', 'dead.3': '미친!!'",
    "'dead.1': '앗, 큰일났다!!', 'dead.2': '젠장..다음엔 꼭 이긴다...!', 'dead.3': '말도 안 돼! 안~!'",
    'ko dead.*')
rep("'kill.1': '하하! 바보!'",
    "'kill.1': '하하! 아직 멀었어!'",
    'ko kill.1')

rep("'dead.1': 'อุ๊ย! บ้าไปแล้ว!', 'dead.2': 'ช่างมัน..ฉันจะกลับมาแก้แค้น...!', 'dead.3': 'โธ่เว้ย!!'",
    "'dead.1': 'โอ๊ย! แย่แล้ว แย่แล้ว!!', 'dead.2': 'เฮ้ย..ครั้งหน้าฉันชนะแน่...!', 'dead.3': 'ตายจริง! ไม่นะ~!'",
    'th dead.*')
rep("'kill.1': 'ฮ่า ๆ! โง่จัง!'",
    "'kill.1': 'ฮ่า ๆ! ยังต้องฝึกอีกเยอะ!'",
    'th kill.1')

rep("'dead.1': 'Á, chết tiệt!', 'dead.2': 'Khốn kiếp..ta sẽ quay lại trả thù...!', 'dead.3': 'Đồ khốn!!'",
    "'dead.1': 'Trời ơi! Chết rồi!!', 'dead.2': 'Khốn kiếp..lần sau tôi chắc chắn thắng...!', 'dead.3': 'Ôi không! Đừng~!'",
    'vi dead.*')
rep("'kill.1': 'Haha! Ngu thế!'",
    "'kill.1': 'Haha! Còn phải cố lên nhé!'",
    'vi kill.1')

rep("'dead.1': 'Ай! Чёрт!', 'dead.2': 'Проклятье..я ещё вернусь...!', 'dead.3': 'Да чтоб тебя!!'",
    "'dead.1': 'Ай-яй! Беда-беда!!', 'dead.2': 'Проклятье..в следующий раз я выиграю...!', 'dead.3': 'Ой нет! Не-е-ет~!'",
    'ru dead.*')
rep("'kill.1': 'Ха-ха! Лох!'",
    "'kill.1': 'Ха-ха! Тебе ещё учиться!'",
    'ru kill.1')

rep("'dead.1': 'Au, verdammt!', 'dead.2': 'Verdammt..ich komme zurück...!', 'dead.3': 'Zum Teufel!!'",
    "'dead.1': 'Ach nein! Mist, Mist!!', 'dead.2': 'Verdammt..nächstes Mal gewinne ich...!', 'dead.3': 'Oh nein! Nei-i-in~!'",
    'de dead.*')
rep("'kill.1': 'Haha! Trottel!'",
    "'kill.1': 'Haha! Du musst noch üben!'",
    'de kill.1')

rep("'dead.1': 'Ahi! Maledizione!', 'dead.2': 'Maledetto..tornerò a vendicarmi...!', 'dead.3': 'Accidenti!!'",
    "'dead.1': 'Ops! Che disastro!!', 'dead.2': 'Dannazione..la prossima volta vinco io...!', 'dead.3': 'Oh no! No-o-o~!'",
    'it dead.*')
rep("'kill.1': 'Ah ah! Stupido!'",
    "'kill.1': 'Ah ah! Devi ancora impegnarti!'",
    'it kill.1')

if s != orig:
    io.open(HTML, 'w', encoding='utf-8').write(s)
    print('[OK] index.html 已更新')
else:
    print('[SKIP] 沒有變動')
