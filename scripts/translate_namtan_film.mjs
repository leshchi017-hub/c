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
console.log(`Loaded ${rawItems.length} raw cues from scripts/raw_namtan_film.json`);

const cachePath = 'scripts/namtan_film_cache.json';
let cache = {};
if (fs.existsSync(cachePath)) {
  try {
    cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    console.log(`Loaded ${Object.keys(cache).length} cached translations`);
  } catch (e) {
    cache = {};
  }
}

const BATCH_SIZE = 30;
const batches = [];
for (let i = 0; i < rawItems.length; i += BATCH_SIZE) {
  const batch = rawItems.slice(i, i + BATCH_SIZE);
  const needsWork = batch.some(item => !cache[item.id]);
  if (needsWork) {
    batches.push(batch);
  }
}

console.log(`Total remaining batches to translate: ${batches.length} (Batch size: ${BATCH_SIZE})`);

async function translateBatch(batch, retryCount = 0) {
  const payload = batch.map(item => ({
    id: item.id,
    text: item.original
  }));

  const prompt = `你是一位精通泰國影視綜藝文化與臺灣在地日常口語的專業字幕翻譯家。
這是泰國知名深度綜藝脫口秀《Katanyu Tonight》（由幽默知性主持人 P'Yu 主持，節目亦在 True ID The Celebrity 播出），專訪超人氣泰國 GMMTV 女星兼大勢百合螢幕搭檔 Namtan 與 Film 的專訪節目！

【訪談重要背景與人物】：
1. 訪談主角兩位女星：Namtan 與 Film
   - 人名【嚴格保留英文原名】「Namtan」與「Film」！絕對不可翻譯為音譯中文字！
2. 主持人：P'Yu（Katanyu Swangsri / พี่หยู），名字保留英文「P'Yu」！
3. 同事朋友：View（View Benyapa），名字保留英文「View」！
4. 經紀公司與節目專題：GMMTV（家一樣的避風港）、True ID、The Celebrity、Katanyu Tonight、OTOP（一鄉一特產比喻）。
5. 訪談主要情節細節：
   - 開場歡迎來賓 Namtan 與 Film，聊到剛跑完海外巡迴粉絲見面會（Fan meeting）。
   - 爆料兩人私下鬧彆扭的趣事（งอนกัน / 哄對方 / 耍小性子）：
     * 身上長的小黑痣被當成「三姊弟」：Namtan 臉上有雙胞胎痣；Film 臉頰上是小弟（最常上鏡），還有二姊，以及鎖骨/胸口注重隱私的大姊。
     * Namtan 看到 Film 身上的痣像開關按鈕一樣，手癢想去按：按一下睡覺、再按一下醒來！
     * 在高樓層結束工作後，Film 累壞了，Namtan 順手一按，Film 竟然整個人雙腿一軟癱倒在地上！Namtan 嚇一跳，Film 氣得在地上說：「妳幹嘛這時候按 我不行了 我們分手吧（เราเลิกกันเถอะ）！」
     * Namtan 喊冤爆料 Film 提分手其實是因為吃醋，懷疑 Namtan 在跟 View（View Benyapa）玩鬧很花心，Namtan 只能不斷撒嬌哄她：「Baby 對不起啦（เบขอโทษ / Baby 抱歉 我再也不敢了）」。
   - 成長背景與性格對比：
     * Film：從小是假小子、好動頑皮，但大部分時間放學就跟媽媽回家。本來想念技職高工當「工科生/技職生（เด็กช่าง）」或學美術，擅長畫畫；家人原本希望她考公職（รับราชการ）或當醫生（念自然組數理班）。後來折衷考上「醫學多媒體傳播（Media & Medical Animation）」。小時候看電視劇覺得女主角好美才萌生當演員念頭。
     * Namtan：從小跟足球員哥哥（泰國國家隊國腳）長大，穿球衣、看英超曼聯（Manchester United），打扮像男生。大家都以為 Namtan 比較 Man、比較帥氣，但 Namtan 其實內心比 Film 更少女、更愛撒嬌（มุ้งมิ้งกว่า）！Film 走路架式像「邦拉詹古戰士（นักรบบางระจัน）」隨時要揍人一樣超有霸氣，在私底下 Film 常常保護 Namtan。
     * Namtan 爸爸以前每天開車從大城府（阿育他耶 Ayutthaya）送她到曼谷試鏡，一次通告費才 3000 泰銖，扣掉油錢幾乎所剩無幾。Namtan 本來念語言，夢想是當「空服員/空姐（air hostess）」，為此跟爸爸冷戰一個月不想進演藝圈。後來考進詩納卡寧威洛大學（SWU / มศว）表演藝術系，才深刻體會到表演藝術能走進人心、療癒他人，明白父母當年的苦心與無私支持。
   - 面對演藝圈壓力、惡評與低潮：
     * GMMTV 就像一個大家庭 Safe Zone，不強行改造藝人，而是把藝人本質中最閃亮有魅力的特色雕琢出來（就像把最好的地方特產 OTOP 展現給大眾）。
     * Film 面對爆紅感到像做夢一樣，同時又深感責任沉重，害怕辜負粉絲厚愛；
     * Namtan 是完美主義者，面對無法控制的人性與網路酸民，學會「隨便啦/看淡/佛系放下」，遠離社群毒素與八卦，把精力專注在運動健身、看劇充電影集《Breaking Bad》（絕命毒師）、玩手機手遊（把顏色分流停車接人、幫貓咪避開恐龍），在手遊裡耐心看廣告也不生氣。
   - 靈魂搭檔與默契：
     * 兩人就像太極的陰與陽，互補又缺一不可。Namtan 是外向行動派、說話快狠準但情緒來時會突然陷入沉默；Film 平時沉穩安靜、深思熟慮，卻會在關鍵時刻把 Namtan 拉起來。
     * 第一次演唱會（GOSSHIP Concert）兩人互相扶持走過身心極限。
     * Film 陪 Namtan 放慢腳步放鬆；Namtan 教會 Film 勇於開口捍衛自己的權利與界線。
     * 被問到為什麼粉絲這麼愛她們：因為她們從不看輕觀眾、全心全意對待每一個角色，私底下也是百分之百真誠對待粉絲的朋友。

【嚴格翻譯規則】：
1. 繁體中文臺灣在地語境：
   - 語氣必須無比自然生動、充滿臺灣綜藝訪談風格與兩人親暱深厚的情感（用詞如：粉絲見面會、殺青、耍彆扭、放閃、吃醋、哄她、撒嬌、假小子、工科生、空服員、曼聯、完美主義、大家庭、特產、佛系、看淡、隨它去、玩手遊、陰陽互補、太搭了吧、感動哭、敲碗 等）。
   - 絕對禁止使用中國大陸用語（不用「視頻/立馬/給力/小姐姐/閨蜜/乘務員」，改用「影片/馬上/超強/好姐妹/空服員」等臺灣用語）。
2. 人名與專有名詞絕對不翻譯：
   - 「Namtan」與「Film」一律保留英文原名！不可翻成「楠妲、菲姆」等！
   - 主持人保留「P'Yu」！
   - 朋友同事保留「View」！
   - 機構名稱保留「GMMTV」、「True ID」、「SWU」等。
3. 【核心指令：調整過短的斷句】：
   - 原始泰語自動語音轉錄經常有過度破碎的片段（如單詞重複、語氣詞斷裂、結巴重複）。
   - 請在精確對應時間節奏的前提下，將過短或碎裂的句子整理成通順、語意連貫的臺灣繁體中文句子，避免生硬破碎！
4. 【最關鍵核心指令：不須加 標點符號】：
   - 翻譯後的繁體中文句子中【絕對不可包含任何標點符號】！
   - 嚴禁出現任何句號「。」、逗號「，」、問號「？」、驚嘆號「！」、冒號「：」、分號「；」、引號「「」『』“”""''」、破折號、波浪號、括號等！
   - 如需斷句停頓，一律使用單一半形空格「 」隔開！
   - 現場聲音括號（如 [笑聲] [歡呼] [鼓掌] [音樂]）可以保留中括號，但內部和兩側嚴禁有任何標點符號！
5. 保持一一對應：
   - 必須回傳陣列，每個項目包含 id 與 tw 兩個欄位，回傳數量與 id 必須與輸入完全一致！

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

    let rawText = response.text ? response.text.trim() : "";
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
      console.log(`✓ Completed IDs ${batch[0].id}..${batch[batch.length - 1].id} (${count}/${batch.length}) | Progress: ${Object.keys(cache).length}/${rawItems.length}`);
      return true;
    } else {
      throw new Error("Response is not an array");
    }
  } catch (err) {
    console.error(`Error on batch ${batch[0].id}..${batch[batch.length - 1].id}: ${err.message}`);
    // Check if 429 rate limit
    let waitTime = 5000;
    if (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED')) {
      console.log("Rate limit hit, pausing for 25s before retry...");
      waitTime = 25000;
    }
    if (retryCount < 5) {
      console.log(`Retrying batch ${batch[0].id} (attempt ${retryCount + 1}) after ${waitTime / 1000}s...`);
      await new Promise(r => setTimeout(r, waitTime));
      return translateBatch(batch, retryCount + 1);
    }
    return false;
  }
}

async function runAll() {
  console.log(`Starting sequential translation with 4.5s pace to stay safely under 15 RPM...`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    await translateBatch(batch);
    if (i < batches.length - 1) {
      await new Promise(r => setTimeout(r, 4500));
    }
  }

  console.log(`All done! Total cached items: ${Object.keys(cache).length}/${rawItems.length}`);
}

runAll().catch(console.error);
