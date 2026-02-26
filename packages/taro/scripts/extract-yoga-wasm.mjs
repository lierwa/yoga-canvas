import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

async function main() {
  const entry = require.resolve('yoga-layout');
  const entryDir = path.dirname(entry);
  const loaderPath = path.resolve(entryDir, '../binaries/yoga-wasm-base64-esm.js');

  const content = await fs.readFile(loaderPath, 'utf-8');
  const m = content.match(/H\s*=\s*"data:application\/octet-stream;base64,([A-Za-z0-9+/=]+)"/);
  if (!m) {
    throw new Error(`Failed to locate base64 wasm payload in ${loaderPath}`);
  }

  const base64 = m[1].replace(/\s+/g, '');
  const buffer = Buffer.from(base64, 'base64');

  const outDir = path.resolve(process.cwd(), 'wasm');
  const outFile = path.join(outDir, 'yoga.wasm');
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outFile, buffer);
  process.stdout.write(`Wrote wasm: ${outFile} (${buffer.length} bytes)\n`);
}

main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? e.stack ?? e.message : String(e)}\n`);
  process.exit(1);
});

