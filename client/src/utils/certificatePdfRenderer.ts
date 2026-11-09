import { Certificate, CertificateTemplateConfig } from '../types';

/**
 * Default coordinate configuration for custom certificate overlays
 * Percentages are relative to canvas dimensions (0-100%)
 */
export const DEFAULT_CERTIFICATE_CONFIG: CertificateTemplateConfig = {
  studentName: { x: 50, y: 46, fontSize: 44, color: '#1e1b4b', align: 'center', bold: true },
  studentRoll: { x: 50, y: 53, fontSize: 20, color: '#4338ca', align: 'center', bold: false },
  eventTitle: { x: 50, y: 62, fontSize: 26, color: '#1e1b4b', align: 'center', bold: true },
  issueDate: { x: 26, y: 82, fontSize: 16, color: '#475569', align: 'center', bold: false },
  certificateId: { x: 74, y: 82, fontSize: 16, color: '#475569', align: 'center', bold: true },
};

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
 * Helper to get active template URL from certificate
 */
export const getCertificateTemplateUrl = (cert: Certificate): string => {
  if (cert.certificateTemplateUrl) return cert.certificateTemplateUrl;
  if (typeof cert.event === 'object' && cert.event !== null) {
    return (cert.event as any).certificateTemplateUrl || '';
  }
  return '';
};

/**
 * Helper to get active template config from certificate
 */
export const getCertificateTemplateConfig = (cert: Certificate): CertificateTemplateConfig => {
  if (cert.certificateTemplateConfig) return cert.certificateTemplateConfig;
  if (typeof cert.event === 'object' && cert.event !== null) {
    return (cert.event as any).certificateTemplateConfig || DEFAULT_CERTIFICATE_CONFIG;
  }
  return DEFAULT_CERTIFICATE_CONFIG;
};

/**
 * Render dynamic certificate with overlays onto an HTML5 Canvas
 */
export const renderCertificateToCanvas = async (
  cert: Certificate,
  canvas: HTMLCanvasElement,
  overrideConfig?: CertificateTemplateConfig
): Promise<void> => {
  const templateUrl = getCertificateTemplateUrl(cert);
  const config = overrideConfig || getCertificateTemplateConfig(cert) || DEFAULT_CERTIFICATE_CONFIG;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (templateUrl) {
    // Custom Template Mode: Load image and draw dynamic overlays
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => {
        console.warn('Failed to load custom certificate template image, falling back to default.');
        resolve();
      };
      img.src = templateUrl;
    });

    if (img.width > 0 && img.height > 0) {
      canvas.width = img.naturalWidth || 1920;
      canvas.height = img.naturalHeight || 1080;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Scale factor relative to a 1200px width reference baseline
      const scale = canvas.width / 1200;

      // 1. Student Name
      const nameCfg = { ...DEFAULT_CERTIFICATE_CONFIG.studentName, ...config.studentName };
      const nameX = (nameCfg.x / 100) * canvas.width;
      const nameY = (nameCfg.y / 100) * canvas.height;
      const nameSize = Math.round((nameCfg.fontSize || 44) * scale);
      ctx.font = `${nameCfg.bold !== false ? 'bold' : 'normal'} ${nameSize}px ${nameCfg.fontFamily || 'Georgia, "Times New Roman", serif'}`;
      ctx.fillStyle = nameCfg.color || '#1e1b4b';
      ctx.textAlign = (nameCfg.align as CanvasTextAlign) || 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cert.studentName || 'Student Participant', nameX, nameY);

      // 2. Student Roll Number / ID
      if (cert.studentRoll) {
        const rollCfg = { ...DEFAULT_CERTIFICATE_CONFIG.studentRoll, ...config.studentRoll };
        const rollX = (rollCfg.x / 100) * canvas.width;
        const rollY = (rollCfg.y / 100) * canvas.height;
        const rollSize = Math.round((rollCfg.fontSize || 20) * scale);
        ctx.font = `${rollCfg.bold ? 'bold' : 'normal'} ${rollSize}px ${rollCfg.fontFamily || 'Arial, sans-serif'}`;
        ctx.fillStyle = rollCfg.color || '#4338ca';
        ctx.textAlign = (rollCfg.align as CanvasTextAlign) || 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Roll / ID: ${cert.studentRoll}`, rollX, rollY);
      }

      // 3. Event Title
      const eventCfg = { ...DEFAULT_CERTIFICATE_CONFIG.eventTitle, ...config.eventTitle };
      const eventX = (eventCfg.x / 100) * canvas.width;
      const eventY = (eventCfg.y / 100) * canvas.height;
      const eventSize = Math.round((eventCfg.fontSize || 26) * scale);
      ctx.font = `${eventCfg.bold !== false ? 'bold' : 'normal'} ${eventSize}px ${eventCfg.fontFamily || 'Arial, sans-serif'}`;
      ctx.fillStyle = eventCfg.color || '#1e1b4b';
      ctx.textAlign = (eventCfg.align as CanvasTextAlign) || 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cert.eventTitle || 'Campus Event', eventX, eventY);

      // 4. Issue Date
      const dateCfg = { ...DEFAULT_CERTIFICATE_CONFIG.issueDate, ...config.issueDate };
      const dateX = (dateCfg.x / 100) * canvas.width;
      const dateY = (dateCfg.y / 100) * canvas.height;
      const dateSize = Math.round((dateCfg.fontSize || 16) * scale);
      const formattedDate = cert.eventDate
        ? new Date(cert.eventDate).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })
        : 'Official Schedule';
      ctx.font = `${dateSize}px Arial, sans-serif`;
      ctx.fillStyle = dateCfg.color || '#475569';
      ctx.textAlign = (dateCfg.align as CanvasTextAlign) || 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`Date: ${formattedDate}`, dateX, dateY);

      // 5. Certificate ID
      const idCfg = { ...DEFAULT_CERTIFICATE_CONFIG.certificateId, ...config.certificateId };
      const idX = (idCfg.x / 100) * canvas.width;
      const idY = (idCfg.y / 100) * canvas.height;
      const idSize = Math.round((idCfg.fontSize || 16) * scale);
      const certCode = cert.certificateNumber || cert.certificateCode || 'CERT-RECORD';
      ctx.font = `bold ${idSize}px monospace`;
      ctx.fillStyle = idCfg.color || '#475569';
      ctx.textAlign = (idCfg.align as CanvasTextAlign) || 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`ID: ${certCode}`, idX, idY);

      return;
    }
  }

  // Fallback: Default Platform Certificate Layout (High-Resolution Canvas)
  canvas.width = 1600;
  canvas.height = 1130;

  // Background
  ctx.fillStyle = '#fcfbf7';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Outer Golden Double Border
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 8;
  ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);
  ctx.lineWidth = 3;
  ctx.strokeRect(55, 55, canvas.width - 110, canvas.height - 110);

  // Inner Slate Border
  ctx.strokeStyle = '#c7d2fe';
  ctx.lineWidth = 2;
  ctx.strokeRect(70, 70, canvas.width - 140, canvas.height - 140);

  // Institution Banner
  ctx.fillStyle = '#b45309';
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SGU ACADEMIC & TECHNICAL COUNCIL', canvas.width / 2, 170);

  // Main Title
  ctx.fillStyle = '#1e1b4b';
  ctx.font = 'bold 54px Georgia, serif';
  ctx.fillText('CERTIFICATE OF PARTICIPATION', canvas.width / 2, 250);

  // Subtitle
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.fillText('THIS IS PROUDLY PRESENTED TO', canvas.width / 2, 330);

  // Student Name
  ctx.fillStyle = '#4338ca';
  ctx.font = 'bold italic 62px Georgia, serif';
  ctx.fillText(cert.studentName || 'Student Participant', canvas.width / 2, 430);

  // Name underline
  ctx.strokeStyle = '#c7d2fe';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - 320, 475);
  ctx.lineTo(canvas.width / 2 + 320, 475);
  ctx.stroke();

  // Student Roll
  if (cert.studentRoll) {
    ctx.fillStyle = '#6366f1';
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillText(`Student ID / Roll: ${cert.studentRoll}`, canvas.width / 2, 515);
  }

  // Narrative
  ctx.fillStyle = '#334155';
  ctx.font = '24px Georgia, serif';
  const eventName = cert.eventTitle || 'Campus Event';
  const orgName = cert.issuerOrganization || 'College Event Council';
  ctx.fillText(`for active and successful participation in "${eventName}"`, canvas.width / 2, 580);
  ctx.fillText(`conducted by the ${orgName}.`, canvas.width / 2, 620);

  // Signatures
  ctx.font = 'italic 26px "Brush Script MT", cursive, Georgia';
  ctx.fillStyle = '#1e293b';
  ctx.fillText('Dr. Sarah Mitchell', 350, 800);
  ctx.fillText('Dr. Marcus Vance', canvas.width - 350, 800);

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(220, 820);
  ctx.lineTo(480, 820);
  ctx.moveTo(canvas.width - 480, 820);
  ctx.lineTo(canvas.width - 220, 820);
  ctx.stroke();

  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('FACULTY EVENT COORDINATOR', 350, 845);
  ctx.fillText('DEAN OF STUDENT AFFAIRS', canvas.width - 350, 845);

  // Footer Rule & Metadata
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(100, 960);
  ctx.lineTo(canvas.width - 100, 960);
  ctx.stroke();

  ctx.fillStyle = '#059669';
  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('● Verified Academic Participation Credential', 100, 1000);

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`ID: ${cert.certificateNumber || cert.certificateCode || 'CERT-RECORD'}`, canvas.width - 100, 1000);
};

/**
 * Generate a valid PDF binary blob containing the custom template with dynamic text overlay
 */
export const generateCustomTemplatePDFBlob = async (cert: Certificate): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  await renderCertificateToCanvas(cert, canvas);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  const base64Data = dataUrl.split(',')[1];
  const binaryString = atob(base64Data);
  const imageBytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    imageBytes[i] = binaryString.charCodeAt(i);
  }

  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  // A4 Landscape: 842 x 595 points
  const header = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  const obj3 = '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Contents 4 0 R /Resources << /XObject << /Im1 5 0 R >> >> >>\nendobj\n';
  const content = 'q\n842 0 0 595 0 0 cm\n/Im1 Do\nQ\n';
  const obj4 = `4 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`;
  const obj5Header = `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgWidth} /Height ${imgHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`;
  const obj5Footer = '\nendstream\nendobj\n';

  const offset1 = header.length;
  const offset2 = offset1 + obj1.length;
  const offset3 = offset2 + obj2.length;
  const offset4 = offset3 + obj3.length;
  const offset5 = offset4 + obj4.length;
  const totalObj5Length = obj5Header.length + imageBytes.length + obj5Footer.length;
  const xrefOffset = offset5 + totalObj5Length;

  let xref = `xref\n0 6\n0000000000 65535 f \n`;
  xref += String(offset1).padStart(10, '0') + ' 00000 n \n';
  xref += String(offset2).padStart(10, '0') + ' 00000 n \n';
  xref += String(offset3).padStart(10, '0') + ' 00000 n \n';
  xref += String(offset4).padStart(10, '0') + ' 00000 n \n';
  xref += String(offset5).padStart(10, '0') + ' 00000 n \n';

  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const part1 = header + obj1 + obj2 + obj3 + obj4 + obj5Header;
  const part2 = obj5Footer + xref + trailer;

  return new Blob([part1, imageBytes, part2], { type: 'application/pdf' });
};

/**
 * Pure JavaScript Standard Vector PDF-1.4 Generator for Default Template
 */
export const generateCertificatePDFBlob = (cert: Certificate): Blob => {
  const studentName = escapePdfText(cert.studentName || 'Student Participant');
  const eventTitle = escapePdfText(cert.eventTitle || 'Campus Event');
  const certId = escapePdfText(cert.certificateNumber || cert.certificateCode || 'CERT-RECORD');
  const rollText = cert.studentRoll ? `Roll / ID: ${escapePdfText(cert.studentRoll)}` : '';
  const dateStr = cert.eventDate
    ? new Date(cert.eventDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Official Academic Calendar';

  const streamLines = [
    // Background fill (Cream / Warm White)
    'q',
    '0.988 0.984 0.969 rg',
    '0 0 842 595 re',
    'f',
    'Q',

    // Outer double border (Golden Amber)
    'q',
    '0.706 0.325 0.039 RG',
    '4 w',
    '24 24 794 547 re',
    'S',
    '1.5 w',
    '32 32 778 531 re',
    'S',
    'Q',

    // Inner thin border (Slate blue)
    'q',
    '0.784 0.824 0.894 RG',
    '1 w',
    '40 40 762 515 re',
    'S',
    'Q',

    // Institution Heading
    'BT',
    '/F1 12 Tf',
    '0.706 0.325 0.039 rg',
    '240 515 Td',
    '(SGU ACADEMIC & TECHNICAL COUNCIL) Tj',
    'ET',

    // Main Title: CERTIFICATE OF PARTICIPATION
    'BT',
    '/F2 28 Tf',
    '0.118 0.106 0.294 rg',
    '180 470 Td',
    '(CERTIFICATE OF PARTICIPATION) Tj',
    'ET',

    // Subtitle: PROUDLY PRESENTED TO
    'BT',
    '/F1 11 Tf',
    '0.392 0.455 0.545 rg',
    '340 435 Td',
    '(THIS IS PROUDLY PRESENTED TO) Tj',
    'ET',

    // Recipient Student Name
    'BT',
    '/F3 32 Tf',
    '0.263 0.220 0.792 rg',
    '200 380 Td',
    `(${studentName}) Tj`,
    'ET',

    // Decorative underline beneath name
    'q',
    '0.780 0.824 0.996 RG',
    '2 w',
    '180 370 m 662 370 l',
    'S',
    'Q',

    // Roll number if present
    ...(rollText
      ? [
          'BT',
          '/F1 11 Tf',
          '0.388 0.400 0.945 rg',
          '340 350 Td',
          `(${rollText}) Tj`,
          'ET',
        ]
      : []),

    // Paragraph Line 1
    'BT',
    '/F1 13 Tf',
    '0.200 0.255 0.333 rg',
    '150 315 Td',
    `(for active and successful participation in the event: "${eventTitle}") Tj`,
    'ET',

    // Paragraph Line 2
    'BT',
    '/F1 12 Tf',
    '0.200 0.255 0.333 rg',
    '220 290 Td',
    `(conducted on ${dateStr} by the College Event Council.) Tj`,
    'ET',

    // Signatures
    'q',
    '0.580 0.639 0.722 RG',
    '1.5 w',
    '120 180 m 320 180 l',
    'S',
    '520 180 m 720 180 l',
    'S',
    'Q',

    'BT',
    '/F3 14 Tf',
    '0.118 0.161 0.231 rg',
    '160 190 Td',
    '(Dr. Sarah Mitchell) Tj',
    'ET',
    'BT',
    '/F1 9 Tf',
    '0.278 0.333 0.412 rg',
    '140 165 Td',
    '(FACULTY EVENT COORDINATOR) Tj',
    'ET',

    'BT',
    '/F3 14 Tf',
    '0.118 0.161 0.231 rg',
    '565 190 Td',
    '(Dr. Marcus Vance) Tj',
    'ET',
    'BT',
    '/F1 9 Tf',
    '0.278 0.333 0.412 rg',
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
    '0.180 0.533 0.341 rg',
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
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Contents 5 0 R /Resources 4 0 R >>\nendobj\n',
    '4 0 obj\n<< /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> /F3 << /Type /Font /Subtype /Type1 /BaseFont /Times-BoldItalic >> /F4 << /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >> >> >>\nendobj\n',
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
 * Direct file download trigger for certificate PDF
 */
export const downloadCertificateAsPDF = async (cert: Certificate) => {
  try {
    const templateUrl = getCertificateTemplateUrl(cert);
    let blob: Blob;

    if (templateUrl) {
      blob = await generateCustomTemplatePDFBlob(cert);
    } else {
      blob = generateCertificatePDFBlob(cert);
    }

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
    }, 1500);
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
    window.print();
  }
};
