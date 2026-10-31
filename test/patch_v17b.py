# -*- coding: utf-8 -*-
"""v1.7-b：每一張地圖一首專屬 BGM（八關八首，程式自動譜曲）"""
import io
P = 'index.html'
s = io.open(P, encoding='utf-8').read()
n = 0


def rep(old, new, tag):
    global s, n
    assert old in s, 'MISS: ' + tag
    assert s.count(old) == 1, 'DUP(%d): %s' % (s.count(old), tag)
    s = s.replace(old, new)
    n += 1
    print('OK', tag)


# ---------- 1) 在 compileSong 之前插入「自動譜曲引擎」 ----------
rep("""  function compileSong(name) {""",
    """  // ===== v1.7：每一張地圖一首專屬曲 =====
  // 用「和聲進行 + 節奏模板 + 音色 + 鼓組」四組參數自動譜出旋律，
  // 八關八種性格：tempo／音色／鼓型／和聲／旋律走向全都不同。
  function lcg(seed) {
    let st = (seed >>> 0) || 1;
    return function () { st = (st * 1664525 + 1013904223) >>> 0; return st / 4294967296; };
  }
  // 和弦根音在 C 大調裡的級數（旋律用級數記譜，所以要對得上）
  const CH_STEP = { C: 1, Dm: 2, Em: 3, F: 4, G: 5, Am: 6 };
  // 節奏型：單位是 16 分音符，每一小節合計 16
  const RHY_SETS = [
    // 0 輕快八分
    [[2, 2, 2, 2, 2, 2, 2, 2], [2, 2, 2, 2, 4, 4], [2, 2, 4, 4, 4], [2, 2, 2, 2, 2, 2, 4]],
    // 1 十六分推進
    [[1, 1, 1, 1, 2, 2, 4, 4], [1, 1, 1, 1, 2, 2, 2, 4], [1, 1, 2, 2, 2, 2, 2, 4], [1, 1, 1, 1, 2, 2, 4, 4]],
    // 2 切分跳躍
    [[2, 1, 1, 2, 2, 2, 4, 2], [2, 1, 1, 2, 4, 2, 4], [2, 1, 1, 2, 2, 4, 4], [2, 1, 1, 2, 2, 2, 2, 4]],
    // 3 寬廣長音
    [[4, 4, 4, 4], [4, 4, 8], [2, 2, 4, 4, 4], [4, 2, 2, 4, 4]],
    // 4 密集連打
    [[1, 1, 1, 1, 1, 1, 2, 2, 2, 4], [1, 1, 1, 1, 2, 2, 2, 2, 4], [1, 1, 2, 2, 1, 1, 2, 2, 4], [1, 1, 1, 1, 1, 1, 1, 1, 4, 4]],
    // 5 進行曲
    [[2, 2, 2, 2, 4, 4], [2, 2, 2, 2, 2, 2, 4], [4, 2, 2, 4, 4], [2, 2, 4, 2, 2, 4]]
  ];
  function degTok(step) {
    const d = (((step - 1) % 7) + 7) % 7 + 1;
    const o = Math.floor((step - 1) / 7);
    return d + (o > 0 ? '+' : (o < 0 ? '-' : ''));
  }
  // 依和弦進行 + 節奏型 + 種子，譜出一整段旋律（每小節 16 個 16 分音符）
  function genMelBars(chords, seed, rhySet, restRate) {
    const R = lcg(seed);
    const pats = RHY_SETS[rhySet] || RHY_SETS[0];
    const bars = [];
    let prev = CH_STEP[chords[0]] || 1;
    for (let i = 0; i < chords.length; i++) {
      const r = CH_STEP[chords[i]] || 1;
      const tones = [r, r + 2, r + 4, r + 7];
      const pat = pats[i % pats.length];
      const toks = [];
      for (let k = 0; k < pat.length; k++) {
        const len = pat[k];
        const isLast = k === pat.length - 1;
        if (!isLast && R() < restRate) { toks.push('0:' + len); continue; }
        let st2;
        if (R() < .74) {
          // 和弦音：挑離前一個音最近的（旋律聽起來有線條）
          let best = tones[0], bd = 1e9;
          for (let t = 0; t < tones.length; t++) {
            const sc = Math.abs(tones[t] - prev) + R() * 1.4;
            if (sc < bd) { bd = sc; best = tones[t]; }
          }
          st2 = best;
        } else {
          st2 = prev + (R() < .5 ? 1 : -1) * (R() < .3 ? 2 : 1);   // 經過音
        }
        st2 = Math.max(1, Math.min(13, st2));
        prev = st2;
        toks.push(degTok(st2) + ':' + len);
      }
      bars.push(toks.join(' '));
    }
    return bars;
  }
  // 八關八首：bpm／音色／鼓型／和聲／節奏型都不同
  const STAGE_MUSIC = [
    { bpm: 126, base: 72, wave: 'square', drum: 'k.h.s.h.k.h.s.hh', seed: 1101,
      bass: [0, 0, 7, 0, 0, 12, 7, 0], arp: [0, 1, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1],
      prog: ['C G Am Em F C F G', 'Am Em F C Dm G C G'], rhy: [0, 1, 0, 2], rest: .12,
      melVol: .130, bassVol: .175, arpVol: .050, drumVol: .088 },
    { bpm: 142, base: 72, wave: 'sawtooth', drum: 'k.hhsk.hhk.hhsk.hh', seed: 2202,
      bass: [0, 0, 0, 7, 0, 12, 7, 3], arp: [0, 2, 1, 2, 0, 2, 1, 3, 2, 1, 2, 3, 1, 2, 3, 1],
      prog: ['Am Am F G Am Em F G', 'Dm Am Em Am F G Am Am'], rhy: [1, 4, 1, 4], rest: .10,
      melVol: .115, bassVol: .195, arpVol: .045, drumVol: .105 },
    { bpm: 110, base: 72, wave: 'triangle', drum: 'k...h...k...s...', seed: 3303,
      bass: [0, 7, 0, 7, 12, 7, 0, 7], arp: [0, 1, 2, 3, 2, 1, 2, 1, 0, 1, 2, 3, 2, 3, 2, 1],
      prog: ['C Em F G C Am F G', 'F G Em Am Dm G C C'], rhy: [3, 0, 3, 2], rest: .16,
      melVol: .150, bassVol: .160, arpVol: .055, drumVol: .070 },
    { bpm: 132, base: 72, wave: 'square', drum: 'k.h.sh.k.h.sh.', seed: 4404,
      bass: [0, 0, 5, 0, 7, 0, 5, 0], arp: [0, 1, 2, 1, 2, 3, 2, 1, 0, 2, 1, 2, 3, 2, 1, 0],
      prog: ['Dm G C Am Dm Em Am G', 'F G Em Am Dm G Am Am'], rhy: [2, 1, 2, 4], rest: .12,
      melVol: .128, bassVol: .180, arpVol: .048, drumVol: .092 },
    { bpm: 152, base: 72, wave: 'square', drum: 'k.hhskhhk.hhskhh', seed: 5505,
      bass: [0, 12, 0, 12, 7, 0, 7, 0], arp: [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 3, 2, 1, 0, 1],
      prog: ['Am F C G Am F G Em', 'C G Am Em F C Dm G'], rhy: [4, 1, 4, 1], rest: .08,
      melVol: .118, bassVol: .190, arpVol: .052, drumVol: .110 },
    { bpm: 104, base: 72, wave: 'sine', drum: 'k.......h...s...', seed: 6606,
      bass: [0, 0, 7, 7, 5, 5, 7, 0], arp: [0, 2, 1, 0, 2, 1, 2, 3, 1, 0, 2, 1, 0, 2, 3, 2],
      prog: ['Em C G Dm Em Am F G', 'Am Em F C G Dm Em Em'], rhy: [3, 2, 3, 0], rest: .18,
      melVol: .155, bassVol: .165, arpVol: .058, drumVol: .062 },
    { bpm: 136, base: 72, wave: 'square', drum: 'k.h.s.h.k.hhshh.', seed: 7707,
      bass: [0, 7, 0, 7, 0, 12, 0, 7], arp: [0, 1, 2, 3, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 2, 3],
      prog: ['C G C F G C F G', 'Am Em F G C Am Dm G'], rhy: [5, 0, 5, 1], rest: .10,
      melVol: .125, bassVol: .185, arpVol: .046, drumVol: .098 },
    { bpm: 148, base: 72, wave: 'sawtooth', drum: 'k.hhsk.hhk.hhsk.hh', seed: 8808,
      bass: [0, 0, 3, 0, 0, 7, 3, 0], arp: [0, 1, 2, 1, 0, 2, 1, 0, 2, 1, 0, 1, 2, 1, 0, 2],
      prog: ['Am Em Dm Am F G Am Am', 'Dm Em Am Em F Em Dm Am'], rhy: [4, 2, 4, 5], rest: .09,
      melVol: .120, bassVol: .200, arpVol: .044, drumVol: .108 }
  ];
  const STAGE_ORDER = ['A', 'B', 'A', 'C', 'A', 'B', 'D', 'C', 'A', 'D'];
  STAGE_MUSIC.forEach(function (m, i) {
    const pA = m.prog[0].split(' '), pB = m.prog[1].split(' ');
    SONG_DEFS['stage' + (i + 1)] = {
      bpm: m.bpm, base: m.base, melWave: m.wave, melVol: m.melVol,
      bassVol: m.bassVol, arpVol: m.arpVol, drumVol: m.drumVol,
      bass: m.bass, arp: m.arp, drum: m.drum, order: STAGE_ORDER,
      phrases: {
        A: { chord: pA, mel: genMelBars(pA, m.seed + 1, m.rhy[0], m.rest) },
        B: { chord: pB, mel: genMelBars(pB, m.seed + 2, m.rhy[1], m.rest) },
        C: { chord: pA, mel: genMelBars(pA, m.seed + 3, m.rhy[2], m.rest) },
        D: { chord: pB, mel: genMelBars(pB, m.seed + 4, m.rhy[3], m.rest) }
      }
    };
  });

  function compileSong(name) {""",
    'insert auto-composer + 8 stage songs')

# ---------- 2) 依關卡挑曲的 helper ----------
rep("""  return { ensure: ensure, sfx: sfx, startBGM: startBGM, stopBGM: stopBGM, applyVolumes: applyVolumes,
    songSeconds: songSeconds, compileSong: compileSong };
})();""",
    """  return { ensure: ensure, sfx: sfx, startBGM: startBGM, stopBGM: stopBGM, applyVolumes: applyVolumes,
    songSeconds: songSeconds, compileSong: compileSong };
})();

// 每張地圖一首專屬曲（1～8 關各一首）；BOSS 連戰用專屬魔王曲
function stageBGM(stage) {
  if (Game && Game.bossRush) return 'boss';
  const st = Math.max(1, Math.min(8, stage || (Game && Game.stage) || 1));
  return 'stage' + st;
}
// 依主題挑曲（對戰隨機地圖時用）
function themeBGM(theme) {
  const i = THEMES.indexOf(theme);
  return 'stage' + (i >= 0 ? i + 1 : 1);
}""",
    'stageBGM helper')

# ---------- 3) 各呼叫點改成關卡專屬曲 ----------
rep("""  AudioSys.startBGM(stage === 8 ? 'boss' : 'battle');""",
    """  AudioSys.startBGM(stageBGM(stage));""", 'startSolo bgm')

rep("""            if (Game.bossRush) AudioSys.startBGM('menu');""",
    """            if (Game.bossRush) AudioSys.startBGM('menu');""", 'noop')

rep("""                AudioSys.startBGM(Game.stage === 8 ? 'boss' : 'battle');""",
    """                AudioSys.startBGM(stageBGM(Game.stage));""", 'respawn bgm')

rep("""    action: function () { beginCountdown('battle'); }
  });
  AudioSys.startBGM('battle');""",
    """    action: function () { beginCountdown('battle'); }
  });
  AudioSys.startBGM(stageBGM(Game.stage));""", 'startBattle bgm')

old = """AudioSys.startBGM(Game.mode === 'solo' && Game.stage === 8 ? 'boss' : 'battle');"""
assert s.count(old) == 3, 'DUP3: %d' % s.count(old)
s = s.replace(old, """AudioSys.startBGM(stageBGM(Game.stage));""")
n += 1
print('OK resume/settings bgm x3')

rep("""    updateHud();
    AudioSys.startBGM('battle');
    Net.pushState(true);""",
    """    updateHud();
    AudioSys.startBGM(stageBGM(Game.stage));
    Net.pushState(true);""", 'net host bgm')

rep("""    AudioSys.startBGM('battle');
    enterImmersive();""",
    """    AudioSys.startBGM(stageBGM(Game.stage));
    enterImmersive();""", 'net guest bgm')

# 對戰隨機地圖：把 Game.stage 對齊主題，音樂才會跟著地圖換
rep("""  const theme = THEMES[rand(7)];
  Game.theme = theme;""",
    """  const theme = THEMES[rand(7)];
  Game.theme = theme;
  Game.stage = THEMES.indexOf(theme) + 1;    // v1.7：讓 BGM 跟著這一張地圖走""", 'battle theme stage')

io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('patched', n, 'bytes', len(s.encode('utf-8')))
