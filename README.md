# Special Chess

A feature-rich chess game with special pieces and variants, built as a single HTML file with no dependencies.

## Features

### Core Chess
- Full chess rules implementation
- Move notation and history
- Undo/redo functionality
- Game save/load (JSON format)
- Optional timers (10 minutes per player)

### Special Pieces

#### 🦕 Dinosaurs
- T-rex pieces that move like queens + knights
- Can be combined with other variants

#### 🥷 Assassins (Stealth Variant)
- Hidden pieces that are invisible to opponents
- Place in front of any pawn on rank 3 (white) or 6 (black)
- **Hidden**: Invisible, pieces can move through, can be blind-captured
- **Revealed**: Visible when enemy pawn attacks or has passed their rank
- Moves 2 squares in any direction, captures only 1 square away
- Hidden moves shown as "A??" in move history

### Mobile Responsive
- Touch-friendly interface
- Scales properly on all screen sizes
- Optimized for both desktop and mobile play

## How to Play

1. **New Game**: Choose your options using the emoji checkboxes
   - ⏱️ Enable timers
   - 🦕 Include dinosaurs  
   - 🥷 Include assassins

2. **Controls**:
   - Click piece to select, click destination to move
   - 👁️ Toggle assassin visibility (your own hidden assassins only)
   - ↶↷ Undo/redo moves
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
- Single file deployment - just open `chess-assassin.html`

## Planned Additions

### Core Chess Rules
- Threefold repetition detection and draw claims
- Fifty-move rule (50 moves without pawn move/capture)
- Insufficient material detection (K vs K, K+B vs K, etc.)
- Proper castling legality (can't castle through check)
- En passant capture timing restrictions
- Promotion piece validation (no pawn/king promotions)
- Multiple piece check detection
- Discovered check handling
- Pin detection (pinned pieces can't expose king)
- Resignation and draw offer buttons
- Proper timeout handling

### User Experience
- Network multiplayer (WebRTC peer-to-peer)
- Drag-and-drop piece movement
- Sound effects for moves/captures/check
- Coordinate labels (a-h, 1-8)
- Board flip (play from black's perspective)
- Move hints and threat indicators
- Opening book integration
- Material count display
- Keyboard navigation
- High contrast mode
- Tournament modes (Blitz, Bullet, Classical)

## License

Open source - feel free to modify and distribute!