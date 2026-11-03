# -*- coding: utf-8 -*-
# v4.69 F：線上配對新增「組隊對戰」隊數（2~4 隊）＋ 測試階段延遲說明
import io, sys
P = '../bomb-hero/index.html'
SRV = '../server.js'
s = io.open(P, encoding='utf-8').read()


def rep(old, new, tag, target='html'):
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


# ---------- 1. HTML：房間頁的隊伍模式 ----------
rep("""          <label class="mt12">對戰人數（房主設定）</label>
          <div class="seg" id="segNetCount"><button data-v="2">2</button><button data-v="3">3</button><button data-v="4">4</button><button data-v="5">5</button><button data-v="6">6</button><button data-v="7">7</button><button data-v="8">8</button></div>""",
    """          <label class="mt12">對戰人數（房主設定）</label>
          <div class="seg" id="segNetCount"><button data-v="2">2</button><button data-v="3">3</button><button data-v="4">4</button><button data-v="5">5</button><button data-v="6">6</button><button data-v="7">7</button><button data-v="8">8</button></div>
          <label class="mt12" id="netTeamLbl"></label>
          <div class="seg" id="segNetTeams">
            <button data-v="0"></button><button data-v="2"></button><button data-v="3"></button><button data-v="4"></button>
          </div>""",
    'net-teams-html')

# 空白處的延遲說明
rep("""        <div class="netcol">
          <label>配對中的房間（點房號直接加入）</label>
          <div class="roomlist" id="netRoomList"><div class="roomempty">讀取中…</div></div>
        </div>
      </div>""",
    """        <div class="netcol">
          <label>配對中的房間（點房號直接加入）</label>
          <div class="roomlist" id="netRoomList"><div class="roomempty">讀取中…</div></div>
        </div>
        <div class="hint" id="netLagNote" style="grid-column:1/-1;margin-top:10px;line-height:1.7"></div>
      </div>""",
    'net-lag-note')

# ---------- 2. JS：renderNetTeamSeg ----------
rep("""  renderCountSeg: function () {""",
    """  // v4.69：線上組隊（2~4 隊；0 = 混戰）。房主設定、客人唯讀顯示。
  renderNetTeamSeg: function () {
    const seg = $id('segNetTeams'); if (!seg) return;
    const lbl = $id('netTeamLbl');
    if (lbl) lbl.textContent = t('net.teams');
    const cur = Net.role === 'host' ? (teamCount()) : (Net.remoteTeams | 0);
    seg.querySelectorAll('button').forEach(function (b) {
      const v = parseInt(b.getAttribute('data-v'), 10) || 0;
      b.classList.toggle('sel', v === cur);
      b.disabled = Net.role !== 'host';
      b.style.opacity = Net.role === 'host' ? '1' : '.5';
      b.textContent = v === 0 ? t('net.teams.free') : t('net.teams.n', { n: v });
    });
  },
  renderCountSeg: function () {""",
    'net-teams-render')

rep("""    Net.renderRoster();
    Net.renderCountSeg();
    try { updateCta(); } catch (e) {}""",
    """    Net.renderRoster();
    Net.renderCountSeg();
    Net.renderNetTeamSeg();
    const lag = $id('netLagNote');
    if (lag) lag.textContent = t('net.lag');
    try { updateCta(); } catch (e) {}""",
    'net-teams-enter')

# pushState 帶上隊數
rep("""      code: Net.code, pid: Net.pid, phase: Net.phase, count: Net.count,""",
    """      code: Net.code, pid: Net.pid, phase: Net.phase, count: Net.count, teams: teamCount(),""",
    'net-teams-push')

# poll 收到房主的隊數
rep("""      if (typeof j.count === 'number') Net.count = j.count;""",
    """      if (typeof j.count === 'number') Net.count = j.count;
      if (typeof j.teams === 'number') {
        const was = Net.remoteTeams | 0;
        Net.remoteTeams = j.teams | 0;
        if (was !== Net.remoteTeams && Net.role !== 'host') { try { Net.renderNetTeamSeg(); } catch (e) {} }
      }""",
    'net-teams-poll')

# 綁定
rep("""(function () {
  const seg = $id('segNetCount');""",
    """(function () {
  const segT = $id('segNetTeams');
  if (segT) segT.querySelectorAll('button').forEach(function (b) {
    b.addEventListener('click', function () {
      if (Net.role !== 'host') return;
      AudioSys.sfx('click');
      settings.teams = [0, 2, 3, 4].indexOf(parseInt(b.getAttribute('data-v'), 10)) >= 0
        ? parseInt(b.getAttribute('data-v'), 10) : 0;
      saveSettings();
      Net.renderNetTeamSeg();
      Net.pushState(false);
    });
  });
})();
  try {
(function () {
  const seg = $id('segNetCount');""",
    'net-teams-wire')

# ---------- 3. 伺服器：房間記住隊數並回傳 ----------
srv = io.open(SRV, encoding='utf-8').read()


def reps(old, new, tag):
    global srv
    n = srv.count(old)
    if n != 1:
        sys.stderr.write('[FAIL srv] %s count=%d\n' % (tag, n))
        sys.exit(1)
    srv = srv.replace(old, new)
    print('[ok] ' + tag)


reps("""    host: room.host,
    count: room.count,""",
     """    host: room.host,
    count: room.count,
    teams: room.teams | 0,""",
     'srv-pub')

reps("""  if (typeof body.count === 'number') room.count = clampCount(body.count);""",
     """  if (typeof body.count === 'number') room.count = clampCount(body.count);
  if (typeof body.teams === 'number') room.teams = [0, 2, 3, 4].indexOf(body.teams | 0) >= 0 ? (body.teams | 0) : 0;""",
     'srv-push')

reps("""    id: code, created: Date.now(), host: pid, phase: 'wait', count: count,""",
     """    id: code, created: Date.now(), host: pid, phase: 'wait', count: count, teams: 0,""",
     'srv-create')

io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
io.open(SRV, 'w', encoding='utf-8', newline='\n').write(srv)
print('chars:', len(s))
