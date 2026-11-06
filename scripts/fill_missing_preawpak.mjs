import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export function stripPunctuation(text) {
  if (!text) return "";
  return text
    .replace(/[，,。.\s*？！?!：:；;「」『』“”"''（）()、—–…~～#@*&^%$+=\/\\|<>[\]{}｀`*·•]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanTaiwanNames(text) {
  if (!text) return "";
  let t = stripPunctuation(text);
  t = t
    .replace(/\bLeena\b/gi, 'Lena')
    .replace(/\bLina\b/gi, 'Lena')
    .replace(/\bAlina\b/gi, 'Lena')
    .replace(/\bRina\b/gi, 'Lena')
    .replace(/\bMew\b/gi, 'Miu')
    .replace(/\bMiew\b/gi, 'Miu')
    .replace(/\bGina\s*Mew\b/gi, 'Lena Miu')
    .replace(/\bNina\s*Mew\b/gi, 'Lena Miu')
    .replace(/\bNina\b/gi, 'Lena')
    .replace(/莉娜/g, 'Lena')
    .replace(/米尤/g, 'Miu')
    .replace(/苗苗/g, 'Miu')
    .replace(/米歐/g, 'Miu')
    .replace(/米繆/g, 'Miu')
    .replace(/妮娜/g, 'Lena')
    .replace(/\bP'Peem\b/gi, "Pheem")
    .replace(/\bKhun\s*Phim\b/gi, "Pheem")
    .replace(/\bPhim\b/gi, "Pheem")
    .replace(/\bPym\b/gi, "Pheem")
    .replace(/\bPim\b/gi, "Pheem")
    .replace(/\bPeem\b/gi, "Pheem")
    .replace(/\bParn\b/gi, "Paan")
    .replace(/\bPan\b/gi, "Paan")
    .replace(/\bPa\b/gi, "Paan")
    .replace(/\bLingOrm\b/gi, "Lena Miu")
    .replace(/\bLing\b/gi, "Lena")
    .replace(/\bOrm\b/gi, "Miu")
    .replace(/\s+/g, ' ')
    .trim();
  return t;
}

export function parseSrt(filePath) {
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
const allSubtitles = parseSrt(inputSrtPath);
const subMap = new Map(allSubtitles.map(s => [s.id, s]));
const cachePath = 'scripts/preawpak_ep43_cache.json';
let cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

// First inject fixed items 206..210
cache[206] = "倒數九秒";
cache[207] = "倒數八秒";
cache[208] = "八秒 七秒";
cache[209] = "倒數七秒";
cache[210] = "這是什麼 先把這個拿去 快點";
fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');

async function translateChunk(items) {
  const payload = items.map(it => ({ id: it.id, text: it.original }));
  const prompt = `你是一位精通泰國影視綜藝文化與臺灣在地日常口語的專業字幕翻譯家。
這是泰國3台知名綜藝《Preawpak》（主持人 Joy 與 On）專訪女星 Lena 與 Miu（LenaMiu，主演GL劇集飾演 Pheem 與 Paan）未刪減專訪（Ep 43）英文字幕片段。

【最高準則】：
1. 訪談主角名字嚴格保留為「Lena」與「Miu」（絕不可翻成中文音譯）！
2. 人名保留不動不翻譯：Lena, Miu, Joy, On, Pheem, Paan 等！
3. 繁體中文須為臺灣在地日常語境，自然生動！
4. 調整過短的斷句：絕不可翻譯成單個漢字或破碎單詞，請結合上下文擴充/順化成語意通順的臺灣口語短句！
5. 不須加標點符號：完全禁止任何標點符號（無逗號句號問號驚嘆號引號等），停頓一律用半形空格！
6. 回傳標準 JSON 陣列，每個項目包含 "id" (數字) 與 "tw" (繁體中文翻譯字串)，精確對應輸入！

輸入資料（JSON）：
${JSON.stringify(payload, null, 2)}
`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });

  let raw = response.text ? response.text.trim() : "";
  if (raw.startsWith('```')) {
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  const parsed = JSON.parse(raw);
  for (const item of parsed) {
    if (item && item.id !== undefined && item.tw !== undefined) {
      cache[item.id] = cleanTaiwanNames(item.tw);
    }
  }
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
}

async function run() {
  while (true) {
    const missing = [];
    for (let i = 1; i <= 1189; i++) {
      if (!cache[i]) missing.push(i);
    }
    console.log(`Current missing count: ${missing.length}`);
    if (missing.length === 0) {
      console.log("All 1189 items are completely translated!");
      break;
    }

    const chunkIds = missing.slice(0, 25);
    const chunkItems = chunkIds.map(id => subMap.get(id)).filter(Boolean);
    console.log(`Translating chunk of ${chunkItems.length} items (IDs: ${chunkIds[0]}..${chunkIds[chunkIds.length - 1]})...`);
    try {
      await translateChunk(chunkItems);
      console.log(`✓ Cached now: ${Object.keys(cache).length}/1189`);
    } catch (e) {
      console.error("✕ Error:", e.message);
      await new Promise(r => setTimeout(r, 4000));
    }
    await new Promise(r => setTimeout(r, 1000));
  }
}

run().catch(console.error);
