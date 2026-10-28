import assert from 'node:assert/strict';
import fs from 'node:fs';

const community = fs.readFileSync(new URL('../shared/community.js', import.meta.url), 'utf8');
const rules = fs.readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

assert.match(community, /function getPresenceDisplayName\(user\)/);
assert.match(community, /name\.indexOf\('@'\)/);
assert.match(community, /collection\('presence_public'\)/);
assert.match(community, /\.where\('status', 'in', \['dispo', 'occupe'\]\)/);
assert.match(community, /\.where\('lastSeen', '>', fiveMinAgo\)[\s\S]*?\.limit\(100\)/);
assert.match(community, /status !== 'dispo' && status !== 'occupe'[\s\S]*?ref\.delete\(\)/);
assert.doesNotMatch(community, /displayName: user\.displayName \|\| user\.email/);

assert.match(rules, /match \/presence\/\{uid\}/);
assert.match(rules, /match \/presence_public\/\{uid\}/);
assert.match(rules, /request\.auth\.uid == uid/);
assert.match(rules, /request\.resource\.data\.keys\(\)\.hasOnly/);
assert.match(rules, /displayName\.matches\('\.\*@\.\*'\)/);
assert.doesNotMatch(rules, /match \/\{document=\*\*\}/);
assert.doesNotMatch(rules, /allow read, write: if true/);

console.log('Presence privacy and query contract checks passed.');
