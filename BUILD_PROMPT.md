# BUILD PROMPT — Business-Event Jeopardy (paste this into Claude Code as your first message)

Read CLAUDE.md and this file fully before writing any code. You are the ARCHITECT for this build. Plan first (use plan mode), then delegate implementation to the project subagents in `.claude/agents/` per the delegation rules in CLAUDE.md. Do not implement large components yourself unless a subagent's output fails review twice.

## What we are building

A real-time, Jeopardy-style icebreaker game for a business event, in **this Next.js (App Router, TypeScript) starter project**, deployed to **Vercel**, with **Firebase (Firestore + Anonymous Auth)** as the realtime backend.

**Critical architecture constraint:** Vercel serverless cannot hold websocket connections. All realtime behavior MUST use the Firebase client SDK with Firestore `onSnapshot` listeners. Every client (board, admin, players) subscribes directly to Firestore. Vercel only serves the app. No custom websocket server, no polling loops.

## The three surfaces

1. **`/host/[gameId]` — Board screen (my laptop, screen-shared via Teams).**
   Presentation only, no controls except clicking a question cell to open it. Must be responsive and legible when compressed by Teams screen share (high contrast, large type, no tiny UI). Shows: start/lobby screen with join QR code + join code + rules/instructions; players appearing live with photo, name, and score (starting at 0); the classic Jeopardy board (categories across the top, point values in a grid, deep blue #060CE9-style aesthetic, gold/yellow accents, condensed serif for values — evoke the show without copying logos or using the real theme music); the open-question view with a countdown timer in the corner; who buzzed (photo pops in large + buzz sound); correct-answer reveal; whose turn it is to pick (name highlighted); Final Jeopardy flow; end-of-game winner animation featuring the winner's photo (confetti, zoom, crown — go big).

2. **`/admin/[gameId]` — Control panel (my phone).**
   Password-gated (simple password checked against the game doc; store only a salted hash). Mobile-first. Controls: start game, open/close lobby, mark buzzed answer **Correct / Incorrect**, skip/void a question, manually adjust any player's score, kick a player, re-open buzzing after a wrong answer (previous buzzer locked out for that question), advance to Final Jeopardy, reveal Final Jeopardy answers one player at a time, end game / trigger winner animation, reset game. Also shows a compact live scoreboard and current game state so I never need to look at the laptop to know what's happening.

3. **`/play/[gameId]` — Player phones (also works on laptops).**
   Join via QR or code → enter name → **take a selfie with the device camera** (getUserMedia; fallback to file upload; crop square, downscale to ≤256px, compress to JPEG base64 ≤ ~40KB, store inline in the player's Firestore doc — do NOT use Firebase Storage). Then: lobby wait screen; a giant full-screen **BUZZER** button when a question is live; locked/greyed states when they can't buzz (someone else buzzed, they answered wrong already, question closed); their own score; Final Jeopardy wager input (0 to their current score) and a text answer box with a submit deadline; winner/loser end screen.

## Game rules to implement exactly

- **Turn order:** the first player to join picks the first category/value. After that, whoever answers correctly picks next. If nobody answers correctly, the picker stays the same. The current picker's name is highlighted on the board and their phone says "You pick!" (picking still happens by ME clicking the cell on the laptop — the highlight is informational).
- **Buzzing:** when I click a cell, the question shows on the board and buzzers go live after a short anti-jump delay (~0.5s; buzzing early does nothing but is not penalized). First buzz wins, resolved by a **Firestore transaction** writing `buzzedPlayerId` with a `serverTimestamp`. **Tie-break rule: if two buzzes land within 150ms of each other (compare server timestamps recorded in a `buzzes` subcollection), the player with the LOWER current score wins the buzz.** Implement this as: all buzz attempts write to the subcollection; a transaction/first-writer sets the provisional winner; a 150ms settle window on the admin/board client re-resolves in favor of the lowest score before the answer timer starts.
- **Answering:** buzzed player has **5 seconds** to answer verbally (timer shown in the corner of the board and on their phone). I mark Correct (+points, answer reveals on the board, they become the picker) or Incorrect (−points, buzzing re-opens for everyone else, that player locked out of this question). If the timer expires, treat as Incorrect automatically. If nobody buzzes within a configurable window (default 10s), the answer reveals with no score change.
- **Final Jeopardy:** category revealed → all players with score > 0 enter wagers privately on their phones (0..score) → question revealed → players type answers on their phones with a 30s countdown → I reveal each player's answer and wager one at a time from the admin panel (classic dramatic order: lowest score first) and mark each correct/incorrect → scores update → winner animation.
- **Sounds:** play from `/public/sounds/` — `buzz.mp3`, `correct.mp3`, `wrong.mp3`, `timeup.mp3`, `reveal.mp3`, `final.mp3`, `winner.mp3`. Ship silent placeholder files and a `sounds/README.md` listing what each is for; I will drop in real mp3s. All sound plays on the BOARD client only (that's what Teams shares). Gate audio behind a "click to enable sound" interaction on the host screen to satisfy browser autoplay policy.

## Configurability

A game is created from `/new`: I set an admin password, and either paste/upload a **JSON game config** or use a form editor. Config schema: multiple boards (rounds), each with N categories × M point levels (defaults: 1 board, 5 categories × 4 levels at 100/200/300/400), each cell = `{question, answer}`, plus a Final Jeopardy `{category, question, answer}`, timers (answer seconds, buzz-window seconds), and point values per row. Include `sample-game.json` with **~10 minutes of business-icebreaker content** (5 categories × 4 questions + Final Jeopardy) on safe, fun office themes (e.g. "Corporate Jargon Decoded", "Famous Logos", "Email Etiquette or Crime?", "Office Movie Lines", "Tech or Star Trek?") — write original questions.

## Data model (Firestore) — implement this shape unless you have a strong reason to change it (document any deviation)

```
games/{gameId}:
  joinCode (6 chars, uppercase, unambiguous), adminPassHash, status:
    'lobby'|'playing'|'question_open'|'buzzed'|'answer_reveal'|'final_wager'|'final_answer'|'final_reveal'|'finished',
  config (embedded JSON), currentBoard, currentCell {cat,row} | null,
  currentPickerId, buzzedPlayerId | null, lockedOutIds: string[],
  usedCells: string[] ("board:cat:row"), timerEndsAt: Timestamp | null, createdAt
games/{gameId}/players/{playerId}:
  name, photoBase64, score, joinedAt, connected, finalWager|null, finalAnswer|null, finalRevealed, isKicked
games/{gameId}/buzzes/{autoId}:   // per-question, cleared on question close
  playerId, at: serverTimestamp, cellKey
```

All state transitions are driven by writes to `games/{gameId}`; every surface derives its entire UI from one `onSnapshot` of the game doc + one on the players collection. Timers are wall-clock based (`timerEndsAt`) so all screens agree — never rely on client `setInterval` counting for truth, only for display.

## Security & robustness (do not skip)

- Firebase Anonymous Auth for all clients; Firestore security rules: players may only create/update their own player doc (name/photo/wager/answer fields only, never `score`), anyone in the game may write to `buzzes` only while `status == 'question_open'`, and only the admin (custom claim is overkill — use a `adminToken` random secret stored in the game doc, checked via rules against a field the admin writes... if that's not cleanly expressible in rules, route admin mutations through a Next.js API route using the Firebase Admin SDK with the password, and lock direct client writes to game docs). Choose the simpler sound option and document it. Score changes must not be possible from a player client.
- Handle refresh/reconnect: player identity persists in localStorage (playerId + gameId); rejoining restores their session. Board and admin reconnect cleanly mid-question.
- Empty/edge states: 0 players, player joins mid-game (allowed, score 0), duplicate names (append number), question with all players locked out.
- QR code: generate client-side (e.g. `qrcode` npm package) pointing at the full join URL.

## Deliverables checklist (the reviewer will check against this)

- [ ] `/new`, `/host/[gameId]`, `/admin/[gameId]`, `/play/[gameId]` (+ `/join` landing that accepts a code)
- [ ] Firestore schema + security rules file (`firestore.rules`) + `firebase.json`
- [ ] Buzzer transaction with 150ms lower-score tie-break
- [ ] Wall-clock timers, 5s answer countdown visible on board corner + player phone
- [ ] Selfie capture → compressed base64 pipeline
- [ ] Full Final Jeopardy flow
- [ ] Winner animation with player photo
- [ ] `sample-game.json`, silent placeholder sounds + sounds README
- [ ] `README.md` with: Firebase project setup steps (enable Anonymous Auth, create Firestore, paste web config into `.env.local`), Vercel deploy steps (env vars), and a "day-of-event runbook" (open host on laptop → share in Teams → enable sound → open admin on phone → players scan QR)
- [ ] `npm run build` passes with zero TypeScript errors; no `any` in game-state code

## Working style

Plan the full architecture and file tree FIRST and show it to me for approval before any code. Then delegate in dependency order: schema/rules & Firebase lib → game-state hooks → the three surfaces in parallel → sounds/animations/polish → reviewer pass → fix cycle. Keep a running `PROGRESS.md` so a fresh session can resume. Ask me questions ONLY if something in this spec is contradictory; otherwise make the pragmatic choice and log it under "Decisions" in PROGRESS.md.
