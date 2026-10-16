import base64
import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from app.animation.template_engine import load_template
from app.validation.glb import validate_glb
ROOT = Path(__file__).resolve().parents[1]
def blender_binary():
    configured = os.environ.get("BLENDER_BIN")
    candidates = [configured, shutil.which("blender"), r"C:\Program Files\Blender Foundation\Blender 5.1\blender.exe"]
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return str(candidate)
    raise RuntimeError("Blender is not installed. Set BLENDER_BIN.")
def generate(payload):
    template = payload.get("template", "brake_replacement")
    specification = load_template(template)
    components = payload.get("components") or specification["required"]
    if not isinstance(components, list) or any(not isinstance(x, str) or len(x) > 100 for x in components):
        raise ValueError("Invalid component mapping.")
    source = payload.get("source_base64")
    if source is None and template != "brake_replacement":
        raise ValueError("This template requires a supplied model.")
    with tempfile.TemporaryDirectory(prefix="inficarx-") as tmp:
        directory = Path(tmp)
        source_path = None
        if source is not None:
            data = base64.b64decode(source, validate=True)
            validate_glb(data)
            source_path = directory / "source.glb"
            source_path.write_bytes(data)
        output = directory / "assembly.glb"
        job = directory / "job.json"
        job.write_text(json.dumps({"template": template, "source": str(source_path) if source_path else None, "output": str(output), "components": components}), encoding="utf-8")
        result = subprocess.run([blender_binary(), "--background", "--factory-startup", "--disable-autoexec", "--python-exit-code", "1", "--python", str(ROOT / "blender_job.py"), "--", str(job)], capture_output=True, text=True, timeout=180)
        if result.returncode or not output.exists():
            raise RuntimeError("Blender processing failed: " + (result.stderr or result.stdout)[-1500:])
        data = output.read_bytes()
        validate_glb(data)
        return {"status": "pending_review", "is_concept": source is None, "glb_base64": base64.b64encode(data).decode("ascii")}

