# 影片生成提示詞（待確認後才送出）

> 送出前規則：**一段 5 秒、768²、不做鏡頭運動**；模型上限 2000 字元，以下每段約 700~900 字元。
> 背景規則**一定放最前面**（上次 victory 的洋紅被換成青色，就是因為寫在後面）。

## 共用尾巴（每支都接這段）

```
Keep the exact same character design, colors, shading, proportions and size as the first frame.
Full body always visible: both feet, both arms and the whole head stay inside the frame.
Feet stay planted in the same spot; do not walk left or right, do not turn around, do not look away.
Face stays visible at all times. Flat lighting, no shadows on the background.
No text, no watermark, no props, no extra objects, no background change, no camera movement.
```

## 共用開頭（每支都接這段）

```
Flat solid magenta #FF00C8 background filling the entire frame. Never replace it with cyan,
green, white or any other color. Keep exactly this background in every single frame.
A cute chubby cartoon animal game hero, thick soft outlines, cel-shaded, same style as the first frame.
```

---

## 小熊｜throw（重生成：上拋接住）

```
He holds one small round dark bomb ball in both hands at chest height, then squats deeply,
swings both arms and throws the ball straight up above his head, watches it come back down
and catches it with both hands. Heavy, powerful, exaggerated motion with a big wind-up and a
strong weight shift. Only one ball, round and intact, about the size of his own head; never two balls.
```

## 小熊｜hurt（重生成：縮身護頭，原地不位移）

```
He gets hit: his upper body snaps backward, both arms fly up to cover his head, he shrinks down
with knees bent and shoulders raised, wobbles once, then slowly straightens back up.
Exaggerated pain reaction. Nothing appears in front of his face: no stick, no bar, no object,
no shadow across the face. He does not fall down and does not slide sideways.
```

## 柴犬｜walk（跩跩的八字步）

```
He walks in place with a cocky swagger: chin lifted high, shoulders rolling side to side,
chest puffed out, tail swinging wide in an S shape, and he glances back over his shoulder
twice during the loop. Big confident stride, arms swinging opposite to the legs.
```

## 柴犬｜idle（不耐煩 → 抖毛 → 歪頭瞪你）

```
He stands impatiently: taps the ground twice with one hind foot, then shakes his whole body
like a wet dog (fast head-to-tail shake), then tilts his head at the camera with a smug look.
Quick, snappy, exaggerated timing.
```

## 柴犬｜hold（舉彈：一手托球在胸前、一手往外攤）

```
He holds one small round dark bomb ball in one hand in front of his chest, and spreads the other
arm out to the side with an open palm as if saying "so what?", chin lifted, weight on one leg.
The ball stays in front of the chest and never covers his face. Only one ball, round and intact.
```

## 柴犬｜victory（舉 V 大笑 → 挺腰 → 單膝捶地）

```
He throws both arms up in a big V, laughs with his head tilted back, pushes his hips forward,
then drops to one knee and slams one fist on the ground like a victory pose, then gets back up.
Very large, punchy motion with strong accents.
```

---

## 送出清單（6 支）

| # | 角色 | 動作 | 首幀 |
|---|------|------|------|
| 1 | 小熊 | throw（上拋接住） | `first_bear.png`（沿用） |
| 2 | 小熊 | hurt（縮身護頭） | `first_bear.png`（沿用） |
| 3 | 柴犬 | walk | `first_dog.png` |
| 4 | 柴犬 | idle | `first_dog.png` |
| 5 | 柴犬 | hold | `first_dog.png` |
| 6 | 柴犬 | victory | `first_dog.png` |

每支送出後**只跑一次**：有任何一支失敗（洋紅變色／角色出畫面／多一顆球），我會先回報再問要不要重跑，不自行重刷。
