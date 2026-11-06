import re

with open('public/assets/aistudio/CC_LenaMiu_2026_10_19_f7e4f457.srt', 'r', encoding='utf-8') as f:
    orig_text = f.read().strip()

with open('public/CC_LenaMiu_2026_10_19_zh_TW.srt', 'r', encoding='utf-8') as f:
    zh_text = f.read().strip()

orig_blocks = re.split(r'\n\s*\n', orig_text)
zh_blocks = re.split(r'\n\s*\n', zh_text)

print(f"Orig blocks: {len(orig_blocks)}, ZH blocks: {len(zh_blocks)}")
assert len(orig_blocks) == len(zh_blocks) == 194

bad_punct_chars = set("，,。.\?!？！:：;；「」『』“”\"''`｀（）()【】[]{}、—–…~～#@*&^%$+=\\/|<>")

mismatched_timestamps = []
punct_found = []
empty_lines = []

for i in range(194):
    o_lines = orig_blocks[i].strip().split('\n')
    z_lines = zh_blocks[i].strip().split('\n')
    
    o_idx, o_ts = o_lines[0].strip(), o_lines[1].strip()
    z_idx, z_ts = z_lines[0].strip(), z_lines[1].strip()
    z_content = ' '.join(z_lines[2:]).strip()
    
    if o_ts != z_ts:
        mismatched_timestamps.append((i+1, o_ts, z_ts))
    if not z_content:
        empty_lines.append(i+1)
    
    found_chars = [c for c in z_content if c in bad_punct_chars]
    if found_chars:
        punct_found.append((i+1, z_content, found_chars))

print(f"Mismatched timestamps: {len(mismatched_timestamps)}")
print(f"Punctuation found: {len(punct_found)}")
if punct_found:
    print("Samples with punct:", punct_found[:5])
print(f"Empty lines: {len(empty_lines)}")

if len(mismatched_timestamps) == 0 and len(punct_found) == 0 and len(empty_lines) == 0:
    print(">>> ALL VERIFICATIONS PASSED 100% PERFECTLY! <<<")
else:
    raise AssertionError("Verification failed")
