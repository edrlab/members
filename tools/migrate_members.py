#!/usr/bin/env python3
"""Normalise the member files in content/members/ for the new directory.

Run from the repository root:

    python3 tools/migrate_members.py            # dry run: prints what would change
    python3 tools/migrate_members.py --write    # rewrites the files
    python3 tools/migrate_members.py --write --download-logos   # also copies external logos

What it does (only the lines concerned are rewritten, the rest of each file is untouched):
  1. categories: merges spelling variants (Technology Provider, Reading App Developer ...).
  2. based: one canonical English country name per member ("FR - France", "USA", "“UK”" -> "France", "United States", "United Kingdom").
  3. ig: keeps "LCP" only (the Accessibility group no longer exists); drops stray values.
  4. crossroads: trims blanks, merges obvious duplicates.
  5. featured / anchor: adds `featured: true` to every active member that has a logo,
     and `anchor: true` to the eight anchor members listed in ANCHORS. Existing values are kept.
  6. featureImage: https://members.edrlab.org/images/x.png -> /images/x.png (already hosted here).
     With --download-logos, other http(s) logos are downloaded to static/images/members/ and the path is rewritten.
  7. Newgen.md has no front matter: a minimal one is added.

The script is idempotent: running it twice changes nothing the second time.
"""
import argparse, glob, os, re, sys, urllib.request, urllib.parse

CATEGORIES = {
    "ebook distributor": "Ebook distributor", "bookstore": "Bookstore",
    "content producer": "Content producer", "technology provider": "Technology provider",
    "technology providers": "Technology provider", "software developer": "Technology provider",
    "reading app developer": "Reading app developer", "reading apps developer": "Reading app developer",
    "publisher": "Publisher", "specialized library": "Specialized library",
    "trade organization": "Trade organization", "national library": "National library",
    "public library": "Public library", "government entity": "Government entity",
    "hardware vendor": "Hardware vendor", "academic library": "Academic library",
    "academic libraries": "Academic library", "consultant": "Consultant", "consulting": "Consultant",
    "publication platform": "Publication platform", "subscription service": "Subscription service",
}

COUNTRIES = {  # lower-case variant -> canonical name
    "usa": "United States", "us": "United States", "united states": "United States",
    "uk": "United Kingdom", "gb": "United Kingdom", "united kingdom": "United Kingdom",
    "korea": "South Korea", "south korea": "South Korea",
    "czech republic": "Czechia", "czechia": "Czechia",
}
ISO2 = {"CA": "Canada", "ES": "Spain", "FI": "Finland", "FR": "France", "IT": "Italy", "JP": "Japan",
        "NG": "Nigeria", "PL": "Poland", "PT": "Portugal", "SE": "Sweden", "TR": "Turkey",
        "VN": "Vietnam", "DE": "Germany", "BE": "Belgium", "NL": "Netherlands", "NO": "Norway"}

CROSSROADS = {"readium": "Readium", "sustainable development goals": "Sustainable Development Goals",
              "academic": "Academic", "w3c": "W3C", "divina": "Divina",
              "daisy consortium": "Daisy Consortium", "digital ebook distributor": ""}

ANCHORS = {"Hachette_Livre.md", "Editis.md", "Madrigall.md", "Borsenverein_des_Deutschen_Buchhandels.md",
           "DAISY.md", "OverDrive_Inc.md", "Rakuten_Kobo.md", "EBSCO.md"}


def clean(s):
    return s.strip().strip('"\'“”‘’').strip()


def canon_country(raw):
    s = clean(raw)
    if not s or s.lower() == "none":
        return ""
    m = re.match(r"^([A-Za-z]{2})\s*-\s*(.+)$", s)      # "FR - France"
    if m:
        s = m.group(2).strip()
    key = s.lower()
    if key in COUNTRIES:
        return COUNTRIES[key]
    return s.title() if s.isupper() or s.islower() else s


def parse_list(block):
    """Values of a `key: ...` block (inline list, scalar, or '- item' lines)."""
    first = block[0].split(":", 1)[1].strip()
    if first.startswith("["):
        inner = first.strip()[1:first.rfind("]")]
        return [clean(x) for x in re.findall(r'"[^"]*"|“[^”]*”|\'[^\']*\'|[^,]+', inner) if clean(x)]
    if first and first.lower() != "none" and first != "~":
        return [clean(first)]
    return [clean(re.sub(r"^\s*-\s*", "", l)) for l in block[1:] if l.strip().startswith("-") and clean(re.sub(r"^\s*-\s*", "", l))]


def fmt(key, values):
    if not values:
        return [f"{key}: []"]
    return [f"{key}: [" + ", ".join('"%s"' % v.replace('"', "'") for v in values) + "]"]


def find_block(lines, key):
    for i, l in enumerate(lines):
        if re.match(rf"^{key}\s*:", l):
            j = i + 1
            while j < len(lines) and (lines[j].startswith((" ", "\t", "- ")) or not lines[j].strip()) and not re.match(r"^\w[\w-]*\s*:", lines[j]):
                j += 1
            return i, j
    return None


def set_block(lines, key, new_lines, after=None):
    b = find_block(lines, key)
    if b:
        lines[b[0]:b[1]] = new_lines
    else:
        pos = len(lines)
        if after and find_block(lines, after):
            pos = find_block(lines, after)[1]
        lines[pos:pos] = new_lines


def get_scalar(lines, key):
    b = find_block(lines, key)
    if not b:
        return None
    return clean(lines[b[0]].split(":", 1)[1])


def process(path, args, report):
    text = open(path, encoding="utf-8").read()
    name = os.path.basename(path)
    if not text.startswith("---"):
        title = os.path.splitext(name)[0].replace("_", " ")
        text = f'---\ntitle: "{title}"\ndraft: true\nactive: true\nlayout: members\ncategories: []\nbased: []\n---\n' + text
        report.append(f"{name}: front matter added as a draft (fill in category, country, logo, summary, then remove `draft: true`)")
    m = re.match(r"^---\n(.*?)\n---\n?(.*)$", text, re.S)
    head, body = m.group(1), m.group(2)
    lines = head.split("\n")
    orig = list(lines)

    b = find_block(lines, "categories")
    if b:
        cats = []
        for v in parse_list(lines[b[0]:b[1]]):
            c = CATEGORIES.get(v.lower(), v)
            if c and c not in cats:
                cats.append(c)
        set_block(lines, "categories", fmt("categories", cats))

    b = find_block(lines, "based")
    if b:
        vals = []
        for v in parse_list(lines[b[0]:b[1]]):
            c = canon_country(v)
            if c and c not in vals:
                vals.append(c)
        set_block(lines, "based", fmt("based", vals))

    b = find_block(lines, "ig")
    if b:
        vals = [("LCP") for v in parse_list(lines[b[0]:b[1]]) if v.lower().strip('"') == "lcp"]
        set_block(lines, "ig", fmt("ig", vals[:1]))

    b = find_block(lines, "crossroads")
    if b:
        vals = []
        for v in parse_list(lines[b[0]:b[1]]):
            c = CROSSROADS.get(v.lower(), v)
            if c and c not in vals:
                vals.append(c)
        set_block(lines, "crossroads", fmt("crossroads", vals))

    logo = get_scalar(lines, "featureImage") or ""
    if logo.startswith("https://members.edrlab.org/"):
        logo = "/" + logo[len("https://members.edrlab.org/"):]
    elif logo.startswith(("http://", "https://")) and args.download_logos:
        ext = os.path.splitext(urllib.parse.urlparse(logo).path)[1] or ".png"
        dest = f"static/images/members/{os.path.splitext(name)[0]}{ext}"
        try:
            os.makedirs("static/images/members", exist_ok=True)
            req = urllib.request.Request(logo, headers={"User-Agent": "edrlab-members-migration"})
            with urllib.request.urlopen(req, timeout=20) as r, open(dest, "wb") as f:
                f.write(r.read())
            logo = "/images/members/" + os.path.basename(dest)
        except Exception as e:
            report.append(f"{name}: logo not downloaded ({e})")
    if logo != (get_scalar(lines, "featureImage") or ""):
        set_block(lines, "featureImage", [f'featureImage: "{logo}"'])

    active = (get_scalar(lines, "active") or "true").lower() != "false"
    if find_block(lines, "featured") is None:
        lines.append("featured: " + ("true" if (active and logo) else "false"))
    if name in ANCHORS and (get_scalar(lines, "anchor") or "").lower() != "true":
        set_block(lines, "anchor", ["anchor: true"])
    elif find_block(lines, "anchor") is None:
        lines.append("anchor: false")

    if lines != orig or "front matter added" in " ".join(report[-1:]):
        out = "---\n" + "\n".join(lines) + "\n---\n" + body
        report.append(f"{name}: updated")
        if args.write:
            open(path, "w", encoding="utf-8").write(out)
    elif text != open(path, encoding="utf-8").read() and args.write:
        open(path, "w", encoding="utf-8").write(text)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--download-logos", action="store_true")
    ap.add_argument("--dir", default="content/members")
    args = ap.parse_args()
    report = []
    for p in sorted(glob.glob(os.path.join(args.dir, "*.md"))):
        if os.path.basename(p) == "_index.md":
            continue
        process(p, args, report)
    print("\n".join(report))
    print(f"\n{len(report)} messages. " + ("Files written." if args.write else "Dry run: nothing written (use --write)."))


if __name__ == "__main__":
    sys.exit(main())
