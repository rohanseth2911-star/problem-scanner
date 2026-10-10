# How to fix the Latin data

Every question and answer in the app is built from the files in this folder. Fix a table here and every question that uses it is fixed too, including the Reference page.

The files are `.js`, not `.json`, so the app works when you double-click `index.html`. Inside, they look like JSON: keep the quotes, commas and brackets exactly as they are.

| File | What is in it |
|---|---|
| `nouns.js` | noun ending tables + the nouns the app quizzes |
| `adjectives.js` | adjective tables + adjectives |
| `verbs.js` | verb endings, model verbs, sum/possum, passive, passage verbs |
| `other.js` | imperatives, questions (nōnne/num), pronouns, case uses, **test traps** |
| `vocab.js` | vocab list |
| `passage.js` | the Pan passage, word-by-word annotations, plot and phrase questions |
| `translation.js` | model translation + the 8 Part 3 segments and checklists |
| `general.js` | Part 2 general knowledge questions |
| `settings.js` | test date, daily set size |

## Worked example: fixing a wrong form

Say the app shows **puellīs** as the ablative plural and your teacher says it is right, but it shows **puellā** as the dative singular, which is wrong.

1. The dative singular comes from the 1st declension ending table. Open `nouns.js` and find the `"decl1"` line.
2. Look at `"sg":{... "dat":"ā" ...}`. That is the typo. Change it to `"dat":"ae"`.
3. Save. Reload the app. Every 1st declension dative singular is now fixed.
4. Run the checks to confirm nothing else broke: open `tools/check.html`, or run `node tools/check.js`.

If only **one word** is irregular (e.g. dea has deābus), don't change the table. Add an override to that word instead:
`"overrides":{"pl dat":"deābus","pl abl":"deābus"}`

## Adding things

- **A vocab word:** copy a line in `vocab.js` and change it. `{"la":"ōlim","en":"once","pos":"adv"},`
- **A verb:** copy a line in `verbs.js` "words", give its 4 principal parts and conjugation number.
- **A general knowledge question:** see `general.js`. `answer` is the position of the right choice, counting from 0.
- **A trap to weight more:** traps are in `other.js`. Questions tagged with a trap's id come up about twice as often.

Anything marked `"source": "claude"` was added by Claude, not from your notes. See `SUSPECTED_ERRORS.md`.
