# Special Chess Game Specification

## 1. Overview

This document specifies the rules and features of "Special Chess," a web-based chess variant game. The game supports standard chess rules, two optional new pieces (the Triceratops and the Assassin), timed games, and online network play between two players.

## 2. Core Gameplay

### 2.1. Standard Rules
The game follows the fundamental rules of FIDE chess, including:
- Standard piece movement (King, Queen, Rook, Bishop, Knight, Pawn).
- Castling (King-side and Queen-side).
- En Passant captures.
- Pawn promotion.
- Check, Checkmate, and Stalemate conditions.

### 2.2. Turn Structure
- The game is turn-based, with White moving first.
- A player selects one of their pieces and then clicks on a valid destination square to move it.
- In network play, players can only control the pieces of their assigned color.

### 2.3. Win Conditions
A player wins if:
- They place the opponent's King in Checkmate.
- The opponent runs out of time in a timed game.
- The opponent disconnects in a network game.

## 3. Game Options & Special Pieces

Before starting a new game, players can enable several options that modify the rules.

### 3.1. Timer (Optional)
- **Enabled by default.**
- If enabled, each player starts with a 10-minute timer.
- The active player's timer counts down during their turn.
- A player loses if their timer reaches 00:00.

### 3.2. Dinosaur Mode (Optional)
- **Piece:** Triceratops (🦕)
- **Setup:** If enabled, each player gets one Triceratops.
  - White's Triceratops starts on `e3` (board index `[5][4]`).
  - Black's Triceratops starts on `e6` (board index `[2][4]`).
- **Movement:** The Triceratops combines the moves of a **Queen** and a **Knight**. It can move to any square a Queen or a Knight could move to from its position, assuming the path is clear for sliding moves.

### 3.3. Assassin Mode (Optional)
- **Piece:** Assassin (🥷)
- **Setup Phase:**
  - If enabled, the first move for each player is to place their Assassin.
  - The Assassin must be placed on an empty square on the player's 3rd rank (rank 3 for Black, rank 6 for White) and must be directly in front of one of their own pawns.
- **Hidden State:**
  - The Assassin is **hidden** from the opponent's view by default.
  - An opponent can capture a hidden Assassin by moving one of their own pieces to its square, even though the square appears empty to them.
- **Reveal Conditions:** The Assassin is automatically revealed to the opponent if:
  1. An enemy pawn moves into a position where it could legally attack the Assassin's square.
  2. An enemy pawn moves to a rank that is past the Assassin's rank.
- **Player-Controlled Reveal:** A player can press the "Show/Hide Assassin" button to toggle the visibility of their own hidden Assassin on their screen. This does not reveal it to the opponent.
- **Movement:**
  - **Move (Non-Capture):** Can move 1 or 2 squares in any direction (orthogonally or diagonally) to an empty square.
  - **Capture:** Can capture an enemy piece exactly 1 square away in any direction.

### 3.4. Pawn Promotion
When a pawn reaches the opposite end of the board, it must be promoted.
- Standard promotion options are: **Queen, Rook, Bishop, Knight**.
- If Dinosaur Mode is active, a pawn can also be promoted to a **Triceratops**.
- If Assassin Mode is active, a pawn can also be promoted to an **Assassin**.

## 4. User Interface & Features

### 4.1. Main Screen
- **Board:** An 8x8 grid where the game is played.
  - The player's selected piece is highlighted.
  - Legal moves are indicated by dots (for moves) or rings (for captures).
  - A King in check is highlighted.
- **Turn Display:** Shows whose turn it is, the winner, or check/checkmate status. In network games, it also indicates which color the player is controlling.
- **Timers:** If enabled, displays the remaining time for both White and Black.
- **Move History:** A log of all moves made in the game using algebraic notation.

### 4.2. Controls
- **Undo/Redo:** In local games, players can undo and redo moves. This is disabled in network play.
- **Save/Load:** The current game state can be saved to a local `.json` file and loaded later.
- **New Game:** Opens the game options panel to start a new game with a custom configuration.

### 4.3. Network Play
- **Network Play Button:** Toggles the network control panel.
- **Create Room:**
  - The player who creates a room acts as the **Host** and will always play as **White**.
  - A unique Room ID is generated, which must be shared with the opponent.
- **Join Game:**
  - The opponent pastes the Host's Room ID to connect and join the game. They will play as **Black**.
- **Connection Status:** Displays the network connection state and the Room ID.
- **Board Orientation:** The board is automatically rotated for the player playing as Black.
- **State Sync:** The game state is synchronized between the two players after every move. The Host sends the initial state, and thereafter the player who just moved sends the updated state.

## 5. Technical Implementation
- The game is a client-side web application built with HTML, CSS, and vanilla JavaScript.
- Network functionality is implemented using the **PeerJS** library, which facilitates peer-to-peer WebRTC connections.
- The game is designed to be a Progressive Web App (PWA) and includes a service worker for offline capabilities.
