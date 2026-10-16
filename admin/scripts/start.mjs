import { spawn, execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modules = execFileSync("php", ["-m"], { encoding: "utf8", windowsHide: true });
const extensions = ["pdo_sqlite", "sqlite3"]
  .filter((name) => !modules.split(/\r?\n/).includes(name))
  .flatMap((name) => ["-d", "extension=" + name]);
const children = [];
let stopping = false;
function start(args) {
  const child = spawn("php", [...extensions, ...args], {
    cwd: root,
    stdio: "inherit",
    windowsHide: true,
  });
  children.push(child);
  child.on("error", (error) => { console.error(error); stop(1); });
  child.on("exit", (code) => { if (!stopping) stop(code || 0); });
}
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (process.platform === "win32" && child.pid) {
      try { execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true }); } catch {}
    } else child.kill();
  }
  process.exit(code);
}
start(["-d", "upload_max_filesize=12M", "-d", "post_max_size=16M", "-S", (process.env.API_HOST || "127.0.0.1") + ":8000", "-t", "public", "scripts/router.php"]);
start(["artisan", "queue:work", "--timeout=240", "--tries=2"]);
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
