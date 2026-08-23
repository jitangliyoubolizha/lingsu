"""Extract all original clauses from Shang Han Lun chapters into a reference document."""
import yaml
from pathlib import Path
from collections import Counter

# Use BaseLoader to avoid YAML 1.1 boolean parsing of "no" -> False
base = Path("content/shanghanlun/sb")

with open(base / "edition.yaml", encoding="utf-8") as f:
    edition = yaml.load(f, Loader=yaml.BaseLoader)

all_clauses = []
for ch in edition["chapters"]:
    for fname in ch["files"]:
        fpath = base / fname
        with open(fpath, encoding="utf-8") as f:
            ch_data = yaml.load(f, Loader=yaml.BaseLoader)
        for clause in ch_data.get("clauses", []):
            if "no" not in clause:
                print(f"MISSING no: {clause.get('id', '?')}")
                continue
            all_clauses.append({
                "chapter": ch["name"],
                "chapter_code": ch["code"],
                "no": int(clause["no"]),
                "id": clause.get("id", b""),
                "text": clause.get("text", b""),
            })

# Decode bytes from BaseLoader
def dec(v):
    return v.decode() if isinstance(v, bytes) else v

for c in all_clauses:
    c["chapter"] = dec(c["chapter"])
    c["chapter_code"] = dec(c["chapter_code"])
    c["id"] = dec(c["id"])
    c["text"] = dec(c["text"])

all_clauses.sort(key=lambda c: c["no"])
print(f"Total clauses: {len(all_clauses)}")

nos = [c["no"] for c in all_clauses]
expected = set(range(1, 399))
missing = sorted(expected - set(nos))
print(f"Missing: {missing}")
print(f"Duplicates: {len(nos) - len(set(nos))}")

cc = Counter(c["chapter_code"] for c in all_clauses)
for k, v in sorted(cc.items()):
    print(f"  {k}: {v} 条")

# Generate Markdown
lines = []
lines.append("# 《伤寒论》宋本条文（原文）")
lines.append("")
lines.append(f"> 底本：明·赵开美复刻宋本《伤寒论》")
lines.append(f"> 版本：宋本（SB）")
lines.append(f"> 条文总数：{len(all_clauses)} 条")
lines.append(f"> 生成时间：2026-08-23")
lines.append("")
lines.append("---")
lines.append("")

current_chapter = None
for c in all_clauses:
    if c["chapter_code"] != current_chapter:
        current_chapter = c["chapter_code"]
        lines.append(f"## {c['chapter']}")
        lines.append("")
    lines.append(f"**{c['no']}.** {c['text']}")
    lines.append("")

out_path = Path("docs/伤寒论条文原文.md")
with open(out_path, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print(f"\nWritten to: {out_path}")