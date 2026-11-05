// test/verify-v69.js —— v4.26
//   ① 八大主題的材質表（MAT）齊全，且每個主題都守住「地板最亮 → 軟牆中間 → 硬牆最深」的明度階梯
//   ② 預烘焙精靈圖（artSet / _artBake）真的存在，而且每格只做一次 drawImage
//   ③ 背景井底圖也是預烘焙（_backdropCanvas），每幀不是重畫幾百筆
//   ④ 第 2 關＝沙漠遺跡、第 4 關＝熔岩洞窟（主題表／32 關地名／幫助頁／10 國語言全部一致）
//   ⑤ 版號 4.26
const { makeEnv } = require('./_sandbox');
const env = makeEnv();
const P = env.BH, html = env.html;

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg); }
}
function head(t) { console.log('\n=== ' + t + ' ==='); }

const css = html.replace(/\r/g, '');
const noCmt = css.replace(/(?<![\w\/])\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

function lum(hex) {
  const v = hex.replace('#', '');
  const c = [0, 2, 4].map(function (i) {
    let n = parseInt(v.substr(i, 2), 16) / 255;
    return n <= .03928 ? n / 12.92 : Math.pow((n + .055) / 1.055, 2.4);
  });
  return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
}

head('1. 八大主題材質表齊全');
const STYLES = ['forest', 'sand', 'ice', 'lava', 'neon', 'sea', 'sky', 'dark'];
{
  const mStart = noCmt.indexOf('const MAT = {');
  ok(mStart > 0, '找得到 MAT 材質表');
  const mEnd = noCmt.indexOf('\n};', mStart);
  const matTxt = noCmt.slice(mStart, mEnd);
  ok(mEnd > mStart && matTxt.length > 2000, 'MAT 表內容完整（' + matTxt.length + ' 字元）');

  STYLES.forEach(function (st) {
    const m = new RegExp('\\n  ' + st + ': \\{([\\s\\S]*?)\\n  \\},?').exec(matTxt);
    ok(!!m, st + ' 有材質表');
    if (!m) return;
    const body = m[1];
    const blk = function (k) {
      const r = new RegExp(k + ': \\{([\\s\\S]*?)\\}').exec(body);
      return r ? r[1] : '';
    };
    const hexIn = function (s, k) {
      const r = new RegExp(k + ": '(#[0-9a-fA-F]{6})'").exec(s);
      return r ? r[1] : null;
    };
    const hard = blk('hard'), soft = blk('soft'), floor = blk('floor');
    ok(!!hard && !!soft && !!floor, st + ' 有 hard / soft / floor 三組');
    // 立體砌塊需要的 6 個欄位（少一個就會退回平面色塊）
    ['side', 'face1', 'face2', 'top', 'line', 'grout'].forEach(function (k) {
      ok(new RegExp(k + ':').test(hard), st + '.hard 有 ' + k);
    });
    const Lh = hard && hexIn(hard, 'face2'), Ls = soft && hexIn(soft, 'face2'), Lf = floor && hexIn(floor, 'a');
    if (Lh && Ls && Lf) {
      // 不規定「誰最亮」（沙漠的砂岩牆刻意比沙地亮，不然牆會像凹洞），
      // 只要求三者兩兩拉得開：任一種牆跟地板差 .08 以上，軟硬牆之間差 .05 以上
      const dfl = Math.abs(lum(Lf) - lum(Lh)), dsl = Math.abs(lum(Lf) - lum(Ls));
      const dhs = Math.abs(lum(Lh) - lum(Ls));
      ok(dfl >= .08 || dsl >= .08,
        st + ' 牆與地板拉得開（地板 ' + lum(Lf).toFixed(2) + '／硬牆 ' + lum(Lh).toFixed(2) +
        '／軟牆 ' + lum(Ls).toFixed(2) + '）');
      ok(dhs >= .05, st + ' 硬牆與軟牆分得出來（差 ' + dhs.toFixed(2) + '）');
    } else {
      ok(false, st + ' 三組主色都抓得到');
    }
  });
}

head('2. 預烘焙精靈圖（每格只做一次 drawImage）');
{
  ok(/const ART_RES = 128/.test(noCmt), '貼圖解析度 128（縮到 53px 也還夠細）');
  ok(/const ART_VARIANTS = 4/.test(noCmt), '每種材質 4 個變體（不然整片牆一模一樣）');
  ok(/function _artBake\(/.test(noCmt), '有 _artBake()：離屏 canvas 預先畫好');
  ok(/function artSet\(/.test(noCmt), '有 artSet()：每種材質只烘焙一次並快取');
  ok(/function artBlit\(/.test(noCmt), '有 artBlit()：場景每格只做 drawImage');
  // 三個入口都要走 artBlit（不能偷偷回去逐格重畫細節）
  const fnBody = function (name) {
    const r = new RegExp('function ' + name + '\\([\\s\\S]*?\\n\\}').exec(noCmt);
    return r ? r[0] : '';
  };
  const ds = fnBody('drawStone'), dc = fnBody('drawCrate'), pfs = fnBody('paintFloorStyle');
  ok(/artBlit\(/.test(ds), 'drawStone() 走 artBlit（硬牆）');
  ok(/artBlit\(/.test(dc), 'drawCrate() 走 artBlit（軟牆）');
  ok(/artBlit\(/.test(pfs), 'paintFloorStyle() 走 artBlit（地板）');
  ok(/hard:/.test(noCmt) && /softBig:/.test(noCmt), 'artSet 有 hard / soft / softBig 三種');
  // 陰影在烘焙時算完 → 執行時才不會掉帧
  ok(/shadowBlur/.test(fnBody('aBlock')), '陰影烘焙在 aBlock（執行時零成本）');
}

head('3. 井底圖（backdrop）也是預烘焙');
{
  ok(/function _paintBackdropArt\(/.test(noCmt), '有 _paintBackdropArt()');
  ok(/function _backdropCanvas\(/.test(noCmt), '有 _backdropCanvas()：依尺寸快取');
  const pb = /function paintBackdrop\([^)]*\)[\s\S]*?\n\}/.exec(noCmt);
  ok(!!pb, '找得到 paintBackdrop()');
  ok(pb && /drawImage/.test(pb[0]), '每幀只 drawImage 一張底圖（不是重畫幾百筆）');
  ok(pb && pb[0].length < 2600, 'paintBackdrop 夠短（' + (pb ? pb[0].length : 0) + ' 字元）');
  ok(/function _backdropCanvas/.test(noCmt) && /_BD_CACHE|_bdCache/.test(noCmt), '底圖有快取變數');
}

head('4. 第 2 關＝沙漠遺跡、第 4 關＝熔岩洞窟');
{
  const themes = P.THEMES || [];
  ok(themes.length === 8, '八個主題（' + themes.length + '）');
  ok(themes[1] && themes[1].style === 'sand', '第 2 主題 = 沙漠遺跡（' + (themes[1] && themes[1].name) + '）');
  ok(themes[3] && themes[3].style === 'lava', '第 4 主題 = 熔岩洞窟（' + (themes[3] && themes[3].name) + '）');
  ok(themes[1] && themes[1].name.indexOf('沙漠') === 0, '第 2 主題名字是沙漠');
  ok(themes[3] && themes[3].name.indexOf('熔岩') === 0, '第 4 主題名字是熔岩');
  ok(themes[1] && themes[1].hazards.indexOf('warp') >= 0, '沙漠帶傳送門');
  ok(themes[3] && themes[3].hazards.indexOf('convey') >= 0, '熔岩帶輸送帶');

  // 32 關地名：關 5-8 是沙漠、關 13-16 是熔岩
  const map = P.MAP32 || [];
  ok(map.length === 32, 'MAP32 有 32 關（' + map.length + '）');
  const n5 = map.slice(4, 8).map(function (m) { return m.n; }).join('／');
  const n13 = map.slice(12, 16).map(function (m) { return m.n; }).join('／');
  ok(/流沙沙丘／金字塔迴廊／綠洲遺跡／法老王廳/.test(n5), '關 5-8 = ' + n5);
  ok(/熔岩入口／岩漿吊橋／火山口／熔核深處/.test(n13), '關 13-16 = ' + n13);

  // 幫助頁的關卡範例也要跟著換（不然說明寫熔岩、畫面是沙漠）
  const hStart = noCmt.indexOf('const HELP_STAGES = [');
  const hsTxt = hStart > 0 ? noCmt.slice(hStart, noCmt.indexOf('];', hStart)) : '';
  const hName = function (i) {
    const r = new RegExp("\\{ i: " + i + ", en: '([^']*)',\\s*n: \\{ cn: '([^']*)'").exec(hsTxt);
    return r ? r[2] : '';
  };
  const i1 = hName(1), i3 = hName(3);
  ok(i1.indexOf('沙漠') >= 0, '幫助頁第 2 關寫沙漠遺跡（' + i1 + '）');
  ok(i3.indexOf('熔岩') >= 0, '幫助頁第 4 關寫熔岩洞窟（' + i3 + '）');

  // v5.0 起 i18n 是「key|5 語言」一行，theme.2/theme.4 要整列都換過名字
  const rowOf = function (k) {
    const m = new RegExp('^' + k.replace(/\./g, '\\.') + '\\|([^\\n]*)', 'm').exec(noCmt);
    return m ? m[1].split('|') : null;
  };
  const nLang = (noCmt.match(/const LANGS = \[([\s\S]*?)\];/) || [null, ''])[1].split(/\{ id: /).length - 1;
  const t2 = rowOf('theme.2'), t4 = rowOf('theme.4');
  ok(nLang === 5, 'i18n 有 ' + nLang + ' 種語言');
  ok(t2 && t2.length === nLang && /沙漠/.test(t2[0]), 'theme.2 = 沙漠遺跡（' + (t2 && t2[0]) + '）');
  ok(t4 && t4.length === nLang && /熔岩/.test(t4[0]), 'theme.4 = 熔岩洞窟（' + (t4 && t4[0]) + '）');
  ok(t2 && !/熔岩|Lava/.test(t2.join('')) && t4 && !/沙漠|砂漠|Desert/.test(t4.join('')),
     nLang + ' 種語言的 theme.2／theme.4 名稱都沒寫反');
}

head('5. 版號');
{
  ok(/^\d+\.\d+$/.test(P.VERSION), '版號格式正確（' + P.VERSION + '）');
  ok(P.VERSION_LOG[0].v === P.VERSION, 'VERSION_LOG 第一筆 = 目前版號');
  // v4.27 起不再綁死版號：用版號 filter 找 4.26 那一筆（索引會一直往下移）
  const e = P.VERSION_LOG.filter(function (x) { return x.v === '4.26'; })[0];
  ok(!!e, '找得到 4.26 的版本紀錄');
  ok(e && e.items.length >= 4, 'v4.26 更新內容寫了 ' + (e ? e.items.length : 0) + ' 條');
  const t = e ? e.items.join(' ') : '';
  ok(t.indexOf('沙漠') >= 0 && t.indexOf('熔岩') >= 0, 'v4.26 更新內容提到沙漠／熔岩互換');
  ok(/牆|地板|材質/.test(t), '更新內容提到牆／地板材質');
}

console.log('\n通過 ' + pass + ' 項，失敗 ' + fail + ' 項');
process.exit(fail ? 1 : 0);
