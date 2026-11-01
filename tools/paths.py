#!/usr/bin/env python3
"""Path check: files the pages load, and paths the documentation and comments mention.

  python3 tools/paths.py            # report
  python3 tools/paths.py --strict   # exit 1 if a page loads a file that is not there

1. Loads — <script src>, <link href>, import … from, url(), @import in every page, script and sheet: an error when
   the file is missing (the page breaks).
2. Mentions — a path in `backticks` or a markdown link in docs/*.md, CLAUDE.md, README files and code comments,
   starting with a folder of this repository (js/, labs/, tools/, docs/, ui/, vendor/, assets/, fonts/): a warning
   when it is missing (the text points nowhere). History (CHANGELOG.md, docs/history/) is skipped: it describes
   the past on purpose.
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FOLDERS = ("js/", "labs/", "tools/", "docs/", "ui/", "vendor/", "assets/", "fonts/")
SKIP_DIRS = {".git", "node_modules", "vendor", "__pycache__", "out"}
SKIP_TEXT = ("CHANGELOG.md", os.path.join("docs", "history"), os.path.join("docs", "AUDIT.md"))

LOAD = re.compile(r"""(?:<script[^>]*\bsrc=|<link[^>]*\bhref=|\bimport\s+(?:[^'";]*?\bfrom\s+)?|\bimport\(\s*|@import\s+(?:url\()?|url\(\s*)["']?([^"')\s>]+\.(?:js|mjs|css|json|png|jpg|jpeg|svg|woff2|html))""")
MENTION = re.compile(r"(?:`|\]\()((?:\.\./)*(?:%s)[^`)\s*?#]*)" % "|".join(re.escape(f) for f in FOLDERS))


def files(exts):
    for d, dirs, names in os.walk(ROOT):
        dirs[:] = [x for x in dirs if x not in SKIP_DIRS]
        for n in names:
            if n.endswith(exts):
                yield os.path.join(d, n)


def rel(p):
    return os.path.relpath(p, ROOT)


def exists(base, u):
    for b in (base, ROOT):
        c = os.path.normpath(os.path.join(b, u))
        if os.path.exists(c) or os.path.exists(c.rstrip("/")):
            return True
    return False


def main():
    errors, warnings = [], []
    for f in files((".html", ".js", ".mjs", ".css")):
        if "/vendor/" in f:
            continue
        txt = open(f, encoding="utf-8", errors="ignore").read()
        for m in LOAD.finditer(txt):
            u = m.group(1).split("?")[0]
            if u.startswith(("http", "//", "data:", "blob:", "#", "$")) or "${" in u:
                continue
            if not exists(os.path.dirname(f), u):
                errors.append("%s: loads %s" % (rel(f), u))
    for f in files((".md", ".js", ".html", ".css", ".py")):
        r = rel(f)
        if any(r.startswith(s) or r == s for s in SKIP_TEXT) or r.startswith("vendor"):
            continue
        txt = open(f, encoding="utf-8", errors="ignore").read()
        for m in MENTION.finditer(txt):
            u = m.group(1).rstrip(".,:;")
            if "<" in u or "…" in u or "*" in u:
                continue
            base = os.path.dirname(f)
            if not exists(base, u):
                warnings.append("%s: mentions %s" % (r, u))
    for e in sorted(set(errors)):
        print("ERROR  ", e)
    for w in sorted(set(warnings)):
        print("missing", w)
    print("%d broken loads, %d dead mentions" % (len(set(errors)), len(set(warnings))))
    if "--strict" in sys.argv and errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
