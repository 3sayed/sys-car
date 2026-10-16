import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
function run(command, args, cwd = process.cwd()) {
  const windows =
    process.platform === "win32" && /^(npm|composer)$/.test(command);
  execFileSync(
    windows ? "cmd.exe" : command,
    windows ? ["/d", "/s", "/c", command, ...args] : args,
    { cwd, stdio: "inherit", windowsHide: true },
  );
}
run("npm", ["install"]);
run("composer", ["install", "--no-interaction"], path.resolve("admin"));
if (!fs.existsSync("admin/.env"))
  fs.copyFileSync("admin/.env.example", "admin/.env");
let env = fs.readFileSync("admin/.env", "utf8");
function set(key, value) {
  const regex = new RegExp("^" + key + "=.*$", "m");
  env = regex.test(env)
    ? env.replace(regex, key + "=" + value)
    : env + "\n" + key + "=" + value;
}
if (!/^SIMULATION_ENGINE_TOKEN=.+$/m.test(env))
  set("SIMULATION_ENGINE_TOKEN", crypto.randomBytes(32).toString("hex"));
if (/^APP_URL=http:\/\/localhost\s*$/m.test(env))
  set("APP_URL", "http://localhost:8000");
set("DB_QUEUE_RETRY_AFTER", "300");
set("REDIS_QUEUE_RETRY_AFTER", "300");
fs.writeFileSync("admin/.env", env);
if (!fs.existsSync("admin/database/database.sqlite"))
  fs.writeFileSync("admin/database/database.sqlite", "");
const modules = execFileSync("php", ["-m"], {
  encoding: "utf8",
  windowsHide: true,
});
const flags = ["pdo_sqlite", "sqlite3"]
  .filter((x) => !modules.split(/\r?\n/).includes(x))
  .flatMap((x) => ["-d", "extension=" + x]);
if (!/^APP_KEY=.+$/m.test(env))
  run("php", [...flags, "artisan", "key:generate"], path.resolve("admin"));
run("php", [...flags, "artisan", "migrate", "--seed"], path.resolve("admin"));
if (!fs.existsSync("admin/public/storage"))
  run("php", [...flags, "artisan", "storage:link"], path.resolve("admin"));
run("npm", ["run", "build:viewer"]);
run("npm", ["run", "build:admin"]);
console.log(
  "Ready. Run npm run dev. Demo credentials are documented in README.md.",
);
