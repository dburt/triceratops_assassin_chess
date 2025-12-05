import { SYMBOLS } from './constants.js';
import { state, netState } from './state.js';
import { getEffectivePiece, findKing, isAttacked } from './rules.js';

const $ = id => document.getElementById(id);

export function render(onSquareClick, onPromo) {
    const isW = state.turn === 'white';
    const mySide = netState.isConnected ? netState.mySide : state.turn;

    // 1. Status & Header
    let status = state.winner || (inCheck(state.turn) ? "Check!" : "");
    if (state.config.assassin && !state.assassinsPlaced[state.turn==='white'?'w':'b']) {
        status = (netState.isConnected && netState.mySide !== state.turn) 
            ? "Opponent placing Assassin..." 
            : "Place Assassin (Rank " + (state.turn==='white'?3:6) + ")";
    }
    
    $('turnDisplay').textContent = `${state.turn.toUpperCase()}'s Turn` + (netState.isConnected ? ` (You: ${netState.mySide})` : '');
    $('status').textContent = status;
    
    // 2. Board
    const boardEl = $('board');
    boardEl.innerHTML = '';
    const rotate = netState.isConnected && netState.mySide === 'black';

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const dr = rotate ? 7-r : r, dc = rotate ? 7-c : c;
            const p = state.board[dr][dc];
            const div = document.createElement('div');
            div.className = `square ${(dr+dc)%2 ? 'dark' : 'light'}`;
            
            if (p) {
                const pCol = p === p.toUpperCase() ? 'white' : 'black';
                const isMine = netState.isConnected ? (pCol === netState.mySide) : (pCol === state.turn);
                let op = 1, txt = SYMBOLS[p];

                // Assassin Visibility UI
                if (state.config.assassin && p.toLowerCase() === 'a') {
                    const hidden = !getEffectivePiece(dr, dc, state.board);
                    if (hidden) {
                        if (isMine && state.showMyHidden) op = 0.5;
                        else txt = ''; // Invisible
                    } else div.classList.add('revealed');
                }
                
                div.textContent = txt;
                div.style.opacity = op;
                if (p.toLowerCase()==='k' && inCheck(pCol)) div.classList.add('check');
            }

            // Highlights
            if (state.selected?.r === dr && state.selected?.c === dc) div.classList.add('selected');
            const move = state.moves.find(m => m.r === dr && m.c === dc);
            if (move) div.classList.add((getEffectivePiece(dr, dc, state.board) || move.enPassant) ? 'capture' : 'hint');
            
            div.onclick = () => onSquareClick(dr, dc);
            boardEl.appendChild(div);
        }
    }

    // 3. Controls visibility
    $('timerContainer').classList.toggle('hidden', !state.config.timer);
    $('assassinControls').classList.toggle('hidden', !state.config.assassin);
    $('promotionModal').classList.toggle('hidden', !state.promotion);
    $('btnAssassin').textContent = state.showMyHidden ? "👁️ Hide" : "👁️ Show";
    
    renderHistory();
    renderTimer(); // Initial render
    if (state.promotion) renderPromo(onPromo);
}

function renderHistory() {
    const h = $('moveHistory');
    h.innerHTML = state.moveList.map((m,i) => `<div>${Math.floor(i/2)+1}.${i%2?'..':''} ${m}</div>`).join('');
    h.scrollTop = h.scrollHeight;
}

function renderPromo(cb) {
    const d = $('promoOptions'); d.innerHTML = '';
    ['q','r','b','n', state.config.dino?'t':null, state.config.assassin?'a':null].filter(x=>x).forEach(t => {
        const b = document.createElement('button');
        b.textContent = SYMBOLS[state.turn==='white'?t.toUpperCase():t];
        b.onclick = () => cb(t);
        d.appendChild(b);
    });
}

export function renderTimer() {
    const fmt = t => `${Math.floor(t/60)}:${(t%60).toString().padStart(2,'0')}`;
    $('whiteTimer').querySelector('.time').textContent = fmt(state.timers.white);
    $('blackTimer').querySelector('.time').textContent = fmt(state.timers.black);
}

function inCheck(col) {
    const k = findKing(col, state.board);
    return k && isAttacked(k, col, state.board);
}