import { netState } from './state.js';

export function initNetwork(onData, onStatus) {
    netState.peer = new Peer(null, { debug: 1 });
    
    netState.peer.on('open', (id) => onStatus('Connected. ID: ' + id, id));
    netState.peer.on('connection', (conn) => handleConn(conn, true, onData, onStatus));
    netState.peer.on('error', (e) => onStatus('Error: ' + e.type));
}

export function connectToPeer(id, onData, onStatus) {
    const conn = netState.peer.connect(id);
    handleConn(conn, false, onData, onStatus);
}

function handleConn(conn, isHost, onData, onStatus) {
    netState.conn = conn;
    netState.isConnected = true;
    netState.mySide = isHost ? 'white' : 'black';

    conn.on('open', () => {
        onStatus(`Game Started! You are ${netState.mySide}`);
        if (isHost) onData({ type: 'init' }); // Signal to host to send state
    });
    
    conn.on('data', onData);
    conn.on('close', () => {
        netState.isConnected = false;
        onStatus('Opponent Disconnected');
    });
}

export function sendState(state) {
    if (netState.conn?.open) {
        // Strip non-serializable intervals
        const clean = { ...state, timerInterval: null }; 
        netState.conn.send({ type: 'state', state: clean });
    }
}