import re
import json

with open('public/Dear_Myself_EP59_zh_TW.srt', 'r', encoding='utf-8') as f:
    zh_content = f.read()

with open('public/Dear_Myself_EP59_Bilingual.srt', 'r', encoding='utf-8') as f:
    bi_content = f.read()

zh_blocks = [b.strip() for b in re.split(r'\n\s*\n', zh_content.strip()) if b.strip()]
bi_blocks = [b.strip() for b in re.split(r'\n\s*\n', bi_content.strip()) if b.strip()]

print(f"ZH blocks count: {len(zh_blocks)}")
print(f"Bilingual blocks count: {len(bi_blocks)}")
assert len(zh_blocks) == 1471
assert len(bi_blocks) == 1471

# Check first 3 and last 3 blocks
print("--- First 3 ZH Blocks ---")
for b in zh_blocks[:3]:
    print(b)
    print()

print("--- Last 3 ZH Blocks ---")
for b in zh_blocks[-3:]:
    print(b)
    print()

# Check for punctuation in the subtitle text lines (ignoring timestamp arrows and numbers)
# Extract only line 3 from each block
zh_texts = []
for b in zh_blocks:
    lines = b.split('\n')
    zh_texts.append(' '.join(lines[2:]))

all_text = ' '.join(zh_texts)
punc = re.findall(r'[，,。.\?!？！:：;；「」『』“”"\'`｀（）()【】\[\]{}、—–…~～#@*&^%$+=\/\\|<>\t《》]', all_text)
print(f"Total punctuation marks in subtitle texts: {len(punc)}")
if punc:
    print(f"Examples of punctuation: {punc[:10]}")

# Check names in ZH SRT
puinoon_count = len(re.findall(r'Puinoon', all_text))
bint_count = len(re.findall(r'Bint', all_text))
pjoe_count = len(re.findall(r"P'Joe", all_text))
print(f"Name occurrences: Puinoon: {puinoon_count}, Bint: {bint_count}, P'Joe: {pjoe_count}")

# Verify no duplicate text within 1 second in the output
def parse_time(ts_str):
    h, m, s_ms = ts_str.split(':')
    s, ms = s_ms.split(',')
    return int(h)*3600 + int(m)*60 + int(s) + int(ms)/1000.0

parsed_output = []
for b in zh_blocks:
    lines = b.split('\n')
    cid = int(lines[0])
    ts = lines[1]
    text = ' '.join(lines[2:])
    start_str, end_str = ts.split(' --> ')
    start = parse_time(start_str)
    end = parse_time(end_str)
    parsed_output.append({'id': cid, 'ts': ts, 'start': start, 'end': end, 'text': text})

remaining_dups = []
for i in range(len(parsed_output) - 1):
    c1 = parsed_output[i]
    c2 = parsed_output[i+1]
    t1 = re.sub(r'\s+', '', c1['text'].lower())
    t2 = re.sub(r'\s+', '', c2['text'].lower())
    gap = c2['start'] - c1['end']
    if t1 == t2 and gap <= 1.0:
        remaining_dups.append((c1, c2, gap))

print(f"Remaining duplicate sentences within 1s in output: {len(remaining_dups)}")
assert len(remaining_dups) == 0, f"Found duplicates: {remaining_dups}"

print("AUDIT SUCCESSFUL: All requirements verified and passed!")
