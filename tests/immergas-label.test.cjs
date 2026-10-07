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
  for (const model of [
    'MINI EOLO 24 3 E', 'MINI NIKE X 24 3 E', 'MAIOR EOLO X 28',
    'NIKE MINI 28 KW SPECIAL', 'NIKE ECO 24', 'EOLO STAR 24 4 E',
    'EOLO MYTHOS DOM 18 1E', 'AVIO ECO 24', 'ZEUS SUPERIOR 32 KW',
    'VICTRIX 24 TT ERP', 'VICTRIX MAIOR 28 TT ERP', 'VICTRIX ZEUS SUPERIOR 35',
    'VICTRIX TERA V3 28 E', 'VICTRIX TERA V3 35 PLUS EU', 'VICTRIX OMNIA V2',
    'VICTRIX EXTRA 12 PLUS', 'VICTRIX EXA 24', 'VICTRIX PRO 120 ERP',
    'HERCULES CONDENSING 32 3 ERP', 'HERCULES MINI 35', 'HERCULES 35 ABT',
    'MAGIS VICTRIX ERP', 'MAGIS HERCULES ERP', 'MYTHOS HP'
  ]) {
    const candidates = scope.parseLabelCandidates('Model: ' + model + '\nSerial No. 12345678ABC');
    assert(candidates.some(c => c.field === 'manufacturer' && c.value === 'Immergas'), model);
    assert(candidates.some(c => c.field === 'model' && c.value === model), model);
  }
  const split = scope.parseLabelCandidates('victrix\nzeus superior 25 (GAS METANO)\n8015065011740');
  assert(split.some(c => c.field === 'model' && c.value === 'VICTRIX ZEUS SUPERIOR 25'));
  for (const text of ['NIKE shoes 24', 'STAR 24', 'MINI 24', 'SUPERIOR 35', 'Bosch\nVICTRIX TERA 24']) {
    assert(!scope.parseLabelCandidates(text).some(c => c.field === 'manufacturer' && c.value === 'Immergas'), text);
  }
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
