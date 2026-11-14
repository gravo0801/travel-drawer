"""Convert a Naver blog 'save as PDF' export into a post folder:
   <out>/<slug>/post.json  (title, date, url, hashtags, blocks[text|photo])
   <out>/<slug>/img-NNN.jpg
Usage: python3 -I import_naver_pdf.py <pdf> <outdir>"""
import sys, re, os, json, warnings
warnings.filterwarnings("ignore")
import fitz

def main(pdf, outdir):
    doc = fitz.open(pdf)
    items = []  # (page, y, kind, payload)
    seen = set()
    for pno, page in enumerate(doc):
        for b in page.get_text("dict")["blocks"]:
            y = b["bbox"][1]
            if b["type"] == 0:
                rows = {}
                for l in b["lines"]:
                    t = "".join(s["text"] for s in l["spans"]).strip()
                    k = (round(l["bbox"][1] / 3), round(l["bbox"][0] / 40))
                    # the export draws some lines twice (shadow copies); keep the longest per row
                    if t and (k not in rows or len(t) > len(rows[k])): rows[k] = t
                txt = "\n".join(rows[k] for k in sorted(rows)).strip()
                if txt: items.append((pno, y, "t", txt))
        for info in page.get_image_info(xrefs=True):
            x = info.get("xref")
            if not x or x in seen: continue
            w, h = info["width"], info["height"]
            if w < 200 or h < 150: continue
            seen.add(x)
            items.append((pno, info["bbox"][1], "i", x))
    items.sort(key=lambda r: (r[0], r[1]))
    text_all = "\n".join(p for _, _, k, p in items if k == "t")
    url = re.search(r"https?://blog\.naver\.com/\S+", text_all)
    pid = url.group(0).rstrip("/").split("/")[-1] if url else os.path.splitext(os.path.basename(pdf))[0]
    date = re.search(r"(\d{4})/(\d{2})/(\d{2}) \d{2}:\d{2}", text_all)
    tags = list(dict.fromkeys(re.findall(r"#([^\s#]+)", text_all)))
    title = None
    category = None
    blocks, n = [], 0
    od = os.path.join(outdir, pid); os.makedirs(od, exist_ok=True)
    junk = re.compile(r"^(\d+ · 낡은 서랍속의 추억을 따라|\d{4}/\d{2}/\d{2} \d{2}:\d{2}.*|#.*|https?://\S+)$")
    for _, _, k, p in items:
        if k == "i":
            pix = fitz.Pixmap(doc, p)
            if pix.n - pix.alpha >= 4: pix = fitz.Pixmap(fitz.csRGB, pix)
            n += 1; fn = "img-%03d.jpg" % n
            pix.save(os.path.join(od, fn))
            blocks.append({"type": "photo", "src": fn, "w": pix.width, "h": pix.height})
            continue
        lines = [l.strip() for l in p.split("\n")]
        lines = [l for l in lines if l and not junk.match(l)]
        if not lines: continue
        if title is None:
            lines = [l for l in lines if not any(o != l and l in o for o in lines)]
            title = " ".join(dict.fromkeys(lines)); continue
        if category is None:
            category = lines[0]; continue
        t = "\n".join(lines)
        if blocks and blocks[-1]["type"] == "text": blocks[-1]["text"] += "\n\n" + t
        else: blocks.append({"type": "text", "text": t})
    post = {"id": pid, "title": title or pid, "naverUrl": url.group(0) if url else None,
            "category": category, "publishedAt": "%s-%s-%s" % date.groups() if date else None,
            "hashtags": tags, "blocks": blocks}
    json.dump(post, open(os.path.join(od, "post.json"), "w"), ensure_ascii=False, indent=1)
    print(pid, post["title"], post["publishedAt"], len(tags), "tags", sum(b["type"]=="photo" for b in blocks), "photos", sum(b["type"]=="text" for b in blocks), "text blocks")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
