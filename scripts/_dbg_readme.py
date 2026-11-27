"""Append the original French documentation (from git HEAD) under the new English README."""

import pathlib
import subprocess

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
original = subprocess.run(
    ["git", "show", "HEAD:README.md"],
    cwd=REPO_ROOT,
    capture_output=True,
    text=True,
    check=True,
).stdout

start = original.index("## À quoi sert SupaChess ?")
english_start = original.index("## English")
improvements = original.index("## 🚀 Améliorations Version 2.0")

french_intro = original[start:english_start].rstrip()
french_body = original[improvements:].rstrip()

readme_path = REPO_ROOT / "README.md"
current = readme_path.read_text(encoding="utf-8").rstrip()
readme_path.write_text(current + "\n\n" + french_intro + "\n\n\n" + french_body + "\n", encoding="utf-8")
print("README.md :", len(readme_path.read_text(encoding='utf-8').splitlines()), "lignes")
