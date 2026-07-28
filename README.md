# Jeopardy Icebreaker

A real-time Jeopardy-style party game built for business events and icebreakers. The game board runs on a laptop (shared via Microsoft Teams screen share), the emcee controls everything from their phone, and players join on their phones with a selfie to buzz in real time. Built with Next.js (App Router) + TypeScript + Tailwind, with realtime gameplay powered by Firebase Firestore snapshots. No websocket server needed—fully deployable on Vercel.

## The Three Screens

| Route | Device | Purpose |
|-------|--------|---------|
| `/host/[gameId]` | Laptop (screen-shared) | Board display, questions, timers, sounds, winner celebration |
| `/admin/[gameId]` | Emcee's phone | Password-protected judge controls (open lobby, mark correct/wrong, adjust scores, kick players, Final Jeopardy, end game) |
| `/play/[gameId]` | Players' phones | Join with name + selfie, giant buzzer, wagers, final answers |

Additional routes: `/` (landing page), `/new` (create a game), `/join` (enter a join code to play).

## Prerequisites

- **Node 20+**
- **Firebase project** (free Spark plan works)
- **Vercel account** (optional, for deployment)

## Firebase Setup (One-Time)

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. Go to **Build** → **Firestore Database** → **Create database** (select production mode, any region).
3. Go to **Build** → **Authentication** → **Sign-in method** → enable **Anonymous**.
4. Go to **Project settings** → **General** → **Your apps** → add a **Web app**; copy the config values (API key, auth domain, project ID, app ID).
5. Go to **Project settings** → **Service accounts** → **Generate new private key** (downloads a JSON file)—this is needed for the server API routes.

## Environment Variables

Create a `.env.local` file in the project root with these five variables:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
```

For the service account key: copy the entire JSON from step 5 (Firebase setup), paste it as one line in single quotes, and assign it to `FIREBASE_SERVICE_ACCOUNT_KEY`.

Later, when deploying to Vercel, add these same variables in **Settings** → **Environment Variables**.

## Deploy Firestore Security Rules

After cloning the repo, deploy the Firestore security rules (they lock scores and game state so only the server can modify them):

```bash
npx firebase login
npx firebase use <your-project-id>
npx firebase deploy --only firestore:rules
```

Security rules live in `firestore.rules`. Redeploy this file whenever you modify it.

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deploy to Vercel

1. Push the repository to GitHub.
2. Import the repo into Vercel ([vercel.com](https://vercel.com)).
3. Add all five environment variables in **Settings** → **Environment Variables** (paste `FIREBASE_SERVICE_ACCOUNT_KEY` exactly as-is, in single quotes).
4. Deploy. Share the public URL with players before the event starts.

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
    "questions": [
      {
        "category": "Company History",
        "question": "In what year did the founder of Microsoft drop out of Harvard to pursue his business venture?",
        "answer": "1975"
      },
      {
        "category": "Office Firsts",
        "question": "This everyday office fixture was invented in 1849...",
        "answer": "The paper clip"
      }
    ],
    "multipliers": [1, 2],
    "wagerFloor": 1000
  },
  "timers": {
    "answerSeconds": 8,
    "buzzWindowSeconds": 15,
    "finalAnswerSeconds": null
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
- **`final`** (object): Final round — one or more questions with rising stakes:
  - **`questions[]`** (array, 1–5): Each has `category`, `question`, `answer`. Played in order.
  - **`multipliers[]`** (array of positive numbers, optional): Stake multiplier per question — a judged answer moves the player's score by ±(wager × multiplier), rounded to the nearest whole pound. Fractional values like 1.5 are fine. Must match `questions` length. Defaults to 1, 2, 3, …
  - **`wagerFloor`** (number, optional, default 1000): Every player may wager at least this much regardless of score, so trailing players stay in the game. Leaders may wager up to their score.
  - The legacy single-question shape (`{ "category", "question", "answer" }`) is still accepted and upgraded to a one-question round with multiplier ×1.
- **`timers`** (object, all optional with defaults below):
  - **`answerSeconds`** (number): Time to answer after buzzing (default: 8).
  - **`buzzWindowSeconds`** (number): Time window for players to buzz, including reading the clue aloud (default: 15).
  - **`finalAnswerSeconds`** (number or null): Time to type each final answer. `null` or omitted = no time limit — players can answer until the host taps "Start Reveal" on the admin phone (default: null).

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

   All three URLs use the 6-character join code as the slug (e.g. `/host/QX3F2A`), so they're easy to retype from memory. Host and admin surfaces still require the password.

2. Open the **host link** on your laptop and enter the admin password when prompted, then leave it in the lobby screen (do not start the game yet).

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
   - You tap that cell on the **host laptop**.
   - Read the question aloud to all players.
   - Players buzz by tapping the big buzzer on their phones.
   - The first player to buzz gets to answer.
   - You judge on your **admin phone**: tap **Correct** or **Wrong**.
     - If correct: the buzzed player gets the points and picks next.
     - If wrong: that player is locked out; the buzzer reopens for other players. If nobody else buzzes or 10 seconds pass, the answer is revealed.

9. **Final round** (repeats once per final question, with rising stakes):
   - From the admin phone, tap **Start Final Round** (or **Next Question** after the first).
   - Every player secretly enters a wager — everyone may wager at least the wager floor ($1000 by default), so nobody is out of it.
   - Tap **Reveal Question**; players type their response (30 seconds).
   - Tap **Start Reveal**. The big screen spotlights players automatically, lowest score first; judge each answer **Correct** or **Wrong** on the admin phone (scores move by ±wager × that question's multiplier). Misjudged? Tap the small ↺ flip button on that player's row.

10. After the last final question is judged, tap **End Game**. The winner celebration plays on the big screen.

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
