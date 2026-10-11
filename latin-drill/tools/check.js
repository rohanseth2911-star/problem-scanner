/* Run all self-checks from the command line:  node tools/check.js
   Prints PASS / DATA / FAIL for each check. Exit code 1 if anything FAILs. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = path.join(__dirname, '..');
const files = ['data/settings.js', 'data/nouns.js', 'data/adjectives.js', 'data/verbs.js', 'data/other.js',
  'data/vocab.js', 'data/passage.js', 'data/translation.js', 'data/general.js', 'data/course-vocab.js', 'js/latin.js', 'js/checks.js'];
// Checks run twice: once in the mode set in settings.js, once in the other mode.
function load(mode) {
  const ctx = { console }; ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
  files.forEach(f => {
    vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f });
    if (f === 'data/settings.js' && mode) ctx.LATIN_SETTINGS.mode = mode;
  });
  return ctx;
}
const shown = files.concat(['js/app.js', 'index.html', 'css/style.css']).filter(f => !f.includes('checks'));
const sources = {};
shown.forEach(f => { try { sources[f] = fs.readFileSync(path.join(dir, f), 'utf8'); } catch (e) {} });
const base = load(null), mode = base.LATIN_SETTINGS.mode, other = mode === 'course' ? 'test' : 'course';
const res = base.runChecks(sources).map(r => Object.assign(r, { name: '[' + mode + '] ' + r.name }));
const ctx2 = load(other); ctx2.Latin.setUnlocked(ctx2.Latin.COURSE_ORDER);
ctx2.runChecks(null).forEach(r => res.push(Object.assign(r, { name: '[' + other + '] ' + r.name })));
res.forEach(r => console.log(r.status.padEnd(5) + r.name + (r.detail ? '\n      ' + r.detail : '')));
const n = s => res.filter(r => r.status === s).length;
console.log(`\n${n('PASS')} PASS, ${n('DATA')} DATA (check your notes), ${n('FAIL')} FAIL`);
process.exit(n('FAIL') ? 1 : 0);
