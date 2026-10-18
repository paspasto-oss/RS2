const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const html = fs.readFileSync(path.join(__dirname, '../rs2-app-v2.html'), 'utf8');

assert(html.includes('id="document-photo-upload" hidden accept="image/*"'));
assert(!html.includes('id="document-photo-upload" hidden accept="image/*" capture='));
assert(html.includes('id="document-photo-area"'));
assert(html.indexOf('id="document-photo-area"') < html.indexOf('id="qr-canvas"'));
assert(html.includes('window.handleDocumentPhoto = async event =>'));
assert(html.includes('documentPhoto:documentPhotoData'));
assert(html.includes("load(attachments.documentPhoto, 'jpeg')"));
assert(html.includes('window.removeDocumentPhoto();'));

console.log('PASS: gallery document photo is rendered above QR and persisted with archive attachments.');
