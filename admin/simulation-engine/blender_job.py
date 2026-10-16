"""Executed only by Blender in a fresh background process."""
import json
import sys
from pathlib import Path
import bpy
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from app.importer.model_importer import import_glb
from app.processor.concept import create
from app.processor.component_mapper import map_components
from app.processor.mesh_processor import validate_meshes
from app.animation.template_engine import load_template
from app.animation.animation_builder import animate
from app.exporter.glb_exporter import export_glb
args = sys.argv[sys.argv.index("--") + 1:]
job = json.loads(Path(args[0]).read_text(encoding="utf-8"))
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
template = load_template(job["template"])
objects = import_glb(job["source"]) if job.get("source") else create()
validate_meshes(objects)
components = map_components(objects, template["required"])
map_components(objects, job.get("components") or template["required"])
animate(components, template)
export_glb(job["output"])

