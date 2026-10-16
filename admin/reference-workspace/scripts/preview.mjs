import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".ttf": "font/ttf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".glb": "model/gltf-binary",
};
for (const [app, port] of [
  ["customer", 8081],
  ["supplier", 8082],
]) {
  const root = path.resolve(app, "dist");
  http
    .createServer((req, res) => {
      let file;
      try {
        file = path.resolve(
          root,
          "." +
            decodeURIComponent(new URL(req.url, "http://localhost").pathname),
        );
      } catch {
        res.writeHead(400);
        res.end();
        return;
      }
      if (file !== root && !file.startsWith(root + path.sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory())
        file = path.join(root, "index.html");
      if (!fs.existsSync(file)) {
        res.writeHead(503);
        res.end("Build both apps first: npm run export -w @inficarx/" + app);
        return;
      }
      res.writeHead(200, {
        "Content-Type": mime[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      fs.createReadStream(file).pipe(res);
    })
    .listen(port, "127.0.0.1", () =>
      console.log(app + " preview: http://localhost:" + port),
    );
}
