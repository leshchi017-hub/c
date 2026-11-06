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
      const text = lines.slice(2).join(' ').trim();
      items.push({ id, timestamp, text });
    }
  }
  return items;
}

const originalPath = 'public/assets/aistudio/LENAMIU_LIVE_ON_DARA_LIVE_CH3_20_10_2026_PLS_LOVE_THE_SERIES_f0ec73a0.srt';
const exportedPath = 'public/LENAMIU_LIVE_ON_DARA_LIVE_CH3_20_10_2026_PLS_LOVE_THE_SERIES_zh_TW.srt';

const origItems = parseSrt(originalPath);
const expItems = parseSrt(exportedPath);

console.log("================= SRT VERIFICATION AUDIT =================");
console.log(`Original SRT Items Count: ${origItems.length}`);
console.log(`Exported SRT Items Count: ${expItems.length}`);

// 1. Sequence and count
let countMatch = origItems.length === expItems.length;
console.log(`1. Total Count Match (929 == 929): ${countMatch ? 'PASSED ✓' : 'FAILED ✕'}`);

// 2. Timestamp match
let timestampMismatches = 0;
let idMismatches = 0;
for (let i = 0; i < origItems.length; i++) {
  if (origItems[i].id !== expItems[i].id) {
    idMismatches++;
  }
  if (origItems[i].timestamp !== expItems[i].timestamp) {
    timestampMismatches++;
  }
}
console.log(`2. ID Match (1..929 exact): ${idMismatches === 0 ? 'PASSED ✓ (0 mismatches)' : `FAILED ✕ (${idMismatches} mismatches)`}`);
console.log(`3. Timestamp 100% Unchanged: ${timestampMismatches === 0 ? 'PASSED ✓ (0 mismatches)' : `FAILED ✕ (${timestampMismatches} mismatches)`}`);

// 3. Punctuation check
const punctuationRegex = /[，,。.\s*？！?!：:；;「」『』“”"''（）()、—–…~～#@*&^%$+=\/\\|<>[\]{}｀`*]/;
let punctuationCount = 0;
const punctuationOffenders = [];

for (const item of expItems) {
  if (punctuationRegex.test(item.text)) {
    punctuationCount++;
    punctuationOffenders.push({ id: item.id, text: item.text });
  }
}

console.log(`4. Zero Punctuation Marks Check: ${punctuationCount === 0 ? 'PASSED ✓ (0 punctuation marks)' : `FAILED ✕ (${punctuationCount} lines have punctuation)`}`);
if (punctuationCount > 0) {
  console.log("Sample punctuation offenders:", punctuationOffenders.slice(0, 5));
}

// 4. Missing sentences check
let emptyCount = 0;
for (const item of expItems) {
  if (!item.text || item.text.trim().length === 0) {
    emptyCount++;
  }
}
console.log(`5. Missing Sentences Check: ${emptyCount === 0 ? 'PASSED ✓ (0 missing sentences)' : `FAILED ✕ (${emptyCount} empty lines)`}`);

// 5. Short broken sentences check
let singleCharCount = 0;
for (const item of expItems) {
  if (item.text.trim().length === 1 && !/^[對好恩嗯]$/.test(item.text.trim())) {
    singleCharCount++;
  }
}
console.log(`6. Fragmented Single-Word Check: ${singleCharCount === 0 ? 'PASSED ✓ (All fragmented lines expanded)' : `WARNING (${singleCharCount} single-character lines)`}`);

// 6. Name normalization check
let nameIssues = 0;
for (const item of expItems) {
  if (/\b(Mew|Miew|Rina|Gina Mew|Leena|Lina)\b/i.test(item.text) || /莉娜|米尤|苗苗/.test(item.text)) {
    nameIssues++;
  }
}
console.log(`7. Protagonist Name 'Lena & Miu' Check: ${nameIssues === 0 ? 'PASSED ✓ (Strictly Lena & Miu, no Mew/Rina)' : `WARNING (${nameIssues} instances need normalization)`}`);

// Samples check
console.log("\n================ SAMPLE SUBTITLE ENTRIES ================");
console.log("--- Items 1-5 (Opening) ---");
for (let i = 0; i < 5; i++) {
  console.log(`${expItems[i].id} | ${expItems[i].timestamp} | ${expItems[i].text}`);
}

console.log("\n--- Items 75-80 (EP6 Intimate scene & blocking) ---");
for (let i = 74; i < 80; i++) {
  console.log(`${expItems[i].id} | ${expItems[i].timestamp} | ${expItems[i].text}`);
}

console.log("\n--- Items 346-355 (Pat-Ting conversation: adjusted short sentences) ---");
for (let i = 345; i < 355; i++) {
  console.log(`${expItems[i].id} | ${expItems[i].timestamp} | ${expItems[i].text}`);
}

console.log("\n--- Items 925-929 (Closing lines) ---");
for (let i = 924; i < 929; i++) {
  console.log(`${expItems[i].id} | ${expItems[i].timestamp} | ${expItems[i].text}`);
}
console.log("=========================================================\n");
