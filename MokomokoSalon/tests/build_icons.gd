extends SceneTree
## Rebuild icon formats from the approved generated artwork; no generative edits.
func _initialize() -> void:
	var source := Image.load_from_file("res://references/momo_icon_source.png")
	if source == null:
		quit(1)
		return
	var icon := source.duplicate() as Image
	icon.resize(256, 256, Image.INTERPOLATE_LANCZOS)
	if icon.save_png("res://assets/icon.png") != OK:
		quit(1)
		return
	var favicon := source.duplicate() as Image
	favicon.resize(32, 32, Image.INTERPOLATE_LANCZOS)
	if favicon.save_png("res://assets/favicon.png") != OK:
		quit(1)
		return
	if not write_ico(source, [16, 32, 48, 64, 128, 256], "res://assets/icon.ico"):
		quit(1)
		return
	if not write_ico(source, [16, 32, 48], "res://assets/favicon.ico"):
		quit(1)
		return
	print("ICONS: PNG 256/32 and ICO 16/32/48/64/128/256 generated")
	quit()

func write_ico(source: Image, sizes: Array, path: String) -> bool:
	var images: Array[PackedByteArray] = []
	for edge in sizes:
		var resized := source.duplicate() as Image
		resized.resize(edge, edge, Image.INTERPOLATE_LANCZOS)
		images.append(resized.save_png_to_buffer())
	var file := FileAccess.open(path, FileAccess.WRITE)
	if file == null:
		return false
	file.store_16(0)
	file.store_16(1)
	file.store_16(sizes.size())
	var offset := 6 + 16 * sizes.size()
	for i in range(sizes.size()):
		file.store_8(sizes[i] % 256)
		file.store_8(sizes[i] % 256)
		file.store_8(0)
		file.store_8(0)
		file.store_16(1)
		file.store_16(32)
		file.store_32(images[i].size())
		file.store_32(offset)
		offset += images[i].size()
	for data in images:
		file.store_buffer(data)
	file.flush()
	var ok := file.get_error() == OK
	file.close()
	return ok
