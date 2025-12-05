// --- MAIN APPLICATION ---
import { DEFAULT_CONFIG } from './config.js';
import { state, network, resetState, saveHistorySnapshot, restoreSnapshot } from './state.js';
import { createBoard, getEffectivePiece, getSafeMoves, findKing, isAttacked } from './chess.js';
import { showStatus, render, toggleAssassinView, startTimer } from './ui.js';
import { sendStateToPeer } from './network.js';

// --- INITIALIZATION ---
export function initGame(loadedState = null, isNetworkStart = false) {
    if (state.timerInterval) clearInterval(state.timerInterval);

    // If starting a network game as Host, we use current UI config. 
    // If joining, we wait for config sync.
    if (loadedState) {
        state = loadedState;
        // In network play, resume timer if game not over
        if (state.config.timer && !state.winner) startTimer();
    } else {
        const config = {
            timer: document.getElementById('optTimer').checked,
            dino: document.getElementById('optDino').checked,
            assassin: document.getElementById('optAssassin').checked
        };

        resetState(config);
        state.board = createBoard(config);
        saveHistorySnapshot(); 
        if (config.timer) startTimer();
    }
    
    // In network mode, disable options if we are not the host setting it up initially
    if (network.isConnected) {
        document.getElementById('gameOptions').classList.add('hidden');
    } else {
        document.getElementById('gameOptions').classList.remove('hidden');
    }

    render();
}

// --- CORE GAME LOGIC ---
export function handleClick(r, c) {
    // Network Guard: Prevent moving if not connected OR if it's not my turn
    if (network.isConnected) {
        if (state.turn !== network.mySide) return; // Not my turn
        if (state.winner) return;
    } else {
        // Local play: allow both sides
        if (state.winner || state.promotion) return;
    }

    const isW = state.turn === 'white';
    
    // Assassin Setup
    if (state.config.assassin && !state.assassinsPlaced[isW ? 'w' : 'b']) {
        const validRow = isW ? 5 : 2; 
        const pawnRow = isW ? 6 : 1;
        const myPawn = isW ? 'P' : 'p';
        if (r === validRow && !state.board[r][c] && state.board[pawnRow][c] === myPawn) {
            // Apply Setup
            state.board[r][c] = isW ? 'A' : 'a';
            state.assassinsPlaced[isW ? 'w' : 'b'] = true;
            endTurn(); // This will trigger network sync
        } else {
            showStatus("Must place Assassin in front of a pawn!", true);
        }
        return;
    }

    // Move or Select
    const move = state.moves.find(m => m.r === r && m.c === c);
    if (move) {
        makeMove(move);
        return;
    }

    const p = state.board[r][c];
    if (p && (p === p.toUpperCase()) === isW) {
        // Only select own pieces
        if (network.isConnected && (isW ? 'white' : 'black') !== network.mySide) return;

        state.selected = {r, c};
        state.moves = getSafeMoves(r, c, p);
    } else {
        state.selected = null;
        state.moves = [];
    }
    render();
}

export function makeMove(move) {
    const {r, c} = state.selected;
    const p = state.board[r][c];
    const isW = p === p.toUpperCase();
    
    // Notation Logic
    const captured = state.board[move.r][move.c];
    let notation = p.toUpperCase() === 'P' && captured ? "px" : (p.toUpperCase() !== 'P' ? p.toUpperCase() : "");
    if (captured && p.toUpperCase() !== 'P') notation += "x";
    const files = "abcdefgh";
    notation += files[move.c] + (8-move.r);

    // Execute Move
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

    // Rights
    if (p.toLowerCase() === 'k') state.castling[isW?'w':'b'] = {k:false, q:false};
    if (p.toLowerCase() === 'r') {
        if (c === 0) state.castling[isW?'w':'b'].q = false;
        if (c === 7) state.castling[isW?'w':'b'].k = false;
    }
    
    state.enPassant = (p.toLowerCase() === 'p' && Math.abs(move.r - r) === 2) 
        ? { r: (r + move.r)/2, c: c } : null;

    if (p.toLowerCase() === 'p' && (move.r === 0 || move.r === 7)) {
        state.promotion = { r: move.r, c: move.c, notationBase: notation };
        render(); 
        return;
    }

    // History
    if (p.toLowerCase() === 'a' && getEffectivePiece(r, c, state.board) === null) {
        state.moveList.push("A??");
    } else {
        state.moveList.push(notation);
    }
    endTurn();
}

export function completePromotion(type) {
    const { r, c, notationBase } = state.promotion;
    const isW = state.turn === 'white';
    
    // In network game, only current player can select promotion
    if (network.isConnected && network.mySide !== state.turn) return;

    state.board[r][c] = isW ? type.toUpperCase() : type.toLowerCase();
    
    if (type.toLowerCase() === 'a' && getEffectivePiece(r, c, state.board) === null) {
        state.moveList.push("A??=" + type.toUpperCase());
    } else {
        state.moveList.push(notationBase + "=" + type.toUpperCase());
    }
    state.promotion = null;
    endTurn();
}

export function endTurn() {
    state.selected = null;
    state.moves = [];
    state.showMyHidden = false; 

    const wKing = findKing('white');
    const bKing = findKing('black');
    if (!wKing) state.winner = "Black Wins!";
    else if (!bKing) state.winner = "White Wins!";
    
    if (!state.winner) {
        state.turn = state.turn === 'white' ? 'black' : 'white';
        saveHistorySnapshot();
    }
    
    render();

    // If Networked, send the new state to the peer
    if (network.isConnected && network.conn) {
        sendStateToPeer();
    }
}

// Make functions globally available for HTML onclick handlers
window.initGame = initGame;
window.handleClick = handleClick;
window.completePromotion = completePromotion;
window.toggleAssassinView = toggleAssassinView;

// Import and expose network functions
import { 
    toggleNetworkMode, 
    createRoom, 
    showJoinDialog, 
    closeJoinDialog, 
    joinRoom, 
    disconnectNetwork, 
    copyRoomCode 
} from './network.js';

window.toggleNetworkMode = toggleNetworkMode;
window.createRoom = createRoom;
window.showJoinDialog = showJoinDialog;
window.closeJoinDialog = closeJoinDialog;
window.joinRoom = joinRoom;
window.disconnectNetwork = disconnectNetwork;
window.copyRoomCode = copyRoomCode;

// Import and expose UI functions
import { undo, redo, saveGame, loadGame } from './ui.js';

window.undo = undo;
window.redo = redo;
window.saveGame = saveGame;
window.loadGame = loadGame;

// Start local game initially
initGame();