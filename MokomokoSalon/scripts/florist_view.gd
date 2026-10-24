extends RefCounted
const Rules = preload("res://scripts/florist_model.gd")
const Art = preload("res://scripts/florist_art.gd")
const Customers = preload("res://scripts/salon_model.gd")
const PARTS = ["お花", "包み紙", "リボン"]

func build(game: Control) -> void:
	var model = game.florist
	var phase: String = model.state.phase
	game.label(game.screen, "お花ブティック", Rect2(36,46,470,53), 34)
	game.label(game.screen, "%d日め  /  %d人め" % [model.day(), model.seat()], Rect2(678,94,240,32), 18, game.GREEN)
	game.label(game.screen, "花屋の合計  %d pt" % model.state.total, Rect2(954,94,290,32), 18, game.MUTED, true)
	game.button(game.screen, "タイトルへ", Rect2(944,27,152,44), game.return_title, false, "TitleButton")
	game.button(game.screen, "広場へ", Rect2(550,27,152,44), game.return_town, false, "TownButton")
	var art := Art.new()
	art.position = Vector2(28,144)
	art.customer = model.customer_index() % 6
	art.selection = model.state.selection.duplicate()
	game.screen.add_child(art)
	game.illustration = art
	game.panel(game.screen, Rect2(47,669,572,58), game.CREAM)
	game.label(game.screen, "%sさん ・ %s" % [Customers.CUSTOMERS[art.customer].name, "すてきな花束、ありがとう！" if phase == "result" else "お花のいい香りがするね"], Rect2(58,674,550,48), 20, game.INK, true)
	game.label(game.screen, "えらんだ花束が、ここに見えるよ", Rect2(300,570,302,34), 16, game.INK, true)
	order_card(game)
	if phase == "reception":
		game.label(game.screen, "とっておきの花束を、お願い！", Rect2(678,315,558,48), 27)
		game.label(game.screen, "① お花の種類をえらぶ\n② 包み紙をえらぶ\n③ リボンを結んで、できあがり", Rect2(700,389,530,136), 22)
		game.label(game.screen, "見本を見ながら、何度でも選び直せるよ。", Rect2(682,555,554,45), 19, game.MUTED)
		game.button(game.screen, "花束を つくる  →", Rect2(678,650,558,64), game.florist_begin, true, "FloristBeginButton")
	elif phase == "prepare":
		for slot in range(3):
			var y := 297 + slot * 119
			game.label(game.screen, ["① お花", "② 包み紙", "③ リボン"][slot], Rect2(680,y,540,28), 20)
			for value in range(3):
				var b = game.button(game.screen, "", Rect2(678+value*190,y+31,178,80), game.florist_choose.bind(slot,value), false, "FloristChoice%d_%d" % [slot,value])
				var icon := Art.new()
				icon.mode = "icon"
				icon.icon_slot = slot
				icon.icon_value = value
				icon.position = Vector2(89,26)
				b.add_child(icon)
				game.label(b, Rules.CHOICES[slot][value], Rect2(0,51,178,27), 17, game.INK, true)
				game.option_buttons.append({"button":b,"slot":slot,"value":value})
		game.selection_label = game.label(game.screen, "", Rect2(681,666,250,45), 17, game.MUTED)
		game.finish_button = game.button(game.screen, "この花束を わたす！", Rect2(943,665,293,58), game.florist_finish, true, "FloristFinishButton")
		game.update_florist_selection()
	else:
		var score: int = model.state.last_score
		game.label(game.screen, "おねがいぴったりの花束！" if score == 100 else "花束ができたよ、ありがとう！", Rect2(678,304,558,48), 27)
		game.panel(game.screen, Rect2(678,366,558,95), Color("eee5f4"))
		game.label(game.screen, "%d / 100 pt" % score, Rect2(697,375,520,76), 43, game.GREEN, true)
		for i in range(3):
			var matched: bool = model.state.selection[i] == model.order()[i]
			game.label(game.screen, "%s %s：%s" % ["○" if matched else "△",PARTS[i],Rules.CHOICES[i][model.order()[i]]], Rect2(700,478+i*38,526,35), 21, game.GREEN if matched else Color("a47b57"))
		var day_end: bool = model.state.served % 3 == 0
		game.label(game.screen, "きょう %d / 300点 ・ 最高 %d点" % [model.state.day_score,model.state.best_day] if day_end else "○ は、おねがいどおり！ △ は、次にためそう。", Rect2(682,604,554,34), 18, game.MUTED, true)
		game.button(game.screen, "つぎの日へ →" if day_end else "つぎのお客さまへ →", Rect2(678,650,558,64), game.florist_next, true, "FloristNextButton")

func order_card(game: Control) -> void:
	var request: Array = game.florist.order()
	game.panel(game.screen, Rect2(678,144,558,143), Color("eee5f4"))
	game.label(game.screen, "きょうの おねがい", Rect2(702,155,510,31), 18, game.GREEN)
	game.label(game.screen, "「%s」の花束がいいな" % Rules.CHOICES[0][request[0]], Rect2(702,195,510,40), 27)
	game.label(game.screen, "包み紙：%s ／ リボン：%s" % [Rules.CHOICES[1][request[1]],Rules.CHOICES[2][request[2]]], Rect2(702,239,510,35), 19)
