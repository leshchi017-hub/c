import json
import re

with open('scripts/cc_lenamiu_cache.json', 'r', encoding='utf-8') as f:
    cache = json.load(f)

with open('scripts/raw_cc_lenamiu.json', 'r', encoding='utf-8') as f:
    raw = json.load(f)

print(f"Total raw: {len(raw)}, Total cached: {len(cache)}")

missing = [r['id'] for r in raw if str(r['id']) not in cache or not str(cache[str(r['id'])]).strip()]
print(f"Missing or empty IDs: {missing}")

# Check punctuation (excluding spaces)
punct_chars = set("，,。？！?!：:；;「」『』“”\"''（）()、—–…~～#@*&^%$+=\\/|<>[\]{}｀`*·•_-")
punct_found = []
for k, v in cache.items():
    found = [c for c in v if c in punct_chars]
    if found:
        punct_found.append((k, v, found))

print(f"Punctuation found in {len(punct_found)} items")
if punct_found:
    for item in punct_found[:10]:
        print(f"  ID {item[0]}: {item[1]} (found: {item[2]})")

# Check banned name translations
banned_words = ["莉娜", "米尤", "喵喵", "妮娜", "米歐", "苗苗"]
banned_found = []
for k, v in cache.items():
    for bw in banned_words:
        if bw in v:
            banned_found.append((k, v, bw))

print(f"Banned name translations found in {len(banned_found)} items")
if banned_found:
    for item in banned_found[:10]:
        print(f"  ID {item[0]}: {item[1]} (found: {item[2]})")

# Print first 20 items and last 20 items to check naturalness
print("\n--- FIRST 15 ITEMS ---")
for r in raw[:15]:
    k = str(r['id'])
    print(f"[{r['id']}] {r['timestamp']}")
    print(f"  Thai: {r['thai']}")
    print(f"  TW:   {cache.get(k, '')}")

print("\n--- SAMPLE MID ITEMS (180-195) ---")
for r in raw[180:195]:
    k = str(r['id'])
    print(f"[{r['id']}] {r['timestamp']}")
    print(f"  Thai: {r['thai']}")
    print(f"  TW:   {cache.get(k, '')}")

print("\n--- LAST 15 ITEMS ---")
for r in raw[-15:]:
    k = str(r['id'])
    print(f"[{r['id']}] {r['timestamp']}")
    print(f"  Thai: {r['thai']}")
    print(f"  TW:   {cache.get(k, '')}")
