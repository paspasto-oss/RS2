import { APP_VERSION, emptyData, stamp, validateData, nextNumber, type Data, type Job, type Customer, type Device, type Tip } from './domain.js';
import { today, addDays, dateLabel, localDate, toUtc, googleCalendarUrl, makeIcs, conflicts } from './lib/calendar.js';
import { load, save, type Workspace } from './lib/store.js';
import { download, exportBackup, importBackup } from './lib/backup.js';
import { button, icon, e, type ViewState } from './ui.js';
import { dashboard } from './modules/dashboard.js';
import { jobsPage } from './modules/jobs.js';
import { customersPage } from './modules/customers.js';
import { calendarPage } from './modules/calendar-view.js';
import { knowledgePage } from './modules/knowledge.js';
import { settingsPage } from './modules/settings.js';
import { editorContent, deviceOptions, type Editor, type EditorType } from './modules/editors.js';
import { demoData } from './demo.js';

const routes: [string, string, string][] = [['home', 'Prehľad', 'home'], ['jobs', 'Zákazky', 'jobs'], ['calendar', 'Kalendár', 'calendar'], ['customers', 'Zákazníci', 'customers'], ['knowledge', 'Poradňa', 'knowledge']];
let data: Data = emptyData(), ready = false, busy = false, editor: Editor | null = null, dirty = false;
let state: ViewState = { route: 'home', query: '', filter: '', customerTab: 'customers', selectedCustomer: '', date: today(), month: today().slice(0, 7), calendarMode: 'month', knowledgeTab: 'all', workspace: 'real' };
const root = document.querySelector<HTMLElement>('#app')!;
const dialog = document.querySelector<HTMLDialogElement>('#editor')!;
const toastElement = document.querySelector<HTMLElement>('#toast')!;
let toastTimer: ReturnType<typeof setTimeout>;
function message(text: string, error = false): void { toastElement.textContent = text; toastElement.className = 'toast visible' + (error ? ' error' : ''); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastElement.className = 'toast', error ? 8000 : 4500); }
function fail(err: unknown): void { const text = err instanceof Error ? err.message : 'Operácia sa nepodarila.'; if (dialog.open) { const el = dialog.querySelector<HTMLElement>('#form-error'); if (el) { el.textContent = text; el.hidden = false; el.scrollIntoView({ block: 'nearest' }); } } message(text, true); }
function nav(route: string): void { state.route = route; state.query = ''; state.filter = ''; if (route !== 'jobs') state.selectedCustomer = ''; location.hash = route; render(); window.scrollTo({ top: 0 }); }
function render(): void {
  if (!ready) return;
  const pages: Record<string, () => string> = { home: () => dashboard(data), jobs: () => jobsPage(data, state), customers: () => customersPage(data, state), calendar: () => calendarPage(data, state), knowledge: () => knowledgePage(data, state), settings: () => settingsPage(data, state.workspace === 'demo') };
  const navigation = routes.map(([id, label, symbol]) => `<button type="button" data-action="route-${id}" class="nav-item ${state.route === id ? 'active' : ''}" ${state.route === id ? 'aria-current="page"' : ''}>${icon(symbol)}<span>${label}</span>${id === 'jobs' ? `<b>${data.jobs.filter(j => !['done', 'cancelled'].includes(j.status)).length}</b>` : ''}</button>`).join('');
  root.innerHTML = `<aside class="sidebar"><a class="brand" href="#home" aria-label="Spektra Servis — úvod"><span class="brand-mark">S</span><span>SPEKTRA<small>SERVIS</small></span></a><div class="workspace-label">PRACOVNÝ PRIESTOR</div><nav aria-label="Hlavná navigácia">${navigation}</nav><div class="sidebar-bottom"><div class="local-status">${icon('shield')}<div><strong>Jeden technik</strong><span>Lokálne · bez paušálu</span></div></div><button class="nav-item ${state.route === 'settings' ? 'active' : ''}" data-action="route-settings">${icon('settings')}<span>Nastavenia a zálohy</span></button><div class="profile"><span class="avatar">${e(data.settings.technician.split(' ').map(s => s[0]).slice(0, 2).join(''))}</span><div><strong>${e(data.settings.technician)}</strong><small>Technik / správca</small></div></div></div></aside>
  <div class="main-shell"><header class="topbar"><div class="breadcrumb">Spektra Servis <span>/</span> ${e(routes.find(r => r[0] === state.route)?.[1] || 'Nastavenia')}</div><div class="top-actions"><span class="save-state"><i></i>${navigator.onLine ? 'Uložené v zariadení' : 'Offline · miestne dáta'}</span><button class="icon-btn" data-action="install" aria-label="Inštalácia na plochu">${icon('download')}</button><button class="icon-btn" data-action="route-settings" aria-label="Nastavenia">${icon('settings')}</button></div></header>${state.workspace === 'demo' ? `<div class="demo-banner"><strong>UKÁŽKOVÉ ÚDAJE</strong><span>Toto nie sú skutoční zákazníci ani termíny.</span>${button('Späť k mojim dátam', 'exit-demo', '', 'btn ghost')}</div>` : `<div class="storage-banner">${icon('lock')}<span>Údaje sú zatiaľ len v tomto prehliadači. Cloud nie je pripojený.</span><button class="text-link" data-action="route-settings">Zálohovať</button></div>`}<main id="main-content">${(pages[state.route] || pages.home)!()}</main><footer class="app-footer"><span>Spektra Servis <b>v${APP_VERSION}</b></span><span>${state.workspace === 'demo' ? 'Oddelená ukážka' : 'Samostatný pracovný priestor'} · žiadne spojenie s RS2</span></footer></div><nav class="mobile-nav" aria-label="Mobilná navigácia">${navigation}</nav>`;
}
async function commit(next: Data, expected = data.revision): Promise<void> {
  if (busy) throw new Error('Počkajte na dokončenie ukladania.'); busy = true;
  const submit = dialog.querySelector<HTMLButtonElement>('[type=submit]'); if (submit) submit.disabled = true;
  try { const clean = await save(state.workspace, next, expected); data = clean; render(); } finally { busy = false; if (submit) submit.disabled = false; }
}
function canClose(): boolean { return !busy && (!dirty || confirm('Zahodiť neuložené zmeny vo formulári?')); }
function closeEditor(): boolean { if (!canClose()) return false; dialog.close(); editor = null; dirty = false; return true; }
function openEditor(type: EditorType, id = '', extra: Partial<Editor> = {}): void {
  if (dialog.open && !closeEditor()) return;
  if ((type === 'job' || type === 'device') && !data.customers.some(c => !c.archived) && !id) { message('Najprv pridajte zákazníka. Potom mu priradíte zariadenie alebo zákazku.'); type = 'customer'; }
  editor = { type, id, revision: data.revision, ...extra }; dirty = false;
  const view = editorContent(editor, data);
  dialog.innerHTML = `<form id="entity-form"><div class="modal-head"><div><span class="eyebrow">SPEKTRA SERVIS</span><h2 id="editor-title">${e(view.title)}</h2></div><button type="button" class="icon-btn" data-action="close-editor" aria-label="Zavrieť formulár">${icon('close')}</button></div><div class="modal-body"><div id="form-error" class="form-error" role="alert" hidden></div>${view.content}${view.tools ? '<div class="editor-tools">' + view.tools + '</div>' : ''}</div><div class="modal-footer"><span class="tiny muted">Uloženie iba v tomto zariadení</span>${button('Zrušiť', 'close-editor', '', 'btn secondary')}<button class="btn primary" type="submit">${icon('check')}<span>Uložiť</span></button></div></form>`;
  dialog.showModal(); dialog.querySelector<HTMLInputElement>('input,select,textarea')?.focus();
}
function text(form: FormData, key: string): string { return String(form.get(key) || '').trim(); }
async function saveEditor(form: HTMLFormElement): Promise<void> {
  if (!editor) return;
  const f = new FormData(form), s = (key: string) => text(f, key), next = structuredClone(data), now = new Date().toISOString();
  const common = { ...stamp(), updatedAt: now };
  if (editor.type === 'customer') {
    const old = data.customers.find(x => x.id === editor!.id);
    const row: Customer = { ...(old || common), updatedAt: now, name: s('name'), company: s('company'), phone: s('phone'), email: s('email'), address: s('address'), notes: s('notes'), archived: old?.archived || false };
    next.customers = old ? next.customers.map(x => x.id === old.id ? row : x) : [...next.customers, row];
  }
  if (editor.type === 'device') {
    const old = data.devices.find(x => x.id === editor!.id);
    if (old && old.customerId !== s('customerId') && data.jobs.some(j => j.deviceId === old.id)) throw new Error('Zariadenie s históriou nemožno presunúť k inému zákazníkovi. Vytvorte novú kartu.');
    const row: Device = { ...(old || common), updatedAt: now, customerId: s('customerId'), type: s('type') as Device['type'], manufacturer: s('manufacturer'), model: s('model'), serial: s('serial'), location: s('location'), nextService: s('nextService'), notes: s('notes'), archived: old?.archived || false };
    next.devices = old ? next.devices.map(x => x.id === old.id ? row : x) : [...next.devices, row];
  }
  if (editor.type === 'job') {
    const old = data.jobs.find(x => x.id === editor!.id), start = s('start') ? toUtc(s('start')) : '';
    const row: Job = { ...(old || common), updatedAt: now, number: old?.number || nextNumber(data, today().slice(0, 4)), customerId: s('customerId'), deviceId: s('deviceId'), title: s('title'), kind: s('kind') as Job['kind'], status: s('status') as Job['status'], start, duration: Number(s('duration')), address: s('address'), issue: s('issue'), resolution: s('resolution'), result: s('result') as Job['result'], payment: s('payment') as Job['payment'], amount: s('amount') === '' ? null : Number(s('amount')), version: (old?.version ?? -1) + 1 };
    const overlap = conflicts(row, data.jobs); if (overlap.length && !confirm('Termín sa prekrýva so zákazkou ' + overlap.map(j => j.number).join(', ') + '. Uložiť aj napriek prekryvu?')) return;
    next.jobs = old ? next.jobs.map(x => x.id === old.id ? row : x) : [...next.jobs, row];
  }
  if (editor.type === 'tip') {
    const old = data.tips.find(x => x.id === editor!.id);
    const row: Tip = { ...(old || common), updatedAt: now, title: s('title'), category: s('category') as Tip['category'], manufacturer: s('manufacturer'), model: s('model'), code: s('code'), symptoms: s('symptoms'), solution: s('solution'), source: s('source'), verification: s('verification') as Tip['verification'], verifiedAt: s('verifiedAt'), jobId: old?.jobId || editor.sourceJobId || '' };
    next.tips = old ? next.tips.map(x => x.id === old.id ? row : x) : [...next.tips, row];
  }
  if (editor.type === 'settings') next.settings = { technician: s('technician'), company: s('company'), baseAddress: s('baseAddress') };
  await commit(validateData(next), editor.revision); dirty = false; closeEditor(); message('Uložené v zariadení.');
}
async function switchWorkspace(workspace: Workspace): Promise<void> {
  if (dialog.open && !closeEditor()) return;
  const newData = await load(workspace);
  data = workspace === 'demo' && !newData.customers.length && !newData.jobs.length ? await save('demo', demoData(), newData.revision) : newData;
  state = { ...state, workspace, selectedCustomer: '', query: '', filter: '' }; nav('home');
}
async function act(action: string, el: HTMLElement): Promise<void> {
  const id = el.dataset.id || '';
  if (action.startsWith('route-')) { if (dialog.open && !closeEditor()) return; nav(action.slice(6)); return; }
  if (action === 'new-customer') return openEditor('customer');
  if (action === 'new-device') return openEditor('device');
  if (action === 'new-job') return openEditor('job');
  if (action === 'new-job-day') return openEditor('job', '', { day: state.date });
  if (action === 'new-tip') return openEditor('tip');
  if (action === 'edit-settings') return openEditor('settings');
  if (action.startsWith('edit-')) return openEditor(action.slice(5) as EditorType, id);
  if (action === 'close-editor') { closeEditor(); return; }
  if (action === 'customer-tab') { state.customerTab = el.dataset.tab || 'customers'; state.query = ''; state.filter = ''; render(); }
  if (action === 'knowledge-tab') { state.knowledgeTab = el.dataset.tab || 'all'; state.query = ''; render(); }
  if (action === 'customer-history') { state.selectedCustomer = id; nav('jobs'); }
  if (action === 'clear-customer') { state.selectedCustomer = ''; render(); }
  if (action === 'device-for-customer') return openEditor('device', '', { customerId: id });
  if (action === 'job-for-device') { const d = data.devices.find(d => d.id === id); if (d) openEditor('job', '', { customerId: d.customerId, deviceId: id, day: today() }); }
  if (action === 'tip-from-job') return openEditor('tip', '', { sourceJobId: id });
  if (action === 'archive-customer' || action === 'archive-device') {
    if (dirty) throw new Error('Najskôr uložte úpravy formulára alebo ho zavrite bez uloženia.');
    const key = action === 'archive-customer' ? 'customers' : 'devices', next = structuredClone(data), row = next[key].find(x => x.id === id);
    if (row && confirm(row.archived ? 'Obnoviť záznam do aktívnej evidencie?' : 'Archivovať záznam? História aj súvisiace zákazky zostanú zachované.')) { row.archived = !row.archived; row.updatedAt = new Date().toISOString(); await commit(next, editor?.revision ?? data.revision); dirty = false; closeEditor(); message('Záznam bol aktualizovaný.'); }
  }
  if (action === 'select-day') { state.date = el.dataset.date || today(); render(); }
  if (action === 'calendar-mode') { state.calendarMode = el.dataset.mode || 'month'; state.month = state.date.slice(0, 7); render(); }
  if (action === 'calendar-today') { state.date = today(); state.month = today().slice(0, 7); render(); }
  if (action === 'calendar-prev' || action === 'calendar-next') {
    const step = action === 'calendar-next' ? 1 : -1;
    if (state.calendarMode === 'week') state.date = addDays(state.date, step * 7);
    else { const d = new Date(state.month + '-01T12:00:00Z'); d.setUTCMonth(d.getUTCMonth() + step); state.date = d.toISOString().slice(0, 10); }
    state.month = state.date.slice(0, 7); render();
  }
  if (action === 'google-job' || action === 'ics-job') {
    if (dirty) throw new Error('Najskôr uložte zmeny zákazky. Prenáša sa iba uložená verzia.');
    const j = data.jobs.find(j => j.id === id); if (!j?.start) throw new Error('Najprv nastavte termín.');
    if (action === 'google-job') { window.open(googleCalendarUrl(j, data.customers.find(c => c.id === j.customerId)), '_blank', 'noopener,noreferrer'); message('V Google potvrďte uloženie a nastavte pripomienku. Nejde o synchronizáciu.'); }
    else download(j.number + '.ics', makeIcs([j], data.customers), 'text/calendar;charset=utf-8');
  }
  if (action === 'export-calendar') { if (!data.jobs.some(j => j.start && j.status !== 'cancelled')) throw new Error('Nie sú naplánované žiadne udalosti na export.'); download('Spektra-kalendar.ics', makeIcs(data.jobs, data.customers), 'text/calendar;charset=utf-8'); message('Export pripravený. Opakovaný import môže v Google vytvoriť duplicity.'); }
  if (action === 'export-backup') {
    const password = document.querySelector<HTMLInputElement>('#backup-password')?.value || '';
    if (!password && !confirm('Export bez hesla obsahuje čitateľné osobné údaje. Pokračovať?')) return;
    const next = structuredClone(data); next.lastBackup = new Date().toISOString();
    const content = await exportBackup(next, password);
    download(`Spektra-${state.workspace}-${today()}.${password ? 'spektra' : 'json'}`, content);
    await commit(next); message('Záloha bola pripravená na stiahnutie. Overte, že sa súbor skutočne uložil.');
  }
  if (action === 'preview-backup') {
    const file = document.querySelector<HTMLInputElement>('#restore-file')?.files?.[0]; if (!file) throw new Error('Vyberte súbor zálohy.');
    if (file.size > 25 * 1024 * 1024) throw new Error('Súbor je väčší ako 25 MB.');
    const restored = await importBackup(await file.text(), document.querySelector<HTMLInputElement>('#restore-password')?.value || '');
    const question = `Záloha obsahuje ${restored.customers.length} zákazníkov, ${restored.devices.length} zariadení, ${restored.jobs.length} zákaziek a ${restored.tips.length} poznatkov.\n\nNahradí všetky údaje v ${state.workspace === 'real' ? 'skutočnom' : 'ukážkovom'} priestore. Pred pokračovaním majte uloženú aktuálnu zálohu. Nahradiť údaje?`;
    if (confirm(question)) { await commit(restored); message('Záloha bola obnovená.'); }
  }
  if (action === 'persist-storage') { const ok = await navigator.storage?.persist?.(); message(ok ? 'Prehliadač povolil trvalé úložisko. Zálohovanie je stále potrebné.' : 'Prehliadač trvalé úložisko nepovolil. Pravidelne exportujte zálohu.'); }
  if (action === 'enter-demo') await switchWorkspace('demo');
  if (action === 'exit-demo') await switchWorkspace('real');
  if (action === 'install') {
    if (installPrompt) { await installPrompt.prompt(); installPrompt = undefined; }
    else message(location.protocol === 'file:' ? 'Na inštaláciu na plochu treba HTTPS nasadenie. Lokálny HTML súbor môžete otvárať priamo.' : 'Android/Chrome: menu → Inštalovať aplikáciu. iPhone: Zdieľať → Pridať na plochu.');
  }
  if (action === 'apply-update') { if (dirty || busy) throw new Error('Najprv uložte rozpracovaný formulár.'); waitingWorker?.postMessage({ type: 'SKIP_WAITING' }); }
}

document.addEventListener('click', event => { const el = (event.target as Element)?.closest<HTMLElement>('[data-action]'); if (el && ready) { event.preventDefault(); void act(el.dataset.action || '', el).catch(fail); } });
dialog.addEventListener('cancel', event => { event.preventDefault(); closeEditor(); });
dialog.addEventListener('input', () => { dirty = true; });
dialog.addEventListener('change', () => { dirty = true; });
document.addEventListener('submit', event => { if ((event.target as HTMLElement).id === 'entity-form') { event.preventDefault(); void saveEditor(event.target as HTMLFormElement).catch(fail); } });
document.addEventListener('input', event => {
  const el = event.target as HTMLInputElement;
  if (el.id === 'page-search') { const pos = el.selectionStart; state.query = el.value; render(); const replacement = document.querySelector<HTMLInputElement>('#page-search'); replacement?.focus(); if (replacement && pos !== null) { try { replacement.setSelectionRange(pos, pos); } catch { /* input type support */ } } }
});
document.addEventListener('change', event => {
  const el = event.target as HTMLSelectElement;
  if (el.id === 'job-filter' || el.id === 'customer-filter') { state.filter = el.value; render(); }
  if (el.id === 'job-customer') {
    const device = dialog.querySelector<HTMLSelectElement>('#job-device'); if (device) device.innerHTML = deviceOptions(data, el.value);
    const address = dialog.querySelector<HTMLInputElement>('[name=address]'); if (address) address.value = data.customers.find(c => c.id === el.value)?.address || '';
  }
  if (el.id === 'job-device') { const address = dialog.querySelector<HTMLInputElement>('[name=address]'), device = data.devices.find(d => d.id === el.value); if (address && device?.location) address.value = device.location; }
});
window.addEventListener('hashchange', () => { const route = location.hash.slice(1); if (route && state.route !== route) { if (dialog.open && !closeEditor()) { history.replaceState(null, '', '#' + state.route); return; } state.route = routes.some(r => r[0] === route) || route === 'settings' ? route : 'home'; state.query = ''; state.filter = ''; state.selectedCustomer = ''; render(); } });
window.addEventListener('beforeunload', event => { if (dirty || busy) { event.preventDefault(); event.returnValue = ''; } });
window.addEventListener('online', render); window.addEventListener('offline', render);
interface InstallEvent extends Event { prompt(): Promise<void> }
let installPrompt: InstallEvent | undefined, waitingWorker: ServiceWorker | undefined;
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event as InstallEvent; });
async function setupPwa(): Promise<void> {
  if (location.protocol === 'file:' || !('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    function notify(worker: ServiceWorker | null) { if (!worker) return; waitingWorker = worker; const el = document.querySelector<HTMLElement>('#update-notice')!; el.hidden = false; el.innerHTML = `Nová verzia je pripravená. ${button('Načítať po uložení', 'apply-update', '', 'btn secondary')}`; }
    notify(registration.waiting);
    registration.addEventListener('updatefound', () => registration.installing?.addEventListener('statechange', () => { if (registration.waiting && navigator.serviceWorker.controller) notify(registration.waiting); }));
    let reloaded = false; navigator.serviceWorker.addEventListener('controllerchange', () => { if (waitingWorker && !reloaded) { reloaded = true; location.reload(); } });
  } catch { message('Offline inštalácia nie je dostupná; miestne údaje zostávajú zachované.', true); }
}
async function init(): Promise<void> {
  try { data = await load('real'); ready = true; const route = location.hash.slice(1); if (routes.some(r => r[0] === route) || route === 'settings') state.route = route; render(); await setupPwa(); }
  catch (err) { root.innerHTML = `<main class="fatal"><h1>Údaje sa nepodarilo otvoriť</h1><p>${e(err instanceof Error ? err.message : err)}</p><p>Nič sa neprepísalo. Nevymazávajte údaje prehliadača. Skúste aplikáciu otvoriť cez lokálny server alebo podporovaný prehliadač.</p></main>`; }
}
void init();
