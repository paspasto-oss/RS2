const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../rs2-app-v2.html'), 'utf8');
for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    new vm.Script(match[1].replace(/^\s*import .*;\s*$/gm, ''));
}
const start = html.indexOf('    function escapeReportText(');
const end = html.indexOf('    function currentScenarioData(', start);
const context = vm.createContext({});
vm.runInContext(html.slice(start, end), context);
assert.equal(context.escapeReportText('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
assert.equal(context.escapeReportText('A&B'), 'A&amp;B');
assert(html.includes("existing.exists() && openedArchiveId !== docId"));
assert(html.includes("localStorage.removeItem('rs2-draft-v1')"));
assert(html.includes("if (discardDraft) return;"));
assert(html.includes('async function buildSharePdfBlob()'));
assert(html.includes("container.style.transform = 'none'"));
console.log('PASS: script syntax, report escaping, archive collision guard, draft reset and active PDF exporter.');
