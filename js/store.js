// The site's data layer: credits, enquiries and availability.
// With js/config.js filled in it talks to Supabase (shared database + login for Ledicia).
// Without it, it runs in DEMO mode: everything is kept in this browser's localStorage, so the admin
// panel can be tried today. Demo data never reaches anyone else: enquiries sent from another device
// are not visible here until Supabase is connected.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import seed from '../data/credits.js';

export const live = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
let client = null;
async function db() {
  if (!live) return null;
  if (!client) {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return client;
}

// ---------- local (demo) storage ----------
const KEY = { credits: 'lc.credits', messages: 'lc.messages', slots: 'lc.slots', session: 'lc.session' };
const readLocal = (k, fallback) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
const writeLocal = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
const seeded = () => seed.map((c, i) => ({ id: `seed-${i}`, sort: i, ...c }));
const byYear = (a, b) => (b.year - a.year) || ((a.sort ?? 0) - (b.sort ?? 0));

// ---------- credits (public read) ----------
export async function getCredits() {
  const c = await db();
  if (c) {
    const { data, error } = await c.from('credits').select('*').order('year', { ascending: false }).order('sort');
    if (!error && data?.length) return data;
    return seeded();                                // database empty or unreachable: the seed keeps the site whole
  }
  return readLocal(KEY.credits, seeded()).sort(byYear);
}
export async function saveCredit(credit) {
  const row = { ...credit, year: Number(credit.year) || new Date().getFullYear() };
  const c = await db();
  if (c) {
    if (!row.id || String(row.id).startsWith('seed-')) delete row.id;
    const { data, error } = await c.from('credits').upsert(row).select().single();
    if (error) throw error;
    return data;
  }
  const list = readLocal(KEY.credits, seeded());
  if (!row.id) row.id = uid();
  const i = list.findIndex(x => x.id === row.id);
  if (i >= 0) list[i] = row; else list.push(row);
  writeLocal(KEY.credits, list);
  return row;
}
export async function deleteCredit(id) {
  const c = await db();
  if (c) { const { error } = await c.from('credits').delete().eq('id', id); if (error) throw error; return; }
  writeLocal(KEY.credits, readLocal(KEY.credits, seeded()).filter(x => x.id !== id));
}

// ---------- enquiries (public insert, admin read) ----------
export async function sendMessage(msg) {
  const row = { name: msg.name, email: msg.email, production: msg.production || '', dates: msg.dates || '', request: msg.request || '', message: msg.message || '' };
  const c = await db();
  if (c) { const { error } = await c.from('messages').insert(row); if (error) throw error; return { stored: 'database' }; }
  const list = readLocal(KEY.messages, []);
  list.unshift({ id: uid(), created_at: new Date().toISOString(), status: 'new', ...row });
  writeLocal(KEY.messages, list);
  return { stored: 'browser' };
}
export async function getMessages() {
  const c = await db();
  if (c) { const { data, error } = await c.from('messages').select('*').order('created_at', { ascending: false }); if (error) throw error; return data; }
  return readLocal(KEY.messages, []);
}
export async function setMessageStatus(id, status) {
  const c = await db();
  if (c) { const { error } = await c.from('messages').update({ status }).eq('id', id); if (error) throw error; return; }
  writeLocal(KEY.messages, readLocal(KEY.messages, []).map(m => m.id === id ? { ...m, status } : m));
}
export async function deleteMessage(id) {
  const c = await db();
  if (c) { const { error } = await c.from('messages').delete().eq('id', id); if (error) throw error; return; }
  writeLocal(KEY.messages, readLocal(KEY.messages, []).filter(m => m.id !== id));
}

// ---------- availability (admin only for now; Google Calendar sync later) ----------
export async function getSlots() {
  const c = await db();
  if (c) { const { data, error } = await c.from('availability').select('*').order('starts_at'); if (error) throw error; return data; }
  return readLocal(KEY.slots, []).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}
export async function saveSlot(slot) {
  const c = await db();
  if (c) { const { data, error } = await c.from('availability').upsert(slot).select().single(); if (error) throw error; return data; }
  const list = readLocal(KEY.slots, []);
  const row = { id: slot.id || uid(), status: 'free', note: '', ...slot };
  const i = list.findIndex(x => x.id === row.id);
  if (i >= 0) list[i] = row; else list.push(row);
  writeLocal(KEY.slots, list);
  return row;
}
export async function deleteSlot(id) {
  const c = await db();
  if (c) { const { error } = await c.from('availability').delete().eq('id', id); if (error) throw error; return; }
  writeLocal(KEY.slots, readLocal(KEY.slots, []).filter(s => s.id !== id));
}

// ---------- login ----------
export async function signIn(email, password) {
  const c = await db();
  if (!c) { writeLocal(KEY.session, { email, demo: true }); return { email, demo: true }; } // demo: no real check
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}
export async function signOut() {
  const c = await db();
  if (c) await c.auth.signOut();
  try { localStorage.removeItem(KEY.session); } catch {}
}
export async function currentUser() {
  const c = await db();
  if (c) { const { data } = await c.auth.getUser(); return data.user; }
  return readLocal(KEY.session, null);
}

// ---------- site texts and links (edited in place from the page) ----------
// A map { key: value } over the page's [data-edit] texts and [data-edit-href] links. Keys absent from the
// map keep the text written in index.html. The last copy is cached so the page can paint it at once.
const SITE = 'lc.site', SITE_CACHE = 'lc.site.cache';
export function cachedSite() { return readLocal(live ? SITE_CACHE : SITE, {}); }
export async function getSite() {
  const c = await db();
  if (c) {
    const { data, error } = await c.from('site_content').select('key,value');
    if (error) return cachedSite();
    const map = Object.fromEntries(data.map(r => [r.key, r.value]));
    writeLocal(SITE_CACHE, map);
    return map;
  }
  return readLocal(SITE, {});
}
export async function saveSite(entries) {
  const c = await db();
  if (c) {
    const rows = Object.entries(entries).map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }));
    const { error } = await c.from('site_content').upsert(rows);
    if (error) throw error;
    writeLocal(SITE_CACHE, { ...readLocal(SITE_CACHE, {}), ...entries });
    return;
  }
  writeLocal(SITE, { ...readLocal(SITE, {}), ...entries });
}
export async function resetSite(key) {
  const c = await db();
  if (c) { const { error } = await c.from('site_content').delete().eq('key', key); if (error) throw error; }
  const k = live ? SITE_CACHE : SITE, map = readLocal(k, {});
  delete map[key]; writeLocal(k, map);
}

// ---------- backup ----------
export async function exportAll() {
  return { exported_at: new Date().toISOString(), site: await getSite(), credits: await getCredits(), messages: await getMessages(), availability: await getSlots() };
}
export async function importCredits(list) { for (const c of list) await saveCredit(c); }
