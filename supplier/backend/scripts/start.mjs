import { spawn, execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modules = execFileSync("php", ["-m"], { encoding: "utf8", windowsHide: true });
const extensions = ["pdo_mysql"]
  .filter((name) => !modules.split(/\r?\n/).includes(name))
  .flatMap((name) => ["-d", "extension=" + name]);
const child = spawn("php", [...extensions, "-S", "0.0.0.0:8002", "-t", "public", "scripts/router.php"], {
  cwd: root, stdio: "inherit", windowsHide: true,
});
child.on("error", (error) => { console.error(error); process.exitCode = 1; });
process.on("SIGINT", () => child.kill());
process.on("SIGTERM", () => child.kill());
child.on("exit", (code) => process.exit(code ?? 0));
