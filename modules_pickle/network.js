import { state, network } from './state.js';
import { showStatus, render } from './ui.js';

// --- NETWORKING (PeerJS Implementation) ---
export function toggleNetworkMode() {
    const networkControls = document.getElementById('networkControls');
    const isHidden = networkControls.classList.contains('hidden');
    networkControls.classList.toggle('hidden');
    document.getElementById('networkBtn').textContent = isHidden ? '🌐 Network Play' : '🎮 Local Play';
    
    // If opening controls and not connected/initialized, init Peer
    if (!isHidden && !network.peer) {
        initPeer();
    }
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

export function initPeer() {
    updateConnectionStatus('Connecting to server...');
    // Create Peer object. PeerJS auto-connects to their free cloud server.
    network.peer = new Peer(null, {
        debug: 2
    });

    network.peer.on('open', (id) => {
        updateConnectionStatus('Server Connected. Create or Join.', null);
    });

    network.peer.on('connection', (conn) => {
        // Incoming connection (I am Host)
        handleConnection(conn, true);
    });

    network.peer.on('disconnected', () => updateConnectionStatus('Disconnected from server'));
    network.peer.on('error', (err) => showStatus(`Network Error: ${err.type}`, true));
}

export function createRoom() {
    if (!network.peer || network.peer.disconnected) initPeer();
    
    // Just wait for connection. My ID is the room code.
    const myId = network.peer.id;
    updateConnectionStatus('Waiting for opponent...', myId);
    network.mySide = 'white'; // Host is white
}

export function showJoinDialog() {
    document.getElementById('joinDialog').classList.remove('hidden');
}

export function closeJoinDialog() {
    document.getElementById('joinDialog').classList.add('hidden');
}

export function joinRoom() {
    const roomId = document.getElementById('roomInput').value.trim();
    if (!roomId) return;
    closeJoinDialog();
    updateConnectionStatus('Connecting to peer...');
    
    const conn = network.peer.connect(roomId);
    handleConnection(conn, false);
}

export function handleConnection(conn, isHost) {
    network.conn = conn;
    network.isConnected = true;
    network.mySide = isHost ? 'white' : 'black';

    conn.on('open', () => {
        updateConnectionStatus('Connected to Game!');
        showStatus(`Game Started! You are ${network.mySide}`);
        
        if (isHost) {
            // Host sends initial state
            initGame(); // Reset to fresh
            sendStateToPeer();
        }
    });

    conn.on('data', (data) => {
        // Receive data
        if (data.type === 'state') {
            state = data.state;
            // Fix timer interval loss on serialization
            if (state.config.timer && !state.winner) startTimer();
            render();
        }
    });

    conn.on('close', () => {
        showStatus('Opponent disconnected', true);
        disconnectNetwork();
    });
}

export function sendStateToPeer() {
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
    initGame(); // Reset to local
}

export function copyRoomCode() {
    const code = document.getElementById('roomCode').textContent;
    navigator.clipboard.writeText(code).then(() => {
        showStatus("Room ID copied to clipboard!");
    });
}