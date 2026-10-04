const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const html = fs.readFileSync(path.join(__dirname, '../rs2-app-v2.html'), 'utf8');
const elements = new Map();
function canvas(alpha = 0) {
    return {width:400,height:100,style:{},getAttribute:()=>'',getContext:()=>({getImageData:()=>({data:[0,0,0,alpha]}),drawImage(){}}),toDataURL:type=>'data:'+type+';base64,AAAA'};
}
elements.set('device-photo-preview',canvas());
elements.set('preview-sig-canvas',canvas());
elements.set('full-screen-canvas',canvas());
const context = vm.createContext({byId:id=>elements.get(id),newCanvas:()=>canvas(),Image:class {naturalWidth=400;naturalHeight=100;async decode(){};}});
context.window=context;
const start=html.indexOf('    window.collectReportAttachments =');
const end=html.indexOf('    window.resetAttachmentsForArchivedReport =',start);
vm.runInContext(html.slice(start,end),context);
(async()=>{
    let media=await context.collectReportAttachments();
    assert.equal(media.photo,''); assert.equal(media.signature,'');
    elements.set('preview-sig-canvas',canvas(255));
    media=await context.collectReportAttachments(); assert(media.signature.startsWith('data:image/png;base64,'));
    await context.restoreReportAttachments({photo:'data:image/jpeg;base64,AAAA',signature:media.signature});
    assert.equal(elements.get('device-photo-preview').style.display,'block');
    assert.equal(elements.get('preview-sig-canvas').width,400);
    await assert.rejects(context.restoreReportAttachments({photo:'https://example.com/photo',signature:''}));
    await assert.rejects(context.restoreReportAttachments({photo:'data:image/jpeg;base64,'+'A'.repeat(850001),signature:''}));
    assert(html.includes('transaction.set(attachmentRef, attachments)'));
    console.log('PASS: blank/signed attachments, restoration, invalid media rejection and atomic save wiring.');
})().catch(error=>{console.error(error);process.exitCode=1;});
