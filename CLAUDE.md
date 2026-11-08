# ellenial quiz — Project Guide

Read this first in every session. Swedish-language quiz app under **Ellenial**. Project notes and decisions also live in the claude.ai Project "Ellenial - Quiz Buddy" (`claude/projektbrief.md`).

## Infrastructure
- **Code:** GitHub `phoenixcyberpunk/ellenial-quiz` (public, AGPL-3.0).
- **Hosting:** Vercel team "The Ellenial Project" (`the-ellenial-project`), project `ellenial-quiz`, domain `quiz.ellenial.app`.
- **Live connection:** Supabase project `gillefeeling` (ref `knvrvmqdxvcatsrvkrgx`), **Realtime broadcast only**: no tables, no functions, no migrations. Channel `quiz:<roomId>`, event `m`, payload `{ b: "1." + base64url(iv‖ciphertext) }`. Requires Realtime public channels to be allowed in that project.
- **Stack:** plain HTML/CSS/JS, no build. `vendor/supabase.min.js` is supabase-js 2.118.0 bundled with esbuild (`export { createClient }`, IIFE, global `supabase`). `vendor/qrcode.js` is qrcode-generator 2.0.4.

## Decisions (2026-10-30)
- Own app at quiz.ellenial.app, not a Party games game: people who just want to quiz get an easier way in.
- Ready-made quizzes + "create your own". Since 8 Nov 2026 own quizzes are NEVER saved in the browser: they live only in the PDF the creator downloads (Ellen's 5 Nov decision). The PDF is drawn on this phone (canvas, A4 at 150 dpi, brand fonts, JPEG pages) and written by hand; the whole quiz rides along as one comment line `%EllenialQuiz:z.<deflate-raw base64url>` (same packing as the old share links). `readQuizPdf` reads only the first 512 KB and that line, then `unpackQuiz` → `cleanQuiz`. Both versions (with answers / team answer sheet) reopen. No new share links; old `/q#…` links still open (view `opened`, source `link`) with a nudge to download the PDF.
- Two modes: **shared screen** (teams, host taps teams that were right) and **phones** (each phone answers, scores automatic).
- Link principle like Split: `/join#<roomId 22>.<secret 43>`; secret only after `#`; HKDF → AES-GCM key, AAD `eq1|<roomId>`.
- Nothing stored server-side. Host holds state in memory; phones keep only `{pid, name}` in sessionStorage for reloads.
- Time per question optional: none / 30 / 60 / 90 s, one shared calm bar.
- Results: no last place. Team cards in entered order, "Flest rätt idag" on the top score; phones mode shows top 3 + total, each phone sees only its own score.
- Icon (8 Nov 2026): Ellen's drawing (a 1 X 2 slip with a green tick) centred on a pistachio `#E0E9C3` tile, no name (replaces the flower + name icon). Home-screen name "Quiz", tab title "Quiz · Ellenial", header shows a small "Ellenial" above "Quiz". Details: claude.ai Project "Ellenial - Brand identity - Master", doc `claude/ellenial-drawn-app-icons.md`.

## Brand (final, decided 2026-11-01 — don't reopen)
- Source of truth: the "Ellenial – Brand identity" doc (https://claude.ai/artifact/9Fng54MMZMyyKjkqKaVR7r). Applied everywhere in this app, no exceptions.
- Tokens live at the top of `styles.css`: Peach `#FEF2E2`, Card `#FFFBF5`, Lavender `#F1EAF8`, Periwinkle `#B7B1E6` (fill only, Night text on it), Indigo `#342E86`, Night `#1F1A2E`, Muted `#575166`, Line `#EDE1D1`. Dark: `#17141F` / `#221E2C` / `#2D2640` / Periwinkle `#463C6E` / accent `#B39AE8` (text on it `#1A1430`) / text `#F3EEF8` / muted `#C2BACF` / line `#332D40`.
- Fonts: Fraunces headings, DM Sans text (both self-hosted in `fonts/`, OFL). Instrument Sans is gone.
- Theme: `ellenial-theme.js` copied unchanged from ellenial maps, loaded in `<head>` before the CSS (key `eq:theme-pref`). Auto / Ljust / Mörkt switch in every top bar via `themeButton()`. Old v1 `eq:theme` is migrated once. Test with `?theme=light|dark`.
- Accessibility: text ≥ 4.5:1, controls ≥ 3:1 (`--edge` = Muted outline on everything tappable; Line is decorative only), never colour alone (✓ on right answers and awarded teams, words on results, underline + bold on selected segments). Wrong options on the shared screen step back with a transparent fill instead of fading the text.
- Team colours: Periwinkle / Lavender / Card in turn (teams are always named, colour is only a helper). Semantic green stays only for "right" and "connected".
- Quiz's tile colour (pistachio `#E0E9C3` since 8 Nov) lives only in the icon, not in the UI.

## Brand Principles applied
1. Worst day: no last place, gentle "Inte den här gången", no streaks, timer is calm and optional.
2. Art: Ellen's own flower; no AI art.
3. Pay myself: free, no ads, no tracking.
4. Data: nothing stored; phone messages encrypted end to end; explained in-app ("Så fungerar det").
5. Runs without me: static site, broadcast only, nothing to clean up.
6. Free and open: AGPL-3.0, public repo, costs stated.

## Print / save as PDF (2026-11-03)
- Ellen's reason: "I made a great quiz yesterday, I wish I could've downloaded it." Printing was chosen over a data file + import for now.
- View `print` (`openPrint(quiz, onBack)`), reached from: built-in quiz card ("Skriv ut"), print icon on each "Mina quiz" row, the editor ("Skriv ut eller spara som PDF") and the share-link import page.
- Two versions, last choice remembered in `eq:print`: **Med svar** (quizmaster: ✓ RÄTT SVAR, sort order as letters + words, "Visste du?") and **Svarsblad till lagen** (no answers, tick boxes, "Lag: ___", "Ordning: ___", "Antal rätt: ___ av N").
- Sort items on paper use a deterministic shuffle (`paperOrder`, seeded by number + prompt), never the right order, same every print, identical on both versions.
- **Creator decides** (Ellen, 2026-11-03): each sort question has "Så visas den när ni spelar" in the editor: **Blanda varje gång** (default; screen mixes fresh each game, paper uses `paperOrder`) or **Fast ordning** (`q.fixed`, permutation: `fixed[k]` = item shown as letter k; same on screen, phones and paper; starts from `paperOrder`, reorder with up/down; notice if it equals the answer order). Kept through share links; validated with `isPerm` in `cleanQuestion`. Question order and MC options are never shuffled anywhere.
- Uses the browser's print dialog (`window.print()`), so "Save as PDF" works everywhere and nothing leaves the device. The sheet is white paper in both themes; `@media print` hides the controls and forces `color-scheme: light`.
- Still open: keeping quizzes so they don't disappear (backup file + "open file", or something else).

## Protocol
- Phone → host: `{t:'hello', pid, name}` (repeated every 3 s until the host lists the pid), `{t:'answer', pid, i, a}`.
- Host → all: `{t:'state', phase, i, n, ids, got, locked, q?, rem?, reveal?, scores?, top?}` on every change + every 4 s; `{t:'end'}`.
- `q` never contains the answer; `reveal` only in phase `reveal`. Sort answers are letter positions; host shuffles items per question (`shown`).
- Host validates every phone message (pid format, current question, not locked, value shape). Limits: 80 players, 24-char names.

## Testing
- Local: serve the folder with `/join` and `/q` rewritten to `index.html`, open with `?local` → BroadcastChannel transport between tabs.
- 2026-11-01: Playwright + axe-core (Chrome at /usr/bin/google-chrome) through home, setup, shared-screen reveal ×3, phones mode lobby/join/answer/reveal, theme switch + migration, light and dark.
- Playwright click-through (2026-10-30): home, setup, phones mode with 2 phones through all 15 questions incl. sort/mc/tf + bonus, results, end; shared-screen mode with team awards; dark mode; editor, share link, import. No console errors.
- The workspace cannot reach supabase.co. Live test 2026-10-30 on quiz.ellenial.app in Ellen's desktop browser (two tabs): host connected ("Ansluten"), phone joined, sort answer arrived ("1 av 1 har svarat"), reveal showed "Rätt!" on the phone, Avsluta ended the phone too. No console errors. Realtime public channels are allowed.

## Open
- Phone screens have no h1 (axe best-practice `page-has-heading-one`, not a WCAG failure; same in Swedish and English). Fix with the next design pass.
- The top bar overflows by ~24 px on 320 px phones (theme switch + ?), before and after the language work.
- More ready-made quizzes.
- Test on real phones at work (Mon 2 Nov).
- Pentest of all Ellenial apps, run from its own project (decided 2026-10-30). For this app: public broadcast channel with the publishable key (encrypted, but floodable), headers/CSP. Library cards on ellenial.app stay unlinked during early alpha.

## PDF-only own quizzes + "?" help (8 Nov 2026)
- Mock-up approved by Ellen ("Build", 21:03): https://claude.ai/artifact/GsbQLLcnn9TXLtEANLQBJH
- Home: "Skapa eget quiz" + "Öppna ett quiz-PDF"; the "Mina quiz" list is gone. People who still have `eq:quizzes` see a one-time "Dina quiz flyttar till PDF" box: download them all, then "Klar, ta bort dem härifrån" (nothing removed until tapped).
- Editor: no autosave. "Spara ditt quiz" panel: Med svar / Svarsblad till lagen + "Ladda ner PDF" + "Se hur PDF:en ser ut". Leaving with an undownloaded change asks first ("Ladda ner quizet först?"), and `beforeunload` guards closing the tab.
- Print preview downloads the same PDF instead of opening the browser's print dialog.
- PDF pages = the drawn picture + an invisible Helvetica text layer (render mode 3, stretched with Tz to each drawn line), so the PDF can be searched, copied and read aloud (Ellen chose this, 8 Nov). `pdftotext` returns the full quiz incl. å ä ö.
- Shared "?" (`ellenial-help.js` + `.css`, copied unchanged from ellenial-bingo) in both head bars; "Mer om integritet" opens the privacy page except during a live game. Help follows the chosen language (`HELP[LANG]`).
- Tested (Playwright + axe, light and dark): move notice downloads 2 PDFs and clears storage only on tap; reopen keeps every field incl. explain and sort; edit → leave asks only when changed; answer sheet reopens; bad file note; old link opens; axe clean after fixing outline buttons on quiz cards (now text colour: Indigo on dark Periwinkle was 4.1:1).

## Languages (8 Nov 2026)
- Ellen: every Ellenial app in Swedish and English. Quiz is written in Swedish; `ellenial-lang.js` (loaded before app.js, not deferred) holds the English, keyed by the Swedish. Every visible text goes through `tx('Svensk text')`. New text = wrap it in `tx()` AND add the English there.
- Plurals that are the same in Swedish ('lag', 'spelare', 'quiz') use a second key ending in `#pl` (`tx('lag#pl')` → 'lag' / 'teams'); the suffix never shows.
- Language = `?lang=sv|en` (testing, not saved) → saved choice `eq:lang` → the phone's language (sv, nb, nn, no, da give Swedish). Every phone in a game reads its own language.
- The switch ("English" / "Svenska") sits at the bottom of the start page only (the top bar is full on small phones), because switching reloads the page: never during a game or while writing a quiz.
- Content is never translated: the built-in Vattendrag quiz stays Swedish and gets an "In Swedish" tag in English; own quizzes stay as written. PDF labels and the file name follow the language.
- Tested 8 Nov in Playwright: English phone through start, help, privacy, editor, print, PDF (and reopen), phones game (lobby, join, questions, answers, results on both) and shared-screen game. No Swedish left except content, axe 0 except the phone-h1 note above, no errors. The Swedish regression test (move notice, PDF, editor, leave dialog, old link, help) passes unchanged.

## Status
- 2026-11-03 13:52: Print / save as PDF + sort display order shipped from `staging` to `main` / quiz.ellenial.app on Ellen's yes ("Good, push"). Previous production (25c7a5a) stays in Vercel for rollback.
- 2026-11-03: Sort questions: creator picks mixed or fixed display order (staging). Tested editor, paper and two shared-screen games: fixed order matches everywhere; axe clean in both themes.
- 2026-11-03: Print / save as PDF built on branch `staging` (not yet on `main`). Playwright + axe in light and dark, phone width: no violations, no console errors; PDFs checked through print media in both themes.
- 2026-11-01: Brand update (palette incl. Periwinkle, DM Sans, Auto/Ljust/Mörkt, accessibility rules) reviewed on branch `staging`, then shipped to `main` / quiz.ellenial.app the same evening on Ellen's yes. Playwright + axe in both themes, phone and 1366×768: no contrast violations, all controls ≥ 3:1, no console errors.
- 2026-10-30: v1 built, tested locally (Playwright) and live, deployed to quiz.ellenial.app (Vercel project `ellenial-quiz`, auto-deploys from `main`).
- 2026-10-30 evening: Ellen's own test round worked. Listed in the ellenial.app library as "Early alpha" (icon `site/icons/quiz.png` in the ellenial repo).
- 2026-11-08: English added on branch `i18n` (preview); Ellen said go 8 Nov 22:01 with no changes, merged to `main` and live.
