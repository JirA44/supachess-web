import fs from 'node:fs';
const html = fs.readFileSync('index.html', 'utf8');
const sections = [...html.matchAll(/<section id="section-([a-z]+)"[^>]*>[\s\S]*?<h2[^>]*>([^<]*)<\/h2>/g)].map(match => `${match[1]} :: ${match[2].trim()}`);
console.log(sections.join('\n'));
const cards = [...html.matchAll(/<a class="hub-card" href="([^"]+)" data-hub-module="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
for (const card of cards) {
  const title = (card[3].match(/hub-card-title">([^<]*)</) || [])[1] || '';
  console.log(`${card[2]} | ${title.trim()} | ${card[1]}`);
}
