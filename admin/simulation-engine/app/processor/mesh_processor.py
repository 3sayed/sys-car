def validate_meshes(objects):
    meshes = [obj for obj in objects if obj.type == "MESH"]
    if not meshes or sum(len(obj.data.vertices) for obj in meshes) > 1000000:
        raise ValueError("Model must contain meshes with at most one million vertices.")
    return meshes

