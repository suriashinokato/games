extends Node2D
const ROOM = preload("res://assets/storybook/bakery.png")
const CHARACTERS = preload("res://assets/storybook/characters.png")
const BREADS = preload("res://assets/storybook/breads.png")
var customer := 5
var selection: Array = [-1, -1, -1]
var phase := "reception"
var mode := "room"
var progress := 0.0

func _draw() -> void:
	if mode == "icon":
		bread(Vector2.ZERO, 64)
		return
	if mode == "oven":
		var shell := StyleBoxFlat.new()
		shell.bg_color = Color("c8a078")
		shell.set_corner_radius_all(50)
		draw_style_box(shell, Rect2(0, 0, 470, 238))
		shell = StyleBoxFlat.new()
		shell.bg_color = Color("59463d")
		shell.set_corner_radius_all(36)
		draw_style_box(shell, Rect2(24, 20, 422, 192))
		draw_circle(Vector2(235, 130), 82, Color(1, 0.65, 0.24, 0.10 + 0.06 * sin(progress * 20)))
		draw_line(Vector2(55, 192), Vector2(415, 192), Color("e3c298"), 6)
		bread(Vector2(235, 123), 150 + 22 * progress)
		return
	draw_texture_rect(ROOM, Rect2(0, 0, 610, 510), false)
	var source := Rect2((customer % 3) * 512, (customer / 3) * 512, 512, 512)
	draw_texture_rect_region(CHARACTERS, Rect2(130, 80, 350, 350), source)
	if selection[0] >= 0:
		draw_set_transform(Vector2(305, 453), 0, Vector2(1, 0.27))
		draw_circle(Vector2.ZERO, 103, Color("fff2db"))
		draw_set_transform(Vector2.ZERO)
		bread(Vector2(305, 417), 153)
		if phase == "result":
			for i in range(3):
				draw_arc(Vector2(278 + i * 28, 325), 15, -1.5, 1.2, 12, Color(1, 1, 1, 0.85), 3, true)

func bread(center: Vector2, size: float) -> void:
	var dough := maxi(0, int(selection[0]))
	var cell := float(BREADS.get_width()) / 3.0
	var tint := Color.WHITE
	if selection[2] == 0:
		tint = Color(1, 1, 0.94)
	elif selection[2] == 2:
		tint = Color(0.78, 0.65, 0.52)
	draw_texture_rect_region(BREADS, Rect2(center - Vector2.ONE * size / 2, Vector2.ONE * size), Rect2(dough * cell, 0, cell, BREADS.get_height()), tint)
	if selection[1] < 0:
		return
	# Toppings are separate, readable overlays; all 27 recipes have a live preview.
	for i in range(4):
		var at := center + Vector2((i - 1.5) * size * 0.14, sin(i * 2.0) * size * 0.05)
		if selection[1] == 0:
			draw_set_transform(at, 0.35)
			draw_rect(Rect2(-size * 0.055, -size * 0.055, size * 0.11, size * 0.11), Color("633d32"))
			draw_line(Vector2(-size * 0.04, -size * 0.04), Vector2(size * 0.035, -size * 0.04), Color("ac7860"), 2, true)
			draw_set_transform(Vector2.ZERO)
		elif selection[1] == 1:
			var berry := PackedVector2Array()
			for point in [Vector2(-0.07, -0.03), Vector2(-0.04, -0.07), Vector2(0.04, -0.07), Vector2(0.07, -0.03), Vector2(0.05, 0.03), Vector2(0, 0.09), Vector2(-0.05, 0.03)]:
				berry.append(at + point * size)
			draw_colored_polygon(berry, Color("dc6571"))
			for seed in [Vector2(-0.03, -0.02), Vector2(0.03, -0.02), Vector2(0, 0.03)]:
				draw_circle(at + seed * size, size * 0.008, Color("ffe3aa"))
			draw_line(at + Vector2(-size * 0.045, -size * 0.065), at + Vector2(size * 0.045, -size * 0.065), Color("6e9c63"), 3, true)
		else:
			draw_colored_polygon(PackedVector2Array([at + Vector2(-size * 0.07, size * 0.04), at + Vector2(size * 0.07, size * 0.04), at + Vector2(size * 0.02, -size * 0.08)]), Color("ffe09a"))
			draw_circle(at, size * 0.018, Color("d8a657"))
