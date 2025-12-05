import { state, netState, setGlobalState, resetState, saveSnapshot, restoreSnapshot, startTimer } from './state.js';
import * as Rules from './rules.js';
import * as Network from './network.js';
import * as UI from './ui.js';

// --- Inputs ---
document.getElementById('btnStart').onclick = () => {
    resetState({
        timer: document.getElementById('optTimer').checked,
        dino: document.getElementById('optDino').checked,
        assassin: document.getElementById('optAssassin').checked
    });
    refresh();
};

document.getElementById('btnUndo').onclick = () => { UI.render(handleBoardClick); restoreSnapshot(-1); refresh(); };
document.getElementById('btnRedo').onclick = () => { UI.render(handleBoardClick); restoreSnapshot(1); refresh(); };
document.getElementById('btnAssassin').onclick = () => { state.showMyHidden = !state.showMyHidden; refresh(); };

// --- Network Setup ---
document.getElementById('btnNet').onclick = () => {
    document.getElementById('networkControls').classList.remove('hidden');
    Network.initNetwork(handleNetData, (msg, id) => {
        document.getElementById('statusText').textContent = msg;
        if(id) document.getElementById('roomCode').textContent = id;
    });
};

document.getElementById('btnJoin').onclick = () => {
    Network.connectToPeer(document.getElementById('roomInput').value, handleNetData, (msg) => {
        document.getElementById('statusText').textContent = msg;
    });
};

// --- Game Loop ---
function refresh() {
    UI.render(handleBoardClick, handlePromotion);
    if (netState.isConnected) Network.sendState(state);
}

function handleNetData(data) {
    if (data.type === 'state') {
        setGlobalState(data.state);
        UI.render(handleBoardClick, handlePromotion);
    } else if (data.type === 'init') {
        Network.sendState(state);
    }
}

function handleBoardClick(r, c) {
    if (state.winner || (netState.isConnected && state.turn !== netState.mySide)) return;

    // 1. Assassin Placement Phase
    if (state.config.assassin && !state.assassinsPlaced[state.turn==='white'?'w':'b']) {
        const isW = state.turn === 'white';
        if (r === (isW?5:2) && !state.board[r][c] && state.board[isW?6:1][c] === (isW?'P':'p')) {
            state.board[r][c] = isW ? 'A' : 'a';
            state.assassinsPlaced[isW?'w':'b'] = true;
            nextTurn();
        }
        return;
    }

    // 2. Movement
    const move = state.moves.find(m => m.r === r && m.c === c);
    if (move) {
        executeMove(move);
    } else {
        // 3. Selection
        const p = state.board[r][c];
        const isW = state.turn === 'white';
        if (p && (p === p.toUpperCase()) === isW) {
            // Net guard: can't select enemy if it's not my turn (redundant check but safe)
            if (netState.isConnected && (isW?'white':'black') !== netState.mySide) return;
            state.selected = {r, c};
            state.moves = Rules.getSafeMoves(r, c, p);
            refresh(); // Local update only
        } else {
            state.selected = null; state.moves = [];
            refresh();
        }
    }
}

function executeMove(move) {
    const {r, c} = state.selected;
    const p = state.board[r][c];
    
    // Move Logic
    state.board[move.r][move.c] = p;
    state.board[r][c] = null;
    if (move.enPassant) state.board[r][move.c] = null;
    
    // Castle
    if (move.castle) {
        const row = r, rSrc = move.castle==='k'?7:0, rDst = move.castle==='k'?5:3;
        state.board[row][rDst] = state.board[row][rSrc];
        state.board[row][rSrc] = null;
    }

    // Rights update
    if (p.toLowerCase()==='k') state.castling[state.turn==='white'?'w':'b'] = {k:false, q:false};
    if (p.toLowerCase()==='r') {
        const side = state.turn==='white'?'w':'b';
        if (c===0) state.castling[side].q = false;
        if (c===7) state.castling[side].k = false;
    }
    
    state.enPassant = (p.toLowerCase()==='p' && Math.abs(move.r-r)===2) ? {r:(r+move.r)/2, c} : null;

    // Promotion?
    if (p.toLowerCase() === 'p' && (move.r === 0 || move.r === 7)) {
        state.promotion = { r: move.r, c: move.c, base: p };
        refresh();
        return;
    }

    state.moveList.push(getNotation(p, r, c, move));
    nextTurn();
}

function handlePromotion(type) {
    const { r, c } = state.promotion;
    state.board[r][c] = state.turn === 'white' ? type.toUpperCase() : type.toLowerCase();
    state.moveList.push(`${state.promotion.base}${8-r}=${type.toUpperCase()}`);
    state.promotion = null;
    nextTurn();
}

function nextTurn() {
    state.selected = null;
    state.moves = [];
    state.showMyHidden = false;
    
    // Win Check
    const result = Rules.checkGameState(state.turn==='white'?'black':'white');
    if (result && result.includes('Wins')) state.winner = result;
    else if (result === 'Stalemate') state.winner = "Draw (Stalemate)";
    else state.turn = state.turn === 'white' ? 'black' : 'white';

    saveSnapshot();
    refresh();
}

function getNotation(p, oldR, oldC, move) {
    const dest = "abcdefgh"[move.c] + (8-move.r);
    return (p.toLowerCase()!=='p'?p.toUpperCase():'') + dest; // Simplified
}

// Initial Start
resetState({ timer: true, dino: false, assassin: false });
refresh();