import { type Data, type Job, STATUSES, KINDS, deviceName } from './domain.js';
import { dateLabel, timeLabel, endTime, conflicts } from './lib/calendar.js';
export interface ViewState { route: string; query: string; filter: string; customerTab: string; selectedCustomer: string; date: string; month: string; calendarMode: string; knowledgeTab: string; workspace: 'real' | 'demo' }
export const e = (v: unknown): string => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const paths: Record<string, string> = {
 home: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
 jobs: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M9 5V3h6v2M8 10h8M8 14h8M8 18h5"/>',
 calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 11h18M8 15h2M14 15h2"/>',
 customers: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v3"/>',
 knowledge: '<path d="M12 5C8 2 4 3 2 4v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-2-1-6-2-10 1ZM12 5v16M5 8h4M15 8h4M5 12h4M15 12h4"/>',
 settings: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="9" cy="18" r="2"/>',
 plus: '<path d="M12 5v14M5 12h14"/>', search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
 arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>', left: '<path d="m14 5-7 7 7 7"/>', right: '<path d="m10 5 7 7-7 7"/>',
 clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', check: '<path d="m5 12 4 4L19 6"/>',
 shield: '<path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
 tool: '<path d="M14 5a5 5 0 0 0-6 6L3 17a3 3 0 0 0 4 4l6-6a5 5 0 0 0 6-6l-3 3-4-4 3-3Z"/>',
 pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
 phone: '<path d="m5 3 4 1 1 5-3 2a15 15 0 0 0 6 6l2-3 5 1 1 4c-1 5-9 2-14-3S0 4 5 3Z"/>',
 device: '<rect x="5" y="2" width="14" height="20" rx="3"/><path d="M8 6h8M8 17h8M10 20h4"/><circle cx="12" cy="11" r="2"/>',
 download: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>', upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 17v4h16v-4"/>',
 close: '<path d="m6 6 12 12M6 18 18 6"/>', edit: '<path d="m15 4 5 5M4 16 16 4a3 3 0 0 1 4 4L8 20l-5 1 1-5Z"/>',
 alert: '<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5M12 17v1"/>', cloud: '<path d="M6 18a5 5 0 0 1-1-10 7 7 0 0 1 13-1 5 5 0 0 1 0 11H6Z"/>',
 external: '<path d="M14 3h7v7M21 3 10 14M11 5H4v16h16v-7"/>', archive: '<rect x="3" y="3" width="18" height="5" rx="1"/><path d="M5 8v13h14V8M9 12h6"/>',
 bell: '<path d="M6 9a6 6 0 0 1 12 0v7l2 3H4l2-3V9M9 22h6"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
 euro: '<path d="M18 5a8 8 0 1 0 0 14M3 10h11M3 14h10"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1 1M18 18l1 1M5 19l1-1M18 6l1-1"/>',
 lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>'
};
export const icon = (name: string, cls = ''): string => `<svg class="icon ${e(cls)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.tool}</svg>`;
export function button(label: string, action: string, symbol = '', cls = 'btn secondary', extra = ''): string { return `<button class="${e(cls)}" type="button" data-action="${e(action)}" ${extra}>${symbol ? icon(symbol) : ''}<span>${e(label)}</span></button>`; }
export const badge = (status: string): string => `<span class="badge ${e(status)}"><i></i>${e(STATUSES[status as keyof typeof STATUSES] || status)}</span>`;
export const heading = (eyebrow: string, title: string, description: string, actions = ''): string => `<div class="page-heading"><div><div class="eyebrow">${e(eyebrow)}</div><h1>${e(title)}</h1><p>${e(description)}</p></div><div class="heading-actions">${actions}</div></div>`;
export const empty = (title: string, text: string, action = '', symbol = 'jobs'): string => `<div class="empty">${icon(symbol)}<h3>${e(title)}</h3><p>${e(text)}</p>${action}</div>`;
export const searchBox = (value: string, placeholder: string): string => `<div class="search-field">${icon('search')}<input id="page-search" type="search" maxlength="160" autocomplete="off" aria-label="Vyhľadávanie" placeholder="${e(placeholder)}" value="${e(value)}"></div>`;
export const money = (v: number | null): string => v === null ? '—' : new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(v);
export function jobCard(job: Job, data: Data, compact = false): string {
  const customer = data.customers.find(c => c.id === job.customerId), device = data.devices.find(d => d.id === job.deviceId);
  const conflict = conflicts(job, data.jobs).length > 0;
  return `<article class="job-card ${compact ? 'compact' : ''}"><div class="job-symbol ${e(job.kind)}">${icon(job.kind === 'revizia' ? 'shield' : job.kind === 'obhliadka' ? 'search' : 'tool')}</div><div class="job-main"><div class="job-top"><span class="tiny muted">${e(job.number)} · ${e(KINDS[job.kind])}</span>${badge(job.status)}</div><button type="button" class="text-link job-title" data-action="edit-job" data-id="${e(job.id)}">${e(job.title)}</button><div class="muted">${e(customer?.name || customer?.company || '')} ${job.address ? '· ' + e(job.address) : ''}</div><div class="job-meta"><span>${icon('clock')}${job.start ? e(dateLabel(job.start, { day: 'numeric', month: 'numeric' })) + ' · ' + e(timeLabel(job.start)) + '–' + e(timeLabel(endTime(job))) : 'Termín ešte neurčený'}</span>${!compact ? `<span>${icon('device')}${e(deviceName(device))}</span>` : ''}${conflict ? '<span class="danger-text">Prekryv termínov</span>' : ''}</div></div><button class="icon-btn card-edit" type="button" data-action="edit-job" data-id="${e(job.id)}" aria-label="Upraviť zákazku ${e(job.number)}">${icon('right')}</button></article>`;
}
export const field = (label: string, name: string, value = '', type = 'text', attrs = '', hint = ''): string => `<label class="field"><span>${e(label)}</span><input name="${e(name)}" type="${e(type)}" value="${e(value)}" ${attrs} maxlength="${type === 'text' ? '400' : '200'}">${hint ? `<small>${e(hint)}</small>` : ''}</label>`;
export const area = (label: string, name: string, value = '', rows = 3): string => `<label class="field"><span>${e(label)}</span><textarea name="${e(name)}" rows="${rows}" maxlength="12000">${e(value)}</textarea></label>`;
export const select = (label: string, name: string, value: string, options: [string, string][], attrs = ''): string => `<label class="field"><span>${e(label)}</span><select name="${e(name)}" ${attrs}>${options.map(([v, label]) => `<option value="${e(v)}" ${v === value ? 'selected' : ''}>${e(label)}</option>`).join('')}</select></label>`;
