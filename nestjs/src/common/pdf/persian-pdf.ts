import * as fs from 'fs';
import * as path from 'path';

const PdfPrinter = require('pdfmake');

function fontPath(): string {
  const candidates = [
    path.join(__dirname, '..', '..', 'assets', 'fonts', 'DejaVuSans.ttf'),
    path.join(process.cwd(), 'src', 'assets', 'fonts', 'DejaVuSans.ttf'),
  ];
  const found = candidates.find(fs.existsSync);
  if (!found) throw new Error('فونت فارسی گزارش یافت نشد.');
  return found;
}

export async function createPersianPdf(options: {
  title: string;
  subtitle: string[];
  headers: string[];
  rows: Array<Array<string | number>>;
  widths?: Array<string | number>;
}): Promise<Buffer> {
  const font = fontPath();
  const printer = new PdfPrinter({ Vazir: { normal: font, bold: font, italics: font, bolditalics: font } });
  const body = [options.headers, ...options.rows].map((row, rowIndex) => row.map((cell) => ({
    text: String(cell ?? '-'), alignment: 'right', bold: rowIndex === 0, fillColor: rowIndex === 0 ? '#dcefe0' : undefined,
    margin: [3, 5, 3, 5],
  })));
  const document = {
    pageSize: 'A4', pageOrientation: options.headers.length > 5 ? 'landscape' : 'portrait',
    pageMargins: [30, 45, 30, 45], defaultStyle: { font: 'Vazir', alignment: 'right', fontSize: 9 },
    footer: (current: number, count: number) => ({ text: `صفحه ${current.toLocaleString('fa-IR')} از ${count.toLocaleString('fa-IR')}`, alignment: 'center', fontSize: 8 }),
    content: [
      { text: options.title, fontSize: 17, bold: true, alignment: 'center', margin: [0, 0, 0, 8] },
      ...options.subtitle.map((text) => ({ text, alignment: 'right', margin: [0, 1, 0, 1] })),
      { text: '', margin: [0, 4] },
      { table: { headerRows: 1, widths: options.widths ?? options.headers.map(() => '*'), body }, layout: 'lightHorizontalLines' },
    ],
  };
  const pdf = printer.createPdfKitDocument(document);
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    pdf.on('data', (chunk: Buffer) => chunks.push(chunk));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);
    pdf.end();
  });
}
