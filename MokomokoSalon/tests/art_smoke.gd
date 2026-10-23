extends SceneTree
## Visual review of all six sprites, before and after equipping a ribbon.
func _initialize() -> void:
	call_deferred("run")

func run() -> void:
	root.size = Vector2i(1000, 660)
	var stage := Node2D.new()
	root.add_child(stage)
	var pictures: Array = []
	var art_script = load("res://scripts/salon_art.gd")
	for i in range(6):
		var art = art_script.new()
		art.kind = ["rabbit", "dog", "cat", "sheep", "penguin", "bear"][i]
		art.position = Vector2(15 + (i % 3) * 330, 15 + (i / 3) * 330)
		art.scale = Vector2.ONE * 0.52
		art.reduced_motion = true
		stage.add_child(art)
		pictures.append(art)
	var output := OS.get_environment("MOKOMOKO_QA_DIR")
	if output.is_empty():
		output = "res://screenshots"
	DirAccess.make_dir_recursive_absolute(output)
	for equipped in [false, true]:
		for art in pictures:
			art.selection = [0, 0, 1] if equipped else [-1, -1, -1]
			art.queue_redraw()
		await process_frame
		await RenderingServer.frame_post_draw
		var path: String = output + ("/12_characters_ribbons.png" if equipped else "/11_characters_no_bibs.png")
		if root.get_texture().get_image().save_png(path) != OK:
			quit(1)
			return
	print("ART REVIEW: all 6 characters captured with and without ribbons")
	stage.queue_free()
	await process_frame
	quit()
