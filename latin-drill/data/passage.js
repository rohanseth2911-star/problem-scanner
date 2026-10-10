/* THE PAN PASSAGE
   "text" is my class text, copied exactly.
   "sentences" splits it up and annotates words. ALL annotations were written by
   Claude ("source": "claude"): check them on the Reference page against your notes.
   Word fields: w = word as written (n = which occurrence, if it appears twice),
   lemma, pos (noun, adj, pron, verb, name), cas, num, gen, tense, person, mood,
   role (must match one of "roles"), gloss = meaning here. */
window.LATIN_PASSAGE = {
  "title": "PĀN ET SYRINGA",
  "text": "Ōlim erat nympha pulchra. Nōmen nymphae erat Syrringa. In Arcadiā habitābat. Centum deī et satyrī Syrringam amābant, sed Syrringa eōs nōn amābat. Quamquam Syrringa nymphās cēterās et deam Diānam amābat, tamen deōs satyrōsque fugitābat. Sē in silvā umbrōsā et dēnsā cēlābat.\nSyrringa dīxit, \"Diānae vītam meam dēvovēbō. Nūllus vir, nūllus deus mē habēbit.\"\nDeus Pān autem, dum in silvā errat, Syrringam videt et statim eam amat. Pān dīxit, \"Aeternum tē amābō.\" Syrringa autem dīxit, \"Aeternum nympha Diānae erō.\"\nDeinde nympha misera trāns agrōs et per silvās celeriter fugitāt dōnec rīpam undārum spectat. Undae fugam prohibēbant. Syrringa auxilium nymphās sīc ōrat, \"Fōrmam meam mūtāte, nymphae benignae.\" Nymphae eam in papyrōs in rīpā mūtant.\nPān autem putat sē Syrringam in bracchiīs tenēre; in bracchiīs nōn eam sed papyrōs habēbat. Dum miser Pān suspīrat trāns papyrōs, papyrī sonum querellae dant. Dēnique Pān dīxit, \"Tēcum concilium habēbō. Syrringa manēbit.\" Et cērā septem papyrōs coniungit. Ita Pān fīstulam fōrmat, et fīstulae nōmen Syrringam dat.",
  "source": "claude",

  "roles": [
    "subject",
    "direct object",
    "predicate nominative",
    "apposition",
    "possession (genitive)",
    "description (genitive)",
    "indirect object (dative)",
    "place where (in + ablative)",
    "object of a preposition (accusative)",
    "means (ablative, no preposition)",
    "accompaniment (cum + ablative)",
    "direct address (vocative)",
    "subject of an infinitive (indirect statement)"
  ],

  "sentences": [
    {"la":"Ōlim erat nympha pulchra.","words":[
      {"w":"erat","lemma":"sum","pos":"verb","tense":"imperfect","person":3,"num":"sg","gloss":"there was"},
      {"w":"nympha","lemma":"nympha","pos":"noun","cas":"nom","num":"sg","role":"subject","gloss":"a nymph"},
      {"w":"pulchra","lemma":"pulcher","pos":"adj","cas":"nom","num":"sg","gen":"f","gloss":"beautiful (agrees with nympha)"}]},
    {"la":"Nōmen nymphae erat Syrringa.","words":[
      {"w":"Nōmen","lemma":"nōmen","pos":"noun","cas":"nom","num":"sg","role":"subject","gloss":"the name"},
      {"w":"nymphae","lemma":"nympha","pos":"noun","cas":"gen","num":"sg","role":"possession (genitive)","gloss":"of the nymph"},
      {"w":"erat","lemma":"sum","pos":"verb","tense":"imperfect","person":3,"num":"sg","gloss":"was"},
      {"w":"Syrringa","lemma":"Syrringa","pos":"noun","cas":"nom","num":"sg","role":"predicate nominative","gloss":"Syrinx"}]},
    {"la":"In Arcadiā habitābat.","words":[
      {"w":"Arcadiā","lemma":"Arcadia","pos":"noun","cas":"abl","num":"sg","role":"place where (in + ablative)","gloss":"in Arcadia"},
      {"w":"habitābat","lemma":"habitō","pos":"verb","tense":"imperfect","person":3,"num":"sg","gloss":"she used to live"}]},
    {"la":"Centum deī et satyrī Syrringam amābant, sed Syrringa eōs nōn amābat.","words":[
      {"w":"deī","lemma":"deus","pos":"noun","cas":"nom","num":"pl","role":"subject","gloss":"gods"},
      {"w":"satyrī","lemma":"satyrus","pos":"noun","cas":"nom","num":"pl","role":"subject","gloss":"satyrs"},
      {"w":"Syrringam","lemma":"Syrringa","pos":"noun","cas":"acc","num":"sg","role":"direct object","gloss":"Syrinx"},
      {"w":"amābant","lemma":"amō","pos":"verb","tense":"imperfect","person":3,"num":"pl","gloss":"loved, were loving"},
      {"w":"Syrringa","lemma":"Syrringa","pos":"noun","cas":"nom","num":"sg","role":"subject","gloss":"Syrinx"},
      {"w":"eōs","lemma":"is","pos":"pron","cas":"acc","num":"pl","gen":"m","role":"direct object","gloss":"them"},
      {"w":"amābat","lemma":"amō","pos":"verb","tense":"imperfect","person":3,"num":"sg","gloss":"loved, was loving"}]},
    {"la":"Quamquam Syrringa nymphās cēterās et deam Diānam amābat, tamen deōs satyrōsque fugitābat.","words":[
      {"w":"Syrringa","lemma":"Syrringa","pos":"noun","cas":"nom","num":"sg","role":"subject","gloss":"Syrinx"},
      {"w":"nymphās","lemma":"nympha","pos":"noun","cas":"acc","num":"pl","role":"direct object","gloss":"the nymphs"},
      {"w":"cēterās","lemma":"cēterus","pos":"adj","cas":"acc","num":"pl","gen":"f","gloss":"the other (agrees with nymphās)"},
      {"w":"deam","lemma":"dea","pos":"noun","cas":"acc","num":"sg","role":"direct object","gloss":"the goddess"},
      {"w":"Diānam","lemma":"Diāna","pos":"noun","cas":"acc","num":"sg","role":"apposition","gloss":"Diana"},
      {"w":"amābat","lemma":"amō","pos":"verb","tense":"imperfect","person":3,"num":"sg","gloss":"loved"},
      {"w":"deōs","lemma":"deus","pos":"noun","cas":"acc","num":"pl","role":"direct object","gloss":"(from) the gods","tags":["fugere"]},
      {"w":"satyrōsque","lemma":"satyrus","pos":"noun","cas":"acc","num":"pl","role":"direct object","enclitic":"que","gloss":"and (from) the satyrs","tags":["fugere","conj"]},
      {"w":"fugitābat","lemma":"fugitō","pos":"verb","tense":"imperfect","person":3,"num":"sg","gloss":"she kept fleeing"}]},
    {"la":"Sē in silvā umbrōsā et dēnsā cēlābat.","words":[
      {"w":"Sē","lemma":"sē","pos":"pron","cas":"acc","role":"direct object","gloss":"herself"},
      {"w":"silvā","lemma":"silva","pos":"noun","cas":"abl","num":"sg","role":"place where (in + ablative)","gloss":"in the forest"},
      {"w":"umbrōsā","lemma":"umbrōsus","pos":"adj","cas":"abl","num":"sg","gen":"f","gloss":"shady"},
      {"w":"dēnsā","lemma":"dēnsus","pos":"adj","cas":"abl","num":"sg","gen":"f","gloss":"dense"},
      {"w":"cēlābat","lemma":"cēlō","pos":"verb","tense":"imperfect","person":3,"num":"sg","gloss":"was hiding"}]},
    {"la":"Syrringa dīxit, \"Diānae vītam meam dēvovēbō.","words":[
      {"w":"Syrringa","lemma":"Syrringa","pos":"noun","cas":"nom","num":"sg","role":"subject","gloss":"Syrinx"},
      {"w":"dīxit","lemma":"dīcō","pos":"verb","tense":"perfect","person":3,"num":"sg","gloss":"said"},
      {"w":"Diānae","lemma":"Diāna","pos":"noun","cas":"dat","num":"sg","role":"indirect object (dative)","gloss":"to Diana"},
      {"w":"vītam","lemma":"vīta","pos":"noun","cas":"acc","num":"sg","role":"direct object","gloss":"life"},
      {"w":"meam","lemma":"meus","pos":"adj","cas":"acc","num":"sg","gen":"f","gloss":"my"},
      {"w":"dēvovēbō","lemma":"dēvoveō","pos":"verb","tense":"future","person":1,"num":"sg","gloss":"I will devote"}]},
    {"la":"Nūllus vir, nūllus deus mē habēbit.\"","words":[
      {"w":"Nūllus","lemma":"nūllus","pos":"adj","cas":"nom","num":"sg","gen":"m","gloss":"no"},
      {"w":"vir","lemma":"vir","pos":"noun","cas":"nom","num":"sg","role":"subject","gloss":"man"},
      {"w":"deus","lemma":"deus","pos":"noun","cas":"nom","num":"sg","role":"subject","gloss":"god"},
      {"w":"mē","lemma":"ego","pos":"pron","cas":"acc","role":"direct object","gloss":"me"},
      {"w":"habēbit","lemma":"habeō","pos":"verb","tense":"future","person":3,"num":"sg","gloss":"will have"}]},
    {"la":"Deus Pān autem, dum in silvā errat, Syrringam videt et statim eam amat.","words":[
      {"w":"Deus","lemma":"deus","pos":"noun","cas":"nom","num":"sg","role":"apposition","gloss":"the god"},
      {"w":"Pān","lemma":"Pān","pos":"name","cas":"nom","role":"subject","gloss":"Pan"},
      {"w":"silvā","lemma":"silva","pos":"noun","cas":"abl","num":"sg","role":"place where (in + ablative)","gloss":"in the forest"},
      {"w":"errat","lemma":"errō","pos":"verb","tense":"present","person":3,"num":"sg","gloss":"wanders, is wandering"},
      {"w":"Syrringam","lemma":"Syrringa","pos":"noun","cas":"acc","num":"sg","role":"direct object","gloss":"Syrinx"},
      {"w":"videt","lemma":"videō","pos":"verb","tense":"present","person":3,"num":"sg","gloss":"sees"},
      {"w":"eam","lemma":"is","pos":"pron","cas":"acc","num":"sg","gen":"f","role":"direct object","gloss":"her"},
      {"w":"amat","lemma":"amō","pos":"verb","tense":"present","person":3,"num":"sg","gloss":"loves"}]},
    {"la":"Pān dīxit, \"Aeternum tē amābō.\"","words":[
      {"w":"Pān","lemma":"Pān","pos":"name","cas":"nom","role":"subject","gloss":"Pan"},
      {"w":"dīxit","lemma":"dīcō","pos":"verb","tense":"perfect","person":3,"num":"sg","gloss":"said"},
      {"w":"tē","lemma":"tū","pos":"pron","cas":"acc","role":"direct object","gloss":"you"},
      {"w":"amābō","lemma":"amō","pos":"verb","tense":"future","person":1,"num":"sg","gloss":"I will love"}]},
    {"la":"Syrringa autem dīxit, \"Aeternum nympha Diānae erō.\"","words":[
      {"w":"Syrringa","lemma":"Syrringa","pos":"noun","cas":"nom","num":"sg","role":"subject","gloss":"Syrinx"},
      {"w":"dīxit","lemma":"dīcō","pos":"verb","tense":"perfect","person":3,"num":"sg","gloss":"said"},
      {"w":"nympha","lemma":"nympha","pos":"noun","cas":"nom","num":"sg","role":"predicate nominative","gloss":"a nymph"},
      {"w":"Diānae","lemma":"Diāna","pos":"noun","cas":"gen","num":"sg","role":"possession (genitive)","gloss":"of Diana"},
      {"w":"erō","lemma":"sum","pos":"verb","tense":"future","person":1,"num":"sg","gloss":"I will be"}]},
    {"la":"Deinde nympha misera trāns agrōs et per silvās celeriter fugitāt dōnec rīpam undārum spectat.","words":[
      {"w":"nympha","lemma":"nympha","pos":"noun","cas":"nom","num":"sg","role":"subject","gloss":"the nymph"},
      {"w":"misera","lemma":"miser","pos":"adj","cas":"nom","num":"sg","gen":"f","gloss":"wretched"},
      {"w":"agrōs","lemma":"ager","pos":"noun","cas":"acc","num":"pl","role":"object of a preposition (accusative)","gloss":"across the fields"},
      {"w":"silvās","lemma":"silva","pos":"noun","cas":"acc","num":"pl","role":"object of a preposition (accusative)","gloss":"through the woods"},
      {"w":"fugitāt","lemma":"fugitō","pos":"verb","tense":"present","person":3,"num":"sg","gloss":"flees"},
      {"w":"rīpam","lemma":"rīpa","pos":"noun","cas":"acc","num":"sg","role":"direct object","gloss":"the bank"},
      {"w":"undārum","lemma":"unda","pos":"noun","cas":"gen","num":"pl","role":"possession (genitive)","gloss":"of the waters"},
      {"w":"spectat","lemma":"spectō","pos":"verb","tense":"present","person":3,"num":"sg","gloss":"sees"}]},
    {"la":"Undae fugam prohibēbant.","words":[
      {"w":"Undae","lemma":"unda","pos":"noun","cas":"nom","num":"pl","role":"subject","gloss":"the waves"},
      {"w":"fugam","lemma":"fuga","pos":"noun","cas":"acc","num":"sg","role":"direct object","gloss":"escape"},
      {"w":"prohibēbant","lemma":"prohibeō","pos":"verb","tense":"imperfect","person":3,"num":"pl","gloss":"were blocking"}]},
    {"la":"Syrringa auxilium nymphās sīc ōrat, \"Fōrmam meam mūtāte, nymphae benignae.\"","words":[
      {"w":"Syrringa","lemma":"Syrringa","pos":"noun","cas":"nom","num":"sg","role":"subject","gloss":"Syrinx"},
      {"w":"auxilium","lemma":"auxilium","pos":"noun","cas":"acc","num":"sg","role":"direct object","gloss":"(for) help"},
      {"w":"nymphās","lemma":"nympha","pos":"noun","cas":"acc","num":"pl","role":"direct object","gloss":"the nymphs (ōrō takes two accusatives)"},
      {"w":"ōrat","lemma":"ōrō","pos":"verb","tense":"present","person":3,"num":"sg","gloss":"begs"},
      {"w":"Fōrmam","lemma":"fōrma","pos":"noun","cas":"acc","num":"sg","role":"direct object","gloss":"form"},
      {"w":"meam","lemma":"meus","pos":"adj","cas":"acc","num":"sg","gen":"f","gloss":"my"},
      {"w":"mūtāte","lemma":"mūtō","pos":"verb","mood":"imperative","num":"pl","gloss":"change! (to several people)"},
      {"w":"nymphae","lemma":"nympha","pos":"noun","cas":"voc","num":"pl","role":"direct address (vocative)","gloss":"nymphs"},
      {"w":"benignae","lemma":"benignus","pos":"adj","cas":"voc","num":"pl","gen":"f","gloss":"kind"}]},
    {"la":"Nymphae eam in papyrōs in rīpā mūtant.","words":[
      {"w":"Nymphae","lemma":"nympha","pos":"noun","cas":"nom","num":"pl","role":"subject","gloss":"the nymphs"},
      {"w":"eam","lemma":"is","pos":"pron","cas":"acc","num":"sg","gen":"f","role":"direct object","gloss":"her"},
      {"w":"papyrōs","lemma":"papyrus","pos":"noun","cas":"acc","num":"pl","role":"object of a preposition (accusative)","gloss":"into papyrus plants"},
      {"w":"rīpā","lemma":"rīpa","pos":"noun","cas":"abl","num":"sg","role":"place where (in + ablative)","gloss":"on the bank"},
      {"w":"mūtant","lemma":"mūtō","pos":"verb","tense":"present","person":3,"num":"pl","gloss":"change"}]},
    {"la":"Pān autem putat sē Syrringam in bracchiīs tenēre; in bracchiīs nōn eam sed papyrōs habēbat.","words":[
      {"w":"Pān","lemma":"Pān","pos":"name","cas":"nom","role":"subject","gloss":"Pan"},
      {"w":"putat","lemma":"putō","pos":"verb","tense":"present","person":3,"num":"sg","gloss":"thinks"},
      {"w":"sē","lemma":"sē","pos":"pron","cas":"acc","role":"subject of an infinitive (indirect statement)","gloss":"(that) he"},
      {"w":"Syrringam","lemma":"Syrringa","pos":"noun","cas":"acc","num":"sg","role":"direct object","gloss":"Syrinx"},
      {"w":"bracchiīs","lemma":"bracchium","pos":"noun","cas":"abl","num":"pl","role":"place where (in + ablative)","gloss":"in his arms"},
      {"w":"tenēre","lemma":"teneō","pos":"verb","mood":"infinitive","gloss":"holds (literally: to hold)"},
      {"w":"eam","lemma":"is","pos":"pron","cas":"acc","num":"sg","gen":"f","role":"direct object","gloss":"her"},
      {"w":"papyrōs","lemma":"papyrus","pos":"noun","cas":"acc","num":"pl","role":"direct object","gloss":"papyrus plants"},
      {"w":"habēbat","lemma":"habeō","pos":"verb","tense":"imperfect","person":3,"num":"sg","gloss":"he was holding"}]},
    {"la":"Dum miser Pān suspīrat trāns papyrōs, papyrī sonum querellae dant.","words":[
      {"w":"miser","lemma":"miser","pos":"adj","cas":"nom","num":"sg","gen":"m","gloss":"wretched"},
      {"w":"Pān","lemma":"Pān","pos":"name","cas":"nom","role":"subject","gloss":"Pan"},
      {"w":"suspīrat","lemma":"suspīrō","pos":"verb","tense":"present","person":3,"num":"sg","gloss":"sighs"},
      {"w":"papyrōs","lemma":"papyrus","pos":"noun","cas":"acc","num":"pl","role":"object of a preposition (accusative)","gloss":"across the papyrus plants"},
      {"w":"papyrī","lemma":"papyrus","pos":"noun","cas":"nom","num":"pl","role":"subject","gloss":"the papyrus plants"},
      {"w":"sonum","lemma":"sonus","pos":"noun","cas":"acc","num":"sg","role":"direct object","gloss":"a sound"},
      {"w":"querellae","lemma":"querella","pos":"noun","cas":"gen","num":"sg","role":"description (genitive)","gloss":"of complaint"},
      {"w":"dant","lemma":"dō","pos":"verb","tense":"present","person":3,"num":"pl","gloss":"give"}]},
    {"la":"Dēnique Pān dīxit, \"Tēcum concilium habēbō.","words":[
      {"w":"Pān","lemma":"Pān","pos":"name","cas":"nom","role":"subject","gloss":"Pan"},
      {"w":"dīxit","lemma":"dīcō","pos":"verb","tense":"perfect","person":3,"num":"sg","gloss":"said"},
      {"w":"Tēcum","lemma":"tū","pos":"pron","cas":"abl","role":"accompaniment (cum + ablative)","gloss":"with you"},
      {"w":"concilium","lemma":"concilium","pos":"noun","cas":"acc","num":"sg","role":"direct object","gloss":"a meeting"},
      {"w":"habēbō","lemma":"habeō","pos":"verb","tense":"future","person":1,"num":"sg","gloss":"I will hold"}]},
    {"la":"Syrringa manēbit.\"","words":[
      {"w":"Syrringa","lemma":"Syrringa","pos":"noun","cas":"nom","num":"sg","role":"subject","gloss":"Syrinx"},
      {"w":"manēbit","lemma":"maneō","pos":"verb","tense":"future","person":3,"num":"sg","gloss":"will remain"}]},
    {"la":"Et cērā septem papyrōs coniungit.","words":[
      {"w":"cērā","lemma":"cēra","pos":"noun","cas":"abl","num":"sg","role":"means (ablative, no preposition)","gloss":"with wax"},
      {"w":"papyrōs","lemma":"papyrus","pos":"noun","cas":"acc","num":"pl","role":"direct object","gloss":"papyrus plants"},
      {"w":"coniungit","lemma":"coniungō","pos":"verb","tense":"present","person":3,"num":"sg","gloss":"he joins together"}]},
    {"la":"Ita Pān fīstulam fōrmat, et fīstulae nōmen Syrringam dat.","words":[
      {"w":"Pān","lemma":"Pān","pos":"name","cas":"nom","role":"subject","gloss":"Pan"},
      {"w":"fīstulam","lemma":"fīstula","pos":"noun","cas":"acc","num":"sg","role":"direct object","gloss":"a pipe"},
      {"w":"fōrmat","lemma":"fōrmō","pos":"verb","tense":"present","person":3,"num":"sg","gloss":"forms"},
      {"w":"fīstulae","lemma":"fīstula","pos":"noun","cas":"dat","num":"sg","role":"indirect object (dative)","gloss":"to the pipe"},
      {"w":"nōmen","lemma":"nōmen","pos":"noun","cas":"acc","num":"sg","role":"direct object","gloss":"the name"},
      {"w":"Syrringam","lemma":"Syrringa","pos":"noun","cas":"acc","num":"sg","role":"apposition","gloss":"Syrinx"},
      {"w":"dat","lemma":"dō","pos":"verb","tense":"present","person":3,"num":"sg","gloss":"gives"}]}
  ],

  /* Plot questions. answer = index of the right choice (0 = first). */
  "plot": [
    {"q":"Where did Syrinx live?","choices":["Arcadia","Rome","Athens","Crete"],"answer":0},
    {"q":"How many gods and satyrs loved Syrinx?","choices":["A hundred","Seven","None","Two"],"answer":0},
    {"q":"Whom did Syrinx love?","choices":["The other nymphs and Diana","Pan","The satyrs","No one at all"],"answer":0},
    {"q":"To whom did Syrinx devote her life?","choices":["Diana","Pan","The nymphs","Jupiter"],"answer":0},
    {"q":"Where was Pan when he saw Syrinx?","choices":["Wandering in the forest","On the river bank","In a meeting","In Rome"],"answer":0},
    {"q":"What stopped Syrinx from escaping?","choices":["The waves of the water","Pan's arms","A wall of wax","The satyrs"],"answer":0},
    {"q":"Whom did Syrinx beg for help?","choices":["The nymphs","Diana","Pan","The gods"],"answer":0},
    {"q":"What was Syrinx changed into?","choices":["Papyrus plants","A tree","A bird","A wave"],"answer":0},
    {"q":"What did Pan use to join the papyrus plants?","choices":["Wax","String","Gold","Water"],"answer":0},
    {"q":"How many papyrus plants did Pan join together?","choices":["Seven","A hundred","Three","Ten"],"answer":0},
    {"q":"What name did Pan give the pipe?","choices":["Syrinx","Diana","Pan","Arcadia"],"answer":0}
  ],

  /* Phrase translation. "wrong" choices are deliberate traps (tense, person, case). */
  "phrases": [
    {"la":"Nūllus vir, nūllus deus mē habēbit","en":"No man, no god will have me","wrong":["No man, no god had me","I will have no man, no god","No man, no god has me"],"tags":["future"]},
    {"la":"Aeternum tē amābō","en":"I will love you forever","wrong":["I loved you forever","You will love me forever","I was loving you forever"]},
    {"la":"Aeternum nympha Diānae erō","en":"I will forever be a nymph of Diana","wrong":["I was forever a nymph of Diana","Diana will forever be a nymph","I will forever be a nymph for Diana's sake"]},
    {"la":"Undae fugam prohibēbant","en":"The waves were blocking her escape","wrong":["The waves will block her escape","Her escape was blocking the waves","The wave blocks her escape"]},
    {"la":"Fōrmam meam mūtāte, nymphae benignae","en":"Change my form, kind nymphs","wrong":["The kind nymphs change my form","Kind nymphs changed my form","Change your form, kind nymph"]},
    {"la":"Nymphae eam in papyrōs in rīpā mūtant","en":"The nymphs change her into papyrus plants on the bank","wrong":["The nymphs change into papyrus plants on the bank","She changes the nymphs into papyrus plants","The nymphs changed her into a papyrus plant"]},
    {"la":"papyrī sonum querellae dant","en":"the papyrus plants give a sound of complaint","wrong":["the papyrus plant gives a complaint to the sound","they give the papyrus plants a sound of complaint","the papyrus plants gave a sound of complaint"]},
    {"la":"Syrringa manēbit","en":"Syrinx will remain","wrong":["Syrinx remained","Syrinx remains","Syrinx was remaining"]},
    {"la":"cērā septem papyrōs coniungit","en":"with wax he joins together seven papyrus plants","wrong":["he joins seven papyrus plants to the wax","seven papyrus plants join the wax together","with wax he joined together seven papyrus plants"]},
    {"la":"Sē in silvā umbrōsā et dēnsā cēlābat","en":"She was hiding herself in the shady and dense forest","wrong":["She was hiding the shady and dense forest","She will hide herself in the shady and dense forest","The shady and dense forest was hiding her"]},
    {"la":"tamen deōs satyrōsque fugitābat","en":"nevertheless she kept fleeing from the gods and satyrs","wrong":["although she kept fleeing from the gods and satyrs","nevertheless the gods and satyrs kept fleeing from her","nevertheless she flees from the gods and satyrs"],"tags":["conj","fugere"]}
  ]
};
