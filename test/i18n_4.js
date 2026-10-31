/* ---------- 補充：說明文字／方向鍵標籤（10 語） ---------- */
const I18N_EXTRA = {
  'hint.diff.easy': {
    'zh-TW': '😇 簡單：敵人少又慢、魔王血少，恐龍蛋也比較多（3 顆）。',
    'zh-CN': '😇 简单：敌人少又慢、魔王血少，恐龙蛋也比较多（3 颗）。',
    'en': '😇 Easy: fewer and slower enemies, weaker boss, more dino eggs (3).',
    'ja': '😇 かんたん：敵が少なく遅い、ボスの体力も少なめ、恐竜の卵は多め（3 個）。',
    'ko': '😇 쉬움: 적이 적고 느리며, 보스 체력이 낮고 공룡알이 많습니다(3개).',
    'th': '😇 ง่าย: ศัตรูน้อยและช้า บอสเลือดน้อย ไข่ไดโนเยอะ (3 ฟอง)',
    'vi': '😇 Dễ: địch ít và chậm, máu boss ít, trứng khủng long nhiều hơn (3 quả).',
    'ru': '😇 Легко: врагов меньше и они медленнее, у босса меньше здоровья, яиц динозавра больше (3).',
    'de': '😇 Leicht: weniger und langsamere Gegner, schwächerer Boss, mehr Dino-Eier (3).',
    'it': '😇 Facile: nemici meno numerosi e lenti, boss più debole, più uova di dinosauro (3).'
  },
  'hint.diff.normal': {
    'zh-TW': '🙂 普通：標準的敵人數量與速度，恐龍蛋 2 顆。',
    'zh-CN': '🙂 普通：标准的敌人数量与速度，恐龙蛋 2 颗。',
    'en': '🙂 Normal: standard enemy count and speed, 2 dino eggs.',
    'ja': '🙂 ふつう：敵の数と速さは標準、恐竜の卵は 2 個。',
    'ko': '🙂 보통: 적의 수와 속도는 표준, 공룡알 2개.',
    'th': '🙂 ปานกลาง: จำนวนและความเร็วศัตรูมาตรฐาน ไข่ไดโน 2 ฟอง',
    'vi': '🙂 Thường: số lượng và tốc độ địch tiêu chuẩn, 2 trứng khủng long.',
    'ru': '🙂 Нормально: стандартное число и скорость врагов, 2 яйца динозавра.',
    'de': '🙂 Normal: Standard-Anzahl und -Geschwindigkeit der Gegner, 2 Dino-Eier.',
    'it': '🙂 Normale: numero e velocità standard dei nemici, 2 uova di dinosauro.'
  },
  'hint.diff.hard': {
    'zh-TW': '😈 困難：敵人更多更快、魔王血更厚、恐龍蛋只有 1 顆。',
    'zh-CN': '😈 困难：敌人更多更快、魔王血更厚、恐龙蛋只有 1 颗。',
    'en': '😈 Hard: more and faster enemies, tankier boss, only 1 dino egg.',
    'ja': '😈 むずかしい：敵が多く速く、ボスの体力も高く、恐竜の卵は 1 個だけ。',
    'ko': '😈 어려움: 적이 더 많고 빠르며, 보스 체력이 높고 공룡알은 1개뿐.',
    'th': '😈 ยาก: ศัตรูเยอะและเร็ว บอสเลือดหนา ไข่ไดโนแค่ 1 ฟอง',
    'vi': '😈 Khó: địch nhiều và nhanh hơn, máu boss dày hơn, chỉ 1 trứng khủng long.',
    'ru': '😈 Сложно: врагов больше и они быстрее, у босса больше здоровья, всего 1 яйцо.',
    'de': '😈 Schwer: mehr und schnellere Gegner, zäherer Boss, nur 1 Dino-Ei.',
    'it': '😈 Difficile: nemici più numerosi e veloci, boss più resistente, solo 1 uovo.'
  },
  'hint.time.on': {
    'zh-TW': '時間到會强制陣亡一次（生命 -1），想慢慢探索請選 <b>♾️ 無限時間</b>。',
    'zh-CN': '时间到会强制阵亡一次（生命 -1），想慢慢探索请选择 <b>♾️ 无限时间</b>。',
    'en': 'When time runs out you lose a life (Life -1). Pick <b>♾️ Endless</b> to explore at your own pace.',
    'ja': '時間切れで強制的に 1 回やられます（ライフ -1）。ゆっくり探索したいなら <b>♾️ 無制限</b> を選んでください。',
    'ko': '시간이 다 되면 강제로 한 번 쓰러집니다(생명 -1). 천천히 탐험하려면 <b>♾️ 무한</b>을 선택하세요.',
    'th': 'หมดเวลาจะถูกบังคับตาย 1 ครั้ง (เลือด -1) ถ้าอยากสำรวจช้าๆ เลือก <b>♾️ ไม่จำกัด</b>',
    'vi': 'Hết giờ sẽ bị hạ bắt buộc một lần (mạng -1). Muốn khám phá chậm hãy chọn <b>♾️ Vô hạn</b>.',
    'ru': 'Когда время выйдет, вы потеряете одну жизнь (−1). Хотите исследовать спокойно — выберите <b>♾️ Без лимита</b>.',
    'de': 'Bei Zeitablauf verlierst du automatisch ein Leben (−1). Wähle <b>♾️ Endlos</b>, um in Ruhe zu erkunden.',
    'it': 'Allo scadere del tempo perdi automaticamente una vita (−1). Scegli <b>♾️ Infinito</b> per esplorare con calma.'
  },
  'hint.time.off': {
    'zh-TW': '<b>♾️ 無限時間</b>：不會因為時間到而陣亡，可以慢慢炸磚、找恐龍蛋。',
    'zh-CN': '<b>♾️ 无限时间</b>：不会因为时间到而阵亡，可以慢慢炸砖、找恐龙蛋。',
    'en': '<b>♾️ Endless</b>: you never die from the timer — take your time blasting bricks and hunting dino eggs.',
    'ja': '<b>♾️ 無制限</b>：時間切れでやられることはありません。ゆっくりブロックを壊し、恐竜の卵を探せます。',
    'ko': '<b>♾️ 무한</b>: 시간 때문에 쓰러지지 않습니다. 천천히 벽돌을 폭파하고 공룡알을 찾으세요.',
    'th': '<b>♾️ ไม่จำกัด</b>: จะไม่ตายเพราะหมดเวลา ค่อยๆ ระเบิดอิฐและหาไข่ไดโนได้',
    'vi': '<b>♾️ Vô hạn</b>: sẽ không bị hạ vì hết giờ, có thể từ từ phá gạch và tìm trứng khủng long.',
    'ru': '<b>♾️ Без лимита</b>: таймер вас не убьёт — спокойно взрывайте блоки и ищите яйца.',
    'de': '<b>♾️ Endlos</b>: der Timer tötet dich nicht — zerstöre in Ruhe Ziegel und suche Dino-Eier.',
    'it': '<b>♾️ Infinito</b>: il timer non ti uccide — distruggi i mattoni e cerca le uova con calma.'
  },
  'hint.ai.weak': {
    'zh-TW': '😴 弱：常常發呆亂走、不太會追人、很少放炸彈、不太會躲火爆、走比較慢。',
    'zh-CN': '😴 弱：常常发呆乱走、不太会追人、很少放炸弹、不太会躲火爆、走比较慢。',
    'en': '😴 Weak: wanders around, rarely chases, seldom drops bombs, poor at dodging, moves slower.',
    'ja': '😴 弱い：ぼーっと歩き回り、あまり追わず、爆弾もほとんど置かず、避けるのも苦手で動きが遅い。',
    'ko': '😴 약함: 멍하니 돌아다니고, 잘 쫓지 않고, 폭탄도 거의 두지 않으며, 회피도 서툴고 느립니다.',
    'th': '😴 อ่อน: เดินมั่วซั่ว ไม่ค่อยไล่ล่า แทบไม่วางระเบิด หลบไม่เป็น เดินช้า',
    'vi': '😴 Yếu: hay đứng chừng đi loanh quanh, ít đuổi theo, hiếm khi đặt bom, kém né lửa, đi chậm.',
    'ru': '😴 Слабый: бродит без цели, редко преследует, почти не ставит бомбы, плохо уклоняется, ходит медленно.',
    'de': '😴 Schwach: wandert planlos, verfolgt kaum, legt selten Bomben, weicht schlecht aus, bewegt sich langsamer.',
    'it': '😴 Debole: vaga senza meta, insegue poco, piazza poche bombe, schiva male e si muove lentamente.'
  },
  'hint.ai.normal': {
    'zh-TW': '🙂 中：會追對手撿道具、適時放彈、會避開火焰。',
    'zh-CN': '🙂 中：会追对手捡道具、适时放弹、会避开火焰。',
    'en': '🙂 Medium: chases you, grabs items, drops bombs at decent moments, avoids flames.',
    'ja': '🙂 中：相手を追ってアイテムを取り、タイミングよく爆弾を置き、炎も避けます。',
    'ko': '🙂 중간: 상대를 쫓고 아이템을 줍고, 적절히 폭탄을 두며 불꽃을 피합니다.',
    'th': '🙂 กลาง: ไล่ล่าและเก็บไอเทม วางระเบิดได้จังหวะ หลบไฟได้',
    'vi': '🙂 Trung bình: biết đuổi theo, nhặt đồ, đặt bom đúng lúc và né lửa.',
    'ru': '🙂 Средний: преследует, подбирает предметы, ставит бомбы к месту, обходит огонь.',
    'de': '🙂 Mittel: verfolgt dich, sammelt Items, legt Bomben zum passenden Zeitpunkt, weicht Feuer aus.',
    'it': '🙂 Medio: insegue, raccoglie oggetti, piazza bombe al momento giusto ed evita le fiamme.'
  },
  'hint.ai.strong': {
    'zh-TW': '😈 強：反應快、積極追擊、幾乎彈無虛發、火場逃生一流、走路更快。',
    'zh-CN': '😈 强：反应快、积极追击、几乎弹无虚发、火场逃生一流、走路更快。',
    'en': '😈 Strong: fast reactions, aggressive chasing, rarely misses, top-tier fire escape, moves faster.',
    'ja': '😈 強い：反応が速く積極的に追い、ほぼ弾を外さず、火からの脱出も一流で動きも速い。',
    'ko': '😈 강함: 반응이 빠르고 적극적으로 쫓으며, 폭탄을 거의 빗나가지 않고 불꽃 회피가 뛰어나며 더 빠릅니다.',
    'th': '😈 แข็งแกร่ง: ตอบสนองเร็ว ไล่ล่าบุกหนัก แทบไม่พลาด หนีไฟเก่ง เดินเร็ว',
    'vi': '😈 Mạnh: phản ứng nhanh, truy kích quyết liệt, gần như không trượt, thoát lửa cực tốt, đi nhanh hơn.',
    'ru': '😈 Сильный: быстрая реакция, агрессивная погоня, почти не промахивается, отлично уходит от огня, ходит быстрее.',
    'de': '😈 Stark: schnelle Reaktion, aggressive Verfolgung, trifft fast immer, erstklassige Flucht aus dem Feuer, schneller.',
    'it': '😈 Forte: reazioni rapide, insegue con aggressività, non sbaglia quasi mai, ottimo a sfuggire al fuoco, più veloce.'
  },
  'hint.ctrl.touch': {
    'zh-TW': '目前：<b>手機觸控</b>——畫面上出現圓形虛擬搖桿＋💥放彈鍵（搖桿可 360° 推、支援 45° 斜走；位置與大小可在下面調整）。',
    'zh-CN': '目前：<b>手机触控</b>——画面上出现圆形虚拟摇杆＋💥放弹键（摇杆可 360° 推、支持 45° 斜走；位置与大小可在下面调整）。',
    'en': 'Now: <b>Touch</b> — a round virtual stick plus a 💥 bomb button appear on screen (360° stick, 45° diagonals supported; position and size adjustable below).',
    'ja': '現在：<b>タッチ</b>——丸い仮想スティックと 💥爆弾ボタンが画面に出ます（360° 操作・斜め 45° 移動対応。位置とサイズは下で調整できます）。',
    'ko': '현재: <b>터치</b> — 둥근 가상 스틱과 💥폭탄 버튼이 화면에 나타납니다(360° 조작, 45° 대각 이동 지원; 위치와 크기는 아래에서 조정).',
    'th': 'ตอนนี้: <b>ทัชสกรีน</b> — มีสติกกลมและปุ่ม 💥 ปรากฏบนหน้าจอ (สติก 360° รองรับแนวเฉียง 45°; ปรับตำแหน่งและขนาดได้ด้านล่าง)',
    'vi': 'Hiện tại: <b>Cảm ứng</b> — cần gạt tròn ảo và nút 💥 hiện trên màn hình (gạt 360°, hỗ trợ đi chéo 45°; chỉnh vị trí và kích thước bên dưới).',
    'ru': 'Сейчас: <b>Сенсор</b> — на экране появятся круглый виртуальный стик и 💥кнопка бомбы (стик на 360°, поддерживается движение по диагонали 45°; положение и размер настраиваются ниже).',
    'de': 'Aktuell: <b>Touch</b> — ein runder virtueller Stick und ein 💥Bombenknopf erscheinen (360°-Stick, 45°-Diagonalen; Position und Größe unten einstellbar).',
    'it': 'Ora: <b>Touch</b> — compaiono uno stick rotondo virtuale e il pulsante bomba 💥 (stick a 360°, diagonali a 45° supportate; posizione e dimensioni regolabili qui sotto).'
  },
  'hint.ctrl.pad': {
    'zh-TW': '目前：<b>手把</b>——偵測到 <b>{name}</b>（第 1 支＝玩家 1）。手把可直接用方向鍵選單、A 確認、B 返回。',
    'zh-CN': '目前：<b>手柄</b>——侦测到 <b>{name}</b>（第 1 支＝玩家 1）。手柄可直接用方向键选单、A 确认、B 返回。',
    'en': 'Now: <b>Gamepad</b> — detected <b>{name}</b> (the first one = Player 1). Use the D-pad for menus, A to confirm, B to go back.',
    'ja': '現在：<b>パッド</b>——<b>{name}</b> を検出（1 台目＝プレイヤー 1）。パッドの方向キーでメニュー、A で決定、B で戻れます。',
    'ko': '현재: <b>패드</b> — <b>{name}</b> 감지(첫 번째 = 플레이어 1). 패드 방향키로 메뉴, A 확인, B 뒤로.',
    'th': 'ตอนนี้: <b>จอย</b> — ตรวจพบ <b>{name}</b> (ตัวแรก = ผู้เล่น 1) ใช้ปุ่มทิศทางเลือกเมนู, A ยืนยัน, B กลับ',
    'vi': 'Hiện tại: <b>Tay cầm</b> — phát hiện <b>{name}</b> (cái đầu tiên = Người chơi 1). Dùng phím hướng chọn menu, A xác nhận, B quay lại.',
    'ru': 'Сейчас: <b>Геймпад</b> — обнаружен <b>{name}</b> (первый = Игрок 1). Крестовина для меню, A — подтвердить, B — назад.',
    'de': 'Aktuell: <b>Gamepad</b> — <b>{name}</b> erkannt (der erste = Spieler 1). Steuerkreuz für Menüs, A bestätigen, B zurück.',
    'it': 'Ora: <b>Gamepad</b> — rilevato <b>{name}</b> (il primo = Giocatore 1). Croce direzionale per i menu, A conferma, B indietro.'
  },
  'hint.ctrl.kb': {
    'zh-TW': '目前：<b>鍵盤</b>——電腦遊玩不會顯示手機按鈕。{auto}',
    'zh-CN': '目前：<b>键盘</b>——电脑游玩不会显示手机按钮。{auto}',
    'en': 'Now: <b>Keyboard</b> — the touch buttons stay hidden on desktop. {auto}',
    'ja': '現在：<b>キーボード</b>——PC ではスマホ用ボタンは表示されません。{auto}',
    'ko': '현재: <b>키보드</b> — PC에서는 터치 버튼이 표시되지 않습니다. {auto}',
    'th': 'ตอนนี้: <b>คีย์บอร์ด</b> — บนคอมจะไม่แสดงปุ่มมือถือ {auto}',
    'vi': 'Hiện tại: <b>Bàn phím</b> — trên máy tính sẽ không hiện nút cảm ứng. {auto}',
    'ru': 'Сейчас: <b>Клавиатура</b> — на компьютере сенсорные кнопки не показываются. {auto}',
    'de': 'Aktuell: <b>Tastatur</b> — auf dem Desktop bleiben die Touch-Knöpfe verborgen. {auto}',
    'it': 'Ora: <b>Tastiera</b> — su desktop i pulsanti touch non vengono mostrati. {auto}'
  },
  'hint.auto.touch': {
    'zh-TW': '（自動偵測：觸控裝置）', 'zh-CN': '（自动侦测：触控设备）', 'en': '(auto-detect: touch device)',
    'ja': '（自動検出：タッチ端末）', 'ko': '(자동 감지: 터치 기기)', 'th': '(ตรวจจับอัตโนมัติ: อุปกรณ์ทัชสกรีน)',
    'vi': '(tự phát hiện: thiết bị cảm ứng)', 'ru': '(авто-определение: сенсорное устройство)',
    'de': '(Auto-Erkennung: Touch-Gerät)', 'it': '(rilevamento automatico: dispositivo touch)'
  },
  'hint.auto.pad': {
    'zh-TW': '（自動偵測：已接上手把，按一下手把就會自動切換）', 'zh-CN': '（自动侦测：已接上控制器，按一下控制器就会自动切换）',
    'en': '(auto-detect: a gamepad is connected — press any button to switch)',
    'ja': '（自動検出：パッド接続済み。何かボタンを押すと自動で切り替わります）',
    'ko': '(자동 감지: 패드가 연결됨 — 버튼을 누르면 자동 전환)',
    'th': '(ตรวจจับอัตโนมัติ: มีจอยต่ออยู่ กดปุ่มเพื่อสลับอัตโนมัติ)',
    'vi': '(tự phát hiện: đã kết nối tay cầm, bấm nút sẽ tự chuyển)',
    'ru': '(авто-определение: геймпад подключён — нажмите любую кнопку для переключения)',
    'de': '(Auto-Erkennung: Gamepad verbunden — beliebige Taste drücken zum Wechseln)',
    'it': '(rilevamento automatico: gamepad collegato — premi un tasto per passare)'
  },
  'hint.auto.kb': {
    'zh-TW': '（自動偵測：未接上手把，使用鍵盤）', 'zh-CN': '（自动侦测：未接上控制器，使用键盘）',
    'en': '(auto-detect: no gamepad found, using keyboard)',
    'ja': '（自動検出：パッドなし。キーボードを使用）', 'ko': '(자동 감지: 패드 없음, 키보드 사용)',
    'th': '(ตรวจจับอัตโนมัติ: ไม่มีจอย ใช้คีย์บอร์ด)', 'vi': '(tự phát hiện: không có tay cầm, dùng bàn phím)',
    'ru': '(авто-определение: геймпад не найден, используется клавиатура)',
    'de': '(Auto-Erkennung: kein Gamepad gefunden, Tastatur wird verwendet)',
    'it': '(rilevamento automatico: nessun gamepad, uso la tastiera)'
  },
  'key.up': { 'zh-TW': '上', 'zh-CN': '上', 'en': 'Up', 'ja': '上', 'ko': '위', 'th': 'ขึ้น', 'vi': 'Lên', 'ru': 'Вверх', 'de': 'Hoch', 'it': 'Su' },
  'key.down': { 'zh-TW': '下', 'zh-CN': '下', 'en': 'Down', 'ja': '下', 'ko': '아래', 'th': 'ลง', 'vi': 'Xuống', 'ru': 'Вниз', 'de': 'Runter', 'it': 'Giù' },
  'key.left': { 'zh-TW': '左', 'zh-CN': '左', 'en': 'Left', 'ja': '左', 'ko': '왼쪽', 'th': 'ซ้าย', 'vi': 'Trái', 'ru': 'Влево', 'de': 'Links', 'it': 'Sinistra' },
  'key.right': { 'zh-TW': '右', 'zh-CN': '右', 'en': 'Right', 'ja': '右', 'ko': '오른쪽', 'th': 'ขวา', 'vi': 'Phải', 'ru': 'Вправо', 'de': 'Rechts', 'it': 'Destra' },
  'key.act': { 'zh-TW': '動作／放彈', 'zh-CN': '动作／放弹', 'en': 'Action / Bomb', 'ja': 'アクション／爆弾', 'ko': '액션／폭탄', 'th': 'แอคชัน／วางระเบิด', 'vi': 'Hành động／Đặt bom', 'ru': 'Действие / Бомба', 'de': 'Aktion / Bombe', 'it': 'Azione / Bomba' },
  'key.det': { 'zh-TW': '遙控引爆', 'zh-CN': '遥控引爆', 'en': 'Remote Detonate', 'ja': 'リモコン起爆', 'ko': '원격 폭파', 'th': 'ระเบิดรีโมท', 'vi': 'Kích nổ từ xa', 'ru': 'Дистанционный подрыв', 'de': 'Fernzündung', 'it': 'Detonatore' },
  'key.fire': { 'zh-TW': '恐龍吐火', 'zh-CN': '恐龙吐火', 'en': 'Dino Flame', 'ja': '恐竜の炎', 'ko': '공룡 화염', 'th': 'ไฟไดโน', 'vi': 'Lửa khủng long', 'ru': 'Огонь динозавра', 'de': 'Dino-Feuer', 'it': 'Fuoco dinosauro' }
};
(function () {
  for (const k in I18N_EXTRA) {
    const per = I18N_EXTRA[k];
    for (const lg in per) { if (!I18N[lg]) I18N[lg] = {}; I18N[lg][k] = per[lg]; }
  }
})();
