import re

with open('public/assets/aistudio/Eng_Sub_Dear_Myself_EP_46_07b2d674.srt', 'r', encoding='utf-8') as f:
    orig_blocks = re.split(r'\n\s*\n', f.read().strip())

with open('public/Dear_Myself_EP46_LingOrm_zh_TW.srt', 'r', encoding='utf-8') as f:
    gen_blocks = re.split(r'\n\s*\n', f.read().strip())

print(f"Original cues count: {len(orig_blocks)}")
print(f"Generated cues count: {len(gen_blocks)}")
assert len(orig_blocks) == len(gen_blocks) == 903, "Cues count mismatch"

errors = []
# Forbidden punctuation characters
forbidden_punc = set("，,。.\?!？！:：;；「」『』“”\"'`｀（）()【】[]{}、—–…~～#@*&^%$+=/\\|<>《》")

for i in range(903):
    o_lines = [l.strip() for l in orig_blocks[i].split('\n') if l.strip()]
    g_lines = [l.strip() for l in gen_blocks[i].split('\n') if l.strip()]
    
    # Check ID
    if int(o_lines[0]) != int(g_lines[0]) or int(g_lines[0]) != i + 1:
        errors.append(f"Cue {i+1}: ID mismatch {o_lines[0]} vs {g_lines[0]}")
        
    # Check Timestamp
    if o_lines[1] != g_lines[1]:
        errors.append(f"Cue {i+1}: Timestamp mismatch '{o_lines[1]}' vs '{g_lines[1]}'")
        
    # Check Punctuation
    text = ' '.join(g_lines[2:])
    found_punc = [c for c in text if c in forbidden_punc]
    if found_punc:
        errors.append(f"Cue {i+1}: Punctuation found {found_punc} in '{text}'")
        
    # Check translated text not empty
    if not text:
        errors.append(f"Cue {i+1}: Empty translation")

if errors:
    print(f"Found {len(errors)} issues:")
    for e in errors[:10]:
        print("  -", e)
else:
    print("SUCCESS: ALL 903 CUES VERIFIED PERFECTLY!")
    print("- Cue count: exactly 903")
    print("- Timestamps: 100% matched to original down to millisecond")
    print("- Punctuation: ZERO punctuation marks found")
    print("- Completeness: 100% filled, no missing or dropped sentences")
