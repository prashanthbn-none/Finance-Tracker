// Export helpers — no third-party libraries, so they work offline and add no
// bundle weight.
//
// - CSV: a real comma-separated file, opens in Excel/Sheets/Numbers.
// - Excel: an .xls written as an HTML table, which Excel opens natively. (A
//   true .xlsx needs a library; this is the dependency-free equivalent that
//   still lands as a spreadsheet with formatting.)
// - PDF / print: opens the browser print dialog scoped to a printable node,
//   where the user picks "Save as PDF". This is how dependency-free web apps
//   produce PDFs reliably across browsers.

function download(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// rows: array of objects; columns: [{ key, label }]
export function exportCSV(filename, columns, rows) {
  const header = columns.map(c => csvCell(c.label)).join(',');
  const body = rows.map(r => columns.map(c => csvCell(r[c.key])).join(',')).join('\n');
  download(filename.endsWith('.csv') ? filename : `${filename}.csv`,
    new Blob(['\ufeff' + header + '\n' + body], { type: 'text/csv;charset=utf-8;' }));
}

// Excel-readable .xls via an HTML table. Numbers stay numeric for sums.
export function exportExcel(filename, columns, rows, title) {
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const head = columns.map(c => `<th>${esc(c.label)}</th>`).join('');
  const body = rows.map(r =>
    '<tr>' + columns.map(c => {
      const v = r[c.key];
      const numeric = typeof v === 'number';
      return `<td${numeric ? ' style="mso-number-format:General"' : ''}>${esc(v)}</td>`;
    }).join('') + '</tr>'
  ).join('');
  const html =
    `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
    <head><meta charset="utf-8" /><style>
      table { border-collapse: collapse; font-family: sans-serif; }
      th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
      th { background: #1F6B53; color: #fff; }
      caption { font-size: 16px; font-weight: bold; padding: 8px; text-align: left; }
    </style></head><body>
    <table>${title ? `<caption>${esc(title)}</caption>` : ''}<thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
    </body></html>`;
  download(filename.endsWith('.xls') ? filename : `${filename}.xls`,
    new Blob([html], { type: 'application/vnd.ms-excel' }));
}

// Print a specific DOM node (by ref) as PDF via the browser print dialog.
export function printNode(node, title = 'Report') {
  if (!node) { window.print(); return; }
  const win = window.open('', '_blank', 'width=900,height=1100');
  if (!win) { window.print(); return; } // popup blocked — fall back
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(n => n.outerHTML).join('\n');
  win.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>${styles}
     <style>
       body { background: #fff; padding: 32px; }
       @page { margin: 16mm; }
     </style></head><body>${node.outerHTML}</body></html>`
  );
  win.document.close();
  // Give styles/fonts a moment, then print.
  win.onload = () => { win.focus(); win.print(); };
  setTimeout(() => { try { win.focus(); win.print(); } catch { /* ignore */ } }, 400);
}
