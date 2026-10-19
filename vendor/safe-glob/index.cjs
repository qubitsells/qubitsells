// Next's ESLint plugin only uses fast-glob.globSync for page-directory discovery.
// Use maintained tinyglobby instead of the unpatched braces/micromatch chain.
const { glob, globSync } = require('tinyglobby');
const optionsFor = options => ({ expandDirectories: false, ...options });
const normalize = paths => paths.map(path => path === '/' || /^[A-Za-z]:\/$/.test(path) ? path : path.replace(/\/+$/, ''));
async function safeGlob(patterns, options) { return normalize(await glob(patterns, optionsFor(options))); }
safeGlob.sync = (patterns, options) => normalize(globSync(patterns, optionsFor(options)));
safeGlob.globSync = safeGlob.sync;
safeGlob.glob = safeGlob;
module.exports = safeGlob;
