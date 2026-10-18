/** Data contracts for the isolated, single-technician workspace. No RS2 connection. */
export const APP_VERSION = '0.1.0';
export const ZONE = 'Europe/Bratislava';
export const KINDS = { servis: 'Servis', revizia: 'Revízia', obhliadka: 'Obhliadka', montaz: 'Montáž' } as const;
export const STATUSES = { new: 'Nová', planned: 'Naplánovaná', active: 'Rozpracovaná', parts: 'Čaká na diel', done: 'Dokončená', cancelled: 'Zrušená' } as const;
export const DEVICE_TYPES = { gas: 'Plynový kotol', heatpump: 'Tepelné čerpadlo', ac: 'Klimatizácia', ventilation: 'Rekuperácia', stove: 'Plynový sporák', gasline: 'Rozvod plynu', pellet: 'Kotol na biomasu', other: 'Iné' } as const;
export type Kind = keyof typeof KINDS;
export type JobStatus = keyof typeof STATUSES;
export interface Base { id: string; createdAt: string; updatedAt: string }
export interface Customer extends Base { name: string; company: string; phone: string; email: string; address: string; notes: string; archived: boolean }
export interface Device extends Base { customerId: string; type: keyof typeof DEVICE_TYPES; manufacturer: string; model: string; serial: string; location: string; nextService: string; notes: string; archived: boolean }
export interface Job extends Base { number: string; customerId: string; deviceId: string; title: string; kind: Kind; status: JobStatus; start: string; duration: number; address: string; issue: string; resolution: string; result: 'pending' | 'ok' | 'fail'; payment: 'unpaid' | 'paid'; amount: number | null; version: number }
export interface Tip extends Base { title: string; category: 'fault' | 'tip' | 'regulation'; manufacturer: string; model: string; code: string; symptoms: string; solution: string; source: string; verification: 'draft' | 'field' | 'manufacturer'; verifiedAt: string; jobId: string }
export interface Settings { technician: string; company: string; baseAddress: string }
export interface Data { schemaVersion: 1; revision: number; customers: Customer[]; devices: Device[]; jobs: Job[]; tips: Tip[]; settings: Settings; lastBackup: string }
export const stamp = (): Base => { const now = new Date().toISOString(); return { id: crypto.randomUUID(), createdAt: now, updatedAt: now }; };
export function emptyData(): Data { return { schemaVersion: 1, revision: 0, customers: [], devices: [], jobs: [], tips: [], settings: { technician: 'Pavol Pastorek', company: 'Spektra Install s.r.o.', baseAddress: 'Hollého 210, Rajec' }, lastBackup: '' }; }
export const normalize = (s: string): string => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('sk').trim();
export const matches = (text: string, q: string): boolean => normalize(q).split(/\s+/).every(part => normalize(text).includes(part));
export const isOpen = (j: Job): boolean => j.status !== 'done' && j.status !== 'cancelled';
export const deviceName = (d?: Device): string => d ? [d.manufacturer, d.model].filter(Boolean).join(' ') || DEVICE_TYPES[d.type] : 'Bez priradeného zariadenia';
export function nextNumber(data: Data, year: string): string { const re = new RegExp(`^S-${year}-(\\d+)$`); return `S-${year}-${String(Math.max(0, ...data.jobs.map(j => Number(j.number.match(re)?.[1] || 0))) + 1).padStart(4, '0')}`; }
export function safeUrl(raw: string): string { try { const url = new URL(raw); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; } }

/** Import validation rejects unknown properties, invalid enums, broken references and unsafe URLs. */
export function validateData(input: unknown): Data {
  const fail = (what: string): never => { throw new Error('Neplatné údaje: ' + what); };
  function obj(v: unknown, label: string): Record<string, unknown> { if (!v || typeof v !== 'object' || Array.isArray(v)) return fail(label); return v as Record<string, unknown>; }
  function str(v: unknown, label: string, max = 12000): string { if (typeof v !== 'string' || v.length > max) return fail(label); return v; }
  function num(v: unknown, label: string, min: number, max: number): number { if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) return fail(label); return v; }
  function choice<T extends string>(v: unknown, options: readonly T[], label: string): T { if (typeof v !== 'string' || !options.includes(v as T)) return fail(label); return v as T; }
  function bool(v: unknown, label: string): boolean { if (typeof v !== 'boolean') return fail(label); return v; }
  function date(v: unknown, label: string): string { const s = str(v, label, 10); if (s && (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(Date.parse(s + 'T12:00:00Z')) || new Date(s + 'T12:00:00Z').toISOString().slice(0, 10) !== s)) return fail(label); return s; }
  function base(o: Record<string, unknown>): Base { const id = str(o.id, 'identifikátor', 80); if (!/^[a-zA-Z0-9_-]+$/.test(id)) return fail('identifikátor'); const createdAt = str(o.createdAt, 'čas vytvorenia', 40), updatedAt = str(o.updatedAt, 'čas zmeny', 40); if (!Number.isFinite(Date.parse(createdAt)) || !Number.isFinite(Date.parse(updatedAt))) return fail('čas záznamu'); return { id, createdAt, updatedAt }; }
  function arr<T>(v: unknown, label: string, parse: (o: Record<string, unknown>) => T): T[] { if (!Array.isArray(v) || v.length > 20000) return fail(label); return v.map(x => parse(obj(x, label))); }
  const root = obj(input, 'formát zálohy');
  if (root.schemaVersion !== 1) return fail('nepodporovaná verzia zálohy');
  const settings = obj(root.settings, 'nastavenia');
  const data: Data = {
    schemaVersion: 1, revision: num(root.revision, 'verzia dát', 0, Number.MAX_SAFE_INTEGER),
    settings: { technician: str(settings.technician, 'technik', 160), company: str(settings.company, 'firma', 200), baseAddress: str(settings.baseAddress, 'adresa', 400) },
    lastBackup: str(root.lastBackup, 'čas zálohy', 40),
    customers: arr(root.customers, 'zákazníci', o => ({ ...base(o), name: str(o.name, 'meno', 160), company: str(o.company, 'firma', 200), phone: str(o.phone, 'telefón', 60), email: str(o.email, 'e-mail', 200), address: str(o.address, 'adresa', 400), notes: str(o.notes, 'poznámka'), archived: bool(o.archived, 'archív zákazníka') })),
    devices: arr(root.devices, 'zariadenia', o => ({ ...base(o), customerId: str(o.customerId, 'zákazník', 80), type: choice(o.type, Object.keys(DEVICE_TYPES), 'typ zariadenia') as Device['type'], manufacturer: str(o.manufacturer, 'výrobca', 120), model: str(o.model, 'model', 160), serial: str(o.serial, 'výrobné číslo', 160), location: str(o.location, 'umiestnenie', 400), nextService: date(o.nextService, 'ďalší servis'), notes: str(o.notes, 'poznámka'), archived: bool(o.archived, 'archív zariadenia') })),
    jobs: arr(root.jobs, 'zákazky', o => ({ ...base(o), number: str(o.number, 'číslo zákazky', 40), customerId: str(o.customerId, 'zákazník', 80), deviceId: str(o.deviceId, 'zariadenie', 80), title: str(o.title, 'názov', 200), kind: choice(o.kind, Object.keys(KINDS), 'druh práce') as Kind, status: choice(o.status, Object.keys(STATUSES), 'stav zákazky') as JobStatus, start: str(o.start, 'začiatok', 40), duration: num(o.duration, 'dĺžka', 5, 1440), address: str(o.address, 'adresa', 400), issue: str(o.issue, 'problém'), resolution: str(o.resolution, 'riešenie'), result: choice(o.result, ['pending', 'ok', 'fail'], 'technický výsledok'), payment: choice(o.payment, ['unpaid', 'paid'], 'úhrada'), amount: o.amount === null ? null : num(o.amount, 'suma', 0, 1000000), version: num(o.version, 'verzia udalosti', 0, Number.MAX_SAFE_INTEGER) })),
    tips: arr(root.tips, 'poradňa', o => ({ ...base(o), title: str(o.title, 'názov', 200), category: choice(o.category, ['fault', 'tip', 'regulation'], 'kategória rady'), manufacturer: str(o.manufacturer, 'výrobca', 120), model: str(o.model, 'model', 160), code: str(o.code, 'kód', 80), symptoms: str(o.symptoms, 'prejav'), solution: str(o.solution, 'riešenie'), source: str(o.source, 'zdroj', 2000), verification: choice(o.verification, ['draft', 'field', 'manufacturer'], 'overenie'), verifiedAt: date(o.verifiedAt, 'dátum overenia'), jobId: str(o.jobId, 'odkaz na zákazku', 80) }))
  };
  if (!Number.isInteger(data.revision)) return fail('verzia dát');
  const all = [...data.customers, ...data.devices, ...data.jobs, ...data.tips];
  if (new Set(all.map(x => x.id)).size !== all.length) return fail('opakované identifikátory');
  const customers = new Set(data.customers.map(x => x.id));
  const devices = new Map(data.devices.map(x => [x.id, x]));
  const jobs = new Set(data.jobs.map(x => x.id));
  if (new Set(data.jobs.map(x => x.number)).size !== data.jobs.length) return fail('opakované čísla zákaziek');
  for (const c of data.customers) if (!c.name.trim() && !c.company.trim()) return fail('chýbajúce meno zákazníka');
  for (const d of data.devices) { if (!customers.has(d.customerId)) return fail('zariadenie bez zákazníka'); if (!d.model.trim()) return fail('chýbajúci model'); }
  for (const j of data.jobs) {
    if (!j.title.trim() || !customers.has(j.customerId) || (j.deviceId && devices.get(j.deviceId)?.customerId !== j.customerId)) return fail('väzby zákazky');
    if (j.start && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(j.start) || !Number.isFinite(Date.parse(j.start)) || new Date(j.start).toISOString() !== j.start)) return fail('čas zákazky');
    if (['planned', 'active'].includes(j.status) && !j.start) return fail('naplánovaná zákazka nemá termín');
    if (!Number.isInteger(j.version) || !Number.isInteger(j.duration)) return fail('verzia alebo dĺžka');
  }
  for (const tip of data.tips) {
    if (!tip.title.trim() || (tip.jobId && !jobs.has(tip.jobId))) return fail('rada bez názvu alebo zákazky');
    if (tip.source && !safeUrl(tip.source)) return fail('zdroj musí byť platný HTTPS odkaz');
    if (tip.verification !== 'draft' && (!tip.verifiedAt || (tip.category === 'fault' && !tip.model.trim()))) return fail('overenie rady vyžaduje dátum a pri poruche model');
    if (tip.verification === 'manufacturer' && !tip.source) return fail('podklad výrobcu vyžaduje odkaz na zdroj');
  }
  return data;
}
