import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtempSync, rmSync } from 'node:fs';

const root = process.argv[2];
const files = execFileSync('git', ['ls-files', '*.html', '*.js'], { cwd: root, encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

let checked = 0;
const failures = [];
const tmpDir = mkdtempSync(join(tmpdir(), 'supachess-syntax-'));

for (const rel of files) {
  const abs = join(root, rel);
  const content = readFileSync(abs, 'utf8');

  const sources = [];
  if (rel.endsWith('.html')) {
    // A literal </script> inside a JS string ends the block in the browser, so
    // the recovered text is what actually runs.
    const blocks = [...content.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
    for (const block of blocks) sources.push(block[1]);
  } else {
    sources.push(content);
  }

  for (const [i, src] of sources.entries()) {
    const tmp = join(tmpDir, `${checked}_${i}.js`);
    writeFileSync(tmp, src, 'utf8');
    try {
      execFileSync('node', ['--check', tmp], { stdio: 'pipe' });
      checked++;
    } catch (err) {
      const msg = String(err.stderr || err.stdout || err.message).split('\n').slice(0, 4).join(' | ');
      failures.push(`${rel} block#${i + 1}: ${msg}`);
    }
  }
}

console.log(`checked ${checked} scripts`);
if (failures.length) {
  console.log(`\nFAILURES (${failures.length}):`);
  for (const f of failures) console.log('  ' + f);
  process.exit(1);
}
console.log('all clean');
rmSync(tmpDir, { recursive: true, force: true });