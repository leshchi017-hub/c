import fs from 'fs';
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
    // Replace all punctuation marks (fullwidth & halfwidth) with space
    .replace(/[，,。.\s*？！?!：:；;「」『』“”"''（）()、—–…~～#@*&^%$+=\/\\|<>[\]{}｀`*·•]/g, ' ')
    // Normalize spaces
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanTaiwanNames(text) {
  if (!text) return "";
  let t = stripPunctuation(text);
  // Ensure names are strictly preserved
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
    .replace(/米歐/g, 'Miu')
    .replace(/米繆/g, 'Miu')
    .replace(/妮娜/g, 'Lena')
    .replace(/喵喵/g, 'Miu')
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
    .replace(/\s+/g, ' ')
    .trim();
  return t;
}

const rawItems = JSON.parse(fs.readFileSync('scripts/raw_cc_lenamiu.json', 'utf8'));
console.log(`Loaded ${rawItems.length} raw cues from scripts/raw_cc_lenamiu.json`);

const cachePath = 'scripts/cc_lenamiu_cache.json';
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
for (let i = 0; i < rawItems.length; i += BATCH_SIZE) {
  const batch = rawItems.slice(i, i + BATCH_SIZE);
  const needsWork = batch.some(item => !cache[item.id]);
  if (needsWork) {
    batches.push(batch);
  }
}

console.log(`Remaining batches to translate: ${batches.length} (Batch size: ${BATCH_SIZE})`);

async function translateBatch(batch, retryCount = 0) {
  const payload = batch.map(item => ({
    id: item.id,
    thai: item.thai
  }));

  const prompt = `你是一位精通泰國影視綜藝文化與臺灣在地日常口語的資深專業字幕翻譯家。
這是泰國超人氣女女（GL）劇集《Please Love รักได้ไหม》雙主角 Lena 與 Miu（LenaMiu）在 3Plus 官方默契大考驗趣味專訪的泰語字幕。

【主角與角色資訊】：
1. 訪談主角兩位女星：Lena 與 Miu。
   - 主角名字一律嚴格保留英文原名「Lena」與「Miu」！
   - 【絕對禁止】翻譯為莉娜、米尤、喵喵、苗苗、妮娜等中文字！
2. 劇集角色：Lena 飾演 Pheem，Miu 飾演 Paan。保留英文原名 Pheem 與 Paan。
3. 訪談情境：兩人互猜對方喜好、習慣與秘密，包括：
   - 替對方點餐：Miu 吃蛋炒飯一定要額外加醬油
   - Miu 不吃的食物：白色食物（椰汁雞湯）、太辣、味道太重的食物（臭豆、醃魚露）、海鮮、鳥禽類肉、大塊厚切牛排
   - Lena 愛吃的食物：夏威夷拌飯 Poke bowl、鮪魚沙拉、酸種麵包、健康餐，但工作時不吃海苔因為怕黏牙齒
   - Miu 最害怕的事：世界上有一百種事大概怕九十種，專怕各種奇怪小蟲子，但面對生活難關反而很勇敢
   - Lena 最害怕的事：早起晨間活動（跑馬拉松），兩人作息活在不同時區（Lena 喜歡夜間打網球）
   - Miu 必帶隨身物：超多支同色系口紅、酒精噴霧、面紙、車上的化妝包
   - Lena 必帶隨身物：咖啡因或奶茶、酒精噴霧、口紅、手機
   - Miu 喜歡的花：深粉紅玫瑰（Deep Pink Rose）
   - Lena 喜歡的花：對外常說百合花顯得國際化，但內心真正最喜歡老家種的雞蛋花（雞蛋花香氣濃郁復古）、茉莉花、水黃皮花
   - 最容易讓 Miu 開心的事情：好吃的甜點美食、Lena 在身邊喝到咖啡因、自然醒不用被鬧鐘叫醒
   - 最常說的口頭禪：Oh My God、瘋了吧 / 太扯了、哎唷瘋了
   - 覺得 Miu 最有魅力的三點：活力氣場超有吸引力、嘟嘟鴨子嘴自然唇形（「可能因為我們常常接吻所以很清楚」）、東方韻味大圓雙眼皮
   - 覺得 Lena 最有魅力的三點：思維成熟善良有同理心、眼神超殺的致命電眼、身材纖瘦卻玲瓏有致的曲線
   - 最常忘記的事：Lena 幾乎不忘記東西，唯一會忘記的是手機充電；Miu 很健忘
   - 害羞時常做的小動作：Miu 會移開視線逃走；Lena 會摸眉毛摸鼻子、手插口袋、撥頭髮
   - 宣傳新劇《Please Love รักได้ไหม》每週五 20:30 第33台與 3 Plus 線上播出

【必須嚴格遵守的翻譯規範】：
1. 人名嚴格保留不動 不須翻譯：一律使用「Lena」與「Miu」，不可翻譯成中文！
2. 繁體中文須為臺灣的在地日常語境：
   - 用詞必須無比自然流暢，完全符合臺灣年輕人口吻（例如：醬油、蛋炒飯、夏威夷拌飯、酸種麵包、超殺、身材線條、拍屁股、臭豆、醃魚露、行動電源、化妝包、酒精噴霧、自然醒、笑瘋、太扯了 等）！
   - 嚴禁使用中國大陸慣用語！
3. 【核心指令：調整過短的斷句】：
   - 原始泰語語音轉錄經常有被切碎的過短斷句或語音重複（如單詞重複、口吃重複、破碎詞）。
   - 請根據上下句對話脈絡，將過短的斷句順化為完整、通順自然且語意完整的臺灣繁體中文句子，讓字幕連續易讀！
4. 【核心指令：不須加 標點符號】：
   - 翻譯後的繁體中文【完全不可包含任何標點符號】！
   - 絕不可出現任何逗號「，,」、句號「。..」、問號「？?」、驚嘆號「！!」、冒號「：:」、引號「「」『』“”""''」、破折號「——-」、波浪號「～~」、括號等！
   - 若句子中間需要斷句停頓，一律使用單一半形空格「 」隔開！
5. 保持序號與數量嚴格一一對應：
   - 必須回傳標準 JSON 陣列，每個項目包含 "id" (數字) 與 "tw" (繁體中文翻譯字串)！
   - 輸入幾筆，就必須回傳精確相同數量的項目，id 不可遺漏或跳號！

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

    const responseText = response.text || '';
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (e) {
      const match = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error(`Failed to parse JSON: ${responseText.slice(0, 200)}`);
      }
    }

    if (!Array.isArray(parsed)) {
      throw new Error(`Expected array but got: ${typeof parsed}`);
    }

    let updatedCount = 0;
    for (const item of parsed) {
      if (item && item.id && item.tw !== undefined) {
        const cleaned = cleanTaiwanNames(item.tw);
        cache[item.id] = cleaned;
        updatedCount++;
      }
    }

    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
    console.log(`Batch (${batch[0].id}-${batch[batch.length - 1].id}) done: saved ${updatedCount} items`);
  } catch (error) {
    console.error(`Error translating batch (${batch[0].id}-${batch[batch.length - 1].id}):`, error.message);
    if (retryCount < 3) {
      console.log(`Retrying in 2 seconds... (attempt ${retryCount + 1})`);
      await new Promise(r => setTimeout(r, 2000));
      return translateBatch(batch, retryCount + 1);
    } else {
      throw error;
    }
  }
}

async function run() {
  for (let i = 0; i < batches.length; i++) {
    console.log(`Translating batch ${i + 1}/${batches.length}...`);
    await translateBatch(batches[i]);
    await new Promise(r => setTimeout(r, 800));
  }
  console.log("All batches finished! Total items in cache:", Object.keys(cache).length);
}

run().catch(err => {
  console.error("Translation run failed:", err);
  process.exit(1);
});
