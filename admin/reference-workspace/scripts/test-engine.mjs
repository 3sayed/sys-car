import { execFileSync } from "node:child_process";
import fs from "node:fs";
const bundled = String.raw`C:\Program Files\Blender Foundation\Blender 5.1\5.1\python\bin\python.exe`;
const python =
  process.env.PYTHON_BIN || (fs.existsSync(bundled) ? bundled : "python");
execFileSync(
  python,
  ["-m", "unittest", "discover", "-s", "simulation-engine/tests"],
  { stdio: "inherit", windowsHide: true },
);
