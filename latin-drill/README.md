# Latin Drill

Daily Latin ending drills for the Level 2 test on "Pan et Syringa" (Tue Oct 13). Plain HTML, CSS and JavaScript. No install, no internet needed.

## Run it

- **Laptop:** double-click `index.html`.
- **Phone:** the folder has to be served as a web page, because most phone browsers will not open a local HTML file with its scripts. The easiest way is GitHub Pages: in the repo go to Settings, then Pages, choose this branch and the root folder, and open `.../latin-drill/` on your phone. Then use "Add to Home Screen".
- Progress (streak, weak spots) is saved in the browser on that device. Laptop and phone keep separate progress.

## What's inside

- **Today's set:** 15 questions mixed from every topic. Missed questions come back at the end of the set and again tomorrow. Trap items come up twice as often.
- **Quiz:** pick a topic and 10 or 20 questions.
- **Practice test:** Part 1 (passage, 15), Part 2 (general knowledge), Part 3 (translation with chunk chart and a self-check list). Optional 30 minute timer. "Drill my misses" puts misses into your next daily set.
- **Reference:** all tables, plus "Quiz me" mode that hides answers until you tap them.

## Fix a wrong form

See `data/README.md`. Short version: fix the table in `data/`, reload, and every question is fixed.
Things that look wrong in your notes are listed in `data/SUSPECTED_ERRORS.md`.

## Add general knowledge questions

Edit `data/general.js`. Copy a question, change it, and set `answer` to the position of the right choice (first = 0). Delete the `"placeholder": true` ones once you have your own.

## Checks

- `tools/check.html` (open in a browser) or `node tools/check.js`: checks that your tables agree with each other, every passage annotation matches the tables, and every generated question is consistent.
- `tools/sample.html`: 200 random questions with answers, to eyeball for mistakes.
