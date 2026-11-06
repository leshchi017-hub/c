import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is required");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// Helper to remove any punctuation marks
export function stripPunctuation(text) {
  if (!text) return "";
  return text
    // Replace all fullwidth & halfwidth punctuation with space
    .replace(/[，,。.\s*？！?!：:；;「」『』“”"''（）()、—–…~～#@*&^%$+=\/\\|<>[\]{}｀`*·•]/g, ' ')
    // Normalize spaces
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanTaiwanNames(text) {
  if (!text) return "";
  let t = stripPunctuation(text);
  // Ensure names are preserved as specified
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
    .replace(/\bLingOrm\b/gi, "Lena Miu") // In case auto-transcription mislabeled
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
console.log(`Parsed ${allSubtitles.length} subtitles from ${inputSrtPath}`);

const cachePath = 'scripts/preawpak_ep43_cache.json';
let cache = {};
if (fs.existsSync(cachePath)) {
  try {
    cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    console.log(`Loaded ${Object.keys(cache).length} cached items`);
  } catch (e) {
    cache = {};
  }
}

const BATCH_SIZE = 30;
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

  const prompt = `你是一位精通泰國影視綜藝文化與臺灣日常口語的專業字幕翻譯家。
這是泰國3台（Ch3）超人氣美食旅遊綜藝節目《Preawpak》（เปรี้ยวปาก / 主持人為歡樂搭檔 Joy 與 On），專訪大熱女女（GL）劇集兩大雙女主 Lena 與 Miu（LenaMiu）的完整未刪減專訪（Uncut Ver Ep 43）英文字幕。

【重要人物與背景脈絡】：
1. 訪談主角兩位女星：Lena 與 Miu。主角名字一律嚴格使用「Lena」與「Miu」！
   （英文語音轉錄中偶爾誤植為 Mew, Leena, Lina, Nina, Nina-Mew 等，一律修正為「Lena」與「Miu」）
2. 節目主持搭檔：P'Joy（Joy）與 P'On（On / P'On / 英文轉錄偶爾被誤辨識為 Job, P'O）。
3. 劇集角色：
   - Lena 飾演 Pheem（外冷內熱、超級傲嬌霸氣的設計師/老闆）。
   - Miu 飾演 Paan（甜美可愛、貼心又深情的助理）。
   （英文轉錄中可能寫成 Pim, Pym, Peem, Phim 以及 Pan, Parn, Pa，請統一使用臺灣觀眾最熟悉的「Pheem」與「Paan」）
4. 節目主要內容：
   - 前半段：Joy 與 On 帶領大家到北欖府（Samut Prakan）Phra Samut Chedi 的 Ban Khun Samut Chin（坤三睦真村水上民宿聚落）泥灘抓血蚶（泥蚶）。擲硬幣分組比賽（工作人員 Pete、Gib、Aum、Pao 與當地達人組隊），15分鐘內比誰採的蚶多，現煮蘸超辣泰式海鮮醬！
   - 贊助商品牌：WP Energy（World Gas）、Thai Life Insurance（泰國人壽保險）、Hero 環保超厚黑色垃圾袋、萊頂牌花生（Rai Thip）。
   - 後半段：換裝到 Khlong Sappasamit 運河旁的 Baan Thao Seafood（踏浪海鮮餐廳）與 Lena、Miu 享用海鮮大餐！
   - 菜色：咖哩炒蟹黃、鹹蛋黃炒魷魚/花枝、金目鱸魚露炸魚、生蠔拼盤、涼拌醃生蟹青木瓜沙拉（Som Tum）、鹽焗海蝦、海鮮炒飯、椒鹽脆皮五花肉、酸辣海鮮湯。Miu 愛吃魚露炸鱸魚、炒高麗菜、煎蛋、不加糖的涼拌木瓜絲；Lena 愛吃蝦、白蝦粉絲煲、炸魚、重口味酸辣！
   - 聊到昨晚剛播出的第 7 集（EP7）：Pheem 霸氣道歉、兩人和解後飢渴火辣的親熱名場面（導演要求要有極度飢餓飢渴的感覺，兩人演完害羞尖叫，粉絲抱枕頭看）。
   - 預告第 8 集（EP8 大結局 Final EP）：醫院名場面，大結局是否圓滿 Happy Ending？傲嬌的 Pheem 嘴巴還會那麼毒嗎？
   - 宣傳大結局暹羅百麗宮（Siam Paragon）千人觀影會全數售罄、11月22日兩人同月同日生生日見面會（Party 變裝主題、最辣的有專屬 2 對 1 單獨合照獎勵）、12月香港與日本見面會。
   - 兩人的真實感情與默契：相識近2年，同月同日生，心靈相通不用說話就知道彼此的心情；去巴黎時裝週買同款精品包當生日紀念；Lena 送禮講究儀式感與意義，去年送專屬訂製肖像畫給 Miu 掛臥室；Miu 累了會像章魚一樣黏過去討抱抱充電（Refill），Lena 則是細心給予實用建議與照顧，兩人是互相扶持成長的「非毒性健康關係（Non-toxic relationship）」！
   - 每集播出都在 X（Twitter）全球趨勢拿下第一名。

【必須嚴格遵守的最高翻譯規則】：
1. 訪談主角名字一律保留「Lena」與「Miu」：
   - 絕不可翻譯成中文音譯（如莉娜、米尤、妮娜等）！一律寫成「Lena」與「Miu」！
2. 人名保留不動 不須翻譯：
   - Lena, Miu, Joy, On, Pheem, Paan, Pete, Gib, Aum, Pao 等名字一律保留英文原樣，不翻成中文！
3. 繁體中文須為臺灣在地日常語境：
   - 用詞必須無比道地、自然流暢、貼合臺灣綜藝節目字幕與觀眾口吻（如：血蚶、太好吃了、傲嬌、放閃、親熱戲、超辣、爽快、打臉、直女、黏人、討抱抱、充電、超甜、笑死、傻眼、真的假的 等）。
   - 絕對禁止使用中國大陸用語（如：不用「立馬/給力/小姐姐/視頻/吃貨/閨蜜」，改用「馬上/超讚/女生/影片/美食饕客/好姐妹」等臺灣常見用語）。
4. 【核心重點指令：調整過短的斷句】：
   - 原始英文字幕常有語音識別切斷的破碎單詞或極短詞組（如 "Samut Chedi", "The breeze is so nice", "Just one", "9", "8", "7", "Share, share, share", "is a local", "ships and unload their goods here", "What is this" 等）。
   - 【絕對不可】直接翻譯成單個漢字或破碎不通的斷片（絕不可出現孤立的單字如「我」「只」「是」「快」「大」等）！
   - 請根據上下句對話脈絡，將過短的斷句順化為完整、通順自然且語意完整的臺灣口語句子（約 4 至 15 個中文字），讓字幕連貫易讀！
5. 【核心重點指令：不須加 標點符號】：
   - 翻譯後的繁體中文【完全不可包含任何標點符號】！
   - 絕對禁止出現任何逗號「，,」、句號「。..」、問號「？?」、驚嘆號「！!」、冒號「：:」、分號「；;」、引號「「」『』“”""''」、破折號「——-」、波浪號「～~」、括號「（）()[]」等！
   - 若句子中間需要斷句停頓，一律使用單一半形空格「 」隔開！
6. 保持序號與數量嚴格一一對應：
   - 回傳標準 JSON 陣列，每個項目包含 "id" (數字) 與 "tw" (繁體中文翻譯字串)！
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

    let rawText = response.text ? response.text.trim() : "";
    if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }

    const parsed = JSON.parse(rawText);
    if (Array.isArray(parsed)) {
      let count = 0;
      for (const item of parsed) {
        if (item && item.id !== undefined && item.tw !== undefined) {
          cache[item.id] = cleanTaiwanNames(item.tw);
          count++;
        }
      }
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
      console.log(`✓ Completed batch IDs ${batch[0].id}..${batch[batch.length - 1].id} (${count}/${batch.length}) | Total progress: ${Object.keys(cache).length}/${allSubtitles.length}`);
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
  const WORKERS = 4;
  console.log(`Starting translation with ${WORKERS} concurrent workers...`);

  let currentIndex = 0;
  async function worker(workerId) {
    while (currentIndex < batches.length) {
      const batchIndex = currentIndex++;
      const batch = batches[batchIndex];
      console.log(`[Worker ${workerId}] Starting batch ${batchIndex + 1}/${batches.length} (IDs ${batch[0].id}..${batch[batch.length - 1].id})`);
      await translateBatch(batch);
      // Small pause to be gentle with rate limits
      await new Promise(r => setTimeout(r, 400));
    }
  }

  const workerPromises = [];
  for (let w = 0; w < WORKERS; w++) {
    workerPromises.push(worker(w + 1));
  }
  await Promise.all(workerPromises);

  console.log(`\nAll batches processed! Total cached: ${Object.keys(cache).length}/${allSubtitles.length}`);
}

run().catch(console.error);
