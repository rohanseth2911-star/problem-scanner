# Suspected errors in the data

I did not change your Latin. Each item says what looks wrong, what I think is right, and how sure I am. You decide, and fix it in the file named.

## Resolved from the printed handout (photo, Oct 11)

- `fugitāt` was a typo: the handout prints **fugitat** (short a). Fixed.
- The name is **Syringa** (one r) everywhere. Fixed in every file.
- Line 7 prints **Deus Pan autem** (no macron on that Pan). Copied as printed.
- Footnote 4 ("Accusative, the name Syrinx") confirms *Syringam* is in apposition to *nōmen*. Your margin notes ("indirect statement" on *putat sē ... tenēre*, "gen" on *querellae*) match the annotations.

## Still open

1. **formō vs fōrmō.** The handout prints *fōrmat* (long ō). Your vocab line says `formō`; I believe it should be `fōrmō`. Fix in `vocab.js` if you agree.
2. **benignae / fistula.** In the photo, *benīgnae* (line 12) may have a macron on the i, and *fistulam / fistulae* (lines 16 to 17) may have no macron on the i. The photo is too small to be sure. The app currently has `benignae` and `fīstula`. Check your handout.
3. **Passive "present" endings** only work for 1st conjugation. The app only makes passive questions for 1st conjugation.
4. **Imperative plural rule** reworded in `other.js`: 3rd conjugation changes -e- to -i- (regite).

## Things Claude added (marked `"source": "claude"`): please spot-check

- Genitives and genders for the passage nouns (`nouns.js`). In particular, **papyrus is feminine** even though it is 2nd declension. I believe that is right but have not verified it.
- **dea has deābus** in the dative and ablative plural (an override in `nouns.js`).
- **nūllus has nūllīus / nūllī** in the genitive and dative singular (an override in `adjectives.js`).
- Principal parts for every passage verb (`verbs.js`), e.g. videō, vidēre, vīdī, vīsus; teneō, tenēre, tenuī, tentus; dō, dare, dedī, datus (with short a: damus, dabam).
- The full is, ea, id table (`other.js`). Your notes only had the accusatives.
- **Every word annotation in `passage.js`** (form, role, meaning). Two judgment calls: `querellae` marked "description (genitive)" (sound *of complaint*), and in "Deus Pān" I marked Pān as subject and Deus as apposition. Your teacher may label these differently.
- Plot questions, phrase-translation traps, translation checklists and the 8 placeholder general knowledge questions.
