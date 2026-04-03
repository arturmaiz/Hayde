# Hayde — Endless Runner Game

## Project Overview
A polished, mobile-friendly endless runner game built with vanilla HTML5, CSS, and JavaScript.
Playable at: **https://arturmaiz.github.io/Hayde/**

## File Structure
```
index.html   — page shell + overlay screens (start, game over)
style.css    — all visual styling, overlays, buttons, responsive layout
script.js    — entire game logic (physics, rendering, audio, state)
manifest.json — PWA manifest for "Add to Home Screen"
icon.svg     — app icon (shown on iPhone home screen)
```

## Architecture (script.js)
| Section | What it does |
|---|---|
| `CFG` constants | Every tuneable value in one place |
| `resize()` | Responsive canvas — fits viewport at ~2.6:1 ratio |
| `buildBg / updateBg / drawBg` | Parallax starfield + neon ground marks |
| `player` object | Physics, squash-stretch, AABB box(), draw() |
| `obstacles[]` | Spawn, scroll, cull, draw — supermarket items |
| `collides()` | AABB with 5 px inset leniency |
| `drawHUD()` | Score + best drawn on canvas |
| `snd()` | Web Audio API sounds (jump, land, die, motivation) |
| `loop()` | requestAnimationFrame game loop, capped delta-time |

## Easy Tweaks (CFG object)
| Key | Effect |
|---|---|
| `GRAVITY` | Higher = heavier feel |
| `JUMP_FORCE` | More negative = higher jump |
| `SPEED_START` | Initial scroll speed |
| `SPEED_INC` | How fast difficulty ramps |
| `GAP_MIN/MAX` | Obstacle spacing |
| `COL_PLAYER` | Player color |
| `COL_OBSTACLE` | Obstacle color |

## Planned / In-Progress Features
- [x] Core endless runner (jump, obstacles, score, best score)
- [x] Squash-stretch player animation
- [x] Parallax star background
- [x] PWA support (Add to Home Screen)
- [x] Touch/pointer/keyboard input
- [ ] Supermarket item obstacles (cart, milk, bread, cone...)
- [ ] Funny & beautiful UI redesign
- [ ] Web Audio jump + land sounds
- [ ] Motivational voice shoutouts at milestones
- [ ] Progress effects (speed lines, combo counter, screen flash)

## Deployment
- Branch: `main`
- GitHub Pages auto-deploys from `main` root
- Push to `main` → live in ~1 min

## Dev Notes
- No frameworks, no build step — open index.html directly in browser to test
- Audio uses Web Audio API (no sound files needed)
- All obstacle shapes drawn with canvas — no images required
- `touch-action: none` + `touchstart` fallback ensures all mobile browsers work
