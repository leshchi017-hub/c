import re

def parse_srt(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read().replace('\r\n', '\n').strip()
    blocks = [b.strip() for b in content.split('\n\n') if b.strip()]
    cues = []
    for b in blocks:
        lines = b.split('\n')
        idx = int(lines[0])
        ts = lines[1]
        text = " ".join(lines[2:]).strip()
        cues.append({'id': idx, 'ts': ts, 'text': text})
    return cues

orig_cues = parse_srt('public/assets/aistudio/CC_LenaMiu_2026_10_23_3e62caac.srt')
tw_cues = parse_srt('public/CC_LenaMiu_2026_10_23_zh_TW.srt')
bi_cues = parse_srt('public/CC_LenaMiu_2026_10_23_Bilingual.srt')

print(f"Original cues count: {len(orig_cues)}")
print(f"Traditional Chinese cues count: {len(tw_cues)}")
print(f"Bilingual cues count: {len(bi_cues)}")

assert len(orig_cues) == 501, "Original cues must be 501"
assert len(tw_cues) == 501, "TW cues must be 501"
assert len(bi_cues) == 501, "Bilingual cues must be 501"

# Verify timestamps exact match
ts_mismatches = []
for i in range(501):
    o = orig_cues[i]
    t = tw_cues[i]
    if o['id'] != t['id'] or o['ts'] != t['ts']:
        ts_mismatches.append((o['id'], o['ts'], t['id'], t['ts']))

print(f"Timestamp mismatches count: {len(ts_mismatches)}")
assert len(ts_mismatches) == 0, f"Found timestamp mismatches: {ts_mismatches}"

# Verify no punctuation in zh_TW
punct_chars = set("，,。？！?!：:；;「」『』“”\"''（）()、—–…~～#@*&^%$+=\\/|<>[\]{}｀`*·•_-")
punct_errors = []
for t in tw_cues:
    found = [c for c in t['text'] if c in punct_chars]
    if found:
        punct_errors.append((t['id'], t['text'], found))

print(f"Punctuation errors in TW subtitles: {len(punct_errors)}")
assert len(punct_errors) == 0, f"Found punctuation errors: {punct_errors}"

# Verify no banned words
banned = ["莉娜", "米尤", "喵喵", "妮娜", "米歐", "苗苗"]
banned_errors = []
for t in tw_cues:
    for b in banned:
        if b in t['text']:
            banned_errors.append((t['id'], t['text'], b))

print(f"Banned word errors: {len(banned_errors)}")
assert len(banned_errors) == 0, f"Found banned words: {banned_errors}"

# Verify no empty cues
empty_cues = [t['id'] for t in tw_cues if not t['text'].strip()]
print(f"Empty cues: {len(empty_cues)}")
assert len(empty_cues) == 0, f"Found empty cues: {empty_cues}"

print("\nALL VERIFICATION CHECKS PASSED PERFECTLY (100% COMPLIANT)!")
