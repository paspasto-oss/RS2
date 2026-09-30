// Run: node tests/paddleocr-v6-label.test.cjs
// Regression test for the RS2 v2 label pipeline. No external dependencies.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const html = fs.readFileSync(path.join(__dirname, '../rs2-app-v2.html'), 'utf8');

assert(html.includes('@paddleocr/paddleocr-js@0.4.2'), 'Pinned PaddleOCR browser SDK must be present');
assert(html.includes("PP-OCRv6_small_det"), 'PP-OCRv6 small detector must be selected');
assert(html.includes("PP-OCRv6_small_rec"), 'PP-OCRv6 small recognizer must be selected');
assert(html.includes('async function runTesseractFallback()'), 'Tesseract must remain as an automatic fallback');
assert(html.includes("await runTesseractFallback()"), 'Primary pipeline must call Tesseract on PaddleOCR failure');
assert(html.includes("detectBarcodes(base)"), 'Barcode/QR detection must run before OCR');

const start = html.indexOf('    const LABEL_FIELDS = [');
const end = html.indexOf('    function addVaillantGroupDetails(', start);
assert(start >= 0 && end > start, 'Parser block not found');

const scope = vm.createContext({ console, Date });
vm.runInContext(html.slice(start, end), scope);

const values = (candidates, field) =>
  candidates.filter(c => c.field === field).map(c => c.value);

const midea = [
  'Midea',
  'Model MHC-V12W/D2N8-B',
  'Serial No. 123456789ABC',
  'Refrigerant R290'
].join('\n');
const mc = scope.parseLabelCandidates(midea, 'paddle-v6-test', 94);
assert(values(mc, 'manufacturer').includes('Midea'), 'Midea brand');
assert(values(mc, 'model').includes('MHC-V12W/D2N8-B'), 'Midea model');
assert(values(mc, 'serial').includes('123456789ABC'), 'Midea serial');
assert(values(mc, 'fuel').includes('R290'), 'Midea refrigerant');

const panasonic = [
  'Panasonic',
  'Model WH-WDG12LE5',
  'S/N 240912345678',
  'Refrigerant R290'
].join('\n');
const pc = scope.parseLabelCandidates(panasonic, 'paddle-v6-test', 93);
assert(values(pc, 'manufacturer').includes('Panasonic'), 'Panasonic brand');
assert(values(pc, 'model').includes('WH-WDG12LE5'), 'Panasonic model');
assert(values(pc, 'serial').includes('240912345678'), 'Panasonic serial');

const mitsubishi = [
  'Mitsubishi Electric',
  'Model PUZ-SHWM112YAA',
  'Serial Number 83A01234'
].join('\n');
const ec = scope.parseLabelCandidates(mitsubishi, 'paddle-v6-test', 92);
assert(values(ec, 'manufacturer').includes('Mitsubishi Electric'), 'Mitsubishi Electric brand');
assert(values(ec, 'serial').includes('83A01234'), 'Mitsubishi serial');

assert.equal(scope.serialStrategyForBrand('Vaillant').id, 'vaillant-group');
assert.equal(scope.serialStrategyForBrand('Protherm').id, 'vaillant-group');
assert.equal(scope.serialStrategyForBrand('Midea').id, 'label-barcode');
assert.equal(scope.serialStrategyForBrand('Panasonic').id, 'label-barcode');
assert.equal(scope.serialStrategyForBrand('unknown').id, 'generic');

console.log('PASS: PaddleOCR v6 integration, barcode-first flow, fallback and multi-brand label parsing.');
