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
    .replace(/[，,。.\s*？！?!：:；;「」『』“”"''（）()、—–…~～#@*&^%$+=\/\\|<>[\]{}｀`*·•]/g, ' ')
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
    .replace(/\bP\s*Yu\b/g, "P'Yu")
    .replace(/\s+/g, ' ')
    .trim();
  return t;
}

const retainedCues = JSON.parse(fs.readFileSync('scripts/retained_cues_1203_1698.json', 'utf8'));
console.log(`Loaded ${retainedCues.length} retained cues for 1203..1698.`);

const cachePath = 'scripts/part2_retranslated_cache.json';
let cache = {};
if (fs.existsSync(cachePath)) {
  try {
    cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    console.log(`Loaded ${Object.keys(cache).length} cached translations`);
  } catch (e) {
    cache = {};
  }
}

const BATCH_SIZE = 35;
const missingCues = retainedCues.filter(c => !cache[c.id]);
console.log(`Missing cues to translate: ${missingCues.length}`);

const batches = [];
for (let i = 0; i < missingCues.length; i += BATCH_SIZE) {
  batches.push(missingCues.slice(i, i + BATCH_SIZE));
}

async function translateBatch(batch, retryCount = 0) {
  const payload = batch.map(item => ({
    id: item.id,
    text: item.clean_text
  }));

  const prompt = `你是一位精通泰國影視綜藝文化與臺灣在地日常口語的專業字幕翻譯家。
這是泰國知名深度綜藝節目《Katanyu Tonight》（True ID The Celebrity 播出），專訪超人氣泰國 GMMTV 女星 Namtan 與 Film 的深度專訪後半段（從 1203 號開始）。

【訪談人物】：
- 訪談主角兩位女星：Namtan 與 Film（名字絕對【保留英文原名】：Namtan、Film，不可翻譯成中文！）
- 主持人：P'Yu（Katanyu Swangsri / พี่หยู），名字保留英文「P'Yu」！
- 同事朋友：View（View Benyapa），名字保留英文「View」！
- 公司與節目名稱保留英文：GMMTV、True ID、The Celebrity、Katanyu Tonight、OTOP。
- 演唱會：GOSSHIP 演唱會（กอซัปีแรก / GOSSHIP Concert）。
- 美劇：Breaking Bad。

【訪談這一段（1203開始）的深刻情節細節】：
- 1203-1247: Namtan 談起第一次 GOSSHIP 演唱會，那是她身心到達極限的艱難時刻，她把自己的脆弱、糟糕面都展現出來，但 Film 咬緊牙關緊握著她的手說「來 姊 我們一起挺過去」。平時 Namtan 總是那個主導一切的領隊，但當 Film 在關鍵時刻伸手把她拉起來時，Namtan 真正體會到毫無保留的愛與由衷的感激。
- 1248-1288: Film 談起變熟的契機，一開始自己很不擅長社交，不知道怎麼接招 Namtan 滿滿的能量氣場，但 Namtan 總是一直無微不至照顧她，並說 Film 是最特別、唯一的妹妹。起初 Film 還以為她在開玩笑，但後來真正感受到這份特別的重視，於是徹底敞開心扉。
- 1289-1348: 彼此最欣賞對方的優點：
  * Film 欣賞 Namtan 反應神速、機智靈巧，能把緊張氣氛化解為幽默；
  * Namtan 欣賞 Film 絕不輕言認輸、對表演藝術充滿敬畏與尊重，甚至私下穿高跟鞋對著鏡子苦練台詞與走路，讓 Namtan 的搭檔演出極為順暢。
- 1349-1414: 驕傲時刻：
  * Film 說每一刻都為 Namtan 感到驕傲，敬佩她作為演員和夥伴的優秀；
  * Namtan 為 Film 的堅持感動落淚：一個當初只是想買手機不想跟爸媽要錢的孩子，跌跌撞撞闖進演藝圈，面對無數風雨與酸民誤解，勇敢克服內心的脆弱，成長為大放異彩的代言人與優秀演員。
- 1415-1564: 成長與蛻變：
  * Film 看到 Namtan 脾氣放慢許多，從過度緊繃的完美主義者（Perfectionist）變得佛系看淡，學會放手，開始玩手遊接乘客排隊（因為有 OCD 強迫症要按顏色分流），沉浸在 Breaking Bad、拯救小貓避開惡龍，甚至有耐心看完手遊廣告，體悟「我們無法阻止暴雨落下」的人生哲理。
  * Namtan 看到 Film 不再事事爭強好勝（因為以前好勝跌倒在膝蓋留下一年的雷射傷疤），學會在工作與生活間取得 Balance（平衡）。
- 1565-1608: 捍衛權利：
  * Namtan 最欣慰的是 Film 學會開口說出「我不接受/不舒服」，不再一味委屈退讓；Film 也感謝 Namtan 教會她尊重自己、捍衛自己的尊嚴與權益。
- 1609-1697: 為什麼粉絲這麼深愛她們：
  * Namtan 直言因為她們「從不看輕觀眾」，用生命詮釋每一個角色，私底下也是百分之百真心把粉絲當朋友；
  * Film 說或許是因為她們全心全意投入每部作品的執著，還有臉頰上可愛的梨渦笑紋（Namtan 逗她說這次按了絕對不會再斷電秒睡）。
- 1698: 節目尾聲，P'Yu 感言致謝，大家掌聲歡呼。

【必須嚴格遵守的翻譯規則】：
1. 繁體中文臺灣在地語境：用語無比自然生動，充滿臺灣在地對話口吻（如：演唱會、完美主義、佛系、看淡、隨它去、玩手遊、接人、強迫症、雷射、平衡、捍衛權益、打從心底、好姐妹、影片 等）。嚴禁用中國大陸用語！
2. 調整過短的斷句：泰語自動轉錄被切碎的詞句，請理順為完整通順自然、語意完整的臺灣繁體中文句子。
3. 【最關鍵指令：不須加 標點符號】：
   - 翻譯後的繁體中文句子中【絕對不可包含任何標點符號】！
   - 嚴禁出現任何句號「。」、逗號「，」、問號「？」、驚嘆號「！」、冒號「：」、分號「；」、引號「「」『』“”""''」、破折號、波浪號、括號等！
   - 停頓分句一律使用單一半形空格「 」隔開！
4. 【[]的詞 直接刪除】：
   - 原文中的中括號聲音詞（如 [เสียงหัวเราะ], [ปรบมือ], [เพลง] 等）必須【直接刪除】，不要翻譯成 [笑聲] 或 [鼓掌]，直接去除！
5. 保持一一對應：
   - 必須回傳標準 JSON 陣列，每個項目包含 "id" (數字) 與 "tw" (繁體中文翻譯字串)！
   - 輸入幾筆，就回傳相同數量的項目，id 嚴格一致！

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
      for (const item of parsed) {
        if (item && item.id !== undefined && item.tw !== undefined) {
          cache[item.id] = cleanTaiwanNames(item.tw);
        }
      }
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
      console.log(`✓ Completed batch ${batch[0].id}..${batch[batch.length - 1].id} (${parsed.length}/${batch.length}). Progress: ${Object.keys(cache).length}/${retainedCues.length}`);
      return true;
    } else {
      throw new Error("Response is not an array");
    }
  } catch (err) {
    console.error(`Error on batch ${batch[0].id}: ${err.message}`);
    let waitMs = 5000;
    if (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED')) {
      console.log("Rate limit, waiting 25s...");
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
  if (batches.length === 0) {
    console.log("All retained cues already cached!");
    return;
  }

  console.log(`Starting translation of ${batches.length} batches (size ${BATCH_SIZE})...`);
  for (let i = 0; i < batches.length; i++) {
    await translateBatch(batches[i]);
    if (i < batches.length - 1) {
      await new Promise(r => setTimeout(r, 6000));
    }
  }

  console.log(`\nAll done! Cached count: ${Object.keys(cache).length}/${retainedCues.length}`);
}

main().catch(console.error);
