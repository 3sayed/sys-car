import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modules = execFileSync("php", ["-m"], {
  encoding: "utf8",
  windowsHide: true,
});
const extensions = ["pdo_sqlite", "sqlite3"]
  .filter((x) => !modules.split(/\r?\n/).includes(x))
  .flatMap((x) => ["-d", "extension=" + x]);
const child = spawn(
  "php",
  [
    ...extensions,
    "-d",
    "upload_max_filesize=12M",
    "-d",
    "post_max_size=16M",
    "-S",
    (process.env.API_HOST || "127.0.0.1") + ":8000",
    "-t",
    path.join(root, "admin/public"),
    path.join(root, "scripts/router.php"),
  ],
  { cwd: root, stdio: "inherit", windowsHide: true },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill());
child.on("exit", (code) => process.exit(code ?? 0));
