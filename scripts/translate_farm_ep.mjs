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

const inputSrtPath = 'public/assets/aistudio/srt_291973af.txt';
const allSubtitles = parseSrt(inputSrtPath);

console.log(`Parsed ${allSubtitles.length} subtitles from ${inputSrtPath}`);

// Load cache
const cachePath = 'scripts/farm_translated_cache.json';
let cache = {};
if (fs.existsSync(cachePath)) {
  try {
    cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    console.log(`Loaded ${Object.keys(cache).length} cached entries`);
  } catch (e) {
    cache = {};
  }
}

// Taiwanese punctuation cleaning and name normalization
function cleanTW(text) {
  if (!text) return "";
  let t = text
    // Strict requirement: No periods and no commas whatsoever
    .replace(/[，,。.]/g, ' ')
    // Normalize protagonist names to strictly Lena and Miu
    .replace(/\bLeena\b/gi, 'Lena')
    .replace(/\bLina\b/gi, 'Lena')
    .replace(/\bAlina\b/gi, 'Lena')
    .replace(/\bRina\b/gi, 'Lena')
    .replace(/\bMew\b/gi, 'Miu')
    .replace(/\bMiew\b/gi, 'Miu')
    // Remove duplicate whitespace
    .replace(/\s+/g, ' ')
    .trim();
  return t;
}

const BATCH_SIZE = 30;
const batches = [];
for (let i = 0; i < allSubtitles.length; i += BATCH_SIZE) {
  const batch = allSubtitles.slice(i, i + BATCH_SIZE);
  const needsWork = batch.some(item => !cache[item.id]);
  if (needsWork) {
    batches.push(batch);
  }
}

console.log(`Remaining batches: ${batches.length} (Batch size: ${BATCH_SIZE})`);

async function translateBatch(batch, retryCount = 0) {
  const payload = batch.map(item => ({
    id: item.id,
    text: item.original
  }));

  const prompt = `你是一位精通泰國影視綜藝文化與臺灣在地日常口語的專業字幕翻譯家。
這是一段泰國女星 Mint Nawinda 與好友 Fang 在曼谷綠肺 Bang Krachao（邦喀昭）生態農場，專訪泰國超人氣女女（GL）搭檔 Lena 與 Miu（主演泰劇《Please Love》爆紅CP）的戶外綜藝節目中文字幕。
節目內容包含：參觀生態農場、認識農場萌犬 Quick、被法國鵝與獅頭鵝包圍、鴨舍撿鴨蛋競賽、採收義大利青醬用的甜羅勒（九層塔）與打拋葉、採集野生植物春花果（Pilangkasa）、用柚木葉做植物拓印頭巾（Banjana eco-print）、石臼研磨自製腰果青醬佐鹹鴨蛋試吃、分享粉絲見面會擊掌感動回憶、暢聊兩人在朱拉隆功大學相識8年同月同日生、宣傳主演劇集《Please Love》等。

請將下列字幕項目翻譯成道地臺灣口語繁體中文。

【嚴格遵守以下所有最高指令】：
1. 繁體中文臺灣在地語境：
   - 語氣自然生動、口語流暢、綜藝感十足（例如：太扯了、超萌、超可愛、放閃、太甜了、默契、心有靈犀、傻眼、青醬、九層塔、打拋葉、鹹蛋、鴨蛋、柚木葉、紅旗/粉紅旗、粉絲見面會、擊掌福利、高材生、學姊學妹、朱拉隆功大學 等）。
   - 絕不使用中國大陸用語（不用「視頻/立馬/給力/小姐姐/閨蜜」，改用「影片/馬上/超強/女生/好姐妹」等臺灣慣用詞）。
2. 人名絕對不翻譯，主角名字一律為「Lena」與「Miu」：
   - 訪談主角兩人的名字一律寫為「Lena」與「Miu」（英文原文中的 Leena, Lina, Alina, Rina 請統一為「Lena」；Mew, Miew 請統一為「Miu」）。
   - 其他人名、長輩尊稱一律保留英文原樣不翻譯：Mint, P'Mint, Fang, P'Nui, Khun Oom, Isaya, Khun Dew, Shinji, Lumi 等！
   - 劇中角色名保持英文：Pheem, Paan。
3. 嚴格不可出現句號與逗號：
   - 繁體中文句子中【絕對不可以出現】「。」「，」「.」「,」任何句號或逗號！
   - 若有分句、停頓或斷句，一律以單一半形空白鍵「 」隔開！
   - 可以保留驚嘆號「！」或問號「？」或破折號，但絕不能有句號和逗號！
4. 保持一一對應：
   - 必須回傳 JSON 陣列，每個項目包含 "id" 與 "tw" 兩個欄位，回傳數量與 id 必須與輸入完全一致！

輸入資料（JSON）：
${JSON.stringify(payload, null, 2)}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    let rawText = response.text ? response.text.trim() : "";
    if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }

    const parsed = JSON.parse(rawText);
    if (Array.isArray(parsed)) {
      let count = 0;
      for (const item of parsed) {
        if (item && item.id !== undefined && item.tw !== undefined) {
          cache[item.id] = cleanTW(item.tw);
          count++;
        }
      }
      // Save cache immediately to disk
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
      console.log(`✓ Completed IDs ${batch[0].id}..${batch[batch.length - 1].id} (${count} items) | Cache: ${Object.keys(cache).length}/892`);
      return true;
    } else {
      throw new Error("Response is not an array");
    }
  } catch (err) {
    console.error(`✕ Error on IDs ${batch[0].id}..${batch[batch.length - 1].id} (retry ${retryCount}):`, err.message);
    if (retryCount < 5) {
      await new Promise(r => setTimeout(r, 3000 * (retryCount + 1)));
      return translateBatch(batch, retryCount + 1);
    }
    return false;
  }
}

// Worker pool pattern
async function run() {
  const WORKERS = 2;
  console.log(`Starting translation with ${WORKERS} parallel workers...`);

  async function worker(id) {
    while (batches.length > 0) {
      const batch = batches.shift();
      if (!batch) break;
      await translateBatch(batch);
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  const workerPromises = [];
  for (let w = 1; w <= WORKERS; w++) {
    workerPromises.push(worker(w));
  }
  await Promise.all(workerPromises);

  // Retry any missing items
  let missing = allSubtitles.filter(item => !cache[item.id]);
  console.log(`\nMain passes complete. Missing items: ${missing.length}`);
  if (missing.length > 0) {
    console.log(`Retrying missing ${missing.length} items sequentially...`);
    for (let i = 0; i < missing.length; i += 15) {
      const slice = missing.slice(i, i + 15);
      await translateBatch(slice);
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  // Final verification and formatting
  let totalMissing = 0;
  let punctuationCount = 0;
  let nameMismatchCount = 0;
  const finalEntries = [];

  for (const item of allSubtitles) {
    let twRaw = cache[item.id] || "";
    let tw = cleanTW(twRaw);
    if (!tw) {
      totalMissing++;
    }
    if (/[，,。.]/.test(tw)) {
      punctuationCount++;
      tw = tw.replace(/[，,。.]/g, ' ').replace(/\s+/g, ' ').trim();
    }
    if (/\b(Leena|Lina|Mew|Miew)\b/i.test(tw)) {
      nameMismatchCount++;
      tw = tw
        .replace(/\bLeena\b/gi, 'Lena')
        .replace(/\bLina\b/gi, 'Lena')
        .replace(/\bMew\b/gi, 'Miu')
        .replace(/\bMiew\b/gi, 'Miu');
    }
    cache[item.id] = tw;
    finalEntries.push({
      id: item.id,
      timestamp: item.timestamp,
      original: item.original,
      translated: tw
    });
  }

  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');

  console.log("\n================ VALIDATION REPORT ================");
  console.log(`Total Subtitles: ${finalEntries.length} (Expected: 892)`);
  console.log(`Missing Translations: ${totalMissing}`);
  console.log(`Comma/Period Violations: ${punctuationCount}`);
  console.log(`Name Normalizations: ${nameMismatchCount}`);
  console.log(`First entry: #${finalEntries[0].id} [${finalEntries[0].timestamp}] -> ${finalEntries[0].translated}`);
  console.log(`Last entry: #${finalEntries[finalEntries.length - 1].id} [${finalEntries[finalEntries.length - 1].timestamp}] -> ${finalEntries[finalEntries.length - 1].translated}`);
  console.log("===================================================\n");

  if (totalMissing === 0) {
    // 1. Generate final Traditional Chinese SRT (pure zh-TW)
    const zhSrtLines = [];
    for (const entry of finalEntries) {
      zhSrtLines.push(entry.id.toString());
      zhSrtLines.push(entry.timestamp);
      zhSrtLines.push(entry.translated);
      zhSrtLines.push('');
    }
    const zhSrtContent = zhSrtLines.join('\n');

    // 2. Generate Bilingual SRT
    const bilingualSrtLines = [];
    for (const entry of finalEntries) {
      bilingualSrtLines.push(entry.id.toString());
      bilingualSrtLines.push(entry.timestamp);
      bilingualSrtLines.push(`${entry.translated}\n${entry.original}`);
      bilingualSrtLines.push('');
    }
    const bilingualSrtContent = bilingualSrtLines.join('\n');

    // 3. Generate English SRT
    const enSrtLines = [];
    for (const entry of finalEntries) {
      enSrtLines.push(entry.id.toString());
      enSrtLines.push(entry.timestamp);
      enSrtLines.push(entry.original);
      enSrtLines.push('');
    }
    const enSrtContent = enSrtLines.join('\n');

    // Write to public directory
    fs.writeFileSync('public/Lena_Miu_BangKrachao_zh_TW.srt', zhSrtContent, 'utf8');
    fs.writeFileSync('public/subtitles_zh_tw.srt', zhSrtContent, 'utf8');
    fs.writeFileSync('public/Lena_Miu_BangKrachao_Bilingual.srt', bilingualSrtContent, 'utf8');
    fs.writeFileSync('public/subtitles_en.srt', enSrtContent, 'utf8');
    fs.writeFileSync('public/subtitles_data.json', JSON.stringify(finalEntries, null, 2), 'utf8');

    console.log("SUCCESS! All files exported:");
    console.log(" - public/Lena_Miu_BangKrachao_zh_TW.srt");
    console.log(" - public/subtitles_zh_tw.srt");
    console.log(" - public/Lena_Miu_BangKrachao_Bilingual.srt");
    console.log(" - public/subtitles_en.srt");
    console.log(" - public/subtitles_data.json");
  } else {
    console.error(`Validation failed with ${totalMissing} missing items!`);
  }
}

run();
