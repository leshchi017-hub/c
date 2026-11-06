import json
import re

# Complete 1-to-1 Romanized Thai and Traditional Chinese for each cue ID from 1 to 194
# Constraints:
# 1. Zero punctuation (no commas, periods, quotes, colons, question/exclamation marks)
# 2. English names preserved: Lena, Miu, Pheem, Pan, Goy, CCTV, EP 5, EP 8, Please Love, What, 3Plus, iQIYI
# 3. Taiwan colloquial, natural, conversational flow
# 4. 100% timestamp and count integrity

entries = {
    1: {
        "thai": "รักแม่บ้างอย่ารักแต่เมะลูก",
        "rom": "Rak mae bang ya rak tae me luk",
        "zh": "多少愛一下媽媽 別只顧著愛攻方啊孩子"
    },
    2: {
        "thai": "รักเมะมาก",
        "rom": "Rak me mak",
        "zh": "超愛攻方"
    },
    3: {
        "thai": "ตายละเฮ้ย",
        "rom": "Tai la hoei",
        "zh": "哎唷我的天啊"
    },
    4: {
        "thai": "ลูกพิมพ์ไม่ผิด",
        "rom": "Luk Pheem mai phit",
        "zh": "我家 Pheem 沒有錯"
    },
    5: {
        "thai": "ลูกป่านเป็นคนดี",
        "rom": "Luk Pan pen khon di",
        "zh": "我家 Pan 是個大好人"
    },
    6: {
        "thai": "โดีที่ไหนทำงานที่บารโฮสคะ",
        "rom": "Di thi nai tham ngan thi bar host kha",
        "zh": "哪裡好 人家是在男模公關店上班耶"
    },
    7: {
        "thai": "คนดีก็ทำงานที่ไหนได้ทั้งนั้นถ้ามันเป็น",
        "rom": "Khon di ko tham ngan thi nai dai thang nan tha man pen",
        "zh": "只要是正當工作 好人在哪裡工作都可以"
    },
    8: {
        "thai": "งานสุจริตใช่มั้ลูก",
        "rom": "Ngan sutcharit chai mai luk",
        "zh": "對吧孩子"
    },
    9: {
        "thai": "ถูกค่ะ",
        "rom": "Thuk kha",
        "zh": "沒錯"
    },
    10: {
        "thai": "คนดีทำงานออฟฟิศตึกสูงหลักฟ้าค่ะ",
        "rom": "Khon di tham ngan office tuek sung lak fa kha",
        "zh": "好人是在摩天辦公大樓裡上班的好嗎"
    },
    11: {
        "thai": "คนดีก็ทำงานแบบไม่ต้องตึกซึฟึ",
        "rom": "Khon di ko tham ngan baep mai tong tuek",
        "zh": "好人上班也不一定非得要"
    },
    12: {
        "thai": "ตุกตึกสูงฟ้าก็ได้ค่ะ",
        "rom": "Tuek sung fa ko dai kha",
        "zh": "在摩天大樓裡啊"
    },
    13: {
        "thai": "ตุกตึกสูงฟ้าก็ได้ค่ะ อื",
        "rom": "Tuek sung fa ko dai kha ue",
        "zh": "就算不在摩天大樓也可以 嗯"
    },
    14: {
        "thai": "คนดีทำงานแต่งตัวไม่โปรนะคะหรือเปล่าวะ",
        "rom": "Khon di tham ngan taeng tua mai po na kha rue plao wa",
        "zh": "好人上班可不會穿得這麼暴露 還是會啊"
    },
    15: {
        "thai": "แต่พิมพ์แต่งตัวโปรมากเออนั่นดิเออนั่นดิ",
        "rom": "Tae Pheem taeng tua po mak eo nan di eo nan di",
        "zh": "可是 Pheem 穿得超火辣 欸對啊對啊"
    },
    16: {
        "thai": "เสวยปั่นแค่แบบว่าเข้าใจเรือนร่างสรีระ",
        "rom": "Pan khae baep wa khao chai ruean rang sarira",
        "zh": "Pan 只是懂得自己的身材曲線"
    },
    17: {
        "thai": "ตัวเองรู้จักในการพรีเซนรูปได้",
        "rom": "Tua eng ru chak nai kan present dai",
        "zh": "懂得展現自己的身形優勢"
    },
    18: {
        "thai": "ลูกเธอขายเรือนร่าง",
        "rom": "Luk thoe khai ruean rang",
        "zh": "妳家女兒根本是在出賣肉體"
    },
    19: {
        "thai": "ไม่ได้ขายนะคะ",
        "rom": "Mai dai khai na kha",
        "zh": "沒有賣好嗎"
    },
    20: {
        "thai": "ขายเวลาอย่างเดียวค่ะไม่ได้ขายตัว",
        "rom": "Khai wela yang diao kha mai dai khai tua",
        "zh": "只賣時間坐檯 不賣身"
    },
    21: {
        "thai": "อุยใครจะไปรู้คะอยู่ในร้านแบบนั้น",
        "rom": "Ui khrai cha pai ru kha yu nai ran baep nan",
        "zh": "哎唷在這種店裡 誰知道啊"
    },
    22: {
        "thai": "ก็อย่าเอาอคติมาตัดสินกันใช่มั้คะลูกตอน",
        "rom": "Ko ya ao akhati ma tat sin kan chai mai kha luk ton",
        "zh": "不要帶著偏見來評斷別人 對吧孩子 可是"
    },
    23: {
        "thai": "เนี้ยเหมือนอยู่ทีมนู้น",
        "rom": "Nia muean yu team nun",
        "zh": "妳現在看起來像站在對面那隊耶"
    },
    24: {
        "thai": "พิมพ์พิมพเหมือนหนูอยู่ทีมนู้นอ่ะเหมือน",
        "rom": "Pheem muean nu yu team nun a muean",
        "zh": "Pheem 妳看起來像跟對面同隊耶 感覺"
    },
    25: {
        "thai": "แบบอุ้ยจังเลย",
        "rom": "Baep ui chang loei",
        "zh": "好像很嫌棄的樣子"
    },
    26: {
        "thai": "คือในพลมี CCTV ค่ะสามารถเช็คได้นะคะ",
        "rom": "Khue nai ran mi CCTV kha samat check dai na kha",
        "zh": "店裡有 CCTV 監視器 可以調來看的好嗎"
    },
    27: {
        "thai": "โอ๊ยแล้วถ้าหลุดออกจากร้านไปก็ไม่เห็น",
        "rom": "Oi laeo tha lut ok chak ran pai ko mai hen",
        "zh": "哎唷那走出店門口之後 不就什麼都看不到了"
    },
    28: {
        "thai": "อะไรแล้วป่ะคะ",
        "rom": "Arai laeo pa kha",
        "zh": "不是嗎"
    },
    29: {
        "thai": "หลุดออกจากร้านก็หลุดออกนอกเวลางานค่ะคน",
        "rom": "Lut ok chak ran ko lut ok nok wela ngan kha khon",
        "zh": "走出店門口就是下班時間了"
    },
    30: {
        "thai": "หลุดออกจากร้านก็หลุดออกนอกเวลางานค่ะคน ดี",
        "rom": "Lut ok chak ran ko lut ok nok wela ngan kha khon di",
        "zh": "走出店外就是下班私人時間 好人嘛"
    },
    31: {
        "thai": "พิมพิมพฟังแม่นะลูก",
        "rom": "Pheem fang mae na luk",
        "zh": "Pheem 聽媽媽說喔孩子"
    },
    32: {
        "thai": "คนดีอ่ะเ้าไม่ไปกินข้าวแบบไม่ใช่ 2 ต 2",
        "rom": "Khon di a khao mai pai kin khao baep mai chai song to song",
        "zh": "好人是不會跟人去吃飯 還不是單獨"
    },
    33: {
        "thai": "ตั้งหลายรอบหรอก",
        "rom": "Tang lai rop rok",
        "zh": "去吃了好幾次耶"
    },
    34: {
        "thai": "เออจริง",
        "rom": "Eo ching",
        "zh": "欸真的"
    },
    35: {
        "thai": "เค้าเป็นผู้ชายแบบผู้ชายเข้าใจมั้",
        "rom": "Khao pen phu chai baep phu chai khao chai mai",
        "zh": "對方是個男的 是真男人 懂嗎"
    },
    36: {
        "thai": "แล้วเราจะรู้มั้ว่าเาเป็นผู้ชาย",
        "rom": "Laeo rao cha ru mai wa khao pen phu chai",
        "zh": "那我們怎麼會知道對方是不是直男"
    },
    37: {
        "thai": "ก็ไปดูที่เขาอยู่เข้าห้องกับแฟนเ้าสิ่",
        "rom": "Ko pai du thi khao yu khao hong kap faen khao si",
        "zh": "就去看他跟女朋友進房間不就知道了"
    },
    38: {
        "thai": "แล้วเราจะไปรู้ชีวิตเ้าได้ไงเราสนใจแต่",
        "rom": "Laeo rao cha pai ru chiwit khao dai ngai rao son chai tae",
        "zh": "那我們怎麼會知道他的私生活 我們在乎的只有"
    },
    39: {
        "thai": "คุณน่ะ",
        "rom": "Khun na",
        "zh": "妳而已"
    },
    40: {
        "thai": "ในซีรีส์ EP 5 มันก็ชน",
        "rom": "Nai series EP 5 man ko chon",
        "zh": "在劇裡 EP 5 是剛好巧遇"
    },
    41: {
        "thai": "อุ๊ยลูก EP 5 แม่เห็นอยู่เ้าไปหอมแก้ม",
        "rom": "Ui luk EP 5 mae hen yu khao pai hom kaem",
        "zh": "哎唷孩子 EP 5 媽媽親眼看見 跑去親人家臉頰"
    },
    42: {
        "thai": "โป๊ะมาหอมแก๊ง",
        "rom": "Po ma hom kaem",
        "zh": "突然就親了下去"
    },
    43: {
        "thai": "ใช่ไม่ได้อยากหอมเลยจริง",
        "rom": "Chai mai dai yak hom loei ching",
        "zh": "對啊 真的完全不想親"
    },
    44: {
        "thai": "อ๋อหมายถึงเธอไปหอมแก้มเค้าใช่",
        "rom": "O mai thueng thoe pai hom kaem khao chai",
        "zh": "噢 意思是妳主動去親人家臉頰對吧"
    },
    45: {
        "thai": "ใช่ทีมเป็นเลสเบี้น",
        "rom": "Chai Pheem pen lesbian",
        "zh": "對 Pheem 是女同志"
    },
    46: {
        "thai": "คืองงมากยืนดูอยู่ตอนถ่ายแบบะ",
        "rom": "Khue ngong mak yuen du yu ton thai baep",
        "zh": "真的很傻眼 拍攝時在一旁看著"
    },
    47: {
        "thai": "เลยหรอ",
        "rom": "Loei ro",
        "zh": "真的親下去了嗎"
    },
    48: {
        "thai": "คืออะไรคือตอนนั้นน่ะหมิวอ่ะอยู่ในร่าง",
        "rom": "Khue arai khue ton nan na Miu a yu nai rang",
        "zh": "怎麼回事 當時 Miu 完全沉浸在"
    },
    49: {
        "thai": "ป่านแล้วตอนนั้นน่ะปหมิวแบบ",
        "rom": "Pan laeo ton nan na Miu baep",
        "zh": "Pan 的角色裡 那時 Miu 整個"
    },
    50: {
        "thai": "หมิวในร่างปากในในหัวคิดอะไรอยู่พูดไป",
        "rom": "Miu nai rang Pan nai hua khit arai yu phut pai",
        "zh": "Miu 在 Pan 的身體裡 腦子到底在想什麼 快說"
    },
    51: {
        "thai": "หมิวในร่างปาก",
        "rom": "Miu nai rang Pan",
        "zh": "Miu 沉浸在 Pan 的角色裡"
    },
    52: {
        "thai": "อะไรอ่ะ",
        "rom": "Arai a",
        "zh": "什麼啦"
    },
    53: {
        "thai": "อะไรอ่ะใช่มแบบ",
        "rom": "Arai a chai baep",
        "zh": "什麼啦 對啊就像"
    },
    54: {
        "thai": "เออ อะไร",
        "rom": "Eo arai",
        "zh": "欸 什麼"
    },
    55: {
        "thai": "อะไร What",
        "rom": "Arai What",
        "zh": "什麼 What"
    },
    56: {
        "thai": "What เลย",
        "rom": "What loei",
        "zh": "整個黑人問號 What"
    },
    57: {
        "thai": "เธอทำตั้งหลายอย่างลูกฉันไม่เห็น what",
        "rom": "Thoe tham tang lai yang luk chan mai hen What",
        "zh": "妳做了那麼多事 我家孩子都沒說 What"
    },
    58: {
        "thai": "เลยลูกฉันให้กรี๊ด",
        "rom": "Loei luk chan hai grit",
        "zh": "我家孩子只會尖叫崩潰"
    },
    59: {
        "thai": "ฟังไม่ค่อย",
        "rom": "Fang mai khoi",
        "zh": "都不太聽別人說"
    },
    60: {
        "thai": "ลูกฉันแค่โวยวาย",
        "rom": "Luk chan khae woei wai",
        "zh": "我家孩子只是激動吼一下"
    },
    61: {
        "thai": "ลูกฉันแค่โวยวายฉันแค่โวยวาย",
        "rom": "Luk chan khae woei wai chan khae woei wai",
        "zh": "我家孩子只是吼叫 我只是激動吼叫而已"
    },
    62: {
        "thai": "ทำไมถึงต้องโวยวายเสียงดังใส่ลูกป่านด้วย",
        "rom": "Thammai thueng tong woei wai siang dang sai luk Pan duai",
        "zh": "為什麼非要對我家 Pan 大呼小叫呢"
    },
    63: {
        "thai": "ก็เป็นวิธีของเราแต่ข้างในเราก็ต้องดูคน",
        "rom": "Ko pen withi khong rao tae khang nai rao ko tong du khon",
        "zh": "這是我們的表達方式 但看人還是要看內心"
    },
    64: {
        "thai": "ที่ข้างในภายใน",
        "rom": "Thi khang nai phai nai",
        "zh": "看一個人的本質內在"
    },
    65: {
        "thai": "ภายในของลูกป่านก็แบบเสียสะอาดสะอาด",
        "rom": "Phai nai khong luk Pan ko baep sa at sa at",
        "zh": "我家 Pan 的內心可是純潔又乾淨"
    },
    66: {
        "thai": "เอางี้นะลูกฉันให้เธอไปตั้งเท่าไหร่ 5",
        "rom": "Ao ngi na luk chan hai thoe pai tang thao rai ha",
        "zh": "這樣講好了 我家孩子給了妳多少錢 500萬"
    },
    67: {
        "thai": "ล้านบวก 5 ล้านบวก 3 ล้านบวกโอโหเยอะไป",
        "rom": "Lan buak ha lan buak sam lan buak oho yoe pai",
        "zh": "加 500萬 再加 300萬 天啊給超多"
    },
    68: {
        "thai": "ช่วยครอบครัวคุณตั้งเยอะ",
        "rom": "Chuai khrop khrua khun tang yoe",
        "zh": "幫了妳們家那麼大的忙"
    },
    69: {
        "thai": "คือคือเราก็ให้เ้าไปทั้งชีวิต",
        "rom": "Khue khue rao ko hai khao pai thang chiwit",
        "zh": "就是 我們也把自己的一輩子都交給她了啊"
    },
    70: {
        "thai": "ลูกแกตะกรุดตะกัดเรามั่นใจเรามั่นใจเรา",
        "rom": "Luk ya takuk takak rao man chai rao man chai rao",
        "zh": "孩子別結巴 拿出自信 我們一定能"
    },
    71: {
        "thai": "สู้เ้าได้พูดไปลูก",
        "rom": "Su khao dai phut pai luk",
        "zh": "吵贏對方的 說出來孩子"
    },
    72: {
        "thai": "ไม่สู้แล้วกันปล่อยให้แม่สู้แล้วกัน",
        "rom": "Mai su laeo kan ploi hai mae su laeo kan",
        "zh": "不吵了啦 讓媽媽幫我戰就好"
    },
    73: {
        "thai": "โอลูกฉันเป็นคนดีลูกฉันไม่เคยเรียกร้อง",
        "rom": "O luk chan pen khon di luk chan mai khoei riak rong",
        "zh": "我家孩子心地善良 從來沒有向對方索求過"
    },
    74: {
        "thai": "อะไรเลยก็บอกอยู่ว่าไม่ได้อยู่เพราะเงิน",
        "rom": "Arai loei ko bok yu wa mai dai yu phro ngoen",
        "zh": "任何東西 早就說過不是為了錢才留下來"
    },
    75: {
        "thai": "อยู่เพราะรักล้วนๆ",
        "rom": "Yu phro rak luan luan",
        "zh": "留下來純粹全都是因為愛"
    },
    76: {
        "thai": "ลูกฉันก็ไม่เคยเรียกอะไรขอแค่อย่างเดียว",
        "rom": "Luk chan ko mai khoei riak arai kho khae yang diao",
        "zh": "我家孩子也沒要求什麼 只求一件事"
    },
    77: {
        "thai": "อย่าโกหก",
        "rom": "Ya ko hok",
        "zh": "不要說謊"
    },
    78: {
        "thai": "ถูกต้องแล้วคุณทำอะไรโกหกไท Line",
        "rom": "Thuk tong laeo khun tham arai ko hok Timeline",
        "zh": "沒錯 那妳做了什麼 妳在時間線上說謊"
    },
    79: {
        "thai": "ถูกต้องแล้วคุณทำอะไรโกหกไท Line อื",
        "rom": "Thuk tong laeo khun tham arai ko hok Timeline ue",
        "zh": "沒錯 那妳做了什麼 隱瞞時間線 嗯"
    },
    80: {
        "thai": "แต่เราไม่รู้ว่ามันคือไท Line",
        "rom": "Tae rao mai ru wa man khue Timeline",
        "zh": "可是我們當時根本不知道那是時間線"
    },
    81: {
        "thai": "ก็ฟังกันหน่อยใช่ม",
        "rom": "Ko fang kan noi chai mai",
        "zh": "也聽人家解釋一下嘛 對吧"
    },
    82: {
        "thai": "เราตัดสินจากสิ่งที่เราเห็น",
        "rom": "Rao tat sin chak sing thi rao hen",
        "zh": "我們是根據眼前看到的來判斷"
    },
    83: {
        "thai": "เดี๋รู้",
        "rom": "Diao ru",
        "zh": "等著看好了"
    },
    84: {
        "thai": "เออเดี๋ยวได้รู้กัน",
        "rom": "Eo diao dai ru kan",
        "zh": "沒錯 等著瞧吧"
    },
    85: {
        "thai": "เออเราปิดเลยมั้คะทำไมเฮ้ยสู้ไม่ได้หรอ",
        "rom": "Eo rao pit loei mai kha thammai hoei su mai dai ro",
        "zh": "那我們直接關機收工嗎 怎樣 戰不過了嗎"
    },
    86: {
        "thai": "เราถูกเรายังสู้ไม่ได้อีกเหรอ",
        "rom": "Rao thuk rao yang su mai dai ik ro",
        "zh": "我們站得住腳 難道還會戰不過嗎"
    },
    87: {
        "thai": "เดี๋ยวก็รู้ค่ะนะทุกคน",
        "rom": "Diao ko ru kha na thuk khon",
        "zh": "大家等著看就知道了"
    },
    88: {
        "thai": "รู้ว่าอะไรอ่ะ",
        "rom": "Ru wa arai a",
        "zh": "知道什麼"
    },
    89: {
        "thai": "รู้ความจริง",
        "rom": "Ru khwam ching",
        "zh": "知道真相"
    },
    90: {
        "thai": "อุยเอ",
        "rom": "Ui e",
        "zh": "哎唷"
    },
    91: {
        "thai": "ทำไมไม่รู้ตั้งแต่ตอนนี้เลยคะมีปากทำไม",
        "rom": "Thammai mai ru tang tae ton ni loei kha mi pak thammai",
        "zh": "為什麼不現在就說清楚 有嘴巴幹嘛不說"
    },
    92: {
        "thai": "ไม่รู้อย่าเพิ่งตัดสินค่ะคุณแม่ฝั่งนู้น",
        "rom": "Mai ru ya phoeng tat sin kha khun mae fang nun",
        "zh": "還不知道真相就別急著下定論 對面的媽媽"
    },
    93: {
        "thai": "ไม่รู้อย่าเพิ่งตัดสินค่ะคุณแม่ฝั่งนู้น อื",
        "rom": "Mai ru ya phoeng tat sin kha khun mae fang nun ue",
        "zh": "還不知道真相就別急著下定論 對面的媽媽 嗯"
    },
    94: {
        "thai": "อุ๊ยก็จริงแต่",
        "rom": "Ui ko ching tae",
        "zh": "哎唷也是啦 可是"
    },
    95: {
        "thai": "แม่ Goy go",
        "rom": "Mae Goy go",
        "zh": "Goy 媽媽 上"
    },
    96: {
        "thai": "วันนี้กูกับลูกกูอ่อนมากเลยไงดีทั้งๆที่",
        "rom": "Wan ni ku kap luk ku on mak loei ngai di thang thang thi",
        "zh": "今天我和我女兒氣勢太弱了該怎麼辦 明明"
    },
    97: {
        "thai": "ลูกกูก็ไม่ผิดอ่ะ",
        "rom": "Luk ku ko mai phit a",
        "zh": "我女兒又沒有錯"
    },
    98: {
        "thai": "ไม่แต่เรารักเค้าไงแม่",
        "rom": "Mai tae rao rak khao ngai mae",
        "zh": "不是啦 是因為我們愛她啊媽媽"
    },
    99: {
        "thai": "แล้วแม่ก็ต้องยอมเพื่อคนที่ลูกรักถูกม",
        "rom": "Laeo mae ko tong yom phuea khon thi luk rak thuk mai",
        "zh": "媽媽也得為了女兒心愛的人退讓 對吧"
    },
    100: {
        "thai": "จริงนะเว้ยเฮ้ย",
        "rom": "Ching na woei hoei",
        "zh": "說得也是耶 喂"
    },
    101: {
        "thai": "เฮ้ยเฮ้ยๆไม่สู้เลยเหรอฝั่งนู้นเถียงเก่ง",
        "rom": "Hoei hoei hoei mai su loei ro fang nun thiang keng",
        "zh": "喂喂 這樣就不戰了嗎 對面很會頂嘴耶"
    },
    102: {
        "thai": "แปลกอ่ะ",
        "rom": "Plaek a",
        "zh": "真奇怪耶"
    },
    103: {
        "thai": "เราเอาแฟกมาพูดกันมันก็เลยไม่ยาก",
        "rom": "Rao ao fact ma phut kan man ko loei mai yak",
        "zh": "我們拿事實真相來說話 所以一點都不難"
    },
    104: {
        "thai": "จริงเอางี้จริง",
        "rom": "Ching ao ngi ching",
        "zh": "沒錯 確實就是這樣"
    },
    105: {
        "thai": "เอาแมลูกกันลูกกูไม่แพ้นะถ้าพูดแบบเนี้ย",
        "rom": "Ao mae luk kan luk ku mai phae na tha phut baep nia",
        "zh": "要是比護女心切 我女兒可不會輸喔 這樣說起來"
    },
    106: {
        "thai": "หมิวก็ไม่แพ้",
        "rom": "Miu ko mai phae",
        "zh": "Miu 也不會認輸"
    },
    107: {
        "thai": "ไม่แพ้ดูแลดีทุกอย่างขอแค่อยากโกหกเลิศ",
        "rom": "Mai phae du lae di thuk yang kho khae ya ko hok loet",
        "zh": "絕不認輸 處處照顧得無微不至 只要求別說謊 太優秀了"
    },
    108: {
        "thai": "แค่นี้พูดกันตรงๆก็ได้",
        "rom": "Khae ni phut kan trong trong ko dai",
        "zh": "只要有話直說就好了"
    },
    109: {
        "thai": "จริงลีลาก็ดี",
        "rom": "Ching lila ko di",
        "zh": "真的 表現架勢也很讚"
    },
    110: {
        "thai": "ป่านเไม่เกี่ยวเราถูกที่สุด",
        "rom": "Pan mai kiao rao thuk thi sut",
        "zh": "Pan 這無關 我們是最有理的"
    },
    111: {
        "thai": "ดีที่สุดเราไม่เคยทำ",
        "rom": "Di thi sut rao mai khoei tham",
        "zh": "做人坦蕩蕩 我們從沒做過虧心事"
    },
    112: {
        "thai": "ป่านพูดเยอะๆเลยเพราะว่าในปีนี้หนูไม่พูด",
        "rom": "Pan phut yoe yoe loei phro wa nai pi ni nu mai phut",
        "zh": "Pan 妳多講一點 因為在劇裡這一年妳都不說話 孩子"
    },
    113: {
        "thai": "เลยลูก",
        "rom": "Loei luk",
        "zh": "完全不說話 孩子啊"
    },
    114: {
        "thai": "เดี๋พูดโอกาสเออเดี๋พูด",
        "rom": "Diao phut okat eo diao phut",
        "zh": "等找到機會再說 對 等之後再說"
    },
    115: {
        "thai": "แม่รอแม่รอ",
        "rom": "Mae ro mae ro",
        "zh": "媽媽等著 媽媽等著看呢"
    },
    116: {
        "thai": "คือทำไมมีอะไรมันถึงเล่าไม่ได้วะถ้าพูด",
        "rom": "Khue thammai mi arai man thueng lao mai dai wa tha phut",
        "zh": "就是說 有什麼事為什麼不能好好講開呢 如果說出來"
    },
    117: {
        "thai": "เข้าใอยู่",
        "rom": "Khao chai yu",
        "zh": "就能彼此理解了啊"
    },
    118: {
        "thai": "เล่าได้แต่ยังไม่ใช่ใน EP นี้ใน EP ถัดๆ",
        "rom": "Lao dai tae yang mai chai nai EP ni nai EP that that",
        "zh": "可以講 但還不是在這一集 在接下來的幾集"
    },
    119: {
        "thai": "ไปเดี๋ยวลูกฉันเล่าเลยเล่ายาว",
        "rom": "Pai diao luk chan lao loei lao yao",
        "zh": "我家孩子就會說了 而且會說得鉅細靡遺"
    },
    120: {
        "thai": "ไม่คือถ้ามันรู้เร็วเนี่ยมันก็จะไม่เป็น",
        "rom": "Mai khue tha man ru reo nia man ko cha mai pen",
        "zh": "不是 如果早點知道 事情就不會演變成這樣了"
    },
    121: {
        "thai": "เออจะได้มาช่วยทุกอย่างมันอยู่ในบท",
        "rom": "Eo cha dai ma chuai thuk yang man yu nai bot",
        "zh": "對啊 才能幫忙解決 其實一切都在劇本安排中啦"
    },
    122: {
        "thai": "เข้าใจไงแม่เราอยู่ฝั่งนี้อยู่ฝั่งนี้",
        "rom": "Khao chai ngai mae rao yu fang ni yu fang ni",
        "zh": "懂了吧媽媽 我們站在同一邊 站在這一隊"
    },
    123: {
        "thai": "จะช่วยจะช่วยเ",
        "rom": "Cha chuai cha chuai",
        "zh": "會幫忙的啦 會幫忙的"
    },
    124: {
        "thai": "ทุกอย่างมันอยู่ในบทค่ะทุกคนต้องใจเย็นๆ",
        "rom": "Thuk yang man yu nai bot kha thuk khon tong chai yen yen",
        "zh": "一切都在劇本安排中 大家要稍安勿躁"
    },
    125: {
        "thai": "นะคะเพราะว่าซีรียส์เรามี 8 ตอนเราไม่ได้",
        "rom": "Na kha phro wa series rao mi paet ton rao mai dai",
        "zh": "因為我們的影集有 8 集 我們不是"
    },
    126: {
        "thai": "มีแค่ 5 ตอนพูดไปก็จบตั้งแต่ 5 ตอนแรก",
        "rom": "Mi khae ha ton phut pai ko chop tang tae ha ton raek",
        "zh": "只有 5 集 如果全說出來 前 5 集就演完了"
    },
    127: {
        "thai": "อีก 3 EP จะจบแล้วพูดเถอะขอร้องทำตัวแบบ",
        "rom": "Ik sam EP cha chop laeo phut thoe kho rong tham tua baep",
        "zh": "再過 3 集就要完結了 快說吧拜託 這樣做"
    },
    128: {
        "thai": "นี้ไม่ได้นะคะคนที่รักคุณเขาเสียใจเสียใจ",
        "rom": "Ni mai dai na kha khon thi rak khun khao sia chai sia chai",
        "zh": "不行啊 愛妳的人心裡會很難受 很心痛"
    },
    129: {
        "thai": "มาตลอดทางเสียใจทุกได้สิคะลูกฉันก็เสียใจ",
        "rom": "Ma talot thang sia chai dai si kha luk chan ko sia chai",
        "zh": "一路走來都好傷心 當然可以心疼啊 我家孩子也很傷心"
    },
    130: {
        "thai": "นั่งลงให้อยู่หน้าประตูทำไมต้องไล่ลูกฉัน",
        "rom": "Nang ronghai yu na pratu thammai tong lai luk chan",
        "zh": "哭著蹲坐在房門口 為什麼要把我家孩子"
    },
    131: {
        "thai": "ออกจากห้องด้วยฉันก็น้ำตาลไหลเหมือนกัน",
        "rom": "Ok chak hong duai chan ko nam ta lai muean kan",
        "zh": "趕出房門 我看了也是眼淚直流啊"
    },
    132: {
        "thai": "ออกจากห้องด้วยฉันก็น้ำตาลไหลเหมือนกัน น่ะ",
        "rom": "Ok chak hong duai chan ko nam ta lai muean kan na",
        "zh": "趕出房門 我也是心疼到掉眼淚好嗎"
    },
    133: {
        "thai": "อ้าก็ทำให้เสียใจคุณไม่มีสิทธิ์มาอยู่",
        "rom": "A ko tham hai sia chai khun mai mi sit ma yu",
        "zh": "啊就是因為讓對方傷心 妳沒資格待在"
    },
    134: {
        "thai": "ห้องนี้ห้องนี้สำหรับคนดีเท่านั้น",
        "rom": "Hong ni hong ni samrap khon di thao nan",
        "zh": "這個房間 這個房間只留給好人住"
    },
    135: {
        "thai": "แต่จริงๆแล้วคู่แล้วอีกอย่างคือเถียงไป",
        "rom": "Tae ching ching laeo khu laeo ik yang khue thiang pai",
        "zh": "但說真的 這對 CP 吵來"
    },
    136: {
        "thai": "เถียงมาเนี่ยสุดท้ายแล้วพิมพปั่นอยู่ทีม",
        "rom": "Thiang ma nia sut thai laeo Pheem Pan yu team",
        "zh": "吵去 到頭來 Pheem 和 Pan 根本是同一陣線的"
    },
    137: {
        "thai": "เดียวกันค่ะ",
        "rom": "Diao kan kha",
        "zh": "站在同一隊的"
    },
    138: {
        "thai": "เผื่อใครเข้าใจผิดว่าอะไร",
        "rom": "Phuea khrai khao chai phit wa arai",
        "zh": "免得大家誤會什麼"
    },
    139: {
        "thai": "แม่เราสั่งอาหารเม็ดกินกัน",
        "rom": "Mae rao sang ahan met kin kan",
        "zh": "媽媽們 我們自己去買狗糧吞吧"
    },
    140: {
        "thai": "เราทิ้งแม่กลางคันนะอันเนี้ยแม่คะคือคือ",
        "rom": "Rao thing mae klang khan na an nia mae kha khue khue",
        "zh": "丟下媽媽們自己放閃去了 媽媽們聽我說"
    },
    141: {
        "thai": "คุณแม่ทั้งหลายนะคะฟังนะคะพวกเราอยู่ทีม",
        "rom": "Khun mae thang lai na kha fang na kha phuak rao yu team",
        "zh": "各位媽媽們 請聽我們說 我們是在同一隊的"
    },
    142: {
        "thai": "เดียวกันเราเถียงเสียงไปก็เท่านั้นเพราะ",
        "rom": "Diao kan rao thiang siang pai ko thao nan phro",
        "zh": "我們吵得面紅耳赤也沒用 因為"
    },
    143: {
        "thai": "ว่าสุดท้ายแล้วเราจะช่วยกันอยู่ดี",
        "rom": "Wa sut thai laeo rao cha chuai kan yu di",
        "zh": "到頭來我們倆還是會互相扶持的"
    },
    144: {
        "thai": "เลี้ยงได้แต่ตัวว่ะสุด",
        "rom": "Liang dai tae tua wa sut",
        "zh": "養得大人 養不住心啊 真服了"
    },
    145: {
        "thai": "แม่ขับแห้งแล้วตอนเนี้ยได้ตัว",
        "rom": "Mae khap haeng laeo ton nia dai tua",
        "zh": "媽媽現在只能乾瞪眼吃狗糧了"
    },
    146: {
        "thai": "ไม่รู้ฉันไม่รู้จะทำไงกับลีน่าหมิว",
        "rom": "Mai ru chan mai ru cha tham ngai kap Lena Miu",
        "zh": "真拿她們沒輒 我真不知道拿 Lena 和 Miu 怎麼辦"
    },
    147: {
        "thai": "รักแม่บ้างอย่ารักแต่เมะลูก",
        "rom": "Rak mae bang ya rak tae me luk",
        "zh": "愛一下媽媽 別只顧著愛攻方啊孩子"
    },
    148: {
        "thai": "รักเมะมาก",
        "rom": "Rak me mak",
        "zh": "超愛攻方"
    },
    149: {
        "thai": "ตายละ",
        "rom": "Tai la",
        "zh": "哎唷我的天"
    },
    150: {
        "thai": "ตายละ เฮ้ย",
        "rom": "Tai la hoei",
        "zh": "哎唷我的天 喂"
    },
    151: {
        "thai": "เมมากเมก็รักเคะมากเออ",
        "rom": "Me mak me ko rak khe mak eo",
        "zh": "超攻 攻也很愛受方 對啦"
    },
    152: {
        "thai": "อ่าก็ฝากลูกของเรา 2 คนที่รักกันมากแต่",
        "rom": "A ko fak luk khong rao song khon thi rak kan mak tae",
        "zh": "好啦 就把我們這兩個深愛著彼此的孩子託付給大家 雖然"
    },
    153: {
        "thai": "ว่าคนนึงไม่ฟังคนนึงไม่พูดด้วยนะคะลูก",
        "rom": "Wa khon nueng mai fang khon nueng mai phut duai na kha luk",
        "zh": "一個不肯聽 一個不肯說 孩子"
    },
    154: {
        "thai": "กำลังจะพูดแล้วลูกบอกไปว่า EP ถัดๆไปเดี๋",
        "rom": "Kamlang cha phut laeo luk bok pai wa EP that that pai diao",
        "zh": "準備要說了 孩子跟她們說 接下來幾集"
    },
    155: {
        "thai": "หนูจะพูดละบอกหนู",
        "rom": "Nu cha phut la bok nu",
        "zh": "我就會說了 跟大家說"
    },
    156: {
        "thai": "เดี๋ยว EP 8 ก็รู้เรื่องทุกอย่างแล้วค่ะ",
        "rom": "Diao EP 8 ko ru rueang thuk yang laeo kha",
        "zh": "到了 EP 8 大家就會知道所有真相了"
    },
    157: {
        "thai": "มึงจบแล้วอ่ะเอากันถึงจุดนั้นน่ะเอากัน",
        "rom": "Mueng chop laeo a ao kan thueng chut nan na ao kan",
        "zh": "都要完結篇了 拖到那個地步才說"
    },
    158: {
        "thai": "ถึงจุด EP 8 อ่ะเออคิดดูแล้วกัน",
        "rom": "Thueng chut EP 8 a eo khit du laeo kan",
        "zh": "拖到 EP 8 才講 妳們自己想想看"
    },
    159: {
        "thai": "อ่ะเดี๋ยวก็รู้",
        "rom": "A diao ko ru",
        "zh": "等著瞧吧"
    },
    160: {
        "thai": "อ่ะเดี๋ยวก็รู้ อื",
        "rom": "A diao ko ru ue",
        "zh": "等著瞧吧 嗯"
    },
    161: {
        "thai": "เพราะสุดท้ายเราก็รักกันอยู่ดีค่ะ",
        "rom": "Phro sut thai rao ko rak kan yu di kha",
        "zh": "反正最後我們還是相愛的"
    },
    162: {
        "thai": "อุ๊ยแต่ว่ามัน",
        "rom": "Ui tae wa man",
        "zh": "哎唷不過"
    },
    163: {
        "thai": "ตอนนี้ก็รักป่ะ",
        "rom": "Ton ni ko rak pa",
        "zh": "現在也是相愛的吧"
    },
    164: {
        "thai": "รักแล้ว",
        "rom": "Rak laeo",
        "zh": "早就愛上了"
    },
    165: {
        "thai": "อุ๊ยือๆๆๆ",
        "rom": "Ui hue hue hue hue",
        "zh": "哎唷喂呀"
    },
    166: {
        "thai": "ตายละชอบจังเลยแฟนลูกรวยแม่เรียกสินได้",
        "rom": "Tai la chop chang loei faen luk ruai mae riak sin sot dai",
        "zh": "天啊太喜歡了 女兒的另一半很有錢 媽媽聘金可以開得"
    },
    167: {
        "thai": "ตายละชอบจังเลยแฟนลูกรวยแม่เรียกสินได้ เยอะ",
        "rom": "Tai la chop chang loei faen luk ruai mae riak sin sot dai yoe",
        "zh": "天啊太喜歡了 女兒的另一半很有錢 媽媽聘金可以多要點"
    },
    168: {
        "thai": "แค่นี้ยังเอาไปไม่พอเหรอคุณแม่",
        "rom": "Khae ni yang ao pai mai pho ro khun mae",
        "zh": "拿了這麼多還不夠嗎 伯母"
    },
    169: {
        "thai": "ลูกฉันไม่มีหมื่ล้านก็หมดตัวได้พิมพจะจน",
        "rom": "Luk chan mai mi muen lan ko mot tua dai Pheem cha chon",
        "zh": "我家孩子又不是身價百億 也會被掏空的 Pheem 快要破產"
    },
    170: {
        "thai": "แล้วนะคะ",
        "rom": "Laeo na kha",
        "zh": "了好嗎"
    },
    171: {
        "thai": "พิมพ์จะจนละตอนเนี้ย",
        "rom": "Pheem cha chon la ton nia",
        "zh": "Pheem 現在快窮死了"
    },
    172: {
        "thai": "แต่เราไม่เคยเอาเงินคุณนะ",
        "rom": "Tae rao mai khoei ao ngoen khun na",
        "zh": "可是我們從來沒主動要過妳的錢啊"
    },
    173: {
        "thai": "แต่เราไม่เคยเอาเงินคุณนะ ใช่",
        "rom": "Tae rao mai khoei ao ngoen khun na chai",
        "zh": "可是我們從來沒要過妳的錢 沒錯"
    },
    174: {
        "thai": "คุณให้เองแต่เราไม่อยากได้",
        "rom": "Khun hai eng tae rao mai yak dai",
        "zh": "是妳自己要給的 我們根本不想要"
    },
    175: {
        "thai": "แล้วคุณรับมั้ย",
        "rom": "Laeo khun rap mai",
        "zh": "那妳收了沒有"
    },
    176: {
        "thai": "แล้วคุณรับมั้ย รับ",
        "rom": "Laeo khun rap mai rap",
        "zh": "那妳收了沒有 收了"
    },
    177: {
        "thai": "มันก็สบายดีอ่ะเนาะเงินก็ไม่ต้องหาเอา",
        "rom": "Man ko sabai di a no ngoen ko mai tong ha ao",
        "zh": "感覺滿舒服的嘛 不用自己辛苦賺"
    },
    178: {
        "thai": "เงินเข้ามาก็รู้สึกดีอยู่",
        "rom": "Ngoen khao ma ko rusuek di yu",
        "zh": "有錢進帳感覺也挺不錯的"
    },
    179: {
        "thai": "เออก็ฝากซีรียส์ลูกเราด้วยนะคะซีรียส์",
        "rom": "Eo ko fak series luk rao duai na kha series",
        "zh": "沒錯 請大家多多支持我們家孩子的影集"
    },
    180: {
        "thai": "ชื่อว่า",
        "rom": "Chue wa",
        "zh": "劇名叫作"
    },
    181: {
        "thai": "Please Love ได้ใหม่ค่ะ",
        "rom": "Please Love Dai Mai kha",
        "zh": "Please Love ได้ไหมค่ะ 請愛我好嗎"
    },
    182: {
        "thai": "ทางช่อง 3 ทุกวันศุกร์ 20:30 น.นะคะหรือ",
        "rom": "Thang chong sam thuk wan suk yi sip sam sip nathi na kha rue",
        "zh": "3台每週五晚上8點30分 或是"
    },
    183: {
        "thai": "แอปพลิเคช 3 แล้วก็อ้ายชีอี้ค่ะ",
        "rom": "Application 3Plus laeo ko iQIYI kha",
        "zh": "3Plus App 以及愛奇藝"
    },
    184: {
        "thai": "เฮ้ยเธอพูดบ้างดิ",
        "rom": "Hoei thoe phut bang di",
        "zh": "欸 妳也講幾句啊"
    },
    185: {
        "thai": "นี่ไงฝากด้วยนะ",
        "rom": "Ni ngai fak duai na",
        "zh": "這不就正在講嗎 請大家多多支持"
    },
    186: {
        "thai": "ขอหนักแน่นป่ะฝากด้วย",
        "rom": "Kho naknaen pa fak duai",
        "zh": "講堅定一點啦 請大家多多支持"
    },
    187: {
        "thai": "เฮ้ยไม่ใช่ไม่ใช่แบบว่าแบบว่าฝากซีรียส์",
        "rom": "Hoei mai chai mai chai baep wa baep wa fak series",
        "zh": "喂不是啦 不是這種口氣 應該說請多多支持"
    },
    188: {
        "thai": "ของเรา 2 คนด้วยนะคะ",
        "rom": "Khong rao song khon duai na kha",
        "zh": "我們兩個人的影集喔"
    },
    189: {
        "thai": "ฝากซีรีส์ของเรา 2 คนด้วยนะคะมาเจอบทสรุป",
        "rom": "Fak series khong rao song khon duai na kha ma cho bot sarup",
        "zh": "請多多支持我們兩個人的影集 一起來看結局"
    },
    190: {
        "thai": "เอ้ยมาคอยติดตาม",
        "rom": "Oei ma khoi thit tam",
        "zh": "欸 一起來持續鎖定"
    },
    191: {
        "thai": "บทสรุปรักของพีมป่านว่าแม่คนไหนจะชนะแม่ๆ",
        "rom": "Bot sarup rak khong Pheem Pan wa mae khon nai cha chana mae mae",
        "zh": "Pheem 和 Pan 的愛情大結局 看看哪一邊的媽媽會贏 媽媽們"
    },
    192: {
        "thai": "แพ้ค่ะลูกชนะจบ",
        "rom": "Phae kha luk chana chop",
        "zh": "輸了 女兒贏了 劇終"
    },
    193: {
        "thai": "เก่งมากลูกเราลูกอ่ะจะชนะแม่ไปทำไมก่อน",
        "rom": "Keng mak luk rao luk a cha chana mae pai thammai kon",
        "zh": "我家女兒真厲害 孩子妳贏過媽媽是要幹嘛啦"
    },
    194: {
        "thai": "งงมากอ่ะไปบ๊ายบายบ๊ายบาย",
        "rom": "Ngong mak a pai bye bye bye bye",
        "zh": "傻眼 走啦 掰掰 掰掰"
    }
}

punct_chars = set("，,。？！?!：:；;「」『』“”\"''（）()、—–…~～#@*&^%$+=\\/|<>[\]{}｀`*·•_-")

def sanitize(text):
    if not text:
        return ""
    chars = [c if c not in punct_chars else " " for c in text]
    cleaned = "".join(chars)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned

with open('scripts/raw_cc_lenamiu_1019.json', 'r', encoding='utf-8') as f:
    raw_cues = json.load(f)

assert len(raw_cues) == 194
assert len(entries) == 194

combined_cues = []
rom_cues = []
zh_cues = []
data_json = []

for cue in raw_cues:
    cid = cue['id']
    ts = cue['timestamp']
    thai = cue['thai']
    
    assert cid in entries, f"Missing ID {cid}"
    item = entries[cid]
    
    rom = sanitize(item['rom'])
    zh = sanitize(item['zh'])
    
    # Check for empty
    assert rom, f"Empty rom for {cid}"
    assert zh, f"Empty zh for {cid}"
    
    # Combined SRT:
    # 1: ID
    # 2: timestamp
    # 3: Romanized Thai
    # 4: Traditional Chinese
    combined_block = f"{cid}\n{ts}\n{rom}\n{zh}\n"
    combined_cues.append(combined_block)
    
    # Pure Romanized
    rom_block = f"{cid}\n{ts}\n{rom}\n"
    rom_cues.append(rom_block)
    
    # Pure ZH
    zh_block = f"{cid}\n{ts}\n{zh}\n"
    zh_cues.append(zh_block)
    
    data_json.append({
        "id": cid,
        "timestamp": ts,
        "original": thai,
        "romanized": rom,
        "translated": zh
    })

# Export single combined SRT
comb_path = 'public/CC_LenaMiu_2026_10_19_Romanized_zh_TW.srt'
with open(comb_path, 'w', encoding='utf-8') as f:
    f.write("\n".join(combined_cues) + "\n")

# Export pure Romanized SRT
rom_path = 'public/CC_LenaMiu_2026_10_19_Romanized.srt'
with open(rom_path, 'w', encoding='utf-8') as f:
    f.write("\n".join(rom_cues) + "\n")

# Export pure ZH SRT
zh_path = 'public/CC_LenaMiu_2026_10_19_zh_TW.srt'
with open(zh_path, 'w', encoding='utf-8') as f:
    f.write("\n".join(zh_cues) + "\n")

# Export JSON
json_path = 'public/cc_lenamiu_2026_10_19_data.json'
with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(data_json, f, ensure_ascii=False, indent=2)

print("SUCCESS: 100% PERFECT 1-TO-1 ALIGNED GENERATION COMPLETE!")
print(f"Total Cues: {len(combined_cues)}")
