import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
fs.mkdirSync(".cache", { recursive: true });
const database = path.resolve(".cache/e2e.sqlite");
if (!fs.existsSync(database)) fs.writeFileSync(database, "");
const env = {
  ...process.env,
  APP_ENV: "testing",
  DB_CONNECTION: "sqlite",
  DB_DATABASE: database,
  CACHE_STORE: "array",
  OPENAI_API_KEY: "",
};
const modules = execFileSync("php", ["-m"], {
  encoding: "utf8",
  windowsHide: true,
});
const flags = ["pdo_sqlite", "sqlite3"]
  .filter((x) => !modules.split(/\r?\n/).includes(x))
  .flatMap((x) => ["-d", "extension=" + x]);
execFileSync("php", [...flags, "artisan", "migrate", "--seed", "--force"], {
  cwd: "admin",
  env,
  stdio: "inherit",
  windowsHide: true,
});
const child = spawn(process.execPath, ["scripts/serve-api.mjs"], {
  env,
  stdio: "inherit",
  windowsHide: true,
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill());
child.on("exit", (code) => process.exit(code ?? 0));
