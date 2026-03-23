const ANALYSIS_DEPTH = 2;   // raise to 3 for stronger (but slower) analysis

// ── Classification thresholds (centipawns lost vs best move) ─────────────── //
const CP_THRESHOLDS = {
    BRILLIANT:   -30,   // move scores better than the engine's best
    GOOD:          0,   // on par with best
    INACCURACY:   50,
    MISTAKE:     150,
    // anything above MISTAKE → BLUNDER
};

function classifyMove(cpLoss) {
    if (cpLoss <= CP_THRESHOLDS.BRILLIANT)  return 'brilliant';
    if (cpLoss <= CP_THRESHOLDS.GOOD)       return 'good';
    if (cpLoss <= CP_THRESHOLDS.INACCURACY) return 'inaccuracy';
    if (cpLoss <= CP_THRESHOLDS.MISTAKE)    return 'mistake';
    return 'blunder';
}

/** Chess.com-style accuracy curve: 0 cp loss → ~100 %, ≥ 300 cp → ~0 % */
function cpLossToAccuracy(cpLoss) {
    return Math.max(0, Math.min(100,
        103.1668 * Math.exp(-0.04354 * Math.max(0, cpLoss)) - 3.1669
    ));
}

function analyzeGame(gameInstance) {
    const history   = gameInstance.moveHistory;
    const snapshots = gameInstance.positionHistory; // snapshots[i] = board JSON *before* move i

    if (!history || history.length === 0) return null;

    const analysisAI = new OptimizedMinimaxChessAI(ANALYSIS_DEPTH);

    const stats = {
        white: { sum: 0, count: 0, blunders: 0, mistakes: 0, inaccuracies: 0, moveDetails: [] },
        black: { sum: 0, count: 0, blunders: 0, mistakes: 0, inaccuracies: 0, moveDetails: [] }
    };

    for (let i = 0; i < history.length; i++) {
        const move        = history[i];
        const isWhiteTurn = (i % 2 === 0);
        const side        = isWhiteTurn ? 'white' : 'black';

        // Reconstruct boards from the serialised snapshots
        const boardBefore = JSON.parse(snapshots[i]);
        const boardAfter  = JSON.parse(
            i + 1 < snapshots.length ? snapshots[i + 1] : snapshots[snapshots.length - 1]
        );

        // Engine score for the best move available to the side to move.
        // Convention in OptimizedMinimaxChessAI:
        //   isMaximising = true  → black's turn  (black wants higher scores)
        //   isMaximising = false → white's turn  (white wants lower scores)
        const isMaximising = !isWhiteTurn;
        const { score: bestScore } = analysisAI.minimax(
            boardBefore, ANALYSIS_DEPTH, isMaximising, -Infinity, Infinity
        );

        // Score of the position that was actually reached
        const actualScore = analysisAI.evaluateBoard(boardAfter);

        // Centipawn loss: positive = worse for the player who just moved
        const cpLoss = isWhiteTurn
            ? actualScore - bestScore   // white wants low; positive → worse
            : bestScore   - actualScore; // black wants high; positive → worse

        const classification = classifyMove(cpLoss);
        const moveAccuracy   = cpLossToAccuracy(cpLoss);

        stats[side].sum   += moveAccuracy;
        stats[side].count += 1;
        if (classification === 'blunder')    stats[side].blunders++;
        if (classification === 'mistake')    stats[side].mistakes++;
        if (classification === 'inaccuracy') stats[side].inaccuracies++;

        stats[side].moveDetails.push({
            moveNumber:     Math.floor(i / 2) + 1,
            notation:       move.notation,
            cpLoss:         Math.round(cpLoss),
            classification,
            accuracy:       Math.round(moveAccuracy)
        });
    }

    function finalise(s) {
        return {
            accuracy:     s.count ? Math.round(s.sum / s.count) : 100,
            blunders:     s.blunders,
            mistakes:     s.mistakes,
            inaccuracies: s.inaccuracies,
            moveDetails:  s.moveDetails
        };
    }

    return { white: finalise(stats.white), black: finalise(stats.black) };
}

// ── UI helpers ────────────────────────────────────────────────────────────── //

const CLASS_META = {
    brilliant:   { symbol: '!!', color: '#1baca6' },
    good:        { symbol: '!',  color: '#7fa650' },
    inaccuracy:  { symbol: '?!', color: '#f0a500' },
    mistake:     { symbol: '?',  color: '#e07000' },
    blunder:     { symbol: '??', color: '#cc4444' }
};

/** Called by the "Analyze Game" button in the game-over card. */
function startPostGameAnalysis() {
    document.getElementById('game-over-overlay').classList.remove('show');
    document.getElementById('analysis-modal').classList.add('show');

    // Reset UI to loading state
    ['w-acc', 'b-acc'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.textContent = '…'; el.style.color = 'var(--text-muted)'; }
    });
    ['w-blunders','w-mistakes','w-inacc','b-blunders','b-mistakes','b-inacc']
        .forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '—'; });
    ['w-acc-bar','b-acc-bar'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.style.transition = 'none'; el.style.width = '0%'; }
    });
    const moveListEl = document.getElementById('analysis-move-list');
    if (moveListEl) moveListEl.innerHTML =
        '<div style="color:var(--text-muted);font-size:12px;padding:4px 0">Analysing…</div>';

    // Defer so the modal renders before the CPU-intensive analysis begins
    setTimeout(() => {
        const result = analyzeGame(game);
        if (!result) {
            ['w-acc','b-acc'].forEach(id => {
                const el = document.getElementById(id);
                if (el) { el.textContent = 'N/A'; el.style.color = 'var(--text-muted)'; }
            });
            return;
        }

        applyAccuracy('w-acc', 'w-acc-bar', result.white.accuracy);
        applyAccuracy('b-acc', 'b-acc-bar', result.black.accuracy);

        document.getElementById('w-blunders').textContent = result.white.blunders;
        document.getElementById('w-mistakes').textContent = result.white.mistakes;
        document.getElementById('w-inacc').textContent    = result.white.inaccuracies;
        document.getElementById('b-blunders').textContent = result.black.blunders;
        document.getElementById('b-mistakes').textContent = result.black.mistakes;
        document.getElementById('b-inacc').textContent    = result.black.inaccuracies;

        renderMoveBreakdown(result);
    }, 60);
}

function applyAccuracy(textId, barId, pct) {
    const color  = pct >= 80 ? 'var(--green)' : pct >= 55 ? '#c8a227' : 'var(--red)';
    const textEl = document.getElementById(textId);
    const barEl  = document.getElementById(barId);

    if (textEl) { textEl.textContent = pct + '%'; textEl.style.color = color; }
    if (barEl) {
        barEl.style.background = color;
        requestAnimationFrame(() => requestAnimationFrame(() => {
            barEl.style.transition = 'width 0.9s cubic-bezier(0.25,1,0.5,1)';
            barEl.style.width = pct + '%';
        }));
    }
}

function renderMoveBreakdown(result) {
    const container = document.getElementById('analysis-move-list');
    if (!container) return;
    container.innerHTML = '';

    const wMoves = result.white.moveDetails;
    const bMoves = result.black.moveDetails;
    const rows   = Math.max(wMoves.length, bMoves.length);

    for (let i = 0; i < rows; i++) {
        const row = document.createElement('div');
        row.className = 'amove-row';

        const numEl = document.createElement('span');
        numEl.className   = 'amove-num';
        numEl.textContent = (i + 1) + '.';
        row.appendChild(numEl);

        row.appendChild(wMoves[i] ? makeChip(wMoves[i]) : emptyChip());
        row.appendChild(bMoves[i] ? makeChip(bMoves[i]) : emptyChip());

        container.appendChild(row);
    }
}

function makeChip(detail) {
    const meta = CLASS_META[detail.classification] || CLASS_META.good;
    const chip = document.createElement('span');
    chip.className = `amove-chip amove-${detail.classification}`;
    chip.title     = `${detail.classification} · ${detail.cpLoss >= 0 ? '+' : ''}${detail.cpLoss} cp · ${detail.accuracy}% accuracy`;

    const noteSpan = document.createElement('span');
    noteSpan.textContent = detail.notation;

    const annot = document.createElement('sup');
    annot.textContent  = meta.symbol;
    annot.style.cssText = `color:${meta.color};font-size:9px;margin-left:2px;font-weight:700;font-style:normal`;

    chip.appendChild(noteSpan);
    chip.appendChild(annot);
    return chip;
}

function emptyChip() {
    const s = document.createElement('span');
    s.className = 'amove-chip';
    return s;
}

function closeAnalysis() {
    document.getElementById('analysis-modal').classList.remove('show');
}