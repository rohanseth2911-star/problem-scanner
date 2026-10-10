/* IMPERATIVES, QUESTIONS, PRONOUNS, CASE USES, TRAPS (from my notes).
   Lines marked "added by Claude" are not from my notes: check them. */
window.LATIN_OTHER = {
  "imperatives": {
    "rule": "Singular imperative: infinitive minus -re (vocā, habē, rege, audī). Plural: add -te (vocāte, habēte, audīte); 3rd conjugation changes -e- to -i- (regite).",
    "examples": {"vocō":["vocā","vocāte"],"habeō":["habē","habēte"],"regō":["rege","regite"],"audiō":["audī","audīte"]},
    "irregular": [
      {"lemma":"dīcō","sg":"dīc","pl":"dīcite","en":"say"},
      {"lemma":"dūcō","sg":"dūc","pl":"dūcite","en":"lead"},
      {"lemma":"faciō","sg":"fac","pl":"facite","en":"make, do"},
      {"lemma":"ferō","sg":"fer","pl":"ferte","en":"carry, bring"}
    ],
    "negative": {"one":"nōlī","many":"nōlīte","rule":"nōlī (one person) or nōlīte (several) plus the infinitive","wrong":["nōn","num"]}
  },
  "questions": [
    {"word":"-ne","expects":"either answer (neutral)"},
    {"word":"nōnne","expects":"yes"},
    {"word":"num","expects":"no"}
  ],
  "pronouns": {
    "note": "is, ea, id: accusative singular eum, eam, id; accusative plural eōs, eās, ea.",
    "is": {
      "sg":{"m":{"nom":"is","gen":"eius","dat":"eī","acc":"eum","abl":"eō"},"f":{"nom":"ea","gen":"eius","dat":"eī","acc":"eam","abl":"eā"},"n":{"nom":"id","gen":"eius","dat":"eī","acc":"id","abl":"eō"}},
      "pl":{"m":{"nom":"eī","gen":"eōrum","dat":"eīs","acc":"eōs","abl":"eīs"},"f":{"nom":"eae","gen":"eārum","dat":"eīs","acc":"eās","abl":"eīs"},"n":{"nom":"ea","gen":"eōrum","dat":"eīs","acc":"ea","abl":"eīs"}},
      "source": "claude (full table added; your notes only had the accusatives)"
    },
    "personal": [
      {"la":"mē","en":"me"},
      {"la":"tē","en":"you"},
      {"la":"tēcum","en":"with you"},
      {"la":"sē","en":"himself, herself, themselves"}
    ]
  },
  "caseUses": {
    "nom": ["subject","predicate nominative","apposition"],
    "gen": ["possession","partitive","description","objective"],
    "dat": ["indirect object (to or for)","reference","possession","with certain adjectives"],
    "acc": ["direct object","motion toward with ad or trāns","object of fugere"],
    "abl": ["means (no preposition)","manner (with cum)","personal agent (ā or ab)","place from which","accompaniment","separation","respect","place where (in + ablative)"]
  },
  "caseUsesNote": "place where (in + ablative) was added by Claude because the passage uses it a lot.",
  "traps": [
    {"id":"perf3pl","text":"Perfect 3rd plural is -ērunt, future perfect 3rd plural is -erint."},
    {"id":"pluperf","text":"Pluperfect uses the imperfect of sum: active endings look like eram, passive is vocātus eram."},
    {"id":"futperf","text":"Future perfect uses the future of sum: active endings look like erō, passive is vocātus erō."},
    {"id":"neuter","text":"Neuter nominative and accusative are always the same, and neuter plural ends in -a."},
    {"id":"gensg","text":"Genitive singular: -ae (1st), -ī (2nd), -is (3rd)."},
    {"id":"adj3","text":"2 termination 3rd declension adjectives: masculine and feminine share a form, neuter differs (fortis, forte)."},
    {"id":"conj","text":"quamquam = although, tamen = nevertheless, -que = and (attached to the second word)."},
    {"id":"questions","text":"nōnne expects yes, num expects no, -ne is neutral."},
    {"id":"fugere","text":"Latin uses the accusative after fugere, English adds \"from\"."}
  ]
};
