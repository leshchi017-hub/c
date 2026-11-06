import json
import re

# Load original SRT
def parse_srt(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    blocks = re.split(r'\n\s*\n', content.strip())
    parsed = []
    for b in blocks:
        lines = [l.strip() for l in b.strip().split('\n') if l.strip()]
        if len(lines) >= 2:
            idx = int(lines[0].strip())
            ts = lines[1].strip()
            thai = ' '.join(lines[2:]).strip()
            parsed.append({
                'id': idx,
                'timestamp': ts,
                'thai': thai
            })
    return parsed

orig_srt_path = 'public/assets/aistudio/CC_LenaMiu_x_DARA_LIVE_2026_10_20_a95d97e6.srt'
raw = parse_srt(orig_srt_path)
print(f"Loaded {len(raw)} cues from original SRT")

with open('scripts/cc_dara_live_2026_10_20_cache.json', 'r', encoding='utf-8') as f:
    cache = json.load(f)
print(f"Loaded {len(cache)} translations from cache")

punct_pattern = re.compile(r'[，,。.\?!？！:：;；「」『』“”"\'\'`｀（）()【】\[\]{}、—–…~～#@*&^%$+=\/\\|<>\-•·]')

def clean_tw(text):
    if not text:
        return ""
    # Strip any punctuation
    t = punct_pattern.sub(' ', text)
    # Name standardizations
    t = re.sub(r'\bLeena\b', 'Lena', t, flags=re.I)
    t = re.sub(r'\bLina\b', 'Lena', t, flags=re.I)
    t = re.sub(r'\bAlina\b', 'Lena', t, flags=re.I)
    t = re.sub(r'\bRina\b', 'Lena', t, flags=re.I)
    t = re.sub(r'\bMew\b', 'Miu', t, flags=re.I)
    t = re.sub(r'\bMiew\b', 'Miu', t, flags=re.I)
    t = re.sub(r'莉娜', 'Lena', t)
    t = re.sub(r'米尤', 'Miu', t)
    t = re.sub(r'苗苗', 'Miu', t)
    t = re.sub(r'米繆', 'Miu', t)
    t = re.sub(r'米歐', 'Miu', t)
    t = re.sub(r'P\s*Film', 'P\'Film', t, flags=re.I)
    t = re.sub(r'P\s*Joy', 'P\'Joy', t, flags=re.I)
    t = re.sub(r'P\s*Toey', 'P\'Toey', t, flags=re.I)
    t = re.sub(r'P\s*Dew', 'P\'Dew', t, flags=re.I)
    # Format space around English words
    t = re.sub(r'([\u4e00-\u9fa5])([A-Za-z0-9])', r'\1 \2', t)
    t = re.sub(r'([A-Za-z0-9])([\u4e00-\u9fa5])', r'\1 \2', t)
    # Remove any stray apostrophes except P'
    parts = []
    for token in t.split():
        if token in ["P'Film", "P'Joy", "P'Toey", "P'Dew", "P'Aom"]:
            parts.append(token)
        else:
            clean_token = token.replace("'", "").replace('"', '').replace('’', '').replace('‘', '')
            if clean_token:
                parts.append(clean_token)
    t = ' '.join(parts).strip()
    return t

zh_cues = []
bi_cues = []
json_items = []

missing_ids = []
empty_ids = []

for item in raw:
    idx = item['id']
    ts = item['timestamp']
    thai = item['thai']
    k = str(idx)
    tw = clean_tw(cache.get(k, ''))
    
    # If original was sound effect/blank (like id 1 'ั')
    if not tw and idx == 1:
        tw = ""
    elif not tw:
        empty_ids.append(idx)
        print(f"Warning: empty translation for id {idx}")
    
    zh_cues.append(f"{idx}\n{ts}\n{tw}\n")
    bi_cues.append(f"{idx}\n{ts}\n{tw}\n{thai}\n")
    json_items.append({
        "id": idx,
        "timestamp": ts,
        "original": thai,
        "translated": tw
    })

# Write output files
zh_srt_path = 'public/CC_LenaMiu_x_DARA_LIVE_2026_10_20_zh_TW.srt'
bi_srt_path = 'public/CC_LenaMiu_x_DARA_LIVE_2026_10_20_Bilingual.srt'
json_path = 'public/cc_dara_live_2026_10_20_data.json'

with open(zh_srt_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(zh_cues))

with open(bi_srt_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(bi_cues))

with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(json_items, f, ensure_ascii=False, indent=2)

print(f"Successfully exported {len(zh_cues)} cues to {zh_srt_path}")
print(f"Successfully exported {len(bi_cues)} cues to {bi_srt_path}")
print(f"Successfully exported JSON to {json_path}")
