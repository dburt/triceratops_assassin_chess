import { VECTORS } from './constants.js';
import { state } from './state.js';

const isW = (p) => p === p.toUpperCase();
const isOpp = (p1, p2) => p1 && p2 && isW(p1) !== isW(p2);
const onBoard = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

export function getEffectivePiece(r, c, board) {
    const p = board[r][c];
    if (!p || !state.config.assassin || p.toLowerCase() !== 'a') return p;
    
    // Assassin Visibility Logic
    const whiteAss = p === 'A';
    const enemyPawn = whiteAss ? 'p' : 'P';
    const attackRow = r + (whiteAss ? -1 : 1); // Row assassin is attacking from
    
    // Check adjacent columns in the row IN FRONT of the assassin for enemy pawns
    for (let pc = c - 1; pc <= c + 1; pc += 2) {
        if (onBoard(attackRow, pc) && board[attackRow][pc] === enemyPawn) return p;
    }
    // Check if enemy passed the assassin
    for (let pr = 0; pr < 8; pr++) {
        if (whiteAss && pr > r) return p; // Enemy behind white
        if (!whiteAss && pr < r) return p; // Enemy behind black
    }
    return null; // Hidden
}

export function getSafeMoves(r, c, p, board = state.board) {
    return generateMoves(r, c, p, board).filter(m => {
        const sim = board.map(row => [...row]);
        sim[m.r][m.c] = sim[r][c];
        sim[r][c] = null;
        if (m.enPassant) sim[r][m.c] = null;
        const myKing = findKing(isW(p) ? 'white' : 'black', sim);
        return myKing && !isAttacked(myKing, isW(p) ? 'white' : 'black', sim);
    });
}

function generateMoves(r, c, p, board, checkCastle = true) {
    const moves = [];
    const type = p.toLowerCase();
    const myCol = isW(p) ? 'white' : 'black';
    const add = (tr, tc, ext={}) => { if (onBoard(tr,tc)) moves.push({r:tr, c:tc, ...ext}); };

    if (type === 'p') {
        const dir = isW(p) ? -1 : 1;
        if (onBoard(r+dir, c) && !getEffectivePiece(r+dir, c, board)) {
            add(r+dir, c);
            if ((isW(p) && r===6) || (!isW(p) && r===1)) 
                if (!getEffectivePiece(r+dir*2, c, board)) add(r+dir*2, c);
        }
        [[1,-1],[1,1]].forEach(([dr, dc]) => {
            const tr = r + (dir*dr), tc = c + dc;
            const target = onBoard(tr,tc) ? getEffectivePiece(tr, tc, board) : null;
            if (target && isOpp(p, target)) add(tr, tc);
            if (state.enPassant?.r === tr && state.enPassant?.c === tc) add(tr, tc, {enPassant:true});
        });
    } else {
        const dirs = type==='n' || type==='t' ? VECTORS.knight : 
                     type==='b' ? VECTORS.diag : 
                     type==='r' ? VECTORS.orth : 
                     type==='q' || type==='k' || type==='t' ? [...VECTORS.diag, ...VECTORS.orth] : [];
        
        // Assassin specific
        if (type === 'a') {
             for (let dr=-2; dr<=2; dr++) for (let dc=-2; dc<=2; dc++) {
                if (dr===0 && dc===0) continue;
                const tr=r+dr, tc=c+dc, dist = Math.max(Math.abs(dr), Math.abs(dc));
                const target = onBoard(tr, tc) ? getEffectivePiece(tr,tc, board) : null;
                if ((dist===2 && !target) || (dist===1 && (!target || isOpp(p, target)))) add(tr,tc);
             }
        } else {
            // Standard sliding/step logic
            const slide = ['q','r','b','t'].includes(type);
            dirs.forEach(([dr, dc]) => {
                let tr = r+dr, tc = c+dc;
                while (onBoard(tr, tc)) {
                    const t = getEffectivePiece(tr, tc, board);
                    if (t) { if (isOpp(p, t)) add(tr, tc); break; }
                    add(tr, tc);
                    if (!slide || type==='k' || type==='n') break;
                    tr+=dr; tc+=dc;
                }
            });
        }
        // Castling
        if (type === 'k' && checkCastle && !isAttacked({r,c}, myCol, board)) {
            const rights = isW(p) ? state.castling.w : state.castling.b;
            const row = r; 
            if (rights.k && !board[row][5] && !board[row][6] && !isAttacked({r:row, c:5}, myCol, board)) add(row, 6, {castle:'k'});
            if (rights.q && !board[row][1] && !board[row][2] && !board[row][3] && !isAttacked({r:row, c:3}, myCol, board)) add(row, 2, {castle:'q'});
        }
    }
    return moves;
}

export function isAttacked(pos, myColor, board) {
    for (let r=0; r<8; r++) for (let c=0; c<8; c++) {
        const p = board[r][c];
        if (p && ((myColor==='white' && !isW(p)) || (myColor==='black' && isW(p)))) {
            // Optimization: Skip assassin check if hidden
            if (p.toLowerCase() === 'a' && !getEffectivePiece(r, c, board)) continue;
            if (generateMoves(r, c, p, board, false).some(m => m.r === pos.r && m.c === pos.c)) return true;
        }
    }
    return false;
}

export function findKing(color, board) {
    const k = color === 'white' ? 'K' : 'k';
    for(let r=0; r<8; r++) for(let c=0; c<8; c++) if (board[r][c] === k) return {r, c};
    return null;
}

export function checkGameState(currentColor) {
    const k = findKing(currentColor, state.board);
    const inCheck = k && isAttacked(k, currentColor, state.board);
    
    // Check for valid moves
    let hasMove = false;
    for(let r=0; r<8; r++) for(let c=0; c<8; c++) {
        const p = state.board[r][c];
        if (p && ((currentColor==='white') === isW(p))) {
            if (getSafeMoves(r, c, p).length) { hasMove = true; break; }
        }
        if (hasMove) break;
    }

    if (!k) return "King captured! " + (currentColor==='white'?'Black':'White') + " Wins";
    if (!hasMove) return inCheck ? "Checkmate!" : "Stalemate";
    return null;
}