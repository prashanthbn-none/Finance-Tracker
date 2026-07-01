import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export async function extractPdfStatementText(file) {
  const bytes = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  const pages = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const rows = [];

    content.items.forEach(item => {
      const y = item.transform[5];
      let row = rows.find(candidate => Math.abs(candidate.y - y) <= 4);
      if (!row) {
        row = { y, parts: [] };
        rows.push(row);
      }
      row.parts.push({ x: item.transform[4], text: item.str });
    });

    pages.push(rows
      .sort((a, b) => b.y - a.y)
      .map(({ parts }) => parts
        .sort((a, b) => a.x - b.x)
        .map(part => part.text.trim())
        .filter(Boolean)
        .join('\t'))
      .join('\n'));
  }

  return pages.join('\n');
}
