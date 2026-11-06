import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is required");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

function parseSrt(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
  const blockRegex = /^(\d+)\n([^\n]+-->[^\n]+)\n([\s\S]*?)(?=(?:\n\d+\n[^\n]+-->|\Z))/gm;
  const items = [];
  let match;
  while ((match = blockRegex.exec(content)) !== null) {
    items.push({
      id: parseInt(match[1], 10),
      timestamp: match[2].trim(),
      original: match[3].trim().replace(/\n/g, ' ')
    });
  }
  return items;
}

// 1. Load and combine ep2 parts
const p1 = parseSrt('scripts/raw_ep2_part1.srt');
const p2 = parseSrt('scripts/raw_ep2_part2.srt');
const p3 = parseSrt('scripts/raw_ep2_part3.srt');
const allSubtitles = [...p1, ...p2, ...p3];

console.log(`Total subtitles loaded: ${allSubtitles.length} (ID ${allSubtitles[0].id} to ${allSubtitles[allSubtitles.length - 1].id})`);

// Write unified raw_ep2_all.srt
const unifiedRawLines = [];
for (const sub of allSubtitles) {
  unifiedRawLines.push(sub.id.toString());
  unifiedRawLines.push(sub.timestamp);
  unifiedRawLines.push(sub.original);
  unifiedRawLines.push('');
}
fs.writeFileSync('scripts/raw_ep2_all.srt', unifiedRawLines.join('\n'), 'utf8');

// Load cache
const cachePath = 'scripts/ep2_translated_cache.json';
let cache = {};
if (fs.existsSync(cachePath)) {
  try {
    cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    console.log(`Loaded ${Object.keys(cache).length} entries from cache`);
  } catch (e) {
    cache = {};
  }
}

function cleanTW(text) {
  if (!text) return "";
  let t = text
    .replace(/[，,。.]/g, ' ')
    // Ensure names conform to user requirements: Lena and Miu
    .replace(/\bLeena\b/gi, 'Lena')
    .replace(/\bMew\b/gi, 'Miu')
    .replace(/\bMiew\b/gi, 'Miu')
    .replace(/\s+/g, ' ')
    .trim();
  return t;
}

const BATCH_SIZE = 35;
const batches = [];
for (let i = 0; i < allSubtitles.length; i += BATCH_SIZE) {
  const batch = allSubtitles.slice(i, i + BATCH_SIZE);
  const needsWork = batch.some(item => !cache[item.id]);
  if (needsWork) {
    batches.push(batch);
  }
}

console.log(`Batches remaining to translate: ${batches.length} (Batch size: ${BATCH_SIZE})`);

async function translateBatch(batch, retryCount = 0) {
  const payload = batch.map(item => ({
    id: item.id,
    text: item.original
  }));

  const prompt = `你是一位精通泰國影視綜藝文化與臺灣在地日常口語的專業字幕翻譯家。
這是一段泰國知名頂級綜藝談話節目《3 Zaap》（三辣/3辣）專訪泰國超人氣女女搭檔 Lena 與 Miu（劇集《Please Love / 請愛我》主演組合）的節目中文字幕。
節目主持人為泰國知名名嘴 P'Num（努姆哥），也提及主持人 P'Chom。

請將下列字幕項目翻譯成道地臺灣口語繁體中文。

【嚴格遵守以下所有最高指令】：
1. 繁體中文臺灣在地語境：自然口語流暢生動，綜藝娛樂風格（例如：火辣、三界最火辣綜藝、巴黎時裝週、豆腐湯、100根辣椒麻辣鍋、虐戀、打巴掌接吻套路、借住/留宿、潛水、百合花、放閃、默契、心有靈犀、粉絲、預告片、合唱曲 等）。
2. 人名絕對不翻譯，主角名字為 Lena 跟 Miu：
   - 訪談主角兩人的名字一律寫為「Lena」與「Miu」（英文原文中的 Leena, Alina, Rina 請統一為 Lena；Mew, Miew 請統一為 Miu）。
   - 其他人名、長輩尊稱、劇中角色名一律保留英文原樣不翻譯：P'Num, P'Chom, P'Nok, P'Anya, Pim, Peem, Pan, Khun Pim 等！
3. 嚴格不可出現句號與逗號：繁體中文句子中絕對不可以出現「。」「，」「.」「,」任何句號或逗號！若有分句或停頓，一律以單一空白鍵「 」隔開！
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
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
      return true;
    } else {
      throw new Error("Response is not an array");
    }
  } catch (err) {
    console.error(`Batch error (retries: ${retryCount}):`, err.message);
    if (retryCount < 3) {
      await new Promise(r => setTimeout(r, 2000 * (retryCount + 1)));
      return translateBatch(batch, retryCount + 1);
    }
    return false;
  }
}

async function run() {
  for (let idx = 0; idx < batches.length; idx++) {
    const batch = batches[idx];
    const firstId = batch[0].id;
    const lastId = batch[batch.length - 1].id;
    console.log(`Processing batch ${idx + 1}/${batches.length} (IDs: ${firstId}..${lastId})...`);
    await translateBatch(batch);
    // brief delay to avoid rate limits
    await new Promise(r => setTimeout(r, 600));
  }

  // Check if any missing
  const missing = allSubtitles.filter(item => !cache[item.id]);
  console.log(`Finished pass. Missing items: ${missing.length}`);
  if (missing.length > 0) {
    console.log(`Retrying missing ${missing.length} items...`);
    for (let i = 0; i < missing.length; i += 20) {
      const slice = missing.slice(i, i + 20);
      await translateBatch(slice);
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Final validation and export
  let totalMissing = 0;
  let punctuationCount = 0;
  const finalEntries = [];

  for (const item of allSubtitles) {
    const twRaw = cache[item.id] || "";
    const tw = cleanTW(twRaw);
    if (!tw) {
      totalMissing++;
    }
    if (/[，,。.]/.test(tw)) {
      punctuationCount++;
    }
    finalEntries.push({
      id: item.id,
      timestamp: item.timestamp,
      original: item.original,
      translated: tw
    });
  }

  console.log("\n================ VALIDATION REPORT ================");
  console.log(`Total Subtitles: ${finalEntries.length}`);
  console.log(`Missing Translations: ${totalMissing}`);
  console.log(`Comma/Period Violations: ${punctuationCount}`);
  console.log(`First entry: #${finalEntries[0].id} [${finalEntries[0].timestamp}] -> ${finalEntries[0].translated}`);
  console.log(`Last entry: #${finalEntries[finalEntries.length - 1].id} [${finalEntries[finalEntries.length - 1].timestamp}] -> ${finalEntries[finalEntries.length - 1].translated}`);
  console.log("===================================================\n");

  if (totalMissing === 0 && punctuationCount === 0) {
    // Generate final Traditional Chinese SRT
    const zhSrtLines = [];
    for (const entry of finalEntries) {
      zhSrtLines.push(entry.id.toString());
      zhSrtLines.push(entry.timestamp);
      zhSrtLines.push(entry.translated);
      zhSrtLines.push('');
    }
    const zhSrtContent = zhSrtLines.join('\n');

    // Generate English SRT
    const enSrtLines = [];
    for (const entry of finalEntries) {
      enSrtLines.push(entry.id.toString());
      enSrtLines.push(entry.timestamp);
      enSrtLines.push(entry.original);
      enSrtLines.push('');
    }
    const enSrtContent = enSrtLines.join('\n');

    // Write to public directory
    fs.writeFileSync('public/subtitles_zh_tw.srt', zhSrtContent, 'utf8');
    fs.writeFileSync('public/Lena_Miu_3Zaap_zh_TW.srt', zhSrtContent, 'utf8');
    fs.writeFileSync('public/subtitles_en.srt', enSrtContent, 'utf8');
    fs.writeFileSync('public/subtitles_data.json', JSON.stringify(finalEntries, null, 2), 'utf8');

    console.log("SUCCESS! All files exported:");
    console.log(" - public/subtitles_zh_tw.srt");
    console.log(" - public/Lena_Miu_3Zaap_zh_TW.srt");
    console.log(" - public/subtitles_en.srt");
    console.log(" - public/subtitles_data.json");
  } else {
    console.error("Validation failed! Please inspect cache and re-run.");
  }
}

run();
