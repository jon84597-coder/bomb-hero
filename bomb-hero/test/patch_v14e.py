# -*- coding: utf-8 -*-
import io, re
p = 'index.html'
s = io.open(p, encoding='utf-8').read()

i0 = s.index("  const SONG_DEFS = {")
i1 = s.index("  function compileSong(name) {")
old_defs = s[i0:i1]

new_defs = r"""  const SONG_DEFS = {
    // 主選單：輕快跳躍（炸彈超人風：方波主旋律 + 16 分音符琶音 + 簡單鼓組）
    menu: {
      bpm: 118, base: 72, melWave: 'square', melVol: .13, bassVol: .17, arpVol: .045, drumVol: .085,
      bass: [0, 0, 7, 0, 0, 12, 7, 0],
      arp: [0, 1, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1],
      drum: 'k.h.s.h.k.h.s.hh',
      order: ['A', 'B', 'A', 'C', 'A', 'B', 'D', 'C'],
      phrases: {
        A: {
          chord: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G'],
          mel: ['1:1 3:1 5:1 3:1 6:2 5:2 3:4 0:4', '5:1 7:1 2+:1 7:1 5:2 3:2 2:4 0:4',
                '6:1 5:1 3:1 5:1 6:2 1+:2 6:4 0:4', '4:2 6:2 1+:2 6:2 5:4 0:4',
                '1:1 3:1 5:1 1+:1 6:2 5:2 3:4 0:4', '2+:1 7:1 5:1 7:1 2+:2 5:2 7:4 0:4',
                '4:2 5:2 6:2 1+:2 4:4 0:4', '5:1 4:1 3:1 2:1 5:2 7:2 1:4 0:4']
        },
        B: {
          chord: ['Am', 'Em', 'F', 'C', 'Dm', 'G', 'C', 'G'],
          mel: ['6:1 6:1 5:1 6:1 1+:2 6:2 5:2 3:2 0:4', '5:1 5:1 3:1 5:1 7:2 5:2 3:2 2:2 0:4',
                '4:1 5:1 6:1 1+:1 6:2 5:2 3:4 0:4', '3:2 6:2 5:2 3:2 1:4 0:4',
                '2:1 4:1 6:1 4:1 2:2 4:2 6:2 2:2 0:4', '5:1 7:1 2+:1 7:1 5:2 7:2 2+:4 0:4',
                '3:2 4:2 5:2 6:2 1+:4 0:4', '5:2 4:2 2:2 5:2 7:4 0:4']
        },
        C: {
          chord: ['F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C'],
          mel: ['1+:2 6:2 5:2 6:2 4:4 0:4', '2+:2 7:2 5:2 7:2 2:4 0:4',
                '3:1 5:1 7:1 5:1 3:2 5:2 1+:4 0:4', '6:2 5:2 3:2 2:2 6:2 1+:2 0:4',
                '4:1 6:1 1+:1 6:1 4:2 6:2 5:2 4:2 0:4', '5:1 7:1 2+:1 7:1 5:2 7:2 2+:4 0:4',
                '3:2 5:2 6:2 5:2 1+:4 0:4', '1+:2 5:2 3:2 1:2 1:8']
        },
        D: {
          chord: ['Am', 'F', 'C', 'G', 'F', 'G', 'C', 'C'],
          mel: ['6:2 3:2 5:2 3:2 6:4 0:4', '4:1 6:1 5:1 4:1 3:2 2:2 3:4 0:4',
                '3:2 5:2 6:2 1+:2 6:4 0:4', '5:1 7:1 2:1 5:1 7:2 2+:2 5:4 0:4',
                '1+:2 6:2 4:2 6:2 3:4 0:4', '2:2 5:2 7:2 2+:2 5:4 0:4',
                '3:2 4:2 5:2 6:2 1+:4 0:4', '1+:2 5:2 3:2 1:2 1:8']
        }
      }
    },
    // 對戰：熱血推進（快 16 分音符琶音 + 四拍鼓）
    battle: {
      bpm: 144, base: 72, melWave: 'square', melVol: .12, bassVol: .18, arpVol: .05, drumVol: .10,
      bass: [0, 0, 12, 0, 0, 7, 12, 0],
      arp: [0, 1, 2, 3, 2, 1, 0, 1, 0, 1, 2, 3, 2, 3, 2, 1],
      drum: 'k.hhsk.hhk.hhsk.hh',
      order: ['A', 'B', 'A', 'C', 'A', 'B', 'D', 'C', 'A', 'B', 'D', 'C'],
      phrases: {
        A: {
          chord: ['Am', 'Am', 'F', 'G', 'Am', 'Am', 'F', 'G'],
          mel: ['6:1 6:1 5:1 6:1 1+:2 6:2 5:2 3:2 0:4', '6:1 6:1 5:1 3:1 2:2 3:2 2:4 0:4',
                '4:1 4:1 5:1 4:1 6:2 4:2 3:2 2:2 0:4', '5:1 5:1 7:1 5:1 2+:2 7:2 5:4 0:4',
                '6:1 1+:1 6:1 5:1 6:2 1+:2 6:4 0:4', '3:1 5:1 6:1 5:1 3:2 2:2 3:4 0:4',
                '4:1 6:1 5:1 4:1 6:2 1+:2 5:4 0:4', '5:1 7:1 2+:1 7:1 5:2 2+:2 5:4 0:4']
        },
        B: {
          chord: ['F', 'G', 'Em', 'Am', 'F', 'G', 'Am', 'Am'],
          mel: ['1+:2 6:2 5:2 6:2 4:2 6:2 0:4', '2+:2 7:2 5:2 7:2 2+:2 5:2 0:4',
                '3:1 5:1 7:1 5:1 3:2 2:2 1:2 2:2 0:4', '6:1 5:1 3:1 5:1 6:2 1+:2 6:4 0:4',
                '4:1 5:1 6:1 1+:1 6:2 5:2 4:2 3:2 0:4', '5:1 7:1 2+:1 7:1 5:2 4:2 2:2 0:2',
                '6:2 1+:2 5:2 6:2 1+:4 0:4', '6:1 5:1 6:1 1+:1 6:2 3:2 5:4 0:4']
        },
        C: {
          chord: ['Dm', 'Em', 'F', 'G', 'Am', 'F', 'G', 'Am'],
          mel: ['2:1 2:1 4:1 2:1 6:2 4:2 2:2 4:2 0:4', '3:1 3:1 5:1 3:1 7:2 5:2 3:2 5:2 0:4',
                '4:1 4:1 6:1 4:1 1+:2 6:2 5:2 4:2 0:4', '5:1 5:1 7:1 5:1 2+:2 7:2 5:2 7:2 0:4',
                '6:1 3:1 5:1 3:1 6:2 1+:2 6:2 5:2 0:4', '4:1 6:1 5:1 4:1 3:2 2:2 1:2 0:2',
                '5:2 7:2 5:2 2:2 5:4 0:4', '6:1 1+:1 6:1 3:1 6:2 3:2 6:4 0:4']
        },
        D: {
          chord: ['Am', 'G', 'F', 'Em', 'Dm', 'Em', 'F', 'G'],
          mel: ['6:1 5:1 3:1 2:1 3:2 5:2 3:4 0:4', '5:1 4:1 2:1 5:1 7:2 4:2 2:4 0:4',
                '4:1 5:1 6:1 1+:1 4:2 6:2 5:4 0:4', '3:1 5:1 3:1 2:1 3:2 2:2 1:4 0:4',
                '2:1 4:1 6:1 5:1 4:2 2:2 6:4 0:4', '3:1 5:1 7:1 5:1 3:2 5:2 7:4 0:4',
                '4:1 6:1 1+:1 6:1 5:2 4:2 3:4 0:4', '5:1 7:1 2+:1 7:1 5:2 7:2 2+:2 0:2']
        }
      }
    },
    // 魔王：緊張快板（半音推進感 + 密集小鼓）
    boss: {
      bpm: 152, base: 72, melWave: 'square', melVol: .12, bassVol: .19, arpVol: .05, drumVol: .115,
      bass: [0, 0, 7, 0, 12, 0, 7, 0],
      arp: [0, 1, 2, 3, 2, 1, 0, 1, 0, 1, 2, 3, 2, 3, 2, 1],
      drum: 'k.hhskhhk.hhskhh',
      order: ['A', 'B', 'A', 'C', 'A', 'D', 'B', 'C', 'A', 'B', 'D', 'C'],
      phrases: {
        A: {
          chord: ['Am', 'Em', 'F', 'G', 'Am', 'Em', 'F', 'Em'],
          mel: ['6:1 6:1 1+:1 6:1 5:2 3:2 5:4 0:4', '3:1 3:1 5:1 3:1 2:2 3:2 2:4 0:4',
                '4:1 4:1 6:1 4:1 5:2 4:2 3:2 2:2 0:4', '5:1 5:1 2+:1 5:1 7:2 5:2 2:2 5:2 0:4',
                '6:1 1+:1 6:1 5:1 6:2 1+:2 6:4 0:4', '3:1 5:1 7:1 5:1 3:2 5:2 3:4 0:4',
                '4:1 6:1 1+:1 6:1 5:2 4:2 3:4 0:4', '3:1 5:1 3:1 2:1 3:2 1:2 2:4 0:4']
        },
        B: {
          chord: ['F', 'G', 'Am', 'Am', 'Dm', 'Em', 'F', 'Em'],
          mel: ['1+:1 1+:1 6:1 5:1 4:2 5:2 6:4 0:4', '2+:1 2+:1 7:1 5:1 2+:2 7:2 5:4 0:4',
                '6:1 1+:1 6:1 5:1 3:2 5:2 6:2 1+:2 0:4', '6:1 5:1 6:1 1+:1 6:2 3:2 6:4 0:4',
                '2:1 4:1 6:1 4:1 2:2 4:2 6:2 2:2 0:4', '3:1 5:1 7:1 5:1 3:2 5:2 7:2 3:2 0:4',
                '4:1 6:1 5:1 4:1 3:2 2:2 3:4 0:4', '3:1 2:1 3:1 5:1 3:2 2:2 3:4 0:4']
        },
        C: {
          chord: ['Am', 'F', 'G', 'Em', 'Am', 'F', 'G', 'Am'],
          mel: ['6:1 3:1 5:1 3:1 6:2 1+:2 6:2 5:2 0:4', '4:1 6:1 5:1 6:1 4:2 6:2 4:4 0:4',
                '5:1 7:1 2+:1 7:1 5:2 7:2 5:4 0:4', '3:1 5:1 7:1 5:1 3:2 2:2 1:2 2:2 0:4',
                '6:1 1+:1 6:1 5:1 6:2 5:2 3:2 2:2 0:4', '4:1 5:1 6:1 1+:1 4:2 6:2 5:4 0:4',
                '2+:1 7:1 5:1 7:1 2+:2 5:2 2+:4 0:4', '6:1 3:1 5:1 3:1 6:2 3:2 6:4 0:4']
        },
        D: {
          chord: ['Am', 'Em', 'Dm', 'Em', 'F', 'G', 'Am', 'Am'],
          mel: ['6:1 5:1 3:1 2:1 3:2 2:2 3:2 1:2 0:4', '3:1 5:1 3:1 2:1 3:2 2:2 1:4 0:4',
                '2:1 4:1 6:1 4:1 2:2 4:2 2:2 6:2 0:4', '3:1 5:1 7:1 5:1 3:2 5:2 7:4 0:4',
                '1+:1 6:1 5:1 4:1 3:2 4:2 5:4 0:4', '5:1 7:1 2+:1 5:1 7:2 5:2 2+:4 0:4',
                '6:1 1+:1 6:1 5:1 6:2 1+:2 6:4 0:4', '6:1 3:1 6:1 1+:1 6:2 3:2 6:4 0:4']
        }
      }
    }
  };
"""
s = s[:i0] + new_defs + s[i1:]

# ---------- compileSong：加入琶音軌與鼓組 ----------
old_compile_start = s.index("  function compileSong(name) {")
old_compile_end = s.index("  // 一首曲子總長（秒）")
new_compile = r"""  function compileSong(name) {
    const def = SONG_DEFS[name] || SONG_DEFS.menu;
    const mel = [], bass = [], arp = [], drums = [];
    def.order.forEach(function (k) {
      const ph = def.phrases[k];
      for (let i = 0; i < ph.chord.length; i++) {
        ph.mel[i].trim().split(/\s+/).forEach(function (tok) {
          const p = tok.split(':');
          mel.push({ midi: degMidi(p[0], def.base), len: p[1] ? parseInt(p[1], 10) : 2 });
        });
        const tones = chordTones(ph.chord[i]);
        def.bass.forEach(function (v) {
          bass.push({ midi: v === null ? null : tones[0] + v, len: 2 });
        });
        def.arp.forEach(function (v) {
          // 0～2 = 和弦三音，3 起 = 高八度
          arp.push({ midi: v === null ? null : tones[v % 3] + (v >= 3 ? 24 : 12), len: 1 });
        });
      }
    });
    // 鼓組：把 16 步樣式平鋪到整首（每格 1 個 16 分音符）
    const pat = def.drum || '';
    const total = mel.reduce(function (n, x) { return n + x.len; }, 0);
    for (let i = 0; i < total; i++) {
      const ch = pat.charAt(i % pat.length);
      drums.push({ kind: ch === '.' ? null : ch, len: 1 });
    }
    return {
      bpm: def.bpm,
      drumVol: def.drumVol || .09,
      tracks: [
        { wave: def.melWave, vol: def.melVol, seq: mel },
        { wave: 'triangle', vol: def.bassVol, seq: bass },
        { wave: 'square', vol: def.arpVol, seq: arp }
      ],
      drums: drums
    };
  }
"""
s = s[:old_compile_start] + new_compile + s[old_compile_end:]

# ---------- startBGM：把鼓組接進排程 ----------
old = """    parsed = song.tracks.map(function (t) { return { wave: t.wave, vol: t.vol, seq: t.seq }; });"""
new = """    parsed = song.tracks.map(function (t) { return { wave: t.wave, vol: t.vol, seq: t.seq }; });
    if (song.drums && song.drums.length) {
      parsed.push({ wave: 'drum', vol: song.drumVol, seq: song.drums });
    }"""
assert old in s
s = s.replace(old, new, 1)

# ---------- 鼓音源 ----------
old = "  function schedule() {"
new = r"""  let noiseBuf = null;
  function drumHit(kind, t, vol) {
    if (!ctx) return;
    if (kind === 'k') {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(160, t);
      o.frequency.exponentialRampToValueAtTime(44, t + .11);
      g.gain.setValueAtTime(vol * 1.5, t);
      g.gain.exponentialRampToValueAtTime(.001, t + .17);
      o.connect(g); g.connect(musicGain);
      o.start(t); o.stop(t + .18);
      return;
    }
    if (!noiseBuf) {
      const n = Math.floor(ctx.sampleRate * .24);
      noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    const dur = kind === 's' ? .14 : .05;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = kind === 's' ? 'bandpass' : 'highpass';
    f.frequency.value = kind === 's' ? 1900 : 7600;
    f.Q.value = kind === 's' ? .9 : .7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol * (kind === 's' ? 1.15 : .7), t);
    g.gain.exponentialRampToValueAtTime(.001, t + dur);
    src.connect(f); f.connect(g); g.connect(musicGain);
    src.start(t);
    src.stop(t + dur + .02);
  }
  function schedule() {"""
assert old in s
s = s.replace(old, new, 1)

# ---------- schedule 裡處理鼓 ----------
old = """      if (note.midi !== null) {
        const dur = note.len * stepDur;"""
new = """      if (tr.wave === 'drum') {
        if (note.kind) drumHit(note.kind, Math.max(ctx.currentTime, earliest), tr.vol);
      } else if (note.midi !== null) {
        const dur = note.len * stepDur;"""
assert old in s
s = s.replace(old, new, 1)

io.open(p, 'w', encoding='utf-8').write(s)
print('ok')
