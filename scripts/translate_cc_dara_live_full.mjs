import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

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
    .replace(/[，,。.\s*？！?!：:；;「」『』“”"''（）()、—–…~～#@*&^%$+=\/\\|<>[\]{}｀`]/g, ' ')
    // Normalize spaces
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
    .replace(/莉娜/g, 'Lena')
    .replace(/米尤/g, 'Miu')
    .replace(/苗苗/g, 'Miu')
    .replace(/米繆/g, 'Miu')
    .replace(/米歐/g, 'Miu')
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

const inputSrtPath = 'public/assets/aistudio/CC_LenaMiu_x_DARA_LIVE_2026_10_20_a95d97e6.srt';
const allSubtitles = parseSrt(inputSrtPath);
console.log(`Parsed ${allSubtitles.length} subtitles from ${inputSrtPath}`);

const cachePath = 'scripts/cc_dara_live_2026_10_20_cache.json';
let cache = {};
if (fs.existsSync(cachePath)) {
  try {
    cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    console.log(`Loaded ${Object.keys(cache).length} cached translations`);
  } catch (e) {
    cache = {};
  }
}

const BATCH_SIZE = 25;
const batches = [];
for (let i = 0; i < allSubtitles.length; i += BATCH_SIZE) {
  const batch = allSubtitles.slice(i, i + BATCH_SIZE);
  // Only include batch if any item is missing in cache
  const needsTrans = batch.some(item => !cache[item.id]);
  if (needsTrans) {
    batches.push(batch);
  }
}

console.log(`Total batches needing translation: ${batches.length} (out of ${Math.ceil(allSubtitles.length / BATCH_SIZE)})`);

async function translateBatch(batch, retryCount = 0) {
  const payload = batch.map(b => ({
    id: b.id,
    thai: b.original
  }));

  const prompt = `你是泰語繁體中文頂級影視字幕翻譯專家。現在要翻譯泰國三台 CH3 DARA LIVE（2026年10月20日）專訪泰國超人氣百合 GL 影集《Please Love the Series》（โปรดรัก; 請愛我吧 / 愛我可以嗎）兩位女主角的官方 CC 字母。

【背景人設資訊】：
- 主角為兩位超美女孩：Lena（飾演 Pheem，傲嬌冰山霸總）與 Miu（飾演 Paan，溫柔小助理）。
- 主持人是 P'Film（三台超搞笑瘋癲、愛演愛自嘲的主持人），現場還有工作人員 P'Joy、P'Toey，身後或探班高層為 Khun Dew（Dew 姐）。
- 節目話題亮點：
  * EP 6 超慾浪漫床戲、白色蕾絲邊透膚小內褲（กางเกงในสีขาวลูกไม้）、用鼻樑親密滑蹭脖子與臉頰、咬耳朵。
  * 激情過後隔天早上的傲嬌名場面：Pheem 醒來發現 Paan 去買菜，竟然嘴硬轉帳說「我轉錢給你當出場費 不想讓人家說閒話」。
  * 粉絲送飲料應援：烏龍茶加蘆薈（無糖0%、微糖25%，有人喝全糖110%像在吸糖水喝到得糖尿病）。
  * 星期天粉絲會玩 Pocky 巧克力棒接吻遊戲（咬到只剩一點點）。
  * 粉絲創作同人小說《PatTing》（Pat 是酷帥直女學姐 x Ting 是可愛小學妹）。
  * 10月30日大結局千人觀影會全數售罄、萬聖節變裝造型、維多利亞的秘密天使走秀 Pose。
  * 片尾播放主題曲《愛我可以嗎》（รักได้ไหม）。

【極其嚴格的翻譯守則】：
1. 繁體中文臺灣在地語境：
   - 語氣生動自然、充滿臺灣綜藝訪談節奏與浪漫曖昧甜度（如：傲嬌、放閃、親脖子、透膚蕾絲內褲、出場費、口嫌體正直、笑死、傻眼、甜翻、全糖、微糖、烏龍茶加蘆薈、大帥妹、好甜、太閃了 等）。
   - 絕對禁止中國大陸用語（不用「視頻/立馬/給力/小姐姐/閨蜜」，改用「影片/馬上/超強/女生/好姐妹」等臺灣慣用詞）。
2. 人名與角色名絕對不翻譯：
   - 訪談主角名字一律保留英文「Lena」與「Miu」！
   - 劇中角色名保持英文：「Pheem」與「Paan」。
   - 主持人與同事名字保持英文：「P'Film」、「P'Joy」、「P'Dew」、「Dew」、「Film」、「Joy」、「Toey」、「P'Toey」、「Aom」、「Kru Aom」、「Thanwa」、「Pat」、「Ting」等。
   - 絕不可翻成「莉娜/米尤/苗苗」等音譯！
3. 【最核心要求】調整過短的斷句，且絕對不加任何標點符號：
   - 泰語 CC 常將一句話切成兩三個很短的詞（例如單字「ใช่」、「ครับ」），請根據前後文通順自然地譯成臺灣繁體中文。
   - 【絕對不可有任何標點符號】：禁止句號「。」、逗號「，」、問號「？」、驚嘆號「！」、冒號「：」、分號「；」、引號「「」『』“”""''」、破折號、波浪號、括號等！
   - 分句或停頓請一律使用半形空格「 」隔開！
   - 若原文僅為符號、雜音（如「ั」），tw 可為半形空格「 」。
4. 格式要求：
   - 必須回傳標準 JSON 陣列，每個項目包含 "id" (數字) 與 "tw" (字串)。
   - 回傳陣列項目數量必須與輸入完全一致，id 必須一一對應！

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
          cache[item.id] = normalizeNames(item.tw);
          count++;
        }
      }
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
      console.log(`✓ Completed IDs ${batch[0].id}..${batch[batch.length - 1].id} (${count}/${batch.length}) | Total Progress: ${Object.keys(cache).length}/${allSubtitles.length}`);
      return true;
    } else {
      throw new Error("Response is not an array");
    }
  } catch (err) {
    console.error(`Error on IDs ${batch[0].id}..${batch[batch.length - 1].id} (attempt ${retryCount + 1}):`, err.message || err);
    if (retryCount < 4) {
      const delay = 2000 * Math.pow(1.5, retryCount);
      await new Promise(r => setTimeout(r, delay));
      return translateBatch(batch, retryCount + 1);
    }
    return false;
  }
}

async function runWorker(queue) {
  while (queue.length > 0) {
    const batch = queue.shift();
    if (!batch) break;
    await translateBatch(batch);
    // brief pause between requests
    await new Promise(r => setTimeout(r, 400));
  }
}

async function main() {
  const CONCURRENCY = 4;
  const queue = [...batches];
  console.log(`Starting translation with ${CONCURRENCY} concurrent workers...`);
  
  const workers = Array.from({ length: CONCURRENCY }, () => runWorker(queue));
  await Promise.all(workers);
  
  console.log(`Translation pass complete. Total cached: ${Object.keys(cache).length}/${allSubtitles.length}`);
}

main().catch(console.error);
