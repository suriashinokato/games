extends SceneTree
const Bakery = preload("res://scripts/bakery_model.gd")
const Rules = preload("res://scripts/salon_model.gd")
const Store = preload("res://scripts/save_store.gd")
var checks := 0
var failures := 0

func check(ok: bool, message: String) -> void:
	checks += 1
	if not ok:
		failures += 1
		printerr("FAIL BAKERY: ", message)

func _initialize() -> void:
	for phase in ["reception", "dress", "result"]:
		var old = Rules.new()
		if phase != "reception":
			old.begin_dressing()
			old.choose(0, 0)
		if phase == "result":
			old.choose(1, 0)
			old.choose(2, 1)
			old.finish()
		old.state.erase("bakery")
		var copy: Dictionary = old.state.duplicate(true)
		check(old.restore(JSON.parse_string(JSON.stringify(copy))), "pre-bakery save accepted")
		check(old.state.bakery == Bakery.fresh_state(), "bakery initialized without changing salon")
		old.state.erase("bakery")
		check(old.state == copy, "every salon field and album preserved")
	for request in Bakery.ORDERS:
		var perfect := 0
		for dough in range(3):
			for filling in range(3):
				for crust in range(3):
					var score: int = Bakery.score_for([dough, filling, crust], request)
					check(score >= 0 and score <= 100, "all recipes score in range")
					perfect += 1 if score == 100 else 0
		check(perfect == 1, "each order has one exact recipe")
	var salon = Rules.new()
	salon.begin_dressing()
	salon.choose(0, 2)
	var baker = Bakery.new()
	salon.state.bakery = baker.state
	var disk = Store.new("res://tests/_runtime/bakery_save.json")
	check(not baker.bake() and not baker.complete_bake() and not baker.next_customer(), "no invalid transitions at reception")
	for i in range(18):
		check(baker.begin(), "begin baking preparation")
		check(not baker.bake() and not baker.choose(3, 0) and not baker.choose(0, 3), "incomplete and invalid selections blocked")
		for slot in range(3):
			baker.choose(slot, baker.order()[slot])
		check(baker.bake() and not baker.bake(), "start oven once")
		check(not baker.choose(0, 2) and not baker.next_customer(), "oven locks recipe")
		check(disk.save_state(salon.state), "persist baking before award")
		var loaded = Rules.new()
		check(loaded.restore(disk.load_state()) and loaded.state.bakery.phase == "baking", "restore in oven")
		baker.state = loaded.state.bakery
		salon.state.bakery = baker.state
		check(baker.complete_bake() and not baker.complete_bake(), "award exactly once after restore")
		check(baker.state.total == (i + 1) * 100 and baker.state.last_score == 100, "correct cumulative score")
		check(salon.state.total == 0 and salon.state.selection == [2, -1, -1] and salon.state.album.is_empty(), "bakery does not change salon")
		check(disk.save_state(salon.state) and loaded.restore(disk.load_state()), "result disk roundtrip")
		check(Bakery.validate(loaded.state.bakery), "result valid")
		check(baker.next_customer() and not baker.next_customer(), "advance exactly once")
		check(Bakery.validate(baker.state), "next reception valid")
	check(baker.state.best_day == 300 and baker.state.day_score == 0 and baker.day() == 7, "six independent bakery days")
	for invalid in [null, {}, [], "bad", {"phase": "baking"}]:
		var broken := Rules.fresh_state()
		broken.bakery = invalid
		check(not Rules.validate(broken), "invalid nested state rejected")
	for patch in [{"phase": "dress"}, {"selection": [0, 0, 3]}, {"selection": [0, 0, 0.5]}, {"total": 100}, {"served": -1}, {"served": INF}, {"phase": "baking"}, {"last_score": 0}, {"day_score": 301}]:
		var broken := Bakery.fresh_state()
		broken.merge(patch, true)
		check(not Bakery.validate(broken), "invalid bakery fields rejected")
	for key in Bakery.fresh_state():
		var broken := Bakery.fresh_state()
		broken.erase(key)
		check(not Bakery.validate(broken), "missing bakery field rejected")
	# A malformed bakery payload recovers the whole last valid snapshot.
	check(disk.save_state(salon.state), "backup snapshot")
	var primary := FileAccess.open(disk.path, FileAccess.WRITE)
	primary.store_string('{"bakery":null}')
	primary.close()
	check(disk.load_state() != null and disk.recovered, "corrupt bakery save recovers backup")
	print("BAKERY RULES: %d checks, %d failures" % [checks, failures])
	quit(1 if failures else 0)
