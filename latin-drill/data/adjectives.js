/* ADJECTIVES
   "patterns" = my ending tables. "mf" means masculine and feminine share the form.
   "overrides" replaces one form, written as "number gender case", e.g. "sg m nom".
   Entries with "source": "claude" were added by Claude: check them. */
window.LATIN_ADJECTIVES = {
  "patterns": {
    "bonus": {"stem":"bon","sg":{"m":{"nom":"us","gen":"ī","dat":"ō","acc":"um","abl":"ō"},"f":{"nom":"a","gen":"ae","dat":"ae","acc":"am","abl":"ā"},"n":{"nom":"um","gen":"ī","dat":"ō","acc":"um","abl":"ō"}},"pl":{"m":{"nom":"ī","gen":"ōrum","dat":"īs","acc":"ōs","abl":"īs"},"f":{"nom":"ae","gen":"ārum","dat":"īs","acc":"ās","abl":"īs"},"n":{"nom":"a","gen":"ōrum","dat":"īs","acc":"a","abl":"īs"}}},
    "fortis": {"stem":"fort","sg":{"mf":{"nom":"is","gen":"is","dat":"ī","acc":"em","abl":"ī"},"n":{"nom":"e","gen":"is","dat":"ī","acc":"e","abl":"ī"}},"pl":{"mf":{"nom":"ēs","gen":"ium","dat":"ibus","acc":"ēs","abl":"ibus"},"n":{"nom":"ia","gen":"ium","dat":"ibus","acc":"ia","abl":"ibus"}}}
  },
  "types": [
    "1st/2nd declension: bonus, bona, bonum",
    "3rd declension, 3 terminations: ācer, ācris, ācre",
    "3rd declension, 2 terminations: fortis, forte",
    "3rd declension, 1 termination: ingēns",
    "Attributive = next to the noun. Predicate = after a form of sum. Substantive = acts as a noun."
  ],
  "words": [
    {"lemma":"bonus","dict":"bonus, bona, bonum","pattern":"bonus","stem":"bon","en":"good","model":true},
    {"lemma":"fortis","dict":"fortis, forte","pattern":"fortis","stem":"fort","en":"brave, strong","model":true},
    {"lemma":"pulcher","dict":"pulcher, pulchra, pulchrum","pattern":"bonus","stem":"pulchr","en":"beautiful","overrides":{"sg m nom":"pulcher"},"source":"claude"},
    {"lemma":"miser","dict":"miser, misera, miserum","pattern":"bonus","stem":"miser","en":"wretched","overrides":{"sg m nom":"miser"},"source":"claude"},
    {"lemma":"umbrōsus","dict":"umbrōsus, umbrōsa, umbrōsum","pattern":"bonus","stem":"umbrōs","en":"shady","source":"claude"},
    {"lemma":"dēnsus","dict":"dēnsus, dēnsa, dēnsum","pattern":"bonus","stem":"dēns","en":"dense","source":"claude"},
    {"lemma":"benignus","dict":"benignus, benigna, benignum","pattern":"bonus","stem":"benign","en":"kind","source":"claude"},
    {"lemma":"cēterus","dict":"cēterus, cētera, cēterum","pattern":"bonus","stem":"cēter","en":"the other, the rest","source":"claude"},
    {"lemma":"meus","dict":"meus, mea, meum","pattern":"bonus","stem":"me","en":"my","source":"claude"},
    {"lemma":"nūllus","dict":"nūllus, nūlla, nūllum","pattern":"bonus","stem":"nūll","en":"no, none","overrides":{"sg m gen":"nūllīus","sg f gen":"nūllīus","sg n gen":"nūllīus","sg m dat":"nūllī","sg f dat":"nūllī","sg n dat":"nūllī"},"source":"claude"}
  ]
};
