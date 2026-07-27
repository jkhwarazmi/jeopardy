# PROGRESS.md — running build state

A fresh session should read CLAUDE.md → BUILD_PROMPT.md → this file, then resume at "Next".

## Done

- Architecture plan approved (see git history / this file's Decisions).
- **M1 complete** (`npm run build` clean):
  - `lib/types.ts` — all shared game-state types (architect-owned).
  - `firestore.rules` — client writes locked down; buzz-transaction exception (architect-owned).
  - `lib/firebase.ts` (client init + `ensureAnonymousAuth`), `lib/firebase-admin.ts` (lazy Admin SDK),
    `lib/config-schema.ts` (zod), `lib/join-code.ts`, `lib/password.ts` (scrypt).
  - `POST /api/games` (create, validated, hashed pw, unique join code) + `GET /api/games/lookup?code=`.
  - `firebase.json`, `firestore.indexes.json`, 7 silent mp3s + `public/sounds/README.md`, `sample-game.json`.
  - Deps added: `canvas-confetti`, `@types/canvas-confetti`, `@types/qrcode`.

- **M2 complete** (`npm run build` clean):
  - Hooks: `useGame`, `usePlayers` (kicked filtered, defensive sort), `useCountdown` (display-only), `usePlayerSession` (anon-uid identity, join w/ duplicate-name suffixing, presence via pagehide/visibility, localStorage rejoin memory).
  - `lib/selfie.ts` — square center-crop ≤256px JPEG, quality-stepped to ≤~40KB, EXIF-aware.
  - Pages: landing, `/new` (password + JSON paste/upload/sample + created-links panel), `/join`, `/play/[gameId]` (join flow → selfie → lobby wait; non-lobby placeholder), `/host/[gameId]` (lobby: QR, huge join code, rules, live player grid).
  - Components: `SelfieCapture` (getUserMedia + upload fallback), `PlayerStatus`, `PlayerAvatar`, `HostLobby`. Theme (deep blue/gold, Anton display font) in globals.css/layout.

## Next

- M3 Core loop:
  - Architect → `lib/buzz.ts` (client buzz transaction + buzzes record), `app/api/settle-buzz/route.ts` (150ms lower-score tie-break, idempotent), `app/api/admin/[gameId]/route.ts` (all AdminActions, scrypt-verified), `app/api/timer-expire/route.ts`.
  - firebase-backend → `lib/admin-api.ts` typed client wrappers.
  - frontend-builder → host Board/QuestionView/BuzzOverlay/TimerCorner/PlayerRail, play Buzzer + status states, admin panel (PasswordGate, Controls, LiveScoreboard).
- Then M4 (final), M5 (polish), M6 (review/build/docs).

## Decisions

1. **Admin auth:** all game-doc mutations (except the buzz transaction) go through
   `POST /api/admin/[gameId]` using the Firebase Admin SDK. Password verified
   server-side against an scrypt hash (`node:crypto`, no bcryptjs dep). Admin
   phone keeps the password in `sessionStorage`; sent with each action over HTTPS.
2. **Host cell-click auth:** `/host` prompts once for the same admin password
   (stored in `localStorage`) and calls the admin API for `open_cell` and
   timer-driven transitions. Board remains presentation-only otherwise.
3. **Buzz path:** clients write a `buzzes` record (serverTimestamp, rules-enforced)
   and concurrently run a Firestore transaction setting `buzzedPlayerId` if null
   (the single client-writable game-doc field, rules-enforced). The host client
   calls `POST /api/settle-buzz` ~250ms later; the route is **unauthenticated but
   deterministic + idempotent** (guarded by `buzzSettledCellKey`): it re-reads
   `buzzes`, applies the 150ms lower-score tie-break, writes the final winner,
   sets `status='buzzed'` and the 5s `timerEndsAt`.
4. **Timer expiries:** host client calls `POST /api/timer-expire`
   (`answer_timeout` → auto-incorrect, `buzz_window_timeout` → no-buzz reveal).
   Server verifies `timerEndsAt` has actually passed; idempotent. Final-answer
   deadline is enforced by rules (`request.time < timerEndsAt`), no route needed.
5. **playerId === anonymous-auth uid.** Firebase anonymous auth persists across
   refreshes, giving reconnect for free; localStorage additionally remembers
   `gameId` + name for the rejoin UX.
6. **Lobby open/close** = `lobbyLocked` boolean on the game doc, checked by rules
   on player create (joins otherwise allowed mid-game per spec).
7. **New deps:** `canvas-confetti` (+ types), `@types/qrcode`. Nothing else.
8. **Env:** Admin SDK requires `FIREBASE_SERVICE_ACCOUNT_KEY` (service-account
   JSON string) in `.env.local` / Vercel — user must add; documented in README.

## Known gaps / TODO for user

- Add `FIREBASE_SERVICE_ACCOUNT_KEY` to `.env.local` (service account JSON).
- Drop real mp3s into `public/sounds/` (placeholders are silent).
- Deploy rules: `npx firebase deploy --only firestore:rules`.
