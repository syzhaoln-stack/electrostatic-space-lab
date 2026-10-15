extends SceneTree
## Run: godot --headless --path godot --script res://FieldLabMathTest.gd
## Numeric fixtures are independently computed by the existing physics.js.

const LAB = preload("res://FieldLab.gd")
var failures: Array[String] = []

func _initialize() -> void:
	call_deferred("_run")

func _check(condition: bool, description: String) -> void:
	if not condition:
		failures.append(description)
		push_error(description)

func _close(actual: Vector3, expected: Vector3, description: String) -> void:
	var relative_error := (actual - expected).length() / maxf(expected.length(), 1.0)
	_check(relative_error < 0.000003, "%s; relative error %.8f" % [description, relative_error])

func _run() -> void:
	var lab = LAB.new()
	root.add_child(lab)
	var fixtures := [
		[Vector3(0, 1.2, 0), Vector3(958.7301428410041, 0, 0)],
		[Vector3(0.12, 0, 0), Vector3(1686.7183389965649, 0, 0)],
		[Vector3(3, 1, 2), Vector3(-110.81322097063618, -146.82181721914253, -293.64363443828506)],
		[Vector3.ZERO, Vector3(1664.361443018518, 0, 0)]
	]
	for fixture in fixtures:
		var actual: Vector3 = LAB.field_from_source(fixture[0], Vector3(-1.8, 0, 0), 0.3) + LAB.field_from_source(fixture[0], Vector3(1.8, 0, 0), -0.3)
		_close(actual, fixture[1], "JS field fixture at %s" % fixture[0])
	_close(LAB.field_from_source(Vector3(0.12, 0, 0), Vector3.ZERO, 0.3), Vector3(23405.082792447913, 0, 0), "uniform sphere interior")
	_check(LAB.field_from_source(Vector3.ZERO, Vector3.ZERO, 0.3) == Vector3.ZERO, "sphere center is finite and zero")
	lab.set_state({"q1": 0.3, "q2": 0.3, "probe": [0, 0, 0]})
	var reading: Dictionary = lab.get_reading()
	_check(Vector3(reading.E[0], reading.E[1], reading.E[2]).length() < 0.001, "equal same-sign charges cancel at midpoint")
	lab.set_state({"q1": 0.3, "q2": -0.3, "probe": [0, 1.2, 0], "sign": -1, "showField": true, "showParts": true})
	reading = lab.get_reading()
	var field := Vector3(reading.E[0], reading.E[1], reading.E[2])
	var force := Vector3(reading.F[0], reading.F[1], reading.F[2])
	_check(force.dot(field) < 0.0, "electron force is opposite E")
	_check(absf(force.x / (-LAB.ELEMENTARY_CHARGE * field.x) - 1.0) < 0.000003, "force is in SI newtons")
	_check(reading.units.E == "V/m" and reading.units.position == "mm", "bridge unit contract")
	_check(reading.sources.size() == 2 and absf(reading.probe[1] - 1.2) < 0.000001, "bridge exposes two sources and probe")
	var direction := Vector3(1, 2, 3).normalized()
	var arrow: Transform3D = lab._transform(direction, direction * 0.5, 0.03, 1.0)
	_close(arrow.basis.y.normalized(), direction, "rendered arrow preserves all three field components")
	_close(arrow * Vector3(0, -0.5, 0), Vector3.ZERO, "rendered shaft remains anchored at the sample")
	_close(arrow * Vector3(0, 0.5, 0), direction, "rendered shaft tip follows E")
	await process_frame
	print(JSON.stringify({"suite": "Godot FieldLab against physics.js", "fixtures": 4, "failures": failures, "reading": reading}))
	lab.queue_free()
	await process_frame
	quit(0 if failures.is_empty() else 1)
