import json
import re

with open('scripts/raw_cc_lenamiu.json', 'r', encoding='utf-8') as f:
    raw = json.load(f)

with open('scripts/cc_lenamiu_cache.json', 'r', encoding='utf-8') as f:
    cache = json.load(f)

# Punctuation stripper for safety
punct_chars = set("，,。？！?!：:；;「」『』“”\"''（）()、—–…~～#@*&^%$+=\\/|<>[\]{}｀`*·•_-")

def sanitize(text):
    if not text:
        return ""
    # remove any punctuation chars
    chars = [c if c not in punct_chars else " " for c in text]
    cleaned = "".join(chars)
    # clean spaces around English words
    cleaned = re.sub(r'([\u4e00-\u9fa5])([A-Za-z0-9])', r'\1 \2', cleaned)
    cleaned = re.sub(r'([A-Za-z0-9])([\u4e00-\u9fa5])', r'\1 \2', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned

zh_cues = []
bilingual_cues = []
json_items = []

for item in raw:
    idx = item['id']
    ts = item['timestamp']
    thai = item['thai']
    k = str(idx)
    tw = sanitize(cache.get(k, ''))
    
    # Verify no empty translation
    if not tw:
        print(f"WARNING: Empty translation for ID {idx}")
    
    # zh_TW SRT block
    zh_block = f"{idx}\n{ts}\n{tw}\n"
    zh_cues.append(zh_block)
    
    # Bilingual SRT block
    bi_block = f"{idx}\n{ts}\n{thai}\n{tw}\n"
    bilingual_cues.append(bi_block)
    
    json_items.append({
        "id": idx,
        "timestamp": ts,
        "original": thai,
        "translated": tw
    })

# Write zh_TW.srt
with open('public/CC_LenaMiu_2026_10_23_zh_TW.srt', 'w', encoding='utf-8') as f:
    f.write("\n".join(zh_cues) + "\n")

# Write Bilingual.srt
with open('public/CC_LenaMiu_2026_10_23_Bilingual.srt', 'w', encoding='utf-8') as f:
    f.write("\n".join(bilingual_cues) + "\n")

# Write json data
with open('public/cc_lenamiu_2026_10_23_data.json', 'w', encoding='utf-8') as f:
    json.dump(json_items, f, ensure_ascii=False, indent=2)

print(f"Successfully generated:")
print(f"  1. public/CC_LenaMiu_2026_10_23_zh_TW.srt ({len(zh_cues)} cues)")
print(f"  2. public/CC_LenaMiu_2026_10_23_Bilingual.srt ({len(bilingual_cues)} cues)")
print(f"  3. public/cc_lenamiu_2026_10_23_data.json ({len(json_items)} items)")
