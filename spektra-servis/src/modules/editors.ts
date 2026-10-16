import { type Data, type Job, type Customer, type Device, type Tip, KINDS, STATUSES, DEVICE_TYPES, deviceName } from '../domain.js';
import { localDate, today } from '../lib/calendar.js';
import { field, area, select, button, e, icon } from '../ui.js';
export type EditorType = 'customer' | 'device' | 'job' | 'tip' | 'settings';
export interface Editor { type: EditorType; id: string; revision: number; customerId?: string; deviceId?: string; day?: string; sourceJobId?: string }
export function deviceOptions(data: Data, customerId: string, selected = ''): string {
  return [['', 'Bez konkrétneho zariadenia'], ...data.devices.filter(d => d.customerId === customerId && (!d.archived || d.id === selected)).map(d => [d.id, deviceName(d)])].map(([id, label]) => `<option value="${e(id)}" ${id === selected ? 'selected' : ''}>${e(label)}</option>`).join('');
}
export function editorContent(editor: Editor, data: Data): { title: string; content: string; tools: string } {
  let content = '', title = '', tools = '';
  const customerOptions = (selected?: string): [string, string][] => [['', 'Vyberte zákazníka'], ...data.customers.filter(c => !c.archived || c.id === selected).map(c => [c.id, c.name || c.company] as [string, string])];
  if (editor.type === 'customer') {
    const c = data.customers.find(x => x.id === editor.id);
    title = c ? 'Karta zákazníka' : 'Nový zákazník';
    content = `<div class="form-grid">${field('Meno a priezvisko', 'name', c?.name, 'text', 'autocomplete="name"')}${field('Firma / názov', 'company', c?.company, 'text', 'autocomplete="organization"')}${field('Telefón', 'phone', c?.phone, 'tel', 'autocomplete="tel"')}${field('E-mail', 'email', c?.email, 'email', 'autocomplete="email"')}</div>${field('Adresa', 'address', c?.address, 'text', 'autocomplete="street-address"')}${area('Interná poznámka', 'notes', c?.notes)}<div class="inline-note">Vyplňte meno alebo názov firmy. Ukladajte iba údaje potrebné pre zákazku.</div>`;
    if (c) tools = `${button(c.archived ? 'Obnoviť zákazníka' : 'Archivovať zákazníka', 'archive-customer', 'archive', 'btn ghost', `data-id="${e(c.id)}"`)}${button('Pridať zariadenie', 'device-for-customer', 'plus', 'btn secondary', `data-id="${e(c.id)}"`)}`;
  }
  if (editor.type === 'device') {
    const d = data.devices.find(x => x.id === editor.id), cId = d?.customerId || editor.customerId || '';
    title = d ? 'Karta zariadenia' : 'Nové zariadenie';
    content = `${select('Zákazník *', 'customerId', cId, customerOptions(cId), 'required')}${select('Kategória zariadenia', 'type', d?.type || 'gas', Object.entries(DEVICE_TYPES))}<div class="form-grid">${field('Výrobca', 'manufacturer', d?.manufacturer)}${field('Model / typ *', 'model', d?.model, 'text', 'required')}${field('Výrobné číslo', 'serial', d?.serial)}${field('Ďalší servis', 'nextService', d?.nextService, 'date')}</div>${field('Adresa / umiestnenie zariadenia', 'location', d?.location)}${area('Poznámky k zariadeniu', 'notes', d?.notes)}<div class="inline-note">Termín ďalšieho servisu zadajte podľa dohodnutého servisu alebo overených podkladov. Aplikácia neurčuje zákonnú lehotu revízie.</div>`;
    if (d) tools = button(d.archived ? 'Obnoviť zariadenie' : 'Archivovať zariadenie', 'archive-device', 'archive', 'btn ghost', `data-id="${e(d.id)}"`);
  }
  if (editor.type === 'job') {
    const j = data.jobs.find(x => x.id === editor.id), cId = j?.customerId || editor.customerId || '', deviceId = j?.deviceId || editor.deviceId || '';
    const customer = data.customers.find(c => c.id === cId), device = data.devices.find(d => d.id === deviceId);
    title = j ? j.number + ' · detail zákazky' : 'Nová zákazka';
    content = `${field('Názov zákazky *', 'title', j?.title || (device ? 'Servis — ' + deviceName(device) : ''), 'text', 'required')}${select('Zákazník *', 'customerId', cId, customerOptions(cId), 'required id="job-customer"')}<label class="field"><span>Zariadenie</span><select name="deviceId" id="job-device">${deviceOptions(data, cId, deviceId)}</select></label><div class="form-grid">${select('Druh práce', 'kind', j?.kind || 'servis', Object.entries(KINDS))}${select('Stav zákazky', 'status', j?.status || (editor.day ? 'planned' : 'new'), Object.entries(STATUSES))}${field('Začiatok výjazdu', 'start', j?.start ? localDate(j.start) : editor.day ? editor.day + 'T09:00' : '', 'datetime-local', '', 'Časové pásmo Europe/Bratislava.')}${field('Trvanie v minútach *', 'duration', String(j?.duration || 60), 'number', 'required min="5" max="1440" step="1"')}</div>${field('Adresa výjazdu', 'address', j?.address || device?.location || customer?.address || '')}${area('Zadanie / prejav poruchy', 'issue', j?.issue)}${area('Vykonaný zásah / riešenie', 'resolution', j?.resolution)}<div class="form-grid">${select('Technický výsledok', 'result', j?.result || 'pending', [['pending', 'Kontrola nedokončená'], ['ok', 'Vyhovuje (potvrdil technik)'], ['fail', 'Nevyhovuje (potvrdil technik)']])}${select('Úhrada', 'payment', j?.payment || 'unpaid', [['unpaid', 'Neuhradené'], ['paid', 'Uhradené (ručné potvrdenie)']])}${field('Dohodnutá konečná suma (€)', 'amount', j?.amount === null || j?.amount === undefined ? '' : String(j.amount), 'number', 'min="0" max="1000000" step="0.01"')}</div><div class="inline-note">Dokončenie zákazky nemení technický výsledok ani úhradu. Táto karta nie je revízna správa.</div>`;
    if (j) tools = `${j.start ? button('Pridať do Google (ručne)', 'google-job', 'calendar', 'btn secondary', `data-id="${e(j.id)}"`) + button('Export .ics', 'ics-job', 'download', 'btn ghost', `data-id="${e(j.id)}"`) : ''}${button('Uložiť riešenie do porad­ne', 'tip-from-job', 'knowledge', 'btn ghost', `data-id="${e(j.id)}"`)}<p class="tiny muted">Do Google sa prenesie uložená verzia zákazky. Pred prenosom uložte úpravy. Pripomienku nastavte po uložení v Google.</p>`;
  }
  if (editor.type === 'tip') {
    const t = data.tips.find(x => x.id === editor.id), job = data.jobs.find(j => j.id === editor.sourceJobId), d = data.devices.find(d => d.id === job?.deviceId);
    title = t ? 'Servisný poznatok' : 'Nový poznatok';
    content = `${field('Názov poznatku *', 'title', t?.title || job?.title || '', 'text', 'required')}${select('Kategória', 'category', t?.category || (job ? 'fault' : 'tip'), [['fault', 'Porucha / chybový kód'], ['tip', 'Servisná rada'], ['regulation', 'Predpis / odborná poznámka']])}<div class="form-grid">${field('Výrobca', 'manufacturer', t?.manufacturer || d?.manufacturer || '')}${field('Presný model / riadiaca jednotka', 'model', t?.model || d?.model || '')}${field('Chybový kód', 'code', t?.code)}${select('Úroveň overenia', 'verification', t?.verification || 'draft', [['draft', 'Na preverenie'], ['field', 'Overené pri konkrétnom zásahu'], ['manufacturer', 'Podklad výrobcu so zdrojom']])}</div>${area('Prejav poruchy / problém', 'symptoms', t?.symptoms || job?.issue || '')}${area('Riešenie a kontrola po oprave', 'solution', t?.solution || job?.resolution || '', 5)}${field('Zdroj – HTTPS odkaz', 'source', t?.source, 'url', 'placeholder="https://…"')}${field('Dátum overenia', 'verifiedAt', t?.verifiedAt, 'date')}<div class="inline-note">Pri overenej poruche vyplňte presný model aj dátum. Podklad výrobcu vyžaduje odkaz. Nezadávajte celé licencované normy bez oprávnenia.</div>`;
    if (t?.source) tools = `<a class="btn secondary" target="_blank" rel="noopener noreferrer" href="${e(t.source)}">Otvoriť zdroj ${icon('external')}</a>`;
  }
  if (editor.type === 'settings') {
    title = 'Pracovný profil';
    content = field('Meno technika *', 'technician', data.settings.technician, 'text', 'required') + field('Firma *', 'company', data.settings.company, 'text', 'required') + field('Východisková adresa', 'baseAddress', data.settings.baseAddress);
  }
  return { title, content, tools };
}
