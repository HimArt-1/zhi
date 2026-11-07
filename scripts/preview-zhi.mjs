import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
const policy = vercel.headers[0].headers.find(header => header.key === 'Content-Security-Policy').value;
const root = new URL('../dist/', import.meta.url);
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.webp': 'image/webp', '.mp4': 'video/mp4', '.glb': 'model/gltf-binary', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8'
};
const resourcePath = /^(?:[a-z0-9-]+\/)*[a-zA-Z0-9-]+\.(?:html|js|css|webp|ttf|txt|mp4|glb)$/;
export function createPreviewServer() {
  return createServer(async (req, res) => {
    try {
      if (!['GET', 'HEAD'].includes(req.method)) return res.writeHead(405).end();
      const path = new URL(req.url, 'http://localhost').pathname;
      if (path === '/zhi' || path === '/zhi/') return res.writeHead(308, { Location: '/' }).end();
      const resource = path === '/' ? 'index.html' : path.slice(1);
      if (!resourcePath.test(resource)) return res.writeHead(404).end();
      const data = await readFile(new URL(resource, root));
      if (extname(resource) === '.mp4' && req.headers.range) {
        const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        const start = range?.[1] ? Number(range[1]) : Math.max(0,data.length-Number(range?.[2]));
        const end = range?.[1] && range[2] ? Math.min(Number(range[2]),data.length-1) : data.length-1;
        if (!range || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end) {
          return res.writeHead(416, { 'Content-Range': 'bytes */' + data.length }).end();
        }
        res.writeHead(206, {
          'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Content-Length': end-start+1,
          'Content-Range': 'bytes ' + start + '-' + end + '/' + data.length
        });
        return res.end(req.method === 'HEAD' ? undefined : data.subarray(start,end+1));
      }
      res.writeHead(200, { 'Content-Type': types[extname(resource)], 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': policy });
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
