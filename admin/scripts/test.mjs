import { execFileSync } from "node:child_process";

const modules = execFileSync("php", ["-m"], { encoding: "utf8", windowsHide: true });
const extensions = ["pdo_sqlite", "sqlite3"]
  .filter((name) => !modules.split(/\r?\n/).includes(name))
  .flatMap((name) => ["-d", "extension=" + name]);
execFileSync("php", [...extensions, "vendor/phpunit/phpunit/phpunit"], { stdio: "inherit", windowsHide: true });
