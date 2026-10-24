extends SceneTree
const Tailor = preload("res://scripts/tailor_model.gd")
const Rules = preload("res://scripts/salon_model.gd")
const Bakery = preload("res://scripts/bakery_model.gd")
const Store = preload("res://scripts/save_store.gd")
var checks := 0
var failures := 0

func check(ok: bool, message: String) -> void:
	checks += 1
	if not ok:
		failures += 1
		printerr("FAIL TAILOR: ", message)

func _initialize() -> void:
	for salon_phase in ["reception", "dress", "result"]:
		for bakery_phase in ["reception", "prepare", "baking", "result"]:
			var old = Rules.new()
			if salon_phase != "reception":
				old.begin_dressing()
				old.choose(0, 2)
			if salon_phase == "result":
				old.choose(1, 0)
				old.choose(2, 1)
				old.finish()
			var baker = Bakery.new()
			if bakery_phase != "reception":
				baker.begin()
				baker.choose(0, 1)
			if bakery_phase in ["baking", "result"]:
				baker.choose(1, 2)
				baker.choose(2, 0)
				baker.bake()
			if bakery_phase == "result":
				baker.complete_bake()
			old.state.bakery = baker.state
			old.state.erase("tailor")
			for location in ["town", "salon", "bakery"]:
				old.state.location = location
				var before: Dictionary = old.state.duplicate(true)
				var loaded = Rules.new()
				check(loaded.restore(JSON.parse_string(JSON.stringify(before))), "old save in every shop phase accepted")
				check(loaded.state.tailor == Tailor.fresh_state(), "only new shop initialized")
				loaded.state.erase("tailor")
				check(loaded.state == before, "all existing fields preserved")
	var salon = Rules.new()
	salon.state.erase("tailor")
	salon.state.erase("bakery")
	salon.state.erase("location")
	salon.state.erase("album")
	check(salon.restore(salon.state) and salon.state.location == "salon", "original version one save loads")
	for request in Tailor.ORDERS:
		var perfect := 0
		for shape in range(3):
			for sleeve in range(3):
				for collar in range(3):
					var score: int = Tailor.score_for([shape,sleeve,collar],request)
					check(score in [0,30,40,60,70,100], "all 27 combinations score correctly")
					perfect += 1 if score == 100 else 0
		check(perfect == 1, "one perfect garment per order")
	salon.begin_dressing()
	salon.choose(0, 2)
	var maker = Tailor.new()
	salon.state.tailor = maker.state
	salon.state.location = "tailor"
	var disk = Store.new("res://tests/_runtime/tailor_save.json")
	var unchanged: Dictionary = salon.state.duplicate(true)
	unchanged.erase("tailor")
	check(not maker.finish() and not maker.choose(0,0) and not maker.next_customer(), "reception rejects invalid transitions")
	for index in range(18):
		check(maker.begin() and not maker.begin(), "begin once")
		check(not maker.finish() and not maker.choose(-1,0) and not maker.choose(3,0) and not maker.choose(0,3), "incomplete and invalid selections rejected")
		maker.choose(0, maker.order()[0])
		check(disk.save_state(salon.state), "partial disk save")
		var loaded = Rules.new()
		check(loaded.restore(disk.load_state()) and loaded.state.tailor.selection == [maker.order()[0],-1,-1], "partial garment resumes")
		maker.state = loaded.state.tailor
		salon.state.tailor = maker.state
		for slot in range(3):
			maker.choose(slot, maker.order()[slot] if index % 3 != 1 else (maker.order()[slot]+1)%3)
		check(maker.finish() and not maker.finish() and not maker.choose(0,0), "finish locks garment and awards once")
		check(maker.state.last_score == (0 if index % 3 == 1 else 100), "perfect and wrong garments both complete")
		check(disk.save_state(salon.state) and loaded.restore(disk.load_state()), "result disk roundtrip")
		maker.state = loaded.state.tailor
		salon.state.tailor = maker.state
		check(not maker.finish(), "result restore never awards twice")
		check(maker.next_customer() and not maker.next_customer(), "advance once")
		check(Tailor.validate(maker.state), "next reception valid")
	check(maker.state.total == 1200 and maker.state.perfect == 12 and maker.state.best_day == 200 and maker.day() == 7 and maker.state.day_score == 0, "six days counted independently")
	var after: Dictionary = salon.state.duplicate(true)
	after.erase("tailor")
	check(after == unchanged, "salon bakery album and all existing fields unchanged")
	for invalid in [null, {}, [], "bad", {"phase":"prepare"}]:
		var broken := Rules.fresh_state()
		broken.tailor = invalid
		check(not Rules.validate(broken), "invalid extension rejected")
	for patch in [{"phase":"baking"},{"phase":"result"},{"selection":[0,0,3]},{"selection":[0,0,0.5]},{"selection":[0,0,0]},{"served":-1},{"served":INF},{"total":100},{"last_score":0},{"day_score":301}]:
		var broken := Tailor.fresh_state()
		broken.merge(patch,true)
		check(not Tailor.validate(broken), "malformed values rejected")
	for key in Tailor.fresh_state():
		var broken := Tailor.fresh_state()
		broken.erase(key)
		check(not Tailor.validate(broken), "required field validated")
	check(disk.save_state(salon.state) and disk.save_state(salon.state), "valid backup established")
	var file := FileAccess.open(disk.path,FileAccess.WRITE)
	file.store_string('{"tailor":null}')
	file.close()
	var recovered = Rules.new()
	check(recovered.restore(disk.load_state()) and recovered.state == salon.state and disk.recovered, "corruption restores all shops from backup")
	check(Rules.fresh_state().tailor == Tailor.fresh_state(), "new game clears tailoring")
	print("TAILOR RULES: %d checks, %d failures" % [checks, failures])
	quit(1 if failures else 0)
