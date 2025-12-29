// js/game.js
import { state, network, setState } from './state.js';
import { VECTORS } from './config.js';

// --- BOARD & PIECE LOGIC ---

/**
 * Creates a new chess board with optional special pieces
 * @param {Object} config - Game configuration
 * @param {boolean} config.dino - Whether to include triceratops pieces
 * @returns {Array<Array<string|null>>} 8x8 board array with piece codes
 */
export function createBoard(config) {
    const b = Array(8).fill(null).map(() => Array(8).fill(null));
    const setRow = (r, p) => p.forEach((type, c) => b[r][c] = type);
    setRow(0, ['r','n','b','q','k','b','n','r']); 
    setRow(1, Array(8).fill('p'));
    setRow(6, Array(8).fill('P')); 
    setRow(7, ['R','N','B','Q','K','B','N','R']);
    
    if (config.dino) { b[5][4] = 'T'; b[2][4] = 't'; }
    return b;
}

/**
 * Gets the effective piece at a position (handles hidden assassins)
 * @param {number} r - Row (0-7)
 * @param {number} c - Column (0-7)
 * @param {Array} board - Board state
 * @returns {string|null} Piece code or null if empty/hidden
 */
export function getEffectivePiece(r, c, board) {
    const p = board[r][c];
    if (!p) return null;
    if (state.config.assassin && p.toLowerCase() === 'a') {
        const isWhiteAss = (p === 'A');
        const enemyPawn = isWhiteAss ? 'p' : 'P';
        for (let pr = 0; pr < 8; pr++) {
            for (let pc = 0; pc < 8; pc++) {
                if (board[pr][pc] === enemyPawn) {
                    const attackRow = pr + (isWhiteAss ? 1 : -1);
                    if (attackRow === r && Math.abs(pc - c) === 1) return p; 
                    if (isWhiteAss && pr > r) return p; 
                    if (!isWhiteAss && pr < r) return p; 
                }
            }
        }
        return null; // Hidden
    }
    return p;
}

/**
 * Finds the king's position for a given color
 * @param {string} color - 'white' or 'black'
 * @param {Array} board - Board state (defaults to current state.board)
 * @returns {{r: number, c: number}|null} King position or null if not found
 */
export function findKing(color, board = state.board) {
    const k = color === 'white' ? 'K' : 'k';
    for(let r=0; r<8; r++) for(let c=0; c<8; c++) if (board[r][c] === k) return {r, c};
    return null;
}

export function isAttacked(pos, myColor, board, visibilityBoard = null) {
    const visBoard = visibilityBoard || board;
    for (let r=0; r<8; r++) {
        for (let c=0; c<8; c++) {
            const p = board[r][c];
            if (p && ((myColor === 'white' && p === p.toLowerCase()) || (myColor === 'black' && p === p.toUpperCase()))) {
                if (state.config.assassin && p.toLowerCase() === 'a' && getEffectivePiece(r, c, visBoard) === null) continue;
                const moves = generateMoves(r, c, p, board, false);
                if (moves.some(m => m.r === pos.r && m.c === pos.c)) return true;
            }
        }
    }
    return false;
}

export function inCheck(color) {
    const k = findKing(color);
    return k && isAttacked(k, color, state.board);
}

// --- MOVE GENERATION ---

/**
 * Gets all legal moves for a piece (filters out moves that would leave king in check)
 * @param {number} r - Piece row (0-7)
 * @param {number} c - Piece column (0-7)
 * @param {string} p - Piece code (e.g., 'P', 'n', 'Q')
 * @returns {Array<{r: number, c: number}>} Array of valid move destinations
 */
export function getSafeMoves(r, c, p) {
    return generateMoves(r, c, p, state.board).filter(m => {
        const simBoard = state.board.map(row => [...row]);
        simBoard[m.r][m.c] = simBoard[r][c];
        simBoard[r][c] = null;
        if (m.enPassant) simBoard[r][m.c] = null; 
        const myKing = findKing(state.turn, simBoard);
        return myKing && !isAttacked(myKing, state.turn, simBoard, state.board);
    });
}

function generateMoves(r, c, p, board, checkCastle = true) {
    const moves = [];
    const type = p.toLowerCase();
    const isW = p === p.toUpperCase();
    const opp = (pc) => pc && (isW ? pc === pc.toLowerCase() : pc === pc.toUpperCase());
    const onBoard = (tr, tc) => tr >= 0 && tr < 8 && tc >= 0 && tc < 8;
    const add = (tr, tc, extra = {}) => {
        if (!onBoard(tr, tc)) return;

        const realPiece = board[tr][tc];
        if (realPiece) {
            const targetPieceIsWhite = realPiece === realPiece.toUpperCase();
            if (isW === targetPieceIsWhite) {
                // Allow capturing own assassin (it will be handled in move execution)
                if (realPiece.toLowerCase() !== 'a') {
                    return;
                }
            }
        }
        moves.push({ r: tr, c: tc, ...extra });
    };

    if (type === 'p') {
        const dir = isW ? -1 : 1;
        if (onBoard(r+dir, c) && !getEffectivePiece(r+dir, c, board)) {
            add(r+dir, c);
            if ((isW && r===6) || (!isW && r===1)) {
                if (!getEffectivePiece(r+dir*2, c, board)) add(r+dir*2, c);
            }
        }
        [[1,-1], [1,1]].forEach(([dr, dc]) => {
            const tr = r + (dir*dr), tc = c + dc;
            if (!onBoard(tr, tc)) return;
            const target = getEffectivePiece(tr, tc, board);
            if (target && opp(target)) add(tr, tc);
            if (state.enPassant && state.enPassant.r === tr && state.enPassant.c === tc) {
                add(tr, tc, { enPassant: true });
            }
        });
    } else if (type === 'a') {
        for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
                if (dr===0 && dc===0) continue;
                const tr = r+dr, tc = c+dc;
                if (!onBoard(tr, tc)) continue;
                const dist = Math.max(Math.abs(dr), Math.abs(dc));
                const target = getEffectivePiece(tr, tc, board);
                if (dist === 2 && target === null) add(tr, tc);
                else if (dist === 1 && (target === null || opp(target))) add(tr, tc);
            }
        }
    } else {
        if (type === 'n' || type === 't') {
            VECTORS.knight.forEach(([dr, dc]) => {
                const tr = r + dr, tc = c + dc;
                if (onBoard(tr, tc)) {
                    const target = getEffectivePiece(tr, tc, board);
                    if (!target || opp(target)) add(tr, tc);
                }
            });
        }
        if (type !== 'n') {
            const dirs = (type === 'b') ? VECTORS.diag : (type === 'r') ? VECTORS.orth : [...VECTORS.diag, ...VECTORS.orth]; 
            const slide = ['q','r','b','t'].includes(type);
            dirs.forEach(([dr, dc]) => {
                let tr = r + dr, tc = c + dc;
                while (onBoard(tr, tc)) {
                    const target = getEffectivePiece(tr, tc, board);
                    if (target) { if (opp(target)) add(tr, tc); break; }
                    add(tr, tc);
                    if (!slide) break;
                    tr += dr; tc += dc;
                }
            });
            if (type === 'k' && checkCastle && !isAttacked({r,c}, isW?'white':'black', board)) {
                const rights = isW ? state.castling.w : state.castling.b;
                const row = isW ? 7 : 0;
                const checkEmpty = (cols) => cols.every(col => !getEffectivePiece(row, col, board));
                if (rights.k && checkEmpty([5,6]) && !isAttacked({r:row, c:5}, isW?'white':'black', board)) 
                    add(row, 6, {castle: 'k'});
                if (rights.q && checkEmpty([1,2,3]) && !isAttacked({r:row, c:3}, isW?'white':'black', board)) 
                    add(row, 2, {castle: 'q'});
            }
        }
    }
    return moves;
}


// --- MOVE EXECUTION ---

/**
 * Executes a move on the board and handles special moves (castling, en passant, promotion)
 * @param {{r: number, c: number, castle?: string, enPassant?: boolean}} move - Move destination and flags
 */
export function makeMove(move) {
    const {r, c} = state.selected;
    const p = state.board[r][c];
    const isW = p === p.toUpperCase();

    const captured = state.board[move.r][move.c];
    const capturedEnPassant = move.enPassant ? state.board[r][move.c] : null;

    // Check if trying to capture own assassin
    if (captured && captured.toLowerCase() === 'a' &&
        ((isW && captured === 'A') || (!isW && captured === 'a'))) {
        if (!confirm('Are you sure you want to capture your own assassin?')) {
            return; // Cancel the move
        }
    }

    let notation = p.toUpperCase() === 'P' && captured ? "px" : (p.toUpperCase() !== 'P' ? p.toUpperCase() : "");
    if (captured && p.toUpperCase() !== 'P') notation += "x";
    const files = "abcdefgh";
    notation += files[move.c] + (8-move.r);

    // Track captured pieces (only if visible)
    const actualCaptured = capturedEnPassant || captured;
    if (actualCaptured) {
        const wasVisible = actualCaptured.toLowerCase() !== 'a' ||
                          getEffectivePiece(capturedEnPassant ? r : move.r,
                                           capturedEnPassant ? move.c : move.c,
                                           state.board) !== null;
        if (wasVisible) {
            const capturingSide = isW ? 'white' : 'black';
            state.captured[capturingSide].push(actualCaptured);
        }
    }

    // Track last move for highlighting (hidden if assassin is hidden at destination)
    const isHidden = state.config.assassin && p.toLowerCase() === 'a' &&
        getEffectivePiece(move.r, move.c, state.board) === null;
    state.lastMove = { from: {r, c}, to: {r: move.r, c: move.c}, hidden: isHidden, side: isW ? 'white' : 'black' };

    // Track moves for fifty-move rule
    if (p.toLowerCase() === 'p' || actualCaptured) {
        state.movesSincePawnOrCapture = 0;
    } else {
        state.movesSincePawnOrCapture++;
    }

    state.board[move.r][move.c] = p;
    state.board[r][c] = null;
    if (move.enPassant) state.board[r][move.c] = null;

    if (move.castle) {
        const row = isW ? 7 : 0;
        const rSrc = move.castle === 'k' ? 7 : 0;
        const rDst = move.castle === 'k' ? 5 : 3;
        state.board[row][rDst] = state.board[row][rSrc];
        state.board[row][rSrc] = null;
    }

    if (p.toLowerCase() === 'k') state.castling[isW?'w':'b'] = {k:false, q:false};
    if (p.toLowerCase() === 'r') {
        if (c === 0) state.castling[isW?'w':'b'].q = false;
        if (c === 7) state.castling[isW?'w':'b'].k = false;
    }
    
    state.enPassant = (p.toLowerCase() === 'p' && Math.abs(move.r - r) === 2) 
        ? { r: (r + move.r)/2, c: c } : null;

    if (p.toLowerCase() === 'p' && (move.r === 0 || move.r === 7)) {
        state.promotion = { r: move.r, c: move.c, notationBase: notation };
        return; // Pause turn until promotion is chosen
    }

    if (p.toLowerCase() === 'a' && getEffectivePiece(r, c, state.board) === null && !captured) {
        state.moveList.push("A??");
    } else {
        state.moveList.push(notation);
    }
    endTurn();
}

export function completePromotion(type) {
    const { r, c, notationBase } = state.promotion;
    const isW = state.turn === 'white';
    
    state.board[r][c] = isW ? type.toUpperCase() : type.toLowerCase();
    
    if (type.toLowerCase() === 'a' && getEffectivePiece(r, c, state.board) === null) {
        state.moveList.push("A??=" + type.toUpperCase());
    } else {
        state.moveList.push(notationBase + "=" + type.toUpperCase());
    }
    state.promotion = null;
    endTurn();
}

/**
 * Checks if the current player has any legal moves (for stalemate detection)
 */
function hasLegalMoves(color) {
    const isW = color === 'white';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = state.board[r][c];
            if (p && ((isW && p === p.toUpperCase()) || (!isW && p === p.toLowerCase()))) {
                if (getSafeMoves(r, c, p).length > 0) return true;
            }
        }
    }
    return false;
}

/**
 * Checks if there's insufficient material for checkmate
 */
function hasInsufficientMaterial() {
    const pieces = { white: [], black: [] };

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = state.board[r][c];
            if (!p || p.toLowerCase() === 'k') continue;

            // Skip hidden assassins
            if (state.config.assassin && p.toLowerCase() === 'a' &&
                getEffectivePiece(r, c, state.board) === null) continue;

            const color = p === p.toUpperCase() ? 'white' : 'black';
            pieces[color].push(p.toLowerCase());
        }
    }

    // K vs K
    if (pieces.white.length === 0 && pieces.black.length === 0) return true;

    // K+N vs K or K+B vs K
    if ((pieces.white.length === 0 && pieces.black.length === 1) ||
        (pieces.black.length === 0 && pieces.white.length === 1)) {
        const piece = pieces.white[0] || pieces.black[0];
        if (piece === 'n' || piece === 'b') return true;
    }

    // K+B vs K+B (same color bishops)
    if (pieces.white.length === 1 && pieces.black.length === 1 &&
        pieces.white[0] === 'b' && pieces.black[0] === 'b') {
        // Check if bishops are on same color squares (simplified: assume they are)
        return true;
    }

    return false;
}

/**
 * Generates a position string for repetition detection
 */
function getPositionString() {
    let pos = state.turn + ':';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = state.board[r][c];
            pos += p || '-';
        }
    }
    return pos;
}

/**
 * Checks for threefold repetition
 */
function hasThreefoldRepetition() {
    const current = getPositionString();
    const count = state.positionHistory.filter(pos => pos === current).length;
    return count >= 2; // Current position + 2 previous = 3 total
}

function endTurn() {
    state.selected = null;
    state.moves = [];
    state.showMyHidden = false;

    const wKing = findKing('white');
    const bKing = findKing('black');
    if (!wKing) state.winner = "Black Wins!";
    else if (!bKing) state.winner = "White Wins!";

    if (!state.winner) {
        state.turn = state.turn === 'white' ? 'black' : 'white';

        // Check for draws
        if (!hasLegalMoves(state.turn)) {
            // No legal moves - check if it's checkmate or stalemate
            if (inCheck(state.turn)) {
                const winner = state.turn === 'white' ? 'Black' : 'White';
                state.winner = `${winner} Wins by Checkmate!`;
            } else {
                state.winner = "Draw by Stalemate";
            }
        } else if (hasInsufficientMaterial()) {
            state.winner = "Draw by Insufficient Material";
        } else if (state.movesSincePawnOrCapture >= 100) { // 50 moves per side = 100 half-moves
            state.winner = "Draw by Fifty-Move Rule";
        } else {
            // Track position for threefold repetition
            state.positionHistory.push(getPositionString());
            if (hasThreefoldRepetition()) {
                state.winner = "Draw by Threefold Repetition";
            }
        }

        saveHistorySnapshot();
    }
}

// --- HISTORY ---

export function saveHistorySnapshot() {
    const snapshot = JSON.parse(JSON.stringify({
        board: state.board,
        turn: state.turn,
        castling: state.castling,
        enPassant: state.enPassant,
        config: state.config,
        assassinsPlaced: state.assassinsPlaced,
        moveList: state.moveList,
        timers: state.timers,
        captured: state.captured,
        lastMove: state.lastMove,
        movesSincePawnOrCapture: state.movesSincePawnOrCapture,
        positionHistory: state.positionHistory
    }));
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(snapshot);
    state.historyIndex++;
}

export function restoreSnapshot(snap) {
    const cleanState = {
        ...state,
        board: JSON.parse(JSON.stringify(snap.board)),
        turn: snap.turn,
        castling: JSON.parse(JSON.stringify(snap.castling)),
        enPassant: snap.enPassant,
        assassinsPlaced: JSON.parse(JSON.stringify(snap.assassinsPlaced)),
        moveList: [...snap.moveList],
        timers: {...snap.timers},
        captured: snap.captured ? JSON.parse(JSON.stringify(snap.captured)) : { white: [], black: [] },
        lastMove: snap.lastMove ? JSON.parse(JSON.stringify(snap.lastMove)) : null,
        movesSincePawnOrCapture: snap.movesSincePawnOrCapture || 0,
        positionHistory: snap.positionHistory ? [...snap.positionHistory] : [],
        selected: null,
        moves: [],
        promotion: null,
        winner: null,
    };
    setState(cleanState);
}
