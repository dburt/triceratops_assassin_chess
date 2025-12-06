# Special Chess

A chess game with standard mode and optional special pieces (Triceratops and Assassins), supporting both local and peer-to-peer network play. Built as a responsive web application with PWA capabilities.

For a reference covering all rules, features, and technical details, please see the **[Game Specification](spec.md)**.

## Features

### Core Chess
- Full chess rules implementation with proper move validation
- Move notation and complete history tracking
- Undo/redo functionality (local play only)
- Game save/load in JSON format
- Optional timers (10 minutes per player)
- Proper castling legality (can't castle through check)
- En passant capture implementation
- Comprehensive check and checkmate detection

### Special Pieces

#### 🦕 Triceratops (T)
- Moves like a queen + knight combination (Amazon piece)
- One per side, starts at d3 (white) and d6 (black)
- Can be combined with other variants
- Notation: Standard algebraic with "T" for triceratops

#### 🥷 Assassins (A)
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
- **Notation**: "A??" for hidden moves, standard notation for revealed moves

### Network Play
- Peer-to-peer multiplayer using WebRTC (PeerJS)
- Create room or join with Room ID
- Real-time game synchronization
- Automatic board rotation for black player
- Turn enforcement (players can only move on their turn)
- No server required - direct browser connection

### User Interface
- **Responsive Design**: Mobile-optimized vertical layout, desktop horizontal layout
- **Touch-friendly**: Optimized for both desktop and mobile play
- **Visual Feedback**: Selection highlighting, move hints, capture indicators
- **PWA Support**: Service worker and manifest for offline capability
- **Custom Icon**: SVG icon with assassin and triceratops pawn heads

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
   - 👁️ Toggle assassin visibility (show own hidden assassins)
   - ↶↷ Undo/redo moves (local play only)
   - 💾📁 Save/load games

4. **Assassin Strategy**:
   - Place assassins strategically to surprise opponents
   - Hidden assassins can be captured by any piece moving onto their square
   - Reveal assassins by attacking with pawns
   - Use "A??" moves to keep opponents guessing

## Technical

- **Architecture**: Multi-file deployment with separation of concerns
  - `index.html` - Main application structure
  - `style.css` - Responsive styling and layout
  - `script.js` - Game engine and UI logic
  - `manifest.json` - PWA configuration
  - `sw.js` - Service worker for offline support
  - `icon.svg` - Custom game icon
- **Technologies**: Pure HTML/CSS/JavaScript (ES6+)
- **Responsive Design**: CSS Grid and Flexbox with mobile-first approach
- **Networking**: WebRTC peer-to-peer via PeerJS
- **PWA Features**: Service worker, app manifest, offline capability
- **No Build Process**: Direct file deployment to any web server

## Browser Compatibility
- **Modern browsers**: Full feature support
- **iOS 12+**: Core functionality with some limitations
- **PWA support**: Chrome, Edge, Firefox (limited Safari support)
- **WebRTC**: Supported in all modern browsers

## Future Enhancements

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

### Additional Features
- AI opponent with adjustable difficulty
- Analysis tools and move evaluation
- Player profiles and statistics
- Tournament system
- Additional special pieces and variants

## License

Open source - feel free to modify and distribute!
