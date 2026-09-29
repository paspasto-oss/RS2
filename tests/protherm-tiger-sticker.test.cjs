// Run: node tests/protherm-tiger-sticker.test.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const html = fs.readFileSync(path.join(__dirname, '../rs2-app.html'), 'utf8');
const start = html.indexOf('    const LABEL_FIELDS = [');
const end = html.indexOf('    function positionedOcrText(', start);
assert(start >= 0 && end > start);

const scope = vm.createContext({ console, Date });
vm.runInContext(html.slice(start, end), scope);

const serial = '212442600100252251610006034N7';
const sample = [
  'Tiger Condens20/26 KKZ 42-CS/1 (N-INT)',
  serial
].join('\n');

const candidates = scope.parseLabelCandidates(sample, 'test', 96);
const values = field => candidates.filter(c => c.field === field).map(c => c.value);

assert(values('manufacturer').includes('Protherm'), 'manufacturer inferred as Protherm');
assert(values('model').includes('Tiger Condens 20/26 KKZ 42-CS/1 (N-INT)'), 'full Tiger Condens model normalized');
assert(values('serial').includes(serial), 'full serial recognized');
assert(values('year').includes('2024'), 'year derived from serial');

const decoded = scope.decodeProthermTigerSerial(serial, new Date('2026-09-29T12:00:00Z'));
assert(decoded, 'Protherm Tiger serial must decode');
assert.equal(decoded.year, '2024');
assert.equal(decoded.week, 42);
assert.equal(decoded.serial, serial);

for (const bad of [
  serial.replace('2442', '2400'),
  serial.replace('2442', '2454'),
  serial.replace('2442', '2742'),
  serial.replace('6001', '6O01'),
  '1234567890123'
]) assert.equal(scope.decodeProthermTigerSerial(bad, new Date('2026-09-29T12:00:00Z')), null, bad);

const ranked = scope.rankLabelCandidates(candidates);
const promoted = scope.trustedVaillantGroupBarcodeCandidates([{ rawValue: serial, format: 'code_128' }], ranked);
assert(promoted.some(c => c.field === 'serial' && c.value === serial && c.strength === 112), 'trusted Code 128 promoted to serial');

console.log('PASS: Protherm Tiger Condens service sticker and trusted barcode recognition.');
