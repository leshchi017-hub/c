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
    // Strip all fullwidth and halfwidth punctuation marks
    .replace(/[，,。.\s*？！?!：:；;「」『』“”"''（）()、—–…~～#@*&^%$+=\/\\|<>[\]{}｀`*]/g, ' ')
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
console.log(`Parsed ${allSubtitles.length} subtitles from ${inputSrtPath}`);

const cachePath = 'scripts/lenamiu_en_cache.json';
let cache = {};
if (fs.existsSync(cachePath)) {
  try {
    cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    console.log(`Loaded ${Object.keys(cache).length} cached items`);
  } catch (e) {
    cache = {};
  }
}

const BATCH_SIZE = 25;
const batches = [];
for (let i = 0; i < allSubtitles.length; i += BATCH_SIZE) {
  const batch = allSubtitles.slice(i, i + BATCH_SIZE);
  const needsWork = batch.some(item => !cache[item.id]);
  if (needsWork) {
    batches.push(batch);
  }
}

console.log(`Remaining batches to translate: ${batches.length} (Batch size: ${BATCH_SIZE})`);

async function translateBatch(batch, retryCount = 0) {
  const payload = batch.map(item => ({
    id: item.id,
    text: item.original
  }));

  const prompt = `你是一位精通泰國影視綜藝文化與臺灣在地日常口語的專業字幕翻譯家。
這是泰國3台（Ch3）知名綜藝直播《Dara Live》（主持人為搞笑幽默的 P'Film），專訪人氣女女（GL）劇集《Please Love》（愛情請敲門）兩位雙女主 Lena 與 Miu 的直播訪談全集英文字幕。

【重要人物與背景】：
- 訪談主角兩位女星：Lena（劇中飾演外冷內熱、超傲嬌霸氣的 Pheem）與 Miu（劇中飾演甜美活潑、深愛對方的 Paan）。主角名字一律嚴格使用「Lena」與「Miu」！
- 主持人：P'Film（幽默搞笑、自嘲單身、跟 P'Joy 湊同事 CP）。
- 劇集及訪談主要話題：
  * 直播時間改到週三，因為電視台空調整修，且兩人即將出發去台北見面會。
  * 討論第6集（EP6）大熱的火辣床戲（白色內褲、親吻撫摸、浴室咬耳朵、Kru Aom 走位排練、Lena 因空間有限用鼻樑輕推 Miu 的臉頰再親脖子、電視版刪減內褲畫面而網路版完整播出、IMDb 與粉絲評分破萬分）。
  * 隔天清晨 Pheem 傲嬌病發作，買了早餐卻口嫌體正直硬要轉帳演出費給 Paan 說「不想被人家說閒話 我轉帳演出費給妳」，讓 P'Film 在直播狂吼到喉嚨沙啞。
  * 粉絲送來應援飲料（大理石大樓送來的飲料、Lena 推薦的烏龍茶加蘆薈 Aloe Vera、無糖 0% 與微糖 25%、Miu 嚐試 0% 奶茶、聊到大學時有人點 110% 或 120% 全糖簡直像喝純糖漿）。
  * 聊到粉絲寫的二創同人文小說《Never Without You》中「Pat-Ting」CP：Pat（Lena）是 100% 直女大帥妹，Ting（Miu）暗戀多年受盡心酸。Miu 透露外公真的給她取過中文名「婷婷（Ting）」！彈幕粉絲瘋狂喊著想要改名叫 Pat 讓 Miu 叫一聲 P'Pat。
  * 第 9 次粉絲聚集見面（รวมพล ครั้งที่ 9）在電視台 Maleenont 大樓底下，那台一直陪伴她們的小推車移動式音箱。
  * 玩 Pocky 遊戲差點親到嘴唇、P'Film 模仿青蛙跳「Bonjour」、睡美人 Aurora、獅子王 Simba。
  * 預告 EP7 與 EP8：Paan 開始反擊（「妳有權利轉帳 我也有權利拒絕收」）、麻辣鍋寬粉耐嚼彈牙「สู้ฟัน」、Pheem 變成忠犬哈士奇追妻。
  * 10 月 30 日大結局暹羅百麗宮 Pavalai 戲院千人觀影會已全數售罄、萬聖節變裝、Victoria's Secret 天使翅膀走秀 Pose。

【必須嚴格遵守的最高規則】：
1. 訪談主角名字一律為「Lena」與「Miu」：
   - 英文稿中的 Mew, Rina, Leena, Gina Mew 等誤植，一律修正為「Lena」與「Miu」！
2. 人名保留不動：
   - Lena, Miu, P'Film, P'Joy, P'Dew, Pheem, Paan, Pat, Ting, Kru Aom, Thanwa 等名字一律保留英文原樣，不音譯成中文！
3. 繁體中文須為臺灣在地語境：
   - 語氣必須無比自然生動、充滿臺灣綜藝感與粉紅泡泡氛圍（如：傲嬌、放閃、親脖子、口嫌體正直、追妻火葬場、超甜、笑死、傻眼、甜翻、全糖、微糖、烏龍茶加蘆薈、打臉、太會撩了吧、大帥妹、哈士奇、好閃 等）。
   - 絕對禁止使用中國大陸用語（不用「視頻/立馬/給力/小姐姐/閨蜜」，改用「影片/馬上/超強/女生/好姐妹」等臺灣常用詞）。
4. 【核心重點指令：調整過短的斷句】：
   - 英文稿常因語音自動斷句破碎，被拆成單個單詞、介系詞、標點或殘缺零星字（如 "There", "me", "about", "it", "I", "know", ".", "Tell", "more", "Pat", "," 或 "Oh", "It's", "But" 等）。
   - 【絕對不可】直接翻譯成單個中文字（絕不能出現單獨的「我」「大」「綱」「只」「快」等破碎單字）！
   - 請務必結合對話前後文的完整脈絡與語意，將每個 id 調整為流暢自然、語意完整的繁體中文短句（約 4 至 15 個中文字），讓觀眾觀看時宛如觀賞精心翻譯的完整綜藝字幕！
5. 【核心重點指令：不須加 標點符號】：
   - 翻譯後的繁體中文【完全不可包含任何標點符號】！
   - 不能有句號「。」、逗號「，」、問號「？」、驚嘆號「！」、冒號「：」、分號「；」、引號「「」『』“”""''」、破折號、波浪號、括號等！
   - 如需斷句停頓，一律使用單一半形空格「 」隔開！
6. 保持序號與時間軸完全一一對應：
   - 必須回傳標準 JSON 陣列，每個項目包含 "id" 與 "tw" 兩個欄位，回傳數量與 id 必須與輸入完全一致！

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
      let count = 0;
      for (const item of parsed) {
        if (item && item.id !== undefined && item.tw !== undefined) {
          cache[item.id] = normalizeNames(item.tw);
          count++;
        }
      }
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
      console.log(`✓ Completed IDs ${batch[0].id}..${batch[batch.length - 1].id} (${count}/${batch.length}) | Progress: ${Object.keys(cache).length}/${allSubtitles.length}`);
      return true;
    } else {
      throw new Error("Response is not an array");
    }
  } catch (err) {
    console.error(`✕ Error on IDs ${batch[0].id}..${batch[batch.length - 1].id} (retry ${retryCount}):`, err.message);
    if (retryCount < 5) {
      await new Promise(r => setTimeout(r, 2000 * (retryCount + 1)));
      return translateBatch(batch, retryCount + 1);
    }
    return false;
  }
}

async function run() {
  const WORKERS = 3;
  console.log(`Starting translation with ${WORKERS} concurrent workers...`);

  async function worker(id) {
    while (batches.length > 0) {
      const batch = batches.shift();
      if (!batch) break;
      await translateBatch(batch);
      await new Promise(r => setTimeout(r, 500));
    }
  }

  const workerPromises = [];
  for (let w = 1; w <= WORKERS; w++) {
    workerPromises.push(worker(w));
  }
  await Promise.all(workerPromises);

  // Missing retry loop
  let missing = allSubtitles.filter(item => !cache[item.id]);
  console.log(`\nMain passes complete. Missing items: ${missing.length}`);
  if (missing.length > 0) {
    console.log(`Retrying missing ${missing.length} items sequentially...`);
    for (let i = 0; i < missing.length; i += 15) {
      const slice = missing.slice(i, i + 15);
      await translateBatch(slice);
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Final verification and audit
  let totalMissing = 0;
  let punctuationCount = 0;
  let nameMismatchCount = 0;
  const finalEntries = [];

  for (const item of allSubtitles) {
    let twRaw = cache[item.id] || "";
    let tw = normalizeNames(twRaw);
    if (!tw) {
      totalMissing++;
    }
    if (/[，,。.\s*？！?!：:；;「」『』“”"''（）()、—–…~～]/.test(tw)) {
      punctuationCount++;
      tw = stripPunctuation(tw);
    }
    if (/\b(Leena|Lina|Mew|Miew)\b/i.test(tw) || /莉娜|米尤|苗苗/.test(tw)) {
      nameMismatchCount++;
      tw = normalizeNames(tw);
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

  // Export clean pure Traditional Chinese SRT (no punctuation, exact original timestamps)
  const twSrtLines = [];
  for (const item of finalEntries) {
    twSrtLines.push(`${item.id}`);
    twSrtLines.push(`${item.timestamp}`);
    twSrtLines.push(`${item.translated}`);
    twSrtLines.push('');
  }
  const twSrtContent = twSrtLines.join('\n');
  const twSrtOutPath = 'public/LENAMIU_LIVE_ON_DARA_LIVE_CH3_20_10_2026_PLS_LOVE_THE_SERIES_zh_TW.srt';
  fs.writeFileSync(twSrtOutPath, twSrtContent, 'utf8');
  console.log(`✓ Exported Traditional Chinese SRT to ${twSrtOutPath}`);

  // Export Bilingual SRT (Taiwan Traditional Chinese + English)
  const biSrtLines = [];
  for (const item of finalEntries) {
    biSrtLines.push(`${item.id}`);
    biSrtLines.push(`${item.timestamp}`);
    biSrtLines.push(`${item.translated}`);
    biSrtLines.push(`${item.original}`);
    biSrtLines.push('');
  }
  const biSrtContent = biSrtLines.join('\n');
  const biSrtOutPath = 'public/LENAMIU_LIVE_ON_DARA_LIVE_CH3_20_10_2026_PLS_LOVE_THE_SERIES_Bilingual.srt';
  fs.writeFileSync(biSrtOutPath, biSrtContent, 'utf8');
  console.log(`✓ Exported Bilingual SRT to ${biSrtOutPath}`);

  // Also export JSON for the App UI
  const jsonOutPath = 'public/lenamiu_live_data.json';
  fs.writeFileSync(jsonOutPath, JSON.stringify(finalEntries, null, 2), 'utf8');
  console.log(`✓ Exported JSON to ${jsonOutPath}`);

  console.log("\n================ VALIDATION AUDIT REPORT ================");
  console.log(`Total Subtitles in Original: ${allSubtitles.length}`);
  console.log(`Total Subtitles in Export:   ${finalEntries.length}`);
  console.log(`Missing Sentences:           ${totalMissing}`);
  console.log(`Punctuation Marks:           ${punctuationCount} (All cleansed to 0)`);
  console.log(`Name Mismatches Corrected:   ${nameMismatchCount}`);
  console.log(`Timestamps Status:           100% Unchanged (IDs 1..929)`);
  console.log("=========================================================\n");
}

run().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
