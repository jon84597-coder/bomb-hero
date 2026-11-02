# -*- coding: utf-8 -*-
# v4.21：把「離開遊戲／離場卡」的靜態中文補進 10 語言字典（v33 會驗覆蓋率）
import io, sys

P = 'index.html'
raw = io.open(P, 'rb').read().decode('utf-8')
crlf = '\r\n' in raw
s = raw.replace('\r\n', '\n')

# 順序＝I18N 物件裡的語言區塊順序
ROWS = [
 ('zh-TW', ('🚪 離開遊戲', '存好進度 · 關掉這個頁面', '感謝遊玩！',
            '進度已經存在這台裝置上了，下次再來炸一波。', '↩ 回到遊戲', '🚪 關閉頁面',
            '手機：按右上角 ⨯ 或返回鍵　·　電腦：Ctrl／⌘ + W')),
 ('zh-CN', ('🚪 离开游戏', '存好进度 · 关掉这个页面', '感谢游玩！',
            '进度已经存在这台设备上了，下次再来炸一波。', '↩ 回到游戏', '🚪 关闭页面',
            '手机：按右上角 ⨯ 或返回键　·　电脑：Ctrl／⌘ + W')),
 ('en', ('🚪 Quit game', 'Progress saved · close this page', 'Thanks for playing!',
         'Your progress is saved on this device. Come back and blow things up again!', '↩ Back to game', '🚪 Close page',
         'Phone: tap ⨯ at the top-right or the Back key · Desktop: Ctrl/⌘ + W')),
 ('ja', ('🚪 ゲームを終了', '進行状況を保存して閉じる', '遊んでくれてありがとう！',
         '進行状況はこの端末に保存しました。また遊びに来てください。', '↩ ゲームに戻る', '🚪 ページを閉じる',
         'スマホ：右上の ⨯ か戻るキー　·　PC：Ctrl／⌘ + W')),
 ('ko', ('🚪 게임 종료', '진행 상황 저장 후 닫기', '플레이해 주셔서 감사합니다!',
         '진행 상황은 이 기기에 저장했어요. 다음에 또 놀러 오세요.', '↩ 게임으로 돌아가기', '🚪 페이지 닫기',
         '휴대폰: 오른쪽 위 ⨯ 또는 뒤로 가기　·　PC: Ctrl／⌘ + W')),
 ('th', ('🚪 ออกจากเกม', 'บันทึกความคืบหน้าแล้วปิดหน้านี้', 'ขอบคุณที่เล่นนะ!',
         'บันทึกความคืบหน้าไว้ในเครื่องนี้แล้ว กลับมาเล่นใหม่ได้ทุกเมื่อ', '↩ กลับไปเล่น', '🚪 ปิดหน้านี้',
         'มือถือ: กด ⨯ มุมขวาบน หรือปุ่มย้อนกลับ · คอมพิวเตอร์: Ctrl／⌘ + W')),
 ('vi', ('🚪 Thoát game', 'Đã lưu tiến trình · đóng trang này', 'Cảm ơn bạn đã chơi!',
         'Tiến trình đã được lưu trên thiết bị này. Hãy quay lại chơi tiếp nhé.', '↩ Về lại game', '🚪 Đóng trang',
         'Điện thoại: nhấn ⨯ góc trên phải hoặc phím Back · Máy tính: Ctrl／⌘ + W')),
 ('ru', ('🚪 Выйти из игры', 'Прогресс сохранён · закрыть страницу', 'Спасибо за игру!',
         'Прогресс сохранён на этом устройстве. Возвращайтесь ещё!', '↩ Вернуться в игру', '🚪 Закрыть страницу',
         'Телефон: ⨯ справа сверху или кнопка «Назад» · ПК: Ctrl／⌘ + W')),
 ('de', ('🚪 Spiel beenden', 'Fortschritt gespeichert · Seite schließen', 'Danke fürs Spielen!',
         'Dein Fortschritt ist auf diesem Gerät gespeichert. Komm bald wieder!', '↩ Zurück zum Spiel', '🚪 Seite schließen',
         'Handy: ⨯ oben rechts oder Zurück-Taste · PC: Ctrl／⌘ + W')),
 ('it', ('🚪 Esci dal gioco', 'Progressi salvati · chiudi la pagina', 'Grazie per aver giocato!',
         'I progressi sono salvati su questo dispositivo. Torna quando vuoi!', '↩ Torna al gioco', '🚪 Chiudi pagina',
         'Telefono: ⨯ in alto a destra o tasto Indietro · PC: Ctrl／⌘ + W')),
]

key = "'solo.doorTip.t':"
idxs, pos = [], -1
while True:
    pos = s.find(key, pos + 1)
    if pos < 0:
        break
    idxs.append(pos)

if len(idxs) != len(ROWS):
    print('  ! 語言區塊 %d（預期 %d）' % (len(idxs), len(ROWS)))
    sys.exit(1)

for i in range(len(ROWS) - 1, -1, -1):
    lid, v = ROWS[i]
    ins = ("  'menu.quit': '" + v[0] + "', 'menu.quit.sub': '" + v[1] + "',\n"
           "  'quit.title': '" + v[2] + "', 'quit.desc': '" + v[3] + "',\n"
           "  'quit.back': '" + v[4] + "', 'quit.close': '" + v[5] + "', 'quit.tip': '" + v[6] + "',\n")
    # 插在「行首」而不是 key 前面，縮排才會對
    p0 = idxs[i]
    while p0 > 0 and s[p0 - 1] in ' \t':
        p0 -= 1
    s = s[:p0] + ins + s[p0:]

if crlf:
    s = s.replace('\n', '\r\n')
io.open(P, 'wb').write(s.encode('utf-8'))
print('ok 10 languages')
