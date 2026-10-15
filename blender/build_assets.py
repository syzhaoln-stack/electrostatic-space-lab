"""Original dimensioned teaching assets, informed by the cited investigation diagrams.
Run with Blender 4.5 LTS --background --python blender/build_assets.py -- desmoines|tank.
Dimensions are illustrative metres, not measured accident reconstruction.
"""
import bpy, math, json, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'models'
NAME = sys.argv[-1] if sys.argv[-1] in ('desmoines', 'tank') else 'desmoines'
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.context.scene.unit_settings.system = 'METRIC'
bpy.context.scene.unit_settings.scale_length = 1

def material(name, color, metal=0, rough=.4, alpha=1):
    m=bpy.data.materials.new(name); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,alpha)
    p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=rough
    p.inputs['Alpha'].default_value=alpha
    m.diffuse_color=(*color,alpha)
    if alpha<1: m.surface_render_method='DITHERED'
    return m

STEEL=material('brushed stainless steel',(.36,.40,.43),.82,.27)
EDGE=material('machined bright edge',(.53,.57,.59),.88,.23)
DARK=material('cast dark iron',(.055,.075,.085),.66,.45)
PAINT=material('pump dark petrol enamel',(.026,.090,.105),.45,.31)
RUBBER=material('black nitrile hose',(.013,.019,.021),.02,.71)
INSULATOR=material('insulating coupling',(.16,.105,.055),.02,.56)
COPPER=material('earthing copper',(.48,.23,.085),.76,.32)
GREEN=material('ground conductor insulation',(.105,.27,.11),.02,.49)
YELLOW=material('bonding conductor insulation',(.58,.36,.055),.04,.45)
AMBER=material('liquid teaching cutaway',(.24,.115,.025),.08,.23,.78)
CONCRETE=material('weighing pad',(.13,.16,.18),.08,.76)
WHITE=material('painted safety label',(.72,.76,.72),.05,.6)
RED=material('hazard red',(.44,.035,.022),.08,.52)
TANKPAINT=material('weathered industrial pale steel',(.47,.51,.51),.38,.53)
FLOAT=material('float brushed brass',(.43,.34,.13),.7,.34)

def finish(o,name,mat,bevel=0,smooth=False):
    o.name=name
    if mat: o.data.materials.append(mat)
    if bevel:
        mod=o.modifiers.new('small manufactured edge radii','BEVEL');mod.width=bevel;mod.segments=3
        bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=mod.name)
    if smooth:
        for p in o.data.polygons: p.use_smooth=True
    return o

def box(name,loc,dim,mat=STEEL,bevel=.012):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.dimensions=dim
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(o,name,mat,bevel)

def cylinder(name,loc,r,depth,mat=STEEL,vertices=48,bevel=.004):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=loc)
    return finish(bpy.context.object,name,mat,min(bevel,depth/5),True)

def between(name,a,b,r,mat=STEEL,vertices=24):
    a,b=Vector(a),Vector(b);o=cylinder(name,(a+b)/2,r,(b-a).length,mat,vertices,min(.003,r/4))
    o.rotation_mode='QUATERNION';o.rotation_quaternion=(b-a).to_track_quat('Z','Y');return o

def torus(name,loc,major,minor,mat=EDGE,rotation=(0,0,0),segments=64):
    bpy.ops.mesh.primitive_torus_add(major_segments=segments,minor_segments=8,location=loc,major_radius=major,minor_radius=minor,rotation=rotation)
    return finish(bpy.context.object,name,mat,0,True)

def tube(name,points,r,mat=STEEL,smooth=True):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.resolution_u=12;data.bevel_depth=r;data.bevel_resolution=3
    if smooth:
        spl=data.splines.new('BEZIER');spl.bezier_points.add(len(points)-1)
        for bp,p in zip(spl.bezier_points,points): bp.co=p;bp.handle_left_type=bp.handle_right_type='AUTO'
    else:
        spl=data.splines.new('POLY');spl.points.add(len(points)-1)
        for bp,p in zip(spl.points,points):bp.co=(*p,1)
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
    return o

def group(name,objects):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o)
    for child in objects:child.parent=o
    return o

def bolt(name,loc,r=.017,depth=.012):return cylinder(name,loc,r,depth,EDGE,6,.0015)

def flange(name,loc,r=.075,axis=(0,0,1)):
    loc=Vector(loc);axis=Vector(axis).normalized();objects=[between(name+'_disc',loc-axis*.012,loc+axis*.012,r,EDGE,48)]
    tangent=axis.cross(Vector((0,1,0)))
    if tangent.length<.1:tangent=axis.cross(Vector((1,0,0)))
    tangent.normalize();other=axis.cross(tangent).normalized()
    for i in range(6):
        d=(tangent*math.cos(i*math.tau/6)+other*math.sin(i*math.tau/6))*r*.73
        objects.append(between(name+'_bolt_%02d'%i,loc+d-axis*.018,loc+d+axis*.024,.007,EDGE,6))
    return group(name,objects)

def valve(name,loc,scale=1,axis=(1,0,0)):
    x,y,z=loc;s=scale
    body=between(name+'_body',(x-.08*s,y,z),(x+.08*s,y,z),.055*s,DARK)
    stem=between(name+'_stem',(x,y,z),(x,y,z+.15*s),.012*s,EDGE)
    wheel=torus(name+'_handwheel',(x,y,z+.16*s),.08*s,.008*s,RED,segments=32)
    spokes=[between(name+'_spoke_'+str(i),(x,y,z+.16*s),(x+.075*s*math.cos(i*math.tau/3),y+.075*s*math.sin(i*math.tau/3),z+.16*s),.005*s,RED,12) for i in range(3)]
    return group(name,[body,stem,wheel]+spokes)

def badge(name,loc,dim=(.18,.012,.12)):
    plate=box(name+'_plate',loc,dim,WHITE,.004)
    x,y,z=loc
    diamond=box(name+'_diamond',(x,y-.009,z),(.075,.003,.075),RED,.001);diamond.rotation_euler.y=math.pi/4
    inset=box(name+'_diamond_white',(x,y-.012,z),(.053,.003,.053),WHITE,.001);inset.rotation_euler.y=math.pi/4
    flame=box(name+'_warning',(x,y-.015,z),(.011,.003,.035),DARK,.002)
    return group(name,[plate,diamond,inset,flame])

def desmoines():
    # A portable stainless steel tote on a platform scale, following the CSB figure.
    box('weigh_scale_base',(0,0,.055),(1.61,1.40,.11),CONCRETE,.025)
    box('weigh_scale_top',(0,0,.15),(1.48,1.27,.07),EDGE,.015)
    for x in (-.52,.52):
        box('container_forklift_skid',(x,0,.26),(.14,1.10,.15),DARK,.009)
        for y in (-.43,.43):box('container_foot',(x,y,.34),(.16,.16,.16),STEEL,.012)
    # The front panel is deliberately separate: Godot may remove it for cutaway.
    shell=[box('container_back',(0,.56,.9),(1.30,.025,1.04),STEEL,.018),box('container_left',(-.65,0,.9),(.025,1.12,1.04),STEEL,.018),box('container_right',(.65,0,.9),(.025,1.12,1.04),STEEL,.018),box('container_bottom',(0,0,.39),(1.30,1.12,.035),STEEL,.01)]
    group('container_shell',shell)
    box('container_front',(0,-.56,.9),(1.30,.025,1.04),STEEL,.018)
    box('container_lid',(0,0,1.43),(1.30,1.12,.045),STEEL,.022)
    for x in (-.65,.65):
        for y in (-.56,.56):
            box('container_corner_guard',(x,y,.91),(.065,.065,1.14),EDGE,.014)
            box('container_corner_plate',(x,y,1.50),(.13,.13,.09),STEEL,.013)
            cylinder('container_lifting_socket',(x,y,1.55),.031,.008,DARK,32,.001)
    for z in (.44,1.34):
        tube('container_weld_seam',[(-.653,-.56,z),(-.653,.56,z),(.653,.56,z),(.653,-.56,z)],.005,EDGE,False)
        box('container_front_stiffener',(0,-.582,z),(1.23,.028,.04),EDGE,.004)
    cylinder('container_manhole_neck',(-.20,.08,1.47),.245,.06,DARK)
    cylinder('container_manhole_lid',(-.20,.08,1.505),.252,.025,EDGE)
    torus('container_manhole_gasket',(-.20,.08,1.493),.24,.007,RUBBER)
    for i in range(10):
        a=i*math.tau/10;bolt('container_manhole_bolt_%02d'%i,(-.20+.22*math.cos(a),.08+.22*math.sin(a),1.525),.011,.012)
    tube('container_manhole_handle',[(-.29,.08,1.52),(-.29,.08,1.58),(-.11,.08,1.58),(-.11,.08,1.52)],.009,EDGE,False)
    cylinder('fill_port_dark',(.43,-.12,1.463),.09,.013,DARK)
    torus('fill_port_rim',(.43,-.12,1.475),.091,.012,EDGE)
    cylinder('vent_neck',(-.44,.35,1.51),.028,.11,EDGE)
    cylinder('vent_cap',(-.44,.35,1.57),.053,.022,EDGE)
    liquid=box('liquid',(0,0,.535),(1.245,1.065,.27),AMBER,.006)
    liquid['teaching_level_metres']=.67
    badge('container_hazard_label',(0,-.587,1.11))
    box('container_data_plate',(-.43,-.588,.92),(.20,.007,.10),DARK,.003)
    for z in (.90,.93,.95):box('container_data_plate_mark',(-.43,-.593,z),(.145,.002,.0025),EDGE,0)
    # Drain port and a real handwheel valve make the apparatus legible at close range.
    tube('container_drain',[(-.36,-.53,.48),(-.36,-.77,.48),(-.16,-.77,.48)],.035,STEEL)
    flange('container_drain_flange',(-.36,-.62,.48),.068,(0,1,0))
    valve('container_drain_valve',(-.16,-.77,.48),.75)
    # Vertical motor above a compact transfer pump, bolted to its own skid.
    box('pump_skid',(1.57,.16,.055),(.62,.53,.11),DARK,.012)
    for x in (1.34,1.80):
        for y in (-.02,.34):bolt('pump_anchor_bolt',(x,y,.12),.021,.018)
    cylinder('pump_volute',(1.57,.16,.27),.18,.20,PAINT,64,.012)
    cylinder('pump_motor_mount',(1.57,.16,.39),.125,.07,DARK,48,.009)
    cylinder('pump_motor',(1.57,.16,.60),.135,.36,PAINT,64,.01)
    for i in range(20):
        a=i*math.tau/20;r=.139
        fin=box('pump_motor_cooling_fin',(1.57+r*math.cos(a),.16+r*math.sin(a),.60),(.026,.012,.29),PAINT,.002);fin.rotation_euler.z=a
    cylinder('pump_motor_fan_guard',(1.57,.16,.80),.145,.045,DARK,64,.008)
    for i in range(7):box('pump_fan_vent',(1.57+(i-3)*.031,.16,.825),(.011,.19,.004),STEEL,.001)
    box('pump_terminal_box',(1.73,.15,.64),(.11,.15,.16),PAINT,.012)
    tube('pump_inlet',[(1.57,.16,.28),(1.57,.47,.28),(1.95,.47,.28)],.04,STEEL)
    flange('pump_inlet_flange',(1.95,.47,.28),.082,(1,0,0))
    tube('pump_outlet',[(1.45,.16,.28),(1.27,.16,.28),(1.27,.16,.57)],.035,STEEL)
    flange('pump_outlet_flange',(1.27,.16,.57),.072)
    # Keep the original semantic pump anchor independent from structural details.
    group('pump',[o for o in list(bpy.context.scene.objects) if o.name.startswith('pump_') and o.parent is None])
    hose=tube('hose',[(1.27,.16,.61),(1.34,.03,.96),(1.34,-.08,1.49),(1.05,-.12,1.78),(.72,-.12,1.61)],.033,RUBBER)
    between('hose_bottom_ferrule',(1.27,.16,.59),(1.28,.15,.70),.043,EDGE)
    between('hose_top_ferrule',(.76,-.12,1.64),(.70,-.12,1.60),.043,EDGE)
    between('insulator',(.70,-.12,1.60),(.65,-.12,1.58),.045,INSULATOR)
    nozzle=tube('nozzle',[(.65,-.12,1.58),(.53,-.12,1.54),(.43,-.12,1.50),(.43,-.12,1.38)],.026,EDGE)
    box('nozzle_handle',(.59,-.12,1.61),(.17,.07,.035),DARK,.009)
    tube('counterweight_suspension',[(.64,-.12,1.56),(.75,-.25,1.42),(.75,-.25,1.25)],.003,STEEL)
    weight=cylinder('counterweight',(.75,-.25,1.21),.052,.052,DARK,48,.006);weight.rotation_euler.x=math.pi/2
    bonding=tube('bonding_wire',[(.61,-.18,1.57),(.80,-.45,1.35),(.71,-.61,.92),(.65,-.56,.78)],.009,YELLOW)
    for p in ((.61,-.18,1.57),(.65,-.56,.78)):box('bonding_clamp',p,(.07,.025,.035),COPPER,.003)
    ground=[tube('ground_wire_tote',[(-.65,-.48,.43),(-.91,-.60,.24),(-1.10,-.72,.05)],.009,GREEN),tube('ground_wire_pump',[(1.76,.04,.13),(1.94,-.05,.05),(2.06,-.29,.035)],.009,GREEN)]
    group('ground_wire',ground)
    between('ground_terminal_left',(-1.10,-.72,.015),(-1.10,-.72,.12),.012,COPPER)
    between('ground_terminal_right',(2.06,-.29,.015),(2.06,-.29,.12),.012,COPPER)
    front=bpy.data.objects.get('container_front')
    for o in list(bpy.context.scene.objects):
        if o.name.startswith(('container_hazard_label','container_data_plate')) and o.parent is None:
            matrix=o.matrix_world.copy();o.parent=front;o.matrix_world=matrix
    return {'dimensions_m':{'tote_width':1.3,'tote_depth':1.12,'tote_top_y':1.455,'scale_top_y':.185},'cutaway_hide':['container_front'],'liquid_surface_y':.67,'emission':[.43,1.38,.12],'spark_start':[.75,1.21,.25],'spark_end':[.65,1.21,.25],'bonding_nodes':['bonding_wire','bonding_clamp'],'ground_nodes':['ground_wire'],'camera_target':[.35,.9,0],'camera_position':[3.8,3.0,5.3]}

def tank():
    radius=1.45;base=.24;top=3.12
    box('foundation',(0,0,.055),(3.50,3.50,.11),CONCRETE,.045)
    cylinder('foundation_circular_plinth',(0,0,.145),1.60,.18,CONCRETE,96,.015)
    cylinder('tank_bottom',(0,0,.245),1.48,.035,STEEL,96,.006)
    def shell_segment(name,a0,a1):
        n=max(4,round(abs(a1-a0)/math.tau*96));verts=[]
        for z in (base,top):
            for r in (radius-.025,radius):
                verts += [(r*math.cos(a0+(a1-a0)*i/n),r*math.sin(a0+(a1-a0)*i/n),z) for i in range(n+1)]
        q=n+1;faces=[]
        for i in range(n):faces.extend([(i,i+1,q+i+1,q+i),(2*q+i,3*q+i,3*q+i+1,2*q+i+1),(q+i,q+i+1,3*q+i+1,3*q+i),(i,2*q+i,2*q+i+1,i+1)])
        faces.extend([(0,q,3*q,2*q),(n,2*q+n,3*q+n,q+n)])
        mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o)
        return finish(o,name,TANKPAINT,0,True)
    back=shell_segment('tank_shell',math.radians(-20),math.radians(230))
    front=shell_segment('tank_front',math.radians(230),math.radians(340))
    def roof_segment(name,a0,a1):
        n=max(4,round(abs(a1-a0)/math.tau*96));verts=[(0,0,3.40)]+[(1.49*math.cos(a0+(a1-a0)*i/n),1.49*math.sin(a0+(a1-a0)*i/n),3.135) for i in range(n+1)]
        faces=[(0,i+1,i+2) for i in range(n)]
        mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);finish(o,name,TANKPAINT)
        mod=o.modifiers.new('roof sheet thickness','SOLIDIFY');mod.thickness=.018;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
        return o
    roof_segment('tank_roof',math.radians(-20),math.radians(230));roof_segment('tank_roof_front',math.radians(230),math.radians(340))
    # Shell courses and staggered longitudinal welds use separate thin seam geometry.
    for z in (.27,.95,1.67,2.39,3.11):
        for prefix,a0,a1 in [('tank_seam',-20,230),('tank_front_seam',230,340)]:
            a0,a1=math.radians(a0),math.radians(a1)
            tube(prefix,[(1.454*math.cos(a0+(a1-a0)*i/72),1.454*math.sin(a0+(a1-a0)*i/72),z) for i in range(73)],.0055,EDGE,False)
    for row in range(4):
        for j in range(8):
            a=math.radians(j*45+(row%2)*22.5);prefix='tank_front_weld' if 230<(a*180/math.pi)%360<340 else 'tank_vertical_weld'
            between(prefix,(1.453*math.cos(a),1.453*math.sin(a),base+row*.72+.02),(1.453*math.cos(a),1.453*math.sin(a),min(top,base+(row+1)*.72)),.0035,EDGE,8)
    for i in range(12):
        a=i*math.tau/12;x,y=1.51*math.cos(a),1.51*math.sin(a)
        plate=box('tank_anchor_bracket',(x,y,.30),(.14,.09,.16),STEEL,.007);plate.rotation_euler.z=a
        bolt('tank_anchor_bolt',(x,y,.405),.025,.025)
    liquid=cylinder('liquid',(0,0,.79),1.414,1.05,AMBER,96,.005);liquid['teaching_level_metres']=1.315
    # The float resembles a shallow metal dish, with a bridging handle and a narrow tape.
    float_parts=[cylinder('float_body',(.18,-.10,1.35),.245,.075,FLOAT,64,.015),torus('float_outer_seam',(.18,-.10,1.38),.237,.009,EDGE),cylinder('float_top',(.18,-.10,1.39),.23,.012,FLOAT,64,.003)]
    float_parts.append(tube('float_bridge',[(-.02,-.1,1.40),(.10,-.1,1.51),(.26,-.1,1.51),(.38,-.1,1.40)],.012,EDGE,False))
    float_parts.append(box('float_attachment',(.18,-.1,1.50),(.055,.035,.065),STEEL,.006))
    float_obj=group('float',float_parts);float_obj['surface_level_m']=1.315
    tape=box('float_tape',(.18,-.1,2.40),(.022,.006,1.78),STEEL,.001)
    # Two distinct attachment faces leave an illustrative gap for a flash overlay.
    box('float_tape_terminal',(.18,-.1,1.53),(.022,.014,.025),DARK,.002)
    cylinder('gauge_roof_guide',(.18,-.1,3.405),.055,.16,STEEL,32,.004)
    # Roof vents and bolted access cover.
    cylinder('tank_roof_manhole',(-.55,.28,3.26),.23,.15,DARK,64,.008)
    cylinder('tank_roof_manhole_cover',(-.55,.28,3.345),.25,.03,EDGE,64,.005)
    for i in range(10):a=i*math.tau/10;bolt('tank_roof_manhole_bolt',(-.55+.217*math.cos(a),.28+.217*math.sin(a),3.37),.014,.015)
    tube('tank_vent',[(.75,.28,3.27),(.75,.28,3.70),(.91,.28,3.75),(1.01,.28,3.61)],.043,STEEL)
    cylinder('tank_vent_screen',(1.01,.28,3.585),.06,.018,DARK,32,.003)
    # Side inlet and its two bolted flanges, shutoff wheel, elbow and supply line.
    tube('inlet',[(1.32,-.30,.53),(1.68,-.30,.53),(2.05,-.30,.53),(2.27,-.30,.53),(2.27,.42,.53)],.058,STEEL)
    flange('inlet_shell_flange',(1.50,-.30,.53),.12,(1,0,0));flange('inlet_line_flange',(2.15,-.30,.53),.10,(1,0,0))
    valve('inlet_valve',(1.88,-.30,.53),1.25)
    between('inlet_support',(2.12,-.30,.11),(2.12,-.30,.49),.028,DARK)
    box('inlet_support_foot',(2.12,-.30,.07),(.24,.20,.08),DARK,.009)
    tube('internal_fill_pipe',[(1.32,-.30,.53),(.83,-.30,.53),(.69,-.30,.71)],.058,STEEL)
    # Fixed ladder and safety hoops on the left side; these are visible structural details.
    ladder_y=.05
    for x in (-1.83,-1.49):between('ladder_rail',(x,ladder_y,.14),(x,ladder_y,3.70),.022,STEEL)
    for i in range(14):between('ladder_rung',(-1.83,ladder_y,.30+i*.245),(-1.49,ladder_y,.30+i*.245),.012,EDGE,16)
    for z in (.60,1.55,2.50,3.12):between('ladder_mount',(-1.66,ladder_y,z),(-1.38,ladder_y,z),.02,STEEL)
    for z in (1.65,2.15,2.65,3.15):
        tube('ladder_safety_hoop',[(-1.66+.35*math.cos(math.pi*.1+i*math.pi*1.8/24),ladder_y-.35*math.sin(math.pi*.1+i*math.pi*1.8/24),z) for i in range(25)],.013,STEEL,False)
    # Exterior level gauge linked to the tape, with a short housing.
    box('gauge_housing',(-1.38,.37,1.73),(.09,.10,2.75),DARK,.012)
    box('gauge_face',(-1.43,.37,1.73),(.008,.072,2.60),WHITE,.003)
    for i in range(24):box('gauge_mark',(-1.438,.37+(0 if i%4==0 else .015),.48+i*.105),(.005,.052 if i%4==0 else .026,.004),DARK,0)
    tube('gauge_tape_roof',[(-1.38,.37,3.15),(-1.38,.37,3.52),(.18,-.1,3.51)],.008,STEEL)
    # Ground and bonding paths remain separate objects for teaching toggles.
    tube('bonding_wire',[(.18,-.1,1.51),(.21,-.1,1.60),(.18,-.1,1.67)],.0055,YELLOW)
    tube('ground_wire',[(-1.22,-.76,.35),(-1.65,-1.10,.11),(-1.92,-1.20,.035)],.012,GREEN)
    between('ground_terminal',(-1.92,-1.20,.02),(-1.92,-1.20,.24),.016,COPPER)
    tube('ground_wire_inlet',[(1.79,-.30,.49),(1.80,-.60,.14),(1.93,-.83,.04)],.009,GREEN)
    between('ground_terminal_inlet',(1.93,-.83,.02),(1.93,-.83,.19),.013,COPPER)
    # Group all front-only decor, so removing the sheet does not leave floating seams.
    for o in list(bpy.context.scene.objects):
        if o.name.startswith(('tank_front_seam','tank_front_weld')):
            matrix=o.matrix_world.copy();o.parent=front;o.matrix_world=matrix
    return {'dimensions_m':{'tank_radius':1.45,'shell_bottom_y':base,'shell_top_y':top,'roof_apex_y':3.4},'cutaway_hide':['tank_front','tank_roof_front'],'liquid_surface_y':1.315,'emission':[.69,.71,.30],'float_center':[.18,1.35,.10],'spark_start':[.18,1.535,.10],'spark_end':[.18,1.50,.10],'bonding_nodes':['bonding_wire'],'ground_nodes':['ground_wire','ground_wire_inlet'],'camera_target':[.1,1.7,0],'camera_position':[5,4.5,7],'case_use':['valley','glenpool'],'glenpool_hide':['float','float_tape','float_tape_terminal','gauge_system']}

def optimize_meshes():
    """Batch purely decorative pieces by material without crossing interaction boundaries."""
    keep={'container_front','container_lid','tank_shell','tank_front','tank_roof','tank_roof_front','liquid','nozzle','nozzle_handle','insulator','hose','counterweight','counterweight_suspension','bonding_wire','ground_wire','ground_wire_inlet','float_tape','float_tape_terminal','inlet','internal_fill_pipe'}
    groups={'container_shell','container_front','tank_front','pump','ground_wire','float'}
    buckets={}
    gauge=bpy.data.objects.new('gauge_system',None);bpy.context.collection.objects.link(gauge)
    for o in list(bpy.context.scene.objects):
        if o.type!='MESH' or o.name in keep or o.name.startswith('bonding_clamp'):continue
        ancestor=o.parent;owner=None
        while ancestor:
            if ancestor.name in groups:owner=ancestor
            ancestor=ancestor.parent
        if o.name.startswith('gauge_'):owner=gauge
        key=((owner.name if owner else 'static_details'),o.data.materials[0].name if len(o.data.materials) else 'unpainted')
        buckets.setdefault(key,{'owner':owner,'objects':[]})['objects'].append(o)
    for (label,matname),bucket in buckets.items():
        objects=bucket['objects'];bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        if len(objects)>1:bpy.ops.object.join()
        joined=bpy.context.object;world=joined.matrix_world.copy();joined.parent=bucket['owner'];joined.matrix_world=world
        joined.name=label+'_'+matname.replace(' ','_')
    for o in list(bpy.context.scene.objects):
        if o.type=='EMPTY' and not o.children:bpy.data.objects.remove(o,do_unlink=True)

def export_and_render(meta):
    OUT.mkdir(parents=True,exist_ok=True)
    optimize_meshes()
    asset_objects=list(bpy.context.scene.objects)
    for o in asset_objects:o['teaching_asset']=True
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(OUT/(NAME+'.glb')),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False,export_extras=True)
    meta.update({'asset':NAME+'.glb','units':'metres','up_axis':'Y','front':'+Z','provenance':'Original Blender teaching geometry, informed by investigation diagrams, not measured accident reconstruction.','node_names':[o.name for o in asset_objects],'blender_version':bpy.app.version_string})
    (OUT/(NAME+'.json')).write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf8')
    # A neutral studio preview is not exported to the runtime model.
    scene=bpy.context.scene
    scene.world.color=(.055,.07,.09)
    box('preview_floor',(.4,0,-.10),(200,200,.12),material('preview dark studio',(.022,.033,.046),.05,.56),0)
    def area(name,loc,power,size,color):
        data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color
        o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((.3,0,.8))-o.location).to_track_quat('-Z','Y').to_euler()
    area('preview_key',(0,-3.5,5.3),950,4,(.81,.9,1))
    area('preview_rim',(2,3.0,3.5),1150,3,(1,.83,.62))
    area('preview_fill',(-3,-1,2),650,3,(.52,.73,1))
    camdata=bpy.data.cameras.new('preview_camera');cam=bpy.data.objects.new('preview_camera',camdata);bpy.context.collection.objects.link(cam)
    cam.location=(3.7,-5.3,3.25);target=Vector((.42,0,.82));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();camdata.type='ORTHO';camdata.ortho_scale=4.4;scene.camera=cam
    if NAME=='tank':cam.location=(5,-7,5);target=Vector((.25,0,1.5));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();camdata.ortho_scale=6.2
    scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
    scene.render.resolution_x=1100;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
    scene.view_settings.view_transform='AgX'
    scene.render.image_settings.file_format='PNG';scene.render.filepath=str(ROOT/'blender'/(NAME+'-preview.png'))
    for name in meta.get('cutaway_hide',[]):
        obj=bpy.data.objects.get(name)
        if obj:
            obj.hide_render=True
            for child in obj.children_recursive:child.hide_render=True
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender'/(NAME+'.blend')))
    bpy.ops.render.render(write_still=True)
    print('ASSET_READY',NAME,OUT/(NAME+'.glb'))

export_and_render(desmoines() if NAME=='desmoines' else tank())
