import json
import struct
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.validation.glb import validate_glb
from app.animation.template_engine import load_template
from app.processor.component_mapper import map_components
def glb(document):
    chunk = json.dumps(document).encode()
    chunk += b" " * ((4 - len(chunk) % 4) % 4)
    return struct.pack("<4sIII4s", b"glTF", 2, 20 + len(chunk), len(chunk), b"JSON") + chunk
class ValidationTests(unittest.TestCase):
    def test_valid_self_contained_model(self):
        self.assertEqual(validate_glb(glb({"asset": {"version": "2.0"}}))["asset"]["version"], "2.0")
    def test_external_paths_and_urls_are_rejected(self):
        for uri in ["../../private.txt", "https://example.com/model.bin", "file:///etc/passwd"]:
            with self.assertRaises(ValueError):
                validate_glb(glb({"asset": {"version": "2.0"}, "buffers": [{"uri": uri}]}))
    def test_corrupt_header_is_rejected(self):
        with self.assertRaises(ValueError):
            validate_glb(b"invalid")
    def test_template_traversal_is_rejected(self):
        with self.assertRaises(ValueError):
            load_template("../../main")
    def test_brake_template(self):
        self.assertIn("pad_outer", load_template("brake_replacement")["required"])
    def test_missing_mesh_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "pad_outer"):
            map_components([], ["pad_outer"])
if __name__ == "__main__":
    unittest.main()

