extends RefCounted
const Rules = preload("res://scripts/bakery_model.gd")
const Art = preload("res://scripts/bakery_art.gd")
const Customers = preload("res://scripts/salon_model.gd")

func build(game: Control) -> void:
	var model = game.bakery
	var phase: String = model.state.phase
	game.label(game.screen, "こむぎベーカリー", Rect2(36, 46, 470, 53), 34)
	game.label(game.screen, "%d日め  /  %d人め" % [model.day(), model.seat()], Rect2(678, 94, 240, 32), 18, game.GREEN)
	game.label(game.screen, "パン屋の合計  %d pt" % model.state.total, Rect2(954, 94, 290, 32), 18, game.MUTED, true)
	game.button(game.screen, "タイトルへ", Rect2(944, 27, 152, 44), game.return_title, false, "TitleButton")
	game.button(game.screen, "広場へ", Rect2(550, 27, 152, 44), game.return_town, false, "TownButton")
	var art := Art.new()
	art.position = Vector2(28, 144)
	art.customer = (model.customer_index() + 5) % 6
	art.selection = model.state.selection.duplicate()
	art.phase = phase
	game.screen.add_child(art)
	game.illustration = art
	game.panel(game.screen, Rect2(47, 669, 572, 58), game.CREAM)
	game.label(game.screen, "%sさん  ・  %s" % [Customers.CUSTOMERS[art.customer].name, "焼きたて、ありがとう！" if phase == "result" else "パンのいい香りがするね"], Rect2(58, 674, 550, 48), 21, game.INK, true)
	order_card(game)
	if phase == "reception":
		game.label(game.screen, "焼きたてのパンを、お願い！", Rect2(680, 315, 556, 48), 28)
		game.label(game.screen, "① 生地をえらぶ\n② おいしい具材をのせる\n③ 焼き加減をえらんで、オーブンへ", Rect2(700, 389, 530, 136), 22)
		game.label(game.screen, "時間制限はないよ。ゆっくり作ろう。", Rect2(682, 555, 554, 45), 19, game.MUTED)
		game.button(game.screen, "パンを つくる  →", Rect2(678, 650, 558, 64), game.bakery_begin, true, "BakeryBeginButton")
	elif phase == "prepare":
		for slot in range(3):
			var y := 300 + slot * 116
			game.label(game.screen, ["① 生地", "② 具材", "③ 焼き加減"][slot], Rect2(680, y, 540, 30), 20)
			for value in range(3):
				var b = game.button(game.screen, Rules.CHOICES[slot][value], Rect2(678 + value * 190, y + 36, 178, 66), game.bakery_choose.bind(slot, value), false, "BakeChoice%d_%d" % [slot, value])
				if slot == 0:
					b.text = "        " + Rules.CHOICES[slot][value]
					var icon := Art.new()
					icon.mode = "icon"
					icon.selection = [value, -1, -1]
					icon.position = Vector2(35, 33)
					b.add_child(icon)
				game.option_buttons.append({"button": b, "slot": slot, "value": value})
		game.selection_label = game.label(game.screen, "", Rect2(681, 666, 250, 45), 17, game.MUTED)
		game.finish_button = game.button(game.screen, "オーブンで 焼く！", Rect2(943, 665, 293, 58), game.bakery_bake, true, "BakeButton")
		game.update_bakery_selection()
	elif phase == "baking":
		game.label(game.screen, "オーブンで、ふっくら焼いています", Rect2(680, 304, 556, 44), 24, game.GREEN, true)
		var oven := Art.new()
		oven.name = "OvenArt"
		oven.mode = "oven"
		oven.selection = model.state.selection.duplicate()
		oven.position = Vector2(722, 367)
		game.screen.add_child(oven)
		var bar := ProgressBar.new()
		bar.name = "BakeProgress"
		bar.position = Vector2(722, 628)
		bar.size = Vector2(470, 25)
		bar.show_percentage = false
		bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
		game.screen.add_child(bar)
		game.label(game.screen, "もうすぐ焼き上がり。タイミング操作はいらないよ。", Rect2(680, 677, 556, 35), 17, game.MUTED, true)
	else:
		var score: int = model.state.last_score
		game.label(game.screen, "おねがいぴったり、焼きたて！" if score == 100 else "パンが焼けたよ、ありがとう！", Rect2(678, 304, 558, 48), 27)
		game.panel(game.screen, Rect2(678, 366, 558, 95), Color("f3e6d2"))
		game.label(game.screen, "%d / 100 pt" % score, Rect2(697, 375, 520, 76), 43, game.GREEN, true)
		for i in range(3):
			var matched: bool = model.state.selection[i] == model.order()[i]
			game.label(game.screen, "%s %s：%s" % ["○" if matched else "△", ["生地", "具材", "焼き加減"][i], Rules.CHOICES[i][model.order()[i]]], Rect2(700, 478 + i * 38, 526, 35), 21, game.GREEN if matched else Color("a47b57"))
		var day_end: bool = model.state.served % 3 == 0
		game.label(game.screen, "きょう %d / 300点  ・  最高 %d点" % [model.state.day_score, model.state.best_day] if day_end else "○ は、おねがいどおり！  △ は、次にためそう。", Rect2(682, 604, 554, 34), 18, game.MUTED, true)
		game.button(game.screen, "つぎの日へ  →" if day_end else "つぎのお客さまへ  →", Rect2(678, 650, 558, 64), game.bakery_next, true, "BakeryNextButton")

func order_card(game: Control) -> void:
	var request: Array = game.bakery.order()
	game.panel(game.screen, Rect2(678, 144, 558, 143), Color("f3ebd9"))
	game.label(game.screen, "きょうの おねがい", Rect2(702, 155, 510, 31), 18, game.GREEN)
	game.label(game.screen, "%s生地に、%sをのせてね" % [Rules.CHOICES[0][request[0]], Rules.CHOICES[1][request[1]]], Rect2(702, 195, 510, 40), 25)
	game.label(game.screen, "焼き加減は「%s」で！" % Rules.CHOICES[2][request[2]], Rect2(702, 239, 510, 35), 21)
