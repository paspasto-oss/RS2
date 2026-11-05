const {test}=require('node:test'),a=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(){
 const cache=new Map(),storage={getItem:k=>cache.get(k)||null,setItem:(k,v)=>cache.set(k,v)},calls=[],statuses=[];
 let owner={id:'one'},failure=false,afterCall;
 const client={rpc:async(name,args)=>{calls.push({name,args,owner:owner.id});if(afterCall)afterCall();return failure?{error:Error('offline')}:{data:'shared-customer-id'};}};
 const context={crypto:require('node:crypto'),console};vm.createContext(context);vm.runInContext(fs.readFileSync('shared-contacts.js','utf8'),context);
 const directory=context.SpektraSharedContacts.create({getClient:()=>client,getUser:()=>owner,storage,onStatus:(...v)=>statuses.push(v)});
 return {directory,calls,cache,statuses,setOwner:v=>owner=v,setFailure:v=>failure=v,setAfterCall:fn=>afterCall=fn};
}
test('offline contact survives reload and retry uses atomic name-aware resolver and stable selected ID',async()=>{
 const h=setup();h.setFailure(true);
 a.equal(await h.directory.save({name:'Ján Test',company:'Test s.r.o.',phone:'+421900123456',email:'',street:'Rajec 1',sharedId:'chosen-id'},'R-1'),false);
 a.equal(JSON.parse(h.cache.values().next().value).length,1);
 h.setFailure(false);await h.directory.flush();
 a.equal(JSON.parse(h.cache.get('spektra-rs2-pending-contacts:one')).length,0);
 a.equal(h.calls[1].name,'resolve_customer');a.equal(h.calls[1].args.requested_id,'chosen-id');
 a.equal(h.calls[1].args.payload.company,'Test s.r.o.');a.equal(h.calls[1].args.payload.phone,'+421900123456');
});
test('pending contacts never cross accounts or disappear when account changes in flight',async()=>{
 const h=setup();h.setFailure(true);await h.directory.save({name:'Ján Test'},'R-1');const count=h.calls.length;
 h.setOwner({id:'two'});await h.directory.flush();a.equal(h.calls.length,count);
 h.setOwner({id:'one'});h.setFailure(false);h.setAfterCall(()=>h.setOwner({id:'two'}));await h.directory.flush();
 a.equal(JSON.parse(h.cache.get('spektra-rs2-pending-contacts:one')).length,1);
});
test('a service-site address does not overwrite the shared contact address',async()=>{
 const h=setup();await h.directory.save({name:'Ján Test',sharedId:'chosen-id',street:'Montáž 8',city:'Žilina',directoryAddress:'Bydlisko 1, Rajec'},'R-1');
 a.equal(h.calls[0].args.payload.address,'Bydlisko 1, Rajec');a.equal(h.calls[0].args.payload.street,undefined);
});
test('unauthenticated save reports that the report and shared directory have different states',async()=>{
 const h=setup();h.setOwner(null);await a.rejects(()=>h.directory.save({name:'Test'},'R-1'),/prihláste/);a.equal(h.calls.length,0);
});

test('newly resolved customer ID is reused after a phone correction on the same report',async()=>{
 const h=setup();await h.directory.save({name:'Ján Test',phone:'0900111111'},'R-1');
 await h.directory.save({name:'Ján Test',phone:'0900222222'},'R-1');
 a.equal(h.calls[1].args.requested_id,'shared-customer-id');
 await h.directory.save({name:'Iný zákazník',phone:'0900222222'},'R-1');
 a.equal(h.calls[2].args.requested_id,null);
});
