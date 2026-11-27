import { execSync } from 'node:child_process';
import fs from 'node:fs';

const original = execSync('git show HEAD:index.html', { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
const current = fs.readFileSync('index.html', 'utf8');

function targets(html) {
  const found = new Set();
  for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) found.add(match[1]);
  for (const match of html.matchAll(/window\.location\.href='([^']+)'/g)) found.add(match[1]);
  return found;
}

const originalTargets = targets(original);
const currentTargets = targets(current);
const lost = [...originalTargets].filter(target => !currentTargets.has(target));
const added = [...currentTargets].filter(target => !originalTargets.has(target));
console.log('original link targets =', originalTargets.size);
console.log('current link targets  =', currentTargets.size);
console.log('LOST =', JSON.stringify(lost, null, 1));
console.log('ADDED =', JSON.stringify(added, null, 1));
