"""
Enrich partie_analysee files with move ratings.
These files use JSON movesData format with eval field already present.
"""
import json
import re
from pathlib import Path


def classify_move_from_eval(eval_val, prev_eval, is_white):
    """Classify move based on evaluation change."""
    if prev_eval is None:
        prev_eval = 0.3 if is_white else 0.25

    # Calculate delta from the side's perspective
    if is_white:
        delta = eval_val - prev_eval
    else:
        delta = prev_eval - eval_val  # Black wants eval to decrease

    if delta >= 0.5:
        return {'type': 'brilliant', 'rating': 10}
    elif delta >= 0.2:
        return {'type': 'excellent', 'rating': 9}
    elif delta >= -0.1:
        return {'type': 'good', 'rating': 7}
    elif delta >= -0.3:
        return {'type': 'inaccuracy', 'rating': 5}
    elif delta >= -0.8:
        return {'type': 'mistake', 'rating': 3}
    else:
        return {'type': 'blunder', 'rating': 1}


def enrich_partie_file(filepath):
    """Enrich a partie_analysee.html file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find movesData
    match = re.search(r'const\s+movesData\s*=\s*(\[[\s\S]*?\]);', content)
    if not match:
        print(f"No movesData found in {filepath}")
        return False

    moves_str = match.group(1)

    # Check if already enriched
    if '"rating":' in moves_str:
        print(f"Already enriched: {filepath}")
        return False

    # Parse JSON
    try:
        moves = json.loads(moves_str)
    except json.JSONDecodeError as e:
        print(f"JSON parse error in {filepath}: {e}")
        return False

    # Enrich each move
    prev_eval = None
    for i, move in enumerate(moves):
        is_white = move.get('color') == 'white'
        eval_val = move.get('eval', 0)

        classification = classify_move_from_eval(eval_val, prev_eval, is_white)

        move['rating'] = classification['rating']
        move['type'] = classification['type']
        move['eval_before'] = round(prev_eval, 2) if prev_eval is not None else 0.20
        move['eval_after'] = round(eval_val, 2)
        move['is_best'] = classification['rating'] >= 7

        prev_eval = eval_val

    # Generate new JSON with proper formatting
    new_moves_json = json.dumps(moves, indent=2, ensure_ascii=False)

    # Replace in content
    new_content = content[:match.start()] + f'const movesData = {new_moves_json};' + content[match.end():]

    # Add CSS if not present
    if '.move-badge' not in new_content:
        css_addition = '''
        /* Move Rating Badges */
        .move-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.7em;
            font-weight: bold;
            margin-left: 8px;
            text-transform: uppercase;
        }
        .badge-brilliant { background: linear-gradient(135deg, #ffd700, #ff8c00); color: #000; }
        .badge-excellent { background: linear-gradient(135deg, #22d3ee, #0ea5e9); color: #000; }
        .badge-good { background: linear-gradient(135deg, #22c55e, #16a34a); color: #fff; }
        .badge-inaccuracy { background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #000; }
        .badge-mistake { background: linear-gradient(135deg, #f97316, #ea580c); color: #fff; }
        .badge-blunder { background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; }

        .eval-bar-mini {
            height: 4px;
            background: linear-gradient(to right,
                #ef4444 0%,
                #ef4444 var(--black-pct, 50%),
                #22c55e var(--black-pct, 50%),
                #22c55e 100%);
            border-radius: 2px;
            margin-top: 5px;
        }
'''
        # Find </style> and add before it
        style_end = new_content.rfind('</style>')
        if style_end > 0:
            new_content = new_content[:style_end] + css_addition + '\n    ' + new_content[style_end:]

    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"Enriched: {filepath} ({len(moves)} moves)")
    return True


def main():
    base_path = Path(r'C:\Users\Hugop\kDrive2\aimix_deploy')

    files = [
        'partie_1_analysee.html',
        'partie_2_analysee.html',
        'partie_3_analysee.html'
    ]

    for filename in files:
        filepath = base_path / filename
        if filepath.exists():
            enrich_partie_file(str(filepath))
        else:
            print(f"Not found: {filepath}")


if __name__ == '__main__':
    main()
