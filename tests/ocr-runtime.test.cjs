const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const html = fs.readFileSync(path.join(__dirname, '../rs2-app-v2.html'), 'utf8');
const vendor = fs.readFileSync(path.join(__dirname, '../vendor/paddleocr-0.4.2.mjs'), 'utf8');
const coreVersion = html.match(/wasmPaths: 'https:\/\/cdn.jsdelivr.net\/npm\/onnxruntime-web@([^/]+)/)[1];
assert(vendor.includes(`import("https://cdn.jsdelivr.net/npm/onnxruntime-web@${coreVersion}/+esm")`), 'ORT module must match WASM binaries');
assert(!vendor.includes('"/npm/'), 'Vendored imports must not resolve against the RS2 host');
const elements = new Map();
const byId = id => { if (!elements.has(id)) elements.set(id, { value:'', style:{}, hidden:false }); return elements.get(id); };
const state = {image:{},busy:false,token:0,candidates:[],liveCodes:[],log:[]};
let fallbackCalls = [], timers = [], mode = 'paddle';
const scope = vm.createContext({console, Date, Promise, Error, Math, performance, LABEL_FIELDS:[], scanState:state,
    byId, lastLabelOcrText:'', getLabelOcrEngine:()=>mode,
    barcodeCandidates:()=>[], selectedLabelCanvas:()=>({}), detectBarcodes:async()=>[],
    scanBusy:value=>{state.busy=value;}, setOcrProgress(){},
    limitTime:async(promise,ms)=>{timers.push(ms);return promise;},
    loadPaddleOcrEngine:async()=>{throw Error('unavailable');},
    runTesseractFallback:async preserve=>{fallbackCalls.push(preserve);}
});
const start = html.indexOf('    async function runLabelScan()');
const end = html.indexOf('    async function runTesseractFallback(', start);
vm.runInContext(html.slice(start,end),scope);
(async()=>{
    await scope.runLabelScan();
    assert.deepEqual(fallbackCalls,[true], 'Fallback must preserve earlier evidence');
    assert(timers.includes(30000), 'Unavailable AI models must fall back after a bounded 30 s load');
    fallbackCalls=[]; mode='tesseract';
    await scope.runLabelScan();
    assert.deepEqual(fallbackCalls,[undefined], 'Manual Tesseract must bypass AI model loading');
    mode='paddle'; fallbackCalls=[];
    scope.loadPaddleOcrEngine=async()=>{state.token++;throw Error('cancelled');};
    await scope.runLabelScan();
    assert.equal(fallbackCalls.length,0, 'Cancellation must not start fallback');

    const fallbackEnd=html.indexOf('    function normalizeArchiveSerial(',end);
    vm.runInContext(html.slice(end,fallbackEnd),scope);
    state.busy=false; state.candidates=[{field:'serial',value:'001AB'}];
    scope.lastLabelOcrText='Paddle text'; scope.detectBarcodes=async()=>{throw Error('decoder failure');};
    scope.showLabelResults=()=>{}; scope.scanMessage=()=>{};
    await scope.runTesseractFallback(true);
    assert.equal(state.candidates[0].value,'001AB');
    assert.equal(scope.lastLabelOcrText,'Paddle text', 'Partial raw text must survive fallback errors');
    state.busy=false;
    await scope.runTesseractFallback();
    assert.equal(state.candidates.length,0, 'A fresh manual scan must discard old evidence');
    assert.equal(scope.lastLabelOcrText,'');
    console.log('PASS: matching ORT/WASM, bounded model load, manual engine routing, cancellation and evidence preservation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
