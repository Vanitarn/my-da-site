/* DA.live Page Reporter — application logic (ES module) */
import DA_SDK from 'https://da.live/nx/utils/sdk.js';

let allPages = [];
let filtered = [];
let sortCol = 'lastModified';
let sortAsc = false;

/* ── Formatting ── */
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/* ── Status badge ── */
const STATUS_LABEL = { published: 'Published', preview: 'Preview only', draft: 'Draft', unpublished: 'Unpublished' };
function badge(s) {
  return `<span class="badge badge-${s}"><span class="badge-dot"></span>${STATUS_LABEL[s] || s}</span>`;
}

/* ── Derive status ── */
function deriveStatus(p) {
  if (p.publishedDate) return 'published';
  if (p.previewDate)   return 'preview';
  if (p.lastModified)  return 'draft';
  return 'unpublished';
}

/* ── Render table ── */
function renderTable() {
  const tbody = document.getElementById('tableBody');
  const org  = document.getElementById('orgInput').value.trim() || 'org';
  const site = document.getElementById('siteInput').value.trim() || 'site';
  if (!filtered.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="8">No pages match your filters</td></tr>';
    return;
  }
  tbody.innerHTML = filtered.map(p => `
    <tr>
      <td class="path-cell" title="${p.path}">${p.path}</td>
      <td>${badge(p.status)}</td>
      <td class="muted">${p.previewedBy || '—'}</td>
      <td class="muted">${p.publishedBy || '—'}</td>
      <td class="muted">${fmtDate(p.previewDate)}</td>
      <td class="muted">${fmtDate(p.publishedDate)}</td>
      <td class="muted">${fmtDate(p.lastModified)}</td>
      <td>
        <a class="action-link" href="https://da.live/edit#/${org}/${site}${p.path}.html" target="_blank" rel="noopener" title="Open in DA.live">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
      </td>
    </tr>`).join('');
}

/* ── Filters ── */
function applyFilters() {
  const q  = (document.getElementById('searchInput').value || '').toLowerCase();
  const sf = document.getElementById('statusFilter').value;
  filtered = allPages.filter(p => {
    if (q  && !p.path.toLowerCase().includes(q)) return false;
    if (sf && p.status !== sf) return false;
    return true;
  });
  sortFiltered();
  document.getElementById('rowCount').textContent = `${filtered.length} of ${allPages.length} pages`;
  renderTable();
}

/* ── Sort ── */
function sortBy(col) {
  if (sortCol === col) sortAsc = !sortAsc;
  else { sortCol = col; sortAsc = true; }
  document.querySelectorAll('.sort-arrow').forEach(el => { el.textContent = ''; el.classList.remove('active'); });
  const el = document.getElementById('arr-' + col);
  if (el) { el.textContent = sortAsc ? '↑' : '↓'; el.classList.add('active'); }
  sortFiltered();
  renderTable();
}

function sortFiltered() {
  filtered.sort((a, b) => {
    const av = a[sortCol] || '', bv = b[sortCol] || '';
    if (av < bv) return sortAsc ? -1 : 1;
    if (av > bv) return sortAsc ?  1 : -1;
    return 0;
  });
}

/* ── Summary ── */
function updateSummary() {
  document.getElementById('sTotal').textContent = allPages.length;
  document.getElementById('sPub').textContent   = allPages.filter(p => p.status === 'published').length;
  document.getElementById('sPrev').textContent  = allPages.filter(p => p.status === 'preview').length;
  document.getElementById('sDraft').textContent = allPages.filter(p => p.status === 'draft').length;
  document.getElementById('sUnpub').textContent = allPages.filter(p => p.status === 'unpublished').length;
}

/* ── Status message ── */
function setStatus(msg, loading) {
  const el = document.getElementById('fetchStatus');
  el.innerHTML = loading ? `<span class="spinner"></span> ${msg}` : msg;
}

/* ── Fetch from DA.live Admin API ── */
/* ── Recursively walk the DA tree, collecting every .html page ── */
function isFolder(item) {
  const name = item.name || (item.path || '').split('/').pop() || '';
  const ext  = item.ext || (name.includes('.') ? name.split('.').pop() : '');
  return !ext;                       // no extension → folder
}
function pageExt(item) {
  const name = item.name || (item.path || '').split('/').pop() || '';
  return item.ext || (name.includes('.') ? name.split('.').pop() : '');
}

async function collectPages(org, site, path, headers, acc, depth) {
  if (depth > 12) return;            // safety cap on recursion depth
  // DA's list endpoint returns a folder's children only when the path ends in a slash.
  const listPath = path.endsWith('/') ? path : path + '/';
  const listUrl = `https://admin.da.live/list/${org}/${site}${listPath}`;
  let res;
  try { res = await fetch(listUrl, { headers }); }
  catch (_) { return; }
  if (!res.ok) {
    if (depth === 0 && acc.length === 0 && res.status === 401)
      throw new Error(`HTTP 401 — Unauthorized`);
    return;
  }
  const data  = await res.json();
  const items = (data.data || data || []);
  console.log(`[scan] ${listPath} → ${items.length} items`, items.map(i => i.path || i.name));

  const folders = [];
  for (const item of items) {
    if (isFolder(item)) {
      folders.push(item);
    } else if (pageExt(item) === 'html') {
      acc.push(item);                // real page → collect
    }
    // .json and other files are ignored
  }

  setStatus(`Scanning… found ${acc.length} pages so far`, true);

  // Recurse into each subfolder (in parallel).
  // DA returns folder paths WITH the /{org}/{site} prefix already baked in,
  // but the list URL also adds /{org}/{site} — so strip the prefix to avoid duplication.
  const prefix = `/${org}/${site}`;
  await Promise.all(folders.map(f => {
    let childPath = f.path || (path.replace(/\/$/, '') + '/' + (f.name || ''));
    if (childPath.startsWith(prefix)) childPath = childPath.slice(prefix.length);
    if (!childPath.startsWith('/')) childPath = '/' + childPath;
    return collectPages(org, site, childPath, headers, acc, depth + 1);
  }));
}

async function fetchPages() {
  const org   = document.getElementById('orgInput').value.trim();
  const site  = document.getElementById('siteInput').value.trim();
  const path  = document.getElementById('pathInput').value.trim() || '/';
  // Prefer the logged-in DA.live session token; fall back to the manual field.
  const token = (window.__DA && window.__DA.token) || document.getElementById('tokenInput').value.trim();

  if (!org || !site) { setStatus('Enter org and site name first.'); return; }

  setStatus('Fetching pages…', true);

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const rootPath = path.startsWith('/') ? path : '/' + path;

    // Walk the whole tree, including nested folders.
    const pageItems = [];
    await collectPages(org, site, rootPath, headers, pageItems, 0);

    if (!pageItems.length) { setStatus('No pages found under that path.'); return; }

    setStatus(`Found ${pageItems.length} pages, checking status…`, true);

    // Fetch status for each page (cap at 500 to avoid rate limiting).
    const pages = await Promise.all(pageItems.slice(0, 500).map(async item => {
      // DA list paths include the /{org}/{site} prefix and a .html extension.
      // The AEM resource path is relative to the site root, so strip both.
      const daPath = item.path || '';
      const prefix = `/${org}/${site}`;
      let resPath = daPath.startsWith(prefix) ? daPath.slice(prefix.length) : daPath;
      resPath = resPath.replace(/\.html$/, '');
      if (!resPath.startsWith('/')) resPath = '/' + resPath;

      let pub = null, prev = null, mod = item.lastModified || null;
      let pubBy = null, prevBy = null;

      // AEM admin API is the source of truth for preview (page) and live (publish) state.
      try {
        const aemUrl = `https://admin.hlx.page/status/${org}/${site}/main${resPath}`;
        const ar = await fetch(aemUrl, { headers });
        if (ar.ok) {
          const ad = await ar.json();
          if (ad.preview && ad.preview.status === 200) {
            prev   = ad.preview.lastModified   || prev;
            prevBy = ad.preview.lastModifiedBy || prevBy;
          }
          if (ad.live && ad.live.status === 200) {
            pub   = ad.live.lastModified   || pub;
            pubBy = ad.live.lastModifiedBy || pubBy;
          }
          mod = ad.edit?.lastModified || ad.preview?.sourceLastModified || mod;
        }
      } catch (_) { /* AEM status failed — fall through to DA edit state */ }

      const pg = { path: resPath, fullPath: daPath, lastModified: mod, publishedDate: pub, previewDate: prev, previewedBy: prevBy, publishedBy: pubBy };
      pg.status = deriveStatus(pg);
      return pg;
    }));

    allPages = pages;
    filtered = [...pages];
    setStatus(`Loaded ${pages.length} page${pages.length !== 1 ? 's' : ''}`);
    updateSummary();
    applyFilters();
    document.getElementById('reportSection').style.display = 'block';

  } catch (e) {
    setStatus(`Error: ${e.message}. Check the org and site name.`);
  }
}

/* ── CSV-safe date (blank instead of em-dash) ── */
function csvDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function reportRows() {
  const headers = ['Path', 'Status', 'Previewed by', 'Published by', 'Preview date', 'Published date', 'Last modified'];
  const rows = filtered.map(p => [
    p.path, p.status, p.previewedBy || '', p.publishedBy || '',
    csvDate(p.previewDate), csvDate(p.publishedDate), csvDate(p.lastModified)
  ]);
  return { headers, rows };
}

/* ── Export CSV (UTF-8 BOM so Excel renders characters correctly) ── */
function exportCSV() {
  const org  = document.getElementById('orgInput').value.trim() || 'site';
  const site = document.getElementById('siteInput').value.trim() || '';
  const { headers, rows } = reportRows();
  const csv = [headers, ...rows]
    .map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
  a.download = `${org}-${site}-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

/* ── Export Excel (.xlsx) via SheetJS ── */
function exportExcel() {
  const org  = document.getElementById('orgInput').value.trim() || 'site';
  const site = document.getElementById('siteInput').value.trim() || '';
  const { headers, rows } = reportRows();
  if (typeof XLSX === 'undefined') { exportCSV(); return; }  // fallback if lib not loaded
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [ { wch: 48 }, { wch: 13 }, { wch: 26 }, { wch: 26 }, { wch: 20 }, { wch: 20 }, { wch: 20 } ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Page report');
  XLSX.writeFile(wb, `${org}-${site}-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/* ── DA SDK integration ──
   When running inside DA.live, the SDK provides the logged-in user's
   IMS token and the org/site context, so no manual entry is needed. */
window.__DA = { token: null, context: null };

/* ── DA SDK initialisation (module scope) ── */

(async function initDA() {
  const tokenField = document.getElementById('tokenField');
  try {
    const sdk = await DA_SDK;   // resolves only inside the DA shell
    const { context, token } = sdk;
    if (token) window.__DA.token = token;
    if (context) {
      window.__DA.context = context;
      // DA context exposes org and repo/site for the current site.
      const org  = context.org  || context.owner;
      const site = context.repo || context.site;
      if (org)  document.getElementById('orgInput').value  = org;
      if (site) document.getElementById('siteInput').value = site;
      // Org/site and token are ready — the user clicks "Fetch pages" to run.
      if (token) return;
    }
    // Signed in but no token — reveal the manual field as a fallback.
    if (!token && tokenField) tokenField.style.display = '';
  } catch (e) {
    // Running outside the DA.live shell (e.g. opened as a raw file):
    // reveal the manual token field so the user can authenticate.
    if (tokenField) tokenField.style.display = '';
  }
})();

/* ── Expose handlers for inline event attributes in the HTML ── */
window.fetchPages   = fetchPages;
window.sortBy       = sortBy;
window.applyFilters = applyFilters;
window.exportCSV    = exportCSV;
window.exportExcel  = exportExcel;