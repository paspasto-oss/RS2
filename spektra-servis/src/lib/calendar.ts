import { ZONE, type Job, type Customer } from '../domain.js';
export function localDate(iso = new Date().toISOString()): string {
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso));
  const v = (t: string) => parts.find(p => p.type === t)?.value || '';
  return `${v('year')}-${v('month')}-${v('day')}T${v('hour')}:${v('minute')}`;
}
export const today = (): string => localDate().slice(0, 10);
export function toUtc(local: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) throw new Error('Zadajte platný dátum a čas.');
  const anchor = Date.parse(local + ':00Z');
  if (!Number.isFinite(anchor)) throw new Error('Neplatný termín.');
  // Explicit round-trip in Bratislava: rejects a spring gap and ambiguous autumn time.
  const candidates = [0, 60, 120].map(offset => new Date(anchor - offset * 60000).toISOString()).filter(iso => localDate(iso) === local);
  if (candidates.length === 0) throw new Error('Tento miestny čas neexistuje (zmena letného času alebo neplatný dátum).');
  if (candidates.length !== 1) throw new Error('Tento čas je pri zmene letného času nejednoznačný. Vyberte čas po 03:00.');
  return candidates[0]!;
}
export const addDays = (date: string, days: number): string => new Date(Date.parse(date + 'T12:00:00Z') + days * 86400000).toISOString().slice(0, 10);
export const dateLabel = (date: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }): string => new Intl.DateTimeFormat('sk-SK', { ...options, timeZone: ZONE }).format(new Date(date.length === 10 ? date + 'T12:00:00Z' : date));
export const timeLabel = (iso: string): string => iso ? new Intl.DateTimeFormat('sk-SK', { hour: '2-digit', minute: '2-digit', timeZone: ZONE }).format(new Date(iso)) : 'Bez termínu';
export const endTime = (job: Job): string => new Date(Date.parse(job.start) + job.duration * 60000).toISOString();
export function conflicts(job: Job, others: Job[]): Job[] {
  if (!job.start || ['done', 'cancelled'].includes(job.status)) return [];
  const start = Date.parse(job.start), end = Date.parse(endTime(job));
  return others.filter(j => j.id !== job.id && j.start && !['done', 'cancelled'].includes(j.status) && Date.parse(j.start) < end && Date.parse(endTime(j)) > start);
}
export function googleCalendarUrl(job: Job, customer?: Customer): string {
  if (!job.start) throw new Error('Najprv nastavte termín.');
  const compact = (s: string) => s.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return 'https://calendar.google.com/calendar/render?' + new URLSearchParams({ action: 'TEMPLATE', text: `${job.title} — ${customer?.name || customer?.company || ''}`, dates: `${compact(job.start)}/${compact(endTime(job))}`, ctz: ZONE, location: job.address, details: `Spektra Servis • ${job.number}\n${job.issue}\n\nRučný prenos z aplikácie. Zmeny sa nesynchronizujú automaticky.` }).toString();
}
const escapeIcs = (s: string): string => s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r/g, '');
function fold(line: string): string { let result = '', row = '', count = 0; for (const ch of line) { const bytes = new TextEncoder().encode(ch).length; if (count + bytes > 74) { result += row + '\r\n'; row = ' '; count = 1; } row += ch; count += bytes; } return result + row; }
export function makeIcs(jobs: Job[], customers: Customer[], now = new Date().toISOString()): string {
  const compact = (s: string) => s.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Spektra Install//Servis 0.1//SK', 'CALSCALE:GREGORIAN'];
  for (const j of jobs.filter(j => j.start && j.status !== 'cancelled')) {
    const customer = customers.find(c => c.id === j.customerId);
    lines.push('BEGIN:VEVENT', `UID:${j.id}@spektra-servis.local`, `SEQUENCE:${j.version}`, `DTSTAMP:${compact(now)}`, `DTSTART:${compact(j.start)}`, `DTEND:${compact(endTime(j))}`, `SUMMARY:${escapeIcs(j.title + ' — ' + (customer?.name || customer?.company || ''))}`, `LOCATION:${escapeIcs(j.address)}`, `DESCRIPTION:${escapeIcs(j.number + '\n' + j.issue + '\nRučný export; bez spätnej synchronizácie.')}`, 'BEGIN:VALARM', 'TRIGGER:-PT60M', 'ACTION:DISPLAY', 'DESCRIPTION:Servisný výjazd Spektra', 'END:VALARM', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR'); return lines.map(fold).join('\r\n') + '\r\n';
}
