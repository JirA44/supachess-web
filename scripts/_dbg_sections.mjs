import fs from 'node:fs';
const html = fs.readFileSync('index.html', 'utf8');
const sectionRe = /<section id="section-([a-z]+)"[^>]*>([\s\S]*?)(?=<section id="section-|\n\s*<\/section>\s*\n\s*<footer)/g;
for (const section of html.matchAll(sectionRe)) {
  const id = section[1];
  const body = section[2];
  const heading = (body.match(/<h2[^>]*>([^<]*)<\/h2>/) || [])[1] || '';
  console.log(`\n## ${id} — ${heading.trim()}`);
  for (const details of body.matchAll(/<details[^>]*class="hub-folder"[^>]*>([\s\S]*?)<\/details>/g)) {
    const summary = (details[1].match(/<summary[^>]*>([\s\S]*?)<\/summary>/) || [])[1] || '';
    const clean = summary.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const count = (summary.match(/hub-folder-count">([^<]*)</) || [])[1] || '';
    const modules = [...details[1].matchAll(/data-hub-module="([^"]+)"/g)].map(match => match[1]);
    console.log(`  - ${clean} (${count}) : ${modules.join(', ')}`);
  }
  const loose = [...body.matchAll(/data-hub-module="([^"]+)"/g)].map(match => match[1]);
  console.log(`  total modules in section: ${loose.length}`);
}
