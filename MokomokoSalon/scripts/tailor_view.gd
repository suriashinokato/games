extends RefCounted
const Rules = preload("res://scripts/tailor_model.gd")
const Art = preload("res://scripts/tailor_art.gd")
const Customers = preload("res://scripts/salon_model.gd")
const PARTS = ["服の形", "そでの形", "えりの形"]

func build(game: Control) -> void:
	var model = game.tailor
	var phase: String = model.state.phase
	game.label(game.screen, "こっとん洋品店", Rect2(36,46,470,53), 34)
	game.label(game.screen, "%d日め  /  %d人め" % [model.day(), model.seat()], Rect2(678,94,240,32), 18, game.GREEN)
	game.label(game.screen, "服屋の合計  %d pt" % model.state.total, Rect2(954,94,290,32), 18, game.MUTED, true)
	game.button(game.screen, "タイトルへ", Rect2(944,27,152,44), game.return_title, false, "TitleButton")
	game.button(game.screen, "広場へ", Rect2(550,27,152,44), game.return_town, false, "TownButton")
	var art := Art.new()
	art.position = Vector2(28,144)
	art.customer = model.customer_index() % 6
	art.selection = model.state.selection.duplicate()
	game.screen.add_child(art)
	game.illustration = art
	game.panel(game.screen, Rect2(47,669,572,58), game.CREAM)
	game.label(game.screen, "%sさん ・ %s" % [Customers.CUSTOMERS[art.customer].name, "すてきなお洋服、ありがとう！" if phase == "result" else "どんな形のお洋服ができるかな？"], Rect2(58,674,550,48), 20, game.INK, true)
	game.label(game.screen, "えらんだ形が、ここに見えるよ", Rect2(276,605,328,34), 17, game.INK, true)
	order_card(game)
	if phase == "reception":
		game.label(game.screen, "わたしのお洋服を、仕立ててね！", Rect2(678,315,558,48), 27)
		game.label(game.screen, "① シャツ・ワンピース・コート\n② そでの形をえらぶ\n③ えりの形をえらんで、できあがり", Rect2(700,389,530,136), 22)
		game.label(game.screen, "見本を見ながら、何度でも選び直せるよ。", Rect2(682,555,554,45), 19, game.MUTED)
		game.button(game.screen, "服を つくる  →", Rect2(678,650,558,64), game.tailor_begin, true, "TailorBeginButton")
	elif phase == "prepare":
		for slot in range(3):
			var y := 297 + slot * 119
			game.label(game.screen, ["① 服の形", "② そでの形", "③ えりの形"][slot], Rect2(680,y,540,28), 20)
			for value in range(3):
				var b = game.button(game.screen, "", Rect2(678+value*190,y+31,178,80), game.tailor_choose.bind(slot,value), false, "TailorChoice%d_%d" % [slot,value])
				var icon := Art.new()
				icon.mode = "icon"
				icon.icon_slot = slot
				icon.icon_value = value
				icon.position = Vector2(89,26)
				b.add_child(icon)
				game.label(b, Rules.CHOICES[slot][value], Rect2(0,51,178,27), 17, game.INK, true)
				game.option_buttons.append({"button":b,"slot":slot,"value":value})
		game.selection_label = game.label(game.screen, "", Rect2(681,666,250,45), 17, game.MUTED)
		game.finish_button = game.button(game.screen, "この形で 仕立てる！", Rect2(943,665,293,58), game.tailor_finish, true, "TailorFinishButton")
		game.update_tailor_selection()
	else:
		var score: int = model.state.last_score
		game.label(game.screen, "おねがいぴったりのお洋服！" if score == 100 else "お洋服ができたよ、ありがとう！", Rect2(678,304,558,48), 27)
		game.panel(game.screen, Rect2(678,366,558,95), Color("f1e6ed"))
		game.label(game.screen, "%d / 100 pt" % score, Rect2(697,375,520,76), 43, game.GREEN, true)
		for i in range(3):
			var matched: bool = model.state.selection[i] == model.order()[i]
			game.label(game.screen, "%s %s：%s" % ["○" if matched else "△",PARTS[i],Rules.CHOICES[i][model.order()[i]]], Rect2(700,478+i*38,526,35), 21, game.GREEN if matched else Color("a47b57"))
		var day_end: bool = model.state.served % 3 == 0
		game.label(game.screen, "きょう %d / 300点 ・ 最高 %d点" % [model.state.day_score,model.state.best_day] if day_end else "○ は、おねがいどおり！ △ は、次にためそう。", Rect2(682,604,554,34), 18, game.MUTED, true)
		game.button(game.screen, "つぎの日へ →" if day_end else "つぎのお客さまへ →", Rect2(678,650,558,64), game.tailor_next, true, "TailorNextButton")

func order_card(game: Control) -> void:
	var request: Array = game.tailor.order()
	game.panel(game.screen, Rect2(678,144,558,143), Color("f1e6ed"))
	game.label(game.screen, "きょうの おねがい", Rect2(702,155,510,31), 18, game.GREEN)
	game.label(game.screen, "「%s」をつくってね" % Rules.CHOICES[0][request[0]], Rect2(702,195,510,40), 27)
	game.label(game.screen, "%s ・ %s がいいな！" % [Rules.CHOICES[1][request[1]],Rules.CHOICES[2][request[2]]], Rect2(702,239,510,35), 22)
