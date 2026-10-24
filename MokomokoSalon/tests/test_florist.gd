extends SceneTree
const Florist = preload("res://scripts/florist_model.gd")
const Rules = preload("res://scripts/salon_model.gd")
const Bakery = preload("res://scripts/bakery_model.gd")
const Tailor = preload("res://scripts/tailor_model.gd")
const Store = preload("res://scripts/save_store.gd")
var checks := 0
var failures := 0

func check(ok: bool, message: String) -> void:
	checks += 1
	if not ok:
		failures += 1
		printerr("FAIL FLORIST: ", message)

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
			old.state.erase("florist")
			for tailor_phase in ["reception", "prepare", "result"]:
				var tailor = Tailor.new()
				if tailor_phase != "reception":
					tailor.begin()
					tailor.choose(0, 2)
				if tailor_phase == "result":
					tailor.choose(1, 1)
					tailor.choose(2, 0)
					tailor.finish()
				old.state.tailor = tailor.state
				for location in ["town", "salon", "bakery", "tailor"]:
					old.state.location = location
					var before: Dictionary = old.state.duplicate(true)
					var loaded = Rules.new()
					check(loaded.restore(JSON.parse_string(JSON.stringify(before))), "old save in every shop phase accepted")
					check(loaded.state.florist == Florist.fresh_state(), "only new shop initialized")
					loaded.state.erase("florist")
					check(loaded.state == before, "all existing fields preserved")
	var salon = Rules.new()
	salon.state.erase("florist")
	salon.state.erase("tailor")
	salon.state.erase("bakery")
	salon.state.erase("location")
	salon.state.erase("album")
	check(salon.restore(salon.state) and salon.state.location == "salon", "original version one save loads")
	for request in Florist.ORDERS:
		var perfect := 0
		for shape in range(3):
			for sleeve in range(3):
				for collar in range(3):
					var score: int = Florist.score_for([shape,sleeve,collar],request)
					var expected := (40 if shape == request[0] else 0) + (30 if sleeve == request[1] else 0) + (30 if collar == request[2] else 0)
					check(score == expected, "all 27 bouquets have exact weighted score")
					perfect += 1 if score == 100 else 0
		check(perfect == 1, "one perfect bouquet per order")
	salon.begin_dressing()
	salon.choose(0, 2)
	var maker = Florist.new()
	salon.state.florist = maker.state
	salon.state.location = "florist"
	var disk = Store.new("res://tests/_runtime/florist_save.json")
	var unchanged: Dictionary = salon.state.duplicate(true)
	unchanged.erase("florist")
	check(not maker.finish() and not maker.choose(0,0) and not maker.next_customer(), "reception rejects invalid transitions")
	for index in range(18):
		check(maker.begin() and not maker.begin(), "begin once")
		check(not maker.finish() and not maker.choose(-1,0) and not maker.choose(3,0) and not maker.choose(0,3), "incomplete and invalid selections rejected")
		maker.choose(0, maker.order()[0])
		check(disk.save_state(salon.state), "partial disk save")
		var loaded = Rules.new()
		check(loaded.restore(disk.load_state()) and loaded.state.florist.selection == [maker.order()[0],-1,-1], "partial bouquet resumes")
		maker.state = loaded.state.florist
		salon.state.florist = maker.state
		for slot in range(3):
			maker.choose(slot, maker.order()[slot] if index % 3 != 1 else (maker.order()[slot]+1)%3)
		check(maker.finish() and not maker.finish() and not maker.choose(0,0), "finish locks bouquet and awards once")
		check(maker.state.last_score == (0 if index % 3 == 1 else 100), "perfect and wrong bouquets both complete")
		check(disk.save_state(salon.state) and loaded.restore(disk.load_state()), "result disk roundtrip")
		maker.state = loaded.state.florist
		salon.state.florist = maker.state
		check(not maker.finish(), "result restore never awards twice")
		check(maker.next_customer() and not maker.next_customer(), "advance once")
		check(Florist.validate(maker.state), "next reception valid")
	check(maker.state.total == 1200 and maker.state.perfect == 12 and maker.state.best_day == 200 and maker.day() == 7 and maker.state.day_score == 0, "six days counted independently")
	var after: Dictionary = salon.state.duplicate(true)
	after.erase("florist")
	check(after == unchanged, "salon bakery album and all existing fields unchanged")
	for invalid in [null, {}, [], "bad", {"phase":"prepare"}]:
		var broken := Rules.fresh_state()
		broken.florist = invalid
		check(not Rules.validate(broken), "invalid extension rejected")
	for patch in [{"phase":"baking"},{"phase":"result"},{"selection":[0,0,3]},{"selection":[0,0,0.5]},{"selection":[0,0,0]},{"served":-1},{"served":INF},{"total":100},{"last_score":0},{"day_score":301}]:
		var broken := Florist.fresh_state()
		broken.merge(patch,true)
		check(not Florist.validate(broken), "malformed values rejected")
	for key in Florist.fresh_state():
		var broken := Florist.fresh_state()
		broken.erase(key)
		check(not Florist.validate(broken), "required field validated")
	check(disk.save_state(salon.state) and disk.save_state(salon.state), "valid backup established")
	var file := FileAccess.open(disk.path,FileAccess.WRITE)
	file.store_string('{"florist":null}')
	file.close()
	var recovered = Rules.new()
	check(recovered.restore(disk.load_state()) and recovered.state == salon.state and disk.recovered, "corruption restores all shops from backup")
	check(Rules.fresh_state().florist == Florist.fresh_state(), "new game clears floristing")
	print("FLORIST RULES: %d checks, %d failures" % [checks, failures])
	quit(1 if failures else 0)
