/* Explicit, one-use handoff. Never sends auth tokens or writes source records. */
(function(){
 'use strict';
 const origin='https://spektra-servis.vercel.app',nonce=new URL(location.href).searchParams.get('spektraBridge'),peer=window.opener;
 if(!peer||!nonce||!/^[-a-f0-9]{36}$/.test(nonce))return;
 let request=null,used=false;
 const box=document.createElement('section');box.style.cssText='position:sticky;top:0;z-index:99999;background:#fff0f0;border:2px solid #c20000;padding:14px;font:15px Arial;color:#222';
 const title=document.createElement('strong');title.textContent='Prepojenie so Spektra Servis';
 const status=document.createElement('p'),button=document.createElement('button');button.type='button';button.textContent='Pokračovať';button.disabled=true;
 box.append(title,status,button);document.body.prepend(box);
 status.textContent='Čakám na požiadavku z otvorenej zákazky…';
 const send=(message)=>peer.postMessage({...message,nonce},origin);
 const ready=setInterval(()=>send({type:'spektra-ready'}),500);
 const expiry=setTimeout(()=>{clearInterval(ready);window.removeEventListener('message',receive);button.disabled=true;status.textContent='Prepojenie vypršalo. Otvorte ho znova zo Spektra Servisu.';},300000);
 function receive(event){
  if(event.origin!==origin||event.source!==peer||event.data?.nonce!==nonce||event.data?.type!=='spektra-request'||request)return;
  if(!['catalog','prefill'].includes(event.data.operation))return;
  request=event.data;clearInterval(ready);button.disabled=false;
  status.textContent=request.operation==='catalog'?'Prihláste sa v Cenových ponukách. Tlačidlom prenesiete dostupný adresár a sklad do Spektra Servisu v tomto prehliadači.':'Prenesú sa údaje zákazníka a zákazky. Existujúci rozpracovaný formulár nahraďte iba po jeho uložení.';
  button.textContent=request.operation==='catalog'?'Preniesť adresár a sklad':'Predvyplniť zo zákazky';
 }
 window.addEventListener('message',receive);
 button.onclick=async()=>{
  if(!request||used)return;button.disabled=true;
  try{
   const payload=await perform(request);used=true;clearTimeout(expiry);window.removeEventListener('message',receive);
   send({type:'spektra-result',payload});status.textContent='Prenos dokončený. Dokument skontrolujte a uložte; do archívu sa neuložil automaticky.';button.remove();
  }catch(error){status.textContent=error.message||String(error);button.disabled=false;}
 };
 async function perform(request){
   if(request.operation!=='prefill')throw Error('RS2 podporuje prenos zákazky.');
  const p=request.payload,c=p?.customer,j=p?.job,d=p?.device;
  if(!c||!j||typeof c.name!=='string')throw Error('Neplatné údaje zákazky.');
  if(!document.getElementById('inp-name')||typeof window.render!=='function')throw Error('RS2 sa ešte načítava. Skúste znova.');
  if(['inp-name','inp-company','inp-sn'].some(id=>document.getElementById(id)?.value)&&!confirm('RS2 obsahuje rozpracovanú správu. Nahradiť iba kontaktné údaje a zariadenie údajmi zo zákazky? Merania a výsledok musíte skontrolovať.'))throw Error('Prenos zrušený.');
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=String(v||'');};
  set('inp-name',c.name);set('inp-company',c.company);set('inp-phone',c.phone);set('inp-email',c.email);
  // The service address is intentionally kept whole; do not guess a city split.
  set('inp-street',j.address||c.address);set('inp-city','');
  const scenario={gas:'plyn',heatpump:'tc',stove:'sporak',gasline:'rozvod',pellet:'pellet'}[d?.type];
  if(scenario){set('inp-scenario',scenario);window.changeScenario?.();}
  set('inp-dev',d?.model);set('inp-manuf',d?.manufacturer);set('inp-sn',d?.serial);
  set('inp-location-note',[j.number,j.title,j.issue].filter(Boolean).join('\n'));
  window.render();document.getElementById('inp-name').dispatchEvent(new Event('input',{bubbles:true}));
  return {prefilled:true};

 }
})();
