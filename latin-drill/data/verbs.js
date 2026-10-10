/* VERBS
   Top part = my tables, exactly as typed (person order: 1sg 2sg 3sg 1pl 2pl 3pl).
   "words" = verbs the app quizzes. Forms are BUILT from these tables:
     present, imperfect, future: the matching model verb in "conjugations"
     perfect, pluperfect, future perfect: 3rd principal part minus -ī, plus the endings
   "irregular" gives whole tables for a verb that does not follow the pattern.
   Entries with "source": "claude" were added by Claude: check them. */
window.LATIN_VERBS = {
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
  "possum_present": ["possum","potes","potest","possumus","potestis","possunt"],

  "tenseMeanings": "Tense meanings for vocō: present I call, imperfect I was calling or used to call, future I will call, perfect I called, pluperfect I had called, future perfect I will have called.",

  /* English templates used to build "what does this form mean" choices.
     en = [base, he/she form, past, past participle, -ing form] */
  "meanings": {
    "subjects": ["I","you","he/she","we","you all","they"],
    "present": "{S} {pres}",
    "imperfect": "{S} {was} {ing}",
    "future": "{S} will {base}",
    "perfect": "{S} {past}",
    "pluperfect": "{S} had {pp}",
    "futureperfect": "{S} will have {pp}"
  },

  /* One line reasons shown after an answer. */
  "tenseSigns": {
    "present": "Present: the personal ending goes straight on the present stem, no tense sign.",
    "imperfect": "-bā- marks the imperfect: was ___ing or used to ___.",
    "future_12": "-b- with -ō, -i-, -u- marks the future in 1st and 2nd conjugation: will ___.",
    "future_34": "-a- (1st singular) then -ē- marks the future in 3rd and 4th conjugation: will ___.",
    "perfect": "Perfect endings (-ī, -istī, -it, -imus, -istis, -ērunt) go on the perfect stem: ___ed.",
    "pluperfect": "Perfect stem + -era- (looks like eram) is the pluperfect: had ___ed.",
    "futureperfect": "Perfect stem + -er- (looks like erō, but 3rd plural is -erint) is the future perfect: will have ___ed.",
    "sum": "This is a form of sum (to be), which is irregular: memorize it."
  },
  "personSigns": ["-ō or -m means I","-s means you","-t means he, she, it","-mus means we","-tis means you all","-nt means they"],

  "words": [
    {"lemma":"vocō","parts":"vocō, vocāre, vocāvī, vocātus","conj":"1","en":["call","calls","called","called","calling"],"model":true},
    {"lemma":"habeō","parts":"habeō, habēre, habuī, habitus","conj":"2","en":["have","has","had","had","having"],"model":true},
    {"lemma":"regō","parts":"regō, regere, rēxī, rēctus","conj":"3","en":["rule","rules","ruled","ruled","ruling"],"model":true},
    {"lemma":"audiō","parts":"audiō, audīre, audīvī, audītus","conj":"4","en":["hear","hears","heard","heard","hearing"],"model":true},
    {"lemma":"sum","parts":"sum, esse, fuī, futūrus","special":"sum","en":"be"},
    {"lemma":"possum","parts":"possum, posse, potuī","special":"possum","en":"be able"},

    {"lemma":"amō","parts":"amō, amāre, amāvī, amātus","conj":"1","en":["love","loves","loved","loved","loving"],"source":"claude"},
    {"lemma":"habitō","parts":"habitō, habitāre, habitāvī, habitātus","conj":"1","en":["live","lives","lived","lived","living"],"source":"claude"},
    {"lemma":"fugitō","parts":"fugitō, fugitāre, fugitāvī, fugitātus","conj":"1","en":["flee","flees","fled","fled","fleeing"],"source":"claude"},
    {"lemma":"cēlō","parts":"cēlō, cēlāre, cēlāvī, cēlātus","conj":"1","en":["hide","hides","hid","hidden","hiding"],"source":"claude"},
    {"lemma":"errō","parts":"errō, errāre, errāvī, errātus","conj":"1","en":["wander","wanders","wandered","wandered","wandering"],"source":"claude"},
    {"lemma":"spectō","parts":"spectō, spectāre, spectāvī, spectātus","conj":"1","en":["look at","looks at","looked at","looked at","looking at"],"source":"claude"},
    {"lemma":"ōrō","parts":"ōrō, ōrāre, ōrāvī, ōrātus","conj":"1","en":["beg","begs","begged","begged","begging"],"source":"claude"},
    {"lemma":"mūtō","parts":"mūtō, mūtāre, mūtāvī, mūtātus","conj":"1","en":["change","changes","changed","changed","changing"],"source":"claude"},
    {"lemma":"putō","parts":"putō, putāre, putāvī, putātus","conj":"1","en":["think","thinks","thought","thought","thinking"],"source":"claude"},
    {"lemma":"suspīrō","parts":"suspīrō, suspīrāre, suspīrāvī, suspīrātus","conj":"1","en":["sigh","sighs","sighed","sighed","sighing"],"source":"claude"},
    {"lemma":"fōrmō","parts":"fōrmō, fōrmāre, fōrmāvī, fōrmātus","conj":"1","en":["form","forms","formed","formed","forming"],"source":"claude"},
    {"lemma":"dō","parts":"dō, dare, dedī, datus","conj":"1","en":["give","gives","gave","given","giving"],"noPassive":true,"noImperative":true,
      "irregular":{"present":["dō","dās","dat","damus","datis","dant"],"imperfect":["dabam","dabās","dabat","dabāmus","dabātis","dabant"],"future":["dabō","dabis","dabit","dabimus","dabitis","dabunt"]},"note":"short a: damus, dabam","source":"claude"},
    {"lemma":"videō","parts":"videō, vidēre, vīdī, vīsus","conj":"2","en":["see","sees","saw","seen","seeing"],"source":"claude"},
    {"lemma":"teneō","parts":"teneō, tenēre, tenuī, tentus","conj":"2","en":["hold","holds","held","held","holding"],"source":"claude"},
    {"lemma":"maneō","parts":"maneō, manēre, mānsī, mānsus","conj":"2","en":["remain","remains","remained","remained","remaining"],"source":"claude"},
    {"lemma":"prohibeō","parts":"prohibeō, prohibēre, prohibuī, prohibitus","conj":"2","en":["block","blocks","blocked","blocked","blocking"],"source":"claude"},
    {"lemma":"dēvoveō","parts":"dēvoveō, dēvovēre, dēvōvī, dēvōtus","conj":"2","en":["devote","devotes","devoted","devoted","devoting"],"source":"claude"},
    {"lemma":"dīcō","parts":"dīcō, dīcere, dīxī, dictus","conj":"3","en":["say","says","said","said","saying"],"source":"claude"},
    {"lemma":"coniungō","parts":"coniungō, coniungere, coniūnxī, coniūnctus","conj":"3","en":["join together","joins together","joined together","joined together","joining together"],"source":"claude"}
  ]
};

/* PASSIVE (my notes). The endings below include the 1st conjugation -ā-,
   so the app only builds passive forms for 1st conjugation verbs. */
window.LATIN_PASSIVE = {
  "present": ["or","āris","ātur","āmur","āminī","antur"],
  "present_model": ["vocor","vocāris","vocātur","vocāmur","vocāminī","vocantur"],
  "imperfect_model": ["vocābar","vocābāris","vocābātur","vocābāmur","vocābāminī","vocābantur"],
  "future_model_12": ["vocābor","vocāberis","vocābitur","vocābimur","vocābiminī","vocābuntur"],
  "perfect_passive": "4th principal part + present of sum (vocātus sum)",
  "pluperfect_passive": "4th principal part + imperfect of sum (vocātus eram)",
  "futureperfect_passive": "4th principal part + future of sum (vocātus erō)",
  "agent": "ā or ab + ablative names the person who did the action"
};
