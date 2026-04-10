# Flambe — Kitchen Runner

## Project Overview
A polished, mobile-friendly cooking-themed endless runner game built with Flutter and the Flame game engine.
Playable as PWA at: **https://arturmaiz.github.io/Hayde/**

## Tech Stack
- **Flutter 3.29+** (Dart)
- **Flame engine** for game loop, components, collision detection
- **shared_preferences** for best score persistence
- All visuals drawn with Canvas — no image assets required

## File Structure
```
lib/
  main.dart                    — App entry, MaterialApp + GameWidget
  game/
    flambe_game.dart           — Main FlameGame class, orchestrates everything
    config.dart                — All tuneable constants in one place
  components/
    player.dart                — Chef character with jump physics
    ground.dart                — Scrolling kitchen floor
    background.dart            — Parallax kitchen background (3 layers)
    obstacle.dart              — Obstacle component
    collectible.dart           — Ingredient collectible
    particle_effect.dart       — Particle burst effects
  managers/
    obstacle_manager.dart      — Timer-based obstacle spawning
    collectible_manager.dart   — Timer-based collectible spawning
  overlays/
    main_menu.dart             — Start screen (Flutter widget)
    game_over.dart             — Game over screen with score + retry
    hud.dart                   — In-game score display
  painters/
    chef_painter.dart          — Canvas drawing for the chef character
    obstacle_painters.dart     — Canvas drawing for obstacles
    collectible_painters.dart  — Canvas drawing for ingredients
    kitchen_bg_painter.dart    — Canvas drawing for background layers
  data/
    score_repository.dart      — Best score persistence
web/
  index.html                   — PWA shell with iOS meta tags
  manifest.json                — PWA manifest
  splash/                      — iOS splash screen images
.github/workflows/
  deploy.yml                   — Auto-deploy to GitHub Pages on push to main
```

## Game Architecture
| Component | What it does |
|---|---|
| `GameConfig` | Every tuneable value in one place (gravity, speed, colors, sizes) |
| `FlambeGame` | Main game class — state machine, game loop, orchestration |
| `Player` | Chef character with gravity, jump, squash-stretch animation |
| `Obstacle` | Kitchen items (pot, pan, fire, rolling pin, knife block) scrolling left |
| `Collectible` | Ingredients (8 types) floating and bobbing |
| `ObstacleManager` | Spawns obstacles with decreasing interval |
| `CollectibleManager` | Spawns ingredients, sometimes in arc patterns |
| `Background` | 3-layer parallax kitchen scene |
| `Ground` | Scrolling checkered kitchen floor |

## Easy Tweaks (GameConfig)
| Key | Effect |
|---|---|
| `gravity` | Higher = heavier feel |
| `jumpForce` | More negative = higher jump |
| `initialSpeed` | Starting scroll speed |
| `speedIncrement` | How fast difficulty ramps |
| `initialObstacleInterval` | Starting gap between obstacles |
| `collectibleScore` | Points per ingredient collected |

## Build & Deploy
```bash
flutter pub get
flutter build web --release --base-href "/Hayde/"
```
GitHub Actions auto-deploys from `main` to GitHub Pages.

## How to Play on iPhone
1. Open https://arturmaiz.github.io/Hayde/ in Safari
2. Tap Share button → "Add to Home Screen"
3. The game appears as an app icon — launches full screen like a native app

## Dev Notes
- No frameworks beyond Flutter/Flame, no external images
- All obstacle/character shapes drawn with Canvas primitives
- Flutter web compiles to JavaScript, runs at 60fps
- PWA configured for offline support and native iOS feel
- The same codebase can compile to native iOS/Android if needed later
