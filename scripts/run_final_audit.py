# -*- coding: utf-8 -*-
import json
import re

with open('public/assets/aistudio/Pls_Love_Final_EP_Fan_Moment_with_LenaMiu_Event_coverage_30_fd7cd7cb.srt', 'r', encoding='utf-8') as f:
    orig_text = f.read()

with open('public/Pls_Love_Final_EP_Fan_Moment_with_LenaMiu_zh_TW.srt', 'r', encoding='utf-8') as f:
    zh_text = f.read()

orig_blocks = re.split(r'\n\s*\n', orig_text.strip())
zh_blocks = re.split(r'\n\s*\n', zh_text.strip())

print(f'Total orig cues: {len(orig_blocks)}, Total zh_TW cues: {len(zh_blocks)}')
assert len(orig_blocks) == len(zh_blocks) == 660, 'Cue counts must be 660!'

disallowed = set("，。！？：；「」『』、“”…—（）《》【】,.!?;:\"[]()_~`<>/")
punct_violations = []

for i in range(660):
    o_b = orig_blocks[i].split('\n')
    z_b = zh_blocks[i].split('\n')
    
    o_id, o_ts = o_b[0].strip(), o_b[1].strip()
    z_id, z_ts = z_b[0].strip(), z_b[1].strip()
    z_content = ' '.join(z_b[2:]).strip()
    
    assert o_id == z_id == str(i+1), f'ID mismatch at {i+1}'
    assert o_ts == z_ts, f'Timestamp mismatch at {i+1}: {o_ts} vs {z_ts}'
    assert len(z_content) > 0, f'Empty content at cue {i+1}'
    
    v = [c for c in z_content if c in disallowed]
    if v:
        punct_violations.append((i+1, v, z_content))

print(f'Timestamp match: 100% (660/660 identical)')
print(f'Punctuation violations count: {len(punct_violations)}')
if punct_violations:
    print('Violations found:', punct_violations[:5])
else:
    print('PUNCTUATION AUDIT: PASSED (Zero illegal punctuation marks across entire file)')

# Print samples
print('\n--- FIRST 3 CUES ---')
for b in zh_blocks[:3]:
    print(b)
    print()

print('\n--- FAMOUS SCENE CUES (64-69) ---')
for b in zh_blocks[63:69]:
    print(b)
    print()

print('\n--- FINAL 3 CUES ---')
for b in zh_blocks[-3:]:
    print(b)
    print()
