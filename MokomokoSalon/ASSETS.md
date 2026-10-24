# 素材・使用許諾

## オリジナル部分

`scripts` 以下のゲームコード、図形で描く動物・店内・小物、実行時に合成する効果音は、本試作品用に新規制作しました。
背景・動物・うさぎのアイコン画像は、ユーザー指定の共有画像を参照し、組み込み画像生成で新規制作しました。外部の音声、音楽は利用していません。
これらのオリジナル部分は同梱 `LICENSE.txt` のMIT Licenseで使用・改変・再配布できます。
ゲーム名称そのものの商標登録可否や、既存名称との重複確認は実施していません。
共有された参照画像は編集用プロジェクトの `references/world_reference.png` に保存しています。Windows版には新規生成した背景・動物画像を使用しています。生成手順は `ASSET_PROMPTS.md` を参照してください。

## M PLUS Rounded 1c Medium

- ファイル：`assets/fonts/MPLUSRounded1c-Medium.ttf`
- Copyright 2016 The Rounded M+ Project Authors.
- ライセンス：SIL Open Font License 1.1
- 配布元：https://github.com/google/fonts/tree/main/ofl/mplusrounded1c
- 使用許諾本文：`assets/fonts/OFL.txt`
- フォントは改変せず同梱しています。フォント内の著作権・ライセンス表記も確認しました。
- Google Fonts内の同プロジェクトの使用許諾本文：https://github.com/google/fonts/blob/main/ofl/roundedmplus1c/OFL.txt

## Godot Engine 4.5.1

- 公式配布元：https://godotengine.org/download/archive/4.5.1-stable/
- Windows実行用テンプレート：公式 `godotengine/godot-builds` の `4.5.1-stable` リリース
- Godot本体：MIT License、`licenses/GODOT_LICENSE.txt`
- 同梱ライブラリ等：`licenses/GODOT_COPYRIGHT.txt`
- ライセンス案内：https://godotengine.org/license/

アイコン原画は `references/momo_icon_source.png`、ゲーム用は `assets/icon.png`、Windows用は `assets/icon.ico` です。ブラウザー用に `assets/favicon.ico` と `assets/favicon.png` も用意しています。

Windows版では日本語フォントとゲームデータを実行ファイルに埋め込み、使用許諾文を `licenses` に同梱しています。

## 絵本版1.4の追加素材

- `assets/storybook/bakery.png`：花と木のぬくもりを持つパン屋の店内。
- `assets/storybook/breads.png`：ミルク・ココア・全粒粉の3種類のパン。透明背景、横3セル。
- `assets/storybook/town.png`：中央にパン屋を加えた広場。

組み込み画像生成で制作しました。既存背景を画風の基準にしています。具材、オーブンの演出、湯気はGDScriptで描画します。生成指示は `ASSET_PROMPTS.md` に記録しています。

## 絵本版1.5の追加素材

- `assets/storybook/opening.png`：タイトル画面の町並みと6人のキャラクター。ユーザー添付画像と既存のキャラクター素材を参照し、組み込み画像生成で制作しました。
- 日本語タイトルとボタンは `scripts/title_view.gd` で描画します。生成指示は `ASSET_PROMPTS.md` に記録しています。

## 絵本版1.6の追加素材

- `assets/storybook/tailor.png`：花・布・糸巻き・ミシンのある服屋の店内。既存の世界観を確認して、組み込み画像生成で制作。
- `assets/storybook/town_tailor.png`：右のお店を服屋の看板と服の陳列に変更した広場。既存の `town.png` を組み込み画像生成で編集し、別ファイルとして保存。
- 服の形・そで・えり、見本台は `scripts/tailor_art.gd` で描画。形の組み合わせ27通りを実際の輪郭に反映します。動物は既存の前掛けのない素材を使用。
- 生成指示は `ASSET_PROMPTS.md` の1.6節に記録しています。

## 絵本版1.7の追加素材

- `assets/storybook/florist.png`：花・包み紙・リボンに囲まれた花屋の店内。
- `assets/storybook/flowers.png`：チューリップ・バラ・ひまわりの花部分。透明背景、横3セル。
- `assets/storybook/town_florist.png`：左からサロン・パン屋・服屋・花屋が並ぶ広場。`town_tailor.png` を基に、組み込み画像生成で花屋を追加しました。元画像は残しています。
- 店内と花も組み込み画像生成で制作。花束の茎・葉・包み紙・中央のリボンはGDScriptで合成・描画します。キャラクターは既存素材を使用しています。
- 生成指示は `ASSET_PROMPTS.md` の1.7節を参照してください。
