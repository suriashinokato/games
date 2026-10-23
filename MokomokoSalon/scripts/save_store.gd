extends RefCounted
## Validate before replacing; keep the last valid save as a recovery copy.
const Rules = preload("res://scripts/salon_model.gd")
var path: String
var message := ""
var recovered := false

func _init(save_path: String = "user://salon_save.json") -> void:
	path = save_path

func read_valid(file_path: String) -> Variant:
	if not FileAccess.file_exists(file_path):
		return null
	var file := FileAccess.open(file_path, FileAccess.READ)
	if file == null or file.get_length() > 65536:
		return null
	var parser := JSON.new()
	if parser.parse(file.get_as_text()) != OK:
		return null
	return parser.data if Rules.validate(parser.data) else null

func load_state() -> Variant:
	message = ""
	recovered = false
	var data: Variant = read_valid(path)
	if data != null:
		return data
	data = read_valid(path + ".bak")
	if data != null:
		recovered = true
		message = "バックアップから再開できます。"
		return data
	if FileAccess.file_exists(path) or FileAccess.file_exists(path + ".bak"):
		message = "セーブを読み込めませんでした。はじめから遊べます。"
	return null

func save_state(data: Dictionary) -> bool:
	if not Rules.validate(data):
		message = "データを確認できないため、保存を中止しました。"
		return false
	var temp := path + ".tmp"
	var file := FileAccess.open(temp, FileAccess.WRITE)
	if file == null:
		message = "保存できませんでした。フォルダの空き容量や権限をご確認ください。"
		return false
	file.store_string(JSON.stringify(data, "\t"))
	file.flush()
	var write_error := file.get_error()
	file.close()
	if write_error != OK or read_valid(temp) == null:
		message = "保存に失敗しました。前のセーブは残しています。"
		return false
	# Copy, do not move: a failed replacement still leaves a complete primary save.
	if read_valid(path) != null:
		var copy_error := DirAccess.copy_absolute(path, path + ".bak")
		if copy_error != OK:
			message = "バックアップを保存できませんでした。"
			return false
	var error := DirAccess.rename_absolute(temp, path)
	if error != OK:
		message = "保存を完了できませんでした。前のセーブは残しています。"
		return false
	message = "保存しました"
	return true
