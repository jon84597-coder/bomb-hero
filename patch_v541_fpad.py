import io, os, sys

P = 'bomb-hero/index.html'
s = io.open(P, encoding='utf-8', newline='').read()
orig = len(s)

def sub(a, b, n=1):
    global s
    assert s.count(a) == n, ('anchor count %d != %d' % (s.count(a), n)) + ' :: ' + a[:70]
    s = s.replace(a, b, n)

# ---------- 1. CSS ----------
css_anchor = '''#touchUI .tslide.right { left: auto; right: 0; }
body.touch.slidepad #touchUI .tslide { display: block; }'''
css_new = css_anchor + '''
/* v5.41：浮動虛擬搖桿 —— 手指按在左半屏哪裡，圓盤就出現在那裡（360° 全向） */
#touchUI .fpad {
display: none; position: absolute; left: 0; top: 0;
width: 152px; height: 152px; margin: -76px 0 0 -76px;
border-radius: 50%; pointer-events: none; z-index: 2; opacity: 0;
transform: scale(.86); transition: opacity .12s ease-out, transform .12s ease-out;
background: radial-gradient(circle at 50% 42%, rgba(56,86,148,.34), rgba(10,16,30,.56) 72%);
border: 2px solid rgba(150,190,255,.34);
box-shadow: inset 0 4px 16px rgba(0,0,0,.44), 0 10px 24px -14px rgba(0,0,0,.85);
will-change: opacity, transform;
}
body.touch.slidepad #touchUI .fpad { display: block; }
#touchUI .fpad.on { opacity: 1; transform: scale(1); }
#touchUI .fpad .fring {
position: absolute; inset: 21px; border-radius: 50%;
border: 1px dashed rgba(150,190,255,.20);
}
#touchUI .fpad .fknob {
position: absolute; left: 50%; top: 50%; width: 62px; height: 62px; margin: -31px 0 0 -31px;
border-radius: 50%;
background: radial-gradient(circle at 40% 32%, rgba(228,242,255,.98), rgba(126,166,226,.88) 52%, rgba(56,84,142,.92));
border: 2px solid rgba(228,242,255,.82);
box-shadow: 0 7px 15px -6px rgba(0,0,0,.7), inset 0 -5px 12px rgba(0,0,0,.26), inset 0 4px 8px rgba(255,255,255,.5);
will-change: transform;
}
#touchUI .fpad .fknob::after {
content: ''; position: absolute; left: 50%; top: 50%; width: 16px; height: 16px;
margin: -8px 0 0 -8px; border-radius: 50%;
background: rgba(30,52,90,.40); box-shadow: inset 0 2px 4px rgba(0,0,0,.34);
}'''
sub(css_anchor, css_new)

# ---------- 2. DOM ----------
dom_anchor = '''          <div class="tslide" id="slideZone"></div>'''
dom_new = dom_anchor + '''
          <div class="fpad" id="fpad"><div class="fring"></div><div class="fknob" id="fknob"></div></div>'''
sub(dom_anchor, dom_new)

# ---------- 3. JS：視覺層 ----------
js_anchor = '''  const zone = $id('slideZone');                 // v4.2：模式 A 的隱形滑動區'''
js_new = js_anchor + '''
  // v5.41：浮動虛擬搖桿視覺層（按哪出現哪；手指拖多遠，小球就在大圓裡走多遠）
  const fpadEl = $id('fpad'), fknobEl = $id('fknob');
  const FP_KNB = 44;                              // 小球最大位移（外圈半徑 76 − 小球半徑 31）
  function fpadShow(e) {
    if (!fpadEl || padMode() !== 'slide') return;
    const r = ui.getBoundingClientRect();
    fpadEl.style.left = (e.clientX - r.left) + 'px';
    fpadEl.style.top = (e.clientY - r.top) + 'px';
    fpadEl.classList.add('on');
    fpadEl.dataset.on = '1';
    if (fknobEl) fknobEl.style.transform = 'translate(0px,0px)';
  }
  function fpadMove(dx, dy, len) {
    if (!fpadEl || !fknobEl || fpadEl.dataset.on !== '1') return;
    const m = Math.min(1, len / 110) * FP_KNB;    // 拖 110px 就拉滿，視覺細膩但不遲鈍
    fknobEl.style.transform = 'translate(' + (dx / len * m).toFixed(1) + 'px,' + (dy / len * m).toFixed(1) + 'px)';
  }
  function fpadHide() {
    if (!fpadEl) return;
    fpadEl.classList.remove('on');
    fpadEl.dataset.on = '0';
    if (fknobEl) fknobEl.style.transform = 'translate(0px,0px)';
  }'''
sub(js_anchor, js_new)

# releaseAll 歸零時一起收起來
rel_anchor = '''      Input.setTouchAxis(0, 0);
      if (pad && knob) {
        pad.classList.remove('on'); pad.classList.add('idle');
        knob.style.transform = 'translate(0px,0px)';
      }'''
rel_new = '''      Input.setTouchAxis(0, 0);
      fpadHide();
      if (pad && knob) {
        pad.classList.remove('on'); pad.classList.add('idle');
        knob.style.transform = 'translate(0px,0px)';
      }'''
sub(rel_anchor, rel_new)

# zoneMove：同步小球
mv_anchor = '''      zone.dataset.ax = on ? (dx / len).toFixed(3) : '0';
      zone.dataset.ay = on ? (dy / len).toFixed(3) : '0';
    }'''
mv_new = '''      zone.dataset.ax = on ? (dx / len).toFixed(3) : '0';
      zone.dataset.ay = on ? (dy / len).toFixed(3) : '0';
      fpadMove(dx, dy, len);
    }'''
sub(mv_anchor, mv_new)

# zone pointerdown：就地把圓盤搬到按壓點
zd_anchor = '''      Input.setTouchAxis(0, 0);
      zone.dataset.on = '1';
    });'''
zd_new = '''      Input.setTouchAxis(0, 0);
      zone.dataset.on = '1';
      fpadShow(e);
    });'''
sub(zd_anchor, zd_new)

# zoneUp：收起來
zu_anchor = '''      zone.dataset.ax = '0'; zone.dataset.ay = '0';
      Input.setTouchAxis(0, 0);
    }'''
zu_new = '''      zone.dataset.ax = '0'; zone.dataset.ay = '0';
      Input.setTouchAxis(0, 0);
      fpadHide();
    }'''
sub(zu_anchor, zu_new)

# ---------- 4. 切模式時收起來 ----------
ap_anchor = '''  // 換模式／換位置時把軸向歸零，避免手指還按著卻停在舊方向
  try { Input.setTouchAxis(0, 0); } catch (e) {}'''
ap_new = '''  // 換模式／換位置時把軸向歸零，避免手指還按著卻停在舊方向
  try { Input.setTouchAxis(0, 0); } catch (e) {}
  const fpx = $id('fpad');
  if (fpx && fpx.classList) { fpx.classList.remove('on'); fpx.dataset.on = '0'; }'''
sub(ap_anchor, ap_new)

# ---------- 5. 版本 ----------
sub("const VERSION = '5.40';", "const VERSION = '5.41';")
sub('<span id="verTxt">5.40</span>', '<span id="verTxt">5.41</span>')
sub('<span id="verLogVer">5.40</span>', '<span id="verLogVer">5.41</span>')

tmp = P + '.tmp'
with io.open(tmp, 'w', encoding='utf-8', newline='\n') as f:
    f.write(s)
os.replace(tmp, P)

print('chars', orig, '->', len(s), 'delta', len(s) - orig, 'budget left', 1950000 - len(s))
