import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const processes = [];
let stopping = false;
const modules = execFileSync("php", ["-m"], {
  encoding: "utf8",
  windowsHide: true,
});
const phpArgs = ["pdo_sqlite", "sqlite3"]
  .filter((x) => !modules.split(/\r?\n/).includes(x))
  .flatMap((x) => ["-d", "extension=" + x]);
function start(command, args, cwd = process.cwd(), env = process.env) {
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: "inherit",
    windowsHide: true,
  });
  processes.push(child);
  child.on("error", (e) => {
    console.error(e.message);
    stop(1);
  });
  child.on("exit", (code) => {
    if (code && !stopping) stop(code);
  });
  return child;
}
start(process.execPath, ["scripts/serve-api.mjs"]);
start(
  process.execPath,
  [
    "../node_modules/expo/bin/cli",
    "start",
    "--offline",
    "--web",
    "--port",
    "8081",
  ],
  path.resolve("customer"),
);
start(
  process.execPath,
  [
    "../node_modules/expo/bin/cli",
    "start",
    "--offline",
    "--web",
    "--port",
    "8082",
  ],
  path.resolve("supplier"),
);
start(
  "php",
  [...phpArgs, "artisan", "queue:work", "--timeout=240", "--tries=2"],
  path.resolve("admin"),
);
const env = Object.fromEntries(
  fs
    .readFileSync("admin/.env", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    }),
);
const bundled = String.raw`C:\Program Files\Blender Foundation\Blender 5.1\5.1\python\bin\python.exe`;
const python =
  process.env.PYTHON_BIN || (fs.existsSync(bundled) ? bundled : "python");
if (env.SIMULATION_ENGINE_TOKEN)
  start(python, ["main.py"], path.resolve("simulation-engine"), {
    ...process.env,
    SIMULATION_ENGINE_TOKEN: env.SIMULATION_ENGINE_TOKEN,
  });
else
  console.log(
    "Simulation worker disabled: set SIMULATION_ENGINE_TOKEN in admin/.env.",
  );
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const p of processes) {
    if (process.platform === "win32" && p.pid) {
      try {
        execFileSync("taskkill", ["/PID", String(p.pid), "/T", "/F"], {
          windowsHide: true,
          stdio: "ignore",
        });
      } catch {}
    } else p.kill();
  }
  process.exit(code);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
