// js/network.js
import { network, state, setState } from './state.js';
import { showStatus, updateConnectionStatus, showJoinDialog, closeJoinDialog } from './ui.js';

let initGameCallback;
let sendStateToPeerCallback;

export function setCallbacks(initGame, sendState) {
    initGameCallback = initGame;
    sendStateToPeerCallback = sendState;
}

export function initPeer() {
    updateConnectionStatus('Connecting to server...');
    network.peer = new Peer(null, { debug: 2 });

    network.peer.on('open', (id) => {
        updateConnectionStatus('Server Connected. Create or Join.', null);
    });

    network.peer.on('connection', (conn) => {
        handleConnection(conn, true);
    });

    network.peer.on('disconnected', () => updateConnectionStatus('Disconnected from server'));
    network.peer.on('error', (err) => showStatus(`Network Error: ${err.type}`, true));
}

export function createRoom() {
    if (!network.peer || network.peer.disconnected) initPeer();
    
    const myId = network.peer.id;
    updateConnectionStatus('Waiting for opponent...', myId);
    network.mySide = 'white'; // Host is white
}

export function joinRoom() {
    const roomId = document.getElementById('roomInput').value.trim();
    if (!roomId) return;
    closeJoinDialog();
    updateConnectionStatus('Connecting to peer...');
    
    const conn = network.peer.connect(roomId);
    handleConnection(conn, false);
}

function handleConnection(conn, isHost) {
    network.conn = conn;
    network.isConnected = true;
    network.mySide = isHost ? 'white' : 'black';

    conn.on('open', () => {
        updateConnectionStatus('Connected to Game!');
        showStatus(`Game Started! You are ${network.mySide}`);
        
        if (isHost) {
            if (initGameCallback) initGameCallback(); // Reset to fresh
            if (sendStateToPeerCallback) sendStateToPeerCallback();
        }
    });

    conn.on('data', (data) => {
        if (data.type === 'state') {
            setState(data.state);
            // The main module will handle starting the timer and re-rendering
        }
    });

    conn.on('close', () => {
        showStatus('Opponent disconnected', true);
        disconnectNetwork();
    });
}

export function sendState() {
    if (network.conn && network.conn.open) {
        // Clear interval before sending to avoid cyclic structure or useless data
        const cleanState = { ...state, timerInterval: null };
        network.conn.send({
            type: 'state',
            state: cleanState
        });
    }
}

export function disconnectNetwork() {
    if (network.conn) network.conn.close();
    network.isConnected = false;
    network.conn = null;
    network.mySide = null;
    updateConnectionStatus('Disconnected');
    document.getElementById('gameOptions').classList.remove('hidden');
    if (initGameCallback) initGameCallback(); // Reset to local
}
