extends SceneTree
var game: Control
var checks := 0
var failures := 0
var screenshots := false
var screenshot_path := "res://screenshots/"
var qa_path := "user://qa"

func check(condition: bool, description: String) -> void:
	checks += 1
	if not condition:
		failures += 1
		printerr("FAIL UI: ", description)

func _initialize() -> void:
	screenshots = DisplayServer.get_name() != "headless"
	call_deferred("run")

func settle() -> void:
	await process_frame
	await process_frame

func click(node_name: String) -> void:
	var target := game.screen.find_child(node_name, true, false) as Button
	if target == null:
		check(false, "button exists: " + node_name)
		return
	var at := target.get_global_rect().get_center()
	var move := InputEventMouseMotion.new()
	move.position = at
	root.push_input(move, true)
	for pressed in [true, false]:
		var event := InputEventMouseButton.new()
		event.position = at
		event.button_index = MOUSE_BUTTON_LEFT
		event.pressed = pressed
		root.push_input(event, true)
		await process_frame
	await settle()

func capture(file_name: String) -> void:
	if not screenshots:
		return
	await RenderingServer.frame_post_draw
	var picture := root.get_texture().get_image()
	check(picture.save_png(screenshot_path + file_name + ".png") == OK, "screenshot " + file_name)

func run() -> void:
	root.size = Vector2i(1280, 800)
	root.content_scale_size = Vector2i(1280, 800)
	root.content_scale_mode = Window.CONTENT_SCALE_MODE_CANVAS_ITEMS
	root.content_scale_aspect = Window.CONTENT_SCALE_ASPECT_KEEP
	if not OS.get_environment("MOKOMOKO_QA_DIR").is_empty():
		qa_path = OS.get_environment("MOKOMOKO_QA_DIR")
	DirAccess.make_dir_recursive_absolute(qa_path)
	if not OS.has_feature("editor"):
		screenshot_path = qa_path + "/screenshots/"
	DirAccess.make_dir_recursive_absolute(screenshot_path)
	for suffix in ["", ".bak", ".tmp"]:
		var path: String = qa_path + "/ui_save.json" + suffix
		if FileAccess.file_exists(path):
			DirAccess.remove_absolute(path)
	game = load("res://main.tscn").instantiate()
	game.test_mode = true
	game.test_save_path = qa_path + "/ui_save.json"
	root.add_child(game)
	await settle()
	check(game.current_view == "title", "title at startup")
	check((game.screen.get_node("ContinueButton") as Button).disabled, "continue disabled without save")
	await capture("01_title")
	await click("AlbumButton")
	check(game.modal.name == "AlbumModal" and not game.active_game, "empty album at title")
	await capture("08_album_empty")
	await click("StartButton")
	check(game.current_view == "title", "album blocks background buttons")
	await click("AlbumCloseButton")
	await click("HelpButton")
	check(is_instance_valid(game.modal), "help opens")
	await click("HelpCloseButton")
	check(not is_instance_valid(game.modal), "help closes")
	await click("StartButton")
	check(game.current_view == "reception", "title to reception")
	await capture("02_reception")
	await click("DressButton")
	check(game.current_view == "dress", "reception to dress")
	check(game.finish_button.disabled, "finish blocked when empty")
	await click("Shape0")
	await click("Color1_0")
	check(game.finish_button.disabled, "finish blocked when incomplete")
	var partial: Dictionary = game.model.state.duplicate(true)
	await click("AlbumButton")
	await click("AlbumCloseButton")
	check(game.model.state == partial and game.current_view == "dress", "album preserves partial outfit")
	await click("TitleButton")
	await click("ContinueButton")
	check(game.current_view == "dress" and game.model.state.selection[0] == 0 and game.model.state.selection[2] == -1, "partial outfit resumes")
	await click("Color2_1")
	check(not game.finish_button.disabled, "all choices enable finish")
	await capture("03_dress")
	await click("FinishButton")
	check(game.current_view == "result" and game.model.state.total == 100, "perfect result")
	await capture("04_result")
	check(game.model.state.album.size() == 1, "completed outfit recorded once")
	await click("AlbumButton")
	check(game.modal.get_node("AlbumPicture").selection == [0, 0, 1], "album draws actual outfit")
	check(game.modal.get_node("AlbumNewerButton").disabled and game.modal.get_node("AlbumOlderButton").disabled, "single entry page boundaries")
	await click("AlbumCloseButton")
	await click("TitleButton")
	await click("ContinueButton")
	check(game.current_view == "result" and game.model.state.total == 100, "scored result reloads without duplicate points")
	await click("NextButton")
	check(game.current_view == "reception" and game.model.customer().name == "くるみ", "next customer")
	await click("DressButton")
	await click("Shape0")
	await click("Color1_0")
	await click("Color2_1")
	await click("FinishButton")
	check(game.model.state.last_score == 0, "wrong outfit still completes")
	await capture("05_try_again_next_time")
	await click("NextButton")
	await click("DressButton")
	await click("Shape2")
	await click("Color1_2")
	await click("Color2_3")
	await click("FinishButton")
	check(game.model.state.day_score == 200 and game.model.state.best_day == 200, "daily result")
	await capture("06_day_result")
	check(game.model.state.album.size() == 3, "reload does not duplicate album")
	var before_album: Dictionary = game.model.state.duplicate(true)
	await click("AlbumButton")
	check(game.modal.get_node("AlbumPicture").kind == "cat", "album newest first")
	await capture("09_album_latest")
	await click("AlbumOlderButton")
	check(game.modal.get_node("AlbumPicture").kind == "dog" and game.modal.get_node("AlbumPicture").selection == [0, 0, 1], "zero-score outfit retained")
	await click("AlbumOlderButton")
	check(game.modal.get_node("AlbumOlderButton").disabled, "oldest page boundary")
	await click("AlbumNewerButton")
	check(game.album_page == 1, "newer navigation")
	root.size = Vector2i(960, 600)
	await settle()
	await capture("10_album_small")
	await click("AlbumCloseButton")
	check(not is_instance_valid(game.modal), "album close works at minimum size")
	root.size = Vector2i(1280, 800)
	await settle()
	check(game.model.state == before_album, "album browsing leaves progress unchanged")
	await click("TitleButton")
	await click("AlbumButton")
	check(game.modal.get_node("AlbumPicture").kind == "cat", "title album reads saved entries")
	var escape := InputEventKey.new()
	escape.keycode = KEY_ESCAPE
	escape.pressed = true
	root.push_input(escape)
	await settle()
	check(not is_instance_valid(game.modal) and game.current_view == "title", "escape closes album")
	await click("ContinueButton")
	await click("NextButton")
	check(game.model.day() == 2 and game.model.state.day_score == 0, "next day")
	await click("SoundButton")
	check(not game.audio.enabled, "mute toggles")
	await click("TitleButton")
	await click("ContinueButton")
	check(not game.audio.enabled, "mute restored")
	await click("TitleButton")
	await click("SoundButton")
	await click("ContinueButton")
	check(game.audio.enabled, "title sound preference persists")
	await click("TitleButton")
	await click("StartButton")
	check(is_instance_valid(game.modal), "new game confirmation")
	await click("CancelButton")
	await click("ContinueButton")
	check(game.model.state.served == 3 and game.model.state.album.size() == 3, "cancel preserves progress and album")
	# Verify a failed write is visible and title navigation requires a choice.
	var valid_path: String = game.store.path
	game.store.path = qa_path + "/missing/subdir/no_save.json"
	await click("TitleButton")
	check(is_instance_valid(game.modal) and game.active_game, "save failure protects unsaved progress")
	await click("CancelButton")
	game.store.path = valid_path
	await click("TitleButton")
	await click("StartButton")
	await click("ConfirmButton")
	check(game.model.state.total == 0 and game.model.state.served == 0 and game.model.state.album.is_empty(), "confirmed new game resets progress and album")
	await click("DressButton")
	root.size = Vector2i(960, 600)
	await settle()
	await capture("07_small_window")
	print("UI TESTS: %d checks, %d failures (rendered=%s)" % [checks, failures, screenshots])
	game.audio.stop_all()
	await settle()
	game.queue_free()
	await settle()
	quit(1 if failures else 0)
