# Suspected errors in the data

I did not change your Latin. Each item says what looks wrong, what I think is right, and how sure I am. You decide, and fix it in the file named.

## Found by the checks (`node tools/check.js` shows these as DATA)

1. **`fugitāt` should probably be `fugitat`** (passage text in `passage.js`, and the verb list in your notes).
   A long vowel becomes short before a final -t, so 1st conjugation 3rd singular is -at (vocat, amat, spectat). Your passage already has the short a in every other -at verb.
   *Confidence: high on the rule. Check against how your textbook prints this line.*

## Found by reading

2. **`formāt` in your verb list and `formō` in your vocab.** The passage has `fōrmat` (long ō, short a). I believe fōrma and fōrmō both have a long ō. The app uses `fōrmō` for building verb forms; your vocab line still says `formō`.
   *Confidence: medium-high. I have not checked a dictionary.* Fix in `vocab.js`.
3. **"Syrringa" (two r's) in the text, "SYRINGA" in the title.** I left both exactly as typed. Ask your teacher which spelling the test uses.
4. **Passive "present" endings (`or, āris, ātur...`)** contain the 1st conjugation ā, so they only work for 1st conjugation verbs. The app only makes passive questions for 1st conjugation. *Confidence: high.*
5. **Imperative plural rule.** Your note says "Plural: add -te", but regō → regite, not regete. I reworded the rule in `other.js` to say 3rd conjugation changes -e- to -i-. *Confidence: high.* Change it back if your teacher words it differently.

## Things Claude added (marked `"source": "claude"`): please spot-check

- Genitives and genders for the passage nouns (`nouns.js`). In particular, **papyrus is feminine** even though it is 2nd declension. I believe that is right but have not verified it.
- **dea has deābus** in the dative and ablative plural (an override in `nouns.js`).
- **nūllus has nūllīus / nūllī** in the genitive and dative singular (an override in `adjectives.js`).
- Principal parts for every passage verb (`verbs.js`), e.g. videō, vidēre, vīdī, vīsus; teneō, tenēre, tenuī, tentus; dō, dare, dedī, datus (with short a: damus, dabam).
- The full is, ea, id table (`other.js`). Your notes only had the accusatives.
- **Every word annotation in `passage.js`** (form, role, meaning). Two judgment calls: `querellae` marked "description (genitive)" (sound *of complaint*), and in "Deus Pān" I marked Pān as subject and Deus as apposition. Your teacher may label these differently.
- Plot questions, phrase-translation traps, translation checklists and the 8 placeholder general knowledge questions.
