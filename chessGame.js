class ChessGame {
    constructor(board = null) {
        this.board = board || this.initializeBoard();
        this.currentPlayer = 'white';
        this.selectedPiece = null;
        this.moveHistory = [];
        this.positionHistory = [];
        this.ai = new OptimizedMinimaxChessAI();
        this.whiteKingMoved = false;
        this.blackKingMoved = false;
        this.whiteRooksKingside = false;
        this.whiteRooksQueenside = false;
        this.blackRooksKingside = false;
        this.blackRooksQueenside = false;

        this.positionHistory.push(this.getPositionSignature());

        if (!board) {
            this.renderBoard();
        }
    }

    getPositionSignature() {
        return {
            board: this.board.map(row => [...row]),
            currentPlayer: this.currentPlayer
        };
    }

    initializeBoard() {
        const board = [
            ['♜','♞','♝','♛','♚','♝','♞','♜'],
            ['♟','♟','♟','♟','♟','♟','♟','♟'],
            [' ',' ',' ',' ',' ',' ',' ',' '],
            [' ',' ',' ',' ',' ',' ',' ',' '],
            [' ',' ',' ',' ',' ',' ',' ',' '],
            [' ',' ',' ',' ',' ',' ',' ',' '],
            ['♙','♙','♙','♙','♙','♙','♙','♙'],
            ['♖','♘','♗','♕','♔','♗','♘','♖']
        ];
        return board;
    }

    renderBoard() {
        const boardElement = document.getElementById('chessboard');
        boardElement.innerHTML = '';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.classList.add('square');
                square.classList.add((row + col) % 2 === 0 ? 'light' : 'dark');
                square.textContent = this.board[row][col];
                square.dataset.row = row;
                square.dataset.col = col;
                square.addEventListener('click', this.handleSquareClick.bind(this));
                boardElement.appendChild(square);
            }
        }

        this.updateStatus();
    }

    updateStatus() {
        const statusElement = document.getElementById('status');
        statusElement.textContent = this.currentPlayer === 'white' 
            ? 'Your turn (White)' 
            : 'AI thinking...';
    }

    handleSquareClick(event) {
        if (this.currentPlayer !== 'white') return;

        const row = parseInt(event.target.dataset.row);
        const col = parseInt(event.target.dataset.col);
        const clickedPiece = this.board[row][col];

        this.clearHighlights();

        if (!this.selectedPiece) {
            if (clickedPiece !== ' ') {
                const pieceColor = this.isPieceWhite(clickedPiece) ? 'white' : 'black';

                if (pieceColor === this.currentPlayer) {
                    this.selectedPiece = { row, col };
                    event.target.classList.add('selected');
                    this.highlightPossibleMoves(row, col);
                }
            }
        } else {
            if (this.isValidMove(this.selectedPiece.row, this.selectedPiece.col, row, col)) {
                this.movePiece(
                    this.selectedPiece.row, 
                    this.selectedPiece.col, 
                    row, 
                    col
                );
            } else {
                if (this.selectedPiece.row === row && this.selectedPiece.col === col) {
                    this.clearHighlights();
                    this.selectedPiece = null;
                    return;
                }
            }

            this.clearHighlights();
            this.selectedPiece = null;
        }
    }

    highlightPossibleMoves(row, col) {
        for (let toRow = 0; toRow < 8; toRow++) {
            for (let toCol = 0; toCol < 8; toCol++) {
                if (this.isValidMove(row, col, toRow, toCol)) {
                    const targetSquare = document.querySelector(
                        `.square[data-row="${toRow}"][data-col="${toCol}"]`
                    );
                    
                    if (targetSquare) {
                        if (this.board[toRow][toCol] === ' ') {
                            targetSquare.classList.add('possible-move');
                        } else {
                            targetSquare.classList.add('capture-move');
                        }
                    }
                }
            }
        }
    }

    clearHighlights() {
        document.querySelectorAll('.square').forEach(square => {
            square.classList.remove('selected', 'possible-move', 'capture-move');
        });
    }

    isPieceWhite(piece) {
        const whitePieces = ['♙', '♖', '♘', '♗', '♕', '♔'];
        return whitePieces.includes(piece);
    }

    isValidMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const targetSquare = this.board[toRow][toCol];

        if (targetSquare !== ' ') {
            const pieceColor = this.isPieceWhite(piece) ? 'white' : 'black';
            const targetColor = this.isPieceWhite(targetSquare) ? 'white' : 'black';

            if (pieceColor === targetColor) {
                return false;
            }
        }

        switch (piece) {
            case '♙': return this.validateWhitePawnMove(fromRow, fromCol, toRow, toCol);
            case '♟': return this.validateBlackPawnMove(fromRow, fromCol, toRow, toCol);
            case '♖': case '♜': return this.validateRookMove(fromRow, fromCol, toRow, toCol);
            case '♘': case '♞': return this.validateKnightMove(fromRow, fromCol, toRow, toCol);
            case '♗': case '♝': return this.validateBishopMove(fromRow, fromCol, toRow, toCol);
            case '♕': case '♛': return this.validateQueenMove(fromRow, fromCol, toRow, toCol);
            case '♔': case '♚': return this.validateKingMove(fromRow, fromCol, toRow, toCol);
            default: return false;
        }
    }

    validateWhitePawnMove(fromRow, fromCol, toRow, toCol) {
        const direction = -1;
        const startRow = 6;

        if (fromCol === toCol && toRow === fromRow + direction && this.board[toRow][toCol] === ' ') {
            return true;
        }

        if (fromRow === startRow && 
            fromCol === toCol && 
            toRow === fromRow + (2 * direction) && 
            this.board[toRow][toCol] === ' ' &&
            this.board[fromRow + direction][toCol] === ' ') {
            return true;
        }

        if (Math.abs(fromCol - toCol) === 1 && 
            toRow === fromRow + direction && 
            this.board[toRow][toCol] !== ' ' && 
            !this.isPieceWhite(this.board[toRow][toCol])) {
            return true;
        }

        return false;
    }

    validateBlackPawnMove(fromRow, fromCol, toRow, toCol) {
        if (fromCol === toCol && toRow === fromRow + 1 && this.board[toRow][toCol] === ' ') {
            return true;
        }

        if (fromCol === toCol && fromRow === 1 && toRow === 3 && this.board[toRow][toCol] === ' ' && this.board[2][toCol] === ' ') {
            return true;
        }

        if (Math.abs(fromCol - toCol) === 1 && toRow === fromRow + 1) {
            return this.board[toRow][toCol] !== ' ';
        }

        return false;
    }

    validateRookMove(fromRow, fromCol, toRow, toCol) {
        if (fromRow === toRow || fromCol === toCol) {
            return this.isPathClear(fromRow, fromCol, toRow, toCol);
        }
        return false;
    }

    validateBishopMove(fromRow, fromCol, toRow, toCol) {
        if (Math.abs(fromRow - toRow) === Math.abs(fromCol - toCol)) {
            return this.isPathClear(fromRow, fromCol, toRow, toCol);
        }
        return false;
    }

    validateQueenMove(fromRow, fromCol, toRow, toCol) {
        return this.validateRookMove(fromRow, fromCol, toRow, toCol) || 
               this.validateBishopMove(fromRow, fromCol, toRow, toCol);
    }

    validateKingMove(fromRow, fromCol, toRow, toCol) {
        const rowDiff = Math.abs(fromRow - toRow);
        const colDiff = Math.abs(fromCol - toCol);
        
        // Standard king move
        if (rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0)) {
            return true;
        }

        // Castling kingside
        if (toRow === fromRow && toCol === fromCol + 2) {
            return this.canCastleKingside(fromRow);
        }

        // Castling queenside
        if (toRow === fromRow && toCol === fromCol - 2) {
            return this.canCastleQueenside(fromRow);
        }

        return false;
    }

    canCastleKingside(row) {
        const isWhite = row === 7;
        if (isWhite && (this.whiteKingMoved || this.whiteRooksKingside)) return false;
        if (!isWhite && (this.blackKingMoved || this.blackRooksKingside)) return false;

        // Check path is clear
        if (this.board[row][5] !== ' ' || this.board[row][6] !== ' ') return false;

        // Check rook exists
        const rook = this.board[row][7];
        if (isWhite && rook !== '♖') return false;
        if (!isWhite && rook !== '♜') return false;

        return true;
    }

    canCastleQueenside(row) {
        const isWhite = row === 7;
        if (isWhite && (this.whiteKingMoved || this.whiteRooksQueenside)) return false;
        if (!isWhite && (this.blackKingMoved || this.blackRooksQueenside)) return false;

        // Check path is clear
        if (this.board[row][1] !== ' ' || this.board[row][2] !== ' ' || this.board[row][3] !== ' ') return false;

        // Check rook exists
        const rook = this.board[row][0];
        if (isWhite && rook !== '♖') return false;
        if (!isWhite && rook !== '♜') return false;

        return true;
    }

    validateKnightMove(fromRow, fromCol, toRow, toCol) {
        const rowDiff = Math.abs(fromRow - toRow);
        const colDiff = Math.abs(fromCol - toCol);
        return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
    }

    isPathClear(fromRow, fromCol, toRow, toCol) {
        if (fromRow === toRow) {
            const start = Math.min(fromCol, toCol) + 1;
            const end = Math.max(fromCol, toCol);
            for (let col = start; col < end; col++) {
                if (this.board[fromRow][col] !== ' ') {
                    return false;
                }
            }
        } else if (fromCol === toCol) {
            const start = Math.min(fromRow, toRow) + 1;
            const end = Math.max(fromRow, toRow);
            for (let row = start; row < end; row++) {
                if (this.board[row][fromCol] !== ' ') {
                    return false;
                }
            }
        } else {
            const rowStep = fromRow < toRow ? 1 : -1;
            const colStep = fromCol < toCol ? 1 : -1;
            let row = fromRow + rowStep;
            let col = fromCol + colStep;

            while (row !== toRow || col !== toCol) {
                if (this.board[row][col] !== ' ') {
                    return false;
                }
                row += rowStep;
                col += colStep;
            }
        }
        return true;
    }

    movePiece(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const captured = this.board[toRow][toCol];

        // Track king and rook movements for castling
        if (piece === '♔') {
            this.whiteKingMoved = true;
            // Handle castling kingside
            if (toCol === fromCol + 2) {
                this.board[fromRow][5] = this.board[fromRow][7];
                this.board[fromRow][7] = ' ';
            }
            // Handle castling queenside
            if (toCol === fromCol - 2) {
                this.board[fromRow][3] = this.board[fromRow][0];
                this.board[fromRow][0] = ' ';
            }
        }

        if (piece === '♚') {
            this.blackKingMoved = true;
            // Handle castling kingside
            if (toCol === fromCol + 2) {
                this.board[fromRow][5] = this.board[fromRow][7];
                this.board[fromRow][7] = ' ';
            }
            // Handle castling queenside
            if (toCol === fromCol - 2) {
                this.board[fromRow][3] = this.board[fromRow][0];
                this.board[fromRow][0] = ' ';
            }
        }

        if (piece === '♖' && fromRow === 7) {
            if (fromCol === 0) this.whiteRooksQueenside = true;
            if (fromCol === 7) this.whiteRooksKingside = true;
        }

        if (piece === '♜' && fromRow === 0) {
            if (fromCol === 0) this.blackRooksQueenside = true;
            if (fromCol === 7) this.blackRooksKingside = true;
        }

        // Move the piece
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = ' ';

        const move = {
            piece: piece,
            from: [fromRow, fromCol],
            to: [toRow, toCol],
            captured: captured
        };
        this.moveHistory.push(move);

        this.positionHistory.push(this.getPositionSignature());

        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';

        this.renderBoard();

        const gameEndResult = this.checkGameEnd();
        if (gameEndResult.gameOver) {
            this.endGame(gameEndResult);
            return;
        }

        if (this.currentPlayer === 'black') {
            this.makeAIMove();
        }
    }

    isPieceBlack(piece) {
        const blackPieces = ['♟', '♜', '♞', '♝', '♛', '♚'];
        return blackPieces.includes(piece);
    }

    makeAIMove() {
        setTimeout(() => {
            const bestMove = this.ai.findBestMove(this.board);

            if (bestMove) {
                this.movePiece(
                    bestMove.from[0], 
                    bestMove.from[1], 
                    bestMove.to[0], 
                    bestMove.to[1]
                );

                const gameEndResult = this.checkGameEnd();
                if (gameEndResult.gameOver) {
                    this.endGame(gameEndResult);
                }
            }
        }, 100);
    }

    checkGameEnd() {
        const whiteKingExists = this.board.flat().some(piece => piece === '♔');
        const blackKingExists = this.board.flat().some(piece => piece === '♚');

        if (!whiteKingExists) {
            return {
                gameOver: true,
                result: 'Black Wins',
                reason: 'White King Captured'
            };
        }

        if (!blackKingExists) {
            return {
                gameOver: true,
                result: 'White Wins',
                reason: 'Black King Captured'
            };
        }

        const whiteKingStatus = this.checkKingStatus('white');
        const blackKingStatus = this.checkKingStatus('black');

        if (whiteKingStatus.isInCheck && !this.hasValidMoves('white')) {
            return { gameOver: true, result: 'Black Wins', reason: 'Checkmate' };
        }

        if (blackKingStatus.isInCheck && !this.hasValidMoves('black')) {
            return { gameOver: true, result: 'White Wins', reason: 'Checkmate' };
        }

        if (!whiteKingStatus.isInCheck && !this.hasValidMoves('white')) {
            return { gameOver: true, result: 'Draw', reason: 'Stalemate' };
        }

        if (!blackKingStatus.isInCheck && !this.hasValidMoves('black')) {
            return { gameOver: true, result: 'Draw', reason: 'Stalemate' };
        }

        if (this.isInsufficientMaterial()) {
            return { gameOver: true, result: 'Draw', reason: 'Insufficient Material' };
        }

        if (this.isThreefoldRepetition()) {
            return { gameOver: true, result: 'Draw', reason: 'Threefold Repetition' };
        }

        if (this.isFiftyMoveRule()) {
            return { gameOver: true, result: 'Draw', reason: '50-Move Rule' };
        }

        return { gameOver: false, result: null, reason: null };
    }

    checkKingStatus(color) {
        let kingPosition = null;
        const kingSymbol = color === 'white' ? '♔' : '♚';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.board[row][col] === kingSymbol) {
                    kingPosition = { row, col };
                    break;
                }
            }
            if (kingPosition) break;
        }

        if (!kingPosition) {
            throw new Error(`No ${color} king found on the board`);
        }

        return {
            isInCheck: this.isSquareUnderAttack(kingPosition.row, kingPosition.col, color),
            position: kingPosition
        };
    }

    isSquareUnderAttack(row, col, defendingColor) {
        for (let fromRow = 0; fromRow < 8; fromRow++) {
            for (let fromCol = 0; fromCol < 8; fromCol++) {
                const piece = this.board[fromRow][fromCol];
                
                const isAttackingPiece = defendingColor === 'white' 
                    ? this.isPieceBlack(piece)
                    : this.isPieceWhite(piece);

                if (isAttackingPiece) {
                    if (this.isValidMove(fromRow, fromCol, row, col)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    hasValidMoves(color) {
        for (let fromRow = 0; fromRow < 8; fromRow++) {
            for (let fromCol = 0; fromCol < 8; fromCol++) {
                const piece = this.board[fromRow][fromCol];
                
                const isPieceOfColor = color === 'white' 
                    ? this.isPieceWhite(piece)
                    : this.isPieceBlack(piece);

                if (isPieceOfColor) {
                    for (let toRow = 0; toRow < 8; toRow++) {
                        for (let toCol = 0; toCol < 8; toCol++) {
                            if (this.isValidMove(fromRow, fromCol, toRow, toCol)) {
                                return true;
                            }
                        }
                    }
                }
            }
        }
        return false;
    }

    isInsufficientMaterial() {
        const pieces = this.board.flat();
        const remainingPieces = pieces.filter(piece => piece !== ' ');
        
        if (remainingPieces.length === 2) return true;

        if (remainingPieces.length === 3) {
            const minorPieces = ['♗', '♝', '♘', '♞'];
            return remainingPieces.some(piece => minorPieces.includes(piece));
        }
        
        return false;
    }

    isThreefoldRepetition() {
        if (this.positionHistory.length < 3) return false;

        const currentSignature = this.getPositionSignature();

        const positionCount = this.positionHistory.filter(prevSignature => 
            this.areBoardStatesEqual(prevSignature.board, currentSignature.board) &&
            prevSignature.currentPlayer === currentSignature.currentPlayer
        ).length;

        return positionCount >= 3;
    }

    areBoardStatesEqual(board1, board2) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (board1[row][col] !== board2[row][col]) {
                    return false;
                }
            }
        }
        return true;
    }
    
    isFiftyMoveRule() {
        if (this.moveHistory.length < 50) return false;
        
        const recentMoves = this.moveHistory.slice(-50);
        return recentMoves.every(move => 
            move.piece !== '♙' && 
            move.piece !== '♟' && 
            move.captured === ' '
        );
    }

    endGame(result) {
        const statusElement = document.getElementById('status');
        statusElement.textContent = `Game Over: ${result.result} (${result.reason})`;
        
        document.querySelectorAll('.square').forEach(square => {
            square.removeEventListener('click', this.handleSquareClick.bind(this));
        });

        document.getElementById('chessboard').classList.add('game-over');
    }
}

const game = new ChessGame();