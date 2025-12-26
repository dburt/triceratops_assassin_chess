// js/ui.js
import { state, network } from './state.js';
import { SYMBOLS } from './config.js';
import { getEffectivePiece, inCheck, findKing, getSafeMoves } from './game.js';

// The render function now accepts handlers from the main script to avoid circular dependencies
export function render(handleClick, completePromotion) {
    const isW = state.turn === 'white';
    const turnText = state.winner || `${state.turn.toUpperCase()}'s Turn`;
    
    let headerText = turnText;
    if (network.isConnected) {
        headerText += network.mySide ? ` (You are ${network.mySide})` : '';
    }
    document.getElementById('turnDisplay').textContent = headerText;

    updateMaterialCount();
    showStatus('');
    
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
        if (myKing && inCheck(state.turn)) {
            let hasMove = false;
            for(let r=0; r<8; r++) for(let c=0; c<8; c++) {
                const p = state.board[r][c];
                if(p && ((isW && p===p.toUpperCase()) || (!isW && p===p.toLowerCase()))) {
                    if(getSafeMoves(r,c,p).length > 0) { hasMove=true; break; }
                }
            }
            if (!hasMove) {
                state.winner = (isW ? "Black" : "White") + " Wins!";
                showStatus("Checkmate!", true);
            } else {
                showStatus("Check!");
            }
        }
    }

    const el = document.getElementById('board'); 
    el.innerHTML = '';
    
    const rotate = network.isConnected && network.mySide === 'black';

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const drawR = rotate ? 7 - r : r;
            const drawC = rotate ? 7 - c : c;
            
            const p = state.board[drawR][drawC];
            const div = document.createElement('div');
            div.className = `square ${(drawR+drawC)%2 ? 'dark' : 'light'}`;
            
            if (p) {
                const pColor = p === p.toUpperCase() ? 'white' : 'black';
                let show = true;
                let opacity = 1;

                if (state.config.assassin && p.toLowerCase() === 'a') {
                    const hidden = getEffectivePiece(drawR, drawC, state.board) === null;
                    if (hidden) {
                        const amIOwner = network.isConnected ? (pColor === network.mySide) : isW ? pColor === 'white' : pColor === 'black';
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
            
            if (state.selected && state.selected.r === drawR && state.selected.c === drawC) div.classList.add('selected');

            // Highlight last move
            if (state.lastMove &&
                ((state.lastMove.from.r === drawR && state.lastMove.from.c === drawC) ||
                 (state.lastMove.to.r === drawR && state.lastMove.to.c === drawC))) {
                div.classList.add('last-move');
            }

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
    
    if (state.promotion) {
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

export function renderTimer() {
    const format = t => `${Math.floor(t/60)}:${(t%60).toString().padStart(2,'0')}`;
    document.querySelector('#whiteTimer .timer-time').textContent = format(state.timers.white);
    document.querySelector('#blackTimer .timer-time').textContent = format(state.timers.black);
    document.getElementById('whiteTimer').className = `timer ${state.turn==='white'?'active':''}`;
    document.getElementById('blackTimer').className = `timer ${state.turn==='black'?'active':''}`;
}

export function showStatus(msg, isError = false) {
    const el = document.getElementById('status');
    el.textContent = msg;
    el.style.color = isError ? '#ff5252' : '#ffeb3b';
}

export function toggleAssassinView() {
    state.showMyHidden = !state.showMyHidden;
    render(); // This direct call is problematic, will fix in main by re-assigning the handler
}

export function toggleGameOptions() {
    const gameOptions = document.getElementById('gameOptions');
    gameOptions.classList.toggle('hidden');
}

export function showJoinDialog() {
    document.getElementById('joinDialog').classList.remove('hidden');
}

export function closeJoinDialog() {
    document.getElementById('joinDialog').classList.add('hidden');
}

export function updateConnectionStatus(status, roomCode = null) {
    const statusEl = document.getElementById('statusText');
    const roomEl = document.getElementById('roomCodeContainer');
    
    statusEl.textContent = status;
    statusEl.className = status.toLowerCase().includes('connected') ? 'connected' : 
                         status.toLowerCase().includes('connecting') ? 'connecting' : 'disconnected';
    
    if (roomCode) {
        document.getElementById('roomCode').textContent = roomCode;
        roomEl.classList.remove('hidden');
    } else if (status === 'Disconnected') {
        roomEl.classList.add('hidden');
    }
}

export function copyRoomCode() {
    const code = document.getElementById('roomCode').textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(() => {
            showStatus("Room ID copied to clipboard!");
        }).catch(() => {
            fallbackCopyTextToClipboard(code);
        });
    } else {
        fallbackCopyTextToClipboard(code);
    }
}

function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        const successful = document.execCommand('copy');
        showStatus(successful ? "Room ID copied to clipboard!" : "Failed to copy room ID", !successful);
    } catch (err) {
        showStatus("Failed to copy room ID", true);
    }
    document.body.removeChild(textArea);
}

/**
 * Calculates and displays material count and captured pieces
 */
export function updateMaterialCount() {
    const materialValues = {
        'p': 1, 'P': 1,
        'n': 3, 'N': 3,
        'b': 3, 'B': 3,
        'r': 5, 'R': 5,
        'q': 9, 'Q': 9,
        't': 12, 'T': 12, // Triceratops (queen + knight)
        'a': 3, 'A': 3    // Assassin (similar to knight)
    };

    let whiteMaterial = 0;
    let blackMaterial = 0;

    // Count material on board (only visible pieces)
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = state.board[r][c];
            if (!piece) continue;

            // Skip hidden assassins
            if (state.config.assassin && piece.toLowerCase() === 'a' &&
                getEffectivePiece(r, c, state.board) === null) {
                continue;
            }

            if (piece !== piece.toUpperCase()) {
                blackMaterial += materialValues[piece] || 0;
            } else {
                whiteMaterial += materialValues[piece] || 0;
            }
        }
    }

    const diff = whiteMaterial - blackMaterial;
    const materialEl = document.getElementById('materialCount');

    // Build captured pieces display
    const whiteCaptured = state.captured.white.map(p => SYMBOLS[p]).join(' ');
    const blackCaptured = state.captured.black.map(p => SYMBOLS[p]).join(' ');

    let html = '<div class="material-info">';

    // Show captured by white (black pieces)
    if (whiteCaptured) {
        html += `<div class="captured-pieces">White captured: ${whiteCaptured}</div>`;
    }

    // Show material advantage
    if (diff === 0) {
        html += '<div>Material: Equal</div>';
    } else if (diff > 0) {
        html += `<div>Material: <span class="material-advantage white">White +${diff}</span></div>`;
    } else {
        html += `<div>Material: <span class="material-advantage black">Black +${Math.abs(diff)}</span></div>`;
    }

    // Show captured by black (white pieces)
    if (blackCaptured) {
        html += `<div class="captured-pieces">Black captured: ${blackCaptured}</div>`;
    }

    html += '</div>';
    materialEl.innerHTML = html;
}
