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

## 絵本版1.2.1：前掛けの除去・首リボンの中央揃え

Codex組み込み画像生成の編集で、既存の `assets/storybook/characters.png` の6種類すべてから緑の前掛けを取り除き、周囲と同じ毛並みで胸元を補いました。
1536×1024、3列×2行、透過情報を維持しています。
首リボンは画像へ描き込まず、`scripts/salon_art.gd` の `NECK_ANCHORS` で動物ごとの首の中心に重ねます。
この共通描画を使うタイトル・接客画面・保存済みアルバムに反映されます。

生成指示：

Use case: precise-object-edit. EDIT the supplied existing game sprite sheet. Remove ONLY the sage green bib/apron/cape from the chest of ALL SIX animals. Reconstruct that small chest patch as natural soft fur matching the surrounding body: pale blush pink rabbit, cream puppy, lavender cat, ivory sheep, cream belly penguin, honey brown bear. No clothing, no collar, no bib, no apron, no ribbon, no accessories anywhere: the game draws accessories separately. Preserve character identities, expressions, heads, ears, paws, feet, colors, warm hand-painted storybook rendering. CRITICAL retain EXACTLY the same 3 columns by 2 rows arrangement and character positions/scales as the input; same landscape 1536x1024 canvas with 512x512 square cells. Row1 rabbit dog cat; row2 sheep penguin bear. All six FULL bodies separated within their own cells with no cross-cell overlap. Preserve the transparent background/alpha; do not add any background color, checkerboard, scene, glow, floor shadow, text, or new objects. Only replace the green fabric with fur; keep all other features and pose unchanged.

## 絵本版1.3：春の広場

`references/world_reference.png` を世界観の参照として、Codex組み込み画像生成で横長の広場背景を制作しました。
保存先は `assets/storybook/town.png` です。
左にピンクのサロン、右にミント色の雑貨店、中央に噴水を配置しています。
店名・ボタン・得点は画像に焼き込まず、日本語UIとして別に表示します。

生成指示：

Use case: illustration-story. Create a new game background for the spring town square of Mokomoko Omise Town, using the provided image ONLY as reference for the existing world, warm palette, painterly storybook style, honey timber, flowers, pastel roofs and golden afternoon sunlight. LANDSCAPE 16:9 panoramic composition. Camera slightly elevated, front-facing village square. A lovely small salon occupies the LEFT THIRD with a dusty pink striped awning and a large oval mirror emblem above its inviting front door; no lettering. A whimsical general store occupies the RIGHT THIRD with a sage mint striped awning, shelves of colorful ribbons and flower ornaments in the window, and a little wrapped-gift emblem; no lettering. In the CENTER a low round stone fountain, surrounding spring flowerbeds, a bench, a small clocktower farther back. Cobblestone paths clearly connect the left and right shop doors with the central square. Both shop facades prominent and visible, equal scale, approximately x=25% and x=75%. Blossoming trees and ivy frame the upper corners. Wide sunny open foreground to keep map easy to read. Rich hand-painted Japanese children's storybook rendering, soft detail, cozy generous shapes matching the reference. NO title, NO UI, NO buttons, NO letters, NO words, NO sign text, NO people or animals (game sprites added separately). A scene filling the entire rectangular image, not a mockup or bordered map.
# 絵本版1.4・こむぎベーカリー追加

組み込み image_gen を使用。既存サロンは画風の参照、広場は編集対象として指定。
生成した最終画像を以下のプロジェクト内にコピーして使用しています。

## 店内：assets/storybook/bakery.png

Use case: illustration-story. Asset type: square background for a Japanese children's storybook bakery game. Input image 1 is a STYLE reference only, not an edit target. Create a cozy tiny bakery interior in this exact warm, detailed painterly fairy-tale style: honey wooden beams, abundant spring flowers at window corners, golden pendant lamps, little bread baskets on side shelves, a cream brick arched oven at back right. NO salon chair or mirror. Composition: open central floor for a separately composited animal customer; clear broad wooden worktop at bottom 22% for separately composited bread, oven fully visible upper right. Soft sunny spring window on left, pink blossoms outside, cream and warm wheat palette. Straight-on storybook game view. No people, no animals, no text, no lettering, no UI, no border, no watermark. Square image.

## パン3種：assets/storybook/breads.png

Use case: illustration-story. Asset type: transparent game sprite sheet, 3 columns by 1 row, three equal square cells. Three separate plump round bread buns, centered in their own cell, identical size and viewpoint, each fully within cell with generous transparent margin. Left: pale golden milk bread bun, center: cocoa brown bread bun, right: whole wheat tan bread bun with subtle grain speckles. Each bun has one elegant curved split at the top suitable for topping separately in game. No toppings or filling, no plates, no accessories, no text, no shadows outside bun. Soft warm hand-painted watercolor storybook illustration, delicate brown outlines, appealing fluffy rounded shape, delicious bakery game art. Genuine transparent background, isolated objects. Wide 3:1 canvas.

## 広場更新：assets/storybook/town.png

Use case: precise-object-edit. Input image is edit target: storybook town game background. Add one clearly recognizable small bakery storefront in the middle distance directly behind the central fountain, replacing just the small central buildings behind it. Bakery has warm wheat yellow and cream striped awning, glowing window with bread baskets, prominent round bread-shaped wooden sign with three wheat stalks, no letters. Keep the left pink-awning salon with mirror sign, right mint-awning gift shop, foreground fountain and flowers, paving, lighting, rich painterly style, and wide landscape composition unchanged as much as possible. Bakery sign must be visible above fountain. No text, no characters, no UI, no watermark.

# 絵本版1.5・オープニング画面

組み込み image_gen を使用しました。ユーザー添付「ChatGPT Image 2026年10月23日 20_22_43.png」を構図・画風の参照、assets/storybook/characters.png を6種類のキャラクターの参照に指定しています。
保存先：assets/storybook/opening.png。文字とボタンを含まない背景で、ゲーム内の日本語タイトル・開始・再開・設定は scripts/title_view.gd で重ねます。
キャラクターの前掛けを付けない方針も維持しています。

生成指示：

Use case: illustration-story. Create a polished opening-screen BACKGROUND for the Japanese children's game Mokomoko Omise Town. Input 1 is the user's reference for composition, rich hand-painted anime storybook style, spring town, warm wood, flowers, golden hanging lights, joyful mood. Input 2 is the authoritative identity reference for all SIX animal characters: pink fluffy rabbit, cream floppy-eared puppy, lavender kitten, white sheep with golden curled horns, navy blue penguin, honey teddy bear. Keep their plush proportions and recognizable faces. Landscape 16:10, 1536x960 composition. Large blank ornate ivory scalloped wooden title plaque with thin honey-gold trim and flowers, leaves and tiny house motif occupies upper-left x3%-55%, y3%-38%, with a broad EMPTY flat ivory center for two rows of game-rendered Japanese title. Small blank ivory ribbon below plaque for a tagline. No text in either. Behind it: sunny village with a fountain, distant lavender clock tower, bunting and pastel roofs; pink-awning salon on left, welcoming flower-covered timber bakery on right with golden lamps and bread baskets and a bread emblem instead of lettering. In foreground at bottom-left and center, rabbit, puppy, penguin and kitten happily walking together with a small bouquet and bread; faces around y60%-76%, feet above90%, all characters remain to the LEFT of x66%. Sheep and teddy bear in midground by fountain around x20% and x54%, y50%. All animals have natural fluffy chests, NO bibs, NO aprons, NO dresses, NO clothing. Small flowers by ears are fine. Leave bottom-right x68%-97%, y62%-94% visually quiet, warm wooden lower shopfront and paving for interactive buttons to be added by game; NO characters or important faces in that area. Frame corners with soft-focus spring flowers, airy sky, abundant detailed charming shops. Match reference's premium illustrated game cover, NOT a UI mockup. Absolutely NO lettering, NO words, NO numbers, NO buttons, NO logos, NO watermark. Do not copy the reference's baked-in start/settings UI. Fill whole frame.

# 絵本版1.6・こっとん洋品店

組み込み image_gen を使用。CLI/APIは使用していません。事前に `references/world_reference.png` と既存パン屋を目視し、店内の色調を合わせました。服は選択によって輪郭を変えるためGDScript描画です。

## 店内：assets/storybook/tailor.png

Use case: illustration-story. Asset type: square background for a Japanese children's storybook clothing atelier game. Create a cozy tiny tailor boutique interior in a detailed hand-painted fairy-tale style: honey wooden beams, spring flowers around windows, golden pendant lamps, cream walls, sage and dusty pink fabrics neatly folded on side shelves, spools of thread and a small antique sewing machine at back left, clothing rail with a few shirts and dresses on far right. Straight-on game view. Broad quiet open center and lower area for separately rendered garment preview on a stand and an animal customer. Sunlit window and cherry blossoms outside, soft pastel colors, warm gentle inviting atmosphere, elegant readable composition. No people, no animals, no mannequin, no foreground garment, no aprons, no text, no lettering, no UI, no border, no watermark. Square image.

## 広場：assets/storybook/town_tailor.png

既存の `assets/storybook/town.png` を編集対象として入力。元画像は残しています。

Use case: precise-object-edit. Input image is the edit target: the existing storybook game town. Change ONLY the rightmost mint-awning storefront from gift shop to a clothing boutique. Replace the gift-box symbol on its wooden sign with a cute pink dress on a small wooden hanger, without letters. Change the shop display windows to a few tiny shirts, dresses and coats on hangers, with folded pastel cloth and spools. Keep the building, mint awning and door in the same position. Preserve left pink salon and mirror sign, middle bakery and bread sign, central fountain, path, spring flowers, trees, clocktower, sunlight, landscape aspect ratio, composition and painterly style. No people, no animals, no text, no UI, no watermark.

# 絵本版1.7・お花ブティック

組み込み image_gen を使用しました。CLI/APIは使用していません。既存の世界観・店内・キャラクターを基準に制作し、以下のプロジェクト内へ保存しています。花束の茎・葉・包み紙・リボンはGDScriptで描画し、選択に応じて花の画像を合成します。

## 店内：assets/storybook/florist.png

Use case: illustration-story. Asset type: square interior background for a Japanese children's storybook flower boutique game. Cozy tiny florist in the warm painterly fairy-tale world of Mokomoko Omise Town: honey wooden beams, cream walls, arched sunny windows showing a spring village, golden pendant lamps, shelves with tissue paper rolls and ribbon spools, ceramic vases of pink tulips, pink roses and yellow sunflowers along the left and right edges. A large uncluttered open center and lower area, broad honey wooden worktable along bottom 22%, for separately composited animal customer and bouquet preview. Delightful hand-painted storybook rendering, gentle detailed flowers, pastel pink and sage palette, soft golden light. Straight-on view, square image. No people, no animals, no central bouquet or vase, no text, no lettering, no UI, no border, no watermark.

## 花3種：assets/storybook/flowers.png

Use case: illustration-story. Asset type: transparent game sprite sheet, THREE equal square cells in one horizontal row, exact 3:1 aspect ratio. Three single flower HEADS viewed from front at identical scale, centered in each cell with generous transparent margin. Left cell: a soft coral pink tulip flower cup with three elegant rounded pointed petals, upright frontal view, no stem. Middle cell: a blush pink rose bloom with beautifully layered spiral petals, frontal view, no stem. Right cell: a golden yellow sunflower with warm brown seed center and overlapping rounded petals, frontal view, no stem. Each flower isolated, no overlap across cells. Rich gentle hand-painted watercolor children's storybook style, subtle warm brown edges, light shading, softly luminous petals, readable silhouettes. Absolutely no stems, no leaves, no vases, no text, no UI, no cast shadows outside flowers. Real transparent background, no checkerboard.

## 広場：assets/storybook/town_florist.png

既存の `assets/storybook/town_tailor.png` を編集対象として指定しました。元画像は残しています。

Use case: precise-object-edit. Input image is the edit target, an existing warm painterly children's storybook town game map. Expand the shopping street to FOUR clearly distinct storefronts across the frame, each taking about one quarter, from LEFT to RIGHT: pink-awning salon with oval mirror emblem, wheat-yellow-awning bakery with bread emblem, mint-awning clothing boutique with dress-on-hanger emblem, NEW lilac-awning flower boutique with a bouquet emblem and vases of pink tulips, roses and golden sunflowers in front. Make the existing buildings slightly narrower as necessary so all four shops have readable facades and entrances. Keep the familiar central fountain in the foreground between bakery and clothing boutique, spring flower beds, blossom framing, cobblestone plaza, clocktower in distance, honey timber, warm sunshine and rich hand-painted storybook style. Keep a broad clear lower foreground for game buttons. Landscape 16:9 composition. No people, no animals, no letters, no text, no UI, no watermark. The four emblems must be visibly different and centered over each shop.
