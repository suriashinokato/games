extends Node2D
## Flower heads are painted sprites; wrapping and ribbons remain separate choices.
const ROOM = preload("res://assets/storybook/florist.png")
const FLOWERS = preload("res://assets/storybook/flowers.png")
const CHARACTERS = preload("res://assets/storybook/characters.png")
const PAPERS = [Color("edb9c9"), Color("b0d8c2"), Color("f0dfb8")]
const RIBBONS = [Color("c86b8c"), Color("6b9fc8"), Color("e2b64e")]
var selection: Array = [-1, -1, -1]
var customer := 0
var mode := "room"
var icon_slot := 0
var icon_value := 0

func polygon(points: Array, tint: Color, outline: Color) -> void:
	var vertices := PackedVector2Array()
	for point in points:
		vertices.append(Vector2(point[0],point[1]))
	draw_colored_polygon(vertices, tint)
	vertices.append(vertices[0])
	draw_polyline(vertices, outline, 1.8, true)

func flower(at: Vector2, kind: int, size: float) -> void:
	var cell := float(FLOWERS.get_width()) / 3.0
	draw_texture_rect_region(FLOWERS, Rect2(at - Vector2.ONE * size / 2.0, Vector2.ONE * size), Rect2(kind*cell,0,cell,FLOWERS.get_height()))

func ribbon(at: Vector2, value: int, factor: float = 1.0) -> void:
	var tint: Color = RIBBONS[value]
	var edge := tint.darkened(0.22)
	# Mirrored loops and two tails meet at one centered knot.
	for side in [-1,1]:
		var tail := PackedVector2Array()
		for point in [Vector2(3,4),Vector2(19,6),Vector2(31,49),Vector2(17,43),Vector2(7,51)]:
			tail.append(at + Vector2(point.x*side,point.y)*factor)
		draw_colored_polygon(tail, tint.darkened(0.08))
		tail.append(tail[0])
		draw_polyline(tail,edge,1.5,true)
		var loop := PackedVector2Array()
		loop.append(at)
		for i in range(25):
			var angle := -PI / 2.0 + i * PI / 24.0
			loop.append(at + Vector2(side*(24+17*cos(angle)),21*sin(angle))*factor)
		loop.append(at)
		draw_colored_polygon(loop,tint)
		draw_polyline(loop,edge,1.7,true)
		draw_line(at+Vector2(side*12,-3)*factor,at+Vector2(side*32,-11)*factor,tint.lightened(0.28),2,true)
	draw_circle(at, 10*factor, edge)
	draw_circle(at, 8*factor, tint.lightened(0.12))

func _draw() -> void:
	if mode == "icon":
		if icon_slot == 0:
			flower(Vector2.ZERO,icon_value,43)
		elif icon_slot == 1:
			var tint: Color = PAPERS[icon_value]
			polygon([[-24,-15],[19,-19],[26,11],[-17,18]],tint,tint.darkened(0.25))
			polygon([[19,-19],[15,-8],[26,11]],tint.lightened(0.18),tint.darkened(0.25))
		else:
			ribbon(Vector2(0,-8),icon_value,0.62)
		return
	draw_texture_rect(ROOM,Rect2(0,0,610,510),false)
	var board := StyleBoxFlat.new()
	board.bg_color = Color(1,0.978,0.93,0.95)
	board.border_color = Color("d2b48a")
	board.set_border_width_all(3)
	board.set_corner_radius_all(34)
	draw_style_box(board,Rect2(260,59,327,403))
	var source := Rect2((customer%3)*512,(customer/3)*512,512,512)
	draw_texture_rect_region(CHARACTERS,Rect2(-12,184,286,286),source)
	draw_set_transform(Vector2(424,278))
	bouquet()
	draw_set_transform(Vector2.ZERO)

func bouquet() -> void:
	var has_paper: bool = selection[1] >= 0
	var tint: Color = PAPERS[maxi(0,int(selection[1]))]
	var edge := tint.darkened(0.24)
	if has_paper:
		polygon([[-129,-92],[-51,-133],[0,-118],[65,-131],[127,-82],[37,145],[-33,145]],tint.lightened(0.16),edge)
	var blossoms := [Vector2(-73,-63),Vector2(-43,-114),Vector2(0,-145),Vector2(43,-114),Vector2(73,-63)]
	if selection[0] >= 0:
		for at in blossoms:
			draw_line(Vector2(0,126),at,Color("628d5d"),5,true)
			var center: Vector2 = at.lerp(Vector2(0,90),0.48)
			var side := -1 if at.x < 0 else 1
			var leaf := PackedVector2Array([center,center+Vector2(28*side,-34),center+Vector2(35*side,-10),center+Vector2(15*side,4)])
			draw_colored_polygon(leaf,Color("89b37b"))
			draw_line(center,center+Vector2(28*side,-27),Color("638e5e"),1.5,true)
	if has_paper:
		polygon([[-120,-65],[-18,-4],[99,-58],[35,148],[-32,148]],tint,edge)
		polygon([[-120,-65],[-18,-4],[35,148],[-32,148]],tint.lightened(0.09),edge)
		draw_line(Vector2(-18,-4),Vector2(12,112),tint.darkened(0.16),2,true)
		for row in range(5):
			for column in range(3):
				var at := Vector2(-37+column*26,10+row*21)
				draw_circle(at,2,Color(1,1,1,0.38))
	if selection[0] >= 0:
		for at in blossoms:
			flower(at,int(selection[0]),96)
	if selection[2] >= 0:
		ribbon(Vector2(0,75),int(selection[2]))
