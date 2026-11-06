import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

const rawContent = fs.readFileSync('scripts/raw_all.srt', 'utf8').replace(/\r\n/g, '\n');
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

const cachePath = 'scripts/translated_cache.json';

function cleanTW(text) {
  if (!text) return "";
  return text.replace(/[，,。.]/g, ' ').replace(/\s+/g, ' ').trim();
}

function getCache() {
  if (fs.existsSync(cachePath)) {
    try {
      return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    } catch (e) {
      return {};
    }
  }
  return {};
}

function saveCache(cache) {
  try {
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
  } catch (e) {}
}

const BATCH_SIZE = 35;
const allBatches = [];
for (let i = 0; i < subtitles.length; i += BATCH_SIZE) {
  allBatches.push(subtitles.slice(i, i + BATCH_SIZE));
}

// Reverse so this script works from the end backwards!
const reversedBatches = allBatches.reverse();

async function translateBatch(batch) {
  let cache = getCache();
  const uncompleted = batch.filter(item => !cache[item.id]);
  if (uncompleted.length === 0) return true;

  const payload = uncompleted.map(item => ({
    id: item.id,
    text: item.text
  }));

  const prompt = `你是一位精通泰國影視綜藝文化與臺灣在地日常口語的專業字幕翻譯家。
節目是泰國綜藝《Tee Thai Krua / 偷窺大明星》專訪人氣 GL 女星 Nina 與 Mew。

請將下列字幕項目翻譯成道地臺灣口語繁體中文。

【嚴格指令】：
1. 繁體中文臺灣在地語境：自然口語，綜藝娛樂風格。
2. 人名絕對不翻譯：Nina, Mew, Lingling, Ae, P'O, P'Jo, Arm, P'Art, P'Pong, Fan, Gina, Dew, Tina, P'Dew, Willie, Kob, Mam, Jeab, Damrong, Pim, Pan, Khun Pim 等一律保持英文原樣！
3. 嚴格不可出現句號與逗號：繁體中文句子中絕對不可以出現「。」「，」「.」「,」任何標點符號！停頓一律使用單一空格隔開！
4. 輸出 JSON 陣列，每個項目包含 "id" 與 "tw" 兩個欄位。

輸入資料（JSON）：
${JSON.stringify(payload, null, 2)}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const parsed = JSON.parse(response.text.trim());
    if (Array.isArray(parsed)) {
      cache = getCache();
      for (const item of parsed) {
        if (item && item.id !== undefined && item.tw !== undefined) {
          cache[item.id] = cleanTW(item.tw);
        }
      }
      saveCache(cache);
      return true;
    }
  } catch (err) {
    console.error(`Backward worker error at ${batch[0].id}: ${err.message}`);
  }
  return false;
}

async function run() {
  for (const batch of reversedBatches) {
    const cache = getCache();
    const needsWork = batch.some(item => !cache[item.id]);
    if (needsWork) {
      console.log(`Backward worker translating IDs ${batch[0].id} to ${batch[batch.length - 1].id}...`);
      await translateBatch(batch);
    }
  }
}

run();
