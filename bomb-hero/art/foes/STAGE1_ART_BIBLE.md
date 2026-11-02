# 爆爆英雄 · 小怪美術聖經 v5
### BOMB HERO — Foe Art Bible v5 · Stage 1「綠野草原」完整設定 + 48 隻總檢討

> 這份文件的目的：把 v4.27 的「程式化色塊小怪」升級成 **精緻美式奇幻 RPG** 等級的角色資產。
> 所有 Prompt 都是可直接複製貼上的完整句，不需要你再補字。

---

## 0. 先診斷：陽春感是怎麼來的

v4.27 為了在單檔 HTML 裡塞進 48 隻怪，用了「15 種身體原型 + 參數」即時繪製。
**這在工程上是對的**（檔案不爆、手機不掉帧），但視覺上有三個致命傷：

| 病症 | 具體表現 | 玩家看到的 |
|---|---|---|
| **剪影同構** | 同原型只用半徑/顏色區分（史萊姆 14px、雪球怪 15px、熔岩史萊姆 15px） | 「三顆換色的圓球」 |
| **材質單一** | 只有「底色漸層 + 一圈亮邊」，沒有粗糙度、裂紋、次表面、金屬反射 | 塑膠感、貼紙感 |
| **靜止姿勢** | 一律正面站立、對稱、重量平均 | 大頭貼、圖示（Icon） |

**結論：不是「畫得不夠多」，是「三軸沒有分流」。**

---

## 1. 風格鎖定 Style Lock（五條不可談判）

### 1.1 造型語言
- **大形狀優先**：1 秒內只看剪影就能認出是哪一隻。做法是給每隻怪一個「剪影簽名」——用**寬高比 + 主軸方向 + 一個突出特徵**描述。
  - 例：史萊姆 `W:H = 1.35:1，橫向壓扁，右下角一滴垂墜`
  - 例：毛毛蟲 `W:H = 1:0.85，S 形縱向，頭節上抬 30°`
- **比例誇張**：頭身比 1:1.2 ～ 1:2（不要 1:5 寫實比例），四肢末端加大（大腳掌、大爪、大拳），這是「奇幻卡漫」的核心。
- **禁止對稱呆站**：預設姿勢必須是動作的中間帧（蓄力／撲擊／揮擊／張嘴），重心落在單腳，脊椎呈 C 或 S 曲線。

### 1.2 體積與光影（立體感的來源）
每一隻都必須讀得出三個面：
1. **受光面**（亮，帶環境色偏移）
2. **暗面**（不是變黑，是降飽和 + 偏冷）
3. **反射光 / 次表面**（暗面底部或背光邊緣透出的暖色或怪物本色）

再加兩層：
4. **Rim Light（輪廓光）**：主光對側的細亮邊，強度約主光的 35%，用來把角色從背景「拔出來」。
5. **AO（環境遮蔽）**：所有接縫、腋下、腹底、殼縫加深，這是「厚度感」的最大關鍵。

> ❌ 只有「底色 + 白色高光」= 圖示
> ✅ 三階明暗 + AO + 輪廓光 + 色彩溢出 = 立體公仔

### 1.3 材質光學（每隻指定 1 主 + 1 副）
寫 Prompt 時**不要只寫顏色**，要寫「光學行為」。本專案統一字彙表：

| 材質 | Prompt 關鍵詞 | 用在哪 |
|---|---|---|
| 黏液／凝膠 | `translucent gel, subsurface scattering, glossy wet specular, internal glow, refracted background` | 史萊姆、水母 |
| 絨毛 | `soft short fur, fuzzy broken silhouette edge, individual hairs catching rim light` | 蹦蹦兔、毛毛蟲 |
| 濕皮 | `glossy wet amphibian skin, waxy specular sheen, mottled blotches` | 小青蛙、蜥蜴 |
| 天鵝絨 | `matte velvet pile, light-absorbing, soft falloff, glowing spots` | 毒菇怪 |
| 幾丁質 | `iridescent chitin, thin-film interference shifting blue-violet-green, dense pitting, sharp specular` | 鐵甲蟲、蠍子 |
| 岩石 | `layered slate, chipped edges, moss in the cracks, glowing magma veins` | 岩石小怪 |
| 金屬 | `brushed steel with rust pitting, anisotropic highlight along the grain` | 機器人、近衛軍 |
| 羽毛 | `layered feather cards, barb detail, oil-slick sheen` | 疾風鷹 |
| 膜翼 | `translucent leathery membrane, visible veins, backlit amber` | 蝙蝠 |
| 骸骨 | `aged bone, porous surface, hairline cracks, cold ivory` | 骷髏兵 |
| 布料／繃帶 | `ragged linen strips, frayed threads, dust in the weave` | 木乃伊 |

### 1.4 光線規範（全 48 隻統一，才會有「同一款遊戲」的感覺）
```
主光：45° 左上方，暖白 (色溫 5200K)，強度 100%
補光：右下方，冷色 (環境色)，強度 25%
輪廓光：主光對側 135°，怪物主色或暖橙，強度 35%
AO：全接縫 30~40% 加深
```

### 1.5 三軸差異法（判斷「是否換色重貼」的硬規則）
每隻怪用三個軸描述：

- **軸 A｜剪影**（寬高比、主軸、突出特徵）
- **軸 B｜材質**（主材質 + 光學行為）
- **軸 C｜動態**（移動方式：爬／跳／飛／滾／飄／鑽地）

> **規則：48 隻裡任兩隻，最多只能共用 1 個軸。**
> 共用 2 軸以上 → 玩家會覺得是同一隻換色，必須重新設計。

用這條規則掃 v4.27 的名單，抓到 **7 組高風險**（見 §3）。

---

## 2. 交付規格（技術）

| 項目 | 規格 |
|---|---|
| 生成尺寸 | 1024×1024（單隻）／1536×1024（拆件表） |
| 交付尺寸 | **512×512**（`stage1/`，進版控）／1024 原檔在 `stage1/_raw/`（不進版控） |
| 交付格式 | PNG RGBA（真透明，非棋盤格） |
| 遊戲內尺寸 | 256×256（戰鬥用）、128×128（圖鑑縮圖） |
| 擺放 | 畫布底部對齊（腳底 = 圖層底 - 4%） |
| 命名 | `foe_<stage>-<nn>_<id>_<part>.png`　例：`foe_1-01_slime_head.png` |
| 圖層順序 | 後翼 → 尾 → 後腿 → 軀幹 → 前腿 → 前臂 → 頭 → 配件 → 特效 |

> ⚠️ **實測坑**：生圖工具雖然有 `background: transparent` 參數，實際輸出常常是
> **把棋盤格直接畫進 RGB 圖裡**（或給純白底），不是真 alpha。
> 本專案附了 `art/foes/bgcut.py`（邊緣泛洪去背 + 浮水印清除 + 自動裁切），
> 指令：`python art/foes/bgcut.py in1.png out1.png in2.png out2.png ...`

---

## 3. 八大關卡 48 隻總表（修訂版）

> 剪影碼：`A` 圓滾 / `B` 長條 / `C` 直立 / `D` 寬扁 / `E` 飛行 / `F` 尖刺 / `G` 甲殼機械 / `H` 流體幽靈
> 體型：`S` 小 / `M` 中 / `L` 大 / `XL` 巨型

### 第 1 大關 綠野草原（入門・全地面）
| # | id | 名稱 | 體型 | 剪影 | 材質主／副 | 動態 |
|---|---|---|---|---|---|---|
| 1 | slime | 史萊姆 | M | A 低寬穹頂 | 凝膠／草葉殘渣 | 彈跳滾動 |
| 2 | bunny | 蹦蹦兔 | M | C 直立長耳 | 絨毛／肉墊 | 蹬地跳躍 |
| 3 | frog | 小青蛙 | M | D 寬扁三角 | 濕皮／半透明腹 | 蹲跳 |
| 4 | cater | 毛毛蟲 | L | B S 形長條 | 絨毛／幾丁環節 | 波浪蠕行 |
| 5 | mush | 毒菇怪 | M | A 上寬下窄（菌傘） | 天鵝絨／發光菌褶 | 小碎步 |
| 6 | beetle | 鐵甲蟲 | M | G 圓拱硬殼 | 虹彩幾丁／鏽鐵 | 六足衝撞 |

### 第 2 大關 沙漠遺跡（慢～中，開始會追）
| # | id | 名稱 | 體型 | 剪影 | 材質主／副 | 動態 |
|---|---|---|---|---|---|---|
| 1 | crab | 螃蟹 | M | D 寬扁橫向 | 甲殼／濕砂 | 橫向蟹行 |
| 2 | mummy | 木乃伊小兵 | M | C 直立僵直 | 繃帶／乾屍皮 | 僵硬前伸 |
| 3 | eye | 眼球怪 | S | H 單眼球體 | 濕潤角膜／視神經 | 漂浮 |
| 4 | sandworm | 流沙蟲 | L | B 垂直鑽出 | 沙甲片／環狀齒 | 鑽地突襲 |
| 5 | dune | 沙丘獸 | L | C 四足駝峰 | 粗毛／砂礫 | 穩步推進 |
| 6 | scorp | 沙地蠍子 | M | G 低伏蠍型 | 光澤甲殼／毒針 | 鉗夾尾刺 |

### 第 3 大關 冰雪原（中，飛行怪登場）
| # | id | 名稱 | 體型 | 剪影 | 材質主／副 | 動態 |
|---|---|---|---|---|---|---|
| 1 | penguin | 冰晶企鵝 | M | C 短胖 | 羽毛／冰晶羽尖 | 搖擺滑行 |
| 2 | crystal | 冰晶怪 | M | F 六角晶簇 | 冰晶／內折射 | 漂浮旋轉 |
| 3 | bat | 冰蝙蝠 | S | E 皮革膜翼 | 膜翼／絨毛 | 拍翅 |
| 4 | snowball | 雪球怪 | M | A 多面雪球 | 積雪／冰殼裂紋 | 滾動 |
| 5 | seal | 小海豹 | M | D 流線貼地 | 濕滑皮／絨毛 | 蠕動滑行 |
| 6 | panda | 貓熊 | L | C 圓胖直立 | 絨毛／黑白塊 | 沉重踏步 |

### 第 4 大關 熔岩洞窟（中偏難，硬又快）
| # | id | 名稱 | 體型 | 剪影 | 材質主／副 | 動態 |
|---|---|---|---|---|---|---|
| 1 | lavaslime | 熔岩史萊姆 | M | A **高瘦淚滴** | 熔岩／岩核 | 滴落蠕動 |
| 2 | lavaworm | 熔岩蠕蟲 | L | B **扁平分節** | 結殼岩／熔岩縫 | 節節推進 |
| 3 | bee | 毒蜂 | S | E 絨毛蜂型 | 絨毛／條紋幾丁 | 急速拍翅 |
| 4 | bomber | 放彈怪 | M | C 背簍直立 | 皮革／鐵箍 | 投擲 |
| 5 | lizard | 疾風蜥 | M | D 低伏長尾 | 鱗片／背棘 | 四足疾衝 |
| 6 | rockling | 岩石小怪 | L | F 板岩堆疊 | 頁岩／熔岩脈 | 沉重踏步 |

### 第 5 大關 夜光彩城（進階，霓虹機械）
| # | id | 名稱 | 體型 | 剪影 | 材質主／副 | 動態 |
|---|---|---|---|---|---|---|
| 1 | wisp | 鬼火 | S | H 火焰团 | 電漿／無實體邊界 | 飄忽閃現 |
| 2 | scavenger | 撿彈怪 | M | C 長臂佝僂 | 補丁布／金屬鉤 | 伸手撿拾 |
| 3 | robot | 機器人 | M | C 方塊人形 | 拉絲鋼／鏽蝕 | 機械步行 |
| 4 | pulser | 電音小怪 | M | H 音波環體 | 壓克力／霓虹燈管 | 節拍脈動 |
| 5 | laserbee | 雷射蜂 | S | E **稜鏡硬翅** | 稜鏡／金屬腹節 | 直線衝刺 |
| 6 | neonbot | 霓虹機器人 | L | G 厚重裝甲 | 霓虹壓克力／黑鋼 | 重踏 |

### 第 6 大關 深海遺跡（高難，緩慢耐打）
| # | id | 名稱 | 體型 | 剪影 | 材質主／副 | 動態 |
|---|---|---|---|---|---|---|
| 1 | octopus | 章魚 | L | H 多觸手 | 濕滑皮／吸盤 | 觸手擺動 |
| 2 | angler | 燈籠魚 | L | D 巨口 | 鱗片／發光誘餌 | 緩游張口 |
| 3 | ghost | 幽靈 | M | H 布質幽靈 | 半透明布／冷霧 | 穿牆飄移 |
| 4 | hermit | 寄居蟹兵 | M | G 螺旋貝殼 | 鈣質殼／濕甲 | 拖殼橫行 |
| 5 | jelly | 水母小怪 | M | H 傘狀 | 透明膠質／螢光觸絲 | 收縮推進 |
| 6 | urchin | 海膽怪 | S | F 均勻長刺球 | 鈣質刺／吸盤足 | 緩慢滾動 |

### 第 7 大關 天空要塞（極難，全飛行）
| # | id | 名稱 | 體型 | 剪影 | 材質主／副 | 動態 |
|---|---|---|---|---|---|---|
| 1 | hornet | 大黃蜂 | M | E 絨毛蜂型 | 絨毛／大顎 | 懸停突進 |
| 2 | airship | 雲端小飛艇 | L | G 氣囊船體 | 帆布／黃銅 | 緩慢漂浮 |
| 3 | sapper | 拆彈怪 | M | C 工具箱機械 | 鐵皮／管線 | 拆解 |
| 4 | thunder | 雷電球 | S | F 電弧球 | 電漿／電弧 | 瞬移跳躍 |
| 5 | windwisp | 風精靈 | S | H 氣流渦旋 | 半透明氣流／風紋 | 高速盤旋 |
| 6 | galehawk | 疾風鷹 | L | E 展開羽翼 | 羽毛／利爪 | 俯衝 |

### 第 8 大關 暗黑魔王城（最終，追擊＋護甲＋會躲炸彈）
| # | id | 名稱 | 體型 | 剪影 | 材質主／副 | 動態 |
|---|---|---|---|---|---|---|
| 1 | skull | 骷髏兵 | M | C 骸骨 | 老化骨質／鏽劍 | 喀喀步行 |
| 2 | imp | 暗黑小惡魔 | S | C 小翅尖尾 | 濕皮／角質 | 蹦跳撲擊 |
| 3 | darkbat | 暗黑蝙蝠 | M | E **破洞膜翼** | 膜翼／骨刺 | 盤旋俯衝 |
| 4 | wizard | 小巫師 | M | C 尖帽斗篷 | 粗呢斗篷／木杖 | 施法後撤 |
| 5 | royalguard | 魔王近衛軍 | L | C 塔盾重甲 | 黑鋼／紅光縫隙 | 盾牆推進 |
| 6 | deathknight | 死亡騎士 | XL | C 高瘦披風 | 暗鋼／布料 | 大劍橫掃 |

### ⚠️ 7 組「換色風險」與差異化處方

| 風險組 | 現況問題 | 處方（改哪一軸） |
|---|---|---|
| **slime / snowball / lavaslime** | 三顆圓球，只差顏色 | 史萊姆＝低寬穹頂＋薄膜邊緣＋垂墜；雪球＝多面切角＋冰殼裂紋＋凍結的枯枝；熔岩＝**高瘦淚滴**＋內部岩核＋滴落岩漿柱 |
| **cater / sandworm / lavaworm** | 三條蟲 | 毛毛蟲＝短 5 節＋絨毛環＋觸角；流沙蟲＝**從沙中垂直鑽出**＋環狀齒口器＋無腳；熔岩蠕蟲＝扁平分節＋背部散熱孔＋熔岩縫 |
| **bunny / dune / seal** | 三隻四足 | 兔＝直立長耳蹬腿；沙丘獸＝**雙角＋駝峰＋粗頸**（噸位感）；海豹＝無耳流線＋鰭肢貼地 |
| **penguin / panda / mummy / imp / royalguard / deathknight** | 六隻直立人形 | 用**高度與寬度**拉開：企鵝 1:1 短胖；貓熊 1:1.1 最寬；木乃伊 1:2 僵直；小惡魔 1:2 帶翅尖尾；近衛軍 1:1.4 塔盾最寬；死亡騎士 1:2.4 最高 |
| **bat / darkbat / laserbee / hornet / galehawk** | 五隻飛行 | 蝙蝠＝皮革膜翼；暗黑蝙蝠＝膜翼**破洞＋骨刺＋煙霧尾**；雷射蜂＝**稜鏡硬翅**（不是羽毛）；大黃蜂＝絨毛＋大顎；疾風鷹＝羽毛＋長尾羽 |
| **crystal / urchin / thunder / rockling** | 四隻尖刺 | 冰晶＝六角晶簇＋折射；海膽＝球體＋**均勻放射長刺**；雷電球＝電弧＋無實體邊界；岩石＝**板岩水平堆疊**＋青苔 |
| **robot / neonbot / airship / hermit / beetle / crab / scorp** | 七隻甲殼機械 | 全部靠材質分流：鏽鋼／霓虹壓克力／帆布氣囊／螺旋鈣殼／虹彩幾丁／濕甲蟹殼／蠍型節肢 |

---

## 4. 第一大關「綠野草原」6 隻完整設定

> 設計原則：**這是新手關，玩家第一眼看到的就是這 6 隻。**
> 所以要「最可愛、最好辨識、最不像換色」，並且全部是地面怪（不會穿牆追人）。

---

### 4-1 史萊姆 `slime`（膠質清道夫）

| 項目 | 內容 |
|---|---|
| **一句話** | 一坨會走路的果凍，肚子裡裝著牠吃掉的整片草地 |
| **剪影簽名** | W:H = **1.35:1**（低寬穹頂）＋底部薄膜鋪開＋左緣一滴垂墜 |
| **體型** | M（遊戲 r=14） |
| **材質** | 主：翡翠綠半透明凝膠（SSS，光從內部透出）／副：內部懸浮雜物（草葉 3、小石 1、橡實 1） |
| **辨識重點（53px 也要看得到）** | ① 圓頂上的嫩葉芽 ② 肚子裡的草葉剪影 ③ 底部的垂滴 |

**拆件表**
| 部位 | 圖層 | Pivot | 可動軸 |
|---|---|---|---|
| `sprout` 嫩葉 | 最上 | 葉柄根部 | 旋轉 ±25°（隨移動方向擺） |
| `head` 上膠體（含眼、嘴） | 中上 | 底部中心 | 9-slice 拉伸（squash 0.82~1.18） |
| `torso` 下膠體＋薄膜邊 | 中 | 底部中心 | 水平縮放（著地壓扁） |
| `arm_l / arm_r` 膠質短臂 | 左右 | 肩點 | 旋轉 -20°~+40° |
| `eyes` 深綠橢圓眼 | 在 head 內 | 各自中心 | 位移 ±2px（看向玩家） |
| `droplet` 垂滴 | 最下 | 頂部 | 垂直位移（滴落循環） |

**動畫建議**：idle 呼吸 squash 0.96↔1.04（2.4s）／move 彈跳（每 0.55s 壓扁→拉長→落地）／attack 身體前傾 12° + 手臂上舉／hurt 全體抖動 3 帧 + 顏色偏白閃／die 攤平成薄膜

**生圖 Prompt（Hero）**
```
Single creature concept art for a stylized fantasy RPG. A chunky low-dome SLIME made of
translucent jade-green gel, wider than it is tall, its base spreading into a thin membrane
rim on the ground. Glossy wet surface with two crisp specular highlights, strong subsurface
scattering so the body glows from inside, edge-lit translucency. Suspended inside the gel:
three blades of grass, a small pebble, a tiny acorn, all softly blurred. Two large dark-green
almond eyes float inside the body under the surface, a crack-shaped mouth slightly open, two
stubby gel arms lifted, one tiny sprout leaf on the crown, a single thick drip of slime hanging
off the left edge about to fall. Body leans forward 12 degrees with the right side stretched
upward, mid-pounce squash-and-stretch tension. Stylized 2.5D semi-3D painterly render, sculpted
volume, hand-painted PBR material, strong warm rim light from upper-left backlight, soft ambient
occlusion in every crevice, subtle contact shadow, crisp readable silhouette, three-quarter
front view, full body, centered, isolated on transparent background, high detail game asset,
no text, no logo, no frame, no ground plane.
```
**Negative**：`flat vector icon, sticker, emoji, simple gradient, chibi logo mascot, low-poly, blurry, extra limbs, opaque rubber, plastic toy`

---

### 4-2 蹦蹦兔 `bunny`（蹬地蓄力）

| 項目 | 內容 |
|---|---|
| **一句話** | 看起來很軟，但後腿一蹬能把地板踏出裂痕 |
| **剪影簽名** | 蛋形身體＋**一耳折 30°／一耳後貼**＋超大後腳掌＝不對稱剪影 |
| **體型** | M（r=14，追擊型） |
| **材質** | 主：短絨毛（邊緣有絨毛斷裂感）／副：奶白腹毛、粉色耳內、濕潤鼻頭 |
| **辨識重點** | ① 折耳 ② 大後腳 ③ 三瓣嘴露兩顆門牙 |

**拆件表**
| 部位 | Pivot | 可動軸 |
|---|---|---|
| `ear_l`（折）/ `ear_r`（直） | 耳根 | 旋轉 -40°~+30°、折耳可再多折 40° |
| `head` | 頸部 | 旋轉 ±18°、上下點頭 |
| `jaw` 下顎 | 下顎關節 | 開合 0~22° |
| `torso` | 骨盆中心 | 前傾/後仰 ±12°、呼吸縮放 |
| `arm_l / arm_r` | 肩 | 旋轉 -30°~+90° |
| `leg_l / leg_r` 後腿 | 髖 | 折疊→蹬直（0~85°） |
| `tail` | 尾根 | 彈簧抖動 |

**動畫建議**：idle 耳朵微抖＋鼻子抽動（0.8s）／move 蹬跳（蓄力 0.18s → 騰空 → 落地壓扁）／attack 前爪連抓 2 下

**生圖 Prompt（Hero）**
```
Single creature concept art for a stylized fantasy RPG. A HOPPER BUNNY monster, egg-shaped
body covered in short soft fur with a fuzzy broken silhouette edge, cream-white belly fluff,
thick fluffy tail pom. One long ear folded back 30 degrees, the other ear pinned straight back
for speed, pink inner ear. Big muscular hind legs coiled and ready to pounce, oversized hind
paws, short front paws lifted with tiny claws. Three-part mouth open in a small snarl showing
two buck teeth, wet nose highlight, eyes squinting with lowered brows, cute but aggressive.
Weight shifted onto the right hind leg, body low and coiled, front left paw reaching forward,
dynamic pounce-prep pose. Stylized 2.5D semi-3D painterly render, sculpted volume, hand-painted
PBR fur and skin, strong warm rim light from upper-left backlight, soft ambient occlusion in fur
creases and under the body, individual hairs catching the rim light, crisp readable silhouette,
three-quarter front view, full body, centered, isolated on transparent background, high detail
game asset, no text, no logo, no frame, no ground plane.
```
**Negative**：`flat vector icon, sticker, emoji, plush toy, plastic, simple gradient, low-poly, blurry, extra limbs`

---

### 4-3 小青蛙 `frog`（蹲踞鼓喉）

| 項目 | 內容 |
|---|---|
| **一句話** | 舌頭比身體長，永遠在追那隻抓不到的蟲 |
| **剪影簽名** | W:H = **1.22:1**（寬扁三角）＋頭頂兩顆凸出半球眼＋Z 字折疊後腿 |
| **體型** | M（r=14，跳躍型 trait: hop） |
| **材質** | 主：濕潤兩棲皮（油脂高光、深綠斑塊）／副：米白半透明腹（透出內臟淡影）、鼓起的喉囊 |
| **辨識重點** | ① 頭頂凸眼 ② 吐出的粉紅舌頭 ③ 蹼足 |

**拆件表**
| 部位 | Pivot | 可動軸 |
|---|---|---|
| `eye_l / eye_r` | 各自中心 | 旋轉 360°（眼神）、眨眼（上眼瞼 0~100%） |
| `jaw` | 下顎 | 開合 0~35° |
| `tongue` | 舌根 | **骨鏈 4 節**（可甩出 1.8 倍體長） |
| `sac` 喉囊 | 下巴 | 縮放 0.6~1.35（鼓動） |
| `arm_l / arm_r` | 肩 | 旋轉 -25°~+70° |
| `leg_l / leg_r` | 髖 | 折疊 ↔ 蹬直（Z 字展開） |

**動畫建議**：idle 喉囊鼓動 1.6s ＋ 眼球隨機轉／move 蹲→彈（0.5s）／attack 舌頭甩出 0.18s→收回 0.25s

**生圖 Prompt（Hero）**
```
Single creature concept art for a stylized fantasy RPG. An ADORABLE squat LITTLE FROG monster,
appealing rounded shape design, wide and low, much wider than tall, big soft body. Two huge
glossy bulging eyes on top with big amber irises and bright specular catchlights, cute
determined expression with tiny fangs peeking from a wide friendly grin, glossy wet lime-green
amphibian skin with soft darker green blotches, pale cream belly with gentle inner glow, small
round vocal sac puffed under the chin. Short chubby four-fingered arms, big rounded webbed hind
feet tucked in a Z fold, coiled and just about to leap, one long pink tongue flicking out after
a tiny fly. Stylized 2.5D semi-3D painterly render, sculpted rounded volumes, hand-painted wet
skin, soft warm rim light from upper-left backlight, ambient occlusion in the folds, crisp
appealing silhouette, three-quarter front view, full body, centered, isolated on transparent
background, high detail game asset, no text, no logo, no frame, no ground plane.
```
**Negative**：`ugly, grotesque, realistic warts, skinny limbs, dried skin, flat vector icon, sticker, emoji, low-poly, blurry, extra limbs`

---

### 4-4 毛毛蟲 `cater`（S 形拱起）

| 項目 | 內容 |
|---|---|
| **一句話** | 走得像波浪，一節一節把身體往前送 |
| **剪影簽名** | W:H = 1:0.85，**S 形縱向**，前 2 節上抬 30°，頭節最大、尾節最小 |
| **體型** | L（r=13，慢速 32，最適合當「移動障礙」） |
| **材質** | 主：短絨毛（每節一環絨毛帶）／副：幾丁質環片（緞面光）、節間深色軟膜、背部深色縱紋 |
| **辨識重點** | ① 波浪分節 ② 兩支不等長觸角 ③ 每節一對小短足 |

**拆件表**
| 部位 | Pivot | 可動軸 |
|---|---|---|
| `head`（含眼、顎、觸角 2） | 第 2 節前端 | 旋轉 ±25°、上下 15° |
| `seg1`～`seg4` | 各自前一節尾端 | **骨鏈**，每節 ±18°（波浪） |
| `legs`（每節 1 對） | 節底 | 前後擺 0~30°（相位錯開 90°） |
| `antenna_l / r` | 頭頂 | 旋轉 ±35°＋彈性晃動 |
| `tail` | 末節 | 輕微擺動 |

**動畫建議**：move 用正弦波相位差驅動 4 節（ω=6rad/s）／attack 前 2 節抬起張口／die 逐節鬆軟攤平

**生圖 Prompt（Hero）**
```
Single creature concept art for a stylized fantasy RPG. A long segmented CATERPILLAR monster,
five tapering body segments stacked in an S-curve, head segment the largest and lifted up
looking around, two antennae of different lengths with round tips, tiny mandibles, a fuzzy ring
of soft bristles at every segment joint, stretchy dark membrane between the plates, dark dorsal
stripe, pairs of tiny stub legs under each segment, small rounded tail nub, two big glossy black
eyes with highlights, cheerful curious expression. Front two segments raised, body arched, little
legs mid-step. Materials: soft velvety lime-green fuzz with individual hairs on the silhouette
edge, chitin ring plates with a satin sheen, moist membrane. Stylized 2.5D semi-3D painterly
render, sculpted rounded volumes, hand-painted PBR, warm rim light from upper-left backlight,
soft ambient occlusion between segments, crisp appealing silhouette, three-quarter front view,
full body, centered, isolated on transparent background, high detail game asset, no text, no
logo, no frame, no ground plane.
```
**Negative**：`flat vector icon, sticker, emoji, plastic toy, simple gradient, low-poly, blurry, extra limbs, humanoid`

---

### 4-5 毒菇怪 `mush`（傘面壓低）

| 項目 | 內容 |
|---|---|
| **一句話** | 一頂會走路的毒傘，傘下永遠在噴孢子 |
| **剪影簽名** | **上寬下窄**的倒三角：菌傘寬度 = 身高 1.3 倍，傘緣下垂遮住半張臉 |
| **體型** | M（r=14，最慢 38） |
| **材質** | 主：天鵝絨霧面（吸光、柔和衰減）＋螢光紫粉斑點／副：傘下放射菌褶（**背光透光**）、菌柄纖維紋＋菌環 |
| **辨識重點** | ① 巨大菌傘 ② 傘下透光的菌褶 ③ 陰影裡兩顆發光眼 |

**拆件表**
| 部位 | Pivot | 可動軸 |
|---|---|---|
| `cap` 菌傘 | 柄頂 | 傾斜 ±20°、整體縮放（呼吸 0.97~1.03） |
| `cap_edge` 傘緣 | 傘緣 | 抖動（頂點位移 ±3px） |
| `gills` 菌褶 | 傘底 | 開合（露出/遮住嘴） |
| `stem` 菌柄 | 底部 | 彎曲 ±10° |
| `arm_l / arm_r` | 柄側 | 旋轉 ±40° |
| `leg_l / leg_r` | 柄底 | 小碎步 0~25° |
| `spores` 孢子 | 傘下 | 粒子發射器（上升 + 消散） |

**動畫建議**：idle 傘面緩慢起伏＋孢子持續逸散／move 小碎步（身體左右傾 6°）／attack 傘面下壓噴孢子

**生圖 Prompt（Hero）**
```
Single creature concept art for a stylized fantasy RPG. A walking POISON MUSHROOM monster, head
is a huge wide mushroom cap wider than the whole body, cap surface is matte velvet in dusty
violet with soft glowing pink-magenta spots, dense radial gills underneath the cap with warm
bioluminescent backlight bleeding through them, the cap tilted about 20 degrees like a lowered
hat brim hiding half of the face, two glowing pale eyes peeking from the shadow under the brim,
short thick fibrous cream-colored stem body with a ragged skirt ring, two tiny stubby arms, two
little feet, one hand holding the cap edge, a puff of drifting spores leaking from under the cap.
Materials: velvet cap, translucent glowing gills, fibrous waxy stem with fine cracks. Stylized
2.5D semi-3D painterly render, sculpted rounded volumes, hand-painted PBR, warm rim light from
upper-left backlight, soft ambient occlusion under the cap, crisp appealing silhouette, three-
quarter front view, full body, centered, isolated on transparent background, high detail game
asset, no text, no logo, no frame, no ground plane.
```
**Negative**：`flat vector icon, sticker, emoji, simple gradient, low-poly, blurry, skull, gore, extra limbs`

---

### 4-6 鐵甲蟲 `beetle`（低重心頂角）

| 項目 | 內容 |
|---|---|
| **一句話** | 一台會呼吸的裝甲車，正面只有一根角是弱點 |
| **剪影簽名** | 圓拱橢圓殼（W:H = 1.3:1）＋**向前伸出的分叉獨角**＋六足外張 |
| **體型** | M（r=15，追擊型，HP 4 最硬） |
| **材質** | 主：虹彩幾丁質（薄膜干涉，藍紫綠隨角度變）／副：鏽紅磨損邊、密佈凹點與舊刮痕、油亮黑色關節 |
| **辨識重點** | ① 分叉獨角 ② 殼中央接縫 ③ 六足張開的低底盤 |

**拆件表**
| 部位 | Pivot | 可動軸 |
|---|---|---|
| `horn` 獨角 | 頭前 | 固定（跟頭一起動） |
| `head` | 前胸 | 旋轉 ±15°、上下 10° |
| `mandible_l / r` | 頭前兩側 | 開合 0~30° |
| `elytra_l / r` 鞘翅 | 背中縫 | **左右開闔 0~55°**（衝刺時張開） |
| `wing` 膜翅 | 鞘翅下 | 拍動（僅衝刺時） |
| `legs`×6 | 各節基 | 三對相位錯開的擺動 |
| `abdomen` 腹節 | 殼下 | 呼吸縮放 |

**動畫建議**：idle 六足微調＋鞘翅開 5°／move 六足三角步態＋鞘翅張 35°／attack 獨角前頂（前衝 0.2s）

**生圖 Prompt（Hero）**
```
Single creature concept art for a stylized fantasy RPG. A heavy ARMORED BEETLE monster, domed
oval carapace with a crisp center seam splitting the two elytra, iridescent chitin shifting
between deep blue, violet and green as the light moves, dense pitting, small old scratches and
chips on the shell, rust-red worn edges, a big forked rhinoceros horn thrust forward from the
head, two sharp mandibles, dark compound eyes, six segmented jointed legs with coarse bristles
splayed wide and gripping, abdomen segments visible below the shell, the elytra slightly lifted
at the back showing a hint of translucent amber membrane wing underneath. Low center of gravity,
weight forward, front legs planted, bull-charge pose, aggressive but cartoon-appealing
proportions with a chunky oversized horn. Materials: hard iridescent chitin with sharp
highlights, matte worn rust, oily black joints. Stylized 2.5D semi-3D painterly render, sculpted
hard-surface volumes, hand-painted PBR, strong warm rim light from upper-left backlight, crisp
ambient occlusion between plates, crisp readable silhouette, three-quarter front view, full body,
centered, isolated on transparent background, high detail game asset, no text, no logo, no frame,
no ground plane.
```
**Negative**：`flat vector icon, sticker, emoji, plastic toy, simple gradient, low-poly, blurry, extra limbs, spider`

---

## 5. Prompt 工程規範（寫給後續 42 隻用）

### 5.1 四段式結構（照這個順序寫，成功率最高）
```
[1 主體與剪影]  A <形容詞> <體型> <怪物類型>, <寬高比/姿態>
[2 材質與細節]  Materials: <主材質光學> / <副材質>，<3~5 個具體細節>
[3 光線與渲染]  Stylized 2.5D semi-3D painterly render, <rim light / AO / SSS / specular>
[4 輸出約束]     three-quarter front view, full body, centered, isolated on transparent
                background, high detail game asset, no text, no logo, no frame, no ground plane
```

### 5.2 必加的「反陽春」咒語
```
crisp readable silhouette, sculpted volume, hand-painted PBR, strong warm rim light,
soft ambient occlusion in every crevice, subsurface scattering, individual hairs / scales /
plates catching the light
```

### 5.3 必加的 Negative
```
flat vector icon, sticker, emoji, mobile game icon, simple gradient, single flat color fill,
chibi logo mascot, plastic toy, low-poly, blurry, soft focus, text, logo, watermark, frame,
ground plane, T-pose, symmetric, extra limbs, extra fingers, deformed anatomy
```

### 5.4 常見失敗與修法
| 症狀 | 原因 | 修法 |
|---|---|---|
| 變成一張「圖示」 | 只寫了顏色和形狀 | 加 `sculpted volume`、`hand-painted PBR`、`ambient occlusion` |
| 太寫實、太醜 | 沒給「可愛程度」錨點 | 加 `appealing rounded shape design`、`big expressive eyes`、`cartoon-appealing proportions`，Negative 加 `ugly, grotesque, realistic warts` |
| 背景去不掉 | 工具把棋盤格畫進圖裡 | 用 `art/foes/bgcut.py` 泛洪去背 |
| 出來是 T-pose | 沒指定動作 | 明確寫 `mid-pounce`, `coiled and about to leap`, `weight shifted onto the right leg` |
| 兩隻長一樣 | 只換了顏色詞 | 用 §1.5 三軸差異法，至少改「剪影軸」 |

---

## 6. 拆件與骨骼規範（Rig Spec）

### 6.1 命名
```
foe_<stage>-<nn>_<id>_<part>.png
例：foe_1-01_slime_head.png / foe_1-06_beetle_elytra_l.png
```
部位字彙表：`head / jaw / eye_l / eye_r / torso / arm_l / arm_r / leg_l / leg_r / tail / wing_l / wing_r / elytra_l / elytra_r / cap / gills / horn / accessory / fx`

### 6.2 Pivot 規則
- 四肢：pivot 在**關節根部**（不是肢體中心）
- 頭：pivot 在**頸椎點**
- 長條型（毛毛蟲、蛇）：pivot 在**每一節的前端**，串成骨鏈
- 傘型（毒菇、水母）：pivot 在**柄頂**，讓傘面能整片傾斜

### 6.3 圖層順序（由後到前）
```
wing_l(後) → tail → leg_l(後) → torso → leg_r(前) → arm_l(後) → arm_r(前)
→ head → jaw → eye_l/eye_r → accessory → fx(發光/粒子)
```

### 6.4 每隻必備的動畫 Clip（最短集合）
`idle`（呼吸 2.4s）／`move`（位移循環）／`attack`（0.35s）／`hurt`（3 帧抖動＋白閃）／`die`（0.6s 攤平/碎裂）

---

## 7. 落地管線（從這份設定到遊戲內）

1. **產出**：用 §4 的 Prompt 生 1024×1024 → `art/foes/stage1/`
2. **去背**：`python art/foes/bgcut.py in.png out.png`
3. **拆件**：依 §4 拆件表切圖（或用生成式拆件表當參考，手動對位）
4. **縮圖**：Lanczos 縮到 256 / 128，保留 alpha
5. **打包**：`art/foes/stage1/` → 打進 `IMG_PARTS`（跟現有 `drawRigChar()` 同一套機制）
6. **回退**：`drawFoeArchetype()` 保留，作為「圖片載入失敗」的 fallback（等同目前的 `__stubModule` 思路）

> 建議節奏：**一次做一個大關**。每關 6 隻 × (1 Hero + 拆件 + 5 clip)，
> 完成一關就接進遊戲驗證，不要 48 隻一次做完（做不完也驗不完）。

---

## 8. 本關資產清單

| 檔案 | 內容 |
|---|---|
| `stage1/01-slime.png`～`06-beetle.png` | 6 隻 Hero 圖（RGBA，已去背） |
| `stage1/00-rig-sheet-slime.png` | 拆件示意（史萊姆示範，右側為爆炸圖） |
| `stage1/_contact.png` | 六隻並排對照（檢查剪影差異用） |
| `bgcut.py` | 去背工具（泛洪 + 浮水印清除 + 自動裁切） |
| `stage1-preview.html` | 本文件的視覺化版本（可直接在瀏覽器看） |
