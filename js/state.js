// js/state.js

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
    config: { timer: true, dino: false, assassin: false },
    assassinsPlaced: { w: false, b: false },
    showMyHidden: false,
    promotion: null,
    winner: null,
    history: [],
    moveList: [],
    historyIndex: -1,
    timers: { white: 600, black: 600 },
    timerInterval: null,
    captured: { white: [], black: [] }, // Pieces captured by each side (only revealed pieces)
    lastMove: null, // {from: {r, c}, to: {r, c}} for highlighting
    movesSincePawnOrCapture: 0, // For fifty-move rule
    positionHistory: [] // For threefold repetition (FEN-like strings)
};

/**
 * A function to completely overwrite the state.
 * Used for loading a game or receiving a new state from the network.
 * @param {object} newState 
 */
export function setState(newState) {
    // Clear existing timer before overwriting state
    if (state.timerInterval) clearInterval(state.timerInterval);

    // Overwrite the state object
    Object.assign(state, newState);
}
