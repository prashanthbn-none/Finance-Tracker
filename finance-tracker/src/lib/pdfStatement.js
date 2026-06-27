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
    const grouped = new Map();

    content.items.forEach(item => {
      const y = Math.round(item.transform[5] / 3) * 3;
      const key = String(y);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push({ x: item.transform[4], text: item.str });
    });

    pages.push([...grouped.entries()]
      .sort((a, b) => Number(b[0]) - Number(a[0]))
      .map(([, parts]) => parts
        .sort((a, b) => a.x - b.x)
        .map(part => part.text.trim())
        .filter(Boolean)
        .join('\t'))
      .join('\n'));
  }

  return pages.join('\n');
}
