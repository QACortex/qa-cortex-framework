// Local page for the Chromium smoke test: no external websites.
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT ?? 4317);
const html = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>QA Cortex compatibility</title></head>
  <body><h1>QA Cortex compatibility</h1></body>
</html>`;

createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }
  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('not found');
}).listen(PORT, '127.0.0.1', () => console.log(`compat server on http://127.0.0.1:${PORT}/`));
