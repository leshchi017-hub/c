import sys
import re
sys.path.append('scripts')
from podkazz_part1 import TRANS_PART1
from podkazz_part2 import TRANS_PART2
from podkazz_part3 import TRANS_PART3
from podkazz_part4 import TRANS_PART4
from podkazz_part5 import TRANS_PART5
from podkazz_part6 import TRANS_PART6

combined = {}
for p in [TRANS_PART1, TRANS_PART2, TRANS_PART3, TRANS_PART4, TRANS_PART5, TRANS_PART6]:
    combined.update(p)

print('Total cues in parts:', len(combined))
disallowed_punct = set("，,。？！?!：:；;「」『』“”\"'’‘（）()、—–…~～#@*&^%$+=\\/|<>[\]{}｀`*·•_-")
punct_items = []
for cid, text in sorted(combined.items()):
    found = [c for c in text if c in disallowed_punct]
    if found:
        punct_items.append((cid, found, text))

print(f'Items with punctuation in raw parts: {len(punct_items)}')
for item in punct_items[:10]:
    print(f'Cue {item[0]}: {item[1]} in {item[2]}')
