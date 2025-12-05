import { SYMBOLS } from './config.js';
import { state, network, restoreSnapshot } from './state.js';
import { getEffectivePiece, inCheck, findKing, isAttacked, getSafeMoves } from './chess.js';

// --- STATUS & NOTIFICATIONS ---
export function showStatus(msg, isError = false) {
    const el = document.getElementById('status');
    el.textContent = msg;
    el.style.color = isError ? '#ff5252' : '#ffeb3b';
}

// --- TIMER FUNCTIONS ---
export function startTimer() {
    if(state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
        if (state.winner) return clearInterval(state.timerInterval);
        
        if (state.timers[state.turn] > 0) {
            state.timers[state.turn]--;
            renderTimer();
        } else {
            state.winner = (state.turn === 'white' ? 'Black' : 'White') + " wins on time!";
            render();
            clearInterval(state.timerInterval);
        }
    }, 1000);
}

export function renderTimer() {
    const format = t => `${Math.floor(t/60)}:${(t%60).toString().padStart(2,'0')}`;
    document.querySelector('#whiteTimer .timer-time').textContent = format(state.timers.white);
    document.querySelector('#blackTimer .timer-time').textContent = format(state.timers.black);
    document.getElementById('whiteTimer').className = `timer ${state.turn==='white'?'active':''}`;
    document.getElementById('blackTimer').className = `timer ${state.turn==='black'?'active':''}`;
}

// --- GAME CONTROLS ---
export function undo() {
    if (network.isConnected) return showStatus("Undo disabled in network play", true);
    if (state.historyIndex > 0) {
        state.historyIndex--;
        restoreSnapshot(state.history[state.historyIndex]);
        render();
    }
}

export function redo() {
    if (network.isConnected) return showStatus("Redo disabled in network play", true);
    if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        restoreSnapshot(state.history[state.historyIndex]);
        render();
    }
}

export function saveGame() {
    const data = JSON.stringify(state);
    const blob = new Blob([data], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'special-chess.json';
    a.click();
}

export function loadGame() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = evt => {
            initGame(JSON.parse(evt.target.result));
        };
        reader.readAsText(file);
    };
    input.click();
}

export function toggleAssassinView() {
    state.showMyHidden = !state.showMyHidden;
    render();
}

// --- MAIN RENDER FUNCTION ---
export function render() {
    const isW = state.turn === 'white';
    const turnText = state.winner || `${state.turn.toUpperCase()}'s Turn`;
    
    // Update Turn Display with Network Info
    let headerText = turnText;
    if (network.isConnected) {
        headerText += network.mySide ? ` (You are ${network.mySide})` : '';
    }
    document.getElementById('turnDisplay').textContent = headerText;
    
    showStatus('');
    
    // Status Logic
    if (state.winner) {
        showStatus(state.winner);
    } else if (state.config.assassin && !state.assassinsPlaced[state.turn === 'white'?'w':'b']) {
        if (!network.isConnected || network.mySide === state.turn) {
            showStatus(`Place your Assassin on Rank ${state.turn==='white'?3:6} (Front of Pawn)`);
        } else {
            showStatus("Opponent placing Assassin...");
        }
    } else {
        const myKing = findKing(state.turn);
        if (myKing && isAttacked(myKing, state.turn, state.board)) {
            let hasMove = false;
            // Heavy check for mate
            for(let r=0; r<8; r++) for(let c=0; c<8; c++) {
                const p = state.board[r][c];
                if(p && ((isW && p===p.toUpperCase()) || (!isW && p===p.toLowerCase()))) {
                    if(getSafeMoves(r,c,p).length > 0) { hasMove=true; break; }
                }
            }
            showStatus(hasMove ? "Check!" : "Checkmate!", !hasMove);
            if (!hasMove) state.winner = (isW ? "Black" : "White") + " Wins!";
        }
    }

    const el = document.getElementById('board'); 
    el.innerHTML = '';
    
    // Optional: Rotate board for Black player
    const rotate = network.isConnected && network.mySide === 'black';

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            // Apply rotation if needed
            const drawR = rotate ? 7 - r : r;
            const drawC = rotate ? 7 - c : c;
            
            const p = state.board[drawR][drawC];
            const div = document.createElement('div');
            div.className = `square ${(drawR+drawC)%2 ? 'dark' : 'light'}`;
            
            if (p) {
                const pColor = p === p.toUpperCase() ? 'white' : 'black';
                const isMine = network.isConnected ? (pColor === network.mySide) : (pColor === state.turn);
                
                let show = true;
                let opacity = 1;

                if (state.config.assassin && p.toLowerCase() === 'a') {
                    const hidden = getEffectivePiece(drawR, drawC, state.board) === null;
                    if (hidden) {
                        // If I am the owner of this hidden piece
                        const amIOwner = network.isConnected ? (pColor === network.mySide) : (pColor === state.turn);
                        
                        if (amIOwner && state.showMyHidden) { opacity = 0.5; }
                        else { show = false; }
                    } else if (!hidden) {
                        div.classList.add('revealed');
                    }
                }

                if (show) {
                    div.textContent = SYMBOLS[p];
                    div.style.opacity = opacity;
                    if (p.toLowerCase() === 'k' && inCheck(pColor)) div.classList.add('check');
                }
            }
            
            if (state.selected?.r === drawR && state.selected?.c === drawC) div.classList.add('selected');
            
            const move = state.moves.find(m => m.r === drawR && m.c === drawC);
            if (move) {
                const target = getEffectivePiece(drawR, drawC, state.board);
                div.classList.add((target || move.enPassant) ? 'capture' : 'hint');
            }

            div.onclick = () => handleClick(drawR, drawC);
            el.appendChild(div);
        }
    }

    const toggle = (id, cond) => document.getElementById(id).classList.toggle('hidden', !cond);
    toggle('timerContainer', state.config.timer);
    toggle('assassinControls', state.config.assassin);
    toggle('moveHistory', state.moveList.length > 0);
    toggle('promotionModal', !!state.promotion);

    document.getElementById('btnAssassin').textContent = state.showMyHidden ? "👁️ Hide Assassin" : "👁️ Show Assassin";

    const histEl = document.getElementById('moveHistory');
    histEl.innerHTML = state.moveList.map((m, i) => `<div>${Math.floor(i/2)+1}.${i%2?'..':''} ${m}</div>`).join('');
    histEl.scrollTop = histEl.scrollHeight;
    
    // Render Promo Options
    if (state.promotion) {
        // Only show promo options if it's my turn/piece
        const canPromote = !network.isConnected || network.mySide === state.turn;
        if (canPromote) {
            const opts = document.getElementById('promoOptions');
            opts.innerHTML = '';
            ['q','r','b','n', (state.config.dino?'t':null), (state.config.assassin?'a':null)]
                .filter(x=>x).forEach(t => {
                    const b = document.createElement('button');
                    b.textContent = SYMBOLS[isW ? t.toUpperCase() : t];
                    b.onclick = () => completePromotion(t);
                    opts.appendChild(b);
                });
        }
    }

    if (state.config.timer) renderTimer();
}