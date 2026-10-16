def map_components(objects, required):
    meshes = {obj.name: obj for obj in objects if obj.type == "MESH"}
    missing = set(required) - meshes.keys()
    if missing:
        raise ValueError("Missing component meshes: " + ", ".join(sorted(missing)))
    return {name: meshes[name] for name in required}

