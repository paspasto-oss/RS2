const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
function element() {
  return {value:'', dataset:{}, style:{}, children:[], innerHTML:'', hiddenClasses:new Set(),
    append(child) {this.children.push(child);},
    replaceChildren() {this.children=[];},
    querySelectorAll() {return this.children.flatMap(label=>label.children || []);},
    classList:{toggle() {}}};
}
for (const file of ['rs2-app-v2.html','rs2-app.html']) {
  const html=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
  const fields=new Map([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],element()]));
  fields.get('inp-scenario').value='sporak';
  for (const [id, el] of fields) el.classList.toggle=(name, hide)=>{hide?el.hiddenClasses.add(name):el.hiddenClasses.delete(name);};
  const scope=vm.createContext({window:{},document:{getElementById:id=>fields.get(id), createElement:element},render(){}});
  const start=html.indexOf('    const SCENARIOS = ');
  vm.runInContext(html.slice(start,html.indexOf('    function initQR()',start)),scope);
  const helpers=html.indexOf('    function fieldValue(');
  vm.runInContext(html.slice(helpers,html.indexOf('    function openModal()',helpers)),scope);
  assert(html.includes('<option value="sporak">'));
  const stove=scope.currentScenarioData();
  assert.match(stove.title,/PLYNOVÉHO SPORÁKA/);
  scope.applyScenarioVisibility(stove);
  assert(!fields.get('gas-measurements').hiddenClasses.has('hidden'));
  for (const id of ['combustion-measurements','hydraulic-measurements','electrical-measurements','heatpump-measurements','flue-section']) assert(fields.get(id).hiddenClasses.has('hidden'),id);
  fields.get('inp-gas-pressure').value='20';
  fields.get('inp-gas-tightness').value='Bez úniku';
  scope.renderScenarioTables();
  assert.match(fields.get('out-extra-body').innerHTML,/20 mbar/);
  assert.match(fields.get('out-extra-body').innerHTML,/Bez úniku/);
  assert(!/Ťah|vykurovacej|spalín/.test(fields.get('out-extra-body').innerHTML));
  if (file==='rs2-app-v2.html') {
    assert.match(fields.get('out-table-body').innerHTML,/Nevykonané/);
    const control=fields.get('inspection-checks').querySelectorAll()[4];
    control.value='fail'; control.onchange();
    assert.equal(fields.get('inp-status').value,'fail');
    scope.renderScenarioTables();
    assert.match(fields.get('out-table-body').innerHTML,/Nevyhovuje/);
    fields.get('inp-scenario').value='plyn';scope.renderScenarioTables();
    assert.match(fields.get('out-table-body').innerHTML,/Nevykonané/);
    fields.get('inp-scenario').value='sporak';scope.renderScenarioTables();
    assert.equal(fields.get('inspection-checks').querySelectorAll()[4].value,'fail');
  }
}
console.log('PASS: gas stove report, relevant measurements, hidden boiler fields and isolated inspection results.');
