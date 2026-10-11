/* Latin Drill UI: home + streak, daily set, quiz, practice test, reference. */
(function () {
  'use strict';
  const L = window.Latin, SET = window.LATIN_SETTINGS, esc = L.esc;
  const app = document.getElementById('app');

  /* ---------- storage (every access wrapped: the app still runs if it fails) ---------- */
  const KEY = 'latinDrill.v1';
  let storageOK = true;
  function load() { try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch (e) { storageOK = false; return null; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { storageOK = false; } }
  const S = Object.assign({ items: {}, streak: { current: 0, longest: 0, last: null }, days: [], missQueue: [] }, load() || {});

  /* ---------- dates (phone's local date) ---------- */
  const pad = n => String(n).padStart(2, '0');
  const dayStr = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const today = () => dayStr(new Date());
  const addDays = (s, n) => { const [y, m, d] = s.split('-').map(Number); return dayStr(new Date(y, m - 1, d + n)); };
  const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / 864e5);

  function currentStreak() {
    const st = S.streak;
    return st.last === today() || st.last === addDays(today(), -1) ? st.current : 0;
  }
  function finishDay() {
    const t = today(), st = S.streak;
    if (st.last !== t) {
      st.current = st.last === addDays(t, -1) ? st.current + 1 : 1;
      st.last = t;
      st.longest = Math.max(st.longest, st.current);
      if (!S.days.includes(t)) S.days.push(t);
      S.days = S.days.slice(-60);
    }
    save();
  }

  /* ---------- Leitner boxes ---------- */
  // box 1 = again this session and tomorrow, 2 = in 2 days, 3 = 4 days, 4 = 7 days, 5 = mastered (14 days)
  const INTERVAL = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 14 };
  function srs(q, correct, firstTry) {
    if (!q.key) return;
    const r = S.items[q.key] || (S.items[q.key] = { b: 0, c: 0, w: 0 });
    r.d = q.display; r.p = strip(q.prompt).slice(0, 90);
    if (correct) {
      r.c++;
      if (firstTry) { r.b = r.b ? Math.min(5, r.b + 1) : 2; r.due = addDays(today(), INTERVAL[r.b]); }
    } else { r.w++; r.b = 1; r.due = addDays(today(), 1); }
    save();
  }
  const strip = h => String(h || '').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

  function weightedPick(arr, w) {
    const tot = arr.reduce((s, x) => s + w(x), 0);
    let r = Math.random() * tot;
    for (const x of arr) { r -= w(x); if (r <= 0) return x; }
    return arr[arr.length - 1];
  }
  const TOPIC_WEIGHT = L.COURSE_ON
    ? { course: 5, nouns: 2, adjectives: 1.5, tenses: 2, perfect: 2, passive: 1, imperatives: 1, cases: 1, pronouns: 1, vocab: 1, passage: 0.5 }
    : { nouns: 2, adjectives: 1.5, tenses: 2, perfect: 2, passive: 1, imperatives: 1, cases: 2, pronouns: 1, vocab: 2, passage: 3 };

  /* ---------- general course: a few new words unlock each day ---------- */
  S.course = S.course || { unlocked: [], introDay: null };
  L.setUnlocked(S.course.unlocked);
  function unlockToday() {
    if (!L.COURSE_ON || S.course.introDay === today()) return [];
    const fresh = L.COURSE_ORDER.filter(l => !S.course.unlocked.includes(l)).slice(0, SET.newWordsPerDay || 5);
    S.course.unlocked = S.course.unlocked.concat(fresh); S.course.introDay = today();
    L.setUnlocked(S.course.unlocked); save();
    return fresh;
  }
  function introQ(la) {
    const v = L.vocabEntry(la);
    return { kind: 'intro', key: null, prompt: 'New word', la: v.dict || v.la, en: v.en, pos: v.pos, display: v.en };
  }

  function buildDaily(fresh) {
    const n = SET.dailySetSize || 15, t = today(), all = L.items().filter(L.available), keys = [];
    const add = k => { if (!keys.includes(k) && L.byKey(k) && keys.length < n) keys.push(k); };
    S.missQueue.forEach(add); S.missQueue = [];
    (fresh || []).forEach(l => add('vo:' + l));
    const due = Object.keys(S.items).filter(k => { const r = S.items[k]; return r.b >= 1 && r.b < 5 && r.due && r.due <= t; })
      .sort((a, b) => (S.items[a].b - S.items[b].b) || (S.items[a].due < S.items[b].due ? -1 : 1));
    due.slice(0, 9).forEach(add);
    const topics = Object.keys(TOPIC_WEIGHT);
    for (let guard = 0; keys.length < n && guard < 300; guard++) {
      const topic = weightedPick(topics, x => TOPIC_WEIGHT[x]);
      let pool = all.filter(it => it.topic === topic && !S.items[it.key] && !keys.includes(it.key));
      if (!pool.length) pool = all.filter(it => it.topic === topic && !keys.includes(it.key) && ((S.items[it.key] || {}).b || 0) < 5);
      if (pool.length) add(weightedPick(pool, it => (it.trap ? 2 : 1)).key);
    }
    due.slice(9).forEach(add);
    save();
    return L.shuffle(keys);
  }

  /* ---------- session runner (daily, quiz, weak drill, test parts 1 and 2) ---------- */
  let SES = null, TEST = null, timerId = null;

  function startSession(mode, questions, opts) {
    SES = Object.assign({ mode, queue: questions, i: 0, results: [], attempts: 0, missedThisSession: new Set() }, opts || {});
    renderQ();
  }
  const qFor = key => L.question(L.byKey(key));

  function renderQ() {
    const q = SES.queue[SES.i], total = SES.queue.length;
    const pct = Math.round(100 * SES.i / total);
    let body = '';
    if (q.kind === 'mc') body = '<div class="choices">' + q.choices.map((c, i) => '<button class="choice" data-i="' + i + '">' + esc(c) + '</button>').join('') + '</div>';
    if (q.kind === 'type') body = '<form class="typed" autocomplete="off"><input id="ans" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Type the Latin" aria-label="Your answer"><button class="btn primary">Check</button></form><p class="hint">Macrons are optional.</p>';
    if (q.kind === 'intro') body = '<p class="newword la">' + esc(q.la) + '</p><p class="prompt">' + esc(q.en) + '</p><p class="sub">' + esc(q.pos) + '. Say it out loud once, then tap Got it.</p><button class="btn primary wide" data-act="next">Got it</button>';
    if (q.kind === 'tap') body = '<div class="tokens">' + q.tokens.map((t, i) => '<button class="tok" data-i="' + i + '">' + esc(t) + '</button>').join('') + '</div>';
    app.innerHTML =
      '<div class="bar"><button class="link" data-act="quit" aria-label="Quit">&#x2715;</button>' +
      '<div class="prog"><i style="width:' + pct + '%"></i></div><span class="mono">' + (SES.i + 1) + '/' + total + '</span></div>' +
      (SES.title ? '<div class="lbl">' + esc(SES.title) + (TEST && TEST.timed ? ' <span id="timer" class="mono"></span>' : '') + '</div>' : '') +
      '<div class="card q">' + (q.context ? '<p class="ctx la">' + q.context + '</p>' : '') +
      '<p class="prompt">' + q.prompt + '</p>' + (q.sub ? '<p class="sub">' + esc(q.sub) + '</p>' : '') + body + '</div>' +
      '<div id="fb"></div>';
    tickTimer();
    const inp = document.getElementById('ans');
    if (inp) inp.focus();
    SES.answered = q.kind === 'intro';
  }

  function answer(given) {
    if (SES.answered) return;
    SES.answered = true;
    const q = SES.queue[SES.i], ok = L.grade(q, given);
    const firstTry = !SES.missedThisSession.has(q.key);
    if (SES.feedback !== false) srs(q, ok, firstTry);
    if (!ok && q.key) SES.missedThisSession.add(q.key);
    SES.results.push({ q, ok, given });
    SES.attempts++;
    if (!ok && SES.requeue && SES.attempts < 25) SES.queue.push(qFor(q.key));
    // mark choices
    if (q.kind === 'mc') app.querySelectorAll('.choice').forEach((b, i) => {
      b.disabled = true;
      if (i === q.correct && SES.feedback !== false) b.classList.add('right');
      else if (i === given) b.classList.add(SES.feedback === false ? 'picked' : 'wrong');
      else b.classList.add('dim');
    });
    if (q.kind === 'tap') app.querySelectorAll('.tok').forEach((b, i) => {
      b.disabled = true;
      if (q.correctTokens.includes(i)) b.classList.add('right'); else if (i === given) b.classList.add('wrong');
    });
    if (q.kind === 'type') { const f = app.querySelector('.typed'); f.querySelector('input').disabled = true; f.querySelector('button').disabled = true; }
    if (SES.feedback === false) { setTimeout(next, 220); return; }
    const also = q.also && q.also.length && !/also be/.test(q.reason || '') ? '<p class="also">Also possible for this form: ' + esc(q.also.join(', ')) + '</p>' : '';
    const yours = q.kind === 'type' && !ok ? '<p class="also">You typed: ' + esc(given || '(nothing)') + '</p>' : '';
    document.getElementById('fb').innerHTML =
      '<div class="fb ' + (ok ? 'ok' : 'bad') + '"><p class="verdict">' + (ok ? '&#x2713; Correct' : '&#x2717; Not quite' + (SES.requeue ? '. It will come back at the end.' : '')) + '</p>' +
      '<p>Answer: <b class="la">' + esc(q.display) + '</b></p>' + yours + also +
      (q.reason ? '<p class="reason">' + esc(q.reason) + '</p>' : '') +
      '<button class="btn primary wide" data-act="next">Next</button></div>';
    const nb = app.querySelector('[data-act=next]');
    nb.focus({ preventScroll: true });
    document.getElementById('fb').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function next() {
    SES.i++;
    if (SES.i >= SES.queue.length || (SES.requeue && SES.attempts >= 25 && SES.i >= SES.base)) return SES.onDone(SES);
    renderQ();
  }

  /* ---------- home ---------- */
  function weakSpots() {
    return Object.keys(S.items).filter(k => S.items[k].w > 0 && L.byKey(k))
      .sort((a, b) => (S.items[b].w - S.items[b].c * 0.5) - (S.items[a].w - S.items[a].c * 0.5)).slice(0, 5);
  }

  function home() {
    stopTimer(); SES = null; TEST = null;
    const t = today(), streak = currentStreak(), doneToday = S.streak.last === t;
    const left = daysBetween(t, SET.testDate);
    const dots = [];
    for (let i = 6; i >= 0; i--) {
      const d = addDays(t, -i), dt = new Date(d + 'T12:00');
      dots.push('<span class="dot' + (S.days.includes(d) ? ' on' : '') + (i === 0 ? ' today' : '') + '"><i></i>' + 'SMTWTFS'[dt.getDay()] + '</span>');
    }
    const weak = weakSpots();
    app.innerHTML =
      '<header class="head"><h1>Latin <em>Drill</em></h1>' +
      (left >= 0 && !L.COURSE_ON ? '<span class="mono">' + (left === 0 ? 'Test is today' : left + (left === 1 ? ' day' : ' days') + ' to test') + '</span>' : '') + '</header>' +
      '<section class="card streak"><div class="big">' + streak + '</div><div class="bigl">day streak</div>' +
      '<div class="dots">' + dots.join('') + '</div><p class="sub">Longest streak: ' + S.streak.longest + '</p>' +
      (L.COURSE_ON ? '<p class="sub">Words learned: ' + S.course.unlocked.length + ' of ' + L.COURSE_ORDER.length + (S.course.introDay === t ? '' : '. ' + Math.min(SET.newWordsPerDay || 5, L.COURSE_ORDER.length - S.course.unlocked.length) + ' new today') + '</p>' : '') +
      '</section>' +
      '<button class="btn primary wide xl" data-act="daily">' + (doneToday ? 'Do another set' : 'Start today\'s set') + '</button>' +
      (doneToday ? '<p class="hint center">Today is done. Come back tomorrow to keep your streak.</p>' : '<p class="hint center">' + (SET.dailySetSize || 15) + ' questions, about 5 minutes</p>') +
      '<div class="grid"><button class="btn" data-act="quiz">Quiz</button><button class="btn" data-act="test">Practice test</button><button class="btn" data-act="ref">Reference</button></div>' +
      '<div class="lbl">Weak spots</div>' +
      (weak.length ? '<div class="card list">' + weak.map(k => {
        const r = S.items[k];
        return '<div class="row col"><span>' + esc(r.p || k) + ' <span class="mono">missed ' + r.w + 'x</span></span><b class="la">' + esc(r.d || '') + '</b></div>';
      }).join('') + '<button class="btn wide" data-act="weak">Drill these</button></div>'
        : '<p class="hint">Nothing yet. The forms you miss most will show up here.</p>') +
      (storageOK ? '' : '<p class="notice">Progress cannot be saved in this browser (storage is blocked). The app still works.</p>') +
      '<p class="foot"><button class="link" data-act="reset">Reset progress</button></p>';
  }

  function startDaily() {
    const fresh = unlockToday(), keys = buildDaily(fresh);
    startSession('daily', fresh.map(introQ).concat(keys.map(qFor)), {
      requeue: true, base: keys.length + fresh.length, title: fresh.length ? fresh.length + ' new words, then today\'s set' : 'Today\'s set',
      onDone: s => { finishDay(); doneDaily(s); }
    });
  }

  function doneDaily(s) {
    const firsts = new Map();
    s.results.forEach(r => { if (!firsts.has(r.q.key)) firsts.set(r.q.key, r.ok); });
    const right = [...firsts.values()].filter(Boolean).length;
    app.innerHTML = '<div class="card celebrate"><div class="big">' + S.streak.current + '</div><div class="bigl">day streak</div>' +
      '<p class="prompt">Set complete. ' + right + ' of ' + firsts.size + ' right on the first try.</p>' +
      '<p class="sub">Come back tomorrow to keep your streak. Missed forms will come back first.</p></div>' +
      missList(s.results) + '<button class="btn primary wide" data-act="home">Done</button>';
  }

  function missList(results) {
    const seen = new Set(), miss = results.filter(r => !r.ok && !seen.has(r.q.prompt) && seen.add(r.q.prompt));
    if (!miss.length) return '';
    return '<div class="lbl">Missed</div><div class="card list">' + miss.map(r =>
      '<div class="row col"><span>' + esc(strip(r.q.prompt)) + '</span><b class="la">' + esc(r.q.display) + '</b></div>').join('') + '</div>';
  }

  /* ---------- quiz ---------- */
  let quizTopic = L.TOPICS[0].id, quizLen = 10;
  function quizSetup() {
    app.innerHTML = '<div class="bar"><button class="link" data-act="home">&#x2190; Home</button></div><h2>Quiz</h2>' +
      '<div class="lbl">Topic</div><div class="chips">' + L.TOPICS.map(t => '<button class="chip' + (t.id === quizTopic ? ' on' : '') + '" data-topic="' + t.id + '">' + esc(t.name) + '</button>').join('') + '</div>' +
      '<div class="lbl">Length</div><div class="chips">' + [10, 20].map(n => '<button class="chip' + (n === quizLen ? ' on' : '') + '" data-len="' + n + '">' + n + ' questions</button>').join('') + '</div>' +
      '<button class="btn primary wide xl" data-act="quizgo">Start quiz</button>';
  }
  function startQuiz() {
    const pool = L.shuffle(L.items().filter(it => it.topic === quizTopic && L.available(it)));
    if (!pool.length) { app.querySelector('[data-act=quizgo]').textContent = 'No words unlocked yet. Do a daily set first.'; return; }
    const chosen = [];
    while (chosen.length < quizLen && pool.length) {
      const it = weightedPick(pool, x => (x.trap ? 2 : 1) * (S.items[x.key] && S.items[x.key].b >= 4 ? 0.3 : 1));
      chosen.push(it); pool.splice(pool.indexOf(it), 1);
    }
    const name = L.TOPICS.find(t => t.id === quizTopic).name;
    startSession('quiz', chosen.map(it => L.question(it)), {
      title: 'Quiz: ' + name,
      onDone: s => {
        const right = s.results.filter(r => r.ok).length;
        app.innerHTML = '<div class="card celebrate"><div class="big">' + right + '/' + s.results.length + '</div><div class="bigl">' + esc(name) + '</div></div>' +
          (right === s.results.length ? '<p class="hint center">Perfect score.</p>' : missList(s.results)) +
          '<div class="grid two"><button class="btn" data-act="quiz">Another quiz</button><button class="btn primary" data-act="home">Home</button></div>';
      }
    });
  }

  /* ---------- practice test ---------- */
  function testIntro() {
    app.innerHTML = '<div class="bar"><button class="link" data-act="home">&#x2190; Home</button></div><h2>Practice test</h2>' +
      '<div class="card"><p><b>Part 1.</b> 15 multiple choice questions on the Pan passage.</p><p><b>Part 2.</b> General knowledge, from your general.js file.</p>' +
      '<p><b>Part 3.</b> Translate an underlined segment, with a chunk chart. You check it yourself against the model.</p>' +
      '<p class="sub">No feedback until the end, like the real test.</p>' +
      '<label class="check"><input type="checkbox" id="timed" checked> Show a 30 minute timer</label></div>' +
      '<button class="btn primary wide xl" data-act="testgo">Begin</button>';
  }
  function startTest() {
    const tb = document.getElementById('timed');
    TEST = { start: Date.now(), timed: !!(tb && tb.checked), p1: null, p2: null, p3: null };
    if (TEST.timed) timerId = setInterval(tickTimer, 1000);
    startSession('test1', L.testPart1(15), {
      feedback: false, title: 'Part 1: the passage',
      onDone: s => {
        TEST.p1 = s.results;
        const p2 = L.testPart2(10);
        if (!p2.length) { TEST.p2 = []; return part3(); }
        startSession('test2', p2, { feedback: false, title: 'Part 2: general knowledge', onDone: s2 => { TEST.p2 = s2.results; part3(); } });
      }
    });
  }
  function tickTimer() {
    const el = document.getElementById('timer');
    if (!el || !TEST || !TEST.timed) return;
    const left = 30 * 60 - Math.floor((Date.now() - TEST.start) / 1000);
    el.textContent = left > 0 ? Math.floor(left / 60) + ':' + pad(left % 60) : 'Time is up';
  }
  function stopTimer() { if (timerId) clearInterval(timerId); timerId = null; }

  function part3() {
    const T = window.LATIN_TRANSLATION, P = window.LATIN_PASSAGE;
    const seg = L.pick(T.segments);
    TEST.p3 = { seg, ticked: [] };
    const text = esc(L.nfc(P.text)).replace(esc(L.nfc(seg.la)), '<u>' + esc(L.nfc(seg.la)) + '</u>').replace(/\n/g, '<br><br>');
    app.innerHTML = '<div class="bar"><button class="link" data-act="quit" aria-label="Quit">&#x2715;</button><span class="mono">Part 3</span>' +
      (TEST.timed ? '<span id="timer" class="mono"></span>' : '') + '</div>' +
      '<div class="lbl">Part 3: translation</div><div class="card passage la"><p class="ptitle">' + esc(P.title) + '</p>' + text + '</div>' +
      '<div class="lbl">Chunk chart (your thinking, not graded)</div><div class="card chunks">' +
      seg.chunks.map((c, i) => '<label class="chunk"><span class="la">' + esc(c) + '</span><input data-chunk="' + i + '" placeholder="meaning" autocomplete="off"></label>').join('') + '</div>' +
      '<div class="lbl">Your translation of the underlined part</div><textarea id="trans" rows="5" placeholder="Write your English translation here"></textarea>' +
      '<button class="btn primary wide xl" data-act="check3">Check</button><div id="p3fb"></div>';
    tickTimer();
  }
  function check3() {
    const seg = TEST.p3.seg;
    TEST.p3.text = document.getElementById('trans').value;
    document.getElementById('p3fb').innerHTML = '<div class="fb ok neutral"><p class="verdict">Model translation</p><p class="model">' + esc(seg.en) + '</p>' +
      '<p class="sub">Tick each point you got right. Be honest: this is only for you.</p>' +
      seg.checks.map((c, i) => '<label class="check"><input type="checkbox" data-tick="' + i + '"> ' + esc(c) + '</label>').join('') +
      '<button class="btn primary wide" data-act="finish">Finish test</button></div>';
    app.querySelector('[data-act=check3]').remove();
    document.getElementById('p3fb').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function finishTest() {
    stopTimer();
    const seg = TEST.p3.seg;
    const ticks = [...app.querySelectorAll('[data-tick]')];
    const ticked = ticks.filter(t => t.checked).length;
    const p1ok = TEST.p1.filter(r => r.ok).length, p2ok = TEST.p2.filter(r => r.ok).length;
    const mins = Math.round((Date.now() - TEST.start) / 60000);
    const unticked = ticks.filter(t => !t.checked).map(t => seg.checks[+t.dataset.tick]);
    TEST.missKeys = TEST.p1.filter(r => !r.ok && r.q.key).map(r => r.q.key);
    const row = (name, a, b) => '<div class="row"><span>' + name + '</span><b>' + a + ' / ' + b + '</b></div>';
    app.innerHTML = '<h2>Test results</h2><div class="card list">' +
      row('Part 1: passage', p1ok, TEST.p1.length) + row('Part 2: general knowledge', p2ok, TEST.p2.length) +
      row('Part 3: translation checklist', ticked, ticks.length) + '<div class="row"><span>Time</span><b>' + mins + ' min</b></div></div>' +
      missList(TEST.p1.concat(TEST.p2)) +
      (unticked.length ? '<div class="lbl">Translation points to review</div><div class="card list">' + unticked.map(u => '<div class="row col"><span>' + esc(u) + '</span></div>').join('') + '</div>' : '') +
      (TEST.missKeys.length ? '<button class="btn primary wide xl" data-act="drillmiss">Drill my misses (' + TEST.missKeys.length + ')</button><p class="hint center">They will come first in your next daily set.</p>' : '') +
      '<button class="btn wide" data-act="home">Home</button>';
  }
  function drillMisses() {
    TEST.missKeys.forEach(k => {
      const r = S.items[k] || (S.items[k] = { b: 0, c: 0, w: 0 });
      r.b = 1; r.due = today(); r.w++;
      const q = qFor(k); r.d = r.d || q.display; r.p = r.p || strip(q.prompt).slice(0, 90);
      if (!S.missQueue.includes(k)) S.missQueue.push(k);
    });
    save();
    const b = app.querySelector('[data-act=drillmiss]');
    b.textContent = 'Added to your next daily set'; b.disabled = true;
  }

  /* ---------- reference ---------- */
  let blur = false;
  function table(head, rows) {
    return '<div class="tw"><table><thead><tr>' + head.map(h => '<th>' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' +
      rows.map(r => '<tr>' + r.map((c, i) => (i === 0 ? '<th>' + esc(c) + '</th>' : '<td class="ans la">' + esc(c) + '</td>')).join('') + '</tr>').join('') + '</tbody></table></div>';
  }
  function reference() {
    const N = window.LATIN_NOUNS, A = window.LATIN_ADJECTIVES, V = window.LATIN_VERBS, PV = window.LATIN_PASSIVE,
      O = window.LATIN_OTHER, VOC = window.LATIN_VOCAB, P = window.LATIN_PASSAGE, T = window.LATIN_TRANSLATION;
    const C = L.CASES, CN = L.CASE_NAME, h = [];
    const sec = (title, inner) => h.push('<details class="ref"><summary>' + esc(title) + '</summary>' + inner + '</details>');
    sec('Test traps', '<ul>' + O.traps.map(t => '<li>' + esc(t.text) + '</li>').join('') + '</ul>');
    sec('Nouns', N.words.filter(w => w.model).map(w => {
      const F = L.nounForms(w), f = (n, c) => F.find(x => x.num === n && x.cas === c).form;
      return '<p class="tt">' + esc(N.patterns[w.pattern].model) + ' <span class="sub">' + esc(N.names[w.pattern]) + '</span></p>' +
        table(['', 'singular', 'plural'], C.map(c => [CN[c], f('sg', c), f('pl', c)]));
    }).join(''));
    sec('Adjectives', '<ul>' + A.types.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>' + A.words.filter(w => w.model).map(w => {
      const F = L.adjForms(w), f = (n, g, c) => F.find(x => x.num === n && x.gen === g && x.cas === c).form;
      return ['sg', 'pl'].map(n => '<p class="tt">' + esc(w.dict) + ', ' + L.NUM_NAME[n] + '</p>' +
        table(['', 'masc.', 'fem.', 'neut.'], C.map(c => [CN[c], f(n, 'm', c), f(n, 'f', c), f(n, 'n', c)]))).join('');
    }).join(''));
    const persons = ['1 sg', '2 sg', '3 sg', '1 pl', '2 pl', '3 pl'];
    const endKeys = ['present_endings', 'imperfect_endings', 'future_12', 'future_34', 'perfect_endings', 'pluperfect_endings', 'futureperfect_endings'];
    sec('Verb endings', table([''].concat(['pres.', 'impf.', 'fut. 1/2', 'fut. 3/4', 'perf.', 'plupf.', 'fut. pf.']), persons.map((p, i) => [p].concat(endKeys.map(k => '-' + V[k][i])))) +
      '<p class="sub">' + esc(V.tenseMeanings) + '</p>');
    sec('Verbs by conjugation', ['1', '2', '3', '4'].map(c => {
      const w = V.words.find(x => x.model && x.conj === c), F = L.verbForms(w), f = (t, p) => F.find(x => x.tense === t && x.p === p).form;
      return '<p class="tt">' + esc(w.parts) + '</p>' + table(['', 'present', 'imperfect', 'future'], persons.map((p, i) => [p, f('present', i), f('imperfect', i), f('future', i)]));
    }).join('') + '<p class="tt">vocō: perfect system</p>' + (() => {
      const F = L.verbForms(L.verbBy('vocō')), f = (t, p) => F.find(x => x.tense === t && x.p === p).form;
      return table(['', 'perfect', 'pluperfect', 'future perfect'], persons.map((p, i) => [p, f('perfect', i), f('pluperfect', i), f('futureperfect', i)]));
    })() + '<p class="tt">sum and possum</p>' + table(['', 'present', 'imperfect', 'future', 'possum'], persons.map((p, i) => [p, V.sum.present[i], V.sum.imperfect[i], V.sum.future[i], V.possum_present[i]])));
    sec('Passive', table(['', 'present', 'imperfect', 'future'], persons.map((p, i) => [p, PV.present_model[i], PV.imperfect_model[i], PV.future_model_12[i]])) +
      '<ul><li>' + esc(PV.perfect_passive) + '</li><li>' + esc(PV.pluperfect_passive) + '</li><li>' + esc(PV.futureperfect_passive) + '</li><li>' + esc(PV.agent) + '</li></ul>');
    sec('Imperatives and questions', '<p>' + esc(O.imperatives.rule) + '</p>' +
      table(['verb', 'one person', 'several'], Object.keys(O.imperatives.examples).map(k => [k].concat(O.imperatives.examples[k])).concat(O.imperatives.irregular.map(i => [i.lemma, i.sg, i.pl]))) +
      '<p>Negative commands: ' + esc(O.imperatives.negative.rule) + '.</p>' + table(['word', 'expects'], O.questions.map(q => [q.word, q.expects])));
    sec('Pronouns', ['sg', 'pl'].map(n => '<p class="tt">is, ea, id, ' + L.NUM_NAME[n] + '</p>' +
      table(['', 'masc.', 'fem.', 'neut.'], C.map(c => [CN[c], O.pronouns.is[n].m[c], O.pronouns.is[n].f[c], O.pronouns.is[n].n[c]]))).join('') +
      table(['Latin', 'English'], O.pronouns.personal.map(p => [p.la, p.en])));
    sec('Case uses', table(['case', 'uses'], C.map(c => [CN[c], O.caseUses[c].join(', ')])));
    sec('Vocab', table(['Latin', 'English'], VOC.words.map(v => [v.dict || v.la, v.en])));
    sec('Passage, word by word (check these)', P.sentences.map(s => '<p class="tt la">' + esc(s.la) + '</p>' +
      table(['word', 'form', 'role', 'meaning'], s.words.map(a => [a.w,
        [a.lemma, a.tense && L.TENSE_NAME[a.tense], a.person && a.person + (a.num === 'pl' ? ' pl' : ' sg'), a.mood, a.cas && L.CASE_NAME[a.cas], !a.person && a.num, a.gen].filter(Boolean).join(' '),
        a.role || '', a.gloss]))).join(''));
    if (L.COURSE_ON) window.LATIN_COURSE.units.forEach(u => sec(u.name, table(['Latin', 'English', 'learned'],
      u.words.map(c => { const v = L.vocabEntry(c.la) || c; return [v.dict || v.la, v.en, !L.COURSE_LEMMAS.has(L.nfc(c.la)) || S.course.unlocked.includes(L.nfc(c.la)) ? '\u2713' : '']; }))));
    sec('Model translation', '<p class="model">' + esc(T.model).replace(/\n/g, '<br><br>') + '</p>');
    app.innerHTML = '<div class="bar"><button class="link" data-act="home">&#x2190; Home</button>' +
      '<label class="check inline"><input type="checkbox" id="blur"' + (blur ? ' checked' : '') + '> Quiz me (hide answers)</label></div>' +
      '<h2>Reference</h2><p class="hint">Built from the data files, so fixing a table fixes this page too.</p>' +
      '<div class="refs' + (blur ? ' blur' : '') + '">' + h.join('') + '</div>';
  }

  /* ---------- events ---------- */
  // Two-tap confirm (pop-up dialogs are blocked when the page is hosted on claude.ai).
  function armed(el, msg) {
    if (el.dataset.armed) return true;
    el.dataset.armed = '1'; el.dataset.label = el.innerHTML; el.textContent = msg; el.classList.add('armed');
    setTimeout(() => { if (el.isConnected) { delete el.dataset.armed; el.innerHTML = el.dataset.label; el.classList.remove('armed'); } }, 3000);
    return false;
  }

  app.addEventListener('click', e => {
    const el = e.target.closest('button, td.ans');
    if (!el) return;
    if (el.matches('td.ans')) { el.classList.toggle('show'); return; }
    if (el.classList.contains('choice')) return answer(+el.dataset.i);
    if (el.classList.contains('tok')) return answer(+el.dataset.i);
    if (el.dataset.topic) { quizTopic = el.dataset.topic; return quizSetup(); }
    if (el.dataset.len) { quizLen = +el.dataset.len; return quizSetup(); }
    const act = el.dataset.act;
    if (act === 'daily') startDaily();
    else if (act === 'home') home();
    else if (act === 'quiz') quizSetup();
    else if (act === 'quizgo') startQuiz();
    else if (act === 'test') testIntro();
    else if (act === 'testgo') startTest();
    else if (act === 'ref') reference();
    else if (act === 'next') next();
    else if (act === 'check3') check3();
    else if (act === 'finish') finishTest();
    else if (act === 'drillmiss') drillMisses();
    else if (act === 'weak') {
      const keys = weakSpots();
      startSession('weak', keys.map(qFor), { requeue: true, base: keys.length, title: 'Weak spots', onDone: s => { app.innerHTML = '<div class="card celebrate"><p class="prompt">Weak spots drilled.</p></div>' + missList(s.results) + '<button class="btn primary wide" data-act="home">Home</button>'; } });
    } else if (act === 'quit') { if (armed(el, 'Tap again to quit')) home(); }
    else if (act === 'reset') { if (armed(el, 'Tap again to erase all progress')) { try { localStorage.removeItem(KEY); } catch (err) {} location.reload(); } }
  });
  app.addEventListener('submit', e => {
    e.preventDefault();
    const inp = document.getElementById('ans');
    if (inp && !SES.answered) answer(inp.value);
  });
  app.addEventListener('change', e => {
    if (e.target.id === 'blur') { blur = e.target.checked; app.querySelector('.refs').classList.toggle('blur', blur); }
  });
  document.addEventListener('keydown', e => {
    if (!SES || !SES.answered || e.key !== 'Enter') return;
    const nb = app.querySelector('[data-act=next]');
    if (nb && document.activeElement !== nb) { e.preventDefault(); next(); }
  });

  home();
})();
