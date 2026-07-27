# CLAUDE.md — Project memory for the Jeopardy icebreaker app

## What this project is
Real-time Jeopardy-style game: board on a laptop (shared via Teams), admin control on the host's phone, players join on their phones with a selfie + name. Next.js App Router + TypeScript + Tailwind, deployed on Vercel, realtime via Firebase Firestore `onSnapshot` (NO websocket server — Vercel serverless can't hold sockets). Full spec: `BUILD_PROMPT.md`. Running state: `PROGRESS.md`.

## Role of the main session
The main session (Fable) is the ARCHITECT and ORCHESTRATOR. It plans, decomposes, delegates to subagents, integrates their output, and makes final decisions. It writes code directly only for: glue/integration, fixes after a failed review cycle, and anything touching the buzzer transaction or Firestore rules (correctness-critical — architect owns these).

## Delegation rules (token/cost discipline)
- `frontend-builder` (Sonnet): all UI pages/components, Tailwind, animations, sound wiring, QR/selfie UI.
- `firebase-backend` (Sonnet): Firebase lib, hooks (`useGame`, `usePlayers`, `useTimer`), data access, rules drafts, API routes.
- `scaffolder` (Haiku): mechanical work only — placeholder files, sample-game.json content entry, README boilerplate, config files, silent mp3 generation.
- `code-reviewer` (Opus, read-only): reviews after each milestone against the deliverables checklist in BUILD_PROMPT.md. Findings go back to the owning builder; architect arbitrates disagreements.
- One subagent per concern; give each a tight brief with exact file paths, the relevant slice of the spec, and the shared type definitions. Never paste the whole spec into a builder brief.
- Builders must NOT invent shared types. All shared game-state types live in `lib/types.ts`, authored by the architect first. Builders import from there.

## Conventions
- TypeScript strict; no `any` in game-state code. Zod-validate the game config JSON on import.
- All realtime state derives from two subscriptions: `games/{gameId}` doc + `players` subcollection. No component-local copies of authoritative state.
- Timers: authoritative deadline is `timerEndsAt` (Firestore Timestamp); clients render countdown from it. Never trust client intervals for game logic.
- Sounds play on the host/board client only, behind a user-gesture audio unlock.
- Mobile-first for `/play` and `/admin`; large-screen legibility (Teams screen-share compression) for `/host`.
- Jeopardy look: deep blue (#060CE9 family), gold accents, bold condensed values — evocative, but no real logos, trademarks, or the actual theme tune.
- Commit after each milestone with a conventional-commit message. Update `PROGRESS.md` (done / next / decisions) in the same commit.

## Milestones (build in this order)
1. Types + Firebase lib + Firestore rules + game creation (`/new`, `/join`)
2. Lobby: player join, selfie pipeline, QR, host lobby screen
3. Core loop: board, cell open, buzzer transaction + tie-break, timers, scoring, admin controls
4. Final Jeopardy flow
5. Polish: sounds, winner animation, reconnect handling, edge cases
6. Reviewer pass → fixes → `npm run build` clean → deploy docs

## Commands
- `npm run dev` — local dev
- `npm run build` — must pass before any milestone is "done"
- `npx firebase deploy --only firestore:rules` — after rules changes (user runs this; don't assume CLI is authed)
