# 爆爆英雄 · 主角群美術聖經 v1
### BOMB HERO — HERO Art Bible v1 · 8 隻動物英雄（與小怪 v5 同源規格）

> 這份文件與 `STAGE1_ART_BIBLE.md` 共用同一套 **Style Lock**：光照參數、材質語彙、四段式 Prompt、
> 反陽春咒語、去背流程全部一致。差別只在「主角要可愛、要正能量、要能當品牌門面」，
> 所以額外鎖定一條：**每隻都要手持同一款圓形炸彈**（短引線＋橙色火花）＝ IP 統一符號。

---

## 0. 與小怪的分工

| | 小怪（v5） | 主角（v1） |
|---|---|---|
| 目的 | 辨識度 + 威脅感 | 親和力 + 品牌感 |
| 剪影 | 極端化（尖刺、長條、歪斜） | 圓潤但**互不重複** |
| 表情 | 凶／貪／呆 | 每隻一種人格（美／憨／跩／賤／甜／慫／萌／呆） |
| 共同元素 | 無 | **圓形炸彈**（8 隻都拿，姿勢各異） |
| 頭身比 | 1:1.2 ～ 1:2 | 1:1.1 ～ 1:1.7（不要超過 1:2） |

---

## 1. Style Lock（不可談判，與 v5 §1.1~1.4 完全相同）

```
主光：45° 左上方，暖白 5200K，100%
補光：右下方，冷色（角色主色的補色），25%
輪廓光：主光對側 135°，角色主色或暖橙，35%
AO：全接縫 30~40% 加深
```

必加咒語：
```
crisp readable silhouette, sculpted volume, hand-painted PBR, strong warm rim light from
upper-left backlight, soft ambient occlusion in every crevice, individual hairs catching the rim light
```

必加 Negative：
```
flat vector icon, sticker, emoji, mobile game icon, simple gradient, chibi logo mascot,
plastic toy, low-poly, blurry, text, logo, watermark, frame, ground plane, T-pose, symmetric,
extra limbs, extra fingers, deformed anatomy
```

---

## 2. 八隻總表

| # | id | 名稱 | 主色 | 剪影 | 材質主／副 | 動態 | 頭身比 |
|---|---|---|---|---|---|---|---|
| 01 | rabbit | 兔兔 BIBI | 淡藍 `#9ecbff` | C 直立・一耳直立一耳後折 | 短絨毛／針織羊毛＋皮革 | 蹬跳 | 1:1.45 |
| 02 | bear | 小熊 BOBO | 焦糖棕 `#c98d5a` | A 寬桶・短粗腿（最寬） | 厚層絨毛／帆布＋黃銅 | 穩步推進 | 1:1.1 |
| 03 | dog | 柴犬 KIKI | 琥珀橙 `#f5b971` | C 尖立耳＋捲尾壓背 | 雙層硬毛／磨舊棉布 | 衝刺 | 1:1.7 ⚠ |
| 04 | cat | 貓咪 NANA | 淡紫 `#b8aef0` | B 細長 S 形＋長尾配重 | 絲滑細毛／天鵝絨 | 潛行躡步 | 1:1.6 ⚠ |
| 05 | pig | 豬豬 MOMO | 泡泡糖粉 `#ffb3c7` | A 正圓・無頸 | 蠟光豬皮／絨面鼻 | 小碎步 | 1:1.15 |
| 06 | panda | 熊貓 ZUZU | 雪白／炭黑 | C 梨形・縮肩到耳根 | 厚密絨毛（黑白雙光反應） | 縮退 | 1:1.2 |
| 07 | frog | 青蛙 GUGU | 萊姆綠 `#7ee08a` | D 寬扁 1.4:1・頭頂凸眼 | 濕滑兩棲皮／SSS 喉囊 | 蹲跳 | 1:1.4 |
| 08 | chick | 小雞 DODO | 奶油黃 `#ffd95e` | A 小蛋團・三根呆毛 | 絨羽／啞光蛋殼 | 踉蹌碎步 | 1:1.35 |

⚠ = 已生成版本偏瘦長寫實（約 1:3），待重跑。

---

## 3. 逐隻 Prompt（可直接複製貼上）

### 3-1 兔兔 BIBI — 美貌的
```
Single character concept art for a stylized fantasy puzzle game. An adorable upright HERO RABBIT
adventurer named BIBI, egg-shaped chunky body, two very long ears, one standing tall and one
flopped back, soft powder-blue short fur with a cream-white muzzle and belly, rosy inner ears,
a chunky knit sky-blue scarf whipping to one side, big glossy dark-blue almond eyes with double
catchlights, small confident closed-mouth smile, one oversized hind foot planted, the other
lifted mid-step, hip cocked, one paw raised high lifting a classic round black cartoon bomb with
a short lit fuse and a bright orange spark. Small brown leather satchel strap crossing the chest.
Mid-stride confident hero pose, weight on the back leg, spine in a soft S-curve.
Materials: soft short fur with a fuzzy broken silhouette edge, knitted wool scarf with visible
fibers, glossy black bomb with a sharp specular, worn leather strap.
Stylized 2.5D semi-3D painterly render, sculpted volume, hand-painted PBR, strong warm rim light
from upper-left backlight, soft ambient occlusion under the chin and between limbs, individual
hairs catching the rim light, crisp readable silhouette, three-quarter front view, full body,
centered, isolated on transparent background, high detail game asset, no text, no logo, no frame,
no ground plane.
```

### 3-2 小熊 BOBO — 非常有特色的
```
Single character concept art for a stylized fantasy puzzle game. An adorable chunky HERO BEAR
adventurer named BOBO, very wide barrel-shaped body, short thick legs, broad rounded head with
small round ears, warm caramel-brown dense fur with a sand-colored muzzle and chest patch, a teal
canvas utility vest with brass buckles and two small pockets, big friendly eyes, mouth open in a
happy toothy grin, both arms hugging a huge round black cartoon bomb against his chest, the bomb's
lit fuse sparking orange, body leaning backward to counter the weight, knees bent, one foot
skidding. Heroic but clumsy weight-shift pose, asymmetric, spine curved backward.
Materials: thick plush layered fur with a broken fuzzy edge, matte canvas vest with frayed
stitching and dust in the weave, glossy black bomb with hard specular, aged brass.
Stylized 2.5D semi-3D painterly render, sculpted heavy volumes, hand-painted PBR, strong warm rim
light from upper-left backlight, soft ambient occlusion in fur creases and under the vest,
individual hairs catching the light, crisp readable silhouette, three-quarter front view, full
body, centered, isolated on transparent background, high detail game asset, no text, no logo, no
frame, no ground plane.
```
> 待修：胸腹出現寫實肌肉線條 → 負面字加 `defined pectoral muscles, bodybuilder anatomy`，
> 正面加 `a single smooth rounded body mass, no muscle definition`。

### 3-3 柴犬 KIKI — 有個性的
```
Single character concept art for a stylized fantasy puzzle game. An adorable HERO SHIBA DOG
adventurer named KIKI, compact chunky body with a broad chest, two sharp triangular pricked ears,
a thick curled tail curled over the back, warm amber-orange double-coat fur with a cream mask,
cheeks and belly, dark eyeliner markings, a cocky half-lidded smirk with one fang showing, a red
bandana tied at the neck, carrying a round black cartoon bomb sideways in his mouth by its short
lit fuse, the fuse sparking orange, one paw on the hip, the other pointing forward, chest puffed
out, weight on one leg. Confident swaggering mid-swagger pose, asymmetric, chest lead.
Materials: coarse double-layer fur with sharp strand grouping at the silhouette, worn red cotton
bandana with frayed hems, glossy black bomb with a crisp hard specular.
Stylized 2.5D semi-3D painterly render, sculpted volume, hand-painted PBR, strong warm rim light
from upper-left backlight, soft ambient occlusion under the bandana and between limbs, individual
hairs catching the rim light, crisp readable silhouette, three-quarter front view, full body,
centered, isolated on transparent background, high detail game asset, no text, no logo, no frame,
no ground plane.
```
> 待修（v1 偏 1:3 寫實）：`stubby short legs, oversized head, chibi proportions, head is 45% of total height`；
> Negative 加 `realistic dog anatomy, long legs, adult proportions, slender`。

### 3-4 貓咪 NANA — 賤賤的
```
Single character concept art for a stylized fantasy puzzle game. An adorable sly HERO CAT
adventurer named NANA, chunky rounded body, long slender tail curling in an S, big triangular ears
with pink inner fur, soft lilac-violet fur with a white chest and paws, faint darker tabby stripes
on the tail, one eye squinted and one eye wide open with a mischievous scheming grin, a small
dark-violet neckerchief, juggling two round black cartoon bombs, one held up in a raised paw, the
other hidden behind her back, lit fuses sparking orange, standing on tiptoe with the tail
counterbalancing. Sneaky playful mid-juggle pose, hip out, shoulders tilted.
Materials: silky fine fur with a sharp fuzz edge, velvet neckerchief, glossy black bombs with
crisp specular highlights and a hint of reflected purple bounce light.
Stylized 2.5D semi-3D painterly render, sculpted volume, hand-painted PBR, strong warm rim light
from upper-left backlight, soft ambient occlusion under the chin and in the tail base, fine hairs
catching the rim light, crisp readable silhouette, three-quarter front view, full body, centered,
isolated on transparent background, high detail game asset, no text, no logo, no frame, no ground
plane.
```
> 待修（v1 偏瘦長）：`big round head, chubby cheeks, plump body, short stubby legs`；
> Negative 加 `skinny, slender realistic cat, long thin legs`。

### 3-5 豬豬 MOMO — 非常可愛的
```
Single character concept art for a stylized fantasy puzzle game. An adorable round HERO PIG
adventurer named MOMO, a nearly spherical chubby body with tiny stub legs, a big round head fused
to the body, floppy triangular ears, soft bubblegum-pink skin with a slightly waxy sheen and a
lighter pink snout with two oval nostrils, a pale cream belly, small curly tail, huge sparkling
round eyes, a thrilled open-mouth smile, both stubby hands cupping a round black cartoon bomb on
top of her belly like a treasure, lit fuse sparking orange, a tiny sunflower tucked behind one ear,
leaning forward with knees together. Delighted hoarding pose, body tilted forward, weight low,
head tipped up. Materials: smooth waxy pig skin with soft broad specular and subtle pore texture,
velvety snout, glossy black bomb with a crisp hard highlight.
Stylized 2.5D semi-3D painterly render, sculpted soft volumes, hand-painted PBR, strong warm rim
light from upper-left backlight, soft ambient occlusion under the chin, belly folds and around the
bomb, crisp readable silhouette, three-quarter front view, full body, centered, isolated on
transparent background, high detail game asset, no text, no logo, no frame, no ground plane.
```

### 3-6 熊貓 ZUZU — 膽小的
```
Single character concept art for a stylized fantasy puzzle game. An adorable timid HERO PANDA
adventurer named ZUZU, a chunky pear-shaped body, big round head with small round ears, snowy
white plush fur with charcoal-black eye patches, ears, shoulders and stubby limbs, a single bamboo
leaf stuck on the head, huge watery worried eyes glancing sideways, mouth in a tiny nervous wavy
line, shoulders hunched up to the ears, both paws clutching a round black cartoon bomb in front of
the face like a shield, only the eyes and brows peeking over the top of the bomb, lit fuse
sparking orange, knees knocking together, leaning away. Shy flinching pose, weight on the back
foot, body curled into a defensive comma shape.
Materials: dense plush layered fur with a soft fuzzy broken edge, matte black fur absorbing light,
glossy black bomb with a crisp hard specular and warm bounce light on the underside.
Stylized 2.5D semi-3D painterly render, sculpted soft volumes, hand-painted PBR, strong warm rim
light from upper-left backlight, soft ambient occlusion under the chin, armpits and between the
toes, individual hairs catching the rim light, crisp readable silhouette, three-quarter front view,
full body, centered, isolated on transparent background, high detail game asset, no text, no logo,
no frame, no ground plane.
```

### 3-7 青蛙 GUGU — 獨特的
```
Single character concept art for a stylized fantasy puzzle game. An adorable wide HERO FROG
adventurer named GUGU, a squat wide body much wider than tall, two big bulging glossy eyes on top
of the head with amber irises and bright catchlights, a broad friendly grin with a tiny fang,
lime-green smooth amphibian skin with darker green blotches and a pale cream translucent throat sac
puffed out, orange webbed feet and hands, a round black cartoon bomb wedged in the corner of his
mouth, lit fuse sparking orange past his cheek, crouched low with both webbed hands planted on the
ground, hind legs folded in a Z, a small reed hat on his head. Coiled pre-hop pose, weight forward
on the hands, haunches loaded, eyes aimed up and to the side.
Materials: glossy wet amphibian skin with a waxy specular sheen, translucent glowing throat sac
with subsurface scattering, glossy black bomb with a crisp hard highlight.
Stylized 2.5D semi-3D painterly render, sculpted rounded volumes, hand-painted wet skin, strong
warm rim light from upper-left backlight, soft ambient occlusion in the folds and under the belly,
crisp appealing silhouette, three-quarter front view, full body, centered, isolated on transparent
background, high detail game asset, no text, no logo, no frame, no ground plane.
```

### 3-8 小雞 DODO — 特別的
```
Single character concept art for a stylized fantasy puzzle game. An adorable tiny HERO CHICK
adventurer named DODO, a small egg-shaped fluffy ball of a body, huge round head with three stray
cowlick feathers sticking up in different directions, tiny stub wings held out for balance, bright
butter-yellow downy fluff, big orange beak slightly open in a determined chirp, tiny orange feet,
a cracked white eggshell cap worn like a helmet with a small strap, balancing a round black cartoon
bomb on top of his head, the lit fuse sparking orange, leaning to one side to keep it steady, one
wing out, one leg lifted. Wobbling balancing pose, top-heavy, spine tilted, beak pointed up at the
bomb. Materials: soft downy chick fluff with a very fuzzy broken silhouette edge and individual
down barbs catching light, chalky matte eggshell cap with hairline cracks, glossy black bomb with a
crisp hard specular.
Stylized 2.5D semi-3D painterly render, sculpted soft volumes, hand-painted PBR, strong warm rim
light from upper-left backlight, soft ambient occlusion under the wings and where the bomb meets the
head, crisp readable silhouette, three-quarter front view, full body, centered, isolated on
transparent background, high detail game asset, no text, no logo, no frame, no ground plane.
```

---

## 4. 三軸差異矩陣（撞型檢查）

| # | 角色 | A 剪影 | B 材質（主） | C 動態 |
|---|---|---|---|---|
| 01 | 兔兔 BIBI | C 直立 1:1.45 長耳 | 短絨毛 / 羊毛 | 蹬跳 |
| 02 | 小熊 BOBO | A 寬桶 1:1.1 | 厚層絨毛 / 帆布 | 穩步推進 |
| 03 | 柴犬 KIKI | C 尖耳捲尾前傾 | 雙層硬毛 / 棉布 | 衝刺 |
| 04 | 貓咪 NANA | B 細長 S + 長尾 | 絲滑細毛 / 天鵝絨 | 潛行 |
| 05 | 豬豬 MOMO | A 正圓無頸 | 蠟光豬皮 / 絨面 | 小碎步 |
| 06 | 熊貓 ZUZU | C 梨形縮肩 | 厚密絨毛（黑白雙反應） | 縮退 |
| 07 | 青蛙 GUGU | D 寬扁 1.4:1 凸眼 | 濕滑皮 / SSS 喉囊 | 蹲跳 |
| 08 | 小雞 DODO | A 小蛋團 1:1.35 | 絨羽 / 蛋殼 | 踉蹌碎步 |

**結論**：剪影軸 OK（同為 A 的三隻用寬高比切開、同為 C 的三隻用耳朵與肩線切開）。
**唯一風險**：材質軸「絨毛」8 中 5 → 靠副材質（羊毛／帆布／棉布／天鵝絨／蛋殼）分流。
若同一畫面出現三隻以上，建議熊貓改「短絨＋硬毛混」、柴犬改「剛毛」。

---

## 5. 資產與管線

| 檔案 | 內容 |
|---|---|
| `heroes/01-rabbit.png` ～ `heroes/08-chick.png` | 8 隻 Hero，512×512 RGBA（腳底對齊 96%） |
| `heroes/_contact_heroes.png` | 8 隻並排對照 |
| `heroes/_raw/` | 1024 原檔（不進版控） |
| `build_heroes.py` | 去背 → 縮圖 → 底部對齊 → contact（改圖後重跑） |
| `build_heroes_preview.py` | 由 `heroes-preview.src.html` 生成內嵌圖的 `heroes-preview.html` |
| `heroes-preview.html` | 視覺化對照頁（含 128/64/40/26px 辨識度條） |

**接進遊戲的方式**（沿用 `drawRigChar()` 那條線）：
1. Hero 圖 → 縮 256（戰鬥）／128（選角卡）／48（HUD 頭像）
2. 若要做 8 向走動：走 `cut_final.py → split_parts.py → pack_parts.py`，部位對應
   `IMG_PARTS` 的 10 組（頭／軀幹／前後肢／尾／配件）
3. 短期最省的做法：單張 Hero + `GAIT` 程序化變形（小怪那套 `squash/hop/wave`），0 張新圖先上線

---

## 6. 已知問題（v1 待修）

| 項目 | 症狀 | 修法 |
|---|---|---|
| 柴犬 KIKI | 頭身比約 1:3，腿太長，偏成年犬寫實 | Prompt 加 `stubby short legs, oversized head, chibi proportions` |
| 貓咪 NANA | 身形瘦長，頭偏小 | 加 `chubby cheeks, plump body`，Negative 加 `skinny, slender` |
| 小熊 BOBO | 胸腹有寫實肌肉線條 | 加 `single smooth rounded body mass`，Negative 加 `muscle definition` |
| 色溫 | 補光色受主色影響（貓偏紫、雞偏冷） | 引擎內統一 tint 或後製 ColorMatch |
| 兔兔吻部 | 鼻樑略長偏寫實 | 若要更 Q：`short rounded muzzle, tiny button nose` |

---

# 附錄 v2（站立常態・拆件・動作・表情）

## A. v2 改動摘要
| 項目 | v1 | v2 |
|---|---|---|
| 姿勢 | 動作中帧（跳、抱彈、趴地） | **站立常態**：雙腳平踏、手臂自然下垂、面向鏡頭 |
| 道具 | 8 隻都手持炸彈 | **空手**（炸彈改成獨立道具層，否則拆件後手臂永遠黏著彈） |
| 頭身比 | 狗/貓約 1:3（偏成年） | 全部 **1:1.1 ~ 1:1.7** |
| 可愛度 | 半寫實繪本 | 加大眼睛、腮紅、圓潤體塊、無肌肉線條 |
| 拆分 | 無 | 頭／軀幹／左右腿（貓狗加尾巴）= 4~5 層 |

## B. 拆件規格（`split_heroes.py`）

切分線以「**內容 bbox 高度比例**」定義（不是畫布比例，因為每隻的留白不同）：

| id | neck（頭/身） | hip（身/腿） | 尾巴 |
|---|---|---|---|
| 01-rabbit | .55 | .81 | — |
| 02-bear | .43 | .80 | — |
| 03-dog | .45 | .82 | ✔ 右側 (.66~1.00, .28~.70) |
| 04-cat | .42 | .78 | ✔ 右側 (.70~1.00, .26~.82) |
| 05-pig | .48 | .84 | — |
| 06-panda | .45 | .82 | — |
| 07-frog | .38 | .72 | — |
| 08-chick | .50 | .82 | — |

三條硬規則：
1. **切線上下各留 16px 重疊**（`OVERLAP=16`）——轉頭、抬腿時重疊區互相遮住，不會露縫。
2. **出血 8px**（`bleed()`）：透明像素填上鄰近不透明色，縮放取樣時不會出現黑邊。
3. **pivot 在關節**：頭＝頸線中點、軀幹＝胯線中點、腿＝胯線左右各偏 11% 寬、尾巴＝尾根。

輸出 `heroes/layers/<id>/{head,torso,legL,legR,tail}.png` ＋ `_layers.json`（記每層 offset，前端按 offset 放回）。

## C. 狀態機（`heroes-playground.html`）

| 狀態 | 時長 | 動作 | 預設表情 |
|---|---|---|---|
| idle | 1.8s 循環 | 軀幹 sy 1±.022 呼吸、頭反向 -1.8px 微擺、尾巴慢擺 | 開心 |
| move | 1.1s 循環 | 整體彈跳 7px、左右腿交替抬 11px、軀幹 ±3° 側傾、頭滯後 2.5° | 開心 |
| attack | 0.64s | 0~30% 蓄力（後傾 -14°、下蹲 7% ）→ 30~55% 前衝（前傾 +22°、跳 8px）→ 收招 | 前段痛苦 → 後段開心 |
| hurt | 0.5s | 全身抖（62rad/s × 4.5px）＋後仰 -16°＋白閃 0.14s | 痛苦 |
| die | 0.95s | **癱軟**：壓扁 sy→0.66／sx→1.26＋變灰＋淡出 50%＋靈魂光點上飄 | 大哭 |

> ⚠️ **死亡不要用「整體旋轉倒地」**：pivot 在腳底時，身體會繞腳甩出去、看起來浮空。
> 用「壓扁 + 下塌 + 變灰」永遠貼地，Q 版遊戲幾乎都這樣做。

## D. 表情系統

**結論：不要「覆蓋原五官重繪」。** 自動偵測眼位對「鼻子很暗（豬）」「凸眼在頭頂（蛙）」「黑眼罩（熊貓）」都會誤判，
一旦覆蓋就會出現「兩對眼睛」。而且 8 隻的臉型差異太大，統一的眼型會破壞原設計。

本專案的做法＝**原臉不動 + 情緒符號**（位置容錯大，8 隻通用）：

| 表情 | 畫什麼 | 位置基準 |
|---|---|---|
| 開心 | 兩顆飄動星星、腮紅、眼睛加高光 | 眼睛外側 → 落在臉頰/頭側，偏 15px 也自然 |
| 痛苦 | 兩個大汗滴（下滑動畫）、紅色怒筋十字、頭頂白色痛擊爆點、臉部漲紅 16% | 額角／頭頂，容錯最大 |
| 大哭 | 兩條淚柱（從眼角往下流，長度呼吸）＋飛濺淚珠＋張口陰影 | 淚柱從眼角起，位置偏一點仍讀得出「在哭」 |

眼位座標存在 `heroes/_face.json`（`OVERIDE` 手動標定 8 隻；自動偵測只當 fallback）。
`eyeD` 是兩眼間距，所有符號尺寸都以它為基準（`r = eyeD * 0.30`），換角色不用改數字。

## E. 指令
```bash
python art/foes/build_heroes2.py            # 去背 → 512 → 腳底對齊 → contact
python art/foes/analyze_faces.py            # 眼位/嘴位/環帶色 → heroes/_face.json
python art/foes/split_heroes.py             # 拆件 → heroes/layers/ + _layers.json
python art/foes/build_heroes_preview.py     # 美術對照頁（heroes-preview.html）
python art/foes/build_heroes_playground.py  # 動作測試場（heroes-playground.html）
node   bomb-hero/test/shot-heroes-pg.js     # 自動截圖 5 狀態 + 3 表情
```

## F. 尚未做（下一版）
- 手臂沒有獨立成層（目前併在 torso 裡，靠整體 skew 擺動）；若要「揮拳」需要再切 armL/armR。
- 表情是符號化，若要做「真表情差分」，得每隻再生成 2 張（8×2=16 張）或走 image-to-image。
- 尚未接進 `index.html` 的 `drawRigChar()`；接法：Hero 512 → 256/128/48 三檔，動作沿用小怪的 GAIT 變形。

---

# 附錄 v3（面向・手臂分層・表情圖示化・誇大動作）

## A. 面向（`BASE_DIR`）

每隻原圖有一個**預設面向**，程式只記「原圖朝哪邊」；要面向另一側就是把整隻水平鏡像
（`ctx.scale(flip*k, k)`，pivot 在角色中心）。移動時 `h.face = sign(dx)`，靜止時保持最後方向。

| id | 角色 | 預設面向 | BASE_DIR |
|---|---|---|---|
| 01-rabbit | 兔兔 BIBI | 右 | **+1** |
| 02-bear | 小熊 BOBO | 左 | **-1** |
| 03-dog | 柴犬 KIKI | 右 | **+1** |
| 04-cat | 貓咪 NANA | 左 | **-1** |
| 05-pig | 豬豬 MOMO | 左 | **-1** |
| 06-panda | 熊貓 ZUZU | 右 | **+1** |
| 07-frog | 青蛙 GUGU | 偏正面、略偏左 | **-1** |
| 08-chick | 小雞 DODO | 左 | **-1** |

重點：**「角色空間」的 +x 永遠等於面朝方向**。所有姿勢數值（前衝 dx、身體前傾 rot、弧光位置）
都只寫正數，換方向時自動正確 —— 不需要為左右各寫一套動畫。

## B. 手臂分層（`split_arms.py`）

v2 只切到「頭／軀幹／腿」，手臂黏在軀幹裡 → 不論怎麼調參數都只有整體在動。
v3 從 `torso.png` 再切出 `armL / armR`，並輸出挖空的 `torsoB.png`：

- 切口框用**軀幹層矩形比例**定義（`ARMS` 表），每隻手的高度不同，不能共用一組數字。
- `SOCKET = 6px`：手臂圖層向內多含 6px 軀幹像素 → 手臂與軀幹**重疊 6px**，
  小幅旋轉（±35°）時肩關節不會露縫，靜止時與原圖逐像素相同。
- pivot＝**肩關節**（框上緣中心），存在 `_layers.json` 的 `pivots.armL/armR`。
- 熊貓兩手在胸前交握 → 切了會切到胸口，**這隻不做手臂分層**（`ARMS = None`）。

| id | 左臂框（x0,y0,x1,y1 比例） | 右臂框 |
|---|---|---|
| 01-rabbit | 0.00,0.42,0.20,0.96 | 0.80,0.42,1.00,0.96 |
| 02-bear | 0.00,0.18,0.23,0.80 | 0.77,0.18,1.00,0.80 |
| 03-dog | 0.00,0.40,0.20,0.94 | 0.80,0.40,1.00,0.94 |
| 04-cat | 0.00,0.30,0.17,0.78 | —（右側是尾巴） |
| 05-pig | 0.00,0.28,0.20,0.90 | 0.80,0.28,1.00,0.90 |
| 06-panda | — | — |
| 07-frog | 0.00,0.24,0.16,0.82 | 0.84,0.30,1.00,0.88 |
| 08-chick | 0.00,0.33,0.15,0.88 | 0.85,0.33,1.00,0.88 |

繪製順序：`tail → legL → legR → torsoB → armL → armR → head`。
（手臂一定要在 torsoB **之上**，否則 6px 重疊覆蓋不到軀幹邊緣）

## C. 狀態機 v3（幅度全部加大）

| 狀態 | 時長 | 動作（可量化） |
|---|---|---|
| idle | 1.8s | 軀幹 sy ±3.2%、頭 ±2.8px、手臂外張 ±0.10rad、尾巴擺 0.18 |
| move | 1.1s | **腿繞髖前後擺 ±0.46rad（±26°）＋抬腳 17px**、**手臂反向擺 ±0.55rad**、彈跳 11px、軀幹側傾 ±3.4° |
| attack | 0.92s | 0~34% 深蹲後仰（sy −14%、rot −0.22、雙手拉到 −0.95rad）→ 34~56% **前衝 38px**、rot +0.32、雙手 +1.15rad、新月弧光 → 56~100% 收招 |
| hurt | 0.56s | 退 7px ＋ 70rad/s 抖 6px、手臂上甩 0.70rad、白閃 0.14s |
| die | 1.1s | **癱軟**：軀幹 sy −44%／sx +34%、**腿 sy −40%**、頭下沉 10px、變灰淡出 50%、靈魂光點 |

> v2 的問題：腿只有 11px 抬腳、手臂完全沒動 → 看起來「只是整體在晃」。
> v3 把腿的旋轉幅度拉到 ±26°、手臂獨立成層反向擺，走路才讀得出來。

## D. 表情＝頭頂圖示 ＋ 身體特效（不畫在臉上）

使用者回饋：「哭的時候對不準」→ 根因是**眼位標定對豬鼻、青蛙凸眼、熊貓黑眼罩會偏**，
淚柱從眼角畫出去必然歪。v3 全部改成**符號化特效**，位置容錯大、8 隻通用：

| 表情 | 頭頂圖示（`emoteIcon`） | 身體特效（`drawVfx`） |
|---|---|---|
| 開心 | 黃色泡泡＋`^ ^` 彎眼＋大笑容＋腮紅 | **14 顆零星小亮光**繞身體慢慢轉＋閃爍 |
| 痛苦 | 紫色泡泡＋`＞＜` 閉眼＋波浪嘴＋汗滴，**左上三條汗線** | **紫色霧氣 7 縷往上飄** ＋ 身後紫色底光（α .44）＋臉部紫紅 20% |
| 大哭 | 藍色泡泡＋緊閉眼＋張嘴大哭＋兩行淚 | **頭兩側往外灑連續水條**（沿貝兹曲線密排 17 個圓）＋飛濺淚珠＋地面水花漣漪 |

圖示規格：半徑 `0.175 × size`（96px 角色 → 約 17px），彈出 0.24s（easeOut + 22% 回彈），
漂浮 `sin(t*3.6)*0.09r`，白色外框 1.16r 讓它在草地上一定看得見。
臉部只保留「腮紅／紫紅」這種**不依賴眼位**的著色（`drawFace`）。

## E. 指令
```bash
python art/foes/split_heroes.py            # 頭/軀幹/腿/尾
python art/foes/split_arms.py              # 手臂 armL/armR + torsoB（檢查圖 _armcheck.png）
python art/foes/build_heroes_playground.py # 內嵌 8 隻 × 7~8 層 → heroes-playground.html
node   bomb-hero/test/shot-heroes-pg.js    # 全場：idle/走左/走右/攻擊/受傷/死亡/三表情
node   bomb-hero/test/shot-hero-closeup.js 07-frog   # 單隻特寫（凍結時間逐帧）
```

## F. 尚未做
- 表情圖示目前是「同一組畫法 × 8 隻」，若要更貼角色性格（例如柴犬的圖示要有尖牙）可以再客製。
- 手臂只有肩關節 1 個 pivot，沒有肘關節；若要「揮拳」需要再切前臂。
- 尚未接進 `index.html` 的 `drawRigChar()`。

---

# 附錄 v4（坐騎與蛋：圖生圖 Style Lock）

> v4.87 的**鴕鳥神獸**第一版走鐘（水彩繪本感、平塗、黑底、右下角還帶 AI 浮水印），
> 原因是 Prompt 只寫「一隻帥氣的鴕鳥」—— 沒有鎖風格。這一節把「坐騎類」的做法固定下來，
> 之後任何新坐騎／新蛋都照這個流程，就不會再出現「風格跟其他美術不一樣」的問題。

## A. 兩條規則

1. **一律 image-to-image，不要純 text-to-image**
   參考圖用**已經在遊戲裡跑的美術**（同類別最接近的那張）：
   | 要生成的東西 | 參考圖 | `input_fidelity` |
   |---|---|---|
   | 坐騎 | `spr/mount-art-green.webp`（綠龍） | medium |
   | 蛋 | `spr/egg-art-egg.webp`（恐龍蛋） | high |

   → 參考圖本身就是「這個遊戲的長相」，模型會被拉回同一個渲染家族。

2. **Prompt 直接抄 §1 的咒語，不要自己改寫**
   「必加咒語」與「必加 Negative」**整段照貼**，再補「這次要畫什麼」。

## B. 坐騎 Prompt 範本（鴕鳥神獸，v4.87 實測一次過）

```
Repaint this creature as a completely different animal: a tall, proud STRIDING OSTRICH
(wind spirit mount) — same rendering style, same camera, same lighting, same level of
detail as the reference image.

MUST keep from reference: 2.5D semi-3D painterly render, hand-painted PBR materials,
top-left 45° warm white key light 5200K 100%, cool fill from lower-right 25%,
rim light from the opposite 135° side 35%, ambient occlusion 30-40% in every crevice,
crisp readable silhouette, isolated on pure transparent background, no ground shadow,
three-quarter front view facing right, full body head to toe.

Subject: long S-curved neck with layered cream feathers, compact feathered body,
two thick powerful legs with visible scaly texture, small head with bright amber eye,
soft violet-and-cream feather palette with a warm ochre saddle blanket and leather straps,
small wind-swirl motif on the saddle.

crisp readable silhouette, sculpted volume, hand-painted PBR, strong warm rim light from
upper-left backlight, soft ambient occlusion in every crevice, individual feathers catching the rim light

NEGATIVE: flat vector icon, sticker, emoji, mobile game icon, simple gradient, chibi logo mascot,
plastic toy, low-poly, blurry, text, logo, watermark, frame, ground plane, T-pose, symmetric,
extra limbs, extra fingers, deformed anatomy, watercolor, ink outline, paper texture,
children's book illustration, plain black background
```

蛋的版本只換主體描述（`same size, same silhouette, same painterly shell texture, but
deep violet shell with faint indigo marbling and a soft inner glow`），其餘照抄。

## C. 生圖回來一定要做的三件事

1. **去背**：回來的圖是**黑底 RGB**（不是真透明）。跑 `python art/mounts/make_ostrich.py`
   的 `cut_black()`：四邊泛洪吃 near-black（`BLACK_TOL = 56`）→ 只留最大前景連通塊
   （順手丟掉右下角的 AI 浮水印）→ `MaxFilter(3) + GaussianBlur(0.8)` 羽化 →
   **去黑前乘**（unpremultiply，否則縮圖邊緣會有一圈黑）→ bbox 裁切。
2. **尺寸對齊既有資產**：坐騎縮到高 **256px**（`mount-art-green` 同級）、
   蛋縮到 **160×160** 正方形（透明補邊）；`asp` 要記進 `MOUNT_ART`（`enemyArtR` 會除它）。
3. **目檢**：`art/mount/ostrich-cut.png` 打開看三件事 —— 腳邊沒有黑影碎屑、
   身體內部（眼珠／鞍布深色）沒被挖洞、喙與腿沒被吃掉。

## D. 落地檔案

| 產物 | 位置 | 說明 |
|---|---|---|
| 處理腳本 | `art/mounts/make_ostrich.py` | 去背＋裁切＋縮圖一條龍，可重跑（輸出雜湊一致） |
| 原始生圖 | `art/mounts/_raw/`、`art/eggs/_raw/` | 已被 .gitignore 忽略，保留是為了能重跑 |
| 切割中間檔 | `art/mounts/ostrich-cut.png`、`art/eggs/egg-purple-cut.png` | 去背後的 RGBA 全尺寸圖，方便目檢 |
| 遊戲用圖 | `spr/mount-art-ostrich.webp`(200×256)、`spr/egg-art-purple.webp`(160×160) | 三份副本都要同步 |

**新增任何 spr/ 檔都要同步 `spr/_list.json`**（離線預熱清單），
`test/verify-v479.js` 會數檔案數量，忘了加就會紅。

## E. 跑動循環（v4.88 實際做法，之後的新坐騎照抄）

使用者對「只有一張圖 + 上下抖」的評語是「像滑行」。要做到**翅膀拍動、兩腳交替**，
需要多張圖輪播，而且**三張必須共用同一塊畫布**，否則播放時會忽大忽小、腳底上下跳。

### 生圖：只改相位，不要重畫角色

對同一張已經定稿的坐騎圖做 image-to-image（`input_fidelity: high`），
prompt 開頭先把「不准變的東西」全部列死：

```
Same EXACT <animal> character as the reference image — identical body feathers,
identical wing feathers, identical saddle blanket with straps and buckle,
identical head, identical camera angle, identical painterly PBR rendering,
identical warm key light from upper-left with cool rim light.

Change ONLY the running phase. This is frame N of a run cycle: <翅膀相位>，<哪隻腳著地>，<另一隻腳怎麼擺>。

Keep the exact same scale, same foot contact height, same silhouette width as the reference.
Full body head to toe, three-quarter view facing <方向>.

NEGATIVE: different character, different colors, different saddle, text, logo,
watermark, frame, ground shadow, ground plane, watercolor, ink outline,
flat vector icon, sticker, emoji, chibi logo mascot, plastic toy, low-poly,
extra limbs, deformed anatomy, motion blur.
```

**兩幀要挑「左右腳互補」的組合**（A 幀左腳著地／右腳前抬，B 幀反過來），
這樣 1↔2 交替就是完整循環；站立幀（翅膀張開、最好看的那張）只在靜止時用。
本次三幀的分配：`0 = 站立`、`1 = 翅下壓＋左腳著地`、`2 = 翅高舉＋右腳著地`。

### 去背：白底比黑底難

黑底泛洪（`cut_black`）可以照用；**白底不行** —— 生圖的白底帶 210~250 的漸層與暗角，
固定門檻的泛洪從邊界根本進不去（會留下 45% 的假前景）。改用：

1. `L >= 238` → 背景；`L >= 150 且彩度 <= 14` → 落地灰影（一起當背景）
2. 取**最大連通塊**（丟浮水印、暗角碎塊）
3. **不要填洞**：眼睛高光那種小洞交給 `MaxFilter(3)` 補；翅膀與脖子之間的大空隙
   要留透明（填了會變成一塊白斑，v4.88 實測踩過）

### 對齊：用「鞍布」當錨點，不要用 bbox

每張圖的 bbox 差異很大（翅膀舉高那張會高出 30%），按 bbox 縮放會讓身體忽大忽小。
正確做法（`art/mounts/make_ostrich_frames.py`）：

| 軸 | 錨點 | 原因 |
|---|---|---|
| 縮放 | 鞍布的藍綠格紋 **bbox 高度**（三幀統一成同一個像素值） | 鞍布貼在身體上，比輪廓穩；翅膀張開不影響 |
| x | 鞍布中心 | 翅膀左右張開時身體不會左右漂 |
| y | **圖片底邊**（落地那隻腳） | 三幀踩同一條地面線，跑起來不上下跳 |

鞍布偵測（HSV 太慢，直接 RGB 判斷即可）：
`g > 105 && b > 95 && (g-r) > 35 && (b-r) > 18 && abs(g-b) < 55` → 再取最大連通塊。
找不到就 `SystemExit`，不要靜默用 bbox 頂替。

### 引擎端

- `MOUNT_ART[key]` 加 `frames: [null, "nav1.webp", "nav2.webp"]`（`null` = 就是 `u`，
  **不要重複寫同一個路徑字面**，`verify-v479` 會多計）＋ `run: [1, 2]` ＋ `bodyRatio`
- `bodyRatio = 角色本體高 / 畫布高`，`DH = T*1.86 / bodyRatio`，
  這樣「畫布變高（留舉翅空間）」不會讓角色在遊戲裡變大
- 播放節奏 `Math.floor(walkT * 9) % run.length`（9 張/秒）；離地用最後一幀
- 騎手位置要跟著改：`rideX / rideY` 用實機截圖目測校（鴕鳥鞍布在身體中央、比龍高很多）
