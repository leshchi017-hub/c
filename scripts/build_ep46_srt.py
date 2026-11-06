import re
import os
import json
from ep46_part1 import part1
from ep46_part2 import part2
from ep46_part3 import part3
from ep46_part4 import part4
from ep46_part5 import part5
from ep46_part6 import part6

# Combine all parts
all_trans = {}
all_trans.update(part1)
all_trans.update(part2)
all_trans.update(part3)
all_trans.update(part4)
all_trans.update(part5)
all_trans.update(part6)

print(f"Total translations loaded: {len(all_trans)}")

# Strict punctuation stripper for Chinese subtitles
# User requirement: "不須加 標點符號"
def strip_all_punctuation(text):
    if not text:
        return ""
    # Remove dialog dashes or bullets
    t = re.sub(r'^[-–—\s]+', '', text)
    # Remove punctuation: commas, periods, question marks, exclamation marks,
    # colons, semicolons, quotes, ellipses, brackets, tildes, hyphens, slashes
    t = re.sub(r'[，,。.\?!？！:：;；「」『』“”"\'`｀（）()【】\[\]{}、—–…~～#@*&^%$+=\/\\|<>\n\r\t《》]', ' ', t)
    # Normalize multiple spaces to single space
    t = re.sub(r'\s+', ' ', t).strip()
    return t

# Clean and ensure names
for i in range(1, 904):
    if i not in all_trans:
        raise ValueError(f"Missing translation for ID {i}")
    raw = all_trans[i]
    cleaned = strip_all_punctuation(raw)
    # Ensure correct names
    cleaned = re.sub(r'鄺玲玲|玲玲', 'Ling', cleaned)
    cleaned = re.sub(r'奧姆|諾帕達', 'Orm', cleaned)
    cleaned = re.sub(r'\b喬\b', 'Joe', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    all_trans[i] = cleaned

# Read original srt
orig_path = 'public/assets/aistudio/Eng_Sub_Dear_Myself_EP_46_07b2d674.srt'
with open(orig_path, 'r', encoding='utf-8') as f:
    orig_content = f.read().strip()

blocks = re.split(r'\n\s*\n', orig_content)
print(f"Original blocks read: {len(blocks)}")

parsed_cues = []
for idx, b in enumerate(blocks):
    lines = [l.strip() for l in b.split('\n') if l.strip()]
    if len(lines) >= 3:
        cue_id = int(lines[0])
        ts = lines[1]
        orig_text = ' '.join(lines[2:])
        parsed_cues.append({
            'id': cue_id,
            'timestamp': ts,
            'original': orig_text
        })
    else:
        raise ValueError(f"Invalid block {idx}: {lines}")

print(f"Parsed {len(parsed_cues)} original cues")
assert len(parsed_cues) == 903, f"Expected 903 cues, got {len(parsed_cues)}"

# Output files
zh_tw_srt_lines = []
bilingual_srt_lines = []
json_data = []

for cue in parsed_cues:
    cid = cue['id']
    ts = cue['timestamp']
    orig = cue['original']
    tw = all_trans[cid]

    # Verify no punctuation in tw
    punc_match = re.search(r'[，,。.\?!？！:：;；「」『』“”"\'（）()、—–…~～《》]', tw)
    if punc_match:
        print(f"Warning: Found punctuation '{punc_match.group()}' in cue {cid}: {tw}")

    # Pure Traditional Chinese SRT
    zh_tw_srt_lines.append(f"{cid}\n{ts}\n{tw}\n")

    # Bilingual SRT
    bilingual_srt_lines.append(f"{cid}\n{ts}\n{tw}\n{orig}\n")

    # JSON item for web UI
    json_data.append({
        'id': cid,
        'timestamp': ts,
        'original': orig,
        'translated': tw
    })

zh_tw_srt_content = '\n'.join(zh_tw_srt_lines).strip() + '\n'
bilingual_srt_content = '\n'.join(bilingual_srt_lines).strip() + '\n'

# Save files
out_zh_path = 'public/Dear_Myself_EP46_LingOrm_zh_TW.srt'
out_bi_path = 'public/Dear_Myself_EP46_LingOrm_Bilingual.srt'
out_json_path = 'public/dear_myself_ep46_data.json'

with open(out_zh_path, 'w', encoding='utf-8') as f:
    f.write(zh_tw_srt_content)
print(f"Saved: {out_zh_path} ({len(zh_tw_srt_content)} bytes)")

with open(out_bi_path, 'w', encoding='utf-8') as f:
    f.write(bilingual_srt_content)
print(f"Saved: {out_bi_path} ({len(bilingual_srt_content)} bytes)")

with open(out_json_path, 'w', encoding='utf-8') as f:
    json.dump(json_data, f, ensure_ascii=False, indent=2)
print(f"Saved: {out_json_path} ({len(json_data)} items)")

print("BUILD SUCCESSFUL! All 903 cues processed, validated, and exported.")
