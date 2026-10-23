# 絵本版1.1の素材制作

ユーザーが指定した [もこもこおみせタウン 春の広場](https://chatgpt.com/s/m_6adb432ac63881918563597bcbe1371a) をブラウザーで確認し、画像を参照して制作しました。
初版の簡易図形から、ふわふわの動物・春の花・木造のお店・温かい光のある絵本風へ更新しました。
ゲームの進行・採点・セーブ形式は維持しています。

制作にはCodex組み込みの画像生成を使用しました。外部API・CLIは使用していません。

## 保存した素材

- `references/world_reference.png`：ユーザー指定の参照画像。ゲーム実行ファイルには含めません。
- `assets/storybook/salon.png`：文字や人物のないサロン背景。
- `assets/storybook/characters.png`：3列×2行の動物6種。生成された透過情報を維持し、Godot側で各領域を描画します。
- 動物の並び：うさぎ・いぬ・紫のねこ／ひつじ・ペンギン・くま。
- 髪かざり・リボンはGDScriptで別描画し、ゲーム中に変更できます。

## 背景への生成指示

Use case: illustration-story. Game production background asset. Reference image defines the exact original Mokomoko Omise Town world: rich painterly kawaii Japanese storybook, warm honey-colored timber, lavish pink/white blossoms and ivy, golden sunlight, pastel furnishings. Create the INTERIOR OF NIKONIKO SALON in this world, a square image. Front view of an empty salon chair in dusty rose at center (seat near 78% height), large ornate oval mirror behind it, little shelves with glass perfume jars, flowers everywhere, left window showing the same spring town outside. Keep chair central area clear for a large character sprite overlaid later. Camera straight-on slightly elevated. Beautiful polished detailed painted game background, soft natural outlines, creamy golden lighting. NO characters, NO people, NO letters, NO logos, NO UI, NO buttons. Fill frame.

## 動物への生成指示

Use case: illustration-story. Game sprite sheet for the original Mokomoko Omise Town reference world. EXACT 3 columns x 2 rows, SIX fully separated characters with generous transparent gutters, perfectly equal square cells. Transparent background, no ground, no shadow outside character, no text, no UI. Each character FULL BODY, seated front-facing looking at viewer, large round fluffy head and tiny stubby body and paws, warm painterly shading and delicate brown outlines, happy small face and blush cheeks exactly like reference, not flat vector. All same visual size and alignment: each head center at 50% cell width and 44% cell height, feet at 88%, full body including ears fits inside 8%-92% of cell. Row1 left: reference pale pink fluffy rabbit with upright ears; row1 middle: reference cream puppy with floppy brown ears; row1 right: reference lavender kitten. Row2 left: reference creamy fluffy sheep with golden spiral horns; row2 middle: reference navy blue penguin with cream face and orange beak; row2 right: reference honey brown teddy bear. Each wears simple small sage green salon bib. IMPORTANT all characters have bare heads and bare necklines with NO flower clips, bows, ribbons, hats, bags, handheld objects, or accessories, because actual game equips those dynamically. Maintain reference character identity, plush silhouettes, fluffy fur, beautiful warm watercolor anime children's game rendering.

## 現段階の表現

動物は静止画に小さな上下動を加えています。結果に応じて星の演出が出ますが、表情・手足の個別アニメーションはありません。
画像内のカフェ・街歩きのゲームを追加したものではなく、既存のサロン1店舗の世界観を合わせた更新です。

## 絵本版1.2：おめかしアルバム

アルバム画面には新しい画像素材を生成していません。
`salon.png` と `characters.png`、既存の小物描画をそのまま使い、完成時に保存した選択からアルバムの衣装を再現します。
アルバム内の動物は静止表示です。参照画像と既存素材の世界観を維持しています。

## 絵本版1.2：キャラクターアイコン

Codex組み込み画像生成を使用し、`assets/storybook/characters.png` の左上のうさぎ「もも」を参照して描きました。
原画は `references/momo_icon_source.png` です。
`tests/build_icons.gd` で縮小と形式変換のみを行い、ゲーム用256px PNG、Windows用ICO（16/32/48/64/128/256px）、ブラウザー用32px PNGとICO（16/32/48px）を生成します。
Godotの設定は `assets/icon.png`、Windows書き出しは `assets/icon.ico` を参照します。

生成指示：

Use case: logo-brand. Create ONE square app icon for Mokomoko Omise Town / Nikoniko Salon, a warm Japanese storybook game. The attached sprite sheet is a CHARACTER IDENTITY AND PAINTED STYLE REFERENCE ONLY. Depict only Momo, the pale blush pink fluffy rabbit at the TOP LEFT of that sheet. A tightly framed front-facing head portrait, both tall rounded ears fully visible with generous safe padding, happy closed crescent eyes, tiny dark brown nose, cheerful small open mouth, rosy cheeks. One simple large pink flower hair clip with pale yellow center near the right ear (viewer right), and a small mint neck bow at the bottom. Match the rabbit's soft cream-pink fur, warm brown edges and charming fluffy silhouette faithfully. Simplify the fur texture and keep facial features bold enough for a 32 px favicon. Rabbit head fills most of the square, ears included. Background is a SINGLE solid pale mint color, no scene, no lettering, no logo text, no frame, no other animals, no hands/body. Polished hand-painted children's storybook illustration. Flat full-bleed square background, no rounded tile corners or drop shadows. Output one square icon only, not a mockup or icon sheet.
