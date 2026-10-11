/* Latin engine: builds every form and every question from the data tables.
   No DOM here, so tools/check.js can run it in Node. */
(function (root) {
  'use strict';

  const N = root.LATIN_NOUNS, A = root.LATIN_ADJECTIVES, V = root.LATIN_VERBS,
    PV = root.LATIN_PASSIVE, O = root.LATIN_OTHER, VOC = root.LATIN_VOCAB,
    PS = root.LATIN_PASSAGE, GK = root.LATIN_GENERAL;

  /* ---------- small helpers ---------- */
  const nfc = s => String(s).normalize('NFC');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rand = n => Math.floor(Math.random() * n);
  const pick = a => a[rand(a.length)];
  const uniq = a => [...new Set(a)];
  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // Typed answers: ignore macrons, capitals, punctuation and extra spaces.
  function norm(s) {
    return nfc(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[.,;:!?"“”‘’'()]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const matches = (input, answers) => norm(input) !== '' && answers.some(a => norm(a) === norm(input));
  const bare = w => nfc(w).replace(/[.,;:!?"“”]/g, '').toLowerCase(); // keeps macrons

  const CASES = ['nom', 'gen', 'dat', 'acc', 'abl'];
  const CASE_NAME = { nom: 'nominative', gen: 'genitive', dat: 'dative', acc: 'accusative', abl: 'ablative', voc: 'vocative' };
  const NUM_NAME = { sg: 'singular', pl: 'plural' };
  const GEN_NAME = { m: 'masculine', f: 'feminine', n: 'neuter' };
  const TENSES = ['present', 'imperfect', 'future', 'perfect', 'pluperfect', 'futureperfect'];
  const TENSE_NAME = { present: 'present', imperfect: 'imperfect', future: 'future', perfect: 'perfect', pluperfect: 'pluperfect', futureperfect: 'future perfect' };
  const PERSON = ['1st person singular', '2nd person singular', '3rd person singular', '1st person plural', '2nd person plural', '3rd person plural'];
  const TRAP_PARTNER = { perfect: 'futureperfect', futureperfect: 'perfect', pluperfect: 'imperfect', imperfect: 'pluperfect', future: 'present', present: 'future' };
  const TRAPS = {}; (O.traps || []).forEach(t => { TRAPS[t.id] = t.text; });

  const TOPICS = [
    { id: 'nouns', name: 'Noun endings' },
    { id: 'adjectives', name: 'Adjectives' },
    { id: 'tenses', name: 'Present, imperfect, future' },
    { id: 'perfect', name: 'Perfect system' },
    { id: 'passive', name: 'Passive' },
    { id: 'imperatives', name: 'Imperatives and questions' },
    { id: 'cases', name: 'Case uses' },
    { id: 'pronouns', name: 'Pronouns' },
    { id: 'vocab', name: 'Vocab' },
    { id: 'passage', name: 'Pan passage' }
  ];
  if (root.LATIN_SETTINGS && root.LATIN_SETTINGS.mode === 'course' && root.LATIN_COURSE) TOPICS.push({ id: 'course', name: 'New vocab' });

  const nounBy = l => N.words.find(w => w.lemma === l);
  const adjBy = l => A.words.find(w => w.lemma === l);
  const verbBy = l => V.words.find(w => w.lemma === l);
  const parts = s => s.split(',').map(x => nfc(x.trim()));
  const trapNote = tags => (tags || []).filter(t => TRAPS[t]).map(t => 'Trap: ' + TRAPS[t]).join(' ');

  /* ---------- general course vocab (settings.js "mode": "course") ---------- */
  const SETTINGS = root.LATIN_SETTINGS || {};
  const COURSE_ON = SETTINGS.mode === 'course' && !!root.LATIN_COURSE;
  const COURSE_LEMMAS = new Set(), COURSE_ORDER = [];
  let UNLOCKED = new Set();
  const known = w => !w.course || UNLOCKED.has(w.lemma || w.la);
  const POS_OF = { noun: 'noun', verb: 'verb', adj: 'adj' };
  function courseKind(c) { return c.parts ? 'verb' : c.gen ? 'noun' : c.dict ? 'adj' : c.pos; }
  if (COURSE_ON) {
    root.LATIN_COURSE.units.forEach((u, ui) => u.words.forEach(c => {
      const la = nfc(c.la), kind = courseKind(c);
      if (VOC.words.some(v => nfc(v.la) === la)) return; // already in the passage vocab
      COURSE_LEMMAS.add(la); COURSE_ORDER.push(la);
      let dict = c.dict || c.la;
      if (kind === 'noun') {
        dict = c.la + ', ' + c.gen + ', ' + c.gender + '.';
        const d = c.decl, g = nfc(c.gen);
        const pat = d === '1' ? 'decl1' : d === '2' ? (c.gender === 'n' ? 'decl2n' : 'decl2m') : d === '3' ? (c.gender === 'n' ? 'decl3n' : 'decl3mf') : null;
        const cut = d === '1' ? 2 : d === '2' ? 1 : 2;
        if (pat && !N.words.some(w => w.lemma === la))
          N.words.push({ lemma: la, gen: g, gender: c.gender, pattern: pat, stem: g.slice(0, -cut), en: c.en, overrides: c.overrides, note: c.note, course: true, unit: ui });
      }
      if (kind === 'verb') {
        dict = c.parts;
        if (/^[1-4]$/.test(c.conj) && !V.words.some(w => w.lemma === la))
          V.words.push({ lemma: la, parts: c.parts, conj: c.conj, en: c.en, noPassive: c.noPassive, course: true, unit: ui });
      }
      if (kind === 'adj' && (c.decl === '12' || c.decl === '3') && !A.words.some(w => w.lemma === la)) {
        const f = parts(c.dict), w = { lemma: la, dict: c.dict, en: c.en, course: true, unit: ui };
        if (c.decl === '12') { w.pattern = 'bonus'; w.stem = f[1].slice(0, -1); if (f[0] !== w.stem + 'us') w.overrides = { 'sg m nom': f[0] }; }
        else { w.pattern = 'fortis'; w.stem = f[0].slice(0, -2); }
        A.words.push(w);
      }
      VOC.words.push({ la, dict, en: c.en, pos: POS_OF[kind] || c.pos || 'other', tags: c.tags, course: true, unit: ui, kind });
    }));
  }

  /* ---------- forms ---------- */
  function nounForms(w) {
    const pat = N.patterns[w.pattern], ov = w.overrides || {}, out = [];
    for (const num of ['sg', 'pl']) for (const cas of CASES) {
      const end = nfc(pat[num][cas]);
      let form, ending = end;
      if (ov[num + ' ' + cas]) { form = ov[num + ' ' + cas]; ending = null; }
      else if (num === 'sg' && (cas === 'nom' || (cas === 'acc' && w.gender === 'n'))) {
        form = w.lemma; if (nfc(w.lemma) !== nfc(w.stem + end)) ending = null;
      } else if (end.startsWith('(')) { form = w.lemma; ending = null; }
      else form = w.stem + end;
      const tags = [];
      if (w.gender === 'n' && (cas === 'nom' || cas === 'acc')) tags.push('neuter');
      if (cas === 'gen' && num === 'sg') tags.push('gensg');
      out.push({ form: nfc(form), num, cas, ending, tags, label: CASE_NAME[cas] + ' ' + NUM_NAME[num] });
    }
    return out;
  }

  function adjForms(w) {
    const pat = A.patterns[w.pattern], ov = w.overrides || {}, out = [];
    for (const num of ['sg', 'pl']) for (const gen of ['m', 'f', 'n']) for (const cas of CASES) {
      const gk = pat[num][gen] ? gen : (gen === 'n' ? 'n' : 'mf');
      const form = ov[num + ' ' + gen + ' ' + cas] || (w.stem + pat[num][gk][cas]);
      const tags = [];
      if (gen === 'n' && (cas === 'nom' || cas === 'acc')) tags.push('neuter');
      if (pat[num].mf) tags.push('adj3');
      out.push({ form: nfc(form), num, gen, cas, tags, label: CASE_NAME[cas] + ' ' + NUM_NAME[num] + ' ' + GEN_NAME[gen] });
    }
    return out;
  }

  function pronForms() {
    const t = O.pronouns.is, out = [];
    for (const num of ['sg', 'pl']) for (const gen of ['m', 'f', 'n']) for (const cas of CASES)
      out.push({ form: nfc(t[num][gen][cas]), num, gen, cas, tags: [], label: CASE_NAME[cas] + ' ' + NUM_NAME[num] + ' ' + GEN_NAME[gen] });
    return out;
  }

  // Endings of a conjugation = the model verb's forms with its root cut off.
  function conjModel(conj) {
    const c = V.conjugations[conj];
    const key = Object.keys(c).find(k => !['present', 'imperfect', 'future'].includes(k));
    const root = parts(c[key])[1].slice(0, -3); // vocāre -> voc
    const strip = arr => arr.map(f => (nfc(f).startsWith(root) ? nfc(f).slice(root.length) : null));
    return { root, present: strip(c.present), imperfect: strip(c.imperfect), future: strip(c.future) };
  }

  function verbTags(tense, p) {
    const t = [];
    if ((tense === 'perfect' || tense === 'futureperfect') && p === 5) t.push('perf3pl');
    if (tense === 'pluperfect') t.push('pluperf');
    if (tense === 'futureperfect') t.push('futperf');
    return t;
  }

  function verbForms(w) {
    const out = [];
    const add = (tense, arr) => arr.forEach((f, p) => {
      if (f) out.push({ form: nfc(f), tense, p, tags: verbTags(tense, p), label: TENSE_NAME[tense] + ', ' + PERSON[p] });
    });
    const pp = parts(w.parts);
    if (w.special === 'sum') { add('present', V.sum.present); add('imperfect', V.sum.imperfect); add('future', V.sum.future); return out; }
    if (w.special === 'possum') { add('present', V.possum_present); return out; }
    if (w.irregular) { Object.keys(w.irregular).forEach(t => add(t, w.irregular[t])); }
    else {
      const m = conjModel(w.conj), root = pp[1].slice(0, -3);
      ['present', 'imperfect', 'future'].forEach(t => add(t, m[t].map(e => (e == null ? null : root + e))));
    }
    if (pp[2]) {
      const ps = pp[2].slice(0, -1); // vocāvī -> vocāv
      add('perfect', V.perfect_endings.map(e => ps + e));
      add('pluperfect', V.pluperfect_endings.map(e => ps + e));
      add('futureperfect', V.futureperfect_endings.map(e => ps + e));
    }
    return out;
  }

  // Passive: only 1st conjugation (the passive endings in my notes contain -ā-).
  function passiveForms(w) {
    if (w.conj !== '1' || w.irregular || w.noPassive || w.special) return [];
    const pp = parts(w.parts), root = pp[1].slice(0, -3), mroot = conjModel('1').root, out = [];
    const strip = arr => arr.map(f => nfc(f).slice(mroot.length));
    const add = (tense, arr, alts) => arr.forEach((f, p) => out.push({
      form: nfc(f), alts: alts ? alts[p] : [nfc(f)], tense, p, voice: 'passive',
      tags: verbTags(tense, -1), label: TENSE_NAME[tense] + ' passive, ' + PERSON[p]
    }));
    add('present', strip(PV.present_model).map(e => root + e));
    add('imperfect', strip(PV.imperfect_model).map(e => root + e));
    add('future', strip(PV.future_model_12).map(e => root + e));
    if (pp[3]) {
      const b = pp[3].slice(0, -2); // vocātus -> vocāt
      [['perfect', V.sum.present], ['pluperfect', V.sum.imperfect], ['futureperfect', V.sum.future]].forEach(([t, sum]) => {
        const forms = sum.map((s, p) => b + (p < 3 ? 'us' : 'ī') + ' ' + s);
        const alts = sum.map((s, p) => (p < 3 ? ['us', 'a', 'um'] : ['ī', 'ae', 'a']).map(e => nfc(b + e + ' ' + s)));
        add(t, forms, alts);
      });
    }
    return out;
  }

  function imperativeOf(w) {
    const irr = O.imperatives.irregular.find(i => i.lemma === w.lemma);
    if (irr) return { sg: nfc(irr.sg), pl: nfc(irr.pl) };
    if (w.noImperative || w.special) return null;
    const inf = parts(w.parts)[1], sg = inf.slice(0, -2);
    return { sg, pl: w.conj === '3' ? inf.slice(0, -3) + 'ite' : sg + 'te' };
  }

  function meaning(w, tense, p) {
    if (!Array.isArray(w.en)) return null;
    const [base, s3, past, pp, ing] = w.en, M = V.meanings;
    return M[tense].replace('{S}', M.subjects[p]).replace('{pres}', p === 2 ? s3 : base)
      .replace('{was}', p === 0 || p === 2 ? 'was' : 'were').replace('{base}', base)
      .replace('{past}', past).replace('{pp}', pp).replace('{ing}', ing);
  }

  function futureSign(w) { return (w.conj === '3' || w.conj === '4') ? 'future_34' : 'future_12'; }
  function verbReason(w, e) {
    if (w.special) return V.tenseSigns.sum;
    const sign = V.tenseSigns[e.tense === 'future' ? futureSign(w) : e.tense] || '';
    const person = e.tense === 'perfect' ? '' : ' ' + V.personSigns[e.p] + '.';
    return sign + person;
  }

  /* ---------- question builders ---------- */
  const shared = (a, b) => ['num', 'cas', 'gen', 'tense', 'p', 'voice'].reduce((n, k) => n + (a[k] !== undefined && a[k] === b[k] ? 1 : 0), 0);

  // Multiple choice "what form is this?" that never offers two correct labels.
  function identify(entries, t, extra) {
    const okLabels = uniq(entries.filter(e => e.form === t.form).map(e => e.label));
    let pool = entries.filter(e => e.form !== t.form && !okLabels.includes(e.label));
    const partner = t.tense && pool.find(e => e.tense === TRAP_PARTNER[t.tense] && e.p === t.p && e.voice === t.voice);
    pool = shuffle(pool).sort((a, b) => shared(b, t) - shared(a, t));
    const near = uniq(pool.slice(0, 6).map(e => e.label));
    let dis = shuffle(near).slice(0, 3);
    if (partner && !dis.includes(partner.label)) dis = [partner.label].concat(dis.slice(0, 2));
    const choices = shuffle([t.label].concat(dis));
    const also = okLabels.filter(l => l !== t.label);
    return Object.assign({ kind: 'mc', choices, correct: choices.indexOf(t.label), display: t.label, also }, extra);
  }

  function mc(correct, wrong, extra) {
    const choices = shuffle([correct].concat(shuffle(uniq(wrong.filter(x => x !== correct))).slice(0, 3)));
    return Object.assign({ kind: 'mc', choices, correct: choices.indexOf(correct), display: correct }, extra);
  }

  function typed(answers, extra) {
    answers = uniq(answers.map(nfc));
    return Object.assign({ kind: 'type', answers, display: answers[0] }, extra);
  }

  const alsoNote = also => (also && also.length ? ' The same form can also be ' + also.join(' or ') + '.' : '');
  const B = s => '<b class="la">' + esc(s) + '</b>';

  /* ---------- items (one per thing to learn, used by spaced repetition) ---------- */
  let ITEMS = null, BY_KEY = null;

  function item(key, topic, tags, make) {
    const it = { key, topic, tags: tags || [], make };
    it.trap = it.tags.some(t => TRAPS[t]);
    return it;
  }

  function nounItems() {
    const out = [];
    N.words.filter(w => !w.proper).forEach(w => {
      const P = nounForms(w), dict = w.lemma + ', ' + w.gen + ' ' + w.gender + '.';
      const dname = N.names[w.pattern] + (w.note ? ', ' + w.note : '');
      P.forEach(e => out.push(item('n:' + w.lemma + ':' + e.num + ':' + e.cas, 'nouns', e.tags, () => {
        const also = P.filter(x => x.form === e.form && x.label !== e.label).map(x => x.label);
        const reason = (e.ending ? '-' + e.ending + ' marks the ' + e.label + ' in the ' + dname + '.' : e.form + ' is the ' + e.label + ' of ' + w.lemma + ' (' + dname + ').') + alsoNote(also) + ' ' + trapNote(e.tags);
        const kinds = ['identify', 'produce'];
        if (e.ending) kinds.push('ending');
        const k = pick(kinds);
        if (k === 'identify') return identify(P, e, { prompt: 'What case and number is ' + B(e.form) + '?', sub: dict, reason });
        if (k === 'produce') return typed([e.form], { prompt: 'Type the <b>' + e.label + '</b> of ' + B(w.lemma) + '.', sub: dict, reason });
        const endings = uniq(P.filter(x => x.ending && x.ending !== e.ending).map(x => '-' + x.ending));
        return mc('-' + e.ending, endings, { prompt: 'Pick the ending: ' + B(w.stem + '___') + ' (' + e.label + ')', sub: dict, reason });
      })));
    });
    return out;
  }

  function adjItems() {
    const out = [], nouns = N.words.filter(w => !w.proper && known(w));
    A.words.forEach(w => {
      const P = adjForms(w);
      P.forEach(e => out.push(item('a:' + w.lemma + ':' + e.num + ':' + e.gen + ':' + e.cas, 'adjectives', e.tags, () => {
        const also = P.filter(x => x.form === e.form && x.label !== e.label).map(x => x.label);
        const reason = e.form + ' is ' + e.label + ' (' + w.dict + ').' + alsoNote(also) + ' ' + trapNote(e.tags);
        const cands = nouns.filter(n => n.gender === e.gen);
        if (cands.length && Math.random() < 0.65) {
          const n = pick(cands), NF = nounForms(n), nf = NF.find(x => x.num === e.num && x.cas === e.cas);
          const ambiguous = NF.some(x => x.form === nf.form && x.label !== nf.label);
          const wrong = P.filter(x => x.form !== e.form).sort((a, b) => shared(b, e) - shared(a, e)).slice(0, 8).map(x => x.form);
          const hint = ambiguous ? ' (' + nf.label + ')' : '';
          return mc(e.form, shuffle(wrong), {
            prompt: 'Which form of ' + B(w.lemma) + ' agrees with ' + B(nf.form) + hint + '?',
            sub: n.lemma + ' is ' + GEN_NAME[n.gender] + '. ' + w.dict,
            reason: 'The adjective matches the noun in case, number and gender (' + e.label + '), not necessarily in ending. ' + reason
          });
        }
        return identify(P, e, { prompt: 'What case, number and gender is ' + B(e.form) + '?', sub: w.dict, reason });
      })));
    });
    return out;
  }

  function verbItems() {
    const out = [];
    V.words.forEach(w => {
      const P = verbForms(w);
      P.forEach(e => {
        const topic = ['perfect', 'pluperfect', 'futureperfect'].includes(e.tense) ? 'perfect' : 'tenses';
        out.push(item('v:' + w.lemma + ':' + e.tense + ':' + e.p, topic, e.tags, () => {
          const reason = verbReason(w, e) + ' ' + trapNote(e.tags);
          const kinds = ['identify', 'produce'];
          if (meaning(w, e.tense, e.p)) kinds.push('meaning');
          const k = pick(kinds);
          if (k === 'identify') return identify(P, e, { prompt: 'Tense, person and number of ' + B(e.form) + '?', sub: w.parts, reason });
          if (k === 'produce') return typed([e.form], { prompt: 'Type the <b>' + e.label + '</b> of ' + B(w.lemma) + '.', sub: w.parts, reason });
          const right = meaning(w, e.tense, e.p);
          const wrong = P.filter(x => x.form !== e.form && (x.p === e.p || x.tense === e.tense)).map(x => meaning(w, x.tense, x.p));
          return mc(right, wrong, { prompt: 'What does ' + B(e.form) + ' mean?', sub: w.parts, reason: e.form + ' is ' + e.label + '. ' + reason });
        }));
      });
      const PP = passiveForms(w);
      PP.forEach(e => out.push(item('p:' + w.lemma + ':' + e.tense + ':' + e.p, 'passive', e.tags, () => {
        const sign = e.tense === 'perfect' || e.tense === 'pluperfect' || e.tense === 'futureperfect'
          ? PV[e.tense + '_passive'] + '.' : 'Passive endings: -r, -ris, -tur, -mur, -minī, -ntur.';
        const reason = sign + ' ' + trapNote(e.tags);
        if (Math.random() < 0.5) return identify(PP.concat(P), e, { prompt: 'Identify ' + B(e.form) + '.', sub: w.parts, reason });
        return typed(e.alts, { prompt: 'Type the <b>' + e.label + '</b> of ' + B(w.lemma) + '.', sub: w.parts, reason });
      })));
      const imp = imperativeOf(w);
      if (imp) ['sg', 'pl'].forEach(n => out.push(item('imp:' + w.lemma + ':' + n, 'imperatives', [], () => {
        const form = imp[n], who = n === 'sg' ? 'one person' : 'several people';
        const reason = O.imperatives.rule;
        if (Math.random() < 0.5) return typed([form], { prompt: 'Command to <b>' + who + '</b>: ' + B(w.lemma) + ' (' + (Array.isArray(w.en) ? w.en[0] : w.en) + '!)', sub: w.parts, reason });
        const pres = verbForms(w).find(x => x.tense === 'present' && x.p === 4);
        const opts = { 'imperative singular': imp.sg, 'imperative plural': imp.pl, 'present infinitive': parts(w.parts)[1] };
        if (pres) opts['present, 2nd person plural'] = pres.form;
        const right = 'imperative ' + (n === 'sg' ? 'singular' : 'plural');
        const wrong = Object.keys(opts).filter(k => opts[k] !== form);
        return mc(right, wrong, { prompt: 'What form is ' + B(form) + '?', sub: w.parts, reason });
      })));
    });
    O.imperatives.irregular.filter(i => !verbBy(i.lemma)).forEach(i => ['sg', 'pl'].forEach(n => out.push(item('imp:' + i.lemma + ':' + n, 'imperatives', [], () =>
      typed([i[n]], { prompt: 'Irregular command to <b>' + (n === 'sg' ? 'one person' : 'several people') + '</b>: ' + B(i.lemma) + ' (' + i.en + '!)', reason: 'Irregular singular imperatives: dīc, dūc, fac, fer (plural dīcite, dūcite, facite, ferte).' })))));
    return out;
  }

  function otherItems() {
    const out = [];
    const neg = O.imperatives.negative;
    ['one', 'many'].forEach(k => out.push(item('neg:' + k, 'imperatives', [], () => {
      const v = pick(V.words.filter(w => !w.special && Array.isArray(w.en)));
      return mc(neg[k], [neg.one, neg.many].concat(neg.wrong), {
        prompt: 'Tell ' + (k === 'one' ? 'one person' : 'several people') + ' "Don\'t ' + v.en[0] + '!": ___ ' + B(parts(v.parts)[1]),
        reason: neg.rule + '.'
      });
    })));
    O.questions.forEach(q => out.push(item('q:' + q.word, 'imperatives', ['questions'], () => {
      const reason = trapNote(['questions']) || O.questions.map(x => x.word + ' expects ' + x.expects).join(', ');
      if (Math.random() < 0.5) return mc(q.expects, O.questions.map(x => x.expects), { prompt: 'A question that uses ' + B(q.word) + ' expects the answer:', reason });
      return mc(q.word, O.questions.map(x => x.word), { prompt: 'Which word starts a question that expects the answer <b>' + esc(q.expects) + '</b>?', reason });
    })));
    const PR = pronForms();
    PR.forEach(e => out.push(item('pr:' + e.num + ':' + e.gen + ':' + e.cas, 'pronouns', [], () => {
      const also = PR.filter(x => x.form === e.form && x.label !== e.label).map(x => x.label);
      const reason = e.form + ' is the ' + e.label + ' of is, ea, id.' + alsoNote(also);
      if (Math.random() < 0.5) return identify(PR, e, { prompt: 'What case, number and gender is ' + B(e.form) + '?', sub: 'is, ea, id (he, she, it)', reason });
      return typed([e.form], { prompt: 'Type the <b>' + e.label + '</b> of is, ea, id.', reason });
    })));
    O.pronouns.personal.forEach(p => out.push(item('pp:' + p.la, 'pronouns', [], () =>
      mc(p.en, O.pronouns.personal.map(x => x.en), { prompt: 'What does ' + B(p.la) + ' mean?', reason: O.pronouns.personal.map(x => x.la + ' = ' + x.en).join(', ') + '.' }))));
    Object.keys(O.caseUses).forEach(cas => O.caseUses[cas].forEach((use, i) => {
      const tags = /fugere/.test(use) ? ['fugere'] : [];
      out.push(item('cu:' + cas + ':' + i, 'cases', tags, () => {
        const sameUse = Object.keys(O.caseUses).filter(c => O.caseUses[c].includes(use));
        if (Math.random() < 0.5) {
          return mc(CASE_NAME[cas], CASES.filter(c => !sameUse.includes(c)).map(c => CASE_NAME[c]),
            { prompt: 'Which case is used for <b>' + esc(use) + '</b>?', reason: CASE_NAME[cas] + ': ' + O.caseUses[cas].join(', ') + '. ' + trapNote(tags) });
        }
        const wrong = [].concat(...CASES.filter(c => c !== cas).map(c => O.caseUses[c])).filter(u => !O.caseUses[cas].includes(u));
        return mc(use, wrong, { prompt: 'Which is a use of the <b>' + CASE_NAME[cas] + '</b>?', reason: CASE_NAME[cas] + ': ' + O.caseUses[cas].join(', ') + '. ' + trapNote(tags) });
      }));
    }));
    return out;
  }

  const senses = s => s.split(',').map(x => x.trim().toLowerCase());
  const overlap = (a, b) => senses(a).some(s => senses(b).includes(s));

  function vocabItems() {
    const W = VOC.words;
    return W.map(v => item('vo:' + v.la, v.course ? 'course' : 'vocab', v.tags || [], () => {
      const others = [];
      shuffle(W.filter(x => x !== v && known(x))).forEach(x => { if (!overlap(x.en, v.en) && !others.some(o => overlap(o.en, x.en))) others.push(x); });
      const sameP = others.filter(x => x.pos === v.pos), pool = sameP.length >= 3 ? sameP : others;
      const shown = v.dict || v.la, reason = shown + ' = ' + v.en + '. ' + trapNote(v.tags);
      if (Math.random() < 0.5) return mc(v.en, pool.map(x => x.en), { prompt: 'What does ' + B(shown) + ' mean?', reason });
      return mc(v.la, pool.map(x => x.la), { prompt: 'Which Latin word means <b>' + esc(v.en) + '</b>?', reason });
    }));
  }

  /* ---------- passage items ---------- */
  function findToken(tokens, w, n) {
    let seen = 0;
    for (let i = 0; i < tokens.length; i++) if (bare(tokens[i]) === bare(w) && ++seen === (n || 1)) return i;
    return -1;
  }
  function underline(s, w, n) {
    const toks = s.la.split(/\s+/), i = findToken(toks, w, n);
    return toks.map((t, j) => (j === i ? '<u>' + esc(t) + '</u>' : esc(t))).join(' ');
  }
  const MOODS = ['imperative singular', 'imperative plural', 'present infinitive', 'present, 2nd person plural'];

  function contextParse(a) {
    if (a.pos === 'verb') {
      if (a.mood === 'imperative') return { label: 'imperative ' + NUM_NAME[a.num], moods: true };
      if (a.mood === 'infinitive') return { label: 'present infinitive', moods: true };
      const p = (a.person - 1) + (a.num === 'pl' ? 3 : 0), w = verbBy(a.lemma);
      return w && { P: verbForms(w), t: { tense: a.tense, p, label: TENSE_NAME[a.tense] + ', ' + PERSON[p] } };
    }
    if (a.cas === 'voc') return null;
    if (a.pos === 'noun') { const w = nounBy(a.lemma); return w && { P: nounForms(w), t: { num: a.num, cas: a.cas, label: CASE_NAME[a.cas] + ' ' + NUM_NAME[a.num] } }; }
    if (a.pos === 'adj') { const w = adjBy(a.lemma); return w && { P: adjForms(w), t: { num: a.num, gen: a.gen, cas: a.cas, label: CASE_NAME[a.cas] + ' ' + NUM_NAME[a.num] + ' ' + GEN_NAME[a.gen] } }; }
    if (a.pos === 'pron' && a.lemma === 'is') return { P: pronForms(), t: { num: a.num, gen: a.gen, cas: a.cas, label: CASE_NAME[a.cas] + ' ' + NUM_NAME[a.num] + ' ' + GEN_NAME[a.gen] } };
    return null;
  }

  function formInContextQ(s, a) {
    const cp = contextParse(a);
    const ctx = underline(s, a.w, a.n);
    const gloss = ' Here: ' + a.gloss + '.';
    if (cp.moods) return mc(cp.label, MOODS, { prompt: 'What form is the underlined word ' + B(a.w) + '?', context: ctx, reason: O.imperatives.rule + gloss });
    const t = Object.assign({ form: '\u0000' }, cp.t);
    const others = cp.P.filter(e => e.label !== t.label);
    const wrong = shuffle(others).sort((x, y) => shared(y, t) - shared(x, t)).slice(0, 6).map(e => e.label);
    const q = mc(t.label, shuffle(wrong), { prompt: 'What is the form of the underlined word ' + B(a.w) + '?', context: ctx });
    const alt = cp.P.filter(e => bare(e.form) === bare(a.enclitic ? a.w.slice(0, -a.enclitic.length) : a.w) && e.label !== t.label).map(e => e.label);
    q.reason = a.w + ' is ' + t.label + (a.role ? ' (' + a.role + ')' : '') + '.' + gloss + (alt.length ? ' Out of context it could also be ' + alt.join(' or ') + ', but not here.' : '') + ' ' + trapNote(a.tags);
    return q;
  }

  function passageItems() {
    const out = [];
    PS.sentences.forEach((s, si) => {
      s.words.forEach((a, ai) => {
        if (contextParse(a)) out.push(item('pf:' + si + ':' + ai, 'passage', a.tags || [], () => formInContextQ(s, a)));
        if (a.role && PS.roles.includes(a.role)) out.push(item('r:' + si + ':' + ai, 'cases', a.tags || [], () =>
          mc(a.role, PS.roles, { prompt: 'What is the role of the underlined word ' + B(a.w) + '?', context: underline(s, a.w, a.n), reason: a.w + ' (' + (a.cas ? CASE_NAME[a.cas] : a.pos) + '): ' + a.role + '. Here: ' + a.gloss + '. ' + trapNote(a.tags) })));
      });
      ['subject', 'direct object'].forEach(role => {
        if (!s.words.some(a => a.role === role)) return;
        out.push(item('t:' + si + ':' + role, 'cases', [], () => {
          const toks = s.la.split(/\s+/);
          const targets = s.words.filter(a => a.role === role);
          const ok = s.words.filter(a => a.role === role || (a.role === 'apposition' && targets.some(t => t.cas === a.cas)));
          const idx = ok.map(a => findToken(toks, a.w, a.n)).filter(i => i >= 0);
          return {
            kind: 'tap', tokens: toks, correctTokens: idx,
            prompt: 'Tap ' + (targets.length > 1 ? 'a' : 'the') + ' <b>' + role + '</b>.',
            display: targets.map(a => a.w).join(', '),
            reason: (role === 'subject' ? 'The subject is nominative' : 'The direct object is accusative') + ': ' + targets.map(a => a.w + ' (' + a.gloss + ')').join(', ') + '.'
          };
        }));
      });
    });
    PS.plot.forEach((p, i) => out.push(item('plot:' + i, 'passage', [], () =>
      mc(p.choices[p.answer], p.choices, { prompt: esc(p.q), reason: 'From the story: ' + p.choices[p.answer] + '.' }))));
    PS.phrases.forEach((p, i) => out.push(item('ph:' + i, 'passage', p.tags || [], () => {
      const s = PS.sentences.find(x => norm(x.la).includes(norm(p.la)));
      return mc(p.en, p.wrong, { prompt: 'Best translation of ' + B(p.la) + '?', context: s ? esc(s.la) : '', reason: 'Watch tense, person and case. ' + trapNote(p.tags) });
    })));
    return out;
  }

  function items() {
    if (ITEMS) return ITEMS;
    ITEMS = [].concat(nounItems(), adjItems(), verbItems(), otherItems(), vocabItems(), passageItems());
    BY_KEY = {}; ITEMS.forEach(it => { BY_KEY[it.key] = it; const l = it.key.split(':')[1]; it.course = COURSE_LEMMAS.has(l) ? l : null; });
    return ITEMS;
  }
  const byKey = k => (items(), BY_KEY[k]);

  function question(it) {
    const q = it.make();
    q.key = it.key; q.topic = it.topic; q.trap = it.trap;
    q.reason = (q.reason || '').replace(/\s+/g, ' ').trim();
    return q;
  }

  /* ---------- practice test ---------- */
  function testPart1(n) {
    const all = items();
    const want = [['pf', 6], ['r', 3], ['ph', 2], ['vo', 1], ['plot', 3]];
    const passageVocab = new Set(PS.sentences.flatMap(s => s.words.map(a => a.lemma)));
    const out = [];
    want.forEach(([pre, k]) => {
      let pool = all.filter(it => it.key.startsWith(pre + ':'));
      if (pre === 'vo') pool = pool.filter(it => passageVocab.has(it.key.slice(3)));
      shuffle(pool).slice(0, k).forEach(it => out.push(it));
    });
    return out.slice(0, n || 15).map(it => {
      let q = question(it);
      for (let tries = 0; q.kind !== 'mc' && tries < 10; tries++) q = question(it);
      return q;
    });
  }

  function testPart2(n) {
    return shuffle(GK.questions).slice(0, n || 10).map((g, i) => mc(g.choices[g.answer], g.choices, {
      key: null, prompt: esc(g.q), context: g.context ? esc(g.context) : '', reason: g.explanation || ''
    }));
  }

  function grade(q, given) {
    if (q.kind === 'mc') return given === q.correct;
    if (q.kind === 'type') return matches(given, q.answers);
    if (q.kind === 'tap') return q.correctTokens.includes(given);
    return false;
  }

  root.Latin = {
    norm, matches, esc, shuffle, pick, uniq, nfc, bare,
    CASES, CASE_NAME, NUM_NAME, GEN_NAME, TENSES, TENSE_NAME, PERSON, TOPICS, TRAPS,
    nounForms, adjForms, pronForms, verbForms, passiveForms, imperativeOf, meaning, conjModel, parts,
    nounBy, adjBy, verbBy, contextParse, findToken, underline,
    items, byKey, question, testPart1, testPart2, grade,
    COURSE_ON, COURSE_ORDER, COURSE_LEMMAS,
    setUnlocked: list => { UNLOCKED = new Set(list || []); },
    available: it => !it.course || UNLOCKED.has(it.course),
    vocabEntry: la => VOC.words.find(v => nfc(v.la) === nfc(la))
  };
})(typeof window !== 'undefined' ? window : globalThis);
