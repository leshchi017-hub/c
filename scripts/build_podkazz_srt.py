# -*- coding: utf-8 -*-
"""
Audits, cleans, validates, and builds:
1. public/PODKAZZ_EP24_LenaMiu_zh_TW.srt (Pure Traditional Chinese, Taiwan phrasing, punctuation-free)
2. public/PODKAZZ_EP24_LenaMiu_Bilingual.srt (Bilingual: zh_TW + English original)
3. public/podkazz_ep24_data.json (Applet data store for interactive player/browser)
"""

import json
import re
import sys

from podkazz_part1 import TRANS_PART1
from podkazz_part2 import TRANS_PART2
from podkazz_part3 import TRANS_PART3
from podkazz_part4 import TRANS_PART4
from podkazz_part5 import TRANS_PART5
from podkazz_part6 import TRANS_PART6

def clean_no_punctuation(text: str) -> str:
    """Removes all punctuation marks, preserving English letters, Chinese characters, numbers, and spaces."""
    # List of punctuation characters to strip or replace with space
    puncts = r'[,.!?:;，。！？：；、「」『』""\'’‘（）()—…\-~～/\\#@*&^%$><_\[\]{}|+=]'
    # Replace punctuation with a space
    cleaned = re.sub(puncts, ' ', text)
    # Collapse multiple spaces into one space
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned

def main():
    with open('scripts/raw_podkazz_cues.json', 'r', encoding='utf-8') as f:
        cues = json.load(f)

    print(f"Loaded {len(cues)} retained cues.")
    assert len(cues) == 1550, f"Expected 1550 retained cues, got {len(cues)}"

    # Combine all parts
    combined = {}
    combined.update(TRANS_PART1)
    combined.update(TRANS_PART2)
    combined.update(TRANS_PART3)
    combined.update(TRANS_PART4)
    combined.update(TRANS_PART5)
    combined.update(TRANS_PART6)

    print(f"Total translated items: {len(combined)}")

    # Check for missing
    missing = [c['id'] for c in cues if c['id'] not in combined]
    if missing:
        print(f"ERROR: Missing translations for IDs: {missing[:30]} (total: {len(missing)})")
        sys.exit(1)

    print("Zero missing cues! All 1550 cues translated.")

    # Process and clean each cue
    processed = []
    punctuation_count = 0

    for c in cues:
        cid = c['id']
        raw_trans = combined[cid]
        clean_trans = clean_no_punctuation(raw_trans)
        if raw_trans != clean_trans:
            punctuation_count += 1

        # Check names preserved
        # Names should be Lena, Miu, Tong etc.
        # Ensure 'Leena' -> 'Lena', 'Mew' -> 'Miu', 'Pina' -> 'Lena'
        clean_trans = re.sub(r'\bLeena\b', 'Lena', clean_trans)
        clean_trans = re.sub(r'\bLina\b', 'Lena', clean_trans)
        clean_trans = re.sub(r'\bMew\b', 'Miu', clean_trans)

        processed.append({
            'id': cid,
            'orig_id': c['orig_id'],
            'start': c['start'],
            'end': c['end'],
            'timestamp': f"{c['start']} --> {c['end']}",
            'original': c['text'],
            'translated': clean_trans,
            'dur': c['dur']
        })

    print(f"Punctuation checks applied. Lines cleaned: {punctuation_count}")

    # Build pure Chinese SRT
    zh_srt_lines = []
    for item in processed:
        zh_srt_lines.append(f"{item['id']}")
        zh_srt_lines.append(f"{item['timestamp']}")
        zh_srt_lines.append(f"{item['translated']}")
        zh_srt_lines.append("")

    zh_srt_content = "\n".join(zh_srt_lines).strip() + "\n"
    with open('public/PODKAZZ_EP24_LenaMiu_zh_TW.srt', 'w', encoding='utf-8') as f:
        f.write(zh_srt_content)
    print("Exported public/PODKAZZ_EP24_LenaMiu_zh_TW.srt")

    # Build bilingual SRT
    bi_srt_lines = []
    for item in processed:
        bi_srt_lines.append(f"{item['id']}")
        bi_srt_lines.append(f"{item['timestamp']}")
        bi_srt_lines.append(f"{item['translated']}\n{item['original']}")
        bi_srt_lines.append("")

    bi_srt_content = "\n".join(bi_srt_lines).strip() + "\n"
    with open('public/PODKAZZ_EP24_LenaMiu_Bilingual.srt', 'w', encoding='utf-8') as f:
        f.write(bi_srt_content)
    print("Exported public/PODKAZZ_EP24_LenaMiu_Bilingual.srt")

    # Build JSON applet data
    json_data = []
    for item in processed:
        json_data.append({
            'id': item['id'],
            'timestamp': item['timestamp'],
            'original': item['original'],
            'translated': item['translated']
        })

    with open('public/podkazz_ep24_data.json', 'w', encoding='utf-8') as f:
        json.dump(json_data, f, ensure_ascii=False, indent=2)
    print("Exported public/podkazz_ep24_data.json")

    # Final summary check
    print("\n=== FINAL AUDIT VERIFICATION ===")
    print(f"Total Cues in Output: {len(processed)}")
    print(f"First Cue: #{processed[0]['id']} ({processed[0]['timestamp']}) -> {processed[0]['translated']}")
    print(f"Last Cue: #{processed[-1]['id']} ({processed[-1]['timestamp']}) -> {processed[-1]['translated']}")
    
    # Check any leftover punctuation
    illegal_chars = set()
    for item in processed:
        for char in item['translated']:
            if char in ',.!?:;，。！？：；、「」『』""\'’‘（）()—…-~～/\\#@*&^%$><_[]{}|+=':
                illegal_chars.add(char)
    print(f"Leftover punctuation characters: {illegal_chars}")
    assert len(illegal_chars) == 0, f"Found illegal punctuation: {illegal_chars}"
    print("All checks PASSED! Zero punctuation, exact timing preserved, 0 missing lines.")

if __name__ == '__main__':
    main()
