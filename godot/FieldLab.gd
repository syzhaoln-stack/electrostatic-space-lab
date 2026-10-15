extends Node3D
class_name FieldLab
## Two fixed uniformly charged insulating spheres. One world unit = one mm.
## E is SI V/m and F is SI N; rendered arrows are scaled teaching glyphs.
## Main owns the web bridge. FieldLab owns its camera and input while mounted.

signal reading_changed(data: Dictionary)

const K: float = 8.9875517923e9
const ELEMENTARY_CHARGE: float = 1.602176634e-19
const SOURCE_RADIUS: float = 0.24
const FIELD_BLUE: Color = Color(0.28, 0.67, 0.82)
const PART_ONE: Color = Color(1.0, 0.57, 0.39)
const PART_TWO: Color = Color(0.39, 0.72, 1.0)
const TOTAL_COLOR: Color = Color(0.42, 0.94, 0.88)
const FORCE_COLOR: Color = Color(1.0, 0.79, 0.38)

var q1: float = 0.3
var q2: float = -0.3
var test_sign: float = -1.0
var source_positions: Array[Vector3] = [Vector3(-1.8, 0, 0), Vector3(1.8, 0, 0)]
var probe: Vector3 = Vector3(0, 1.2, 0)
var show_field: bool = true
var show_parts: bool = true
var dragging: bool = false

var _camera: Camera3D
var _lattice: Node3D
var _objects: Node3D
var _details: Node3D
var _shafts: MultiMeshInstance3D
var _heads: MultiMeshInstance3D
var _samples: Array[Vector3] = []
var _sphere_mesh: SphereMesh
var _shaft_mesh: CylinderMesh
var _head_mesh: CylinderMesh
var _dirty: bool = true
var _orbiting: bool = false
var _drag_target: int = -1
var _drag_offset: Vector3 = Vector3.ZERO
var _drag_z: float = 0.0
var _yaw: float = 0.0
var _pitch: float = 0.0
var _distance: float = 13.6
var _built: bool = false

static func field_from_source(point_mm: Vector3, center_mm: Vector3, charge_pc: float) -> Vector3:
	var displacement: Vector3 = (point_mm - center_mm) * 0.001
	var radius: float = maxf(displacement.length(), SOURCE_RADIUS * 0.001)
	return displacement * (K * charge_pc * 1e-12 / (radius * radius * radius))

static func _array(vector: Vector3) -> Array:
	return [vector.x, vector.y, vector.z]

static func _vector(value: Variant, fallback: Vector3) -> Vector3:
	if value is Vector3:
		return value
	if value is Array and value.size() == 3:
		var result := Vector3(float(value[0]), float(value[1]), float(value[2]))
		if result.is_finite():
			return result
	return fallback

func get_reading() -> Dictionary:
	var first := field_from_source(probe, source_positions[0], q1)
	var second := field_from_source(probe, source_positions[1], q2)
	var total := first + second
	var force := total * (test_sign * ELEMENTARY_CHARGE)
	return {"type": "field-reading", "E": _array(total), "E1": _array(first), "E2": _array(second), "F": _array(force),
		"magnitude": total.length(), "forceMagnitude": force.length(), "probe": _array(probe), "sign": test_sign,
		"sources": [{"pos": _array(source_positions[0]), "Q": q1, "radius": SOURCE_RADIUS}, {"pos": _array(source_positions[1]), "Q": q2, "radius": SOURCE_RADIUS}],
		"showField": show_field, "showParts": show_parts, "units": {"position": "mm", "sourceCharge": "pC", "E": "V/m", "F": "N"}}

func set_state(state: Dictionary) -> void:
	if state.has("q1") and is_finite(float(state.q1)):
		q1 = clampf(float(state.q1), -2.0, 2.0)
	if state.has("q2") and is_finite(float(state.q2)):
		q2 = clampf(float(state.q2), -2.0, 2.0)
	if state.has("sign"):
		test_sign = -1.0 if float(state.sign) < 0 else 1.0
	if state.has("probe"):
		probe = _vector(state.probe, probe)
	if state.has("sources") and state.sources is Array and state.sources.size() == 2:
		for index in range(2):
			var value: Variant = state.sources[index]
			if value is Dictionary:
				source_positions[index] = _vector(value.get("pos", []), source_positions[index])
			else:
				source_positions[index] = _vector(value, source_positions[index])
	if state.has("showField"):
		show_field = bool(state.showField)
	if state.has("showParts"):
		show_parts = bool(state.showParts)
	if state.get("reset", false):
		source_positions = [Vector3(-1.8, 0, 0), Vector3(1.8, 0, 0)]
		probe = Vector3(0, 1.2, 0)
	_dirty = true
	if _built:
		_redraw()
	else:
		reading_changed.emit(get_reading())

func _ready() -> void:
	_camera = Camera3D.new()
	_camera.fov = 43.0
	_camera.near = 0.04
	_camera.far = 120.0
	add_child(_camera)
	_camera.current = true
	_camera.environment = Environment.new()
	_camera.environment.background_mode = Environment.BG_COLOR
	_camera.environment.background_color = Color(0.004, 0.009, 0.015)
	_camera.environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	_camera.environment.ambient_light_color = Color(0.45, 0.6, 0.72)
	_camera.environment.ambient_light_energy = 0.55
	_camera.environment.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	var key := DirectionalLight3D.new()
	key.rotation_degrees = Vector3(-38, -28, 0)
	key.light_color = Color(1.0, 0.91, 0.80)
	key.light_energy = 1.6
	add_child(key)
	var fill := DirectionalLight3D.new()
	fill.rotation_degrees = Vector3(28, 125, 0)
	fill.light_color = Color(0.38, 0.72, 1.0)
	fill.light_energy = 0.7
	add_child(fill)
	_lattice = Node3D.new()
	_objects = Node3D.new()
	_details = Node3D.new()
	add_child(_lattice)
	add_child(_objects)
	add_child(_details)
	_sphere_mesh = SphereMesh.new()
	_sphere_mesh.radius = 1.0
	_sphere_mesh.height = 2.0
	_sphere_mesh.radial_segments = 48
	_sphere_mesh.rings = 24
	_shaft_mesh = CylinderMesh.new()
	_shaft_mesh.top_radius = 1.0
	_shaft_mesh.bottom_radius = 1.0
	_shaft_mesh.height = 1.0
	_shaft_mesh.radial_segments = 8
	_head_mesh = CylinderMesh.new()
	_head_mesh.top_radius = 0.0
	_head_mesh.bottom_radius = 1.0
	_head_mesh.height = 1.0
	_head_mesh.radial_segments = 12
	for ix in range(-15, 16):
		for iy in range(-10, 11):
			_samples.append(Vector3(ix * 0.4, iy * 0.4, 0))
	_shafts = _multimesh(_shaft_mesh)
	_heads = _multimesh(_head_mesh)
	_lattice.add_child(_shafts)
	_lattice.add_child(_heads)
	_built = true
	_update_camera()
	_redraw()
	get_viewport().size_changed.connect(_update_camera)

func _material(color: Color, lit: bool = false) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	material.shading_mode = BaseMaterial3D.SHADING_MODE_PER_PIXEL if lit else BaseMaterial3D.SHADING_MODE_UNSHADED
	material.roughness = 0.25 if lit else 1.0
	material.metallic = 0.18 if lit else 0.0
	if color.a < 1.0:
		material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	return material

func _multimesh(mesh: Mesh) -> MultiMeshInstance3D:
	var instance := MultiMeshInstance3D.new()
	instance.multimesh = MultiMesh.new()
	instance.multimesh.transform_format = MultiMesh.TRANSFORM_3D
	instance.multimesh.use_colors = true
	instance.multimesh.instance_count = _samples.size()
	instance.multimesh.mesh = mesh
	var material := _material(Color.WHITE)
	material.vertex_color_use_as_albedo = true
	instance.material_override = material
	instance.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return instance

func _transform(direction: Vector3, center: Vector3, width: float, length: float) -> Transform3D:
	var axis := direction.normalized() if direction.length_squared() > 0 else Vector3.UP
	var rotation := Basis(Quaternion(Vector3.UP, axis))
	# Scale the LOCAL mesh axes. Basis.scaled() scales global rows and would
	# distort an oblique E vector toward world Y when length != width.
	return Transform3D(Basis(rotation.x * width, rotation.y * length, rotation.z * width), center)

func _redraw() -> void:
	if not _built:
		return
	_dirty = false
	_lattice.visible = show_field
	# The sample plane contains both source centres and P. It is XY in the default setup.
	var plane_origin := (source_positions[0] + source_positions[1]) * 0.5
	var plane_x := (source_positions[1] - source_positions[0]).normalized()
	if plane_x.length_squared() < 0.1: plane_x = Vector3.RIGHT
	var plane_y := (probe - plane_origin) - plane_x * (probe - plane_origin).dot(plane_x)
	if plane_y.length_squared() < 0.0001:
		plane_y = Vector3.UP - plane_x * plane_x.dot(Vector3.UP)
		if plane_y.length_squared() < 0.0001: plane_y = Vector3.FORWARD - plane_x * plane_x.dot(Vector3.FORWARD)
	plane_y = plane_y.normalized()
	for index in range(_samples.size()):
		var point := plane_origin + plane_x * _samples[index].x + plane_y * _samples[index].y
		var field := field_from_source(point, source_positions[0], q1) + field_from_source(point, source_positions[1], q2)
		var magnitude := field.length()
		var length := 0.31 * tanh(magnitude / 350.0)
		if point.distance_to(source_positions[0]) < SOURCE_RADIUS * 1.1 or point.distance_to(source_positions[1]) < SOURCE_RADIUS * 1.1:
			length = 0.0
		var direction := field.normalized() if magnitude > 0 else Vector3.UP
		var head_length := length * 0.29
		_shafts.multimesh.set_instance_transform(index, _transform(direction, point + direction * (length - head_length) * 0.5, 0.009, length - head_length))
		_heads.multimesh.set_instance_transform(index, _transform(direction, point + direction * (length - head_length * 0.5), length * 0.095, head_length))
		var color := FIELD_BLUE * (0.24 + 0.76 * tanh(magnitude / 350.0))
		color.a = 1.0
		_shafts.multimesh.set_instance_color(index, color)
		_heads.multimesh.set_instance_color(index, color)
	_clear(_objects)
	_clear(_details)
	for index in range(2):
		var charge := q1 if index == 0 else q2
		var color := PART_ONE if charge > 0 else PART_TWO if charge < 0 else Color(0.48, 0.55, 0.61)
		_sphere(source_positions[index], SOURCE_RADIUS, color, _objects)
		_label("Q%d  %s" % [index + 1, "+" if charge > 0 else "−" if charge < 0 else "0"], source_positions[index] + Vector3(0, 0.55, 0), color, _objects)
	_sphere(probe, 0.125, FORCE_COLOR, _objects)
	_label("P", probe + Vector3(0, 0.32, 0), FORCE_COLOR, _objects)
	var first := field_from_source(probe, source_positions[0], q1)
	var second := field_from_source(probe, source_positions[1], q2)
	var total := first + second
	var local_scale := 1.6 / maxf(1.0, maxf(total.length(), maxf(first.length(), second.length())))
	if show_parts:
		_dashed(source_positions[0], probe, Color(PART_ONE, 0.42))
		_dashed(source_positions[1], probe, Color(PART_TWO, 0.42))
		_arrow(probe, first * local_scale, PART_ONE, "E1", 0.018)
		_arrow(probe, second * local_scale, PART_TWO, "E2", 0.018)
		_dashed(probe + first * local_scale, probe + total * local_scale, Color(PART_TWO, 0.5))
		_dashed(probe + second * local_scale, probe + total * local_scale, Color(PART_ONE, 0.5))
	_arrow(probe, total * local_scale, TOTAL_COLOR, "E", 0.024)
	# F and E share an origin and physical direction relation. F glyph length is
	# 0.72 times E for legibility, not a numerical comparison of unlike units.
	_arrow(probe, total * local_scale * test_sign * 0.72, FORCE_COLOR, "F", 0.032)
	reading_changed.emit(get_reading())

func _clear(node: Node) -> void:
	for child in node.get_children():
		node.remove_child(child)
		child.queue_free()

func _sphere(point: Vector3, radius: float, color: Color, parent: Node3D) -> void:
	var object := MeshInstance3D.new()
	object.mesh = _sphere_mesh
	object.material_override = _material(color, true)
	object.position = point
	object.scale = Vector3.ONE * radius
	parent.add_child(object)

func _label(text: String, point: Vector3, color: Color, parent: Node3D) -> void:
	var label := Label3D.new()
	label.text = text
	label.font_size = 42
	label.pixel_size = 0.006
	label.outline_size = 7
	label.modulate = color.lightened(0.12)
	label.outline_modulate = Color(0.004, 0.009, 0.015, 0.95)
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.no_depth_test = true
	label.position = point
	parent.add_child(label)

func _arrow(origin: Vector3, vector: Vector3, color: Color, text: String, width: float) -> void:
	var length := vector.length()
	if length < 0.015:
		return
	var direction := vector / length
	var head_length := minf(0.18, length * 0.26)
	var material := _material(color)
	for is_head in [false, true]:
		var mesh := MeshInstance3D.new()
		mesh.mesh = _head_mesh if is_head else _shaft_mesh
		mesh.material_override = material
		mesh.transform = _transform(direction, origin + direction * (length - head_length * 0.5 if is_head else (length - head_length) * 0.5), head_length * 0.38 if is_head else width, head_length if is_head else length - head_length)
		_details.add_child(mesh)
	_label(text, origin + vector + direction * 0.16, color, _details)

func _dashed(start: Vector3, finish: Vector3, color: Color) -> void:
	var displacement := finish - start
	var length := displacement.length()
	if length < 0.001:
		return
	var direction := displacement / length
	var mesh := ImmediateMesh.new()
	mesh.surface_begin(Mesh.PRIMITIVE_LINES, _material(color))
	var offset := 0.0
	while offset < length:
		mesh.surface_add_vertex(start + direction * offset)
		mesh.surface_add_vertex(start + direction * minf(offset + 0.11, length))
		offset += 0.19
	mesh.surface_end()
	var object := MeshInstance3D.new()
	object.mesh = mesh
	_details.add_child(object)

func reset_view() -> void:
	_yaw = 0.0; _pitch = 0.0; _distance = 13.6
	_update_camera()

func space_view() -> void:
	_yaw = 0.48; _pitch = 0.37
	_update_camera()

func _update_camera() -> void:
	if not is_instance_valid(_camera):
		return
	var size := get_viewport().get_visible_rect().size
	var aspect := size.x / maxf(size.y, 1.0)
	var radius := maxf(_distance, 6.4 / (tan(deg_to_rad(_camera.fov * 0.5)) * maxf(aspect, 0.3)))
	var target := Vector3(0, 0.35, 0)
	_camera.position = target + Vector3(sin(_yaw) * cos(_pitch), sin(_pitch), cos(_yaw) * cos(_pitch)) * radius
	_camera.look_at(target, Vector3.UP)

func _ray_plane(position: Vector2, z: float) -> Variant:
	var direction := _camera.project_ray_normal(position)
	if absf(direction.z) < 0.0001:
		return null
	var origin := _camera.project_ray_origin(position)
	var distance := (z - origin.z) / direction.z
	return origin + direction * distance if distance > 0 else null

func _pick(position: Vector2) -> int:
	var origin := _camera.project_ray_origin(position)
	var direction := _camera.project_ray_normal(position)
	var nearest := INF
	var selected := -1
	for index in range(3):
		var center := source_positions[index] if index < 2 else probe
		var radius := 0.38 if index < 2 else 0.3
		var offset := origin - center
		var along := offset.dot(direction)
		var discriminant := along * along - (offset.length_squared() - radius * radius)
		if discriminant >= 0:
			var distance := -along - sqrt(discriminant)
			if distance > 0 and distance < nearest:
				nearest = distance
				selected = index
	return selected

func _input(event: InputEvent) -> void:
	if not _built or not is_visible_in_tree() or not _camera.current:
		return
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_WHEEL_UP and event.pressed:
			_distance = maxf(7.5, _distance * 0.92)
			_update_camera()
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN and event.pressed:
			_distance = minf(27.0, _distance / 0.92)
			_update_camera()
		elif event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				_drag_target = _pick(event.position)
				dragging = _drag_target >= 0
				_orbiting = not dragging
				if dragging:
					var selected := source_positions[_drag_target] if _drag_target < 2 else probe
					_drag_z = selected.z
					var intersection: Variant = _ray_plane(event.position, _drag_z)
					_drag_offset = selected - intersection if intersection != null else Vector3.ZERO
			else:
				dragging = false
				_orbiting = false
				_drag_target = -1
	elif event is InputEventMouseMotion:
		if dragging:
			var intersection: Variant = _ray_plane(event.position, _drag_z)
			if intersection != null:
				var point: Vector3 = intersection + _drag_offset
				point.x = clampf(point.x, -4.8, 4.8)
				point.y = clampf(point.y, -3.5, 3.5)
				if _drag_target < 2:
					source_positions[_drag_target] = point
				else:
					probe = point
				_dirty = true
		elif _orbiting:
			_yaw -= event.relative.x * 0.006
			_pitch = clampf(_pitch + event.relative.y * 0.006, -0.08, 1.3)
			_update_camera()
	if dragging or _orbiting:
		get_viewport().set_input_as_handled()

func _process(_delta: float) -> void:
	if _dirty and _built:
		_redraw()
