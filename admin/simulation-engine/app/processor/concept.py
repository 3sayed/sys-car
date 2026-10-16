"""Project-authored geometry. Not a dimensionally accurate automotive assembly."""
def create():
    import bpy
    import math
    def material(name, color, metallic):
        m = bpy.data.materials.new(name)
        m.diffuse_color = (*color, 1)
        m.use_nodes = True
        bsdf = m.node_tree.nodes.get("Principled BSDF")
        bsdf.inputs["Base Color"].default_value = (*color, 1)
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = 0.35
        return m
    steel = material("steel", (0.46, 0.56, 0.65), 0.8)
    lime = material("lime", (0.52, 0.85, 0.19), 0.3)
    dark = material("pad", (0.06, 0.09, 0.12), 0.4)
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=1.18, depth=0.17, rotation=(math.pi/2, 0, 0))
    bpy.context.object.name = "rotor"
    bpy.context.object.data.materials.append(steel)
    for name, location, scale, mat in [
        ("caliper", (0.87, 0.04, 0), (0.27, 0.32, 0.58), lime),
        ("pad_inner", (0.72, -0.2, 0), (0.2, 0.055, 0.42), dark),
        ("pad_outer", (0.72, 0.29, 0), (0.2, 0.055, 0.42), dark),
    ]:
        bpy.ops.mesh.primitive_cube_add(size=2, location=location)
        obj = bpy.context.object
        obj.name = name
        obj.scale = scale
        obj.data.materials.append(mat)
    return list(bpy.context.scene.objects)

