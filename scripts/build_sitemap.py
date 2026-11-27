"""Generate sitemap.xml for the SupaChess-Web static site.

Base URL: https://jira44.github.io/supachess-web/
Usage: python scripts/build_sitemap.py [--base https://example.org/site/]
The output is deterministic: no query parameters, no session ids, one entry per page.
"""

import argparse
import datetime
import pathlib
import subprocess
import xml.etree.ElementTree as ET

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
DEFAULT_BASE = "https://jira44.github.io/supachess-web/"

EXCLUDED_DIRS = {
    "node_modules",
    "tests",
    "scripts",
    "packages",
    "test-results",
    "playwright-report",
    "assets",
    ".github",
    ".git",
    "__pycache__",
    "lichess-bot-worker",
    "multiplayer-worker",
}

EXCLUDED_FILE_PATTERNS = (
    "index_backup",
    "index_old",
    "backup",
    "test_",
    "diagnostic",
    "deploy",
    "go_deploy",
    "deployed_enhanced",
    "teacher_working",
    "verify_all_games",
)

HIGH_PRIORITY_TOKENS = (
    "training",
    "entrainement",
    "enseignement",
    "chess_coach",
    "chessmentor",
    "tactical",
    "tactiques",
    "generateur",
    "parties_brillantes",
    "supa_trainer",
    "academy",
    "mastery",
    "chess_library",
    "kasparov",
    "fischer",
    "carlsen",
    "tal_",
    "karpov",
    "alphazero",
    "deep_blue",
    "nezhmetdinov",
    "nakamura",
    "tarrasch",
    "ding_gukesh",
    "champions_2800",
    "historique_regles",
)

MEDIUM_PRIORITY_TOKENS = (
    "dashboard",
    "tracker",
    "stats",
    "compteurs",
    "suivi",
    "evolution",
    "progression",
    "progress",
    "carte",
    "radar",
    "journal",
    "analyse",
    "analysis",
    "player",
    "architecture",
    "coach_diagnostic",
    "engine_study",
    "noveau",
    "chessnova",
    "supaengine",
    "tcec",
    "scc_",
)


def is_excluded(relative_path: pathlib.PurePath) -> bool:
    parts = relative_path.parts
    if any(part in EXCLUDED_DIRS for part in parts[:-1]):
        return True
    stem = relative_path.stem.lower()
    return any(token in stem for token in EXCLUDED_FILE_PATTERNS)


def priority_for(relative_path: pathlib.PurePath) -> tuple[str, str]:
    key = relative_path.as_posix().lower()
    if key == "index.html":
        return "1.0", "weekly"
    if any(token in key for token in HIGH_PRIORITY_TOKENS):
        return "0.9", "weekly"
    if any(token in key for token in MEDIUM_PRIORITY_TOKENS):
        return "0.7", "monthly"
    return "0.6", "monthly"


def last_modified(relative_path: pathlib.PurePath) -> str | None:
    try:
        result = subprocess.run(
            ["git", "log", "-1", "--format=%cI", "--", relative_path.as_posix()],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
    except OSError:
        return None
    stamp = result.stdout.strip()
    if not stamp:
        return None
    try:
        parsed = datetime.datetime.fromisoformat(stamp)
    except ValueError:
        return None
    return parsed.date().isoformat()


def collect_pages() -> list[pathlib.PurePath]:
    pages: list[pathlib.PurePath] = []
    for path in sorted(REPO_ROOT.rglob("*.html")):
        relative = path.relative_to(REPO_ROOT)
        if is_excluded(relative):
            continue
        pages.append(pathlib.PurePath(relative.as_posix()))
    pages.sort(key=lambda item: (item.as_posix() != "index.html", item.as_posix().lower()))
    return pages


def build_sitemap(base: str) -> str:
    namespace = "http://www.sitemaps.org/schemas/sitemap/0.9"
    ET.register_namespace("", namespace)
    root = ET.Element(f"{{{namespace}}}urlset")
    for relative in collect_pages():
        element = ET.SubElement(root, f"{{{namespace}}}url")
        location = base.rstrip("/") + "/" + relative.as_posix()
        ET.SubElement(element, f"{{{namespace}}}loc").text = location
        modified = last_modified(relative)
        if modified:
            ET.SubElement(element, f"{{{namespace}}}lastmod").text = modified
        priority, changefreq = priority_for(relative)
        ET.SubElement(element, f"{{{namespace}}}priority").text = priority
        ET.SubElement(element, f"{{{namespace}}}changefreq").text = changefreq
    ET.indent(root, space="  ")
    body = ET.tostring(root, encoding="unicode")
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + body + "\n"


def build_robots(base: str) -> str:
    return (
        "User-agent: *\n"
        "Allow: /\n"
        "\n"
        f"Sitemap: {base.rstrip('/')}/sitemap.xml\n"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default=DEFAULT_BASE)
    arguments = parser.parse_args()
    base = arguments.base if arguments.base.endswith("/") else arguments.base + "/"

    sitemap_path = REPO_ROOT / "sitemap.xml"
    sitemap_path.write_text(build_sitemap(base), encoding="utf-8")
    robots_path = REPO_ROOT / "robots.txt"
    robots_path.write_text(build_robots(base), encoding="utf-8")

    pages = collect_pages()
    print(f"sitemap.xml : {len(pages)} pages, base {base}")
    print(f"robots.txt  : Allow / + Sitemap {base.rstrip('/')}/sitemap.xml")


if __name__ == "__main__":
    main()
