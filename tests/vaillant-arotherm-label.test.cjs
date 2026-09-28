// Run: node tests/vaillant-arotherm-label.test.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const html = fs.readFileSync(path.join(__dirname, '../rs2-app.html'), 'utf8');
const start = html.indexOf('    const LABEL_FIELDS = [');
const end = html.indexOf('    function addVaillantGroupDetails(', start);
assert(start >= 0 && end > start);

const scope = vm.createContext({
  console,
  Date,
});
vm.runInContext(html.slice(start, end), scope);

const sample = [
  '11/2025',
  'Vaillant',
  'Vaillant GmbH',
  'Serial-No 21254700100234473133064511N1',
  'INT Heat pump',
  'Type',
  'aroTHERM plus',
  'VWL 125/6 A R1',
  'R290 3,15 MPa (Ma)',
  'Pmax(maxc) 8,00 kW',
  'Imax(maxc) 15,0 A'
].join('\n');

const candidates = scope.parseLabelCandidates(sample, 'test', 95);
const values = field => candidates.filter(c => c.field === field).map(c => c.value);

assert(values('manufacturer').includes('Vaillant'), 'Vaillant manufacturer');
assert(values('model').includes('aroTHERM plus VWL 125/6 A R1'), 'full aroTHERM model');
assert(values('serial').includes('21254700100234473133064511N1'), 'full Serial-No');
assert(values('year').includes('2025'), 'manufacturing year from 11/2025');
assert(values('fuel').includes('R290'), 'R290 refrigerant');
assert(!values('power').includes('8.00') && !values('power').includes('8,00'), 'Pmax must not become heating power');

const decoded = scope.decodeVaillantGroupSerial('21254700100234473133064511N1', 'Vaillant', new Date('2026-09-28T12:00:00Z'));
assert(decoded, 'Vaillant serial must decode');
assert.equal(decoded.year, '2025');
assert.equal(decoded.week, 47);
assert.equal(decoded.productCode, '0010023447');
assert.equal(decoded.factoryCode, '3133');

console.log('PASS: Vaillant aroTHERM plus label recognition and safe Pmax handling.');
