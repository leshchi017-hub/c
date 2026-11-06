import json
import re
import os

with open("scripts/raw_all.srt", "r", encoding="utf-8") as f:
    raw_content = f.read().replace("\r\n", "\n")

blockRegex = re.compile(r"^(\d+)\n([^\n]+-->[^\n]+)\n([\s\S]*?)(?=(?:\n\d+\n[^\n]+-->|\Z))", re.MULTILINE)
items = []
for m in blockRegex.finditer(raw_content):
    items.append({
        "id": int(m.group(1)),
        "timestamp": m.group(2).strip(),
        "original": m.group(3).strip().replace("\n", " ")
    })

print(f"Loaded {len(items)} items from raw_all.srt")

with open("scripts/translated_cache.json", "r", encoding="utf-8") as f:
    cache = json.load(f)

def clean_tw(text):
    if not text:
        return ""
    # Remove commas and periods
    t = text.replace("，", " ").replace(",", " ").replace("。", " ").replace(".", " ")
    # Clean up double spaces
    t = re.sub(r"\s+", " ", t).strip()
    return t

final_entries = []
punctuation_violations = 0

for item in items:
    sub_id = str(item["id"])
    tw_raw = cache.get(sub_id, item["original"])
    tw = clean_tw(tw_raw)

    if any(c in tw for c in ["，", ",", "。", "."]):
        punctuation_violations += 1

    final_entries.append({
        "id": item["id"],
        "timestamp": item["timestamp"],
        "original": item["original"],
        "translated": tw
    })

os.makedirs("public", exist_ok=True)

# Generate final Traditional Chinese SRT
srt_lines = []
for entry in final_entries:
    srt_lines.append(str(entry["id"]))
    srt_lines.append(entry["timestamp"])
    srt_lines.append(entry["translated"])
    srt_lines.append("")

final_srt_content = "\n".join(srt_lines)
with open("public/subtitles_zh_tw.srt", "w", encoding="utf-8") as f:
    f.write(final_srt_content)

# Generate original English SRT
en_lines = []
for entry in final_entries:
    en_lines.append(str(entry["id"]))
    en_lines.append(entry["timestamp"])
    en_lines.append(entry["original"])
    en_lines.append("")

with open("public/subtitles_en.srt", "w", encoding="utf-8") as f:
    f.write("\n".join(en_lines))

# Generate JSON for React frontend
with open("public/subtitles_data.json", "w", encoding="utf-8") as f:
    json.dump(final_entries, f, ensure_ascii=False, indent=2)

print("\n" + "="*50)
print("FINAL SUBTITLE VALIDATION REPORT")
print("="*50)
print(f"Total Subtitle Items: {len(final_entries)}")
print(f"First Item: #{final_entries[0]['id']} | {final_entries[0]['timestamp']} -> {final_entries[0]['translated']}")
print(f"Last Item: #{final_entries[-1]['id']} | {final_entries[-1]['timestamp']} -> {final_entries[-1]['translated']}")
print(f"Total Comma / Period Violations: {punctuation_violations} (MUST BE 0)")

# Check if any original timestamp was altered
time_mismatches = 0
for orig, final in zip(items, final_entries):
    if orig["timestamp"] != final["timestamp"] or orig["id"] != final["id"]:
        time_mismatches += 1

print(f"Timestamp Mismatches: {time_mismatches} (MUST BE 0)")
print("Export files created:")
print(" - public/subtitles_zh_tw.srt")
print(" - public/subtitles_en.srt")
print(" - public/subtitles_data.json")
print("="*50 + "\n")
