# Special Chess

A feature-rich chess game with special pieces and variants, built as a single HTML file with no dependencies.

## Features

### Core Chess
- Full chess rules implementation
- Move notation and history
- Undo/redo functionality
- Game save/load (JSON format)
- Optional timers (10 minutes per player)
- Proper castling legality (can't castle through check)
- En passant capture implementation
- Comprehensive check and checkmate detection

### Special Pieces

#### 🦕 Triceratops
- Dinosaur pieces that move like queens + knights
- T-rex and brontosaurus emoji because Unicode doesn't yet have dark or light triceratops
- Can be combined with other variants

#### 🥷 Assassins
- Hidden pieces that are invisible to opponents
- Place in front of any pawn on rank 3 (white) or 6 (black)
- **Hidden**: Invisible, pieces can move through, can be blind-captured
- **Revealed**: Visible when enemy pawn attacks or has passed their rank
- Moves 2 squares in any direction, captures only 1 square away
- Hidden moves shown as "A??" in move history

### Network Play
- Peer-to-peer multiplayer using WebRTC (PeerJS)
- Create room or join with Room ID
- Real-time game synchronization
- Automatic board rotation for black player
- No server required - direct browser connection

### Mobile Responsive
- Touch-friendly interface
- Scales properly on all screen sizes
- Optimized for both desktop and mobile play

## How to Play

1. **Game Mode**: Choose local or network play
   - 🌐 Network Play: Create room or join with ID
   - 🎮 Local Play: Play on same device

2. **New Game**: Choose your options using the emoji checkboxes
   - ⏱️ Enable timers
   - 🦕 Include dinosaurs  
   - 🥷 Include assassins

3. **Controls**:
   - Click piece to select, click destination to move
   - 👁️ Toggle assassin visibility (your own hidden assassins only)
   - ↶↷ Undo/redo moves (local play only)
   - 💾📁 Save/load games

3. **Assassin Strategy**:
   - Place assassins strategically to surprise opponents
   - Hidden assassins can be captured by any piece moving onto their square
   - Reveal assassins by attacking with pawns
   - Use "A??" moves to keep opponents guessing

## Technical

- Pure HTML/CSS/JavaScript - no build process required
- Responsive design with CSS Grid and Flexbox
- Local storage for game persistence
- WebRTC peer-to-peer networking via PeerJS
- Multi-file deployment: `index.html`, `style.css`, `script.js`
- Mostly vibe-coded with OpenCode Zen Big Pickle and Gemini 3

## Planned Additions

### Core Chess Rules
- Resignation and draw offer buttons
- Insufficient material detection (K vs K, K+B vs K, etc.)
- Threefold repetition detection and draw claims
- Fifty-move rule (50 moves without pawn move/capture)

### User Experience
- Drag-and-drop piece movement
- Sound effects for moves/captures/check
- Coordinate labels (a-h, 1-8)
- Move hints and threat indicators
- Opening book integration
- Material count display
- Keyboard navigation
- High contrast mode
- Tournament modes (Blitz, Bullet, Classical)

## License

Open source - feel free to modify and distribute!
