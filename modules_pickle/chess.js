import { VECTORS } from './config.js';
import { state } from './state.js';

// --- BOARD CREATION ---
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

// --- PIECE VISIBILITY ---
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

// --- MOVEMENT GENERATION ---
export function generateMoves(r, c, p, board, checkCastle = true) {
    const moves = [];
    const type = p.toLowerCase();
    const isW = p === p.toUpperCase();
    const opp = (pc) => pc && (isW ? pc === pc.toLowerCase() : pc === pc.toUpperCase());
    const onBoard = (tr, tc) => tr >= 0 && tr < 8 && tc >= 0 && tc < 8;
    const add = (tr, tc, extra={}) => { if (onBoard(tr,tc)) moves.push({r:tr, c:tc, ...extra}); };

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

// --- ATTACK DETECTION ---
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

export function findKing(color, board = state.board) {
    const k = color === 'white' ? 'K' : 'k';
    for(let r=0; r<8; r++) for(let c=0; c<8; c++) if(board[r][c] === k) return {r, c};
    return null;
}

export function inCheck(color) {
    const k = findKing(color);
    return k && isAttacked(k, color, state.board);
}