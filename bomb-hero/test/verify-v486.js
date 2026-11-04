// test/verify-v486.js —— v4.86：縮放 300%／手機捏合加速／遊戲中隨從控制台
//   ① 使用者要「放大可以到 300%」（原本 210% 就頂到）
//   ② 手機雙指縮放太慢 —— 手勢 1:1 對應倍率，張不開手就得放開重捏
//   ③ 隨從只能在商店決定，遊戲中沒辦法換人 → 加 HUD 的 🐾 清單（叫出／收回）
const { makeEnv } = require('./_sandbox');

const env = makeEnv();
const src = env.html;
const BH = env.BH;
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ FAIL: ' + m); } }
function head(t) { console.log('\n=== ' + t + ' ==='); }

// ─────────────────────────────────────────────────────────────
head('① 縮放上限 300%');

ok(/const ZOOM_MIN = \.42, ZOOM_MAX = 3\.00, ZOOM_STEP = \.18/.test(src),
  'ZOOM_MAX 改成 3.00（原 2.10）');
ok(BH.Zoom.max === 3, 'Zoom.max 對外公布 3（實際 ' + BH.Zoom.max + '）');
ok(BH.Zoom.step === .18, '每次縮放級距 .14 → .18');

BH.Zoom.set(9);
ok(BH.Zoom.set(9) === 3, '設 900% 會被夾到 300%');
BH.Zoom.set(2.55);
ok(BH.Zoom.set(2.55) === 2.55, '250% 這種中間值不會被誤夾');
BH.Zoom.set(.1);
ok(BH.Zoom.set(.1) === .42, '縮小下限仍然是 42%（沒被改壞）');
ok(Math.abs(BH.Zoom.set(3) - 3) < 1e-9, '剛好 300% 可以停住');
BH.Zoom.reset();
ok(env.G.zoomTarget === 1, 'reset() 回到 100%');

head('② 手機捏合速度');

ok(/const PINCH_GAIN = 1\.75/.test(src), '新增 PINCH_GAIN 常數（1.75）');
ok(/Math\.pow\(d \/ pinchD, PINCH_GAIN\)/.test(src), '捏合比取 1.75 次方，同樣手勢有更大變化');
ok(!/set\(pinchBase \* \(d \/ pinchD\)\)/.test(src), '舊的 1:1 映射已經移除');
// 1.75 次方要「放大變快、縮小也變快」：比例 1.2 → 1.38；比例 0.8 → 0.68
const g = function (r) { return Math.pow(r, 1.75); };
ok(g(1.2) > 1.3 && g(1.2) < 1.45, '手指張 20% → 畫面放大約 38%（原本只有 20%）');
ok(g(.8) < .72, '手指收 20% → 畫面縮小約 32%，兩個方向都變快');

head('③ 遊戲中隨從控制台');

ok(!!BH.PetPanel, '__BH 匯出 PetPanel');
ok(['summon', 'recall', 'toggle', 'available', 'outCount', 'allOut', 'allIn']
  .every(function (k) { return typeof BH.PetPanel[k] === 'function'; }),
  '對外接口齊全（叫出／收回／切換／全部）');
ok(/id="petPanel"/.test(src) && /id="petList"/.test(src) && /id="petAllOut"/.test(src) && /id="petAllIn"/.test(src),
  '面板 DOM 存在（清單＋全部叫出／全部召回）');
ok(/id="petBk"/.test(src) && /id="petClose"/.test(src), '有遮罩與關閉鍵，點外面也關得掉');
ok(/html \+= '<button class="chip petchip" id="petBtn"/.test(src), 'HUD 會產生 🐾 按鈕');
ok(/PetPanel\.available\(\)/.test(src), '沒有隨從／不是單人或 RPG 就不顯示按鈕');
ok(/\$id\('petBtn'\) && \$id\('petBtn'\)\.addEventListener\('click', function \(\) \{ PetPanel\.open\(\); \}\)/.test(src),
  '🐾 按鈕有綁 click（不是只有 id 沒有行為）');
ok(/id="petTouchBtn"/.test(src), '手機另外有一顆浮動 🐾（不佔 HUD 兩排額度）');
const petCss = (/#touchUI \.tpet \{([\s\S]*?)\}/.exec(src) || [])[1] || '';
ok(/right:\s*16px/.test(petCss) && /top:\s*116px/.test(petCss), '手機 🐾 排在 ⏸／⛶ 下面，不會疊到');
ok(/--tb-face:/.test(petCss), 'v4.87：🐾 按鈕有不透明底盤，不會被場景顏色吃掉');
ok(/body\.touch \.chip\.petchip \{ display: none; \}/.test(src), '手機隱藏 HUD 那顆，避免 HUD 變第三排');
ok(/petBtn2\.classList\.toggle\('on', PetPanel\.available\(\)\)/.test(src), '每帧同步手機 🐾 的顯示狀態');

// —— 行為：用真的 Game 狀態跑一次 ——
env.G.mode = 'solo';
env.G.state = 'playing';
env.G.T = 40;
env.G.stage = 1;
env.G.players = [{ x: 200, y: 200, chIdx: 0, dino: false, carry: null }];
env.G.pets = [];
env.BH.Shop.setState({ pets: [{ kind: 'blade', ch: 1 }, { kind: 'guard', ch: 2 }] });

ok(env.BH.PetPanel.owned().length === 2, '清單＝商店已雇用的 2 隻');
ok(env.BH.PetPanel.available() === true, '單人進行中 → 按鈕可用');
ok(env.BH.PetPanel.outCount() === 0, '一開始 0 隻出場（Game.pets 空）');

ok(env.BH.PetPanel.summon('blade') === true, '叫出刀客隨從');
ok(env.G.pets.length === 1 && env.G.pets[0].kind === 'blade', 'Game.pets 真的多一隻 blade');
ok(env.G.pets[0].__pet === true && env.G.pets[0].hp > 0, '是正常的隨從物件（有 __pet／hp）');
ok(env.BH.PetPanel.summon('blade') === false, '同一隻不能重複叫出');
ok(env.G.pets.length === 1, '重複叫出後數量仍然是 1');
ok(env.BH.PetPanel.summon('bomber') === false, '沒雇用的不能叫（不會白生一隻）');
ok(env.BH.PetPanel.outCount() === 1, '出場數回報 1');

ok(env.BH.PetPanel.recall('blade') === true, '收回刀客隨從');
ok(env.G.pets.length === 0, '收回後 Game.pets 清空（不是打倒，是移除）');
ok(env.BH.PetPanel.recall('blade') === false, '不在場上時收回回 false');

ok(env.BH.PetPanel.toggle('guard') === true && env.G.pets.length === 1, 'toggle 一次＝叫出');
ok(env.BH.PetPanel.toggle('guard') === true && env.G.pets.length === 0, 'toggle 再一次＝收回');

env.BH.PetPanel.allOut();
ok(env.G.pets.length === 2, '全部叫出 → 兩隻都在場');
env.BH.PetPanel.allIn();
ok(env.G.pets.length === 0, '全部召回 → 清空');

env.G.mode = 'battle';
ok(env.BH.PetPanel.available() === false, '對戰模式不顯示隨從按鈕（本來就沒有隨從）');
env.G.mode = 'solo';

head('④ 多語系');

const keys = ['pet.title', 'pet.sub', 'pet.call', 'pet.back', 'pet.out', 'pet.idle',
  'pet.down', 'pet.none', 'pet.allOut', 'pet.allIn'];
keys.forEach(function (k) {
  const re = new RegExp('^' + k.replace(/\./g, '\\.') + '\\|', 'm');
  const line = (src.match(new RegExp('^' + k.replace(/\./g, '\\.') + '\\|.*$', 'm')) || [''])[0];
  const cols = line ? line.split('|').length : 0;
  ok(re.test(src) && cols === 11, k + ' 有 10 種語言（實際 ' + cols + ' 欄）');
});

console.log('\n========================================');
console.log('v4.86 縮放 300%／隨從控制台：' + pass + ' 通過 / ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
