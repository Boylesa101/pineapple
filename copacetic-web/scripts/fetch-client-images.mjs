// Downloads the client mock-up photos from static.wixstatic.com into public/clients/.
// Run once (and commit the results): npm run fetch:images
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLIENT_IMAGES } from './client-images.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
await mkdir(join(root, 'public/clients'), { recursive: true });

let failed = 0;
for (const [url, local] of Object.entries(CLIENT_IMAGES)) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(join(root, 'public', local), buf);
    console.log(`saved ${local} (${buf.length} bytes)`);
  } catch (err) {
    failed++;
    console.error(`failed ${url}: ${err.message}`);
  }
}
process.exit(failed ? 1 : 0);
