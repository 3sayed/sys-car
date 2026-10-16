# Simulation pipeline

## Local processing

The worker uses the Python standard library and invokes a separate Blender process. Blender's own Python supplies bpy. No pip installation is required for the worker.

```powershell
npm run engine
# In another terminal:
cd admin
php -d extension=pdo_sqlite -d extension=sqlite3 artisan marketplace:simulate-demo --sync
```

The local sample command creates a separate draft; it does not replace the published concept illustration. It can queue instead of running synchronously by omitting `--sync` and starting `php artisan queue:work --timeout=240 --tries=2`.

The worker expects `SIMULATION_ENGINE_TOKEN`. Laravel and the worker must share the value. `BLENDER_BIN` selects Blender; the installed Blender 5.1 Windows path is detected automatically. Generation was exercised on Blender 5.1. The Docker worker uses distribution Blender and needs container validation before release.

## Internal protocol

`POST /jobs` with `Authorization: Bearer <worker-secret>`:

```json
{
  "template": "brake_replacement",
  "source_base64": null,
  "components": ["rotor", "caliper", "pad_inner", "pad_outer"]
}
```

A null source generates the authored conceptual brake geometry. A supplied source is a self-contained glTF 2.0 binary encoded as base64. Maximum input GLB size is 10 MB; maximum HTTP body is 15 MB. Output contains `glb_base64`, `status: pending_review` and an `is_concept` marker.

Only one Blender job runs per worker. Busy requests return 503 and Laravel retries. Process timeout is 180 seconds, HTTP timeout 210 seconds, job timeout 240 seconds, and queue retry_after 300 seconds to avoid duplicate concurrent processing.

## Pipeline modules

1. GLB validation checks header/version/length and rejects external file or network resources.
2. Importer loads a GLB into a fresh Blender scene. Direct STEP/IGES CAD import is explicitly unsupported.
3. Mesh processor enforces a one-million-vertex limit.
4. Component mapper requires exact mesh names.
5. Template engine loads only allowlisted JSON templates.
6. Animation builder creates separation/return location keyframes.
7. Exporter writes animated GLB.
8. Laravel stores the output privately and sets the procedure to pending_review.

Brake templates require rotor, caliper, pad_inner and pad_outer. Additional alternator and oil-filter templates are included for CLI/internal-worker extension, but the admin workflow currently dispatches the brake template. They require supplied, correctly named assemblies.

## Review and playback

Admin can upload licensed GLB sources, define component names, create sourced procedure steps, queue generation and preview results. Approval requires an explicit review confirmation, a source reference and a completed job. Generated conceptual output remains marked as conceptual even when attached to a non-concept draft.

The public API returns only approved procedures. The model endpoint checks approval before streaming; raw candidate outputs are not public URLs. The same Three.js viewer runs in a web iframe or native WebView. It loads imported animation clips with AnimationMixer and supports orbit, zoom, mesh selection, play/pause, timeline positions and reset.

These templates generate visualization candidates, not mechanically accurate replacement procedures. Geometry, tooling, clearance, torque, fasteners, hazards, sequence and vehicle fitment must be validated from authoritative repair sources. The seeded steps are exploration prompts and explicitly not repair instructions.
