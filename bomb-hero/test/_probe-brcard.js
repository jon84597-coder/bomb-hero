/* v5.40 探針：大逃殺入口卡「切換地圖尺寸後，出發還按得動嗎？」
   用 realInner 模擬真瀏覽器（innerHTML 重畫後舊節點作廢）。 */
const SB = require('./_sandbox');

function click(el) {
  const arr = (el && el._on && el._on.click) || [];
  for (let i = 0; i < arr.length; i++) arr[i]({ stopPropagation() {} });
  return arr.length;
}

function segClick(ov, key, val) {
  return ov.onclick({
    target: { tagName: 'B', dataset: { v: String(val) }, parentNode: { getAttribute: () => key } },
    stopPropagation() {}
  });
}

const env = SB.makeEnv({ realInner: true });
const P = env.BH, G = env.G;

// ① 開卡
console.log('開卡前 BR.opt.map =', P.BR.opt.map);
const n1 = click(env.getId('btnBR'));
console.log('btnBR 監聽數 =', n1, '| #brGo 監聽數 =', ((env.getId('brGo')._on.click) || []).length);

// ② 切成小地圖
const ov = env.getId('brOv');
segClick(ov, 'map', 0);
console.log('切換後 BR.opt.map =', P.BR.opt.map, '| n =', P.BR.opt.n,
  '| #brGo 監聽數 =', ((env.getId('brGo')._on.click) || []).length);

// ③ 按出發
click(env.getId('brGo'));
console.log('按下出發 → Game.mode =', G.mode, '| cols/rows =', G.cols + '×' + G.rows,
  '| players =', G.players.length);
