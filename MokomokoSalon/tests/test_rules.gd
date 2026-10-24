extends SceneTree
const Rules = preload("res://scripts/salon_model.gd")
const Store = preload("res://scripts/save_store.gd")
var checks := 0
var failures := 0

func check(condition: bool, description: String) -> void:
	checks += 1
	if not condition:
		failures += 1
		printerr("FAIL: ", description)

func _initialize() -> void:
	call_deferred("run")

func run() -> void:
	var model = Rules.new()
	check(Rules.validate(model.state), "fresh state")
	check(Rules.validate(JSON.parse_string(JSON.stringify(model.state))), "fresh state JSON roundtrip")
	check(not model.choose(0, 0), "cannot dress at reception")
	check(not model.finish(), "cannot score at reception")
	check(not model.next_customer(), "cannot skip customer")
	model.begin_dressing()
	check(not model.finish(), "cannot submit incomplete outfit")
	check(not model.choose(-1, 0) and not model.choose(3, 0), "invalid slots")
	check(not model.choose(0, 3) and not model.choose(1, 4), "invalid choices")
	for c in range(36):
		if c > 0:
			check(model.begin_dressing(), "begin customer %d" % c)
		check(model.customer_index() == c, "index before scoring")
		for slot in range(3):
			model.choose(slot, model.order()[slot])
		check(model.finish(), "finish once")
		check(model.state.last_score == 100, "perfect score")
		check(not model.finish(), "double submit blocked")
		check(not model.choose(0, 1), "result is immutable")
		check(model.customer_index() == c, "result keeps previous customer")
		check(Rules.validate(model.state), "result validates")
		var reloaded = Rules.new()
		check(reloaded.restore(JSON.parse_string(JSON.stringify(model.state))), "JSON roundtrip")
		check(not reloaded.finish(), "reload cannot award twice")
		if c % 3 == 2:
			check(model.state.day_score == 300 and model.state.best_day == 300, "daily best")
		check(model.next_customer(), "next customer")
		check(not model.next_customer(), "double next blocked")
		check(Rules.validate(model.state), "reception validates")
	check(model.state.total == 3600 and model.state.perfect == 36, "totals after 12 days")
	# All 48 possible outfits for every order: no order is impossible.
	for request in Rules.ORDERS:
		var perfect_count := 0
		for a in range(3):
			for b in range(4):
				for c in range(4):
					var score: int = Rules.score_for([a, b, c], request)
					check(score >= 0 and score <= 100, "bounded score")
					if score == 100:
						perfect_count += 1
		check(perfect_count == 1, "exactly one perfect outfit")
	check(Rules.score_for([0, 0, 0], [0, 1, 1]) == 40, "shape partial")
	check(Rules.score_for([0, 0, 0], [1, 0, 1]) == 30, "color partial")
	check(Rules.score_for([0, 0, 0], [1, 1, 1]) == 0, "all incorrect")
	for broken in [null, [], {}, {"version": 1}, "bad", 42]:
		check(not Rules.validate(broken), "invalid root rejected")
	for key in Rules.fresh_state():
		if key in ["album", "location", "bakery", "tailor", "florist"]:
			continue
		var missing: Dictionary = Rules.fresh_state()
		missing.erase(key)
		check(not Rules.validate(missing), "missing field rejected")
	for patch in [{"served": -1}, {"version": 2}, {"selection": [0, 9, 0]}, {"selection": [0.1, 0, 0]},
		{"total": 99}, {"phase": "unknown"}, {"sound": "true"}, {"day_score": 301}, {"best_day": -1},
		{"served": "1"}, {"last_score": 100}, {"phase": "result"}]:
		var damaged: Dictionary = Rules.fresh_state()
		damaged.merge(patch, true)
		check(not Rules.validate(damaged), "malformed field rejected")
	DirAccess.make_dir_recursive_absolute("res://tests/_runtime")
	var save = Store.new("res://tests/_runtime/rules_save.json")
	for suffix in ["", ".bak", ".tmp"]:
		if FileAccess.file_exists(save.path + suffix):
			DirAccess.remove_absolute(save.path + suffix)
	check(save.load_state() == null, "missing save")
	var first_save: bool = save.save_state(model.state)
	check(first_save, "first disk save: " + save.message)
	model.begin_dressing()
	model.choose(0, 2)
	check(save.save_state(model.state), "replace save with backup")
	var loaded: Variant = save.load_state()
	check(loaded != null and loaded.phase == "dress" and loaded.selection[0] == 2, "resume partial outfit")
	var bad_file := FileAccess.open(save.path, FileAccess.WRITE)
	bad_file.store_string("{ truncated")
	bad_file.close()
	loaded = save.load_state()
	check(loaded != null and save.recovered and loaded.phase == "reception", "corrupt primary recovers backup")
	check(save.save_state(model.state), "replace corrupt primary safely")
	check(save.read_valid(save.path + ".bak") != null, "good backup retained")
	var impossible = Store.new("res://tests/_runtime/missing/subdir/save.json")
	check(not impossible.save_state(model.state), "write failure reported")
	check(not save.save_state({}), "invalid save never replaces data")
	test_album()
	test_locations()
	print("RULES TESTS: %d checks, %d failures" % [checks, failures])
	quit(1 if failures else 0)

func test_album() -> void:
	var model = Rules.new()
	var store = Store.new("res://tests/_runtime/album_save.json")
	for phase in ["reception", "dress", "result"]:
		var old = Rules.new()
		if phase != "reception":
			old.begin_dressing()
			old.choose(0, 0)
		if phase == "result":
			old.choose(1, 0)
			old.choose(2, 1)
			old.finish()
		old.state.erase("album")
		old.state.erase("location")
		var legacy: Dictionary = JSON.parse_string(JSON.stringify(old.state))
		check(model.restore(legacy), "legacy save restores: " + phase)
		check(model.state.album.is_empty() and model.state.phase == phase, "legacy progress preserved without invented history")
		check(model.state.selection == [int(legacy.selection[0]), int(legacy.selection[1]), int(legacy.selection[2])] and model.state.total == legacy.total, "legacy choices and score unchanged")
		check(store.save_state(legacy) and store.load_state() != null, "legacy disk save remains readable")
		if phase == "result":
			check(not model.finish() and model.state.album.is_empty(), "legacy result not recorded or scored twice")
	model = Rules.new()
	for i in range(125):
		model.begin_dressing()
		for slot in range(3):
			model.choose(slot, 0 if i % 2 else model.order()[slot])
		model.finish()
		check(model.state.album.back().index == i, "album records customer index")
		check(model.state.album.back().score == model.state.last_score, "album records actual score")
		check(not model.finish() and model.state.album.size() == mini(i + 1, Rules.ALBUM_LIMIT), "album entry awarded once and bounded")
		model.next_customer()
	check(model.state.album.size() == 120 and model.state.album[0].index == 5, "oldest entries roll off at 120")
	check(model.state.album.back().selection != model.state.selection, "album independent of next selection")
	check(store.save_state(model.state), "full album saved within file limit")
	var restored = Rules.new()
	check(restored.restore(store.load_state()) and restored.state == model.state, "full album roundtrip")
	var snapshot: Dictionary = model.state.duplicate(true)
	model.begin_dressing()
	model.choose(0, 1)
	check(store.save_state(model.state), "album and partial game saved together")
	var broken := FileAccess.open(store.path, FileAccess.WRITE)
	broken.store_string("{ broken")
	broken.close()
	check(restored.restore(store.load_state()) and restored.state == snapshot and store.recovered, "backup recovers album and progress together")
	for invalid in [null, {}, [null], [{}], [{"index": -1, "selection": [0, 0, 1], "score": 100}],
		[{"index": 0, "selection": [-1, 0, 1], "score": 100}],
		[{"index": 0, "selection": [0, 0, 1], "score": 0}],
		[{"index": 0.5, "selection": [0, 0, 1], "score": 100}],
		[{"index": 125, "selection": [0, 0, 1], "score": 100}],
		[{"index": 0, "selection": [0, 0.5, 1], "score": 100}],
		[{"index": 0, "selection": [0, 0, 1], "score": "100"}]]:
		var damaged: Dictionary = snapshot.duplicate(true)
		damaged.album = invalid
		check(not Rules.validate(damaged), "invalid album rejected")
	var duplicate: Dictionary = snapshot.duplicate(true)
	duplicate.album.append(duplicate.album.back().duplicate(true))
	check(not Rules.validate(duplicate), "oversized album rejected")
	duplicate.album.pop_front()
	check(not Rules.validate(duplicate), "duplicate album index rejected")
	check(Rules.fresh_state().album.is_empty(), "new game clears album")

func test_locations() -> void:
	var model = Rules.new()
	check(model.state.location == "town", "new game starts in town")
	var disk = Store.new("res://tests/_runtime/location_save.json")
	for phase in ["reception", "dress", "result"]:
		var old = Rules.new()
		if phase != "reception":
			old.begin_dressing()
			old.choose(0, 0)
		if phase == "result":
			old.choose(1, 0)
			old.choose(2, 1)
			old.finish()
		old.state.erase("location")
		check(model.restore(JSON.parse_string(JSON.stringify(old.state))), "pre-town save restores")
		check(model.state.location == "salon" and model.state.phase == phase, "legacy exact salon phase retained")
		check(model.state.album == old.state.album, "legacy album preserved")
		for destination in ["town", "salon"]:
			model.state.location = destination
			check(disk.save_state(model.state), "save location and phase")
			var reloaded = Rules.new()
			check(reloaded.restore(disk.load_state()) and reloaded.state == model.state, "location disk roundtrip")
			check(reloaded.state.version == 1, "save format version retained")
	for value in [null, 1, [], {}, "shop", "", true]:
		var broken: Dictionary = Rules.fresh_state()
		broken.location = value
		check(not Rules.validate(broken), "invalid location rejected")
