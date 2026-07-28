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

- **M3 complete** (`npm run build` clean):
  - Architect: `lib/buzz.ts` (buzzes record + provisional transaction), `/api/admin/[gameId]` (full AdminAction switch in one Firestore transaction; buzzes pre-cleared before open_cell/mark_incorrect to avoid stale-record races), `/api/settle-buzz` (150ms lower-score tie-break, timestamp-window filtered, idempotent via buzzSettledCellKey, starts 5s answer timer), `/api/timer-expire` (deadline-guarded answer_timeout ≙ mark_incorrect, buzz_window_timeout → reveal), `lib/admin-api.ts`.
  - Host: Board grid, QuestionView (buzz overlay, answer reveal, BUZZERS OPEN indicator), TimerCorner, PlayerRail (picker highlight); host page holds admin pw (localStorage), fires settle (300ms + 1.5s retry) and timer-expire calls.
  - Admin: PasswordGate, contextual Controls (start/lock lobby, judge Correct/Wrong with answer visible, skip, continue, next board, Final entry point), LiveScoreboard (adjust ±, kick), danger zone (end/reset).
  - Play: Buzzer with armed/live/you/locked/out states (liveAt derived from timerEndsAt − buzzWindow; onPointerDown; haptics), pick-turn banner, answer_reveal/finished cards.
  - Architect integration fixes: Buzzer double-counted anti-jump delay + never flipped armed→live (no re-render tick) + showed uid instead of name — corrected.

- **M4 complete** (`npm run build` clean):
  - `lib/final-actions.ts` (architect): submitWager/submitFinalAnswer (rules enforce phase, 0..score, deadline).
  - Play: WagerForm (slider + 0/half/all-in, re-submittable, spectator card for score ≤ 0), FinalAnswerForm (30s countdown, pencils-down state, graceful deadline rejection), final_reveal result card.
  - Host: FinalRound — category reveal w/ wager-in badges (amounts hidden), question + timer, spotlight reveal (answer → wager → CORRECT/WRONG stamp), revealed strip; PlayerRail stays for live scores.
  - Admin: FinalControls — wager/answer visibility for the judge, lowest-score-first spotlight queue, CORRECT/WRONG ±wager, END GAME when all judged, zero-participant edge handled.

- **M5 complete** (`npm run build` clean):
  - `lib/hooks/useAudio.ts` — host-only, unlock() from user gesture primes 7 preloaded elements (muted-play autoplay dance); play() no-ops until unlocked, resets currentTime for rapid repeats.
  - Host sound wiring: single transition-observing effect w/ prev-state ref — buzz (null→uid), wrong (lockedOutIds grows; covers timeouts), timeup (question_open→reveal, no buzz), correct (buzzed→reveal, no lockout growth), reveal (playing→question_open), final (enter final_wager), winner (enter finished). Gold "Enable Sound" pill until unlocked.
  - `WinnerCelebration` (host finished): co-winner-aware, huge glowing photo + bobbing crown + zoom-in, canvas-confetti burst + 15s side cannons (cleanup on unmount), ranked standings w/ silver/bronze, 0-player fallback.
  - Play finished: YOU WON! gold card vs winner names + "You finished Nth of M". Admin finished: winner highlight + scrollable standings above danger zone.
  - Edge review: player reconnect via persistent anon uid + derived-only state; host reconnect re-arms settle (buzzSettledCellKey guard) and timer-expire (server deadline-guarded, idempotent — duplicate host tabs safe); start_game w/ 0 players → null picker, safe.

- **M6 complete** (`npm run build` clean) — SHIP:
  - code-reviewer full pass vs BUILD_PROMPT.md checklist: all deliverables ✅, zero blockers, verdict SHIP.
  - Fixed the one MAJOR finding: `serverTimestamp() as any` in `usePlayerSession.join` →
    `WithFieldValue<PlayerDoc>` (no cast; convention "no `any` in game-state code" now holds everywhere).
  - Reviewer's settle-buzz `timerEndsAt === null` flag assessed by architect: guard is correct
    (buzz-window deadline is always set during `question_open`; null ⇒ invalid phase ⇒ bail). No change.
  - console.error/warn in error paths deemed acceptable logging; left as-is.
  - README.md verified complete: three-screens table, Firebase one-time setup, env vars
    (incl. `FIREBASE_SERVICE_ACCOUNT_KEY`), rules deploy, Vercel deploy, config JSON schema,
    sounds, day-of runbook, troubleshooting, tech notes.

- **Post-ship user-testing fixes** (`npm run build` clean):
  - `next.config.ts`: `allowedDevOrigins: ["192.168.1.*"]` — Next 16 blocks cross-origin
    `/_next/*` dev assets, so pages loaded via the LAN IP never hydrated (dead buttons,
    native `GET /new?` form submits). Dev-only; localhost was always fine.
  - `SelfieCapture`: retake black-screen fixed — single camera-lifecycle effect keyed on
    `[mode, preview]` (effect-local stream, cleanup stops tracks; retake re-acquires);
    `stream` state removed. Added "Continue without photo" (`onCapture("")`) in camera,
    upload, and preview views — rules accept empty string, `PlayerAvatar` renders
    initials fallback, direct usages already guarded.
  - Profile editing: `usePlayerSession.updateProfile({name?, photoBase64?})` (name
    dedupe factored into `resolveName`, localStorage sync); `EditProfile` card on the
    lobby wait screen (rename, change/remove photo, reuses `SelfieCapture` w/ new
    `skipLabel`/`onCancel` props); preview view now offers Retake Photo / Upload
    Instead. Rules hardened: player-update path now re-validates name 1..30 and
    photo < 120KB (was create-only) — REDEPLOY RULES.
  - `/new` created panel: copy button beside the join code + player-link QR
    ("Scan to join", same `qrcode`/`toDataURL` recipe as HostLobby); Copied!
    feedback on all copy buttons w/ single timer ref cleared on unmount.
  - Bugfixes: `updateProfile` guard used falsiness so `photoBase64: ""` (photo
    removal) short-circuited without writing — now checks `=== undefined`.
    `SelfieCapture` tracks preview `source` ("camera"|"upload"); preview redo
    buttons now match origin (Retake Photo/Upload Instead vs Choose a Different
    Photo/Use Camera Instead).

- **Short URLs + host entry gate** (`npm run build` clean):
  - Join code is now the game **doc ID** (`gamesRef.doc(joinCode).create(...)`,
    race-safe via `create()`), so all URLs are `/host/QX3F2A`-style. `POST
    /api/games` returns `gameId === joinCode`. Lookup API: direct doc get with
    legacy `where("joinCode"==)` fallback for pre-change games.
  - New `{ type: "verify" }` AdminAction — no-op after the password check;
    POST handler fast-paths it before any transaction. Used to gate UIs.
  - `/host` now shows a **full-page password gate on entry** (like `/admin`):
    mount effect server-verifies the stored `localStorage` credential via
    `verify` (spinner while checking), gate form verifies before storing;
    lazy `showPasswordForm` overlay + cell-click prompt removed. Wrong
    password during play clears the credential and returns to the gate.
  - Host/admin/play pages uppercase-normalize the `[gameId]` slug so typed
    lowercase URLs work. README runbook updated (short slugs, host prompts
    on entry, no first-tap prompt).

- **Multi-question Final round + low-latency buzzer** (`npm run build` clean,
  code-reviewer pass, REDEPLOY RULES):
  - `FinalConfig` is now `{ questions[] (1–5), multipliers[], wagerFloor }`
    (zod upgrades the legacy single-question shape → 1 question, ×1, floor
    1000; default multipliers 1,2,3,…). `GameDoc.finalQuestionIndex` replaces
    `finalSpotlightId`; `PlayerDoc.finalRevealed` removed — finalWager/
    finalAnswer/finalCorrect are per-current-question, reset server-side.
  - Everyone wagers every final question: rules allow 0..max(wagerFloor, own
    score), so trailing players stay in. Judged answers move score by
    ±(wager × multiplier). `final_mark` applies the DIFF vs. what was already
    applied → re-marking (admin ↺ flip buttons, confirm-gated) is safe.
    New `next_final_question` action (final_reveal → final_wager, clears
    per-question fields, increments index). Timer defaults now 8s answer /
    15s buzz window.
  - Reveal spotlight is DERIVED, not stored: host + admin both order
    participants by preScore (score minus already-applied ±stake) asc,
    id tie-break; first unjudged is "up". Host holds a judged player with the
    CORRECT/WRONG stamp for 2.5s (local linger state; hooks at top level —
    fixed a builder Rules-of-Hooks violation) then advances; standings view
    when all judged. Admin gets UP NOW card + NEXT QUESTION / END GAME.
  - Buzz path (architect): client `runTransaction` → plain `updateDoc`
    (`buzzedPlayerId: uid`); rules already enforce first-writer-wins, and
    updateDoc gets latency-compensated local echo (transactions don't), so
    "YOU BUZZED" renders same-frame via optimistic `pendingBuzz` in Buzzer
    and is confirmed/corrected by the echo. Settle route unchanged as final
    authority. Reviewer BLOCKER fixed: per-attempt reset now keyed on
    `[cell, game.status]` (clears stale pendingBuzz; re-arms lost racers
    when a wrong answer reopens the window).
  - sample-game.json: 3 final questions, multipliers [1,2,3], floor 1000.
    README: final schema docs + runbook step 9 rewritten.

- **Legacy-doc normalization + graceful 404** (`npm run build` clean):
  - Crash fix: pre-multi-question game docs (old `config.final`
    `{category,question,answer}` shape, no `finalQuestionIndex`) blew up the
    new Final UI (`final.questions.length` TypeError in FinalControls).
    Added `normalizeGameDoc()` to `lib/types.ts` (architect) — upgrades
    legacy `config.final` → `{questions:[…], multipliers:[1], wagerFloor:1000}`
    and defaults `finalQuestionIndex` to 0, mirroring the zod creation-time
    upgrade for docs already stored. Wired at EVERY read boundary: `useGame`,
    admin route (applyAction + verify fast-path), settle-buzz, timer-expire.
    Invariant documented: never cast `snapshot.data()` to GameDoc directly.
  - Graceful 404: new themed `app/not-found.tsx` ($404 board-cell headline,
    gold "Go to homepage" button). Host/admin/play pages call `notFound()`
    when `gameError === "Game not found"`; other errors keep the red card,
    retitled "Something went wrong", now with a homepage link.

- **Modern restyle + UK localisation + review fixes** (`npm run build` clean,
  code-reviewer pass):
  - Full visual refresh across all 27 pages/components: design tokens +
    utility classes in `globals.css` (`card`, `card-gold`, `btn`/`btn-gold`/
    `btn-blue`/`btn-ghost`, `input`, `text-money`, `font-display` Anton +
    `font-clue` Merriweather), motion library (`fade-in`, `pop-in`, `rise-in`,
    `winner-zoom`, `crown-bob`, `gold-pulse`), Jeopardy deep-blue/gold palette.
  - New `lib/format.ts`: `money()`/`moneyDelta()` — the ONLY currency
    renderers (en-GB "£", proper minus sign) — plus `ordinal()`. Repo-wide
    sweep: zero `$`/hand-formatted currency remains (404 page's decorative
    "£404" headline included).
  - No user-visible icebreaker/business wording anywhere; players see a
    normal quiz game.
  - HostLobby "How to Play" rewritten: 6 accurate steps incl. multi-question
    Final (dynamic multipliers list, wagerFloor, losses also × multiplier —
    all verified against admin route + rules behavior).
  - Review-pass fixes: `fade-in` promoted to globals.css (FinalRound used
    `animate-fade-in` with no definition in scope — silent no-op; duplicated
    styled-jsx blocks in QuestionView/host page removed); off-palette grays →
    `bg-jeopardy-ink/10` skeleton, `bg-white/30` offline dot; finished-screen
    ordinal bug (11st/12nd/13rd) fixed via `ordinal()`.
  - Functional bug found in architect spot-check: WagerForm's "Change Wager"
    was a dead button (`isSubmitted` derived only from Firestore, form never
    reopened despite rules allowing re-submission). Fixed with local
    `editing` state, cleared on successful submit. Buzzer "locked" copy
    corrected ("If they get it wrong, you can buzz again").

- **Button size system** (`npm run build` clean):
  - Root cause of inconsistent button padding: `.btn` had NO padding — every
    call site rolled its own (`py-4 text-xl font-bold`, `px-3 py-1`, or
    nothing). `.btn` now carries default padding (0.75rem 1.25rem); new
    `.btn-sm` (chips/inline/row controls) and `.btn-lg` (hero CTAs) size
    modifiers. Convention (documented in globals.css): call sites never add
    their own padding/font-size/weight utilities — pick a size class.
  - All ~76 button call sites across 17 files normalized (frontend-builder
    sweep + architect pass on new/join/PasswordGate). Exempt by design:
    Buzzer circles, board cells, and tertiary text-link buttons (standard
    recipe `py-2 text-white/70 hover:text-white transition-colors text-sm`;
    danger-zone toggle is the red variant). Admin error-banner ✕ got a
    `p-2 -m-2` tap target + aria-label (was zero-padding).
  - All 7 `React.FormEvent` handler params typed as
    `React.FormEvent<HTMLFormElement>` (bare alias deprecated in current
    @types/react).

- **Untimed final-answer phase + fractional multipliers** (`npm run build` clean):
  - `timers.finalAnswerSeconds` is now `number | null`; null/omitted = no time
    limit (new default). `start_final_answer` sets `timerEndsAt: null` in that
    case — the host ends the phase via START REVEAL on the admin phone. Every
    consumer was already null-safe (firestore.rules line 106, FinalAnswerForm,
    FinalControls, TimerCorner); only copy tweaked: admin confirm shows plain
    "Confirm?" (not "Timer not expired") when untimed, and the player's
    submitted hint says "until the reveal starts".
  - `final.multipliers` may now be fractional (e.g. 1.5 — user edited
    sample-game.json to `[1, 1.5, 2]`, which previously failed the int check).
    New `finalStake(wager, multiplier)` in `lib/format.ts` (Math.round to
    whole pounds) is the ONLY stake computation — used by the admin route
    `final_mark` and all three client stake sites (FinalControls, FinalRound,
    play page) so server and UI always agree.
  - sample-game.json `finalAnswerSeconds: null`; README timers/multipliers
    docs updated. Schema behaviors verified via tsx script (sample parses;
    omitted field → null; omitted timers object → null; negative multiplier
    rejected).

- **Untimed buzz window (regular questions)** (`npm run build` clean):
  - What the user actually asked for ("I meant during the general questions
    where currently it's at 20s"): `timers.buzzWindowSeconds` is now
    `number | null`; null/omitted = no countdown and no auto-reveal (new
    default) — the question stays open until someone buzzes or the admin ends
    it. `answerSeconds` (post-buzz) stays timed.
  - New game-doc field `buzzLiveAt: Timestamp | null` — the armed→live moment
    (anti-jump already applied) was previously DERIVED as
    `timerEndsAt − buzzWindowSeconds×1000` in Buzzer, QuestionView, and
    settle-buzz's stale-record filter, which all broke when timerEndsAt is
    null. Now written by every buzz-window (re)open: admin route
    `buzzWindowFields()` (open_cell + wrong-answer reopen) and timer-expire's
    answer_timeout reopen; cleared (null) on every question end. All three
    readers use buzzLiveAt first with the legacy derivation as fallback for
    in-flight old docs (`normalizeGameDoc` defaults it to null).
  - settle-buzz: bail guard now `buzzLiveAt === null && timerEndsAt === null`
    (legacy-safe); filter base = buzzLiveAt ?? legacy derivation.
  - New admin action `reveal_answer` (question_open, no buzz → answer_reveal,
    cell marked used, no score change — the "nobody knows" ending, mirrors
    buzz_window_timeout). Confirm-gated gold "Reveal Answer" button in admin
    Controls above Skip; disabled once someone buzzes. Skip remains the
    void-without-showing-answer option. Host reveal copy "Time's up — nobody
    got it" → "Nobody got it" (true in both timed and untimed modes).
  - firestore.rules unchanged (buzz clauses never reference timerEndsAt) — no
    rules deploy needed. sample-game.json `buzzWindowSeconds: null`; README
    updated.

## Next

- Nothing — build complete. Remaining items are user-side (see Known gaps below).

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
