import { copyFile, mkdir, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'dist');
const entries = ['index.html', 'style.css', 'main.js', 'coffee-crops.js', 'intro.js', 'scene.js', 'carrera.js', 'catalog.js', 'flow-core.js'];
const publicAsset = /^[a-z0-9-]+\.(?:webp|ttf|js|txt|mp4)$/;

async function copyAssets(relativeDirectory) {
  const directory = join(root, relativeDirectory);
  await mkdir(join(output, relativeDirectory), { recursive: true });
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relativePath = join(relativeDirectory, entry.name);
    if (entry.isDirectory() && /^[a-z0-9-]+$/.test(entry.name)) await copyAssets(relativePath);
    if (entry.isFile() && publicAsset.test(entry.name.toLowerCase())) {
      await copyFile(join(root, relativePath), join(output, relativePath));
    }
  }
}

await rm(output, { recursive: true, force: true });
await mkdir(output);
await Promise.all([
  ...entries.map(name => copyFile(join(root, name), join(output, name))),
  copyAssets('assets'),
  copyAssets('vendor')
]);
console.log('Built the public ZHI site in dist.');
