import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..');
const modsSrcDir = path.join(repoRoot, 'mods_src');
const outDir = path.join(repoRoot, 'public', 'mods');

async function exists(p) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function listDirs(dir) {
  const items = await fs.readdir(dir, { withFileTypes: true });
  return items.filter((d) => d.isDirectory()).map((d) => d.name);
}

async function readFileBytes(p) {
  const buf = await fs.readFile(p);
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

async function buildOne(modDirName) {
  const base = path.join(modsSrcDir, modDirName);
  const manifestPath = path.join(base, 'manifest.json');
  if (!(await exists(manifestPath))) {
    throw new Error(`Missing manifest.json in ${base}`);
  }

  /** @type {Record<string, Uint8Array>} */
  const files = {};
  files['manifest.json'] = await readFileBytes(manifestPath);

  const rulesDir = path.join(base, 'rules');
  if (await exists(rulesDir)) {
    const entries = await fs.readdir(rulesDir, { withFileTypes: true });
    const jsonFiles = entries
      .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.json'))
      .map((e) => e.name)
      .sort();
    for (const name of jsonFiles) {
      files[`rules/${name}`] = await readFileBytes(path.join(rulesDir, name));
    }
  }

  // zipSync respects object insertion order; we sort keys to be deterministic.
  const sorted = Object.keys(files).sort().reduce((acc, k) => {
    acc[k] = files[k];
    return acc;
  }, {});

  const zipped = zipSync(sorted, { level: 9 });
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `${modDirName}.openboardmod`);
  await fs.writeFile(outPath, Buffer.from(zipped));
  return outPath;
}

async function main() {
  if (!(await exists(modsSrcDir))) {
    console.error('No mods_src/ directory found. Nothing to build.');
    process.exit(0);
  }
  const dirs = (await listDirs(modsSrcDir)).sort();
  if (dirs.length === 0) {
    console.error('mods_src/ is empty. Nothing to build.');
    process.exit(0);
  }

  const built = [];
  for (const d of dirs) {
    built.push(await buildOne(d));
  }

  console.log(`Built ${built.length} mods into public/mods/:`);
  for (const p of built) console.log(`- ${path.relative(repoRoot, p)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

