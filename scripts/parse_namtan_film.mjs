import fs from 'fs';

function parseSrt(filePath) {
  const content = (fs.readFileSync(filePath, 'utf8') + '\n\n').replace(/\r\n/g, '\n');
  const blocks = content.trim().split(/\n\s*\n/);
  const items = [];
  
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length >= 2) {
      const id = parseInt(lines[0].trim(), 10);
      const timestamp = lines[1].trim();
      const original = lines.slice(2).join(' ').trim();
      if (!isNaN(id) && timestamp.includes('-->')) {
        items.push({ id, timestamp, original });
      }
    }
  }
  return items;
}

const inputPath = 'public/assets/aistudio/Namtan_Film_Interview_67403abe.srt';
const items = parseSrt(inputPath);
console.log(`Parsed ${items.length} cues.`);
fs.writeFileSync('scripts/raw_namtan_film.json', JSON.stringify(items, null, 2), 'utf8');
console.log('Saved to scripts/raw_namtan_film.json');
