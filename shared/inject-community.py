#!/usr/bin/env python3
"""
ChessNova Community Injector
Injects community CSS/JS tags into all HTML pages.
Run from chessnova/ directory: python shared/inject-community.py
"""

import os
import re
import sys

# Marker to prevent double injection
MARKER = '<!-- ChessNova Community -->'

# Files/patterns to skip
SKIP_PATTERNS = [
    'DEPLOY_',
    'DEPLOYER_',
    'GO_DEPLOY',
    'ARCHITECTURE_',
    'diagnostic',
    '_BACKUP',
    'test_',
    'TEST_',
    'STYLE_',
]

# Firebase SDK URLs
FIREBASE_SDKS = [
    'https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore-compat.js',
]


def has_firebase(content):
    """Check if the page already loads Firebase SDK."""
    return 'firebase-app-compat.js' in content or 'firebase-app.js' in content


def get_shared_prefix(filepath, root):
    """Get the relative path prefix to /shared/ from the file's location."""
    rel = os.path.relpath(os.path.dirname(filepath), root)
    if rel == '.':
        return 'shared'
    # Count depth levels
    depth = len(rel.replace('\\', '/').split('/'))
    return '../' * depth + 'shared'


def build_injection(shared_prefix, needs_firebase):
    """Build the HTML snippet to inject."""
    lines = [MARKER]

    if needs_firebase:
        for sdk in FIREBASE_SDKS:
            lines.append(f'<script src="{sdk}"></script>')

    lines.append(f'<link rel="stylesheet" href="/{shared_prefix}/community.css">')
    lines.append(f'<script src="/{shared_prefix}/i18n.js"></script>')
    lines.append(f'<script src="/{shared_prefix}/community.js"></script>')
    lines.append('<!-- /ChessNova Community -->')

    return '\n'.join(lines)


def should_skip(filename):
    """Check if file should be skipped."""
    basename = os.path.basename(filename)
    for pattern in SKIP_PATTERNS:
        if pattern in basename:
            return True
    return False


def inject_file(filepath, root):
    """Inject community tags into a single HTML file."""
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
    except Exception as e:
        print(f'  SKIP (read error): {filepath} - {e}')
        return False

    # Already injected?
    if MARKER in content:
        print(f'  SKIP (already injected): {os.path.relpath(filepath, root)}')
        return False

    # Find </body> tag
    body_match = re.search(r'</body>', content, re.IGNORECASE)
    if not body_match:
        print(f'  SKIP (no </body>): {os.path.relpath(filepath, root)}')
        return False

    needs_firebase = not has_firebase(content)

    # Use absolute paths from site root (Cloudflare Pages serves from root)
    injection = build_injection('shared', needs_firebase)

    # Insert before </body>
    insert_pos = body_match.start()
    new_content = content[:insert_pos] + '\n' + injection + '\n' + content[insert_pos:]

    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        fb_note = ' (+Firebase)' if needs_firebase else ''
        print(f'  OK: {os.path.relpath(filepath, root)}{fb_note}')
        return True
    except Exception as e:
        print(f'  ERROR (write): {os.path.relpath(filepath, root)} - {e}')
        return False


def main():
    # Determine root directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root = os.path.dirname(script_dir)  # chessnova/

    print(f'ChessNova Community Injector')
    print(f'Root: {root}')
    print(f'---')

    # Collect HTML files
    html_files = []

    # Root level
    for f in sorted(os.listdir(root)):
        if f.endswith('.html') and not should_skip(f):
            html_files.append(os.path.join(root, f))

    # web/legendary-games/
    lg_dir = os.path.join(root, 'web', 'legendary-games')
    if os.path.isdir(lg_dir):
        for f in sorted(os.listdir(lg_dir)):
            if f.endswith('.html') and not should_skip(f):
                html_files.append(os.path.join(lg_dir, f))

    print(f'Found {len(html_files)} HTML files to process\n')

    injected = 0
    skipped = 0
    for filepath in html_files:
        if inject_file(filepath, root):
            injected += 1
        else:
            skipped += 1

    print(f'\n--- Done ---')
    print(f'Injected: {injected}')
    print(f'Skipped:  {skipped}')
    print(f'Total:    {len(html_files)}')


if __name__ == '__main__':
    main()
