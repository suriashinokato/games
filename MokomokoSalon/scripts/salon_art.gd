extends Node2D
## Storybook sprites with separately drawn, changeable accessories.
const Rules = preload("res://scripts/salon_model.gd")
const INK = Color("79675f")
const ROOM_TEXTURE = preload("res://assets/storybook/salon.png")
const CHARACTER_TEXTURE = preload("res://assets/storybook/characters.png")
const SPRITE_INDEX = {"rabbit": 0, "dog": 1, "cat": 2, "sheep": 3, "penguin": 4, "bear": 5}
const CHARACTER_RECT = Rect2(135, 112, 340, 340)
# Neck center in each 512px sprite cell. The animals are not centered identically.
const NECK_ANCHORS = {
	"rabbit": Vector2(280, 398), "dog": Vector2(258, 389),
	"cat": Vector2(248, 398), "sheep": Vector2(275, 355),
	"penguin": Vector2(256, 345), "bear": Vector2(257, 346)
}
var kind := "rabbit"
var fur := Color("fff2e6")
var selection: Array = [-1, -1, -1]
var happy := false
var mode := "room"
var icon_shape := 0
var icon_color := Color("e999af")
var clock := 0.0
var reduced_motion := false

func _process(delta: float) -> void:
	if mode != "room" or reduced_motion:
		return
	clock += delta
	queue_redraw()

func rounded(rect: Rect2, color: Color, radius: int, border: Color = Color.TRANSPARENT, width: int = 0) -> void:
	var box := StyleBoxFlat.new()
	box.bg_color = color
	box.set_corner_radius_all(radius)
	box.border_color = border
	box.set_border_width_all(width)
	draw_style_box(box, rect)

func ellipse(center: Vector2, radii: Vector2, color: Color, outline: bool = false) -> void:
	var points := PackedVector2Array()
	for i in range(65):
		var angle := TAU * i / 64.0
		points.append(center + Vector2(cos(angle), sin(angle)) * radii)
	draw_colored_polygon(points, color)
	if outline:
		draw_polyline(points, INK, 3.0, true)

func line(a: Vector2, b: Vector2, color: Color = INK, width: float = 3.0) -> void:
	draw_line(a, b, color, width, true)

func accessory(shape: int, center: Vector2, color: Color, factor: float = 1.0) -> void:
	if shape == 0:
		for i in range(5):
			var angle := TAU * i / 5.0 - PI / 2.0
			draw_circle(center + Vector2(cos(angle), sin(angle)) * 17.0 * factor, 14.0 * factor, color)
		draw_circle(center, 10.0 * factor, Color("fff1ba"))
		draw_circle(center + Vector2(-2, -3) * factor, 3.0 * factor, Color("fffaf0"))
	elif shape == 1:
		var points := PackedVector2Array()
		for i in range(10):
			var angle := TAU * i / 10.0 - PI / 2.0
			points.append(center + Vector2(cos(angle), sin(angle)) * (32.0 if i % 2 == 0 else 16.0) * factor)
		draw_colored_polygon(points, color)
		line(center + Vector2(-4, -11) * factor, center + Vector2(-9, -1) * factor, color.lightened(0.5), 3)
	else:
		var left := PackedVector2Array([center, center + Vector2(-34, -22) * factor, center + Vector2(-34, 22) * factor])
		var right := PackedVector2Array([center, center + Vector2(34, -22) * factor, center + Vector2(34, 22) * factor])
		draw_colored_polygon(left, color)
		draw_colored_polygon(right, color)
		line(center + Vector2(-25, -8) * factor, center + Vector2(-9, -2) * factor, color.darkened(0.12), 2)
		line(center + Vector2(25, -8) * factor, center + Vector2(9, -2) * factor, color.darkened(0.12), 2)
		draw_circle(center, 10 * factor, color.lightened(0.14))

func plant(at: Vector2, factor: float = 1.0) -> void:
	line(at, at + Vector2(0, -96) * factor, Color("85a48d"), 4)
	for i in range(3):
		var p := at + Vector2(0, -28 - i * 26) * factor
		ellipse(p + Vector2(-15, -11) * factor, Vector2(20, 10) * factor, Color("a1c5aa"))
		ellipse(p + Vector2(15, -19) * factor, Vector2(20, 10) * factor, Color("83af96"))
	rounded(Rect2(at + Vector2(-26, -8) * factor, Vector2(52, 48) * factor), Color("daa98b"), 9)
	line(at + Vector2(-26, 1) * factor, at + Vector2(26, 1) * factor, Color("edc3a5"), 6)

func room() -> void:
	rounded(Rect2(0, 0, 610, 570), Color("f4e9df"), 30)
	for x in range(28, 610, 38):
		line(Vector2(x, 12), Vector2(x, 439), Color("efe0d4"), 2)
	rounded(Rect2(0, 437, 610, 133), Color("ddc7b0"), 28)
	line(Vector2(0, 447), Vector2(610, 447), Color("c8ae94"), 5)
	for y in [483, 526]:
		line(Vector2(4, y), Vector2(606, y), Color("cdb49b"), 2)
	for x in [80, 210, 340, 470]:
		line(Vector2(x, 448), Vector2(x, 482), Color("cdb49b"), 2)
		line(Vector2(x + 55, 484), Vector2(x + 55, 525), Color("cdb49b"), 2)
	ellipse(Vector2(303, 507), Vector2(201, 37), Color("b7bfaa"))
	ellipse(Vector2(303, 507), Vector2(180, 27), Color("d0d4be"))
	# Rounded mirror and soft reflections.
	rounded(Rect2(148, 40, 314, 362), Color("c4a98b"), 137)
	rounded(Rect2(158, 50, 294, 342), Color("fff9ec"), 132)
	rounded(Rect2(168, 60, 274, 322), Color("d5e8e3"), 126)
	line(Vector2(196, 225), Vector2(339, 82), Color("e9f4ed"), 18)
	line(Vector2(206, 271), Vector2(388, 89), Color("e9f4ed"), 8)
	for x in [128, 483]:
		line(Vector2(x, 145), Vector2(x, 197), Color("b99f80"), 6)
		draw_circle(Vector2(x, 143), 20, Color("fff4c7"))
		draw_circle(Vector2(x, 139), 12, Color("fffbe7"))
	# Side cabinet, bottles and comb.
	rounded(Rect2(460, 354, 122, 138), Color("b79a7e"), 12)
	rounded(Rect2(450, 348, 142, 18), Color("f9edda"), 8)
	for y in [381, 431]:
		rounded(Rect2(472, y, 98, 39), Color("d1b69a"), 5)
		draw_circle(Vector2(521, y + 20), 4, Color("88705c"))
	rounded(Rect2(479, 306, 27, 41), Color("9bc4b4"), 7)
	rounded(Rect2(486, 294, 13, 14), Color("fdf6e8"), 3)
	rounded(Rect2(521, 316, 31, 31), Color("e2adb7"), 5)
	line(Vector2(524, 311), Vector2(548, 311), Color("b79583"), 5)
	plant(Vector2(61, 447), 0.95)
	# Salon chair.
	rounded(Rect2(209, 371, 192, 119), Color("b4777f"), 45)
	rounded(Rect2(218, 371, 174, 108), Color("d99da3"), 40)
	rounded(Rect2(194, 450, 222, 34), Color("e5b0af"), 14)
	line(Vector2(305, 484), Vector2(305, 517), Color("8b8276"), 10)
	ellipse(Vector2(305, 520), Vector2(65, 8), Color("9c9180"))
	# Framed small flower.
	rounded(Rect2(32, 97, 67, 80), Color("c5a98c"), 9)
	rounded(Rect2(39, 104, 53, 66), Color("fff7e6"), 6)
	line(Vector2(66, 155), Vector2(66, 128), Color("9ab69a"), 3)
	accessory(0, Vector2(66, 126), Color("e6a3ad"), 0.42)

func character() -> void:
	# Ears are behind the head.
	if kind == "rabbit":
		for x in [-56, 56]:
			ellipse(Vector2(x, -110), Vector2(25, 78), fur, true)
			ellipse(Vector2(x, -116), Vector2(12, 52), Color("eac1bd"))
	elif kind == "cat":
		for side in [-1, 1]:
			var ear := PackedVector2Array([Vector2(side * 37, -67), Vector2(side * 89, -126), Vector2(side * 104, -38)])
			draw_colored_polygon(ear, fur)
			draw_polyline(PackedVector2Array([ear[0], ear[1], ear[2]]), INK, 3, true)
			draw_colored_polygon(PackedVector2Array([Vector2(side * 62, -66), Vector2(side * 85, -102), Vector2(side * 92, -54)]), Color("e8bfc0"))
	else:
		for x in [-80, 80]:
			ellipse(Vector2(x, -69), Vector2(35, 36 if kind == "bear" else 25), fur, true)
			ellipse(Vector2(x, -69), Vector2(19, 20 if kind == "bear" else 13), Color("cfac98"))
	# Body, hands and feet.
	ellipse(Vector2(0, 98), Vector2(76, 80), fur, true)
	ellipse(Vector2(-51, 157), Vector2(32, 21), fur, true)
	ellipse(Vector2(51, 157), Vector2(32, 21), fur, true)
	for x in [-69, 69]:
		ellipse(Vector2(x, 101), Vector2(21, 35), fur, true)
	ellipse(Vector2.ZERO, Vector2(105, 91), fur, true)
	if kind == "sheep":
		for i in range(8):
			var angle := PI + PI * i / 7.0
			draw_circle(Vector2(cos(angle) * 84, sin(angle) * 73 - 12), 29, Color("fff8ec"))
	# Eyes blink every few seconds. Results smile gently.
	for x in [-39, 39]:
		if happy or fmod(clock, 4.8) > 4.6:
			draw_arc(Vector2(x, 2), 9, PI * 1.12, PI * 1.88, 18, INK, 3, true)
		else:
			ellipse(Vector2(x, -2), Vector2(6, 8), INK)
			draw_circle(Vector2(x - 1.5, -5), 1.7, Color("fff7ee"))
	for x in [-64, 64]:
		ellipse(Vector2(x, 21), Vector2(17, 9), Color("eebbb8"))
	ellipse(Vector2(0, 15), Vector2(7, 5), INK)
	line(Vector2(0, 19), Vector2(0, 27))
	draw_arc(Vector2(-7, 26), 7, 0, PI, 12, INK, 2.5, true)
	draw_arc(Vector2(7, 26), 7, 0, PI, 12, INK, 2.5, true)
	if kind == "cat":
		for side in [-1, 1]:
			line(Vector2(side * 77, 10), Vector2(side * 109, 3), INK, 2)
			line(Vector2(side * 79, 22), Vector2(side * 110, 25), INK, 2)
	if selection[0] >= 0:
		var tint: Color = Rules.PALETTE[selection[1]] if selection[1] >= 0 else Color("d4ccc1")
		accessory(selection[0], Vector2(65, -70), tint)
	if selection[2] >= 0:
		accessory(2, Vector2(0, 89), Rules.PALETTE[selection[2]], 0.9)

func _draw() -> void:
	if mode == "icon":
		accessory(icon_shape, Vector2.ZERO, icon_color, 0.64)
		return
	storybook_room()

func storybook_room() -> void:
	draw_texture_rect(ROOM_TEXTURE, Rect2(0, 0, 610, 570), false)
	var bob := sin(clock * 2.0) * 2.0 if not reduced_motion else 0.0
	var index: int = SPRITE_INDEX.get(kind, 0)
	var cell := Rect2((index % 3) * 512, (index / 3) * 512, 512, 512)
	draw_texture_rect_region(CHARACTER_TEXTURE, Rect2(CHARACTER_RECT.position + Vector2(0, bob), CHARACTER_RECT.size), cell)
	if selection[0] >= 0:
		var tint: Color = Rules.PALETTE[selection[1]] if selection[1] >= 0 else Color("d4ccc1")
		accessory(selection[0], Vector2(379, 246 + bob), tint.darkened(0.25), 0.91)
		accessory(selection[0], Vector2(378, 243 + bob), tint, 0.85)
	if selection[2] >= 0:
		var neck: Vector2 = CHARACTER_RECT.position + NECK_ANCHORS.get(kind, NECK_ANCHORS.rabbit) * CHARACTER_RECT.size / 512.0 + Vector2(0, bob)
		accessory(2, neck + Vector2(0, 3), Rules.PALETTE[selection[2]].darkened(0.22), 0.85)
		accessory(2, neck, Rules.PALETTE[selection[2]], 0.8)
	if happy:
		for i in range(6):
			var at := Vector2(135 + (i % 2) * 340, 140 + (i / 2) * 102)
			var pulse := 0.3 + sin(clock * 3 + i) * 0.05
			accessory(1, at, Color("e8c977"), pulse)
