extends Node2D
## Garment silhouettes are native geometry so each choice changes the actual pattern.
const ROOM = preload("res://assets/storybook/tailor.png")
const CHARACTERS = preload("res://assets/storybook/characters.png")
var selection: Array = [-1, -1, -1]
var customer := 0
var mode := "room"
var icon_slot := 0
var icon_value := 0
const OUTLINE = Color("896651")
const FABRIC = Color("a3cbbb")

func shape(points: Array, tint: Color) -> void:
	var polygon := PackedVector2Array()
	for point in points:
		polygon.append(Vector2(point[0], point[1]))
	draw_colored_polygon(polygon, tint)
	polygon.append(polygon[0])
	draw_polyline(polygon, OUTLINE, 2.3, true)

func _draw() -> void:
	if mode == "icon":
		var values: Array = [0, 0, 0]
		values[icon_slot] = icon_value
		draw_set_transform(Vector2.ZERO, 0, Vector2.ONE * 0.22)
		garment(values)
		return
	draw_texture_rect(ROOM, Rect2(0, 0, 610, 510), false)
	# A sewing-pattern board keeps the full garment clear against the detailed room.
	var board := StyleBoxFlat.new()
	board.bg_color = Color("fff7e8")
	board.border_color = Color("c9a877")
	board.set_border_width_all(4)
	board.set_corner_radius_all(28)
	draw_style_box(board, Rect2(240, 72, 346, 386))
	draw_line(Vector2(414, 104), Vector2(414, 133), OUTLINE, 5, true)
	draw_arc(Vector2(420, 102), 8, -PI, PI / 2, 20, OUTLINE, 4, true)
	var source := Rect2((customer % 3) * 512, (customer / 3) * 512, 512, 512)
	draw_texture_rect_region(CHARACTERS, Rect2(-16, 193, 286, 286), source)
	if selection[0] < 0:
		draw_colored_polygon(PackedVector2Array([Vector2(414, 125), Vector2(340, 163), Vector2(488, 163)]), Color("e6c59a"))
		draw_polyline(PackedVector2Array([Vector2(414, 125), Vector2(340, 163), Vector2(488, 163), Vector2(414, 125)]), OUTLINE, 4, true)
	else:
		draw_set_transform(Vector2(414, 246), 0, Vector2.ONE * 1.15)
		garment(selection)
		draw_set_transform(Vector2.ZERO)

func garment(values: Array) -> void:
	var kind := int(values[0])
	var sleeve := int(values[1])
	var collar := int(values[2])
	var tint := FABRIC if kind == 0 else (Color("e5aabc") if kind == 1 else Color("a8bfdc"))
	# Sleeves are independent pieces; unset choices are deliberately not invented.
	if sleeve >= 0:
		for side in [-1, 1]:
			pass_transform(side)
			if sleeve == 0:
				shape([[43,-66],[65,-72],[102,-37],[78,-11],[52,-33]], tint)
			elif sleeve == 1:
				shape([[43,-66],[65,-72],[115,35],[87,47],[52,-33]], tint)
			else:
				shape([[43,-66],[64,-73],[89,-62],[106,-36],[99,-13],[77,-7],[55,-32]], tint)
			end_side()
	if kind == 0:
		shape([[-63,-72],[-23,-86],[23,-86],[63,-72],[54,-20],[58,79],[-58,79],[-54,-20]], tint)
	elif kind == 1:
		shape([[-63,-72],[-23,-86],[23,-86],[63,-72],[40,-4],[95,129],[-95,129],[-40,-4]], tint)
		draw_line(Vector2(-40,-4), Vector2(40,-4), OUTLINE, 2, true)
		for x in [-45,0,45]:
			draw_line(Vector2(x * 0.45, 18), Vector2(x,116), tint.darkened(0.10), 2, true)
	else:
		shape([[-63,-72],[-23,-86],[23,-86],[63,-72],[52,-20],[73,113],[-73,113],[-52,-20]], tint)
		for x in [-1,1]:
			shape([[x*23,52],[x*55,52],[x*54,75],[x*25,75]], tint.lightened(0.12))
	draw_arc(Vector2(0,-86), 23, 0, PI, 24, OUTLINE, 3, true)
	if collar == 0:
		for x in [-1,1]:
			draw_circle(Vector2(x*17,-66), 16, OUTLINE)
			draw_circle(Vector2(x*17,-67), 14, Color("fff6df"))
	elif collar == 1:
		shape([[-24,-85],[0,-63],[-22,-40],[-42,-72]], Color("fff6df"))
		shape([[24,-85],[0,-63],[22,-40],[42,-72]], Color("fff6df"))
	if kind != 1:
		draw_line(Vector2(0,-37), Vector2(0,70 if kind == 0 else 108), tint.darkened(0.18), 2, true)
		for y in [-22,6,34,62]:
			draw_circle(Vector2(0,y), 3.5, Color("fff6df"))
	# Tiny stitch marks retain the handmade feel at full size.
	var hem := 73 if kind == 0 else (123 if kind == 1 else 107)
	var half_width := 51 if kind == 0 else (84 if kind == 1 else 64)
	for x in range(-half_width, half_width, 12):
		draw_line(Vector2(x,hem), Vector2(x+5,hem), tint.darkened(0.18), 1.5, true)

func pass_transform(side: int) -> void:
	var origin := Vector2.ZERO if mode == "icon" else Vector2(414,246)
	var factor := 0.22 if mode == "icon" else 1.15
	draw_set_transform(origin, 0, Vector2(side * factor, factor))

func end_side() -> void:
	pass_transform(1)
