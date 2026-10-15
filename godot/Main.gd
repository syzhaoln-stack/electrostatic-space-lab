extends Node3D

var camera: Camera3D
var stage: Node3D
var model: Node3D
var effects: Node3D
var field_lab: Node3D
var model_info: Dictionary = {}
var current := {"caseId":"desmoines","step":0,"bonded":false,"grounded":true,"liquid":"diesel","fieldOn":true,"chargeOn":true,"vaporVisible":true}
var case_id := "desmoines"
var cutaway := true
var yaw := 0.62
var pitch := 0.38
var distance := 5.2
var target := Vector3(0.35,0.85,0)
var dragging := false
var time := 0.0
var state_time := 0.0
var phase := 0
var droplets: Array[MeshInstance3D] = []
var charges: Array[MeshInstance3D] = []
var vapor: Array[MeshInstance3D] = []
var flames: Array[MeshInstance3D] = []
var smoke: Array[MeshInstance3D] = []
var lightning: Node3D
var field_vectors: Node3D
var glow: OmniLight3D
var spark_a := Vector3(0.75,1.21,0.25)
var spark_b := Vector3(0.65,1.21,0.25)
var emitter := Vector3(0.43,1.38,0.12)
var water_top := 0.67
var js_callback: JavaScriptObject
var window: JavaScriptObject
var paused := false
var soft_texture: ImageTexture

func _ready() -> void:
	_build_environment()
	_build_soft_texture()
	if OS.has_feature("web"):
		window = JavaScriptBridge.get_interface("window")
		paused = bool(JavaScriptBridge.eval("matchMedia('(prefers-reduced-motion: reduce)').matches"))
		case_id = str(JavaScriptBridge.eval("new URLSearchParams(location.search).get('case') || 'desmoines'"))
		js_callback = JavaScriptBridge.create_callback(_receive_js)
		window.godotReceive = js_callback
		JavaScriptBridge.eval("window.addEventListener('message', e => {if(e.source!==parent || e.origin!==location.origin)return; if(e.data?.type==='electrostatic-case'||e.data?.type==='electrostatic-field') window.godotReceive(JSON.stringify(e.data));});",true)
	_load_case(case_id)
	if OS.has_feature("web"):
		JavaScriptBridge.eval("window.caseEngineReady=true;parent.postMessage({type:'case-ready'},location.origin);window.onEngineReady?.();",true)

func _receive_js(args: Array) -> void:
	if args.is_empty(): return
	var parsed = JSON.parse_string(str(args[0]))
	if not parsed is Dictionary: return
	var data: Dictionary = parsed
	if data.get("type","") == "view-reset":
		if field_lab and field_lab.has_method("reset_view"): field_lab.call("reset_view")
		else: _reset_camera()
		return
	if data.get("type","") == "view-space":
		if field_lab: field_lab.call("space_view")
		return
	if data.get("type","") == "view-gap":
		target=(spark_a+spark_b)/2;distance=1.9 if case_id=="desmoines" else 3.4;yaw=.5;pitch=.28;_update_camera();return
	if data.get("type","") == "cutaway":
		cutaway = bool(data.get("enabled",true)); _apply_model_visibility(); _notify_hud(); return
	if data.get("type","") == "pause-visuals":
		paused=bool(data.get("paused",false));return
	if data.get("type","") == "electrostatic-field":
		if case_id != "field": _load_case("field")
		field_lab.call("set_state",data);return
	var next_case := str(data.get("caseId",case_id))
	if next_case != case_id: _load_case(next_case)
	var next_step := int(data.get("step",phase))
	if next_step != phase: state_time=0
	for key in data: current[key]=data[key]
	phase=clampi(next_step,0,3)
	_apply_state()

func _build_environment() -> void:
	var env := Environment.new()
	var sky := Sky.new()
	var sky_material := ProceduralSkyMaterial.new()
	sky_material.sky_top_color=Color("172a41");sky_material.sky_horizon_color=Color("86939d")
	sky_material.ground_bottom_color=Color("071019");sky_material.ground_horizon_color=Color("273c50")
	sky_material.sun_angle_max=16;sky.sky_material=sky_material
	env.background_mode=Environment.BG_COLOR;env.background_color=Color("08111b")
	env.sky=sky;env.ambient_light_source=Environment.AMBIENT_SOURCE_SKY;env.ambient_light_energy=0.45
	env.reflected_light_source=Environment.REFLECTION_SOURCE_SKY;env.tonemap_mode=Environment.TONE_MAPPER_FILMIC
	var world:=WorldEnvironment.new();world.environment=env;add_child(world)
	var key:=DirectionalLight3D.new();key.rotation_degrees=Vector3(-48,-30,0);key.light_color=Color("fff0db");key.light_energy=1.7;key.shadow_enabled=true;key.directional_shadow_mode=DirectionalLight3D.SHADOW_PARALLEL_2_SPLITS;add_child(key)
	var fill:=DirectionalLight3D.new();fill.rotation_degrees=Vector3(-18,145,0);fill.light_color=Color("8ccbf0");fill.light_energy=0.85;add_child(fill)
	camera=Camera3D.new();camera.fov=39;camera.near=0.02;camera.far=150;camera.current=true;add_child(camera)
	stage=Node3D.new();add_child(stage)
	var floor_material := _material(Color("0c1925"),0.1,0.74)
	var floor_mesh:=CylinderMesh.new();floor_mesh.top_radius=3.7;floor_mesh.bottom_radius=3.7;floor_mesh.height=0.08;floor_mesh.radial_segments=96
	var platform:=MeshInstance3D.new();platform.mesh=floor_mesh;platform.material_override=floor_material;platform.position.y=-0.07;stage.add_child(platform)
	for i in range(-7,8):
		var strip:=BoxMesh.new();strip.size=Vector3(7.2,0.001,0.008)
		var line:=MeshInstance3D.new();line.mesh=strip;line.position=Vector3(0,-0.025,float(i)*0.5);line.material_override=_material(Color("162a38"));stage.add_child(line)
	var ground_mesh:=PlaneMesh.new();ground_mesh.size=Vector2(200,200)
	var ground:=MeshInstance3D.new();ground.mesh=ground_mesh;ground.position.y=-0.12;ground.material_override=_material(Color("07111a"),0,0.9);ground.visible=false;stage.add_child(ground)
	effects=Node3D.new();stage.add_child(effects)
	glow=OmniLight3D.new();glow.light_color=Color("ffb76b");glow.light_energy=0;glow.omni_range=4;effects.add_child(glow)

func _material(color: Color, metallic: float=0, roughness: float=0.5, emissive: bool=false) -> StandardMaterial3D:
	var m:=StandardMaterial3D.new();m.albedo_color=color;m.metallic=metallic;m.roughness=roughness
	if color.a<1: m.transparency=BaseMaterial3D.TRANSPARENCY_ALPHA
	if emissive: m.shading_mode=BaseMaterial3D.SHADING_MODE_UNSHADED;m.emission_enabled=true;m.emission=color;m.emission_energy_multiplier=1.5
	return m

func _load_case(id: String) -> void:
	case_id=id;current["caseId"]=id;phase=0;current["step"]=0;state_time=0
	if field_lab:
		field_lab.queue_free();field_lab=null
	if model:
		model.queue_free();model=null
	if id=="field":
		stage.visible=false;camera.current=false
		for light in get_children():
			if light is DirectionalLight3D: light.visible=false
		field_lab=load("res://FieldLab.gd").new();add_child(field_lab)
		field_lab.connect("reading_changed",_field_reading)
		_field_reading(field_lab.call("get_reading"));_notify_hud();return
	stage.visible=true;camera.current=true
	for light in get_children():
		if light is DirectionalLight3D: light.visible=true
	var name: String="desmoines" if id=="desmoines" else "tank"
	var packed = load("res://models/"+name+".glb")
	if packed is PackedScene:
		model=packed.instantiate();stage.add_child(model)
	var file:=FileAccess.open("res://models/"+name+".json",FileAccess.READ)
	if file: model_info=JSON.parse_string(file.get_as_text())
	spark_a=_vec(model_info.get("spark_start",[0.18,1.535,0.1]));spark_b=_vec(model_info.get("spark_end",[0.18,1.5,0.1]))
	emitter=_vec(model_info.get("emission",[0.69,0.71,0.30]));water_top=float(model_info.get("liquid_surface_y",1.315))
	if id=="glenpool":
		# Position is an illustrative liquid/vapour interface, not a located historical ignition point.
		spark_a=Vector3(-0.55,1.0,0.58);spark_b=spark_a+Vector3(0.06,0,0)
	_reset_camera();_build_effects();_apply_state()

func _vec(a: Array) -> Vector3:
	return Vector3(float(a[0]),float(a[1]),float(a[2]))

func _reset_camera() -> void:
	if case_id=="field": return
	target=Vector3(0.4,0.8,0) if case_id=="desmoines" else Vector3(0,1.5,0)
	distance=4.6 if case_id=="desmoines" else 8.4
	pitch=0.31 if case_id=="desmoines" else 0.25;yaw=0.55
	_update_camera()

func _update_camera() -> void:
	var width:=get_viewport().get_visible_rect().size.x
	var adjusted:=distance*(1.3 if width<500 else 1.0)
	camera.position=target+Vector3(sin(yaw)*cos(pitch),sin(pitch),cos(yaw)*cos(pitch))*adjusted
	camera.look_at(target,Vector3.UP)

func _unhandled_input(event: InputEvent) -> void:
	if case_id=="field": return
	if event is InputEventMouseButton:
		if event.button_index==MOUSE_BUTTON_LEFT: dragging=event.pressed
		if event.pressed and event.button_index==MOUSE_BUTTON_WHEEL_UP: distance=maxf(2.2,distance*.9)
		if event.pressed and event.button_index==MOUSE_BUTTON_WHEEL_DOWN: distance=minf(18,distance*1.1)
	if event is InputEventMouseMotion and dragging:
		yaw-=event.relative.x*.007;pitch=clampf(pitch+event.relative.y*.005,-0.08,1.25)
	if event is InputEventScreenDrag:
		yaw-=event.relative.x*.007;pitch=clampf(pitch+event.relative.y*.005,-0.08,1.25)
	if event is InputEventMagnifyGesture: distance=clampf(distance/event.factor,2.2,18)
	_update_camera()

func _apply_model_visibility() -> void:
	if not model: return
	for node in model.find_children("*","Node3D",true,false):
		var n:=str(node.name)
		if n in model_info.get("cutaway_hide",[]): node.visible=not cutaway
		if n.begins_with("bonding_"): node.visible=bool(current.get("bonded",false))
		if n.begins_with("ground_wire"): node.visible=bool(current.get("grounded",true))
		if case_id=="glenpool":
			for prefix in model_info.get("glenpool_hide",["float","gauge"]):
				if n.begins_with(str(prefix)): node.visible=false
		if n=="liquid" and node is MeshInstance3D:
			var m:=_material(Color(0.18,0.49,0.57,0.76),0.05,0.13)
			if case_id=="glenpool":
				m.albedo_color=Color(0.51,0.35,0.14,0.76)
				if not node.has_meta("base_transform"): node.set_meta("base_transform",node.transform)
				var base: Transform3D=node.get_meta("base_transform")
				var fraction: float=0.06 if phase==1 else 0.64 if phase>=2 else 1.0
				node.transform=base
				var original_scale: float=node.scale.y
				node.scale.y=original_scale*fraction
				node.position.y=base.origin.y+original_scale*node.get_aabb().position.y*(1.0-fraction)
			node.material_override=m

func _can_spark() -> bool:
	return phase>=3 if case_id=="glenpool" else phase>=2 and not bool(current.get("bonded",false))

func _apply_state() -> void:
	_apply_model_visibility()
	if not lightning: return
	lightning.visible=_can_spark()
	field_vectors.visible=bool(current.get("fieldOn",true)) and phase>=1 and not bool(current.get("bonded",false))
	for dot in charges: dot.visible=bool(current.get("chargeOn",true)) and phase>=1
	for puff in vapor: puff.visible=bool(current.get("vaporVisible",true))
	var ignited:=phase==3 and _can_spark()
	for flame in flames: flame.visible=ignited
	for cloud in smoke: cloud.visible=ignited
	_notify_hud()

func _build_soft_texture() -> void:
	var image:=Image.create(64,64,false,Image.FORMAT_RGBA8)
	for y in range(64):
		for x in range(64):
			var r:=Vector2(x-31.5,y-31.5).length()/31.5
			image.set_pixel(x,y,Color(1,1,1,pow(maxf(0,1-r),2)))
	soft_texture=ImageTexture.create_from_image(image)

func _puff(color: Color, size: float) -> MeshInstance3D:
	var q:=QuadMesh.new();q.size=Vector2(size,size)
	var n:=MeshInstance3D.new();n.mesh=q
	var m:=_material(color);m.albedo_texture=soft_texture;m.billboard_mode=BaseMaterial3D.BILLBOARD_ENABLED;m.shading_mode=BaseMaterial3D.SHADING_MODE_UNSHADED;m.cull_mode=BaseMaterial3D.CULL_DISABLED;m.no_depth_test=false;n.material_override=m
	effects.add_child(n);return n

func _sphere(radius: float,color: Color) -> MeshInstance3D:
	var m:=SphereMesh.new();m.radius=radius;m.height=radius*2;m.radial_segments=12;m.rings=6
	var n:=MeshInstance3D.new();n.mesh=m;n.material_override=_material(color,0,0.2,true);effects.add_child(n);return n

func _segment(a: Vector3,b: Vector3,radius: float,color: Color,parent: Node3D) -> MeshInstance3D:
	var c:=CylinderMesh.new();c.top_radius=radius;c.bottom_radius=radius;c.height=a.distance_to(b);c.radial_segments=8
	var m:=MeshInstance3D.new();m.mesh=c;m.material_override=_material(color,0,0.2,true);parent.add_child(m);m.position=(a+b)/2
	var d:=(b-a).normalized();m.quaternion=Quaternion(Vector3.UP,d);return m

func _arrow(p: Vector3,d: Vector3,length: float) -> void:
	var end:=p+d.normalized()*length
	_segment(p,end,0.0025,Color("65c8e6"),field_vectors)
	var mesh:=CylinderMesh.new();mesh.top_radius=0;mesh.bottom_radius=0.012;mesh.height=0.035;mesh.radial_segments=10
	var n:=MeshInstance3D.new();n.mesh=mesh;n.material_override=_material(Color("7ae5ff"),0,0,true);field_vectors.add_child(n);n.position=end;n.quaternion=Quaternion(Vector3.UP,d.normalized())

func _build_effects() -> void:
	for child in effects.get_children():
		if child!=glow: child.queue_free()
	droplets.clear();charges.clear();vapor.clear();flames.clear();smoke.clear()
	for i in range(12): droplets.append(_sphere(0.018,Color("62c7db")))
	for i in range(10): charges.append(_sphere(0.010,Color("ffd179")))
	for i in range(18): vapor.append(_puff(Color(0.8,0.58,0.27,0.17),0.65 if case_id=="desmoines" else 1.4))
	for i in range(18): flames.append(_puff(Color(1,0.38,0.08,0.6),0.48))
	for i in range(16): smoke.append(_puff(Color(0.15,0.18,0.22,0.45),0.7))
	lightning=Node3D.new();effects.add_child(lightning)
	var gap:=spark_b-spark_a
	var last:=spark_a
	for i in range(1,9):
		var f:=float(i)/8
		var p:=spark_a+gap*f+Vector3(0,sin(i*2.3)*0.018,sin(i*1.7)*0.012)*sin(f*PI)
		_segment(last,p,0.0035,Color("e4fcff"),lightning);last=p
	field_vectors=Node3D.new();effects.add_child(field_vectors)
	for i in range(6):
		var angle:=float(i)/6*TAU
		var p:=spark_a+Vector3(cos(angle)*0.2,0.06,sin(angle)*0.2)
		_arrow(p,(spark_b-p).normalized(),0.12)
	glow.position=spark_a

func _process(delta: float) -> void:
	if case_id=="field": return
	if not paused: time+=delta;state_time+=delta
	_update_camera()
	var liquid_visible:=case_id!="glenpool" or phase>=2
	for i in range(droplets.size()):
		var f:=fposmod(time*.62+float(i)/droplets.size(),1)
		droplets[i].visible=liquid_visible
		if case_id=="desmoines": droplets[i].position=emitter+Vector3(0,-f*maxf(0.12,emitter.y-water_top),0)
		else: droplets[i].position=emitter+Vector3(-f*0.72,0,0)
	for i in range(charges.size()):
		var f:=fposmod(time*.19+float(i)/charges.size(),1)
		if bool(current.get("bonded",false)):
			if case_id=="desmoines":
				# Follow the illustrated bypass lead, whose control points are from the Blender asset.
				var points: Array[Vector3]=[Vector3(.61,1.57,.18),Vector3(.80,1.35,.45),Vector3(.71,.92,.61),Vector3(.65,.78,.56)]
				var part:=mini(2,int(f*3));charges[i].position=points[part].lerp(points[part+1],f*3-part)
			else: charges[i].position=Vector3(.18,1.51,.10).lerp(Vector3(.18,1.67,.10),f)
		else:
			charges[i].position=spark_a+Vector3(cos(float(i)*2.4)*0.11,sin(float(i)*1.7)*0.08,sin(float(i)*2.4)*0.11)
	for i in range(vapor.size()):
		var a:=float(i)*2.39996
		var r:=0.2+float(i%5)*0.08
		if case_id!="desmoines": r*=3
		vapor[i].position=Vector3(cos(a)*r,water_top+0.3+float(i%4)*0.11+sin(time*.3+i)*0.025,sin(a)*r)
	var ignited:=phase==3 and _can_spark()
	for i in range(flames.size()):
		var f:=fposmod(time*.6+float(i)/flames.size(),1)
		flames[i].position=spark_a+Vector3(sin(float(i)*2.4+time)*(.06+f*.22),f*.85,cos(float(i)*1.9)*(.05+f*.14))
		flames[i].scale=Vector3.ONE*(0.4+sin(f*PI)*.9)
		var mat: StandardMaterial3D=flames[i].material_override;mat.albedo_color=Color(1,0.28+f*.3,0.04,0.65*sin(f*PI))
	for i in range(smoke.size()):
		var f:=fposmod(time*.2+float(i)/smoke.size(),1)
		smoke[i].position=spark_a+Vector3(sin(i*2.4+f)*f*.5,0.5+f*1.8,cos(i*1.8)*f*.3)
		smoke[i].scale=Vector3.ONE*(.5+f*1.7)
	lightning.visible=_can_spark() and (phase==2 or state_time<0.45)
	glow.light_energy=(.6+sin(time*7)*.08) if ignited else .035 if lightning.visible else 0

func _field_reading(data: Dictionary) -> void:
	var payload:=data.duplicate();payload["type"]="field-reading"
	if OS.has_feature("web"): JavaScriptBridge.eval("parent.postMessage("+JSON.stringify(payload)+",location.origin)",true)

func _notify_hud() -> void:
	if not OS.has_feature("web"): return
	var descriptions: Array=[]
	if case_id=="desmoines": descriptions=["液体经喷嘴灌入金属容器","孤立金属件缺少电荷流出路径","连接间隙可能发生放电","火花点燃开口处可燃蒸气"]
	elif case_id=="valley": descriptions=["向储罐输送低导电性溶剂","液体与内部零件电荷难消散","浮子连接处可能发生放电","点火后火焰扩展：教学示意"]
	elif case_id=="glenpool": descriptions=["罐内原先存放汽油","液体移出，气氛并未自动清除","灌入柴油，考虑残留气氛","可能的静电点火位置 · 机理示意"]
	else: descriptions=["拖动电荷或观察点，看电场的叠加"]
	var caption: String=descriptions[mini(phase,descriptions.size()-1)]
	if case_id!="field" and case_id!="glenpool" and bool(current.get("bonded",false)):
		caption="加入可靠跨接：电荷沿导体重新分布 · 改变条件的对照"
	var d:={"caseId":case_id,"step":phase,"caption":caption,"cutaway":cutaway,"grounded":current.get("grounded",true),"bonded":current.get("bonded",false)}
	JavaScriptBridge.eval("window.updateCaseHUD?.("+JSON.stringify(d)+")",true)
