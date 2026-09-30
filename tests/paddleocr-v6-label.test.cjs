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
assert(html.includes('async function captureHighResolutionLabelCrop()'), 'Live scanner must support high-resolution still capture');
assert(html.includes('new ImageCapture(track)'), 'High-resolution capture must use ImageCapture when available');
assert(html.includes("width:{ideal:3840}"), 'Camera should request a high-resolution rear stream');
assert(html.includes('paddleRetryAt = Date.now() + 10 * 60 * 1000'), 'Broken PaddleOCR fetch must be cooled down before retry');
assert(html.includes('OCR ukončené po 2 prechodoch'), 'Low-confidence Tesseract fallback must stop before noisy extra passes');

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

// Regression: photographed Vaillant aroTHERM plus nameplate where OCR saw only R290,
// but Code128 contains the complete factory serial and embedded product code.
const barcodeStart = html.indexOf('    const VAILLANT_PRODUCT_CODE_MAP =');
const barcodeEnd = html.indexOf('    function candidateSourceFamily(', barcodeStart);
assert(barcodeStart >= 0 && barcodeEnd > barcodeStart, 'Vaillant barcode decoder block not found');
vm.runInContext(html.slice(barcodeStart, barcodeEnd), scope);

const vaillantBarcode = scope.barcodeCandidates([
  { rawValue: '21254700100234473133064511N1', format: 'code_128' }
]);
assert(values(vaillantBarcode, 'serial').includes('21254700100234473133064511N1'), 'Vaillant Code128 serial');
assert(values(vaillantBarcode, 'manufacturer').includes('Vaillant'), 'Vaillant manufacturer from product code');
assert(values(vaillantBarcode, 'model').includes('aroTHERM plus VWL 125/6 A 400 V'), 'Vaillant model from product code');
assert(values(vaillantBarcode, 'year').includes('2025'), 'Vaillant year from serial structure');
assert(values(vaillantBarcode, 'fuel').includes('R290'), 'Vaillant refrigerant from identified model');

assert(html.includes('top: 18%') && html.includes('height: 64%'), 'Live guide must cover most of the nameplate');

console.log('PASS: PaddleOCR v6 integration, barcode-first flow, Vaillant Code128 decoding, fallback and multi-brand label parsing.');
