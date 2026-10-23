extends RefCounted
## Town destinations are independent of salon progress and lifetime score.
const BACKGROUND = preload("res://assets/storybook/town.png")
const PLACES = {
	"salon": {"name": "にこにこサロン", "rect": Rect2(86, 586, 330, 64), "button": "SalonButton"},
	"bakery": {"name": "こむぎベーカリー", "rect": Rect2(475, 586, 330, 64), "button": "BakeryButton"},
	"general_store": {"name": "こもれび雑貨店", "rect": Rect2(864, 586, 330, 64), "button": "ShopButton"}
}

func build(game: Control) -> void:
	game.label(game.screen, "もこもこ 春の広場", Rect2(36, 46, 530, 53), 34)
	game.label(game.screen, "サロン %d日め  ・  パン屋 %d日め" % [game.model.day(), game.bakery.day()], Rect2(40, 96, 590, 28), 18, game.GREEN)
	game.button(game.screen, "タイトルへ", Rect2(944, 27, 152, 44), game.return_title, false, "TitleButton")
	var backdrop := TextureRect.new()
	backdrop.name = "TownBackground"
	backdrop.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	backdrop.texture = BACKGROUND
	backdrop.position = Vector2(28, 134)
	backdrop.size = Vector2(1224, 530)
	backdrop.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	backdrop.mouse_filter = Control.MOUSE_FILTER_IGNORE
	game.screen.add_child(backdrop)
	game.panel(game.screen, Rect2(880, 87, 364, 40), game.CREAM, 18)
	game.label(game.screen, "これまでのおもてなし  %d点" % (game.model.state.total + game.model.state.bakery.total), Rect2(887, 87, 350, 40), 18, game.GREEN, true)
	for place_id in PLACES:
		var place: Dictionary = PLACES[place_id]
		var caption: String = place.name + ("へ →" if place_id != "general_store" else "  準備中")
		game.button(game.screen, caption, place.rect, game.visit_place.bind(place_id), place_id != "general_store", place.button)
	game.panel(game.screen, Rect2(28, 681, 1224, 58), game.CREAM, 20)
	var message: String = "%sさんが、おめかしを楽しみにしています。" % game.model.customer().name
	if game.model.state.phase == "dress":
		message = "%sさんのおめかしは、サロンでつづきから。" % game.model.customer().name
	elif game.model.state.phase == "result":
		message = "おめかしの思い出が、またひとつ。サロンで結果を見よう。"
	game.label(game.screen, message, Rect2(52, 687, 1176, 44), 21, game.GREEN, true)
