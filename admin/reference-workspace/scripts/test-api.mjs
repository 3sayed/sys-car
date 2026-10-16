import { execFileSync } from "node:child_process";
const modules = execFileSync("php", ["-m"], {
  encoding: "utf8",
  windowsHide: true,
});
const flags = ["pdo_sqlite", "sqlite3"]
  .filter((x) => !modules.split(/\r?\n/).includes(x))
  .flatMap((x) => ["-d", "extension=" + x]);
execFileSync("php", [...flags, "vendor/phpunit/phpunit/phpunit"], {
  cwd: "admin",
  stdio: "inherit",
  windowsHide: true,
});
