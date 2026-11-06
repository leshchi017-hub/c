import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

export function stripPunctuation(text) {
  if (!text) return "";
  return text
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
const allSubtitles = parseSrt(inputSrtPath);
const cachePath = 'scripts/lenamiu_en_cache.json';

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
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
  } catch (e) {}
}

const BATCH_SIZE = 25;
const allBatches = [];
for (let i = 0; i < allSubtitles.length; i += BATCH_SIZE) {
  allBatches.push(allSubtitles.slice(i, i + BATCH_SIZE));
}

// Work backwards!
const reversedBatches = allBatches.reverse();

async function translateBatch(batch, retryCount = 0) {
  let cache = getCache();
  const uncompleted = batch.filter(item => !cache[item.id]);
  if (uncompleted.length === 0) return true;

  const payload = uncompleted.map(item => ({
    id: item.id,
    text: item.original
  }));

  const prompt = `你是一位精通泰國影視綜藝文化與臺灣在地日常口語的專業字幕翻譯家。
這是泰國3台（Ch3）知名綜藝直播《Dara Live》（主持人為 P'Film），專訪人氣 GL 劇集《Please Love》（愛情請敲門）兩位雙女主 Lena 與 Miu 的直播訪談全集英文字幕。

【重要人物與背景】：
- 訪談主角兩位女星：Lena 與 Miu。
- 主持人：P'Film（P'Joy同事CP）。高層主管：Khun Dew。
- 劇集雙女主角色：Pheem（Lena飾）與 Paan（Miu飾）。
- 片尾曲/主題曲、EP7與EP8精彩預告、追妻哈士奇、麻辣鍋寬粉耐嚼彈牙「สู้ฟัน」、大結局10月30日百麗宮千人觀影會售罄、萬聖節變裝、Victoria's Secret 天使翅膀走秀 Pose 等。

【必須嚴格遵守的最高規則】：
1. 訪談主角名字一律為「Lena」與「Miu」（將 Mew/Rina/Leena 修正為 Lena 與 Miu）。
2. 人名保留不動：Lena, Miu, P'Film, P'Joy, P'Dew, Pheem, Paan, Pat, Ting 等保留英文原名。
3. 繁體中文須為臺灣在地語境：自然生動、綜藝感滿滿，絕不使用大陸用語。
4. 【核心重點：調整過短的斷句】：
   - 原文常因語音自動斷句破碎（如 There, me, about, it, I, know, ., Tell, more, Pat, , 或 Oh, It's, But, ... No. 等）。
   - 【絕對不可】直接翻譯成單個漢字（不可輸出「我」「只」「快」等破碎單字）！
   - 請務必結合對話前後文的完整脈絡與語意，將每個 id 調整為流暢自然、語意完整的繁體中文短句（約 4 至 15 個中文字）！
5. 【核心重點：不須加 標點符號】：
   - 翻譯後的繁體中文【完全不可包含任何標點符號】（無逗號、句號、問號、驚嘆號、引號等）！
   - 如需斷句停頓，一律使用單一半形空格「 」隔開！
6. 保持序號與時間軸完全一一對應：
   - 回傳標準 JSON 陣列，每個項目包含 "id" 與 "tw" 兩個欄位。

輸入資料（JSON）：
${JSON.stringify(payload, null, 2)}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
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
      cache = getCache();
      let count = 0;
      for (const item of parsed) {
        if (item && item.id !== undefined && item.tw !== undefined) {
          cache[item.id] = normalizeNames(item.tw);
          count++;
        }
      }
      saveCache(cache);
      console.log(`[Backward] ✓ Completed IDs ${uncompleted[0].id}..${uncompleted[uncompleted.length - 1].id} (${count} items) | Total cache: ${Object.keys(cache).length}/${allSubtitles.length}`);
      return true;
    } else {
      throw new Error("Response is not an array");
    }
  } catch (err) {
    console.error(`[Backward] ✕ Error on batch (retry ${retryCount}):`, err.message);
    if (retryCount < 5) {
      await new Promise(r => setTimeout(r, 2000 * (retryCount + 1)));
      return translateBatch(batch, retryCount + 1);
    }
    return false;
  }
}

async function run() {
  const WORKERS = 2;
  console.log(`Starting Backward Worker with ${WORKERS} concurrent workers...`);

  async function worker() {
    while (reversedBatches.length > 0) {
      const batch = reversedBatches.shift();
      if (!batch) break;
      await translateBatch(batch);
      await new Promise(r => setTimeout(r, 500));
    }
  }

  const promises = [];
  for (let i = 0; i < WORKERS; i++) {
    promises.push(worker());
  }
  await Promise.all(promises);
  console.log("[Backward] Finished all reversed batches!");
}

run().catch(err => {
  console.error("[Backward] Fatal:", err);
});
