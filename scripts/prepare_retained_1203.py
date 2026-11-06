import os
import re
import json
import urllib.request

api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("GEMINI_API_KEY not found!")
    exit(1)

def parse_time(ts):
    h, m, s = ts.split(":")
    s, ms = s.split(",")
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000.0

with open("public/assets/aistudio/Namtan_Film_Interview_-____1d3b9298.srt", "r", encoding="utf-8") as f:
    blocks = [b.strip() for b in f.read().replace("\r\n", "\n").strip().split("\n\n") if b.strip()]

cues = []
for b in blocks:
    lines = b.split("\n")
    cid = int(lines[0].strip())
    tstart, tend = lines[1].split("-->")
    text = " ".join(lines[2:]).strip()
    cues.append({
        "id": cid,
        "timestamp": lines[1].strip(),
        "start": parse_time(tstart.strip()),
        "end": parse_time(tend.strip()),
        "duration": parse_time(tend.strip()) - parse_time(tstart.strip()),
        "text": text
    })

print(f"Loaded {len(cues)} cues from attachment.")

# Step 1: Remove bracketed terms [...]
for c in cues:
    c["clean_text"] = re.sub(r"\[[^\]]+\]", "", c["text"]).strip()

# Step 2: Identify 1-second duplicates and delete the shorter one
deleted_ids = set()
for i in range(len(cues) - 1):
    c1 = cues[i]
    c2 = cues[i+1]
    if c1["id"] in deleted_ids:
        continue
    gap = c2["start"] - c1["end"]
    t1 = c1["clean_text"]
    t2 = c2["clean_text"]
    def strip_fillers(t):
        return re.sub(r"\s*(อื|อือ|อ่า|เอ|เอ่อ|แล้ว|วอ|อ|โอเค|ครับ|ค่ะ|นะ|เนาะ|วะ|ๆ|ใช่)+\s*$", "", t).strip()
    s1 = strip_fillers(t1)
    s2 = strip_fillers(t2)
    if gap <= 1.0 and s1 and s2:
        if s1 == s2 or s1.startswith(s2) or s2.startswith(s1):
            if min(len(s1), len(s2)) / max(len(s1), len(s2)) > 0.4:
                shorter = c1 if c1["duration"] < c2["duration"] else c2
                deleted_ids.add(shorter["id"])

# Also cues that became empty after removing [...]
for c in cues:
    if not c["clean_text"]:
        deleted_ids.add(c["id"])

print(f"Total cues to delete: {len(deleted_ids)}")
print(f"Deleted IDs: {sorted(list(deleted_ids))}")

retained_cues = [c for c in cues if c["id"] not in deleted_ids]
print(f"Total retained cues to translate: {len(retained_cues)}")

with open("scripts/retained_cues_1203_1698.json", "w", encoding="utf-8") as f:
    json.dump(retained_cues, f, ensure_ascii=False, indent=2)

print("Saved scripts/retained_cues_1203_1698.json")
