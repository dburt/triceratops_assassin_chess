# Specification: Assassin (Stealth) Variant

1. Setup Phase
- Placement: Before the first turn, each player places one Assassin on the board.
- Constraint: The Assassin must be placed directly in front of one of the player's own pawns (Rank 3 for White, Rank 6 for Black).
- Visibility: The placement is secret. The opponent does not see where the Assassin is placed.

2. The Assassin Piece
- Movement: Moves exactly 2 squares in any direction (can jump).
- Capturing: Can only capture enemy pieces adjacent to it (1 square range, like a King).
- Win Condition: A hidden Assassin does not deliver "Check". To win against a hidden Assassin, the Assassin must physically capture the King.

3. "Hidden" Mechanics (The Ghost Rule)
- Logic: A square occupied by a Hidden Assassin is treated as Empty by the game engine for all move generation and validation.
- Movement & Pass-through:
  - All pieces (Friendly and Enemy) move exactly as if the Assassin were not there.
  - Sliding pieces (R/B/Q) slide through the Assassin.
  - Knights jump over the Assassin.
  - Pawns can move 2 squares forward (initial move) jumping over a Hidden Assassin.
- Blind Capture (Collision):
  - If any piece (Enemy or Friendly) ends its move on the square occupied by a Hidden Assassin, the Assassin is captured and removed.
  - (e.g., White Pawn moves e2-e3 onto a Hidden White Assassin at e3 -> The Assassin is removed).

4. Reveal Mechanics (Dynamic)
- Dynamic State: The "Hidden" or "Revealed" status is re-calculated instantly after every board state change. It is not permanent.
- Revealed Condition: An Assassin is visible (and acts as a solid piece) only while:
  - An enemy Pawn attacks its square diagonally.
  - An enemy Pawn has passed the rank the Assassin is on (i.e., the pawn is behind the assassin relative to the pawn's direction of travel).
- Re-Hiding: If the revealing Pawn moves away, is captured, or the Assassin moves to a safe square, the Assassin immediately becomes Hidden again.

5. Revealed Physics
- While Revealed: The Assassin acts as a normal piece.
  - It blocks movement.
  - It cannot be moved through.
  - It delivers Check/Checkmate normally.
  - It cannot be "Blind Captured" (it must be captured via a legal attack).

## Errors
* Hidden assassins must be invisible at the start of each turn, only shown when the player presses the toggle button (so the opponent doesn't see it when they move!)
* Blind captures must be blind, not highlighted visibly as a capture!
* With a hidden assassin in a position where it can attack the king (normally check), the king's army is unable to move pawns, but should be able to.
* Assassins appear to be able to capture a hidden assassin 2 spaces away, but they should only ever be able to capture 1 space away.
