const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.join(__dirname, '..');
const loader = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = loader.slice(loader.indexOf('<script>') + 8, loader.lastIndexOf('</script>'));
const source = fs.readFileSync(path.join(root, 'rs2-app-v2.html'), 'utf8');

async function load(html = source, ok = true) {
  let output = '';
  const warnings = [];
  const errors = [];
  const fallback = { innerHTML: '' };
  const context = {
    fetch: async (url, options) => {
      assert.match(url, /^\.\/rs2-app-v2\.html\?v=/);
      assert.equal(options.cache, 'no-store');
      return { ok, status: ok ? 200 : 503, text: async () => html };
    },
    console: { warn: text => warnings.push(text), error: (...args) => errors.push(args) },
    document: {
      open() {}, write: value => { output = value; }, close() {},
      getElementById: () => fallback
    }
  };
  await vm.runInNewContext(script, context);
  return { output, warnings, errors, fallback };
}

const archiveButton = name => new RegExp('<button[^>]*class="' + name + '"[^>]*>[^<]*</button>', 'g');

test('archive controls are last in the form and outside the printable preview', async () => {
  const { output, warnings, errors } = await load();
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
  const start = output.indexOf('<section class="controls">');
  assert.ok(start >= 0);
  const end = output.indexOf('</section>', start);
  const controls = output.slice(start, end);
  const save = controls.indexOf('class="btn-archive-save"');
  const view = controls.indexOf('class="btn-archive-view"');
  const status = controls.indexOf('id="cloud-status-text"');
  assert.ok(save > controls.indexOf('class="btn-print"'));
  assert.ok(view > save);
  assert.ok(status > view);
  assert.match(controls, /id="cloud-status-text">Pripájanie k cloudu\.\.\.<\/div>[\s\S]*id="shared-contacts-login"[\s\S]*$/);
  assert.equal((output.match(/id="shared-contacts-login"/g) || []).length, 1);
  for (const name of ['btn-archive-save', 'btn-archive-view']) {
    assert.deepEqual(output.match(archiveButton(name)), source.match(archiveButton(name)));
    assert.equal(output.match(archiveButton(name)).length, 1);
  }
  assert.equal((output.match(/id="cloud-status-text"/g) || []).length, 1);
  const previewStart = output.indexOf('<section class="preview-scroll-wrapper">');
  const previewEnd = output.indexOf('</section>', previewStart);
  assert.doesNotMatch(output.slice(previewStart, previewEnd), /btn-archive-save|btn-archive-view/);
  assert.match(output, /rs2_auth_last_attempt/);
  assert.match(output, /rs2LockedUntil/);
});

test('a changed layout keeps the original buttons rather than deleting them', async () => {
  const changed = source.replace('<section class="preview-scroll-wrapper">', '<section class="changed-preview">');
  const { output, warnings, errors } = await load(changed);
  assert.equal(errors.length, 0);
  assert.ok(warnings.some(text => text.includes('Blok archívu')));
  for (const name of ['btn-archive-save', 'btn-archive-view']) {
    assert.deepEqual(output.match(archiveButton(name)), source.match(archiveButton(name)));
  }
});

test('a changed archive block leaves the loaded form intact', async () => {
  const changed = source.replace('Cloudové úložisko', 'Archív revízií');
  const { output, warnings } = await load(changed);
  assert.ok(warnings.some(text => text.includes('Blok archívu')));
  assert.ok(output.includes('Archív revízií'));
  assert.ok(output.includes('class="btn-archive-save"'));
  assert.ok(output.includes('class="btn-archive-view"'));
});

test('the original application remains available when loading fails', async () => {
  const { output, errors, fallback } = await load('', false);
  assert.equal(output, '');
  assert.equal(errors.length, 1);
  assert.match(fallback.innerHTML, /href="rs2-app\.html"/);
});
