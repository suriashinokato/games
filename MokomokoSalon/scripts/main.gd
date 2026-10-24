extends Control

const Rules = preload("res://scripts/salon_model.gd")
const Store = preload("res://scripts/save_store.gd")
const Art = preload("res://scripts/salon_art.gd")
const Sound = preload("res://scripts/salon_audio.gd")
const BakeryRules = preload("res://scripts/bakery_model.gd")
const BakeryView = preload("res://scripts/bakery_view.gd")
const TitleView = preload("res://scripts/title_view.gd")
const Town = preload("res://scripts/town_view.gd")
const INK = Color("635951")
const MUTED = Color("8e8277")
const GREEN = Color("547e6e")
const CREAM = Color("fffdf7")
const ACCENT = Color("c47890")

var bakery = BakeryRules.new()
var bake_elapsed := 0.0
var model = Rules.new()
var store = Store.new()
var audio: Node
var screen: Control
var illustration: Node2D
var status_label: Label
var finish_button: Button
var selection_label: Label
var option_buttons: Array = []
var current_view := "title"
var active_game := false
var test_mode := false
var test_save_path := "user://qa/ui_save.json"
var album_page := 0
var modal: Control
var saved_data: Variant = null
var quitting := false

func _ready() -> void:
	if test_mode:
		store = Store.new(test_save_path)
	get_tree().auto_accept_quit = false
	var game_theme := Theme.new()
	if ResourceLoader.exists("res://assets/fonts/MPLUSRounded1c-Medium.ttf"):
		game_theme.default_font = load("res://assets/fonts/MPLUSRounded1c-Medium.ttf")
	else:
		var fallback := SystemFont.new()
		fallback.font_names = PackedStringArray(["Yu Gothic", "Meiryo", "sans-serif"])
		game_theme.default_font = fallback
	game_theme.default_font_size = 20
	game_theme.set_color("font_color", "Label", INK)
	theme = game_theme
	audio = Sound.new()
	add_child(audio)
	show_title()

func box(color: Color, radius: int = 20, border: Color = Color.TRANSPARENT, width: int = 0) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.set_corner_radius_all(radius)
	style.border_color = border
	style.set_border_width_all(width)
	return style

func panel(parent: Node, rect: Rect2, color: Color, radius: int = 20) -> Panel:
	var p := Panel.new()
	p.position = rect.position
	p.size = rect.size
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	p.add_theme_stylebox_override("panel", box(color, radius))
	parent.add_child(p)
	return p

func label(parent: Node, text: String, rect: Rect2, font_size: int = 20, color: Color = INK, centered: bool = false) -> Label:
	var item := Label.new()
	item.text = text
	item.position = rect.position
	item.size = rect.size
	item.add_theme_font_size_override("font_size", font_size)
	item.add_theme_color_override("font_color", color)
	item.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	item.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER if centered else HORIZONTAL_ALIGNMENT_LEFT
	item.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(item)
	return item

func button(parent: Node, text: String, rect: Rect2, callback: Callable, primary: bool = false, node_name: String = "") -> Button:
	var b := Button.new()
	b.text = text
	b.position = rect.position
	b.size = rect.size
	b.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	b.add_theme_font_size_override("font_size", 20)
	b.add_theme_color_override("font_color", CREAM if primary else INK)
	b.add_theme_color_override("font_hover_color", CREAM if primary else INK)
	b.add_theme_color_override("font_pressed_color", CREAM if primary else INK)
	b.add_theme_color_override("font_disabled_color", Color("a39e93"))
	b.add_theme_stylebox_override("normal", box(ACCENT if primary else CREAM, 16, Color("d5b993"), 2 if primary else 1))
	b.add_theme_stylebox_override("hover", box(Color("d58da3") if primary else Color("f7ede0"), 16, Color("cba974"), 2))
	b.add_theme_stylebox_override("pressed", box(Color("aa5f79") if primary else Color("e3eddf"), 16, GREEN, 2))
	b.add_theme_stylebox_override("disabled", box(Color("e5e4da"), 16))
	b.add_theme_stylebox_override("focus", box(Color.TRANSPARENT, 16, Color("cda34c"), 3))
	if not node_name.is_empty():
		b.name = node_name
	b.pressed.connect(func():
		audio.play("tap")
		callback.call())
	parent.add_child(b)
	return b

func new_screen(with_chrome: bool = true) -> void:
	if is_instance_valid(screen):
		remove_child(screen)
		screen.queue_free()
	modal = null
	illustration = null
	option_buttons.clear()
	screen = Control.new()
	screen.name = "Screen"
	screen.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(screen)
	if not with_chrome:
		return
	panel(screen, Rect2(0, 0, 1280, 800), Color("faf6ed"), 0)
	panel(screen, Rect2(0, 0, 1280, 6), Color("b3c9b6"), 0)
	label(screen, "MOKOMOKO OMISE TOWN", Rect2(36, 17, 400, 24), 13, GREEN)
	button(screen, "音：オン" if audio.enabled else "音：オフ", Rect2(1110, 27, 134, 44), toggle_sound, false, "SoundButton")
	status_label = label(screen, "", Rect2(36, 754, 1010, 28), 15, MUTED)
	label(screen, "おみせタウン  /  絵本版 1.5.1", Rect2(978, 754, 270, 28), 13, MUTED, true)
	button(screen, "おめかしアルバム", Rect2(720, 27, 208, 44), open_album, false, "AlbumButton")

func toggle_sound() -> void:
	audio.enabled = not audio.enabled
	model.state.sound = audio.enabled
	var b := screen.find_child("SoundButton", true, false) as Button
	b.text = "音：オン" if audio.enabled else "音：オフ"
	if active_game:
		save_game()
	elif saved_data != null:
		saved_data.sound = audio.enabled
		if not store.save_state(saved_data):
			status_label.text = store.message
	if audio.enabled:
		audio.play("tap")

func save_game() -> bool:
	if not active_game:
		return true
	var ok: bool = store.save_state(model.state)
	if is_instance_valid(status_label):
		status_label.text = "自動セーブ済み  ・  いつ閉じても、つづきから遊べます" if ok else store.message
		status_label.add_theme_color_override("font_color", MUTED if ok else Color("b85d52"))
	return ok

func add_room(at: Vector2, factor: float = 1.0, title: bool = false) -> void:
	illustration = Art.new()
	illustration.position = at
	illustration.scale = Vector2.ONE * factor
	if title:
		illustration.selection = [0, 0, 1]
		illustration.happy = true
	else:
		var c: Dictionary = model.customer()
		illustration.kind = c.kind
		illustration.fur = Color(c.fur)
		illustration.selection = model.state.selection.duplicate()
		illustration.happy = model.state.phase == "result" and model.state.last_score >= 70
	screen.add_child(illustration)

func show_title() -> void:
	current_view = "title"
	active_game = false
	saved_data = store.load_state()
	if saved_data != null:
		audio.enabled = saved_data.sound
	new_screen(false)
	TitleView.new().build(self)
	if saved_data != null:
		status_label.text = "おもてなし %d人  ・  合計 %d点  ・  つづきから再開できます" % [saved_data.served + saved_data.get("bakery", {}).get("served", 0), saved_data.total + saved_data.get("bakery", {}).get("total", 0)]
	if not store.message.is_empty():
		status_label.text = store.message

func request_new_game() -> void:
	if saved_data != null:
		show_modal("はじめから遊ぶ？", "２つのお店の進み具合とアルバムを置きかえます。", "はじめから遊ぶ", start_new_game)
	else:
		start_new_game()

func start_new_game() -> void:
	model = Rules.new()
	model.state.sound = audio.enabled
	active_game = true
	show_current_location()
	save_game()

func continue_game() -> void:
	saved_data = store.load_state()
	if not model.restore(saved_data):
		status_label.text = "セーブを読み込めませんでした。はじめから遊べます。"
		return
	audio.enabled = model.state.sound
	active_game = true
	show_current_location()
	status_label.text = "バックアップから再開しました" if store.recovered else "つづきから再開しました"

func show_current_location() -> void:
	bakery.state = model.state.bakery
	if model.state.location == "town":
		show_town()
	elif model.state.location == "bakery":
		show_bakery()
	else:
		show_game()

func show_town() -> void:
	current_view = "town"
	new_screen()
	Town.new().build(self)
	status_label.text = "お店のボタンをクリックすると、遊びに行けます"

func return_town() -> void:
	if not active_game:
		return
	model.state.location = "town"
	show_town()
	save_game()

func visit_place(place_id: String) -> void:
	if not active_game or current_view != "town":
		return
	if place_id == "salon":
		model.state.location = "salon"
		show_game()
		save_game()
	elif place_id == "bakery":
		model.state.location = "bakery"
		bakery.state = model.state.bakery
		show_bakery()
		save_game()
	elif place_id == "general_store":
		var holder := modal_base()
		label(holder, "こもれび雑貨店", Rect2(330, 260, 620, 48), 29, INK, true)
		label(holder, "ただいま、開店じゅんび中。\nすてきな小物を並べているよ。\nお買いものができる日を、お楽しみに！", Rect2(330, 324, 620, 115), 21, MUTED, true)
		button(holder, "楽しみにしているね", Rect2(440, 463, 400, 59), close_modal, true, "ShopCloseButton")

func show_game() -> void:
	current_view = model.state.phase
	new_screen()
	label(screen, "にこにこサロン", Rect2(36, 46, 420, 53), 34)
	label(screen, "%d日め  /  %d人め" % [model.day(), model.seat()], Rect2(678, 94, 240, 32), 18, GREEN)
	label(screen, "合計  %d pt" % model.state.total, Rect2(975, 94, 263, 32), 18, MUTED, true)
	button(screen, "タイトルへ", Rect2(944, 27, 152, 44), return_title, false, "TitleButton")
	button(screen, "広場へ", Rect2(550, 27, 152, 44), return_town, false, "TownButton")
	add_room(Vector2(28, 144))
	panel(screen, Rect2(47, 655, 572, 72), CREAM, 20)
	label(screen, "%s さん" % model.customer().name, Rect2(65, 659, 150, 58), 25, INK, true)
	label(screen, "いらっしゃいませ" if current_view == "reception" else ("また遊びにきてね" if current_view == "result" else "鏡を見ながら、おめかし中"), Rect2(219, 664, 376, 48), 18, MUTED, true)
	if current_view == "reception":
		show_reception()
	elif current_view == "dress":
		show_dressing()
	else:
		show_result()
	status_label.text = "選んだ内容と進み具合は、自動で保存されます"

func order_card(rect: Rect2) -> void:
	panel(screen, rect, Color("eef2e7"), 22)
	var x := rect.position.x + 24
	var y := rect.position.y
	label(screen, "きょうの おねがい", Rect2(x, y + 13, 480, 32), 18, GREEN)
	var request: Array = model.order()
	label(screen, "%sの「%s」" % [Rules.COLORS[request[1]], Rules.SHAPES[request[0]]], Rect2(x, y + 49, 480, 42), 27)
	label(screen, "首のリボンは、%sにしてね！" % Rules.COLORS[request[2]], Rect2(x, y + 94, 490, 35), 21)

func show_reception() -> void:
	label(screen, "いらっしゃいませ！", Rect2(678, 151, 560, 51), 31)
	label(screen, model.customer().hello, Rect2(678, 212, 560, 35), 19, MUTED)
	order_card(Rect2(678, 275, 558, 150))
	label(screen, "３つのおしゃれを、えらんでみよう。", Rect2(682, 454, 552, 38), 21)
	label(screen, "① 髪かざりの形\n② 髪かざりの色\n③ 首のリボンの色", Rect2(705, 505, 495, 112), 21, MUTED)
	button(screen, "おめかしを はじめる  →", Rect2(678, 650, 558, 64), begin_dressing, true, "DressButton")

func begin_dressing() -> void:
	if model.begin_dressing():
		audio.play("welcome")
		show_game()
		save_game()

func show_dressing() -> void:
	order_card(Rect2(678, 144, 558, 145))
	label(screen, "① 髪かざりの形", Rect2(680, 305, 550, 33), 20)
	for i in range(3):
		var b := button(screen, "", Rect2(678 + i * 190, 344, 178, 81), choose.bind(0, i), false, "Shape%d" % i)
		var art := Art.new()
		art.mode = "icon"
		art.icon_shape = i
		art.position = Vector2(89, 26)
		b.add_child(art)
		label(b, Rules.SHAPES[i], Rect2(0, 48, 178, 29), 17, INK, true)
		option_buttons.append({"button": b, "slot": 0, "value": i})
	label(screen, "② 髪かざりの色", Rect2(680, 439, 550, 32), 20)
	color_row(1, 478)
	label(screen, "③ 首のリボンの色", Rect2(680, 550, 550, 32), 20)
	color_row(2, 588)
	selection_label = label(screen, "", Rect2(681, 663, 250, 47), 17, MUTED)
	finish_button = button(screen, "これで できあがり！", Rect2(943, 665, 293, 58), finish_customer, true, "FinishButton")
	update_selection()

func color_row(slot: int, y: float) -> void:
	for i in range(4):
		var b := button(screen, "", Rect2(678 + i * 142, y, 132, 62), choose.bind(slot, i), false, "Color%d_%d" % [slot, i])
		panel(b, Rect2(14, 20, 22, 22), Rules.PALETTE[i], 11)
		label(b, Rules.COLORS[i], Rect2(41, 9, 85, 44), 17, INK, true)
		option_buttons.append({"button": b, "slot": slot, "value": i})

func choose(slot: int, value: int) -> void:
	if model.choose(slot, value):
		update_selection()
		save_game()

func update_selection() -> void:
	illustration.selection = model.state.selection.duplicate()
	illustration.queue_redraw()
	for item in option_buttons:
		var selected: bool = model.state.selection[item.slot] == item.value
		item.button.add_theme_stylebox_override("normal", box(Color("e6eee0") if selected else CREAM, 16, GREEN if selected else Color("ded6c9"), 3 if selected else 1))
		item.button.tooltip_text = "えらんでいます" if selected else "クリックしてえらぶ"
	var count: int = 3 - model.state.selection.count(-1)
	selection_label.text = "３つとも、えらべたね！" if count == 3 else "あと %dつ えらんでね" % (3 - count)
	finish_button.disabled = not model.ready_to_finish()

func finish_customer() -> void:
	if model.finish():
		audio.play("good" if model.state.last_score == 100 else "soft")
		show_game()
		save_game()

func show_result() -> void:
	var score: int = model.state.last_score
	var headline := "とっても、にこにこ！" if score == 100 else ("すてきに なったね！" if score >= 70 else "おめかし、ありがとう！")
	label(screen, headline, Rect2(678, 149, 560, 49), 30)
	panel(screen, Rect2(678, 216, 558, 139), Color("f3e6d2"), 22)
	label(screen, "%d" % score, Rect2(698, 224, 192, 87), 62, GREEN, true)
	label(screen, "/ 100 pt", Rect2(872, 249, 180, 50), 25, MUTED)
	var hearts := 5 if score == 100 else (4 if score >= 70 else (3 if score >= 40 else (2 if score > 0 else 1)))
	label(screen, "満足度  " + "★".repeat(hearts) + "☆".repeat(5 - hearts), Rect2(702, 308, 510, 34), 21, Color("ab7b43"), true)
	var request: Array = model.order()
	var expected := [Rules.SHAPES[request[0]], Rules.COLORS[request[1]], Rules.COLORS[request[2]]]
	for i in range(3):
		var matched: bool = model.state.selection[i] == request[i]
		var text := "%s  %s：%s" % ["○" if matched else "△", ["髪かざり", "かざりの色", "首のリボン"][i], expected[i]]
		label(screen, text, Rect2(696, 380 + i * 43, 530, 39), 21, GREEN if matched else Color("a47b57"))
	label(screen, "○ は、おねがいどおり！  △ は、次にためしてみよう。", Rect2(682, 518, 558, 34), 16, MUTED)
	var day_end: bool = model.state.served % 3 == 0
	if day_end:
		panel(screen, Rect2(678, 568, 558, 64), Color("eef2e7"), 16)
		label(screen, "きょうの合計 %d / 300点   ・   最高 %d点" % [model.state.day_score, model.state.best_day], Rect2(690, 573, 534, 54), 20, GREEN, true)
	else:
		label(screen, "おもてなし %d人  ・  ぴったり %d回" % [model.state.served, model.state.perfect], Rect2(686, 578, 540, 40), 20, MUTED, true)
	button(screen, "つぎの日へ  →" if day_end else "つぎのお客さまへ  →", Rect2(678, 650, 558, 64), next_customer, true, "NextButton")

func next_customer() -> void:
	var day_end: bool = model.state.phase == "result" and model.state.served % 3 == 0
	if model.next_customer():
		if day_end:
			model.state.location = "town"
		show_current_location()
		save_game()

func return_title() -> void:
	if not save_game():
		show_modal("まだ保存できていません", "タイトルに戻ると、今回の未保存の進み具合が失われます。", "保存せずに戻る", show_title)
		return
	show_title()

func close_modal() -> void:
	if is_instance_valid(modal):
		modal.get_parent().remove_child(modal)
		modal.queue_free()
	modal = null

func open_album() -> void:
	album_page = 0
	show_album()

func turn_album(direction: int) -> void:
	album_page += direction
	show_album()

func show_album() -> void:
	var entries: Array = model.state.get("album", []) if active_game else (saved_data.get("album", []) if saved_data != null else [])
	close_modal()
	modal = Control.new()
	modal.name = "AlbumModal"
	modal.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	screen.add_child(modal)
	var shade := ColorRect.new()
	shade.color = Color(0.20, 0.18, 0.16, 0.55)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	modal.add_child(shade)
	panel(modal, Rect2(60, 83, 1160, 636), CREAM, 30)
	label(modal, "おめかしアルバム", Rect2(100, 102, 700, 52), 33, INK)
	button(modal, "とじる", Rect2(1030, 108, 150, 48), close_modal, false, "AlbumCloseButton")
	label(modal, "できあがった おしゃれの思い出。新しい順に、120枚まで残せます。", Rect2(102, 160, 1050, 35), 18, MUTED)
	if entries.is_empty():
		label(modal, "はじめの１枚を、楽しみに。", Rect2(150, 300, 980, 64), 32, GREEN, true)
		label(modal, "お客さまのおめかしが完成すると、ここに自動で残ります。\n以前のバージョンで完成したおしゃれは、記録されていません。", Rect2(150, 383, 980, 85), 21, MUTED, true)
		return
	album_page = clampi(album_page, 0, entries.size() - 1)
	var entry: Dictionary = entries[entries.size() - 1 - album_page]
	var index := int(entry.index)
	var customer_data: Dictionary = Rules.CUSTOMERS[index % Rules.CUSTOMERS.size()]
	var picture := Art.new()
	picture.name = "AlbumPicture"
	picture.position = Vector2(104, 209)
	picture.scale = Vector2.ONE * 0.70
	picture.kind = customer_data.kind
	picture.selection = entry.selection.duplicate()
	picture.happy = entry.score >= 70
	picture.reduced_motion = true
	modal.add_child(picture)
	label(modal, "%s さん" % customer_data.name, Rect2(590, 233, 550, 56), 35, INK)
	label(modal, "%d日め ・ %d人め" % [index / 3 + 1, index % 3 + 1], Rect2(593, 299, 530, 37), 22, GREEN)
	label(modal, "%sの「%s」\n首のリボンは、%s" % [Rules.COLORS[int(entry.selection[1])], Rules.SHAPES[int(entry.selection[0])], Rules.COLORS[int(entry.selection[2])]], Rect2(593, 362, 540, 97), 25)
	label(modal, "にこにこチェック  %d / 100点" % entry.score, Rect2(593, 489, 540, 45), 24, GREEN)
	label(modal, "また、すてきなおしゃれをしようね。", Rect2(593, 548, 540, 40), 20, MUTED)
	button(modal, "← 新しい思い出", Rect2(220, 640, 260, 52), turn_album.bind(-1), false, "AlbumNewerButton").disabled = album_page == 0
	label(modal, "%d / %d 枚" % [album_page + 1, entries.size()], Rect2(490, 640, 300, 52), 21, INK, true)
	button(modal, "前の思い出 →", Rect2(800, 640, 260, 52), turn_album.bind(1), false, "AlbumOlderButton").disabled = album_page == entries.size() - 1

func modal_base(rect: Rect2 = Rect2(300, 240, 680, 310), shade_alpha: float = 0.34) -> Control:
	close_modal()
	modal = Control.new()
	modal.name = "Modal"
	modal.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	screen.add_child(modal)
	var shade := ColorRect.new()
	shade.color = Color(0.20, 0.18, 0.16, shade_alpha)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	modal.add_child(shade)
	panel(modal, rect, CREAM, 30)
	return modal

func show_modal(title: String, body: String, confirm: String, action: Callable) -> void:
	var holder := modal_base()
	label(holder, title, Rect2(330, 268, 620, 50), 29, INK, true)
	label(holder, body, Rect2(326, 337, 628, 60), 19, MUTED, true)
	button(holder, "もどる", Rect2(337, 448, 283, 61), close_modal, false, "CancelButton")
	button(holder, confirm, Rect2(638, 448, 305, 61), action, true, "ConfirmButton")

func show_settings() -> void:
	var holder := modal_base(Rect2(260, 210, 760, 370), 0.62)
	holder.name = "SettingsModal"
	var strong_font := FontVariation.new()
	strong_font.base_font = theme.default_font
	strong_font.variation_embolden = 0.45
	var heading := label(holder, "せってい", Rect2(300, 232, 680, 54), 36, Color("49372b"), true)
	heading.add_theme_font_override("font", strong_font)
	var sound_button := button(holder, "音：オン" if audio.enabled else "音：オフ", Rect2(304, 310, 320, 70), toggle_sound, false, "SoundButton")
	var help_button := button(holder, "あそびかた", Rect2(656, 310, 320, 70), show_help, false, "HelpButton")
	label(holder, "音のオン／オフを切り替えられます。", Rect2(300, 397, 680, 38), 22, Color("5d4838"), true)
	var quit_button := button(holder, "おしまい", Rect2(304, 470, 320, 70), quit_game, false, "QuitButton")
	var close_button := button(holder, "とじる", Rect2(656, 470, 320, 70), close_modal, true, "SettingsCloseButton")
	for item in [sound_button, help_button, quit_button, close_button]:
		item.add_theme_font_override("font", strong_font)
		item.add_theme_font_size_override("font_size", 27)
		for color_name in ["font_color", "font_hover_color", "font_pressed_color"]:
			item.add_theme_color_override(color_name, CREAM if item == close_button else Color("49372b"))
		if item != close_button:
			item.add_theme_stylebox_override("normal", box(Color("fff7e7"), 16, Color("b79572"), 2))
	close_button.add_theme_stylebox_override("normal", box(Color("426a56"), 16))
	close_button.add_theme_stylebox_override("hover", box(Color("507a64"), 16))
	close_button.add_theme_stylebox_override("pressed", box(Color("315440"), 16))

func show_help() -> void:
	var holder := modal_base()
	label(holder, "あそびかた", Rect2(330, 261, 620, 47), 29, INK, true)
	label(holder, "① 広場で、遊びたいお店をえらぼう。\n② サロンは形と色、パン屋は生地・具材・焼き加減。\n③ おねがいどおり作ると、100点！", Rect2(350, 325, 580, 112), 21)
	button(holder, "わかった！", Rect2(464, 463, 352, 59), close_modal, true, "HelpCloseButton")

func quit_game() -> void:
	if active_game and not save_game():
		show_modal("まだ保存できていません", "終了すると、今回の未保存の進み具合が失われます。", "保存せず終了", exit_safely)
	else:
		exit_safely()

func exit_safely() -> void:
	if quitting:
		return
	quitting = true
	audio.stop_all()
	await get_tree().process_frame
	await get_tree().process_frame
	get_tree().quit()

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST:
		quit_game()

func _unhandled_key_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel"):
		if is_instance_valid(modal):
			close_modal()
		elif current_view != "title":
			return_title()


func show_bakery() -> void:
	current_view = "bakery_" + bakery.state.phase
	bake_elapsed = 0.0
	new_screen()
	BakeryView.new().build(self)
	status_label.text = "生地と具材をえらんで、あなただけのパンを焼こう"

func bakery_begin() -> void:
	if bakery.begin():
		audio.play("welcome")
		show_bakery()
		save_game()

func bakery_choose(slot: int, value: int) -> void:
	if bakery.choose(slot, value):
		update_bakery_selection()
		save_game()

func update_bakery_selection() -> void:
	illustration.selection = bakery.state.selection.duplicate()
	illustration.queue_redraw()
	for item in option_buttons:
		var selected: bool = bakery.state.selection[item.slot] == item.value
		item.button.add_theme_stylebox_override("normal", box(Color("f3e4c8") if selected else CREAM, 16, GREEN if selected else Color("ded6c9"), 3 if selected else 1))
		item.button.tooltip_text = "えらんでいます" if selected else "クリックしてえらぶ"
	var missing: int = bakery.state.selection.count(-1)
	selection_label.text = "焼くじゅんびができたよ！" if missing == 0 else "あと %dつ えらんでね" % missing
	finish_button.disabled = not bakery.ready_to_bake()

func bakery_bake() -> void:
	if bakery.bake():
		show_bakery()
		save_game()

func _process(delta: float) -> void:
	if not active_game or current_view != "bakery_baking" or is_instance_valid(modal) or quitting:
		return
	bake_elapsed += delta
	var progress := minf(bake_elapsed / 3.0, 1.0)
	screen.get_node("BakeProgress").value = progress * 100
	screen.get_node("OvenArt").progress = progress
	screen.get_node("OvenArt").queue_redraw()
	if progress >= 1.0 and bakery.complete_bake():
		audio.play("good" if bakery.state.last_score == 100 else "soft")
		show_bakery()
		save_game()

func bakery_next() -> void:
	var day_end: bool = bakery.state.phase == "result" and bakery.state.served % 3 == 0
	if bakery.next_customer():
		if day_end:
			model.state.location = "town"
		show_current_location()
		save_game()
