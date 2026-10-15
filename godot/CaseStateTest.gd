extends SceneTree
var failures:Array[String]=[]
func _initialize()->void: call_deferred("_run")
func _check(value:bool,label:String)->void:
	if not value: failures.append(label);push_error(label)
func _run()->void:
	var studio=load("res://Main.gd").new();root.add_child(studio);await process_frame
	for id in ["desmoines","valley","glenpool"]:
		studio._load_case(id);await process_frame
		for step in range(4):
			studio.phase=step;studio.current.bonded=false;studio.current.vaporVisible=true;studio._apply_state()
			_check(studio.attention_meshes.size()>0,id+" highlights a real component at phase "+str(step))
			_check(studio._can_spark()==(step>=3 if id=="glenpool" else step>=2),id+" correct spark phase "+str(step))
			_check(studio.flames[0].visible==(step==3),id+" correct ignition phase "+str(step))
		studio.phase=3;studio.current.bonded=true;studio._apply_state()
		_check(studio.flames[0].visible==(id=="glenpool"),id+" bonding comparison")
		studio.current.vaporVisible=false;studio._apply_state()
		_check(not studio.vapor[0].visible,id+" vapor visibility off")
		_check(studio.flames[0].visible==(id=="glenpool"),id+" hidden vapor is not removed atmosphere")
		if id=="glenpool":
			for n in studio.model.find_children("*","Node3D",true,false):
				if str(n.name).begins_with("float") or str(n.name).begins_with("gauge"): _check(not n.visible,"Glenpool does not borrow Valley float")
	print(JSON.stringify({"suite":"Godot accident phase and comparison conditions","failures":failures}))
	studio.queue_free();await process_frame;quit(0 if failures.is_empty() else 1)
