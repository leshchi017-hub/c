import re
import json

def parse_srt(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    blocks = re.split(r'\n\s*\n', content.strip())
    parsed = []
    for b in blocks:
        lines = [l.strip() for l in b.strip().split('\n') if l.strip()]
        if len(lines) >= 2:
            idx = int(lines[0])
            ts = lines[1]
            text = ' '.join(lines[2:]).strip()
            parsed.append({
                'id': idx,
                'timestamp': ts,
                'text': text
            })
    return parsed

orig = parse_srt('public/assets/aistudio/CC_LenaMiu_x_DARA_LIVE_2026_10_20_a95d97e6.srt')
tw = parse_srt('public/CC_LenaMiu_x_DARA_LIVE_2026_10_20_zh_TW.srt')
bi = parse_srt('public/CC_LenaMiu_x_DARA_LIVE_2026_10_20_Bilingual.srt')

with open('public/cc_dara_live_2026_10_20_data.json', 'r', encoding='utf-8') as f:
    json_data = json.load(f)

print(f"=== VERIFICATION REPORT ===")
print(f"Original cues count: {len(orig)}")
print(f"zh_TW cues count:    {len(tw)}")
print(f"Bilingual cues count:{len(bi)}")
print(f"JSON items count:    {len(json_data)}")

assert len(orig) == 1772, "Original count is not 1772"
assert len(tw) == 1772, "zh_TW count is not 1772"
assert len(bi) == 1772, "Bilingual count is not 1772"
assert len(json_data) == 1772, "JSON count is not 1772"
print("✓ Count check PASSED: Exactly 1,772 cues across all files")

# Check timestamp matching
ts_mismatches = []
for i in range(1772):
    if orig[i]['id'] != tw[i]['id']:
        ts_mismatches.append(f"ID mismatch at {i}: orig {orig[i]['id']} vs tw {tw[i]['id']}")
    if orig[i]['timestamp'] != tw[i]['timestamp']:
        ts_mismatches.append(f"Timestamp mismatch at {orig[i]['id']}: orig '{orig[i]['timestamp']}' vs tw '{tw[i]['timestamp']}'")
    if orig[i]['timestamp'] != bi[i]['timestamp']:
        ts_mismatches.append(f"Timestamp mismatch at {orig[i]['id']} (bi): orig '{orig[i]['timestamp']}' vs bi '{bi[i]['timestamp']}'")
    if orig[i]['timestamp'] != json_data[i]['timestamp']:
        ts_mismatches.append(f"Timestamp mismatch at {orig[i]['id']} (json): orig '{orig[i]['timestamp']}' vs json '{json_data[i]['timestamp']}'")

if ts_mismatches:
    print(f"✗ Timestamp mismatches found: {len(ts_mismatches)}")
    for m in ts_mismatches[:5]:
        print("  ", m)
else:
    print("✓ Timestamp check PASSED: 100% bit-exact match across all 1,772 cues!")

# Punctuation check
forbidden_punct = set("，,。.\?!？！:：;；「」『』“”\"`｀（）()【】\[\]{}、—–…~～#@*&^%$+=\\/|<>•·")
punct_errors = []
for item in tw:
    chars = [c for c in item['text'] if c in forbidden_punct]
    if chars:
        punct_errors.append((item['id'], item['text'], "".join(chars)))

if punct_errors:
    print(f"✗ Punctuation check FAILED: {len(punct_errors)} items contain punctuation:")
    for err in punct_errors[:5]:
        print(f"  ID {err[0]}: '{err[1]}' (found '{err[2]}')")
else:
    print("✓ Punctuation check PASSED: 0 punctuation marks anywhere in the entire file!")

# Name check
name_violations = []
for item in tw:
    if re.search(r'(莉娜|米尤|苗苗|米繆|米歐)', item['text']):
        name_violations.append((item['id'], item['text']))

if name_violations:
    print(f"✗ Name check FAILED: {len(name_violations)} Chinese transliterations found")
else:
    print("✓ Name preservation check PASSED: Lena and Miu names preserved without translation!")

# Check empty translations
empty_cues = []
for item in tw:
    if not item['text'].strip() and item['id'] != 1:
        empty_cues.append(item['id'])

if empty_cues:
    print(f"✗ Empty translation cues: {empty_cues}")
else:
    print("✓ Completeness check PASSED: 0 missing or empty translations!")

print("\n=== SAMPLE AUDIT (Cues 1-10) ===")
for i in range(10):
    print(f"[{tw[i]['id']}] {tw[i]['timestamp']}")
    print(f"  THAI: {orig[i]['text']}")
    print(f"  ZH:   {tw[i]['text']}")

print("\n=== SAMPLE AUDIT (Love scene discuss Cues 60-70) ===")
for i in range(59, 70):
    print(f"[{tw[i]['id']}] {tw[i]['timestamp']}")
    print(f"  THAI: {orig[i]['text']}")
    print(f"  ZH:   {tw[i]['text']}")

print("\n=== SAMPLE AUDIT (Final theme song Cues 1765-1772) ===")
for i in range(1764, 1772):
    print(f"[{tw[i]['id']}] {tw[i]['timestamp']}")
    print(f"  THAI: {orig[i]['text']}")
    print(f"  ZH:   {tw[i]['text']}")
