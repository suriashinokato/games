extends RefCounted
## Pure game rules. Each customer can be scored only once.

const SHAPES = ["おはな", "おほしさま", "リボン"]
const COLORS = ["ももいろ", "ミント", "そらいろ", "きいろ"]
const ALBUM_LIMIT = 120
const PALETTE = [Color("e999af"), Color("83c6b0"), Color("8ebcde"), Color("eac66f")]
const CUSTOMERS = [
	{"name": "もも", "kind": "rabbit", "fur": "fff2e6", "hello": "おさんぽに行くんだ。かわいくしてね！"},
	{"name": "くるみ", "kind": "dog", "fur": "ddbc98", "hello": "おともだちと、お茶のじかんなの。"},
	{"name": "みるく", "kind": "cat", "fur": "f8f3e8", "hello": "おひさまの下で、写真をとりたいな。"},
	{"name": "ふわり", "kind": "sheep", "fur": "f4e7dc", "hello": "今日は、ちょっとおめかししたい気分。"},
	{"name": "そら", "kind": "penguin", "fur": "c4d5dc", "hello": "お花畑にぴったりの、おしゃれをお願い！"},
	{"name": "こむぎ", "kind": "bear", "fur": "e6ce9d", "hello": "きみのサロン、楽しみにしていたよ！"}
]
const ORDERS = [[0, 0, 1], [1, 3, 0], [2, 2, 3], [0, 1, 2], [1, 2, 1], [2, 0, 2],
	[0, 3, 0], [2, 1, 3], [1, 0, 2], [0, 2, 1], [2, 3, 0], [1, 1, 3]]
var state: Dictionary = fresh_state()

static func fresh_state() -> Dictionary:
	return {"version": 1, "served": 0, "total": 0, "perfect": 0, "day_score": 0,
		"best_day": 0, "phase": "reception", "selection": [-1, -1, -1],
		"last_score": -1, "sound": true, "album": []}

func customer_index() -> int:
	return maxi(0, int(state.served) - (1 if state.phase == "result" else 0))

func customer() -> Dictionary:
	return CUSTOMERS[customer_index() % CUSTOMERS.size()]

func order() -> Array:
	return order_for(customer_index())

static func order_for(index: int) -> Array:
	return ORDERS[index % ORDERS.size()].duplicate()

func day() -> int:
	return customer_index() / 3 + 1

func seat() -> int:
	return customer_index() % 3 + 1

func begin_dressing() -> bool:
	if state.phase != "reception":
		return false
	state.phase = "dress"
	return true

func choose(slot: int, value: int) -> bool:
	if state.phase != "dress" or slot < 0 or slot > 2:
		return false
	if value < 0 or value >= (3 if slot == 0 else 4):
		return false
	state.selection[slot] = value
	return true

func ready_to_finish() -> bool:
	return state.phase == "dress" and not state.selection.has(-1)

static func score_for(selection: Array, request: Array) -> int:
	var score := 0
	for i in range(3):
		if selection[i] == request[i]:
			score += [40, 30, 30][i]
	return score

func finish() -> bool:
	if not ready_to_finish():
		return false
	var score := score_for(state.selection, order())
	state.last_score = score
	state.total += score
	state.day_score += score
	state.served += 1
	if score == 100:
		state.perfect += 1
	if state.served % 3 == 0:
		state.best_day = maxi(state.best_day, state.day_score)
	state.phase = "result"
	state.album.append({"index": state.served - 1, "selection": state.selection.duplicate(), "score": score})
	if state.album.size() > ALBUM_LIMIT:
		state.album.pop_front()
	return true

func next_customer() -> bool:
	if state.phase != "result":
		return false
	if state.served % 3 == 0:
		state.day_score = 0
	state.selection = [-1, -1, -1]
	state.last_score = -1
	state.phase = "reception"
	return true

static func validate(value: Variant) -> bool:
	if not value is Dictionary:
		return false
	var d: Dictionary = value
	for key in fresh_state():
		if key == "album":
			continue # Optional extension: original version-1 saves remain valid.
		if not d.has(key):
			return false
	for key in ["version", "served", "total", "perfect", "day_score", "best_day", "last_score"]:
		if not (d[key] is int or d[key] is float):
			return false
		if not is_finite(float(d[key])) or float(d[key]) != floor(float(d[key])):
			return false
	if d.version != 1 or d.served < 0 or d.served > 1000000:
		return false
	if not d.phase is String or not d.phase in ["reception", "dress", "result"]:
		return false
	if not d.sound is bool or not d.selection is Array or d.selection.size() != 3:
		return false
	for i in range(3):
		var n: Variant = d.selection[i]
		if not (n is int or n is float) or not is_finite(float(n)) or float(n) != floor(float(n)):
			return false
		if n < -1 or n >= (3 if i == 0 else 4):
			return false
		if d.phase == "result" and n < 0:
			return false
		if d.phase == "reception" and n != -1:
			return false
	if d.total < 0 or d.total > d.served * 100 or d.perfect < 0 or d.perfect > d.served:
		return false
	if d.perfect * 100 > d.total or d.day_score < 0 or d.day_score > 300:
		return false
	if d.best_day < 0 or d.best_day > 300 or d.day_score > d.total:
		return false
	if d.phase == "result":
		if d.served < 1 or d.selection.has(-1):
			return false
		if d.last_score != score_for(d.selection, order_for(int(d.served) - 1)):
			return false
		if d.day_score < d.last_score:
			return false
	else:
		if d.last_score != -1:
			return false
	return validate_album(d.get("album", []), int(d.served))

static func whole_number(value: Variant) -> bool:
	return (value is int or value is float) and is_finite(float(value)) and float(value) == floor(float(value))

static func validate_album(value: Variant, served: int) -> bool:
	if not value is Array or value.size() > ALBUM_LIMIT:
		return false
	var previous := -1
	for entry in value:
		if not entry is Dictionary or not entry.has_all(["index", "selection", "score"]):
			return false
		if not whole_number(entry.index) or entry.index <= previous or entry.index >= served:
			return false
		if not entry.selection is Array or entry.selection.size() != 3:
			return false
		for i in range(3):
			var n: Variant = entry.selection[i]
			if not whole_number(n) or n < 0 or n >= (3 if i == 0 else 4):
				return false
		if not whole_number(entry.score) or entry.score != score_for(entry.selection, order_for(int(entry.index))):
			return false
		previous = int(entry.index)
	return true

func restore(value: Variant) -> bool:
	if not validate(value):
		return false
	state = value.duplicate(true)
	if not state.has("album"):
		state.album = []
	for key in ["version", "served", "total", "perfect", "day_score", "best_day", "last_score"]:
		state[key] = int(state[key])
	for i in range(3):
		state.selection[i] = int(state.selection[i])
	for entry in state.album:
		entry.index = int(entry.index)
		entry.score = int(entry.score)
		for i in range(3):
			entry.selection[i] = int(entry.selection[i])
	return true
