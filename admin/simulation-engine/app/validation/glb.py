"""Validate a self-contained GLB before sending it to Blender."""
import json
import struct

MAX_BYTES = 10 * 1024 * 1024

def validate_glb(data: bytes) -> dict:
    if len(data) < 20 or len(data) > MAX_BYTES:
        raise ValueError("GLB size must be between 20 bytes and 10 MB.")
    magic, version, length = struct.unpack_from("<4sII", data)
    if magic != b"glTF" or version != 2 or length != len(data):
        raise ValueError("Invalid GLB header.")
    chunk_size, chunk_type = struct.unpack_from("<I4s", data, 12)
    if chunk_type != b"JSON" or 20 + chunk_size > len(data):
        raise ValueError("Missing GLB JSON chunk.")
    document = json.loads(data[20:20 + chunk_size])
    for resource in document.get("buffers", []) + document.get("images", []):
        uri = resource.get("uri", "")
        if uri and not uri.startswith("data:"):
            raise ValueError("External GLB resources are not allowed.")
    if document.get("asset", {}).get("version") != "2.0":
        raise ValueError("Only glTF 2.0 is supported.")
    return document

