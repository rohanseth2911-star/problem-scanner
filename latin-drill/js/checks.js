/* Self-checks. Used by tools/check.js (Node) and tools/check.html (browser).
   FAIL = a bug in the app. DATA = my tables disagree with each other or with the
   passage (likely a typo in my notes): see data/SUSPECTED_ERRORS.md. */
(function (root) {
  'use strict';
  function runChecks(sources) {
    const L = root.Latin, V = root.LATIN_VERBS, PV = root.LATIN_PASSIVE, N = root.LATIN_NOUNS, PS = root.LATIN_PASSAGE;
    const res = [];
    const pass = (name, detail) => res.push({ status: 'PASS', name, detail: detail || '' });
    const fail = (name, detail) => res.push({ status: 'FAIL', name, detail });
    const data = (name, detail) => res.push({ status: 'DATA', name, detail });
    const eq = (a, b) => L.nfc(a) === L.nfc(b);

    // 1. My generic ending tables vs the full model tables I typed.
    const cmp = (name, built, typed) => {
      const bad = built.map((f, i) => (eq(f, typed[i]) ? null : f + ' vs ' + typed[i])).filter(Boolean);
      bad.length ? data(name, 'built from endings vs typed table: ' + bad.join('; ')) : pass(name);
    };
    const ps = L.parts(V.conjugations['1'].voco)[2].slice(0, -1);
    const pm = V.perfect_model['vocō'];
    cmp('perfect endings match vocō perfect table', V.perfect_endings.map(e => ps + e), pm.perfect);
    cmp('pluperfect endings match vocō pluperfect table', V.pluperfect_endings.map(e => ps + e), pm.pluperfect);
    cmp('future perfect endings match vocō future perfect table', V.futureperfect_endings.map(e => ps + e), pm.futureperfect);
    cmp('1st conj: vocā + future_12 matches vocō future', V.future_12.map(e => 'vocā' + e), V.conjugations['1'].future);
    cmp('2nd conj: habē + future_12 matches habeō future', V.future_12.map(e => 'habē' + e), V.conjugations['2'].future);
    cmp('3rd conj: reg + future_34 matches regō future', V.future_34.map(e => 'reg' + e), V.conjugations['3'].future);
    cmp('4th conj: audi + future_34 matches audiō future', V.future_34.map(e => 'audi' + e), V.conjugations['4'].future);
    cmp('1st conj: vocā + imperfect endings matches vocō imperfect', V.imperfect_endings.map(e => 'vocā' + e), V.conjugations['1'].imperfect);
    cmp('2nd conj: habē + imperfect endings matches habeō imperfect', V.imperfect_endings.map(e => 'habē' + e), V.conjugations['2'].imperfect);
    cmp('3rd conj: regē + imperfect endings matches regō imperfect', V.imperfect_endings.map(e => 'regē' + e), V.conjugations['3'].imperfect);
    cmp('4th conj: audiē + imperfect endings matches audiō imperfect', V.imperfect_endings.map(e => 'audiē' + e), V.conjugations['4'].imperfect);
    cmp('passive present endings match vocor table', PV.present.map(e => 'voc' + e), PV.present_model);
    cmp('pluperfect endings look like the imperfect of sum (trap)', V.pluperfect_endings.map(e => e), V.sum.imperfect);
    const fp = V.futureperfect_endings, sf = V.sum.future;
    const diff = fp.map((e, i) => (eq(e, sf[i]) ? null : i)).filter(i => i !== null);
    diff.length === 1 && diff[0] === 5 ? pass('future perfect endings = future of sum except 3rd plural (-erint vs erunt)')
      : data('future perfect endings vs future of sum', 'differ at persons ' + diff.map(i => i + 1).join(', '));
    Object.keys(N.patterns).forEach(k => {
      const p = N.patterns[k], [nom, gen] = p.model.split(',').map(s => s.trim().split(' ')[0]);
      const bn = p.sg.nom.startsWith('(') ? p.sg.nom.slice(1, -1) : p.stem + p.sg.nom;
      eq(bn, nom) && eq(p.stem + p.sg.gen, gen) ? pass('noun table ' + k + ' matches its model ' + p.model)
        : data('noun table ' + k, 'stem + endings give ' + bn + ', ' + p.stem + p.sg.gen + ' but model says ' + p.model);
    });
    const ex = root.LATIN_OTHER.imperatives.examples;
    const impBad = Object.keys(ex).filter(l => { const i = L.imperativeOf(L.verbBy(l)); return !i || !eq(i.sg, ex[l][0]) || !eq(i.pl, ex[l][1]); });
    impBad.length ? fail('imperative rule', 'wrong for ' + impBad.join(', ')) : pass('imperative rule reproduces vocā/vocāte, habē/habēte, rege/regite, audī/audīte');
    // Typed model tables vs forms the app builds for the model verbs.
    ['vocō', 'habeō', 'regō', 'audiō'].forEach((l, ci) => {
      const F = L.verbForms(L.verbBy(l)), c = V.conjugations[String(ci + 1)];
      const bad = ['present', 'imperfect', 'future'].flatMap(t => c[t].map((f, p) => (eq(F.find(x => x.tense === t && x.p === p).form, f) ? null : f)).filter(Boolean));
      bad.length ? fail('model verb ' + l, 'built forms differ: ' + bad.join(', ')) : pass('model verb ' + l + ' rebuilt exactly from its table');
    });

    // 2. Every passage annotation matches the passage and the built forms.
    const textN = L.nfc(PS.text);
    const notIn = PS.sentences.filter(s => !textN.includes(L.nfc(s.la)));
    notIn.length ? fail('passage sentences', 'not found in text: ' + notIn.map(s => s.la).join(' | ')) : pass('all ' + PS.sentences.length + ' passage sentences appear in the text');
    let annBad = [], annData = [], annCount = 0;
    PS.sentences.forEach(s => s.words.forEach(a => {
      annCount++;
      const toks = s.la.split(/\s+/);
      if (L.findToken(toks, a.w, a.n) < 0) { annBad.push(a.w + ' not in "' + s.la + '"'); return; }
      if (a.role && !PS.roles.includes(a.role)) annBad.push(a.w + ': role "' + a.role + '" not in roles list');
      const w = L.bare(a.enclitic ? a.w.slice(0, -a.enclitic.length) : a.w);
      let built = null;
      if (a.pos === 'verb' && a.mood === 'infinitive') built = L.parts(L.verbBy(a.lemma).parts)[1];
      else if (a.pos === 'verb' && a.mood === 'imperative') built = L.imperativeOf(L.verbBy(a.lemma))[a.num];
      else if (a.cas === 'voc') { const cp = L.contextParse(Object.assign({}, a, { cas: 'nom' })); built = cp && cp.P.find(e => e.label === cp.t.label).form; }
      else { const cp = L.contextParse(a); if (cp) { const e = cp.P.find(x => x.label === cp.t.label); built = e ? e.form : '(missing)'; } }
      if (built !== null && L.bare(built) !== w) annData.push('"' + a.w + '" annotated as ' + a.lemma + ' ' + [a.tense, a.person, a.cas, a.num, a.gen, a.mood].filter(Boolean).join(' ') + ', but the tables build "' + built + '"');
    }));
    annBad.length ? fail('passage annotations', annBad.join('; ')) : pass('all ' + annCount + ' annotated words found in their sentences');
    annData.length ? data('passage words vs built forms', annData.join('; ')) : pass('every annotated passage word matches the form built from the tables');
    const tr = root.LATIN_TRANSLATION.segments.filter(s => !textN.includes(L.nfc(s.la)));
    tr.length ? fail('translation segments', 'not found in passage: ' + tr.map(s => s.la).join(' | ')) : pass('all ' + root.LATIN_TRANSLATION.segments.length + ' translation segments appear in the passage');

    // 3. Generated questions are internally consistent.
    const items = L.items();
    let qBad = [], counts = {};
    const total = items.length + 500;
    for (let i = 0; i < total; i++) {
      const it = items[i < items.length ? i : Math.floor(Math.random() * items.length)];
      const q = L.question(it);
      counts[q.kind] = (counts[q.kind] || 0) + 1;
      const where = it.key + ': ';
      if (/—/.test(q.prompt + q.reason + (q.choices || []).join(''))) qBad.push(where + 'em dash');
      if (q.kind === 'mc') {
        if (new Set(q.choices.map(L.nfc)).size !== q.choices.length) qBad.push(where + 'duplicate choices ' + q.choices.join(' / '));
        if (q.choices.length < 2) qBad.push(where + 'fewer than 2 choices');
        if (q.correct < 0 || q.choices[q.correct] !== q.display) qBad.push(where + 'correct index wrong');
        if (q.also && q.choices.some(c => q.also.includes(c))) qBad.push(where + 'two correct choices');
      } else if (q.kind === 'type') {
        if (!q.answers.length || !L.matches(q.answers[0], q.answers)) qBad.push(where + 'answer does not match itself');
      } else if (q.kind === 'tap') {
        if (!q.correctTokens.length) qBad.push(where + 'no tappable answer');
      }
      // Answer must equal the form built from the tables for form-production items.
      const m = it.key.match(/^v:(.+):(\w+):(\d)$/);
      if (m && q.kind === 'type') {
        const f = L.verbForms(L.verbBy(m[1])).find(e => e.tense === m[2] && e.p === +m[3]).form;
        if (!eq(q.answers[0], f)) qBad.push(where + 'typed answer ' + q.answers[0] + ' differs from table ' + f);
      }
      const n = it.key.match(/^n:(.+):(sg|pl):(\w+)$/);
      if (n && q.kind === 'type') {
        const f = L.nounForms(L.nounBy(n[1])).find(e => e.num === n[2] && e.cas === n[3]).form;
        if (!eq(q.answers[0], f)) qBad.push(where + 'typed answer differs from table');
      }
    }
    qBad.length ? fail('generated questions', qBad.slice(0, 20).join('; ')) :
      pass(total + ' generated questions (every item at least once): no duplicate or double-correct choices, answers match tables', JSON.stringify(counts) + ', ' + items.length + ' items');
    const p1 = L.testPart1(15);
    p1.length === 15 && p1.every(q => q.kind === 'mc') ? pass('practice test Part 1 has 15 multiple choice questions') : fail('practice test Part 1', p1.length + ' questions, kinds ' + p1.map(q => q.kind).join(','));

    // 4. Answer matching.
    const mt = [['vocabant', 'vocābant'], ['VOCĀBANT', 'vocābant'], [' vocābant ', 'vocābant'], ['amatus est', 'amātus est'], ['Rege!', 'rege']];
    const mBad = mt.filter(([a, b]) => !L.matches(a, [b]));
    L.matches('vocabat', ['vocābant']) && mBad.push(['vocabat should not match vocābant']);
    mBad.length ? fail('answer matching', JSON.stringify(mBad)) : pass('answer matching ignores macrons, capitals and spaces');

    // 5. No em dashes in anything the app shows.
    if (sources) {
      const hits = Object.keys(sources).filter(k => sources[k].includes('—'));
      hits.length ? fail('no em dashes', 'found in ' + hits.join(', ')) : pass('no em dashes in app or data files (' + Object.keys(sources).length + ' files)');
    }
    return res;
  }
  root.runChecks = runChecks;
})(typeof window !== 'undefined' ? window : globalThis);
