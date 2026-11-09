import { Certificate } from '../types';

/**
 * Sanitize plain ASCII text for raw PDF stream literal strings
 */
const escapePdfText = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, ' '); // Map non-ASCII to space for standard Helvetica/Times fonts
};

/**
 * Pure JavaScript Standard PDF-1.4 Generator (A4 Landscape: 842 x 595 pt)
 * Generates an authentic, valid vector PDF binary blob with zero external dependencies.
 */
export const generateCertificatePDFBlob = (cert: Certificate): Blob => {
  const studentName = escapePdfText(cert.studentName || 'Student Participant');
  const eventTitle = escapePdfText(cert.eventTitle || 'Campus Event');
  const organization = escapePdfText(cert.issuerOrganization || 'College Event Council');
  const certId = escapePdfText(cert.certificateNumber || cert.certificateCode || 'CERT-RECORD');
  const dateStr = cert.eventDate
    ? new Date(cert.eventDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Official Academic Calendar';

  // Construct PDF stream operators (coordinates: origin at bottom-left, width 842, height 595)
  const streamLines = [
    // Background fill (Cream / Warm White)
    'q',
    '0.988 0.984 0.969 rg', // RGB #fcfbf7
    '0 0 842 595 re',
    'f',
    'Q',

    // Outer double border (Golden Amber)
    'q',
    '0.706 0.325 0.039 RG', // RGB #b45309
    '4 w',
    '24 24 794 547 re',
    'S',
    '1.5 w',
    '32 32 778 531 re',
    'S',
    'Q',

    // Inner thin border (Slate blue)
    'q',
    '0.784 0.824 0.894 RG', // RGB #c7d2fe
    '1 w',
    '40 40 762 515 re',
    'S',
    'Q',

    // Institution Heading
    'BT',
    '/F1 12 Tf',
    '0.706 0.325 0.039 rg', // Amber #b45309
    '240 515 Td',
    '(SGU ACADEMIC & TECHNICAL COUNCIL) Tj',
    'ET',

    // Main Title: CERTIFICATE OF PARTICIPATION
    'BT',
    '/F2 28 Tf',
    '0.118 0.106 0.294 rg', // Deep Indigo #1e1b4b
    '180 470 Td',
    '(CERTIFICATE OF PARTICIPATION) Tj',
    'ET',

    // Subtitle: PROUDLY PRESENTED TO
    'BT',
    '/F1 11 Tf',
    '0.392 0.455 0.545 rg', // Slate #64748b
    '340 435 Td',
    '(THIS IS PROUDLY PRESENTED TO) Tj',
    'ET',

    // Recipient Student Name
    'BT',
    '/F3 32 Tf',
    '0.263 0.220 0.792 rg', // Indigo #4338ca
    `200 380 Td`,
    `(${studentName}) Tj`,
    'ET',

    // Decorative underline beneath name
    'q',
    '0.780 0.824 0.996 RG',
    '2 w',
    '180 370 m 662 370 l',
    'S',
    'Q',

    // Paragraph Line 1
    'BT',
    '/F1 14 Tf',
    '0.200 0.255 0.333 rg',
    '140 330 Td',
    `(for active and successful participation in "${eventTitle}") Tj`,
    'ET',

    // Paragraph Line 2
    'BT',
    '/F1 13 Tf',
    '0.200 0.255 0.333 rg',
    '180 305 Td',
    `(organized by ${organization} on ${escapePdfText(dateStr)}.) Tj`,
    'ET',

    // Signature Rules
    'q',
    '0.580 0.639 0.722 RG',
    '1.5 w',
    '130 180 m 330 180 l',
    'S',
    '512 180 m 712 180 l',
    'S',
    'Q',

    // Signature 1: Faculty Coordinator
    'BT',
    '/F3 16 Tf',
    '0.118 0.161 0.231 rg',
    '165 192 Td',
    '(Dr. Sarah Mitchell) Tj',
    'ET',
    'BT',
    '/F1 10 Tf',
    '0.392 0.455 0.545 rg',
    '160 165 Td',
    '(FACULTY EVENT COORDINATOR) Tj',
    'ET',

    // Signature 2: Dean of Student Affairs
    'BT',
    '/F3 16 Tf',
    '0.118 0.161 0.231 rg',
    '555 192 Td',
    '(Dr. Marcus Vance) Tj',
    'ET',
    'BT',
    '/F1 10 Tf',
    '0.392 0.455 0.545 rg',
    '550 165 Td',
    '(DEAN OF STUDENT AFFAIRS) Tj',
    'ET',

    // Bottom verification rule
    'q',
    '0.796 0.835 0.882 RG',
    '1 w',
    '50 95 m 792 95 l',
    'S',
    'Q',

    // Footer info
    'BT',
    '/F1 10 Tf',
    '0.180 0.533 0.341 rg', // Emerald
    '60 78 Td',
    '([VERIFIED] Official Institutional Participation Credential) Tj',
    'ET',

    // Certificate ID & Verification URL
    'BT',
    '/F4 10 Tf',
    '0.392 0.455 0.545 rg',
    '520 78 Td',
    `(Credential ID: ${certId}) Tj`,
    'ET',
    'BT',
    '/F4 8 Tf',
    '0.580 0.639 0.722 rg',
    '520 64 Td',
    `(/verify-certificate/${certId}) Tj`,
    'ET',
  ];

  const contentStream = streamLines.join('\n');
  const streamLength = contentStream.length;

  const objects = [
    // 1: Catalog
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    // 2: Pages
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    // 3: Page (842 x 595 - A4 Landscape)
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Contents 5 0 R /Resources 4 0 R >>\nendobj\n',
    // 4: Resources with fonts
    '4 0 obj\n<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> /F3 << /Type /Font /Subtype /Type1 /BaseFont /Times-BoldItalic >> /F4 << /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >> >> >>\nendobj\n',
    // 5: Contents
    `5 0 obj\n<< /Length ${streamLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
  ];

  let pdfBody = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets: number[] = [];

  for (const obj of objects) {
    offsets.push(pdfBody.length);
    pdfBody += obj;
  }

  const xrefOffset = pdfBody.length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    xref += String(offset).padStart(10, '0') + ' 00000 n \n';
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const fullPdf = pdfBody + xref + trailer;
  return new Blob([fullPdf], { type: 'application/pdf' });
};

/**
 * Direct file download trigger for genuine PDF
 */
export const downloadCertificateAsPDF = (cert: Certificate) => {
  try {
    const blob = generateCertificatePDFBlob(cert);
    const url = URL.createObjectURL(blob);
    const fileName = `${cert.certificateNumber || cert.certificateCode || 'Certificate'}.pdf`;

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  } catch (err) {
    console.error('Failed to trigger direct PDF download, falling back to print view', err);
    printCertificateWindow(cert);
  }
};

/**
 * Open high-resolution printable HTML view and trigger browser print dialog
 */
export const printCertificateWindow = (cert: Certificate) => {
  const code = cert.certificateNumber || cert.certificateCode;
  const printWindow = window.open(`/api/certificates/download/${code}?autoprint=true`, '_blank');
  if (!printWindow) {
    // If popup blocked, use current window print
    window.print();
  }
};
