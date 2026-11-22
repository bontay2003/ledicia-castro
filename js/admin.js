// Admin panel: credits, enquiries, private availability calendar and backups.
import * as store from './store.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const toast = text => { const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = text; document.body.append(t); setTimeout(() => t.remove(), 2600); };
const KIND = { data: 'VFX data wrangling', lead: 'Lead data wrangler', lidar: 'LiDAR capture', camera: 'Cámara e iluminación' };

$('[data-demo]').hidden = store.live;

// ---------- session ----------
async function setSignedIn(on) {
  $$('[data-when="in"]').forEach(el => { el.hidden = !on; });
  $$('[data-when="out"]').forEach(el => { el.hidden = on; });
  if (on) { showTab('web'); await Promise.all([renderSite(), renderCredits(), renderMessages(), renderCalendar()]); }
  else $$('[data-panel]').forEach(p => { p.hidden = true; });
}
$('[data-login]').addEventListener('submit', async e => {
  e.preventDefault();
  const status = $('[data-login-status]');
  try { status.textContent = 'Entrando…'; await store.signIn($('#l-email').value.trim(), $('#l-pass').value); status.textContent = ''; setSignedIn(true); }
  catch (err) { status.textContent = 'No se pudo entrar: revisa el email y la contraseña.'; console.warn(err); }
});
$('[data-signout]').addEventListener('click', async () => { await store.signOut(); setSignedIn(false); });

// ---------- tabs ----------
function showTab(name) {
  $$('.tab[data-tab]').forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
  $$('[data-panel]').forEach(p => { p.hidden = p.dataset.panel !== name; });
}
$$('.tab[data-tab]').forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));

// ---------- web texts ----------
const AREA = { intro: 'Entrada 3D', hero: 'Portada', services: 'Servicios', scanning: 'Escaneo', skills: 'Técnicas', story: 'Historia', career: 'Carrera', hire: 'Contacto', footer: 'Pie', link: 'Enlace' };
async function renderSite() {
  const map = await store.getSite();
  const keys = Object.keys(map).filter(k => !k.startsWith('link.'));
  $('[data-site-list]').innerHTML = keys.length ? keys.sort().map(k => `
    <div class="item"><span class="item__year" style="font-size:13px">${esc(AREA[k.split('.')[0]] || k.split('.')[0])}</span>
      <div><div class="item__t">${esc(map[k])}</div><div class="item__m">${esc(k)}</div></div>
      <div class="actions"><button class="btn" data-reset="${esc(k)}">Restaurar original</button></div></div>`).join('')
    : '<p class="empty">Todavía no has cambiado ningún texto. Abre la web en modo edición para empezar.</p>';
  const form = $('[data-links-form]');
  for (const el of form.elements) if (el.name) el.value = map[el.name] || '';
}
$('[data-site-list]').addEventListener('click', async e => {
  const b = e.target.closest('[data-reset]'); if (!b) return;
  await store.resetSite(b.dataset.reset); toast('Texto original restaurado'); renderSite();
});
$('[data-links-form]').addEventListener('submit', async e => {
  e.preventDefault();
  const entries = Object.fromEntries([...new FormData(e.target)].filter(([, v]) => v.trim()));
  try { await store.saveSite(entries); toast('Enlaces guardados'); renderSite(); } catch (err) { toast('No se pudo guardar'); console.warn(err); }
});

// ---------- credits ----------
let credits = [];
async function renderCredits() {
  credits = await store.getCredits();
  const q = $('[data-credit-search]').value.trim().toLowerCase();
  const shown = credits.filter(c => !q || `${c.title} ${c.role} ${c.company} ${c.vfx}`.toLowerCase().includes(q));
  $('[data-credit-count]').textContent = `${credits.length} créditos`;
  $('[data-credit-list]').innerHTML = shown.length ? shown.map(c => `
    <div class="item">
      <span class="item__year">${esc(c.year)}</span>
      <div><div class="item__t"><span class="dot" data-kind="${esc(c.kind)}"></span>${esc(c.title)}</div>
        <div class="item__m">${esc(c.role)}${c.note ? ' · ' + esc(c.note) : ''}${c.vfx ? ' · VFX: ' + esc(c.vfx) : ''}${c.link ? ` · <a href="${esc(c.link)}" target="_blank" rel="noopener">${esc(c.source || 'enlace')}</a>` : ' · <span style="color:#ff8a73">sin enlace</span>'}</div></div>
      <div class="actions"><button class="btn" data-edit="${esc(c.id)}">Editar</button><button class="btn btn--danger" data-del="${esc(c.id)}">Borrar</button></div>
    </div>`).join('') : '<p class="empty">No hay créditos con esa búsqueda.</p>';
}
$('[data-credit-search]').addEventListener('input', renderCredits);
const creditForm = $('[data-credit-form]');
creditForm.year.value = new Date().getFullYear();
$('[data-credit-list]').addEventListener('click', async e => {
  const edit = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
  if (edit) {
    const c = credits.find(x => String(x.id) === edit.dataset.edit); if (!c) return;
    for (const [k, v] of Object.entries(c)) if (creditForm.elements[k]) creditForm.elements[k].value = v ?? '';
    $('[data-credit-form-title]').textContent = 'Editar crédito';
    creditForm.title.focus();
  }
  if (del) {
    const c = credits.find(x => String(x.id) === del.dataset.del);
    if (c && confirm(`¿Borrar "${c.title}" de la web?`)) { await store.deleteCredit(c.id); toast('Crédito borrado'); renderCredits(); }
  }
});
creditForm.addEventListener('reset', () => setTimeout(() => { creditForm.id.value = ''; creditForm.year.value = new Date().getFullYear(); $('[data-credit-form-title]').textContent = 'Añadir crédito'; }));
creditForm.addEventListener('submit', async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(creditForm));
  if (!data.id) delete data.id;
  try { await store.saveCredit(data); toast('Guardado: ya aparece en la web'); creditForm.reset(); renderCredits(); }
  catch (err) { toast('No se pudo guardar'); console.warn(err); }
});

// ---------- messages ----------
let messages = [];
async function renderMessages() {
  try { messages = await store.getMessages(); } catch (err) { messages = []; console.warn(err); }
  const filter = $('[data-msg-filter]').value;
  const shown = messages.filter(m => filter === 'all' || m.status === filter);
  const fresh = messages.filter(m => m.status === 'new').length;
  const badge = $('[data-new-count]'); badge.hidden = !fresh; badge.textContent = fresh;
  $('[data-msg-list]').innerHTML = shown.length ? shown.map(m => `
    <article class="msg" data-status="${esc(m.status)}">
      <div class="msg__head"><span class="msg__name">${esc(m.name)}</span><a href="mailto:${esc(m.email)}?subject=${encodeURIComponent('Re: ' + (m.production || 'your request'))}">${esc(m.email)}</a>
        <span class="pill ${m.status === 'new' ? 'pill--new' : ''}">${{ new: 'Nuevo', replied: 'Respondido', archived: 'Archivado' }[m.status] || esc(m.status)}</span>
        <span class="msg__when">${new Date(m.created_at).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
      <div class="msg__meta">${esc(m.request)}${m.production ? ' · ' + esc(m.production) : ''}${m.dates ? ' · ' + esc(m.dates) : ''}</div>
      ${m.message ? `<p style="margin:0;white-space:pre-wrap">${esc(m.message)}</p>` : ''}
      <div class="actions">
        <a class="btn btn--primary" href="mailto:${esc(m.email)}?subject=${encodeURIComponent('Re: ' + (m.production || 'your request'))}">Responder</a>
        <button class="btn" data-mark="${esc(m.id)}" data-to="replied">Marcar respondido</button>
        <button class="btn" data-mark="${esc(m.id)}" data-to="archived">Archivar</button>
        <button class="btn btn--danger" data-mdel="${esc(m.id)}">Borrar</button>
      </div>
    </article>`).join('') : '<p class="empty">Todavía no hay mensajes. Cuando alguien rellene "Hire Ledicia" en la web aparecerá aquí.</p>';
}
$('[data-msg-filter]').addEventListener('change', renderMessages);
$('[data-msg-list]').addEventListener('click', async e => {
  const mark = e.target.closest('[data-mark]'), del = e.target.closest('[data-mdel]');
  if (mark) { await store.setMessageStatus(mark.dataset.mark, mark.dataset.to); renderMessages(); }
  if (del && confirm('¿Borrar este mensaje?')) { await store.deleteMessage(del.dataset.mdel); renderMessages(); }
});
$('[data-msg-csv]').addEventListener('click', () => {
  const cols = ['created_at', 'status', 'name', 'email', 'request', 'production', 'dates', 'message'];
  const csv = [cols.join(','), ...messages.map(m => cols.map(c => `"${String(m[c] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  download(`mensajes-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv');
});

// ---------- calendar (private) ----------
let month = new Date(); month.setDate(1);
let selected = null, slots = [];
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hm = iso => new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
async function renderCalendar() {
  try { slots = await store.getSlots(); } catch (err) { slots = []; console.warn(err); }
  $('[data-cal-title]').textContent = month.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const start = new Date(month); start.setDate(1 - ((month.getDay() + 6) % 7)); // weeks start on Monday
  const today = ymd(new Date());
  const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => `<div class="cal__dow">${d}</div>`);
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const key = ymd(d), mine = slots.filter(s => s.starts_at.slice(0, 10) === key || ymd(new Date(s.starts_at)) === key);
    days.push(`<button type="button" class="cal__day" data-day="${key}" ${d.getMonth() !== month.getMonth() ? 'data-out' : ''} ${key === today ? 'data-today' : ''} ${mine.length ? 'data-has' : ''} aria-pressed="${key === selected}" aria-label="${d.toLocaleDateString('es-ES', { dateStyle: 'full' })}${mine.length ? `, ${mine.length} huecos` : ''}">
      <span class="cal__n">${d.getDate()}</span>${mine.slice(0, 3).map(s => `<span class="cal__chip" data-status="${esc(s.status)}">${hm(s.starts_at)}</span>`).join('')}</button>`);
  }
  $('[data-cal]').innerHTML = days.join('');
  renderSlotList();
}
function renderSlotList() {
  const now = new Date().toISOString();
  const list = selected ? slots.filter(s => ymd(new Date(s.starts_at)) === selected) : slots.filter(s => s.ends_at >= now).slice(0, 12);
  $('[data-day-title]').textContent = selected ? new Date(selected + 'T12:00').toLocaleDateString('es-ES', { dateStyle: 'full' }) : 'Próximos huecos';
  const label = { free: 'Libre', held: 'Provisional', booked: 'Confirmado' };
  $('[data-slot-list]').innerHTML = list.length ? list.map(s => `
    <div class="item"><span class="item__year" style="font-size:15px">${new Date(s.starts_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
      <div><div class="item__t">${hm(s.starts_at)} – ${hm(s.ends_at)} <span class="pill">${label[s.status] || esc(s.status)}</span></div><div class="item__m">${esc(s.note)}</div></div>
      <div class="actions"><button class="btn btn--danger" data-sdel="${esc(s.id)}">Borrar</button></div></div>`).join('') : '<p class="empty">Sin huecos. Elige un día y añade uno.</p>';
}
$('[data-cal]').addEventListener('click', e => {
  const b = e.target.closest('[data-day]'); if (!b) return;
  selected = selected === b.dataset.day ? null : b.dataset.day;
  $('#s-date').value = b.dataset.day;
  renderCalendar();
});
$('[data-cal-prev]').addEventListener('click', () => { month.setMonth(month.getMonth() - 1); renderCalendar(); });
$('[data-cal-next]').addEventListener('click', () => { month.setMonth(month.getMonth() + 1); renderCalendar(); });
$('[data-cal-today]').addEventListener('click', () => { month = new Date(); month.setDate(1); selected = null; renderCalendar(); });
$('[data-slot-list]').addEventListener('click', async e => {
  const del = e.target.closest('[data-sdel]');
  if (del && confirm('¿Borrar este hueco?')) { await store.deleteSlot(del.dataset.sdel); renderCalendar(); }
});
const slotForm = $('[data-slot-form]');
slotForm.date.value = ymd(new Date());
slotForm.addEventListener('submit', async e => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(slotForm));
  const starts = new Date(`${f.date}T${f.from}`), ends = new Date(`${f.date}T${f.to}`);
  if (!(ends > starts)) { toast('La hora de fin tiene que ser posterior al inicio'); return; }
  try { await store.saveSlot({ starts_at: starts.toISOString(), ends_at: ends.toISOString(), status: f.status, note: f.note }); toast('Hueco guardado'); slotForm.note.value = ''; renderCalendar(); }
  catch (err) { toast('No se pudo guardar'); console.warn(err); }
});

// ---------- backup ----------
function download(name, text, type) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
$('[data-export]').addEventListener('click', async () => download(`ledicia-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(await store.exportAll(), null, 2), 'application/json'));
$('[data-import]').addEventListener('change', async e => {
  const file = e.target.files[0]; if (!file) return;
  try { const data = JSON.parse(await file.text()); const list = Array.isArray(data) ? data : data.credits; await store.importCredits(list.map(({ id, ...c }) => c)); toast(`${list.length} créditos importados`); renderCredits(); }
  catch (err) { toast('Ese archivo no es una copia válida'); console.warn(err); }
});

store.currentUser().then(u => setSignedIn(Boolean(u)));
