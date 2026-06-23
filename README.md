# ASYLUM: The Last Ward 🩸

A psychological **3D first-person horror game** built with **Next.js 16 + React Three Fiber (Three.js)** — the browser-native equivalent of Unity. Inspired by *Granny*: sneak through a dark asylum, find 3 keys, hide from the thing that hunts you, and escape within 5 nights.

![horror](public/textures/monster_face.png)

## 🎮 Features

- **Granny-style stealth AI** — the monster patrols, *hears* your noise, investigates, hunts you down, and searches when it loses you.
- **Sound matters** — running is loud, crouching is silent, and creaky floorboards betray your position.
- **Hide in wardrobes** — press **E** near a closet to hide. But if she's right next to you, she'll hear the door.
- **5 nights** — each time she catches you, you wake up again (one day closer to game over). Your keys carry over.
- **Flashlight** with draining battery — shine it at her while she's *wandering* to daze her (it won't stop a chase).
- **Sanity system** — darkness and proximity break your mind: hallucination whispers, red vignette, chromatic aberration.
- **Dual controls** — Keyboard/Mouse (WASD + pointer lock) **or** Touch (virtual joystick, look pad, buttons). Pick at the main menu.
- **Procedural + TTS audio** — continuous evolving ambient music (Am–F–C–G progression), dynamic heartbeat, granny footsteps, door creaks, floorboard creaks, breathing, growls, cupboard thuds, glass breaks, water drips, wind howls, plus 12 AI-generated voice lines.

## 🕹️ Controls

### Keyboard / Mouse
| Action | Key |
|---|---|
| Move | `W A S D` |
| Look | Mouse (click to lock, `ESC` to release) |
| Run | `Shift` |
| Crouch (silent) | `C` or `Ctrl` |
| Flashlight | `F` |
| Hide / Interact | `E` |

### Touch (mobile)
- **Left** side: virtual joystick to move
- **Right** side: drag to look
- Buttons: **CROUCH**, **RUN**, **LIGHT**, **HIDE/EXIT**

## 🚀 Run locally

```bash
bun install
bun run dev
```

Open http://localhost:3000 (or use the preview panel).

## 🌐 Deploy to GitHub Pages

This project is configured for **static export** (`output: 'export'` in `next.config.ts`).

### Automatic (recommended)
1. Create a new GitHub repository and push this code:
   ```bash
   git init
   git add .
   git commit -m "Asylum horror game"
   git branch -M main
   git remote add origin https://github.com/<YOU>/<REPO>.git
   git push -u origin main
   ```
2. In your repo: **Settings → Pages → Build and deployment → Source = GitHub Actions**.
3. The included workflow (`.github/workflows/deploy.yml`) builds and deploys automatically on every push to `main`.
4. Your game goes live at `https://<YOU>.github.io/<REPO>/`.

> The workflow auto-detects the repository name and sets the correct `basePath`, so assets load properly on the project subpath.

### Manual (one-off)
```bash
NEXT_PUBLIC_BASE_PATH="/<your-repo-name>" bun run build
# upload the ./out folder to the gh-pages branch (e.g. with peaceiris/actions-gh-pages)
```

### User/org root site (`<YOU>.github.io`)
For a repo named `<YOU>.github.io`, leave `NEXT_PUBLIC_BASE_PATH` empty (no basePath needed) — the workflow handles this automatically since `basePath = /github.io` would be wrong. Set the repo name to `<YOU>.github.io` and override the env var to empty in the workflow if needed.

## 🧱 Tech stack
- Next.js 16 (App Router) + TypeScript
- React Three Fiber + @react-three/drei + @react-three/postprocessing (Three.js)
- Tailwind CSS 4 + shadcn/ui + Lucide icons
- Zustand (game state) + Web Audio API (procedural audio)
- z-ai-web-dev-sdk (TTS voices + AI-generated textures, created at build time)

## 📁 Project structure
```
src/
  lib/           maze, game-store, audio engine, input, entities
  components/
    game/        3D: Environment, Lights, Furniture, Wardrobes, Keys, Door, Monster, Player, GameCanvas
    horror-ui/   HUD, TouchControls, JumpScareOverlay, Screens (menu/gameover/victory/day)
  app/           page.tsx (entry)
public/
  audio/         12 TTS voice lines (.mp3)
  textures/      7 AI-generated horror textures (.png)
.github/workflows/deploy.yml   GitHub Pages auto-deploy
```

## ⚠️ Content warning
Sudden scares, flashing lights, disturbing imagery. Headphones recommended.
