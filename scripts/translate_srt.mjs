import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is required");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// 1. Parse raw_all.srt
const rawContent = fs.readFileSync('scripts/raw_all.srt', 'utf8').replace(/\r\n/g, '\n');

// Parse blocks by matching subtitle pattern
const blockRegex = /^(\d+)\n([^\n]+-->[^\n]+)\n([\s\S]*?)(?=(?:\n\d+\n[^\n]+-->|\Z))/gm;
const subtitles = [];
let match;
while ((match = blockRegex.exec(rawContent)) !== null) {
  subtitles.push({
    id: parseInt(match[1], 10),
    timestamp: match[2].trim(),
    text: match[3].trim().replace(/\n/g, ' ')
  });
}

console.log(`Parsed ${subtitles.length} subtitles from raw_all.srt`);

// Load existing cache if any
const cachePath = 'scripts/translated_cache.json';
let cache = {};
if (fs.existsSync(cachePath)) {
  try {
    cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    console.log(`Loaded ${Object.keys(cache).length} entries from cache`);
  } catch (e) {
    cache = {};
  }
}

// Clean text to strictly comply with "不須加 句號及逗號"
function cleanTW(text) {
  if (!text) return "";
  return text
    .replace(/[，,。.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const BATCH_SIZE = 35;
const batches = [];
for (let i = 0; i < subtitles.length; i += BATCH_SIZE) {
  const batch = subtitles.slice(i, i + BATCH_SIZE);
  // check if all items in batch are already in cache
  const needsWork = batch.some(item => !cache[item.id]);
  if (needsWork) {
    batches.push(batch);
  }
}

console.log(`Total batches to process: ${batches.length} (Batch size: ${BATCH_SIZE})`);

async function translateBatch(batch, retryCount = 0) {
  const payload = batch.map(item => ({
    id: item.id,
    text: item.text
  }));

  const prompt = `你是一位精通泰國影視綜藝文化與臺灣在地日常口語的專業字幕翻譯家。
這是一段泰國知名綜藝訪談節目《Tee Thai Krua》（偷窺大明星 / 突擊廚房）專訪泰國超人氣 GL 女星 Nina 與 Mew（劇集《我們的秘密》/《以愛為名》主演組合）的節目中文字幕。

請將下列字幕項目翻譯成道地臺灣口語繁體中文。

【嚴格遵守以下所有最高指令】：
1. 繁體中文臺灣在地語境：自然口語流暢生動，綜藝娛樂風格（例如：偷窺大明星、泰國菜廚房、逆光、長尾船、啦啦隊、螢幕情侶、攻受、慢熟、潔癖、炸豬肉、親密戲/吻戲、放閃、默契、心有靈犀、粉絲 等）。
2. 人名絕對不翻譯：Nina, Mew, Lingling, Ae, P'O, P'Jo, Arm, P'Art, P'Pong, Fan, Gina, Dew, Tina, P'Dew, Willie, Kob, Mam, Jeab, Damrong, Pim, Pan, Khun Pim 等一律保持英文原樣！
3. 嚴格不可出現句號與逗號：繁體中文句子中絕對不可以出現「。」「，」「.」「,」任何句號或逗號！句子如有停頓或分句，一律使用單一空格隔開！
4. 保持一一對應：必須回傳 JSON 陣列，每個項目包含 "id" 與 "tw" 兩個欄位，回傳數量必須與輸入完全一致！

輸入資料（JSON）：
${JSON.stringify(payload, null, 2)}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const parsed = JSON.parse(response.text.trim());
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (item && item.id !== undefined && item.tw !== undefined) {
          cache[item.id] = cleanTW(item.tw);
        }
      }
      // Save cache periodically
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
      return true;
    } else {
      throw new Error("Response is not an array");
    }
  } catch (err) {
    console.error(`Error translating batch starting at ID ${batch[0].id}: ${err.message}`);
    if (retryCount < 3) {
      console.log(`Retrying batch starting at ID ${batch[0].id} (attempt ${retryCount + 1})...`);
      await new Promise(r => setTimeout(r, 2000));
      return translateBatch(batch, retryCount + 1);
    } else {
      console.error(`Batch starting at ID ${batch[0].id} failed after 3 retries.`);
      return false;
    }
  }
}

// Concurrency pool
async function processAllBatches(concurrency = 4) {
  let index = 0;
  async function worker() {
    while (index < batches.length) {
      const currentIdx = index++;
      const currentBatch = batches[currentIdx];
      console.log(`Processing batch ${currentIdx + 1}/${batches.length} (IDs ${currentBatch[0].id} to ${currentBatch[currentBatch.length - 1].id})...`);
      await translateBatch(currentBatch);
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
}

await processAllBatches(4);

// Final check: fill any missing IDs
console.log("\nChecking for any missing translations...");
let missing = subtitles.filter(s => !cache[s.id]);
if (missing.length > 0) {
  console.log(`Found ${missing.length} missing items, translating individually or in small batch...`);
  await translateBatch(missing);
}

// Save complete cache
fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));

// Assemble the final SRT file
const srtLines = [];
const fullData = [];

for (const sub of subtitles) {
  const tw = cleanTW(cache[sub.id] || sub.text);
  srtLines.push(`${sub.id}`);
  srtLines.push(`${sub.timestamp}`);
  srtLines.push(`${tw}`);
  srtLines.push('');

  fullData.push({
    id: sub.id,
    timestamp: sub.timestamp,
    original: sub.text,
    translated: tw
  });
}

// Ensure public directory exists
if (!fs.existsSync('public')) {
  fs.mkdirSync('public', { recursive: true });
}

const finalSrtPath = 'public/subtitles_zh_tw.srt';
fs.writeFileSync(finalSrtPath, srtLines.join('\n'), 'utf8');
console.log(`Saved final SRT to ${finalSrtPath}`);

// Also save original English SRT
const enSrtLines = [];
for (const sub of subtitles) {
  enSrtLines.push(`${sub.id}`);
  enSrtLines.push(`${sub.timestamp}`);
  enSrtLines.push(`${sub.text}`);
  enSrtLines.push('');
}
fs.writeFileSync('public/subtitles_en.srt', enSrtLines.join('\n'), 'utf8');

// Save JSON for the web app
fs.writeFileSync('public/subtitles_data.json', JSON.stringify(fullData, null, 2), 'utf8');
console.log(`Saved JSON dataset with ${fullData.length} bilingual entries to public/subtitles_data.json`);

// Verification Report
let commaPeriodCount = 0;
for (const sub of subtitles) {
  const tw = cache[sub.id] || "";
  if (/[，,。.]/.test(tw)) commaPeriodCount++;
}

console.log("\n================ VALIDATION REPORT ================");
console.log(`Total subtitles expected: ${subtitles.length}`);
console.log(`Total subtitles translated: ${Object.keys(cache).length}`);
console.log(`Commas or periods in translation: ${commaPeriodCount} (MUST BE 0)`);
console.log(`First subtitle:`);
console.log(`  [${subtitles[0].id}] ${subtitles[0].timestamp} -> ${cache[subtitles[0].id]}`);
console.log(`Last subtitle:`);
console.log(`  [${subtitles[subtitles.length - 1].id}] ${subtitles[subtitles.length - 1].timestamp} -> ${cache[subtitles[subtitles.length - 1].id]}`);
console.log("===================================================\n");
