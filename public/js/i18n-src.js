/* 爆爆英雄 BOMB HERO — i18n 字典（5 語言壓縮表）
   v5.20 從 index.html 抽出：這是一份 162KB 的純資料，抽成獨立檔之後
   主檔才有預算線空間可以長新功能，而且改版時它不會跟著重新下載。
   格式：每行「key|zh-TW|zh-CN|en|ja|ko」—— 新增文案時五個語言都要填，
   少填的語言會退回顯示 key。由 index.html 的 IIFE 展開成 I18N[lang][key]。 */
window.__I18N_SRC = `
net.teams|組隊模式（房主設定）|组队模式（房主设置）|Team mode (host)|チーム戦（ホスト設定）|팀 모드(방장 설정)
net.teams.free|混戰|混战|Free-for-all|混戦|난전
net.teams.n|{n} 隊|{n} 队|{n} teams|{n} チーム|{n}팀
net.lag|⚠️ 目前是測試階段：線上配對的連線可能會有點卡 —— 伺服器用的只是最初階的規格、速度不快，卡頓請見諒。|⚠️ 目前是测试阶段：线上配对的连线可能会有点卡 —— 服务器用的只是最初阶的规格、速度不快，卡顿请见谅。|⚠️ Beta notice: online matches may lag a little — the server runs on the most basic tier and is not fast. Thanks for your patience.|⚠️ 現在はテスト段階です。オンライン対戦は多少ラグることがあります（サーバーが最低限のスペックのため）。ご了承ください。|⚠️ 현재 테스트 단계입니다. 온라인 대전은 약간 끊길 수 있습니다(서버가 최저 사양이라 빠르지 않습니다). 양해 부탁드립니다.
mapmode.title|地圖模式|地图模式|Map type|マップ種類|맵 종류
mapmode.classic|🗺️ 基本地圖（舊）|🗺️ 基本地图（旧）|🗺️ Classic maps|🗺️ 通常マップ（旧）|🗺️ 기본 맵(구)
mapmode.random|🎲 隨機生成（新）|🎲 随机生成（新）|🎲 Random maps|🎲 ランダム生成（新）|🎲 랜덤 생성(신)
mapmode.hint.classic|沿用原本 32 張手工地圖：路線固定、可以記圖，完成度高|沿用原本 32 张手工地图：路线固定、可以记图，完成度高|The original 32 hand-made maps: fixed routes you can memorise|従来の 32 枚の手作りマップ：ルートが固定で覚えやすい|기존 32개 수작업 맵: 경로가 고정되어 외우기 쉬움
mapmode.hint.random|每關重新生成，尺寸照 T1～T5 規則（越後面越大）；同一關重試會沿用同一張|每关重新生成，尺寸照 T1～T5 规则（越后面越大）；同一关重试会沿用同一张|Generated per stage, size follows the T1–T5 rule (later stages are bigger); retrying a stage keeps the same map|ステージごとに生成。サイズは T1～T5 の規則どおり（後のステージほど広い）。同じステージの再挑戦は同じマップ|스테이지마다 새로 생성. 크기는 T1~T5 규칙(뒤로 갈수록 큼). 같은 스테이지 재도전 시 같은 맵
web.tabLogin|登入|登录|Log in|ログイン|로그인
web.tabReg|註冊|注册|Register|新規登録|회원가입
web.tabProv|第三方|第三方|Third-party|外部ログイン|외부 로그인
web.id|帳號（Email 或使用者名稱）|账号（邮箱或用户名）|Account (email or username)|アカウント（メールかユーザー名）|계정(이메일 또는 사용자명)
web.idPh|you@mail.com 或 abc123|you@mail.com 或 abc123|you@mail.com or abc123|you@mail.com か abc123|you@mail.com 또는 abc123
web.pw|密碼|密码|Password|パスワード|비밀번호
web.pw2|再輸入一次密碼|再次输入密码|Repeat password|パスワード（確認）|비밀번호 확인
web.idHint|使用者名稱 3~20 位英數字（可含底線），或直接用 Email|用户名 3~20 位英数字（可含下划线），或直接用邮箱|Username: 3–20 letters/digits (underscore ok), or your email|ユーザー名は英数 3〜20 文字（_ 可）、またはメール|사용자명 3~20자 영숫자(_ 가능) 또는 이메일
web.pwHint|至少 8 位，需包含英文字母與數字|至少 8 位，需包含英文字母和数字|At least 8 characters, with letters and digits|8 文字以上、英字と数字を含む|8자 이상, 영문과 숫자 포함
web.pwShow|顯示密碼|显示密码|Show password|パスワードを表示|비밀번호 표시
web.pwHide|隱藏密碼|隐藏密码|Hide password|パスワードを隠す|비밀번호 숨기기
web.mismatch|兩次輸入的密碼不一樣|两次输入的密码不一样|The two passwords do not match|パスワードが一致しません|비밀번호가 일치하지 않습니다
web.str|強度|强度|Strength|強度|강도
web.str1|弱|弱|Weak|弱い|약함
web.str2|中|中|Medium|普通|보통
web.str3|強|强|Strong|強い|강함
web.doLogin|登入|登录|Log in|ログイン|로그인
web.doReg|註冊並綁定進度|注册并绑定进度|Register & bind progress|登録して進行状況を引き継ぐ|가입하고 진행도 연동
web.regOk|註冊成功！遊客進度已綁定到新帳號|注册成功！游客进度已绑定到新账号|Registered! Guest progress is now bound to this account|登録完了！ゲストの進行状況を引き継ぎました|가입 완료! 게스트 진행도가 연동되었습니다
web.loginOk|登入成功|登录成功|Logged in|ログインしました|로그인되었습니다
web.errTaken|這個帳號已經有人使用了，換一個或直接登入|这个账号已经有人用了，换一个或直接登录|That account is already taken — pick another or just log in|このアカウントは使用済みです。別の名前かログインを|이미 사용 중인 계정입니다. 다른 이름이나 로그인을
web.errBad|帳號或密碼錯誤|账号或密码错误|Wrong account or password|アカウントかパスワードが違います|계정 또는 비밀번호가 틀립니다
web.errLocked|嘗試次數過多，請 {s} 秒後再試|尝试次数过多，请 {s} 秒后再试|Too many attempts, try again in {s}s|試行回数が多すぎます。{s} 秒後にどうぞ|시도가 너무 많습니다. {s}초 후에 다시
web.errBanned|此帳號已被停權，請聯絡客服|此账号已被停权，请联系客服|This account is suspended — please contact support|このアカウントは停止中です。サポートへ|정지된 계정입니다. 고객센터에 문의하세요
web.errPw|密碼至少 8 位，且需包含英文字母與數字|密码至少 8 位，且需包含英文字母和数字|Password must be at least 8 characters with letters and digits|パスワードは 8 文字以上、英字と数字を含めてください|비밀번호는 8자 이상, 영문과 숫자를 포함하세요
web.errId|帳號格式不對：請用 3~20 位英數字，或完整的 Email|账号格式不对：请用 3~20 位英数字，或完整邮箱|Invalid account: use 3–20 letters/digits, or a full email|形式が違います：英数 3〜20 文字、または完全なメール|형식이 올바르지 않습니다: 영숫자 3~20자 또는 이메일
web.errOauth|這個 Email 之前是用 {p} 登入的，請點「第三方」用它登入|这个邮箱之前是用 {p} 登录的，请点「第三方」登录|This email is registered with {p} — use the Third-party tab|このメールは {p} で登録済み。「外部ログイン」からどうぞ|이 이메일은 {p}로 가입되어 있습니다. 외부 로그인을 이용하세요
web.errRate|操作太頻繁，請稍等一下再試|操作太频繁，请稍等一下再试|Too many requests, please wait a moment|操作が多すぎます。少し待ってください|요청이 너무 많습니다. 잠시 후 다시
web.secure|密碼經 scrypt 加鹽雜湊後才儲存，伺服器不保存明文|密码经 scrypt 加盐杂湊后才保存，服务器不存明文|Passwords are salted & hashed with scrypt — never stored in plain text|パスワードは scrypt で加塩ハッシュ化して保存（平文は保持しません）|비밀번호는 scrypt로 솔트 해시되어 저장됩니다(평문 저장 없음)
web.dev|開發者|开发者|Developer|開発者|개발자
web.admin|開發者後台|开发者后台|Admin dashboard|開発者ダッシュボード|개발자 대시보드
web.hasPass|已設定密碼（可用帳密登入）|已设置密码（可用账密登录）|Password set (can log in with it)|パスワード設定済み（ログイン可）|비밀번호 설정됨(로그인 가능)
web.changePw|修改密碼|修改密码|Change password|パスワード変更|비밀번호 변경
web.needFill|請先填好帳號與密碼|请先填好账号与密码|Fill in account and password first|アカウントとパスワードを入力してください|계정과 비밀번호를 입력하세요
web.remId|記住帳號|记住账号|Remember account|アカウントを保存|아이디 저장
web.remPw|記住密碼|记住密码|Remember password|パスワードを保存|비밀번호 저장
web.keep|維持登入（30 天）|保持登录（30 天）|Keep me signed in (30 days)|ログイン状態を維持（30日間）|로그인 유지 (30일)
acct.adminFail|後台開不起來：請確認已用開發者帳號登入|后台打不开：请确认已用开发者账号登录|Dashboard could not open: make sure you are signed in with the developer account|管理画面を開けません：開発者アカウントでログインしているか確認してください|관리 화면을 열 수 없습니다: 개발자 계정으로 로그인했는지 확인하세요
acct.adminErr|後台開啟失敗：|后台开启失败：|Dashboard failed to open: |管理画面の起動に失敗：|관리 화면 열기 실패: 
nick.need|請先輸入你的暱稱（最多 8 字）|请先输入你的昵称（最多 8 字）|Please enter your nickname first (max 8 chars)|ニックネームを入力してください（最大8文字）|닉네임을 먼저 입력하세요 (최대 8자)
nick.auto|🦸 沒填暱稱，先用「{n}」開始（首頁可以再改）|🦸 没填昵称，先用「{n}」开始（首页可以再改）|🦸 No nickname — starting as “{n}” (change it on the home screen)|🦸 ニックネーム未入力。「{n}」で開始します（ホームで変更できます）|🦸 닉네임이 없어 「{n}」로 시작합니다 (홈에서 변경 가능)
webview.banner|💡 偵測到你在通訊軟體的內建瀏覽器開啟，建議用 Chrome 或 Safari 開啟以獲得最佳體驗|💡 检测到你在通讯软件的内置浏览器打开，建议用 Chrome 或 Safari 打开以获得最佳体验|💡 This page is open inside a chat app built-in browser. For the best experience, open it in Chrome or Safari.|💡 チャットアプリ内のブラウザで開いています。最高の体験のため Chrome や Safari で開いてください|💡 채팅 앱 내장 브라우저에서 열려 있습니다. 최상의 경험을 위해 Chrome 또는 Safari에서 여세요
webview.copy|📋 複製網址|📋 复制网址|📋 Copy link|📋 リンクをコピー|📋 링크 복사
webview.open|🌐 在瀏覽器開啟|🌐 在浏览器打开|🌐 Open in browser|🌐 ブラウザで開く|🌐 브라우저에서 열기
webview.copied|已複製網址，請貼到手機瀏覽器開啟|已复制网址，请粘贴到手机浏览器打开|Link copied, paste it into your phone browser to open|リンクをコピーしました。スマホのブラウザに貼り付けて開いてください|링크를 복사했습니다. 휴대폰 브라우저에 붙여넣어 여세요
webview.guide|點右上角選單 ⋯ → 選「在瀏覽器中開啟」|点右上角菜单 ⋯ → 选「在浏览器中打开」|Tap the top-right menu ⋯ → choose "Open in Browser"|右上のメニュー ⋯ → 「ブラウザで開く」を選択|오른쪽 위 메뉴 ⋯ → "브라우저에서 열기" 선택
webview.openLogin|請在 Chrome / Safari 開啟本遊戲後再登入第三方帳號（網址已複製）|请在 Chrome / Safari 打开本游戏后再登录第三方账号（网址已复制）|Open this game in Chrome or Safari first, then sign in with a third party (link copied)|Chrome か Safari で本ゲームを開いてからサードパーティでログインしてください（リンクをコピー済み）|먼저 Chrome 또는 Safari에서 게임을 연 뒤 서드파티로 로그인하세요 (링크 복사됨)
nav.back|上一頁|上一页|Back|戻る|뒤로
nav.music|音樂|音乐|Music|BGM|음악
nav.sfx|音效|音效|SFX|効果音|효과음
nav.full|全視窗|全屏|Fullscreen|全画面|전체화면
nav.fullOn|全視窗 ON|全屏 ON|Fullscreen ON|全画面 ON|전체화면 ON
nav.mail|信箱|邮箱|Mail|メール|메일
nav.lang|語言|语言|Language|言語|언어
nav.langTip|切換顯示語言|切换显示语言|Switch display language|表示言語を切り替え|표시 언어 변경
nav.langTitle|語言|语言|Language|言語|언어
mail.toast|✉️ {addr}　（已複製，可直接貼到信箱）|✉️ {addr}　（已复制，可直接粘贴到邮箱）|✉️ {addr}  (copied — paste it into your mail app)|✉️ {addr}　（コピーしました。メールアプリに貼り付けできます）|✉️ {addr}  (복사됨 — 메일 앱에 붙여넣으세요)
sfx.bgmOn|🎵 主音樂：開|🎵 主音乐：开|🎵 Music: ON|🎵 BGM：ON|🎵 음악: 켜짐
sfx.bgmOff|🎵 主音樂：關|🎵 主音乐：关|🎵 Music: OFF|🎵 BGM：OFF|🎵 음악: 꺼짐
sfx.sfxOn|🔊 音效：開|🔊 音效：开|🔊 Sound: ON|🔊 効果音：ON|🔊 효과음: 켜짐
sfx.sfxOff|🔊 音效：關|🔊 音效：关|🔊 Sound: OFF|🔊 効果音：OFF|🔊 효과음: 꺼짐
lang.saved|🌐 語言已切換：{name}|🌐 语言已切换：{name}|🌐 Language switched to {name}|🌐 言語を切り替えました：{name}|🌐 언어가 변경되었습니다: {name}
title.ver|測試版 v|测试版 v|Beta v|ベータ版 v|베타 v
title.animals|🐰🐻🐶🐱🐷🐼🐸🐥 8 隻動物可選（單人選角處直接挑）|🐰🐻🐶🐱🐷🐼🐸🐥 8 只动物可选（单人选角处直接挑）|🐰🐻🐶🐱🐷🐼🐸🐥 8 animals to choose from (pick one in Solo)|🐰🐻🐶🐱🐷🐼🐸🐥 8 匹の動物から選べます（一人プレイの画面で選択）|🐰🐻🐶🐱🐷🐼🐸🐥 동물 8마리 중 선택 (싱글에서 고르기)
title.gear1|🛼滑冰 🧤搬彈投擲 🥾踢彈 🥊打彈 📁遙控引爆（|🛼滑冰 🧤搬弹投掷 🥾踢弹 🥊打弹 📁遥控引爆（|🛼Skates 🧤Lift&Throw 🥾Kick 🥊Punch 📁Remote Detonate (|🛼スケート 🧤爆弾持ち投げ 🥾キック 🥊パンチ 📁リモコン起爆（|🛼스케이트 🧤들어던지기 🥾킥 🥊펀치 📁원격폭파(
title.gear2|）🧨穿透彈 🦖恐龍蛋 ❤️愛心|）🧨穿透弹 🦖恐龙蛋 ❤️爱心|) 🧨Pierce Bomb 🦖Dino Egg ❤️Heart|）🧨貫通爆弾 🦖恐竜の卵 ❤️ハート|) 🧨관통폭탄 🦖공룡알 ❤️하트
title.hazards|冰原滑行 · 傳送門 · 輸送帶 · 激戰突死縮圈|冰原滑行 · 传送门 · 传送带 · 激战突死缩圈|Ice Sliding · Warp Portal · Conveyor · Sudden-Death Ring|氷の滑走 · ワープ · ベルトコンベア · サドンデス縮小|빙판 슬라이드 · 워프 · 컨베이어 · 서든데스 축소
title.k.move|移動|移动|Move|移動|이동
title.k.bomb|炸彈|炸弹|Bomb|爆弾|폭탄
title.k.det|引爆|引爆|Detonate|起爆|폭파
title.k.fire|恐龍吐火|恐龙吐火|Dino flame|竜の火吹き|공룡 불뿜기
title.k.wasd|WASD|WASD|WASD|WASD|WASD
title.k.arrow|方向鍵|方向键|Arrow Keys|矢印キー|방향키
title.k.space|空白鍵|空格键|Space|スペース|스페이스
title.k.enter|Enter|Enter|Enter|Enter|Enter
title.k.f|F|F|F|F|F
title.k.slash|／|／| / |／| / 
menu.solo|單人闖關|单人闯关|Solo Quest|一人で挑戦|싱글 모험
menu.solo.sub|32 關 · 可調難度|32 张地图 · 难度／无限时间 · 第 32 关魔王|32 maps · difficulty / endless time · boss on stage 32|全 32 ステージ · 難易度／無制限時間 · ボスは 32 面のみ|32개 스테이지 · 난이도／무한 시간 · 32 스테이지 보스
hide.in|🌿 躲起來了 · 對手和小怪看不到你|🌿 躲起来了 · 对手和小怪看不到你|🌿 Hidden — rivals and monsters cannot see you|🌿 隠れた —— 相手もモンスターも見えない|🌿 숨었다 · 상대와 몬스터가 보지 못한다
menu.boss|挑戰 BOSS|挑战 BOSS 👹|Boss Raid 👹|ボス討伐 👹|보스 토벌 👹
menu.boss.sub|單挑暗黑魔王|直接单挑暗黑魔王 · 没有小怪干扰|Face the Dark Demon Lord — no minions|暗黒魔王と一対一 · ザコなし|암흑 마왕과 1:1 · 잡몹 없음
menu.battle|對戰模式|对战（含 AI）|Battle (with AI)|対戦（AI 含む）|대전 (AI 포함)
menu.battle.sub|2～8 人混戰|2～8 人混战 · 可改名 · 没人就 AI 补位|2–8 player melee · rename · AI fills empty slots|2～8 人バトル · 名前変更OK · 空きはAIが補充|2～8인 난투 · 이름 변경 · 빈자리는 AI
menu.team|👥 組隊 對戰|👥 组队 对战|👥 Team Battle|👥 チーム対戦|👥 팀 대전
menu.team.sub|紅／藍／綠／黃 4 隊 · 2～8 人|红／蓝／绿／黄 4 队 · 2～8 人|Red / Blue / Green / Yellow · 2–8 players|赤／青／緑／黄 4 チーム · 2～8 人|빨강／파랑／초록／노랑 4팀 · 2～8인
menu.online|線上配對|在线匹配|Online Match|オンライン対戦|온라인 매치
ui.ach|🏆 成就|🏆 成就|🏆 Achievements|🏆 実績|🏆 업적
ui.achPts|0 分|0 分|0 pts|0 点|0 점
ui.claimAll|💰 一鍵領取|💰 一键领取|💰 Claim all|💰 まとめて受け取る|💰 한 번에 받기
ui.achFoot|完成成就就能領金幣；成就分累積到門檻會自動換頭上的稱號。|完成成就就能领金币；成就分累积到门槛会自动换头上的称号。|Finish achievements to earn coins. Your title above your head upgrades as your achievement score grows.|実績を達成するとコインがもらえます。実績ポイントが一定になると頭上の称号が変わります。|업적을 달성하면 코인을 받습니다. 업적 점수가 쌓이면 머리 위 칭호가 바뀝니다.
ui.rank|📊 排名|📊 排名|📊 Rankings|📊 ランキング|📊 순위
ui.rankSub|各項累積排行榜|各项累积排行榜|All-time and weekly boards|累計ランキング|누적 순위
ui.rankFoot|每週活動榜週一早上 08:00（台灣時間）重置，前 10 名有金幣獎勵。|每周活动榜周一早上 08:00（台湾时间）重置，前 10 名有金币奖励。|The weekly board resets Mondays 08:00 (UTC+8); the top 10 earn coins.|毎週ボードは月曜 08:00（UTC+8）にリセット。上位 10 人にコイン。|주간 보드는 월요일 08:00(UTC+8)에 초기화되며 상위 10명에게 코인을 지급합니다.
ui.online|👥 線上玩家|👥 在线玩家|👥 Players online|👥 オンライン|👥 접속 중
ui.onlineFoot|點一位玩家可以看資料、加好友、私訊或封鎖。|点一位玩家可以看资料、加好友、私信或屏蔽。|Tap a player to view their profile, add a friend, message or block.|プレイヤーを選ぶとプロフィール・フレンド・メッセージ・ブロックができます。|플레이어를 선택하면 프로필, 친구 추가, 메시지, 차단이 가능합니다.
ui.onlineSub|—|—|—|—|—
ui.labAch|成就|成就|Achievements|実績|업적
ui.labRank|排名|排名|Ranking|ランキング|순위
ui.labPlayers|線上玩家|线上玩家|Players|オンライン|접속 중
ui.snNew|有新訊息|有新消息|New message|新着メッセージ|새 메시지
ui.snView|查看 ›|查看 ›|View ›|見る ›|보기 ›
ui.avTitle|📷 設定頭貼|📷 设置头像|📷 Set your photo|📷 アイコン設定|📷 프로필 사진
ui.avPick|📁 選照片|📁 选照片|📁 Choose photo|📁 写真を選ぶ|📁 사진 선택
ui.avApply|✅ 套用|✅ 套用|✅ Apply|✅ 適用|✅ 적용
ui.avDel|🗑 移除|🗑 移除|🗑 Remove|🗑 削除|🗑 삭제
ui.avDrag|拖曳移動 · 拉桿縮放|拖动移动 · 拉杆缩放|Drag to move · slide to zoom|ドラッグで移動・スライダーで拡大|드래그로 이동 · 슬라이더로 확대
menu.online.sub|房號連線 · 朋友同樂|房号连线 · 等待室 · 朋友一起打|Room code · lobby · play with friends|ルーム番号 · 待機室 · 友達と対戦|방 번호 · 대기실 · 친구와 함께
menu.settings|設定|设置|Settings|設定|설정
menu.settings.sub|控制 · 音量 · 語言|地图尺寸 · 控制方式 · 音量|Map size · controls · volume|マップサイズ · 操作 · 音量|맵 크기 · 조작 · 음량
menu.help|遊戲說明|📖 游戏说明|📖 How to Play|📖 遊び方|📖 게임 설명
menu.help.sub|操作 · 道具 · 怪物|操作 · 道具 · 坐骑 · 场景 · 怪物一次看懂|Controls · items · mounts · stages · monsters|操作・アイテム・騎乗・ステージ・モンスター|조작 · 아이템 · 탈것 · 스테이지 · 몬스터
menu.solo.desc|炸開軟磚、殲滅所有敵人，走進傳送門過關（每一關都保證有門）。道具與恐龍會跟著你到下一關，陣亡則重新開始該關。|炸开软砖、歼灭所有敌人，走进传送门过关（每一关都保证有门）。道具与恐龙会跟着你到下一关，阵亡则重新开始该关。|Blast soft bricks, wipe out every enemy and step into the portal to clear the stage (every stage is guaranteed to have one). Items and your dino carry over to the next stage; if you fall, the stage restarts.|軟らかいブロックを壊し、敵を全滅させてワープゲートに入るとクリア（必ずゲートがあります）。アイテムと恐竜は次のステージに持ち越せます。やられたらそのステージの最初から。|부드러운 벽돌을 폭파하고 적을 전멸시킨 뒤 워프 게이트로 들어가면 클리어(모든 스테이지에 게이트가 있습니다). 아이템과 공룡은 다음 스테이지로 이어집니다. 쓰러지면 그 스테이지를 다시 시작합니다.
menu.team.toast|👥 組隊對戰 尚未開放，敬請期待！|👥 组队对战 尚未开放，敬请期待！|👥 Team Battle is not open yet — stay tuned!|👥 チーム対戦はまだ未実装です。お楽しみに！|👥 팀 대전은 아직 미지원입니다. 기대해 주세요!
solo.pickch|選擇角色（8 隻動物，點一下即選；手把可按 A）|选择角色（8 只动物，点一下即选；手柄可按 A）|Choose a character (8 animals, tap to pick; press A on a gamepad)|キャラを選ぶ（8 匹、タップで選択／パッドは A）|캐릭터 선택 (동물 8마리, 탭하면 선택; 패드는 A)
solo.diff|難易度|难度|Difficulty|難易度|난이도
diff.easy|😇 簡單|😇 简单|😇 Easy|😇 かんたん|😇 쉬움
diff.normal|🙂 普通|🙂 普通|🙂 Normal|🙂 ふつう|🙂 보통
diff.hard|😈 困難|😈 困难|😈 Hard|😈 むずかしい|😈 어려움
solo.time|關卡時間|关卡时间|Stage Time|制限時間|스테이지 시간
time.3|3 分|3 分|3 min|3 分|3분
time.5|5 分|5 分|5 min|5 分|5분
time.10|10 分|10 分|10 min|10 分|10분
time.inf|♾️ 無限時間|♾️ 无限时间|♾️ Endless|♾️ 無制限|♾️ 무한
solo.start|▶ 開始遊戲|▶ 开始游戏|▶ Start Game|▶ ゲーム開始|▶ 게임 시작
solo.stage|第 {n} 關 · {name}|第 {n} 关 · {name}|Stage {n} · {name}|第 {n} ステージ · {name}|제 {n} 스테이지 · {name}
solo.gohint|👆 先點上面選關卡，再按這顆大按鈕出發（同一顆按鈕再點一次也會直接出發）|👆 先点上面选关卡，再按这颗大按钮出发（同一颗按钮再点一次也会直接出发）|👆 Tap a stage above first, then press this big button to go (tapping it again also launches)|👆 まず上のステージを選んでから、この大きなボタンで出発（もう一度押しても出発できます）|👆 먼저 위에서 스테이지를 고른 뒤 이 큰 버튼으로 출발 (한 번 더 눌러도 출발)
solo.back|← 回主選單|← 回主菜单|← Main Menu|← メインメニュー|← 메인 메뉴
solo.locked|🔒 尚未解鎖|🔒 尚未解锁|🔒 Locked|🔒 未解放|🔒 잠김
solo.go|▶ 開始遊戲 · 第 {n} 關|▶ 开始游戏 · 第 {n} 关|▶ Start · Stage {n}|▶ 開始 · 第 {n} ステージ|▶ 시작 · 제 {n} 스테이지
solo.lockedhint|先通過前面的關卡才能進來|先通过前面的关卡才能进来|Clear the earlier stages to unlock|前のステージをクリアすると入れます|이전 스테이지를 클리어하면 열립니다
boss.suffix| · 👹 暗黑魔王| · 👹 暗黑魔王| · 👹 Dark Demon Lord| · 👹 暗黒魔王| · 👹 암흑 마왕
char.pick|目前選用：|目前选用：|Now using: |現在の選択：|현재 선택: 
char.using|　—　直接用這隻動物上場，走路、放彈、受傷都會動。|　—　直接用这只动物上场，走路、放弹、受伤都会动。|  —  this animal fights for you: walking, bombing and getting hurt all animate.|　—　この動物がそのまま活躍します。歩き・爆弾・ダメージも動きます。|  —  이 동물이 바로 출전합니다. 걷기·폭탄·피격 모두 움직입니다.
solo.lockToast|🔒 第 {n} 關還沒解鎖，先通過前面的關卡！|🔒 第 {n} 关还没解锁，先通过前面的关卡！|🔒 Stage {n} is still locked — clear the earlier stages first!|🔒 第 {n} ステージはまだ未解放です。先に前のステージをクリアしてください！|🔒 제 {n} 스테이지는 아직 잠겨 있습니다. 먼저 앞 스테이지를 클리어하세요!
solo.ovTitle|第 {n} 關 · {name}|第 {n} 关 · {name}|Stage {n} · {name}|第 {n} ステージ · {name}|제 {n} 스테이지 · {name}
solo.ovBossTitle|👹 BOSS 討伐 · {name}|👹 BOSS 讨伐 · {name}|👹 Boss Raid · {name}|👹 ボス討伐 · {name}|👹 보스 토벌 · {name}
solo.ovBossSub|暗黑魔王就在這裡！沒有小怪干擾，專心轟爆牠！|暗黑魔王就在这里！没有小怪干扰，专心轰爆它！|The Dark Demon Lord is right here! No minions in the way — blast it!|暗黒魔王がここにいます！ザコはいないので、集中して爆破しましょう！|암흑 마왕이 여기 있습니다! 잡몹은 없으니 집중해서 폭파하세요!
solo.ovBossSub2|暗黑魔王在此！用炸彈轟爆牠！|暗黑魔王在此！用炸弹轰爆它！|The Dark Demon Lord awaits! Bomb it to bits!|暗黒魔王登場！爆弾で吹き飛ばせ！|암흑 마왕 등장! 폭탄으로 날려버리세요!
solo.ovSub|殲滅所有敵人後，走進傳送門過關！|歼灭所有敌人后，走进传送门过关！|Wipe out every enemy, then step into the portal to clear the stage!|敵を全滅させたら、ワープゲートに入ってクリア！|적을 전멸시킨 뒤 워프 게이트로 들어가 클리어!
solo.ovTime|\\n難易度：{d}　·　時間：{t}|\\n难度：{d}　·　时间：{t}|\\nDifficulty: {d}  ·  Time: {t}|\\n難易度：{d}　·　時間：{t}|\\n난이도: {d}  ·  시간: {t}
solo.ovGo|出發！|出发！|Go!|出発！|출발!
solo.clearTitle|過關！|过关！|Stage Clear!|ステージクリア！|스테이지 클리어!
solo.clearSub|分數 {s}　·　前進第 {n} 關「{name}」|分数 {s}　·　前进第 {n} 关「{name}」|Score {s}  ·  On to Stage {n} "{name}"|スコア {s}　·　第 {n} ステージ「{name}」へ|점수 {s}  ·  제 {n} 스테이지 "{name}"(으)로
solo.clearBtn|繼續|继续|Continue|次へ|계속
solo.winTitle|通关啦！|通关啦！|You cleared them all!|全ステージ制覇！|모두 클리어!
solo.winSub|你打倒了暗黑魔王，全關卡制霸！|你打倒了暗黑魔王，全关卡制霸！|You defeated the Dark Demon Lord and conquered every stage!|暗黒魔王を倒して、全ステージを制覇しました！|암흑 마왕을 쓰러뜨리고 전 스테이지를 정복했습니다!
solo.bossWinTitle|👹 BOSS 討伐成功！|👹 BOSS 讨伐成功！|👹 Boss Raid Complete!|👹 ボス討伐成功！|👹 보스 토벌 성공!
solo.bossWinSub|你單挑了暗黑魔王！|你单挑了暗黑魔王！|You took on the Dark Demon Lord solo!|暗黒魔王と一騎打ちでした！|암흑 마왕과 단독으로 맞섰습니다!
solo.winScore|\\n分數：{s}|\\n分数：{s}|\\nScore: {s}|\\nスコア：{s}|\\n점수: {s}
solo.diffLabel|\\n難易度：{d}|\\n难度：{d}|\\nDifficulty: {d}|\\n難易度：{d}|\\n난이도: {d}
solo.overTitle|遊戲結束|游戏结束|Game Over|ゲームオーバー|게임 오버
solo.overSub|抵達第 {n} 關　·　分數 {s}|抵达第 {n} 关　·　分数 {s}|Reached Stage {n}  ·  Score {s}|第 {n} ステージ到達　·　スコア {s}|제 {n} 스테이지 도달  ·  점수 {s}
menu.acct|帳號登入|👤 账号登录|👤 Sign in|👤 アカウント|👤 계정 로그인
menu.acct.sub|雲端存檔 · 分享金幣|绑定账号 · 云端存档 · 分享金币|Link account · Cloud save · Share coins|連携 · クラウド保存 · シェアでコイン|계정 연동 · 클라우드 저장 · 공유 코인
menu.quit|離開遊戲|🚪 离开游戏|🚪 Quit game|🚪 ゲームを終了|🚪 게임 종료
menu.quit.sub|存好進度再關|存好进度 · 关掉这个页面|Progress saved · close this page|進行状況を保存して閉じる|진행 상황 저장 후 닫기
quit.title|感謝遊玩！|感谢游玩！|Thanks for playing!|遊んでくれてありがとう！|플레이해 주셔서 감사합니다!
quit.desc|進度已經存在這台裝置上了，下次再來炸一波。|进度已经存在这台设备上了，下次再来炸一波。|Your progress is saved on this device. Come back and blow things up again!|進行状況はこの端末に保存しました。また遊びに来てください。|진행 상황은 이 기기에 저장했어요. 다음에 또 놀러 오세요.
quit.back|↩ 回到遊戲|↩ 回到游戏|↩ Back to game|↩ ゲームに戻る|↩ 게임으로 돌아가기
quit.close|🚪 關閉頁面|🚪 关闭页面|🚪 Close page|🚪 ページを閉じる|🚪 페이지 닫기
quit.tip|手機：按右上角 ⨯ 或返回鍵　·　電腦：Ctrl／⌘ + W|手机：按右上角 ⨯ 或返回键　·　电脑：Ctrl／⌘ + W|Phone: tap ⨯ at the top-right or the Back key · Desktop: Ctrl/⌘ + W|スマホ：右上の ⨯ か戻るキー　·　PC：Ctrl／⌘ + W|휴대폰: 오른쪽 위 ⨯ 또는 뒤로 가기　·　PC: Ctrl／⌘ + W
solo.doorTip.t|敵人清光了！|敌人清光了！|All enemies cleared!|敵を全滅！|적을 모두 처치!
solo.doorTip.s|炸開剩下的軟磚，找出藏起來的傳送門|炸开剩下的软砖，找出藏起来的传送门|Blast the remaining bricks to reveal the hidden portal|残ったブロックを壊して、隠されたゲートを探そう|남은 벽돌을 부숴 숨겨진 포털을 찾으세요
solo.doorTip.go|傳送門就在地圖上，走進去前往下一關|传送门就在地图上，走进去前往下一关|The portal is on the map — step in to reach the next stage|ゲートはマップ上にあります。入って次のステージへ|포털이 맵에 나타났습니다. 들어가면 다음 스테이지로
solo.doorHint|敵人清光了！炸開剩下的軟磚找出傳送門 🚪|敌人清光了！炸开剩下的软砖找出传送门 🚪|All enemies down! Blast the remaining soft bricks to find the portal 🚪|敵を全滅！残りの軟らかいブロックを壊してゲート 🚪 を探そう|적 전멸! 남은 벽돌을 폭파해 게이트 🚪 를 찾으세요
solo.doorOpen|✦ 出口出現了！走進傳送門前往下一關|✦ 出口出现了！走进传送门前往下一关|✦ An exit appeared! Step into the portal for the next stage|✦ 出口が出現！ワープゲートに入って次のステージへ|✦ 출구가 나타났습니다! 워프 게이트로 다음 스테이지로
solo.doorBanner|出口開啟|出口开启|Exit Open|出口オープン|출구 열림
bt.title|對戰|对战|Battle|対戦|대전
bt.nopad1|🔥 沒有手把也能打！每個槽位都能|🔥 没有手柄也能打！每个槽位都能|🔥 No gamepad needed! Every slot lets you|🔥 パッドがなくても遊べる！各スロットで|🔥 패드 없이도 가능! 각 슬롯에서
bt.nopad2|點 🤖 切換人類／AI|点 🤖 切换人类／AI|tap 🤖 to switch Human / AI|🤖 をタップして人間／AI を切替|🤖 을 탭해 사람／AI 전환
bt.nopad3|——直接按「開戰」就是|——直接按「开战」就是|— just hit "Fight" for a straight|——「対戦開始」を押せばすぐ|——"대전 시작"만 누르면 바로
bt.nopad4|4 人混戰|4 人混战|4-player melee|4 人バトル|4인 난투
bt.nopad5|。手把按 A 可隨時取代 AI。|。手柄按 A 可随时取代 AI。|. Press A on a gamepad any time to take over an AI.|。パッドの A でいつでも AI を交代できます。|. 패드 A 로 언제든 AI를 대신할 수 있습니다.
bt.slots|玩家（每格都能 ◀ ▶ 換角色）|玩家（每格都能 ◀ ▶ 换角色）|Players (each slot can ◀ ▶ swap character)|プレイヤー（各枠で ◀ ▶ キャラ変更）|플레이어 (각 칸에서 ◀ ▶ 캐릭터 변경)
bt.count|對戰人數|对战人数|Player Count|対戦人数|대전 인원
bt.n4|4 人|4 人|4 players|4 人|4인
bt.n8|8 人|8 人|8 players|8 人|8인
bt.aifill|沒人加入的位子由 🤖 AI 補滿。|没人加入的位子由 🤖 AI 补满。|Empty slots are filled by 🤖 AI.|誰も入らない枠は 🤖 AI が埋めます。|참여하지 않은 자리는 🤖 AI가 채웁니다.
bt.size|地圖尺寸|地图尺寸|Map Size|マップサイズ|맵 크기
size.s|小|小|S|小|소
size.m|中|中|M|中|중
size.l|大|大|L|大|대
size.xl|超大 21×15|超大 21×15|XL 21×15|特大 21×15|특대 21×15
bt.wins|勝場數|胜场数|Wins Needed|勝利数|승리 횟수
bt.matchtime|比賽時間（時間到突死縮圈）|比赛时间（时间到突死缩圈）|Match Time (sudden death when it runs out)|試合時間（時間切れでサドンデス）|경기 시간 (시간 종료 시 서든데스)
bt.hazard|地形機關|地形机关|Field Hazards|地形ギミック|지형 기믹
bt.hazardOn|開|开|On|ON|켬
bt.hazardOff|關|关|Off|OFF|끔
bt.sd|突死縮圈（時間到外圈落石）|突死缩圈（时间到外圈落石）|Sudden Death (rocks fall on the outer ring)|サドンデス（時間切れで外周に落石）|서든데스 (시간 종료 시 외곽 낙석)
bt.revenge|復仇推車（淘汰後坐推車場外丟彈）|复仇推车（淘汰后坐推车场外丢弹）|Revenge Cart (toss bombs from outside after elimination)|復讐カート（敗退後は場外から爆弾を投げる）|복수 카트 (탈락 후 외곽에서 폭탄 투척)
bt.off|關閉|关闭|Off|OFF|끄기
bt.on|開啟|开启|On|ON|켜기
bt.super|超級復活|超级复活|Super Revive|超復活|슈퍼 부활
bt.ai|🤖 AI 難度|🤖 AI 难度|🤖 AI Level|🤖 AI レベル|🤖 AI 난이도
ai.weak|😴 弱|😴 弱|😴 Weak|😴 弱い|😴 약함
ai.mid|🙂 中|🙂 中|🙂 Medium|🙂 中|🙂 중간
ai.strong|😈 強|😈 强|😈 Strong|😈 強い|😈 강함
bt.go|開戰！|开战！|Fight!|対戦開始！|대전 시작!
bt.sizeNote|單人闖關同樣使用「地圖尺寸」設定，地圖越大敵人越多。|单人闯关同样使用「地图尺寸」设置，地图越大敌人越多。|Solo Quest uses the same "Map Size" setting — bigger map, more enemies.|一人で挑戦でも同じ「マップサイズ」設定を使います。大きいほど敵が増えます。|싱글 모험도 같은 "맵 크기" 설정을 사용합니다. 클수록 적이 많아집니다.
bt.sizeGlobal|地圖尺寸（全域）|地图尺寸（全域）|Map Size (global)|マップサイズ（共通）|맵 크기 (전역)
bt.countHint|本局 <b>{n}</b> 人混戰 · 沒人加入的位子由 🤖 AI 補滿|本局 <b>{n}</b> 人混战 · 没人加入的位子由 🤖 AI 补满|This match: <b>{n}</b>-player melee · empty slots filled by 🤖 AI|今回は <b>{n}</b> 人バトル · 空き枠は 🤖 AI が埋めます|이번 판: <b>{n}</b>인 난투 · 빈자리는 🤖 AI가 채웁니다
bt.teams|組隊對戰（隊數 2～4，同隊不會互炸）|组队对战（队数 2～4，同队不会互炸）|Team Battle (2–4 teams, no friendly fire)|チーム戦（2～4チーム・同士討ちなし）|팀 대전 (2～4팀, 같은 팀끼리 안 터짐)
bt.teamsHint|同隊的炸彈與火焰不會傷到自己人；點每一格的隊徽可以自己換隊。|同队的炸弹与火焰不会伤到自己人；点每一格的队徽可以自己换队。|Teammates take no damage from your bombs or flames. Tap a slot's badge to switch its team.|同じチームの爆弾と炎では味方は傷つきません。各枠のバッジを押すとチームを変えられます。|같은 팀의 폭탄과 불꽃에는 아군이 다치지 않습니다. 칸의 배지를 누르면 팀을 바꿀 수 있습니다.
bt.kb1|鍵盤 1（WASD + 空白鍵）|键盘 1（WASD + 空格键）|Keyboard 1 (WASD + Space)|キーボード 1（WASD + スペース）|키보드 1 (WASD + 스페이스)
bt.kb2|鍵盤 2（方向鍵 + Enter）· 預設 AI|键盘 2（方向键 + Enter）· 默认 AI|Keyboard 2 (Arrows + Enter) · AI by default|キーボード 2（矢印 + Enter）· 初期は AI|키보드 2 (방향키 + Enter) · 기본 AI
bt.padJoin|手把 {n} · 按 A 加入|手柄 {n} · 按 A 加入|Pad {n} · press A to join|パッド {n} · A で参加|패드 {n} · A 로 참여
bt.padPlay|AI 電腦對打 · 手把按 A 可取代|AI 电脑对打 · 手柄按 A 可取代|AI opponent · press A on a pad to take over|AI と対戦 · パッドの A で交代|AI 대전 · 패드 A 로 대체 가능
bt.aiHosted|🤖 AI 託管中（點 🤖 改回人類）|🤖 AI 托管中（点 🤖 改回人类）|🤖 Run by AI (tap 🤖 to make it human)|🤖 AI が操作中（🤖 タップで人間に戻す）|🤖 AI 조작 중 (🤖 탭으로 사람으로)
bt.startOv|對戰開始！|对战开始！|Battle Start!|対戦開始！|대전 시작!
bt.startSub|先拿 {n} 勝的人獲勝\\n沒人類的槽位由 🤖 AI 託管 · 踢彈・投彈・打彈・遙控（E 引爆）・恐龍吐火（F） · 活用自己的裝備|先拿 {n} 胜的人获胜\\n没人类的槽位由 🤖 AI 托管 · 踢弹・投弹・打弹・遥控（E 引爆）・恐龙吐火（F） · 活用自己的装备|First to {n} wins takes it\\nEmpty slots run on 🤖 AI · Kick · Throw · Punch · Remote (E) · Dino Flame (F) · use your gear|先に {n} 勝した人が優勝\\n空き枠は 🤖 AI が操作 · キック・投げ・パンチ・リモコン（E）・恐竜の炎（F） · 装備を活かそう|먼저 {n}승한 사람이 우승\\n빈 슬롯은 🤖 AI가 조작 · 킥·투척·펀치·원격(E)·공룡 화염(F) · 장비를 활용하세요
bt.startBtn|開戰！|开战！|Fight!|対戦開始！|대전 시작!
bt.win|{n} 獲勝！|{n} 获胜！|{n} wins!|{n} の勝ち！|{n} 승리!
bt.draw|平手！|平手！|Draw!|引き分け！|무승부!
bt.suddenToast|⏰ 突死開始——復仇推車強制撤離！|⏰ 突死开始——复仇推车强制撤离！|⏰ Sudden Death — the Revenge Cart pulls out!|⏰ サドンデス開始——復讐カートが強制退去！|⏰ 서든데스 시작——복수 카트 강제 철수!
bt.cart|{n} 上復仇推車！（沿軌移動 · 按住動作鍵集氣拋彈：綠1格／黃2格／紅3格）|{n} 上复仇推车！（沿轨移动 · 按住动作键集气抛弹：绿1格／黄2格／红3格）|{n} is on the Revenge Cart! (moves along the rail · hold the action button to charge: green 1 / yellow 2 / red 3)|{n} が復讐カートに！（レール移動 · アクション長押しで溜め：緑1／黄2／赤3）|{n} 이(가) 복수 카트에 탑승! (레일 이동 · 액션 버튼 홀드로 충전: 초록1／노랑2／빨강3)
bt.revive|{n} 復活殺回戰場！|{n} 复活杀回战场！|{n} revived and is back in the fight!|{n} が復活して戦線復帰！|{n} 이(가) 부활해 전장 복귀!
bt.charge|💪 按住放彈鍵：輕點＝第 1 格、按住一下＝第 2 格、按久一點＝第 3 格（到頂就鎖住）|💪 按住放弹键集气：绿＝第 1 格、黄＝第 2 格、红＝第 3 格|💪 Hold the bomb button to charge: green = 1st tile, yellow = 2nd, red = 3rd|💪 爆弾ボタン長押しで溜め：緑＝1 マス、黄＝2 マス、赤＝3 マス|💪 폭탄 버튼 홀드로 충전: 초록=1칸, 노랑=2칸, 빨강=3칸
bt.crown|{n} 奪冠！|{n} 夺冠！|{n} takes the crown!|{n} 優勝！|{n} 우승!
bt.score|比分：|比分：|Score: |スコア：|점수: 
set.ctrl|控制模式|控制模式|Control Mode|操作モード|조작 모드
ctrl.auto|自動|自动|Auto|自動|자동
ctrl.kb|鍵盤|键盘|Keyboard|キーボード|키보드
ctrl.pad|手把|手柄|Gamepad|パッド|패드
ctrl.touch|手機觸控|手机触控|Touch|タッチ|터치
set.keybind|鍵盤按鍵（點按鈕 → 再按你要的鍵）|键盘按键（点按钮 → 再按你要的键）|Key bindings (tap a button → press the key you want)|キー設定（ボタンを押してから使いたいキーを押す）|키 설정 (버튼을 누른 뒤 원하는 키 입력)
set.p1|玩家 1（WASD）|玩家 1（WASD）|Player 1 (WASD)|プレイヤー 1（WASD）|플레이어 1 (WASD)
set.p2|玩家 2（方向鍵）|玩家 2（方向键）|Player 2 (Arrow keys)|プレイヤー 2（矢印キー）|플레이어 2 (방향키)
set.reset|回復預設|恢复默认|Reset to defaults|初期値に戻す|기본값 복원
set.cancel|取消設定|取消设置|Cancel|設定を中止|설정 취소
set.escNote|按 ESC 可取消。兩人用同一顆鍵會同時動作，請分開設定。|按 ESC 可取消。两人用同一颗键会同时动作，请分开设定。|Press ESC to cancel. If both players share a key they act together — set them apart.|ESC で中止できます。2 人が同じキーを使うと同時に動くので、分けて設定してください。|ESC 로 취소할 수 있습니다. 두 사람이 같은 키를 쓰면 함께 움직이므로 따로 설정하세요.
set.tpad|手機觸控按鈕調整|手机触控按钮调整|Touch button tuning|タッチボタン調整|터치 버튼 조정
set.sideL|方向鍵在左|方向键在左|D-pad on left|方向キーは左|방향키 왼쪽
set.sideR|方向鍵在右|方向键在右|D-pad on right|方向キーは右|방향키 오른쪽
set.actR|放彈鍵在右|放弹键在右|Bomb button on right|爆弾ボタンは右|폭탄 버튼 오른쪽
set.actL|放彈鍵在左|放弹键在左|Bomb button on left|爆弾ボタンは左|폭탄 버튼 왼쪽
set.psize|觸控按鈕大小|触控按钮大小|Button size|ボタンサイズ|버튼 크기
sz.small|小|小|S|小|작게
sz.mid|中|中|M|中|중간
sz.big|大|大|L|大|크게
set.sideShortL|在左|在左|Left|左|왼쪽
set.sideShortR|在右|在右|Right|右|오른쪽
set.padSide|觸控搖桿位置|触控摇杆位置|Stick position|スティック位置|스틱 위치
set.actSide|放彈鍵位置|放弹键位置|Bomb button side|爆弾ボタン位置|폭탄 버튼 위치
set.bgm|音樂音量|音乐音量|Music volume|BGM 音量|음악 음량
set.sfx|音效音量|音效音量|Sound volume|効果音 音量|효과음 음량
set.off|關|关|Off|OFF|끔
ctrl.touchHint|目前：<b>手機觸控</b>——虛擬搖桿 ＋ 💥放彈鍵（🧨 遙控引爆、🔥 吐火）。|目前：<b>手机触控</b>——虚拟摇杆 ＋ 💥放弹键（🧨 遥控引爆、🔥 吐火）。|Now: <b>Touch</b> — virtual stick + 💥 bomb button (🧨 remote, 🔥 flame).|現在：<b>タッチ</b>——仮想スティック ＋ 💥爆弾ボタン（🧨 リモコン起爆、🔥 炎）。|현재: <b>터치</b> — 가상 스틱 + 💥폭탄 버튼 (🧨 원격폭파, 🔥 화염).
ctrl.padHint|目前：<b>手把</b>——{name}（A 放彈、X 引爆、Y 吐火、Start 暫停）。|目前：<b>手柄</b>——{name}（A 放弹、X 引爆、Y 吐火、Start 暂停）。|Now: <b>Gamepad</b> — {name} (A bomb, X detonate, Y flame, Start pause).|現在：<b>パッド</b>——{name}（A 爆弾、X 起爆、Y 炎、Start 一時停止）。|현재: <b>패드</b> — {name} (A 폭탄, X 폭파, Y 화염, Start 일시정지).
ctrl.padNone|已偵測到手把|已侦测到手柄|Pad detected|パッドを検出|패드 감지됨
ctrl.kbHint|目前：<b>鍵盤</b>——{auto}WASD／方向鍵移動、空白鍵放彈、E 引爆、F 吐火。|目前：<b>键盘</b>——{auto}WASD／方向键移动、空格键放弹、E 引爆、F 吐火。|Now: <b>Keyboard</b> — {auto}WASD / Arrows to move, Space to bomb, E to detonate, F for flame.|現在：<b>キーボード</b>——{auto}WASD／矢印で移動、スペースで爆弾、E で起爆、F で炎。|현재: <b>키보드</b> — {auto}WASD／방향키 이동, 스페이스 폭탄, E 폭파, F 화염.
ctrl.autoTag|（自動偵測）|（自动侦测）|(auto-detect)|（自動検出）|(자동 감지)
ctrl.switch|已自動切換操作：{m}|已自动切换操作：{m}|Auto-switched controls: {m}|操作を自動切替：{m}|조작이 자동 전환됨: {m}
ol.qnote1|⚡ 快速配對會自動加入「人最多、最快開打」的房間（沒有房間就自動幫你建立）。也可以從房間列表點加入，或建立房間拿到|⚡ 快速匹配会自动加入「人最多、最快开打」的房间（没有房间就自动帮你建立）。也可以从房间列表点加入，或建立房间拿到|⚡ Quick Match drops you into the fullest, fastest room (one is created if none exist). You can also join from the room list, or create a room and share the|⚡ クイックマッチは「一番人が多くて早く始まる」部屋に自動参加（部屋がなければ自動作成）。一覧から参加するか、部屋を作って|⚡ 빠른 매치는 "사람이 가장 많고 빨리 시작되는" 방에 자동 참여합니다(없으면 자동 생성). 목록에서 참여하거나 방을 만들어
ol.room4|4 位數房號|4 位房号|4-digit code|4 桁の番号|4자리 번호
ol.qnote2|給朋友。沒入場的位子由 🤖 AI 補滿。|给朋友。没入场的位子由 🤖 AI 补满。|with a friend. Empty slots are filled by 🤖 AI.|を友達に教えてください。空き枠は 🤖 AI が埋めます。|를 친구에게 알려주세요. 빈자리는 🤖 AI가 채웁니다.
ol.nick|你的暱稱|你的昵称|Your nickname|ニックネーム|닉네임
ol.play|開始玩（最快 → 隨機配對）|开始玩（最快 → 随机匹配）|Play now (fastest → random match)|いますぐ遊ぶ（最速 → ランダム対戦）|바로 시작 (가장 빠름 → 랜덤 매치)
ol.quick|⚡ 快速配對|⚡ 快速匹配|⚡ Quick Match|⚡ クイックマッチ|⚡ 빠른 매치
ol.create|建立房間|建立房间|Create Room|部屋を作る|방 만들기
ol.joinPh|輸入 4 位數房號加入|输入 4 位房号加入|Enter the 4-digit code|4 桁の番号を入力|4자리 번호 입력
ol.join|加入房間|加入房间|Join Room|部屋に入る|방 참여
ol.rooms|配對中的房間（點房號直接加入）|匹配中的房间（点房号直接加入）|Rooms matching now (tap a code to join)|募集中の部屋（番号タップで参加）|매치 중인 방 (번호 탭으로 참여)
ol.loading|讀取中…|读取中…|Loading…|読み込み中…|불러오는 중…
ol.roomno|房號（給朋友輸入）|房号（给朋友输入）|Room code (for a friend)|部屋番号（友達が入力）|방 번호 (친구가 입력)
ol.count|對戰人數（房主設定）|对战人数（房主设置）|Player count (set by host)|対戦人数（ホストが設定）|대전 인원 (호스트 설정)
ol.wait|等待室（等人進遊戲才能一起玩）|等待室（等人进游戏才能一起玩）|Lobby (wait for others before playing together)|待機室（みんなが揃うと遊べます）|대기실 (모두 모여야 함께 플레이)
ol.start|開始遊戲|开始游戏|Start Game|ゲーム開始|게임 시작
ol.leave|離開房間|离开房间|Leave Room|部屋を出る|방 나가기
ol.netStart|🌐 線上對戰開始（{h} 位玩家 + {a} 位 AI）|🌐 在线对战开始（{h} 位玩家 + {a} 位 AI）|🌐 Online match started ({h} players + {a} AI)|🌐 オンライン対戦開始（プレイヤー {h} 人 + AI {a} 人）|🌐 온라인 대전 시작 (플레이어 {h}명 + AI {a}명)
ol.watching|👁 觀戰中（本局你沒有入場）|👁 观战中（本局你没有入场）|👁 Spectating (you are not in this match)|👁 観戦中（この試合には不参加）|👁 관전 중 (이번 판 미참가)
hud.esc|⏸ ESC|⏸ ESC|⏸ ESC|⏸ ESC|⏸ ESC
badge.me|我|我|ME|自分|나
pause.title|⏸ 遊戲暫停|⏸ 游戏暂停|⏸ Paused|⏸ 一時停止|⏸ 일시정지
pause.resume|▶ 繼續遊戲|▶ 继续游戏|▶ Resume|▶ 続ける|▶ 계속하기
pause.restart|🔄 重新開始|🔄 重新开始|🔄 Restart|🔄 やり直す|🔄 다시 시작
pause.settings|⚙️ 設定|⚙️ 设置|⚙️ Settings|⚙️ 設定|⚙️ 설정
pause.stages|📋 回關卡清單|📋 回关卡清单|📋 Stage List|📋 ステージ一覧へ|📋 스테이지 목록
pause.home|🏠 回首頁|🏠 回首页|🏠 Home|🏠 ホーム|🏠 홈
pause.note|這裡的設定跟首頁「設定」完全一樣，改了馬上生效，不用重開。|这里的设置跟首页「设置」完全一样，改了马上生效，不用重开。|Same settings as the home screen — changes apply instantly, no restart needed.|ここでの設定はホーム画面の「設定」と同じです。すぐ反映され、再起動は不要です。|여기 설정은 홈 화면의 "설정"과 동일합니다. 즉시 적용되며 재시작이 필요 없습니다.
over.again|再來一場|再来一场|Play Again|もう一度|한 판 더
over.home|回主選單|回主菜单|Main Menu|メインメニュー|메인 메뉴
rot.title|橫著玩更過癮|横着玩更过瘾|Landscape plays better|横向きの方が快適|가로로 하면 더 재미있어요
rot.body1|把手機轉成|把手机转成|Turn your phone to|スマホを|휴대폰을
rot.body2|橫式|横屏|landscape|横向き|가로
rot.body3|，地圖更大、按鍵更好按。|，地图更大、按键更好按。| for a bigger map and easier buttons.|にすると、マップが大きくボタンも押しやすいです。|로 돌리면 맵이 크고 버튼도 누르기 쉽습니다.
rot.body4|（不想轉也沒關係，直式一樣能玩）|（不想转也没关系，竖屏一样能玩）|(Portrait works fine too, if you prefer)|（縦のままでも遊べます）|(세로로도 그냥 플레이할 수 있어요)
rot.ok|📝 直式繼續玩|📝 竖屏继续玩|📝 Keep playing in portrait|📝 縦のまま続ける|📝 세로로 계속하기
guest.title|⏸ 選單|⏸ 菜单|⏸ Menu|⏸ メニュー|⏸ 메뉴
guest.body|線上對戰由房主的裝置持續進行，你在這裡不會影響其他人。|在线对战由房主的设备持续进行，你在这里不会影响其他人。|The online match runs on the host device — you will not affect the others here.|オンライン対戦はホストの端末で進行します。ここでの操作は他の人に影響しません。|온라인 대전은 호스트 기기에서 진행됩니다. 여기서 조작해도 다른 사람에게 영향이 없습니다.
guest.resume|▶ 繼續|▶ 继续|▶ Resume|▶ 続ける|▶ 계속
toast.dizzy|{n} 被炸彈砸到了！😵 定住 {s} 秒|{n} 被炸弹砸到了！😵 定住 {s} 秒|{n} got hit by a bomb! 😵 Stunned for {s}s|{n} は爆弾に当たった！😵 {s} 秒動けない|{n} 이(가) 폭탄에 맞았습니다! 😵 {s}초 동안 굳음
toast.glove|🧤 撿起炸彈！再按一次動作鍵投擲（可越牆）|🧤 捡起炸弹！再按一次动作键投掷（可越墙）|🧤 Bomb picked up! Press the action key again to throw it (over walls)|🧤 爆弾を持ち上げた！もう一度アクションキーで投げる（壁越しOK）|🧤 폭탄을 들었다! 액션 키를 한 번 더 눌러 던지기 (벽 너머로)
skull.slow|移動超慢|移动超慢|Crawling slow|超ノロマ|엄청 느림
skull.rapid|狂放炸彈|狂放炸弹|Bomb spam|爆弾連発|폭탄 난사
skull.mini|火焰變小|火焰变小|Tiny flames|炎が小さい|화염 축소
skull.reverse|操作相反|操作相反|Reversed controls|操作反転|조작 반전
toast.skull|💀 {s}！|💀 {s}！|💀 {s}!|💀 {s}！|💀 {s}!
toast.redDino|🔥 進化成紅龍！吐火一次燒上下左右各 2 格（被炸一下龍還是會不見）|🔥 进化成红龙！吐火一次烧上下左右各 2 格（被炸一下龙还是会不见）|🔥 Evolved into a Red Dragon! One breath burns 2 tiles in every direction (one hit and the dragon is gone)|🔥 赤竜に進化！炎は上下左右 2 マスを焼く（一度爆撃されると竜は消える）|🔥 붉은 용으로 진화! 상하좌우 2칸을 태웁니다 (한 번 폭격당하면 용은 사라짐)
toast.redDinoBanner|紅龍來啦！|红龙来啦！|Red Dragon!|赤竜だ！|붉은 용이다!
toast.dino|🦖 孵出恐龍並騎上！多擋一次傷害 · 按 F／🔥 吐火 2 格（冷卻 3 秒）|🦖 孵出恐龙并骑上！多挡一次伤害 · 按 F／🔥 吐火 2 格（冷却 3 秒）|🦖 A dino hatched and you are riding it! Blocks one hit · press F / 🔥 for a 2-tile flame (3s cooldown)|🦖 恐竜が孵って騎乗！ダメージを 1 回防ぐ · F／🔥 で 2 マス炎（クール 3 秒）|🦖 공룡이 부화해 탑승! 피해 1회 방어 · F／🔥 로 2칸 화염 (쿨타임 3초)
toast.dinoBanner|衝啊！|冲啊！|Charge!|突撃！|돌격!
toast.ostrich|🪶 紫蛋孵出鴕鳥神獸！移動 1.45 倍速 · 按 F／🦶 跳躍（跨一格牆、落地震波）|🪶 紫蛋孵出鸵鸟神兽！移动 1.45 倍速 · 按 F／🦶 跳跃（跨一格墙、落地震波）|🪶 A purple egg hatched the Wind Ostrich! 1.45× speed · press F / 🦶 to leap (clears one wall, shockwave on landing)|🪶 紫の卵から風のダチョウが孵化！移動 1.45 倍 · F／🦶 でジャンプ（壁 1 枚を飛び越え、着地で衝撃波）|🪶 보라 알에서 바람 타조 부화! 이동 1.45배 · F／🦶 점프 (벽 1칸 넘고 착지 충격파)
toast.ostrichBanner|神獸降臨！|神兽降临！|Beast!|神獣！|신수!
mount.jump|跳！|跳！|LEAP!|跳！|점프!
mount.cd|跳 {n}s|跳 {n}s|LEAP {n}s|跳 {n}s|점프 {n}s
mount.dive|俯衝！|俯冲！|DIVE!|急降下！|급강하!
toast.storm|⚡ 風暴鴕鳥！1.62 倍速 · 跳 3 格 · 落地 5×5 震波可震碎軟磚 · 空中再按一次＝俯衝|⚡ 风暴鸵鸟！1.62 倍速 · 跳 3 格 · 落地 5×5 震波可震碎软砖 · 空中再按一次＝俯冲|⚡ Storm Ostrich! 1.62× speed · 3-tile leap · 5×5 landing shockwave shatters soft blocks · press again mid-air to dive|⚡ 嵐のダチョウ！1.62 倍速 · 3 マス跳躍 · 着地 5×5 衝撃波で軟らかい壁を破壊 · 空中でもう一度で急降下|⚡ 폭풍 타조! 1.62배속 · 3칸 점프 · 착지 5×5 충격파로 약한 벽 파괴 · 공중에서 한 번 더 = 급강하
toast.stormBanner|⚡ 風暴鴕鳥！|⚡ 风暴鸵鸟！|⚡ STORM OSTRICH!|⚡ 嵐のダチョウ！|⚡ 폭풍 타조!
mount.jumpFire|恐龍吐火|恐龙吐火|Dragon flame|竜の火吹き|용 화염
toast.dinoGuard|恐龍幫我擋了一下！|恐龙帮我挡了一下！|The dino took the hit for you!|恐竜が身代わりになってくれた！|공룡이 대신 맞아주었다!
toast.fire1|紅龍吐火 |红龙吐火 |Dragon breath |赤竜の炎 |용의 화염 
toast.fire2|紅龍吐火 OK（四方向）|红龙吐火 OK（四方向）|Dragon breath OK (4 ways)|赤竜の炎 OK（四方向）|용의 화염 OK (4방향)
toast.fire3|吐火 |吐火 |Flame |炎 |화염 
toast.fire4|吐火 OK|吐火 OK|Flame OK|炎 OK|화염 OK
cell.1|第 1 格|第 1 格|1st tile|1 マス目|1번 칸
cell.2|第 2 格|第 2 格|2nd tile|2 マス目|2번 칸
cell.3|第 3 格|第 3 格|3rd tile|3 マス目|3번 칸
dead.1|哎呀！糟糕糟糕！！|哎呀！糟糕糟糕！！|Oops! This is bad!!|うわ！やばいやばい！！|앗, 큰일났다!!
dead.2|可惡..我下次一定會贏...！|可恶..我下次一定会赢...！|Darn it.. I will win next time...!|くそっ..今度こそ勝つ...！|젠장..다음엔 꼭 이긴다...!
dead.3|天啊！不～！|天啊！不～！|Oh no! Not aga-in~!|うわあ！やだ～！|말도 안 돼! 안~!
kill.1|哈哈！你還得加把勁！|哈哈！你还得加把劲！|Haha! You gotta try harder!|ははっ！まだまだだね！|하하! 아직 멀었어!
kill.2|還是我厲害！|还是我厉害！|I am still the best!|まだ俺の方が上だ！|역시 내가 위야!
kill.3|我的炸彈好吃嗎？|我的炸弹好吃吗？|Like my bombs?|俺の爆弾はどうだ？|내 폭탄 맛이 어때?
item.fire.name|火力|火力|Fire|火力|화력
item.fire.hint|火焰變大|火焰变大|Bigger flames|炎が大きくなる|화염이 커짐
item.bomb.name|炸彈|炸弹|Bomb|爆弾|폭탄
item.bomb.hint|可以放更多炸彈|可以放更多炸弹|Carry more bombs|爆弾を多く置ける|폭탄을 더 많이 설치
item.speed.name|滑冰鞋|滑冰鞋|Skates|スケート|스케이트
item.speed.hint|移動變快|移动变快|Move faster|移動が速くなる|이동 속도 증가
item.kick.name|踢彈鞋|踢弹鞋|Kick Boots|キックブーツ|킥 부츠
item.kick.hint|走向炸彈會把它踢走|走向炸弹会把它踢走|Walk into a bomb to kick it away|爆弾に体当たりで蹴り飛ばす|폭탄에 몸을 부딪쳐 차버림
item.glove.name|搬彈手套|搬弹手套|Lift Glove|持ち上げグローブ|들기 장갑
item.glove.hint|按動作鍵撿炸彈，再按一次丟出去（可越牆）|按动作键捡炸弹，再按一次丢出去（可越墙）|Press the action key to pick a bomb up, press again to throw (over walls)|アクションキーで爆弾を持ち、もう一度押すと投げる（壁越しOK）|액션 키로 폭탄을 들고 한 번 더 눌러 던짐 (벽 너머로)
item.punch.name|打彈拳擊|打弹拳击|Punch Glove|パンチグローブ|펀치 장갑
item.punch.hint|走向炸彈會把它打到地圖另一端|走向炸弹会把它打到地图另一端|Walk into a bomb to punch it to the far side|爆弾に体当たりで反対側へ吹き飛ばす|폭탄에 몸을 부딪쳐 반대편으로 날림
item.remote.name|遙控器|遥控器|Remote|リモコン|리모컨
item.remote.hint|炸彈不會自己爆，按 E 鍵引爆（炸彈上限 +1，可以同時放好幾發）|炸弹不会自己炸，按 E 键引爆（炸弹上限 +1，可以同时放好几发）|Bombs will not self-detonate — press E (bomb cap +1, so you can stack several)|爆弾は自然に爆発しない。E で起爆（上限 +1、複数同時に置ける）|폭탄이 저절로 터지지 않음 — E 로 폭파 (상한 +1, 여러 발 동시 설치 가능)
item.pierce.name|穿透彈|穿透弹|Pierce Bomb|貫通爆弾|관통 폭탄
item.pierce.hint|火焰可以穿透軟磚|火焰可以穿透软砖|Flames pierce soft bricks|炎が軟らかいブロックを貫通|화염이 부드러운 벽돌을 관통
item.heart.name|愛心|爱心|Heart|ハート|하트
item.heart.hint|生命 +1|生命 +1|Life +1|ライフ +1|생명 +1
item.line.name|線圈炸彈|线圈炸弹|Line Bomb|一列爆弾|라인 폭탄
item.line.hint|按動作鍵一次排一排炸彈|按动作键一次排一排炸弹|Press the action key once to lay a whole row|アクションキー一度で一列に並べる|액션 키 한 번으로 한 줄로 설치
item.skull.name|骷髏頭|骷髅头|Skull|ドクロ|해골
item.skull.hint|詛咒！快去撞別人傳染出去|诅咒！快去撞别人传染出去|Curse! Bump into someone to pass it on|呪い！他人に体当たりして移せ|저주! 남에게 부딪혀 옮기세요
theme.1|綠野草原|绿野草原|Green Plains|緑の草原|초록 초원
theme.2|沙漠遺跡|沙漠遗迹|Desert Ruins|砂漠遺跡|사막 유적
theme.3|冰雪原|冰雪原|Ice Field|氷原|빙원
theme.4|熔岩洞窟|熔岩洞窟|Lava Cavern|溶岩洞窟|용암 동굴
theme.5|夜光彩城|夜光彩城|Neon City|ネオン彩城|네온 채성
theme.6|深海遺跡|深海遗迹|Deep Sea Ruins|深海遺跡|심해 유적
theme.7|天空要塞|天空要塞|Sky Fortress|天空要塞|천공 요새
theme.8|暗黑魔王城|暗黑魔王城|Dark Demon Castle|暗黒魔王城|암흑 마왕성
char.rabbit|兔兔BIBI|兔兔BIBI|BIBI the Rabbit|ウサギのBIBI|토끼 BIBI
char.bear|小熊BOBO|小熊BOBO|BOBO the Bear|クマのBOBO|곰 BOBO
char.dog|柴犬KIKI|柴犬KIKI|KIKI the Shiba|柴犬のKIKI|시바견 KIKI
char.cat|貓咪NANA|猫咪NANA|NANA the Cat|ネコのNANA|고양이 NANA
char.pig|豬豬MOMO|猪猪MOMO|MOMO the Pig|ブタのMOMO|돼지 MOMO
char.panda|熊貓ZUZU|熊猫ZUZU|ZUZU the Panda|パンダのZUZU|판다 ZUZU
char.frog|青蛙GUGU|青蛙GUGU|GUGU the Frog|カエルのGUGU|개구리 GUGU
char.chick|小雞DODO|小鸡DODO|DODO the Chick|ヒヨコのDODO|병아리 DODO
tag.rabbit|美貌的|美貌的|the gorgeous|美形な|미남미녀인
tag.bear|非常有特色的|非常有特色的|very distinctive|とても個性的な|개성 넘치는
tag.dog|有個性的|有个性的|full of character|キャラ立ちした|개성 있는
tag.cat|賤賤的|贱贱的|a bit cheeky|ちょっと意地悪な|약간 까칠한
tag.pig|非常可愛的|非常可爱的|super cute|とても可愛い|엄청 귀여운
tag.panda|膽小的|胆小的|a little timid|ちょっと臆病な|조금 겁 많은
tag.frog|獨特的|独特的|one of a kind|独特な|독특한
tag.chick|特別的|特别的|something special|特別な|특별한
sp.slime|史萊姆|史莱姆|Slime|スライム|슬라임
sp.beetle|鐵甲蟲|铁甲虫|Iron Beetle|鉄甲虫|철갑충
sp.crab|螃蟹|螃蟹|Crab|カニ|게
sp.skull|骷髏兵|骷髅兵|Skeleton|ガイコツ兵|해골병사
sp.shroom|毒菇怪|毒菇怪|Poison Shroom|毒キノコ|독버섯
sp.lizard|疾風蜥|疾风蜥|Gale Lizard|疾風トカゲ|질풍 도마뱀
sp.bat|蝙蝠|蝙蝠|Bat|コウモリ|박쥐
sp.ghost|幽靈|幽灵|Ghost|幽霊|유령
sp.bee|毒蜂|毒蜂|Poison Bee|毒バチ|독벌
sp.eye|眼球怪|眼球怪|Eyeball|目玉|눈알
sp.scavenger|撿彈怪|捡弹怪|Scavenger|拾い屋|회수꾼
sp.sapper|拆彈怪|拆弹怪|Sapper|解体屋|해체꾼
sp.bomber|放彈怪|放弹怪|Bomber|爆弾屋|폭탄꾼
sp.panda|貓熊|猫熊|Panda|パンダ|판다
sp.penguin|企鵝|企鹅|Penguin|ペンギン|펭귄
sp.octopus|章魚|章鱼|Octopus|タコ|문어
sp.robot|機器人|机器人|Robot|ロボット|로봇
sp.wisp|鬼火|鬼火|Will-o'-Wisp|鬼火|도깨비불
sp.wizard|小巫師|小巫师|Little Wizard|小さな魔法使い|꼬마 마법사
sp.hornet|大黃蜂|大黄蜂|Giant Hornet|オオスズメバチ|왕말벌
ann.title|作者公告|作者公告|Author Notice|作者からのお知らせ|작성자 공지
ann.fb|FB 連結：|FB 链接：|FB: |FB：|FB: 
verlog.btn|版本更新內容|版本更新内容|Version Log|更新情報|업데이트 내역
verlog.title|📜 版本更新內容|📜 版本更新内容|📜 Version Log|📜 更新情報|📜 업데이트 내역
rpg.mode|RPG 模式|🎲 RPG 模式|🎲 RPG Mode|🎲 RPGモード|🎲 RPG 모드
rpg.beta|測試版 Beta|测试版 Beta|Beta|ベータ版|베타 버전
rpg.sub|配點養成 · 血量防禦|四维属性 · 血量防御 · 32 张地图|4 attributes · HP & armor · 32 maps|4つの能力値 · HPと防御 · 32枚のマップ|4대 능력치 · HP와 방어 · 32개 맵
rpg.desc|跟一般闖關完全不同的養成規則：怪物有血量與防禦，炸一次不會死；你自己也有生命與護甲。先配點、再出發，一路打過 32 張地圖。|跟一般闯关完全不同的养成规则：怪物有血量与防御，炸一次不会死；你自己也有生命与护甲。先配点、再出发，一路打过 32 张地图。|A completely different growth system: monsters have HP and armor, so one blast will not kill them; you also have HP and armor yourself. Spend points, then set off and clear all 32 maps.|通常ステージとは全く違う成長ルール：モンスターにはHPと防御があり、1回の爆発では倒せません。あなた自身にもHPと防御があります。まずポイントを振ってから出発し、32枚のマップをクリアしましょう。|일반 스테이지와 완전히 다른 성장 규칙: 몬스터에게 HP와 방어가 있어 한 번의 폭발로 죽지 않습니다. 당신에게도 HP와 방어가 있습니다. 먼저 포인트를 분배하고 32개 맵을 모두 클리어하세요.
rpg.step1|① 選角色|① 选角色|① Pick a hero|① キャラを選ぶ|① 캐릭터 선택
rpg.step2|② 能力配點|② 能力配点|② Allocate points|② 能力値に振り分け|② 능력치 분배
rpg.step3|③ 出發地圖（32 張 · 8 大主題 × 4 張地區）|③ 出发地图（32 张 · 8 大主题 × 4 张地区）|③ Choose a map (32 maps · 8 themes × 4 areas)|③ マップを選ぶ（32枚 · 8テーマ × 4エリア）|③ 맵 선택 (32개 · 8테마 × 4지역)
rpg.random|🎲 電腦隨機分配|🎲 电脑随机分配|🎲 Random allocate|🎲 ランダム振り分け|🎲 무작위 분배
rpg.start|開始冒險 →|开始冒险 →|Start adventure →|冒険スタート →|모험 시작 →
store.btn|商店|🛒 商店|🛒 Store|🛒 ショップ|🛒 상점
menu.store.sub|隨從 · 外觀|随从 · 外观|Followers · Skins|お供 · 外見|동료 · 외형
ui.rest|剩餘|剩余|Left|残り|남은
ui.zoom|縮放|缩放|Zoom|ズーム|확대/축소
pet.title|隨從|随从|Pets|仲間|동료
pet.sub|叫出或收回已雇用的隨從。收回不會受傷，隨時可以再叫。|叫出或收回已雇用的随从。收回不会受伤，随时可以再叫。|Call out or recall a pet you hired. Recalling never hurts them — call them back anytime.|雇った仲間を呼び出す／戻せます。戻しても傷つきません。|고용한 동료를 소환하거나 회수하세요. 회수해도 다치지 않습니다.
pet.call|叫出|叫出|Call|呼ぶ|소환
pet.back|收回|收回|Recall|戻す|회수
pet.out|出場中 · HP {hp}|出场中 · HP {hp}|Out · HP {hp}|出撃中 · HP {hp}|출전 중 · HP {hp}
pet.idle|待命中（未出場）|待命中（未出场）|Waiting (not out)|待機中（未出撃）|대기 중（미출전）
pet.down|倒地中，會自己爬起來|倒地中，会自己爬起来|Knocked down — getting up soon|倒れています（すぐ復帰）|쓰러짐 — 곧 일어납니다
pet.none|還沒有隨從。到商店的隨從分頁雇用一隻，就能在這裡叫出。|还没有随从。到商店的随从分页雇用一只，就能在这里叫出。|No pets yet — hire one in the shop, then call it out here.|まだ仲間がいません。ショップで雇うと、ここから呼べます。|아직 동료가 없습니다. 상점에서 고용하세요.
pet.allOut|全部叫出|全部叫出|Call all|全部呼ぶ|전부 소환
pet.allIn|全部召回|全部召回|Recall all|全員戻す|전부 회수
ui.pub|發布|发布|Publish|公開|게시
ui.query|查詢|查询|Search|照会|조회
store.note|隨從 8000 金幣 · 單人／RPG 幫打|随从 8000 金币 · 单人／RPG 帮打|Followers · 8,000 gold · Solo / RPG|お供 8000ゴールド · ソロ／RPG|동료 8000골드 · 싱글／RPG
help.desc|操作、道具、坐騎招式、場景機關、大逃殺、怪物圖鑑一次看懂 —— 點上面的分類切換。|操作、道具、坐骑招式、场景机关、大逃杀、怪物图鉴一次看懂 —— 点上面的分类切换。|Controls, items, mount skills, stage hazards, Battle Royale and the monster guide in one place — switch tabs above.|操作・アイテム・騎乗スキル・ステージの仕掛け・バトロワ・モンスター図鑑をまとめて確認 —— 上のタブで切り替え。|조작, 아이템, 탈것 기술, 스테이지 장치, 배틀로얄, 몬스터 도감을 한 번에 —— 위 탭에서 전환하세요.
help.title|📖 遊戲說明|📖 游戏说明|📖 Game Guide|📖 ゲーム説明|📖 게임 설명
save.bak|存檔備份|存档备份|Save backup|セーブのバックアップ|저장 백업
save.bakDesc|換手機、清掉瀏覽器資料，或帳號救不回來時，用這串碼把進度搬回來（關卡、金幣、隨從、票券、教學、每日最佳）。|换手机、清掉浏览器数据，或账号救不回来时，用这串码把进度搬回来（关卡、金币、随从、票券、教学、每日最佳）。|Moving to a new phone, clearing browser data, or locked out of your account? Paste this code to bring your progress back: stages, coins, pets, tickets, tutorial and daily best.|機種変更・ブラウザデータの削除・アカウント復旧不能のとき、このコードで進行状況を戻せます（ステージ・コイン・仲間・チケット・チュートリアル・デイリー最佳）。|기기 변경, 브라우저 데이터 삭제, 계정 복구 불가 시 이 코드로 진행 상황을 되살릴 수 있습니다(스테이지·코인·동료·티켓·튜토리얼·일일 최고).
save.export|📤 匯出存檔碼|📤 导出存档码|📤 Export save code|📤 セーブコードを書き出す|📤 저장 코드 내보내기
save.import|📥 貼上還原|📥 粘贴还原|📥 Restore from code|📥 貼り付けて復元|📥 붙여넣어 복원
save.ph|貼上存檔碼…|粘贴存档码…|Paste your save code…|セーブコードを貼り付け…|저장 코드를 붙여넣으세요…
save.copied|存檔碼已複製，找個地方存起來|存档码已复制，找个地方存起来|Code copied — keep it somewhere safe|コードをコピーしました。安全な場所に保管してください|코드를 복사했습니다. 안전한 곳에 보관하세요
save.copyFail|請長按上方文字全選複製|请长按上方文字全选复制|Long-press the text above to copy it|上の文字を長押しして全選択コピーしてください|위 글자를 길게 눌러 전체 선택 후 복사하세요
save.noCode|先把存檔碼貼進框裡|先把存档码贴进框里|Paste a save code first|先にセーブコードを貼り付けてください|먼저 저장 코드를 붙여넣으세요
save.bad|這串存檔碼不完整或格式不對|这串存档码不完整或格式不对|That code is incomplete or invalid|コードが不完全か形式が違います|코드가 불완전하거나 형식이 잘못되었습니다
save.confirm|還原會覆蓋這台裝置目前的進度，確定嗎？|还原会覆盖这台设备目前的进度，确定吗？|Restoring overwrites the progress on this device. Continue?|復元するとこの端末の進行状況が上書きされます。よろしいですか？|복원하면 이 기기의 진행 상황이 덮어쓰여집니다. 계속할까요?
save.done|已還原|已还原|Restored|復元しました|복원되었습니다
scrollHint|往下滑，下面還有更多|往下滑，下面还有更多|Scroll down for more|下にスクロールすると続きがあります|아래로 스크롤하면 더 있어요
help.tab.basic|🎮 基本操作|🎮 基本操作|🎮 Basics|🎮 基本操作|🎮 기본 조작
help.tab.item|🎁 道具總覽|🎁 道具总览|🎁 Items|🎁 アイテム|🎁 아이템
help.tab.ride|🦖 坐騎招式|🦖 坐骑招式|🦖 Mount Skills|🦖 騎乗スキル|🦖 탈것 기술
help.tab.stage|🗺️ 場景機關|🗺️ 场景机关|🗺️ Hazards|🗺️ 仕掛け|🗺️ 장치
help.tab.br|🏝️ 大逃殺|🏝️ 大逃杀|🏝️ Battle Royale|🏝️ バトロワ|🏝️ 배틀로얄
help.tab.foe|👾 怪物圖鑑|👾 怪物图鉴|👾 Monsters|👾 モンスター|👾 몬스터
help.tab.tip|💡 實戰訣竅|💡 实战诀窍|💡 Tips|💡 攻略のコツ|💡 실전 요령
fd.slime|最基礎的小怪，隨機亂走。<b>要炸 3 下</b>才會倒，常一次來好幾隻。頭上會顯示血條。|最基础的小怪，随机乱走。<b>要炸 3 下</b>才会倒，常一次来好几只。头上会显示血条。|Basic wanderer. <b>3 hits</b> to kill; they often come in groups. HP bar overhead.|いちばん基本の雑魚。ランダムに歩き回る。<b>3 回爆破</b>で倒れ、たいてい何体かまとめて来る。頭上に HP バーが出る。|가장 기본 잡몹. 무작위로 돌아다닌다. <b>3 번 터뜨려야</b> 쓰러지고, 보통 여러 마리가 한꺼번에 온다. 머리 위에 HP 바가 표시된다.
fd.mush|毒菇怪亂走、<b>速度最慢</b>，最好欺負，但常常擠成一團。|毒菇怪乱走、<b>速度最慢</b>，最好欺负，但常常挤成一团。|<b>Slowest</b> wanderer and easy prey — but they clump together.|毒キノコはうろつくだけで<b>いちばん遅い</b>。格好の的だが、すぐ群がる。|독버섯 몬스터는 어슬렁거리고 <b>가장 느리다</b>. 제일 만만하지만 자주 뭉친다.
fd.beetle|會<b>主動追人</b>。有硬甲，<b>要炸 4 次</b>才會倒。|会<b>主动追人</b>。有硬甲，<b>要炸 4 次</b>才会倒。|<b>Chases you</b>. Armoured — <b>takes 4 hits</b>.|<b>自分から追ってくる</b>。硬い甲羅で<b>4 回爆破</b>が必要。|<b>먼저 쫓아온다</b>. 단단한 갑옷이라 <b>4 번 터뜨려야</b> 쓰러진다.
fd.crab|橫著亂走，路線很難抓。<b>要炸 3 下</b>，但常堵在窄路上。|横着乱走，路线很难抓。<b>要炸 3 下</b>，但常堵在窄路上。|Sidesteps unpredictably. <b>3 hits</b>, but loves to block narrow paths.|横歩きで動きが読みにくい。<b>3 回爆破</b>で倒せるが、狭い道をふさぎがち。|옆으로 걸어서 동선을 읽기 어렵다. <b>3 번</b> 터뜨리면 되지만 좁은 길을 자주 막는다.
fd.eye|眼球怪：穿牆飛行、速度慢，但會<b>偶爾</b>朝你飄過來。|眼球怪：穿墙飞行、速度慢，但会<b>偶尔</b>朝你飘过来。|Slow flyer that <b>occasionally</b> drifts your way.|目玉型：壁を抜けて飛び、速度は遅いが<b>たまに</b>こちらへ漂ってくる。|눈알 몬스터: 벽을 통과해 날고 느리지만 <b>가끔</b> 다가온다.
fd.penguin|企鵝：走起路來<b>搖搖擺擺</b>但速度不慢。|企鹅：走起路来<b>摇摇摆摆</b>但速度不慢。|Penguin: waddles along at a <b>decent pace</b>.|ペンギン：<b>よちよち</b>歩くが、足は遅くない。|펭귄: <b>뒤뚱뒤뚱</b> 걷지만 느리지 않다.
fd.bat|飛行怪：<b>可以越過牆壁</b>，躲牆後沒用。直線飛、撞到邊界反彈。|飞行怪：<b>可以越过墙壁</b>，躲墙后没用。直线飞、撞到边界反弹。|<b>Flies over walls</b> — hiding behind bricks does not help. Bounces off edges.|飛行型：<b>壁を越えられる</b>ので壁の裏に隠れても無駄。直進して端で跳ね返る。|비행형: <b>벽을 넘는다</b> — 벽 뒤에 숨어도 소용없다. 직선으로 날고 경계에서 튕긴다.
fd.panda|貓熊：圓滾滾、<b>超慢</b>，但很大一隻，看起來很不好惹。|猫熊：圆滚滚、<b>超慢</b>，但很大一只，看起来很不好惹。|Panda: big, round and <b>very slow</b> — looks fierce, moves slow.|パンダ：まんまるで<b>超鈍足</b>、でも体が大きくて迫力満点。|판다: 둥글고 <b>아주 느리지만</b> 덩치가 커서 만만해 보이지 않는다.
fd.bee|毒蜂：<b>飛行怪裡最快的一隻</b>，但已經調慢，偶爾才會往你靠。|毒蜂：<b>飞行怪里最快的一只</b>，但已经调慢，偶尔才会往你靠。|The <b>fastest flyer</b>, now slowed down; only occasionally drifts your way.|毒バチ：<b>飛行型で最速</b>。ただし速度は落としてあり、たまにしか寄ってこない。|독벌: <b>비행형 중 가장 빠르다</b>. 다만 속도를 낮춰서 가끔만 다가온다.
fd.bomber|<b>放彈怪</b>：自己會放炸彈，但火焰<b>只有 1 格</b>，還好躲。|<b>放弹怪</b>：自己会放炸弹，但火焰<b>只有 1 格</b>，还好躲。|<b>Bomber</b>: throws its own bombs — but the flame is only <b>1 tile</b>.|<b>ボム兵</b>：自分で爆弾を置くが、炎は<b>1 マスだけ</b>なので避けやすい。|<b>폭탄 몬스터</b>: 스스로 폭탄을 놓지만 화염이 <b>1 칸뿐</b>이라 피하기 쉽다.
fd.lizard|疾風蜥：<b>地面最快的追擊怪</b>，直直朝你衝。甩不掉就用滑冰鞋。|疾风蜥：<b>地面最快的追击怪</b>，直直朝你冲。甩不掉就用滑冰鞋。|<b>Fastest ground chaser</b> — it beelines at you. Out-run it with Skates.|疾風トカゲ：<b>地上最速の追跡型</b>。一直線に突っ込んでくる。振り切れないならスケートで。|질풍 도마뱀: <b>지상에서 가장 빠른 추격형</b>. 곧장 돌진한다. 못 떨치면 스케이트를 써라.
fd.wisp|鬼火：<b>半透明的小火焰</b>，會到處飄，尾巴還會冒火星。|鬼火：<b>半透明的小火焰</b>，会到处飘，尾巴还会冒火星。|Wisp: a <b>translucent little flame</b> trailing sparks.|鬼火：<b>半透明の小さな炎</b>。あちこち漂い、尾から火花が散る。|도깨비불: <b>반투명한 작은 불꽃</b>. 여기저기 떠다니고 꼬리에서 불똥이 튄다.
fd.scavenger|<b>撿彈怪</b>：會把你放的炸彈<b>撿起來丟回你身上</b>，看到炸彈別大意。|<b>捡弹怪</b>：会把你放的炸弹<b>捡起来丢回你身上</b>，看到炸弹别大意。|<b>Scavenger</b>: picks up your bombs and <b>hurls them back</b>.|<b>爆弾ひろい</b>：置いた爆弾を<b>拾って投げ返してくる</b>。爆弾を見ても油断しないこと。|<b>폭탄 줍는 몬스터</b>: 놓은 폭탄을 <b>주워서 되던진다</b>. 폭탄을 봐도 방심 금지.
fd.robot|機器人：紅色<b>單眼</b>，行動很機械，會直直追你。|机器人：红色<b>单眼</b>，行动很机械，会直直追你。|Robot: a red <b>single eye</b> and mechanical strides — beelines at you.|ロボット：赤い<b>単眼</b>。機械的な動きで一直線に追ってくる。|로봇: 빨간 <b>외눈</b>. 기계적인 움직임으로 곧장 쫓아온다.
fd.ghost|幽靈：穿牆飛行、速度慢，但會<b>慢慢飄向你</b>。|幽灵：穿墙飞行、速度慢，但会<b>慢慢飘向你</b>。|Phases through walls. Slow, but <b>drifts toward you</b>.|ゴースト：壁を抜けて飛ぶ。遅いが<b>ゆっくり近づいてくる</b>。|유령: 벽을 통과해 날아다닌다. 느리지만 <b>천천히 다가온다</b>.
fd.hornet|大黃蜂：<b>非常快</b>，尾巴有螫針，翅膀聲音很大。|大黄蜂：<b>非常快</b>，尾巴有螫针，翅膀声音很大。|Giant Hornet: <b>very fast</b> with a nasty sting.|スズメバチ：<b>とても速い</b>。尾に針があり、羽音が大きい。|말벌: <b>아주 빠르다</b>. 꼬리에 침이 있고 날갯소리가 크다.
fd.sapper|<b>拆彈怪</b>：會把附近的炸彈<b>拆掉</b>（拆掉不會爆炸），很煩。|<b>拆弹怪</b>：会把附近的炸弹<b>拆掉</b>（拆掉不会爆炸），很烦。|<b>Sapper</b>: <b>defuses</b> nearby bombs without detonating them.|<b>解体屋</b>：近くの爆弾を<b>解体する</b>（爆発しない）。とにかく厄介。|<b>해체 몬스터</b>: 근처 폭탄을 <b>해체한다</b>(터지지 않음). 정말 성가시다.
fd.skull|骷髏兵會<b>追人</b>、速度偏快，<b>要炸 4 次</b>。被盯上時最危險。|骷髅兵会<b>追人</b>、速度偏快，<b>要炸 4 次</b>。被盯上时最危险。|<b>Chases you</b> and is fast. <b>4 hits</b> to kill. Deadly when it locks on.|ガイコツ兵は<b>追ってくる</b>うえ速め。<b>4 回爆破</b>が必要。狙われたら危険。|해골 병사는 <b>쫓아오고</b> 빠른 편. <b>4 번</b> 터뜨려야 한다. 표적이 되면 가장 위험.
fd.wizard|小巫師：尖帽＋白鬍鬚，<b>會找掩體躲炸彈</b>。|小巫师：尖帽＋白胡子，<b>会找掩体躲炸弹</b>。|Little Wizard: pointed hat, and <b>dodges bombs</b> behind cover.|小魔法使い：とんがり帽と白ひげ。<b>物陰に隠れて爆弾を避ける</b>。|작은 마법사: 뾰족모자에 흰 수염. <b>엄폐물을 찾아 폭탄을 피한다</b>.
acct.bind|綁定帳號|绑定账号|Bind account|アカウント連携|계정 연동
acct.title|👤 帳號|👤 账号|👤 Account|👤 アカウント|👤 계정
acct.guest|遊客|游客|Guest|ゲスト|게스트
acct.player|玩家|玩家|Player|プレイヤー|플레이어
acct.offShort|離線|离线|Offline|オフライン|오프라인
acct.memberTitle|已登入|已登录|Signed in|ログイン済み|로그인됨
acct.needBind|綁定後可跨裝置續玩|绑定后可在不同设备继续游玩|Bind to keep progress across devices|連携すると別の端末でも続きが遊べます|연동하면 다른 기기에서도 이어서 플레이할 수 있어요
acct.bindNote|綁定時會把遊客的關卡進度、配點、金幣完整合併到正式帳號，不會被覆蓋。|绑定后会把游客的关卡进度、配点、金币完整合并到正式账号，不会被覆盖。|Binding merges your guest stages, stats and gold into the account. Nothing gets overwritten.|連携するとゲストのステージ・能力値・ゴールドはそのまま正式アカウントへ統合されます（上書きされません）。|연동하면 게스트의 스테이지 진행, 능력치, 골드가 그대로 정식 계정에 합쳐집니다(덮어쓰지 않음).
acct.google|使用 Google 登入|使用 Google 登录|Continue with Google|Google でログイン|Google로 로그인
acct.facebook|使用 Facebook 登入|使用 Facebook 登录|Continue with Facebook|Facebook でログイン|Facebook으로 로그인
acct.line|使用 LINE 登入|使用 LINE 登录|Continue with LINE|LINE でログイン|LINE으로 로그인
acct.off|伺服器尚未開啟這個登入方式|服务器尚未开启这个登录方式|This sign-in method is not enabled on the server|このログイン方法はサーバーで有効になっていません|서버에서 이 로그인 방식을 켜지 않았습니다
acct.cleared|已通過 {n} / 32 關|已通过 {n} / 32 关|Cleared {n} / 32|クリア {n} / 32|클리어 {n} / 32
acct.clearedLabel|冒險進度|冒险进度|Progress|冒険の進み具合|모험 진행
acct.gold|金幣|金币|Gold|ゴールド|골드
acct.points|可用配點|可用配点|Points left|残りポイント|남은 포인트
acct.logout|登出|退出登录|Sign out|ログアウト|로그아웃
acct.close|關閉|关闭|Close|閉じる|닫기
acct.manage|帳號|账号|Account|アカウント|계정
acct.offline|離線模式：連不到伺服器，進度暫存本機|离线模式：连不到服务器，进度暂存在本机|Offline mode: server unreachable, progress stays on this device|オフラインモード：サーバーに接続できません。進行状況は端末に保存されます|오프라인 모드: 서버에 연결할 수 없어 진행 상황을 기기에 저장합니다
acct.retry|重試|重试|Retry|再試行|다시 시도
acct.secure|🔒 全程 HTTPS 加密 · 伺服器端驗證 · 存檔 HMAC 簽章|🔒 全程 HTTPS 加密 · 服务器端验证 · 存档 HMAC 签名|🔒 HTTPS only · server-side validation · HMAC-signed saves|🔒 常時 HTTPS・サーバー側検証・セーブは HMAC 署名|🔒 전체 HTTPS · 서버 검증 · 저장 파일 HMAC 서명
acct.synced|☁️ 立即同步|☁️ 立即同步|☁️ Sync now|☁️ 今すぐ同期|☁️ 지금 동기화
acct.loginOk|✅ 登入成功|✅ 登录成功|✅ Signed in|✅ ログインしました|✅ 로그인되었습니다
acct.loginErr|⚠️ 登入沒有完成（{r}）|⚠️ 登录没有完成（{r}）|⚠️ Sign-in did not finish ({r})|⚠️ ログインが完了しませんでした（{r}）|⚠️ 로그인이 완료되지 않았습니다({r})
acct.tampered|⚠️ 存檔校驗失敗，已拒絕載入可疑資料|⚠️ 存档校验失败，已拒绝载入可疑数据|⚠️ Save checksum failed, suspicious data rejected|⚠️ セーブの検証に失敗しました。不審なデータを拒否しました|⚠️ 저장 파일 검증 실패, 의심스러운 데이터를 차단했습니다
acct.stageLocked|🔒 這一關還沒解鎖|🔒 这一关还没解锁|🔒 This stage is still locked|🔒 このステージはまだロック中|🔒 아직 잠긴 스테이지입니다
acct.saveDone|☁️ 第 {n} 關進度已存到雲端|☁️ 第 {n} 关进度已存到云端|☁️ Stage {n} saved to the cloud|☁️ ステージ {n} をクラウドに保存しました|☁️ 스테이지 {n} 진행이 클라우드에 저장되었습니다
acct.loggedOut|已登出，回到遊客模式|已退出，回到游客模式|Signed out — back to guest mode|ログアウトしました（ゲストモード）|로그아웃했습니다. 게스트 모드로 돌아갑니다
acct.bound|✅ 綁定成功，遊客進度已合併|✅ 绑定成功，游客进度已合并|✅ Linked! Guest progress merged|✅ 連携完了！ゲストの進行状況を統合しました|✅ 연동 완료! 게스트 진행이 합쳐졌습니다
acct.noProvider|站長還沒開通第三方登入 —— 先用遊客模式玩，開通後這裡就能一鍵綁定。|站長还没开通第三方登录 —— 先用游客模式玩，开通后这里就能一键绑定。|Third-party sign-in is not configured yet — play as a guest for now; binding will appear here once enabled.|このサーバーでは外部ログインが未設定です。まずはゲストで遊べます（設定後にここで連携できます）。|서버에 아직 외부 로그인이 설정되지 않았습니다. 지금은 게스트로 플레이하고, 설정되면 여기서 연동할 수 있어요.
set.tmode|隱形滑動區|隐形滑动区|Invisible slide area|透明スライド領域|투명 슬라이드 영역
set.tmode2|虛擬搖桿|虚拟摇杆|Virtual joystick|バーチャルスティック|가상 조이스틱
set.padL|操作區在左|操作区在左|Pad on left|操作領域は左|조작 영역 왼쪽
set.padR|操作區在右|操作区在右|Pad on right|操作領域は右|조작 영역 오른쪽
set.padPos|✥ 拖曳調整搖桿位置|✥ 拖曳调整摇杆位置|✥ Drag to move the pad|✥ ドラッグで位置調整|✥ 드래그로 위치 조정
set.padReset|回復預設位置|恢复预设位置|Reset position|位置を初期化|기본 위치로
set.peTitle|✥ 拖曳搖桿到順手的位置|✥ 拖曳摇杆到顺手的位置|✥ Drag the pad to a comfy spot|✥ 押しやすい位置へドラッグ|✥ 편한 위치로 드래그
set.peTip|按住圓盤拖曳（這塊就是遊戲畫面，位置會依比例記住）|按住圆盘拖曳（这块就是游戏画面，位置会依比例记住）|Hold and drag the dial (this box is the game view; the spot is saved as a ratio)|円盤を押したままドラッグ（この枠がゲーム画面。位置は比率で保存されます）|원판을 누른 채 드래그하세요 (이 상자가 게임 화면이며 위치는 비율로 저장됩니다)
set.peSave|儲存位置|保存位置|Save position|位置を保存|위치 저장
hint.diff.easy|😇 簡單：生命 <b>5 格</b>（被炸到後無敵也更久）、敵人少又慢，恐龍蛋 3 顆。|😇 简单：生命 <b>5 格</b>（被炸到后无敌也更久）、敌人少又慢，恐龙蛋 3 颗。|😇 Easy: <b>5 lives</b> (longer invincibility after a hit), fewer and slower enemies, 3 dino eggs.|😇 かんたん：ライフ <b>5 個</b>（やられた後の無敵も長め）、敵が少なく遅い、恐竜の卵は 3 個。|😇 쉬움: 생명 <b>5칸</b>(피격 후 무적이 더 김), 적이 적고 느리며 공룡알 3개.
hint.diff.normal|🙂 普通：生命 <b>3 格</b>、標準的敵人數量與速度，恐龍蛋 2 顆。|🙂 普通：生命 <b>3 格</b>、标准的敌人数量与速度，恐龙蛋 2 颗。|🙂 Normal: <b>3 lives</b>, standard enemy count and speed, 2 dino eggs.|🙂 ふつう：ライフ <b>3 個</b>、敵の数と速さは標準、恐竜の卵は 2 個。|🙂 보통: 생명 <b>3칸</b>, 적의 수와 속도는 표준, 공룡알 2개.
hint.diff.hard|😈 困難：生命 <b>3 格</b>、敵人更多更快、魔王血更厚，恐龍蛋只有 1 顆。|😈 困难：生命 <b>3 格</b>、敌人更多更快、魔王血更厚，恐龙蛋只有 1 颗。|😈 Hard: <b>3 lives</b>, more and faster enemies, tankier boss, only 1 dino egg.|😈 むずかしい：ライフ <b>3 個</b>、敵が多く速く、ボスの体力も高く、恐竜の卵は 1 個だけ。|😈 어려움: 생명 <b>3칸</b>, 적이 더 많고 빠르며, 보스 체력이 높고 공룡알은 1개뿐.
hint.time.on|時間到會强制陣亡一次（生命 -1），想慢慢探索請選 <b>♾️ 無限時間</b>。|时间到会强制阵亡一次（生命 -1），想慢慢探索请选择 <b>♾️ 无限时间</b>。|When time runs out you lose a life (Life -1). Pick <b>♾️ Endless</b> to explore at your own pace.|時間切れで強制的に 1 回やられます（ライフ -1）。ゆっくり探索したいなら <b>♾️ 無制限</b> を選んでください。|시간이 다 되면 강제로 한 번 쓰러집니다(생명 -1). 천천히 탐험하려면 <b>♾️ 무한</b>을 선택하세요.
hint.time.off|<b>♾️ 無限時間</b>：不會因為時間到而陣亡，可以慢慢炸磚、找恐龍蛋。|<b>♾️ 无限时间</b>：不会因为时间到而阵亡，可以慢慢炸砖、找恐龙蛋。|<b>♾️ Endless</b>: you never die from the timer — take your time blasting bricks and hunting dino eggs.|<b>♾️ 無制限</b>：時間切れでやられることはありません。ゆっくりブロックを壊し、恐竜の卵を探せます。|<b>♾️ 무한</b>: 시간 때문에 쓰러지지 않습니다. 천천히 벽돌을 폭파하고 공룡알을 찾으세요.
hint.ai.weak|😴 弱：常常發呆亂走、不太會追人、很少放炸彈、不太會躲火爆、走比較慢。|😴 弱：常常发呆乱走、不太会追人、很少放炸弹、不太会躲火爆、走比较慢。|😴 Weak: wanders around, rarely chases, seldom drops bombs, poor at dodging, moves slower.|😴 弱い：ぼーっと歩き回り、あまり追わず、爆弾もほとんど置かず、避けるのも苦手で動きが遅い。|😴 약함: 멍하니 돌아다니고, 잘 쫓지 않고, 폭탄도 거의 두지 않으며, 회피도 서툴고 느립니다.
hint.ai.normal|🙂 中：會追對手撿道具、適時放彈、會避開火焰。|🙂 中：会追对手捡道具、适时放弹、会避开火焰。|🙂 Medium: chases you, grabs items, drops bombs at decent moments, avoids flames.|🙂 中：相手を追ってアイテムを取り、タイミングよく爆弾を置き、炎も避けます。|🙂 중간: 상대를 쫓고 아이템을 줍고, 적절히 폭탄을 두며 불꽃을 피합니다.
hint.ai.strong|😈 強：反應快、積極追擊、幾乎彈無虛發、火場逃生一流、走路更快。|😈 强：反应快、积极追击、几乎弹无虚发、火场逃生一流、走路更快。|😈 Strong: fast reactions, aggressive chasing, rarely misses, top-tier fire escape, moves faster.|😈 強い：反応が速く積極的に追い、ほぼ弾を外さず、火からの脱出も一流で動きも速い。|😈 강함: 반응이 빠르고 적극적으로 쫓으며, 폭탄을 거의 빗나가지 않고 불꽃 회피가 뛰어나며 더 빠릅니다.
hint.ctrl.touch|目前：<b>手機觸控</b>——可在下面選「隱形滑動區」（半邊畫面任意處按下去就往那個方向走，區內沒有任何圖示）或「虛擬搖桿」（可拖曳位置、大小小中大）＋💥放彈鍵。|目前：<b>手机触控</b>——可在下面选「隐形滑动区」（半边画面任意处按下去就往那个方向走，区内没有任何图示）或「虚拟摇杆」（可拖曳位置、大小小中大）＋💥放弹键。|Now: <b>Touch</b> — pick an “invisible slide area” (press anywhere on one half and it becomes the stick centre, no icons at all) or a “virtual stick” (drag to reposition, small/medium/large) below, plus the 💥 bomb button.|現在：<b>タッチ</b>——下で「透明スライド領域」（画面の半分のどこを押してもそこがスティック中心。アイコンなし）か「バーチャルスティック」（位置をドラッグ可・サイズ小中大）＋💥爆弾ボタンを選べます。|현재: <b>터치</b> — 아래에서 「투명 슬라이드 영역」(화면 절반 아무 곳이나 누르면 그곳이 스틱 중심, 아이콘 없음) 또는 「가상 조이스틱」(드래그로 위치 이동, 크기 소/중/대) + 💥폭탄 버튼을 고르세요.
hint.ctrl.pad|目前：<b>手把</b>——偵測到 <b>{name}</b>（第 1 支＝玩家 1）。手把可直接用方向鍵選單、A 確認、B 返回。|目前：<b>手柄</b>——侦测到 <b>{name}</b>（第 1 支＝玩家 1）。手柄可直接用方向键选单、A 确认、B 返回。|Now: <b>Gamepad</b> — detected <b>{name}</b> (the first one = Player 1). Use the D-pad for menus, A to confirm, B to go back.|現在：<b>パッド</b>——<b>{name}</b> を検出（1 台目＝プレイヤー 1）。パッドの方向キーでメニュー、A で決定、B で戻れます。|현재: <b>패드</b> — <b>{name}</b> 감지(첫 번째 = 플레이어 1). 패드 방향키로 메뉴, A 확인, B 뒤로.
hint.ctrl.kb|目前：<b>鍵盤</b>——電腦遊玩不會顯示手機按鈕。{auto}|目前：<b>键盘</b>——电脑游玩不会显示手机按钮。{auto}|Now: <b>Keyboard</b> — the touch buttons stay hidden on desktop. {auto}|現在：<b>キーボード</b>——PC ではスマホ用ボタンは表示されません。{auto}|현재: <b>키보드</b> — PC에서는 터치 버튼이 표시되지 않습니다. {auto}
hint.auto.touch|（自動偵測：觸控裝置）|（自动侦测：触控设备）|(auto-detect: touch device)|（自動検出：タッチ端末）|(자동 감지: 터치 기기)
hint.auto.pad|（自動偵測：已接上手把，按一下手把就會自動切換）|（自动侦测：已接上控制器，按一下控制器就会自动切换）|(auto-detect: a gamepad is connected — press any button to switch)|（自動検出：パッド接続済み。何かボタンを押すと自動で切り替わります）|(자동 감지: 패드가 연결됨 — 버튼을 누르면 자동 전환)
hint.auto.kb|（自動偵測：未接上手把，使用鍵盤）|（自动侦测：未接上控制器，使用键盘）|(auto-detect: no gamepad found, using keyboard)|（自動検出：パッドなし。キーボードを使用）|(자동 감지: 패드 없음, 키보드 사용)
key.up|上|上|Up|上|위
key.down|下|下|Down|下|아래
key.left|左|左|Left|左|왼쪽
key.right|右|右|Right|右|오른쪽
key.act|放炸彈／動作|放炸弹／动作|Bomb / Action|爆弾／アクション|폭탄／액션
key.det|引爆|引爆|Detonate|起爆|폭파
key.fire|坐騎招式|坐骑招式|Mount skill|乗り物スキル|탈것 기술
key.press|按下鍵…|按下键…|Press a key…|キーを押して…|키를 누르세요…
time.1|1 分|1 分|1 min|1 分|1분
time.2|2 分|2 分|2 min|2 分|2분
set.escPre|按|按|Press |押して |누르기 
set.escPost|可取消。兩人用同一顆鍵會同時動作，請分開設定。|可取消。两人用同一颗键会同时动作，请分开设定。|to cancel. If both players share a key they act together — set them apart.|で中止できます。2 人が同じキーを使うと同時に動くので、分けて設定してください。|로 취소할 수 있습니다. 두 사람이 같은 키를 쓰면 함께 움직이므로 따로 설정하세요.
pwa.btn|下載 App|下载 App|Get App|アプリを入手|앱 받기
pwa.tip|加入桌面捷徑|加入桌面快捷方式|Add to Home Screen|ホーム画面に追加|홈 화면에 추가
pwa.title|📱 加入桌面捷徑|📱 加入桌面快捷方式|📱 Add to Home Screen|📱 ホーム画面に追加|📱 홈 화면에 추가
pwa.iosA|點 Safari 下方（或上方）的「分享」按鉅|点 Safari 下方（或上方）的「分享」按钮|Tap the Share button at the bottom of Safari|Safari 下部（または上部）の「共有」ボタンをタップ|Safari 하단(또는 상단)의 공유 버튼을 누르세요
pwa.iosB|在選單裡選「加入主畫面」，再按「新增」|在菜单里选「加入主屏幕」，再按「添加」|Choose “Add to Home Screen”, then tap “Add”|「ホーム画面に追加」を選び、「追加」をタップ|‘홈 화면에 추가’를 고르고 ‘추가’를 누르세요
pwa.desktop|按瀏覽器網址列右側的「安裝」小圖示，就能建立桌面捷徑|按浏览器地址栏右侧的「安装」小图标，就能创建桌面快捷方式|Tap the install icon on the right side of the address bar to create a shortcut|アドレスバー右側のインストールアイコンを押すとショートカットを作成できます|주소창 오른쪽의 설치 아이콘을 누르면 바로가기가 만들어집니다
pwa.manual|打開瀏覽器右上角的選單，選「安裝應用程式」或「加到主畫面」|打开浏览器右上角的菜单，选「安装应用」或「添加到主屏幕」|Open the browser menu (⋮) and choose “Install app” or “Add to Home screen”|ブラウザのメニュー（⋮）から「アプリをインストール」または「ホーム画面に追加」を選択|브라우저 메뉴(⋮)에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택하세요
pwa.note|從捷徑開啟時沒有網址列，全螢幕沈浸更好玩|从快捷方式打开时没有地址栏，全屏沉浸更好玩|Opened from the shortcut it runs full screen, with no address bar|ショートカットから起動するとアドレスバーなしの全画面で遊べます|바로가기로 열면 주소창 없이 전체 화면으로 즐길 수 있습니다
pwa.ok|知道了|知道了|Got it|了解|확인
pwa.done|已加入桌面捷徑 🎉|已加入桌面快捷方式 🎉|Shortcut added 🎉|ショートカットを追加しました 🎉|바로가기를 추가했어요 🎉
pwa.cancel|已取消安裝|已取消安装|Install cancelled|インストールをキャンセルしました|설치를 취소했습니다
boot.warn|⚠️ 這個裝置有部分功能沒有載入成功|⚠️ 这个设备有部分功能没有加载成功|⚠️ Some features did not load on this device|⚠️ この端末では一部の機能が読み込めませんでした|⚠️ 이 기기에서 일부 기능이 로드되지 않았습니다
boot.sub|商店／帳號／RPG／BOSS 可能按了沒反應。|商店／账号／RPG／BOSS 可能点了没反应。|Shop / Account / RPG / Boss may not respond.|ショップ／アカウント／RPG／ボスが反応しない場合があります。|상점／계정／RPG／보스가 반응하지 않을 수 있습니다.
boot.fix|🔄 強制更新|🔄 强制更新|🔄 Force update|🔄 強制更新|🔄 강제 업데이트
boot.more|顯示細節|显示细节|Show details|詳細を表示|세부 정보 보기
nav.forceUpd|強制更新|强制更新|Force update|強制更新|강제 업데이트
pwa.already|已經是捷徑開啟了 🙌|已经是快捷方式打开了 🙌|Already running as an app 🙌|すでにアプリとして起動中です 🙌|이미 앱으로 실행 중입니다 🙌
br.mountPop|騎乘！|骑乘！|Mounted!|乗った！|탑승!
br.mountOstrich|鴕鳥神獸！|鸵鸟神兽！|Wind Ostrich!|風のダチョウ！|바람 타조!
br.bossGetOstrich|打倒第 {n} 關 BOSS！鴕鳥神獸直接上身（1.45 倍速＋跳躍跨牆）|打倒第 {n} 关 BOSS！鸵鸟神兽直接上身（1.45 倍速＋跳跃跨墙）|Stage {n} boss down! You're on the Wind Ostrich (1.45× speed + wall-clearing leap)|ステージ {n} のボス撃破！風のダチョウに騎乗（1.45 倍速＋壁を飛び越えるジャンプ）|{n}스테이지 보스 격파! 바람 타조 탑승 (1.45배속 + 벽 넘는 점프)
br.mountRed|進化紅龍！|进化红龙！|Red Dragon!|レッドドラゴン進化！|레드 드래곤 진화!
br.bossGet|打倒第 {n} 關 BOSS！恐龍坐騎直接上身（多擋一次傷害）|打倒第 {n} 关 BOSS！恐龙坐骑直接上身（多挡一次伤害）|Stage {n} boss down! You're on the dino right away (blocks one hit).|ステージ {n} のボス撃破！その場で恐竜に騎乗（ダメージを 1 回防ぐ）。|{n}스테이지 보스 격파! 바로 공룡에 탑승 (피해 1회 방어).
br.bossGetRed|打倒第 {n} 關 BOSS！坐騎進化成紅龍（四方向吐火）|打倒第 {n} 关 BOSS！坐骑进化成红龙（四方向吐火）|Stage {n} boss down! Your mount evolves into the Red Dragon (4-way flame).|ステージ {n} のボス撃破！乗り物がレッドドラゴンに進化（4 方向に炎）。|{n}스테이지 보스 격파! 탈것이 레드 드래곤으로 진화 (4방향 화염).
br.bossMate|隊友打倒 BOSS，直接騎上恐龍坐騎|队友打倒 BOSS，直接骑上恐龙坐骑|Your teammate took the boss — free dino mount!|味方がボスを撃破 → 恐竜に騎乗！|팀원이 보스를 잡았다 — 공룡 탑승!
br.bossOther|第 {n} 關 BOSS 被其他人討伐了|第 {n} 关 BOSS 被其他人讨伐了|Someone else took down the stage {n} boss.|ステージ {n} のボスは他の人に倒された。|{n}스테이지 보스는 다른 사람이 잡았다.
br.bossFall|第 {n} 關 BOSS 倒下了|第 {n} 关 BOSS 倒下了|The stage {n} boss has fallen.|ステージ {n} のボスが倒れた。|{n}스테이지 보스가 쓰러졌다.
br.hudSolo|單人混戰|单人混战|Solo chaos|ソロ乱戦|솔로 난전
br.hurt|受到傷害 · 剩 {n} 點血|受到伤害 · 剩 {n} 点血|Hit! {n} HP left|被弾 · 残り {n}|피격 · 남은 체력 {n}
br.out|{n} 出局 · 剩 {a} 人|{n} 出局 · 剩 {a} 人|{n} is out · {a} left|{n} が脱落 · 残り {a} 人|{n} 탈락 · {a} 명 남음
br.outMate|隊友 {n} 出局 · 剩 {a} 人|队友 {n} 出局 · 剩 {a} 人|Teammate {n} is out · {a} left|味方 {n} が脱落 · 残り {a} 人|팀원 {n} 탈락 · {a} 명 남음
br.zone|毒圈收縮 · 半徑 {n} 格|毒圈收缩 · 半径 {n} 格|The zone is closing · radius {n} tiles|ゾーン収縮 · 半径 {n} マス|자기장 축소 · 반경 {n} 칸
br.hudTeams|{a} / {b} 隊|{a} / {b} 队|{a} / {b} teams|{a} / {b} チーム|{a} / {b} 팀
br.final|終局|终局|Final zone|最終局面|종국
br.hudZone|縮圈 {n}s|缩圈 {n}s|Zone {n}s|縮小 {n}s|축소 {n}s
br.bossStage|👑 第 {n} 關|👑 第 {n} 关|👑 Stage {n}|👑 ステージ {n}|👑 {n}스테이지
br.title|大逃殺|大逃杀|Battle Royale|バトロワ|배틀로얄
br.myChar|角色|角色|Fighter|キャラ|캐릭터
br.namePh|你的名字|你的名字|Your name|名前|이름
br.chPrev|上一個角色|上一个角色|Previous fighter|前のキャラ|이전 캐릭터
br.chNext|下一個角色|下一个角色|Next fighter|次のキャラ|다음 캐릭터
br.sub|{w}×{h} 隨機大陸|{w}×{h} 随机大陆|{w}×{h} random continent|{w}×{h} ランダム大陸|{w}×{h} 랜덤 대륙
br.people|人數|人数|Players|人数|인원
br.team|組隊|组队|Teams|チーム|팀
br.time|時間|时间|Time|時間|시간
br.p30|30 人|30 人|30 players|30 人|30명
br.p50|50 人|50 人|50 players|50 人|50명
br.solo|單人|单人|Solo|ソロ|솔로
br.teamN|{n} 人|{n} 人|{n} players|{n} 人|{n}명
br.d5|5 分鐘 · 5 圈|5 分钟 · 5 圈|5 min · 5 rings|5 分 · 5 周|5분 · 5회
br.d10|10 分鐘 · 10 圈|10 分钟 · 10 圈|10 min · 10 rings|10 分 · 10 周|10분 · 10회
br.goTeams|出發（{a} 隊 × {b} 人）|出发（{a} 队 × {b} 人）|Deploy ({a} squads × {b})|出発（{a} チーム × {b} 人）|출발 ({a}팀 × {b}명)
br.goSolo|出發（{n} 人混戰）|出发（{n} 人混战）|Deploy ({n}-player chaos)|出発（{n} 人乱戦）|출발 ({n}명 난전)
br.free|正式測試期間免費入場|正式测试期间免费入场|Free during the open test|公開テスト中は無料|공개 테스트 기간 무료
br.ticket|每場消耗 1 張門票（現有 {n} 張）|每场消耗 1 张门票（现有 {n} 张）|Costs 1 ticket per match ({n} left)|1 試合につきチケット 1 枚（残り {n} 枚）|한 판당 티켓 1장 (보유 {n}장)
br.foot|　·　14 隻小怪＋{b} 隻亂入 BOSS（打倒可騎恐龍）|　·　14 只小怪＋{b} 只乱入 BOSS（打倒可骑恐龙）|  ·  14 minions + {b} roaming bosses (mount the dino!)|　·　雑魚 14 体＋乱入ボス {b} 体（倒すと恐竜に騎乗）|　·　잡몹 14마리 + 난입 보스 {b}마리 (잡으면 공룡 탑승)
brsum.teams|<b>{a} 隊 × {b} 人</b> · 隊友不互炸 · {d} 分鐘 {r} 圈|<b>{a} 队 × {b} 人</b> · 队友不互炸 · {d} 分钟 {r} 圈|<b>{a} squads × {b}</b> · no friendly fire · {d} min, {r} rings|<b>{a} チーム × {b} 人</b> · 同士討ちなし · {d} 分 {r} 周|<b>{a}팀 × {b}명</b> · 팀원 오사 없음 · {d}분 {r}회
brsum.solo|<b>{n} 人</b>同場 · 最後活著的奪冠 · {d} 分鐘 {r} 圈 · 🦖 {b} 隻 BOSS|<b>{n} 人</b>同场 · 最后活着的夺冠 · {d} 分钟 {r} 圈 · 🦖 {b} 只 BOSS|<b>{n} players</b> free-for-all · last one standing · {d} min, {r} rings · 🦖 {b} bosses|<b>{n} 人</b>乱戦 · 最後の 1 人が優勝 · {d} 分 {r} 周 · 🦖 ボス {b} 体|<b>{n}명</b> 난전 · 최후의 1인 승리 · {d}분 {r}회 · 🦖 보스 {b}마리
rpg.ovTitle|🎲 RPG 模式　第 {n} / 32 關|🎲 RPG 模式　第 {n} / 32 关|🎲 RPG Mode  ·  Stage {n} / 32|🎲 RPG モード　第 {n} / 32 面|🎲 RPG 모드　{n} / 32 스테이지
rpg.ovSub|❤️ 生命 {hp}　🛡️ 護甲 {ar}　👟 速度 {sp}%　💥 火力 {rg} 格（傷害 {dm}）|❤️ 生命 {hp}　🛡️ 护甲 {ar}　👟 速度 {sp}%　💥 火力 {rg} 格（伤害 {dm}）|❤️ HP {hp}  ·  🛡️ Armor {ar}  ·  👟 Speed {sp}%  ·  💥 Range {rg} (dmg {dm})|❤️ ライフ {hp}　🛡️ アーマー {ar}　👟 速度 {sp}%　💥 火力 {rg} マス（ダメージ {dm}）|❤️ 생명 {hp}　🛡️ 방어 {ar}　👟 속도 {sp}%　💥 화력 {rg}칸 (피해 {dm})
rpg.go|出發！|出发！|Go!|出発！|출발!
tips.touch|手機觸控：左下圓形搖桿推方向（可 45° 斜走）· 💥 放彈／撿彈／投擲／排線 · 🧨 遙控引爆 · 🔥 恐龍吐火 · <b>🤏 雙指縮放</b> · ⏸ 暫停|手机触控：左下圆形摇杆推方向（可 45° 斜走）· 💥 放弹／捡弹／投掷／排线 · 🧨 遥控引爆 · 🔥 恐龙吐火 · <b>🤏 双指缩放</b> · ⏸ 暂停|Touch: left stick to move (diagonals work) · 💥 bomb / pick up / throw / line · 🧨 remote · 🔥 dino flame · <b>🤏 pinch to zoom</b> · ⏸ pause|タッチ：左下スティックで移動（斜めも可）· 💥 設置／拾う／投げる／連鎖 · 🧨 リモコン · 🔥 恐竜の炎 · <b>🤏 ピンチで拡大縮小</b> · ⏸ 一時停止|터치: 왼쪽 스틱으로 이동(대각선 가능) · 💥 설치/줍기/던지기 · 🧨 원격 · 🔥 공룡 화염 · <b>🤏 두 손가락 확대</b> · ⏸ 일시정지
tips.pad|手把：十字鍵／左蘑菇頭移動 · A 放彈 · X 遙控引爆 · Y 恐龍吐火 · <b>右搖桿上下／LT·RT 縮放</b> · <kbd>ESC</kbd>／Start 暫停|手柄：十字键／左摇杆移动 · A 放弹 · X 遥控引爆 · Y 恐龙吐火 · <b>右摇杆上下／LT·RT 缩放</b> · <kbd>ESC</kbd>／Start 暂停|Pad: D-pad / left stick to move · A bomb · X remote · Y dino flame · <b>right stick up-down / LT·RT zoom</b> · <kbd>ESC</kbd> / Start pause|パッド：十字キー／左スティックで移動 · A 設置 · X リモコン · Y 恐竜の炎 · <b>右スティック上下／LT·RT で拡大縮小</b> · <kbd>ESC</kbd>／Start 一時停止|패드: 십자키/왼쪽 스틱 이동 · A 설치 · X 원격 · Y 공룡 화염 · <b>오른쪽 스틱 상하/LT·RT 확대</b> · <kbd>ESC</kbd>/Start 일시정지
tips.kb|{dirs} 移動 · {act} 放炸彈 · {det} 引爆 · 中鍵／<kbd>Shift</kbd> 衝刺 · {fire} 坐騎招式 · <kbd>1</kbd>／<kbd>2</kbd> 縮放（<kbd>0</kbd> 復原）· 滾輪縮放 · <kbd>ESC</kbd> 暫停（按鍵可在設定自訂）|{dirs} 移动 · {act} 放炸弹 · {det} 引爆 · 中键／<kbd>Shift</kbd> 冲刺 · {fire} 坐骑招式 · <kbd>1</kbd>／<kbd>2</kbd> 缩放（<kbd>0</kbd> 复原）· 滚轮缩放 · <kbd>ESC</kbd> 暂停（按键可在设定自订）|{dirs} move · {act} bomb · {det} detonate · MMB/<kbd>Shift</kbd> dash · {fire} mount skill · <kbd>1</kbd>/<kbd>2</kbd> zoom (<kbd>0</kbd> reset) · wheel zooms · <kbd>ESC</kbd> pause (rebind in Settings)|{dirs} 移動 · {act} 爆弾 · {det} 起爆 · 中ボタン／<kbd>Shift</kbd> ダッシュ · {fire} 乗り物スキル · <kbd>1</kbd>／<kbd>2</kbd> 拡大縮小（<kbd>0</kbd> リセット）· ホイールでも可 · <kbd>ESC</kbd> 一時停止（設定で変更可）|{dirs} 이동 · {act} 폭탄 · {det} 폭파 · 휠클릭／<kbd>Shift</kbd> 대시 · {fire} 탈것 기술 · <kbd>1</kbd>/<kbd>2</kbd> 확대(<kbd>0</kbd> 초기화) · 휠 확대 · <kbd>ESC</kbd> 일시정지 (설정에서 변경)
tips.bombs|走向炸彈：有🥾就踢出去 · 有🥊就打飛 · 有🧤可撿起投擲（越牆飛行，飛出邊界從對側繞回）· 💀骷髏會詛咒你|走向炸弹：有🥾就踢出去 · 有🥊就打飞 · 有🧤可捡起投掷（越墙飞行，飞出边界从对侧绕回）· 💀骷髅会诅咒你|Bump a bomb: 🥾 kicks it · 🥊 punches it · 🧤 picks it up and throws it over walls (wraps at the edge) · 💀 skulls curse you|爆弾に体当たり：🥾 なら蹴る · 🥊 なら打ち飛ばす · 🧤 なら持ち上げて投げる（壁を越え、端は反対側へ）· 💀 ドクロは呪う|폭탄에 부딪히면: 🥾 차기 · 🥊 날리기 · 🧤 들고 던지기(벽을 넘고 끝은 반대편) · 💀 해골은 저주
tips.cart|🛒 復仇推車：被淘汰後坐推車沿場外移動（可回頭，但倒著推很慢），動作鍵把炸彈拋進場內干擾（超級模式炸死人可立刻復活；突死開始時撤離）|🛒 复仇推车：被淘汰后坐推车沿场外移动（可回头，但倒着推很慢），动作键把炸弹抛进场内干扰（超级模式炸死人可立刻复活；突死开始时撤离）|🛒 Revenge cart: after you're out you ride the rails (you can turn back, but pushing in reverse is slow). Action tosses bombs into the arena. Super mode: a kill revives you instantly; the cart leaves when Sudden Death starts.|🛒 復讐カート：脱落後はコース外を移動（逆走は遅い）。アクションで爆弾を場内へ投げ込む（スーパー時は 1 キルで復活、サドンデス開始で退場）|🛒 복수 카트: 탈락 후 외곽을 이동(역주행은 느림). 액션으로 폭탄 투척 (슈퍼 모드에선 1킬 시 부활, 서든데스 시작 시 퇴장)
mn.1|微風草原|微风草原|Breezy Plains|そよ風の草原|산들바람 초원
mn.2|灌木迷宮|灌木迷宫|Shrub Maze|低木の迷路|관목 미로
mn.3|蘑菇林道|蘑菇林道|Mushroom Path|キノコの小道|버섯 숲길
mn.4|湖畔空地|湖畔空地|Lakeside Clearing|湖畔の広場|호숫가 공터
mn.5|流沙沙丘|流沙沙丘|Quicksand Dunes|流砂の砂丘|유사 사구
mn.6|金字塔迴廊|金字塔回廊|Pyramid Corridor|ピラミッド回廊|피라미드 회랑
mn.7|綠洲遺跡|绿洲遗迹|Oasis Ruins|オアシス遺跡|오아시스 유적
mn.8|法老王廳|法老厅|Pharaoh's Hall|ファラオの間|파라오의 방
mn.9|雪原邊界|雪原边界|Snowfield Border|雪原の境界|설원 경계
mn.10|冰柱森林|冰柱森林|Ice Pillar Forest|氷柱の森|고드름 숲
mn.11|凍湖裂隙|冻湖裂隙|Frozen Lake Rift|凍湖の裂け目|얼어붙은 호수 균열
mn.12|極光台地|极光台地|Aurora Plateau|オーロラ台地|오로라 대지
mn.13|熔岩入口|熔岩入口|Lava Entrance|溶岩の入口|용암 입구
mn.14|岩漿吊橋|岩浆吊桥|Magma Bridge|マグマ吊り橋|마그마 현수교
mn.15|火山口|火山口|Crater|火口|화구
mn.16|熔核深處|熔核深处|Molten Core|溶岩の核|용암 핵
mn.17|霓虹大街|霓虹大街|Neon Street|ネオン街|네온 거리
mn.18|電路迷宮|电路迷宫|Circuit Maze|回路迷宮|회로 미로
mn.19|夜店廣場|夜店广场|Club Plaza|クラブ広場|클럽 광장
mn.20|雲端高塔|云端高塔|Sky Tower|雲の塔|구름 탑
mn.21|珊瑚礁群|珊瑚礁群|Coral Reef|サンゴ礁|산호초
mn.22|沉船貨艙|沉船货舱|Sunken Hold|沈没船の船倉|난파선 화물칸
mn.23|海底神殿|海底神殿|Undersea Temple|海底神殿|해저 신전
mn.24|深淵裂口|深渊裂口|Abyss Rift|深淵の裂け目|심연 균열
mn.25|浮空平台|浮空平台|Floating Platform|浮遊平台|부유 발판
mn.26|齒輪高塔|齿轮高塔|Gear Tower|歯車の塔|톱니 탑
mn.27|風之迴廊|风之回廊|Wind Corridor|風の回廊|바람 회랑
mn.28|要塞核心|要塞核心|Fortress Core|要塞の中核|요새 핵
mn.29|魔城大門|魔城大门|Demon Gate|魔城の門|마성의 문
mn.30|血池沼窟|血池沼窟|Blood Marsh|血の沼|핏빛 늪
mn.31|詛咒迴廊|诅咒回廊|Curse Corridor|呪いの回廊|저주 회랑
mn.32|魔王之間|魔王之间|Demon Lord's Chamber|魔王の間|마왕의 방
stage.bossTag|👑 魔王關|👑 魔王关|👑 Boss stage|👑 ボス面|👑 보스 스테이지
boss.1|咩霸 · 牧草巨獸|咩霸 · 牧草巨兽|MEEDA · Grass Titan|メエバ · 牧草の巨獣|메에바 · 목초의 거수
boss.2|妮芙 · 沙蟲女王|妮芙 · 沙虫女王|NIF · Sandworm Queen|ニフ · 砂虫の女王|니프 · 모래벌레 여왕
boss.3|咕嘰 · 冰霜雪人|咕叽 · 冰霜雪人|GUJI · Frost Yeti|グジ · 霜の雪男|구지 · 서리 설인
boss.4|赫菲 · 熔核巨像|赫菲 · 熔核巨像|HEPHI · Magma Colossus|ヘフィ · 溶核の巨像|헤피 · 용암 거상
boss.5|BPM-9 · 電音魔王|BPM-9 · 电音魔王|BPM-9 · Neon Overlord|BPM-9 · ネオン魔王|BPM-9 · 네온 마왕
boss.6|露米 · 深海海妖|露米 · 深海海妖|LUMI · Abyss Siren|ルミ · 深海のセイレーン|루미 · 심해 세이렌
boss.7|疾空 · 風暴鷹王|疾空 · 风暴鹰王|JIKU · Storm Eagle King|ジクウ · 嵐の鷹王|지쿠 · 폭풍 매왕
boss.8|黯 · 魔王|黯 · 魔王|AN · Dark Lord|アン · 魔王|안 · 마왕
learn.tag|新手教學|新手教学|Tutorial|チュートリアル|튜토리얼
learn.title|🎓 新手教學|🎓 新手教学|🎓 Tutorial|🎓 チュートリアル|🎓 튜토리얼
learn.desc|第一次玩？照著做一輪就會了。想直接查功能，往下打開「功能總覽」。|第一次玩？照着做一轮就会了。想直接查功能，往下打开「功能总览」。|First time? One guided run and you've got it. Need a specific feature? Open the Feature Guide below.|初めて？1 回なぞれば覚えられます。機能を調べたいときは下の「機能一覧」を開いてください。|처음인가요? 한 번 따라 하면 끝. 기능을 찾으려면 아래 '기능 안내'를 여세요.
learn.start|▶ 一步一步帶我玩（約 5 分鐘）|▶ 一步一步带我玩（约 5 分钟）|▶ Walk me through it (~5 min)|▶ 順番に案内して（約 5 分）|▶ 단계별로 알려줘 (약 5분)
learn.sub|① 首頁導覽 → ② 實戰演練 → 直接進第 1 關<br>每一步都可以「跳過」，隨時關掉也沒關係|① 首页导览 → ② 实战演练 → 直接进第 1 关<br>每一步都可以「跳过」，随时关掉也没关系|① Home tour → ② Live practice → straight into stage 1<br>Every step can be skipped — close it any time.|① ホーム案内 → ② 実戦練習 → そのままステージ 1 へ<br>どの手順も「スキップ」でき、いつ閉じても大丈夫。|① 홈 안내 → ② 실전 연습 → 바로 1스테이지<br>모든 단계는 건너뛸 수 있고 언제든 닫아도 됩니다.
learn.btnSub|一步一步帶你玩 · 約 5 分鐘|一步一步带你玩 · 约 5 分钟|Step by step · about 5 min|順番に案内 · 約 5 分|단계별 안내 · 약 5분
learn.replay|想複習再玩一次|想复习再玩一次|Replay the tour|もう一度おさらい|다시 복습하기
learn.quick|3 分鐘帶你玩一輪|3 分钟带你玩一轮|A 3-minute tour|3 分で一周案内|3분이면 한 바퀴
learn.done|✓ 已完成|✓ 已完成|✓ Done|✓ 完了|✓ 완료
learn.todo|未完成|未完成|Not done|未完了|미완료
learn.homeTab|介面導覽|界面导览|Home tour|画面案内|화면 안내
learn.playTab|實戰演練|实战演练|Live practice|実戦練習|실전 연습
tut.home|🏠 回主選單|🏠 回主菜单|🏠 Main menu|🏠 メニューへ|🏠 메인 메뉴
tut.prev|← 上一步|← 上一步|← Back|← 前へ|← 이전
tut.start|▶ 開始第 1 關|▶ 开始第 1 关|▶ Start stage 1|▶ ステージ 1 へ|▶ 1스테이지 시작
tut.skip|跳過這步 →|跳过这步 →|Skip this step →|この手順を飛ばす →|이 단계 건너뛰기 →
tut.toPlay|接著實戰演練 →|接着实战演练 →|On to live practice →|実戦練習へ →|실전 연습으로 →
tut.next|下一步 →|下一步 →|Next →|次へ →|다음 →
br.startTeams|{a} 隊 · {d} 分鐘 · 隊友不會互炸|{a} 队 · {d} 分钟 · 队友不会互炸|{a} squads · {d} min · no friendly fire|{a} チーム · {d} 分 · 同士討ちなし|{a}팀 · {d}분 · 팀원 오사 없음
br.startSolo|{n} 人混戰 · {d} 分鐘 · 最後活著的奪冠|{n} 人混战 · {d} 分钟 · 最后活着的夺冠|{n}-player chaos · {d} min · last one standing|{n} 人乱戦 · {d} 分 · 最後の 1 人が優勝|{n}명 난전 · {d}분 · 최후의 1인 승리
br.ovTitle|🏝️ 大逃殺 · 隨機大陸|🏝️ 大逃杀 · 随机大陆|🏝️ Battle Royale · Random continent|🏝️ バトロワ · ランダム大陸|🏝️ 배틀로얄 · 랜덤 대륙
br.ovSub|{w}×{h} 的隨機地圖（八種地形各佔一區） · {n} 人同場 · {f} 隻小怪{b}\\n毒圈 {d} 分鐘收 {d} 次；躲進草叢／破屋 AI 看不到你。撐到最後一個人就是冠軍。|{w}×{h} 的随机地图（八种地形各占一区） · {n} 人同场 · {f} 只小怪{b}\\n毒圈 {d} 分钟收 {d} 次；躲进草丛／破屋 AI 看不到你。撑到最后一个人就是冠军。|{w}×{h} random map (eight biomes, one per zone) · {n} players · {f} minions{b}\\nThe zone closes {d} times in {d} min. Hide in bushes or ruins — AI can't see you. Last one standing wins.|{w}×{h} のランダムマップ（8 地形が 1 区ずつ） · {n} 人 · 雑魚 {f} 体{b}\\n毒圏は {d} 分で {d} 回縮小。草むら／廃屋に隠れれば AI に見つからない。最後の 1 人が優勝。|{w}×{h} 랜덤 맵(8가지 지형이 한 구역씩) · {n}명 · 잡몹 {f}마리{b}\\n독장은 {d}분에 {d}번 축소. 풀숲/폐가에 숨으면 AI가 못 봅니다. 최후의 1인이 우승.
br.ovSubBoss|＋{b} 隻亂入 BOSS（打倒可騎恐龍）|＋{b} 只乱入 BOSS（打倒可骑恐龙）|  + {b} roaming bosses (beat one, ride the dino)|＋乱入ボス {b} 体（倒すと恐竜に騎乗）|＋난입 보스 {b}마리 (잡으면 공룡 탑승)
br.ovGo|出發（存活 {n} 人）|出发（存活 {n} 人）|Deploy ({n} alive)|出発（生存 {n} 人）|출발 (생존 {n}명)
foe.ground|走在地上（會被牆擋住），|走在地上（会被墙挡住），|Walks on the ground (walls block it). |地上を歩く（壁に阻まれる）。|지상 이동(벽에 막힘). 
foe.fly|飛在空中（可以越過牆壁），|飞在空中（可以越过墙壁），|Flies (passes over walls). |空を飛ぶ（壁を越える）。|비행(벽 통과). 
foe.chase|會主動追人|会主动追人|It hunts you down. |自分から追ってくる。|먼저 쫓아온다. 
foe.roam|自己亂走|自己乱走|It just wanders. |自分でうろつく。|그냥 돌아다닌다. 
foe.extra.scavenger|，還會把你放的炸彈撿起來丟回去|，还会把你放的炸弹捡起来丢回去|, and it picks up your bombs and hurls them back|、置いた爆弾を拾って投げ返してくる|, 폭탄을 주워 되던진다
foe.extra.sapper|，會拆掉附近的炸彈|，会拆掉附近的炸弹|, and it defuses nearby bombs|、近くの爆弾を解除する|, 근처 폭탄을 해체한다
foe.extra.bomber|，自己會放炸彈（火焰只有 1 格）|，自己会放炸弹（火焰只有 1 格）|, and it drops its own bombs (1-tile flame)|、自分で爆弾を置く（炎は 1 マス）|, 스스로 폭탄을 놓는다(화염 1칸)
foe.extra.smart|，還會找掩體躲炸彈|，还会找掩体躲炸弹|, and it hides behind cover from bombs|、物陰に隠れて爆弾を避ける|, 엄폐물에 숨어 폭탄을 피한다
foe.tierLow|。節奏慢，適合練手感。|。节奏慢，适合练手感。| Slow-paced — good for practice.|。のんびりしていて練習向き。| 느긋해서 연습하기 좋다.
foe.tierMid|。被盯上會先生氣、再加速撲過來。|。被盯上会先生气、再加速扑过来。| It gets angry first, then lunges faster.|。見つかると怒ってから加速して突っ込んでくる。| 먼저 화를 내고 가속해 달려든다.
foe.tierHigh|。被盯上會先蓄力再加速撲過來 —— 不好惹。|。被盯上会先蓄力再加速扑过来 —— 不好惹。| It charges up, then lunges — handle with care.|。見つかると溜めてから加速して突っ込む — 手強い。| 힘을 모은 뒤 가속해 달려든다 — 만만치 않다.
foe.habit| <b>習性</b>：{x}。| <b>习性</b>：{x}。| <b>Habit</b>: {x}.| <b>習性</b>：{x}。| <b>습성</b>: {x}.
foe.skill| <b>特殊技能</b>：{x}。| <b>特殊技能</b>：{x}。| <b>Special</b>: {x}.| <b>特殊技能</b>：{x}。| <b>특수 능력</b>: {x}.
foe.aura| 身上纏著<b>{x}</b>。| 身上缠着<b>{x}</b>。| Wreathed in <b>{x}</b>.| 身に<b>{x}</b>をまとっている。| <b>{x}</b>이 감싸고 있다.
foe.skillName| <b>招式</b>：{x}。| <b>招式</b>：{x}。| <b>Move</b>: {x}.| <b>技</b>：{x}。| <b>기술</b>: {x}.
sk.split|分裂|分裂|Split|分裂|분열
sk.charge|衝撞|冲撞|Charge|突進|돌진
sk.spit|吐彈|吐弹|Spit shot|弾吐き|탄 뱉기
sk.blink|瞬移|瞬移|Blink|瞬間移動|순간이동
sk.hazard|毒地板|毒地板|Poison floor|毒の床|독 장판
sk.smart|追擊|追击|Hunter|追跡|추격
sk.pull|勾拉|勾拉|Hook pull|引き寄せ|끌어당기기
sk.stun|催眠凝視|催眠凝视|Sleep gaze|催眠|최면
sk.roller|滾石|滚石|Boulder roll|岩転がし|바위 굴리기
sk.dive|俯衝轟炸|俯冲轰炸|Dive bomb|急降下|급강하
sk.gust|吹風推擠|吹风推挤|Gust push|突風|돌풍
sk.bomber|投擲炸彈|投掷炸弹|Bomb toss|爆弾投げ|폭탄 투척
sk.pulse|震波|震波|Shockwave|衝撃波|충격파
sk.scavenger|撿食道具|捡食道具|Scavenge|拾い食い|먹이 탐색
sk.beam|貫穿光束|贯穿光束|Laser beam|光線|광선
sk.chain|連鎖電擊|连锁电击|Chain lightning|連鎖電撃|연쇄 번개
sk.homing|追蹤彈|追踪弹|Homing shot|追尾弾|유도탄
sk.summon|召喚同伴|召唤同伴|Summon|召喚|소환
sk.swoop|滑翔撲擊|滑翔扑击|Swoop|滑空|활공
sk.sapper|埋設陷阱|埋设陷阱|Plant trap|罠設置|지뢰 매설
sk.curse|詛咒|诅咒|Curse|呪い|저주
fx.fire|火焰|火焰|flame|炎|불꽃
fx.ice|冰霜|冰霜|frost|氷|서리
fx.thunder|雷電|雷电|lightning|雷|번개
fx.dark|暗黑邪氣|暗黑邪气|dark aura|闇の気|어둠의 기운
fx.water|水霧|水雾|mist|水霧|물안개
fx.wind|疾風|疾风|gale|疾風|돌풍
fx.neon|霓虹|霓虹|neon|ネオン|네온
fx.poison|毒霧|毒雾|poison mist|毒の霧|독안개
fx.earth|砂塵|砂尘|sand|砂塵|모래먼지
fx.nature|自然氣息|自然气息|nature|自然の気|자연의 기운
br.btnTop|大逃殺|大逃杀|Battle Royale|バトロワ|배틀로얄
br.btnTopSub|推薦測試遊玩|推荐测试游玩|Recommended|テストおすすめ|테스트 추천
learn.badge|推薦先玩|推荐先玩|Start here|まずはこれ|먼저 해보세요
side.left|左|左|left|左|왼쪽
side.right|右|右|right|右|오른쪽
hint.tpad.slide|目前：<b>隱形滑動區</b>在<b>{s}半邊</b>——手指按在那一半的任意空白處就往那個方向走，區內沒有任何圖示（滑多遠都不會斷）。放彈鍵在<b>{a}</b> · 大小<b>{z}</b>。|目前：<b>隐形滑动区</b>在<b>{s}半边</b>——手指按在那一半的任意空白处就往那个方向走，区内没有任何图示（滑多远都不会断）。放弹键在<b>{a}</b> · 大小<b>{z}</b>。|Now: <b>invisible slide pad</b> on the <b>{s} half</b> — press anywhere on that half and you walk that way, with no icons at all (no dead zones). Bomb button: <b>{a}</b> · size <b>{z}</b>.|現在：<b>透明スライド領域</b>は<b>{s}半分</b>——その半分のどこを押してもその方向へ歩く（アイコンなし・切れない）。爆弾ボタンは<b>{a}</b> · サイズ<b>{z}</b>。|현재: <b>투명 슬라이드 영역</b>이 <b>{s} 절반</b> — 그 절반 아무 곳이나 누르면 그 방향으로 이동(아이콘 없음, 끊김 없음). 폭탄 버튼 <b>{a}</b> · 크기 <b>{z}</b>.
hint.tpad.stick|目前：<b>虛擬搖桿</b>在<b>{s}</b>邊 · 放彈鍵在<b>{a}</b> · 大小<b>{z}</b>{c}。這些按鈕只在「手機觸控」模式顯示。|目前：<b>虚拟摇杆</b>在<b>{s}</b>边 · 放弹键在<b>{a}</b> · 大小<b>{z}</b>{c}。这些按钮只在「手机触控」模式显示。|Now: <b>virtual stick</b> on the <b>{s}</b> · bomb button <b>{a}</b> · size <b>{z}</b>{c}. These buttons only show in Touch mode.|現在：<b>バーチャルスティック</b>は<b>{s}</b> · 爆弾ボタン<b>{a}</b> · サイズ<b>{z}</b>{c}。これらのボタンはタッチモードのみ表示。|현재: <b>가상 조이스틱</b> <b>{s}</b> · 폭탄 버튼 <b>{a}</b> · 크기 <b>{z}</b>{c}. 이 버튼은 터치 모드에서만 보입니다.
hint.tpad.custom| · 已自訂位置| · 已自定义位置| · custom position| · 位置をカスタム済み| · 위치 사용자 지정
z1|慢吞吞地亂走，一群一群擠在一起|慢吞吞地乱走，一群一群挤在一起|Wanders slowly, always in clumps.|のろのろ歩き回り、いつも群れで固まる|느릿느릿 돌아다니며 무리 지어 몰려다닌다
z2|被炸倒會分裂成兩隻小史萊姆|被炸倒会分裂成两只小史莱姆|Splits into two slimes when blasted.|爆発で倒すと小さなスライム2体に分裂する|폭발로 쓰러지면 작은 슬라임 두 마리로 갈라진다
z3|蹦蹦跳跳地靠近，跳得比走得快|蹦蹦跳跳地靠近，跳得比走得快|Hops closer — it leaps faster than it walks.|ぴょんぴょん跳ねて近づく。跳ねる方が歩くより速い|깡충깡충 다가오며, 걷는 것보다 뛰는 게 빠르다
z4|鎖定你之後會直線撲撞|锁定你之后会直线扑撞|Locks on, then charges in a straight line.|狙いを定めると一直線に突っ込んでくる|너를 포착하면 일직선으로 돌진한다
z5|蹲著不太動，舌頭一彈就是水彈|蹲着不太动，舌头一弹就是水弹|Crouches still; one flick and a water bomb flies.|しゃがんで殆ど動かず、舌を弾くと水弾が飛んでくる|쭈그려 거의 움직이지 않고, 혀를 튕기면 물폭탄이 날아온다
z6|朝你站的格子吐水彈（有落點提示）|朝你站的格子吐水弹（有落点提示）|Spits a water bomb at your tile (impact shown).|君の立つマスへ水弾を吐く（着弾点が表示される）|네가 선 칸으로 물폭탄을 뱉는다 (착탄 지점 표시)
z7|一節一節慢慢爬，鑽進落葉底下就不見了|一节一节慢慢爬，钻进落叶底下就不见了|Crawls inch by inch; vanishes under the leaves.|一節ずつゆっくり進み、落ち葉の下に潜ると消える|한 마디씩 느리게 기어가고, 낙엽 밑으로 들어가면 사라진다
z8|鑽土：消失一下，再從你旁邊冒出來|钻土：消失一下，再从你旁边冒出来|Burrows: disappears, then pops up beside you.|土遁：一度消えて、君の隣から出てくる|땅굴: 잠깐 사라졌다가 네 옆에서 솟아난다
z9|孢子一團一團飄，走得像在散步|孢子一团一团飘，走得像在散步|Drifts in puffs of spores, strolling along.|胞子の塊でふわふわ漂い、散歩するように動く|포자 덩어리로 떠다니며 산책하듯 움직인다
z10|吐出毒孢彈，被打到會晃一下|吐出毒孢弹，被打到会晃一下|Spits poison spores that make you wobble.|毒胞子弾を吐く。当たると一瞬よろける|독포자탄을 뱉고, 맞으면 잠깐 휘청인다
z11|硬甲很重，走直線不太轉彎|硬甲很重，走直线不太转弯|Heavy armour — walks straight, rarely turns.|固い甲羅が重く、まっすぐ歩いて滅多に曲がらない|단단한 갑옷이 무거워 직선으로 걷고 잘 돌지 않는다
z12|看到你放炸彈會找石柱躲起來|看到你放炸弹会找石柱躲起来|Hides behind pillars when you drop a bomb.|君が爆弾を置くと石柱の陰に隠れる|네가 폭탄을 놓으면 돌기둥 뒤로 숨는다
z13|橫著走，路線很難抓|横着走，路线很难抓|Walks sideways; its path is hard to read.|横歩きで動くので進路が読みにくい|옆으로 걸어서 경로를 예측하기 어렵다
z14|側身夾擊：橫向突然加速撞人|侧身夹击：横向突然加速撞人|Side-swipe: suddenly accelerates sideways.|側面挟撃：横に急加速して体当たり|측면 협격: 옆으로 갑자기 가속해 들이받는다
z15|繃帶很厚，動作慢但很會繞路|绷带很厚，动作慢但很会绕路|Thick bandages: slow, but great at flanking.|包帯が分厚くて鈍足だが、回り込みが上手い|붕대가 두꺼워 느리지만 우회를 잘한다
z16|會判斷炸彈範圍，躲到牆後|会判断炸弹范围，躲到墙后|Reads the blast range and hides behind walls.|爆風の範囲を読み、壁の裏に隠れる|폭발 범위를 판단해 벽 뒤로 숨는다
z17|飄在半空盯著你看，越看越暈|飘在半空盯着你看，越看越晕|Hovers and stares — the longer, the dizzier.|宙に浮いて見つめてくる。見られるほど眩む|공중에 떠서 쳐다본다. 볼수록 어지럽다
z18|目光催眠：靠近會被定住一下|目光催眠：靠近会被定住一下|Gaze: get close and you freeze briefly.|視線催眠：近づくと一瞬動けなくなる|시선 최면: 가까이 가면 잠깐 굳는다
z19|在沙子裡鑽進鑽出，只看得到沙痕|在沙子里钻进钻出，只看得到沙痕|Dives in and out of sand — only ripples show.|砂に潜ったり出たり。見えるのは砂の跡だけ|모래를 들락날락한다. 보이는 건 모래 자국뿐
z20|鑽沙潛行，從你附近的沙面衝出來|钻沙潜行，从你附近的沙面冲出来|Burrows, then erupts from the sand near you.|砂に潜んで進み、近くの砂面から飛び出す|모래 속을 잠행해 가까운 모래에서 튀어나온다
z21|低著頭一步一步走，像一台小推土機|低着头一步一步走，像一台小推土机|Head down, step by step, like a tiny bulldozer.|うつむいて一歩ずつ。小さなブルドーザーのよう|고개 숙이고 한 걸음씩. 작은 불도저 같다
z22|沙丘衝撞：撞到牆才停|沙丘冲撞：撞到墙才停|Dune charge: stops only at a wall.|砂丘突進：壁にぶつかるまで止まらない|모래언덕 돌진: 벽에 부딪혀야 멈춘다
z23|翹著尾巴橫行，喜歡保持距離|翘着尾巴横行，喜欢保持距离|Tail up, sidling — it likes its distance.|尻尾を立てて横歩き。距離を取るのが好き|꼬리를 세우고 옆으로 걷는다. 거리 두기를 좋아한다
z24|尾針射毒（有落點提示）|尾针射毒（有落点提示）|Stinger shot (impact shown).|尾針で毒を撃つ（着弾点が表示される）|꼬리침으로 독을 쏜다 (착탄 지점 표시)
z25|搖搖擺擺走路，偶爾趴下來滑|摇摇摆摆走路，偶尔趴下来滑|Waddles along, sometimes slides on its belly.|よちよち歩き、時々うつ伏せで滑る|뒤뚱뒤뚱 걷다가 가끔 배로 미끄러진다
z26|貼地滑行撞擊，滑過去看起來很快|贴地滑行撞击，滑过去看起来很快|Belly-slide charge — looks fast in motion.|地を這うように滑って体当たり。動きが速く見える|땅에 붙어 미끄러지며 들이받는다. 지나갈 때 매우 빨라 보인다
z27|一步一閃，身體會自己發亮|一步一闪，身体会自己发亮|Flickers with each step; its body glows.|一歩ごとに明滅し、体が自然に光る|한 걸음마다 깜빡이고 몸이 스스로 빛난다
z28|射冰晶，被打到會冷得動不了|射冰晶，被打到会冷得动不了|Fires ice shards that chill you stiff.|氷晶を撃つ。当たると凍えて動けなくなる|얼음 결정을 쏜다. 맞으면 얼어서 못 움직인다
z29|直線亂飛，撞到邊界就反彈|直线乱飞，撞到边界就反弹|Flies in straight lines, bouncing off edges.|直線的に飛び回り、端に当たると跳ね返る|직선으로 날아다니다 경계에 부딪히면 튕긴다
z30|穿牆飛行（躲牆後沒用）|穿墙飞行（躲墙后没用）|Phases through walls — hiding is useless.|壁をすり抜けて飛ぶ（壁の裏に隠れても無駄）|벽을 통과해 난다 (벽 뒤에 숨어도 소용없다)
z31|滾來滾去，越滾越圓|滚来滚去，越滚越圆|Rolls about, getting rounder as it goes.|ころころ転がり、転がるほど丸くなる|데굴데굴 굴러다니고 굴릴수록 둥글어진다
z32|炸開會變成兩顆小雪球|炸开会变成两颗小雪球|Splits into two snowballs when blasted.|爆発すると小雪玉2個に分かれる|터지면 작은 눈덩이 두 개로 갈라진다
z33|拍著鰭慢慢挪，看起來很無害|拍着鳍慢慢挪，看起来很无害|Flaps along harmlessly — or so it seems.|ひれでゆっくり進む。無害そうに見える|지느러미로 느리게 움직인다. 해 없어 보인다
z34|拍手吹出冷風，把你往後推一格|拍手吹出冷风，把你往后推一格|Claps a cold gust that shoves you back a tile.|手を叩いて冷風を起こし、1マス押し戻す|손뼉으로 찬 바람을 일으켜 한 칸 밀어낸다
z35|圓滾滾、超慢，但真的很胖|圆滚滚、超慢，但真的很胖|Round, very slow, and very fat.|まん丸で超鈍足、でも本当に太っている|둥글둥글 아주 느리지만 정말 뚱뚱하다
z36|滾過來壓人，被壓到會退一步|滚过来压人，被压到会退一步|Rolls over you and knocks you back.|転がって押しつぶす。踏まれると1マス下がる|굴러와 짓누른다. 깔리면 한 칸 밀린다
z37|身體一直在冒泡，走過的痕跡會發亮|身体一直在冒泡，走过的痕迹会发亮|Always bubbling; its trail glows.|体中が泡立っていて、通った跡が光る|몸에서 계속 거품이 나고 지나간 자국이 빛난다
z38|炸開會濺出兩隻小火苗|炸开会溅出两只小火苗|Bursts into two little flames.|爆発すると小さな炎2つが飛び散る|터지면 작은 불꽃 두 개가 튄다
z39|鑽進岩漿裡，只露出一截背|钻进岩浆里，只露出一截背|Sinks into lava with only its back showing.|溶岩に潜り、背中だけ出している|용암에 잠겨 등만 내놓고 있다
z40|潛進岩漿再從你旁邊冒出來|潜进岩浆再从你旁边冒出来|Dives into lava and rises next to you.|溶岩に潜って、君の隣から出てくる|용암에 잠겼다가 네 옆에서 솟아난다
z41|飛得很快，繞著你打轉|飞得很快，绕着你打转|A fast flyer, circling you.|飛ぶのが速く、君の周りを旋回する|아주 빨리 날며 네 주위를 맴돈다
z42|射毒針（有落點提示）|射毒针（有落点提示）|Poison needle (impact shown).|毒針を撃つ（着弾点が表示される）|독침을 쏜다 (착탄 지점 표시)
z43|背著一整袋炸彈，走起來鏗鏗響|背着一整袋炸弹，走起来铿铿响|Carries a sack of bombs that clanks.|爆弾の袋を背負っていて、歩くとカチャカチャ鳴る|폭탄 자루를 메고 다녀 걸을 때 쨍그랑 소리가 난다
z44|自己放炸彈（火焰 1 格）|自己放炸弹（火焰 1 格）|Drops its own bombs (1-tile flame).|自分で爆弾を置く（炎は1マス）|스스로 폭탄을 놓는다 (화염 1칸)
z45|貼著地面高速衝刺，煞不住|贴着地面高速冲刺，煞不住|Ground-hugging sprint with no brakes.|地面すれすれを高速で突進。止まれない|지면에 붙어 고속 돌진하고 못 멈춘다
z46|全場最快的直線衝鋒|全场最快的直线冲锋|The fastest straight-line charge around.|場内最速の直線突進|맵에서 가장 빠른 직선 돌진
z47|石頭做的身體，每一步都碰碰響|石头做的身体，每一步都碰碰响|Stone body — every step thuds.|石の体で、一歩ごとにドスンと響く|돌로 된 몸이라 한 걸음마다 쿵쿵 소리가 난다
z48|丟石塊砸你站的格子|丢石块砸你站的格子|Hurls a rock at the tile you stand on.|石を投げて君の立つマスを潰す|돌을 던져 네가 선 칸을 내리친다
z49|飄忽不定，像一團會呼吸的火|飘忽不定，像一团会呼吸的火|Flickers like a breathing flame.|ふらつく動き。息をする炎のよう|흔들흔들, 숨 쉬는 불꽃 같다
z50|瞬間移動，抓不到牠的位置|瞬间移动，抓不到它的位置|Teleports — you can't pin it down.|瞬間移動するので位置が掴めない|순간이동해서 위치를 잡을 수 없다
z51|鬼鬼祟祟，專門跟在炸彈後面|鬼鬼祟祟，专门跟在炸弹后面|Sneaky — it trails after your bombs.|こそこそと爆弾の後ろをつけてくる|살금살금 폭탄 뒤를 따라다닌다
z52|把你的炸彈撿起來丟回你身上|把你的炸弹捡起来丢回你身上|Grabs your bomb and hurls it back.|君の爆弾を拾って投げ返してくる|네 폭탄을 집어 너에게 되던진다
z53|機械式前進，一步一格|机械式前进，一步一格|Marches mechanically, one tile at a time.|機械的に前進。一歩で1マス|기계적으로 전진, 한 걸음에 한 칸
z54|直線衝撞，撞牆才停下|直线冲撞，撞墙才停下|Charges straight; only walls stop it.|直線突進。壁に当たるまで止まらない|직선 돌진, 벽에 부딪혀야 멈춘다
z55|跟著節拍抖動，全身是霓虹燈|跟着节拍抖动，全身是霓虹灯|Pulses to the beat, all neon.|ビートに合わせて震え、体中がネオン|박자에 맞춰 떨리고 온몸이 네온이다
z56|射出音波彈（有落點提示）|射出音波弹（有落点提示）|Sound-wave shot (impact shown).|音波弾を撃つ（着弾点が表示される）|음파탄을 쏜다 (착탄 지점 표시)
z57|懸停在空中校準，光點會先亮起來|悬停在空中校准，光点会先亮起来|Hovers to aim; a dot lights up first.|空中で停止して照準。先に光点が灯る|공중에 멈춰 조준하고 먼저 빛점이 켜진다
z58|雷射射擊，落點會先顯示|雷射射击，落点会先显示|Laser shot — the impact point shows first.|レーザー射撃。着弾点が先に表示される|레이저 사격, 착탄 지점이 먼저 표시된다
z59|走路帶電流聲，像一台巡邏機|走路带电流声，像一台巡逻机|Buzzes with current, like a patrol drone.|電流音を立てて歩く。巡回ドローンのよう|전류 소리를 내며 걷는다. 순찰 드론 같다
z60|召喚巡邏小機兵（場上最多 12 隻）|召唤巡逻小机兵（场上最多 12 只）|Summons patrol drones (max 12).|巡回マシンを召喚（場に最大12体）|순찰 병기를 소환한다 (최대 12기)
z61|八條觸手在地上爬，看不出方向|八条触手在地上爬，看不出方向|Eight tentacles crawl — no clear heading.|8本の触手で這うので進行方向が読めない|여덟 개 촉수로 기어서 방향을 알 수 없다
z62|觸手橫掃，把你推開一格|触手横扫，把你推开一格|Tentacle sweep knocks you back a tile.|触手で薙ぎ払い、1マス押し出される|촉수로 쓸어 한 칸 밀어낸다
z63|提著燈籠慢慢靠近，燈光很催眠|提着灯笼慢慢靠近，灯光很催眠|Creeps closer with a hypnotic lantern.|提灯を持ってゆっくり近づく。灯りは催眠的|등불을 들고 천천히 다가온다. 빛이 최면을 건다
z64|燈光催眠：被照到會頭暈一下|灯光催眠：被照到会头晕一下|Lantern gaze: caught in it, you get dizzy.|灯りの催眠：照られると一瞬ふらつく|등불 최면: 빛에 닿으면 잠깐 어지럽다
z65|半透明地飄，穿牆而過|半透明地飘，穿墙而过|Drifts translucent, straight through walls.|半透明で漂い、壁をすり抜ける|반투명하게 떠다니며 벽을 통과한다
z66|穿牆瞬移，突然出現在你旁邊|穿墙瞬移，突然出现在你旁边|Phases in right next to you.|壁を抜けて瞬間移動し、いきなり隣に現れる|벽을 뚫고 순간이동해 갑자기 옆에 나타난다
z67|揹著殼慢慢走，遇到危險就縮進去|背着壳慢慢走，遇到危险就缩进去|Carries a shell and hides in it when scared.|殻を背負って歩き、危ないと中に隠れる|껍데기를 지고 걷다가 위험하면 숨는다
z68|躲炸彈：會退到安全格|躲炸弹：会退到安全格|Dodges bombs — backs onto safe tiles.|爆弾を避ける：安全なマスへ下がる|폭탄을 피한다: 안전한 칸으로 물러난다
z69|一縮一放地漂，觸手帶著靜電|一缩一放地漂，触手带着静电|Pulses along, tentacles crackling.|縮んだり伸びたりしながら漂い、触手に静電気|오므렸다 폈다 하며 떠다니고 촉수에 정전기가 흐른다
z70|放電攻擊，落點會先閃電光|放电攻击，落点会先闪电光|Shock attack — the target crackles first.|放電攻撃。着弾点が先に光る|방전 공격, 착탄 지점이 먼저 번쩍인다
z71|全身是刺，滾動起來像顆刺球|全身是刺，滚动起来像颗刺球|Covered in spikes, rolls up like a ball.|体中がトゲだらけ。転がるとトゲの玉|온몸이 가시투성이라 굴러가면 가시 공이 된다
z72|旋轉衝刺，撞到人會彈開|旋转冲刺，撞到人会弹开|Spin-dash; it bounces off whoever it hits.|回転突進。人に当たると弾かれる|회전 돌진, 사람에 부딪히면 튕겨 나간다
z73|翅膀聲很大，速度快得看不清|翅膀声很大，速度快得看不清|Loud wings, too fast to follow.|羽音が大きく、速すぎて目で追えない|날갯소리가 크고 너무 빨라 눈으로 못 쫓는다
z74|高速俯衝，衝完會停一下|高速俯冲，冲完会停一下|High-speed dive, then a short pause.|高速で急降下し、突進後は少し止まる|고속 급강하 후 잠깐 멈춘다
z75|慢慢飄，肚子底下掛著一顆雷彈|慢慢飘，肚子底下挂着一颗雷弹|Drifts slowly with a thunder bomb beneath.|ゆっくり漂い、お腹の下に雷弾を下げている|천천히 떠다니며 배 밑에 번개탄을 매달고 있다
z76|投下雷彈（有落點提示）|投下雷弹（有落点提示）|Drops a thunder bomb (impact shown).|雷弾を落とす（着弾点が表示される）|번개탄을 투하한다 (착탄 지점 표시)
z77|低著頭找炸彈，動作很機械|低着头找炸弹，动作很机械|Head down, hunting bombs mechanically.|うつむいて爆弾を探す。動きは機械的|고개 숙이고 폭탄을 찾는다. 움직임이 기계적
z78|拆掉你的炸彈（拆掉不會爆）|拆掉你的炸弹（拆掉不会爆）|Defuses your bombs (no explosion).|君の爆弾を解体する（解体されると爆発しない）|네 폭탄을 해체한다 (해체되면 터지지 않는다)
z79|浮在空中滋滋作響，越靠近越亮|浮在空中滋滋作响，越靠近越亮|Hovers crackling, brighter as you near.|宙に浮いてバチバチ鳴り、近づくほど明るい|공중에 떠서 지지직거리고 가까울수록 밝다
z80|落雷：在你附近打下一道雷|落雷：在你附近打下一道雷|Strike: calls lightning down near you.|落雷：君の近くに雷を落とす|낙뢰: 네 근처에 번개를 떨어뜨린다
z81|被風推著飄，路線是弧線|被风推着飘，路线是弧线|Rides the wind in arcs.|風に押されて漂い、軌道は弧を描く|바람에 밀려 떠다니고 경로가 곡선이다
z82|吹出強風把你往後推|吹出强风把你往后推|Blows a gust that pushes you back.|強風を吹いて君を後ろへ押す|강풍을 불어 너를 뒤로 밀어낸다
z83|在高空盤旋，突然收翅俯衝|在高空盘旋，突然收翅俯冲|Circles high, then folds its wings and dives.|高空で旋回し、突然翼を畳んで急降下|높이 맴돌다 갑자기 날개를 접고 급강하
z84|俯衝撞擊，速度是全場最快|俯冲撞击，速度是全场最快|Dive attack — the fastest thing on the map.|急降下で体当たり。場内最速|급강하 충돌, 맵에서 가장 빠르다
z85|喀啦喀啦地衝過來，速度偏快|喀啦喀啦地冲过来，速度偏快|Rattles in fast.|ガチャガチャ音を立てて速めに突っ込んでくる|덜컹덜컹 소리를 내며 빠르게 돌진한다
z86|骨頭衝撞，被撞到會後退|骨头冲撞，被撞到会后退|Bone charge knocks you back.|骨で体当たり。当たると後退する|뼈로 들이받고 맞으면 뒤로 밀린다
z87|蹦來蹦去，笑聲很吵|蹦来蹦去，笑声很吵|Bounces about with a loud cackle.|ぴょんぴょん跳ね回り、笑い声がうるさい|깡충깡충 뛰어다니고 웃음소리가 시끄럽다
z88|瞬移突襲，會出現在你身後|瞬移突袭，会出现在你身后|Blink ambush — right behind you.|瞬間移動で奇襲。君の背後に現れる|순간이동 기습, 네 뒤에 나타난다
z89|成群飛舞，翅膀帶著黑霧|成群飞舞，翅膀带着黑雾|Swarms around, wings trailing black mist.|群れで飛び回り、羽から黒い霧が流れる|떼 지어 날아다니고 날개에서 검은 안개가 흐른다
z90|射暗影彈（有落點提示）|射暗影弹（有落点提示）|Shadow bolt (impact shown).|影の弾を撃つ（着弾点が表示される）|그림자탄을 쏜다 (착탄 지점 표시)
z91|邊走邊念咒，帽尖會發光|边走边念咒，帽尖会发光|Chants as it walks, hat tip glowing.|歩きながら呪文を唱え、帽子の先が光る|걸으면서 주문을 외우고 모자 끝이 빛난다
z92|魔法彈，落點會先亮起符文|魔法弹，落点会先亮起符文|Magic bolt — runes mark the impact first.|魔法弾。着弾点に先にルーンが浮かぶ|마법탄, 착탄 지점에 먼저 룬이 뜬다
z93|站得直挺挺，守在王座前面|站得直挺挺，守在王座前面|Stands tall, guarding the throne.|まっすぐ立って王座の前に陣取る|꼿꼿이 서서 왕좌 앞을 지킨다
z94|召喚骷髏衛兵（場上最多 12 隻）|召唤骷髅卫兵（场上最多 12 只）|Summons skeleton guards (max 12).|骸骨の衛兵を召喚（場に最大12体）|해골 경비병을 소환한다 (최대 12마리)
z95|盔甲底下什麼都沒有，只有一團黑氣|盔甲底下什么都没有，只有一团黑气|Nothing under the armour but black mist.|鎧の中には何もなく、黒い霧だけが渦巻く|갑옷 속엔 아무것도 없고 검은 기운만 있다
z96|衝鋒＋會躲炸彈，難纏的對手|冲锋＋会躲炸弹，难缠的对手|Charges and dodges bombs — a real handful.|突進も爆弾回避もする。手強い相手|돌진도 하고 폭탄도 피한다. 까다로운 상대
z97|火焰|火焰|Flame|炎|화염
z98|冰霜|冰霜|Frost|氷霜|서리
z99|雷電|雷电|Lightning|雷電|번개
z100|暗黑邪氣|暗黑邪气|Dark aura|暗黒の邪気|암흑 기운
z101|水霧|水雾|Mist|水霧|물안개
z102|疾風|疾风|Gale|疾風|질풍
z103|霓虹|霓虹|Neon|ネオン|네온
z104|毒霧|毒雾|Poison mist|毒霧|독안개
z105|砂塵|砂尘|Dust|砂塵|모래먼지
z106|自然氣息|自然气息|Nature|自然の気配|자연 기운
shop.shareDesc|分享到下面任一平台，成功分享就送 <b>{n}</b> 金幣。每個平台只能領一次、每天最多領 3 次；要登入正式帳號（遊客不行）才能領。|分享到下面任一平台，成功分享就送 <b>{n}</b> 金币。每个平台只能领一次、每天最多领 3 次；要登入正式账号（游客不行）才能领。|Share to any platform below and get <b>{n}</b> coins. Once per platform, up to 3 times a day, and you must be signed in (guests can't claim).|下のいずれかのプラットフォームでシェアすると <b>{n}</b> コイン。同じプラットフォームは1回まで、1日3回まで。正式アカウントでのログインが必要です（ゲスト不可）。|아래 플랫폼 중 아무 곳에나 공유하면 <b>{n}</b> 코인을 드립니다. 플랫폼당 1회, 하루 최대 3회이며 정식 계정으로 로그인해야 합니다(게스트 불가).
z107|爆爆英雄 BOMB HERO|爆爆英雄 BOMB HERO|BOMB HERO|爆爆英雄 BOMB HERO|BOMB HERO
an1|💣 大家好！這是我獨自一人從零開始研發製作的經典炸彈對戰遊戲|💣 大家好！这是我独自一人从零开始研发制作的经典炸弹对战游戏|💣 Hi everyone! This is a classic bomb-battle game that I built all on my own, from scratch|💣 こんにちは！これは私が一人でゼロから開発したクラシックなボンバー対戦ゲームです|💣 안녕하세요! 제가 혼자서 처음부터 개발한 클래식 폭탄 대전 게임입니다
an2|為了讓大家玩得最方便，遊戲完全採用「跨端網頁設計」：|为了让大家玩得最方便，游戏完全采用「跨端网页设计」：|To make it as easy as possible, the whole game is built as a cross-platform web app:|できるだけ手軽に遊べるよう、完全に「クロスプラットフォームな Web 設計」にしています：|최대한 편하게 즐길 수 있도록 게임을 완전한 크로스 플랫폼 웹 방식으로 만들었습니다:
an3|💻 電腦 PC 瀏覽器：視野最廣、操作更流暢！|💻 电脑 PC 浏览器：视野最广、操作更流畅！|💻 PC browser: the widest view and the smoothest controls!|💻 PC ブラウザ：視野が最も広く、操作も快適！|💻 PC 브라우저: 시야가 가장 넓고 조작이 부드럽습니다!
an4|📱 手機瀏覽器：隨點隨玩，單手就能輕鬆開炸！|📱 手机浏览器：随点随玩，单手就能轻松开炸！|📱 Phone browser: open and play — blow things up one-handed!|📱 スマホのブラウザ：開いてすぐ、片手で気軽に爆発！|📱 휴대폰 브라우저: 바로 열고 한 손으로 가볍게 폭파!
an5|目前仍處於「開發測試階段」，這是我純粹出於興趣與研究製作的非營利作品。許多系統與玩法還在持續完善中，也還有不少問題需要逐步修復與優化。|目前仍处于「开发测试阶段」，这是我纯粹出于兴趣与研究制作的非营利作品。许多系统与玩法还在持续完善中，也还有不少问题需要逐步修复与优化。|The game is still in a development-and-testing stage — a non-profit project I built purely out of interest and for research. Many systems and modes are still being improved, and plenty of issues are still waiting to be fixed.|まだ「開発・テスト段階」で、純粋に趣味と研究のために作った非営利の作品です。多くのシステムや遊びはまだ調整中で、修正すべき問題もたくさんあります。|아직 개발·테스트 단계이며, 순수하게 흥미와 연구를 위해 만든 비영리 작품입니다. 많은 시스템과 플레이는 계속 다듬는 중이고, 고쳐야 할 문제도 적지 않습니다.
an6|如果您不嫌棄，非常歡迎進來體驗開炸！|如果您不嫌弃，非常欢迎进来体验开炸！|If you don't mind, you're very welcome to jump in and start blowing things up!|よろしければ、ぜひ遊んで爆発を楽しんでください！|괜찮으시다면 언제든 들어와서 폭파를 즐겨 보세요!
an7|遊玩中遇到任何 BUG、系統卡頓，或對遊戲有任何寶貴建議，都歡迎點擊右上角的 ✉️「信箱」按鈕私訊告訴我！|游玩中遇到任何 BUG、系统卡顿，或对游戏有任何宝贵建议，都欢迎点击右上角的 ✉️「信箱」按钮私讯告诉我！|If you hit a bug, see some lag, or have any suggestion about the game, just tap the ✉️ Mailbox button at the top right and send me a message!|バグや動作の重さ、ゲームへの提案があれば、右上の ✉️「メール」ボタンからメッセージを送ってください！|버그나 끊김, 게임에 대한 제안이 있으면 오른쪽 위 ✉️'메일' 버튼으로 메시지를 보내 주세요!
an8|❤️ 感謝大家的熱情捧場與支持，祝大家玩得開心，天天都有好心情！|❤️ 感谢大家的热情捧场与支持，祝大家玩得开心，天天都有好心情！|❤️ Thanks so much for all the support — have fun, and have a great day every day!|❤️ 応援してくださって本当にありがとうございます。楽しんで、毎日いい気分で過ごせますように！|❤️ 응원해 주셔서 정말 감사합니다. 즐겁게 즐기시고 매일 좋은 하루 되세요!
an9|👉 歡迎關注 FB 粉絲頁獲取最新更新：|👉 欢迎关注 FB 粉丝页获取最新更新：|👉 Follow the Facebook page for the latest updates:|👉 最新情報は FB ページをフォローしてください：|👉 최신 소식을 받으려면 FB 페이지를 팔로우하세요:
z116|🦸 暱稱（最多 8 字，|🦸 昵称（最多 8 字，|🦸 Nickname (max 8 chars, |🦸 ニックネーム（最大8文字、|🦸 닉네임 (최대 8자, 
z117|可以留空|可以留空|may be blank|空欄でもOK|비워도 됨
z118|🛒 商店|🛒 商店|🛒 Shop|🛒 ショップ|🛒 상점
z119|📣 分享拿金幣|📣 分享拿金币|📣 Share for coins|📣 シェアでコイン|📣 공유하고 코인
z120|🎲 RPG 模式|🎲 RPG 模式|🎲 RPG Mode|🎲 RPG モード|🎲 RPG 모드
z121|點 · 每項上限 10 格|点 · 每项上限 10 格|points · max 10 per stat|ポイント · 各項目上限10|포인트 · 항목당 최대 10
z122|📖 遊戲說明|📖 游戏说明|📖 Game Guide|📖 ゲーム説明|📖 게임 설명
z123|第 1 關 · 綠野草原|第 1 关 · 绿野草原|Stage 1 · Green Plains|ステージ1 · 緑の草原|1스테이지 · 초록 들판
z124|——直接按「開戰」就開打。支援|——直接按「开战」就开打。支援|— just hit “Start” and go. Supports|——「開戦」を押せばすぐ開始。|— 「전투 시작」만 누르면 바로 시작. 지원:
z125|2～8 人|2～8 人|2–8 players|2～8人|2~8인
z126|，也可以開|，也可以开|, or open|、また|, 또는
z127|組隊對戰（紅／藍／綠／黃，最多 4 隊）|组队对战（红／蓝／绿／黄，最多 4 队）|team battles (red/blue/green/yellow, up to 4 teams)|チーム戦（赤／青／緑／黄、最大4チーム）|팀전 (빨강/파랑/초록/노랑, 최대 4팀)
z128|小 13×11|小 13×11|S 13×11|小 13×11|소 13×11
z129|中 15×13|中 15×13|M 15×13|中 15×13|중 15×13
z130|大 17×15|大 17×15|L 17×15|大 17×15|대 17×15
z131|單人闖關與 RPG 的地圖由系統自動生成，大小隨關卡成長，不需要設定。|单人闯关与 RPG 的地图由系统自动生成，大小随关卡成长，不需要设定。|Solo and RPG maps are generated automatically; they grow with the stage, no setup needed.|ソロと RPG のマップは自動生成され、ステージが進むほど広くなります。設定は不要です。|솔로와 RPG 맵은 자동 생성되며 스테이지가 오를수록 커집니다. 설정할 필요 없습니다.
z132|小地圖（雷達）|小地图（雷达）|Minimap (radar)|ミニマップ（レーダー）|미니맵 (레이더)
z133|只在「隨機生成」的大地圖與組隊對戰出現。牆壁留深底、可走的路淡淡發亮；怪物只顯示你周圍 7 格（不是全圖開圖）。關掉可以多留一點畫面給戰場。|只在「随机生成」的大地图与组队对战出现。墙壁留深底、可走的路淡淡发亮；怪物只显示你周围 7 格（不是全图开图）。关掉可以多留一点画面给战场。|Only shows on large randomly generated maps and team battles. Walls stay dark, walkable tiles glow faintly; enemies appear only within 7 tiles of you (no full map reveal). Turn it off for more battlefield view.|「ランダム生成」の広いマップとチーム戦でのみ表示されます。壁は暗く、歩ける道は淡く光ります。敵は自分の周囲7マスだけ表示（全図表示ではありません）。オフにすると戦場が広く見えます。|«랜덤 생성» 대형 맵과 팀전에서만 표시됩니다. 벽은 어둡게, 걸을 수 있는 길은 희미하게 빛납니다. 몬스터는 주변 7칸만 표시(전체 공개 아님). 끄면 전장이 더 넓게 보입니다.
z134|🛠 開發者後台|🛠 开发者后台|🛠 Developer Console|🛠 開発者コンソール|🛠 개발자 콘솔
z135|📢 全服公告|📢 全服公告|📢 Server Announcement|📢 全サーバー告知|📢 전체 공지
help.rideS1|1️⃣ 吃蛋騎龍 → HUD 會多一顆 🦖（或 🐲）標記，右上角／螢幕上出現 <b>🔥 吐火鈕</b>。|1️⃣ 吃蛋骑龙 → HUD 会多一颗 🦖（或 🐲）标记，右上角／屏幕上出现 <b>🔥 吐火钮</b>。|1️⃣ Hatch and ride → a 🦖 (or 🐲) marker shows in the HUD and a <b>🔥 flame button</b> appears at the top-right.|1️⃣ 卵を割って乗る → HUD に 🦖（または 🐲）の印が増え、右上に <b>🔥 火吹きボタン</b>が出ます。|1️⃣ 알을 먹고 탑승 → HUD에 🦖(또는 🐲) 표시가 생기고 오른쪽 위에 <b>🔥 불뿜기 버튼</b>이 나타납니다.
z136|🕹️ 操作方式|🕹️ 操作方式|🕹️ Controls|🕹️ 操作方法|🕹️ 조작 방법
z137|接上手把就會自動偵測，可在「設定 → 控制方式」指定把手與按鍵；沒手把也能用 🤖 AI 補位或直接對戰。|接上手把就会自动侦测，可在「设定 → 控制方式」指定把手与按键；没手把也能用 🤖 AI 补位或直接对战。|Plug in a gamepad and it's detected automatically; set the pad and buttons in Settings → Controls. No pad? Fill slots with 🤖 AI or play head-to-head.|ゲームパッドを接続すると自動認識します。パッドとボタンは「設定 → 操作方法」で指定できます。パッドがなくても 🤖 AI で枠を埋めたり、そのまま対戦できます。|게임패드를 연결하면 자동으로 인식합니다. 패드와 버튼은 «설정 → 조작 방식»에서 지정할 수 있습니다. 패드가 없어도 🤖 AI로 자리를 채우거나 바로 대전할 수 있습니다.
z138|🧱 地圖上會看到什麼|🧱 地图上会看到什么|🧱 What you'll see on the map|🧱 マップで見るもの|🧱 맵에서 보이는 것
z139|❤️ 生命與時間|❤️ 生命与时间|❤️ Lives & time|❤️ ライフと時間|❤️ 목숨과 시간
z140|・單人闖關：<b>道具與坐騎會跟著你帶到下一關</b>，陣亡則從該關重新開始。|・单人闯关：<b>道具与坐骑会跟着你带到下一关</b>，阵亡则从该关重新开始。|・Solo: <b>items and your dino carry over to the next stage</b>; if you fall, that stage restarts.|・ソロ：<b>アイテムと恐竜は次のステージへ持ち越し</b>。やられるとそのステージの最初から。|・솔로: <b>아이템과 공룡은 다음 스테이지로 이어집니다</b>. 쓰러지면 그 스테이지부터 다시.
z141|道具藏在<b>軟磚</b>裡，炸開就掉出來，走上去自動撿起。<b>火焰不會把道具燒掉</b>（只會亮一下），放心炸。|道具藏在<b>软砖</b>里，炸开就掉出来，走上去自动捡起。<b>火焰不会把道具烧掉</b>（只会亮一下），放心炸。|Items hide inside <b>soft bricks</b> — blast one and it drops; walk over it to pick it up. <b>Flames don't burn items</b> (they just flash), so blast away.|アイテムは<b>軟らかいブロック</b>の中。壊すと出てきて、上を歩けば自動で拾います。<b>炎でアイテムは燃えません</b>（一瞬光るだけ）。安心して壊してください。|아이템은 <b>부드러운 벽돌</b> 속에 있습니다. 부수면 떨어지고 그 위를 지나가면 자동으로 줍습니다. <b>불꽃은 아이템을 태우지 않습니다</b>(잠깐 빛나기만 함).
z142|坐騎是這款遊戲最大的特色：<b>恐龍蛋孵化後騎上龍</b>，不只幫你擋傷害，還能<b>吐火</b>當招式用。|坐骑是这款游戏最大的特色：<b>恐龙蛋孵化后骑上龙</b>，不只帮你挡伤害，还能<b>吐火</b>当招式用。|Mounts are this game's signature: <b>hatch a dino egg and ride the dino</b> — it soaks a hit for you and gives you a <b>flame breath</b> move.|乗り物はこのゲーム一番の特徴：<b>恐竜の卵を孵して竜に乗る</b>と、ダメージを1回防いでくれて、さらに<b>火を吐く</b>技が使えます。|탈것은 이 게임의 최대 특징: <b>공룡 알을 부화해 공룡에 타면</b> 피해를 한 번 막아주고 <b>불 뿜기</b> 기술도 쓸 수 있습니다.
z143|🆚 小龍 vs 紅龍：差在哪？|🆚 小龙 vs 红龙：差在哪？|🆚 Small dino vs red dragon: the difference|🆚 小竜 vs 赤竜：何が違う？|🆚 작은 공룡 vs 붉은 용: 차이점
z144|🎯 招式怎麼用|🎯 招式怎么用|🎯 How to use the move|🎯 技の使い方|🎯 기술 사용법
z145|2️⃣ 按 <b>F 鍵</b>（手機按 <b>🔥</b>）吐火：小龍只燒<b>面向的那個方向</b>，紅龍<b>四個方向同時燒</b>，各 2 格。|2️⃣ 按 <b>F 键</b>（手机按 <b>🔥</b>）吐火：小龙只烧<b>面向的那个方向</b>，红龙<b>四个方向同时烧</b>，各 2 格。|2️⃣ Press <b>F</b> (tap <b>🔥</b> on mobile) to breathe fire: the small dino burns <b>the side it faces</b>, the red dragon <b>all four directions at once</b>, 2 tiles each.|2️⃣ <b>F キー</b>（スマホは <b>🔥</b>）で火を吐く：小竜は<b>向いている方向</b>だけ、赤竜は<b>四方向同時</b>に各2マス。|2️⃣ <b>F 키</b>(모바일은 <b>🔥</b>)로 불을 뿜습니다: 작은 공룡은 <b>바라보는 방향</b>만, 붉은 용은 <b>네 방향 동시</b>에 각 2칸.
z146|3️⃣ 冷卻 <b>3 秒</b>（龍頭上方會顯示倒數），冷卻中按了沒反應，等數字消失再按。|3️⃣ 冷却 <b>3 秒</b>（龙头上方会显示倒数），冷却中按了没反应，等数字消失再按。|3️⃣ Cooldown <b>3s</b> (a countdown shows above its head). Nothing happens while cooling down — wait for the number to vanish.|3️⃣ クールダウン <b>3秒</b>（竜の頭上にカウントダウン表示）。クールダウン中は押しても反応しません。数字が消えてから押してください。|3️⃣ 쿨다운 <b>3초</b>(용 머리 위에 카운트다운 표시). 쿨다운 중에는 눌러도 반응이 없습니다. 숫자가 사라진 뒤 누르세요.
z147|4️⃣ 火焰會<b>炸掉恐龍蛋、點燃別的炸彈</b>，但<b>不會傷到自己</b> —— 可以放心邊跑邊噴。|4️⃣ 火焰会<b>炸掉恐龙蛋、点燃别的炸弹</b>，但<b>不会伤到自己</b> —— 可以放心边跑边喷。|4️⃣ Flames <b>destroy dino eggs and set off other bombs</b>, but <b>never hurt you</b> — spray while running, no worries.|4️⃣ 炎は<b>恐竜の卵を壊し、他の爆弾に引火</b>しますが、<b>自分は傷つきません</b> —— 走りながら吐いてOK。|4️⃣ 불꽃은 <b>공룡 알을 부수고 다른 폭탄에 불을 붙이지만</b> <b>자신은 다치지 않습니다</b> — 달리면서 마음껏 뿜으세요.
z148|5️⃣ 龍<b>只能擋一次傷害</b>：被炸到龍就消失（有 1.8 秒無敵），想再騎要再吃一顆蛋。|5️⃣ 龙<b>只能挡一次伤害</b>：被炸到龙就消失（有 1.8 秒无敌），想再骑要再吃一颗蛋。|5️⃣ The dino <b>absorbs one hit only</b>: get blasted and it's gone (you get 1.8s of invincibility). Hatch another egg to ride again.|5️⃣ 竜は<b>ダメージを1回だけ防ぎます</b>：被弾すると竜は消えます（1.8秒無敵）。また乗るには卵を割り直し。|5️⃣ 공룡은 <b>피해를 한 번만 막습니다</b>: 폭발에 맞으면 공룡이 사라집니다(1.8초 무적). 다시 타려면 알을 또 먹어야 합니다.
z149|單人闖關共 <b>32 張地圖</b>（8 大主題 × 4 張），每一區的第 4 張是魔王關；關卡越後面機關越多、怪物越兇。|单人闯关共 <b>32 张地图</b>（8 大主题 × 4 张），每一区的第 4 张是魔王关；关卡越后面机关越多、怪物越凶。|Solo mode has <b>32 maps</b> (8 chapters × 4); the 4th of each chapter is a boss stage. Later stages bring more hazards and nastier monsters.|ソロは全 <b>32 マップ</b>（8テーマ×4枚）。各エリアの4枚目がボス面。後のステージほどギミックが増え、敵も凶暴になります。|솔로는 총 <b>32개 맵</b>(8테마 × 4장). 각 구역의 4번째가 보스 스테이지입니다. 뒤로 갈수록 장치가 늘고 몬스터가 사나워집니다.
z150|⚙️ 地形機關怎麼運作|⚙️ 地形机关怎么运作|⚙️ How hazards work|⚙️ 地形ギミックの仕組み|⚙️ 지형 장치의 작동 방식
z151|對戰時間到還沒分出勝負時，<b>外圈開始落石</b>，場地越縮越小 —— 快往中間跑。|对战时间到还没分出胜负时，<b>外圈开始落石</b>，场地越缩越小 —— 快往中间跑。|When time runs out with no winner, <b>rocks start falling on the outer ring</b> and the arena shrinks — run for the middle.|時間切れで決着がつかないと、<b>外周から落石</b>が始まり場が狭くなります —— 中央へ急げ。|시간이 끝나도 승부가 안 나면 <b>바깥쪽에 낙석</b>이 시작되고 무대가 줄어듭니다 — 중앙으로 뛰세요.
z152|對戰被淘汰後不用乾等：坐上推車沿外圈移動，<b>繼續往場內丟炸彈</b>報仇。|对战被淘汰后不用干等：坐上推车沿外圈移动，<b>继续往场内丢炸弹</b>报仇。|Eliminated? Don't just wait: hop on the cart, ride the outer ring and <b>keep lobbing bombs inside</b> for revenge.|やられても待つだけじゃない：トロッコに乗って外周を移動し、<b>中へ爆弾を投げ続けて</b>仕返し。|탈락해도 그냥 기다리지 마세요: 수레를 타고 바깥을 돌며 <b>안쪽으로 폭탄을 계속 던져</b> 복수하세요.
z153|小怪共 <b>48 隻</b>：八大關卡各 6 隻，<b>難度一關一階往上</b>（第 1 關只有慢吞吞的草原小動物，第 8 關是會追人、會躲炸彈的魔王近衛軍）。<br>地面怪<b>會被牆擋住</b>、飛行怪<b>可以越過牆壁</b>；碰到任何一隻就扣一條命。<br>👀 重點：所有小怪（含飛行怪）都只在你踏進 <b>2 格內</b>才會發現你。沒被發現時牠只會自己亂走、<b>不會主動靠過來</b>；被發現的<b>中階／高階</b>小怪頭上會一直冒出 <b>😡 生氣泡泡</b>，先原地蓄力再加速撲上來 —— 看到泡泡就準備好炸彈。<br><b>BOSS 例外</b>：牠塊頭大、看得比小怪遠，<b>3 格內</b>就會發火（小怪是 2 格）。|小怪共 <b>48 只</b>：八大关卡各 6 只，<b>难度一关一阶往上</b>（第 1 关只有慢吞吞的草原小动物，第 8 关是会追人、会躲炸弹的魔王近卫军）。<br>地面怪<b>会被墙挡住</b>、飞行怪<b>可以越过墙壁</b>；碰到任何一只就扣一条命。<br>👀 重点：所有小怪（含飞行怪）都只在你踏进 <b>2 格内</b>才会发现你。没被发现时它只会自己乱走、<b>不会主动靠过来</b>；被发现的<b>中阶／高阶</b>小怪头上会一直冒出 <b>😡 生气泡泡</b>，先原地蓄力再加速扑上来 —— 看到泡泡就准备好炸弹。<br><b>BOSS 例外</b>：它块头大、看得比小怪远，<b>3 格内</b>就会发火（小怪是 2 格）。|<b>48 monsters</b> in total: 6 per chapter, and <b>difficulty climbs one step per stage</b> (stage 1 has only slow grassland critters; stage 8 has throne guards that chase you and dodge bombs).<br>Ground enemies <b>are blocked by walls</b>; flyers <b>pass over them</b>. Touch any one and you lose a life.<br>👀 Key point: every enemy (flyers too) only notices you within <b>2 tiles</b>. Unnoticed, they wander and <b>won't come for you</b>. Once they spot you, mid/high-tier foes pop an <b>😡 angry bubble</b>, charge up in place then lunge — see a bubble, get a bomb ready.<br><b>Bosses are the exception</b>: bigger and sharper-eyed, they rage within <b>3 tiles</b> (regular foes: 2).|小怪は全 <b>48 体</b>：8エリア各6体で、<b>ステージごとに一段ずつ強く</b>なります（第1面はのろい草原の小動物だけ、第8面は追ってきて爆弾を避ける魔王近衛軍）。<br>地上の敵は<b>壁に阻まれ</b>、飛行の敵は<b>壁を越えられます</b>。触れたらライフ1つ減。<br>👀 重要：すべての敵（飛行含む）は君が <b>2マス以内</b>に入って初めて気づきます。気づかれるまで敵はうろつくだけで<b>寄ってきません</b>。気づいた<b>中階／高階</b>の敵は頭上に <b>😡 怒りマーク</b>を出し、その場で力をためてから突進 —— マークを見たら爆弾を用意。<br><b>BOSS は例外</b>：体が大きく目も利くので <b>3マス以内</b>で怒ります（小怪は2マス）。|小怪는 총 <b>48마리</b>: 8개 구역에 6마리씩, <b>스테이지마다 한 단계씩 강해집니다</b>(1스테이지는 느릿한 초원 동물뿐, 8스테이지는 쫓아오고 폭탄도 피하는 마왕 근위군).<br>지상 몬스터는 <b>벽에 막히고</b>, 비행 몬스터는 <b>벽을 넘습니다</b>. 닿으면 목숨 하나가 줄어듭니다.<br>👀 핵심: 모든 몬스터(비행 포함)는 네가 <b>2칸 안</b>에 들어와야 발견합니다. 발견 전에는 제멋대로 돌아다닐 뿐 <b>다가오지 않습니다</b>. 발견한 <b>중급／고급</b> 몬스터는 머리 위에 <b>😡 화남 표시</b>가 뜨고, 제자리에서 힘을 모은 뒤 돌진합니다 — 표시가 보이면 폭탄을 준비하세요.<br><b>BOSS는 예외</b>: 덩치가 크고 눈이 밝아 <b>3칸 안</b>에서 화냅니다(일반은 2칸).
z154|老手常用的 <b>10 個實戰技巧</b>，看完馬上變強 💪|老手常用的 <b>10 个实战技巧</b>，看完马上变强 💪|The <b>10 field tips</b> veterans swear by — read them and get better instantly 💪|ベテラン御用達の<b>実戦テク10選</b>。読めばすぐ強くなる 💪|고수들이 쓰는 <b>실전 팁 10가지</b>. 읽으면 바로 강해집니다 💪
z155|💻 電腦（鍵盤）|💻 电脑（键盘）|💻 PC (keyboard)|💻 PC（キーボード）|💻 PC (키보드)
z156|（預設 WASD 或方向鍵）|（默认 WASD 或方向键）|(default WASD or arrow keys)|（既定 WASD または矢印キー）|(기본 WASD 또는 방향키)
z157|放彈／動作|放弹／动作|Bomb / Action|爆弾／アクション|폭탄／동작
z158|（預設 空白鍵／Enter；撿彈、丟彈、線圈彈都用它）|（默认 空格键／Enter；捡弹、丢弹、线圈弹都用它）|(default Space / Enter — also picks up, throws and remote-bombs)|（既定 スペース／Enter。拾う・投げる・リモコン起爆もこれ）|(기본 스페이스／Enter — 줍기, 던지기, 리모컨 폭파도 이 키)
z159|（預設 E，要有 📱 才有用）|（默认 E，要有 📱 才有用）|(default E; needs a 📱 to be useful)|（既定 E。📱 を持っていないと使えません）|(기본 E, 📱가 있어야 쓸 수 있음)
z160|（預設 F，要有坐騎才有用）|（默认 F，要有坐骑才有用）|(default F; needs a mount to be useful)|（既定 F。乗り物に乗っていないと使えません）|(기본 F, 탈것이 있어야 쓸 수 있음)
z161|暫停|暂停|Pause|一時停止|일시정지
z162|或右上角 ⏸|或右上角 ⏸|or ⏸ at the top-right|または右上の ⏸|또는 오른쪽 위 ⏸
z163|📱 手機／平板（觸控）|📱 手机／平板（触控）|📱 Phone / tablet (touch)|📱 スマホ／タブレット（タッチ）|📱 휴대폰／태블릿 (터치)
z164|左下角|左下角|Bottom-left|左下|왼쪽 아래
z165|搖桿|摇杆|joystick|スティック|조이스틱
z166|（往哪推就往哪走）|（往哪推就往哪走）|(push where you want to go)|（倒した方向へ進む）|(미는 방향으로 이동)
z167|按鈕|按钮|Buttons|ボタン|버튼
z168|右下角|右下角|Bottom-right|右下|오른쪽 아래
z169|💣 放彈／動作|💣 放弹／动作|💣 Bomb / Action|💣 爆弾／アクション|💣 폭탄／동작
z170|🔥 吐火|🔥 吐火|🔥 Flame|🔥 火吹き|🔥 불뿜기
z171|📱 引爆|📱 引爆|📱 Detonate|📱 起爆|📱 폭파
z172|右上角|右上角|Top-right|右上|오른쪽 위
z173|或「← 上一頁」|或「← 上一页」|or “← Back”|または「← 戻る」|또는 «← 뒤로»
z174|小提醒|小提醒|Note|ひとこと|참고
z175|手機玩到一半想離開，請按 ⏸；邊緣滑動的系統返回手勢已自動擋掉，不會誤觸|手机玩到一半想离开，请按 ⏸；边缘滑动的系统返回手势已自动挡掉，不会误触|Leaving mid-game on a phone? Press ⏸ — edge-swipe back gestures are blocked, so no accidental exits.|スマホで途中退出したいときは ⏸ を押してください。端スワイプの戻る操作は無効化済みで誤爆しません。|휴대폰에서 중간에 나가려면 ⏸를 누르세요. 가장자리 스와이프 뒤로 가기는 막아 두어 잘못 나가지 않습니다.
z176|🎮 手把|🎮 手柄|🎮 Gamepad|🎮 ゲームパッド|🎮 게임패드
z177|🦖 小龍|🦖 小龙|🦖 Small dino|🦖 小竜|🦖 작은 공룡
z178|🐲 紅龍|🐲 红龙|🐲 Red dragon|🐲 赤竜|🐲 붉은 용
z179|1. 綠野草原|1. 绿野草原|1. Green Plains|1. 緑の草原|1. 초록 들판
z180|2. 沙漠遺跡|2. 沙漠遗迹|2. Desert Ruins|2. 砂漠の遺跡|2. 사막 유적
z181|3. 冰雪原|3. 冰雪原|3. Frozen Field|3. 氷雪の原|3. 얼음 설원
z182|4. 熔岩洞窟|4. 熔岩洞窟|4. Lava Cave|4. 溶岩洞窟|4. 용암 동굴
z183|5. 夜光彩城|5. 夜光彩城|5. Neon City|5. ネオンシティ|5. 네온 시티
z184|6. 深海遺跡|6. 深海遗迹|6. Sunken Ruins|6. 深海の遺跡|6. 심해 유적
z185|7. 天空要塞|7. 天空要塞|7. Sky Fortress|7. 天空要塞|7. 하늘 요새
z186|8. 暗黑魔王城|8. 暗黑魔王城|8. Demon Castle|8. 暗黒魔王城|8. 암흑 마왕성
z187|🌀 突死縮圈|🌀 突死缩圈|🌀 Sudden Death|🌀 突然死|🌀 서든 데스
z188|🛒 復仇推車|🛒 复仇推车|🛒 Revenge cart|🛒 復讐トロッコ|🛒 복수 수레
z189|🌱 地面|🌱 地面|🌱 Ground|🌱 地上|🌱 지상
z190|很慢|很慢|very slow|とても遅い|매우 느림
z191|⚡ 中階|⚡ 中阶|⚡ Mid tier|⚡ 中階|⚡ 중급
z192|🕊️ 穿牆|🕊️ 穿墙|🕊️ Wall-phasing|🕊️ 壁抜け|🕊️ 벽 통과
z193|極快|极快|extremely fast|極めて速い|매우 빠름
z194|🔥 高階|🔥 高阶|🔥 High tier|🔥 上級|🔥 고급
spd.veryFast|極快|极快|extremely fast|極めて速い|매우 빠름
spd.fast|快|快|fast|速い|빠름
spd.mid|中|中|medium|ふつう|보통
spd.slow|慢|慢|slow|遅い|느림
spd.verySlow|很慢|很慢|very slow|とても遅い|매우 느림
help.br.lead|🏝️ 大逃殺：最多 50 人的亂鬥，活到最後一個就贏。可以單打，也可以組隊。下面幾點先記住，就不會一開場就出局。|🏝️ 大逃杀：最多 50 人的乱斗，活到最后一个就赢。可以单打，也可以组队。下面几点先记住，就不会一开场就出局。|🏝️ Battle Royale: up to 50 players brawl it out — last one standing wins. Play solo or in teams. Remember the points below and you won't be out in the first seconds.|🏝️ バトロワ：最大50人の乱戦、最後まで生き残れば勝ち。ソロでもチームでもOK。下のポイントを押さえれば開幕即脱落は防げます。|🏝️ 배틀로얄: 최대 50인 난전, 마지막까지 살아남으면 승리. 솔로도 팀도 가능합니다. 아래 요점만 기억하면 시작하자마자 탈락하지 않습니다.
help.br.goal|🎯 <b>目標</b>：開場有 10 點血，被炸到一次扣 1～2 點；血量歸零就出局。<b>最後活著的人（或隊伍）獲勝</b>，名次越前面獎勵越好。|🎯 <b>目标</b>：开场有 10 点血，被炸到一次扣 1～2 点；血量归零就出局。<b>最后活着的人（或队伍）获胜</b>，名次越前面奖励越好。|🎯 <b>Goal</b>: you start with 10 HP and lose 1–2 per hit; at zero you're out. <b>The last player (or team) standing wins</b> — the higher your place, the bigger the reward.|🎯 <b>目標</b>：開始時10ポイント、被弾ごとに1～2減り、0で脱落。<b>最後に生き残った人（チーム）の勝ち</b>。順位が上ほど報酬が良い。|🎯 <b>목표</b>: 시작 시 10 HP, 피격당 1~2 감소, 0이면 탈락. <b>마지막까지 살아남은 사람(팀)이 승리</b>하며 순위가 높을수록 보상이 좋습니다.
help.br.team|👥 <b>人數與組隊</b>：可選 30 人或 50 人；組隊可開 2／3／4 隊 —— <b>同隊的炸彈與火焰不會傷到自己人</b>，但毒圈和小怪照樣會咬人。|👥 <b>人数与组队</b>：可选 30 人或 50 人；组队可开 2／3／4 队 —— <b>同队的炸弹与火焰不会伤到自己人</b>，但毒圈和小怪照样会咬人。|👥 <b>Players & teams</b>: pick 30 or 50 players; teams can be 2/3/4 — <b>your team's bombs and flames never hurt teammates</b>, but the zone and monsters still do.|👥 <b>人数とチーム</b>：30人か50人。チームは2／3／4から選択 —— <b>同じチームの爆弾と炎では味方を傷つけません</b>。ただし毒エリアと雑魚は容赦なし。|👥 <b>인원과 팀</b>: 30명 또는 50명, 팀은 2／3／4 —— <b>같은 팀의 폭탄과 불꽃은 아군을 해치지 않습니다</b>. 다만 자기장과 몬스터는 예외.
help.br.zone|☠️ <b>毒圈</b>：一場 5 分鐘（5 圈）或 10 分鐘（10 圈）。時間到毒圈就往內縮，<b>站在圈外每 1.6 秒掉 1 點血</b> —— 看到圈靠過來就快往中間移動。|☠️ <b>毒圈</b>：一场 5 分钟（5 圈）或 10 分钟（10 圈）。时间到毒圈就往内缩，<b>站在圈外每 1.6 秒掉 1 点血</b> —— 看到圈靠过来就快往中间移动。|☠️ <b>The zone</b>: a match lasts 5 min (5 rings) or 10 min (10 rings). Each phase the ring closes in and <b>outside it you lose 1 HP every 1.6s</b> — when the ring moves, head for the middle.|☠️ <b>毒エリア</b>：1試合5分（5周）or 10分（10周）。時間ごとに円が縮み、<b>外にいると1.6秒ごとに1ポイント減</b> —— 円が来たら中央へ。|☠️ <b>자기장</b>: 한 판 5분(5회) 또는 10분(10회). 시간마다 원이 줄어들고 <b>바깥에 있으면 1.6초마다 1 HP 감소</b> — 원이 다가오면 중앙으로.
help.br.boss|🦖 <b>亂入 BOSS（v4.77 新）</b>：場上會有 2 隻從 32 關隨機抽來的 BOSS 到處亂走。<b>打死牠最後一下的人直接騎上恐龍</b>（不用撿蛋）—— 多一層護盾，還能吐火，火力立刻翻一倍。|🦖 <b>乱入 BOSS（v4.77 新）</b>：场上会有 2 只从 32 关随机抽来的 BOSS 到处乱走。<b>打死它最后一下的人直接骑上恐龙</b>（不用捡蛋）—— 多一层护盾，还能吐火，火力立刻翻一倍。|🦖 <b>Roaming boss (new in v4.77)</b>: 2 bosses picked at random from the 32 stages wander the map. <b>Whoever lands the last hit mounts the dino right away</b> (no egg needed) — a free shield plus flame breath, so your firepower doubles instantly.|🦖 <b>乱入ボス（v4.77 新）</b>：32面からランダムに選ばれたボスが2体うろつきます。<b>最後の一撃を入れた人がそのまま恐竜に騎乗</b>（卵不要）—— シールド1枚＋火吹きで火力が倍に。|🦖 <b>난입 BOSS (v4.77 신규)</b>: 32개 스테이지에서 무작위로 뽑힌 BOSS 2마리가 돌아다닙니다. <b>마지막 일격을 넣은 사람이 바로 공룡에 탑승</b>(알 필요 없음) — 보호막 하나에 불뿜기까지, 화력이 두 배.
help.br.reward|🏆 <b>獎勵</b>：依最後名次發金幣（冠軍最多），前三名再加送票券；現在還在免費測試，入場不扣票。|🏆 <b>奖励</b>：依最后名次发金币（冠军最多），前三名再加送票券；现在还在免费测试，入场不扣票。|🏆 <b>Rewards</b>: coins by final placement (champion gets the most), and the top three also earn tickets. It's still a free test — entering costs no ticket.|🏆 <b>報酬</b>：最終順位に応じてコイン（優勝が最高）、上位3位にはチケットも進呈。現在は無料テスト中で入場にチケットは不要。|🏆 <b>보상</b>: 최종 순위에 따라 코인(우승이 최대), 3위까지는 티켓도 지급. 지금은 무료 테스트라 입장에 티켓이 들지 않습니다.
help.br.ctrl|🎮 <b>操作</b>：跟一般模式一樣 —— 放彈、吐火、引爆都在右下角，手機用左下搖桿移動；草叢、破屋可以躲人。|🎮 <b>操作</b>：跟一般模式一样 —— 放弹、吐火、引爆都在右下角，手机用左下摇杆移动；草丛、破屋可以躲人。|🎮 <b>Controls</b>: same as always — bomb, flame and detonate sit at the bottom-right, the joystick at the bottom-left on mobile. Bushes and broken huts hide you.|🎮 <b>操作</b>：通常モードと同じ —— 爆弾・火吹き・起爆は右下、スマホの移動は左下スティック。草むらや廃屋に隠れられます。|🎮 <b>조작</b>: 일반 모드와 같습니다 — 폭탄, 불뿜기, 폭파는 오른쪽 아래, 모바일 이동은 왼쪽 아래 조이스틱. 풀숲과 폐가는 숨을 수 있습니다.
verLog.now|當前版本|当前版本|Current|現在のバージョン|현재 버전
verLog.dev|內部|内部|Internal|内部|내부
verLog.zhOnly|此版本的更新說明以繁體中文撰寫。|此版本的更新说明以繁体中文撰写。|Release notes for this version are in Traditional Chinese only.|このバージョンの更新内容は繁体字中国語のみです。|이 버전의 업데이트 설명은 번체 중국어로만 제공됩니다.
ver.4.79.1|⚡ 美術全面外部化：175 張圖從內嵌 base64 改成獨立檔案 spr/*.webp，主檔從 3.34 MB 降到 1.47 MB（壓縮後 640 KB），第二次開啟直接走瀏覽器快取幾乎瞬開|⚡ 美术全面外部化：175 张图从内嵌 base64 改成独立文件 spr/*.webp，主档从 3.34 MB 降到 1.47 MB（压缩后 640 KB），第二次开启直接走浏览器缓存几乎瞬开|⚡ All art externalised: 175 images moved from inline base64 into individual spr/*.webp files — the main file drops from 3.34 MB to 1.47 MB (640 KB gzipped) and a second visit loads almost instantly from cache|⚡ 美術を全面的に外部化：175 枚の画像を埋め込み base64 から個別ファイル spr/*.webp に変更。本体は 3.34 MB → 1.47 MB（圧縮後 640 KB）、2 回目以降はブラウザキャッシュでほぼ即起動|⚡ 미술 리소스 전면 외부화: 175장의 이미지를 내장 base64에서 개별 파일 spr/*.webp로 변경. 본체가 3.34 MB → 1.47 MB(압축 후 640 KB), 두 번째 접속부터는 거의 즉시 실행
ver.4.79.2|📦 Service Worker 會在背景把 175 張貼圖慢慢預熱，之後就算離線也能完整開起來|📦 Service Worker 会在后台把 175 张贴图慢慢预热，之后就算离线也能完整开起来|📦 The service worker warms all 175 sprites in the background, so the game opens fully even offline|📦 Service Worker が 175 枚のスプライトをバックグラウンドで先読み、以降はオフラインでも完全に起動|📦 Service Worker가 175장의 스프라이트를 백그라운드에서 미리 받아두어 이후에는 오프라인에서도 완전히 실행
ver.4.79.3|📈 單檔容量上限（3.9M 字元）不再是瓶頸：主檔只剩 1.47M，之後加內容不用再擠空間|📈 单档容量上限（3.9M 字符）不再是瓶颈：主档只剩 1.47M，之后加内容不用再挤空间|📈 The single-file size cap (3.9M chars) is no longer a bottleneck: the main file is down to 1.47M, so new content no longer has to fight for bytes|📈 単一ファイルの容量上限（3.9M 文字）がボトルネックでなくなりました。本体は 1.47M のみ、今後の追加で容量を気にせず済みます|📈 단일 파일 용량 상한(3.9M자)이 더 이상 병목이 아닙니다. 본체가 1.47M로 줄어 새 콘텐츠를 넣어도 공간 걱정이 없습니다
ver.4.78.1|🔕 大逃殺：別的玩家／AI 扣血、坐騎被打爆，都不會再顯示在自己的畫面上（原本會在畫面正中央一直閃「♥ 9」把整個戰場蓋住）—— 提示與音效只留給自己|🔕 大逃杀：别的玩家／AI 扣血、坐骑被打爆，都不会再显示在自己的画面上（原本会在画面正中央一直闪「♥ 9」把整个战场盖住）—— 提示与音效只留给自己|🔕 Battle Royale: other players'/AI damage and broken mounts no longer appear on your screen (the centre used to flash "♥ 9" nonstop and cover the battlefield) — tips and sound are for your own hits only|🔕 バトロワ：他のプレイヤー／AI の被弾や騎乗破壊が自分の画面に出なくなりました（以前は画面中央に「♥ 9」が点滅し続けて戦場を覆っていた）—— ヒントと効果音は自分の被弾時だけ|🔕 배틀로얄: 다른 플레이어/AI의 피해와 탈것 파괴가 내 화면에 나타나지 않는다(예전에는 화면 중앙에 "♥ 9"가 계속 깜빡여 전장을 가렸다) — 안내와 효과음은 내가 맞을 때만
ver.4.78.2|🌏 大逃殺的即時提示補齊 10 國翻譯：受傷剩幾點血、誰出局還剩幾人、毒圈收縮半徑|🌏 大逃杀的即时提示补齐 10 国翻译：受伤剩几点血、谁出局还剩几人、毒圈收缩半径|🌏 Battle Royale live tips are now translated into all 10 languages: HP left when hit, who is out and how many remain, zone radius|🌏 バトロワのリアルタイム表示を 10 言語に：残り HP、脱落者と残り人数、ゾーン半径|🌏 배틀로얄 실시간 안내를 10개 언어로: 남은 체력, 탈락자와 남은 인원, 자기장 반경
ver.4.77.1|🦖 大逃殺打倒亂入 BOSS 立刻上坐騎：最後一擊的人<b>直接騎上恐龍</b>（不用等蛋、不用撿蛋），並附 1.2 秒無敵；騎小龍再吃一隻會進化成紅龍|🦖 大逃杀打倒乱入 BOSS 立刻上坐骑：最后一击的人<b>直接骑上恐龙</b>（不用等蛋、不用捡蛋），并附 1.2 秒无敌；骑小龙再吃一只会进化成红龙|🦖 Beat a roaming boss in Battle Royale and mount instantly: <b>whoever lands the last hit rides the dino right away</b> (no egg to wait for or pick up) with 1.2s of invincibility; if you're already on a small dino, downing another boss evolves it into the red dragon|🦖 バトロワで乱入ボスを倒すと即騎乗：<b>最後の一撃を入れた人がそのまま恐竜に乗る</b>（卵を待つ・拾う必要なし）＋1.2秒無敵。小竜に乗ったままもう1体倒すと赤竜に進化|🦖 배틀로얄에서 난입 BOSS를 잡으면 즉시 탑승: <b>마지막 일격을 넣은 사람이 바로 공룡에 탑승</b>(알을 기다리거나 줍지 않아도 됨) + 1.2초 무적. 작은 공룡 탑승 중 하나 더 잡으면 붉은 용으로 진화
ver.4.77.2|🌏 全遊戲文字 10 國語系：介面、HUD、提示、怪物習性、道具、坐騎、關卡名、說明頁、教學全部跟著語言切換（含 canvas 上畫的字與即時跳出的提示），切語言不用重開|🌏 全游戏文字 10 国语言：界面、HUD、提示、怪物习性、道具、坐骑、关卡名、说明页、教学全部跟着语言切换（含 canvas 上画的字与即时跳出的提示），切语言不用重开|🌏 Every piece of text in 10 languages: UI, HUD, pop-ups, monster behaviour notes, items, mounts, stage names, the guide and the tutorial all follow the chosen language (including text drawn on the canvas and live toasts) — no reload needed|🌏 ゲーム内の文字を10言語対応：UI・HUD・通知・敵の性質・アイテム・騎乗・ステージ名・説明ページ・チュートリアルまですべて言語に追従（canvas に描く文字や即時ポップも含む）。言語切替に再読み込みは不要|🌏 게임 내 모든 문구 10개 언어 지원: UI, HUD, 알림, 몬스터 특성, 아이템, 탈것, 스테이지 이름, 설명 페이지, 튜토리얼까지 언어를 따라갑니다(canvas에 그리는 글자와 즉시 뜨는 알림 포함). 언어를 바꿔도 새로고침 필요 없음
ver.4.77.3|📖 說明頁新增大逃殺分頁：人數／組隊、毒圈節奏、亂入 BOSS 與獎勵一次看懂；操作與坐騎段落也一併更新|📖 说明页新增大逃杀分页：人数／组队、毒圈节奏、乱入 BOSS 与奖励一次看懂；操作与坐骑段落也一并更新|📖 New Battle Royale tab in the guide: players/teams, zone timing, roaming bosses and rewards at a glance — plus refreshed controls and mount sections|📖 説明ページにバトロワのタブを追加：人数／チーム・毒エリアの進行・乱入ボス・報酬が一目で分かります。操作と騎乗の項目も更新|📖 설명 페이지에 배틀로얄 탭 추가: 인원／팀, 자기장 진행, 난입 BOSS, 보상을 한눈에. 조작과 탈것 항목도 함께 갱신
ver.4.77.4|⚡ 效能整理：地板改成「同色相鄰格合併成一次填色」、外牆與裝飾只畫看得到的格，大逃殺 50 人時每幀畫布指令少一半以上|⚡ 效能整理：地板改成「同色相邻格合并成一次填色」、外墙与装饰只画看得到的格，大逃杀 50 人时每帧画布指令少一半以上|⚡ Performance pass: floors now batch same-colour neighbours into a single fill, outer walls and decor only draw on visible tiles — canvas calls per frame in a 50-player match dropped by more than half|⚡ 性能整理：床を「同色の隣接マスをまとめて1回で塗る」方式に変更、外壁と装飾は見えるマスだけ描画。バトロワ50人でも1フレームの描画命令が半分以下に|⚡ 성능 정리: 바닥을 «같은 색 인접 칸을 묶어 한 번에 채우기»로 바꾸고, 외벽과 장식은 보이는 칸만 그립니다. 배틀로얄 50인에서 프레임당 캔버스 명령이 절반 이하로 감소
ver.4.77.5|🧹 翻譯字典改壓縮格式（同樣的 10 國文字省下 82KB），順手把重複的舊字串清掉|🧹 翻译字典改压缩格式（同样的 10 国文字省下 82KB），顺手把重复的旧字串清掉|🧹 The translation table now uses a compact format (same 10 languages, 82KB smaller) and duplicate legacy strings were cleaned up|🧹 翻訳辞書を圧縮形式に変更（同じ10言語で82KB削減）。重複していた古い文字列も整理|🧹 번역 사전을 압축 형식으로 변경(같은 10개 언어로 82KB 절약). 중복된 옛 문자열도 정리
z195|習性|习性|Habits|習性|습성
z196|特殊技能|特殊技能|Special skill|特殊スキル|특수 스킬
z197|傳送門|传送门|Warp gate|ワープゲート|워프 게이트
z198|冰面滑行|冰面滑行|Ice slide|氷上スライド|빙판 미끄러짐
z199|輸送帶|输送带|Conveyor|ベルトコンベア|컨베이어 벨트
z200|📌 走上去自動撿起。|📌 走上去自动捡起。|📌 Just walk over it to pick it up.|📌 踏むだけで自動で拾う。|📌 밟기만 하면 자동으로 줍는다.
z201|火焰會把蛋炸掉|火焰会把蛋炸掉|Flames destroy the egg|炎で卵は壊れる|불꽃에 알이 터진다
z202|面向|面向|Facing|向き|방향
z203|2 格|2 格|2 tiles|2 マス|2칸
z204|3 秒|3 秒|3s|3 秒|3초
z205|1 次|1 次|once|1 回|1회
z206|自己的火燒不到自己|自己的火烧不到自己|Your own flames can't hurt you|自分の炎で自分は焼けない|자기 불꽃에는 자기가 안 다친다
z207|要炸 3 下|要炸 3 下|takes 3 hits|3 回爆発させる必要|3번 터뜨려야
z208|會|会|will|する|한다
z209|要炸 4 次|要炸 4 次|takes 4 hits|4 回爆発させる必要|4번 터뜨려야
z210|炸開軟磚 → 撿道具 →|炸开软砖 → 捡道具 →|Blow up soft blocks → grab items →|軟らかいブロックを壊す → アイテムを拾う →|부서지는 블록을 터뜨리기 → 아이템 줍기 →
z211|清光所有怪物|清光所有怪物|clear every monster|敵を全滅させる|모든 몬스터를 처치
z212|→ 找出傳送門 🚪 → 走進去過關。共|→ 找出传送门 🚪 → 走进去过关。共|→ find the warp gate 🚪 → step in to clear the stage. Total|→ ワープゲート 🚪 を探す → 入ればクリア。全|→ 워프 게이트 🚪 찾기 → 들어가면 클리어. 총
z213|32 張地圖|32 张地图|32 maps|32 面|32개 맵
z214|（8 大主題 × 4 張），每一區的第 4 張是魔王關，第 32 關＝最終魔王「魔王之間」。|（8 大主题 × 4 张），每一区的第 4 张是魔王关，第 32 关＝最终魔王「魔王之间」。|(8 themes × 4), the 4th map of each area is a boss stage, and stage 32 is the final boss, the Demon King's chamber.|（8 大テーマ × 4 面）で、各エリアの 4 面目がボス面、32 面が最終ボス「魔王の間」。|(8개 테마 × 4장) 각 구역의 4번째가 보스 스테이지, 32스테이지=최종 보스 «마왕의 방».
z215|把對手炸光就得分，先拿到|把对手炸光就得分，先拿到|Blow up your rivals to score; the first to reach|相手を全員吹き飛ばすと得点、先に|상대를 다 터뜨리면 득점, 먼저
z216|指定勝場數|指定胜场数|the set number of wins|指定の勝利数|지정 승수
z217|的人獲勝；沒人加入的位子由 🤖 AI 補位。|的人获胜；没人加入的位子由 🤖 AI 补位。|wins takes it; empty seats are filled by 🤖 AI.|に到達した人の勝ち。空き枠は 🤖 AI が入ります。|에 도달한 사람이 승리. 빈자리는 🤖 AI가 채운다.
z218|線上配對：用|线上配对：用|Online match: use|オンライン対戦：|온라인 대전: 
z219|房號|房号|a room code|ルーム番号|방 번호
z220|開房／加入朋友的房間，或快速配對。手機連 PC 房也能一起玩。|开房／加入朋友的房间，或快速配对。手机连 PC 房也能一起玩。|to open a room, join a friend's room, or quick-match. Phone and PC rooms can play together.|で部屋を作る／友だちの部屋に入る、またはクイックマッチ。スマホと PC の部屋も一緒に遊べます。|로 방을 만들거나 친구 방에 들어가거나 빠른 매칭. 폰과 PC 방도 함께 플레이 가능.
z221|軟磚|软砖|soft block|軟らかいブロック|부서지는 블록
z222|：炸得掉，裡面藏道具、恐龍蛋，甚至過關傳送門。|：炸得掉，里面藏道具、恐龙蛋，甚至过关传送门。|: destructible; hides items, dino eggs and even the warp gate.|：壊せる。中にアイテム・恐竜の卵・ワープゲートが隠れている。|: 터뜨릴 수 있고, 안에 아이템·공룡알·워프 게이트가 숨었다.
z223|硬牆|硬墙|hard wall|硬い壁|단단한 벽
z224|：炸不掉的固定石柱，用來規劃路線與躲火焰。|：炸不掉的固定石柱，用来规划路线与躲火焰。|: indestructible pillar; use it to plan routes and dodge flames.|：壊せない固定の石柱。ルート作りや炎避けに使う。|: 터뜨릴 수 없는 고정 기둥. 길을 짜고 불꽃을 피할 때 쓴다.
z225|：放下後約 2.4 秒爆炸（拿遙控器則等你引爆）。|：放下后约 2.4 秒爆炸（拿遥控器则等你引爆）。|: explodes about 2.4s after placement (with a remote it waits for you).|：置いてから約 2.4 秒で爆発（リモコンを持っていれば自分の起爆待ち）。|: 설치 후 약 2.4초 뒤 폭발(리모컨이 있으면 직접 터뜨릴 때까지 기다린다).
z226|：十字噴發，碰到就扣一條命（連鎖會引爆其他炸彈）。|：十字喷发，碰到就扣一条命（连锁会引爆其他炸弹）。|: bursts in a cross; touching it costs a life (chain-detonates other bombs).|：十字に噴出、触れるとライフ 1 減（連鎖で他の爆弾も誘爆）。|: 십자로 터지고 닿으면 목숨 1 감소(연쇄로 다른 폭탄도 터진다).
z227|過關傳送門|过关传送门|warp gate|クリアゲート|클리어 게이트
z228|：殲滅所有敵人後才會開啟，走進去就過關。|：歼灭所有敌人后才会开启，走进去就过关。|: opens only after every enemy is gone; step in to clear the stage.|：敵を全滅させると開く。入ればクリア。|: 적을 모두 처치해야 열린다. 들어가면 클리어.
z229|・初始|・初始|· Start with|・初期|· 시작
z230|3 條命|3 条命|3 lives|3 ライフ|3 목숨
z231|；碰到怪物、火焰或被別人炸到就扣 1 條，❤️ 愛心可以 +1。|；碰到怪物、火焰或被别人炸到就扣 1 条，❤️ 爱心可以 +1。|; monster, flame or enemy bomb hits cost 1, and ❤️ hearts add +1.|；敵・炎・他人の爆発に触れると 1 減、❤️ ハートで +1。|; 몬스터·불꽃·남의 폭발에 닿으면 1 감소, ❤️ 하트로 +1.
z232|・單人可選 3／5／10 分或|・单人可选 3／5／10 分或|· Solo offers 3/5/10 minutes or|・ソロは 3／5／10 分または|· 솔로는 3/5/10분 또는
z233|；時間到會陣亡，無限時間則慢慢玩也沒關係。|；时间到会阵亡，无限时间则慢慢玩也没关系。|; time running out kills you, unlimited lets you take your time.|；時間切れで倒れる。無限ならゆっくり遊べる。|; 시간이 다 되면 사망, 무한이면 천천히 즐겨도 된다.
z234|🔥 火力|🔥 火力|🔥 Power|🔥 火力|🔥 화력
z235|火焰範圍|火焰范围|Flame range|炎の範囲|불꽃 범위
z236|+1 格|+1 格|+1 tile|+1 マス|+1칸
z237|（最多 10 格），爆炸時火舌打得更遠。|（最多 10 格），爆炸时火舌打得更远。|(max 10 tiles); flames reach further.|（最大 10 マス）爆発の炎がより遠くまで届く。|(최대 10칸) 폭발 불꽃이 더 멀리 뻗는다.
z238|📌 走上去自動撿起，立刻永久生效（陣亡才歸零）。|📌 走上去自动捡起，立刻永久生效（阵亡才归零）。|📌 Walk over it to pick it up; permanent until you die.|📌 踏むだけで拾え、すぐ永久に有効（倒れるまで持続）。|📌 밟으면 자동 획득, 즉시 영구 적용(죽어야 초기화).
z239|💡 配「穿透彈」可以一次燒穿整排軟磚。|💡 配「穿透弹」可以一次烧穿整排软砖。|💡 Pair with "Pierce Bomb" to burn through a whole row of soft blocks.|💡 「貫通弾」と組み合わせると軟らかいブロックを一列まとめて焼ける。|💡 «관통탄»과 함께면 부서지는 블록을 한 줄로 태운다.
z240|同時能放在場上的炸彈數|同时能放在场上的炸弹数|how many bombs you can place at once|同時に置ける爆弾の数|동시에 놓을 수 있는 폭탄 수
z241|（最多 8 顆）。|（最多 8 颗）。|(max 8).|（最大 8 個）。|(최대 8개).
z242|💡 彈量夠多才能一次開好幾條路、或把對手包圍。|💡 弹量够多才能一次开好几条路、或把对手包围。|💡 More bombs let you open several paths at once or box a rival in.|💡 弾数が多いほど一度に何本も道を開き、相手を囲める。|💡 탄수가 많아야 한 번에 여러 길을 열거나 상대를 둘러쌀 수 있다.
z243|移動速度|移动速度|Move speed|移動速度|이동 속도
z244|+1 級|+1 级|+1 level|+1 レベル|+1레벨
z245|（最多 6 級）。|（最多 6 级）。|(max 6).|（最大 6 レベル）。|(최대 6레벨).
z246|💡 甩掉追擊型怪物（骷髏兵、疾風蜥）最好用。|💡 甩掉追击型怪物（骷髅兵、疾风蜥）最好用。|💡 Best for shaking off chasers (skeletons, gale lizards).|💡 追ってくる敵（ガイコツ兵・疾風トカゲ）を振り切るのに最適。|💡 추격형 몬스터(해골병·질풍도마뱀)를 떼는 데 최고.
z247|走路撞到炸彈會把它|走路撞到炸弹会把它|Walking into a bomb will|歩いて爆弾にぶつかると|걸어서 폭탄에 부딪히면
z248|踢走|踢走|kick it away|蹴り飛ばす|차버린다
z249|，一路滑到撞牆才停。|，一路滑到撞墙才停。|; it slides until it hits a wall.|。壁に当たるまで滑っていく。|. 벽에 닿을 때까지 미끄러진다.
z250|📌 撿起後自動生效：用身體去撞炸彈即可。|📌 捡起后自动生效：用身体去撞炸弹即可。|📌 Automatic once picked up: just bump a bomb with your body.|📌 拾えば自動で有効：体で爆弾にぶつかるだけ。|📌 주우면 자동 적용: 몸으로 폭탄에 부딪히면 된다.
z251|💡 把炸彈踢到對手腳下，或踢去炸遠處的軟磚。|💡 把炸弹踢到对手脚下，或踢去炸远处的软砖。|💡 Kick bombs at your rival's feet or into far-off soft blocks.|💡 相手の足元へ蹴り込む、遠くの軟らかいブロックを狙うのも有効。|💡 상대 발밑으로 차거나 먼 부서지는 블록을 노려라.
z252|可以|可以|You can|できる|가능
z253|撿起炸彈再丟出去|捡起炸弹再丢出去|pick a bomb up and throw it|爆弾を拾って投げる|폭탄을 집어 던진다
z254|，丟出去時會|，丢出去时会|; when thrown it|。投げると|. 던지면
z255|越過牆壁|越过墙壁|flies over walls|壁を越える|벽을 넘는다
z256|📌 走到炸彈上按「動作鍵」撿起，再按一次丟出。|📌 走到炸弹上按「动作键」捡起，再按一次丢出。|📌 Stand on a bomb, press Action to pick it up, press again to throw.|📌 爆弾の上で「アクション」を押して拾い、もう一度押すと投げる。|📌 폭탄 위에서 «액션»을 눌러 집고, 한 번 더 누르면 던진다.
z257|💡 隔牆偷襲；也能把快爆的炸彈丟到安全處。|💡 隔墙偷袭；也能把快爆的炸弹丢到安全处。|💡 Ambush over walls; also toss a nearly-exploding bomb somewhere safe.|💡 壁越しの奇襲に。爆発寸前の爆弾を安全な場所へ投げるのにも使える。|💡 벽 너머 기습에. 곧 터질 폭탄을 안전한 곳으로 던질 수도 있다.
z258|撞到炸彈會把它|撞到炸弹会把它|Bumping a bomb will|爆弾にぶつかると|폭탄에 부딪히면
z259|一路打到地圖另一端|一路打到地图另一端|send it to the other side of the map|マップの反対側まで飛ばす|맵 반대편까지 날린다
z260|📌 撿起後自動生效：用身體撞炸彈。|📌 捡起后自动生效：用身体撞炸弹。|📌 Automatic once picked up: bump a bomb with your body.|📌 拾えば自動で有効：体で爆弾にぶつかる。|📌 주우면 자동 적용: 몸으로 폭탄에 부딪히면 된다.
z261|💡 比踢彈更快，長直走廊最有效率。|💡 比踢弹更快，长直走廊最有效率。|💡 Faster than kicking; best in long straight corridors.|💡 蹴るより速い。長い直線の通路で最も効率的。|💡 차는 것보다 빠르고 긴 직선 복도에서 가장 효율적.
z262|不會自己爆|不会自己爆|won't explode on its own|自然には爆発しない|스스로 터지지 않는다
z263|，按遙控鍵一次全部引爆；同時彈量|，按遥控键一次全部引爆；同时弹量|; press the remote to blow them all at once; bomb count|。リモコンで一気に全部起爆。同時に置ける数は|. 리모컨으로 한 번에 모두 터뜨린다. 동시에 놓을 수 있는 수는
z264|（最多 8）。|（最多 8）。|(max 8).|（最大 8）。|(최대 8).
z265|📌 放彈後按|📌 放弹后按|📌 After placing, press|📌 置いたあと|📌 설치 후
z266|／📱 引爆（手機按 📱 鈕）。|／📱 引爆（手机按 📱 钮）。|/📱 to detonate (on mobile tap the 📱 button).|／📱 で起爆（スマホは 📱 ボタン）。|/📱 로 기폭(폰은 📱 버튼).
z267|💡 先繞場放一排，退到安全處再一次引爆，清場超快。|💡 先绕场放一排，退到安全处再一次引爆，清场超快。|💡 Lay a row around the field, back off, then detonate everything at once.|💡 一列に置いてから安全な場所へ下がり一斉起爆。殲滅が速い。|💡 둘레에 한 줄로 깔고 안전한 곳으로 물러나 한 번에 터뜨리면 정리가 빠르다.
z268|火焰可以|火焰可以|Flames can|炎は|불꽃은
z269|穿透軟磚|穿透软砖|pierce soft blocks|軟らかいブロックを貫通する|부서지는 블록을 관통한다
z270|繼續燒，不會被第一塊磚擋住。|继续烧，不会被第一块砖挡住。|and keep burning; the first block won't stop them.|。最初のブロックで止まらない。|. 첫 블록에 막히지 않는다.
z271|💡 找出藏在軟磚底下的傳送門最快的方法。|💡 找出藏在软砖底下的传送门最快的方法。|💡 The fastest way to find a gate hidden under soft blocks.|💡 軟らかいブロックの下のゲートを最短で見つける方法。|💡 부서지는 블록 아래 게이트를 가장 빨리 찾는 법.
z272|生命|生命|Life|ライフ|목숨
z273|（多一次犯錯機會）。|（多一次犯错机会）。|(one extra mistake allowed).|（ミスが 1 回増える）。|(실수 한 번 더 허용).
z274|一次在面前|一次在面前|instantly in front of you|一気に目の前に|한 번에 눈앞에
z275|排出一整排炸彈|排出一整排炸弹|line up a whole row of bombs|爆弾を一列に並べる|폭탄을 한 줄로 깐다
z276|，全部同時爆炸。|，全部同时爆炸。|; they all explode together.|。すべて同時に爆発する。|. 전부 동시에 터진다.
z277|📌 按「動作鍵」觸發。|📌 按「动作键」触发。|📌 Triggered with the Action button.|📌 「アクション」で発動。|📌 «액션» 버튼으로 발동.
z278|💡 對著長排軟磚或一群怪使用，一次清光。|💡 对着长排软砖或一群怪使用，一次清光。|💡 Aim at a long row of soft blocks or a mob to clear it in one go.|💡 長い列の軟らかいブロックや敵の群れに使えば一掃できる。|💡 긴 블록 줄이나 몬스터 무리에 쓰면 한 번에 정리.
z279|負面|负面|Curse|マイナス|저주
z280|詛咒！隨機中一種：|诅咒！随机中一种：|Curse! One random effect:|呪い！ランダムで 1 種類：|저주! 무작위로 하나:
z281|，持續|，持续|for|、効果時間|, 지속
z282|8 秒|8 秒|8s|8 秒|8초
z283|📌 踩到就中獎；去撞其他玩家或怪物可以把詛咒|📌 踩到就中奖；去撞其他玩家或怪物可以把诅咒|📌 Step on it and you're cursed; bump another player or a monster to|📌 踏むと発動。他のプレイヤーや敵にぶつかると呪いを|📌 밟으면 걸린다. 다른 플레이어나 몬스터에 부딪히면 저주를
z284|傳給他|传给他|pass it on|押しつける|넘겨준다
z285|💡 單人模式盡量別踩；對戰時故意撞對手害人。|💡 单人模式尽量别踩；对战时故意撞对手害人。|💡 Avoid it solo; in battle, bump rivals on purpose.|💡 ソロでは踏まない。対戦ではわざと相手にぶつけて押しつけよう。|💡 솔로에선 피하고, 대전에선 일부러 상대에게 부딪혀 넘겨라.
z286|🥚 恐龍蛋|🥚 恐龙蛋|🥚 Dino egg|🥚 恐竜の卵|🥚 공룡알
z287|恐龍蛋|恐龙蛋|dino egg|恐竜の卵|공룡알
z288|藏在軟磚裡|藏在软砖里|hidden inside soft blocks|軟らかいブロックの中に隠れている|부서지는 블록 속에 숨었다
z289|，打掉那塊磚才會冒出來，|，打掉那块砖才会冒出来，|; break that block and it pops out,|。そのブロックを壊すと出てくる。|. 그 블록을 부숴야 나온다.
z290|走上去就孵化|走上去就孵化|step on it to hatch|乗ると孵化して|올라가면 부화해서
z291|並立刻騎上。|并立刻骑上。|and you're riding it at once.|すぐに騎乗する。|곧바로 탑승한다.
z292|📌 數量：😇 簡單 3 顆／🙂 普通 2 顆／😈 困難 1 顆（BOSS 關固定 2 顆）。|📌 数量：😇 简单 3 颗／🙂 普通 2 颗／😈 困难 1 颗（BOSS 关固定 2 颗）。|📌 Count: 😇 Easy 3 / 🙂 Normal 2 / 😈 Hard 1 (boss stages always 2).|📌 数：😇 かんたん 3 個／🙂 ふつう 2 個／😈 むずかしい 1 個（ボス面は必ず 2 個）。|📌 개수: 😇 쉬움 3개／🙂 보통 2개／😈 어려움 1개 (보스 스테이지는 항상 2개).
z293|（道具不會），想騎龍就別炸到蛋。|（道具不会），想骑龙就别炸到蛋。|(items don't), so don't hit the egg if you want a dragon.|（アイテムは消えない）。竜に乗りたいなら卵を爆風に入れないこと。|(아이템은 안전). 용을 타고 싶으면 알을 건드리지 마라.
z294|🦖 小龍（吃第 1 顆蛋）|🦖 小龙（吃第 1 颗蛋）|🦖 Dino (first egg)|🦖 小竜（1 個目の卵）|🦖 꼬마 용 (첫 알)
z295|騎上後|骑上后|Once mounted|乗ると|타면
z296|多擋一次傷害|多挡一次伤害|blocks one extra hit|ダメージを 1 回多く防ぐ|피해를 한 번 더 막는다
z297|；按|；按|; press|。|; 
z298|／🔥 朝|／🔥 朝|/🔥 to breathe|／🔥 で|/🔥 로
z299|（冷卻 3 秒）。自己的火不會燒到自己，只燒別人。|（冷却 3 秒）。自己的火不会烧到自己，只烧别人。|(3s cooldown). Your own flames never hurt you, only others.|（クールダウン 3 秒）。自分の炎で自分は焼けず、相手だけを焼く。|(쿨 3초). 자기 불꽃에는 자기가 안 다치고 남만 탄다.
z300|📌 被炸彈／火焰／怪物碰到時，小龍|📌 被炸弹／火焰／怪物碰到时，小龙|📌 When a bomb, flame or monster hits you, the dino|📌 爆弾・炎・敵に触れられたとき、小竜が|📌 폭탄·불꽃·몬스터에 닿으면 꼬마 용이
z301|替你擋下那一次|替你挡下那一次|takes that one hit for you|その 1 回を代わりに受ける|그 한 번을 대신 막는다
z302|然後消失（獲得 1.8 秒無敵）。|然后消失（获得 1.8 秒无敌）。|then vanishes (you get 1.8s of invincibility).|。その後消え、1.8 秒の無敵を得る。|. 그리고 사라지며 1.8초 무적.
z303|💡 單方向清怪最好用；先轉身再按就能換方向。|💡 单方向清怪最好用；先转身再按就能换方向。|💡 Great for clearing one direction; turn first, then press to change aim.|💡 一方向の殲滅に最適。先に向きを変えてから押せば方向を変えられる。|💡 한 방향 정리에 최고. 먼저 돌아선 뒤 누르면 방향이 바뀐다.
z304|🐲 紅龍（騎乘中再吃第 2 顆蛋）|🐲 红龙（骑乘中再吃第 2 颗蛋）|🐲 Red Dragon (second egg while riding)|🐲 赤竜（乗ったまま 2 個目の卵）|🐲 붉은 용 (탄 상태에서 두 번째 알)
z305|體型更大、一身紅鱗；吐火升級成|体型更大、一身红鳞；吐火升级成|Bigger, covered in red scales; its breath upgrades to|体格が大きくなり赤い鱗に。炎が|몸집이 커지고 붉은 비늘, 화염이
z306|上下左右四個方向各 2 格|上下左右四个方向各 2 格|2 tiles in all four directions|上下左右 4 方向に 2 マスずつ|상하좌우 네 방향 2칸씩
z307|📌 一樣只能擋一次傷害，被炸到龍就消失。|📌 一样只能挡一次伤害，被炸到龙就消失。|📌 Still blocks only one hit; one blast and the dragon is gone.|📌 同じく 1 回だけ防ぐ。爆風を受けると竜は消える。|📌 마찬가지로 한 번만 막고, 폭발에 맞으면 용은 사라진다.
z308|💡 被怪包圍時按一下就清場，是闖關神技。|💡 被怪包围时按一下就清场，是闯关神技。|💡 One press clears a whole mob — a stage-winning trick.|💡 囲まれたら 1 押しで一掃。ステージ攻略の切り札。|💡 포위되면 한 번 눌러 정리하는 필살기.
z309|項目|项目|Item|項目|항목
z310|取得方式|取得方式|How to get it|入手方法|얻는 방법
z311|吃第 1 顆蛋|吃第 1 颗蛋|first egg|1 個目の卵|첫 번째 알
z312|騎乘中再吃第 2 顆蛋|骑乘中再吃第 2 颗蛋|second egg while riding|乗ったまま 2 個目の卵|탄 채 두 번째 알
z313|外觀|外观|Looks|見た目|외형
z314|綠色小龍|绿色小龙|green dino|緑の小竜|초록 꼬마 용
z315|更大、一身紅鱗|更大、一身红鳞|bigger, red scales|大きく赤い鱗|더 크고 붉은 비늘
z316|吐火範圍|吐火范围|Breath range|炎の範囲|화염 범위
z317|1 個方向|1 个方向|1 direction|1 方向|1방향
z318|上下左右|上下左右|all four directions|上下左右|상하좌우
z319|4 個方向|4 个方向|4 directions|4 方向|4방향
z320|各 2 格|各 2 格|2 tiles each|それぞれ 2 マス|각 2칸
z321|冷卻時間|冷却时间|Cooldown|クールダウン|쿨타임
z322|擋傷害|挡伤害|Blocks a hit|ダメージを防ぐ|피해 방어
z323|自傷|自伤|Self-damage|自傷|자기 피해
z324|沒有任何機關，適合熟悉操作、安心撿道具。|没有任何机关，适合熟悉操作、安心捡道具。|No hazards at all — perfect for learning the controls and grabbing items.|仕掛けは一切なし。操作に慣れてアイテムを拾うのに最適。|장치가 전혀 없다. 조작을 익히고 아이템을 줍기 좋다.
z325|無機關|无机关|No hazards|仕掛けなし|장치 없음
z326|登場：踩進去會被傳到另一個門。|登场：踩进去会被传到另一个门。|Arrives: step in and you're warped to another gate.|登場：入ると別のゲートへワープ。|등장: 들어가면 다른 게이트로 워프.
z327|：踩上去滑到底，放彈要算好落點。|：踩上去滑到底，放弹要算好落点。|: step on it and slide all the way; aim your bombs carefully.|：乗ると端まで滑る。爆弾の位置はよく考えて。|: 밟으면 끝까지 미끄러진다. 폭탄 위치를 잘 계산하자.
z328|開始出現|开始出现|First appears|登場し始める|등장하기 시작
z329|，走位會被推著跑。|，走位会被推着跑。|; the belt pushes you along.|。ベルトに押されて動く。|. 벨트가 밀어 준다.
z330|冰面 ＋ 輸送帶|冰面 ＋ 输送带|Ice + conveyor|氷 ＋ ベルト|얼음 ＋ 컨베이어
z331|雙重機關|双重机关|double hazards|二重の仕掛け|이중 장치
z332|，走位要特別小心。|，走位要特别小心。|; watch your footing.|。立ち回りに特に注意。|. 이동에 특히 주의.
z333|傳送門 ＋ 冰面；被追時用門甩開最有效。|传送门 ＋ 冰面；被追时用门甩开最有效。|Gate + ice; the gate is the best way to shake a chase.|ゲート ＋ 氷。追われたらゲートで振り切るのが一番。|게이트 ＋ 얼음. 쫓길 때 게이트로 떼는 게 최고.
z334|輸送帶 ＋ 傳送門；注意別被帶進死角。|输送带 ＋ 传送门；注意别被带进死角。|Conveyor + gate; don't get carried into a dead end.|ベルト ＋ ゲート。袋小路に運ばれないよう注意。|컨베이어 ＋ 게이트. 막다른 길로 끌려가지 마라.
z335|三種機關|三种机关|all three hazards|3 種類の仕掛け|세 가지 장치
z336|全部登場|全部登场|all appear|すべて登場|모두 등장
z337|，還有|，还有|, plus|、さらに|, 그리고
z338|👑 暗黑魔王|👑 暗黑魔王|👑 Dark Demon King|👑 暗黒魔王|👑 암흑마왕
z339|鎮守最終關。|镇守最终关。|guards the final stage.|が最終面を守る。|가 최종 스테이지를 지킨다.
z340|踩上去會|踩上去会|Step on it and you|乗ると|밟으면
z341|一路滑到底|一路滑到底|slide all the way|端まで滑る|끝까지 미끄러진다
z342|，轉彎困難，很容易滑進火裡。|，转弯困难，很容易滑进火里。|; turning is hard and you'll slide into flames easily.|。曲がりにくく、炎に滑り込みやすい。|. 방향 전환이 어려워 불꽃에 미끄러지기 쉽다.
z343|踩進去會被|踩进去会被|Step in and you're|入ると|들어가면
z344|傳到另一個門|传到另一个门|warped to another gate|別のゲートへワープする|다른 게이트로 워프한다
z345|；追人、逃跑、繞路都好用。|；追人、逃跑、绕路都好用。|; great for chasing, escaping and rerouting.|。追撃・逃走・回り込みに便利。|. 추격·도주·우회에 모두 유용.
z346|順著箭頭方向|顺着箭头方向|Along the arrows you|矢印の向きに進むと|화살표 방향으로 가면
z347|加速|加速|speed up|加速する|가속한다
z348|、逆向會|、逆向会|, against them you|、逆らうと|, 반대로 가면
z349|變慢|变慢|slow down|減速する|느려진다
z350|；橫著走出去會被皮帶|；横着走出去会被皮带|; stepping off sideways, the belt|。横へ抜けるときベルトに|; 옆으로 빠져나가면 벨트가
z351|甩得很快|甩得很快|flings you out fast|勢いよく弾き出される|빠르게 튕겨 나간다
z352|，不會黏在上面。|，不会黏在上面。|; you won't stick to it.|。張り付いたままにはならない。|. 달라붙어 있지는 않는다.
z353|目標|目标|Goal|目標|목표
z354|操作|操作|Controls|操作|조작
z355|中階／高階|中阶／高阶|mid / high tier|中級／高級|중급／고급
z356|最基礎的小怪，隨機亂走。|最基础的小怪，随机乱走。|The most basic foe; wanders at random.|最も基本の敵。ランダムにうろつく。|가장 기본 몬스터. 무작위로 돌아다닌다.
z357|才會倒，常一次來好幾隻。頭上會顯示血條。|才会倒，常一次来好几只。头上会显示血条。|to go down, and they come in groups. A health bar shows above them.|で倒れる。何体もまとめて来ることが多い。頭上に体力バー表示。|번에 쓰러진다. 여러 마리가 한꺼번에 오기도 한다. 머리 위에 체력 바가 뜬다.
z358|蹦蹦兔|蹦蹦兔|Hopper Bunny|ピョンピョンうさぎ|깡충토끼
z359|小青蛙|小青蛙|Little Frog|小さなカエル|꼬마 개구리
z360|毛毛蟲|毛毛虫|Caterpillar|イモムシ|애벌레
z361|毒菇怪亂走、|毒菇怪乱走、|Poison Shrooms wander about and|毒キノコはうろつき、|독버섯은 돌아다니고
z362|速度最慢|速度最慢|the slowest of all|いちばん遅い|가장 느리다
z363|，最好欺負，但常常擠成一團。|，最好欺负，但常常挤成一团。|; easy prey, but they clump up.|。一番弱いが、よく固まっている。|. 제일 만만하지만 자주 뭉친다.
z364|主動追人|主动追人|actively chases you|自分から追ってくる|먼저 쫓아온다
z365|。有硬甲，|。有硬甲，|. It has a hard shell and|。硬い甲羅があり、|. 단단한 껍질이라
z366|才會倒。|才会倒。|needs several hits.|数回で倒れる。|여러 번 때려야 쓰러진다.
z367|橫著亂走，路線很難抓。|横着乱走，路线很难抓。|Moves sideways at random; hard to predict.|横歩きでうろつく。進路が読みにくい。|옆으로 걸어 다닌다. 경로를 잡기 어렵다.
z368|，但常堵在窄路上。|，但常堵在窄路上。|, but often blocks narrow paths.|。ただし狭い通路をふさぎがち。|. 하지만 좁은 길을 자주 막는다.
z369|木乃伊小兵|木乃伊小兵|Mummy Trooper|ミイラ兵|미라 병사
z370|眼球怪：穿牆飛行、速度慢，但會|眼球怪：穿墙飞行、速度慢，但会|Eye Ball: flies through walls, slow, but will|目玉怪：壁を抜けて飛ぶ。遅いが|눈알 몬스터: 벽을 통과해 날고 느리지만
z371|偶爾|偶尔|now and then|ときどき|가끔
z372|朝你飄過來。|朝你飘过来。|drift toward you.|あなたの方へ漂ってくる。|너에게 떠내려온다.
z373|流沙蟲|流沙虫|Quicksand Worm|流砂虫|모래벌레
z374|沙丘獸|沙丘兽|Dune Beast|砂丘獣|모래언덕 짐승
z375|沙地蠍子|沙地蝎子|Sand Scorpion|砂サソリ|모래전갈
z376|企鵝：走起路來|企鹅：走起路来|Penguin: walks|ペンギン：歩くと|펭귄: 걸으면
z377|搖搖擺擺|摇摇摆摆|with a waddle|よたよたと|뒤뚱뒤뚱
z378|但速度不慢。|但速度不慢。|but isn't slow at all.|。しかも速い。|. 하지만 느리지 않다.
z379|冰晶怪|冰晶怪|Ice Crystal|氷晶怪|얼음결정 몬스터
z380|飛行怪：|飞行怪：|Flyer: |飛行の敵：|비행 몬스터: 
z381|可以越過牆壁|可以越过墙壁|flies over walls|壁を越えられる|벽을 넘을 수 있다
z382|，躲牆後沒用。直線飛、撞到邊界反彈。|，躲墙后没用。直线飞、撞到边界反弹。|; hiding behind walls won't help. Flies straight and bounces off edges.|。壁の陰に隠れても無駄。直進し、端で跳ね返る。|. 벽 뒤에 숨어도 소용없다. 직선으로 날고 경계에서 튕긴다.
z383|雪球怪|雪球怪|Snowball|雪玉怪|눈덩이 몬스터
z384|小海豹|小海豹|Seal Pup|小アザラシ|아기 물범
z385|貓熊：圓滾滾、|猫熊：圆滚滚、|Panda: round and|パンダ：まんまるで|판다: 동글동글하고
z386|超慢|超慢|very slow|とても遅い|아주 느리다
z387|，但很大一隻，看起來很不好惹。|，但很大一只，看起来很不好惹。|, but huge and looks like bad news.|。でも体が大きく、強そうに見える。|. 하지만 덩치가 커서 만만치 않아 보인다.
z388|熔岩史萊姆|熔岩史莱姆|Lava Slime|溶岩スライム|용암 슬라임
z389|熔岩蠕蟲|熔岩蠕虫|Lava Worm|溶岩ワーム|용암 벌레
z390|毒蜂：|毒蜂：|Poison Bee: |毒バチ：|독벌: 
z391|飛行怪裡最快的一隻|飞行怪里最快的一只|the fastest flyer of them all|飛行の敵で最速|비행 몬스터 중 가장 빠르다
z392|，但已經調慢，偶爾才會往你靠。|，但已经调慢，偶尔才会往你靠。|, but it has been slowed down and only rarely comes for you.|。ただし調整で遅くなり、たまにしか寄ってこない。|. 다만 느려져서 가끔만 다가온다.
z393|：自己會放炸彈，但火焰|：自己会放炸弹，但火焰|: it drops bombs of its own, but its flames|：自分で爆弾を置くが、炎は|: 스스로 폭탄을 놓지만 불꽃은
z394|只有 1 格|只有 1 格|reach only 1 tile|1 マスだけ|1칸뿐
z395|，還好躲。|，还好躲。|; easy to dodge.|。避けやすい。|. 피하기 쉽다.
z396|疾風蜥：|疾风蜥：|Gale Lizard: |疾風トカゲ：|질풍도마뱀: 
z397|地面最快的追擊怪|地面最快的追击怪|the fastest ground chaser|地上最速の追跡者|지상 최고 속도 추격자
z398|，直直朝你衝。甩不掉就用滑冰鞋。|，直直朝你冲。甩不掉就用滑冰鞋。|, charging straight at you. Can't shake it? Use ice skates.|。まっすぐ突っ込んでくる。振り切れないならスケート靴を。|. 곧장 돌진한다. 못 떼면 스케이트를 써라.
z399|岩石小怪|岩石小怪|Rock Critter|岩の小怪|바위 몬스터
z400|鬼火：|鬼火：|Will-o'-Wisp: |鬼火：|도깨비불: 
z401|半透明的小火焰|半透明的小火焰|a see-through little flame|半透明の小さな炎|반투명한 작은 불꽃
z402|，會到處飄，尾巴還會冒火星。|，会到处飘，尾巴还会冒火星。|; drifts around and sparks trail from its tail.|。あちこち漂い、尾から火花が散る。|. 여기저기 떠다니고 꼬리에서 불똥이 튄다.
z403|：會把你放的炸彈|：会把你放的炸弹|: it will take the bombs you place|：君が置いた爆弾を|: 네가 놓은 폭탄을
z404|撿起來丟回你身上|捡起来丢回你身上|and throw them back at you|拾って君に投げ返す|집어서 너에게 도로 던진다
z405|，看到炸彈別大意。|，看到炸弹别大意。|; don't relax when you see a bomb.|。爆弾を見ても油断しないこと。|. 폭탄이 보여도 방심하지 마라.
z406|機器人：紅色|机器人：红色|Robot: red|ロボット：赤い|로봇: 붉은
z407|單眼|单眼|single eye|単眼|외눈
z408|，行動很機械，會直直追你。|，行动很机械，会直直追你。|; moves mechanically and comes straight for you.|。機械的な動きでまっすぐ追ってくる。|. 기계처럼 움직이며 곧장 쫓아온다.
z409|電音小怪|电音小怪|Synth Critter|エレクトロ小怪|신스 몬스터
z410|雷射蜂|雷射蜂|Laser Bee|レーザーバチ|레이저 벌
z411|霓虹機器人|霓虹机器人|Neon Robot|ネオンロボット|네온 로봇
z412|章魚：八條觸手在地上爬，看不出牠往哪走。|章鱼：八条触手在地上爬，看不出它往哪走。|Octopus: crawls on eight tentacles; you can't tell where it's heading.|タコ：8 本の触手で這う。どこへ行くか読めない。|문어: 여덟 다리로 기어간다. 어디로 갈지 모른다.
z413|燈籠魚|灯笼鱼|Anglerfish|チョウチンアンコウ|초롱아귀
z414|幽靈：穿牆飛行、速度慢，但會|幽灵：穿墙飞行、速度慢，但会|Ghost: flies through walls, slow, but will|ゴースト：壁を抜けて飛ぶ。遅いが|유령: 벽을 통과해 날고 느리지만
z415|慢慢飄向你|慢慢飘向你|drift slowly toward you|ゆっくり漂ってくる|천천히 떠내려온다
z416|寄居蟹兵|寄居蟹兵|Hermit Crab Trooper|ヤドカリ兵|소라게 병사
z417|水母小怪|水母小怪|Jellyfish|クラゲ|해파리
z418|海膽怪|海胆怪|Urchin|ウニ|성게
z419|大黃蜂：|大黄蜂：|Hornet: |スズメバチ：|말벌: 
z420|非常快|非常快|very fast|とても速い|아주 빠르다
z421|，尾巴有螫針，翅膀聲音很大。|，尾巴有螫针，翅膀声音很大。|; its tail carries a stinger and its wings buzz loudly.|。尾に針があり、羽音が大きい。|. 꼬리에 침이 있고 날갯소리가 크다.
z422|雲端小飛艇|云端小飞艇|Sky Blimp|雲の小型飛行船|구름 비행선
z423|：會把附近的炸彈|：会把附近的炸弹|: it will take nearby bombs|：近くの爆弾を|: 근처 폭탄을
z424|拆掉|拆掉|and defuse them|解除してしまう|해체한다
z425|（拆掉不會爆炸），很煩。|（拆掉不会爆炸），很烦。|(defused bombs don't explode) — really annoying.|（解除されると爆発しない）。うっとうしい。|(해체된 폭탄은 터지지 않는다). 짜증난다.
z426|雷電球|雷电球|Thunder Orb|雷球|번개 구슬
z427|風精靈|风精灵|Wind Sprite|風の精|바람 정령
z428|疾風鷹|疾风鹰|Gale Hawk|疾風の鷹|질풍 매
z429|骷髏兵會|骷髅兵会|Skeletons will|ガイコツ兵は|해골병은
z430|追人|追人|chase you|追ってくる|쫓아온다
z431|、速度偏快，|、速度偏快，|, are fairly quick,|、速度は速めで|, 속도가 빠른 편이고
z432|。被盯上時最危險。|。被盯上时最危险。|. Most dangerous when locked on.|。狙われたときが一番危険。|. 표적이 되면 가장 위험하다.
z433|暗黑小惡魔|暗黑小恶魔|Dark Imp|暗黒の小悪魔|암흑 임프
z434|暗黑蝙蝠|暗黑蝙蝠|Dark Bat|暗黒コウモリ|암흑 박쥐
z435|小巫師：尖帽＋白鬍鬚，|小巫师：尖帽＋白胡须，|Little Wizard: pointy hat and white beard,|小魔法使い：とんがり帽＋白ひげ、|꼬마 마법사: 뾰족모자＋흰 수염,
z436|會找掩體躲炸彈|会找掩体躲炸弹|hides behind cover from bombs|物陰に隠れて爆弾を避ける|엄폐물에 숨어 폭탄을 피한다
z437|魔王近衛軍|魔王近卫军|Demon King's Guard|魔王近衛軍|마왕 근위군
z438|死亡騎士|死亡骑士|Death Knight|デスナイト|죽음의 기사
z439|👑 暗黑魔王（BOSS）|👑 暗黑魔王（BOSS）|👑 Dark Demon King (BOSS)|👑 暗黒魔王（BOSS）|👑 암흑마왕 (BOSS)
z440|血量從 5 點起、每往後一區 +1（最多 12 點）|血量从 5 点起、每往后一区 +1（最多 12 点）|HP starts at 5 and grows +1 per zone (up to 12)|HP は 5 から始まり、エリアごとに +1（最大 12）|체력은 5부터 시작해 구역마다 +1 (최대 12)
z441|、火焰 2 格，頭上有血條與 👑。|、火焰 2 格，头上有血条与 👑。|, 2-tile flames, with a health bar and 👑 above it.|、炎は 2 マス。頭上に体力バーと 👑。|, 불꽃 2칸. 머리 위에 체력 바와 👑.
z442|躲炸彈|躲炸弹|dodges bombs|爆弾を避ける|폭탄을 피한다
z443|：腳下有危險會先跑開，只走安全格。|：脚下有危险会先跑开，只走安全格。|: if the ground is dangerous it runs off and only walks safe tiles.|：足元が危険なら先に逃げ、安全なマスだけ歩く。|: 발밑이 위험하면 먼저 피해 안전한 칸만 걷는다.
z444|平常只在自己的地盤走來走去|平常只在自己的地盘走来走去|Normally it paces its own turf|普段は自分の縄張りを歩き回るだけ|평소엔 자기 구역만 서성인다
z445|（出生點附近 4 格），|（出生点附近 4 格），| (about 4 tiles around its spawn),|（出現地点から 4 マスほど）、| (출생 지점 근처 4칸),
z446|不會主動追你、也不放炸彈|不会主动追你、也不放炸弹|and won't chase you or drop bombs on its own|自分から追わず、爆弾も置かない|먼저 쫓지도, 폭탄도 놓지 않는다
z447|你踏進 3 格內|你踏进 3 格内|once you step within 3 tiles|3 マス以内に入ると|3칸 안에 들어오면
z448|牠才會發火（BOSS 塊頭大、看得比小怪遠，小怪是 2 格）：頭上冒出 😡 生氣泡泡，開始追你、在你附近放炸彈（遠處才丟過牆）。|它才会发火（BOSS 块头大、看得比小怪远，小怪是 2 格）：头上冒出 😡 生气泡泡，开始追你、在你附近放炸弹（远处才丢过墙）。|does it get angry (bosses are bigger and see farther; regular foes need 2 tiles): an 😡 bubble pops up, it starts chasing you and dropping bombs nearby (only throws over walls from afar).|怒り出す（BOSS は体が大きく視界も広い。小怪は 2 マス）：頭上に 😡 マークが出て追いかけてきて、近くに爆弾を置く（遠いときだけ壁越しに投げる）。|화를 낸다(BOSS는 덩치가 크고 더 멀리 본다. 잡몹은 2칸). 머리 위에 😡 표시가 뜨고 쫓아오며 근처에 폭탄을 놓는다(멀 때만 벽 너머로 던진다).
z449|跑出 3 格外牠就回去踱步|跑出 3 格外它就回去踱步|step outside 3 tiles and it goes back to pacing|3 マスから出ると持ち場に戻る|3칸 밖으로 나가면 제자리로 돌아간다
z450|血量降到|血量降到|Below|HP が|체력이
z451|40% 以下進入爆走|40% 以下进入爆走|40% it goes berserk|40% を切ると暴走|40% 아래로 떨어지면 폭주
z452|：跑更快、丟彈更兇（同場最多 6 顆）。|：跑更快、丢弹更凶（同场最多 6 颗）。|: faster, hurls more bombs (up to 6 on the field).|：より速く動き、爆弾を多く置く（同時 6 個まで）。|: 더 빨라지고 폭탄을 더 많이 놓는다(동시 6개까지).
z453|被炸彈砸到會|被炸弹砸到会|Get hit by a bomb and it|爆弾が当たると|폭탄에 맞으면
z454|暈一下|晕一下|is stunned|ひるむ|잠시 기절한다
z455|（頭上轉圈圈），趁這時候補刀。|（头上转圈圈），趁这时候补刀。| (stars spin overhead) — that's your window to strike.|（頭上に星が回る）。その隙に追撃。|(머리 위에 별이 돈다). 그 틈에 마무리타.
z456|打完全部血量就討伐成功 🎉|打完全部血量就讨伐成功 🎉|Drain all its HP and the hunt is won 🎉|HP を削り切れば討伐成功 🎉|체력을 다 깎으면 토벌 성공 🎉
z457|開局先炸|开局先炸|At the start, blow up|開幕はまず|시작하자마자
z458|自己旁邊的軟磚|自己旁边的软砖|the soft blocks next to you|自分の隣の軟らかいブロック|자기 옆 부서지는 블록
z459|擴張空間，別一開始就把自己關進死巷。|扩张空间，别一开始就把自己关进死巷。|to open up space; don't lock yourself into a dead end.|。スペースを広げ、序盤に袋小路へ閉じこもらないこと。|. 공간을 넓히고 초반에 막다른 길에 갇히지 마라.
z460|拿到遙控器：先繞場|拿到遥控器：先绕场|With a remote: circle the field and|リモコンを取ったら：場を回って|리모컨을 얻으면: 둘레를 돌며
z461|放一排|放一排|lay a row of bombs|一列に置く|한 줄로 깐다
z462|，退到安全處按一次 E 全部引爆，效率最高。|，退到安全处按一次 E 全部引爆，效率最高。|; back off and press E once to blow them all — the most efficient clear.|。安全な場所へ下がり E を 1 回押して一斉起爆。これが一番効率的。|. 안전한 곳으로 물러나 E를 한 번 눌러 모두 터뜨리면 가장 효율적.
z463|穿透彈 ＋ 火力 ＝|穿透弹 ＋ 火力 ＝|Pierce Bombs + Power =|貫通弾 ＋ 火力 ＝|관통탄 ＋ 화력 ＝
z464|一次燒穿整排軟磚|一次烧穿整排软砖|burn through a whole row of soft blocks|軟らかいブロックを一列まとめて焼く|부서지는 블록을 한 줄로 태운다
z465|，找傳送門最快。|，找传送门最快。|; the fastest way to find the gate.|。ゲート探しに最速。|. 게이트 찾기에 가장 빠르다.
z466|看到恐龍蛋一定要吃；但|看到恐龙蛋一定要吃；但|Always grab a dino egg — but|恐竜の卵を見たら必ず取る。ただし|공룡알은 반드시 먹어라. 다만
z467|，放彈時要避開蛋那一格。|，放弹时要避开蛋那一格。| when placing bombs, avoid the egg's tile.|、爆弾を置くときは卵のマスを避けること。|. 폭탄을 놓을 때 알 칸은 피하라.
z468|騎上小龍後再吃第 2 顆蛋變|骑上小龙后再吃第 2 颗蛋变|Ride the dino, then eat a 2nd egg to become a|小竜に乗ってから 2 個目の卵を食べると|꼬마 용을 탄 뒤 두 번째 알을 먹으면
z469|紅龍|红龙|Red Dragon|赤竜|붉은 용
z470|：四方向吐火，被包圍時一鍵清場。|：四方向吐火，被包围时一键清场。|: fire in four directions; one press clears a mob.|：4 方向に炎。囲まれたら 1 押しで一掃。|: 네 방향 화염. 포위되면 한 번에 정리.
z471|中💀 詛咒別慌：去撞對手或怪物就能|中💀 诅咒别慌：去撞对手或怪物就能|Cursed 💀? Don't panic: bump a rival or a monster to|💀 呪われても慌てない。相手や敵にぶつかれば|💀 저주에 걸려도 당황 마라. 상대나 몬스터에 부딪히면
z472|把詛咒傳出去|把诅咒传出去|pass the curse on|呪いを押しつけられる|저주를 넘길 수 있다
z473|追擊型怪物（骷髏兵、疾風蜥）甩不掉時，靠滑冰鞋或繞柱子轉彎。|追击型怪物（骷髅兵、疾风蜥）甩不掉时，靠滑冰鞋或绕柱子转弯。|Can't shake a chaser (skeleton, gale lizard)? Use skates or circle a pillar.|追跡型の敵（ガイコツ兵・疾風トカゲ）を振り切れないときは、スケート靴か柱回りで。|추격형 몬스터(해골병·질풍도마뱀)를 못 떼면 스케이트나 기둥 돌기를 활용.
z474|飛行怪會|飞行怪会|Flyers will|飛行の敵は|비행 몬스터는
z475|穿牆|穿墙|pass through walls|壁を抜ける|벽을 통과한다
z476|，躲牆後沒用 —— 用火焰封住牠們的直線路徑。|，躲墙后没用 —— 用火焰封住它们的直线路径。|; hiding behind walls won't help — block their straight path with flames.|。壁の陰に隠れても無駄 —— 炎で直進ルートを塞ごう。|. 벽 뒤에 숨어도 소용없다 — 불꽃으로 직선 경로를 막아라.
z477|打 BOSS 別站在同一直線上：牠會把炸彈|打 BOSS 别站在同一直线上：它会把炸弹|Don't stand in a straight line with a boss: it will|BOSS と一直線に並ぶな。ボスは爆弾を|BOSS와 일직선에 서지 마라. BOSS는 폭탄을
z478|丟過來越牆|丢过来越墙|throw bombs over the walls at you|壁を越えて投げてくる|벽 너머로 던진다
z479|，保持斜角最安全。|，保持斜角最安全。|; staying diagonal is safest.|。斜めの位置取りが最も安全。|. 대각선 위치가 가장 안전하다.
z480|對戰時間到會進入|对战时间到会进入|When a battle runs out of time it enters|対戦で時間切れになると|대전 시간이 끝나면
z481|突死縮圈|突死缩圈|Sudden Death|サドンデス縮小|서든데스 축소
z482|，外圈開始落石 → 快往中間跑；淘汰後還能坐|，外圈开始落石 → 快往中间跑；淘汰后还能坐|; rocks fall on the outer ring → run for the middle. Even knocked out you can ride the|。外周に落石 → 中央へ急げ。脱落後も| 바깥 고리가 낙석 → 가운데로 뛰어라. 탈락해도
z483|復仇推車|复仇推车|Revenge Cart|復讐カート|복수 카트
z484|繼續丟彈。|继续丢弹。|and keep throwing bombs.|に乗って爆弾を投げ続けられる。|. 복수 카트를 타고 계속 폭탄을 던질 수 있다.
z485|電腦|电脑|PC|PC|PC
z486|手機|手机|Phone|スマホ|휴대폰
z487|平板|平板|Tablet|タブレット|태블릿
z488|🕹️ 操作設定|🕹️ 操作设定|🕹️ Controls|🕹️ 操作設定|🕹️ 조작 설정
z489|🎚️ 一般設定|🎚️ 一般设定|🎚️ General|🎚️ 一般設定|🎚️ 일반 설정
z490|播音樂／音效時直接拖，馬上聽得到差別。右上角 🎵／🔊 是快速開關。|播音乐／音效时直接拖，马上听得到差别。右上角 🎵／🔊 是快速开关。|Drag while music/SFX is playing to hear the change. The 🎵／🔊 buttons up top are quick on/off.|音楽／効果音を再生しながらドラッグすると違いが分かります。右上の 🎵／🔊 はすばやいオン／オフ。|음악／효과음을 재생한 채로 드래그하면 차이를 바로 알 수 있습니다. 오른쪽 위 🎵／🔊 는 빠른 켜기／끄기.

menu.daily|每日挑戰|每日挑战|Daily Challenge|デイリーチャレンジ|데일리 챌린지
menu.daily.sub|全世界同一張圖 · 比快|全世界同一张图 · 比快|Same map worldwide · beat the clock|世界中が同じマップ · タイム勝負|전 세계가 같은 맵 · 속도 대결
menu.lb|排行榜|排行榜|Leaderboard|ランキング|리더보드
menu.lb.sub|今日最快 · 全球連線|今日最快 · 全球连线|Fastest today · global|今日最速 · 世界と接続|오늘 최고 기록 · 전 세계
daily.title|📅 每日挑戰|📅 每日挑战|📅 Daily Challenge|📅 デイリーチャレンジ|📅 데일리 챌린지
daily.desc|每天一張新圖：用「日期」算出種子，全世界當天玩到完全相同的地圖。規則固定（普通難度、3 分鐘、3 條命），所以能比 —— 比誰先走到出口。同一天想重打幾次都可以，只取你最快的那一次。|每天一张新图：用「日期」算出种子，全世界当天玩到完全相同的地图。规则固定（普通难度、3 分钟、3 条命），所以能比 —— 比谁先走到出口。同一天想重打几次都可以，只取你最快的那一次。|A new map every day: the seed comes from today's date, so everyone on Earth plays exactly the same map. Rules are fixed (normal difficulty, 3 minutes, 3 lives) so times are comparable — it is a race to the exit. Retry as often as you like; only your fastest run counts.|毎日新しいマップ：日付からシードを作るので、世界中の人がその日まったく同じマップで遊べます。ルールは固定（ふつう難易度・3分・残機3）なので、出口までの速さを競えます。同じ日に何度でも再挑戦でき、一番速い記録だけが残ります。|매일 새로운 맵: 날짜로 시드를 만들어 전 세계가 그날 완전히 같은 맵을 플레이합니다. 규칙은 고정(보통 난이도, 3분, 목숨 3)이라 출구까지 누가 빠른지 겨룰 수 있습니다. 같은 날 몇 번이든 다시 도전할 수 있고 가장 빠른 기록만 남습니다.
daily.labDay|今天的日期|今天的日期|Today's date|今日の日付|오늘 날짜
daily.labSeed|地圖種子|地图种子|Map seed|マップシード|맵 시드
daily.labStage|今天的關卡|今天的关卡|Today's stage|今日のステージ|오늘의 스테이지
daily.labBest|我的最佳|我的最佳|My best|自分のベスト|내 최고 기록
daily.stageVal|第 {n} 關 · {name}|第 {n} 关 · {name}|Stage {n} · {name}|ステージ {n} · {name}|{n} 스테이지 · {name}
daily.noBest|還沒有紀錄|还没有记录|No record yet|まだ記録なし|기록 없음
daily.go|開始挑戰（{t}）→|开始挑战（{t}）→|Start the run ({t}) →|チャレンジ開始（{t}）→|도전 시작 ({t}) →
daily.ovTitle|📅 每日挑戰 · {d}|📅 每日挑战 · {d}|📅 Daily Challenge · {d}|📅 デイリーチャレンジ · {d}|📅 데일리 챌린지 · {d}
daily.ovSub|今天的地圖是第 {n} 關「{name}」|今天的地图是第 {n} 关「{name}」|Today's map is stage {n}, "{name}"|今日のマップは第 {n} 面「{name}」|오늘의 맵은 {n} 스테이지 "{name}"
daily.ovRule|　·　{t} 內走到出口，比誰快|　·　{t} 内走到出口，比谁快|　·　reach the exit within {t} — fastest wins|　·　{t} 以内に出口へ、速さ勝負|　·　{t} 안에 출구 도착, 빠른 사람 승리
daily.fixedDiff|📅 每日固定|📅 每日固定|📅 Daily fixed|📅 デイリー固定|📅 데일리 고정
daily.winTitle|🎉 過關！|🎉 过关！|🎉 Cleared!|🎉 クリア！|🎉 클리어!
daily.loseTitle|💀 挑戰失敗|💀 挑战失败|💀 Run failed|💀 チャレンジ失敗|💀 도전 실패
daily.winSub|你的時間 {t} · 本機最佳 {b}|你的时间 {t} · 本机最佳 {b}|Your time {t} · local best {b}|タイム {t} · 自己ベスト {b}|기록 {t} · 내 최고 {b}
daily.loseSub|第 {n} 關失敗 · 存活 {t}|第 {n} 关失败 · 存活 {t}|Failed on stage {n} · survived {t}|第 {n} 面で失敗 · 生存 {t}|{n} 스테이지 실패 · 버틴 시간 {t}
daily.labPrize|今日獎金|今日奖金|Today's prize|今日の賞金|오늘의 상금
daily.prizeHave|已領 {n} 金幣|已领 {n} 金币|{n} coins claimed|{n} コイン獲得済み|{n} 코인 획득
daily.prizeNone|最高 {n} 金幣 · 過關就發|最高 {n} 金币 · 过关就发|Up to {n} coins · paid on clear|最大 {n} コイン · クリアで獲得|최대 {n} 코인 · 클리어 시 지급
daily.prizeGot|今日獎金 +{n}，累計 {total} 金幣|今日奖金 +{n}，累计 {total} 金币|Prize +{n} coins — {total} today|賞金 +{n} コイン（本日 {total}）|상금 +{n} 코인 (오늘 {total})
daily.prizeFull|今日獎金已滿 {total} 金幣（破紀錄才會再加）|今日奖金已满 {total} 金币（破纪录才会再加）|Today's prize is maxed at {total} coins — beat your record to earn more|本日の賞金は {total} コインで上限（記録更新で追加）|오늘 상금은 {total} 코인으로 최대 (기록 갱신 시 추가)
daily.prizeToast|每日挑戰獎金 +{n} 金幣|每日挑战奖金 +{n} 金币|Daily prize +{n} coins|デイリー賞金 +{n} コイン|데일리 상금 +{n} 코인
daily.rankLine|你的時間 {t} · 今日第 {r} 名（共 {n} 人）|你的时间 {t} · 今日第 {r} 名（共 {n} 人）|Time {t} · rank #{r} of {n} today|タイム {t} · 今日 {r} 位（{n} 人中）|기록 {t} · 오늘 {r}위 (총 {n}명)
daily.again|🔄 再挑戰一次|🔄 再挑战一次|🔄 Try again|🔄 もう一度|🔄 다시 도전
lb.titleToday|🏆 今日排行榜|🏆 今日排行榜|🏆 Today's leaderboard|🏆 今日のランキング|🏆 오늘의 리더보드
lb.open|🏆 看排行榜|🏆 看排行榜|🏆 View leaderboard|🏆 ランキングを見る|🏆 리더보드 보기
lb.empty|今天還沒有人上榜 —— 你可以是第一個|今天还没有人上榜 —— 你可以是第一个|Nobody has made the board today — be the first|今日はまだ誰もいません — 一番乗りしよう|오늘 아직 아무도 없습니다 — 첫 번째가 되어보세요
lb.loading|讀取中…|读取中…|Loading…|読み込み中…|불러오는 중…
lb.online|已連上伺服器|已连上伺服器|Connected to server|サーバー接続済み|서버 연결됨
lb.cached|離線 · 顯示上次的榜單|离线 · 显示上次的榜单|Offline · showing the last saved board|オフライン · 前回のランキングを表示|오프라인 · 지난 목록 표시
lb.offline|（離線，成績只留在這台裝置）|（离线，成绩只留在这台装置）|(offline — score kept on this device only)|（オフライン・記録はこの端末のみ）|（오프라인, 기록은 이 기기에만 저장）
lb.reload|↻ 重新整理|↻ 重新整理|↻ Refresh|↻ 更新する|↻ 새로고침
help.tab.daily|📅 每日挑戰|📅 每日挑战|📅 Daily|📅 デイリー|📅 데일리
help.daily.lead|每天一張新圖，全世界同一張。比誰先走到出口 —— 沒有裝備差距、沒有運氣成分，只有你熟不熟這張圖。|每天一张新图，全世界同一张。比谁先走到出口 —— 没有装备差距、没有运气成分，只有你熟不熟这张图。|A new map every day, identical for everyone. It is a race to the exit — no gear advantage, no luck, just how well you know the map.|毎日新しいマップを、世界中のみんなで同じ条件で。出口までの速さ勝負 —— 装備差も運もなく、このマップをどれだけ知っているかだけ。|매일 새 맵을 전 세계가 같은 조건으로. 출구까지 누가 빠른지 겨루는 대결 — 장비 차이도 운도 없고, 이 맵을 얼마나 아느냐만 남습니다.
help.daily.goal|🎯 目標｜3 分鐘內炸開軟磚、走進出口門。秒數越少排名越前面；陣亡或超時就不列入。|🎯 目标｜3 分钟内炸开软砖、走进出口门。秒数越少排名越前；阵亡或超时就不列入。|🎯 Goal — blast through the bricks and reach the exit within 3 minutes. The fewer seconds, the higher the rank; dying or timing out does not count.|🎯 目標｜3分以内に軟らかいブロックを壊して出口へ。秒数が短いほど上位。やられた／時間切れは記録なし。|🎯 목표 — 3분 안에 벽돌을 부수고 출구로. 초가 짧을수록 상위. 사망하거나 시간 초과면 기록 없음.
help.daily.seed|🔑 種子｜地圖由「今天的日期」算出來，所以不用約朋友：同一天進來就是同一張圖、同一批怪物。|🔑 种子｜地图由「今天的日期」算出来，所以不用约朋友：同一天进来就是同一张图、同一批怪物。|🔑 Seed — the map is derived from today's date, so there is nothing to arrange: same day means the same map and the same monsters for everyone.|🔑 シード｜マップは「今日の日付」から作られます。だから待ち合わせ不要：同じ日に開けば同じマップ・同じモンスター。|🔑 시드 — 맵은 "오늘 날짜"로 만들어집니다. 약속할 필요 없이 같은 날 접속하면 같은 맵, 같은 몬스터.
help.daily.rules|📏 規則｜固定普通難度、3 分鐘、3 條命。難度與時間不能自己調 —— 這樣大家的秒數才能比。|📏 规则｜固定普通难度、3 分钟、3 条命。难度与时间不能自己调 —— 这样大家的秒数才能比。|📏 Rules — normal difficulty, 3 minutes, 3 lives, all fixed. You cannot change difficulty or time, otherwise the times would not be comparable.|📏 ルール｜ふつう難易度・3分・残機3で固定。難易度と時間は変更できません —— それでこそ秒数を比べられます。|📏 규칙 — 보통 난이도, 3분, 목숨 3으로 고정. 난이도와 시간은 바꿀 수 없습니다. 그래야 초를 비교할 수 있으니까요.
help.daily.rank|🏆 排行榜｜主選單的「排行榜」隨時可看今天最快的 50 個人。同一個裝置只保留你最快的一次。|🏆 排行榜｜主菜单的「排行榜」随时可看今天最快的 50 个人。同一个装置只保留你最快的一次。|🏆 Leaderboard — open it from the main menu to see today's 50 fastest at any time. Each device keeps only its own best run.|🏆 ランキング｜メインメニューの「ランキング」で今日の最速50人をいつでも確認。同じ端末は自分のベスト1回だけ残ります。|🏆 리더보드 — 메인 메뉴에서 오늘 가장 빠른 50명을 언제든 확인. 한 기기당 자신의 최고 기록 하나만 남습니다.
help.daily.offline|📴 離線｜連不到排行榜伺服器時照樣可以玩，只是成績只留在這台裝置、不會上榜。|📴 离线｜连不到排行榜伺服器时照样可以玩，只是成绩只留在这台装置、不会上榜。|📴 Offline — if the leaderboard server cannot be reached you can still play; the result just stays on this device and is not ranked.|📴 オフライン｜ランキングサーバーに繋がらなくても遊べます。記録はこの端末に残るだけで、ランキングには入りません。|📴 오프라인 — 리더보드 서버에 연결되지 않아도 플레이할 수 있습니다. 기록은 이 기기에만 남고 순위에는 들지 않습니다.
help.daily.tip|💡 訣竅｜先炸出一條直線衝到門口。每日挑戰比的是秒數，不是把小怪清光。|💡 诀窍｜先炸出一条直线冲到门口。每日挑战比的是秒数，不是把小怪清光。|💡 Tip — carve one straight line to the exit first. The daily is a race against the clock, not a clearance job.|💡 コツ｜まず出口までの一直線を開けること。デイリーは秒数勝負で、全滅させる競技ではありません。|💡 요령 — 먼저 출구까지 일직선을 뚫으세요. 데일리는 초 싸움이지 몬스터를 다 잡는 대회가 아닙니다.
ver.4.80.1|📅 每日挑戰：每天用「日期」算出一張地圖，全世界當天玩到<b>完全相同</b>的圖；規則固定（普通難度、3 分鐘、3 條命），比誰先走到出口|📅 每日挑战：每天用「日期」算出一张地图，全世界当天玩到<b>完全相同</b>的图；规则固定（普通难度、3 分钟、3 条命），比谁先走到出口|📅 Daily Challenge: the map is derived from the date, so everyone plays the <b>exact same</b> map that day. Rules are fixed (normal, 3 minutes, 3 lives) — it is a race to the exit|📅 デイリーチャレンジ：日付からマップを作るので、その日は世界中が<b>まったく同じ</b>マップで遊べます。ルール固定（ふつう・3分・残機3）で出口までの速さ勝負|📅 데일리 챌린지: 날짜로 맵을 만들어 그날 전 세계가 <b>완전히 같은</b> 맵을 플레이합니다. 규칙 고정(보통·3분·목숨 3)으로 출구까지 속도 대결
ver.4.80.2|🏆 排行榜：主選單新增入口，看今天最快的 50 個人。成績存在伺服器，換手機也看得到；連不到時退回本機快取，至少看得到自己|🏆 排行榜：主菜单新增入口，看今天最快的 50 个人。成绩存在伺服器，换手机也看得到；连不到时退回本机缓存，至少看得到自己|🏆 Leaderboard: a new main-menu entry shows today's 50 fastest. Scores live on the server, so another phone sees them too; when offline it falls back to a local cache|🏆 ランキング：メインメニューから今日の最速50人を確認。記録はサーバー保存なので別の端末でも見られます。繋がらない時は端末のキャッシュを表示|🏆 리더보드: 메인 메뉴에서 오늘 가장 빠른 50명을 확인. 기록은 서버에 저장되어 다른 기기에서도 보입니다. 연결이 안 되면 기기 캐시를 표시
ver.4.80.3|⏱️ 每日挑戰結算：過關直接顯示秒數、名次與今日前 5 名。同一天想重打幾次都可以，只取你最快的一次|⏱️ 每日挑战结算：过关直接显示秒数、名次与今日前 5 名。同一天想重打几次都可以，只取你最快的一次|⏱️ Daily results: clearing the map shows your time, rank and today's top 5 right away. Retry as often as you like — only your fastest run counts|⏱️ デイリー結果：クリアすると秒数・順位・今日のトップ5をすぐ表示。同じ日に何度でも再挑戦でき、最速の1回だけが記録されます|⏱️ 데일리 결산: 클리어하면 초·순위·오늘의 톱5를 바로 표시. 같은 날 몇 번이든 다시 도전할 수 있고 가장 빠른 기록만 남습니다
ver.4.80.4|📖 說明頁新增每日挑戰分頁：種子怎麼來、規則為什麼固定、排行榜怎麼算，一次看懂（10 國語系）|📖 说明页新增每日挑战分页：种子怎么来、规则为什么固定、排行榜怎么算，一次看懂（10 国语系）|📖 New help tab for the daily challenge: where the seed comes from, why the rules are fixed and how the board is ranked (10 languages)|📖 説明ページにデイリーチャレンジのタブを追加：シードの作り方、ルールを固定する理由、ランキングの仕組みをまとめて解説（10言語）|📖 설명 페이지에 데일리 챌린지 탭 추가: 시드가 어떻게 만들어지는지, 규칙이 고정된 이유, 순위 계산법을 한 번에 (10개 언어)
home.multi|多人對戰|多人对战|Multiplayer|マルチ対戦|멀티플레이
home.multi.sub|本機混戰 · 房號連線|本机混战 · 房号连线|Local melee · Room code|ローカル対戦 · ルーム番号|로컬 난투 · 방 번호
home.more|更多|更多|More|その他|더 보기
home.more.sub|說明 · 設定|说明 · 设置|Help · Settings|遊び方 · 設定|설명 · 설정
home.adv|冒險模式|冒险模式|Adventure|冒険モード|모험 모드
home.adv.sub|單人 32 關 · RPG 養成|单人 32 关 · RPG 养成|32 levels · RPG growth|全32面 · RPG育成|32개 · RPG 육성
home.shop.sub|隨從 · 外觀|随从 · 外观|Followers · Skins|お供 · 見た目|동료 · 외형
adv.title|冒險模式|冒险模式|Adventure|冒険モード|모험 모드
adv.desc|想玩哪一種？|想玩哪一种？|Which adventure?|どちらで遊びますか？|어떤 모험을 할까요?
adv.solo|🎯 單人闖關（32 關）|🎯 单人闯关（32 关）|🎯 Solo Quest (32 levels)|🎯 一人で挑戦（全32面）|🎯 싱글 모험(32 스테이지)
adv.rpg|🎲 RPG 養成模式|🎲 RPG 养成模式|🎲 RPG Mode|🎲 RPG 育成モード|🎲 RPG 육성 모드
adv.tip|單人闖關：炸光小怪、找到出口。RPG：配點養成，怪物有血量與護甲。|单人闯关：炸光小怪、找到出口。RPG：配点养成，怪物有血量与护甲。|Solo: clear the foes and reach the exit. RPG: allocate stats, foes have HP and armor.|一人で挑戦：敵を全滅させ出口へ。RPG：ステータス育成、敵にHPと装甲。|싱글: 적을 모두 처치하고 출구로. RPG: 스탯 육성, 적에게 HP와 방어구.
adv.back|← 返回|← 返回|← Back|← 戻る|← 뒤로
multi.title|多人對戰|多人对战|Multiplayer|マルチ対戦|멀티플레이
multi.desc|想跟誰玩？|想和谁玩？|Who do you want to play with?|誰と遊びますか？|누구와 플레이할까요?
multi.tip|沒人加入時 AI 會自動補位，一個人也能玩。|没人加入时 AI 会自动补位，一个人也能玩。|AI fills empty slots, so you can play alone.|空き枠は AI が埋めるので、一人でも遊べます。|빈자리는 AI가 채우므로 혼자서도 할 수 있습니다.
multi.local|本機混戰（2～8 人）|本机混战（2～8 人）|Local melee (2–8)|ローカル対戦（2～8人）|로컬 난투 (2~8인)
multi.online|線上房號（跟朋友連線）|在线房号（和朋友连线）|Online room (play with friends)|ルーム番号（友達と対戦）|온라인 방 번호 (친구와)
multi.back|返回|返回|Back|戻る|뒤로
solo.bossgo|跳過關卡，直接單挑最終魔王|跳过关卡，直接单挑最终魔王|Skip stages — face the final boss|ステージを飛ばしてラスボスと一対一|스테이지 건너뛰고 최종 보스와 1:1
beta.tag|測試版|测试版|Beta|ベータ|베타
home.d.store|商店|商店|Store|ショップ|상점
home.d.help|遊戲說明|游戏说明|How to play|遊び方|게임 설명
home.d.set|設定|设置|Settings|設定|설정
home.d.quit|離開遊戲|离开游戏|Quit game|ゲームを終了|게임 종료
home.rpg.sub|配點養成 · 血量防禦|加点养成 · 血量防御|Stat growth · HP & armor|ステ振り · HPと防御|스탯 육성 · HP·방어
ver.4.81.1|🧹 首頁大掃除：14 顆按鈕縮成 6 張玩法卡＋「更多」抽屜，手機一屏就看完|🧹 首页大扫除：14 颗按钮缩成 6 张玩法卡＋「更多」抽屉，手机一屏就看完|🧹 Home clean-up: 14 buttons down to 6 mode cards plus a More drawer — fits one phone screen|🧹 ホーム画面を整理：14 個のボタンを 6 枚のカード＋「その他」ドロワーに。スマホ1画面に収まります|🧹 홈 화면 정리: 버튼 14개를 모드 카드 6장 + '더 보기' 서랍으로, 휴대폰 한 화면에
ver.4.81.2|🎯 入口合併：挑戰 BOSS 併進單人闖關、排行榜併進每日挑戰、對戰與線上配對合成「多人對戰」|🎯 入口合并：挑战 BOSS 并入单人闯关、排行榜并入每日挑战、对战与在线配对合成「多人对战」|🎯 Entrances merged: Boss Raid sits inside Solo Quest, the leaderboard inside Daily Challenge, Battle and Online became one Multiplayer entry|🎯 入口を統合：ボス討伐は一人で挑戦へ、ランキングはデイリーチャレンジへ、対戦とオンラインは「マルチ対戦」に|🎯 입구 통합: 보스 토벌은 싱글 모험에, 랭킹은 데일리 챌린지에, 대전과 온라인 매치는 멀티플레이 하나로
ver.4.81.3|👤 帳號入口只留右上角那一顆（首頁原本還有一顆重複的）|👤 账号入口只留右上角那颗（首页原本还有一颗重复的）|👤 Only one account entry now — the chip in the top-right corner (the home screen used to have a duplicate)|👤 アカウント入口は右上の1か所だけ（ホームにも重複がありました）|👤 계정 입구는 오른쪽 위 하나만 (홈에 중복 버튼이 있었습니다)
ver.4.81.4|📖 首頁導覽重寫：每一步都對得上新位置，講到抽屜裡的按鈕會自動展開|📖 首页导览重写：每一步都对得上新位置，讲到抽屉里的按钮会自动展开|📖 Home tour rewritten: every step matches the new layout, and the drawer opens by itself when needed|📖 ホームのガイドを書き直し：各ステップが新しい配置に対応し、ドロワー内のボタンでは自動で開きます|📖 홈 가이드 다시 작성: 각 단계가 새 배치와 맞고, 서랍 안 버튼을 설명할 때 자동으로 열립니다
ver.4.85.1|☁️ 雲端存檔搬家了：改存到 Supabase 雲端資料庫，平台休眠、重新部署、換主機都不會再消失|☁️ 云端存档搬家了：改存到 Supabase 云端数据库，平台休眠、重新部署、换主机都不会再消失|☁️ Cloud saves moved to a Supabase database — platform sleep, redeploys and host changes no longer wipe them|☁️ クラウドセーブを Supabase に移行。スリープ・再デプロイ・サーバー変更でも消えません|☁️ 클라우드 저장을 Supabase로 이전했습니다. 절전·재배포·서버 변경에도 사라지지 않습니다
ver.4.85.2|💾 進度全部上雲：關卡、金幣、隨從、票券、教學、每日最佳都跟著帳號走，換手機直接接續|💾 进度全部上云：关卡、金币、随从、票券、教学、每日最佳都跟着账号走，换手机直接接续|💾 All progress now follows your account — stages, coins, pets, tickets, tutorial and daily best carry over to a new phone|💾 進行状況をすべてクラウドへ。ステージ・コイン・仲間・チケット・チュートリアル・デイリー最佳がアカウントに付いてきます|💾 모든 진행 상황을 클라우드로. 스테이지·코인·동료·티켓·튜토리얼·일일 최고가 계정을 따라갑니다
ver.4.85.3|📤 設定頁新增存檔碼：按一下就複製整份進度，換裝置或帳號救不回來時貼上就能還原|📤 设置页新增存档码：按一下就复制整份进度，换设备或账号救不回来时贴上就能还原|📤 New save code in Settings — one tap copies your whole progress; paste it to restore on another device or after losing an account|📤 設定にセーブコードを追加。ワンタップで進行状況をコピーし、別端末やアカウント喪失時に貼り付けて復元できます|📤 설정에 저장 코드 추가. 한 번 누르면 진행 상황이 복사되고, 다른 기기나 계정 분실 시 붙여넣어 복원
ver.4.85.4|🛡️ 存檔數值在伺服器端一律檢查：超界自動夾回合法範圍，改前端也刷不出離譜數字|🛡️ 存档数值在服务器端一律检查：超界自动夹回合法范围，改前端也刷不出离谱数字|🛡️ Every save value is clamped server-side — tampering with the client cannot produce absurd numbers|🛡️ セーブ値はサーバー側で必ず検証。範囲外は自動で丸められ、クライアント改変でも異常な値は作れません|🛡️ 저장 값은 서버에서 반드시 검증합니다. 범위를 벗어나면 자동으로 잘리고, 클라이언트를 고쳐도 이상한 수치는 못 만듭니다
ver.4.84.1|📱 手機橫屏首頁不用再瞎猜：新手教學條和第一列卡片擠進第一屏，一開場就看得到下面還有東西|📱 手机横屏首页不用再瞎猜：新手教学条和第一列卡片挤进第一屏，一开场就看得到下面还有东西|📱 Landscape phones no longer open on a logo-only screen — the tutorial bar and the first row of cards now fit on the first screen|📱 スマホ横画面のホームで迷わなくなりました。チュートリアルバーとカード1列目が最初の画面に収まり、下に続きがあると分かります|📱 가로 모드 홈이 로고만 보이던 문제를 해결했습니다. 튜토리얼 바와 카드 첫 줄이 첫 화면에 들어와 아래에 더 있다는 걸 알 수 있습니다
ver.4.84.2|👇 新增「往下滑，下面還有更多」提示：首頁、設定、說明、單人闖關都通用，滑到底自動消失，看過兩秒就淡掉不擋按鈕|👇 新增「往下滑，下面还有更多」提示：首页、设置、说明、单人闯关都通用，滑到底自动消失，看过两秒就淡掉不挡按钮|👇 New "scroll down for more" hint on every scrollable screen — it fades after two seconds so it never blocks a button, and disappears at the bottom|👇 「下にスクロールすると続きがあります」のヒントを追加。ホーム・設定・説明・ひとりで攻略のすべてで出て、2秒で薄くなり、一番下まで行くと消えます|👇 "아래로 스크롤하면 더 있어요" 안내를 추가했습니다. 홈·설정·설명·1인 모드 모두에 나오고, 2초 뒤 옅어지며, 맨 아래에서 사라집니다
ver.4.84.3|🧩 修掉新手教學按鈕在橫屏變成綠色大方塊（舊的 3 欄選單規則把它拉成 251×319），電腦、手機直放、橫放現在都是正常橫條|🧩 修掉新手教学按钮在横屏变成绿色大方块（旧的 3 栏菜单规则把它拉成 251×319），电脑、手机竖放、横放现在都是正常横条|🧩 Fixed the tutorial button turning into a huge green square in landscape (an old 3-column rule stretched it to 251×319) — it is a normal bar on PC, portrait and landscape now|🧩 横画面でチュートリアルボタンが緑の大きな四角になっていた不具合を修正（古い3列ルールが 251×319 に引き伸ばしていました）。PC・縦・横すべて普通の横長バーになります|🧩 가로 모드에서 튜토리얼 버튼이 커다란 초록 사각형이 되던 문제를 고쳤습니다(예전 3열 규칙이 251×319로 늘렸습니다). 이제 PC·세로·가로 모두 일반 막대 모양입니다
ver.4.84.4|🗑️ 說明頁最下面那排開發用的 T1～T5 測試地圖入口拿掉了，一般玩家不會再誤入|🗑️ 说明页最下面那排开发用的 T1～T5 测试地图入口拿掉了，普通玩家不会再误入|🗑️ Removed the developer-only T1–T5 test-map row at the bottom of the help page, so normal players cannot wander into it|🗑️ 説明ページ下部の開発用 T1～T5 テストマップ入口を削除しました。一般プレイヤーが誤って入ることはありません|🗑️ 설명 페이지 맨 아래의 개발용 T1~T5 테스트 맵 입구를 제거했습니다. 일반 플레이어가 실수로 들어갈 일이 없습니다
ver.4.83.1|🖼️ 標題 LOGO 抓不到時自動換成文字標題 —— 單獨打開 index.html（旁邊沒有 spr/）也不會再露出破圖和一片 alt 文字|🖼️ 标题 LOGO 抓不到时自动换成文字标题 —— 单独打开 index.html（旁边没有 spr/）也不会再露出破图和一片 alt 文字|🖼️ If the title logo cannot load, a text logo takes its place — opening index.html on its own (no spr/ folder) no longer shows a broken image and raw alt text|🖼️ タイトル LOGO が読み込めないときは文字ロゴに自動で切り替わります — index.html を単体で開いても（spr/ フォルダがなくても）壊れた画像や alt テキストが出なくなりました|🖼️ 타이틀 로고를 불러오지 못하면 글자 로고로 자동 전환됩니다 — index.html만 단독으로 열어도(spr/ 폴더 없이도) 깨진 이미지와 alt 텍스트가 더 이상 보이지 않습니다
ver.4.83.2|🧭 載入失敗的提示講清楚了：只缺美術圖會直接說「旁邊要有 spr/ 資料夾」或「跑本機伺服器」，不再叫人亂按「強制更新」|🧭 加载失败的提示讲清楚了：只缺美术图会直接说「旁边要有 spr/ 文件夹」或「跑本地服务器」，不再叫人乱按「强制更新」|🧭 The load-failure notice is specific now: if only artwork is missing it tells you to keep the spr/ folder next to the file or run a local server, instead of telling you to force-refresh|🧭 読み込み失敗の案内を具体的にしました。画像だけ足りない場合は「spr/ フォルダを一緒に置く」「ローカルサーバーで開く」と案内し、むやみに「強制更新」を押させる案内はやめました|🧭 로딩 실패 안내가 구체적이 되었습니다. 그림만 없으면 spr/ 폴더를 함께 두거나 로컬 서버로 열라고 알려 주고, 무작정 강제 새로고침을 누르라고 하지 않습니다
ver.4.83.3|📦 只多一個小函式和兩段 CSS，沒有新增任何檔案或網路請求 —— 主檔仍然是一個 HTML 加 spr/ 美術|📦 只多一个小函数和两段 CSS，没有新增任何文件或网络请求 —— 主档仍然是一个 HTML 加 spr/ 美术|📦 Just one small function and two CSS blocks — no new files, no new network requests; the game is still one HTML file plus the spr/ artwork|📦 小さな関数ひとつと CSS ふたつだけ。新しいファイルも通信も増えていません — 本体は今まで通り HTML 1 枚と spr/ の画像だけです|📦 작은 함수 하나와 CSS 두 블록만 추가했습니다. 새 파일도 네트워크 요청도 없습니다 — 본체는 여전히 HTML 하나와 spr/ 이미지입니다
ver.4.82.1|💎 全站按鈕換成<b>水晶高光</b>：弧形鏡面、上緣銳光、底部厚度，看起來像一塊打磨過的玻璃而不是平面色塊|💎 全站按钮换成<b>水晶高光</b>：弧形镜面、上缘锐光、底部厚度，看起来像一块打磨过的玻璃而不是平面色块|💎 <b>Crystal gloss</b> on every button: curved specular arc, sharp top rim, solid bottom edge — polished glass instead of flat colour blocks|💎 全サイトのボタンを<b>クリスタル光沢</b>に：曲面の鏡面ハイライト・上端のシャープな反射・底の厚みで、平面の色ではなく磨かれたガラスに見えます|💎 모든 버튼을 <b>크리스탈 광택</b>으로: 곡면 반사 하이라이트, 날카로운 상단 윤곽, 두꺼운 하단 — 평면 색이 아니라 갈아낸 유리처럼 보입니다
ver.4.82.2|🎨 高光用多層漸層疊在按鈕自己的背景上（不是貼圖、不是偽元素）—— 文字永遠清楚、可翻譯、放大不糊|🎨 高光用多层渐变叠在按钮自己的背景上（不是贴图、不是伪元素）—— 文字永远清楚、可翻译、放大不糊|🎨 The gloss is stacked gradients on each button's own background — no images, no pseudo-elements, so text stays crisp, translatable and sharp at any size|🎨 ハイライトはボタン自身の背景に重ねた多層グラデーション（画像でも疑似要素でもありません）—— 文字は常にくっきり、翻訳可能、拡大してもボケません|🎨 하이라이트는 버튼 자체 배경에 겹친 다층 그라데이션입니다(이미지도, 의사 요소도 아님) — 글자는 항상 선명하고 번역되며 확대해도 흐려지지 않습니다
ver.4.82.3|🪟 首頁卡片、抽屜、彈窗、開始遊戲、關卡數字、角色卡、分段鈕、對戰小鈕全部同一套光學，不再有平掉的按鈕|🪟 首页卡片、抽屉、弹窗、开始游戏、关卡数字、角色卡、分段钮、对战小钮全部同一套光学，不再有平掉的按钮|🪟 Home cards, drawer, dialogs, Start Game, stage numbers, character cards, segmented controls and lobby buttons all share the same optics — nothing is flat any more|🪟 ホームのカード、ドロワー、ダイアログ、ゲーム開始、ステージ番号、キャラカード、セグメントボタン、対戦の小ボタンまで全部同じ光沢に — 平らなボタンはもうありません|🪟 홈 카드, 서랍, 대화상자, 게임 시작, 스테이지 번호, 캐릭터 카드, 구간 버튼, 대전 소형 버튼까지 모두 같은 광학 — 이제 평평한 버튼은 없습니다
ver.4.82.4|⚡ 只多幾層 CSS 漸層，沒有圖片、沒有 backdrop-filter，手機不會掉幀|⚡ 只多几层 CSS 渐变，没有图片、没有 backdrop-filter，手机不会掉帧|⚡ Only a few extra CSS gradients — no images, no backdrop-filter, so phones keep their frame rate|⚡ 増えたのは CSS グラデーション数層だけ。画像も backdrop-filter も使わないので、スマホでもフレームレートが落ちません|⚡ CSS 그라데이션 몇 겹만 추가했습니다. 이미지도 backdrop-filter도 없어 휴대폰 프레임이 떨어지지 않습니다
home.daily|每日挑戰|每日挑战|Daily Challenge|デイリーチャレンジ|데일리 챌린지
home.solo.sub|32 關 · 難度自選|32 关 · 难度可选|32 levels · any difficulty|全32面 · 難易度自由|32개 · 난이도 자유
home.namePh|可留空，系統自動取名字|可留空，系统自动取名字|Optional — we will name you|空でもOK・自動で名前をつけます|비워도 됨 · 자동으로 이름 지어줌
help.ostrich.lead|🪶 新增<b>鴕鳥神獸</b>：紫色蛋孵化，跑得比恐龍快，還能<b>跳過一格牆</b>，落地震一圈打怪。|🪶 新增<b>鸵鸟神兽</b>：紫色蛋孵化，跑得比恐龙快，还能<b>跳过一格墙</b>，落地震一圈打怪。|🪶 New <b>Wind Ostrich</b>: hatches from the purple egg — faster than the dino, <b>leaps over a wall</b>, and stuns foes with a landing shock.|🪶 新<b>風のダチョウ</b>：紫の卵から孵化。竜より速く、<b>壁 1 枚を飛び越え</b>、着地で衝撃波。|🪶 새 <b>바람 타조</b>: 보라 알에서 부화. 공룡보다 빠르고 <b>벽 한 칸을 뛰어넘으며</b> 착지 충격파를 냅니다.
help.ostrich.s1|1️⃣ 吃到<b>紫色蛋</b>就騎上鴕鳥：原本的 <b>🔥 鍵</b>（電腦 <b>F</b>）換成<b>爪子鍵</b>，按下去是跳躍。|1️⃣ 吃到<b>紫色蛋</b>就骑上鸵鸟：原本的 <b>🔥 键</b>（电脑 <b>F</b>）换成<b>爪子键</b>，按下去是跳跃。|1️⃣ Eat the <b>purple egg</b> to mount the ostrich: the <b>🔥 button</b> (<b>F</b> on keyboard) turns into a <b>claw</b> that leaps.|1️⃣ <b>紫の卵</b>を食べるとダチョウに騎乗。<b>🔥 ボタン</b>（PC は <b>F</b>）が<b>爪ボタン</b>に変わり、押すとジャンプ。|1️⃣ <b>보라 알</b>을 먹으면 타조 탑승. <b>🔥 버튼</b>(PC는 <b>F</b>)이 <b>발톱 버튼</b>으로 바뀌어 점프합니다.
help.ostrich.s2|2️⃣ 按下去<b>往前跳 2 格</b>：中間那格是牆也跳得過去，但<b>連續兩層牆跳不過</b>，而且落點必須是<b>空地</b>（有炸彈也算擋住）。|2️⃣ 按下去<b>往前跳 2 格</b>：中间那格是墙也跳得过去，但<b>连续两层墙跳不过</b>，而且落点必须是<b>空地</b>（有炸弹也算挡住）。|2️⃣ It <b>leaps 2 tiles forward</b>: one wall in between is fine, <b>two in a row are not</b>, and the landing tile must be <b>clear</b> (a bomb blocks it too).|2️⃣ <b>2 マス前へジャンプ</b>。間の 1 枚は越えられるが<b> 2 枚続きは無理</b>、着地点は<b>空きマス</b>限定（爆弾も不可）。|2️⃣ <b>앞으로 2칸 점프</b>. 중간 벽 1개는 넘지만 <b>벽 2개 연속은 불가</b>, 착지점은 <b>빈 칸</b>이어야 합니다(폭탄도 막힘).
help.ostrich.s3|3️⃣ 落地震波<b>一擊踩扁雜兵</b>（RPG 有血條的小怪也算）；大怪吃 <b>35% 生命</b>並被<b>震暈＋擊退</b>，落地後還有 <b>0.5 秒震攝</b>保護，跳進怪群不會馬上被反咬。大逃殺／對戰也會打傷敵人（隊友除外）。|3️⃣ 落地震波<b>一击踩扁杂兵</b>（RPG 有血条的小怪也算）；大怪吃 <b>35% 生命</b>并被<b>震晕＋击退</b>，落地后还有 <b>0.5 秒震慑</b>保护，跳进怪群不会马上被反咬。大逃杀／对战也会打伤敌人（队友除外）。|3️⃣ The landing shock <b>flattens ordinary foes in one hit</b> (RPG HP mooks too); tougher ones take <b>35% HP</b> plus <b>stun + knockback</b>, and you get <b>0.5s of poise</b> after landing, so diving into a mob will not cost you the mount. Also hurts enemy players in BR / Versus (never teammates).|3️⃣ 着地の衝撃波は<b>雑魚を一撃で踏み潰し</b>（RPG の HP 持ちも同じ）、強敵には<b>最大 HP の 35%</b>＋<b>スタン＋ノックバック</b>。着地後 <b>0.5 秒の踏ん張り</b>があるので、敵群に飛び込んですぐ乗り物を失うことはありません。バトロワ／対戦では敵プレイヤーにも当たります（味方は除く）。|3️⃣ 착지 충격파가 <b>잡몹을 한 방에 밟아 죽이고</b>(RPG 체력 몹 포함), 강적에게는 <b>최대 체력 35%</b> 피해 + <b>기절·넉백</b>. 착지 후 <b>0.5초 버티기</b>가 있어 적진에 뛰어들어도 바로 탈것을 잃지 않습니다. 배틀로얄／대전에서는 적 플레이어도 맞습니다(아군 제외).
help.ostrich.s4|4️⃣ 整個滯空期間<b>完全免疫</b>炸彈與怪物；模式：單人／RPG／對戰都有，大逃殺則是<b>打倒 BOSS</b> 直接送你一隻。冷卻 <b>1.1 秒</b>。|4️⃣ 整个滞空期间<b>完全免疫</b>炸弹与怪物；模式：单人／RPG／对战都有，大逃杀则是<b>打倒 BOSS</b> 直接送你一只。冷却 <b>1.1 秒</b>。|4️⃣ <b>Fully immune</b> while airborne. Available in Solo / RPG / Versus; in Battle Royale, <b>down a boss</b> and one is yours. Cooldown <b>1.1s</b>.|4️⃣ 滞空中は<b>完全無敵</b>。ソロ／RPG／対戦で登場、バトロワでは<b>ボス撃破</b>で入手。クールダウン <b>1.1 秒</b>。|4️⃣ 공중에서는 <b>완전 무적</b>. 솔로/RPG/대전에 등장, 배틀로얄에서는 <b>보스 처치</b> 시 지급. 쿨다운 <b>1.1초</b>.
help.ostrich.s5|5️⃣ 吃<b>第二顆紫蛋</b>進化成 <b>⚡風暴鴕鳥</b>：1.62 倍速、跳 <b>3 格</b>、落地 <b>5×5</b>、震波<b>能震碎軟磚</b>（硬牆不破）；<b>滯空中再按一次＝俯衝</b>，範圍再 +1 圈、傷害 ×1.6。吃不同顏色的蛋＝換騎，舊坐騎會爆散一次。|5️⃣ 吃<b>第二颗紫蛋</b>进化成 <b>⚡风暴鸵鸟</b>：1.62 倍速、跳 <b>3 格</b>、落地 <b>5×5</b>、震波<b>能震碎软砖</b>（硬墙不破）；<b>滞空中再按一次＝俯冲</b>，范围再 +1 圈、伤害 ×1.6。吃不同颜色的蛋＝换骑，旧坐骑会爆散一次。|5️⃣ A <b>second purple egg</b> evolves it into the <b>⚡ Storm Ostrich</b>: 1.62× speed, a <b>3-tile</b> leap, a <b>5×5</b> landing and a shock that <b>shatters soft blocks</b> (hard walls hold). <b>Press again mid-air to dive</b> — one more ring of range and 1.6× damage. A differently coloured egg swaps mounts, and the old one bursts.|5️⃣ <b>2 個目の紫の卵</b>で <b>⚡嵐のダチョウ</b>に進化：1.62 倍速、<b>3 マス</b>跳躍、着地 <b>5×5</b>、衝撃波で<b>軟らかい壁を破壊</b>（硬い壁は不可）。<b>空中でもう一度で急降下</b> — 範囲 +1 周、ダメージ 1.6 倍。色違いの卵を食べると乗り換えになり、前の乗り物は破裂します。|5️⃣ <b>두 번째 보라 알</b>로 <b>⚡폭풍 타조</b>로 진화: 1.62배속, <b>3칸</b> 점프, 착지 <b>5×5</b>, 충격파가 <b>약한 벽을 부수고</b>(단단한 벽은 불가). <b>공중에서 한 번 더 = 급강하</b> — 범위 +1바퀴, 피해 1.6배. 다른 색 알을 먹으면 탈것을 교체하고 이전 탈것은 폭발합니다.
gift.title|🎁 每日好禮與任務|🎁 每日好礼与任务|🎁 Daily gifts & missions|🎁 デイリー特典とミッション|🎁 일일 선물과 미션
gift.sub|今天簽到可拿第 {n} 天的獎勵|今天签到可拿第 {n} 天的奖励|Day {n} reward is ready for you|本日は {n} 日目の報酬が受け取れます|오늘 {n}일차 보상을 받을 수 있어요
gift.subDone|已經連續簽到 {n} 天，明天再來|已经连续签到 {n} 天，明天再来|Day {n} streak — come back tomorrow|{n} 日連続ログイン中 — また明日|{n}일 연속 출석 중 — 내일 또 만나요
gift.checkinSec|7 天簽到|7 天签到|7-day check-in|7 日間ログイン|7일 출석
gift.misSec|每日任務|每日任务|Daily missions|デイリーミッション|일일 미션
gift.weekSec|每週榜|每周榜|Weekly board|週間ランキング|주간 순위
gift.day|第 {n} 天|第 {n} 天|Day {n}|{n} 日目|{n}일차
gift.streakTag|連續 {n} 天|连续 {n} 天|{n} in a row|{n} 日連続|{n}일 연속
gift.misTag|每天 0 點換新|每天 0 点换新|Resets at midnight|毎日 0 時に更新|매일 0시 갱신
gift.misKill|擊倒 {n} 隻小怪|击倒 {n} 只小怪|Defeat {n} enemies|敵を {n} 体たおす|적 {n}마리 처치
gift.misBrick|炸掉 {n} 塊軟磚|炸掉 {n} 块软砖|Blow up {n} soft blocks|やわらかいブロックを {n} 個壊す|무른 벽돌 {n}개 파괴
gift.misItem|吃到 {n} 個道具|吃到 {n} 个道具|Pick up {n} items|アイテムを {n} 個取る|아이템 {n}개 획득
gift.misClear|過關 {n} 次|过关 {n} 次|Clear {n} stages|ステージを {n} 回クリア|스테이지 {n}회 클리어
gift.misJump|騎鴕鳥跳躍 {n} 次|骑鸵鸟跳跃 {n} 次|Ostrich-leap {n} times|ダチョウで {n} 回ジャンプ|타조 점프 {n}회
gift.misPerfect|無傷過關 {n} 次|无伤过关 {n} 次|Clear {n} stages unhurt|ノーダメージクリア {n} 回|무피해 클리어 {n}회
gift.get|領取|领取|Claim|受け取る|받기
gift.got|已領|已领|Claimed|受取済|수령 완료
gift.claim|🎁 領今天的簽到禮|🎁 领今天的签到礼|🎁 Claim today's gift|🎁 今日のログイン報酬|🎁 오늘 출석 보상 받기
gift.claimed|今天已經領過了|今天已经领过了|Already claimed today|今日はもう受け取りました|오늘은 이미 받았어요
gift.claimOk|簽到成功！💰{g}{t}|签到成功！💰{g}{t}|Checked in! 💰{g}{t}|ログイン完了！💰{g}{t}|출석 완료! 💰{g}{t}
gift.goldUnit|金幣|金币|gold|ゴールド|골드
gift.starGain|第 {n} 關 {s} 達成！|第 {n} 关 {s} 达成！|Stage {n}: {s}|ステージ {n} {s} 達成！|{n}스테이지 {s} 달성!
gift.starLeft|還差 {n} 顆星滿星|还差 {n} 颗星满星|{n} stars to go|あと {n} 個で満点|별 {n}개 남음
gift.weekGo|去打本週關卡 →|去打本周关卡 →|Play this week's stage →|今週のステージへ →|이번 주 스테이지로 →
gift.weekStage|本週關卡　第 {n} 關「{name}」|本周关卡　第 {n} 关「{name}」|This week: stage {n} "{name}"|今週：ステージ {n}「{name}」|이번 주: {n}스테이지 「{name}」
gift.weekBest|我的本週最佳 {t}|我的本周最佳 {t}|My week best {t}|週間ベスト {t}|내 주간 최고 {t}
gift.weekNone|本週還沒有成績|本周还没有成绩|No time yet this week|今週はまだ記録なし|이번 주 기록 없음
gift.weekEmpty|本週還沒有人上榜|本周还没有人上榜|Nobody on the board yet|まだ誰もランクインしていません|아직 아무도 없어요
gift.weekLoading|讀取中…|读取中…|Loading…|読み込み中…|불러오는 중…
gift.weekRank|本週第 {r} 名！{t}|本周第 {r} 名！{t}|Rank {r} this week! {t}|週間 {r} 位！{t}|주간 {r}위! {t}
gift.note|每天 00:00（UTC+8）換新 · 簽到只要斷一天就從第 1 天重來|每天 00:00（UTC+8）换新 · 签到只要断一天就从第 1 天重来|Resets 00:00 (UTC+8) · miss one day and the streak restarts|毎日 00:00（UTC+8）更新 · 1 日でも抜けたら 1 日目から|매일 00:00(UTC+8) 갱신 · 하루만 놓쳐도 1일차부터
gift.soloTip|★★★ 沒被打到　★★ 剩餘時間夠　★ 通關|★★★ 没被打到　★★ 剩余时间够　★ 通关|★★★ unhurt · ★★ fast enough · ★ cleared|★★★ ノーダメージ · ★★ 時間内 · ★ クリア|★★★ 무피해 · ★★ 시간 충분 · ★ 클리어
char.title|角色|角色|Character|キャラクター|캐릭터
char.sk|🎯 出戰招式|🎯 出战招式|🎯 Battle skills|🎯 出撃スキル|🎯 출전 스킬
char.skHint|在營地向招式師學習|在营地向招式师学习|Learn from the skill master at camp|キャンプの師匠に教わる|캠프의 스승에게 배우기
char.prog|🗺️ 冒險進度|🗺️ 冒险进度|🗺️ Adventure progress|🗺️ 冒険の進み具合|🗺️ 모험 진행도
char.go|繼續冒險 →|继续冒险 →|Continue →|冒険を続ける →|모험 계속 →
char.alloc|🎯 配點|🎯 配点|🎯 Stats|🎯 ステータス|🎯 스탯
char.swap|🔄 換角色|🔄 换角色|🔄 Change|🔄 キャラ変更|🔄 캐릭터 변경
camp.title|🏕️ 營地|🏕️ 营地|🏕️ Camp|🏕️ キャンプ|🏕️ 캠프
camp.desc|出發前把補給買好、把招式學好。|出发前把补给买好、把招式学好。|Stock up and learn skills before you set out.|出発前に補給を買い、スキルを覚えよう。|출발 전에 보급을 사고 스킬을 익히자.
camp.desc2|補給只生效這一關，招式學了就一直在。|补给只生效这一关，招式学了一直都在。|Supplies last one stage; skills stay for good.|補給はこのステージだけ、スキルはずっと残る。|보급은 이 스테이지 한 번, 스킬은 계속.
camp.shop|雜貨商人|杂货商人|Grocer|雑貨商人|잡화상
camp.shopd|藥水・護甲・火力・復活幣|药水・护甲・火力・复活币|Potions · Armor · Fire · Revive|ポーション・装甲・火力・復活|물약·방어구·화력·부활
camp.shopgo|查看商品 →|查看商品 →|Browse →|商品を見る →|상품 보기 →
camp.skill|招式師|招式师|Skill master|スキルの師匠|스킬 스승
camp.skillgo|拜師學藝 →|拜师学艺 →|Learn skills →|弟子入りする →|배우러 가기 →
camp.stage|出發關卡|出发关卡|Stage|出発ステージ|출발 스테이지
camp.stageNow|第 {n} 關|第 {n} 关|Stage {n}|第 {n} ステージ|{n} 스테이지
camp.back|← 角色|← 角色|← Character|← キャラ|← 캐릭터
camp.go|出發 →|出发 →|Set out →|出発 →|출발 →
camp.bagHave|🎒 這一場的補給：|🎒 这一场的补给：|🎒 Supplies for this run:|🎒 今回の補給：|🎒 이번 보급:
camp.bagNone|🎒 還沒有補給 —— 找雜貨商人買，出發時自動消耗。|🎒 还没有补给 —— 找杂货商人买，出发时自动消耗。|🎒 No supplies yet — buy some from the grocer; they are used when you set out.|🎒 補給なし —— 雑貨商人から購入。出発時に自動で使う。|🎒 보급 없음 —— 잡화상에게 구매. 출발 시 자동 사용.
shop.title|🧑‍🌾 雜貨商人|🧑‍🌾 杂货商人|🧑‍🌾 Grocer|🧑‍🌾 雑貨商人|🧑‍🌾 잡화상
shop.tabBag|本關補給|本关补给|Stage supplies|今回の補給|이번 보급
shop.tabPerm|永久強化|永久强化|Permanent|永久強化|영구 강화
shop.note|補給在出發時自動消耗，只生效這一關|补给在出发时自动消耗，只生效这一关|Used on departure and only for that stage|出発時に消費、そのステージだけ有効|출발 시 소모, 그 스테이지만 적용
shop.notePerm|永久強化買了就一直在|永久强化买了就一直在|Permanent upgrades stay forever|永久強化は買い切り|영구 강화는 계속 유지
shop.done|完成|完成|Done|完了|완료
skill.title|🧙 招式師|🧙 招式师|🧙 Skill master|🧙 スキルの師匠|🧙 스킬 스승
skill.tabLearn|學習招式|学习招式|Learn|スキル習得|스킬 배우기
skill.tabLoad|出戰配置|出战配置|Loadout|出撃設定|출전 구성
skill.per|每 5 級 +1 技能點|每 5 级 +1 技能点|+1 skill point every 5 levels|5 レベルごとに +1|5레벨마다 +1
skill.pts|技能點 {a} / {b}|技能点 {a} / {b}|Skill points {a} / {b}|スキルポイント {a} / {b}|스킬 포인트 {a} / {b}
skill.ptsLeft|還有 {n} 點技能點|还有 {n} 点技能点|{n} skill point(s) left|スキルポイント残り {n}|스킬 포인트 {n} 남음
skill.note|每 5 級 +1 點（Lv.{a} → {b} 點）· 已用 {c}|每 5 级 +1 点（Lv.{a} → {b} 点）· 已用 {c}|+1 per 5 levels (Lv.{a} → {b}) · spent {c}|5 レベルごとに +1（Lv.{a} → {b}）· 使用済み {c}|5레벨마다 +1(Lv.{a} → {b}) · 사용 {c}
rpg.talent.light|身輕如燕|身轻如燕|Nimble|身軽|날렵함
rpg.talent.light.d|移動速度 +5%|移动速度 +5%|Move speed +5%|移動速度 +5%|이동 속도 +5%
rpg.gotoCamp|配好點就往營地：那裡可以買補給、學招式、選關卡再出發。|配好点就往营地：那里可以买补给、学招式、选关卡再出发。|When you are done, head to camp to buy supplies, learn skills and pick a stage.|ポイントを振ったらキャンプへ。補給・スキル・ステージ選択ができる。|포인트를 다 찍었으면 캠프로: 보급·스킬·스테이지 선택.
rpg.toCamp|前往營地 →|前往营地 →|Head to camp →|キャンプへ →|캠프로 →
d.bag.hp1|小藥水|小药水|Small potion|小ポーション|작은 물약
d.bag.hp1d|本關最大生命 +1|本关最大生命 +1|+1 max HP this stage|このステージの最大HP +1|이번 판 최대 체력 +1
d.bag.hp2|大藥水|大药水|Large potion|大ポーション|큰 물약
d.bag.hp2d|本關最大生命 +2|本关最大生命 +2|+2 max HP this stage|このステージの最大HP +2|이번 판 최대 체력 +2
d.bag.arm1|護甲片|护甲片|Armor plate|装甲プレート|방어판
d.bag.arm1d|本關護甲 +1|本关护甲 +1|+1 armor this stage|このステージの装甲 +1|이번 판 방어 +1
d.bag.fire1|火力符|火力符|Fire charm|火力のお守り|화력 부적
d.bag.fire1d|本關爆炸範圍 +1|本关爆炸范围 +1|+1 blast range this stage|このステージの爆風 +1|이번 판 폭발 범위 +1
d.bag.rem1|遙控器|遥控器|Detonator|リモコン|리모컨
d.bag.rem1d|本關可用遙控引爆|本关可用遥控引爆|Detonate remotely this stage|このステージは遠隔起爆できる|이번 판 원격 폭파 가능
d.bag.rev1|復活幣|复活币|Revive coin|復活コイン|부활 코인
d.bag.rev1d|陣亡時原地復活一次（半血）|阵亡时原地复活一次（半血）|Revive once on the spot at half HP|倒れたとき半HPで一度復活|쓰러지면 반피로 한 번 부활
d.perm.hp|起始生命|起始生命|Starting HP|開始HP|시작 체력
d.perm.bomb|起始炸彈|起始炸弹|Starting bombs|開始爆弾|시작 폭탄
d.perm.fire|起始火力|起始火力|Starting range|開始火力|시작 화력
d.sk.det|遙控引爆|遥控引爆|Remote detonate|遠隔起爆|원격 폭파
d.sk.detd|立刻引爆自己場上所有炸彈，不用等引信。|立刻引爆自己场上所有炸弹，不用等引信。|Detonate all your bombs at once.|自分の爆弾をすべて即起爆する。|자신의 폭탄을 모두 즉시 폭파한다.
d.sk.shield|守護護盾|守护护盾|Guardian shield|守護シールド|수호 방패
d.sk.shieldd|短暫無敵，火線裡也能硬走出來。|短暂无敌，火线里也能硬走出来。|Brief invulnerability — walk out of the fire.|短時間無敵。火の中でも歩いて抜けられる。|잠깐 무적. 불길 속에서도 걸어 나올 수 있다.
d.sk.frost|冰霜新星|冰霜新星|Frost nova|フロストノヴァ|서리 폭발
d.sk.frostd|凍住身邊 3 格內的怪（無傷害），讓牠們慢下來。|冻住身边 3 格内的怪（无伤害），让它们慢下来。|Freeze nearby foes (no damage) and slow them down.|近く3マスの敵を凍らせる（無傷）。|주변 3칸의 적을 얼린다(피해 없음).
d.sk.quake|震地波|震地波|Earthshock|地震波|지진파
d.sk.quaked|把身邊 2 格內的怪震開一格並暈眩（無傷害）。|把身边 2 格内的怪震开一格并晕眩（无伤害）。|Knock nearby foes back one tile and stun them (no damage).|近く2マスの敵を1マス弾き飛ばして気絶させる（無傷）。|주변 2칸의 적을 1칸 밀고 기절시킨다(피해 없음).
d.sk.kick|踢彈術|踢弹术|Bomb kick|爆弾キック|폭탄 차기
d.sk.kickd|撞到炸彈就把它踢出去。|撞到炸弹就把它踢出去。|Walk into a bomb to kick it away.|爆弾にぶつかると蹴り出す。|폭탄에 부딪히면 차서 보낸다.
d.sk.pierce|貫穿火焰|贯穿火焰|Piercing flame|貫通フレイム|관통 화염
d.sk.pierced|火焰穿過軟磚繼續燒，開路用。|火焰穿过软砖继续烧，开路用。|Flame burns through soft bricks to open a path.|炎が軟らかいレンガを抜けて燃え広がる。|화염이 벽돌을 통과해 길을 낸다.
d.sk.bomb|彈匣擴充|弹匣扩充|Extra bombs|爆弾枠拡張|폭탄 확장
d.sk.bombd|起始可放炸彈 +1 顆／級。|起始可放炸弹 +1 颗／级。|+1 starting bomb per level.|開始時に置ける爆弾 +1／レベル。|시작 폭탄 +1/레벨.
d.sk.fire|火焰強化|火焰强化|Flame boost|火力強化|화염 강화
d.sk.fired|起始爆炸範圍 +1 格／級。|起始爆炸范围 +1 格／级。|+1 starting blast range per level.|開始時の爆風 +1マス／レベル。|시작 폭발 범위 +1칸/레벨.
d.sk.hp|生命強化|生命强化|Vitality|HP強化|체력 강화
d.sk.hpd|最大生命 +1／級。|最大生命 +1／级。|+1 max HP per level.|最大HP +1／レベル。|최대 체력 +1/레벨.
d.sk.def|護甲強化|护甲强化|Armor boost|装甲強化|방어 강화
d.sk.defd|起始護甲 +1／級。|起始护甲 +1／级。|+1 starting armor per level.|開始時の装甲 +1／レベル。|시작 방어 +1/레벨.
d.tal.light|身輕如燕|身轻如燕|Nimble|身軽|날렵함
d.tal.lightd|移動速度 +5%|移动速度 +5%|Move speed +5%|移動速度 +5%|이동 속도 +5%
d.tal.round|圓滾滾|圆滚滚|Round|まんまる|동글동글
d.tal.roundd|最大生命 +1|最大生命 +1|Max HP +1|最大HP +1|최대 체력 +1
d.tal.quick|快動作|快动作|Quick|素早い|빠른 몸놀림
d.tal.quickd|移動速度 +8%|移动速度 +8%|Move speed +8%|移動速度 +8%|이동 속도 +8%
d.tal.stub|倔強|倔强|Stubborn|頑固|고집
d.tal.stubd|受擊後多 0.5 秒無敵|受击后多 0.5 秒无敌|+0.5s invulnerability after a hit|被弾後の無敵 +0.5 秒|피격 후 무적 +0.5초
d.tal.gold|招財|招财|Fortune|招福|재물
d.tal.goldd|通關金幣 +15%|通关金币 +15%|+15% stage gold|クリア報酬 +15%|클리어 골드 +15%
d.tal.face|厚臉皮|厚脸皮|Thick skin|厚かましい|뻔뻔함
d.tal.faced|受到傷害 -1（至少 1）|受到伤害 -1（至少 1）|Take 1 less damage (min 1)|受けるダメージ -1（最低1）|받는 피해 -1(최소 1)
d.tal.eat|好胃口|好胃口|Big appetite|大食い|대식가
d.tal.eatd|藥水效果 +1|药水效果 +1|Potion effect +1|ポーション効果 +1|물약 효과 +1
d.tal.luck|幸運星|幸运星|Lucky star|ラッキースター|행운의 별
d.tal.luckd|道具掉落率 +10%|道具掉落率 +10%|+10% item drop rate|アイテム出現 +10%|아이템 드롭 +10%
d.attr.hp|生命|生命|Life|HP|체력
d.attr.def|護甲|护甲|Armor|装甲|방어
d.attr.spd|移動速度|移动速度|Move speed|移動速度|이동 속도
d.attr.atk|火焰傷害|火焰伤害|Flame damage|炎ダメージ|화염 피해
d.attr.range|爆炸範圍|爆炸范围|Blast range|爆風範囲|폭발 범위
d.attr.bomb|可放炸彈|可放炸弹|Max bombs|置ける爆弾|설치 폭탄
d.u.pt|點|点|pt|pt|pt
d.u.tile|格|格|tile|マス|칸
d.u.bomb|顆|颗|bomb|個|개
skill.cdOnly|CD {s} 秒|CD {s} 秒|CD {s}s|CD {s} 秒|CD {s}초
skill.durCd|{d} 秒／CD {c} 秒|{d} 秒／CD {c} 秒|{d}s / CD {c}s|{d} 秒／CD {c} 秒|{d}초 / CD {c}초
skill.next|→ 下一級：{v}|→ 下一级：{v}|→ Next level: {v}|→ 次のレベル：{v}|→ 다음 레벨: {v}
skill.onePt|1 點|1 点|1 pt|1 ポイント|1 포인트
skill.max|MAX|MAX|MAX|MAX|MAX
d.shop.notEnough|金幣不足（還差 {n}）|金币不足（还差 {n}）|Not enough gold ({n} short)|ゴールド不足（あと {n}）|골드 부족({n} 부족)
d.shop.bought|買了 {n}|买了 {n}|Bought {n}|{n} を購入|{n} 구매
shop.buy|購買|购买|Buy|購入|구매
shop.noGold|金幣不足|金币不足|Not enough|ゴールド不足|골드 부족
shop.permLine|每一場出發都 {u}（永久）|每一场出发都 {u}（永久）|{u} on every run (permanent)|毎回の出発時に {u}（永久）|매 판 시작 시 {u} (영구)
shop.full|已滿|已满|Max|最大|최대
shop.upgrade|強化|强化|Upgrade|強化|강화
skill.act|主動|主动|Active|アクティブ|액티브
skill.pas|被動|被动|Passive|パッシブ|패시브
skill.empty|空欄位|空栏位|Empty slot|空き枠|빈 슬롯
skill.hotkey|熱鍵 {k}|热键 {k}|Key {k}|キー {k}|키 {k}
skill.pickBelow|從下面選一個|从下面选一个|Pick one below|下から選ぶ|아래에서 선택
skill.remove|移除|移除|Remove|外す|해제
skill.noneYet|還沒學會任何主動招式 —— 先去「學習招式」。|还没学会任何主动招式 —— 先去「学习招式」。|No active skills yet — learn one first.|アクティブスキル未習得。「スキル習得」へ。|액티브 스킬이 없다. 먼저 배우자.
skill.equip|裝備|装备|Equip|装備|장착
skill.equipped|已裝備|已装备|Equipped|装備中|장착됨
skill.ownActives|已學會的主動招式（點一下放進空欄）|已学会的主动招式（点一下放进空栏）|Learned active skills (tap to equip)|習得済みアクティブ（押して装備）|배운 액티브 스킬(눌러서 장착)
lvl.sub|這一關升了 {n} 級|这一关升了 {n} 级|+{n} level(s)|今回で {n} レベル上がりました|이번에 {n}레벨 올랐습니다
lvl.pts|配點|配点|Attribute points|能力ポイント|능력치 포인트
lvl.sk|技能點|技能点|Skill points|スキルポイント|스킬 포인트
lvl.ok|繼續冒險|继续冒险|Keep going|続ける|계속
respec.none|目前沒有配點可以退回|目前没有配点可以退回|Nothing to reset|戻せるポイントがありません|되돌릴 포인트가 없습니다
respec.confirm|把四項配點全部退回？退回之後要重新分配。|把四项配点全部退回？退回之后要重新分配。|Reset all attributes? You will need to re-allocate them.|4 項目をすべて戻しますか？再割り振りが必要です。|능력치를 모두 되돌릴까요? 다시 분배해야 합니다.
respec.done|♻️ 配點已全部退回|♻️ 配点已全部退回|♻️ Points reset|♻️ ポイントを戻しました|♻️ 포인트를 되돌렸습니다
respec.fail|退回失敗 —— 網路不穩，稍後再試|退回失败 —— 网络不稳，稍后再试|Reset failed — check your connection|戻せませんでした（通信エラー）|되돌리지 못했습니다(통신 오류)
end.k|ADVENTURE CLEAR|冒险完成|ADVENTURE CLEAR|ADVENTURE CLEAR|ADVENTURE CLEAR
end.t|32 關全破！|32 关全破！|All 32 stages cleared!|32 ステージ制覇！|32 스테이지 클리어!
end.sub|你走完了整段冒險。下面是這一輪的成績。|你走完了整段冒险。下面是这一轮的成绩。|You finished the whole run. Here is how it went.|全ステージを踏破しました。今回の記録です。|모험을 모두 마쳤습니다. 이번 기록입니다.
end.lv|最終等級|最终等级|Final level|最終レベル|최종 레벨
end.xp|累積經驗|累积经验|Total EXP|累計経験値|누적 경험치
end.sk|學會招式|学会招式|Skills learned|習得スキル|습득 스킬
end.perm|永久強化|永久强化|Permanent upgrades|永久強化|영구 강화
end.ok|回到角色畫面|回到角色画面|Back to character|キャラ画面へ|캐릭터 화면으로
end.replayK|CLEAR|通关|CLEAR|CLEAR|CLEAR
end.replayT|再次全破|再次全破|Cleared again|再クリア|재클리어
gift.misRpgBoss|打倒 {n} 隻 RPG 魔王|打倒 {n} 只 RPG 魔王|Defeat {n} RPG boss(es)|RPG ボスを {n} 体たおす|RPG 보스 {n}마리 격파
gift.misRpgLv|在 RPG 升 {n} 級|在 RPG 升 {n} 级|Gain {n} RPG level(s)|RPG で {n} レベル上げる|RPG에서 {n}레벨 올리기
gift.misRpgClear|RPG 過關 {n} 次|RPG 过关 {n} 次|Clear {n} RPG stages|RPG ステージを {n} 回クリア|RPG 스테이지 {n}회 클리어
codex.title|圖鑑|图鉴|Codex|図鑑|도감
codex.tabFoe|怪物|怪物|Monsters|モンスター|몬스터
codex.tabBoss|魔王|魔王|Bosses|ボス|보스
codex.tabItem|道具|道具|Items|アイテム|아이템
codex.tabSkill|招式|招式|Skills|スキル|스킬
codex.hintFoe|打倒過的怪物會在這裡點亮。|打倒过的怪物会在这里点亮。|Monsters you defeat light up here.|倒したモンスターが記録されます。|처치한 몬스터가 기록됩니다.
codex.hintBoss|打贏過的魔王會在這裡點亮。|打赢过的魔王会在这里点亮。|Bosses you beat light up here.|倒したボスが記録されます。|격파한 보스가 기록됩니다.
codex.hintItem|撿過的道具會在這裡點亮。|捡过的道具会在这里点亮。|Items you pick up light up here.|拾ったアイテムが記録されます。|획득한 아이템이 기록됩니다.
codex.hintSkill|學會的招式會在這裡點亮。|学会的招式会在这里点亮。|Skills you learn light up here.|習得したスキルが記録されます。|습득한 스킬이 기록됩니다.
ach.seriesProg|系列進度|系列进度|Series progress|シリーズ進行|시리즈 진행
ach.seriesFull|{done} / {total} 個系列全滿|{done} / {total} 个系列全满|{done} / {total} series complete|{done} / {total} シリーズ制覇|{done} / {total} 시리즈 완료
tip.solo.1|出口門一定藏在軟磚底下，而且要把小怪清光才會開——先炸磚、再找門。|出口门一定藏在软砖底下，而且要把小怪清光才会开——先炸砖、再找门。|The exit door is always hidden under a soft block and only opens once every foe is gone — blast bricks first, then look for the door.|出口は必ずソフトブロックの下。敵を全滅させると開きます。まずはブロックを壊して探そう。|출구 문은 항상 부서지는 블록 아래에 있고, 적을 모두 처치해야 열립니다. 블록부터 부수고 문을 찾으세요.
tip.solo.2|火焰是十字型：躲到格子斜角就完全不會被燒到，貼著牆跑也很安全。|火焰是十字型：躲到格子斜角就完全不会被烧到，贴着墙跑也很安全。|Flames travel in a cross — standing on the diagonal of a tile is completely safe, so hugging walls works.|炎は十字に広がります。マスの斜めに立てば焼かれません。壁沿いに逃げるのが安全。|불꽃은 십자 모양입니다. 칸의 대각선에 있으면 안전하니 벽을 따라 움직이세요.
tip.solo.3|看不到路就縮小：滾輪或 1／2 鍵（手機兩指捏合），範圍 42%~300%。|看不到路就缩小：滚轮或 1／2 键（手机两指捏合），范围 42%~300%。|Can't see the route? Zoom out with the wheel or 1/2 keys (pinch on mobile): 42%–300%.|道が見えないときは縮小。ホイールか 1／2 キー（スマホはピンチ）、42%〜300%。|길이 안 보이면 축소하세요. 휠 또는 1/2 키(모바일은 핀치), 42%~300%.
tip.rpg.1|RPG 模式有血條與護甲：被打不會一下倒，護甲會先吸收傷害、每秒回一點。|RPG 模式有血条与护甲：被打不会一下倒，护甲会先吸收伤害、每秒回一点。|RPG mode has HP and armor: hits won't one-shot you, armor soaks damage first and regenerates slowly.|RPG モードは HP とアーマー制。一撃では倒れず、アーマーが先にダメージを吸収して少しずつ回復します。|RPG 모드는 체력과 방어구가 있습니다. 한 방에 죽지 않고 방어구가 먼저 피해를 흡수하며 조금씩 회복됩니다.
tip.rpg.2|升級會給技能點：右側招式列（電腦 Q／R／F／V、手機直接點）打出爆發傷害。|升级会给技能点：右侧招式列（电脑 Q／R／F／V、手机直接点）打出爆发伤害。|Levelling grants skill points — the skill bar (Q/R/F/V on PC, tap on mobile) is where your burst damage comes from.|レベルアップでスキルポイント获得。右のスキルバー（PC は Q/R/F/V、スマホはタップ）が火力の要です。|레벨업하면 스킬 포인트를 얻습니다. 오른쪽 스킬 바(PC는 Q/R/F/V, 모바일은 터치)가 주력 딜입니다.
tip.rpg.3|每 4 關一隻章節王，第 32 關是最終魔王——王有專屬招式，看頭上的 💥／⚡ 決定要閃還是打斷。|每 4 关一只章节王，第 32 关是最终魔王——王有专属招式，看头上的 💥／⚡ 决定要闪还是打断。|A chapter boss every 4 stages; stage 32 is the final one. Watch the 💥/⚡ icon above it — dodge or interrupt.|4 ステージごとに章ボス、32 がラスボス。頭上に出る 💥／⚡ で避けるか中断するかを判断。|4스테이지마다 챕터 보스, 32스테이지가 최종 보스입니다. 머리 위 💥／⚡ 표시를 보고 회피할지 끊을지 판단하세요.
tip.br.1|毒圈會一直縮小：圈外的傷害愈來愈高，往安全區移動永遠是第一優先。|毒圈会一直缩小：圈外的伤害愈来愈高，往安全区移动永远是第一优先。|The ring keeps closing — damage outside grows over time, so moving toward safety always comes first.|毒リングは縮み続け、外はダメージが増えます。安全地帯へ移動が最優先。|독 장판이 계속 좁혀집니다. 바깥 피해가 커지니 안전 지역 이동이 최우선입니다.
tip.br.2|島上有亂入 BOSS：打贏噴大量資源，但別在毒圈邊緣跟牠糾纏。|岛上有乱入 BOSS：打赢喷大量资源，但别在毒圈边缘跟它纠缠。|Bosses roam the island — killing one drops a pile of loot, but never fight one at the edge of the ring.|島には乱入ボスがいます。倒せば大量の資源が出ますが、リング際での戦闘は危険。|섬에 난입 보스가 있습니다. 잡으면 자원이 쏟아지지만 장판 경계에서 싸우면 위험합니다.
tip.br.3|組隊時隊友腳下有隊色光環、頭上頂著名字：同隊不會互相傷害，可以放心一起炸。|组队时队友脚下有队色光环、头上顶着名字：同队不会互相伤害，可以放心一起炸。|In a team your mates get a colored ring and a name tag — teammates never damage each other, so blast away.|チーム戦では味方の足元にチーム色のリングと名前が出ます。同士討ちはありません。|팀전에서는 아군 발밑에 팀 색 링과 이름이 표시됩니다. 같은 팀끼리는 피해를 주지 않습니다.
tip.online.1|用 4 位數房號跟朋友連線：建好房把號碼貼給對方，空位會由 AI 補滿。|用 4 位数房号跟朋友连线：建好房把号码贴给对方，空位会由 AI 补满。|Share the 4-digit room code to play with friends — empty slots get filled by AI.|4 桁の部屋番号を友だちに送るだけ。空き枠は AI が埋めます。|4자리 방 번호를 친구에게 보내세요. 빈 자리는 AI가 채웁니다.
tip.online.2|對局中可以用快捷語溝通：右下 💬 有「掩護我」「注意後面」等句子，會自動翻成對方的語言。|对局中可以用快捷语沟通：右下 💬 有「掩护我」「注意后面」等句子，会自动翻成对方的语言。|Quick chat lives at the bottom-right 💬 — phrases like “cover me” are auto-translated for the other player.|右下の 💬 から定型文を送れます。相手の言語に自動翻訳されます。|오른쪽 아래 💬로 빠른 대사를 보낼 수 있고 상대 언어로 자동 번역됩니다.
tip.online.3|房主可以一鍵邀好友：房間裡按「邀請」，直接把房號私訊給最近一起玩的人。|房主可以一键邀好友：房间里按「邀请」，直接把房号私讯给最近一起玩的人。|The host can invite with one tap: it DMs the room code to people you played with recently.|ホストは「招待」で最近一緒に遊んだ人へ部屋番号を DM できます。|방장은 '초대'로 최근 함께 플레이한 사람에게 방 번호를 DM할 수 있습니다.
tip.battle.1|2～8 人同機混戰：沒人坐的位子由 AI 補滿，直接按開戰就能打。|2～8 人同机混战：没人坐的位子由 AI 补满，直接按开战就能打。|Local 2–8 player brawl: empty slots are filled by AI, so just hit start.|2〜8 人のローカル乱戦。空き枠は AI が埋めるので、そのまま開始できます。|2~8인 로컬 난전. 빈 자리는 AI가 채우니 바로 시작하면 됩니다.
tip.battle.2|開組隊就不會誤傷自己人：同隊的炸彈與火焰對隊友完全無效。|开组队就不会误伤自己人：同队的炸弹与火焰对队友完全无效。|Team mode removes friendly fire completely — teammates' bombs and flames can't hurt you.|チーム戦では同士討ちなし。味方の爆弾も炎も当たりません。|팀전에서는 아군 피해가 없습니다. 같은 팀의 폭탄과 불꽃이 통하지 않습니다.
tip.battle.3|時間到會「突死縮圈」：站在圈外會持續扣血，倒數結束前先回安全區。|时间到会「突死缩圈」：站在圈外会持续扣血，倒数结束前先回安全区。|When time runs out the arena shrinks — standing outside drains HP, so get back in before the countdown ends.|時間切れでエリアが縮小。外にいると HP が減り続けます。|시간이 끝나면 영역이 줄어듭니다. 바깥에 있으면 체력이 계속 줄어듭니다.
ui.qual|🎨 畫質（手機卡就調低）|🎨 画质（手机卡就调低）|🎨 Graphics quality|🎨 画質（重いときは下げる）|🎨 그래픽 품질
ui.qualNow|目前：{lv}（解析度上限 {cap} 倍、粒子 {part}%）|目前：{lv}（分辨率上限 {cap} 倍、粒子 {part}%）|Now: {lv} (render scale {cap}×, particles {part}%)|現在：{lv}（解像度 {cap} 倍、パーティクル {part}%）|현재: {lv}(해상도 {cap}배, 파티클 {part}%)
ui.qLv0|低|低|Low|低|낮음
ui.qLv1|中|中|Mid|中|보통
ui.qLv2|高|高|High|高|높음
ui.qualTip|自動＝高解析度手機給「中」、其他給「高」。大逃殺 50 人很卡就選「低」。|自动＝高分辨率手机给「中」、其他给「高」。大逃杀 50 人很卡就选「低」。|Auto gives high-DPI phones “Mid” and everything else “High”. Pick “Low” if 50-player Royale stutters.|自動は高解像度スマホなら「中」、それ以外は「高」。50 人バトロワが重ければ「低」。|자동은 고해상도 폰에 '중', 그 외에는 '고'. 50인 로얄이 끊기면 '저'를 선택하세요.
ui.fps|📊 顯示 FPS|📊 显示 FPS|📊 Show FPS|📊 FPS 表示|📊 FPS 표시
ui.shake|📳 畫面震動|📳 画面震动|📳 Screen shake|📳 画面の揺れ|📳 화면 흔들림
ui.shakeHint|關掉就不會晃（暈動症、暈車體質建議關）。傷害回饋與打擊感都還在。|关掉就不会晃（晕动症、晕车体质建议关）。伤害反馈与打击感都还在。|Turn off to stop the camera shaking (recommended for motion sickness). Hit feedback stays.|オフにすると画面が揺れません（乗り物酔いしやすい人に推奨）。手応えは残ります。|끄면 화면이 흔들리지 않습니다(멀미하는 분께 권장). 타격감은 유지됩니다.
ui.cb|🌈 色盲友善隊色|🌈 色盲友善队色|🌈 Colorblind-friendly teams|🌈 色覚多様性チームカラー|🌈 색약 친화 팀 색상
ui.cbHint|打開後每隊除了換成安全色，還會加上圖形（●■▲★）與不同線型，不看顏色也分得出來。|打开后每队除了换成安全色，还会加上图形（●■▲★）与不同线型，不看颜色也分得出来。|Turns on safe colors plus a shape (●■▲★) and a distinct outline style per team, so color is never the only cue.|安全な色に加えて図形（●■▲★）と線の種類で区別します。色だけに頼りません。|안전한 색과 함께 도형(●■▲★)과 선 스타일로 구분합니다. 색만으로 판별하지 않아도 됩니다.
se.title|🎖️ 本季賽程|🎖️ 本季赛程|🎖️ Season|🎖️ シーズン|🎖️ 시즌
se.left|第 {s} 季 · 剩 {n} 天|第 {s} 季 · 剩 {n} 天|Season {s} · {n} days left|第 {s} シーズン・残り {n} 日|시즌 {s} · {n}일 남음
se.pts|{p} / {n} 分|{p} / {n} 分|{p} / {n} pts|{p} / {n} 点|{p} / {n}점
se.tier|階段 {n}|阶段 {n}|Tier {n}|段階 {n}|단계 {n}
se.gkill|擊殺敵人（全部模式）|击杀敌人（全部模式）|Kill enemies (all modes)|敵を撃破（全モード）|적 처치(모든 모드)
se.gboss|打倒 BOSS|打倒 BOSS|Defeat bosses|ボスを撃破|보스 처치
se.gpvp|打倒其他玩家|打倒其他玩家|Beat other players|他プレイヤーを撃破|다른 플레이어 처치
se.gwin|拿下冠軍|拿下冠军|Win a championship|優勝する|우승하기
qc.0|掩護我！|掩护我！|Cover me!|援護して！|엄호해 줘!
qc.1|小心後面！|小心后面！|Watch your back!|後ろに注意！|뒤를 조심해!
qc.2|跟我走|跟我走|Follow me|ついてきて|따라와
qc.3|我在這！|我在这！|I'm here!|ここだよ！|여기야!
qc.4|別炸我 😅|别炸我 😅|Don't blow me up 😅|巻き込まないで 😅|나 폭탄 놓지 마 😅
qc.5|打得好！|打得好！|Nice one!|ナイス！|좋았어!
qc.6|我需要道具|我需要道具|I need items|アイテムが必要|아이템이 필요해
qc.7|準備好了|准备好了|Ready when you are|準備できた|준비 완료
qc.tip|送出的句子會自動翻成對方的語言|送出的句子会自动翻成对方的语言|Your phrase is auto-translated for them|送った文は相手の言語に自動翻訳されます|보낸 문장은 상대 언어로 자동 번역됩니다
net.inviteTitle|📨 邀好友|📨 邀好友|📨 Invite friends|📨 フレンド招待|📨 친구 초대
net.inviteMsg|房號 {c} 快來！|房号 {c} 快来！|Room {c} — come join!|部屋番号 {c}、おいで！|방 번호 {c}, 어서 와!
net.inviteSub|把房號 {c} 私訊給朋友，對方點一下就能加入。|把房号 {c} 私讯给朋友，对方点一下就能加入。|Send room {c} to a friend — they can join with one tap.|部屋番号 {c} を友だちに送ると、ワンタップで参加できます。|방 번호 {c}를 친구에게 보내면 한 번에 참가할 수 있습니다.
net.inviteNone|現在沒有其他線上玩家|现在没有其他在线玩家|No one else is online|他にオンラインの人はいません|다른 접속자가 없습니다
net.inviteAnon|玩家|玩家|Player|プレイヤー|플레이어
net.inviteSend|邀請|邀请|Invite|招待|초대
net.inviteSent|已送出|已送出|Sent|送信済み|전송됨
net.inviteFail|失敗|失败|Failed|失敗|실패
net.inviteLoading|讀取中…|读取中…|Loading…|読み込み中…|불러오는 중…
net.inviteOff|拿不到線上名單（離線或伺服器沒開）|拿不到在线名单（离线或服务器没开）|Can't reach the online list (offline or server down)|オンライン名簿を取得できません|온라인 목록을 가져올 수 없습니다
net.inviteNeed|先建立或加入房間才能邀請|先建立或加入房间才能邀请|Create or join a room first|先に部屋を作るか参加してください|먼저 방을 만들거나 참가하세요
death.unknown|原因不明|原因不明|Cause unknown|原因不明|원인 불명
death.selfBomb|你自己放的炸彈|你自己放的炸弹|Your own bomb|自分の爆弾|내가 놓은 폭탄
death.rivalBomb|對手的炸彈|对手的炸弹|An opponent's bomb|相手の爆弾|상대의 폭탄
death.byFoe|被「{n}」打倒|被「{n}」打倒|Killed by {n}|「{n}」にやられた|'{n}'에게 당했다
death.left|王只剩 {n} 格血 —— 差 {n} 下就打贏|王只剩 {n} 格血 —— 差 {n} 下就打赢|The boss was down to {n} HP|ボスは残り {n} でした|보스 체력 {n} 남음
death.stage|你在第 {n} 關倒下|你在第 {n} 关倒下|You fell on stage {n}|ステージ {n} で力尽きた|스테이지 {n}에서 쓰러졌다
death.trailTip|紅線是你最後 5 秒的走位，橘點是爆點|红线是你最后 5 秒的走位，橘点是爆点|Red line = your last 5 seconds, orange dots = blasts|赤線＝最後 5 秒の移動、橙点＝爆発|빨간 선=마지막 5초 이동, 주황 점=폭발
spec.title|觀戰|观战|Spectating|観戦|관전
spec.auto|自動|自动|Auto|自動|자동
spec.hint|（觀戰中，點下方名字可以跟拍）|（观战中，点下方名字可以跟拍）|(Spectating — tap a name below to follow)|（観戦中：下の名前をタップで追従）|(관전 중: 아래 이름을 눌러 따라가기)
first.b|放好了！炸彈 2.4 秒後爆炸，火焰是十字型|放好了！炸弹 2.4 秒后爆炸，火焰是十字型|Nice! Bombs blow after 2.4s in a cross|置けた！爆弾は 2.4 秒後に十字に爆発|좋아요! 폭탄은 2.4초 뒤 십자로 터집니다
first.w|軟磚底下藏著道具，走過去自動撿|软砖底下藏着道具，走过去自动捡|Items hide under soft blocks — walk over to pick up|柔らかいブロックの下にアイテムがあります|부서진 블록 아래 아이템은 걸어가면 자동 획득
first.i|吃到道具了！火力＝火焰長度、彈量＝能同時放幾顆|吃到道具了！火力＝火焰长度、弹量＝能同时放几颗|Power = flame length, Bombs = how many at once|取得！火力＝炎の長さ、弾数＝同時に置ける数|획득! 화력=불꽃 길이, 탄수=동시에 놓는 수
first.noBomb|小提醒：按「滑鼠左鍵」（手機右下 💣）放炸彈，先炸開一條路再走|小提醒：按「鼠标左键」（手机右下 💣）放炸弹，先炸开一条路再走|Tip: press Left Mouse (💣 on mobile) to drop a bomb and open a path first|ヒント：左クリック（スマホは右下💣）で爆弾を置き、道を開けましょう|팁: 마우스 왼쪽(모바일 💣)으로 폭탄을 놓아 길을 여세요
first.stuck|你幾乎沒離開原地 —— 站著不動最容易被自己的火燒到，繞著炸彈走|你几乎没离开原地 —— 站着不动最容易被自己的火烧到，绕着炸弹走|You barely moved — standing still is the easiest way to get burned; keep circling|ほとんど動いていません。止まると自分の火に巻き込まれます。爆弾の周りを回りましょう|거의 움직이지 않았습니다. 가만히 있으면 자기 불꽃에 당합니다. 폭탄 주변을 도세요
ui.font|🔠 文字大小|🔠 文字大小|🔠 Text size|🔠 文字サイズ|🔠 글자 크기
ui.fontHint|「大」會把說明頁、對話框與結算卡的字放大約一成。|「大」会把说明页、对话框与结算卡的字放大约一成。|"Large" scales help pages, dialogs and result cards up by about 10%.|「大」は説明・ダイアログ・結果画面の文字を約 1 割大きくします。|'크게'는 설명·대화상자·결과 카드 글자를 약 10% 키웁니다.
ui.calm|🎬 減少動態|🎬 减少动态|🎬 Reduce motion|🎬 動きを減らす|🎬 움직임 줄이기
ui.calmHint|關掉場景粒子、白閃與轉場動畫，只留必要回饋。容易頭暈或舊手機建議開。|关掉场景粒子、白闪与转场动画，只留必要反馈。容易头晕或旧手机建议开。|Cuts ambient particles, white flashes and transitions, keeping only essential feedback. Good for motion sickness or older phones.|環境パーティクル・白フラッシュ・画面遷移を抑えます。酔いやすい人や旧端末に。|환경 파티클·흰 섬광·전환 효과를 줄입니다. 멀미가 있거나 오래된 기기에 권장.
ui.nodeCodex|📚 圖鑑|📚 图鉴|📚 Codex|📚 図鑑|📚 도감
ui.nodeSameMap|全球同一張圖|全球同一张图|Same map for everyone|世界中が同じマップ|전 세계 동일 맵
ui.nodeLocalBattle|🖥️ 本機混戰（2～8 人）|🖥️ 本机混战（2～8 人）|🖥️ Local free-for-all (2–8 players)|🖥️ ローカル混戦（2〜8人）|🖥️ 로컬 난전(2~8인)
ui.nodeOnlineRoom|🌐 線上房號（跟朋友連線）|🌐 线上房号（跟朋友连线）|🌐 Online room code (play with friends)|🌐 オンライン部屋番号（友達と遊ぶ）|🌐 온라인 방 번호(친구와 함께)
ui.nodeAvatarNote|照片會壓成 128×128 的小圖（約 5～10 KB），存在雲端名單裡，其他線上玩家看得到。|照片会压成 128×128 的小图（约 5～10 KB），存在云端名单里，其他线上玩家看得到。|Your photo is compressed to 128×128 (about 5–10 KB), stored in the online list and visible to other players.|写真は 128×128（約5〜10KB）に圧縮され、オンライン名簿に保存されて他のプレイヤーに見えます。|사진은 128×128(약 5~10KB)로 압축되어 온라인 목록에 저장되고 다른 플레이어에게 보입니다.
ui.nodeStart|開始挑戰 →|开始挑战 →|Start →|挑戦する →|도전 시작 →
ui.nodeRevert|♻️ 全部退回|♻️ 全部退回|♻️ Revert all|♻️ すべて戻す|♻️ 모두 되돌리기
ui.nodeSkipStage|👹 跳過關卡，直接單挑最終魔王|👹 跳过关卡，直接单挑最终魔王|👹 Skip ahead and face the final boss|👹 ステージを飛ばしてラスボスと直接対決|👹 스테이지를 건너뛰고 최종 보스와 대결
ui.nodePadAssign|手把指派（1P～4P）|手柄指派（1P～4P）|Controller assignment (P1–P4)|コントローラー割り当て（1P〜4P）|컨트롤러 지정(1P~4P)
ui.nodePadAfter|接上手把後|接上手柄后|After you plug in a controller, |コントローラーを接続したら|컨트롤러를 연결한 뒤
ui.nodePadPress|按一下任意鍵|按一下任意键|press any button|いずれかのボタンを押す|아무 버튼이나 누르면
ui.nodePadClear|清除全部指派|清除全部指派|Clear all assignments|割り当てを全部消す|모든 지정 해제
ui.nodeRefresh|🔄 重新整理|🔄 重新整理|🔄 Refresh|🔄 再読み込み|🔄 새로고침
ui.nodeSupply|補給在出發時自動消耗|补给在出发时自动消耗|Supplies are consumed automatically when you set off|補給は出発時に自動で消費されます|보급은 출발할 때 자동으로 소모됩니다
ui.nodeCheckin|每日簽到|每日签到|Daily check-in|デイリーログイン|일일 출석
ui.nodeClaimToday|領取今天的獎勵|领取今天的奖励|Claim today's reward|今日の報酬を受け取る|오늘의 보상 받기
ui.nodeGoWeekly|去打本週關卡|去打本周关卡|Go play this week's stages|今週のステージへ|이번 주 스테이지 하러 가기
ui.std|標準|标准|Standard|標準|보통
foe.bossName|首領|首领|Boss|ボス|보스
foe.someName|怪物|怪物|Monster|モンスター|몬스터
`;
