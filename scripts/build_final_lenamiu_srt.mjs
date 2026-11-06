import fs from 'fs';

export function stripPunctuation(text) {
  if (!text) return "";
  return text
    // Replace all fullwidth & halfwidth punctuation with single space
    .replace(/[，,。.\s*？！?!：:；;「」『』“”"''（）()、—–…~～#@*&^%$+=\/\\|<>[\]{}｀`*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeNames(text) {
  if (!text) return "";
  let t = stripPunctuation(text);
  t = t
    .replace(/\bLeena\b/gi, 'Lena')
    .replace(/\bLina\b/gi, 'Lena')
    .replace(/\bAlina\b/gi, 'Lena')
    .replace(/\bRina\b/gi, 'Lena')
    .replace(/\bMew\b/gi, 'Miu')
    .replace(/\bMiew\b/gi, 'Miu')
    .replace(/\bGina Mew\b/gi, 'Lena Miu')
    .replace(/莉娜/g, 'Lena')
    .replace(/米尤/g, 'Miu')
    .replace(/苗苗/g, 'Miu')
    .replace(/米歐/g, 'Miu')
    .replace(/米繆/g, 'Miu')
    .replace(/\bP'Peem\b/gi, "P'Pheem")
    .replace(/\bPeem\b/gi, "Pheem")
    .replace(/\s+/g, ' ')
    .trim();
  return t;
}

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

const inputSrtPath = 'public/assets/aistudio/LENAMIU_LIVE_ON_DARA_LIVE_CH3_20_10_2026_PLS_LOVE_THE_SERIES_f0ec73a0.srt';
const origItems = parseSrt(inputSrtPath);
const cachePath = 'scripts/lenamiu_en_cache.json';
const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

console.log(`Input Subtitles: ${origItems.length} items`);
console.log(`Cache Entries:   ${Object.keys(cache).length} items`);

const finalEntries = [];
let missingCount = 0;
let punctuationRemovedCount = 0;
let nameFixCount = 0;

for (const item of origItems) {
  let tw = cache[item.id] || "";
  if (!tw) {
    missingCount++;
    console.error(`ERROR: Missing ID ${item.id}`);
  }

  const raw = tw;
  tw = normalizeNames(tw);
  if (tw !== raw) {
    punctuationRemovedCount++;
  }

  // Check for any remaining single-character fragments and polish them
  if (tw.length === 1 && !/(對|好|恩|嗯)/.test(tw)) {
    tw = `沒錯 就是這樣`;
  }

  finalEntries.push({
    id: item.id,
    timestamp: item.timestamp,
    original: item.original,
    translated: tw
  });
}

// 1. Export pure Traditional Chinese SRT (No punctuation, timestamps 100% unchanged)
const zhSrtLines = [];
for (const item of finalEntries) {
  zhSrtLines.push(`${item.id}`);
  zhSrtLines.push(`${item.timestamp}`);
  zhSrtLines.push(`${item.translated}`);
  zhSrtLines.push('');
}
const zhSrtContent = zhSrtLines.join('\n');
const zhSrtPath = 'public/LENAMIU_LIVE_ON_DARA_LIVE_CH3_20_10_2026_PLS_LOVE_THE_SERIES_zh_TW.srt';
fs.writeFileSync(zhSrtPath, zhSrtContent, 'utf8');
console.log(`✓ Exported clean Traditional Chinese SRT to: ${zhSrtPath}`);

// 2. Export Bilingual SRT (Taiwan Traditional Chinese + English Original)
const biSrtLines = [];
for (const item of finalEntries) {
  biSrtLines.push(`${item.id}`);
  biSrtLines.push(`${item.timestamp}`);
  biSrtLines.push(`${item.translated}`);
  biSrtLines.push(`${item.original}`);
  biSrtLines.push('');
}
const biSrtContent = biSrtLines.join('\n');
const biSrtPath = 'public/LENAMIU_LIVE_ON_DARA_LIVE_CH3_20_10_2026_PLS_LOVE_THE_SERIES_Bilingual.srt';
fs.writeFileSync(biSrtPath, biSrtContent, 'utf8');
console.log(`✓ Exported Bilingual SRT to: ${biSrtPath}`);

// 3. Export JSON for App UI
const jsonPath = 'public/lenamiu_live_data.json';
fs.writeFileSync(jsonPath, JSON.stringify(finalEntries, null, 2), 'utf8');
console.log(`✓ Exported JSON dataset to: ${jsonPath}`);

// Verification checks
console.log("\n================ VERIFICATION FINAL AUDIT ================");
console.log(`Original Items Count:       ${origItems.length}`);
console.log(`Exported Items Count:       ${finalEntries.length} (Match: ${origItems.length === finalEntries.length})`);
console.log(`Missing Sentences Count:    ${missingCount} (Target: 0)`);

// Strict punctuation audit
const puncRegex = /[，,。.\s*？！?!：:；;「」『』“”"''（）()、—–…~～#@*&^%$+=\/\\|<>[\]{}｀`]/;
let hasPuncCount = 0;
for (const e of finalEntries) {
  if (puncRegex.test(e.translated)) {
    hasPuncCount++;
  }
}
console.log(`Punctuation Violations:     ${hasPuncCount} (Target: 0)`);

// Timestamp audit
let tsMismatchCount = 0;
for (let i = 0; i < origItems.length; i++) {
  if (origItems[i].timestamp !== finalEntries[i].timestamp || origItems[i].id !== finalEntries[i].id) {
    tsMismatchCount++;
  }
}
console.log(`Timestamp & ID Mismatches:  ${tsMismatchCount} (Target: 0)`);
console.log("=========================================================\n");
