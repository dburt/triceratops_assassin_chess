export const netState = { peer: null, conn: null, mySide: null, isConnected: false };

export let state = {
    board: [], turn: 'white', selected: null, moves: [],
    castling: { w: {k:true, q:true}, b: {k:true, q:true} },
    enPassant: null, config: {}, assassinsPlaced: { w: false, b: false },
    showMyHidden: false, promotion: null, winner: null,
    moveList: [], timers: { white: 600, black: 600 }
};

let history = [];
let historyIndex = -1;
let timerInterval = null;

export const setGlobalState = (newState) => { 
    state = newState; 
    // Fix timer serialization loss
    if (state.config.timer && !state.winner && !timerInterval) startTimer();
};

export const resetState = (config, isNetwork = false) => {
    stopTimer();
    state = {
        board: createBoard(config),
        turn: 'white', selected: null, moves: [],
        castling: { w: {k:true, q:true}, b: {k:true, q:true} },
        enPassant: null, config, assassinsPlaced: { w: false, b: false },
        showMyHidden: false, promotion: null, winner: null,
        moveList: [], timers: { white: 600, black: 600 } // 10 mins
    };
    history = []; historyIndex = -1;
    saveSnapshot();
    if (config.timer && !state.winner) startTimer();
};

function createBoard(cfg) {
    const b = Array(8).fill(null).map(() => Array(8).fill(null));
    const set = (r, p) => p.forEach((t, c) => b[r][c] = t);
    set(0, ['r','n','b','q','k','b','n','r']);
    set(1, Array(8).fill('p'));
    set(6, Array(8).fill('P'));
    set(7, ['R','N','B','Q','K','B','N','R']);
    if (cfg.dino) { b[5][4] = 'T'; b[2][4] = 't'; }
    return b;
}

// --- History & Timer ---
export const saveSnapshot = () => {
    const snap = JSON.parse(JSON.stringify(state));
    history = history.slice(0, historyIndex + 1);
    history.push(snap);
    historyIndex++;
};

export const restoreSnapshot = (offset) => {
    if (netState.isConnected) return;
    const newIdx = historyIndex + offset;
    if (newIdx >= 0 && newIdx < history.length) {
        historyIndex = newIdx;
        state = JSON.parse(JSON.stringify(history[newIdx]));
    }
};

export const startTimer = (onTick) => {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (state.winner) return stopTimer();
        if (state.timers[state.turn] > 0) {
            state.timers[state.turn]--;
            if (onTick) onTick();
        } else {
            state.winner = (state.turn === 'white' ? 'Black' : 'White') + " wins on time!";
            stopTimer();
            if (onTick) onTick(true); // true = game over
        }
    }, 1000);
};

export const stopTimer = () => { if (timerInterval) clearInterval(timerInterval); timerInterval = null; };