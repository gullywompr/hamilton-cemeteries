// Copies app/ to _site/ for GitHub Pages and stamps one build id onto every
// URL the page loads: the stylesheet, each ES module import, and the data
// fetches. Pages lets browsers keep each file for ten minutes, so without the
// stamp a visitor right after a deploy can get new code with old data. With
// it, one deploy's files only ever load each other.
//
// CI only. app/ itself is never modified, so `npm start` and the tests run on
// the unstamped source.
//
//   node scripts/stamp.mjs <build-id>
import { cpSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const id = process.argv[2];
if (!id || !/^[\w.-]+$/.test(id)) throw new Error('usage: node scripts/stamp.mjs <build-id>');
const SRC = 'app', OUT = '_site', v = `?v=${id}`;

rmSync(OUT, { recursive: true, force: true });
cpSync(SRC, OUT, { recursive: true });

// Every rewrite must find what it expects; a silent miss would ship an
// unstamped file and bring the mismatch back.
const rewrite = (file, edits) => {
  const p = join(OUT, file);
  let s = readFileSync(p, 'utf8');
  for (const [re, to, min] of edits) {
    const hits = s.match(re)?.length ?? 0;
    if (hits < min) throw new Error(`stamp: ${file}: expected at least ${min} match(es) of ${re}, found ${hits}`);
    s = s.replace(re, to);
  }
  writeFileSync(p, s);
};

rewrite('index.html', [
  [/href="\.\/styles\.css"/g, `href="./styles.css${v}"`, 1],
  [/src="\.\/src\/main\.js"/g, `src="./src/main.js${v}"`, 1],
]);
for (const f of readdirSync(join(OUT, 'src')).filter(f => f.endsWith('.js'))) {
  rewrite(join('src', f), [[/from '(\.\/[\w-]+\.js)'/g, `from '$1${v}'`, f === 'derive.js' ? 0 : 1]]);
}
rewrite(join('src', 'data.js'), [[/`\.\/data\/\$\{f\}\.json`/g, `\`./data/\${f}.json${v}\``, 1]]);

console.log(`stamped ${OUT}/ with ${id}`);
