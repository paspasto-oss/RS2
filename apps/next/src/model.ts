/** Sandbox-only domain model. IDs never use or increment legacy report numbers. */
export const APP = 'rs2-next-sandbox' as const;
export const SCHEMA_VERSION = 1 as const;
export const JOB_STATUS = { planned: 'Naplánovaná', active: 'Rozpracovaná', waiting: 'Čaká na diel', done: 'Dokončená', cancelled: 'Zrušená' } as const;
export const CATEGORIES = ['Plynový kotol', 'Tepelné čerpadlo', 'Plynový sporák', 'Rozvod plynu', 'Elektrický kotol', 'Kotol na biomasu', 'Iné'] as const;
export const OUTCOME = { pending: 'Nehodnotené', pass: 'Vyhovuje', fail: 'Nevyhovuje' } as const;
export type JobStatus = keyof typeof JOB_STATUS;
export type Outcome = keyof typeof OUTCOME;
export interface Customer { id: string; name: string; company: string; phone: string; email: string; address: string; note: string }
export interface Device { id: string; customerId: string; category: string; manufacturer: string; model: string; serial: string; address: string; note: string }
export interface Job { id: string; customerId: string; deviceId: string; title: string; date: string; time: string; duration: number; technician: string; status: JobStatus; outcome: Outcome; note: string }
export interface Tip { id: string; manufacturer: string; model: string; code: string; symptom: string; solution: string; source: string }
export interface Snapshot { app: typeof APP; schemaVersion: 1; revision: number; customers: Customer[]; devices: Device[]; jobs: Job[]; tips: Tip[] }
export const emptySnapshot = (): Snapshot => ({app: APP, schemaVersion: 1, revision: 0, customers: [], devices: [], jobs: [], tips: []});
export const newId = (): string => 'test-' + crypto.randomUUID();
export function today(): string {
  const p = new Intl.DateTimeFormat('en-CA', {timeZone: 'Europe/Bratislava', year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(new Date());
  return ['year', 'month', 'day'].map(k => p.find(x => x.type === k)!.value).join('-');
}
export function dateLabel(date: string): string { return date ? new Date(date + 'T12:00:00').toLocaleDateString('sk-SK', {day: 'numeric', month: 'long', year: 'numeric'}) : 'Bez termínu'; }
export const normalize = (v: string): string => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const matches = (query: string, ...values: string[]): boolean => normalize(query).trim().split(/\s+/).every(q => normalize(values.join(' ')).includes(q));
export function validDate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + 'T12:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v && v >= '2000-01-01' && v <= '2100-12-31';
}
function record(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('Neplatný záznam v zálohe.');
  return v as Record<string, unknown>;
}
function str(v: unknown, field: string, required = false, max = 6000): string {
  if (typeof v !== 'string' || v.length > max || (required && !v.trim())) throw new Error('Skontrolujte pole: ' + field + '.');
  return v;
}
function id(v: unknown): string { const s = str(v, 'identifikátor', true, 90); if (!/^test-[a-zA-Z0-9-]+$/.test(s)) throw new Error('Záloha nepochádza z testovacej verzie RS2.'); return s; }
function list<T>(v: unknown, fn: (x: Record<string,unknown>) => T): T[] {
  if (!Array.isArray(v) || v.length > 5000) throw new Error('Neplatný alebo príliš veľký zoznam.');
  return v.map(x => fn(record(x)));
}
function unique(rows: {id: string}[]): void { if (new Set(rows.map(x => x.id)).size !== rows.length) throw new Error('Duplicitné identifikátory.'); }
/** Strict whitelist reconstruction; no arbitrary imported properties reach the state. */
export function validateSnapshot(input: unknown): Snapshot {
  const x = record(input);
  if (x.app !== APP || x.schemaVersion !== 1) throw new Error('Podporovaná je iba záloha RS2 TEST, verzia 1. Ostrý archív sa neimportuje.');
  if (!Number.isSafeInteger(x.revision) || Number(x.revision) < 0) throw new Error('Neplatná verzia údajov.');
  const customers = list(x.customers, c => ({id: id(c.id), name: str(c.name,'meno',true,200), company: str(c.company,'firma',false,200), phone: str(c.phone,'telefón',false,60), email: str(c.email,'email',false,254), address: str(c.address,'adresa',false,400), note: str(c.note,'poznámka')}));
  const devices = list(x.devices, d => ({id:id(d.id), customerId:id(d.customerId), category:str(d.category,'kategória',true,80), manufacturer:str(d.manufacturer,'výrobca',false,120), model:str(d.model,'model',true,200), serial:str(d.serial,'výrobné číslo',false,200), address:str(d.address,'adresa zariadenia',false,400), note:str(d.note,'poznámka')}));
  const jobs = list<Job>(x.jobs, j => {
    const date = str(j.date,'dátum',false,10), time = str(j.time,'čas',false,5);
    if (date && !validDate(date)) throw new Error('Neplatný dátum.');
    if (time && (!date || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) throw new Error('Čas musí mať platný dátum a tvar HH:MM.');
    if (!Number.isInteger(j.duration) || Number(j.duration) < 5 || Number(j.duration) > 1440) throw new Error('Dĺžka zásahu musí byť 5 až 1440 minút.');
    if (typeof j.status !== 'string' || !Object.hasOwn(JOB_STATUS,j.status)) throw new Error('Neplatný stav zákazky.');
    if (typeof j.outcome !== 'string' || !Object.hasOwn(OUTCOME,j.outcome)) throw new Error('Neplatné hodnotenie.');
    return {id:id(j.id), customerId:id(j.customerId), deviceId:str(j.deviceId,'zariadenie',false,90), title:str(j.title,'názov zásahu',true,200), date,time,duration:Number(j.duration),technician:str(j.technician,'technik',false,100),status:j.status as JobStatus,outcome:j.outcome as Outcome,note:str(j.note,'poznámka')};
  });
  const tips = list(x.tips, t => ({id:id(t.id),manufacturer:str(t.manufacturer,'výrobca',false,120),model:str(t.model,'model',false,200),code:str(t.code,'kód',false,80),symptom:str(t.symptom,'prejav poruchy',true),solution:str(t.solution,'riešenie',true),source:str(t.source,'zdroj',false,1000)}));
  [customers,devices,jobs,tips].forEach(unique);
  const customerIds = new Set(customers.map(c=>c.id));
  for (const d of devices) if (!customerIds.has(d.customerId) || !(CATEGORIES as readonly string[]).includes(d.category)) throw new Error('Zariadenie nemá platného zákazníka alebo kategóriu.');
  for (const j of jobs) {
    if (!customerIds.has(j.customerId)) throw new Error('Zákazka nemá platného zákazníka.');
    if (j.deviceId && !devices.some(d=>d.id===j.deviceId && d.customerId===j.customerId)) throw new Error('Zariadenie nepatrí zvolenému zákazníkovi.');
  }
  return {app:APP,schemaVersion:1,revision:Number(x.revision),customers,devices,jobs,tips};
}
export function parseBackup(text: string): Snapshot {
  if (new TextEncoder().encode(text).length > 2 * 1024 * 1024) throw new Error('Maximálna veľkosť testovacej zálohy je 2 MB.');
  try { return validateSnapshot(JSON.parse(text)); } catch(e) { if (e instanceof SyntaxError) throw new Error('Súbor nie je platná JSON záloha.'); throw e; }
}
export function overlaps(a: Job, b: Job): boolean {
  if (a.id === b.id || !a.date || !a.time || !b.time || a.date !== b.date || !a.technician.trim() || normalize(a.technician.trim()) !== normalize(b.technician.trim()) || ['cancelled','done'].includes(a.status) || ['cancelled','done'].includes(b.status)) return false;
  const minutes = (t: string) => Number(t.slice(0,2))*60 + Number(t.slice(3));
  return minutes(a.time) < minutes(b.time) + b.duration && minutes(b.time) < minutes(a.time) + a.duration;
}
export function demoSnapshot(): Snapshot {
  const state = emptySnapshot();
  state.customers = [
    {id:'test-demo-a',name:'Ukážka – Rodinný dom A',company:'',phone:'',email:'',address:'Rajec • fiktívna adresa',note:'Vymyslený zákazník na skúšanie rozhrania.'},
    {id:'test-demo-b',name:'Ukážka – Rodinný dom B',company:'',phone:'',email:'',address:'Žilina • fiktívna adresa',note:'Vymyslený zákazník na skúšanie rozhrania.'},
    {id:'test-demo-c',name:'Ukážka – Prevádzka C',company:'Ukážková prevádzka',phone:'',email:'',address:'Rajecké Teplice • fiktívna adresa',note:'Vymyslený zákazník na skúšanie rozhrania.'}
  ];
  state.devices = [
    {id:'test-device-a',customerId:'test-demo-a',category:'Plynový kotol',manufacturer:'',model:'Plynový kotol – ukážka',serial:'DEMO-001',address:'Rajec • fiktívna adresa',note:''},
    {id:'test-device-b',customerId:'test-demo-b',category:'Tepelné čerpadlo',manufacturer:'',model:'Tepelné čerpadlo – ukážka',serial:'DEMO-002',address:'Žilina • fiktívna adresa',note:''}
  ];
  state.jobs = [
    {id:'test-job-a',customerId:'test-demo-a',deviceId:'test-device-a',title:'Ročný servis kotla',date:today(),time:'09:00',duration:60,technician:'Ukážkový technik',status:'planned',outcome:'pending',note:'Fiktívna zákazka. Nie je odoslaná do Google Kalendára.'},
    {id:'test-job-b',customerId:'test-demo-b',deviceId:'test-device-b',title:'Kontrola tepelného čerpadla',date:today(),time:'11:00',duration:90,technician:'Ukážkový technik',status:'active',outcome:'pending',note:''},
    {id:'test-job-c',customerId:'test-demo-c',deviceId:'',title:'Oprava – čaká sa na diel',date:'',time:'',duration:60,technician:'',status:'waiting',outcome:'pending',note:'Termín bude doplnený po dodaní dielu.'}
  ];
  return validateSnapshot(state);
}
