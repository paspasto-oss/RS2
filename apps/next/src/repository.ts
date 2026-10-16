import { emptySnapshot, validateSnapshot, type Snapshot } from './model.js';
export const DB_NAME = 'rs2-next-sandbox-v1';
const STORE = 'snapshot';
let dbPromise: Promise<IDBDatabase> | undefined;
function database(): Promise<IDBDatabase> {
  if (!dbPromise) dbPromise = new Promise((resolve,reject)=>{
    const request = indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>request.result.createObjectStore(STORE);
    request.onsuccess=()=>{request.result.onversionchange=()=>{request.result.close();dbPromise=undefined;};resolve(request.result);};
    request.onerror=()=>{dbPromise=undefined;reject(new Error('Úložisko prehliadača nie je dostupné. Údaje neboli uložené.'));};
    request.onblocked=()=>{dbPromise=undefined;reject(new Error('Zatvorte ostatné karty testovacej RS2 a skúste znova.'));};
  });
  return dbPromise;
}
export async function loadSnapshot(): Promise<Snapshot> {
  const db=await database();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readonly');const req=tx.objectStore(STORE).get('state');
    req.onsuccess=()=>{try{resolve(req.result===undefined?emptySnapshot():validateSnapshot(req.result));}catch(e){reject(e);}};
    req.onerror=()=>reject(new Error('Testovacie údaje sa nepodarilo načítať. Neboli prepísané.'));
  });
}
/** Optimistic version check inside a serialized IndexedDB transaction prevents lost tab updates. */
export async function saveSnapshot(expectedRevision:number, candidate:Snapshot):Promise<Snapshot>{
  const clean=validateSnapshot(candidate), db=await database();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite'), store=tx.objectStore(STORE), req=store.get('state');
    let next:Snapshot;let error:Error|undefined;
    req.onsuccess=()=>{
      try{
        const old=req.result===undefined?emptySnapshot():validateSnapshot(req.result);
        if(old.revision!==expectedRevision) throw new Error('Údaje zmenila iná karta. Zatvorte formulár a znovu otvorte aktuálny záznam. Vaše zmeny neboli uložené.');
        next={...clean,revision:old.revision+1};store.put(next,'state');
      }catch(e){error=e instanceof Error?e:new Error('Uloženie zlyhalo.');tx.abort();}
    };
    tx.oncomplete=()=>resolve(next);
    tx.onabort=()=>reject(error || new Error('Úložisko je plné alebo zablokované. Údaje neboli uložené; formulár zostáva otvorený.'));
    tx.onerror=()=>{error=new Error('Zápis do úložiska zlyhal. Údaje neboli uložené.');};
  });
}
