import sys
import os
import re
import json

# Add scripts directory to path
sys.path.insert(0, os.path.abspath('scripts'))

with open('scripts/raw_ep59_retained.json', 'r', encoding='utf-8') as f:
    cues = json.load(f)

print(f"Total retained cues: {len(cues)}")

from ep59_part1 import part1
from ep59_part2 import part2
from ep59_part3 import part3
from ep59_part4 import part4
from ep59_part5 import part5
from ep59_part6 import part6
from ep59_part7 import part7
from ep59_part8 import part8
from ep59_part9 import part9
from ep59_part10 import part10

all_trans = {}
for p in [part1, part2, part3, part4, part5, part6, part7, part8, part9, part10]:
    all_trans.update(p)

print(f"Total translations loaded: {len(all_trans)}")

missing = []
for i in range(1, len(cues) + 1):
    if i not in all_trans:
        missing.append(i)

if missing:
    print(f"ERROR: Missing IDs: {missing[:20]} (total {len(missing)})")
    sys.exit(1)
else:
    print("SUCCESS: All 1471 cue IDs are present!")

# Strict punctuation stripper for Chinese subtitles
# User requirement: "不須加 標點符號"
def strip_all_punctuation(text):
    if not text:
        return ""
    # Protect Thai honorific names: P'Joe, P'Bin, P'Mint, P'Ew
    t = text
    t = re.sub(r"P'Joe", "___P_JOE___", t)
    t = re.sub(r"P'Bin", "___P_BIN___", t)
    t = re.sub(r"P'Mint", "___P_MINT___", t)
    t = re.sub(r"P'Ew", "___P_EW___", t)
    
    # Remove dialog dashes or bullets
    t = re.sub(r'^[-–—\s]+', '', t)
    # Remove all punctuation
    t = re.sub(r'[，,。.\?!？！:：;；「」『』“”"\'`｀（）()【】\[\]{}、—–…~～#@*&^%$+=\/\\|<>\n\r\t《》]', ' ', t)
    
    # Restore protected names
    t = t.replace("___P_JOE___", "P'Joe")
    t = t.replace("___P_BIN___", "P'Bin")
    t = t.replace("___P_MINT___", "P'Mint")
    t = t.replace("___P_EW___", "P'Ew")
    
    # Normalize multiple spaces to single space
    t = re.sub(r'\s+', ' ', t).strip()
    return t

# Clean and ensure names
for i in range(1, len(cues) + 1):
    raw = all_trans[i]
    cleaned = strip_all_punctuation(raw)
    
    # Ensure correct names
    # Host: P'Joe
    cleaned = re.sub(r'\b喬哥\b|\b喬\b|\bP喬\b|\bP Joe\b', "P'Joe", cleaned)
    # Puinoon
    cleaned = re.sub(r'普伊農|小農', 'Puinoon', cleaned)
    # Bint
    cleaned = re.sub(r'賓特|小賓', 'Bint', cleaned)
    
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    all_trans[i] = cleaned

# Verify zero punctuation (apostrophe in P' is the only allowable English character)
punc_pattern = re.compile(r'[，,。.\?!？！:：;；「」『』“”"`｀（）()【】\[\]{}、—–…~～#@*&^%$+=\/\\|<>\t《》]')
punc_errors = []
for i in range(1, len(cues) + 1):
    text = all_trans[i]
    m = punc_pattern.search(text)
    if m:
        punc_errors.append((i, m.group(), text))

if punc_errors:
    print(f"Found {len(punc_errors)} punctuation errors: {punc_errors[:10]}")
    sys.exit(1)
else:
    print("SUCCESS: 0 sentence punctuation marks across all 1471 translations!")

# Build SRT lines
zh_tw_srt_lines = []
bilingual_srt_lines = []
json_data = []

for idx, cue in enumerate(cues):
    new_id = idx + 1
    ts = cue['ts']
    orig = cue['text']
    tw = all_trans[new_id]

    # Traditional Chinese SRT
    zh_tw_srt_lines.append(f"{new_id}\n{ts}\n{tw}\n")

    # Bilingual SRT
    bilingual_srt_lines.append(f"{new_id}\n{ts}\n{tw}\n{orig}\n")

    # JSON item for web UI
    json_data.append({
        'id': new_id,
        'timestamp': ts,
        'original': orig,
        'translated': tw
    })

# Write Traditional Chinese SRT
zh_path = 'public/Dear_Myself_EP59_zh_TW.srt'
with open(zh_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(zh_tw_srt_lines).strip() + '\n')
print(f"Generated Traditional Chinese SRT: {zh_path} ({len(zh_tw_srt_lines)} cues)")

# Write Bilingual SRT
bilingual_path = 'public/Dear_Myself_EP59_Bilingual.srt'
with open(bilingual_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(bilingual_srt_lines).strip() + '\n')
print(f"Generated Bilingual SRT: {bilingual_path} ({len(bilingual_srt_lines)} cues)")

# Write JSON data for Web UI
json_path = 'public/dear_myself_ep59_data.json'
with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(json_data, f, ensure_ascii=False, indent=2)
print(f"Generated Web UI JSON data: {json_path} ({len(json_data)} items)")

print("ALL EP59 SUBTITLE ASSETS SUCCESSFULLY CREATED!")
