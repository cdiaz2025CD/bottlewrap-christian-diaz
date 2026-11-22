import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const routes = {
  "/": ["index.html", "text/html"],
  "/index.html": ["index.html", "text/html"],
  "/styles.css": ["styles.css", "text/css"],
  "/app.js": ["app.js", "text/javascript"],
  "/geometry.js": ["geometry.js", "text/javascript"],
};

const port = 5173;

const server = createServer(async (request, response) => {
  const pathname = new URL(
    request.url,
    "http://localhost"
  ).pathname;

  const route = routes[pathname];

  if (!route) {
    response.writeHead(404);
    response.end("File not found");
    return;
  }

  const [filename, contentType] = route;

  try {
    const file = await readFile(
      new URL(filename, import.meta.url)
    );

    response.writeHead(200, {
      "Content-Type": `${contentType}; charset=utf-8`,
    });

    response.end(file);
  } catch {
    response.writeHead(500);
    response.end("Could not load the file");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Open http://localhost:${port}`);
});