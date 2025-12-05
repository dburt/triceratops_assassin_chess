// --- CONSTANTS & CONFIG ---
const SYMBOLS = { 
    'K':'♔','Q':'♕','R':'♖','B':'♗','N':'♘','P':'♙','T':'🦕','A':'🥷🏻',
    'k':'♚','q':'♛','r':'♜','b':'♝','n':'♞','p':'♟','t':'🦖','a':'🥷🏿' 
};
const VECTORS = {
    diag: [[1,1],[1,-1],[-1,1],[-1,-1]],
    orth: [[1,0],[-1,0],[0,1],[0,-1]],
    knight: [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]]
};

// --- GLOBAL STATE ---
let network = {
    peer: null,
    conn: null,
    mySide: null, // 'white' or 'black' (Host is always White)
    isConnected: false
};

let state = {
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
    timerInterval: null
};

// --- INITIALIZATION ---
function initGame(loadedState = null, isNetworkStart = false) {
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

        state = {
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
            timers: { white: 600, black: 600 }, // Default 10 mins
            timerInterval: null
        };
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

function createBoard(config) {
    const b = Array(8).fill(null).map(() => Array(8).fill(null));
    const setRow = (r, p) => p.forEach((type, c) => b[r][c] = type);
    setRow(0, ['r','n','b','q','k','b','n','r']); 
    setRow(1, Array(8).fill('p'));
    setRow(6, Array(8).fill('P')); 
    setRow(7, ['R','N','B','Q','K','B','N','R']);
    
    if (config.dino) { b[5][4] = 'T'; b[2][4] = 't'; }
    return b;
}

// --- CORE LOGIC ---

function getEffectivePiece(r, c, board) {
    const p = board[r][c];
    if (!p) return null;
    if (state.config.assassin && p.toLowerCase() === 'a') {
        const isWhiteAss = (p === 'A');
        const enemyPawn = isWhiteAss ? 'p' : 'P';
        for (let pr = 0; pr < 8; pr++) {
            for (let pc = 0; pc < 8; pc++) {
                if (board[pr][pc] === enemyPawn) {
                    const attackRow = pr + (isWhiteAss ? 1 : -1);
                    if (attackRow === r && Math.abs(pc - c) === 1) return p; 
                    if (isWhiteAss && pr > r) return p; 
                    if (!isWhiteAss && pr < r) return p; 
                }
            }
        }
        return null; // Hidden
    }
    return p;
}

function handleClick(r, c) {
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

function makeMove(move) {
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

function completePromotion(type) {
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

function endTurn() {
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

// --- MOVEMENT & CHESS LOGIC ---
// (Logic largely identical to original to preserve game rules)

function getSafeMoves(r, c, p) {
    return generateMoves(r, c, p, state.board).filter(m => {
        const simBoard = state.board.map(row => [...row]);
        simBoard[m.r][m.c] = simBoard[r][c];
        simBoard[r][c] = null;
        if (m.enPassant) simBoard[r][m.c] = null; 
        const myKing = findKing(state.turn, simBoard);
        return myKing && !isAttacked(myKing, state.turn, simBoard, state.board);
    });
}

function generateMoves(r, c, p, board, checkCastle = true) {
    const moves = [];
    const type = p.toLowerCase();
    const isW = p === p.toUpperCase();
    const opp = (pc) => pc && (isW ? pc === pc.toLowerCase() : pc === pc.toUpperCase());
    const onBoard = (tr, tc) => tr >= 0 && tr < 8 && tc >= 0 && tc < 8;
    const add = (tr, tc, extra={}) => { if (onBoard(tr,tc)) moves.push({r:tr, c:tc, ...extra}); };

    if (type === 'p') {
        const dir = isW ? -1 : 1;
        if (onBoard(r+dir, c) && !getEffectivePiece(r+dir, c, board)) {
            add(r+dir, c);
            if ((isW && r===6) || (!isW && r===1)) {
                if (!getEffectivePiece(r+dir*2, c, board)) add(r+dir*2, c);
            }
        }
        [[1,-1], [1,1]].forEach(([dr, dc]) => {
            const tr = r + (dir*dr), tc = c + dc;
            if (!onBoard(tr, tc)) return;
            const target = getEffectivePiece(tr, tc, board);
            if (target && opp(target)) add(tr, tc);
            if (state.enPassant && state.enPassant.r === tr && state.enPassant.c === tc) {
                add(tr, tc, { enPassant: true });
            }
        });
    } else if (type === 'a') {
        for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
                if (dr===0 && dc===0) continue;
                const tr = r+dr, tc = c+dc;
                if (!onBoard(tr, tc)) continue;
                const dist = Math.max(Math.abs(dr), Math.abs(dc));
                const target = getEffectivePiece(tr, tc, board);
                if (dist === 2 && target === null) add(tr, tc);
                else if (dist === 1 && (target === null || opp(target))) add(tr, tc);
            }
        }
    } else {
        if (type === 'n' || type === 't') {
            VECTORS.knight.forEach(([dr, dc]) => {
                const tr = r + dr, tc = c + dc;
                if (onBoard(tr, tc)) {
                    const target = getEffectivePiece(tr, tc, board);
                    if (!target || opp(target)) add(tr, tc);
                }
            });
        }
        if (type !== 'n') {
            const dirs = (type === 'b') ? VECTORS.diag : (type === 'r') ? VECTORS.orth : [...VECTORS.diag, ...VECTORS.orth]; 
            const slide = ['q','r','b','t'].includes(type);
            dirs.forEach(([dr, dc]) => {
                let tr = r + dr, tc = c + dc;
                while (onBoard(tr, tc)) {
                    const target = getEffectivePiece(tr, tc, board);
                    if (target) { if (opp(target)) add(tr, tc); break; }
                    add(tr, tc);
                    if (!slide) break;
                    tr += dr; tc += dc;
                }
            });
            if (type === 'k' && checkCastle && !isAttacked({r,c}, isW?'white':'black', board)) {
                const rights = isW ? state.castling.w : state.castling.b;
                const row = isW ? 7 : 0;
                const checkEmpty = (cols) => cols.every(col => !getEffectivePiece(row, col, board));
                if (rights.k && checkEmpty([5,6]) && !isAttacked({r:row, c:5}, isW?'white':'black', board)) 
                    add(row, 6, {castle: 'k'});
                if (rights.q && checkEmpty([1,2,3]) && !isAttacked({r:row, c:3}, isW?'white':'black', board)) 
                    add(row, 2, {castle: 'q'});
            }
        }
    }
    return moves;
}

function isAttacked(pos, myColor, board, visibilityBoard = null) {
    const visBoard = visibilityBoard || board;
    for (let r=0; r<8; r++) {
        for (let c=0; c<8; c++) {
            const p = board[r][c];
            if (p && ((myColor === 'white' && p === p.toLowerCase()) || (myColor === 'black' && p === p.toUpperCase()))) {
                if (state.config.assassin && p.toLowerCase() === 'a' && getEffectivePiece(r, c, visBoard) === null) continue;
                const moves = generateMoves(r, c, p, board, false);
                if (moves.some(m => m.r === pos.r && m.c === pos.c)) return true;
            }
        }
    }
    return false;
}

function findKing(color, board = state.board) {
    const k = color === 'white' ? 'K' : 'k';
    for(let r=0; r<8; r++) for(let c=0; c<8; c++) if (board[r][c] === k) return {r, c};
    return null;
}

// --- UI UTILITIES ---

function toggleAssassinView() {
    state.showMyHidden = !state.showMyHidden;
    render();
}

function toggleGameOptions() {
    const gameOptions = document.getElementById('gameOptions');
    gameOptions.classList.toggle('hidden');
    const isHidden = gameOptions.classList.contains('hidden');
    document.getElementById('gameOptionsBtn').textContent = isHidden ? '🎮 New Game' : '❌ Close';
}

function startTimer() {
    if(state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
        if (state.winner) return clearInterval(state.timerInterval);
        
        // Host manages the authoritative time, but both decrement visually
        if (state.timers[state.turn] > 0) {
            state.timers[state.turn]--;
            renderTimer();
        } else {
            state.winner = (state.turn === 'white' ? 'Black' : 'White') + " wins on time!";
            render();
            clearInterval(state.timerInterval);
            if (network.isConnected) sendStateToPeer();
        }
    }, 1000);
}

function renderTimer() {
    const format = t => `${Math.floor(t/60)}:${(t%60).toString().padStart(2,'0')}`;
    document.querySelector('#whiteTimer .timer-time').textContent = format(state.timers.white);
    document.querySelector('#blackTimer .timer-time').textContent = format(state.timers.black);
    document.getElementById('whiteTimer').className = `timer ${state.turn==='white'?'active':''}`;
    document.getElementById('blackTimer').className = `timer ${state.turn==='black'?'active':''}`;
}

function showStatus(msg, isError = false) {
    const el = document.getElementById('status');
    el.textContent = msg;
    el.style.color = isError ? '#ff5252' : '#ffeb3b';
}

function saveHistorySnapshot() {
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

function undo() {
    if (network.isConnected) return showStatus("Undo disabled in network play", true);
    if (state.historyIndex > 0) {
        state.historyIndex--;
        restoreSnapshot(state.history[state.historyIndex]);
    }
}

function redo() {
    if (network.isConnected) return showStatus("Redo disabled in network play", true);
    if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        restoreSnapshot(state.history[state.historyIndex]);
    }
}

function restoreSnapshot(snap) {
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
    render();
}

function saveGame() {
    const data = JSON.stringify(state);
    const blob = new Blob([data], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'special-chess.json';
    a.click();
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
            initGame(JSON.parse(evt.target.result));
            // Sync loaded game if networking
            if(network.isConnected) sendStateToPeer();
        };
        reader.readAsText(file);
    };
    input.click();
}

// --- RENDER ---
function render() {
    const isW = state.turn === 'white';
    const turnText = state.winner || `${state.turn.toUpperCase()}'s Turn`;
    
    // Update Turn Display with Network Info
    let headerText = turnText;
    if (network.isConnected) {
        headerText += network.mySide ? ` (You are ${network.mySide})` : '';
    }
    document.getElementById('turnDisplay').textContent = headerText;
    
    showStatus('');
    
    // Status Logic
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
        if (myKing && isAttacked(myKing, state.turn, state.board)) {
            let hasMove = false;
            // Heavy check for mate
            for(let r=0; r<8; r++) for(let c=0; c<8; c++) {
                const p = state.board[r][c];
                if(p && ((isW && p===p.toUpperCase()) || (!isW && p===p.toLowerCase()))) {
                    if(getSafeMoves(r,c,p).length > 0) { hasMove=true; break; }
                }
            }
            showStatus(hasMove ? "Check!" : "Checkmate!", !hasMove);
            if (!hasMove) state.winner = (isW ? "Black" : "White") + " Wins!";
        }
    }

    const el = document.getElementById('board'); 
    el.innerHTML = '';
    
    // Optional: Rotate board for Black player
    const rotate = network.isConnected && network.mySide === 'black';

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            // Apply rotation if needed
            const drawR = rotate ? 7 - r : r;
            const drawC = rotate ? 7 - c : c;
            
            const p = state.board[drawR][drawC];
            const div = document.createElement('div');
            div.className = `square ${(drawR+drawC)%2 ? 'dark' : 'light'}`;
            
            if (p) {
                const pColor = p === p.toUpperCase() ? 'white' : 'black';
                const isMine = network.isConnected ? (pColor === network.mySide) : (pColor === state.turn);
                
                let show = true;
                let opacity = 1;

                if (state.config.assassin && p.toLowerCase() === 'a') {
                    const hidden = getEffectivePiece(drawR, drawC, state.board) === null;
                    if (hidden) {
                        // If I am the owner of this hidden piece
                        const amIOwner = network.isConnected ? (pColor === network.mySide) : (pColor === state.turn);
                        
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
            
            if (state.selected?.r === drawR && state.selected?.c === drawC) div.classList.add('selected');
            
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
    
    // Render Promo Options
    if (state.promotion) {
        // Only show promo options if it's my turn/piece
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

function inCheck(color) {
    const k = findKing(color);
    return k && isAttacked(k, color, state.board);
}

// --- NETWORKING (PeerJS Implementation) ---

function toggleNetworkMode() {
    const networkControls = document.getElementById('networkControls');
    networkControls.classList.toggle('hidden');
    const isHidden = networkControls.classList.contains('hidden');
    document.getElementById('networkBtn').textContent = isHidden ? '🌐 Network Play' : '🎮 Local Play';
    
    // If opening controls and not connected/initialized, init Peer
    if (!isHidden && !network.peer) {
        initPeer();
    }
}

function updateConnectionStatus(status, roomCode = null) {
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

function initPeer() {
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

function createRoom() {
    if (!network.peer || network.peer.disconnected) initPeer();
    
    // Just wait for connection. My ID is the room code.
    const myId = network.peer.id;
    updateConnectionStatus('Waiting for opponent...', myId);
    network.mySide = 'white'; // Host is white
}

function showJoinDialog() {
    document.getElementById('joinDialog').classList.remove('hidden');
}
function closeJoinDialog() {
    document.getElementById('joinDialog').classList.add('hidden');
}

function joinRoom() {
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

function sendStateToPeer() {
    if (network.conn && network.conn.open) {
        // Clear interval before sending to avoid cyclic structure or useless data
        const cleanState = { ...state, timerInterval: null };
        network.conn.send({
            type: 'state',
            state: cleanState
        });
    }
}

function disconnectNetwork() {
    if (network.conn) network.conn.close();
    network.isConnected = false;
    network.conn = null;
    network.mySide = null;
    updateConnectionStatus('Disconnected');
    document.getElementById('gameOptions').classList.remove('hidden');
    initGame(); // Reset to local
}

function copyRoomCode() {
    const code = document.getElementById('roomCode').textContent;
    navigator.clipboard.writeText(code).then(() => {
        showStatus("Room ID copied to clipboard!");
    });
}

// Start local game initially
initGame();
