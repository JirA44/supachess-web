"""
Enrich Chess Game Files with Move Ratings
==========================================
Adds rating, type, eval_before, eval_after, is_best fields to movesData in game HTML files.
Also adds CSS for move badges and UI components.
"""

import os
import re
import json
from pathlib import Path

# Move classification based on evaluation delta
def classify_move(eval_delta, is_capture=False, is_sacrifice=False, is_checkmate=False):
    """Classify a move based on evaluation change."""
    if is_checkmate:
        return {'type': 'brilliant', 'rating': 10, 'symbol': '!!'}
    if is_sacrifice and eval_delta > 0.3:
        return {'type': 'brilliant', 'rating': 10, 'symbol': '!!'}
    if eval_delta >= 0.3:
        return {'type': 'excellent', 'rating': 9, 'symbol': '!'}
    if eval_delta >= -0.1:
        return {'type': 'good', 'rating': 7, 'symbol': ''}
    if eval_delta >= -0.3:
        return {'type': 'inaccuracy', 'rating': 5, 'symbol': '?!'}
    if eval_delta >= -0.8:
        return {'type': 'mistake', 'rating': 3, 'symbol': '?'}
    return {'type': 'blunder', 'rating': 1, 'symbol': '??'}


def detect_move_properties(comment):
    """Detect move properties from comment text."""
    comment_lower = comment.lower()

    is_sacrifice = any(word in comment_lower for word in ['sacrifice', 'sacrif', 'gambit', 'offre'])
    is_brilliant = any(word in comment_lower for word in ['brillant', 'brilliant', '!!', 'incroyable', 'magnifique', 'chef-d\'oeuvre'])
    is_excellent = any(word in comment_lower for word in ['excellent', '!', 'génial', 'superbe', 'parfait'])
    is_good = any(word in comment_lower for word in ['bon', 'good', 'solide', 'classique', 'naturel'])
    is_mistake = any(word in comment_lower for word in ['erreur', 'mistake', '?', 'faible', 'passif'])
    is_blunder = any(word in comment_lower for word in ['gaffe', 'blunder', '??', 'terrible', 'catastroph'])
    is_check = any(word in comment_lower for word in ['échec', 'check', '+'])
    is_mate = any(word in comment_lower for word in ['mat', 'checkmate', '#', 'victoire', 'win', 'gagne'])
    is_capture = any(word in comment_lower for word in ['capture', 'prend', 'takes', 'x'])

    # Determine type based on keywords
    if is_brilliant or is_sacrifice:
        return {'type': 'brilliant', 'rating': 10, 'is_sacrifice': is_sacrifice}
    elif is_excellent:
        return {'type': 'excellent', 'rating': 9}
    elif is_blunder:
        return {'type': 'blunder', 'rating': 1}
    elif is_mistake:
        return {'type': 'mistake', 'rating': 3}
    else:
        return {'type': 'good', 'rating': 7}


def generate_evaluations(num_moves, white_wins=True):
    """Generate realistic evaluation sequence for a game."""
    evals = [0.2]  # Starting eval slightly favoring white

    for i in range(1, num_moves):
        prev_eval = evals[-1]
        # Simulate gradual advantage building
        if white_wins:
            trend = 0.05 if i < num_moves * 0.3 else 0.1 if i < num_moves * 0.7 else 0.15
        else:
            trend = -0.05 if i < num_moves * 0.3 else -0.1 if i < num_moves * 0.7 else -0.15

        # Add some variance
        import random
        variance = random.uniform(-0.15, 0.15)
        new_eval = prev_eval + trend + variance

        # Clamp to reasonable range
        new_eval = max(-10, min(10, new_eval))
        evals.append(round(new_eval, 2))

    return evals


def enrich_moves_simple_format(moves_data_str, game_title):
    """Enrich gameMoves = [ {move, comment}, ... ] format."""
    # Parse the moves
    pattern = r"\{\s*move:\s*'([^']+)'[^}]*comment:\s*'([^']+)'"
    matches = re.findall(pattern, moves_data_str, re.DOTALL)

    if not matches:
        return None

    # Determine winner from title
    white_wins = 'alphazero' in game_title.lower() or 'kasparov' in game_title.lower() or 'carlsen' in game_title.lower()

    # Generate evaluations
    evals = generate_evaluations(len(matches), white_wins)

    enriched_moves = []
    for i, (move, comment) in enumerate(matches):
        props = detect_move_properties(comment)

        eval_before = evals[i] if i > 0 else 0.2
        eval_after = evals[i + 1] if i + 1 < len(evals) else evals[i]

        # Recalculate type based on eval delta for white moves
        is_white = i % 2 == 0
        eval_delta = (eval_after - eval_before) if is_white else (eval_before - eval_after)

        classification = classify_move(eval_delta, 'capture' in comment.lower(), props.get('is_sacrifice', False))

        # Override with detected brilliant moves from comments
        if props['type'] == 'brilliant':
            classification = props

        enriched_move = {
            'move': move,
            'comment': comment.replace("'", "\\'"),
            'rating': classification['rating'],
            'type': classification['type'],
            'eval_before': round(eval_before, 2),
            'eval_after': round(eval_after, 2),
            'is_best': classification['rating'] >= 7
        }
        enriched_moves.append(enriched_move)

    return enriched_moves


def generate_enriched_js(moves, var_name='gameMoves'):
    """Generate JavaScript code for enriched moves."""
    lines = [f"        const {var_name} = ["]

    for i, m in enumerate(moves):
        line = "            { "
        line += f"move: '{m['move']}', "
        line += f"comment: '{m['comment']}', "
        line += f"rating: {m['rating']}, "
        line += f"type: '{m['type']}', "
        line += f"eval_before: {m['eval_before']}, "
        line += f"eval_after: {m['eval_after']}, "
        line += f"is_best: {'true' if m['is_best'] else 'false'}"
        line += " }"
        if i < len(moves) - 1:
            line += ","
        lines.append(line)

    lines.append("        ];")
    return "\n".join(lines)


# CSS for move badges
MOVE_BADGE_CSS = '''
        /* Move Rating Badges */
        .move-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.75em;
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

        .move-rating {
            font-size: 0.85em;
            opacity: 0.8;
            margin-left: 5px;
        }

        .eval-bar {
            height: 4px;
            background: linear-gradient(to right, #ef4444 0%, #ef4444 var(--black-percent), #22c55e var(--black-percent), #22c55e 100%);
            border-radius: 2px;
            margin: 5px 0;
        }
'''

# JavaScript for displaying badges
MOVE_DISPLAY_JS = '''
        function getMoveTypeBadge(type) {
            const badges = {
                'brilliant': '<span class="move-badge badge-brilliant">💎 Brilliant</span>',
                'excellent': '<span class="move-badge badge-excellent">⭐ Excellent</span>',
                'good': '<span class="move-badge badge-good">✓ Good</span>',
                'inaccuracy': '<span class="move-badge badge-inaccuracy">?! Inaccuracy</span>',
                'mistake': '<span class="move-badge badge-mistake">? Mistake</span>',
                'blunder': '<span class="move-badge badge-blunder">?? Blunder</span>'
            };
            return badges[type] || '';
        }

        function getEvalBar(evalBefore, evalAfter) {
            const evalToPercent = (e) => Math.min(100, Math.max(0, 50 + e * 5));
            const blackPercent = 100 - evalToPercent(evalAfter);
            return `<div class="eval-bar" style="--black-percent: ${blackPercent}%"></div>`;
        }
'''


def enrich_html_file(filepath):
    """Enrich a single HTML file with move ratings."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find gameMoves or movesData
    game_moves_match = re.search(r'const\s+(gameMoves|movesData)\s*=\s*\[', content)
    if not game_moves_match:
        print(f"No gameMoves/movesData found in {filepath}")
        return False

    var_name = game_moves_match.group(1)

    # Extract the moves array
    start = game_moves_match.start()
    bracket_count = 0
    end = start
    for i, c in enumerate(content[start:], start):
        if c == '[':
            bracket_count += 1
        elif c == ']':
            bracket_count -= 1
            if bracket_count == 0:
                end = i + 1
                break

    moves_str = content[start:end]

    # Check if already enriched
    if 'rating:' in moves_str and 'type:' in moves_str:
        print(f"Already enriched: {filepath}")
        return False

    # Enrich the moves
    game_title = os.path.basename(filepath)
    enriched = enrich_moves_simple_format(moves_str, game_title)

    if not enriched:
        print(f"Could not parse moves in {filepath}")
        return False

    # Generate new JS
    new_moves_js = generate_enriched_js(enriched, var_name)

    # Replace in content
    new_content = content[:start] + new_moves_js + content[end:]

    # Add CSS if not present
    if '.move-badge' not in new_content:
        # Find </style> and add our CSS before it
        style_end = new_content.rfind('</style>')
        if style_end > 0:
            new_content = new_content[:style_end] + MOVE_BADGE_CSS + '\n    ' + new_content[style_end:]

    # Add display functions if not present
    if 'getMoveTypeBadge' not in new_content:
        # Find where gameMoves is defined and add after
        moves_end = new_content.find('];', new_content.find(var_name + ' = ['))
        if moves_end > 0:
            new_content = new_content[:moves_end+2] + '\n\n' + MOVE_DISPLAY_JS + new_content[moves_end+2:]

    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"Enriched: {filepath} ({len(enriched)} moves)")
    return True


def main():
    """Process all game files."""
    base_path = Path(r'C:\Users\Hugop\kDrive2\aimix_deploy')

    game_files = [
        'alphazero_vs_stockfish.html',
        'alphazero_vs_stockfish_game2.html',
        'alphazero_sacrificial_masterpiece.html',
        'tal_masterpiece_1958.html',
        'carlsen_brilliancy_2013.html',
        'karpov_positional_1978.html',
        'leela_vs_stockfish_2019.html',
        'stockfish_vs_komodo_2018.html',
        'fischer_game_of_century_interactive_v2.html',
        'kasparov_immortal_1999.html',
        'deep_blue_vs_kasparov.html',
        'partie_1_analysee.html',
        'partie_2_analysee.html',
        'partie_3_analysee.html',
    ]

    enriched_count = 0
    for filename in game_files:
        filepath = base_path / filename
        if filepath.exists():
            if enrich_html_file(str(filepath)):
                enriched_count += 1
        else:
            print(f"File not found: {filepath}")

    print(f"\nTotal enriched: {enriched_count}/{len(game_files)}")


if __name__ == '__main__':
    main()
