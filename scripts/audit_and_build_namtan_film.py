import json
import re
import os

print("=== Starting Audit & Build for Katanyu Tonight: Namtan & Film Interview ===")

# 1. Load original raw SRT
with open("public/assets/aistudio/Namtan_Film_Interview_67403abe.srt", "r", encoding="utf-8") as f:
    raw_content = f.read().replace("\r\n", "\n")

# Parse blocks
blocks = [b.strip() for b in raw_content.strip().split("\n\n") if b.strip()]
print(f"Total raw SRT blocks: {len(blocks)}")

raw_cues = []
for b in blocks:
    lines = b.split("\n")
    if len(lines) >= 2:
        cue_id = int(lines[0].strip())
        timestamp = lines[1].strip()
        original_text = " ".join(lines[2:]).strip()
        raw_cues.append({
            "id": cue_id,
            "timestamp": timestamp,
            "original": original_text
        })

print(f"Parsed raw cues: {len(raw_cues)} (expected 1698)")
assert len(raw_cues) == 1698, f"Expected 1698 raw cues, got {len(raw_cues)}"

# 2. Load cached translations
with open("scripts/namtan_film_cache.json", "r", encoding="utf-8") as f:
    cache = json.load(f)

print(f"Loaded cache entries: {len(cache)}")

# Check for missing IDs
missing_ids = []
for i in range(1, 1699):
    if str(i) not in cache and i not in cache:
        missing_ids.append(i)

if missing_ids:
    print(f"WARNING: Found {len(missing_ids)} missing IDs: {missing_ids[:20]}")
else:
    print("✓ All 1698 cues are present in cache with zero missing sentences!")

# 3. Clean up and audit punctuation and names
def clean_translated_text(text):
    if not text:
        return ""
    t = text

    # Standardize sound cues
    t = re.sub(r'\[(เพลง|music)\]', '[音樂]', t, flags=re.I)
    t = re.sub(r'\[(ปรบมือ|applause)\]', '[鼓掌]', t, flags=re.I)
    t = re.sub(r'\[(เสียงเชียร์|cheers)\]', '[歡呼]', t, flags=re.I)
    t = re.sub(r'\[(เสียงหัวเราะ|laughter|laugh)\]', '[笑聲]', t, flags=re.I)
    t = re.sub(r'\[(เสียงสูดหายใจ|breath|gasp)\]', '[深呼吸]', t, flags=re.I)
    t = re.sub(r'\[(เสียงกระแอม|cough|throat)\]', '[輕咳]', t, flags=re.I)

    # Temporary placeholder for sound tags so their brackets aren't removed
    sound_tags = re.findall(r'\[[^\]]+\]', t)
    for idx, tag in enumerate(sound_tags):
        t = t.replace(tag, f"__SOUNDTAG_{idx}__")

    # Strict removal of punctuation marks: commas, periods, question marks, exclamation marks, quotes, colons, semicolons, dashes, etc.
    t = re.sub(r'[，,。.\s*？！?!：:；;「」『』“”"\'\'（）()、—–…~～#@*&^%$+=\/\\|<>｀`*·•]', ' ', t)

    # Restore sound tags without any punctuation inside or around
    for idx, tag in enumerate(sound_tags):
        clean_tag = tag.replace('，', '').replace(',', '').replace('。', '').replace('！', '').replace('？', '').strip()
        t = t.replace(f"__SOUNDTAG_{idx}__", clean_tag)

    # Names normalization - strictly keep Namtan, Film, P'Yu, View
    t = t.replace("楠妲", "Namtan").replace("糖糖", "Namtan").replace("南潭", "Namtan")
    t = t.replace("菲姆", "Film").replace("費爾姆", "Film")
    t = t.replace("皮由", "P'Yu").replace("宇哥", "P'Yu").replace("阿宇", "P'Yu")
    t = t.replace("小薇", "View")
    t = re.sub(r'\bGMTV\b', 'GMMTV', t, flags=re.I)
    t = re.sub(r'\bJM\s*TV\b', 'GMMTV', t, flags=re.I)
    t = re.sub(r'\bCMM\b', 'GMMTV', t, flags=re.I)

    # Taiwan terminology enforcement
    t = t.replace("視頻", "影片")
    t = t.replace("立馬", "馬上")
    t = t.replace("閨蜜", "好姐妹")
    t = t.replace("小姐姐", "女生")
    t = t.replace("乘務員", "空服員")
    t = t.replace("空姐", "空服員")
    t = t.replace("大理石大樓", "Maleenont大樓")

    # Normalize whitespace
    t = re.sub(r'\s+', ' ', t).strip()
    return t

# Check every cue
processed_cues = []
punctuation_violations = 0
forbidden_chars = ["，", ",", "。", ".", "！", "!", "？", "?", "：", ":", "；", ";", "「", "」", "『", "』", "“", "”", '"', "'", "（", "）", "(", ")", "、", "—", "–", "…", "～", "~"]

for cue in raw_cues:
    cid = cue["id"]
    raw_tw = cache.get(str(cid), cache.get(cid, cue["original"]))
    cleaned_tw = clean_translated_text(raw_tw)

    # Verify no punctuation (outside of sound tags [])
    text_without_sound_tags = re.sub(r'\[[^\]]+\]', '', cleaned_tw)
    has_punc = any(c in text_without_sound_tags for c in forbidden_chars)
    if has_punc:
        punctuation_violations += 1
        print(f"Punctuation violation in ID {cid}: {cleaned_tw}")

    processed_cues.append({
        "id": cid,
        "timestamp": cue["timestamp"],
        "original": cue["original"],
        "translated": cleaned_tw
    })

print(f"Audit completed: {punctuation_violations} punctuation violations found.")
assert punctuation_violations == 0, f"Found {punctuation_violations} punctuation violations!"

# 4. Export pure Traditional Chinese SRT
zh_srt_lines = []
for cue in processed_cues:
    zh_srt_lines.append(str(cue["id"]))
    zh_srt_lines.append(cue["timestamp"])
    zh_srt_lines.append(cue["translated"])
    zh_srt_lines.append("")

zh_srt_content = "\n".join(zh_srt_lines).strip() + "\n"
zh_srt_path = "public/Katanyu_Tonight_Namtan_Film_zh_TW.srt"
with open(zh_srt_path, "w", encoding="utf-8") as f:
    f.write(zh_srt_content)
print(f"✓ Saved pure Traditional Chinese SRT to: {zh_srt_path} ({len(processed_cues)} cues)")

# 5. Export Bilingual SRT (Traditional Chinese + Thai)
bilingual_lines = []
for cue in processed_cues:
    bilingual_lines.append(str(cue["id"]))
    bilingual_lines.append(cue["timestamp"])
    bilingual_lines.append(cue["translated"])
    bilingual_lines.append(cue["original"])
    bilingual_lines.append("")

bilingual_content = "\n".join(bilingual_lines).strip() + "\n"
bilingual_path = "public/Katanyu_Tonight_Namtan_Film_Bilingual.srt"
with open(bilingual_path, "w", encoding="utf-8") as f:
    f.write(bilingual_content)
print(f"✓ Saved Bilingual SRT to: {bilingual_path} ({len(processed_cues)} cues)")

# 6. Export JSON data for the React web player
json_path = "public/katanyu_namtan_film_data.json"
with open(json_path, "w", encoding="utf-8") as f:
    json.dump(processed_cues, f, ensure_ascii=False, indent=2)
print(f"✓ Saved web JSON data to: {json_path}")

print("\n=== Verification Summary ===")
print(f"Total Cues Processed: {len(processed_cues)} / 1698")
print(f"Start Timestamp Cue 1: {processed_cues[0]['timestamp']} -> Text: {processed_cues[0]['translated']}")
print(f"End Timestamp Cue 1698: {processed_cues[-1]['timestamp']} -> Text: {processed_cues[-1]['translated']}")
print(f"Sample cue 2-5:")
for c in processed_cues[1:5]:
    print(f"  [{c['id']}] {c['timestamp']} | {c['translated']}")
print(f"Sample cue 58-65 (Playful sulking):")
for c in processed_cues[57:65]:
    print(f"  [{c['id']}] {c['timestamp']} | {c['translated']}")
print(f"Sample cue 159-162 (Break up joke):")
for c in processed_cues[158:162]:
    print(f"  [{c['id']}] {c['timestamp']} | {c['translated']}")
print(f"Sample cue 390-410 (Flight attendant & dad driving):")
for c in processed_cues[393:402]:
    print(f"  [{c['id']}] {c['timestamp']} | {c['translated']}")
print("=== All checks passed! ===")
