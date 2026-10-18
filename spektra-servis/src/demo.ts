import { emptyData, stamp, type Data, type Job } from './domain.js';
import { today, addDays, toUtc } from './lib/calendar.js';
/** Explicitly fictional fixtures in a DIFFERENT workspace; never inserted into real data. */
export function demoData(): Data {
  const data = emptyData(), day = today();
  const customer1 = { ...stamp(), name: 'Ukážka — zákazník A', company: '', address: 'Rajec (ukážková adresa)', phone: '', email: '', notes: 'Fiktívny záznam iba na vyskúšanie aplikácie.', archived: false };
  const customer2 = { ...stamp(), name: 'Ukážka — zákazník B', company: '', address: 'Žilina (ukážková adresa)', phone: '', email: '', notes: 'Fiktívny záznam.', archived: false };
  data.customers.push(customer1, customer2);
  const device1 = { ...stamp(), customerId: customer1.id, type: 'gas' as const, manufacturer: 'Ukážkový výrobca', model: 'Plynový kotol', serial: 'DEMO-001', location: customer1.address, nextService: addDays(day, 8), notes: 'Fiktívne zariadenie.', archived: false };
  const device2 = { ...stamp(), customerId: customer2.id, type: 'heatpump' as const, manufacturer: 'Ukážkový výrobca', model: 'Tepelné čerpadlo', serial: 'DEMO-002', location: customer2.address, nextService: addDays(day, 20), notes: '', archived: false };
  data.devices.push(device1, device2);
  const job = (n: number, title: string, local: string, customerId: string, deviceId: string, kind: Job['kind'], status: Job['status']): Job => ({ ...stamp(), number: `S-${day.slice(0, 4)}-${String(n).padStart(4, '0')}`, title, start: toUtc(local), customerId, deviceId, kind, status, duration: kind === 'obhliadka' ? 45 : 60, address: customerId === customer1.id ? customer1.address : customer2.address, issue: 'Ukážková zákazka. Nejde o skutočný plán ani vykonané meranie.', resolution: '', result: 'pending', payment: 'unpaid', amount: null, version: 0 });
  data.jobs.push(job(1, 'Pravidelný servis kotla', day + 'T09:00', customer1.id, device1.id, 'servis', 'planned'), job(2, 'Obhliadka technickej miestnosti', day + 'T13:30', customer2.id, device2.id, 'obhliadka', 'planned'), job(3, 'Pokračovanie servisného zásahu', addDays(day, 2) + 'T10:00', customer2.id, device2.id, 'servis', 'parts'));
  data.tips.push({ ...stamp(), title: 'Ako si zapísať vyriešenú poruchu', category: 'tip', manufacturer: '', model: '', code: '', symptoms: 'Ukážkový záznam porad­ne.', solution: 'Zaznamenajte presný model, prejav, zistenú príčinu, vykonaný zásah a spôsob overenia. Tento záznam neobsahuje technický návod na opravu.', source: '', verification: 'draft', verifiedAt: '', jobId: '' });
  return data;
}
