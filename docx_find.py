import re
import sys
import zipfile
import xml.etree.ElementTree as ET


def extract_paragraphs(docx_path: str) -> list[str]:
    with zipfile.ZipFile(docx_path) as z:
        xml_bytes = z.read("word/document.xml")

    root = ET.fromstring(xml_bytes)
    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}

    paragraphs: list[str] = []
    for p in root.findall(".//w:p", ns):
        texts = [t.text for t in p.findall(".//w:t", ns) if t.text]
        if not texts:
            continue
        s = "".join(texts)
        s = re.sub(r"\s+", " ", s).strip()
        if s:
            paragraphs.append(s)
    return paragraphs


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python docx_find.py <path-to.docx> [keyword1] [keyword2] ...")
        return 2

    path = sys.argv[1]
    out_path = sys.argv[2] if len(sys.argv) >= 3 and sys.argv[2].lower().endswith(".txt") else "docx_hits.txt"
    kw_start = 3 if out_path != "docx_hits.txt" or (len(sys.argv) >= 3 and sys.argv[2].lower().endswith(".txt")) else 2
    keywords = sys.argv[kw_start:] or [
        "Mobile First",
        "mobile first",
        "адаптив",
        "viewport",
        "@media",
        "покрыт",
        "coverage",
        "pytest",
        "тест",
        "база данных",
        "ER",
        "SQLAlchemy",
        "Flask",
    ]

    paras = extract_paragraphs(path)
    hits = []
    for i, s in enumerate(paras, 1):
        low = s.lower()
        if any(k.lower() in low for k in keywords):
            hits.append((i, s))

    with open(out_path, "w", encoding="utf-8", errors="replace") as f:
        f.write(f"PARAGRAPHS: {len(paras)}\n")
        f.write(f"HITS: {len(hits)}\n")
        f.write(f"KEYWORDS: {', '.join(keywords)}\n\n")
        for i, s in hits:
            f.write(f"[{i}] {s}\n")
    print(f"Wrote: {out_path} (hits={len(hits)})")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
