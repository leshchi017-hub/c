import fs from 'fs';

const cache = JSON.parse(fs.readFileSync('scripts/preawpak_ep43_cache.json', 'utf8'));

// Strict punctuation regex (excluding whitespace)
const punctRegex = /[，,。.\?!？！:：;；"“”'‘’「」『』()（）\[\]【】、—–…~～#@*&^%$+=\/\\|<>{}`·•]/g;
let foundPunct = [];
let shortCount = 0;
let nameIssues = [];

for (let id = 1; id <= 1189; id++) {
  const text = cache[id] || '';
  const m = text.match(punctRegex);
  if (m) {
    foundPunct.push({ id, matches: m, text });
  }
  if (text.length <= 1) {
    shortCount++;
  }
  if (/莉娜|米尤|苗苗|米歐|米繆|妮娜|Leena|Miew/i.test(text)) {
    nameIssues.push({ id, text });
  }
}

console.log('Real punctuation issues count:', foundPunct.length);
if (foundPunct.length > 0) {
  console.log('Sample punctuation issues:', foundPunct.slice(0, 10));
}
console.log('Too short (<= 1 char) count:', shortCount);
console.log('Name translation issues count:', nameIssues.length);
