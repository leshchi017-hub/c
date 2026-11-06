import re
import json

with open('public/PODKAZZ_EP24_LenaMiu_zh_TW.srt', 'r', encoding='utf-8') as f:
    text = f.read()

blocks = [b.strip() for b in re.split(r'\n\s*\n', text.strip()) if b.strip()]
print('Total blocks in PODKAZZ_EP24_LenaMiu_zh_TW.srt:', len(blocks))

# Check numbering 1..len(blocks)
for i, b in enumerate(blocks, 1):
    num = int(b.split('\n')[0].strip())
    if num != i:
        print(f'Numbering issue at block {i}: got {num}')
        break
else:
    print('Numbering 1..1550 perfectly sequential!')

# Check punctuation
# Chinese & English punctuation
disallowed_punct = set("，,。？！?!：:；;「」『』“”\"'’‘（）()、—–…~～#@*&^%$+=\\/|<>[\]{}｀`*·•_-")
lines_with_punct = []
for i, b in enumerate(blocks, 1):
    lines = b.split('\n')
    zh_text = ' '.join(lines[2:])
    found = [c for c in zh_text if c in disallowed_punct]
    if found:
        lines_with_punct.append((i, zh_text, found))

print(f'Blocks with punctuation: {len(lines_with_punct)}')
if lines_with_punct:
    for item in lines_with_punct[:15]:
        print(f'  #{item[0]}: {item[1]} (found {item[2]})')

# Check names
# The user specified:
# "訪談主角們的名字是Lena Lalina、Miu Natsha"
# "節目是 PODKAZZ"
# "主持人 Tong"
# "人名保留不動 不須翻譯"
banned_words = ['莉娜', '米尤', '苗苗', '米歐', '妮娜', 'Leena', 'Mew', 'Lina', 'Nutcha', 'Lita', 'Techamongkonphiwat']
found_banned = []
for i, b in enumerate(blocks, 1):
    zh_text = ' '.join(b.split('\n')[2:])
    for bw in banned_words:
        if bw in zh_text:
            found_banned.append((i, bw, zh_text))

print(f'Blocks with non-standard names or untranslated transliterations: {len(found_banned)}')
if found_banned:
    for item in found_banned[:20]:
        print(f'  #{item[0]} [{item[1]}]: {item[2]}')

# Check name occurrences of Lena and Miu
lena_count = sum(1 for b in blocks if 'Lena' in b.split('\n')[2])
miu_count = sum(1 for b in blocks if 'Miu' in b.split('\n')[2])
tong_count = sum(1 for b in blocks if 'Tong' in b.split('\n')[2])
print(f'Occurrences: Lena: {lena_count}, Miu: {miu_count}, Tong: {tong_count}')
