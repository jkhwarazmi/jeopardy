# Jeopardy Icebreaker

A real-time Jeopardy-style party game built for business events and icebreakers. The game board runs on a laptop (shared via Microsoft Teams screen share), the emcee controls everything from their phone, and players join on their phones with a selfie to buzz in real time. Built with Next.js (App Router) + TypeScript + Tailwind, with realtime gameplay powered by Firebase Firestore snapshots. No websocket server needed—fully deployable on Vercel.

## The Three Screens

| Route | Device | Purpose |
|-------|--------|---------|
| `/host/[gameId]` | Laptop (screen-shared) | Board display, questions, timers, sounds, winner celebration |
| `/admin/[gameId]` | Emcee's phone | Password-protected judge controls (open lobby, mark correct/wrong, adjust scores, kick players, Final Jeopardy, end game) |
| `/play/[gameId]` | Players' phones | Join with name + selfie, giant buzzer, wagers, final answers |

Additional routes: `/` (landing page), `/new` (create a game), `/join` (enter a join code to play).

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Game Content (JSON Config)

Games are defined by a JSON file that you upload or paste when creating a new game on the `/new` page. The app includes a built-in sample game that loads by default.

### Config Schema

```json
{
  "title": "Office Icebreaker Jeopardy",
  "boards": [
    {
      "pointValues": [100, 200, 300, 400],
      "categories": [
        {
          "name": "Corporate Jargon Decoded",
          "cells": [
            {
              "question": "Finding the intersection of ideas to achieve mutual gains",
              "answer": "Synergy"
            },
            {
              "question": "Let's reschedule a discussion for a later time to revisit this topic",
              "answer": "Circle back"
            },
            {
              "question": "Attempt an ambitious project with unclear outcomes or massive scope",
              "answer": "Boil the ocean"
            },
            {
              "question": "Improve a key metric or objective by taking decisive action",
              "answer": "Move the needle"
            }
          ]
        }
      ]
    }
  ],
  "final": {
    "category": "Company History",
    "question": "In what year did the founder of Microsoft drop out of Harvard to pursue his business venture?",
    "answer": "1975"
  },
  "timers": {
    "answerSeconds": 5,
    "buzzWindowSeconds": 10,
    "finalAnswerSeconds": 30
  }
}
```

### Required Fields

- **`title`** (string): Name of the game.
- **`boards[]`** (array): Each board has:
  - **`pointValues[]`** (array of numbers): The point values for each column (e.g., [100, 200, 300, 400]).
  - **`categories[]`** (array): Each category has:
    - **`name`** (string): Category title.
    - **`cells[]`** (array): Must have the same length as `pointValues`. Each cell has:
      - **`question`** (string): The clue.
      - **`answer`** (string): The correct response.
- **`final`** (object): Final Jeopardy round:
  - **`category`** (string): Category name.
  - **`question`** (string): The final clue.
  - **`answer`** (string): The correct response.
- **`timers`** (object, all optional with defaults below):
  - **`answerSeconds`** (number): Time to read the answer (default: 5).
  - **`buzzWindowSeconds`** (number): Time window for players to buzz (default: 10).
  - **`finalAnswerSeconds`** (number): Time for Final Jeopardy answers (default: 30).

## Sounds

The `public/sounds/` directory ships with 7 silent placeholder MP3 files:
- `buzz.mp3`
- `correct.mp3`
- `wrong.mp3`
- `timeup.mp3`
- `reveal.mp3`
- `final.mp3`
- `winner.mp3`

Replace these with real royalty-free audio clips (keep the same filenames). Sounds only play on the host screen after clicking "Enable Sound" (see the runbook below). See `public/sounds/README.md` for clip recommendations.

## Day-of-Event Runbook

### Setup (Before the Meeting)

1. Go to `<your-url>/new`, set an admin password, load your game JSON, and click **Create**. Save the three links it provides:
   - Host link (for the laptop screen share)
   - Admin link (for your phone)
   - Player join link (QR code or direct URL)

2. Open the **host link** on your laptop and leave it in the lobby screen (do not start the game yet).

3. Start the Teams meeting and **share the browser window** (select "window" to share, include computer sound if you have real sound files).

4. Click **Enable Sound** (top-right corner of the host screen).

### Playing the Game

5. Open the **admin link** on your phone and enter the admin password.

6. Players scan the QR code displayed on screen (or visit `/join` and type the big join code), enter their name, and take a selfie. They appear in the lobby live as they join.

7. When all players have joined:
   - On the admin phone, optionally click **Lock Lobby** to prevent late joins.
   - Click **Start Game** to begin play.

8. **Main round play loop:**
   - A highlighted player announces a category and dollar amount out loud.
   - You tap that cell on the **host laptop** (on first tap, you'll be prompted to enter the admin password).
   - Read the question aloud to all players.
   - Players buzz by tapping the big buzzer on their phones.
   - The first player to buzz gets to answer.
   - You judge on your **admin phone**: tap **Correct** or **Wrong**.
     - If correct: the buzzed player gets the points and picks next.
     - If wrong: that player is locked out; the buzzer reopens for other players. If nobody else buzzes or 10 seconds pass, the answer is revealed.

9. **Final Jeopardy:**
   - From the admin phone, tap **Start Wagers**.
   - All players secretly enter their wager.
   - Tap **Start Answer Round** to reveal the Final Jeopardy answer.
   - Players type their response (30 seconds).
   - Tap **Reveal** to show players one by one (lowest score first).
   - Judge each answer: **Correct** or **Wrong**.

10. After all Final Jeopardy answers are judged, click **End Game**. The winner celebration plays on the big screen.

### Troubleshooting

- **Refreshing is safe:** Refreshing the host or any player's phone is safe. Game state lives in Firestore, so players rejoin automatically on the same device.
- **Wrong admin password:** The admin phone will re-prompt you to enter the correct password.
- **Player left and wants to rejoin:** They can reopen their player link (same device) to rejoin seamlessly.
- **Joining mid-game:** New players can join unless the lobby is locked, though they start with 0 points.

## Tech Notes

- **Realtime:** Gameplay is powered by Firestore `onSnapshot` subscriptions on the game document and the players subcollection. All clients stay in sync automatically.
- **Timers:** Game timers are stored as wall-clock deadlines in Firestore (e.g., `timerEndsAt`). Clients render a countdown but never trust client-side intervals for game logic.
- **Buzzer logic:** If two or more players buzz within 150 ms of each other, the tie goes to the player with the lower score.
- **Server verification:** All privileged mutations (marking answers, adjusting scores, ending rounds) go through server API routes that verify the admin password hash using the Firebase Admin SDK. Players can only buzz, join, submit wagers, and submit final answers.

## Technology Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend:** Firebase Firestore, Firebase Authentication, Firebase Admin SDK
- **Deployment:** Vercel (recommended)
- **Real-time subscriptions:** Firestore `onSnapshot` (no websocket server)
- **Additional libraries:** Zod (validation), qrcode (QR generation), canvas-confetti (winner animation)

## License

This project is for internal use as an icebreaker game for business events.
