import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = fs.readFileSync(path.join(root, ".env"), "utf8");
const token = env.match(/^SIMULATION_ENGINE_TOKEN=(.+)$/m)?.[1]?.trim().replace(/^"|"$/g, "");
if (!token) throw new Error("Set SIMULATION_ENGINE_TOKEN in admin/.env.");
const bundled = String.raw`C:\Program Files\Blender Foundation\Blender 5.1\5.1\python\bin\python.exe`;
const python = process.env.PYTHON_BIN || (fs.existsSync(bundled) ? bundled : "python");
const child = spawn(python, ["main.py"], {
  cwd: path.join(root, "simulation-engine"),
  env: { ...process.env, SIMULATION_ENGINE_TOKEN: token },
  stdio: "inherit",
  windowsHide: true,
});
child.on("error", (error) => { console.error(error); process.exitCode = 1; });
process.on("SIGINT", () => child.kill());
process.on("SIGTERM", () => child.kill());
child.on("exit", (code) => process.exit(code ?? 0));
