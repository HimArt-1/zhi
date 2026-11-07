import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../dist/', import.meta.url);
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.webp': 'image/webp', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8'
};
const resourcePath = /^(?:[a-z0-9-]+\/)*[a-zA-Z0-9-]+\.(?:html|js|css|webp|ttf|txt)$/;
export function createPreviewServer() {
  return createServer(async (req, res) => {
    try {
      if (!['GET', 'HEAD'].includes(req.method)) return res.writeHead(405).end();
      const path = new URL(req.url, 'http://localhost').pathname;
      if (path === '/zhi' || path === '/zhi/') return res.writeHead(308, { Location: '/' }).end();
      const resource = path === '/' ? 'index.html' : path.slice(1);
      if (!resourcePath.test(resource)) return res.writeHead(404).end();
      const data = await readFile(new URL(resource, root));
      res.writeHead(200, { 'Content-Type': types[extname(resource)], 'X-Content-Type-Options': 'nosniff' });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch {
      res.writeHead(404).end();
    }
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.ZHI_PORT ?? 4179);
  createPreviewServer().listen(port, '127.0.0.1', () => console.log('ZHI preview: http://localhost:' + port + '/'));
}
