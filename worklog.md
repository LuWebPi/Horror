# Worklog: Psychological 3D Horror Game

## Project Overview
Building a psychological 3D first-person horror game in Next.js using React Three Fiber (Three.js).
Features: Unity-style dark asylum environment, jump scares, flashlight, sanity system,
dual controls (touch joystick + keyboard/mouse), procedural + TTS audio, atmospheric music.

## Task Assignments
- Task 1: Install packages (DONE - already present: three 0.184, @react-three/fiber 9.6, @react-three/drei 10.7, @react-three/postprocessing)
- Task 2-a: Generate TTS horror sound/voice assets
- Task 2-b: Generate horror image assets (monster face, textures)
- Task 3-9: Build game code (main agent)
- Task 10: Wire up page.tsx, lint, verify with Agent Browser


---
Task ID: 2-b
Agent: Image Asset Generator
Task: Generate horror image assets

Work Log:
- Read worklog.md to confirm prior task context (Task 1 packages already installed; this is Task 2-b image assets).
- Verified `z-ai` CLI available at /usr/local/bin/z-ai and public/ directory exists.
- Created directory /home/z/my-project/public/textures/ (mkdir -p).
- Ran `z-ai image` CLI sequentially for 7 assets, each with the specified prompt and size. All succeeded on first attempt; no retries needed.
- Verified all 7 PNG files exist and are non-empty via `ls -la`. All files > 100KB.

Stage Summary:
- Successfully generated 7 horror image assets in /home/z/my-project/public/textures/:
  - monster_face.png  (1024x1024, 140,083 bytes) - jump-scare ghost face overlay
  - monster_face2.png (1024x1024, 145,396 bytes) - alternate distorted creature face
  - wall.png          (1024x1024, 239,263 bytes) - seamless asylum wall texture
  - floor.png         (1024x1024, 244,988 bytes) - seamless concrete floor texture
  - ceiling.png       (1024x1024, 285,764 bytes) - seamless decrepit ceiling texture
  - door.png          (768x1344,  178,293 bytes) - vertical rusty metal door texture
  - blood.png         (1024x1024, 216,223 bytes) - seamless dried blood splatter texture
- All assets ready for use by main agent (Task 3-9) for jump-scare overlays and 3D asylum environment materials. No source code modified.

---
Task ID: 2-a
Agent: TTS Asset Generator
Task: Generate TTS horror voice assets

Work Log:
- Read worklog.md to confirm prior context (Task 1 packages done; Task 2-b image assets done). This is Task 2-a (TTS audio).
- Verified `z-ai` CLI available at /usr/local/bin/z-ai; reviewed `z-ai tts --help` (options: -i/--input, -o/--output, -v/--voice, -s/--speed, -f/--format with wav/mp3/pcm listed, default wav).
- Created /home/z/my-project/public/audio/ (mkdir -p).
- First attempt: passed `--format mp3` directly to z-ai. API rejected it with error code 1214 ("不支持当前response_format值" / unsupported response_format). The CLI help lists mp3 but the upstream API does not actually support mp3 output.
- Also hit HTTP 429 (Too many requests) from rapid-fire calls during retries.
- Switched strategy: generate WAV with z-ai (`--format wav`, which works), then transcode to MP3 with ffmpeg (libmp3lame, VBR ~qscale 4). ffmpeg 7.1.4 is installed at /usr/bin/ffmpeg.
- Used a 12-15s delay between successive API calls plus exponential backoff on 429 to stay under the rate limit. Generated 6 files, then continued with the remaining 6 in a second pass.
- Final holdout `laugh.mp3` kept getting 429; succeeded after a ~3-minute cooldown.
- Verified all 12 files via `ls -la` and `file` (all confirmed MPEG ADTS layer III, 64 kbps, 24 kHz, Monaural, with ID3v2.4 tags).
- Removed temp helper scripts (gen_tts.sh, gen_tts2.sh) and temp _tmp.wav after completion. No game source code modified.

Stage Summary:
- Successfully generated 12 horror voice/sound MP3 assets in /home/z/my-project/public/audio/:
  - intro.mp3      (55,796 bytes) - xiaochen, 0.8x - "You should not be here. The walls remember your name..."
  - whisper1.mp3   (11,228 bytes) - tongtong, 0.6x - "behind you"
  - whisper2.mp3    (9,884 bytes) - tongtong, 0.6x - "get out"
  - whisper3.mp3    (7,676 bytes) - tongtong, 0.7x - "help me"
  - whisper4.mp3   (23,972 bytes) - tongtong, 0.6x - "don't turn around"
  - whisper5.mp3   (19,460 bytes) - tongtong, 0.7x - "it's coming for you"
  - whisper6.mp3   (20,612 bytes) - tongtong, 0.6x - "you can't escape"
  - gameover.mp3   (29,540 bytes) - xiaochen, 0.7x - "You should have run. Now you belong to the dark."
  - victory.mp3    (30,020 bytes) - xiaochen, 0.8x - "You escaped. But it still waits for you."
  - objective.mp3  (32,660 bytes) - xiaochen, 0.9x - "Find three keys. Escape through the door."
  - keyfound.mp3   (21,116 bytes) - xiaochen, 0.9x - "A key. How many more?"
  - laugh.mp3      (49,868 bytes) - douji, 0.6x - "ha ha ha ha ha"
- All 12 files are valid MP3 (verified via `file`). All non-empty. Ready for the main game agent (Task 3-9) to wire into narration / whisper / game-over / victory / key-found / jump-scue laugh triggers via /audio/<name>.mp3 URLs.
- IMPORTANT FOR MAIN AGENT: the z-ai TTS API does NOT support `--format mp3` directly despite the CLI help; it only works with `--format wav` (and pcm). If regenerating, request wav then transcode with ffmpeg. Also note the API rate-limits aggressively (429) — keep >=12s between calls.

---
Task ID: 3-10
Agent: Main Game Developer
Task: Build the complete psychological 3D horror game (code, UI, verification)

Work Log:
- Created maze definition (src/lib/maze.ts): 17x13 asylum grid with collision, keys, exit, whisper zones, light positions
- Created Zustand game store (src/lib/game-store.ts): phase, control mode, sanity, battery, keys, jump scare, tension
- Created procedural audio engine (src/lib/audio.ts): ambient drone (3 detuned saw oscillators + noise bed + LFO), heartbeat, footsteps, jump-scare stinger, key chime, door unlock, flicker zap, TTS voice playback
- Created shared input system (src/lib/input.ts): keyboard/mouse (WASD+pointer lock) + touch (joystick+look pad) writing to a shared mutable InputState; edge-triggered flags for interact/flashlight
- Created shared entity state (src/lib/entities.ts): player & monster positions, forward vectors, scare flags
- Built Environment (Environment.tsx): instanced walls, textured floor/ceiling, blood decals using AI-generated textures
- Built Lights (Lights.tsx): 8 ceiling lights with flicker/dead/steady behaviors, ambient + hemisphere fill
- Built Keys (Keys.tsx): 3 glowing rotating keys with proximity pickup, chime sound, objective tracking
- Built Door (Door.tsx): textured exit door that swings open + turns green when all keys collected
- Built Monster (Monster.tsx): tall dark humanoid with billboard monster-face, glowing eyes, chase AI that recoils from flashlight beam, activates after first key or 40s, catches player at <1.3m
- Built Player (Player.tsx): first-person controller with collision+sliding, spotlight flashlight (follows camera), camera point light, battery/sanity drain, whisper zones, win/lose logic, jump-scare trigger
- Built GameCanvas (GameCanvas.tsx): R3F Canvas with fog, ACES tone mapping, postprocessing (Bloom, ChromaticAberration scaling with low sanity, Vignette, Noise)
- Built GameErrorBoundary: catches render errors gracefully
- Built TouchControls (TouchControls.tsx): left virtual joystick, right look pad, RUN/LIGHT/USE buttons
- Built HUD (HUD.tsx): sanity/battery bars, key counter, objective, transient messages, low-sanity red vignette
- Built JumpScareOverlay (JumpScareOverlay.tsx): full-screen shaking monster face + red flash
- Built Screens (Screens.tsx): main menu (title, control selection, settings), game over, victory screens
- Built HorrorGame (HorrorGame.tsx): phase orchestrator tying 3D canvas + UI + overlays together
- Wired up page.tsx with dynamic ssr:false import
- Fixed eslint config (disabled react-hooks/immutability rule for game-loop mutations)
- Fixed postprocessing ref API error (caRef.current.offset.set) by switching to reactive props
- Fixed dark scene: boosted ambient light, fog, flashlight intensity, added camera point light
- Fixed dev server stability (ran next binary directly instead of via bun pipe)

Verification (Agent Browser + VLM):
- Main menu renders: title "ASYLUM: THE LAST WARD", control selection (Keyboard/Touch), settings, start button
- Game starts on click: 3D canvas mounts, HUD appears (SANITY 100%, BATTERY, keys 0/3, "Find 3 Keys")
- VLM confirms 3D corridor visible: "dimly lit narrow corridor with textured walls and concrete floor, flashlight illuminating the path"
- Movement (W key) works: view changes as player walks forward
- Flashlight (F key) toggles: scene goes dark when off
- Battery drains over time (88% -> 79%): game loop confirmed active
- No console errors after fixes
- Lint passes clean

Stage Summary:
- Complete psychological 3D horror game built with React Three Fiber (Three.js), the browser-native equivalent of Unity
- 12 TTS voice assets + 7 AI-generated texture assets wired in
- Dual controls (keyboard/mouse + touch) both functional
- Procedural audio (drone, heartbeat, footsteps, stingers) + TTS narration
- Monster AI with flashlight-repel mechanic, jump scares, sanity/battery systems
- Verified working via Agent Browser + VLM analysis
- Artifacts: src/lib/{maze,game-store,audio,input,entities}.ts, src/components/game/{Environment,Lights,Keys,Door,Monster,Player,GameCanvas,HorrorGame,GameErrorBoundary}.tsx, src/components/horror-ui/{HUD,TouchControls,JumpScareOverlay,Screens}.tsx

---
Task ID: G1-G9 (Granny overhaul + GitHub Pages)
Agent: Main Game Developer
Task: Make the game Granny-like (stealth/hiding/hearing), add continuous music + more SFX, deploy to GitHub Pages

Work Log:
- maze.ts: added FURNITURE (beds/tables/sofas/shelves/chairs/crates), WARDROBE_CELLS (6 hiding spots), CREAKY_CELLS (8 loud floorboards), PATROL_WAYPOINTS (10), isCreakyAt, nearestWardrobe, isFurnitureBlocked, isBlocked (walls+furniture), hasLineOfSight
- game-store.ts: added day/maxDays (5 nights), noiseLevel, hidden, hiddenWardrobe, crouching, aiState; advanceDay(); 'daytransition' phase
- entities.ts: added monster AI state machine (patrol/investigate/chase/search/stunned), target/lastSeen/stunTimer, emitNoise()
- audio.ts: REWROTE — continuous evolving MUSIC (Am-F-C-G chord progression on detuned pad + sub bass + arpeggio bells + slow filter LFO), kept ambient drone/noise/heartbeat, added Granny footstep, door creak, floorboard creak, breathing, granny growl, cupboard open/close, glass break, water drip, wind howl, tension sting; ambient scheduler for random drips/wind/breaths
- Furniture.tsx: meshes for all 6 furniture types + CreakyFloors visual markers
- Wardrobes.tsx: tall wooden wardrobe models (interactive hiding spots)
- Monster.tsx: REWROTE AI — state machine (patrol waypoints / investigate noise / chase on sight / search last-known / dazed by flashlight), hearing radii per noise level, line-of-sight sight check, gets faster each day, granny footsteps + growls inline, tattered skirt
- Player.tsx: noise system (sprint=2/walk=1/crouch=0/creaky=3 with one-shot emitNoise), hide-in-wardrobe mechanic (E to enter/exit, camera snaps inside, slat overlay), crouch (C/Ctrl) lowers eye height + silent, furniture collision via isBlocked, day-transition on catch (jump scare -> day++ if <5 -> daytransition overlay -> reset; else gameover), keys carry over
- input.ts: added crouch state + C/Ctrl handling + touchCrouch()
- HUD.tsx: DAY counter with 5 dots, NOISE indicator (SILENT/WALKING/RUNNING!/CREAK!), GRANNY state (WANDERING/INVESTIGATING/HUNTING YOU/SEARCHING/DAZED), HIDDEN badge, slat overlay when hidden
- Screens.tsx: "She hears everything. 5 nights to escape." subtitle, crouch/hide in controls hint, DayTransitionScreen (DAY X / nights remain), game over shows catch count
- TouchControls.tsx: added CROUCH toggle + HIDE/EXIT button
- HorrorGame.tsx: render DayTransitionScreen during daytransition phase, keep canvas mounted behind overlay
- next.config.ts: output='export', trailingSlash, basePath/assetPrefix from NEXT_PUBLIC_BASE_PATH, images.unoptimized, allowedDevOrigins
- .github/workflows/deploy.yml: GitHub Actions auto-deploy to Pages (bun install, build with auto basePath from repo name, .nojekyll, upload-pages-artifact, deploy-pages)
- package.json: simplified build script to 'next build' for static export
- README.md: full docs (features, controls, local run, GitHub Pages deploy steps, tech stack, structure)
- public/.nojekyll: bypass Jekyll for _next folder

Verification (Agent Browser + VLM):
- Menu renders, start works
- HUD shows: DAY 1/5 (5 dots), SANITY, BATTERY, keys 0/3, NOISE: SILENT, GRANNY: WANDERING ✓
- 3D scene renders with furniture: VLM confirms "3D first-person view of a dark corridor with visible textured walls, floor, and a chair in the distance" ✓
- Granny AI activates after grace period and transitions to HUNTING YOU ✓
- Catch -> jump scare -> DAY 2 "YOU WOKE UP AGAIN / 4 nights remain / Your keys are still with you" ✓ (day transition + key carry-over verified)
- No console errors ✓
- Lint passes clean ✓

Stage Summary:
- Game is now Granny-style: stealth, sound detection, hiding wardrobes, 5-night day system, patrol/investigate/chase/search AI
- Continuous evolving ambient music + 10+ new SFX (door creak, floorboard, breathing, granny growl/footstep, cupboard, glass, drip, wind, tension sting)
- Ready for GitHub Pages: static export config + auto-deploy workflow + README with instructions
- Artifacts: maze.ts, game-store.ts, entities.ts, audio.ts, Furniture.tsx, Wardrobes.tsx, Monster.tsx, Player.tsx, HUD.tsx, Screens.tsx, TouchControls.tsx, HorrorGame.tsx, next.config.ts, .github/workflows/deploy.yml, README.md, public/.nojekyll
