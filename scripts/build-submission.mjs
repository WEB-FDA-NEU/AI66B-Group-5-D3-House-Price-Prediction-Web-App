import { build } from 'esbuild';
import { zipSync } from 'fflate';
import { readdir, readFile, writeFile, mkdir, cp, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = existsSync(path.join(root, 'source', 'frontend'))
  ? path.join(root, 'source', 'frontend') : path.join(root, 'frontend');
// A fresh build directory prevents stale pages from entering a submission.
// Previous builds are retained rather than deleting any user's files.
await mkdir(path.join(root, 'dist'), { recursive: true });
const output = await mkdtemp(path.join(root, 'dist', 'team5-'));
await cp(source, path.join(output, 'frontend'), { recursive: true });
await cp(source, path.join(output, 'source', 'frontend'), { recursive: true });
await cp(path.join(root, 'docs'), path.join(output, 'docs'), { recursive: true });
for (const name of ['README.md', 'index.html', 'package.json', 'package-lock.json']) {
  await cp(path.join(root, name), path.join(output, name));
}
await cp(path.join(root, 'scripts'), path.join(output, 'scripts'), { recursive: true });
await cp(path.join(root, 'tests'), path.join(output, 'tests'), { recursive: true });
await cp(path.join(root, 'playwright.config.js'), path.join(output, 'playwright.config.js'));

const fixtures = {};
for (const file of await readdir(path.join(source, 'mock'))) {
  if (file.endsWith('.json')) fixtures[file.slice(0, -5)] = JSON.parse(await readFile(path.join(source, 'mock', file), 'utf8'));
}
const bundleDir = path.join(output, 'frontend', 'bundles');
await mkdir(bundleDir, { recursive: true });
await writeFile(path.join(bundleDir, 'fixtures.js'), `globalThis.__HOMEVAL_FIXTURES__ = ${JSON.stringify(fixtures)};\n`);

for (const file of await readdir(source)) {
  if (!file.endsWith('.html')) continue;
  let html = await readFile(path.join(source, file), 'utf8');
  const entries = [];
  html = html.replace(/<script\s+type="module"\s+src="([^"]+)"\s*>\s*<\/script>/g, (_, src) => {
    entries.push(src);
    return '';
  });
  if (entries.length) {
    // One bundle per page deduplicates shared imports/custom elements. ESM output
    // keeps top-level await, then an async classic-script wrapper enables file://.
    const result = await build({
      stdin: { contents: entries.map(src => `import ${JSON.stringify('./' + src)};`).join('\n'), resolveDir: source },
      bundle: true, format: 'esm', platform: 'browser', target: 'es2022', write: false,
    });
    const bundleName = file.replace(/\.html$/, '.js');
    await writeFile(path.join(bundleDir, bundleName), `(async () => {\n${result.outputFiles[0].text}\n})().catch(error => console.error(error));\n`);
    html = html.replace('</body>', `<script src="bundles/fixtures.js" defer></script>\n<script src="bundles/${bundleName}" defer></script>\n</body>`);
  }
  await writeFile(path.join(output, 'frontend', file), html);
}
await writeFile(path.join(root, 'dist', 'latest.json'), JSON.stringify({ output }));
if (process.argv.includes('--zip')) {
  const archive = {};
  async function collect(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await collect(full);
      else archive[path.relative(output, full).split(path.sep).join('/')] = new Uint8Array(await readFile(full));
    }
  }
  await collect(output);
  await writeFile(path.join(root, 'dist', 'team5.zip'), zipSync(archive));
}
console.log(`Built submission: ${output}`);
