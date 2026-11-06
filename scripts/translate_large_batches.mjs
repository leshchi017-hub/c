import fs from 'fs';
import { GoogleGenAI, Type } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is required");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

export function stripPunctuation(text) {
  if (!text) return "";
  return text
    // Replace all fullwidth & halfwidth punctuation with space
    .replace(/[，,。.\s*？！?!：:；;「」『』“”"''（）()、—–…~～#@*&^%$+=\/\\|<>｀`*·•]/g, ' ')
    // Normalize spaces
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanTaiwanNames(text) {
  if (!text) return "";
  let t = stripPunctuation(text);
  t = t
    .replace(/楠妲/g, 'Namtan')
    .replace(/糖糖/g, 'Namtan')
    .replace(/南潭/g, 'Namtan')
    .replace(/菲姆/g, 'Film')
    .replace(/費爾姆/g, 'Film')
    .replace(/皮由/g, "P'Yu")
    .replace(/宇哥/g, "P'Yu")
    .replace(/阿宇/g, "P'Yu")
    .replace(/小薇/g, 'View')
    .replace(/GMTV/gi, 'GMMTV')
    .replace(/JM\s*TV/gi, 'GMMTV')
    .replace(/CMM/gi, 'GMMTV')
    .replace(/\s+/g, ' ')
    .trim();
  return t;
}

const rawItems = JSON.parse(fs.readFileSync('scripts/raw_namtan_film.json', 'utf8'));
const cachePath = 'scripts/namtan_film_cache.json';

function getCache() {
  if (fs.existsSync(cachePath)) {
    try {
      return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    } catch {
      return {};
    }
  }
  return {};
}

function saveToCache(newItems) {
  const current = getCache();
  for (const item of newItems) {
    if (item && item.id !== undefined && item.tw !== undefined) {
      current[item.id] = cleanTaiwanNames(item.tw);
    }
  }
  fs.writeFileSync(cachePath, JSON.stringify(current, null, 2), 'utf8');
  return Object.keys(current).length;
}

const BATCH_SIZE = 50;

async function translateBatch(batch, retryCount = 0) {
  const payload = batch.map(item => ({
    id: item.id,
    text: item.original
  }));

  const prompt = `你是一位精通泰國影視綜藝文化與臺灣在地日常口語的專業字幕翻譯家。
這是泰國深度綜藝節目《Katanyu Tonight》（由幽默主持人 P'Yu 主持，節目亦在 True ID The Celebrity 播出），專訪超人氣泰國 GMMTV 女星兼大勢百合螢幕搭檔 Namtan 與 Film 的深度訪談！

【人物與專有名詞規範】：
- 主角人名絕對【保留英文原名】：Namtan 與 Film！不可翻譯為音譯中文字！
- 主持人保留英文名：P'Yu！
- 朋友同事保留英文名：View！
- 公司與節目名稱保留英文：GMMTV、True ID、The Celebrity、Katanyu Tonight、OTOP。
- 英國足球隊：曼聯（Manchester United）。
- 知名美劇：Breaking Bad。
- 大學：詩納卡寧威洛大學（SWU）。
- 職業：空服員（air hostess，臺灣用語）、演員、工科生。

【嚴格翻譯規則】：
1. 繁體中文臺灣在地語境：用詞自然生動，充滿臺灣在地對話口吻（如：粉絲見面會、殺青、耍彆扭、吃醋、哄她、撒嬌、假小子、工科生、空服員、完美主義、佛系、看淡、隨它去、玩手遊、陰陽互補、太搭了吧 等）。嚴禁用中國大陸用語！
2. 調整過短的斷句：泰語語音轉錄若有過短碎裂片段或語助詞重複，請順化為流暢通順的臺灣繁體中文句子。
3. 【最關鍵指令：不須加 標點符號】：
   - 翻譯後的繁體中文句子【絕對不可有任何標點符號】！
   - 無句號、逗號、問號、驚嘆號、冒號、分號、引號、括號等！
   - 停頓斷句一律使用半形空格隔開！
   - 現場聲音提示（如 [笑聲] [歡呼] [鼓掌] [音樂] [嘆氣]）可保留，但內容與外側絕不加標點符號！
4. 保持一一對應：回傳每筆資料的 id 與 tw 欄位，數量必須完全一致！

輸入資料：
${JSON.stringify(payload)}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              tw: { type: Type.STRING }
            },
            required: ["id", "tw"]
          }
        }
      }
    });

    const parsed = JSON.parse(response.text.trim());
    if (Array.isArray(parsed)) {
      const totalCached = saveToCache(parsed);
      console.log(`✓ Batch ${batch[0].id}..${batch[batch.length - 1].id} saved (${parsed.length}/${batch.length}). Total progress: ${totalCached}/${rawItems.length}`);
      return true;
    } else {
      throw new Error("Response is not array");
    }
  } catch (err) {
    console.error(`Error on batch ${batch[0].id}..${batch[batch.length - 1].id}: ${err.message}`);
    let waitMs = 6000;
    if (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED')) {
      console.log("Rate limit reached. Waiting 25 seconds before retry...");
      waitMs = 25000;
    }
    if (retryCount < 5) {
      console.log(`Retrying batch ${batch[0].id} (attempt ${retryCount + 1})...`);
      await new Promise(r => setTimeout(r, waitMs));
      return translateBatch(batch, retryCount + 1);
    }
    return false;
  }
}

async function main() {
  console.log("Checking missing cues...");
  let cache = getCache();
  console.log(`Currently cached: ${Object.keys(cache).length}/${rawItems.length}`);

  // Create batches of missing items
  const missingItems = rawItems.filter(item => !cache[item.id]);
  console.log(`Total missing items to translate: ${missingItems.length}`);

  if (missingItems.length === 0) {
    console.log("All items already cached! Nothing to translate.");
    return;
  }

  const batches = [];
  for (let i = 0; i < missingItems.length; i += BATCH_SIZE) {
    batches.push(missingItems.slice(i, i + BATCH_SIZE));
  }

  console.log(`Divided into ${batches.length} batches of size ${BATCH_SIZE}. Pacing at 6.0s per batch (10 RPM)...`);

  for (let i = 0; i < batches.length; i++) {
    const b = batches[i];
    await translateBatch(b);
    if (i < batches.length - 1) {
      await new Promise(r => setTimeout(r, 6000));
    }
  }

  cache = getCache();
  console.log(`\nDONE! Final cached count: ${Object.keys(cache).length}/${rawItems.length}`);
}

main().catch(console.error);
