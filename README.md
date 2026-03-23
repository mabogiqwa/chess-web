# Chess Game with AI Opponent

## Overview

A browser-based chess game implemented in vanilla JavaScript, featuring a chess.com-inspired UI and an AI opponent powered by an iterative-deepening minimax search with alpha-beta pruning and piece-square table evaluation. The human player plays as White against the AI-controlled Black pieces. No external dependencies or API calls — fully self-contained and GitHub Pages ready.

## File Structure

```
chess/
├── index.html
├── styling/
│   └── styles.css
├── chess agents/
│   └── optimized_minimax.js
└── chess game/
    └── chessGame.js
```

## Features

**Gameplay**
- Full legal move validation for all piece types
- Castling (kingside and queenside) for both sides
- En passant capture
- Pawn promotion with piece selection modal
- Check, checkmate, and stalemate detection
- Draw conditions: insufficient material, threefold repetition, 50-move rule

**UI**
- Chess.com-inspired dark board theme with classic `#f0d9b5` / `#b58863` square colours
- Player strips showing captured pieces and material advantage
- Last-move yellow highlight
- Green selection highlight with dot indicators for available moves
- Ring indicator for capturable squares
- Red radial glow on the king when in check
- Algebraic coordinate labels embedded on board edge squares
- Scrollable move list in algebraic notation
- Pawn promotion picker modal
- Game-over overlay with result and reason
- Board flip button
- Responsive layout for mobile screens

**AI**
- Minimax search with alpha-beta pruning
- Iterative deepening (depth 1–4, selectable in-game)
- Piece-square tables for positional evaluation (pawns, knights, bishops, rooks, queens, kings)
- MVV-LVA move ordering (Most Valuable Victim – Least Valuable Attacker) for better pruning efficiency
- Automatic queen promotion during search

**Difficulty Levels**

| Level | Search Depth | Approximate ELO |
|-------|-------------|-----------------|
| Easy  | 1           | ~800            |
| Med   | 2           | ~1200           |
| Hard  | 3           | ~1500           |
| Max   | 4           | ~1800           |

## AI Algorithm

The AI (`OptimizedMinimaxChessAI`) evaluates positions using:

1. **Material value** — centipawn values per piece (pawn=100, knight=320, bishop=330, rook=500, queen=900)
2. **Piece-square tables** — positional bonuses encouraging central control, active piece placement, and king safety
3. **Alpha-beta pruning** — cuts branches that cannot affect the final decision, significantly reducing nodes evaluated
4. **MVV-LVA move ordering** — captures sorted by victim value to maximise pruning efficiency
5. **Iterative deepening** — searches increasing depths so the best move found at a shallower depth is always available

## How to Run

Open `index.html` directly in a browser, or serve the folder with any static file server:

```bash
npx serve .
```

No build step, no dependencies, no API keys required.

## Author

Mabo Giqwa

