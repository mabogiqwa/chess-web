/**
 * chessGame.js
 * Main game controller: board state, rendering, move execution,
 * castling, en passant, promotion, and game-end detection.
 * Depends on OptimizedMinimaxChessAI (optimized_minimax.js).
 */
class ChessGame {
    constructor() {
        this.ai = new OptimizedMinimaxChessAI(1);
        this.flipped = false;
        this.newGame();
    }

    // ------------------------------------------------------------------ //
    //  Initialisation
    // ------------------------------------------------------------------ //

    newGame() {
        this.board           = this.initializeBoard();
        this.currentPlayer   = 'white';
        this.selectedPiece   = null;
        this.moveHistory     = [];
        this.lastMove        = null;
        this.positionHistory = [this.getPositionSignature()];
        this.gameOver        = false;

        // Castling rights
        this.whiteKingMoved    = false;
        this.blackKingMoved    = false;
        this.whiteRookAMoved   = false; // a-file rook (col 0)
        this.whiteRookHMoved   = false; // h-file rook (col 7)
        this.blackRookAMoved   = false;
        this.blackRookHMoved   = false;

        // En passant
        this.enPassantTarget = null;    // { row, col } of capturable square

        document.getElementById('game-over-overlay').classList.remove('show');
        document.getElementById('promo-modal').classList.remove('show');
        document.getElementById('move-list').innerHTML = '';

        this.renderBoard();
        this.updateStatus('Your turn', false);
        this.updateCapturedAndMaterial();
    }

    initializeBoard() {
        return [
            ['♜','♞','♝','♛','♚','♝','♞','♜'],
            ['♟','♟','♟','♟','♟','♟','♟','♟'],
            [' ',' ',' ',' ',' ',' ',' ',' '],
            [' ',' ',' ',' ',' ',' ',' ',' '],
            [' ',' ',' ',' ',' ',' ',' ',' '],
            [' ',' ',' ',' ',' ',' ',' ',' '],
            ['♙','♙','♙','♙','♙','♙','♙','♙'],
            ['♖','♘','♗','♕','♔','♗','♘','♖']
        ];
    }

    getPositionSignature() {
        return JSON.stringify(this.board);
    }

    // ------------------------------------------------------------------ //
    //  Rendering
    // ------------------------------------------------------------------ //

    renderBoard() {
        const boardEl = document.getElementById('chessboard');
        boardEl.innerHTML = '';
        const files = ['a','b','c','d','e','f','g','h'];

        for (let vRow = 0; vRow < 8; vRow++) {
            for (let vCol = 0; vCol < 8; vCol++) {
                const row = this.flipped ? 7 - vRow : vRow;
                const col = this.flipped ? 7 - vCol : vCol;

                const sq = document.createElement('div');
                sq.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                sq.dataset.row = row;
                sq.dataset.col = col;

                // Embedded coordinates
                if (vCol === 7) { sq.classList.add('coord-rank'); sq.dataset.rank = this.flipped ? row + 1 : 8 - row; }
                if (vRow === 7) { sq.classList.add('coord-file'); sq.dataset.file = files[col]; }

                // Last-move highlight
                if (this.lastMove) {
                    const [fr,fc] = this.lastMove.from;
                    const [tr,tc] = this.lastMove.to;
                    if ((row===fr && col===fc) || (row===tr && col===tc)) sq.classList.add('last-move');
                }

                // Selection
                if (this.selectedPiece && this.selectedPiece.row===row && this.selectedPiece.col===col) {
                    sq.classList.add('selected');
                }

                // Piece
                const piece = this.board[row][col];
                if (piece !== ' ') {
                    const span = document.createElement('span');
                    span.className = 'piece';
                    span.textContent = piece;
                    sq.appendChild(span);
                }

                // Move indicators
                if (this.selectedPiece && this.isValidMove(this.selectedPiece.row, this.selectedPiece.col, row, col)) {
                    if (piece !== ' ') {
                        sq.classList.add('capture-move');
                        const ring = document.createElement('div');
                        ring.className = 'capture-ring';
                        sq.appendChild(ring);
                    } else {
                        sq.classList.add('possible-move');
                        const dot = document.createElement('div');
                        dot.className = 'dot';
                        sq.appendChild(dot);
                    }
                }

                sq.addEventListener('click', e => {
                    this.handleSquareClick(
                        parseInt(e.currentTarget.dataset.row),
                        parseInt(e.currentTarget.dataset.col)
                    );
                });

                boardEl.appendChild(sq);
            }
        }

        // King-in-check glow
        const checkKing = this.findKingInCheck();
        if (checkKing) {
            const el = boardEl.querySelector(`[data-row="${checkKing.row}"][data-col="${checkKing.col}"]`);
            if (el) el.classList.add('in-check');
        }
    }

    updateStatus(text, thinking) {
        document.getElementById('status-text').textContent = text;
        const dot = document.getElementById('status-dot');
        dot.className = 'dot-indicator' + (thinking ? ' thinking' : '');
    }

    updateMoveList() {
        const el = document.getElementById('move-list');
        el.innerHTML = '';
        for (let i = 0; i < this.moveHistory.length; i += 2) {
            const w = this.moveHistory[i];
            const b = this.moveHistory[i + 1];
            const div = document.createElement('div');
            div.className = 'move-row';
            div.innerHTML = `
                <span class="move-num">${i / 2 + 1}.</span>
                <span class="move-white ${!b ? 'move-latest' : ''}">${w.notation}</span>
                <span class="move-black ${b ? 'move-latest' : ''}">${b ? b.notation : ''}</span>`;
            el.appendChild(div);
        }
        el.scrollTop = el.scrollHeight;
    }

    updateCapturedAndMaterial() {
        const PIECE_POINTS = {
            '♙':1,'♘':3,'♗':3,'♖':5,'♕':9,'♔':0,
            '♟':1,'♞':3,'♝':3,'♜':5,'♛':9,'♚':0
        };
        const whiteCap = [], blackCap = [];
        let whiteAdv = 0, blackAdv = 0;

        for (const m of this.moveHistory) {
            if (m.captured && m.captured !== ' ') {
                const v = PIECE_POINTS[m.captured] || 0;
                if (this.isPieceWhite(m.captured)) { blackCap.push(m.captured); whiteAdv += v; }
                else                               { whiteCap.push(m.captured); blackAdv += v; }
            }
        }

        document.getElementById('white-captured').textContent   = whiteCap.join('');
        document.getElementById('black-captured').textContent   = blackCap.join('');
        document.getElementById('white-material-adv').textContent = blackAdv > whiteAdv ? `+${blackAdv - whiteAdv}` : '';
        document.getElementById('black-material-adv').textContent = whiteAdv > blackAdv ? `+${whiteAdv - blackAdv}` : '';
    }

    // ------------------------------------------------------------------ //
    //  Input handling
    // ------------------------------------------------------------------ //

    handleSquareClick(row, col) {
        if (this.gameOver || this.currentPlayer !== 'white') return;

        const piece = this.board[row][col];

        if (!this.selectedPiece) {
            // Select a white piece
            if (piece !== ' ' && this.isPieceWhite(piece)) {
                this.selectedPiece = { row, col };
                this.renderBoard();
            }
        } else {
            // Re-select another own piece
            if (piece !== ' ' && this.isPieceWhite(piece) &&
                !(row === this.selectedPiece.row && col === this.selectedPiece.col)) {
                this.selectedPiece = { row, col };
                this.renderBoard();
                return;
            }

            if (this.isValidMove(this.selectedPiece.row, this.selectedPiece.col, row, col)) {
                this.executeMove(this.selectedPiece.row, this.selectedPiece.col, row, col, () => {
                    this.selectedPiece = null;
                    this.switchTurn();
                });
            } else {
                this.selectedPiece = null;
                this.renderBoard();
            }
        }
    }

    // ------------------------------------------------------------------ //
    //  Move execution
    // ------------------------------------------------------------------ //

    executeMove(fr, fc, tr, tc, callback) {
        const piece    = this.board[fr][fc];
        const captured = this.board[tr][tc];

        // En passant capture
        if ((piece === '♙' || piece === '♟') && fc !== tc && captured === ' ') {
            const epRow = piece === '♙' ? tr + 1 : tr - 1;
            this.board[epRow][tc] = ' ';
        }

        // Castling: move the rook
        if (piece === '♔' && Math.abs(fc - tc) === 2) {
            const fromRook = tc > fc ? 7 : 0;
            const toRook   = tc > fc ? 5 : 3;
            this.board[7][toRook]   = '♖';
            this.board[7][fromRook] = ' ';
        }
        if (piece === '♚' && Math.abs(fc - tc) === 2) {
            const fromRook = tc > fc ? 7 : 0;
            const toRook   = tc > fc ? 5 : 3;
            this.board[0][toRook]   = '♜';
            this.board[0][fromRook] = ' ';
        }

        // Update castling rights
        if (piece === '♔') this.whiteKingMoved = true;
        if (piece === '♚') this.blackKingMoved = true;
        if (piece === '♖' && fr === 7 && fc === 0) this.whiteRookAMoved = true;
        if (piece === '♖' && fr === 7 && fc === 7) this.whiteRookHMoved = true;
        if (piece === '♜' && fr === 0 && fc === 0) this.blackRookAMoved = true;
        if (piece === '♜' && fr === 0 && fc === 7) this.blackRookHMoved = true;

        // Update en-passant target
        this.enPassantTarget = null;
        if (piece === '♙' && fr === 6 && tr === 4) this.enPassantTarget = { row: 5, col: tc };
        if (piece === '♟' && fr === 1 && tr === 3) this.enPassantTarget = { row: 2, col: tc };

        // Place piece
        this.board[tr][tc] = piece;
        this.board[fr][fc] = ' ';
        this.lastMove = { from:[fr,fc], to:[tr,tc], piece, captured };

        // Promotion?
        if (piece === '♙' && tr === 0) {
            this.renderBoard();
            this.showPromotionModal('white', (choice) => {
                this.board[tr][tc] = choice;
                this.recordMove(fr, fc, tr, tc, piece, captured);
                this.renderBoard();
                callback();
            });
            return;
        }
        if (piece === '♟' && tr === 7) {
            this.renderBoard();
            this.showPromotionModal('black', (choice) => {
                this.board[tr][tc] = choice;
                this.recordMove(fr, fc, tr, tc, piece, captured);
                this.renderBoard();
                callback();
            });
            return;
        }

        this.recordMove(fr, fc, tr, tc, piece, captured);
        this.renderBoard();
        callback();
    }

    recordMove(fr, fc, tr, tc, piece, captured) {
        const files = ['a','b','c','d','e','f','g','h'];
        const notation = `${files[fc]}${8-fr}${captured !== ' ' ? 'x' : ''}${files[tc]}${8-tr}`;
        this.moveHistory.push({ from:[fr,fc], to:[tr,tc], piece, captured, notation });
        this.positionHistory.push(this.getPositionSignature());
        this.updateMoveList();
        this.updateCapturedAndMaterial();
    }

    // ------------------------------------------------------------------ //
    //  Turn management
    // ------------------------------------------------------------------ //

    switchTurn() {
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';

        const end = this.checkGameEnd();
        if (end.over) {
            this.gameOver = true;
            this.renderBoard();
            this.showGameOverModal(end.result, end.reason);
            return;
        }

        if (this.currentPlayer === 'black') {
            this.updateStatus('AI thinking…', true);
            setTimeout(() => this.makeAIMove(), 50);
        } else {
            this.updateStatus('Your turn', false);
        }
    }

    makeAIMove() {
        const move = this.ai.findBestMove(this.board);
        if (!move) { this.switchTurn(); return; }

        this.executeMove(move.from[0], move.from[1], move.to[0], move.to[1], () => {
            this.currentPlayer = 'white';
            const end = this.checkGameEnd();
            if (end.over) {
                this.gameOver = true;
                this.renderBoard();
                this.showGameOverModal(end.result, end.reason);
            } else {
                this.updateStatus('Your turn', false);
            }
        });
    }

    // ------------------------------------------------------------------ //
    //  Move validation
    // ------------------------------------------------------------------ //

    isValidMove(fr, fc, tr, tc) {
        const piece = this.board[fr][fc];
        if (!piece || piece === ' ') return false;

        // Castling
        if ((piece === '♔' || piece === '♚') && Math.abs(fc - tc) === 2 && fr === tr) {
            return this.isCastlingValid(fr, fc, tr, tc);
        }

        // En passant
        if ((piece === '♙' || piece === '♟') && fc !== tc && this.board[tr][tc] === ' ') {
            if (!this.enPassantTarget) return false;
            if (this.enPassantTarget.row !== tr || this.enPassantTarget.col !== tc) return false;
        }

        if (!this.ai.isValidMove(this.board, fr, fc, tr, tc)) return false;

        // Ensure move doesn't expose own king
        const color = this.isPieceWhite(piece) ? 'white' : 'black';
        const saved = this.board.map(r => [...r]);
        this.board[tr][tc] = this.board[fr][fc];
        this.board[fr][fc] = ' ';
        const inCheck = this.isKingInCheck(color);
        this.board = saved;
        return !inCheck;
    }

    isCastlingValid(fr, fc, tr, tc) {
        const isWhite = fr === 7;
        if (isWhite) {
            if (this.whiteKingMoved) return false;
            if (tc === 6 && !this.whiteRookHMoved &&
                this.board[7][5] === ' ' && this.board[7][6] === ' ') {
                return !this.isSquareAttacked(7,4,'white') &&
                       !this.isSquareAttacked(7,5,'white') &&
                       !this.isSquareAttacked(7,6,'white');
            }
            if (tc === 2 && !this.whiteRookAMoved &&
                this.board[7][3] === ' ' && this.board[7][2] === ' ' && this.board[7][1] === ' ') {
                return !this.isSquareAttacked(7,4,'white') &&
                       !this.isSquareAttacked(7,3,'white') &&
                       !this.isSquareAttacked(7,2,'white');
            }
        } else {
            if (this.blackKingMoved) return false;
            if (tc === 6 && !this.blackRookHMoved &&
                this.board[0][5] === ' ' && this.board[0][6] === ' ') {
                return !this.isSquareAttacked(0,4,'black') &&
                       !this.isSquareAttacked(0,5,'black') &&
                       !this.isSquareAttacked(0,6,'black');
            }
            if (tc === 2 && !this.blackRookAMoved &&
                this.board[0][3] === ' ' && this.board[0][2] === ' ' && this.board[0][1] === ' ') {
                return !this.isSquareAttacked(0,4,'black') &&
                       !this.isSquareAttacked(0,3,'black') &&
                       !this.isSquareAttacked(0,2,'black');
            }
        }
        return false;
    }

    // ------------------------------------------------------------------ //
    //  Check / attack detection
    // ------------------------------------------------------------------ //

    findKingInCheck() {
        const color = this.currentPlayer;
        const king  = color === 'white' ? '♔' : '♚';
        for (let r = 0; r < 8; r++)
            for (let c = 0; c < 8; c++)
                if (this.board[r][c] === king)
                    return this.isSquareAttacked(r, c, color) ? { row:r, col:c } : null;
        return null;
    }

    isKingInCheck(color) {
        const king = color === 'white' ? '♔' : '♚';
        for (let r = 0; r < 8; r++)
            for (let c = 0; c < 8; c++)
                if (this.board[r][c] === king)
                    return this.isSquareAttacked(r, c, color);
        return false;
    }

    isSquareAttacked(row, col, defendingColor) {
        for (let r = 0; r < 8; r++)
            for (let c = 0; c < 8; c++) {
                const p = this.board[r][c];
                if (p === ' ') continue;
                const isEnemy = defendingColor === 'white'
                    ? this.isPieceBlack(p)
                    : this.isPieceWhite(p);
                if (isEnemy && this.ai.isValidMove(this.board, r, c, row, col)) return true;
            }
        return false;
    }

    playerHasLegalMoves(color) {
        for (let fr = 0; fr < 8; fr++)
            for (let fc = 0; fc < 8; fc++) {
                const p = this.board[fr][fc];
                const mine = color === 'white' ? this.isPieceWhite(p) : this.isPieceBlack(p);
                if (!mine) continue;
                for (let tr = 0; tr < 8; tr++)
                    for (let tc = 0; tc < 8; tc++)
                        if (this.isValidMove(fr, fc, tr, tc)) return true;
            }
        return false;
    }

    // ------------------------------------------------------------------ //
    //  Game-end conditions
    // ------------------------------------------------------------------ //

    checkGameEnd() {
        const hasWhiteKing = this.board.flat().includes('♔');
        const hasBlackKing = this.board.flat().includes('♚');
        if (!hasWhiteKing) return { over:true, result:'Black Wins', reason:'King captured' };
        if (!hasBlackKing) return { over:true, result:'White Wins', reason:'King captured' };

        const color   = this.currentPlayer;
        const inCheck = this.isKingInCheck(color);
        const hasMoves = this.playerHasLegalMoves(color);

        if (!hasMoves && inCheck)  return { over:true, result: color==='white' ? 'Black Wins' : 'White Wins', reason:'Checkmate' };
        if (!hasMoves)             return { over:true, result:'Draw', reason:'Stalemate' };
        if (this.isInsufficientMaterial()) return { over:true, result:'Draw', reason:'Insufficient material' };
        if (this.isThreefoldRepetition())  return { over:true, result:'Draw', reason:'Threefold repetition' };
        if (this.isFiftyMoveRule())        return { over:true, result:'Draw', reason:'50-move rule' };
        return { over:false };
    }

    isInsufficientMaterial() {
        const pieces = this.board.flat().filter(p => p !== ' ');
        if (pieces.length === 2) return true;
        if (pieces.length === 3) return pieces.some(p => ['♗','♝','♘','♞'].includes(p));
        return false;
    }

    isThreefoldRepetition() {
        if (this.positionHistory.length < 5) return false;
        const cur = this.getPositionSignature();
        return this.positionHistory.filter(s => s === cur).length >= 3;
    }

    isFiftyMoveRule() {
        if (this.moveHistory.length < 100) return false;
        return this.moveHistory.slice(-100).every(m =>
            !['♙','♟'].includes(m.piece) && m.captured === ' '
        );
    }

    // ------------------------------------------------------------------ //
    //  Modals
    // ------------------------------------------------------------------ //

    showPromotionModal(color, callback) {
        const modal = document.getElementById('promo-modal');
        const opts  = document.getElementById('promo-options');
        opts.innerHTML = '';
        const pieces = color === 'white' ? ['♕','♖','♗','♘'] : ['♛','♜','♝','♞'];
        for (const p of pieces) {
            const div = document.createElement('div');
            div.className = 'promo-option';
            div.textContent = p;
            div.onclick = () => {
                modal.classList.remove('show');
                callback(p);
            };
            opts.appendChild(div);
        }
        modal.classList.add('show');
    }

    showGameOverModal(result, reason) {
        const icons = { 'White Wins':'♔', 'Black Wins':'♚', 'Draw':'½' };
        document.getElementById('game-over-icon').textContent   = icons[result] || '🏁';
        document.getElementById('game-over-result').textContent = result;
        document.getElementById('game-over-reason').textContent = 'by ' + reason;
        document.getElementById('game-over-overlay').classList.add('show');
    }

    // ------------------------------------------------------------------ //
    //  Utilities
    // ------------------------------------------------------------------ //

    flipBoard() {
        this.flipped = !this.flipped;
        this.renderBoard();
    }

    isPieceWhite(p) { return ['♙','♖','♘','♗','♕','♔'].includes(p); }
    isPieceBlack(p) { return ['♟','♜','♞','♝','♛','♚'].includes(p); }
}

// ---- Difficulty helper (called from HTML) ---- //
function setDifficulty(depth, btn) {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    game.ai.depth = depth;
    const labels = { 1:'~800 ELO', 2:'~1200 ELO', 3:'~1500 ELO', 4:'~1800 ELO' };
    document.getElementById('ai-rating').textContent = labels[depth] || '';
}

// ---- Bootstrap ---- //
const game = new ChessGame();