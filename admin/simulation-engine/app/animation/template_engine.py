import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2] / "templates"
ALLOWED = {"brake_replacement", "alternator_replacement", "oil_filter_replacement"}
def load_template(name):
    if name not in ALLOWED:
        raise ValueError("Unsupported animation template.")
    return json.loads((ROOT / name / "template.json").read_text(encoding="utf-8"))

