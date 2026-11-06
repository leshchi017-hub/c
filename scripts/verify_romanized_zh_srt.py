import re

with open('public/assets/aistudio/CC_LenaMiu_2026_10_19_f7e4f457.srt', 'r', encoding='utf-8') as f:
    orig_text = f.read().strip()

with open('public/CC_LenaMiu_2026_10_19_Romanized_zh_TW.srt', 'r', encoding='utf-8') as f:
    comb_text = f.read().strip()

orig_blocks = re.split(r'\n\s*\n', orig_text)
comb_blocks = re.split(r'\n\s*\n', comb_text)

print(f"Orig blocks: {len(orig_blocks)}, Combined blocks: {len(comb_blocks)}")
assert len(orig_blocks) == len(comb_blocks) == 194

bad_punct_chars = set("，,。.\?!？！:：;；「」『』“”\"''`｀（）()【】[]{}、—–…~～#@*&^%$+=\\/|<>")

mismatched_timestamps = []
punct_found = []
empty_lines = []

for i in range(194):
    o_lines = orig_blocks[i].strip().split('\n')
    c_lines = comb_blocks[i].strip().split('\n')
    
    o_idx, o_ts = o_lines[0].strip(), o_lines[1].strip()
    c_idx, c_ts = c_lines[0].strip(), c_lines[1].strip()
    
    if len(c_lines) < 4:
        raise ValueError(f"Block {i+1} has fewer than 4 lines: {c_lines}")
    
    rom_line = c_lines[2].strip()
    zh_line = c_lines[3].strip()
    
    if o_ts != c_ts:
        mismatched_timestamps.append((i+1, o_ts, c_ts))
    if not rom_line:
        empty_lines.append((i+1, "rom"))
    if not zh_line:
        empty_lines.append((i+1, "zh"))
    
    for c in rom_line:
        if c in bad_punct_chars:
            punct_found.append((i+1, "rom", rom_line, c))
    for c in zh_line:
        if c in bad_punct_chars:
            punct_found.append((i+1, "zh", zh_line, c))

print(f"Mismatched timestamps: {len(mismatched_timestamps)}")
print(f"Punctuation violations: {len(punct_found)}")
print(f"Empty lines: {len(empty_lines)}")

if len(mismatched_timestamps) == 0 and len(punct_found) == 0 and len(empty_lines) == 0:
    print(">>> COMBINED ROMANIZED + ZH SRT 100% VERIFIED & COMPLIANT! <<<")
else:
    raise AssertionError(f"Verification failed: {punct_found}")
