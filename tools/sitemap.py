#!/usr/bin/env python3
"""sitemap.xml from the catalog (ui/catalog.js): the start page (English and Polish) and every lab and tool page,
except those marked noindex in their own <head>.

  python3 tools/sitemap.py           # writes sitemap.xml
  python3 tools/sitemap.py --check   # exit 1 if sitemap.xml is not up to date
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://michalstankiewicz4-cell.github.io/GameLaboratory/"


def catalog():
    s = open(os.path.join(ROOT, "ui", "catalog.js"), encoding="utf-8").read()
    return json.loads(s[s.index("/*JSON*/") + 8:s.index("/*END*/")])


def build():
    cat = catalog()
    alt = "\n".join('    <xhtml:link rel="alternate" hreflang="%s" href="%s"/>' % (h, SITE + q)
                    for h, q in (("en", "?lang=en"), ("pl", "?lang=pl"), ("x-default", "")))
    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
           "  <url>", "    <loc>%s</loc>" % SITE, alt, "    <changefreq>weekly</changefreq>", "    <priority>1.0</priority>", "  </url>",
           "  <url>", "    <loc>%s?lang=pl</loc>" % SITE, alt, "  </url>"]
    for c in cat["labs"] + cat["tools"]:
        page = os.path.join(ROOT, c["file"])
        head = open(page, encoding="utf-8").read().split("</head>")[0]
        if 'name="robots" content="noindex' in head:
            continue
        out.append("  <url><loc>%s%s</loc></url>" % (SITE, c["file"]))
    out.append("</urlset>")
    return "\n".join(out) + "\n"


if __name__ == "__main__":
    xml, path = build(), os.path.join(ROOT, "sitemap.xml")
    if "--check" in sys.argv:
        same = os.path.exists(path) and open(path, encoding="utf-8").read() == xml
        print("sitemap.xml is up to date" if same else "sitemap.xml is out of date: python3 tools/sitemap.py")
        sys.exit(0 if same else 1)
    open(path, "w", encoding="utf-8").write(xml)
    print("sitemap.xml: %d pages" % xml.count("<url>"))
