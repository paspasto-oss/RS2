// Run: node tests/vaillant-ecotec-sticker.test.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const html = fs.readFileSync(path.join(__dirname, '../rs2-app.html'), 'utf8');
const start = html.indexOf('    const LABEL_FIELDS = [');
const end = html.indexOf('    function addVaillantGroupDetails(', start);
assert(start >= 0 && end > start);

const scope = vm.createContext({ console, Date });
vm.runInContext(html.slice(start, end), scope);

const sample = [
  'VU 486/5-5 (H-INT II) ecoTEC plus',
  '21261800100215303130283346N7'
].join('\n');

const candidates = scope.parseLabelCandidates(sample, 'test', 96);
const values = field => candidates.filter(c => c.field === field).map(c => c.value);

assert(values('manufacturer').includes('Vaillant'), 'manufacturer inferred as Vaillant');
assert(values('model').includes('VU 486/5-5 (H-INT II) ecoTEC plus'), 'full model preserved');
assert(values('serial').includes('21261800100215303130283346N7'), 'full serial recognized');
assert(values('year').includes('2026'), 'year derived from serial');

const decoded = scope.decodeVaillantGroupSerial('21261800100215303130283346N7', 'Vaillant', new Date('2026-09-28T12:00:00Z'));
assert(decoded);
assert.equal(decoded.year, '2026');
assert.equal(decoded.week, 18);
assert.equal(decoded.productCode, '0010021530');
assert.equal(decoded.factoryCode, '3130');

console.log('PASS: Vaillant ecoTEC compact service sticker recognition.');
