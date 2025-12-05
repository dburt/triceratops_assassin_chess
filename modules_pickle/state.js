import { DEFAULT_CONFIG, DEFAULT_TIMERS } from './config.js';

// --- GLOBAL STATE ---
export let network = {
    peer: null,
    conn: null,
    mySide: null, // 'white' or 'black' (Host is always White)
    isConnected: false
};

export let state = {
    board: [],
    turn: 'white',
    selected: null,
    moves: [],
    castling: { w: {k:true, q:true}, b: {k:true, q:true} },
    enPassant: null,
    config: { ...DEFAULT_CONFIG },
    assassinsPlaced: { w: false, b: false },
    showMyHidden: false,
    promotion: null,
    winner: null,
    history: [],    
    moveList: [],   
    historyIndex: -1,
    timers: { ...DEFAULT_TIMERS },
    timerInterval: null
};

// --- STATE MANAGEMENT FUNCTIONS ---
export function resetState(config = null) {
    const newConfig = config || { ...DEFAULT_CONFIG };
    
    state = {
        board: [],
        turn: 'white',
        selected: null,
        moves: [],
        castling: { w: {k:true, q:true}, b: {k:true, q:true} },
        enPassant: null,
        config: newConfig,
        assassinsPlaced: { w: false, b: false },
        showMyHidden: false,
        promotion: null,
        winner: null,
        history: [],
        moveList: [],
        historyIndex: -1,
        timers: { ...DEFAULT_TIMERS },
        timerInterval: null
    };
}

export function saveHistorySnapshot() {
    const snapshot = JSON.parse(JSON.stringify({
        board: state.board,
        turn: state.turn,
        castling: state.castling,
        enPassant: state.enPassant,
        config: state.config,
        assassinsPlaced: state.assassinsPlaced,
        moveList: state.moveList,
        timers: state.timers
    }));
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(snapshot);
    state.historyIndex++;
}

export function restoreSnapshot(snap) {
    state.board = JSON.parse(JSON.stringify(snap.board)); 
    state.turn = snap.turn;
    state.castling = JSON.parse(JSON.stringify(snap.castling));
    state.enPassant = snap.enPassant;
    state.assassinsPlaced = JSON.parse(JSON.stringify(snap.assassinsPlaced));
    state.moveList = [...snap.moveList];
    state.timers = {...snap.timers};
    state.selected = null;
    state.moves = [];
    state.promotion = null;
    state.winner = null;
}