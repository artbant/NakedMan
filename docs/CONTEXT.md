# Nuked Man — Project Context

## Concept
2D platformer about a naked man in a hat who partied so hard he woke up naked in another universe. Goal: get home.

## Style
- Black & white pixel art, 8-bit aesthetic
- NO antialiasing anywhere — everything drawn with `fillRect` only
- NO `ctx.arc()`, NO `ctx.font` — all shapes and text are pixel-drawn
- Reference: Broforce (readability, scale), user's own pixel art assets

## Tech Stack
- Pure HTML5 Canvas + JavaScript (no frameworks, no libraries)
- Single `index.html` + `game.js`
- All graphics drawn in code — no PNG/SVG imports for gameplay elements
- Target: works in browser, mobile-friendly (touch controls)

## Character — "Nuked Man"
- Sprite size: 15×24 pixels (each row drawn with fillRect width=pixels, height=1)
- Stands with BACK to camera in idle state
- Turns to face direction when moving
- Defined as array of [x, y, width] rows:

```js
const STAY = [
  [4,0,7],[3,1,3],[9,1,3],[3,2,9],[0,3,15],  // hat
  [3,5,9],[3,6,9],[4,7,7],                    // head
  [3,9,9],[2,10,11],[1,11,13],                // shoulders
  [1,12,1],[3,12,9],[13,12,1],               // torso+arms
  [1,13,1],[3,13,9],[13,13,1],
  [1,14,1],[3,14,9],[13,14,1],
  [3,15,2],[6,15,3],[10,15,2],               // hips
  [1,16,1],[3,16,3],[7,16,1],[11,16,3],[13,16,1],
  [3,17,4],[8,17,4],[3,18,4],[8,18,4],       // legs
  [3,19,3],[11,19,3],
  [3,20,1],[13,20,1],[3,21,1],[13,21,1],[3,22,1],[13,22,1],
  [2,23,2],[12,23,2],                        // feet
];
```

## World
- Tile size: 24×24 pixels
- Canvas: 320×180 (scaled to fill screen via CSS width:100%)
- Scroll: LEFT TO RIGHT only (like Broforce)
- Map: 2D array, 0=empty, 1-8=different tile textures

## Tile Types (drawn with fillRect only)
1. Checkerboard
2. Vertical lines
3. Brick pattern
4. Diagonal stripes
5. Dot grid
6. Nested squares
7. Zigzag
8. Crosshatch

## Parallax Layers (3 total)
- Layer 3 (far, 0.08x speed): dark sky, pixel moon, abstract vertical monoliths
- Layer 2 (mid, 0.35x speed): tall shapes anchored to GROUND bottom, diagonal textures
- Layer 1 (1x speed): solid tilemap player walks on

**IMPORTANT**: Background shapes must be anchored to ground, not floating in air.

## Pixel Font
All HUD text drawn with custom 5×7 pixel font (fillRect only). No ctx.font.
Letters defined as 2D bit arrays in GLYPHS object.
Hearts drawn pixel-by-pixel.

## Physics
- Gravity: 480
- Player speed: 75px/s
- Jump velocity: -260
- Max fall speed: 600
- Tile-based collision (check corners)

## Game Mechanics (planned, not yet implemented)
- Lives system (3 lives, shown as pixel hearts in HUD)
- Die by falling → lose life → respawn at level start
- Punch attack (Z key) — animation + particle effect
- Powerups: beer (restore HP or speed boost), cigarette (speed/invincibility)
- Enemies: walk back and forth, take punches

## Locations (5 planned)
1. **Night Street** — dark, dense, vertical lines, where he woke up ← CURRENT
2. **Alien Forest** — organic shapes, diagonal chaos, strange dimension
3. **Factory/Ruins** — horizontal grids, pipes, mechanical feel
4. **Bar** — chaotic patterns, barrels
5. **Rooftops** — open, steps upward, finale

## Current Status
- ✅ Player sprite drawn pixel-perfect from original SVG
- ✅ Basic movement (left/right) and jump
- ✅ Tile-based collision
- ✅ 3-layer parallax background (far/mid/near)
- ✅ Pixel HUD (hearts + text, no font rendering)
- ✅ Camera scrolls right only
- ✅ Death/respawn system
- ❌ Animations (run, idle bob, punch) — NOT YET
- ❌ Enemies
- ❌ Powerups
- ❌ Sound
- ❌ Multiple levels

## File Structure
```
nuked-man/
├── index.html    ← canvas setup, loads game.js
├── game.js       ← all game logic
├── CONTEXT.md    ← this file
└── DEVLOG.md     ← progress log
```

## How to Work
Tell Claude Code what to implement next, one step at a time.
Always test in browser with Live Server (right-click index.html → Open with Live Server).
