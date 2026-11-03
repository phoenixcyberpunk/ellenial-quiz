# quiz, by Ellenial

A free quiz to play together: on one shared screen (TV or projector), or with everyone answering on their own phone. Ready-made quizzes, or make your own and share it as a link.

Play at **https://quiz.ellenial.app**

Part of [Ellenial](https://ellenial.app): free tools made by people, for people. No account, no ads, nothing tracked.

## How private is it?

- **Shared screen:** everything happens in that browser. Nothing is sent anywhere.
- **With phones:** phones talk to the shared screen through Supabase Realtime *broadcast*. Messages only pass through; there is no table and nothing is stored. Every message is encrypted on the device (AES-GCM, key derived with HKDF from a random secret). The secret only lives in the join link after `#`, which browsers never send to a server, so not even Supabase can read names or answers.
- When the quiz ends or the tab closes, names, answers and scores are gone.
- **Own quizzes** are saved only in that browser. A share link carries the whole quiz after `#` (compressed), so it never reaches a server either.

## How it works

- A plain web app: HTML, CSS and JavaScript, no build step, no framework (same approach as Party games).
- The shared screen is the "host": it holds the quiz, the answers and the scores in memory and broadcasts the current state every few seconds and on every change. Phones only send `hello` (name) and `answer`. The correct answer is never sent before it is revealed.
- Timer per question: none, 30, 60 or 90 seconds, shown as one calm bar everyone sees.
- Results never show a "last place": teams all show with their score, and on phones everyone only sees their own result.

| Path | What it is |
| --- | --- |
| `index.html`, `styles.css`, `app.js` | The app |
| `quizzes/*.json` | Ready-made quizzes (Swedish) |
| `vendor/` | supabase-js (bundled to one file) and qrcode-generator, both MIT, served from this site |
| `fonts/`, `icons/` | Self-hosted fonts with their licences; the app icon (Ellen's flower) |

### Quiz format

```json
{ "name": "Vattendrag", "intro": "…",
  "questions": [
    { "type": "mc", "prompt": "…", "options": ["A", "B", "C"], "answer": 0, "explain": "…" },
    { "type": "tf", "prompt": "…", "answer": false },
    { "type": "sort", "prompt": "Sortera …", "items": ["first", "…", "last"], "notes": ["…"], "visual": "grow" }
  ],
  "bonus": { "name": "…", "intro": "…", "questions": [] } }
```

## Run it locally

Any static server that sends `/join` and `/q` to `index.html`. For testing without Supabase, add `?local` on localhost: tabs then talk through `BroadcastChannel` instead.

## Running cost

A static site on Vercel's free tier plus Supabase's free tier (shared with my other apps). Close to zero, stated openly as all Ellenial apps do.

## Credits

- Product, design and the flower: Ellen Nilsson. Code: written with Claude.
- Facts for the waterways bonus round: [SMHI, Sveriges största vattendrag](https://www.smhi.se/kunskapsbanken/hydrologi/sveriges-vattendrag/sveriges-storsta-vattendrag).
- Fonts: Fraunces (The Fraunces Project Authors) and DM Sans (The DM Sans Project Authors), SIL OFL 1.1, self-hosted in `fonts/`.
- [supabase-js](https://github.com/supabase/supabase-js) (MIT), [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) by Kazuhiko Arase (MIT).

## Licence

AGPL-3.0-only, the same as the Ellenial site. See `LICENSE`.
