import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
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
const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

const missingItems = allSubtitles.filter(it => !cache[it.id]);
console.log(`Missing items count: ${missingItems.length}`);

async function translateBatch(slice) {
  const prompt = `你是一位精通泰國影視綜藝文化與臺灣在地日常口語的專業字幕翻譯家。
這是泰國3台（Ch3）知名綜藝直播《Dara Live》（主持人為 P'Film），專訪人氣 GL 劇集《Please Love》（愛情請敲門）兩位雙女主 Lena 與 Miu 的直播訪談段落。

【嚴格規則】：
1. 訪談主角名字一律為「Lena」與「Miu」。
2. 人名保留不動：Lena, Miu, P'Film, P'Joy, P'Dew, Pheem, Paan, Pat, Ting。
3. 繁體中文須為臺灣在地語境：自然生動口語、綜藝感滿滿。
4. 調整過短斷句：嚴禁輸出「我」「只」「快」等破碎單字，務必結合語境擴展為完整有意義的口語短句。
5. 不須加標點符號：嚴禁任何標點符號，以半形空格分隔停頓。
6. 回傳 JSON 陣列 [{"id": ..., "tw": "..."}]。

輸入：${JSON.stringify(slice.map(s => ({ id: s.id, text: s.original })), null, 2)}`;

  const res = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });

  const parsed = JSON.parse(res.text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim());
  for (const item of parsed) {
    if (item && item.id && item.tw) {
      cache[item.id] = normalizeNames(item.tw);
    }
  }
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
  console.log(`Saved ${parsed.length} items`);
}

async function main() {
  for (let i = 0; i < missingItems.length; i += 20) {
    const chunk = missingItems.slice(i, i + 20);
    console.log(`Processing IDs ${chunk[0].id}..${chunk[chunk.length - 1].id}...`);
    await translateBatch(chunk);
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log("All missing translated!");
}

main();
