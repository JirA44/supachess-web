import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const ids = [...html.matchAll(/data-hub-module="([^"]+)"/g)].map(match => match[1]);
const seen = new Set();
const duplicates = ids.filter(id => (seen.has(id) ? true : (seen.add(id), false)));
console.log('total modules =', ids.length);
console.log('duplicates =', JSON.stringify(duplicates));
console.log(ids.join(', '));
const hrefs = [...html.matchAll(/data-hub-module="[^"]+"[^>]*href="([^"]+)"/g)].map(match => match[1]);
console.log('modules with href =', hrefs.length);
console.log('modules without href =', ids.length - hrefs.length);
