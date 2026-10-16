def animate(components, template):
    import bpy
    scene = bpy.context.scene
    scene.render.fps = 30
    scene.frame_start = 1
    scene.frame_end = 150
    for name, offset in template["offsets"].items():
        obj = components[name]
        origin = obj.location.copy()
        for frame, factor in [(1, 0), (60, 1), (100, 1), (150, 0)]:
            obj.location = [origin[i] + offset[i] * factor for i in range(3)]
            obj.keyframe_insert(data_path="location", frame=frame)
        obj.animation_data.action.name = "explode_" + name
    scene.frame_set(1)

