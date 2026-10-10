/* NOUNS
   "patterns" = the ending tables from my notes. Endings go on "stem" (the genitive stem).
   Forms in parentheses are whole irregular nominatives, not endings.
   "words" = the nouns the app quizzes. The nominative singular is always "lemma".
   "overrides" replaces one form, written as "number case", e.g. "pl dat".
   Entries with "source": "claude" were added by Claude: check them against your notes. */
window.LATIN_NOUNS = {
  "patterns": {
    "decl1": {"model":"puella, puellae f.","stem":"puell","sg":{"nom":"a","gen":"ae","dat":"ae","acc":"am","abl":"ā"},"pl":{"nom":"ae","gen":"ārum","dat":"īs","acc":"ās","abl":"īs"}},
    "decl2m": {"model":"servus, servī m.","stem":"serv","sg":{"nom":"us","gen":"ī","dat":"ō","acc":"um","abl":"ō"},"pl":{"nom":"ī","gen":"ōrum","dat":"īs","acc":"ōs","abl":"īs"}},
    "decl2n": {"model":"bellum, bellī n.","stem":"bell","sg":{"nom":"um","gen":"ī","dat":"ō","acc":"um","abl":"ō"},"pl":{"nom":"a","gen":"ōrum","dat":"īs","acc":"a","abl":"īs"}},
    "decl3mf": {"model":"rēx, rēgis m.","stem":"rēg","sg":{"nom":"(rēx)","gen":"is","dat":"ī","acc":"em","abl":"e"},"pl":{"nom":"ēs","gen":"um","dat":"ibus","acc":"ēs","abl":"ibus"}},
    "decl3n": {"model":"corpus, corporis n.","stem":"corpor","sg":{"nom":"(corpus)","gen":"is","dat":"ī","acc":"(corpus)","abl":"e"},"pl":{"nom":"a","gen":"um","dat":"ibus","acc":"a","abl":"ibus"}}
  },
  "names": {
    "decl1": "1st declension",
    "decl2m": "2nd declension masculine",
    "decl2n": "2nd declension neuter",
    "decl3mf": "3rd declension masculine/feminine",
    "decl3n": "3rd declension neuter"
  },
  "words": [
    {"lemma":"puella","gen":"puellae","gender":"f","pattern":"decl1","stem":"puell","en":"girl","model":true},
    {"lemma":"servus","gen":"servī","gender":"m","pattern":"decl2m","stem":"serv","en":"slave","model":true},
    {"lemma":"bellum","gen":"bellī","gender":"n","pattern":"decl2n","stem":"bell","en":"war","model":true},
    {"lemma":"rēx","gen":"rēgis","gender":"m","pattern":"decl3mf","stem":"rēg","en":"king","model":true},
    {"lemma":"corpus","gen":"corporis","gender":"n","pattern":"decl3n","stem":"corpor","en":"body","model":true},

    {"lemma":"nympha","gen":"nymphae","gender":"f","pattern":"decl1","stem":"nymph","en":"nymph","source":"claude"},
    {"lemma":"dea","gen":"deae","gender":"f","pattern":"decl1","stem":"de","en":"goddess","overrides":{"pl dat":"deābus","pl abl":"deābus"},"source":"claude"},
    {"lemma":"silva","gen":"silvae","gender":"f","pattern":"decl1","stem":"silv","en":"forest","source":"claude"},
    {"lemma":"vīta","gen":"vītae","gender":"f","pattern":"decl1","stem":"vīt","en":"life","source":"claude"},
    {"lemma":"rīpa","gen":"rīpae","gender":"f","pattern":"decl1","stem":"rīp","en":"bank","source":"claude"},
    {"lemma":"unda","gen":"undae","gender":"f","pattern":"decl1","stem":"und","en":"wave","source":"claude"},
    {"lemma":"fuga","gen":"fugae","gender":"f","pattern":"decl1","stem":"fug","en":"escape","source":"claude"},
    {"lemma":"fōrma","gen":"fōrmae","gender":"f","pattern":"decl1","stem":"fōrm","en":"form","source":"claude"},
    {"lemma":"querella","gen":"querellae","gender":"f","pattern":"decl1","stem":"querell","en":"complaint","source":"claude"},
    {"lemma":"cēra","gen":"cērae","gender":"f","pattern":"decl1","stem":"cēr","en":"wax","source":"claude"},
    {"lemma":"fīstula","gen":"fīstulae","gender":"f","pattern":"decl1","stem":"fīstul","en":"pipe","source":"claude"},
    {"lemma":"deus","gen":"deī","gender":"m","pattern":"decl2m","stem":"de","en":"god","source":"claude"},
    {"lemma":"satyrus","gen":"satyrī","gender":"m","pattern":"decl2m","stem":"satyr","en":"satyr","source":"claude"},
    {"lemma":"vir","gen":"virī","gender":"m","pattern":"decl2m","stem":"vir","en":"man","source":"claude"},
    {"lemma":"ager","gen":"agrī","gender":"m","pattern":"decl2m","stem":"agr","en":"field","source":"claude"},
    {"lemma":"sonus","gen":"sonī","gender":"m","pattern":"decl2m","stem":"son","en":"sound","source":"claude"},
    {"lemma":"papyrus","gen":"papyrī","gender":"f","pattern":"decl2m","stem":"papyr","en":"papyrus plant","note":"2nd declension but feminine","source":"claude"},
    {"lemma":"auxilium","gen":"auxiliī","gender":"n","pattern":"decl2n","stem":"auxili","en":"help","source":"claude"},
    {"lemma":"bracchium","gen":"bracchiī","gender":"n","pattern":"decl2n","stem":"bracchi","en":"arm","source":"claude"},
    {"lemma":"concilium","gen":"conciliī","gender":"n","pattern":"decl2n","stem":"concili","en":"meeting, council","source":"claude"},
    {"lemma":"nōmen","gen":"nōminis","gender":"n","pattern":"decl3n","stem":"nōmin","en":"name","source":"claude"},

    {"lemma":"Syrringa","gen":"Syrringae","gender":"f","pattern":"decl1","stem":"Syrring","en":"Syrinx","proper":true,"source":"claude"},
    {"lemma":"Diāna","gen":"Diānae","gender":"f","pattern":"decl1","stem":"Diān","en":"Diana","proper":true,"source":"claude"},
    {"lemma":"Arcadia","gen":"Arcadiae","gender":"f","pattern":"decl1","stem":"Arcadi","en":"Arcadia","proper":true,"source":"claude"}
  ]
};
