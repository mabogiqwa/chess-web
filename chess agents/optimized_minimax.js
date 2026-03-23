/**
 * optimized_minimax.js
 * Enhanced chess AI using minimax with alpha-beta pruning,
 * piece-square tables, and MVV-LVA move ordering.
 */
class OptimizedMinimaxChessAI {
    constructor(depth = 2) {
        this.depth = depth;

        // Material values in centipawns
        this.PIECE_VAL = {
            '♟': 100,  '♞': 320,  '♝': 330,  '♜': 500,  '♛': 900,  '♚': 20000,
            '♙': -100, '♘': -320, '♗': -330, '♖': -500, '♕': -900, '♔': -20000
        };

        // Piece-square tables (from black's perspective; mirrored for white)
        this.PST = {
            pawn: [
                [ 0,  0,  0,  0,  0,  0,  0,  0],
                [50, 50, 50, 50, 50, 50, 50, 50],
                [10, 10, 20, 30, 30, 20, 10, 10],
                [ 5,  5, 10, 25, 25, 10,  5,  5],
                [ 0,  0,  0, 20, 20,  0,  0,  0],
                [ 5, -5,-10,  0,  0,-10, -5,  5],
                [ 5, 10, 10,-20,-20, 10, 10,  5],
                [ 0,  0,  0,  0,  0,  0,  0,  0]
            ],
            knight: [
                [-50,-40,-30,-30,-30,-30,-40,-50],
                [-40,-20,  0,  0,  0,  0,-20,-40],
                [-30,  0, 10, 15, 15, 10,  0,-30],
                [-30,  5, 15, 20, 20, 15,  5,-30],
                [-30,  0, 15, 20, 20, 15,  0,-30],
                [-30,  5, 10, 15, 15, 10,  5,-30],
                [-40,-20,  0,  5,  5,  0,-20,-40],
                [-50,-40,-30,-30,-30,-30,-40,-50]
            ],
            bishop: [
                [-20,-10,-10,-10,-10,-10,-10,-20],
                [-10,  0,  0,  0,  0,  0,  0,-10],
                [-10,  0,  5, 10, 10,  5,  0,-10],
                [-10,  5,  5, 10, 10,  5,  5,-10],
                [-10,  0, 10, 10, 10, 10,  0,-10],
                [-10, 10, 10, 10, 10, 10, 10,-10],
                [-10,  5,  0,  0,  0,  0,  5,-10],
                [-20,-10,-10,-10,-10,-10,-10,-20]
            ],
            rook: [
                [ 0,  0,  0,  0,  0,  0,  0,  0],
                [ 5, 10, 10, 10, 10, 10, 10,  5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [ 0,  0,  0,  5,  5,  0,  0,  0]
            ],
            queen: [
                [-20,-10,-10, -5, -5,-10,-10,-20],
                [-10,  0,  0,  0,  0,  0,  0,-10],
                [-10,  0,  5,  5,  5,  5,  0,-10],
                [ -5,  0,  5,  5,  5,  5,  0, -5],
                [  0,  0,  5,  5,  5,  5,  0, -5],
                [-10,  5,  5,  5,  5,  5,  0,-10],
                [-10,  0,  5,  0,  0,  0,  0,-10],
                [-20,-10,-10, -5, -5,-10,-10,-20]
            ],
            king_mid: [
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-20,-30,-30,-40,-40,-30,-30,-20],
                [-10,-20,-20,-20,-20,-20,-20,-10],
                [ 20, 20,  0,  0,  0,  0, 20, 20],
                [ 20, 30, 10,  0,  0, 10, 30, 20]
            ]
        };

        this.BLACK_PIECES = new Set(['♟','♞','♝','♜','♛','♚']);
        this.WHITE_PIECES = new Set(['♙','♘','♗','♖','♕','♔']);
    }

    // ------------------------------------------------------------------ //
    //  Public API
    // ------------------------------------------------------------------ //

    findBestMove(board) {
        let best = null;
        for (let d = 1; d <= this.depth; d++) {
            const result = this.minimax(board, d, true, -Infinity, Infinity);
            if (result.move) best = result.move;
        }
        return best;
    }

    // ------------------------------------------------------------------ //
    //  Helpers
    // ------------------------------------------------------------------ //

    isBlackPiece(p) { return this.BLACK_PIECES.has(p); }
    isWhitePiece(p) { return this.WHITE_PIECES.has(p); }

    getPST(piece, row, col) {
        const isBlack = this.isBlackPiece(piece);
        const r = isBlack ? row : 7 - row;
        const sign = isBlack ? 1 : -1;
        switch (piece) {
            case '♟': case '♙': return sign * this.PST.pawn[r][col];
            case '♞': case '♘': return sign * this.PST.knight[r][col];
            case '♝': case '♗': return sign * this.PST.bishop[r][col];
            case '♜': case '♖': return sign * this.PST.rook[r][col];
            case '♛': case '♕': return sign * this.PST.queen[r][col];
            case '♚': case '♔': return sign * this.PST.king_mid[r][col];
            default: return 0;
        }
    }

    evaluateBoard(board) {
        let score = 0;
        for (let r = 0; r < 8; r++)
            for (let c = 0; c < 8; c++) {
                const p = board[r][c];
                if (p !== ' ') score += this.PIECE_VAL[p] + this.getPST(p, r, c);
            }
        return score;
    }

    // ------------------------------------------------------------------ //
    //  Move generation
    // ------------------------------------------------------------------ //

    generateMoves(board, isBlackTurn) {
        const moves = [];
        for (let fr = 0; fr < 8; fr++)
            for (let fc = 0; fc < 8; fc++) {
                const p = board[fr][fc];
                if (isBlackTurn ? this.isBlackPiece(p) : this.isWhitePiece(p)) {
                    for (let tr = 0; tr < 8; tr++)
                        for (let tc = 0; tc < 8; tc++)
                            if (this.isValidMove(board, fr, fc, tr, tc))
                                moves.push({ from:[fr,fc], to:[tr,tc], piece:p });
                }
            }

        // MVV-LVA: prioritise high-value captures
        return moves.sort((a, b) => {
            const ca = board[a.to[0]][a.to[1]];
            const cb = board[b.to[0]][b.to[1]];
            const va = ca !== ' ' ? Math.abs(this.PIECE_VAL[ca]) : 0;
            const vb = cb !== ' ' ? Math.abs(this.PIECE_VAL[cb]) : 0;
            return vb - va;
        });
    }

    applyMove(board, move) {
        const nb = board.map(r => [...r]);
        nb[move.to[0]][move.to[1]] = nb[move.from[0]][move.from[1]];
        nb[move.from[0]][move.from[1]] = ' ';
        // Auto-promote pawns to queen for search purposes
        if (nb[move.to[0]][move.to[1]] === '♟' && move.to[0] === 7) nb[move.to[0]][move.to[1]] = '♛';
        if (nb[move.to[0]][move.to[1]] === '♙' && move.to[0] === 0) nb[move.to[0]][move.to[1]] = '♕';
        return nb;
    }

    // ------------------------------------------------------------------ //
    //  Minimax with alpha-beta pruning
    // ------------------------------------------------------------------ //

    minimax(board, depth, isMaximising, alpha, beta) {
        if (depth === 0) return { score: this.evaluateBoard(board) };

        const moves = this.generateMoves(board, isMaximising);
        if (!moves.length)  return { score: this.evaluateBoard(board) };

        let bestMove = null;

        if (isMaximising) {
            let maxScore = -Infinity;
            for (const move of moves) {
                const nb = this.applyMove(board, move);
                const { score } = this.minimax(nb, depth - 1, false, alpha, beta);
                if (score > maxScore) { maxScore = score; bestMove = move; }
                alpha = Math.max(alpha, score);
                if (beta <= alpha) break;
            }
            return { score: maxScore, move: bestMove };
        } else {
            let minScore = Infinity;
            for (const move of moves) {
                const nb = this.applyMove(board, move);
                const { score } = this.minimax(nb, depth - 1, true, alpha, beta);
                if (score < minScore) { minScore = score; bestMove = move; }
                beta = Math.min(beta, score);
                if (beta <= alpha) break;
            }
            return { score: minScore, move: bestMove };
        }
    }

    // ------------------------------------------------------------------ //
    //  Move validation
    // ------------------------------------------------------------------ //

    isValidMove(board, fr, fc, tr, tc) {
        if (fr === tr && fc === tc) return false;
        const p = board[fr][fc];
        if (!p || p === ' ') return false;
        const t = board[tr][tc];
        if (t !== ' ' && this.isBlackPiece(p) === this.isBlackPiece(t)) return false;

        switch (p) {
            case '♟': return this.validateBlackPawnMove(board, fr, fc, tr, tc);
            case '♙': return this.validateWhitePawnMove(board, fr, fc, tr, tc);
            case '♞': case '♘': return this.validateKnightMove(fr, fc, tr, tc);
            case '♜': case '♖': return this.validateRookMove(board, fr, fc, tr, tc);
            case '♝': case '♗': return this.validateBishopMove(board, fr, fc, tr, tc);
            case '♛': case '♕': return this.validateQueenMove(board, fr, fc, tr, tc);
            case '♚': case '♔': return this.validateKingMove(fr, fc, tr, tc);
            default: return false;
        }
    }

    validateBlackPawnMove(board, fr, fc, tr, tc) {
        const rd = tr - fr, cd = Math.abs(fc - tc);
        if (fc === tc && rd === 1 && board[tr][tc] === ' ') return true;
        if (fc === tc && fr === 1 && rd === 2 && board[fr+1][tc] === ' ' && board[tr][tc] === ' ') return true;
        if (cd === 1 && rd === 1 && board[tr][tc] !== ' ' && this.isWhitePiece(board[tr][tc])) return true;
        return false;
    }

    validateWhitePawnMove(board, fr, fc, tr, tc) {
        const rd = fr - tr, cd = Math.abs(fc - tc);
        if (fc === tc && rd === 1 && board[tr][tc] === ' ') return true;
        if (fc === tc && fr === 6 && rd === 2 && board[fr-1][tc] === ' ' && board[tr][tc] === ' ') return true;
        if (cd === 1 && rd === 1 && board[tr][tc] !== ' ' && this.isBlackPiece(board[tr][tc])) return true;
        return false;
    }

    validateKnightMove(fr, fc, tr, tc) {
        const rd = Math.abs(fr - tr), cd = Math.abs(fc - tc);
        return (rd === 2 && cd === 1) || (rd === 1 && cd === 2);
    }

    validateRookMove(board, fr, fc, tr, tc) {
        if (fr !== tr && fc !== tc) return false;
        return this.isPathClear(board, fr, fc, tr, tc);
    }

    validateBishopMove(board, fr, fc, tr, tc) {
        if (Math.abs(fr - tr) !== Math.abs(fc - tc)) return false;
        return this.isPathClear(board, fr, fc, tr, tc);
    }

    validateQueenMove(board, fr, fc, tr, tc) {
        return this.validateRookMove(board, fr, fc, tr, tc) ||
               this.validateBishopMove(board, fr, fc, tr, tc);
    }

    validateKingMove(fr, fc, tr, tc) {
        return Math.abs(fr - tr) <= 1 && Math.abs(fc - tc) <= 1;
    }

    isPathClear(board, fr, fc, tr, tc) {
        const rs = fr < tr ? 1 : fr > tr ? -1 : 0;
        const cs = fc < tc ? 1 : fc > tc ? -1 : 0;
        let r = fr + rs, c = fc + cs;
        while (r !== tr || c !== tc) {
            if (board[r][c] !== ' ') return false;
            r += rs; c += cs;
        }
        return true;
    }
}