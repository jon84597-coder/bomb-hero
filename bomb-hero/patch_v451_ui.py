# -*- coding: utf-8 -*-
# v4.51 ③：首頁設定移除「地圖尺寸（全域）」＋ 說明頁測試關入口 ＋ URL ?maptest=N
import io, sys

P = 'index.html'
s = io.open(P, encoding='utf-8', newline='').read()
orig = len(s)


def rep(old, new, optional=False, tag=''):
    global s
    if old not in s:
        if optional:
            print('  · skip ' + (tag or old[:36]))
            return
        sys.exit('MISS: ' + (tag or '') + ' -> ' + old[:120].replace('\n', '\\n'))
    s = s.replace(old, new, 1)
    print('  ✓ ' + (tag or old[:36].replace('\n', ' ')))


# ---------------------------------------------- 1) 設定頁拿掉地圖尺寸
rep('''      <div class="desc">單人闖關同樣使用「地圖尺寸」設定，地圖越大敵人越多。</div>
      <div class="field"><label>地圖尺寸（全域）</label>
        <div class="seg" id="segSize2">
          <button data-v="S">小 13×11</button><button data-v="M">中 15×13</button>
          <button data-v="L">大 17×15</button><button data-v="XL">超大 21×15</button>
        </div>
      </div>
''',
'''      <div class="desc">單人闖關與 RPG 的地圖由系統自動生成，大小隨關卡成長，不需要設定。</div>
''', tag='設定頁移除地圖尺寸')

rep('''refreshers.push(segWire('segSize2', function () { return settings.size; }, function (v) { settings.size = v; }));
''', '', tag='移除 segSize2 綁定')

# ---------------------------------------------- 2) 說明頁測試關入口容器
rep('''      <div class="helpbody" id="helpBody"></div>
      <div class="backrow">''',
'''      <div class="helpbody" id="helpBody"></div>
      <div class="mtrow" id="mapTestRow"></div>
      <div class="backrow">''', tag='說明頁測試關容器')

# ---------------------------------------------- 3) 說明頁測試關入口 JS
MT_JS = '''/* v4.51：說明頁最下方「地圖生成測試關」入口（不對外，驗收生成器用） */
(function () {
  const row = $id('mapTestRow');
  if (!row) return;
  const mk = function (txt) {
    return '<span style="display:inline-block;padding:5px 9px;border-radius:8px;font-size:12px;' +
      'background:#9fd3ff;color:#0b1220;font-weight:700;cursor:pointer;margin:3px 4px 0 0">' + txt + '</span>';
  };
  let h = '<div style="margin:14px 0 2px;font-size:11.5px;color:#7f8ca3;letter-spacing:.4px">' +
    '地圖生成測試（開發用 · 不公開）</div>';
  MAPTEST.forEach(function (m) {
    h += mk('T' + m.n + '　' + m.floor + '格／' + m.foes + '怪');
  });
  row.innerHTML = h;
  row.addEventListener('click', function (e) {
    const t2 = e.target;
    if (!t2 || t2.tagName !== 'SPAN') return;
    const list = Array.prototype.slice.call(row.querySelectorAll('span'));
    const idx = list.indexOf(t2);
    if (idx <= 0) return;              // 第 0 個是標題，不是按鈕
    AudioSys.ensure(); AudioSys.sfx('click');
    startMapTest(idx);
  });
})();

'''
rep('''  function render() {
    const box = $id('helpBody');
    if (!box) return;''',
MT_JS + '''  function render() {
    const box = $id('helpBody');
    if (!box) return;''', tag='說明頁測試關入口 JS')

# ---------------------------------------------- 4) URL ?maptest=N
rep('''    if (q.get('boss') === '1') startBossRush();
    else if (q.get('stage')) startSolo(Math.max(1, Math.min(8, parseInt(q.get('stage'), 10) || 1)), false);''',
'''    if (q.get('boss') === '1') startBossRush();
    // ?maptest=1~5 直接開地圖生成測試關（v4.51，不公開）
    else if (q.get('maptest')) startMapTest(parseInt(q.get('maptest'), 10) || 1);
    else if (q.get('stage')) startSolo(Math.max(1, Math.min(8, parseInt(q.get('stage'), 10) || 1)), false);''',
    tag='URL ?maptest')

# ---------------------------------------------- 5) 正常入口清掉測試關設定
rep('''  go() {
    const n = Solo.sel;
    if (n > Solo.maxUnlocked()) { toast(t('solo.lockToast', { n: n }), 1.8); return; }
    startSolo(n);
  },''',
'''  go() {
    const n = Solo.sel;
    if (n > Solo.maxUnlocked()) { toast(t('solo.lockToast', { n: n }), 1.8); return; }
    clearMapTest();          // v4.51：從正常選單進來就離開測試關
    startSolo(n);
  },''', tag='Solo.go 清測試關')

rep('''function startRpg(stage) {
  Game.mode = 'rpg';''',
'''function startRpg(stage) {
  clearMapTest();            // v4.51：正常入口一律離開測試關
  Game.mode = 'rpg';''', tag='startRpg 清測試關')

rep('''  // v4.21：BOSS 挑戰任何環節出錯都要講出來，不要靜靜地什麼都沒發生
  try { startBossRush(); }''',
'''  // v4.21：BOSS 挑戰任何環節出錯都要講出來，不要靜靜地什麼都沒發生
  clearMapTest();
  try { startBossRush(); }''', tag='btnBoss 清測試關')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('\n字元 %d → %d（%+d）' % (orig, len(s), len(s) - orig))
