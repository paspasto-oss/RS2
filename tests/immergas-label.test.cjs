const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
for (const file of ['rs2-app.html', 'rs2-app-v2.html']) {
  const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const start = html.indexOf('    const LABEL_FIELDS = [');
  const end = html.indexOf('    function addVaillantGroupDetails(', start);
  const scope = vm.createContext({Date});
  vm.runInContext(html.slice(start, end), scope);
  for (const serial of ['4496769-3', '4496769 - 3', '4496769–3']) {
    const candidates = scope.parseLabelCandidates('B\nMINI NIKE 24 3 E (GAS METANO)\n8 015065 011740\n' + serial);
    const values = field => candidates.filter(c => c.field === field).map(c => c.value);
    assert(values('manufacturer').includes('Immergas'));
    assert(values('model').includes('MINI NIKE 24 3 E'));
    assert(values('serial').includes('4496769-3'));
    assert(!values('serial').some(v => v.replace(/\s/g, '') === '8015065011740'));
    assert(values('fuel').includes('Zemný plyn G20'));
    assert.equal(values('year').length, 0);
  }
  for (const text of ['MINI NIKE 24 3 E\n8015065011740', 'Other boiler\n4496769-3', 'MINI NIKE 24 3 E\n449676O-3']) {
    assert(!scope.parseLabelCandidates(text).some(c => c.field === 'serial' && c.strength === 112));
  }
}
console.log('PASS: Immergas MINI NIKE model, serial suffix, EAN exclusion and ambiguous input.');
