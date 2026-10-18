"""Ava Studio: original clay characters, articulated actions, and semantic GLBs.
Run through Blender 5.1. No image planes, downloaded models, or runtime service.
"""
import bpy, math, json, sys, subprocess
from pathlib import Path
from mathutils import Vector

HERE = Path(__file__).resolve().parent
OUT = HERE.parents[1] / 'public' / 'ava-studio'
SOURCE = HERE / 'sources'
SOURCE.mkdir(exist_ok=True)
for folder in ['models', 'posters']:
    (OUT / folder).mkdir(parents=True, exist_ok=True)
MANIFEST = json.loads((HERE / 'manifest.json').read_text())
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
if args:
    MANIFEST = [s for s in MANIFEST if s['id'] in args]
bpy.context.preferences.filepaths.save_version = 0
FPS, END = 24, 49
PI = math.pi
PALETTE = {'skin':'E6AB80', 'hair':'59372D', 'teal':'4E9B91', 'orange':'E58C55', 'cream':'FFF5DF', 'ink':'292B34', 'white':'FFFCF5', 'pink':'EDAFAC', 'blue':'75ADCF', 'yellow':'F4C968', 'green':'8DBD8F', 'red':'D96A61', 'purple':'AA8EB8', 'wood':'CBA47F', 'brown':'B9825D'}
MATS = {}
NODES = []

def mat(key):
    if key in MATS: return MATS[key]
    color = PALETTE.get(key, key)
    m = bpy.data.materials.new(key)
    m.diffuse_color = tuple((int(color[i:i+2],16)/255)**2.2 for i in (0,2,4)) + (1,)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = m.diffuse_color
    bsdf.inputs['Roughness'].default_value = .72
    MATS[key] = m
    return m

def empty(name, loc=(0,0,0), parent=None):
    ob = bpy.data.objects.new(name, None); bpy.context.collection.objects.link(ob)
    ob.location = loc; ob.parent = parent; NODES.append(ob)
    return ob

def finish(ob, name, loc, scale, color, parent=None, smooth=True):
    ob.name = name; ob.location = loc; ob.scale = scale; ob.parent = parent
    ob.data.materials.append(mat(color)); NODES.append(ob)
    if smooth:
        for p in ob.data.polygons: p.use_smooth = True
    return ob

def ball(name, loc, scale, color, parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10)
    return finish(bpy.context.object, name, loc, scale, color, parent)

def box(name, loc, size, color, parent=None, bevel=.06):
    bpy.ops.mesh.primitive_cube_add(size=1)
    ob = finish(bpy.context.object, name, loc, size, color, parent, False)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod=ob.modifiers.new('soft clay edges', 'BEVEL'); mod.width=bevel; mod.segments=3
        bpy.context.view_layer.objects.active=ob; bpy.ops.object.modifier_apply(modifier=mod.name)
        normal=ob.modifiers.new('weighted normals', 'WEIGHTED_NORMAL')
        bpy.ops.object.modifier_apply(modifier=normal.name)
    return ob

def cylinder(name, loc, radius, depth, color, parent=None, vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth)
    return finish(bpy.context.object, name, loc, (1,1,1), color, parent)

def cone(name, loc, r1, r2, depth, color, parent=None, vertices=24):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=r1, radius2=r2, depth=depth)
    return finish(bpy.context.object, name, loc, (1,1,1), color, parent)

def ring(name, loc, major, minor, color, parent=None):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=24, minor_segments=8)
    return finish(bpy.context.object, name, loc, (1,1,1), color, parent)

def line(name, points, radius, color, parent=None):
    curve=bpy.data.curves.new(name, 'CURVE'); curve.dimensions='3D'; curve.bevel_depth=radius; curve.bevel_resolution=2; curve.resolution_u=12
    spline=curve.splines.new('BEZIER'); spline.bezier_points.add(len(points)-1)
    for point, co in zip(spline.bezier_points, points):
        point.co=co; point.handle_left_type='AUTO'; point.handle_right_type='AUTO'
    ob=bpy.data.objects.new(name,curve); bpy.context.collection.objects.link(ob); ob.parent=parent; curve.materials.append(mat(color)); NODES.append(ob)
    bpy.context.view_layer.objects.active=ob; ob.select_set(True)
    bpy.ops.object.convert(target='MESH'); ob.select_set(False)
    return ob

def glyph(name, value, loc, size, color, parent=None):
    curve=bpy.data.curves.new(name,'FONT'); curve.body=value; curve.align_x='CENTER'; curve.size=size; curve.extrude=.075; curve.bevel_depth=.015; curve.bevel_resolution=3; curve.resolution_u=10
    ob=bpy.data.objects.new(name,curve); bpy.context.collection.objects.link(ob); ob.parent=parent; ob.location=loc; ob.rotation_euler=(PI/2,0,0); curve.materials.append(mat(color)); NODES.append(ob)
    bpy.context.view_layer.objects.active=ob; ob.select_set(True); bpy.ops.object.convert(target='MESH'); ob.select_set(False)
    return ob

def face(parent, z=1.48, sad=False):
    for side in (-1,1):
        ball('bright eye', (side*.105,-.268,z+.04),(.064,.027,.075),'white',parent)
        ball('eye pupil',(side*.105,-.295,z+.04),(.028,.015,.039),'ink',parent)
        ball('eye glint',(side*.096,-.309,z+.055),(.009,.005,.012),'white',parent)
        ball('rosy cheek',(side*.205,-.238,z-.065),(.06,.012,.034),'pink',parent)
    ball('little nose',(0,-.31,z-.035),(.043,.04,.04),'skin',parent)
    mouth_z = z-.14
    points = [(-.07,-.29,mouth_z), (0,-.31,mouth_z+(.045 if sad else -.025)), (.07,-.29,mouth_z)]
    line('expressive smile',points,.012,'hair',parent)

def actor(subject='ava', loc=(0,0,0), sad=False):
    if subject=='dog': return animal('dog',loc)
    root=empty('actor_'+subject,loc)
    adult=subject in ['mommy','daddy','grandma','grandpa']
    shirt='purple' if subject in ['mommy','grandma'] else 'green' if subject in ['daddy','grandpa'] else 'orange'
    hair='C9C5C1' if subject in ['grandma','grandpa'] else 'hair'
    ball('soft shirt',(0,0,1.0),(.30,.22,.36),shirt,root)
    ball('overalls',(0,.005,.77),(.28,.22,.23),'teal',root)
    for side in (-1,1):
        box('overall strap',(side*.15,-.20,1.07),(.065,.035,.30),'teal',root,.02)
        ball('wooden button',(side*.15,-.227,1.17),(.024,.014,.024),'yellow',root)
    box('front pocket',(0,-.225,.91),(.18,.032,.14),'teal',root,.04)
    head=empty('head',(0,0,0),root)
    ball('clay head',(0,0,1.49),(.32,.285,.35),'skin',head)
    ball('hair cap',(0,.035,1.68),(.333,.28,.22),hair,head)
    for side in (-1,1):
        ball('little ear',(side*.31,0,1.48),(.07,.06,.10),'skin',head)
        ball('bob hair',(side*.265,.08,1.51),(.10,.20,.28 if not adult or subject=='mommy' else .17),hair,head)
    for n in range(5): ball('fringe',(-.22+n*.11,-.19,1.70),(.11,.10,.10),hair,head)
    face(head,sad=sad)
    for child in head.children: child.location.z -= 1.49
    head.location.z = 1.49
    joints={}
    for side,sign in [('L',-1),('R',1)]:
        arm=empty('shoulder_'+side,(sign*.32,0,1.18),root)
        ball('shirt sleeve',(0,0,-.065),(.115,.12,.15),shirt,arm)
        ball('upper arm',(0,0,-.20),(.078,.078,.17),'skin',arm)
        elbow=empty('elbow_'+side,(0,0,-.29),arm)
        ball('forearm',(0,0,-.12),(.07,.07,.15),'skin',elbow)
        hand=empty('hand_'+side,(0,0,-.26),elbow)
        ball('palm',(0,0,0),(.085,.055,.085),'skin',hand)
        for f in range(4): ball('rounded finger',(-.055+f*.035,-.01,-.07),(.019,.025,.052),'skin',hand)
        hip=empty('hip_'+side,(sign*.14,.015,.70),root)
        ball('trouser leg',(0,0,-.17),(.11,.12,.23),'teal',hip)
        knee=empty('knee_'+side,(0,0,-.31),hip)
        ball('lower leg',(0,0,-.13),(.09,.10,.19),'teal',knee)
        ball('little shoe',(0,-.065,-.285),(.12,.19,.08),'cream',knee)
        joints.update({side:arm,side+'e':elbow,side+'h':hand,side+'leg':hip,side+'k':knee})
    if adult: root.scale=(1.1,1.1,1.14)
    joints.update(root=root,head=head,dog=False)
    return joints

def animal(kind,loc=(0,0,0),scale=1):
    root=empty('actor_'+kind,loc); root.scale=(scale,scale,scale)
    color={'cat':'orange','bear':'brown','bunny':'cream','frog':'green','cow':'white','horse':'brown','dog':'brown','pig':'pink','goat':'cream','lion':'yellow','zebra':'white','whale':'blue'}.get(kind,'brown')
    if kind in ['bird','duck','fish','whale']:
        col={'bird':'blue','duck':'yellow','fish':'orange','whale':'blue'}[kind]
        ball('round animal body',(0,0,.55),(.42,.65,.38),col,root)
        for sign in (-1,1): ball('round eye',(sign*.21,-.51,.75),(.06,.055,.065),'ink',root)
        if kind in ['bird','duck']:
            ball('beak',(0,-.70,.54),(.18,.23,.065),'orange',root)
            for sign in (-1,1): ball('wing',(sign*.4,.05,.62),(.10,.35,.20),col,root)
        else:
            for sign in (-1,1):
                fin=cone('tail fin',(sign*.14,.69,.57),.25,0,.10,col,root,3); fin.rotation_euler=(PI/2,0,sign*.6)
            for sign in (-1,1): ball('side fin',(sign*.4,.0,.48),(.23,.13,.065),col,root)
        return dict(root=root,head=root,dog=True,Lleg=root,Rleg=root,L=root,R=root)
    ball('round animal body',(0,.08,.52),(.32,.50,.26),color,root)
    ball('animal head',(0,-.43,.79),(.29,.28,.29),color,root)
    if kind=='lion': ball('mane',(0,-.31,.78),(.38,.19,.38),'brown',root)
    snout='pink' if kind in ['cow','pig'] else 'cream'
    ball('muzzle',(0,-.66,.70),(.19,.16,.12),snout,root)
    ball('nose',(0,-.79,.76),(.09,.04,.055),'ink',root)
    for sign in (-1,1):
        ball('eye',(sign*.13,-.66,.90),(.044,.028,.05),'ink',root)
        if kind in ['cat','goat','horse','zebra']:
            ear=cone('pointed ear',(sign*.21,-.39,1.09),.10,0,.22,color,root,3)
        elif kind=='bunny': ball('long bunny ear',(sign*.14,-.37,1.19),(.08,.07,.35),color,root)
        else: ball('animal ear',(sign*.27,-.31,.87),(.12,.09,.20 if kind=='dog' else .12),color,root)
    if kind in ['goat','cow']:
        for sign in (-1,1): cone('horn',(sign*.16,-.35,1.15),.055,0,.25,'wood',root)
    if kind in ['cow','zebra']:
        for n in range(5): ball('dark marking',((-.22 if n%2 else .22),.0+(n//2)*.16,.60),(.10,.075,.19),'ink',root)
    tail=line('tail',[(0,.48,.55),(0,.69,.75),(.15,.79,.81)],.055,color,root)
    legs=[]
    for x in [-.22,.22]:
        for y in [-.21,.36]:
            limb=empty('leg',(x,y,.40),root); ball('little paw',(0,-.015,-.19),(.09,.12,.25),color,limb); legs.append(limb)
    return dict(root=root,head=root,dog=True,Lleg=legs[0],Rleg=legs[3],L=legs[1],R=legs[2],tail=tail)

def cup(loc=(0,0,.5),parent=None,full=True):
    g=empty('cup',loc,parent)
    cylinder('cup base',(0,0,-.12),.16,.05,'blue',g)
    ring('cup rim',(0,0,.11),.16,.025,'blue',g)
    vertices=[]
    for radius,z in [(.165,-.12),(.165,.12),(.13,.12),(.13,-.10)]:
        vertices.extend([(radius*math.cos(i*PI/12),radius*math.sin(i*PI/12),z) for i in range(24)])
    faces=[]
    for band in range(3):
        for i in range(24):
            j=(i+1)%24; faces.append((band*24+i,band*24+j,(band+1)*24+j,(band+1)*24+i))
    mesh=bpy.data.meshes.new('hollow cup mesh'); mesh.from_pydata(vertices,[],faces); mesh.update()
    wall=bpy.data.objects.new('hollow cup wall',mesh); bpy.context.collection.objects.link(wall); wall.parent=g; mesh.materials.append(mat('blue')); NODES.append(wall)
    for polygon in mesh.polygons: polygon.use_smooth=True
    if full: cylinder('drink surface',(0,0,.10),.13,.01,'cream',g)
    handle=ring('cup handle',(.19,0,0),.105,.028,'blue',g); handle.rotation_euler=(PI/2,0,0)
    return g

def teddy(loc=(0,0,.7),parent=None):
    g=empty('teddy',loc,parent)
    ball('bear tummy',(0,0,0),(.18,.13,.24),'brown',g); ball('bear head',(0,0,.27),(.18,.15,.17),'brown',g)
    for sign in [-1,1]:
        ball('bear ear',(sign*.14,0,.40),(.075,.06,.075),'brown',g)
        ball('bear arm',(sign*.21,0,.06),(.085,.08,.15),'brown',g)
        ball('bear foot',(sign*.12,-.05,-.22),(.10,.12,.08),'brown',g)
        ball('bear eye',(sign*.06,-.14,.31),(.018,.015,.022),'ink',g)
    ball('bear muzzle',(0,-.14,.24),(.085,.04,.06),'cream',g); ball('bear nose',(0,-.18,.26),(.028,.02,.02),'ink',g)
    return g

def chair(loc=(0,.2,0),parent=None):
    g=empty('chair',loc,parent)
    box('chair seat',(0,0,.51),(.64,.62,.12),'yellow',g)
    box('chair back',(0,.26,.85),(.62,.10,.67),'yellow',g)
    for x in [-.24,.24]:
        for y in [-.22,.22]: box('chair leg',(x,y,.25),(.08,.08,.50),'wood',g,.02)
    return g

def table(loc=(0,0,0),parent=None):
    g=empty('table',loc,parent); box('table top',(0,0,.85),(1.4,.8,.14),'wood',g)
    for x in [-.55,.55]:
        for y in [-.28,.28]: box('table leg',(x,y,.40),(.10,.10,.8),'wood',g,.03)
    return g

def toybox(loc=(.8,0,0),parent=None,door=False):
    g=empty('toy box',loc,parent)
    if door:
        for x in [-.39,.39]: box('door frame',(x,0,.85),(.10,.16,1.8),'wood',g)
        box('door frame',(0,0,1.7),(.85,.16,.12),'wood',g)
        hinge=empty('door hinge',(-.32,0,0),g)
        box('door',( .32,0,.84),(.64,.08,1.6),'orange',hinge)
        ball('door knob',(.55,-.075,.84),(.05,.05,.05),'yellow',hinge)
    else:
        box('box floor',(0,0,.08),(.8,.7,.12),'wood',g)
        for x in [-.38,.38]: box('box side',(x,0,.35),(.07,.7,.60),'orange',g)
        for y in [-.32,.32]: box('box side',(0,y,.35),(.8,.06,.60),'orange',g)
        hinge=empty('lid hinge',(0,.35,.63),g)
        box('box lid',(0,-.35,0),(.86,.75,.08),'yellow',hinge)
    return g,hinge

def vehicle(kind='car',loc=(0,0,0),parent=None):
    g=empty(kind,loc,parent)
    if kind in ['bicycle','scooter']:
        for y in [-.55,.55]:
            wheel=ring('wheel',(0,y,.25),.23,.04,'ink',g); wheel.rotation_euler=(0,PI/2,0)
        line('frame',[(0,-.55,.25),(0,0,.65),(0,.55,.25),(0,0,.25),(0,-.55,.25)],.035,'teal',g)
        line('handlebar',[(0,-.5,.3),(0,-.4,1),(.2,-.4,1)],.035,'wood',g)
        if kind=='bicycle': box('saddle',(0,.1,.75),(.2,.25,.06),'brown',g)
    elif kind in ['airplane','helicopter']:
        ball('fuselage',(0,0,.7),(.28,.9,.28),'cream',g)
        ball('cockpit',(0,-.5,.82),(.23,.35,.21),'blue',g)
        box('wing',(0,.05,.65),(2.0,.35,.10),'orange',g)
        box('tail',(0,.7,.8),(.7,.25,.08),'teal',g)
        if kind=='helicopter': box('rotor',(0,0,1.2),(1.8,.12,.045),'wood',g)
    elif kind=='boat':
        hull=cone('hull',(0,0,.35),.3,.6,.38,'orange',g,4); hull.scale=(1,1.8,1); hull.rotation_euler.z=PI/4
        line('mast',[(0,0,.5),(0,0,1.6)],.035,'wood',g)
        sail=cone('sail',(.25,0,1.1),.4,0,.03,'cream',g,3); sail.rotation_euler=(PI/2,0,PI/2)
    else:
        long=kind in ['bus','train','truck']; length=1.5 if long else 1.0
        box('vehicle body',(0,0,.37),(.65,length,.3),'orange' if kind!='tractor' else 'green',g)
        box('cabin',(0,-.2,.68),(.55,.6,.4),'yellow',g)
        box('windshield',(0,-.515,.72),(.43,.03,.21),'blue',g,.03)
        for side in [-1,1]:
            for y in [-length*.32,length*.32]:
                wheel=cylinder('rubber wheel',(side*.36,y,.26),.21,.10,'ink',g); wheel.rotation_euler=(0,PI/2,0)
                hub=cylinder('wheel hub',(side*.415,y,.26),.09,.014,'cream',g); hub.rotation_euler=(0,PI/2,0)
        if kind=='truck': box('truck cargo',(0,.38,.68),(.62,.65,.5),'teal',g)
        if kind=='train': cylinder('chimney',(0,-.45,1),.10,.35,'ink',g)
        if kind=='stroller':
            box('stroller hood',(0,0,.95),(.75,.60,.22),'teal',g)
            line('push handle',[(-.28,.5,.5),(-.28,.65,1.2),(.28,.65,1.2),(.28,.5,.5)],.035,'wood',g)
        if kind=='wagon':
            box('wagon cargo',(0,.1,.66),(.6,.8,.3),'red',g)
            line('pull handle',[(0,-.5,.4),(0,-.9,.8)],.035,'wood',g)
    return g

def object_word(kind, loc=(0,0,0), parent=None):
    g=empty('object_'+kind,loc,parent)
    if kind in ['dog','cat','bird','fish','cow','horse','duck','bunny','bear','frog','goat','lion','pig','zebra','whale']:
        animal(kind,(0,0,0))['root'].parent=g
    elif kind in ['mommy','daddy','baby','grandma','grandpa','brother','sister','friend','boy','girl']:
        actor(kind if kind in ['mommy','daddy','grandma','grandpa'] else 'ava')['root'].parent=g
        if kind=='baby': g.scale=(.6,.6,.6)
    elif kind in ['car','train','bus','truck','bicycle','airplane','boat','stroller','wagon','tractor','helicopter','scooter']:
        vehicle(kind,parent=g)
    elif kind in ['apple','orange','banana','egg','cookie','bread','cheese','peas']:
        if kind=='banana':
            for i in range(7): ball('curved banana',(-.45+i*.14,0,.35+((i-3)/3)**2*.25),(.15,.16,.18),'yellow',g)
        elif kind=='cheese':
            cheese=cylinder('cheese wedge',(0,0,.3),.5,.38,'yellow',g,3)
            for x,z in [(-.12,.3),(.12,.42),(.23,.23)]: ball('cheese hole',(x,-.24,z),(.055,.025,.055),'orange',g)
        elif kind=='peas':
            ball('open pea pod',(0,0,.25),(.65,.18,.18),'green',g)
            for i in range(5): ball('pea',(-.4+i*.2,-.12,.33),(.12,.12,.12),'teal',g)
        elif kind=='bread':
            box('bread loaf',(0,0,.35),(.9,.5,.55),'brown',g,.20)
            for x in [-.25,0,.25]: line('bread score',[(x,-.22,.53),(x,0,.64),(x,.22,.53)],.025,'cream',g)
        elif kind=='cookie':
            cylinder('cookie',(0,0,.15),.45,.16,'wood',g)
            for x,y in [(-.2,-.1),(.1,.2),(.24,-.15),(-.15,.22),(0,0)]: ball('chocolate chip',(x,y,.24),(.055,.055,.035),'hair',g)
        else:
            color={'apple':'red','orange':'orange','egg':'cream'}[kind]
            ball(kind,(0,0,.45),(.37,.35,.47 if kind=='egg' else .38),color,g)
            if kind!='egg':
                line('fruit stem',[(0,0,.78),(.035,0,.94)],.025,'wood',g)
                leaf=ball('fruit leaf',(.15,0,.88),(.18,.06,.065),'green',g); leaf.rotation_euler.y=-.4
    elif kind in ['milk','juice','water']:
        if kind=='water': cup((0,0,.4),g)
        elif kind=='milk':
            cylinder('milk bottle',(0,0,.4),.24,.65,'cream',g); cylinder('bottle cap',(0,0,.8),.20,.12,'teal',g)
            for z in [.3,.4,.5]: box('bottle measure',(.15,-.20,z),(.10,.015,.015),'blue',g,.005)
        else:
            box('juice carton',(0,0,.4),(.45,.4,.65),'orange',g)
            line('straw',[(.12,0,.65),(.12,0,1.0),(.25,0,1.1)],.025,'cream',g)
    elif kind=='bed':
        box('bed base',(0,0,.3),(1,1.9,.2),'wood',g); box('soft mattress',(0,0,.47),(.95,1.85,.18),'cream',g)
        box('pillow',(0,-.63,.61),(.7,.42,.16),'white',g,.1); box('quilt',(0,.25,.61),(1,1.15,.1),'teal',g)
        box('headboard',(0,-.93,.7),(1.05,.12,.8),'wood',g)
    elif kind=='chair': chair(parent=g)
    elif kind=='table': table(parent=g)
    elif kind=='door': toybox((0,0,0),g,True)
    elif kind=='window':
        box('window frame',(0,0,.9),(1.3,.12,1.3),'wood',g)
        box('window glass',(0,-.07,.9),(1.12,.03,1.12),'blue',g)
        box('window crossbar',(0,-.10,.9),(1.2,.04,.07),'cream',g)
        box('window crossbar',(0,-.10,.9),(.07,.04,1.2),'cream',g)
    elif kind=='light':
        cylinder('lamp foot',(0,0,.08),.3,.10,'wood',g); cylinder('lamp stem',(0,0,.7),.04,1.2,'wood',g)
        cone('lampshade',(0,0,1.3),.45,.24,.5,'yellow',g)
    elif kind in ['bath','potty']:
        box('ceramic base',(0,0,.3),(1.1,.7,.5),'cream',g,.2)
        ring('bath rim',(0,0,.57),.4,.08,'white',g).scale=(1.35,.8,1)
        ball('bath water',(0,0,.55),(.48,.28,.045),'blue',g)
        line('tap',[(.45,.1,.5),(.45,.1,.85),(.25,.1,.85)],.04,'wood',g)
        if kind=='potty': box('toilet cistern',(0,.34,.75),(.6,.2,.7),'cream',g)
    elif kind=='book':
        for side in [-1,1]:
            page=box('open book',(side*.28,0,.15),(.55,.72,.10),'cream',g,.02); page.rotation_euler.y=side*.16
            for y in [-.2,-.08,.04,.16]: box('printed line',(side*.28,y,.21),(.34,.018,.008),'wood',g,.002)
        line('book spine',[(0,-.36,.12),(0,.36,.12)],.035,'orange',g)
    elif kind=='blanket':
        box('folded blanket',(0,0,.2),(1.0,.7,.3),'purple',g,.12)
        for x in [-.35,-.15,.05,.25]: box('blanket stripe',(x,0,.36),(.05,.62,.015),'cream',g,.005)
    elif kind=='phone':
        ob=box('phone',(0,0,.7),(.55,.1,1.05),'ink',g,.1); box('phone screen',(0,-.06,.72),(.44,.02,.8),'blue',g,.06)
        for x in [-.12,.12]:
            for z in [.45,.65,.85]: ball('app icon',(x,-.08,z),(.06,.02,.06),'yellow',g)
    elif kind in ['ball','bubbles']:
        for i in range(1 if kind=='ball' else 7):
            b=ball('ball' if kind=='ball' else 'bubble',((i%3-.8)*.3,(i%2)*.18,.45+(i//3)*.35),(.35,.35,.35) if kind=='ball' else (.15,.15,.15),'red' if kind=='ball' else 'blue',g)
            if kind=='ball': ring('ball seam',b.location,.35,.016,'cream',g).rotation_euler=(PI/2,0,0)
    elif kind=='teddy-bear': teddy((0,0,.5),g)
    elif kind=='doll': actor('ava')['root'].parent=g
    elif kind=='blocks':
        for i in range(5): box('building block',((i%3-1)*.35,0,.18+(i//3)*.36),(.33,.33,.33),['teal','yellow','orange','purple','red'][i],g)
    elif kind=='puzzle':
        box('puzzle board',(0,0,.08),(1,.8,.1),'wood',g)
        for x,y,col in [(-.25,-.2,'teal'),(.25,-.2,'yellow'),(-.25,.2,'orange'),(.25,.2,'purple')]:
            box('puzzle piece',(x,y,.17),(.43,.34,.10),col,g,.07); ball('puzzle tab',(x+.21,y,.17),(.09,.09,.05),col,g)
    elif kind=='crayon':
        cylinder('crayon',(0,0,.55),.12,.85,'red',g); cone('crayon tip',(0,0,1.06),.12,0,.2,'red',g)
        for z in [.28,.8]: ring('crayon wrapper',(0,0,z),.12,.012,'cream',g)
    elif kind=='drum':
        cylinder('drum shell',(0,0,.45),.45,.6,'red',g); cylinder('drum skin',(0,0,.76),.46,.035,'cream',g)
        for x in [-.2,.2]: line('drumstick',[(x,-.1,.78),(x+.12,.2,1.15)],.025,'wood',g)
    elif kind in ['sun','moon','star','cloud','rain','tree','flower','grass','rock','leaf']:
        if kind=='sun':
            ball('sun',(0,0,.8),(.4,.14,.4),'yellow',g)
            for i in range(10):
                a=i*PI/5; line('sun ray',[(.52*math.sin(a),0,.8+.52*math.cos(a)),(.69*math.sin(a),0,.8+.69*math.cos(a))],.045,'yellow',g)
        elif kind=='moon':
            points=[(.45*math.cos(t),0,.8+.45*math.sin(t)) for t in [i*PI/15 for i in range(3,28)]]
            line('crescent moon',points,.13,'yellow',g)
        elif kind=='star':
            points=[((.5 if i%2==0 else .23)*math.sin(i*PI/5),0,.7+(.5 if i%2==0 else .23)*math.cos(i*PI/5)) for i in range(11)]
            line('star outline',points,.07,'yellow',g)
        elif kind in ['cloud','rain']:
            for x,z,s in [(-.35,1,.23),(0,1.15,.32),(.35,1.02,.25)]: ball('cloud',(x,0,z),(s,.2,s),'white',g)
            if kind=='rain':
                for x in [-.3,0,.3]: ball('raindrop',(x,0,.45),(.06,.05,.14),'blue',g)
        elif kind=='tree':
            cylinder('tree trunk',(0,0,.55),.12,.95,'wood',g)
            for x,y,z in [(-.3,0,1.1),(.25,.05,1.2),(0,0,1.5)]: ball('leaf canopy',(x,y,z),(.4,.32,.4),'green',g)
        elif kind=='flower':
            line('flower stem',[(0,0,.1),(0,0,1.05)],.035,'green',g)
            for i in range(6):
                a=i*PI/3; ball('flower petal',(.23*math.sin(a),0,1.05+.23*math.cos(a)),(.16,.075,.16),'pink',g)
            ball('flower center',(0,-.08,1.05),(.13,.08,.13),'yellow',g)
        elif kind=='grass':
            for i in range(9): line('blade of grass',[(-.45+i*.11,0,.05),(-.45+i*.11,0,.35),(-.55+i*.14,0,.65+(i%3)*.1)],.025,'green',g)
        elif kind=='rock': ball('smooth rock',(0,0,.27),(.5,.35,.3),'9DADB2',g)
        else:
            leaf=ball('leaf',(0,0,.5),(.4,.06,.65),'green',g); leaf.rotation_euler.y=.4
            line('leaf vein',[(-.2,-.065,.1),(0,-.065,.5),(.2,-.065,.9)],.018,'cream',g)
    elif kind in ['hat','igloo','kite','nest','queen','rainbow','umbrella','violin','xylophone','yo-yo']:
        if kind=='hat':
            cylinder('hat brim',(0,0,.15),.55,.08,'purple',g); cylinder('hat crown',(0,0,.48),.33,.6,'purple',g); cylinder('hat band',(0,0,.26),.34,.10,'yellow',g)
        elif kind=='igloo':
            ball('snow dome',(0,0,.2),(.65,.55,.5),'cream',g)
            arch=ring('entrance arch',(0,-.5,.2),.19,.07,'blue',g); arch.rotation_euler=(PI/2,0,0)
            ball('entrance',(0,-.55,.18),(.16,.025,.20),'ink',g)
            for z,r in [(.35,.57),(.55,.4)]: ring('snow blocks',(0,0,z),r,.018,'blue',g)
        elif kind=='kite':
            diamond=cylinder('kite diamond',(0,0,.9),.5,.04,'orange',g,4); diamond.rotation_euler=(PI/2,0,0); diamond.scale.y=1.4
            line('kite string',[(0,0,.3),(.1,0,.05),(-.1,0,-.2)],.012,'wood',g)
            for z in [.15,-.05]: box('kite ribbon',(.03,0,z),(.15,.03,.06),'teal',g,.02)
        elif kind=='nest':
            for z,r in [(.15,.42),(.23,.46),(.30,.48)]: ring('woven nest',(0,0,z),r,.07,'brown',g)
            for x,y in [(-.18,0),(.1,.12),(.15,-.15)]: ball('nest egg',(x,y,.38),(.13,.12,.18),'cream',g)
        elif kind=='queen':
            actor('mommy')['root'].parent=g
            ring('gold crown',(0,0,2.05),.25,.04,'yellow',g)
            for i in range(5):
                a=i*PI*2/5; cone('crown point',(.22*math.cos(a),.22*math.sin(a),2.15),.07,0,.25,'yellow',g)
        elif kind=='rainbow':
            for i,color in enumerate(['red','orange','yellow','green','blue','purple']):
                r=.7-i*.085; points=[(r*math.cos(a*PI/18),0,.2+r*math.sin(a*PI/18)) for a in range(19)]; line('rainbow arch',points,.045,color,g)
        elif kind=='umbrella':
            ball('umbrella canopy',(0,0,1.1),(.65,.65,.22),'purple',g)
            line('umbrella handle',[(0,0,1.1),(0,0,.2),(.1,0,.1),(.2,0,.2)],.035,'wood',g)
            for i in range(8):
                a=i*PI/4; line('umbrella rib',[(0,0,1.3),(.4*math.cos(a),.4*math.sin(a),1.22),(.64*math.cos(a),.64*math.sin(a),1.08)],.012,'cream',g)
        elif kind=='violin':
            ball('violin lower body',(0,0,.35),(.28,.10,.28),'brown',g); ball('violin upper body',(0,0,.7),(.22,.10,.22),'brown',g)
            box('violin neck',(0,0,1.02),(.1,.08,.4),'hair',g,.02)
            for x in [-.04,-.01,.02,.05]: line('violin string',[(x,-.115,.3),(x,-.115,1.2)],.005,'cream',g)
            line('bow',[(.4,0,.1),(.4,0,1.15)],.02,'wood',g)
        elif kind=='xylophone':
            for y in [-.2,.2]: box('xylophone rail',(0,y,.15),(1.2,.06,.10),'wood',g,.02)
            for i,col in enumerate(['red','orange','yellow','green','blue','purple']): box('tone bar',(-.5+i*.2,0,.25),(.16,.8-i*.06,.08),col,g,.03)
            line('mallet',[(-.5,-.5,.1),(.1,-.5,.1)],.02,'wood',g); ball('mallet head',(.12,-.5,.1),(.07,.07,.07),'orange',g)
        else:
            for y in [-.08,.08]:
                disc=cylinder('yo-yo disk',(0,y,.5),.35,.10,'red',g); disc.rotation_euler=(PI/2,0,0)
            line('yo-yo string',[(0,0,.5),(.15,0,1.1),(.1,0,1.35)],.012,'cream',g)
    elif kind in ['eyes','nose','mouth','ears','hands','feet','hair','teeth','belly','face']:
        if kind=='hands':
            for side in [-1,1]:
                hand=empty('hand',(side*.28,0,.45),g); ball('palm',(0,0,0),(.19,.08,.23),'skin',hand)
                for i in range(4): ball('finger',(-.13+i*.085,0,.26),(.04,.055,.17-i*.01),'skin',hand)
                ball('thumb',(.23,0,.05),(.12,.07,.065),'skin',hand)
        elif kind=='feet':
            for side in [-1,1]:
                ball('foot',(side*.22,0,.15),(.16,.32,.13),'skin',g)
                for i in range(5): ball('toe',(side*.22-.10+i*.05,-.29,.16),(.03,.06,.04),'skin',g)
        else:
            h=empty('face',parent=g); ball('head',(0,0,.65),(.45,.30,.50),'skin',h)
            for side in [-1,1]:
                ball('ear',(side*.45,0,.65),(.10,.06,.17),'red' if kind=='ears' else 'skin',h)
                ball('eye',(side*.16,-.28,.78),(.075,.025,.08),'teal' if kind=='eyes' else 'ink',h)
            ball('nose',(0,-.35,.65),(.08,.10,.10),'red' if kind=='nose' else 'skin',h)
            line('mouth',[(-.16,-.29,.45),(0,-.33,.40),(.16,-.29,.45)],.03,'red' if kind=='mouth' else 'hair',h)
            if kind=='teeth':
                for i in range(5): box('tooth',(-.12+i*.06,-.34,.45),(.052,.045,.07),'white',h,.01)
            if kind=='hair':
                for i in range(7): ball('hair tuft',(-.32+i*.105,-.02,1.03),(.13,.28,.17),'hair',h)
            if kind=='belly':
                h.scale=(.5,.5,.5); h.location.z=.6; ball('tummy',(0,0,.45),(.4,.26,.4),'skin',g); ball('belly button',(0,-.26,.45),(.035,.01,.035),'wood',g)
    else:
        raise ValueError('No semantic object builder for '+kind)
    return g

def action_scene(action,subject):
    if action.startswith('need-'):
        word=action[5:]
        mapping={'more':'eat','help':'help','stop':'stop','again':'jump','mine':'hug','all-done':'all-done','please':'please','thank-you':'thank-you','yes':'yes','no':'no','want':'please','water':'drink','milk':'milk','hungry':'eat','thirsty':'drink','tired':'sleep','potty':'potty','hurt':'hurt','hot':'hot','cold':'cold'}
        rig=action_scene(mapping[word],subject)
        if word=='more': object_word('apple',(.85,.4,.9)).scale=(.45,.45,.45)
        if word=='again': ball('second bounce marker',(.8,0,.12),(.15,.15,.1),'yellow')
        if word=='yes': line('yes check',[(.6,0,.8),(.78,0,.64),(1.05,0,1.05)],.06,'green')
        if word=='no':
            line('no cross',[(.6,0,.7),(1,0,1.1)],.06,'red'); line('no cross',[(.6,0,1.1),(1,0,.7)],.06,'red')
        if word=='want': object_word('ball',(-.75,-.3,.2)).scale=(.6,.6,.6)
        if word=='hungry':
            bowl=cup((-.7,-.1,.5),full=False); bowl.scale=(1.4,1.4,1.4)
        if word=='thirsty': cup((-.7,-.1,.5),full=False)
        return rig
    if action.startswith('word-'):
        word=action[5:]
        aliases={'more':'eat','all-done':'all-done','yes':'yes','no':'no','please':'please','thank-you':'thank-you','help':'help','up':'stand','down':'sit','go':'run'}
        if word in ['eat','drink','sleep','sit','stand','walk','run','jump','clap','hug'] or word in aliases:
            return action_scene(aliases.get(word,word),subject)
        object_word(word)
        return None
    if action.startswith('number-'):
        n=int(action.split('-')[1]);
        for variant in ['symbol','alternate','word']:
            group=empty('variant_'+variant)
            if variant=='symbol': glyph('number solid',str(n),(0,0,.3),1.6,'teal',group)
            elif variant=='word': glyph('number word',['zero','one','two','three','four','five','six','seven','eight','nine','ten'][n],(0,0,.5),.65,'teal',group)
            else:
                box('ten frame tray',(0,.07,.48),(2.08,.08,1.0),'cream',group,.06)
                for i in range(10):
                    x=(i%5-2)*.40; z=.25+(1-i//5)*.45
                    ring('counting slot',(x,0,z),.16,.012,'wood',group).rotation_euler=(PI/2,0,0)
                    if i<n:
                        bead=ball('counting bead',(x,-.04,z),(.14,.14,.14),'teal',group)
                        start=1+int(i/max(1,n)*36)
                        for frame,amount in [(1,0),(start,0),(start+6,1),(END,1)]:
                            bead.scale=(.14*amount,.14*amount,.14*amount); bead.keyframe_insert('scale',frame=frame)
                glyph('counting numeral',str(n),(0,0,1.1),.6,'teal',group)
        return None
    if action.startswith('letter-'):
        letter=action[-1]
        for variant in ['symbol','alternate','word']:
            group=empty('variant_'+variant)
            if variant=='word':
                words=['apple','ball','cat','dog','egg','fish','goat','hat','igloo','juice','kite','lion','moon','nest','orange','pig','queen','rainbow','sun','tree','umbrella','violin','whale','xylophone','yo-yo','zebra']
                word=words[ord(letter)-65]
                glyph('uppercase solid',letter,(-.25,0,1.45),.5,'purple',group)
                glyph('lowercase solid',letter.lower(),(.25,0,1.45),.5,'orange',group)
                example=object_word(word,parent=group); example.scale=(.58,.58,.58)
                glyph('example word',word,(0,-.1,-.12),.18,'teal',group)
            else: glyph('letter solid',letter if variant=='symbol' else letter.lower(),(0,0,.3),1.65,'purple',group)
        return None
    if action.startswith('shape-'):
        parts=action[6:].split('-'); kind=parts[0]; color=parts[1] if len(parts)>1 else 'teal'
        color={'colorless':'cream','red':'red','orange':'orange','yellow':'yellow','green':'green','blue':'blue','purple':'purple','pink':'pink'}.get(color,'teal')
        if kind in ['circle','oval']:
            ob=cylinder('solid '+kind,(0,0,.8),.65,.25,color); ob.rotation_euler=(PI/2,0,0)
            if kind=='oval': ob.scale.x=1.4; ob.scale.y=.75
        elif kind in ['square','rhombus']:
            ob=box('solid '+kind,(0,0,.8),(1.1,.25,1.1),color)
            if kind=='rhombus': ob.rotation_euler.y=PI/4
        else:
            ob=cylinder('solid triangle',(0,0,.8),.8,.25,color,vertices=3); ob.rotation_euler=(PI/2,0,PI/2)
        return None
    if action.startswith('position-'):
        pos=action[9:]; g,lid=toybox((0,0,0)); lid.hide_render=True; lid.hide_viewport=True
        locs={'inside':(0,0,.32),'outside':(.9,-.5,.22),'on':(0,0,.87),'under':(0,-.12,.25),'behind':(0,.65,.3),'in-front':(0,-.72,.25),'beside':(.9,0,.25),'between':(0,-.1,.25),'above':(0,0,1.45),'below':(0,-.1,.3),'near':(.65,-.3,.25),'far':(1.7,-.3,.25)}
        if pos=='on': lid.hide_render=False; lid.hide_viewport=False
        if pos in ['under','below']:
            for ob in list(NODES):
                if ob==g or ob.parent==g: ob.hide_render=True; ob.hide_viewport=True
            table()
        if pos=='between':
            g.location.x=-.8; toybox((.8,0,0))[1].rotation_euler.x=-1.7
        ball('location ball',locs[pos],(.22,.22,.22),'red')
        return None
    if action.startswith('opposite-'):
        word=action[9:]
        if word in ['big-dog','small-dog']:
            animal('dog',(-.65,0,0),scale=1.0); animal('dog',(.7,0,0),scale=.55)
            ring('selected collar',(-.65 if word=='big-dog' else .7,-.3,.66 if word=='big-dog' else .36),.21 if word=='big-dog' else .13,.04,'red').rotation_euler=(PI/2,0,0)
            return None
        if word in ['happy','sad']:
            return actor(subject,sad=word=='sad')
        if word in ['big','small','tall','short']:
            if word in ['big','small']:
                ball('big ball',(-.65,0,.55),(.53,.53,.53),'orange' if word=='big' else 'wood')
                ball('small ball',(.65,0,.22),(.21,.21,.21),'orange' if word=='small' else 'wood')
            else:
                for side,height in [(-.6,5),(.6,2)]:
                    for i in range(height): box('tower block',(side,0,.14+i*.28),(.3,.3,.26),'orange' if (side<0)==(word=='tall') else 'wood')
            return None
        if word in ['fast','slow']:
            car=vehicle('car')
            for frame in range(1,END+1):
                t=(frame-1)/(END-1); car.location.x=math.sin(t*PI*2*(2 if word=='fast' else .4))*.65; car.keyframe_insert('location',frame=frame)
            return None
        if word in ['open','closed']:
            rig=action_scene('open' if word=='open' else 'close',subject)
            bpy.context.scene.frame_set(25)
            for ob in NODES: ob.animation_data_clear()
            return rig
        if word in ['hot','cold']: return action_scene(word,subject)
        if word in ['full','empty']:
            bowl=cup((0,0,.45),full=False)
            if word=='full':
                for i in range(5): ball('filled cup',((i%2-.5)*.1,(i//2-.5)*.07,.62),(.09,.09,.09),'orange')
            return None
        if word in ['wet','dry','clean','dirty']:
            box('sponge',(0,0,.22),(1,.6,.4),'yellow')
            if word in ['wet','dirty']:
                for i in range(7): ball('water drop' if word=='wet' else 'mud',((i%3-1)*.27,((i//3)-1)*.18,.45),(.08,.07,.06),'blue' if word=='wet' else 'brown')
            return None
        if word=='heavy':
            box('heavy weight',(0,0,.38),(.7,.65,.7),'ink'); ring('weight handle',(0,0,.88),.2,.07,'ink').rotation_euler=(PI/2,0,0)
        elif word=='light':
            line('feather stem',[(-.3,0,.1),(0,0,.6),(.3,0,1.1)],.025,'wood')
            for i in range(7): ball('soft feather',(i*.075-.25,0,.35+i*.1),(.19,.04,.10),'cream')
        return None
    if action in ['red-ball','blue-ball']:
        ball('colored ball',(0,0,.5),(.45,.45,.45),'red' if action=='red-ball' else 'blue'); return None
    rig=actor(subject)
    root=rig['root']; props={}
    if rig['dog'] and action in ['eat','drink']:
        ball('dog bowl',(0,-.95,.12),(.28,.25,.12),'yellow')
        ball('food' if action=='eat' else 'water',(0,-.95,.23),(.22,.20,.025),'brown' if action=='eat' else 'blue')
    elif action in ['eat','drink','milk']:
        if action=='eat':
            table((.8,-.15,0)); ball('food bowl',(.8,-.15,.98),(.25,.22,.1),'yellow')
            for i in range(4): ball('food',(.7+(i%2)*.15,-.2+(i//2)*.1,1.06),(.06,.06,.06),'red')
            props['hand_prop']=ball('little apple',(0,-.40,1.28),(.11,.11,.11),'red')
        else:
            props['hand_prop']=object_word('milk',(0,-.45,.7)) if action=='milk' else cup((0,-.45,1.2))
            if action=='milk': props['hand_prop'].scale=(.42,.42,.42)
    if action=='sleep':
        for ob in root.children_recursive:
            if 'eye' in ob.name: ob.scale.z*=.15
        if rig['dog']:
            ball('soft dog bed',(0,0,.08),(.65,.8,.13),'teal'); root.location.z=-.13
            for key in ['Lleg','Rleg','L','R']: rig[key].rotation_euler.x=1.2
        else:
            object_word('bed',(0,-.3,0)); root.rotation_euler.x=PI/2; root.location=(0,.65,1.0)
    if action=='wash':
        table((0,-.55,0)); ball('basin',(0,-.55,.97),(.4,.3,.14),'blue'); ball('water',(0,-.6,1.04),(.32,.24,.025),'cream')
        line('tap',[(.4,-.55,.9),(.4,-.55,1.4),(0,-.55,1.4)],.035,'wood')
        line('running water',[(0,-.55,1.38),(0,-.55,1.05)],.025,'blue')
    if action in ['open','close']: props['hinge']=toybox((.8,0,0),door=True)[1]; root.location.x=-.35
    if action=='hug': teddy((0,-.37,1.0))
    if action in ['sit','stand']: chair((0,.12,0))
    if action in ['kick','throw','catch']: props['ball']=ball('soft ball',(.22,-.65,.24),(.18,.18,.18),'red')
    if action in ['push','pull']: props['cart']=vehicle('wagon',(0,-.9 if action=='push' else .9,0))
    if action=='help':
        root.location.x=-.45; toybox((.3,-.1,0)); helper=actor('mommy',(.85,.4,0)); helper['R'].rotation_euler.x=-1.4
    if action in ['please','thank-you','stop']:
        if action=='stop': vehicle('car',(.8,-.4,0))
        else: teddy((.65,-.1,.7))
    if action=='all-done': table((.7,0,0)); cup((.7,0,1.05),full=False)
    if action=='potty': object_word('potty',(.8,0,0))
    if action=='hurt': box('little bandage',(.14,-.1,.37),(.13,.025,.11),'cream'); box('bandage cross',(.14,-.12,.37),(.07,.02,.025),'red')
    if action in ['hot','cold']:
        if action=='hot':
            cup((.7,-.1,.7))
            for x in [.55,.7,.85]: line('pretend steam',[(x,-.1,.9),(x+.05,-.1,1.12),(x,-.1,1.35)],.016,'cream')
        else:
            box('ice cube',(.7,-.1,.5),(.48,.48,.48),'blue',bevel=.1)
            ring('cozy scarf',(0,0,1.22),.23,.065,'purple',root)
    for frame in range(1,END+1):
        t=(frame-1)/(END-1); s=math.sin(2*PI*t); lift=math.sin(PI*t)**2
        if rig['dog']:
            if action in ['run','walk','jump']:
                amplitude=.75 if action=='run' else .3
                for key,sign in [('Lleg',1),('Rleg',-1),('L',-1),('R',1)]: rig[key].rotation_euler.x=sign*s*amplitude
                root.location.z=lift*.55 if action=='jump' else abs(s)*.05
            if action=='sleep': root.scale.z=.82+.015*s
            if action in ['eat','drink']: root.rotation_euler.x=.10*lift
        else:
            if action=='jump':
                root.location.z=lift*.6
                rig['L'].rotation_euler.y=lift*.9; rig['R'].rotation_euler.y=-lift*.9
                for side in ['L','R']: rig[side+'leg'].rotation_euler.x=.18*(1-lift); rig[side+'k'].rotation_euler.x=-.25*(1-lift)
            elif action in ['run','walk']:
                a=.8 if action=='run' else .4
                for side,sign in [('L',1),('R',-1)]:
                    rig[side+'leg'].rotation_euler.x=s*sign*a; rig[side].rotation_euler.x=-s*sign*a*.65; rig[side+'k'].rotation_euler.x=-max(0,-s*sign)*.5
                root.location.z=abs(s)*.045; root.rotation_euler.x=-.08 if action=='run' else 0
            elif action in ['eat','drink','milk']:
                rig['R'].rotation_euler.x=-.8-lift*.3; rig['R'].rotation_euler.z=-.45; rig['Re'].rotation_euler.x=-1.5-lift*.3
                if 'hand_prop' in props: props['hand_prop'].location=(.10,-.48+lift*.12,1.18+lift*.28); props['hand_prop'].rotation_euler.x=-lift*.4; props['hand_prop'].keyframe_insert('location',frame=frame); props['hand_prop'].keyframe_insert('rotation_euler',frame=frame)
            elif action=='sleep': root.scale.z=1+.015*s
            elif action=='wash':
                for side,sign in [('L',1),('R',-1)]: rig[side].rotation_euler.x=-1.5; rig[side].rotation_euler.z=sign*(.25+s*.08); rig[side+'e'].rotation_euler.x=-.3
            elif action in ['open','close']:
                rig['R'].rotation_euler.x=-1.4; rig['R'].rotation_euler.z=.3
                props['hinge'].rotation_euler.z=(-1.4*lift if action=='open' else -1.4*(1-lift)); props['hinge'].keyframe_insert('rotation_euler',frame=frame)
            elif action=='hug':
                for side,sign in [('L',1),('R',-1)]: rig[side].rotation_euler.x=-1.1; rig[side].rotation_euler.z=-sign*(.3+lift*.25); rig[side+'e'].rotation_euler.x=-.6
            elif action=='dance':
                root.rotation_euler.z=s*.25; root.location.z=abs(s)*.08
                rig['L'].rotation_euler.y=.9+.3*s; rig['R'].rotation_euler.y=-.9+.3*s
            elif action=='clap':
                rig['L'].rotation_euler=(-1.35,-.2,.55+lift*.15); rig['R'].rotation_euler=(-1.35,.2,-.55-lift*.15)
            elif action=='wave': rig['R'].rotation_euler=(-2.8,0,.35+s*.25); rig['Re'].rotation_euler.z=s*.25
            elif action in ['sit','stand']:
                bend=lift if action=='sit' else 1-lift
                root.location.z=-.25*bend
                for side in ['L','R']: rig[side+'leg'].rotation_euler.x=-1.3*bend; rig[side+'k'].rotation_euler.x=1.3*bend
            elif action in ['kick','throw','catch']:
                if action=='kick': rig['Rleg'].rotation_euler.x=-lift*1.1; props['ball'].location=(.22,-.65-lift*.9,.22+lift*.25)
                else:
                    rig['L'].rotation_euler.x=-1.2; rig['R'].rotation_euler.x=-1.3-lift*.7
                    progress=lift if action=='throw' else 1-lift; props['ball'].location=(.1,-.45-progress*1.1,1.1+math.sin(progress*PI)*.6)
                props['ball'].keyframe_insert('location',frame=frame)
            elif action in ['push','pull']:
                root.location.y=-lift*.35
                rig['L'].rotation_euler.x=-1.3 if action=='push' else .7; rig['R'].rotation_euler.x=-1.3 if action=='push' else .7
                props['cart'].location.y=(-.9 if action=='push' else .9)-lift*.35; props['cart'].keyframe_insert('location',frame=frame)
            elif action in ['stop','please','thank-you','all-done','help','potty','hurt','hot','cold']:
                rig['R'].rotation_euler.x=-1.5 if action=='stop' else -.9
                rig['R'].rotation_euler.z=s*.15
                if action in ['all-done','please','help']: rig['L'].rotation_euler.x=-1.0
            elif action=='yes': rig['head'].rotation_euler.x=s*.08
            elif action=='no': rig['head'].rotation_euler.z=s*.12
        for ob in set([v for v in rig.values() if isinstance(v,bpy.types.Object)]):
            ob.keyframe_insert('location',frame=frame); ob.keyframe_insert('rotation_euler',frame=frame); ob.keyframe_insert('scale',frame=frame)
    return rig

def build(spec):
    global MATS,NODES
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    for block in list(bpy.data.actions): bpy.data.actions.remove(block)
    MATS={}; NODES=[]
    scene=bpy.context.scene; scene.frame_start=1; scene.frame_end=END; scene.render.fps=FPS
    action_scene(spec['action'],spec['subject'])
    scene.frame_set(13)
    # Only the default representation appears in the 2D poster. All mesh groups
    # are exported, and the browser selects the requested 3D representation.
    for ob in NODES:
        if ob.name.startswith('variant_') and ob.name!='variant_symbol':
            for child in ob.children_recursive: child.hide_render=True
    # Studio floor, camera, and lights stay out of the semantic GLB.
    def visible_semantic(ob):
        cursor=ob
        while cursor:
            if cursor.hide_viewport: return False
            cursor=cursor.parent
        return True
    semantic=[ob for ob in NODES if visible_semantic(ob)]
    box('studio floor',(0,0,-.10),(200,200,.12),'cream',bevel=0)
    camera_data=bpy.data.cameras.new('Ava camera'); camera=bpy.data.objects.new('Ava camera',camera_data); scene.collection.objects.link(camera)
    camera.location=(3.4,-6.2,3.4); target=Vector((0,0,.85)); camera.rotation_euler=(target-Vector(camera.location)).to_track_quat('-Z','Y').to_euler(); camera_data.type='ORTHO'; camera_data.ortho_scale=3.4
    if spec['action'] in ['position-far','position-between']: camera_data.ortho_scale=4.5; camera.location.x=4.5
    scene.camera=camera
    for name,loc,energy,size in [('key',(-3,-4,6),500,5),('fill',(4,-1,4),280,4),('rim',(1,3,5),400,3)]:
        light_data=bpy.data.lights.new(name,'AREA'); light_data.energy=energy; light_data.shape='DISK'; light_data.size=size
        light=bpy.data.objects.new(name,light_data); scene.collection.objects.link(light); light.location=loc; light.rotation_euler=(Vector((0,0,.7))-Vector(loc)).to_track_quat('-Z','Y').to_euler()
    scene.world.color=(.6,.6,.6)
    scene.render.engine='CYCLES'; scene.cycles.samples=16; scene.cycles.use_denoising=True
    scene.render.resolution_x=640; scene.render.resolution_y=640; scene.render.resolution_percentage=100
    scene.view_settings.view_transform='AgX'; scene.view_settings.look='AgX - Medium High Contrast'; scene.render.image_settings.file_format='PNG'; scene.render.film_transparent=False
    # Export only the authored 3D subjects: no camera-facing planes or images.
    bpy.ops.object.select_all(action='DESELECT')
    for ob in semantic:
        ob.hide_set(False); ob.select_set(True)
    scene.frame_set(1)
    bpy.ops.export_scene.gltf(filepath=str(OUT/'models'/f"{spec['id']}.glb"),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='SCENE',export_frame_range=True,export_force_sampling=True,export_materials='EXPORT',export_cameras=False,export_lights=False)
    scene.frame_set(25 if spec['action'] in ['open','close','opposite-open','opposite-closed','word-up','stand'] else 13)
    scene.render.filepath=str(OUT/'posters'/f"{spec['id']}.png")
    bpy.ops.render.render(write_still=True)
    poster=OUT/'posters'/f"{spec['id']}.png"
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(poster),'-q:v','3',str(poster.with_suffix('.jpg'))],check=True)
    poster.unlink()
    if spec['id'] in ['ava-jump','ava-need-help','ava-opposite-big','ava-position-under','dog-run']:
        bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/f"{spec['id']}.blend"))
    print('AVA_READY '+spec['id'],flush=True)

for spec in MANIFEST:
    try: build(spec)
    except Exception as e:
        print('AVA_FAILED '+spec['id']+' '+str(e),flush=True)
        raise
print('AVA_STUDIO_COMPLETE '+str(len(MANIFEST)),flush=True)
