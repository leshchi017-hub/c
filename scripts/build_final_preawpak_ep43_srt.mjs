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

const inputSrtPath = 'public/assets/aistudio/Uncut_Ver_PreawpakxLenaMiu_l_l_l_Ep_43_282cff29.srt';
const origItems = parseSrt(inputSrtPath);
const cachePath = 'scripts/preawpak_ep43_cache.json';
const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

console.log(`Original subtitles: ${origItems.length}`);
console.log(`Cached translations: ${Object.keys(cache).length}`);

if (origItems.length !== 1189) {
  throw new Error(`Expected 1189 subtitles, got ${origItems.length}`);
}

const dataJson = [];
let zhTwSrtContent = '';
let bilingualSrtContent = '';

for (let i = 0; i < origItems.length; i++) {
  const orig = origItems[i];
  const id = orig.id;
  const timestamp = orig.timestamp;
  const translated = cache[id];

  if (!translated) {
    throw new Error(`Missing translation for subtitle ID ${id}`);
  }

  dataJson.push({
    id,
    timestamp,
    original: orig.original,
    translated
  });

  // zh-TW SRT
  zhTwSrtContent += `${id}\n${timestamp}\n${translated}\n\n`;

  // Bilingual SRT (Line 1: Traditional Chinese, Line 2: Original English)
  bilingualSrtContent += `${id}\n${timestamp}\n${translated}\n${orig.original}\n\n`;
}

// Write files
fs.writeFileSync('public/Preawpak_EP43_LenaMiu_zh_TW.srt', zhTwSrtContent.trim() + '\n', 'utf8');
fs.writeFileSync('public/Preawpak_EP43_LenaMiu_Bilingual.srt', bilingualSrtContent.trim() + '\n', 'utf8');
fs.writeFileSync('public/preawpak_ep43_data.json', JSON.stringify(dataJson, null, 2), 'utf8');

console.log('✓ Successfully generated:');
console.log('  - public/Preawpak_EP43_LenaMiu_zh_TW.srt');
console.log('  - public/Preawpak_EP43_LenaMiu_Bilingual.srt');
console.log('  - public/preawpak_ep43_data.json');

// Verification of timestamps
const reParsedZh = parseSrt('public/Preawpak_EP43_LenaMiu_zh_TW.srt');
if (reParsedZh.length !== origItems.length) {
  throw new Error(`Re-parsed zh length mismatch: ${reParsedZh.length} vs ${origItems.length}`);
}

for (let i = 0; i < origItems.length; i++) {
  if (reParsedZh[i].id !== origItems[i].id) {
    throw new Error(`ID mismatch at index ${i}: ${reParsedZh[i].id} vs ${origItems[i].id}`);
  }
  if (reParsedZh[i].timestamp !== origItems[i].timestamp) {
    throw new Error(`Timestamp mismatch at ID ${origItems[i].id}: ${reParsedZh[i].timestamp} vs ${origItems[i].timestamp}`);
  }
}

const reParsedBi = parseSrt('public/Preawpak_EP43_LenaMiu_Bilingual.srt');
if (reParsedBi.length !== origItems.length) {
  throw new Error(`Re-parsed bilingual length mismatch: ${reParsedBi.length} vs ${origItems.length}`);
}

for (let i = 0; i < origItems.length; i++) {
  if (reParsedBi[i].id !== origItems[i].id) {
    throw new Error(`Bilingual ID mismatch at index ${i}: ${reParsedBi[i].id} vs ${origItems[i].id}`);
  }
  if (reParsedBi[i].timestamp !== origItems[i].timestamp) {
    throw new Error(`Bilingual Timestamp mismatch at ID ${origItems[i].id}: ${reParsedBi[i].timestamp} vs ${origItems[i].timestamp}`);
  }
}

console.log('✓ All 1189 timestamps perfectly match original timing without any alteration!');
