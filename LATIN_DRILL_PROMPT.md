# Prompt for Claude Code: Latin Daily Drill app (v2)

Paste everything below the line into Claude Code in an **empty folder**.

---

## Goal and deadline

Build me a small web app that drills Latin endings every day, Duolingo style but much simpler. I am a 9th grader. My Latin Level 2 test on the story "Pan et Syrringa" is on **Tuesday Oct 13**. A working daily drill must exist within the first hour, so build in stages and keep every stage working. If you have to cut something, cut polish, not correctness.

## How to work

- Before writing code, reply with a short plan: the file tree, the data file shapes, and how question generation works. Then start Stage 1 without waiting for me.
- After each stage: run the checks, fix every error, then tell me in 3 to 5 bullets exactly what to open and what to try.
- **Never silently fix my Latin data.** If something in my tables looks wrong, leave it, and list it in `data/SUSPECTED_ERRORS.md` with the line, what you think is right, and how sure you are. I will decide.
- If you add any Latin I did not give you (principal parts, extra forms, passage annotations), mark each entry with `"source": "claude"` so I know to check it against my notes.

## Hard rules

- One folder, plain HTML, CSS and vanilla JavaScript. No backend, no accounts, no build step, no CDN or external requests.
- It must work by **double clicking `index.html`** (a `file://` URL) and on my phone. Because browsers block `fetch()` on `file://`, **do not load data with `fetch` or put it in `.json` files**. Every data file is a `.js` file that sets a global, e.g. `window.LATIN_NOUNS = { ... };`, loaded with a plain `<script src>` tag. The content inside should still look like JSON so it is easy for me to edit.
- Save progress in `localStorage`, every read and write wrapped in try/catch. If storage fails, the app still runs (progress just does not save) and shows a small notice.
- All Latin lives in `data/`. **Every question and every correct answer is generated from the data tables.** Never hand-write an answer key in the code. Add `data/README.md` that explains, with one worked example, how to fix a wrong form.
- Show macrons (ā ē ī ō ū). Typed answers are accepted with or without macrons, in any capitalization, ignoring extra spaces. (Normalize with `str.normalize('NFD')` and strip combining marks, and also map any precomposed macron letters.)
- **Ambiguous forms:** many Latin forms have more than one correct parse (puellae = gen sg, dat sg, or nom pl; bellum = nom or acc sg). For "identify the form" questions, compute every parse the data allows and accept any of them. In multiple choice, never offer two options that are both correct. Show all valid parses in the feedback.
- Mobile first: readable font (at least 18px), tap targets at least 44px, one column on phones. Dark and light mode follow the system (`prefers-color-scheme`).
- No em dashes (—) in any text the app shows. Use commas, colons or periods.
- Keep the code readable: small files, plain names, short comments where the Latin logic is not obvious.

## What the real test looks like (from my teacher's slide)

1. **Multiple choice part 1, passage based.** A portion of the Pan story. Questions refer to specific words or phrases. Topics: the form and role of nouns and adjectives, the forms of verbs, translation of short phrases, vocab, plot.
2. **Multiple choice part 2, general knowledge.** Questions on information outside the story. Sometimes a vocabulary entry or a short sentence is given and questions are asked about it.
3. **Translation.** A segment of the Pan story is underlined and a chunk chart is provided. Only the English translation is graded; the chunks just show my thinking.

## File layout (suggested; keep it this simple)

```
index.html          app shell, all screens
css/style.css
js/normalize.js     macron-insensitive answer matching
js/generate.js      builds questions from data (pure functions, no DOM)
js/srs.js           Leitner boxes and weighting
js/storage.js       localStorage wrapper
js/app.js           screens and UI
data/*.js           all Latin content (see "Data" below)
data/README.md
data/SUSPECTED_ERRORS.md
tools/sample.html   prints 200 random questions with answers
tools/check.html    runs all self-checks, shows PASS/FAIL
tools/check.js      same checks from the command line: `node tools/check.js`
README.md
```

## Features

### 1. Home and streak
- Big daily streak counter, longest streak, and a 7 day dot row. A day counts when I finish the daily set. Days use my phone's local date. Missing a day resets the streak to 0.
- A countdown line: "N days until your test (Tue Oct 13)."
- One big "Start today's set" button. After finishing: a short celebration and "Come back tomorrow to keep your streak."
- A "Weak spots" list: the 5 items I miss most, each shown with the correct form. Tapping it starts a short drill of just those.

### 2. Daily set (15 questions, about 5 minutes)
Question types, all generated from data:
- **Identify the form:** show a Latin word; I pick tense, person, number (verbs) or case, number, gender (nouns and adjectives). Multiple choice.
- **Produce the form:** "3rd plural imperfect of vocō?" I type the answer.
- **Pick the ending:** `puell___ (accusative plural)`, choose or type the ending.
- **Agreement:** pick the adjective form that matches a given noun form.
- **Role:** a sentence from the Pan passage with one word highlighted. Either "Tap the subject / direct object" or "What is the role of the highlighted word?" (subject, direct object, possession, indirect object, means, place where, object of a preposition, etc.). Roles come from the annotated passage in `data/passage.js`, not from code.
- **Vocab:** Latin to English and English to Latin from the vocab list.

Scheduling (Leitner):
- Each item (a specific form or vocab word) lives in box 1 to 5. Correct moves it up one box, wrong sends it to box 1.
- Box 1 = again this session and tomorrow, box 2 = in 1 day, box 3 = in 2 days, box 4 = in 4 days, box 5 = mastered, shown only rarely.
- Fill the set with due items first, then new items. Items tagged as traps (see "Test traps") appear about 2x as often.
- A wrong answer is requeued at the end of the current set. The set is finished when all 15 are answered correctly at least once, or after 25 total attempts, whichever comes first.

Feedback after every answer: correct or not, the correct form (all valid answers if more than one), and a one line reason generated from the data, e.g. "-bā- marks the imperfect" or "-ērunt is perfect 3rd plural; -erint would be future perfect."

### 3. Quiz mode
Pick a topic (noun endings, adjectives, present/imperfect/future, perfect system, passive, imperatives, case uses, pronouns, vocab) and a length (10 or 20). At the end: score and a list of misses with the correct form. Quiz results also update the Leitner boxes.

### 4. Practice test (mirrors the real test)
Optional 30 minute timer (shown, but it does not lock me out when time is up). Three parts in order:
- **Part 1, 15 multiple choice questions from the passage.** Show the relevant sentence with the target word underlined. Mix: form and role of nouns and adjectives, verb forms (tense, person, number, meaning), short phrase translation, vocab, plot.
- **Part 2, general knowledge,** questions from `data/general.js`. Ship it with 8 clearly marked placeholder questions (`"placeholder": true`) about Pan, Diana, nymphs, satyrs and Arcadia. The app must read any number of questions, show up to 10, and skip none if fewer exist. Each question: `prompt`, optional `context` (a vocab entry or short sentence), `choices`, `answer` (index), optional `explanation`.
- **Part 3, translation.** Show the full passage with one segment underlined, picked at random from the 8 segments in `data/translation.js`. Below it, a chunk chart (the segment split into chunks, one text box per chunk for my notes). Then one big box for my English translation. On "Check": show the model translation of that segment and a checklist of key points for that segment (e.g. "Did you translate amābat as 'loved' or 'was loving' (imperfect)?", "Did you translate quamquam as 'although'?"). I tick the boxes myself. Do not auto-grade English. My score for Part 3 is the number of points I ticked.
- **End screen:** score per part, list of misses with correct answers, and a "Drill my misses" button that puts those items in Leitner box 1 so they show up in the next daily set.

### 5. Reference
A read-only page that renders all the tables straight from the data files (so fixing data fixes the reference). A "Quiz me" toggle blurs every answer cell until I tap it.

## Build order (each stage must run before moving on)

1. **Data + generator + checks.** Convert my data below into `data/*.js`. Write `generate.js`. Build `tools/sample.html` (200 random questions with answers so I can eyeball them) and `tools/check.html` + `tools/check.js`. Write `data/SUSPECTED_ERRORS.md`.
2. **Daily set** with streak, feedback and Leitner. *This is the "usable within an hour" stage.*
3. **Quiz mode.**
4. **Practice test.**
5. **Reference page and polish.**

## Self-checks (`tools/check.js` and `tools/check.html`)
These must all pass before you tell me a stage is done:
- Generate 1000 random questions; for each one, the stated correct answer equals the form built from the data tables.
- Forms built from the generic ending tables match the full model paradigms I typed (e.g. stem + perfect endings = my `perfect_model` for vocō; sum's imperfect = my `sum.imperfect`). Report every mismatch by name; these are likely typos in my notes.
- No multiple choice question has duplicate choices or more than one correct choice.
- Every word annotated in `data/passage.js` actually appears in the passage text.
- No user-facing string in the app or data contains an em dash.
- Answer matching: `vocabant`, `VOCĀBANT`, and ` vocābant ` all match `vocābant`.

## Done means
- I can open `index.html` by double clicking, do a daily set, see my streak go up, take a 10 question quiz, and take the full practice test, on a laptop and on my phone.
- `node tools/check.js` prints all PASS (and `tools/check.html` shows the same in a browser).
- `README.md` says, in under a page: how to run it, how to put it on my phone, how to fix a wrong form, and how to add general knowledge questions.

---

## Data (typed by a student, may contain errors)

### Test traps to weight heavily
- Perfect 3rd plural is -ērunt; future perfect 3rd plural is -erint.
- Pluperfect active endings look like the imperfect of sum (-eram); future perfect endings look like the future of sum (-erō), except 3rd plural -erint. Pluperfect passive = 4th principal part + imperfect of sum; future perfect passive = 4th principal part + future of sum.
- Neuter nominative and accusative are always the same, and neuter plural nom/acc ends in -a.
- Genitive singular: -ae (1st), -ī (2nd), -is (3rd).
- 2 termination 3rd declension adjectives: masculine and feminine share a form, neuter differs (fortis, forte).
- quamquam = although, tamen = nevertheless, -que = and (attached to the second word).
- nōnne expects yes, num expects no, -ne is neutral.
- Latin uses the accusative after fugere; English adds "from".

### Nouns (endings; stem is the genitive stem)

```json
{
  "decl1": {"model":"puella, puellae f.","stem":"puell","sg":{"nom":"a","gen":"ae","dat":"ae","acc":"am","abl":"ā"},"pl":{"nom":"ae","gen":"ārum","dat":"īs","acc":"ās","abl":"īs"}},
  "decl2m": {"model":"servus, servī m.","stem":"serv","sg":{"nom":"us","gen":"ī","dat":"ō","acc":"um","abl":"ō"},"pl":{"nom":"ī","gen":"ōrum","dat":"īs","acc":"ōs","abl":"īs"}},
  "decl2n": {"model":"bellum, bellī n.","stem":"bell","sg":{"nom":"um","gen":"ī","dat":"ō","acc":"um","abl":"ō"},"pl":{"nom":"a","gen":"ōrum","dat":"īs","acc":"a","abl":"īs"}},
  "decl3mf": {"model":"rēx, rēgis m.","stem":"rēg","sg":{"nom":"(rēx)","gen":"is","dat":"ī","acc":"em","abl":"e"},"pl":{"nom":"ēs","gen":"um","dat":"ibus","acc":"ēs","abl":"ibus"}},
  "decl3n": {"model":"corpus, corporis n.","stem":"corpor","sg":{"nom":"(corpus)","gen":"is","dat":"ī","acc":"(corpus)","abl":"e"},"pl":{"nom":"a","gen":"um","dat":"ibus","acc":"a","abl":"ibus"}}
}
```

Forms in parentheses are full irregular nominatives, not endings. Treat them as whole words. Also generate forms for the nouns in the passage vocab list (nympha, deus, silva, ager, rīpa, unda, fuga, fōrma, vīta, papyrus, bracchium, sonus, querella, concilium, cēra, fīstula, nōmen, vir, etc.) by assigning each to one of these patterns, tagged `"source": "claude"` where you had to supply the genitive or gender.

### Adjectives

```json
{
  "bonus": {"stem":"bon","sg":{"m":{"nom":"us","gen":"ī","dat":"ō","acc":"um","abl":"ō"},"f":{"nom":"a","gen":"ae","dat":"ae","acc":"am","abl":"ā"},"n":{"nom":"um","gen":"ī","dat":"ō","acc":"um","abl":"ō"}},"pl":{"m":{"nom":"ī","gen":"ōrum","dat":"īs","acc":"ōs","abl":"īs"},"f":{"nom":"ae","gen":"ārum","dat":"īs","acc":"ās","abl":"īs"},"n":{"nom":"a","gen":"ōrum","dat":"īs","acc":"a","abl":"īs"}}},
  "fortis": {"stem":"fort","sg":{"mf":{"nom":"is","gen":"is","dat":"ī","acc":"em","abl":"ī"},"n":{"nom":"e","gen":"is","dat":"ī","acc":"e","abl":"ī"}},"pl":{"mf":{"nom":"ēs","gen":"ium","dat":"ibus","acc":"ēs","abl":"ibus"},"n":{"nom":"ia","gen":"ium","dat":"ibus","acc":"ia","abl":"ibus"}}}
}
```

Types: 1st/2nd declension (bonus, bona, bonum); 3rd declension with 3 terminations (ācer, ācris, ācre), 2 terminations (fortis, forte), 1 termination (ingēns). Attributive = next to the noun, predicate = after a form of sum, substantive = acts as a noun. Passage adjectives to use for agreement questions: pulcher, umbrōsus, dēnsus, miser, benignus, cēterus, nūllus (note: nūllus has gen sg nūllīus and dat sg nūllī; tag that `"source": "claude"`).

### Verbs, active (person order: 1sg 2sg 3sg 1pl 2pl 3pl)

```json
{
  "present_endings": ["ō","s","t","mus","tis","nt"],
  "imperfect_endings": ["bam","bās","bat","bāmus","bātis","bant"],
  "future_12": ["bō","bis","bit","bimus","bitis","bunt"],
  "future_34": ["am","ēs","et","ēmus","ētis","ent"],
  "perfect_endings": ["ī","istī","it","imus","istis","ērunt"],
  "pluperfect_endings": ["eram","erās","erat","erāmus","erātis","erant"],
  "futureperfect_endings": ["erō","eris","erit","erimus","eritis","erint"],
  "conjugations": {
    "1": {"voco":"vocō, vocāre, vocāvī, vocātus","present":["vocō","vocās","vocat","vocāmus","vocātis","vocant"],"imperfect":["vocābam","vocābās","vocābat","vocābāmus","vocābātis","vocābant"],"future":["vocābō","vocābis","vocābit","vocābimus","vocābitis","vocābunt"]},
    "2": {"habeo":"habeō, habēre, habuī, habitus","present":["habeō","habēs","habet","habēmus","habētis","habent"],"imperfect":["habēbam","habēbās","habēbat","habēbāmus","habēbātis","habēbant"],"future":["habēbō","habēbis","habēbit","habēbimus","habēbitis","habēbunt"]},
    "3": {"rego":"regō, regere, rēxī, rēctus","present":["regō","regis","regit","regimus","regitis","regunt"],"imperfect":["regēbam","regēbās","regēbat","regēbāmus","regēbātis","regēbant"],"future":["regam","regēs","reget","regēmus","regētis","regent"]},
    "4": {"audio":"audiō, audīre, audīvī, audītus","present":["audiō","audīs","audit","audīmus","audītis","audiunt"],"imperfect":["audiēbam","audiēbās","audiēbat","audiēbāmus","audiēbātis","audiēbant"],"future":["audiam","audiēs","audiet","audiēmus","audiētis","audient"]}
  },
  "perfect_model": {"vocō":{"perfect":["vocāvī","vocāvistī","vocāvit","vocāvimus","vocāvistis","vocāvērunt"],"pluperfect":["vocāveram","vocāverās","vocāverat","vocāverāmus","vocāverātis","vocāverant"],"futureperfect":["vocāverō","vocāveris","vocāverit","vocāverimus","vocāveritis","vocāverint"]}},
  "sum": {"present":["sum","es","est","sumus","estis","sunt"],"imperfect":["eram","erās","erat","erāmus","erātis","erant"],"future":["erō","eris","erit","erimus","eritis","erunt"]},
  "possum_present": ["possum","potes","potest","possumus","potestis","possunt"]
}
```

Tense meanings for vocō: present I call, imperfect I was calling or used to call, future I will call, perfect I called, pluperfect I had called, future perfect I will have called.

To generate forms for passage verbs, store each passage verb with its principal parts and conjugation number (supply missing principal parts tagged `"source": "claude"`), then build forms from stems + endings. Watch the vowel rules: a long vowel shortens before final -t, -nt, and -m (vocat, vocant, not vocāt). For 3rd conjugation -iō verbs and 4th conjugation, use the model paradigms above as the pattern.

### Passive

```json
{
  "present": ["or","āris","ātur","āmur","āminī","antur"],
  "present_model": ["vocor","vocāris","vocātur","vocāmur","vocāminī","vocantur"],
  "imperfect_model": ["vocābar","vocābāris","vocābātur","vocābāmur","vocābāminī","vocābantur"],
  "future_model_12": ["vocābor","vocāberis","vocābitur","vocābimur","vocābiminī","vocābuntur"],
  "perfect_passive": "4th principal part + present of sum (vocātus sum)",
  "pluperfect_passive": "4th principal part + imperfect of sum (vocātus eram)",
  "futureperfect_passive": "4th principal part + future of sum (vocātus erō)",
  "agent": "ā or ab + ablative names the person who did the action"
}
```

Note: the `present` passive endings above include the 1st conjugation vowel ā. Only generate passive questions for 1st conjugation verbs unless you add tagged tables for the others.

### Imperatives and questions
Singular imperative: infinitive minus -re (vocā, habē, rege, audī). Plural: add -te (vocāte, habēte, regite, audīte). Irregular singular: dīc, dūc, fac, fer (plural dīcite, dūcite, facite, ferte). Negative commands: nōlī (one person) or nōlīte (several) plus the infinitive. Questions: -ne neutral, nōnne expects yes, num expects no.

### Pronouns
is, ea, id: accusative singular eum, eam, id; accusative plural eōs, eās, ea. mē = me, tē = you, tēcum = with you, sē = himself, herself, themselves (reflexive, refers back to the subject).

### Case uses (for the role questions)
Nominative: subject, predicate nominative, apposition. Genitive: possession, partitive, description, objective. Dative: indirect object (to or for), reference, possession, with certain adjectives. Accusative: direct object, motion toward with ad or trāns, object of fugere. Ablative: means (no preposition), manner (with cum), personal agent (ā or ab), place where (in + abl), place from which, accompaniment, separation, respect.

### The Pan passage (my class text; copy it exactly, do not correct spelling)

```
PĀN ET SYRINGA
Ōlim erat nympha pulchra. Nōmen nymphae erat Syrringa. In Arcadiā habitābat. Centum deī et satyrī Syrringam amābant, sed Syrringa eōs nōn amābat. Quamquam Syrringa nymphās cēterās et deam Diānam amābat, tamen deōs satyrōsque fugitābat. Sē in silvā umbrōsā et dēnsā cēlābat.
Syrringa dīxit, "Diānae vītam meam dēvovēbō. Nūllus vir, nūllus deus mē habēbit."
Deus Pān autem, dum in silvā errat, Syrringam videt et statim eam amat. Pān dīxit, "Aeternum tē amābō." Syrringa autem dīxit, "Aeternum nympha Diānae erō."
Deinde nympha misera trāns agrōs et per silvās celeriter fugitāt dōnec rīpam undārum spectat. Undae fugam prohibēbant. Syrringa auxilium nymphās sīc ōrat, "Fōrmam meam mūtāte, nymphae benignae." Nymphae eam in papyrōs in rīpā mūtant.
Pān autem putat sē Syrringam in bracchiīs tenēre; in bracchiīs nōn eam sed papyrōs habēbat. Dum miser Pān suspīrat trāns papyrōs, papyrī sonum querellae dant. Dēnique Pān dīxit, "Tēcum concilium habēbō. Syrringa manēbit." Et cērā septem papyrōs coniungit. Ita Pān fīstulam fōrmat, et fīstulae nōmen Syrringam dat.
```

Create `data/passage.js` that splits this into sentences and annotates every noun, adjective, pronoun and verb with: the word as written, dictionary form, part of speech, the parse (case/number/gender or tense/person/number/voice/mood), its role in the sentence, and a short English gloss. Tag all annotations `"source": "claude"`. Show the full annotation table on the Reference page so I can check it against my notes. Part 1 and Role questions are generated from this file.

### Model translation (use for the translation checks; keep it editable in `data/translation.js`)

```
Once there was a beautiful nymph. The nymph's name was Syrinx. She used to live in Arcadia. A hundred gods and satyrs loved Syrinx, but Syrinx did not love them. Although Syrinx loved the other nymphs and the goddess Diana, nevertheless she kept fleeing from the gods and satyrs. She hid herself in the shady and dense forest.
Syrinx said, "I will devote my life to Diana. No man, no god will have me."
The god Pan, however, while wandering in the forest, sees Syrinx and immediately loves her. Pan said, "I will love you forever." Syrinx, however, said, "I will forever be a nymph of Diana."
Then the wretched nymph flees swiftly across fields and through the woods until she sees the bank of the waters. The waves were blocking her escape. Syrinx begs the nymphs for help thus: "Change my form, kind nymphs." The nymphs change her into papyrus plants on the bank.
Pan, however, thinks that he holds Syrinx in his arms; in his arms he held not her, but papyrus. While wretched Pan sighs across the papyrus, the papyrus gives a sound of lamentation. At last Pan said, "I will hold a meeting with you. Syrinx will remain." And with wax he joins together seven papyrus plants. Thus Pan forms a pipe, and gives the name Syrinx to the pipe.
```

For `data/translation.js`: pick 8 segments of 1 to 2 sentences each that cover the hardest grammar (quamquam/tamen, -que, the reflexive sē, the future tenses, the imperative mūtāte, the indirect statement putat sē ... tenēre, ablative cērā, dōnec). For each segment store: the Latin, its chunks, the matching slice of the model translation, and 3 to 5 checklist points tied to specific words.

### Verbs in the passage with forms
Use for Part 1 verb questions and vocab: erat (imperfect of sum, was); habitābat (imperfect, used to live); amābant, amābat (imperfect); fugitābat (imperfect, kept fleeing); cēlābat (imperfect, was hiding); prohibēbant (imperfect, were blocking); habēbat (imperfect, was holding); dīxit (perfect, said); dēvovēbō (future, I will devote); habēbit and habēbō (future, will have, I will have); amābō (future, I will love); erō (future of sum); manēbit (future, will remain); errat, videt, amat, fugitāt, spectat, ōrat, mūtant, putat, suspīrat, dant, dat, coniungit, formāt (all present); mūtāte (imperative plural, change!); tenēre (infinitive, to hold).

### Vocab (I will add more later; make adding one a one-line edit)
ōlim once; nympha nymph; pulcher, pulchra, pulchrum beautiful; nōmen name; habitō live; centum a hundred; deus god; satyrus satyr; amō love; sed but; nōn not; quamquam although; cēterus the other, the rest; dea goddess; tamen nevertheless; fugitō keep fleeing; silva forest; umbrōsus shady; dēnsus dense; cēlō hide; dīcō say; vīta life; dēvoveō devote; nūllus no, none; vir man; habeō have, hold; autem however; dum while; errō wander; videō see; statim immediately; aeternum forever; deinde then; miser wretched; trāns across; ager field; celeriter swiftly; dōnec until; rīpa bank; unda wave; spectō look at, see; fuga escape; prohibeō block; auxilium help; ōrō beg; sīc thus; fōrma form; mūtō change; benignus kind; papyrus papyrus plant; putō think; bracchium arm; teneō hold; suspīrō sigh; sonus sound; querella complaint; dēnique at last; concilium meeting, council; maneō remain; cēra wax; septem seven; coniungō join together; ita thus; fīstula pipe; formō form; nōmen dō give a name.

Store each vocab entry with the full dictionary entry where you can (e.g. `nympha, nymphae, f.`), tagging anything you added as `"source": "claude"`. Vocab questions show the dictionary form.
