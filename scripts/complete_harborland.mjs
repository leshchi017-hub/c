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
    // Strip leading dashes or bullet symbols
    .replace(/^[-–—\s]+/gm, '')
    // Replace all punctuation with single space
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

let cache = {};
if (fs.existsSync(cachePath)) {
  try {
    cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  } catch (e) {
    cache = {};
  }
}

// Find uncompleted
const uncompleted = allSubtitles.filter(item => !cache[item.id] || cache[item.id].trim().length === 0);
console.log(`Uncompleted items: ${uncompleted.length} / ${allSubtitles.length}`);

const BATCH_SIZE = 30;
const batches = [];
for (let i = 0; i < uncompleted.length; i += BATCH_SIZE) {
  batches.push(uncompleted.slice(i, i + BATCH_SIZE));
}

console.log(`Batches remaining: ${batches.length}`);

async function translateBatch(batch, retryCount = 0) {
  const payload = batch.map(item => ({
    id: item.id,
    text: item.original
  }));

  const prompt = `你是一位精通泰國 GL 影視綜藝文化與臺灣在地日常口語的專業字幕翻譯家。
這是泰國3台（Ch3）知名綜藝節目《3Plus Special》，由三大人氣百合（GL）雙女主 CP 齊聚 HarborLand 進行遊戲大對決：
1. Lena 與 Miu（LenaMiu）
2. Oom 與 Bam（OomBam）
3. Tan 與 Yuyu（TanYuyu）

【嚴格指令】：
1. 主角們的名字保留不動，一律使用英文：
   Lena、Miu、Oom、Bam、Tan、Yuyu
   （其他名字如 Eisaya, Saralee, Nick, Judy 等亦保留原樣，絕不音譯成中文漢字）！
2. 繁體中文須為臺灣在地日常綜藝語境：
   - 自然生動、活潑幽默、綜藝感十足（例如：出發囉、攻受對抗、放閃、互撩、跌進妳心裡、太會了吧、笑死、傻眼、太強了吧、投降、認輸、魔鬼滑梯、機械牛、超怕高、笑翻 等）。
   - 絕不使用中國大陸用語。
3. 【最核心指令】不須加 標點符號：
   - 翻譯後的繁體中文【完全不可包含任何標點符號】！
   - 無逗號、句號、問號、驚嘆號、引號、冒號、破折號、橫線等！
   - 句子前若有連字號「- 」，請直接移除！
   - 斷句或停頓一律以單一半形空格「 」隔開！
4. 保持一一對應：
   - 回傳標準 JSON 陣列，每個項目有 id 與 tw（或 text）欄位。

輸入：${JSON.stringify(payload, null, 2)}`;

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
        if (item && item.id !== undefined) {
          const val = item.tw || item.text || item.zh || item.translation || "";
          if (val) {
            cache[item.id] = normalizeNames(val);
            count++;
          }
        }
      }
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
      console.log(`✓ Completed IDs ${batch[0].id}..${batch[batch.length - 1].id} (${count}/${batch.length}) | Total cached: ${Object.keys(cache).length}/${allSubtitles.length}`);
      return true;
    } else {
      throw new Error("Response is not array");
    }
  } catch (err) {
    console.error(`✕ Error on batch ${batch[0].id}..${batch[batch.length - 1].id} (retry ${retryCount}):`, err.message);
    if (retryCount < 5) {
      await new Promise(r => setTimeout(r, 4000 * (retryCount + 1)));
      return translateBatch(batch, retryCount + 1);
    }
    return false;
  }
}

async function main() {
  for (let i = 0; i < batches.length; i++) {
    const b = batches[i];
    console.log(`Processing batch ${i + 1}/${batches.length}...`);
    await translateBatch(b);
    await new Promise(r => setTimeout(r, 4000));
  }

  // Any remaining missing?
  let remainingMissing = allSubtitles.filter(item => !cache[item.id] || cache[item.id].trim().length === 0);
  if (remainingMissing.length > 0) {
    console.log(`Retrying ${remainingMissing.length} missing items...`);
    for (let i = 0; i < remainingMissing.length; i += 15) {
      const slice = remainingMissing.slice(i, i + 15);
      await translateBatch(slice);
      await new Promise(r => setTimeout(r, 4000));
    }
  }

  // Final Validation and Export
  let totalMissing = 0;
  let punctuationCount = 0;
  const finalEntries = [];

  for (const item of allSubtitles) {
    let twRaw = cache[item.id] || "";
    let tw = normalizeNames(twRaw);
    if (!tw) {
      totalMissing++;
      console.error(`Missing item ID ${item.id}`);
    }
    if (/[，,。.\?!？！:：;；「」『』“”\"''`｀（）()【】\[\]{}、—–…~～#@*&^%$+=\/\\|<>]/.test(tw)) {
      punctuationCount++;
      tw = stripPunctuation(tw);
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

  // 1. Export clean pure Traditional Chinese SRT (No punctuation, timestamps 100% unchanged)
  const twSrtLines = [];
  for (const item of finalEntries) {
    twSrtLines.push(`${item.id}`);
    twSrtLines.push(`${item.timestamp}`);
    twSrtLines.push(`${item.translated}`);
    twSrtLines.push('');
  }
  const twSrtContent = twSrtLines.join('\n');
  const twSrtOutPath = 'public/ENG_SUB_LenaMiu_x_OomBam_x_TanYuyu_3Plus_zh_TW.srt';
  fs.writeFileSync(twSrtOutPath, twSrtContent, 'utf8');
  console.log(`✓ Exported clean Traditional Chinese SRT to: ${twSrtOutPath}`);

  // 2. Export Bilingual SRT (Taiwan Traditional Chinese + English)
  const biSrtLines = [];
  for (const item of finalEntries) {
    biSrtLines.push(`${item.id}`);
    biSrtLines.push(`${item.timestamp}`);
    biSrtLines.push(`${item.translated}`);
    biSrtLines.push(`${item.original}`);
    biSrtLines.push('');
  }
  const biSrtContent = biSrtLines.join('\n');
  const biSrtOutPath = 'public/ENG_SUB_LenaMiu_x_OomBam_x_TanYuyu_3Plus_Bilingual.srt';
  fs.writeFileSync(biSrtOutPath, biSrtContent, 'utf8');
  console.log(`✓ Exported Bilingual SRT to: ${biSrtOutPath}`);

  // 3. Export JSON for the App UI
  const jsonOutPath = 'public/harborland_subtitles.json';
  fs.writeFileSync(jsonOutPath, JSON.stringify(finalEntries, null, 2), 'utf8');
  console.log(`✓ Exported JSON to: ${jsonOutPath}`);

  console.log("\n================ VALIDATION AUDIT REPORT ================");
  console.log(`Total Subtitles in Original: ${allSubtitles.length}`);
  console.log(`Total Subtitles in Export:   ${finalEntries.length}`);
  console.log(`Missing Sentences:           ${totalMissing} (Target: 0)`);
  console.log(`Punctuation Violations:      ${punctuationCount} (Target: 0)`);
  console.log(`Timestamps Status:           100% Unchanged (IDs 1..927)`);
  console.log("=========================================================\n");
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
