const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
for (const file of ['rs2-app-v2.html', 'rs2-app.html']) {
  const html = fs.readFileSync(require('node:path').join(__dirname, '..', file), 'utf8');
  const account = {value: ''};
  const scope = vm.createContext({document: {getElementById: () => account}});
  const start = html.indexOf('    function selectedPaymentIban()');
  vm.runInContext(html.slice(start, html.indexOf('    function initQR()', start)), scope);
  for (const input of ['', 'invalid', 'SK5875000000004034450550', 'SK1309000000000425320325']) {
    account.value = input;
    assert.equal(scope.selectedPaymentIban(), input === 'SK1309000000000425320325' ? input : 'SK5875000000004034450550');
  }
  assert(html.includes('Spektra Install\\n${paymentIban}\\nEUR'));
  assert(html.includes("paymentAccount: document.getElementById('inp-payment-account').value"));
  assert(html.includes("set('inp-payment-account', result.paymentAccount ==="));
  assert(html.includes('id="out-pay-iban"'));
}
console.log('PASS: payment account selection, QR destination and archive compatibility.');
