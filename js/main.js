// js/main.js
import { VECTORS } from './config.js';
import { state, network, setState } from './state.js';
import { 
    render as renderUI, 
    showStatus, 
    toggleGameOptions, 
    toggleAssassinView,
    showJoinDialog,
    closeJoinDialog,
    copyRoomCode
} from './ui.js';
import { 
    createBoard, 
    getEffectivePiece, 
    getSafeMoves, 
    makeMove as executeMove,
    completePromotion as executePromotion,
    restoreSnapshot,
    saveHistorySnapshot
} from './game.js';
import { 
    setCallbacks as setNetworkCallbacks,
    initPeer,
    createRoom,
    joinRoom,
    sendState,
    disconnectNetwork
} from './network.js';

// --- RENDER WRAPPER ---
// This wrapper passes the correct handlers to the UI render function.
function render() {
    renderUI(handleClick, completePromotion);
}

// --- TIMER ---
function startTimer() {
    if(state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
        if (state.winner) return clearInterval(state.timerInterval);
        
        if (state.timers[state.turn] > 0) {
            state.timers[state.turn]--;
            render(); // Re-render to show timer update
        } else {
            state.winner = (state.turn === 'white' ? 'Black' : 'White') + " wins on time!";
            render();
            clearInterval(state.timerInterval);
            if (network.isConnected) sendState();
        }
    }, 1000);
}


// --- MAIN GAME LIFECYCLE ---

function initGame(loadedState = null) {
    if (state.timerInterval) clearInterval(state.timerInterval);

    if (loadedState) {
        setState(loadedState);
        if (state.config.timer && !state.winner) startTimer();
    } else {
        const config = {
            timer: document.getElementById('optTimer').checked,
            dino: document.getElementById('optDino').checked,
            assassin: document.getElementById('optAssassin').checked
        };

        const freshState = {
            ...state,
            board: createBoard(config),
            turn: 'white',
            selected: null,
            moves: [],
            castling: { w: {k:true, q:true}, b: {k:true, q:true} },
            enPassant: null,
            config: config,
            assassinsPlaced: { w: false, b: false },
            showMyHidden: false,
            promotion: null,
            winner: null,
            history: [],
            moveList: [],
            historyIndex: -1,
            timers: { white: 600, black: 600 },
            timerInterval: null
        };
        setState(freshState);
        saveHistorySnapshot(); 
        if (config.timer) startTimer();
    }
    
    if (network.isConnected) {
        document.getElementById('gameOptions').classList.add('hidden');
    } else {
        document.getElementById('gameOptions').classList.remove('hidden');
    }

    render();
}

function handleClick(r, c) {
    if (network.isConnected && (state.turn !== network.mySide || state.winner)) return;
    if (!network.isConnected && (state.winner || state.promotion)) return;

    const isW = state.turn === 'white';
    
    if (state.config.assassin && !state.assassinsPlaced[isW ? 'w' : 'b']) {
        const validRow = isW ? 5 : 2; 
        const pawnRow = isW ? 6 : 1;
        const myPawn = isW ? 'P' : 'p';
        if (r === validRow && !state.board[r][c] && state.board[pawnRow][c] === myPawn) {
            state.board[r][c] = isW ? 'A' : 'a';
            state.assassinsPlaced[isW ? 'w' : 'b'] = true;
            makeMove(); // End turn after placement
        } else {
            showStatus("Must place Assassin in front of a pawn!", true);
        }
        return;
    }

    const move = state.moves.find(m => m.r === r && m.c === c);
    if (move) {
        makeMove(move);
        return;
    }

    const p = state.board[r][c];
    if (p) {
        const pieceIsWhite = p === p.toUpperCase();
        if (pieceIsWhite === isW) {
            state.selected = {r, c};
            state.moves = getSafeMoves(r, c, p);
        } else {
            state.selected = null;
            state.moves = [];
        }
    } else {
        state.selected = null;
        state.moves = [];
    }
    render();
}

function makeMove(move) {
    if (move) executeMove(move);
    
    render();
    if (network.isConnected && network.conn) {
        sendState();
    }
}

function completePromotion(type) {
    if (network.isConnected && network.mySide !== state.turn) return;

    executePromotion(type);
    
    render();
    if (network.isConnected && network.conn) {
        sendState();
    }
}

// --- CONTROLS ---

function undo() {
    if (network.isConnected) return showStatus("Undo disabled in network play", true);
    if (state.historyIndex > 0) {
        state.historyIndex--;
        restoreSnapshot(state.history[state.historyIndex]);
        render();
    }
}

function redo() {
    if (network.isConnected) return showStatus("Redo disabled in network play", true);
    if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        restoreSnapshot(state.history[state.historyIndex]);
        render();
    }
}

function saveGame() {
    const data = JSON.stringify(state);
    const blob = new Blob([data], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'special-chess.json';
    a.click();
    URL.revokeObjectURL(a.href);
}

function loadGame() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = evt => {
            try {
                initGame(JSON.parse(evt.target.result));
                if(network.isConnected) sendState();
            } catch (err) {
                showStatus("Failed to load game file.", true);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function resign() {
    if (state.winner) return;
    const msg = network.isConnected
        ? `Resign as ${network.mySide}?`
        : `${state.turn} resigns?`;
    if (confirm(msg)) {
        const winner = state.turn === 'white' ? 'Black' : 'White';
        state.winner = `${winner} Wins by Resignation!`;
        showStatus(state.winner);
        render();
        if (network.isConnected) sendState();
    }
}

function offerDraw() {
    if (state.winner) return;
    const msg = network.isConnected
        ? "Offer draw to opponent?"
        : "Agree to a draw?";
    if (confirm(msg)) {
        // In local play, immediately accept
        if (!network.isConnected) {
            state.winner = "Draw by Agreement";
            showStatus(state.winner);
            render();
        } else {
            // In network play, send offer (simplified: just accept immediately for now)
            state.winner = "Draw by Agreement";
            showStatus(state.winner);
            render();
            sendState();
        }
    }
}

function toggleNetworkMode() {
    const networkControls = document.getElementById('networkControls');
    networkControls.classList.toggle('hidden');
    
    if (!networkControls.classList.contains('hidden') && !network.peer) {
        initPeer();
    }
}


function setupEventListeners() {
    // Main Controls
    document.getElementById('btnAssassin').onclick = () => {
        toggleAssassinView();
        render();
    };
    document.getElementById('btnUndo').onclick = undo;
    document.getElementById('btnRedo').onclick = redo;
    document.getElementById('btnSave').onclick = saveGame;
    document.getElementById('btnLoad').onclick = loadGame;
    document.getElementById('btnOfferDraw').onclick = offerDraw;
    document.getElementById('btnResign').onclick = resign;
    document.getElementById('networkBtn').onclick = toggleNetworkMode;
    document.getElementById('gameOptionsBtn').onclick = toggleGameOptions;

    // Network Controls
    document.getElementById('btnCreateRoom').onclick = createRoom;
    document.getElementById('btnJoinGame').onclick = showJoinDialog;
    document.getElementById('btnDisconnect').onclick = disconnectNetwork;
    document.getElementById('btnCopyCode').onclick = copyRoomCode;

    // Game Options
    document.getElementById('btnNewGame').onclick = () => initGame();

    // Join Dialog
    document.getElementById('btnJoinRoomDialog').onclick = joinRoom;
    document.getElementById('btnCancelJoin').onclick = closeJoinDialog;
}

// --- INITIALIZATION ---

function main() {
    // Set callbacks for modules that need them
    setNetworkCallbacks(initGame, sendState);

    // Initial setup
    setupEventListeners();
    initGame();
}

document.addEventListener('DOMContentLoaded', main);
