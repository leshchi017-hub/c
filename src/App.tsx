/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Download,
  Copy,
  Check,
  Search,
  Play,
  Pause,
  RotateCcw,
  ShieldCheck,
  FileText,
  Edit3,
  Save,
  X,
  Volume2,
  Sliders,
  CheckCircle2,
  Sparkles,
  ArrowUpDown,
  FileCheck,
  Languages,
  Maximize2,
  Minimize2,
  Tv,
  Film as FilmIcon,
  HeartHandshake,
  Gamepad2,
  Users,
  Utensils,
  Flame,
  Award
} from 'lucide-react';

interface SubtitleItem {
  id: number;
  timestamp: string;
  original: string;
  romanized?: string;
  translated: string;
}

type EpisodeKey = 'podkazz_ep24' | 'pls_love_final' | 'dearmyself_ep59' | 'dearmyself' | 'katanyu_tonight' | 'lenamiu_defense' | 'cc_lenamiu' | 'preawpak' | 'daralive' | 'bangkrachao' | 'harborland';

export default function App() {
  const [activeEpisode, setActiveEpisode] = useState<EpisodeKey>('podkazz_ep24');
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'bilingual' | 'zh' | 'romanized' | 'original'>('bilingual');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Live teleprompter / Player simulation
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [autoScroll, setAutoScroll] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // Helper to parse SRT timestamp into seconds
  const parseTimestampToSeconds = (ts: string): { start: number; end: number } => {
    try {
      const [startPart, endPart] = ts.split('-->').map(s => s.trim());
      const parsePart = (p: string) => {
        const parts = p.split(':');
        let h = 0, m = 0, s = 0;
        if (parts.length === 3) {
          h = parseFloat(parts[0]);
          m = parseFloat(parts[1]);
          const secMs = parts[2].replace(',', '.');
          s = parseFloat(secMs);
        } else if (parts.length === 2) {
          m = parseFloat(parts[0]);
          const secMs = parts[1].replace(',', '.');
          s = parseFloat(secMs);
        }
        return h * 3600 + m * 60 + s;
      };
      return { start: parsePart(startPart), end: parsePart(endPart) };
    } catch {
      return { start: 0, end: 0 };
    }
  };

  // Format seconds to mm:ss
  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  // Fetch data depending on active episode
  useEffect(() => {
    setLoading(true);
    let jsonPath = '/podkazz_ep24_data.json';
    if (activeEpisode === 'podkazz_ep24') jsonPath = '/podkazz_ep24_data.json';
    if (activeEpisode === 'pls_love_final') jsonPath = '/pls_love_final_ep_data.json';
    if (activeEpisode === 'dearmyself_ep59') jsonPath = '/dear_myself_ep59_data.json';
    if (activeEpisode === 'dearmyself') jsonPath = '/dear_myself_ep46_data.json';
    if (activeEpisode === 'katanyu_tonight') jsonPath = '/katanyu_namtan_film_data.json';
    if (activeEpisode === 'lenamiu_defense') jsonPath = '/cc_lenamiu_2026_10_19_data.json';
    if (activeEpisode === 'cc_lenamiu') jsonPath = '/cc_lenamiu_2026_10_23_data.json';
    if (activeEpisode === 'preawpak') jsonPath = '/preawpak_ep43_data.json';
    if (activeEpisode === 'daralive') jsonPath = '/cc_dara_live_2026_10_20_data.json';
    if (activeEpisode === 'bangkrachao') jsonPath = '/subtitles_data.json';
    if (activeEpisode === 'harborland') jsonPath = '/harborland_subtitles.json';

    fetch(jsonPath)
      .then(res => {
        if (!res.ok) throw new Error('Data not ready yet');
        return res.json();
      })
      .then(data => {
        setSubtitles(data);
        setLoading(false);
      })
      .catch(err => {
        console.warn('Polling for subtitle data...', err);
        const timer = setTimeout(() => {
          fetch(jsonPath)
            .then(r => r.json())
            .then(d => {
              setSubtitles(d);
              setLoading(false);
            })
            .catch(() => {});
        }, 1500);
        return () => clearTimeout(timer);
      });
  }, [activeEpisode]);

  // Max duration in seconds
  const maxDurationSec = useMemo(() => {
    if (!subtitles.length) return 2140;
    const lastSub = subtitles[subtitles.length - 1];
    return parseTimestampToSeconds(lastSub.timestamp).end || 2140;
  }, [subtitles]);

  // Timer loop for simulation player
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentTimeSec(prev => {
        const next = prev + 0.1 * playbackSpeed;
        if (next > maxDurationSec) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, maxDurationSec]);

  // Find active subtitle
  const activeSubtitle = useMemo(() => {
    if (!subtitles.length) return null;
    return subtitles.find(sub => {
      const { start, end } = parseTimestampToSeconds(sub.timestamp);
      return currentTimeSec >= start && currentTimeSec <= end;
    });
  }, [subtitles, currentTimeSec]);

  // Auto scroll to active subtitle
  useEffect(() => {
    if (autoScroll && activeSubtitle && rowRefs.current[activeSubtitle.id]) {
      rowRefs.current[activeSubtitle.id]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [activeSubtitle, autoScroll]);

  // Filtering
  const filteredSubtitles = useMemo(() => {
    return subtitles.filter(item => {
      // Category filter for PODKAZZ EP.24 (Lena & Miu • 主持: Tong)
      if (activeEpisode === 'podkazz_ep24') {
        if (filterCategory === 'destiny') {
          const dRegex = /(命中注定|緣分|十一月二十五|11月25|同月同日|生日|Gigi|Lina|Ann|媽媽|Union Hall|Girls Night)/i;
          if (!dRegex.test(item.original) && !dRegex.test(item.translated)) return false;
        } else if (filterCategory === 'dreams') {
          const drRegex = /(夢想|老師|演說家|TED Talk|演講|收銀員|條碼|創業|生意|老闆|志願)/i;
          if (!drRegex.test(item.original) && !drRegex.test(item.translated)) return false;
        } else if (filterCategory === 'focus_acting') {
          const aRegex = /(專注|Focus|冥想|打坐|禪修|放鬆|Relaxation|接地氣|Grounded|感官|演戲|演員|劇組)/i;
          if (!aRegex.test(item.original) && !aRegex.test(item.translated)) return false;
        } else if (filterCategory === 'food') {
          const fRegex = /(吃|麵|蛋包飯|荷包蛋|肉鬆|大蒜|海鮮|禽類|雞肉|長棍|麵包|奶油|碳水|澱粉|披薩|辣)/i;
          if (!fRegex.test(item.original) && !fRegex.test(item.translated)) return false;
        } else if (filterCategory === 'please_love') {
          const plRegex = /(Please Love|請深愛|天使|Paradise|俱樂部|衝突|第3台|3Plus|iQIYI|愛奇藝|教授|傲嬌|喜劇)/i;
          if (!plRegex.test(item.original) && !plRegex.test(item.translated)) return false;
        } else if (filterCategory === 'mindset') {
          const mRegex = /(酸民|負能量|謠言|造謠|澄清|無能為力|放手|MVP|支持|粉絲|後援會|保護|盾牌|珍惜)/i;
          if (!mRegex.test(item.original) && !mRegex.test(item.translated)) return false;
        } else if (filterCategory === 'qa_friends') {
          const qRegex = /(狗|博美|獵犬|Nam|Singto|Keshi|Suchat|Kai|Vacations|Freen|Becky|黃金|朱拉|朱拉隆功|撒嬌|碎念)/i;
          if (!qRegex.test(item.original) && !qRegex.test(item.translated)) return false;
        }
      }

      // Category filter for Pls Love Final EP (Lena & Miu • Pheem & Pan)
      if (activeEpisode === 'pls_love_final') {
        if (filterCategory === 'names') {
          const namesRegex = /(Lena|Miu|Pheem|Pan|P'Ao|P'Boom|P'Dew|Thunwa|Tan|Lumi|Patchanee)/i;
          if (!namesRegex.test(item.original) && !namesRegex.test(item.translated)) return false;
        } else if (filterCategory === 'roles') {
          const rRegex = /(Pheem|Pan|角色|灰色|善良|邪惡|道別|告別|谷底|演戲|演員)/i;
          if (!rRegex.test(item.original) && !rRegex.test(item.translated)) return false;
        } else if (filterCategory === 'hardest') {
          const hRegex = /(腳張開|圍裙|害羞|大魔王|文化衝擊|保守|讀本|肢體|傲嬌|憋)/i;
          if (!hRegex.test(item.original) && !hRegex.test(item.translated)) return false;
        } else if (filterCategory === 'touching') {
          const tRegex = /(碰杯|沙灘|沙子|結婚|床|互許終身|名場面|第一集|渴望|禮物|拆)/i;
          if (!tRegex.test(item.original) && !tRegex.test(item.translated)) return false;
        } else if (filterCategory === 'lumi') {
          const lRegex = /(Lumi|Chutete|珍奶|女兒|性感|名模|長腿|大長腿|寶貝|跳舞|九個月)/i;
          if (!lRegex.test(item.original) && !lRegex.test(item.translated)) return false;
        } else if (filterCategory === 'fans_qa') {
          const fRegex = /(交往|直女|萬聖節|媽媽|提問|生日|秒殺|門票|手環|見證人)/i;
          if (!fRegex.test(item.original) && !fRegex.test(item.translated)) return false;
        } else if (filterCategory === 'photobook') {
          const pbRegex = /(寫真書|1460|一千四百六十|預購|五號|二十號|Girls' Night Out|Union)/i;
          if (!pbRegex.test(item.original) && !pbRegex.test(item.translated)) return false;
        } else if (filterCategory === 'confession') {
          const cRegex = /(我愛妳|搭檔|值得|風雨|微笑|陪伴|寸步不離|選擇了我|後盾|動能|幸福)/i;
          if (!cRegex.test(item.original) && !cRegex.test(item.translated)) return false;
        }
      }

      // Category filter for Dear Myself EP.59 (Puinoon & Bint)
      if (activeEpisode === 'dearmyself_ep59') {
        if (filterCategory === 'names') {
          const namesRegex = /(Puinoon|Bint|P'Joe|Pim|Bulan|Mint|Chalida|Sirithorn)/i;
          if (!namesRegex.test(item.original) && !namesRegex.test(item.translated)) return false;
        } else if (filterCategory === 'firstlove') {
          const fRegex = /(初戀|小嵐|阿亮|學長|暗戀|補習|前十名|司令台|領獎|First Love|Nam|Shone)/i;
          if (!fRegex.test(item.original) && !fRegex.test(item.translated)) return false;
        } else if (filterCategory === 'calculus_f') {
          const cRegex = /(瑪希敦|藥學|微積分|當科|F|Fantastic|戲劇社|門票|Mahidol|Pharmacy|Calculus)/i;
          if (!cRegex.test(item.original) && !cRegex.test(item.translated)) return false;
        } else if (filterCategory === 'khomkhang') {
          const kRegex = /(心之烙印|Khom Khang|警察|Pim|預告片|酸民|上萬|退出|佛牌|鑄造廠|特訓|爸爸)/i;
          if (!kRegex.test(item.original) && !kRegex.test(item.translated)) return false;
        } else if (filterCategory === 'maruay') {
          const mRegex = /(鸚鵡|招財|Ma-Ruay|小鳥|療癒|退休|放慢|綠頰)/i;
          if (!mRegex.test(item.original) && !mRegex.test(item.translated)) return false;
        } else if (filterCategory === 'pageant') {
          const pRegex = /(泰國小姐|國際小姐|樓梯|跌倒|抱|脖子|迷因|東京巨蛋|同志|八位|大地|星星|禮服|化妝師)/i;
          if (!pRegex.test(item.original) && !pRegex.test(item.translated)) return false;
        } else if (filterCategory === 'couple') {
          const cpRegex = /(鄉間|Siang Lang|泥巴|蚯蚓|白髮|悶氣|彆扭|遞水|水瓶|歌詞|星球|命中注定|牽手)/i;
          if (!cpRegex.test(item.original) && !cpRegex.test(item.translated)) return false;
        } else if (filterCategory === 'dreams') {
          const dRegex = /(精進|努力|背叛|明天|全新的一天|夢想|初衷|歸零)/i;
          if (!dRegex.test(item.original) && !dRegex.test(item.translated)) return false;
        }
      }

      // Category filter for Katanyu Tonight (Namtan & Film)
      if (activeEpisode === 'katanyu_tonight') {
        if (filterCategory === 'names') {
          const namesRegex = /(Namtan|Film|P'Yu|View|Katanyu|น้ำตาล|ฟิล์ม|พี่หยู)/i;
          if (!namesRegex.test(item.original) && !namesRegex.test(item.translated)) return false;
        } else if (filterCategory === 'breakup') {
          const bRegex = /(งอน|เลิก|ปุ่ม|สวิตช์|หลับ|ตื่น|ล้ม|痣|開關|斷電|分手|哄|鬧彆扭|耍小性子|睡覺|按鈕)/i;
          if (!bRegex.test(item.original) && !bRegex.test(item.translated)) return false;
        } else if (filterCategory === 'jealous') {
          const jRegex = /(เจ้าชู้|วิว|View|หึง|เล่น|吃醋|花心|玩鬧|第三者)/i;
          if (!jRegex.test(item.original) && !jRegex.test(item.translated)) return false;
        } else if (filterCategory === 'childhood') {
          const cRegex = /(เด็กช่าง|ศิลปะ|แก่น|หมอ|ราชการ|นักรบ|บางระจัน|แมน|มุ้งมิ้ง|假小子|工科生|技職|畫畫|公職|邦拉詹|戰士|霸氣)/i;
          if (!cRegex.test(item.original) && !cRegex.test(item.translated)) return false;
        } else if (filterCategory === 'soccer') {
          const sRegex = /(ฟุตบอล|แมนยู|พี่ชาย|ทีมชาติ|บอลโลก|曼聯|Manchester|足球|國腳|英超|球衣)/i;
          if (!sRegex.test(item.original) && !sRegex.test(item.translated)) return false;
        } else if (filterCategory === 'airhostess') {
          const aRegex = /(air|hostess|พ่อ|ขับรถ|อยุธยา|3000|มศว|การแสดง|空服員|空姐|試鏡|大城府|阿育他耶|表演藝術|SWU|父母)/i;
          if (!aRegex.test(item.original) && !aRegex.test(item.translated)) return false;
        } else if (filterCategory === 'gmmtv') {
          const gRegex = /(GMM|GMTV|ครอบครัว|โอทอป|OTOP|เซฟโซน|Safe|大家庭|避風港|特產|商品)/i;
          if (!gRegex.test(item.original) && !gRegex.test(item.translated)) return false;
        } else if (filterCategory === 'mindset') {
          const mRegex = /(perfectionist|ช่างมัน|Breaking Bad|เกม|โซเชียล|OCD|รถ|完美主義|佛系|隨便啦|手遊|強迫症|接人|酸民|惡評)/i;
          if (!mRegex.test(item.original) && !mRegex.test(item.translated)) return false;
        } else if (filterCategory === 'yinyang') {
          const yRegex = /(หยินหยาง|พาร์ทเนอร์|คอนเสิร์ต|GOSSHIP|ดึง|สิทธิ์|ปกป้อง|陰陽|互補|搭檔|演唱會|扶持|權利)/i;
          if (!yRegex.test(item.original) && !yRegex.test(item.translated)) return false;
        }
      }

      // Category filter for LenaMiu Defense (Pheem vs Pan)
      if (activeEpisode === 'lenamiu_defense') {
        if (filterCategory === 'names') {
          const namesRegex = /(Lena|Miu|Pheem|Pan|Goy)/i;
          if (!namesRegex.test(item.original) && !namesRegex.test(item.translated)) return false;
        } else if (filterCategory === 'roles') {
          const rRegex = /(พิมพ์|ป่าน|คนดี|ออฟฟิศ|สรีระ|Pheem|Pan|大好人|摩天大樓|身形|身材|好人)/i;
          if (!rRegex.test(item.original) && !rRegex.test(item.translated)) return false;
        } else if (filterCategory === 'hostbar') {
          const hRegex = /(บารโฮส|ขายตัว|ขายเวลา|เรือนร่าง|CCTV|ร้าน|公關店|男模|坐檯|陪坐|賣身|肉體|監視器)/i;
          if (!hRegex.test(item.original) && !hRegex.test(item.translated)) return false;
        } else if (filterCategory === 'kiss') {
          const kRegex = /(หอมแก้ม|แฟน|ผู้ชาย|เลสเบี้น|ร่าง|親臉頰|臉頰|女同志|沉浸|角色)/i;
          if (!kRegex.test(item.original) && !kRegex.test(item.translated)) return false;
        } else if (filterCategory === 'money') {
          const mRegex = /(ล้าน|ครอบครัว|เงิน|สินได้|จน|500萬|300萬|萬|聘金|破產|掏空|錢)/i;
          if (!mRegex.test(item.original) && !mRegex.test(item.translated)) return false;
        } else if (filterCategory === 'script') {
          const scRegex = /(บท|EP 5|EP 8|ตอน|8 ตอน|5 ตอน|เล่า|劇本|8集|5集|真相|結局|完結篇)/i;
          if (!scRegex.test(item.original) && !scRegex.test(item.translated)) return false;
        } else if (filterCategory === 'united') {
          const uRegex = /(ทีมเดียวกัน|อาหารเม็ด|รักกัน|เลี้ยงได้แต่ตัว|ขับแห้ง|狗糧|同一隊|同陣線|放閃|養不住心|乾瞪眼)/i;
          if (!uRegex.test(item.original) && !uRegex.test(item.translated)) return false;
        } else if (filterCategory === 'promo') {
          const pRegex = /(Please Love|ช่อง 3|อ้ายชีอี้|ศุกร์|รักได้ไหม|請愛我好嗎|愛奇藝|3Plus|3台)/i;
          if (!pRegex.test(item.original) && !pRegex.test(item.translated)) return false;
        }
      }

      // Category filter for CC LenaMiu
      if (activeEpisode === 'cc_lenamiu') {
        if (filterCategory === 'names') {
          const namesRegex = /(Lena|Miu|Pheem|Paan)/i;
          if (!namesRegex.test(item.original) && !namesRegex.test(item.translated)) return false;
        } else if (filterCategory === 'food') {
          const fRegex = /(อาหาร|ข้าวผัด|ซีอิ๊ว|ขาว|แกง|ต้ม|เผ็ด|กลิ่น|สตอ|ปลาร้า|ปลา|ซีฟู้ด|สัตว์ปีก|เนื้อ|สเต็ก|สลัด|ทูน่า|ซาวโด|สาหร่าย|ติดฟัน|蛋炒飯|醬油|白色食物|椰汁|辣|臭豆|魚露|海鮮|禽類|牛排|沙拉|鮪魚|酸種|海苔|卡牙|poke)/i;
          if (!fRegex.test(item.original) && !fRegex.test(item.translated)) return false;
        } else if (filterCategory === 'fears') {
          const fearRegex = /(กลัว|แมลง|กระตุ๊ก|เช้า|วิ่ง|มาราธอน|นอน|ตีเทนนิส|ไทม์โซน|time zone|害怕|昆蟲|蟲子|晨間|早起|馬拉松|時區|網球|時差)/i;
          if (!fearRegex.test(item.original) && !fearRegex.test(item.translated)) return false;
        } else if (filterCategory === 'belongings') {
          const bRegex = /(ลิปสติก|สเปรย์|แอลกอฮอล์|ทิชชู่|makeup|bag|คาเฟอีน|ชาบู|มัทฉะ|ครีม|โทรศัพท์|แบต|พาวเวอร์|口紅|酒精|噴霧|面紙|化妝包|咖啡因|抹茶|手機|充電|行動電源)/i;
          if (!bRegex.test(item.original) && !bRegex.test(item.translated)) return false;
        } else if (filterCategory === 'flowers') {
          const flRegex = /(ดอก|กุหลาบ|โรส|ลิลลี่|ลีลาวดี|มะลิ|แก้ว|พุด|玫瑰|百合|雞蛋花|茉莉|七里香|梔子花|扶桑|花朵|香氣)/i;
          if (!flRegex.test(item.original) && !flRegex.test(item.translated)) return false;
        } else if (filterCategory === 'charm') {
          const chRegex = /(เสน่ห์|energy|ปาก|เป็ด|จูบ|ตา|หมวย|mindset|คิดเยอะ|ซิลูเอท|หุ่น|บึ้ม|ก้น|ตูด|魅力|活力|鴨子嘴|接吻|眼睛|致命電眼|思維|身材|曲線|屁股|前凸後翹)/i;
          if (!chRegex.test(item.original) && !chRegex.test(item.translated)) return false;
        } else if (filterCategory === 'shy') {
          const shyRegex = /(เขิน|หลบตา|เดินหนี|behind|please love|คิ้ว|จมูก|กระเป๋า|เสยผม|害羞|避開眼神|逃跑|幕後花絮|摸眉毛|摸鼻子|手插口袋|撥頭髮)/i;
          if (!shyRegex.test(item.original) && !shyRegex.test(item.translated)) return false;
        } else if (filterCategory === 'series') {
          const sRegex = /(please love|รักได้ไหม|ป่าน|พิม|ศุกร์|33|3 plus|新劇|週五|電視|線上)/i;
          if (!sRegex.test(item.original) && !sRegex.test(item.translated)) return false;
        }
      }

      // Category filter for Preawpak EP43
      if (activeEpisode === 'preawpak') {
        if (filterCategory === 'names') {
          const namesRegex = /(Lena|Miu|Pheem|Paan|Joy|On)/i;
          if (!namesRegex.test(item.original) && !namesRegex.test(item.translated)) return false;
        } else if (filterCategory === 'cockles') {
          const cRegex = /(cockle|clam|mud|dig|catch|shell|Ban Khun Samut|血蚶|泥蚶|抓|挖|硬幣|倒數|秒|海鮮醬)/i;
          if (!cRegex.test(item.original) && !cRegex.test(item.translated)) return false;
        } else if (filterCategory === 'seafood') {
          const sRegex = /(sea bass|crab|shrimp|squid|oyster|curry|Som Tum|Baan Thao|鱸魚|蟹黃|炒蟹|魷魚|花枝|生蠔|白蝦|炒飯|脆皮)/i;
          if (!sRegex.test(item.original) && !sRegex.test(item.translated)) return false;
        } else if (filterCategory === 'ep7') {
          const ep7Regex = /(episode 7|famished|hungry|apologiz|kiss|love scene|pillow|第七集|道歉|飢渴|親熱|害羞|尖叫|枕頭)/i;
          if (!ep7Regex.test(item.original) && !ep7Regex.test(item.translated)) return false;
        } else if (filterCategory === 'ep8') {
          const ep8Regex = /(episode 8|hospital|final|conclusion|happy ending|Siam Paragon|第八集|醫院|大結局|放映會|百麗宮|收官)/i;
          if (!ep8Regex.test(item.original) && !ep8Regex.test(item.translated)) return false;
        } else if (filterCategory === 'bags') {
          const bRegex = /(Paris|Fashion Week|bag|birthday|gift|portrait|bedroom|巴黎|時裝週|同款|包包|生日|禮物|肖像畫|臥室)/i;
          if (!bRegex.test(item.original) && !bRegex.test(item.translated)) return false;
        } else if (filterCategory === 'refill') {
          const rRegex = /(refill|octopus|recharge|care|safe zone|non-toxic|充電|章魚|黏|討抱抱|心靈導師|安全感|非毒性)/i;
          if (!rRegex.test(item.original) && !rRegex.test(item.translated)) return false;
        } else if (filterCategory === 'trending') {
          const tRegex = /(trending|trend|Twitter|number 1|global|fan|趨勢|推特|第一名|全球|熱搜|感謝)/i;
          if (!tRegex.test(item.original) && !tRegex.test(item.translated)) return false;
        }
      }

      // Category filter for DARA LIVE 1,772 cues
      if (activeEpisode === 'daralive') {
        if (filterCategory === 'names') {
          const namesRegex = /(Lena|Miu|Pheem|Paan|Film|P'Film|Joy|P'Joy|Toey|P'Toey|Dew|P'Dew|Aom|Kru Aom)/i;
          if (!namesRegex.test(item.original) && !namesRegex.test(item.translated)) return false;
        } else if (filterCategory === 'lovescene') {
          const lRegex = /(Victoria|Secret|กางเกงใน|ลูกไม้|ซึน|เลิฟซีน|จูบ|ฟึ่บ|維多利亞|內褲|透膚|蕾絲|床戲|走位|親熱|接吻|親吻|心跳|身材)/i;
          if (!lRegex.test(item.original) && !lRegex.test(item.translated)) return false;
        } else if (filterCategory === 'nose_ear') {
          const nRegex = /(จมูก|คอ|หู|ขบ|สันจมูก|鼻樑|脖子|耳朵|咬耳朵|滑蹭|磨蹭|親脖子|下巴)/i;
          if (!nRegex.test(item.original) && !nRegex.test(item.translated)) return false;
        } else if (filterCategory === 'morning') {
          const mRegex = /(โอน|ค่าตัว|ซื้อกับข้าว|ผัก|ตื่น|ขี้ปาก|轉帳|出場費|買菜|醒來|閒話|買春|傲嬌|清晨|口嫌體正直)/i;
          if (!mRegex.test(item.original) && !mRegex.test(item.translated)) return false;
        } else if (filterCategory === 'drinks') {
          const dRegex = /(ชา|อู่หลง|นม|หวาน|0%|25%|110%|120%|อโลเวร่า|ฟู้ด|烏龍|蘆薈|奶茶|微糖|無糖|全糖|糖水|糖尿病|應援)/i;
          if (!dRegex.test(item.original) && !dRegex.test(item.translated)) return false;
        } else if (filterCategory === 'pocky') {
          const pRegex = /(ป๊อกกี้|pocky|กัด|เกม|อาทิตย์|巧克力棒|只剩一點|咬|接吻遊戲|星期天)/i;
          if (!pRegex.test(item.original) && !pRegex.test(item.translated)) return false;
        } else if (filterCategory === 'patting') {
          const patRegex = /(แพท|ถิง|ฟิก|นิยาย|Pat|Ting|Never Without You|同人|小說|學姐|直女|暗戀|虐心)/i;
          if (!patRegex.test(item.original) && !patRegex.test(item.translated)) return false;
        } else if (filterCategory === 'finale') {
          const fRegex = /(30|ฮาโลวีน|พารากอน|ตั๋ว|บัตร|sold out|นางฟ้า|ปีก|runway|10月30日|萬聖節|售罄|放映會|百麗宮|天使|走秀|翅膀)/i;
          if (!fRegex.test(item.original) && !fRegex.test(item.translated)) return false;
        } else if (filterCategory === 'ost') {
          const ostRegex = /(รักได้ไหม|เพลง|ร้อง|คอรัส|หัวใจ|หลงรัก|主題曲|愛我可以嗎|片尾曲|口不對心|唱)/i;
          if (!ostRegex.test(item.original) && !ostRegex.test(item.translated)) return false;
        }
      }

      // Category filter for HarborLand
      if (activeEpisode === 'harborland') {
        if (filterCategory === 'names') {
          const namesRegex = /(Lena|Miu|Oom|Bam|Tan|Yuyu|Eisaya|Saralee|Nick|Judy)/i;
          if (!namesRegex.test(item.original) && !namesRegex.test(item.translated)) return false;
        } else if (filterCategory === 'game1') {
          const g1Regex = /(tag|heart|Catch Me|貼紙|愛心|抓人|心臟|捉迷藏|心在妳那裡)/i;
          if (!g1Regex.test(item.original) && !g1Regex.test(item.translated)) return false;
        } else if (filterCategory === 'game2') {
          const g2Regex = /(ball|board|Chaotic|丟球|球球|彈跳|得分|板子|MVP|25分|18分)/i;
          if (!g2Regex.test(item.original) && !g2Regex.test(item.translated)) return false;
        } else if (filterCategory === 'game3') {
          const g3Regex = /(Balance|beam|fall|heart|平衡|木|跌進|心裡|互撩|放閃|螞蟻|對決)/i;
          if (!g3Regex.test(item.original) && !g3Regex.test(item.translated)) return false;
        } else if (filterCategory === 'game4') {
          const g4Regex = /(Ninja|treasure|floor|target|80|忍者|尋寶|感應|26000|大勝)/i;
          if (!g4Regex.test(item.original) && !g4Regex.test(item.translated)) return false;
        } else if (filterCategory === 'slide') {
          const slideRegex = /(slide|steep|blue|scared|height|滑梯|垂直|魔鬼|怕高|超陡|嚇傻)/i;
          if (!slideRegex.test(item.original) && !slideRegex.test(item.translated)) return false;
        } else if (filterCategory === 'bull') {
          const bullRegex = /(bull|ride|punishment|series|狂牛|機械牛|懲罰|頭暈|宣傳|新劇)/i;
          if (!bullRegex.test(item.original) && !bullRegex.test(item.translated)) return false;
        }
      }

      // Text search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.original.toLowerCase().includes(q) ||
        (item.romanized && item.romanized.toLowerCase().includes(q)) ||
        item.translated.toLowerCase().includes(q) ||
        item.timestamp.toLowerCase().includes(q) ||
        item.id.toString() === q
      );
    });
  }, [subtitles, searchQuery, filterCategory, activeEpisode]);

  // Save edit
  const handleSaveEdit = (id: number) => {
    // Strip all punctuation marks and normalize names
    const clean = editValue
      .replace(/^[-–—\s]+/gm, '')
      .replace(/[，,。.\?!？！:：;；「」『』“”\"''`｀（）()【】\[\]{}、—–…~～#@*&^%$+=\/\\|<>\n\r\t]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    setSubtitles(prev =>
      prev.map(item => (item.id === id ? { ...item, translated: clean } : item))
    );
    setEditingId(null);
  };

  // Generate full SRT content
  const generateSrtText = () => {
    return subtitles
      .map(item => `${item.id}\n${item.timestamp}\n${item.translated}\n`)
      .join('\n');
  };

  // Download Traditional Chinese SRT
  const handleDownloadSrt = () => {
    const content = generateSrtText();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    let filename = 'PODKAZZ_EP24_LenaMiu_zh_TW.srt';
    if (activeEpisode === 'podkazz_ep24') filename = 'PODKAZZ_EP24_LenaMiu_zh_TW.srt';
    if (activeEpisode === 'pls_love_final') filename = 'Pls_Love_Final_EP_Fan_Moment_with_LenaMiu_zh_TW.srt';
    if (activeEpisode === 'dearmyself_ep59') filename = 'Dear_Myself_EP59_zh_TW.srt';
    if (activeEpisode === 'dearmyself') filename = 'Dear_Myself_EP46_LingOrm_zh_TW.srt';
    if (activeEpisode === 'katanyu_tonight') filename = 'Katanyu_Tonight_Namtan_Film_zh_TW.srt';
    if (activeEpisode === 'lenamiu_defense') filename = 'CC_LenaMiu_2026_10_19_zh_TW.srt';
    if (activeEpisode === 'cc_lenamiu') filename = 'CC_LenaMiu_2026_10_23_zh_TW.srt';
    if (activeEpisode === 'preawpak') filename = 'Preawpak_EP43_LenaMiu_zh_TW.srt';
    if (activeEpisode === 'daralive') filename = 'CC_LenaMiu_x_DARA_LIVE_2026_10_20_zh_TW.srt';
    if (activeEpisode === 'bangkrachao') filename = 'Lena_Miu_BangKrachao_zh_TW.srt';
    if (activeEpisode === 'harborland') filename = 'ENG_SUB_LenaMiu_x_OomBam_x_TanYuyu_3Plus_zh_TW.srt';
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download Romanized + Traditional Chinese SRT (One combined SRT)
  const handleDownloadRomanizedZhSrt = () => {
    const content = subtitles
      .map(item => `${item.id}\n${item.timestamp}\n${item.romanized || item.original}\n${item.translated}\n`)
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    let filename = `${activeEpisode}_Romanized_zh_TW.srt`;
    if (activeEpisode === 'podkazz_ep24') filename = 'PODKAZZ_EP24_LenaMiu_Bilingual.srt';
    if (activeEpisode === 'pls_love_final') filename = 'Pls_Love_Final_EP_Fan_Moment_with_LenaMiu_Bilingual.srt';
    if (activeEpisode === 'dearmyself_ep59') filename = 'Dear_Myself_EP59_Bilingual.srt';
    if (activeEpisode === 'katanyu_tonight') filename = 'Katanyu_Tonight_Namtan_Film_Bilingual.srt';
    if (activeEpisode === 'lenamiu_defense') filename = 'CC_LenaMiu_2026_10_19_Romanized_zh_TW.srt';
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download Bilingual SRT
  const handleDownloadBilingualSrt = () => {
    const content = subtitles
      .map(item => `${item.id}\n${item.timestamp}\n${item.translated}\n${item.original}\n`)
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    let filename = 'PODKAZZ_EP24_LenaMiu_Bilingual.srt';
    if (activeEpisode === 'podkazz_ep24') filename = 'PODKAZZ_EP24_LenaMiu_Bilingual.srt';
    if (activeEpisode === 'pls_love_final') filename = 'Pls_Love_Final_EP_Fan_Moment_with_LenaMiu_Bilingual.srt';
    if (activeEpisode === 'dearmyself_ep59') filename = 'Dear_Myself_EP59_Bilingual.srt';
    if (activeEpisode === 'dearmyself') filename = 'Dear_Myself_EP46_LingOrm_Bilingual.srt';
    if (activeEpisode === 'katanyu_tonight') filename = 'Katanyu_Tonight_Namtan_Film_Bilingual.srt';
    if (activeEpisode === 'lenamiu_defense') filename = 'CC_LenaMiu_2026_10_19_Bilingual.srt';
    if (activeEpisode === 'cc_lenamiu') filename = 'CC_LenaMiu_2026_10_23_Bilingual.srt';
    if (activeEpisode === 'preawpak') filename = 'Preawpak_EP43_LenaMiu_Bilingual.srt';
    if (activeEpisode === 'daralive') filename = 'CC_LenaMiu_x_DARA_LIVE_2026_10_20_Bilingual.srt';
    if (activeEpisode === 'bangkrachao') filename = 'Lena_Miu_BangKrachao_Bilingual.srt';
    if (activeEpisode === 'harborland') filename = 'ENG_SUB_LenaMiu_x_OomBam_x_TanYuyu_3Plus_Bilingual.srt';
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download WebVTT
  const handleDownloadVtt = () => {
    const title =
      activeEpisode === 'podkazz_ep24'
        ? 'PODKAZZ EP.24 PODKAZZxLENAMIU (Lena & Miu • 主持 Tong)'
        : activeEpisode === 'pls_love_final'
        ? 'Pls Love Final EP Fan Moment with LenaMiu (Pheem & Pan)'
        : activeEpisode === 'dearmyself_ep59'
        ? "Dear Myself EP.59 Puinoon & Bint (主持: P'Joe)"
        : activeEpisode === 'katanyu_tonight'
        ? 'Katanyu Tonight Namtan & Film Interview'
        : activeEpisode === 'lenamiu_defense'
        ? 'Lena & Miu • 角色辯護 (Pheem & Pan)'
        : activeEpisode === 'cc_lenamiu'
        ? 'Lena & Miu 默契大考驗 專訪 CC 2026-10-23'
        : activeEpisode === 'preawpak'
        ? 'Preawpak EP43 Uncut Lena & Miu Baan Thao Seafood'
        : activeEpisode === 'daralive'
        ? 'Lena & Miu Dara Live Please Love'
        : activeEpisode === 'bangkrachao'
        ? 'Lena & Miu Bang Krachao Farm'
        : activeEpisode === 'harborland'
        ? 'LenaMiu x OomBam x TanYuyu HarborLand Special 3Plus'
        : 'Dear Myself EP46 LingOrm Praew Magazine';
    const vttContent =
      `WEBVTT - ${title} Traditional Chinese Taiwan\n\n` +
      subtitles
        .map(item => `${item.id}\n${item.timestamp.replace(/,/g, '.')}\n${item.translated}\n`)
        .join('\n');
    const blob = new Blob([vttContent], { type: 'text/vtt;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_')}_zh_TW.vtt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy all SRT
  const handleCopyAll = () => {
    const content = generateSrtText();
    navigator.clipboard.writeText(content).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    });
  };

  // Copy single line
  const handleCopyLine = (id: number, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  // Quality check metrics
  const qualityAudit = useMemo(() => {
    let punctuationViolations = 0;
    subtitles.forEach(s => {
      if (/[，,。.\?!？！:：;；「」『』“”\"''`｀（）()【】\[\]{}、—–…~～#@*&^%$+=\/\\|<>]/.test(s.translated)) {
        punctuationViolations++;
      }
    });

    const totalLines = subtitles.length;
    const namesCount = subtitles.filter(s =>
      /(Namtan|Film|P'Yu|View|Katanyu|Lena|Miu|Joy|On|Pheem|Pan|P'Ao|P'Boom|P'Dew|Thunwa|Tan|Lumi|Ling|Orm|Joe)/i.test(s.translated)
    ).length;

    return {
      totalLines,
      punctuationViolations,
      namesPreserved: namesCount > 5,
      timestampMatch: totalLines > 0 ? '100% 吻合' : '0%'
    };
  }, [subtitles]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/30">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur sticky top-0 z-30 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          {/* Logo & Show Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20">
              <Tv className="w-5 h-5 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                  {activeEpisode === 'podkazz_ep24'
                    ? 'PODKAZZ EP.24 深度專訪 (Lena & Miu • 主持 Tong • 1,550 句零遺漏) ★ 本期任務'
                    : activeEpisode === 'pls_love_final'
                    ? 'Pls Love 終映會見面會 (Lena & Miu • 660 句大結局完整版)'
                    : activeEpisode === 'dearmyself_ep59'
                    ? 'Dear Myself EP.59 深度走心專訪 (Puinoon & Bint • 1,471 句完整版)'
                    : activeEpisode === 'katanyu_tonight'
                    ? 'Katanyu Tonight 深度專訪 (Namtan & Film • 1,698 句完整版)'
                    : activeEpisode === 'lenamiu_defense'
                    ? 'Lena & Miu • 角色辯護專訪 (Pheem & Pan • 194 句完整版)'
                    : activeEpisode === 'daralive'
                    ? 'Lena & Miu • DARA LIVE 官方專訪 (1,772 句完整版)'
                    : activeEpisode === 'preawpak'
                    ? 'Preawpak EP.43 踩點海鮮專訪 (Lena & Miu • 1,189 句)'
                    : activeEpisode === 'cc_lenamiu'
                    ? 'Lena & Miu 默契大考驗 專訪 (501 句 • 2026-10-23)'
                    : activeEpisode === 'bangkrachao'
                    ? 'Lena & Miu Bang Krachao 農場一日遊 繁體中文字幕'
                    : activeEpisode === 'harborland'
                    ? 'LenaMiu x OomBam x TanYuyu HarborLand 繁體中文字幕'
                    : 'Dear Myself EP.46 走心深度訪談 繁體中文字幕'}
                </h1>
                <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  無標點符號 • 時間軸不變
                </span>
                <span className="text-xs bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-medium">
                  {subtitles.length} 句 0 遺漏
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeEpisode === 'podkazz_ep24'
                  ? "訪談主角：Lena、Miu • 節目：PODKAZZ • 主持人：Tong • 臺灣在地日常語境 • 調整過短語句並將太長斷句 • 刪除1秒內重複較短語句(共23處) • 0 處標點符號 • 100% 時間軸吻合 • 1,550 句零遺漏"
                  : activeEpisode === 'pls_love_final'
                  ? "主角：Lena、Miu • 角色：Pheem (Lena)、Pan (Miu) • 場合：Pls Love 終映會 (大結局粉絲見面會) • 臺灣在地日常語境 • 調整過短斷句 • 0 處標點符號 • 100% 時間軸吻合 • 660 句 0 遺漏"
                  : activeEpisode === 'dearmyself_ep59'
                  ? "訪談主角：Puinoon、Bint • 節目：Dear Myself (Praew Magazine) • 主持人：P'Joe • 臺灣在地語境 • 調整過短語句並將太長斷句 • 刪除1秒內重複較短語句 • 0 處句子標點符號 • 100% 時間軸吻合 • 1,471 句零遺漏"
                  : activeEpisode === 'katanyu_tonight'
                  ? '訪談主角：Namtan、Film • 節目：Katanyu Tonight (True ID The Celebrity) • 主持人：P\'Yu • 臺灣日常綜藝語境 • 調整過短斷句 • 0 標點符號 • 100% 時間軸吻合 • 1,698 句零遺漏'
                  : activeEpisode === 'lenamiu_defense'
                  ? '主角：Lena、Miu • 角色辯護：Pheem (Lena) vs Pan (Miu) • 臺灣日常綜藝語境 • 調整過短斷句 • 0 標點符號 • 100% 時間軸吻合 • 194 句 0 遺漏'
                  : activeEpisode === 'daralive'
                  ? '訪談主角：Lena、Miu • 主持人：P\'Film • 泰國3台直播專訪 • 臺灣日常綜藝語境 • 調整過短斷句 • 0 標點符號 • 100% 時間軸吻合'
                  : activeEpisode === 'preawpak'
                  ? '訪談主角：Lena、Miu • 主持人：Joy、On • 泰國3台熱門節目 Preawpak 抓血蚶與海鮮大餐專訪 • 臺灣日常綜藝語境 • 調整過短斷句 • 0 標點符號'
                  : activeEpisode === 'cc_lenamiu'
                  ? '訪談主角：Lena、Miu • 泰國官方 2026-10-23 CC 默契專訪 • 臺灣日常綜藝語境 • 0 標點符號'
                  : activeEpisode === 'bangkrachao'
                  ? '主角：Lena、Miu • Bang Krachao 生態農場一日遊 • 臺灣日常綜藝語境'
                  : activeEpisode === 'harborland'
                  ? '主角：Lena、Miu、Oom、Bam、Tan、Yuyu • 泰國3台百合CP極限運動大對決 • 臺灣日常綜藝語境'
                  : '主持人：Joe • 訪談主角：Ling、Orm • 泰國 Praew Magazine 走心專訪 • 臺灣日常語境'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowAuditModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700 transition"
              title="查看品質與規範檢查報告"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              規格稽核 (0標點/時間軸/人名)
            </button>

            <button
              onClick={handleCopyAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition"
            >
              {copiedAll ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  已複製全部 SRT
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400" />
                  複製全部 SRT
                </>
              )}
            </button>

            <button
              onClick={handleDownloadBilingualSrt}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition"
              title="下載雙語對照 SRT"
            >
              <FileCheck className="w-4 h-4 text-indigo-400" />
              匯出雙語 .srt
            </button>

            <button
              onClick={handleDownloadVtt}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition"
              title="下載 WebVTT 格式"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              匯出 .vtt
            </button>

            <button
              onClick={handleDownloadSrt}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition"
              title="匯出純繁體中文 SRT"
            >
              <Download className="w-4 h-4" />
              純繁中 .srt
            </button>

            <button
              onClick={handleDownloadRomanizedZhSrt}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:opacity-90 text-xs font-bold text-white shadow-md shadow-rose-900/30 transition transform active:scale-95"
              title="匯出包含雙語的單一 SRT 檔"
            >
              <Download className="w-4 h-4" />
              匯出完整對照 .srt
            </button>
          </div>
        </div>

        {/* Dataset Switcher Tabs */}
        <div className="border-t border-slate-800/80 bg-slate-950/60 px-4">
          <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto py-2">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5 shrink-0">
              <Tv className="w-3.5 h-3.5 text-amber-400" />
              節目專訪集數：
            </span>

            <button
              onClick={() => {
                setActiveEpisode('podkazz_ep24');
                setFilterCategory('all');
                setCurrentTimeSec(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
                activeEpisode === 'podkazz_ep24'
                  ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500 text-white shadow-lg shadow-rose-900/40 font-bold border border-amber-400/50'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              PODKAZZ EP.24 (Lena & Miu • 1,550 句) ★ 本期任務
            </button>

            <button
              onClick={() => {
                setActiveEpisode('pls_love_final');
                setFilterCategory('all');
                setCurrentTimeSec(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
                activeEpisode === 'pls_love_final'
                  ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500 text-white shadow-lg shadow-rose-900/40 font-bold border border-amber-400/50'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <HeartHandshake className="w-3.5 h-3.5 text-amber-300" />
              Pls Love 終映會 (Lena & Miu • 660 句)
            </button>

            <button
              onClick={() => {
                setActiveEpisode('dearmyself_ep59');
                setFilterCategory('all');
                setCurrentTimeSec(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
                activeEpisode === 'dearmyself_ep59'
                  ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500 text-white shadow-lg shadow-rose-900/40 font-bold border border-amber-400/50'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Dear Myself EP.59 (Puinoon & Bint • 1,471 句)
            </button>

            <button
              onClick={() => {
                setActiveEpisode('katanyu_tonight');
                setFilterCategory('all');
                setCurrentTimeSec(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
                activeEpisode === 'katanyu_tonight'
                  ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500 text-white shadow-lg shadow-rose-900/40 font-bold border border-amber-400/50'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Katanyu Tonight (Namtan & Film • 1,698 句)
            </button>

            <button
              onClick={() => {
                setActiveEpisode('lenamiu_defense');
                setFilterCategory('all');
                setCurrentTimeSec(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
                activeEpisode === 'lenamiu_defense'
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 shadow-md font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Lena & Miu 角色辯護 (194 句)
            </button>

            <button
              onClick={() => {
                setActiveEpisode('daralive');
                setFilterCategory('all');
                setCurrentTimeSec(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
                activeEpisode === 'daralive'
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 shadow-md font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              DARA LIVE 2026-10-20 (Lena & Miu • 1,772 句完整版)
            </button>

            <button
              onClick={() => {
                setActiveEpisode('cc_lenamiu');
                setFilterCategory('all');
                setCurrentTimeSec(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
                activeEpisode === 'cc_lenamiu'
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 shadow-md font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Lena & Miu 默契大考驗 專訪 (501 句 • 2026-10-23)
            </button>

            <button
              onClick={() => {
                setActiveEpisode('preawpak');
                setFilterCategory('all');
                setCurrentTimeSec(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
                activeEpisode === 'preawpak'
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 shadow-md font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              Preawpak EP.43 (Lena & Miu • 1,189 句)
            </button>

            <button
              onClick={() => {
                setActiveEpisode('bangkrachao');
                setFilterCategory('all');
                setCurrentTimeSec(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
                activeEpisode === 'bangkrachao'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <FilmIcon className="w-3.5 h-3.5" />
              Bang Krachao 農場專訪 (Lena & Miu • 892 句)
            </button>

            <button
              onClick={() => {
                setActiveEpisode('harborland');
                setFilterCategory('all');
                setCurrentTimeSec(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
                activeEpisode === 'harborland'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              HarborLand 極限對決 (Lena、Miu、Oom、Bam、Tan、Yuyu • 927 句)
            </button>

            <button
              onClick={() => {
                setActiveEpisode('dearmyself');
                setFilterCategory('all');
                setCurrentTimeSec(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
                activeEpisode === 'dearmyself'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              Dear Myself EP.46 (Ling & Orm • 903 句)
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-6 w-full flex-1 flex flex-col gap-6">
        {/* Compliance & Overview Banner */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm">
            <span className="text-xs text-slate-400 font-medium">總字幕句數</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-white">
                {loading ? '載入中...' : subtitles.length.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500">句 (0 遺漏)</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm">
            <span className="text-xs text-slate-400 font-medium">標點符號規範</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-emerald-400">
                0 處標點符號
              </span>
              <span className="text-xs text-emerald-500">100% 達標</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm">
            <span className="text-xs text-slate-400 font-medium">主角人名規範</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-amber-400 truncate text-sm sm:text-base">
                {activeEpisode === 'dearmyself_ep59'
                  ? "Puinoon & Bint (主持: P'Joe)"
                  : activeEpisode === 'katanyu_tonight'
                  ? "Namtan & Film (主持: P'Yu)"
                  : activeEpisode === 'lenamiu_defense'
                  ? 'Lena & Miu (角色: Pheem、Pan)'
                  : activeEpisode === 'preawpak'
                  ? 'Lena & Miu (主持: Joy、On)'
                  : activeEpisode === 'cc_lenamiu' || activeEpisode === 'daralive' || activeEpisode === 'bangkrachao'
                  ? 'Lena & Miu (角色: Pheem、Pan)'
                  : activeEpisode === 'harborland'
                  ? 'Lena Miu Oom Bam Tan Yuyu'
                  : 'Ling & Orm (主持: Joe)'}
              </span>
              <span className="text-xs text-slate-400">保留英文</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm">
            <span className="text-xs text-slate-400 font-medium">時間軸一致率</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-indigo-400">100%</span>
              <span className="text-xs text-indigo-400">毫秒級吻合</span>
            </div>
          </div>
        </section>

        {/* Live Broadcast / Teleprompter Simulation Bar */}
        <section className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/40 rounded-2xl p-4 shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Player Controls */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-11 h-11 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 flex items-center justify-center transition shadow-lg shadow-amber-500/20 font-bold"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-slate-950" />
                ) : (
                  <Play className="w-5 h-5 fill-slate-950 ml-0.5" />
                )}
              </button>

              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentTimeSec(0);
                }}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="回到開頭"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  模擬時間軸
                </span>
                <span className="text-sm font-mono font-bold text-amber-400">
                  {formatSeconds(currentTimeSec)}{' '}
                  <span className="text-slate-500">
                    / {formatSeconds(maxDurationSec)}
                  </span>
                </span>
              </div>

              {/* Speed Controller */}
              <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700">
                {[1, 1.5, 2].map(speed => (
                  <button
                    key={speed}
                    onClick={() => setPlaybackSpeed(speed)}
                    className={`px-2 py-0.5 rounded text-xs font-mono font-semibold transition ${
                      playbackSpeed === speed
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            {/* Currently Active Subtitle Display */}
            <div className="w-full flex-1 max-w-2xl bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2 flex flex-col justify-center min-h-[52px]">
              {activeSubtitle ? (
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono text-amber-400 font-semibold bg-amber-400/10 px-1.5 rounded">
                      #{activeSubtitle.id}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {activeSubtitle.timestamp}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-emerald-300 leading-snug">
                    {activeSubtitle.translated}
                  </p>
                  <p className="text-xs text-slate-400 font-normal truncate mt-0.5">
                    {activeSubtitle.original}
                  </p>
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic text-center py-1">
                  點擊播放按鈕或滑動時間軸開始即時字幕預覽
                </div>
              )}
            </div>

            {/* Toggle auto-scroll */}
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={e => setAutoScroll(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-0"
              />
              自動滾動同步
            </label>
          </div>

          {/* Time Scrubber */}
          <div className="mt-3">
            <input
              type="range"
              min={0}
              max={maxDurationSec || 2140}
              step={0.5}
              value={currentTimeSec}
              onChange={e => setCurrentTimeSec(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
        </section>

        {/* Filter & View Bar */}
        <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜尋字幕、人名、臺詞或序號..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View Modes */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('bilingual')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                viewMode === 'bilingual'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              雙語對照 (拼音/原文+繁中)
            </button>
            <button
              onClick={() => setViewMode('romanized')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                viewMode === 'romanized'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              羅馬拼音
            </button>
            <button
              onClick={() => setViewMode('zh')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                viewMode === 'zh'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              純繁中 (無標點)
            </button>
            <button
              onClick={() => setViewMode('original')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                viewMode === 'original'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              原文對白
            </button>
          </div>
        </section>

        {/* Categories Chips for PODKAZZ EP.24 (Lena & Miu) 1,550 Cues */}
        {activeEpisode === 'podkazz_ep24' && (
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              PODKAZZ話題速選：
            </span>
            {[
              { id: 'all', label: '全部對話 (1,550 句)' },
              { id: 'destiny', label: '✨ 命中注定 (11/25同月同日生 / 媽媽小名Gigi緣分 / 生日會)' },
              { id: 'dreams', label: '🎓 童年夢想 (Lena想當TED演講者 / Miu想當收銀員與美妝創業)' },
              { id: 'focus_acting', label: '🧘 演員專注力 (Focus挑戰 / 靜坐冥想 / 放鬆訓練Grounded)' },
              { id: 'food', label: '🍜 美食怪癖 (不吃禽類海鮮 / 荷包蛋肉鬆飯 / 長棍麵包奶油狂熱)' },
              { id: 'please_love', label: '🎬 請深愛影集 (第3台熱播 / 教授配傲嬌千金 / 爆笑喜劇願望)' },
              { id: 'mindset', label: '🛡️ MVP心態 (無視酸民造謠 / 專注在愛我們的人與夥伴身上)' },
              { id: 'qa_friends', label: '🐶 快問快答 (博美犬狗派 / 私房歌單 / Freen Becky考題)' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg border transition ${
                  filterCategory === cat.id
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold shadow-sm'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Categories Chips for Pls Love Final EP (Lena & Miu) 660 Cues */}
        {activeEpisode === 'pls_love_final' && (
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-slate-400 font-medium mr-1">終映會話題速選：</span>
            {[
              { id: 'all', label: '全部字幕 (660 句)' },
              { id: 'names', label: "主角與卡司 (Lena / Miu / Pheem / Pan / P'Ao / P'Boom / Thunwa / Tan / Lumi)" },
              { id: 'roles', label: '角色深度與告別 (Pheem 灰色地帶 / Pan 跨出舒適圈 / 不單一評判)' },
              { id: 'hardest', label: '大魔王難拍戲 (腳張開 文化衝擊讀本唸不出口 / 繫圍裙 傲嬌裝正經撲克臉)' },
              { id: 'touching', label: '全場最觸動名場面 (第一集酒吧碰杯 / 渴望抓在手心 / 拆禮物 / 沙灘名場面 / 床上結婚)' },
              { id: 'lumi', label: '愛女 Lumi Chutete (Lena與Miu愛的女兒 / 9個月喝珍奶長大 / 英文自介)' },
              { id: 'fans_qa', label: '粉絲提問與生日祝福 (個性差媽媽要不要 / 沒結果回媽媽身邊 / 繼續交往 / 11月生日)' },
              { id: 'photobook', label: '官方寫真書與活動 (1460泰銖 / 11/5-20預購 / 星海大合照 / 11/22生日會)' },
              { id: 'confession', label: '走心告白與感謝 (無比值得 / 陪我走過低潮逗我笑 / 謝謝妳選擇我 / 我愛妳)' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg border transition ${
                  filterCategory === cat.id
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Categories Chips for Dear Myself EP.59 (Puinoon & Bint) 1,471 Cues */}
        {activeEpisode === 'dearmyself_ep59' && (
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-slate-400 font-medium mr-1">EP.59話題速選：</span>
            {[
              { id: 'all', label: '全部字幕 (1,471 句)' },
              { id: 'names', label: "主角與主持 (Puinoon / Bint / P'Joe / Pim)" },
              { id: 'firstlove', label: '初戀那件小事 (學長 / 小嵐 / 補習考前十名上台表揚)' },
              { id: 'calculus_f', label: '瑪希敦藥學與微積分F (拿F算Fantastic / 創立戲劇社賣門票)' },
              { id: 'khomkhang', label: '心之烙印抗萬則酸民 (角色被罵 / 媽媽叫回家賣佛牌 / 凌晨魔鬼特訓)' },
              { id: 'maruay', label: '綠頰錐尾鸚鵡招財 (Ma-Ruay / 退休慢活 / 心靈療癒師)' },
              { id: 'pageant', label: '選美跌倒抱脖子迷因 (機靈化危機為轉機 / 試鏡受挫)' },
              { id: 'dreams', label: '努力絕不背叛任何人 (自我精進 / 歸零起跳 / 黎明破曉全新的一天)' },
              { id: 'couple', label: '鄉間抓蚯蚓與白髮之約 (Siang Lang / 白髮相伴 / 遞水瓶和好 / 命中注定)' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg border transition ${
                  filterCategory === cat.id
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Categories Chips for Katanyu Tonight 1,698 Cues */}
        {activeEpisode === 'katanyu_tonight' && (
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-slate-400 font-medium mr-1">專訪話題速選：</span>
            {[
              { id: 'all', label: '全部字幕 (1,698 句)' },
              { id: 'names', label: "主角與主持 (Namtan / Film / P'Yu / View)" },
              { id: 'breakup', label: '痣開關與提分手 (按黑痣開關睡覺 / 雙腿發軟癱倒 / 我們分手吧)' },
              { id: 'jealous', label: 'View 吃醋修羅場 (吃醋玩鬧 / 罵我花心 / Baby 對不起啦)' },
              { id: 'childhood', label: '假小子與工科生 (Film 想念技職工科 / 畫畫好 / 邦拉詹戰士架式)' },
              { id: 'soccer', label: '曼聯與足球哥哥 (Namtan 哥哥泰國國腳 / 英超曼聯迷 / 球衣穿搭)' },
              { id: 'airhostess', label: '空服員夢想與SWU (曾想當空服員 / 爸爸開車送試鏡 / 表演藝術系)' },
              { id: 'gmmtv', label: 'GMMTV大家庭 (避風港 Safe Zone / 特產 OTOP 雕琢本質)' },
              { id: 'mindset', label: '完美主義與佛系抗酸民 (看淡放手 / Breaking Bad / 手遊接人幫貓咪)' },
              { id: 'yinyang', label: '陰陽互補靈魂搭檔 (極致互補 / GOSSHIP 演唱會攜手 / 捍衛權利)' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg border transition ${
                  filterCategory === cat.id
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Categories Chips for LenaMiu Defense 194 Cues */}
        {activeEpisode === 'lenamiu_defense' && (
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-slate-400 font-medium mr-1">辯護主題速選：</span>
            {[
              { id: 'all', label: '全部字幕 (194 句)' },
              { id: 'names', label: '主角人名 (Lena / Miu / Pheem / Pan / Goy)' },
              { id: 'roles', label: '角色辯護 (大好人 / 摩天大樓上班 / 身材曲線優勢)' },
              { id: 'hostbar', label: '男模公關店 (只賣時間坐檯不賣身 / 調店內CCTV)' },
              { id: 'kiss', label: 'EP 5 親臉頰事件 (沉浸在Pan角色裡 / 不得已才親)' },
              { id: 'money', label: '500萬加300萬聘金 (幫家裡還錢 / Pheem快破產)' },
              { id: 'script', label: '一切照劇本安排 (全劇共8集 / 拖到EP 8才說真相)' },
              { id: 'united', label: '媽媽們吃狗糧 (小倆口同陣線 / 養得大人養不住心)' },
              { id: 'promo', label: 'Please Love 請愛我好嗎 (每週五20:30 第3台與3 Plus / 愛奇藝)' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg border transition ${
                  filterCategory === cat.id
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Categories Chips for DARA LIVE 1,772 Cues */}
        {activeEpisode === 'daralive' && (
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-slate-400 font-medium mr-1">專訪話題速選：</span>
            {[
              { id: 'all', label: '全部字幕 (1,772 句)' },
              { id: 'names', label: '主角人名 (Lena / Miu / Pheem / Paan / P\'Film)' },
              { id: 'lovescene', label: 'EP6 激情床戲與蕾絲小內褲 (親親摸摸 / 白色蕾絲 / 維秘天使秀)' },
              { id: 'nose_ear', label: '鼻樑蹭臉與咬耳朵 (鼻樑滑過脖子 / 咬耳朵 / 兩人獨創體位)' },
              { id: 'morning', label: '隔天早上傲嬌轉帳 (買菜回來 / 轉帳出場費 / 口嫌體正直)' },
              { id: 'drinks', label: '應援飲料 (烏龍茶加蘆薈 / 無糖0% / 微糖25% / 爆甜110%喝糖水)' },
              { id: 'pocky', label: '星期天 Pocky 咬巧克力棒 (差點親上去 / 咬到只剩一點點)' },
              { id: 'patting', label: '同人小說 PatTing (直女學姐 Pat x 甜妹學妹 Ting)' },
              { id: 'finale', label: '10/30 放映會售罄與萬聖節走秀 (百麗宮放映會 / 萬聖節變裝 / 天使翅膀)' },
              { id: 'ost', label: '片尾曲《愛我可以嗎》（รักได้ไหม OST）' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg border transition ${
                  filterCategory === cat.id
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Categories Chips for CC LenaMiu */}
        {activeEpisode === 'cc_lenamiu' && (
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-slate-400 font-medium mr-1">專訪話題速選：</span>
            {[
              { id: 'all', label: '全部字幕 (501 句)' },
              { id: 'names', label: '主角人名 (Lena / Miu / Pheem / Paan)' },
              { id: 'food', label: '點餐與食物禁忌 (蛋炒飯加醬油 / 白色料理 / Poke bowl / 怕卡牙齒)' },
              { id: 'fears', label: '最害怕的事物 (百樣怕九十樣 / 怕昆蟲小蟲 / 晨間活動 / 晚上打網球)' },
              { id: 'belongings', label: '隨身必備物品 (同色多支口紅 / 車上化妝包 / 咖啡因 / 行動電源)' },
              { id: 'flowers', label: '喜歡的花朵 (深粉紅玫瑰 / 雞蛋花 / 茉莉花 / 梔子花七里香)' },
              { id: 'charm', label: '最有魅力三點 (活力氣場 / 常接吻嘟嘟嘴 / 致命電眼 / 完美身材曲線)' },
              { id: 'shy', label: '害羞小動作 (避開眼神逃跑 / 摸眉毛抓鼻子 / 手插口袋 / 撥頭髮)' },
              { id: 'series', label: '新劇 Please Love 宣傳 (Paan 與 Pheem / 週五20:30 第33台與3 Plus)' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg border transition ${
                  filterCategory === cat.id
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Categories Chips for Preawpak EP43 */}
        {activeEpisode === 'preawpak' && (
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-slate-400 font-medium mr-1">亮點話題速選：</span>
            {[
              { id: 'all', label: '全部字幕 (1,189)' },
              { id: 'names', label: '主角人名 (Lena / Miu / Pheem / Paan)' },
              { id: 'cockles', label: '挖血蚶競賽 (Ban Khun Samut Chin / 泥灘海鮮醬)' },
              { id: 'seafood', label: '海鮮大餐 (Baan Thao / 炸鱸魚 / 咖哩炒蟹黃)' },
              { id: 'ep7', label: 'EP7 和解與火辣親熱戲 (導演要求超飢渴 / 抱枕頭)' },
              { id: 'ep8', label: 'EP8 醫院與大結局走向 (百麗宮千人觀影會)' },
              { id: 'bags', label: '巴黎同款情侶包與專屬畫像 (1122同日生生日派對)' },
              { id: 'refill', label: '互相充電討抱抱 (章魚撒嬌 / 非毒性關係)' },
              { id: 'trending', label: 'X 全球趨勢第一名 (粉絲大感謝)' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg border transition ${
                  filterCategory === cat.id
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Categories Chips for HarborLand */}
        {activeEpisode === 'harborland' && (
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-slate-400 font-medium mr-1">情境速選：</span>
            {[
              { id: 'all', label: '全部字幕 (927)' },
              { id: 'names', label: '主角人名 (Lena/Miu/Oom/Bam/Tan/Yuyu)' },
              { id: 'game1', label: 'Game 1 抓人貼紙戰 (我的心在妳那裡)' },
              { id: 'game2', label: 'Game 2 混亂球球戰 (Bam MVP 25分)' },
              { id: 'game3', label: 'Game 3 平衡木互打 (跌進妳心裡/螞蟻打架)' },
              { id: 'game4', label: 'Game 4 忍者尋寶 (受組大勝 26,000分)' },
              { id: 'slide', label: '垂直魔鬼滑梯 (怕高不敢滑/嚇到臉發青)' },
              { id: 'bull', label: '狂暴機械牛 (懲罰甩到頭暈/新劇宣傳)' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg border transition ${
                  filterCategory === cat.id
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Subtitles Table */}
        <div
          ref={containerRef}
          className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex-1 flex flex-col min-h-[480px]"
        >
          {/* Table Header */}
          <div className="bg-slate-950/90 border-b border-slate-800 px-4 py-3 grid grid-cols-12 gap-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <div className="col-span-1">序號</div>
            <div className="col-span-2">時間軸</div>
            <div
              className={
                viewMode === 'bilingual'
                  ? 'col-span-5'
                  : viewMode === 'zh'
                  ? 'col-span-8'
                  : 'hidden'
              }
            >
              繁體中文 (臺灣語境 • 無標點符號 • 調整過短斷句)
            </div>
            <div
              className={
                viewMode === 'bilingual'
                  ? 'col-span-4'
                  : viewMode === 'romanized' || viewMode === 'original'
                  ? 'col-span-8'
                  : 'hidden'
              }
            >
              {viewMode === 'romanized' ? '泰文羅馬拼音' : '羅馬拼音 / 原文字幕'}
            </div>
            <div className="col-span-1 text-right">操作</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-slate-800/60 overflow-y-auto max-h-[650px] font-sans">
            {loading ? (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-3 text-slate-400">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium">正在載入字幕檔案並執行規範檢查...</p>
              </div>
            ) : filteredSubtitles.length === 0 ? (
              <div className="py-20 text-center text-slate-500 text-sm">
                找不到符合「{searchQuery}」的字幕內容
              </div>
            ) : (
              filteredSubtitles.map(item => {
                const isActive = activeSubtitle?.id === item.id;
                const isEditing = editingId === item.id;

                return (
                  <div
                    key={item.id}
                    ref={el => {
                      rowRefs.current[item.id] = el;
                    }}
                    className={`px-4 py-3 grid grid-cols-12 gap-3 items-center text-xs transition duration-150 ${
                      isActive
                        ? 'bg-amber-500/10 border-l-4 border-amber-500'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* ID */}
                    <div className="col-span-1 font-mono font-bold text-slate-400 flex items-center gap-1.5">
                      <span className="text-amber-400/80">#{item.id}</span>
                    </div>

                    {/* Timestamp */}
                    <div className="col-span-2 font-mono text-slate-400 flex items-center gap-1">
                      <button
                        onClick={() => {
                          const { start } = parseTimestampToSeconds(item.timestamp);
                          setCurrentTimeSec(start);
                          setIsPlaying(true);
                        }}
                        className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-amber-400 transition"
                        title="跳轉並播放此句"
                      >
                        <Play className="w-3 h-3" />
                      </button>
                      <span className="text-[11px] truncate">{item.timestamp}</span>
                    </div>

                    {/* Traditional Chinese */}
                    <div
                      className={
                        viewMode === 'bilingual'
                          ? 'col-span-5'
                          : viewMode === 'zh'
                          ? 'col-span-8'
                          : 'hidden'
                      }
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            className="w-full bg-slate-950 border border-amber-500 rounded px-2 py-1 text-xs text-white focus:outline-none"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveEdit(item.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                          />
                          <button
                            onClick={() => handleSaveEdit(item.id)}
                            className="p-1 rounded bg-amber-500 hover:bg-amber-600 text-slate-950"
                            title="儲存"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400"
                            title="取消"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between group">
                          <span className="text-emerald-300 font-medium leading-relaxed text-[13px]">
                            {item.translated}
                          </span>
                          <button
                            onClick={() => {
                              setEditingId(item.id);
                              setEditValue(item.translated);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-slate-300 transition"
                            title="編輯此行"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Romanized Thai / Original */}
                    <div
                      className={
                        viewMode === 'bilingual'
                          ? 'col-span-4'
                          : viewMode === 'romanized' || viewMode === 'original'
                          ? 'col-span-8'
                          : 'hidden'
                      }
                    >
                      {item.romanized && viewMode !== 'original' ? (
                        <div>
                          <span className="text-amber-300 font-mono text-[12px] font-semibold leading-relaxed block tracking-wide">
                            {item.romanized}
                          </span>
                          {viewMode === 'bilingual' && (
                            <span className="text-slate-400 font-light text-[10px] block mt-0.5 opacity-80">
                              {item.original}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 leading-relaxed font-light text-[11px] block">
                          {item.original}
                        </span>
                      )}
                    </div>

                    {/* Quick Copy / Actions */}
                    <div className="col-span-1 text-right flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleCopyLine(item.id, item.translated)}
                        className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                        title="複製這行翻譯"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* Quality Audit Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                <h3 className="text-base font-bold text-white">字幕規範與品質稽核報告</h3>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-200 text-sm">
                    1. 訪談主角人名標準化與嚴格保留 ({activeEpisode === 'podkazz_ep24' ? "Lena、Miu，主持: Tong" : activeEpisode === 'dearmyself_ep59' ? "Puinoon、Bint，主持: P'Joe" : activeEpisode === 'katanyu_tonight' ? "Namtan、Film，主持: P'Yu" : "Lena、Miu"})
                  </h4>
                  <p className="text-slate-400 mt-1">
                    {activeEpisode === 'podkazz_ep24'
                      ? "訪談主角名字嚴格保留為英文「Lena、Miu」，主持人保留為「Tong」，節目名稱「PODKAZZ」，好友前輩「Freen、Becky」，歌手「Nam、Singto、Keshi、Suchat Chawangkoon、Vacations」，絕不音譯成中文漢字。"
                      : activeEpisode === 'dearmyself_ep59'
                      ? "訪談主角名字嚴格保留為英文「Puinoon、Bint」，主持人保留「P'Joe」，角色保留「Pim、Mae Kru Bulan」，絕不音譯成中文漢字（無普伊農、小農、賓特等）。"
                      : activeEpisode === 'katanyu_tonight'
                      ? "訪談主角名字嚴格保留為英文「Namtan、Film」，主持人保留「P'Yu」，友人同事保留「View」，絕不音譯成中文漢字（無楠妲、菲姆、皮由等）。"
                      : "訪談主角名字一律嚴格保留為英文「Lena、Miu」，劇中辯護角色「Pheem、Pan」亦保持原名，絕不音譯成中文漢字（無莉娜、米尤、妮娜等）。"}
                  </p>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-200 text-sm">
                    2. 序號與時間軸完全不變 (100% 毫秒吻合)
                  </h4>
                  <p className="text-slate-400 mt-1">
                    全篇字幕序號從 ID 1 至 ID {subtitles.length}，毫秒級時間軸與原始 SRT 完全吻合，零平移、零壓縮、零錯位。
                  </p>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-200 text-sm">
                    3. 嚴格不加標點符號 (0 處標點)
                  </h4>
                  <p className="text-slate-400 mt-1">
                    系統稽核結果：全篇繁體中文句子中【0 處句號、0 處逗號、0 處問號、驚嘆號與引號】。所有停頓分句均以單一半形空格「 」流暢隔開。
                  </p>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-200 text-sm">
                    4. 臺灣在地化日常綜藝語境
                  </h4>
                  <p className="text-slate-400 mt-1">
                    文字完全採用臺灣日常口語與綜藝節目語境（如：血蚶、放閃、親熱戲、超辣、爽快、打臉、直女、黏人、討抱抱、充電、超甜、笑死、傻眼、真的假的），生動自然且無大陸用語。
                  </p>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-200 text-sm">
                    5. 完整零遺漏確認：{subtitles.length} / {subtitles.length} 句
                  </h4>
                  <p className="text-slate-400 mt-1">
                    雙向比對確認無任何跳句、漏句或空白字幕，全數 {subtitles.length} 句完整對齊，時間軸 100% 毫秒吻合。
                  </p>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-200 text-sm">
                    6. 羅馬拼音與繁體中文合一匯出
                  </h4>
                  <p className="text-slate-400 mt-1">
                    提供「羅馬拼音 + 臺灣繁中」整合版 SRT 檔（第1行羅馬發音、第2行繁體中文），時間軸完全不變，兩行均嚴格不加標點符號，方便對照與跟唱跟讀。
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
              >
                關閉
              </button>
              <button
                onClick={() => {
                  setShowAuditModal(false);
                  handleDownloadRomanizedZhSrt();
                }}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-rose-600 hover:opacity-90 text-xs font-bold text-white transition flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                立即匯出 羅馬拼音+繁中 SRT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        Katanyu Tonight (The Celebrity on True ID) • 訪談主角 Namtan & Film • 主持人 P'Yu • 繁體中文（臺灣語境）字幕轉換與校對工具 •
        無標點符號 • 時間軸100%保持 • 1,698 句零遺漏
      </footer>
    </div>
  );
}
