# Special Chess - Complete Game Specification

## Overview
A feature-rich chess variant game with special pieces (Triceratops and Assassins), supporting both local and peer-to-peer network play. Built as a responsive web application with PWA capabilities.

## Core Chess Implementation
- **Full chess rules**: Standard piece movements, castling, en passant, promotion
- **Game states**: Check, checkmate, stalemate detection
- **Move validation**: Legal move generation with safety checking
- **History tracking**: Algebraic notation with full move history
- **Game persistence**: Save/load games in JSON format
- **Undo/redo**: Full move history navigation (local play only)
- **Timers**: Optional 10-minute countdown per player

## Special Pieces

### 🦕 Triceratops (T)
- **Movement**: Queen + Knight combination (like Amazon piece)
- **Placement**: One per side, starts at d3 (white) and d6 (black)
- **Capture**: Same as movement
- **Notation**: Standard algebraic with "T" for triceratops

### 🥷 Assassin (A)
- **Setup Phase**: Each player places one assassin before first turn
  - Must be placed directly in front of own pawn (rank 3 for white, rank 6 for black)
  - Placement is hidden from opponent
- **Movement**: Exactly 2 squares in any direction (can jump pieces)
- **Capture**: Only 1 square away (king-like capture range)
- **Hidden Mechanics**:
  - Invisible to opponents when not under pawn attack
  - Treated as empty square for movement (pieces can pass through)
  - Can be "blind captured" by any piece landing on its square
- **Reveal Conditions**:
  - Enemy pawn attacks diagonally
  - Enemy pawn has passed assassin's rank
  - Immediately re-hides when revealing pawn moves away
- **Revealed State**: Acts as normal piece, blocks movement, delivers check
- **Notation**: "A??" for hidden moves, standard notation for revealed moves

## Game Modes

### Local Play
- Two players on same device
- Full undo/redo functionality
- Complete game control options

### Network Play
- **Peer-to-peer**: WebRTC connection via PeerJS
- **Room System**: Host creates room, guest joins with Room ID
- **Real-time Sync**: Instant move synchronization
- **Board Rotation**: Automatic 180° rotation for black player
- **Turn Enforcement**: Players can only move on their turn
- **Connection Management**: Disconnect/reconnect handling

## User Interface

### Responsive Design
- **Mobile**: Touch-optimized, vertical layout
- **Desktop**: Horizontal layout with board beside controls
- **Adaptive**: Scales from 320px to 4K displays

### Controls
- **Main Actions**: Undo, Redo, Save, Load
- **Game Options**: Timer, Dinosaur, Assassin toggles
- **Network Controls**: Create Room, Join Game, Disconnect
- **Special Features**: 
  - Toggle assassin visibility (show own hidden assassins)
  - Copy room ID to clipboard
  - Move history display

### Visual Feedback
- **Selection highlighting**: Green background for selected piece
- **Move hints**: Dots for valid moves
- **Capture indicators**: Orange highlighting for capturable pieces
- **Check indicator**: Red background for king in check
- **Assassin states**: Dashed outline for revealed assassins
- **Connection status**: Color-coded network status

## Technical Architecture

### Frontend
- **HTML5**: Semantic structure with accessibility
- **CSS3**: Grid/Flexbox layout, CSS variables, responsive design
- **JavaScript ES6+**: Modern features with compatibility considerations
- **PWA**: Service worker, manifest, offline capability

### Game Engine
- **Board representation**: 8x8 array with piece notation
- **Move generation**: Vector-based movement calculation
- **State management**: Centralized game state object
- **History system**: Snapshot-based undo/redo
- **Timer system**: Countdown with pause/resume

### Networking
- **WebRTC**: Direct peer-to-peer connection
- **PeerJS**: Simplified WebRTC API
- **Message protocol**: JSON-based state synchronization
- **Connection handling**: Join/leave, error recovery

## File Structure
```
├── index.html          # Main application
├── style.css           # Responsive styling
├── script.js           # Game engine and UI logic
├── manifest.json       # PWA configuration
├── sw.js             # Service worker for offline
├── icon.svg          # Custom game icon
└── README.md         # Documentation
```

## Game Rules & Logic

### Standard Chess Rules
- All piece movements follow standard chess rules
- Castling requires safe path and king not in check
- En passant available on pawn's initial 2-square move
- Promotion to Queen, Rook, Bishop, Knight, Dinosaur, or Assassin
- Checkmate ends game, stalemate results in draw

### Special Rules Integration
- **Triceratops**: Combines queen and knight movement patterns
- **Assassins**: Dynamic visibility based on pawn positions
- **Hidden pieces**: Pass-through mechanics with blind capture
- **Reveal system**: Instant state recalculation after each move

### Win Conditions
- **Standard**: Checkmate as per chess rules
- **Assassin variant**: Hidden assassin cannot deliver check
- **Time**: Player runs out of timer (if enabled)

## Browser Compatibility
- **Modern browsers**: Full feature support
- **iOS 12+**: Core functionality with some limitations
- **PWA support**: Chrome, Edge, Firefox (limited Safari support)
- **WebRTC**: Supported in all modern browsers

## Deployment
- **Static hosting**: Any web server can serve files
- **No build process**: Direct file deployment
- **HTTPS required**: For WebRTC and PWA features
- **CORS considerations**: PeerJS CDN needs proper headers
