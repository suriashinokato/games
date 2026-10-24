extends RefCounted
## The title artwork carries no baked-in text or controls.
const BACKGROUND = preload("res://assets/storybook/opening.png")
const COLORS = [Color("ec7b8e"), Color("d68c42"), Color("ae683d"), Color("77a460"), Color("4aaab2"), Color("a17d73")]

func build(game: Control) -> void:
	var backdrop := TextureRect.new()
	backdrop.name = "TitleBackground"
	backdrop.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	backdrop.texture = BACKGROUND
	backdrop.position = Vector2.ZERO
	backdrop.size = Vector2(1280, 800)
	backdrop.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	backdrop.mouse_filter = Control.MOUSE_FILTER_IGNORE
	game.screen.add_child(backdrop)
	var rounded := FontVariation.new()
	rounded.base_font = game.theme.default_font
	rounded.variation_embolden = 1.8
	colored_title(game, "もこもこ", Vector2(217, 65), 62, 65, [Color("5ab89b"), Color("b18473"), Color("5ab89b"), Color("eb8b86")], rounded)
	colored_title(game, "おみせタウン", Vector2(108, 140), 74, 80, COLORS, rounded)
	var subtitle = game.label(game.screen, "～ やさしい毎日、つながるまち ～", Rect2(160, 236, 380, 35), 19, Color("87532c"), true)
	subtitle.add_theme_font_override("font", rounded)
	menu_button(game, "おめかしアルバム", Rect2(1002, 22, 242, 49), game.open_album, "AlbumButton", rounded)
	game.panel(game.screen, Rect2(860, 532, 366, 38), Color(1, 0.98, 0.92, 0.94), 19)
	game.label(game.screen, "サロンとパン屋で、にこにこ おもてなし", Rect2(865, 532, 356, 38), 16, Color("875c3d"), true)
	var has_save: bool = game.saved_data != null
	var start_rect := Rect2(820, 678, 200, 58) if has_save else Rect2(820, 584, 420, 76)
	var resume_rect := Rect2(820, 584, 420, 76) if has_save else Rect2(820, 678, 200, 58)
	var start = menu_button(game, "はじめから" if has_save else "はじめる", start_rect, game.request_new_game, "StartButton", rounded, not has_save)
	start.tooltip_text = "新しく遊びます。セーブがある場合は確認します。"
	var resume = menu_button(game, "つづきから", resume_rect, game.continue_game, "ContinueButton", rounded, has_save)
	resume.disabled = not has_save
	resume.tooltip_text = "保存した場面から再開します" if has_save else "はじめて遊ぶときは「はじめる」を押してね"
	var primary: Button = resume if has_save else start
	primary.add_theme_font_size_override("font_size", 34)
	for font_color in ["font_color", "font_hover_color", "font_pressed_color"]:
		primary.add_theme_color_override(font_color, Color("49372b"))
	menu_button(game, "せってい", Rect2(1036, 678, 204, 58), game.show_settings, "SettingsButton", rounded)
	game.panel(game.screen, Rect2(0, 755, 1280, 45), Color(0.31, 0.20, 0.14, 0.73), 0)
	game.label(game.screen, "絵本版 1.5.1", Rect2(28, 761, 145, 30), 15, Color("fff5df"))
	game.status_label = game.label(game.screen, "時間制限なし。ゆっくり、あなたのペースで。", Rect2(200, 761, 1040, 30), 15, Color("fff5df"))

func colored_title(game: Control, text: String, at: Vector2, font_size: int, advance: int, palette: Array, font: Font) -> void:
	for i in range(text.length()):
		var letter = game.label(game.screen, text[i], Rect2(at + Vector2(i * advance, 0), Vector2(advance + 8, font_size + 16)), font_size, palette[i % palette.size()], true)
		letter.add_theme_font_override("font", font)
		letter.add_theme_color_override("font_outline_color", Color("fffaf0"))
		letter.add_theme_constant_override("outline_size", 6)
		letter.add_theme_color_override("font_shadow_color", Color(0.54, 0.31, 0.16, 0.16))
		letter.add_theme_constant_override("shadow_offset_y", 4)

func menu_button(game: Control, text: String, rect: Rect2, action: Callable, node_name: String, font: Font, pink: bool = false) -> Button:
	var b = game.button(game.screen, text, rect, action, pink, node_name)
	b.add_theme_font_override("font", font)
	b.add_theme_font_size_override("font_size", 23 if rect.size.y > 50 else 19)
	b.add_theme_color_override("font_color", Color("865837"))
	b.add_theme_color_override("font_hover_color", Color("865837"))
	b.add_theme_color_override("font_pressed_color", Color("865837"))
	b.add_theme_color_override("font_disabled_color", Color("8e8176"))
	for state in ["normal", "hover", "pressed", "disabled"]:
		var tint := Color("ed87a0") if pink else Color("fff5df")
		if state == "hover":
			tint = Color("fa9bb0") if pink else Color("fffbea")
		elif state == "pressed":
			tint = Color("d96f8b") if pink else Color("f1dfbd")
		elif state == "disabled":
			tint = Color("e5dccd")
		var style = game.box(tint, 30, Color("fff3d6") if pink else Color("d5aa73"), 4)
		style.shadow_color = Color(0.39, 0.20, 0.13, 0.35)
		style.shadow_size = 5
		style.shadow_offset = Vector2(0, 5 if state != "pressed" else 2)
		b.add_theme_stylebox_override(state, style)
	b.add_theme_stylebox_override("focus", game.box(Color.TRANSPARENT, 30, Color("83552c"), 3))
	return b
