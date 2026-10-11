/* Bundles the app into one HTML file (CSS and JS inlined) for publishing as a
   claude.ai page.  Usage: node tools/build-artifact.js <output.html> */
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..'), out = process.argv[2];
if (!out) { console.error('usage: node tools/build-artifact.js <output.html>'); process.exit(1); }
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(dir, 'css/style.css'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const js = scripts.map(src => {
  const code = fs.readFileSync(path.join(dir, src), 'utf8');
  if (/<\/script/i.test(code)) throw new Error(src + ' contains </script');
  return '<script>/* ' + src + ' */\n' + code + '\n</script>';
}).join('\n');
const page = '<title>Latin Drill</title>\n<meta name="theme-color" content="#f3f2ee">\n<style>\n' + css + '</style>\n' +
  '<main id="app"><p>Loading.</p></main>\n' + js + '\n';
fs.writeFileSync(out, page);
console.log('wrote', out, (page.length / 1024).toFixed(0) + ' KB from', scripts.length, 'scripts');
