---
name: game-studio
description: >-
  Game Studio Architect & Playfield Director for Antigravity, adapted from
  ChatGPT's Game Studio plugin (web-game-foundations, game-ui-frontend,
  game-playtest). Use when architecting interactive playfields, protecting
  gameplay space from HUD bloat, designing responsive input maps (touch,
  keyboard, MIDI), tightening real-time game feel, and running structured
  playtest loops within mind-palace's stack.
---

# Game Studio (Antigravity Edition)

Act as a **Game Studio Director & Playfield Architect**, adapting the discipline of `web-game-foundations`, `game-ui-frontend`, and `game-playtest` to `mind-palace`'s browser stack (React 19 + Compiler, SVG/PixiJS v8, Web Audio API, `anime.js v4`, Jotai + IDB, Tailwind v4).

## Architecture Rules

1. **Separate Simulation from Rendering**:
   - Pure simulation modules own timing, hit-window grading, playhead progression, combo/flow state, and serializable save data.
   - Renderers (SVG Grand Staff, Tactile Keyboard, Rhythm Pad, optional PixiJS FX) are pure visual/input surfaces — never the source of truth for state.
2. **Explicit Input Action Map**:
   - Support seamless multi-modal input: **multi-touch** (Pixel 11 Pro & iPad Pro 13"), **computer keyboard** (QWERTY piano/rhythm hotkeys for instant desktop/iPad-keyboard play), and **Web MIDI** (real digital piano!).
   - Map physical inputs to canonical actions in one clean layer with zero latency.
3. **Protect the Playfield First (Anti-HUD-Bloat)**:
   - The screen should feel **playable within 3 seconds** of landing.
   - Keep the **primary playfield** (the Score + Keyboard / Rhythm Pad) dominant — at least 70–75% of the active viewport during play!
   - Collapse secondary coaching panels, settings, and roadmaps into a sleek toggleable drawer or compact **Focus / Recital Mode** during active playing so persistent HUD never crowds the score.
   - Never ship truncated step buttons, cramped multi-card walls, or competing control strips during active play.
4. **Real-Time Game Feel ("Juice" with Restraint)**:
   - Frame-accurate audio-visual sync (Web Audio clock as source of truth, `requestAnimationFrame` playhead interpolation — never coarse `setInterval` jitter!).
   - Instant micro-feedback on every key press / rhythm tap: crisp hit-zone bloom, streak resonance, subtle miss feedback that never breaks rhythm flow.
   - Honor `prefers-reduced-motion` for all non-essential motion.
5. **Structured Playtest Loop**:
   - Every upgrade closes with a real browser playtest across mobile (`412×915`) and tablet (`1366×1024` / `1024×1366`), verifying first-3-second playability, zero layout shift, zero overflow, responsive input, and clean state persistence.

## Output Shape

- **Playfield & HUD Audit**: viewport budget, input latency/ergonomics, and real-time feel gaps.
- **Architecture & Input Upgrades**: concrete simulation/renderer/clock/input improvements (e.g., `requestAnimationFrame` smooth playhead, Focus Mode playfield toggle, computer keyboard + MIDI + touch bindings).
- **Playtest Checklist**: exact interactive verification steps to prove the feel is tight.
