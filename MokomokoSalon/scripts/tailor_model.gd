extends RefCounted
## Independent tailoring progress. Completing a garment awards points exactly once.
const CHOICES = [["シャツ", "ワンピース", "コート"], ["半そで", "長そで", "ふんわりそで"], ["まるえり", "さんかくえり", "えりなし"]]
const ORDERS = [[0, 1, 0], [1, 0, 1], [2, 2, 2], [0, 2, 1], [2, 1, 0], [1, 2, 2], [2, 0, 1], [1, 1, 0], [0, 0, 2]]
var state: Dictionary = fresh_state()

static func fresh_state() -> Dictionary:
	return {"served": 0, "total": 0, "perfect": 0, "day_score": 0, "best_day": 0,
		"phase": "reception", "selection": [-1, -1, -1], "last_score": -1}

func customer_index() -> int:
	return maxi(0, int(state.served) - (1 if state.phase == "result" else 0))

func day() -> int:
	return customer_index() / 3 + 1

func seat() -> int:
	return customer_index() % 3 + 1

func order() -> Array:
	return ORDERS[customer_index() % ORDERS.size()].duplicate()

func begin() -> bool:
	if state.phase != "reception":
		return false
	state.phase = "prepare"
	return true

func choose(slot: int, value: int) -> bool:
	if state.phase != "prepare" or slot < 0 or slot > 2 or value < 0 or value > 2:
		return false
	state.selection[slot] = value
	return true

func ready_to_finish() -> bool:
	return state.phase == "prepare" and not state.selection.has(-1)

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

static func whole(value: Variant) -> bool:
	return (value is int or value is float) and is_finite(float(value)) and float(value) == floor(float(value))

static func validate(value: Variant) -> bool:
	if not value is Dictionary:
		return false
	var d: Dictionary = value
	for key in fresh_state():
		if not d.has(key):
			return false
	for key in ["served", "total", "perfect", "day_score", "best_day", "last_score"]:
		if not whole(d[key]):
			return false
	if d.served < 0 or d.served > 1000000 or not d.phase is String or not d.phase in ["reception", "prepare", "result"]:
		return false
	if not d.selection is Array or d.selection.size() != 3:
		return false
	for n in d.selection:
		if not whole(n) or n < -1 or n > 2:
			return false
		if d.phase == "reception" and n != -1:
			return false
		if d.phase == "result" and n < 0:
			return false
	if d.total < 0 or d.total > d.served * 100 or d.perfect < 0 or d.perfect > d.served or d.perfect * 100 > d.total:
		return false
	if d.day_score < 0 or d.day_score > 300 or d.day_score > d.total or d.best_day < 0 or d.best_day > 300:
		return false
	if d.phase == "result":
		if d.served < 1 or d.last_score != score_for(d.selection, ORDERS[(int(d.served) - 1) % ORDERS.size()]) or d.day_score < d.last_score:
			return false
	elif d.last_score != -1:
		return false
	return true

static func normalized(value: Dictionary) -> Dictionary:
	var result: Dictionary = value.duplicate(true)
	for key in ["served", "total", "perfect", "day_score", "best_day", "last_score"]:
		result[key] = int(result[key])
	for i in range(3):
		result.selection[i] = int(result.selection[i])
	return result
