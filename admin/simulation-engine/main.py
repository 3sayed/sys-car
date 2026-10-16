"""Internal authenticated Blender processing API and local CLI."""
import argparse
import hmac
import json
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from app.pipeline import generate
LOCK = threading.Semaphore(1)
MAX_REQUEST = 15 * 1024 * 1024
class Handler(BaseHTTPRequestHandler):
    def send_json(self, code, body):
        data = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)
    def do_GET(self):
        self.send_json(200 if self.path == "/health" else 404, {"status": "ok"} if self.path == "/health" else {"error": "Not found"})
    def do_POST(self):
        secret = os.environ.get("SIMULATION_ENGINE_TOKEN", "")
        if not secret or not hmac.compare_digest(self.headers.get("Authorization", ""), "Bearer " + secret):
            return self.send_json(401, {"error": "Unauthorized"})
        if self.path != "/jobs":
            return self.send_json(404, {"error": "Not found"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return self.send_json(400, {"error": "Invalid length"})
        if length <= 0 or length > MAX_REQUEST:
            return self.send_json(413, {"error": "Invalid request size"})
        if not LOCK.acquire(blocking=False):
            return self.send_json(503, {"error": "Worker busy; retry later"})
        try:
            self.connection.settimeout(20)
            payload = json.loads(self.rfile.read(length))
            if not isinstance(payload, dict):
                raise ValueError("Expected a JSON object.")
            self.send_json(200, generate(payload))
        except (ValueError, TypeError) as error:
            self.send_json(422, {"error": str(error)})
        except Exception as error:
            print("Processing failure:", error, flush=True)
            self.send_json(500, {"error": "Processing failed. See worker logs."})
        finally:
            LOCK.release()
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8090)
    parser.add_argument("--generate", help="Generate the conceptual brake GLB at this output path")
    args = parser.parse_args()
    if args.generate:
        import base64
        from pathlib import Path
        result = generate({"template": "brake_replacement"})
        Path(args.generate).write_bytes(base64.b64decode(result["glb_base64"]))
        print("Generated conceptual GLB:", args.generate)
    else:
        if not os.environ.get("SIMULATION_ENGINE_TOKEN"):
            parser.error("Set SIMULATION_ENGINE_TOKEN before starting the worker.")
        print(f"Simulation worker listening on {args.host}:{args.port}", flush=True)
        ThreadingHTTPServer((args.host, args.port), Handler).serve_forever()

