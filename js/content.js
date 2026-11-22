// Public page: draws the filmography, the service dropdowns and the counts from the credits store
// (so what Ledicia adds in admin.html appears here), and stores enquiries from the hire form.
// The HTML already holds the same content, so search engines and no-script visitors read it all;
// this script only replaces it when the stored list differs.
import { getCredits, sendMessage, live, cachedSite, getSite, saveSite, currentUser } from './store.js';

// ---------- texts Ledicia changed (data-edit / data-edit-href) ----------
function applySite(map) {
  document.querySelectorAll('[data-edit]').forEach(el => { const v = map[el.dataset.edit]; if (typeof v === 'string' && v !== el.textContent) el.textContent = v; });
  document.querySelectorAll('[data-edit-href]').forEach(el => { const v = map[el.dataset.editHref]; if (v) el.href = v; });
}
applySite(cachedSite());                              // at once, before the moments wrap the words
getSite().then(applySite).catch(() => {});

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const EXT = '<svg class="ext" viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2h6v6M10 2 3 9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const isSeries = c => /series|episod/i.test(c.note || '');
const onScreen = c => c.kind !== 'camera';

// ---------- filmography timeline ----------
function drawTimeline(list) {
  const tl = document.querySelector('[data-timeline]');
  if (!tl) return;
  const credits = list.filter(onScreen);
  const years = [...new Set(credits.map(c => c.year))].sort((a, b) => a - b);
  const first = Math.min(...years), last = Math.max(...years);
  const span = []; for (let y = first; y <= last; y++) span.push(y);
  tl.style.setProperty('--tl-cols', span.length);
  tl.innerHTML = span.map(y => `<div class="tl__col"><p class="tl__year">${y}</p><ul>${credits.filter(c => c.year === y).map(c =>
    `<li><button type="button" class="tl__item" data-id="${esc(c.id)}" data-kind="${esc(c.kind)}"><span class="tl__t">${esc(c.title)}</span><span class="tl__r">${esc((c.role || '').split(',')[0])}</span></button></li>`).join('')}</ul></div>`).join('');
  // the two career phases over the years
  const phases = document.querySelector('.tl-phases');
  const firstData = credits.filter(c => c.kind !== 'lidar').reduce((m, c) => Math.min(m, c.year), Infinity);
  if (phases && isFinite(firstData)) {
    const cut = span.indexOf(firstData) + 1;
    phases.style.setProperty('--tl-cols', span.length);
    const [a, b] = phases.children;
    if (a && b) { a.style.gridColumn = `1 / ${cut}`; b.style.gridColumn = `${cut} / ${span.length + 1}`; }
  }
  // counts in the heading
  const h = document.getElementById('credits-h');
  const series = credits.filter(isSeries).length, features = credits.length - series;
  if (h) h.textContent = `${features} features, ${series} series, one path`;
  bindTimeline(tl, credits);
}

function bindTimeline(tl, credits) {
  const phone = matchMedia('(max-width: 639px)'), card = document.querySelector('.tl-card');
  if (!card) return;
  const f = k => card.querySelector(`[data-f="${k}"]`);
  const byId = new Map(credits.map(c => [String(c.id), c]));
  const show = b => {
    const c = byId.get(b.dataset.id); if (!c) return;
    tl.querySelectorAll('.tl__item').forEach(x => x === b ? x.setAttribute('aria-current', 'true') : x.removeAttribute('aria-current'));
    if (phone.matches) b.closest('.tl__col').after(card); else if (card.previousElementSibling !== tl) tl.after(card);
    f('meta').textContent = `${c.year} · ${c.note || ''}`;
    f('title').textContent = c.title;
    f('role').textContent = c.role;
    f('company').textContent = c.vfx || c.company || '—';
    f('camera').textContent = c.camera || '';
    f('camwrap').hidden = !c.camera;
    const link = f('link');
    link.hidden = !c.link;
    if (c.link) { link.href = c.link; link.textContent = `See the credit on ${c.source || 'the source'}`; }
  };
  tl.querySelectorAll('.tl__item').forEach(b => {
    b.addEventListener('click', () => { card.hidden = false; show(b); });
    b.addEventListener('focus', () => show(b));
    b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') show(b); });
  });
  const lead = tl.querySelector('[data-kind="lead"]') || tl.querySelector('.tl__item:last-of-type');
  if (lead) show(lead);
  if (phone.matches) card.hidden = true;   // on a phone it opens under the year that was tapped
}

// ---------- service dropdowns ----------
function drawServices(list) {
  const groups = {
    data: list.filter(c => c.kind === 'data' || c.kind === 'lead'),
    lidar: list.filter(c => c.kind === 'lidar'),
    texture: list.filter(c => /texture|hdri/i.test(c.role || '')),
    camera: list.filter(c => c.kind === 'camera'),
  };
  document.querySelectorAll('[data-svc]').forEach(d => {
    const g = groups[d.dataset.svc] || [];
    const ul = d.querySelector('.prod'); if (!ul) return;
    ul.innerHTML = g.map(c => {
      const tag = c.kind === 'lead' ? 'Lead' : (/episod/i.test(c.note) ? c.note.replace(/^.*?(\d+ episodes).*$/i, '$1') : '');
      const inner = `<span class="prod__t">${esc(c.title)}${tag ? ` <span class="prod__note">${esc(tag)}</span>` : ''}</span><span class="prod__y">${c.year}</span>`;
      return c.link
        ? `<li><a class="prod__link" href="${esc(c.link)}" target="_blank" rel="noopener">${inner}<span class="prod__src">${esc(c.source || 'Link')}${EXT}</span></a></li>`
        : `<li><span class="prod__link">${inner}<span class="prod__src"></span></span></li>`;
    }).join('');
    const count = d.querySelector('[data-svc-count]');
    if (count && (d.dataset.svc === 'data' || d.dataset.svc === 'lidar')) count.textContent = `${g.length} productions`;
  });
  const total = list.filter(onScreen).length;
  document.querySelectorAll('[data-count-total]').forEach(el => { el.textContent = total; });
}

// ---------- hire form: stored as an enquiry ----------
function bindHireForm() {
  const form = document.querySelector('form[data-hire]');
  if (!form) return;
  const status = form.querySelector('[data-form-status]');
  // capture phase: runs before the kit's own form handler, which would open a mail app
  form.addEventListener('submit', async e => {
    e.preventDefault(); e.stopImmediatePropagation();
    let firstBad = null;
    form.querySelectorAll('[required]').forEach(input => {
      const err = document.getElementById(input.getAttribute('aria-describedby'));
      const bad = !input.value.trim() || (input.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.value.trim()));
      input.toggleAttribute('aria-invalid', bad);
      if (err) err.hidden = !bad;
      if (bad && !firstBad) firstBad = input;
    });
    if (firstBad) { status.textContent = 'Check the highlighted fields.'; firstBad.focus(); return; }
    const data = Object.fromEntries(new FormData(form));
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true; status.textContent = 'Sending…';
    try {
      await sendMessage(data);
      form.reset();
      status.textContent = live
        ? 'Your request is in. Ledicia replies by email.'
        : 'Saved in demo mode: this request is kept in this browser only until the site is connected.';
      form.classList.add('is-sent');
    } catch (err) {
      status.textContent = 'It did not send. Try again in a moment, or use LinkedIn below.';
      console.warn(err);
    } finally { button.disabled = false; }
  }, true);
}

getCredits().then(list => { drawTimeline(list); drawServices(list); }).catch(err => console.warn('credits', err));
bindHireForm();

// ---------- edit mode: index.html?edit=1, only for a signed-in admin ----------
async function editMode() {
  if (!new URLSearchParams(location.search).has('edit')) return;
  const user = await currentUser().catch(() => null);
  if (!user) return;                                   // no session: the page stays as it is (never points to the admin)
  document.documentElement.classList.add('is-editing');
  document.documentElement.classList.remove('intro-on');   // the 3D intro steps aside: its labels stack as plain, editable text
  const style = document.createElement('style');
  style.textContent = `
    .is-editing [data-edit] { outline: 1px dashed color-mix(in oklab, #ff4b2b 55%, transparent); outline-offset: 3px; border-radius: 2px; cursor: text; }
    .is-editing [data-edit]:hover { outline-style: solid; }
    .is-editing [data-edit]:focus { outline: 2px solid #ff4b2b; background: rgba(255,75,43,.08); }
    .is-editing [data-edit].is-changed { outline-color: #5fd39a; }
    .is-editing .intro__step { opacity: 1 !important; transform: none !important; }
    .is-editing nav.actionbar { display: none !important; }
    .editbar { position: fixed; z-index: 50; left: 50%; bottom: 20px; transform: translateX(-50%); display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: center;
      padding: 10px 12px; border-radius: 12px; background: #181614; border: 1px solid rgba(242,237,230,.18); box-shadow: 0 10px 40px rgba(0,0,0,.5); font: 14px/1.3 "Hanken Grotesk", system-ui, sans-serif; color: #f2ede6; max-width: calc(100vw - 24px); }
    .editbar b { color: #ff4b2b; font-weight: 600; } .editbar span { color: #a39b91; }
    .editbar button, .editbar a { font: inherit; min-height: 40px; padding: 0 14px; border-radius: 8px; border: 1px solid rgba(242,237,230,.18); background: #211e1b; color: #f2ede6; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; }
    .editbar .primary { background: #ff4b2b; border-color: #ff4b2b; color: #0e0d0c; font-weight: 600; } .editbar button:disabled { opacity: .45; cursor: not-allowed; }`;
  document.head.append(style);
  const original = new Map(), changed = new Map();
  const bar = document.createElement('div');
  bar.className = 'editbar'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Editor');
  bar.innerHTML = `<b>Modo edición</b><span data-count>Haz clic en un texto para cambiarlo</span><button type="button" class="primary" data-save disabled>Guardar</button><button type="button" data-undo disabled>Deshacer</button><a href="admin.html">Volver al panel</a><a href="index.html">Ver web</a>`;
  document.body.append(bar);
  const count = bar.querySelector('[data-count]'), save = bar.querySelector('[data-save]'), undo = bar.querySelector('[data-undo]');
  const refresh = () => { const n = changed.size; count.textContent = n ? `${n} cambio${n > 1 ? 's' : ''} sin guardar` : 'Haz clic en un texto para cambiarlo'; save.disabled = undo.disabled = !n; };
  document.querySelectorAll('[data-edit]').forEach(el => {
    original.set(el, el.textContent);
    el.contentEditable = 'plaintext-only';
    if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';   // Firefox before 136
    el.spellcheck = true;
    el.addEventListener('input', () => {
      const v = el.textContent.replace(/\s+/g, ' ').trim();
      if (v === original.get(el).replace(/\s+/g, ' ').trim()) { changed.delete(el.dataset.edit); el.classList.remove('is-changed'); }
      else { changed.set(el.dataset.edit, v); el.classList.add('is-changed'); }
      refresh();
    });
    el.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); } });
    el.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); }, true);   // a text inside a link or a dropdown edits, never navigates
  });
  save.addEventListener('click', async () => {
    save.disabled = true; count.textContent = 'Guardando…';
    try {
      await saveSite(Object.fromEntries(changed));
      changed.forEach((_, key) => { const el = document.querySelector(`[data-edit="${CSS.escape(key)}"]`); if (el) { original.set(el, el.textContent); el.classList.remove('is-changed'); } });
      changed.clear(); refresh(); count.textContent = live ? 'Guardado. Ya está en la web.' : 'Guardado (modo demo: en este navegador).';
    } catch (err) { console.warn(err); count.textContent = 'No se pudo guardar. Inténtalo otra vez.'; save.disabled = false; }
  });
  undo.addEventListener('click', () => {
    changed.forEach((_, key) => { const el = document.querySelector(`[data-edit="${CSS.escape(key)}"]`); if (el) { el.textContent = original.get(el); el.classList.remove('is-changed'); } });
    changed.clear(); refresh();
  });
  addEventListener('beforeunload', e => { if (changed.size) { e.preventDefault(); e.returnValue = ''; } });
}
editMode();
