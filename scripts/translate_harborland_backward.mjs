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
    .replace(/^[-–—\s]+/gm, '')
    .replace(/[，,。.\?!？！:：;；「」『』“”\"''`｀（）()【】\[\]{}、—–…~～#@*&^%$+=\/\\|<>\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeNames(text) {
  if (!text) return "";
  let t = stripPunctuation(text);
  t = t
    .replace(/\bLeena\b/gi, 'Lena')
    .replace(/\bLina\b/gi, 'Lena')
    .replace(/\bMew\b/gi, 'Miu')
    .replace(/\bMiew\b/gi, 'Miu')
    .replace(/\bOm\b/gi, 'Oom')
    .replace(/\bYu Yu\b/gi, 'Yuyu')
    .replace(/\bTan Yu\b/gi, 'TanYu')
    .replace(/莉娜/g, 'Lena')
    .replace(/米尤/g, 'Miu')
    .replace(/苗苗/g, 'Miu')
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

const inputSrtPath = 'public/assets/aistudio/ENG_SUB_LenaMiu_x_OomBam_x_TanYuyu_3Plus_e70eb5f6.srt';
const allSubtitles = parseSrt(inputSrtPath);
const cachePath = 'scripts/harborland_cache.json';

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

const BATCH_SIZE = 30;
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

  const prompt = `你是一位精通泰國 GL（百合）影視娛樂文化與臺灣在地日常綜藝口語的專業字幕翻譯家。
這是泰國3台（Ch3）知名綜藝節目《3Plus Special》，由三大人氣百合（GL）雙女主 CP 齊聚 HarborLand 室內極限遊樂園進行冒險大對決：
1. Lena 與 Miu（LenaMiu）
2. Oom 與 Bam（OomBam）
3. Tan 與 Yuyu（TanYuyu）

【嚴格規則】：
1. 主角們的名字保留不動，一律使用英文原名：
   Lena、Miu、Oom、Bam、Tan、Yuyu
   （其他名字如 Eisaya, Saralee, Nick, Judy 等亦保留原樣，絕不音譯成中文漢字）！
2. 繁體中文須為臺灣在地日常綜藝語境：
   - 自然生動、活潑幽默、綜藝感十足（例如：攻受對抗、放閃、互撩、跌進妳心裡、太會了吧、笑死、傻眼、太強了吧、投降、認輸、魔鬼滑梯、機械牛、超怕高、笑翻 等）。
   - 絕不使用中國大陸用語。
3. 【最核心指令】不須加 標點符號：
   - 翻譯後的繁體中文【完全不可包含任何標點符號】！
   - 無句號、逗號、問號、驚嘆號、引號、冒號、破折號、橫線等！
   - 句子前若有連字號「- 」，請直接移除！
   - 如需斷句或停頓，一律以單一半形空格「 」隔開！
4. 保持序號與時間軸完全一一對應：
   - 必須回傳標準 JSON 陣列，每個項目包含 "id" 與 "tw" 兩個欄位。

輸入資料（JSON）：
${JSON.stringify(payload, null, 2)}
`;

  const modelToUse = retryCount % 2 === 0 ? "gemini-3.5-flash-lite" : "gemini-3.8-flash";

  try {
    const response = await ai.models.generateContent({
      model: modelToUse,
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
      console.log(`[Backward] ✓ Completed IDs ${uncompleted[0].id}..${uncompleted[uncompleted.length - 1].id} (${count} items) [Model: ${modelToUse}] | Total cache: ${Object.keys(cache).length}/${allSubtitles.length}`);
      return true;
    } else {
      throw new Error("Response is not an array");
    }
  } catch (err) {
    console.error(`[Backward] ✕ Error on batch (retry ${retryCount}):`, err.message);
    if (retryCount < 5) {
      await new Promise(r => setTimeout(r, 4000 * (retryCount + 1)));
      return translateBatch(batch, retryCount + 1);
    }
    return false;
  }
}

async function run() {
  while (reversedBatches.length > 0) {
    const batch = reversedBatches.shift();
    if (!batch) break;
    await translateBatch(batch);
    await new Promise(r => setTimeout(r, 4000));
  }
  console.log("[Backward] Finished all reversed batches!");
}

run().catch(err => {
  console.error("[Backward] Fatal:", err);
});
