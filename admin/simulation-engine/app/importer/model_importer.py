def import_glb(path):
    import bpy
    bpy.ops.import_scene.gltf(filepath=str(path))
    return list(bpy.context.scene.objects)

