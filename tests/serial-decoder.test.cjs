// Run: node tests/serial-decoder.test.cjs (no external dependencies).
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(path.join(__dirname, '../rs2-app.html'), 'utf8');
const start = html.indexOf('    function decodeVaillantGroupSerial(');
const end = html.indexOf('    function addVaillantGroupDetails(', start);
assert(start >= 0 && end > start);
const scope = vm.createContext({ foldLabel: value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase() });
vm.runInContext(html.slice(start, end), scope);
const decode = (value, brand) => scope.decodeVaillantGroupSerial(value, brand, new Date('2026-09-17T12:00:00Z'));
const protherm = '21102100100080353100005008N1';
const vaillant = '21261800100215303130283346N7';
for (const [value, brand, year, week, product, factory] of [
    [protherm, 'Protherm', '2010', 21, '0010008035', ''],
    [vaillant, 'Vaillant', '2026', 18, '0010021530', '3130']
]) {
    const result = decode(value, brand);
    assert.equal(result.serial, value);
    assert.equal(result.year, year);
    assert.equal(result.week, week);
    assert.equal(result.productCode, product);
    assert.equal(result.factoryCode, factory);
}
for (const value of [
    protherm.replace('1021', '1000'), // week zero
    protherm.replace('1021', '1053'), // 2010 had 52 ISO weeks
    protherm.replace('1021', '1054'),
    vaillant.replace('2618', '2718'), // future year
    protherm.replace('8035', '8O35'), // never silently repair OCR characters
    '0010008035', '1234567890123', protherm + ' EXTRA'
]) assert.equal(decode(value, 'Protherm'), null, value);
assert.equal(decode(protherm, 'Midea'), null);
assert.equal(decode(protherm, ''), null);
assert.equal(decode(protherm.replace('1021', '2053'), 'Protherm').week, 53);
assert.equal(decode('21 10 21 0010008035 3100005008N1', 'Protherm').serial, protherm);
console.log('PASS: serial structure, dates, product codes, suffixes and unsupported inputs.');
