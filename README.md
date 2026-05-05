# Neon Sector 50 - Complete 2D Shooting Game

A complete browser-based 2D shooting game made with HTML5 Canvas, JavaScript, and generated 2D image assets.

## Features

- 50 levels
- Boss fight every 10 levels
- Player movement, jump, shooting, health system
- AI enemies with chase, dodge, shooting, and level-based accuracy
- Enemy reaction time improves as levels increase
- Parallax background layers
- Generated PNG assets included
- Player, enemies, boss, bullets, pickups, explosion frames, background, ground, obstacle
- Sound effects generated using Web Audio API
- Mobile touch buttons included
- No external library required

## How to run

### Easy method
Open `index.html` in your browser.

### Better method
Run a local server:

```bash
cd ai_2d_shooter_complete
python -m http.server 8000
```

Then open:

```txt
http://localhost:8000
```

### Termux method

```bash
pkg update
pkg install python
cd ai_2d_shooter_complete
python -m http.server 8000
```

Open your browser and go to:

```txt
http://127.0.0.1:8000
```

## Controls

| Action | Keyboard |
|---|---|
| Move left | A or Left Arrow |
| Move right | D or Right Arrow |
| Jump | W or Up Arrow |
| Shoot | Space or mouse click |
| Pause | P |
| Restart after game over | R |
| Mute/unmute | M |

## Project structure

```txt
ai_2d_shooter_complete/
  index.html
  styles.css
  src/
    main.js
  assets/
    images/
      player_idle.png
      player_run.png
      player_jump.png
      player_shoot.png
      enemy_drone.png
      enemy_soldier.png
      boss_mech.png
      bullet_player.png
      bullet_enemy.png
      explosion_0.png ... explosion_5.png
      health_pack.png
      coin.png
      obstacle_crate.png
      background_far.png
      background_mid.png
      background_front.png
      ground_tile.png
  tools/
    generate_assets.py
  docs/
    AI_ASSET_PROMPTS.md
```

## Regenerate the included images

The included images were generated programmatically with Python/Pillow.

```bash
pip install pillow
python tools/generate_assets.py
```

## Replace with premium AI-generated images

Keep the same filenames and dimensions. Replace files inside:

```txt
assets/images/
```

For example, if you generate a better player image, save it as:

```txt
assets/images/player_idle.png
```

Transparent PNG is recommended for characters, bullets, pickups, and explosions.

## Important editing points

Open `src/main.js`:

- `MAX_LEVEL = 50` changes total levels.
- Player speed is inside `class Player`.
- Enemy scaling is inside `class Enemy` and `loadLevel()`.
- Boss health and attack pattern are inside `class Boss`.
- Asset paths are inside `assetPaths`.

## Notes

This game is made to be easy to modify. You can add more weapons, enemy types, upgrades, maps, and sound effects.
