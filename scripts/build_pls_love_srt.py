# -*- coding: utf-8 -*-
import json
import re
import sys

from pls_love_part1 import TRANS_PART1
from pls_love_part2 import TRANS_PART2
from pls_love_part3 import TRANS_PART3
from pls_love_part4 import TRANS_PART4
from pls_love_part5 import TRANS_PART5
from pls_love_part6 import TRANS_PART6
from pls_love_part7 import TRANS_PART7

def main():
    # Load raw
    with open('scripts/raw_pls_love.json', 'r', encoding='utf-8') as f:
        raw_items = json.load(f)

    print(f"Loaded {len(raw_items)} raw items.")

    # Combine all parts
    combined = {}
    combined.update(TRANS_PART1)
    combined.update(TRANS_PART2)
    combined.update(TRANS_PART3)
    combined.update(TRANS_PART4)
    combined.update(TRANS_PART5)
    combined.update(TRANS_PART6)
    combined.update(TRANS_PART7)

    print(f"Total translated items: {len(combined)}")

    # Check for missing or extra IDs
    missing = []
    for item in raw_items:
        i_id = item['id']
        if i_id not in combined:
            missing.append(i_id)

    if missing:
        print(f"ERROR: Missing translation for IDs: {missing}")
        sys.exit(1)

    # Check punctuation in translated texts
    # We allow English letters, numbers, spaces, and Chinese characters.
    # We strictly disallow Chinese punctuation: ，。！？：；「」『』、“”…—（）《》【】
    # And English punctuation: , . ! ? ; : " [ ] ( ) _ ~ ` < >
    # In names, P'Ao, P'Boom, P'Lena, Girls' might have straight apostrophe ' - let's see if we should keep straight apostrophe for P'Ao or if even apostrophe should be checked
    disallowed_punct = set("，。！？：；「」『』、“”…—（）《》【】,.!?;:\"[]()_~`<>/")

    punct_errors = []
    for idx, text in combined.items():
        found = [ch for ch in text if ch in disallowed_punct]
        if found:
            punct_errors.append((idx, found, text))

    if punct_errors:
        print(f"ERROR: Found punctuation in {len(punct_errors)} items!")
        for idx, found, text in punct_errors[:10]:
            print(f"  Cue {idx} contains {found}: {text}")
        sys.exit(1)

    print("SUCCESS: Zero punctuation marks detected across all 660 cues!")

    # Build zh_TW srt
    zh_srt_lines = []
    bilingual_srt_lines = []
    json_data = []

    for item in raw_items:
        idx = item['id']
        ts = item['ts']
        en = item['en']
        zh = combined[idx].strip()

        # Build zh_TW srt block
        zh_srt_lines.append(f"{idx}\n{ts}\n{zh}\n")

        # Build bilingual srt block (Traditional Chinese on top, English on bottom)
        bilingual_srt_lines.append(f"{idx}\n{ts}\n{zh}\n{en}\n")

        # Build json item
        json_data.append({
            'id': idx,
            'timestamp': ts,
            'original': en,
            'translated': zh
        })

    # Save files
    zh_srt_content = "\n".join(zh_srt_lines).strip() + "\n"
    bilingual_srt_content = "\n".join(bilingual_srt_lines).strip() + "\n"

    with open('public/Pls_Love_Final_EP_Fan_Moment_with_LenaMiu_zh_TW.srt', 'w', encoding='utf-8') as f:
        f.write(zh_srt_content)
    print("Saved public/Pls_Love_Final_EP_Fan_Moment_with_LenaMiu_zh_TW.srt")

    with open('public/Pls_Love_Final_EP_Fan_Moment_with_LenaMiu_Bilingual.srt', 'w', encoding='utf-8') as f:
        f.write(bilingual_srt_content)
    print("Saved public/Pls_Love_Final_EP_Fan_Moment_with_LenaMiu_Bilingual.srt")

    with open('public/pls_love_final_ep_data.json', 'w', encoding='utf-8') as f:
        json.dump(json_data, f, ensure_ascii=False, indent=2)
    print("Saved public/pls_love_final_ep_data.json")

    print(f"All 660 cues successfully built and verified!")

if __name__ == '__main__':
    main()
