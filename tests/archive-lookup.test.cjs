// Run with Node; exercises actual HTML functions with a simulated Firestore.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const html = fs.readFileSync(path.join(__dirname, '../rs2-app-v2.html'), 'utf8');
class Element {
    constructor() { this.value = ''; this.style = {}; this.children = []; this.textContent = ''; }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = nodes; }
    addEventListener() {}
}
const elements = new Map();
const byId = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
const records = [
    { id:'old-1', reportNo:'RS2-2025/1', date:'2025-01-01', device:{sn:'001 AB-23N1'}, customer:{name:'<b>literal</b>'}, result:{invoice:'INV',locationNote:'Room',notes:'Note',status:'nok'} },
    { id:'old-2', reportNo:'RS2-2026/1', date:'2026-01-01', device:{sn:'001AB-23N1'} },
    { id:'different-letter', device:{sn:'O01AB-23N1'} },
    { id:'different-suffix', device:{sn:'001AB-23N7'} },
    { id:'missing' }
];
let writes = 0, approved = true, alerts = [];
const docs = records.map(record => ({id:record.id,data:()=>({...record,id:'bad-embedded-id'})}));
const snapshot = {docs, size:docs.length,forEach:callback=>docs.forEach(callback)};
const context = vm.createContext({ console, Date, user:{uid:'test'}, db:{}, appId:'test',
    document:{getElementById:byId,createElement:()=>new Element()},
    collection:()=>({}),query:(...args)=>args,orderBy:()=>({}),documentId:()=> '__name__',limit:n=>({limit:n}),startAfter:cursor=>({cursor}),doc:(...args)=>args.at(-1),getDocs:async()=>snapshot,
    getDoc:async id=>({exists:()=>records.some(x=>x.id===id),data:()=>records.find(x=>x.id===id)}),
    updateCloudCounter:async()=>{writes++;},confirm:()=>approved,alert:s=>alerts.push(s),localStorage:{getItem:()=> '1',setItem(){}}
});
context.window=context;context.generateNo=()=>{byId('inp-no').value='NEW';};context.changeScenario=()=>{};context.resetAttachmentsForArchivedReport=()=>{};
context.closeArchive=()=>{context.cancelArchiveRequest();byId('archive-modal').style.display='none';};
const start=html.indexOf('    function normalizeArchiveSerial('),end=html.indexOf('    function lookupDeviceReports(',start);
vm.runInContext(html.slice(start,end),context);
const moduleCode=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
vm.runInContext(moduleCode.slice(moduleCode.indexOf('    let archiveRows =')),context);
(async()=>{
    await context.openArchive('001 ab-23n1');
    assert.equal(byId('archive-list-container').children.length,2);
    assert.equal(byId('archive-list-container').children[0].children[0].children[0].textContent,'RS2-2026/1');
    assert.equal(byId('archive-list-container').children[1].children[0].children[1].textContent,'<b>literal</b>');
    assert.equal(writes,0);
    assert.equal(context.matchArchiveSerial(records,'AB-23').length,0);
    approved=false;byId('inp-sn').value='draft';await context.loadFromCloud('old-1','existing');assert.equal(byId('inp-sn').value,'draft');
    approved=true;await context.loadFromCloud('old-1','existing');assert.equal(byId('inp-sn').value,'001 AB-23N1');assert.equal(byId('inp-invoice').value,'INV');assert.equal(byId('inp-location-note').value,'Room');assert.equal(byId('inp-no').value,'RS2-2025/1');assert.equal(writes,0);
    await context.loadFromCloud('old-1','new');assert.equal(byId('inp-no').value,'NEW');assert.equal(byId('inp-invoice').value,'');assert.equal(writes,1);
    assert.equal(byId('inp-co').value,''); assert.equal(byId('inp-status').value,'pending');
    let pageCalls = 0;
    const firstPage = Array.from({length:30}, (_,index)=>({id:'page-'+index,data:()=>({reportNo:'P'+index})}));
    context.getDocs = async queryArgs => {
        assert(queryArgs.some(arg=>arg?.limit===30)); pageCalls++;
        const page = pageCalls===1 ? firstPage : [{id:'last',data:()=>({reportNo:'Last'})}];
        return {docs:page,size:page.length,forEach:fn=>page.forEach(fn)};
    };
    await context.openArchive(); assert.equal(byId('archive-more').hidden,false);
    await context.loadMoreArchive(); assert.equal(byId('archive-more').hidden,true);
    assert.equal(byId('archive-list-container').children.length,31);
    assert.equal(pageCalls,2);
    context.getDocs=async()=>{throw Error('permission-denied');};await context.openArchive('001');assert(byId('archive-search-status').textContent.includes('nepodarilo'));
    let finish;context.getDocs=()=>new Promise(resolve=>{finish=resolve;});const pending=context.openArchive('001');context.closeArchive();finish(snapshot);await pending;assert.equal(vm.runInContext('archiveLoaded',context),false);
    context.user=null;await context.openArchive();assert(alerts.some(s=>s.includes('pripojenie')));
    console.log('PASS: exact legacy lookup, multiple results, escaping, cancellation, restore/new, read errors, stale responses and auth guard.');
})().catch(error=>{console.error(error);process.exitCode=1;});
