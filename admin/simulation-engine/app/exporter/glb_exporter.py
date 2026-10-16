def export_glb(path):
    import bpy
    bpy.ops.export_scene.gltf(filepath=str(path), export_format="GLB", export_animations=True)

