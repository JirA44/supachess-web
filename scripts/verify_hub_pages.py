#!/usr/bin/env python3
"""Verification statique des pages du hub SupaChess-Web.

Controles :
  1. node --check sur chaque script inline et chaque fichier .js modifie
  2. equilibre des balises HTML (html.parser) par page
  3. unicite de <title> et de <link rel="canonical"> par page
  4. longueur de la meta description (130-155 caracteres) quand elle existe
  5. resolution de tous les liens locaux (href/src) des pages verifiees

Usage : python scripts/verify_hub_pages.py index.html GENERATEUR_PARTIES_BRILLANTES.html
"""

import html.parser
import os
import re
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOID_TAGS = {
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
    "meta", "param", "source", "track", "wbr",
}
SCRIPT_BLOCK = re.compile(r"<script\b(?![^>]*\bsrc=)(?![^>]*\btype=[\"'][^\"']*json[^\"']*[\"'])[^>]*>(.*?)</script\s*>", re.I | re.S)


class BalanceChecker(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.errors = []
        self.counts = {}

    def handle_starttag(self, tag, attrs):
        self.counts[tag] = self.counts.get(tag, 0) + 1
        if tag not in VOID_TAGS:
            self.stack.append((tag, self.getpos()))

    def handle_startendtag(self, tag, attrs):
        self.counts[tag] = self.counts.get(tag, 0) + 1

    def handle_endtag(self, tag):
        if tag in VOID_TAGS:
            return
        if not self.stack:
            self.errors.append("closing </%s> without opener at line %d" % (tag, self.getpos()[0]))
            return
        if self.stack[-1][0] == tag:
            self.stack.pop()
            return
        names = [item[0] for item in self.stack]
        if tag in names:
            while self.stack and self.stack[-1][0] != tag:
                unclosed, position = self.stack.pop()
                self.errors.append("unclosed <%s> opened at line %d" % (unclosed, position[0]))
            if self.stack:
                self.stack.pop()
        else:
            self.errors.append("unexpected </%s> at line %d" % (tag, self.getpos()[0]))


def check_inline_scripts(path, report):
    with open(path, "r", encoding="utf-8") as handle:
        content = handle.read()
    blocks = SCRIPT_BLOCK.findall(content)
    failures = 0
    with tempfile.TemporaryDirectory() as folder:
        for index, block in enumerate(blocks, start=1):
            target = os.path.join(folder, "inline_%02d.js" % index)
            with open(target, "w", encoding="utf-8") as handle:
                handle.write(block)
            result = subprocess.run(["node", "--check", target], capture_output=True, text=True)
            status = "OK" if result.returncode == 0 else "FAIL"
            if result.returncode != 0:
                failures += 1
            report.append("node --check %s inline #%d : %s" % (os.path.basename(path), index, status))
            if result.returncode != 0:
                report.append(result.stderr.strip().splitlines()[0] if result.stderr.strip() else "")
    return failures, len(blocks)


def check_js_files(paths, report):
    failures = 0
    for path in paths:
        result = subprocess.run(["node", "--check", path], capture_output=True, text=True)
        status = "OK" if result.returncode == 0 else "FAIL"
        if result.returncode != 0:
            failures += 1
        report.append("node --check %s : %s" % (os.path.basename(path), status))
        if result.returncode != 0:
            report.append(result.stderr.strip().splitlines()[0] if result.stderr.strip() else "")
    return failures


def check_balance(path, report):
    with open(path, "r", encoding="utf-8") as handle:
        content = handle.read()
    checker = BalanceChecker()
    checker.feed(content)
    checker.close()
    problems = list(checker.errors)
    for tag, position in checker.stack:
        problems.append("unclosed <%s> opened at line %d" % (tag, position[0]))
    report.append("html.parser %s : %s (%d balises ouvrantes analysees)" % (
        os.path.basename(path),
        "equilibre OK" if not problems else "%d probleme(s)" % len(problems),
        sum(checker.counts.values()),
    ))
    for problem in problems[:10]:
        report.append("  " + problem)
    return len(problems)


def check_head(path, report):
    with open(path, "r", encoding="utf-8") as handle:
        content = handle.read()
    problems = 0
    titles = re.findall(r"<title\b[^>]*>(.*?)</title\s*>", content, re.I | re.S)
    canonicals = re.findall(r"<link\b[^>]*rel=[\"']canonical[\"'][^>]*>", content, re.I)
    report.append("head %s : %d <title>, %d canonical" % (os.path.basename(path), len(titles), len(canonicals)))
    if len(titles) != 1:
        problems += 1
        report.append("  KO : un seul <title> attendu")
    if len(canonicals) > 1:
        problems += 1
        report.append("  KO : un seul rel=canonical attendu")
    description = re.search(r'<meta\s+name=["\']description["\']\s+content="([^"]*)"', content, re.I)
    if not description:
        description = re.search(r"<meta\s+name=['\"]description['\"]\s+content='([^']*)'", content, re.I)
    if description:
        length = len(description.group(1))
        status = "OK" if 130 <= length <= 155 else "HORS BORNES (130-155)"
        if not (130 <= length <= 155):
            problems += 1
        report.append("  meta description : %d caracteres : %s" % (length, status))
    return problems


def check_local_links(path, report):
    with open(path, "r", encoding="utf-8") as handle:
        content = handle.read()
    without_scripts = re.sub(r"<script\b[^>]*>.*?</script\s*>", "", content, flags=re.I | re.S)
    broken = []
    for match in re.finditer(r"\b(?:href|src)\s*=\s*([\"'])(.*?)\1", without_scripts, re.I):
        value = match.group(2).strip()
        if not value or value.startswith(("#", "/", "//")) or re.match(r"^[a-z][a-z0-9+.\-]*:", value, re.I):
            continue
        target = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(path)), value.split("?")[0].split("#")[0]))
        if not os.path.exists(target):
            broken.append(value)
    report.append("liens locaux %s : %s" % (
        os.path.basename(path),
        "tous resolus" if not broken else "casse(s): " + ", ".join(broken),
    ))
    return len(broken)


def main():
    args = sys.argv[1:]
    pages = args or ["index.html", "GENERATEUR_PARTIES_BRILLANTES.html"]
    js_files = []
    for page in pages:
        if page.endswith(".js"):
            js_files.append(page)
            pages.remove(page)
    report = []
    failures = 0
    for page in pages:
        full = os.path.join(ROOT, page)
        script_failures, script_count = check_inline_scripts(full, report)
        failures += script_failures
        report.append("  (%d script(s) inline verifie(s))" % script_count)
        failures += check_balance(full, report)
        failures += check_head(full, report)
        failures += check_local_links(full, report)
    failures += check_js_files([os.path.join(ROOT, name) for name in js_files], report)
    print("\n".join(report))
    print("TOTAL FAILURES = %d" % failures)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
