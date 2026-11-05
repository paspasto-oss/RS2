/* Shared-directory writes are durable, scoped to the signed-in account and
 * resolved atomically by the same customer resolver used by quotes. */
(function(root){
 'use strict';
 function create({getClient,getUser,storage,onStatus=()=>{}}){
  let running=null;
  const key=owner=>'spektra-rs2-pending-contacts:'+owner;
  const bindingKey=owner=>'spektra-rs2-contact-links:'+owner;
  function identity(reportId,customer){
   const owner=getUser()?.id;if(!owner)return null;
   const binding=JSON.parse(storage.getItem(bindingKey(owner))||'{}')[reportId];
   return binding&&binding.name===(customer.name||customer.company)&&binding.company===(customer.company||'')?binding.id:null;
  }
  const read=owner=>{const value=JSON.parse(storage.getItem(key(owner))||'[]');if(!Array.isArray(value))throw Error('Neplatný front adresára.');return value;};
  const write=(owner,rows)=>storage.setItem(key(owner),JSON.stringify(rows));
  async function flush(){
   if(running)return running;
   const owner=getUser()?.id,client=getClient();if(!owner||!client)return;
   running=(async()=>{
    const rows=read(owner);
    for(const row of rows){
     if(getUser()?.id!==owner)return;
     const {data,error}=await client.rpc('resolve_customer',{payload:row.payload,requested_id:row.customerId||null});
     if(error||!data)throw Error('Adresár čaká na synchronizáciu. Prenos sa zopakuje po obnovení spojenia.');
     if(getUser()?.id!==owner)return;
     const bindings=JSON.parse(storage.getItem(bindingKey(owner))||'{}');
     bindings[row.reportId]={id:data,name:row.payload.name,company:row.payload.company||''};
     storage.setItem(bindingKey(owner),JSON.stringify(bindings));
     // A newer save of the same report may already be queued while this writes.
     write(owner,read(owner).filter(x=>x.version!==row.version));
    }
    if(getUser()?.id===owner)onStatus(read(owner).length?'Adresár čaká na synchronizáciu.':'Spoločný adresár je synchronizovaný.',!read(owner).length);
   })();
   try{await running;}catch(error){onStatus(error.message,false);throw error;}finally{running=null;}
  }
  async function save(customer,reportId){
   if(!customer.name&&!customer.company)return true;
   const owner=getUser()?.id;
   if(!owner||!getClient())throw Error('Správa je uložená. Pre prenos kontaktu sa prihláste do spoločného adresára a správu uložte znova.');
   const directoryAddress=customer.directoryAddress;
   const payload={name:customer.name||customer.company,company:customer.company||'',phone:customer.phone||'',email:customer.email||'',address:directoryAddress||[customer.street,customer.city].filter(Boolean).join(', '),source_app:'rs2'};
   if(!directoryAddress){payload.street=customer.street||'';payload.city=customer.city||'';}
   const item={reportId,customerId:customer.sharedId||identity(reportId,customer)||null,payload,version:root.crypto.randomUUID()};
   write(owner,[...read(owner).filter(x=>x.reportId!==reportId),item]);
   onStatus('Kontakt je uložený v zariadení a čaká na synchronizáciu.',false);
   try{await flush();return !read(owner).some(x=>x.reportId===reportId);}catch(_){return false;}
  }
  async function list(){
   const owner=getUser()?.id,client=getClient(),rows=[];if(!owner||!client)return rows;
   for(let offset=0;;offset+=500){
    const {data,error}=await client.from('customers').select('id,name,company,phone,email,address,street,city,notes').eq('archived',false).order('id').range(offset,offset+499);
    if(error)throw error;if(getUser()?.id!==owner)return [];
    rows.push(...(data||[]));if(!data||data.length<500)return rows;
   }
  }
  return {save,flush,list,identity};
 }
 root.SpektraSharedContacts={create};
})(typeof window==='undefined'?globalThis:window);
