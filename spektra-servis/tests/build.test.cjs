const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {test} = require('node:test');
const root = path.resolve(__dirname, '..');
test('portable build contains a syntactically valid standalone script', () => {
  const html = fs.readFileSync(path.join(root, 'Spektra-Servis.html'), 'utf8');
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, 'standalone script exists');
  assert.doesNotThrow(() => new vm.Script(match[1]));
  assert.doesNotMatch(html, /<script[^>]*src=/i);
  assert.doesNotMatch(html, /AIza|rs2-spektra|signInAnonymously|firebasestorage\.app/);
});
test('hosting deploy is static-only and has no bound production Firebase project', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'firebase.json'), 'utf8'));
  assert.deepEqual(Object.keys(config), ['hosting']);
  assert.equal(config.hosting.public, 'dist');
  assert.equal(fs.existsSync(path.join(root, '.firebaserc')), false);
  assert.equal(fs.existsSync(path.join(root, 'dist/sw.js')), true);
  const html = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');
  assert.match(html, /type="module" src="\.\/assets\/app\.js"/);
});
