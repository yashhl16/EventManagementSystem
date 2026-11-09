import crypto from 'crypto';
import { query, mapCertificate } from '../config/db.js';
import { generateCertificateCode } from '../utils/qrHelper.js';
import { ensureCertificateForAttendance } from './attendanceController.js';

/**
 * Issue Certificates for All Attended Participants in an Event (Organizer/Admin)
 */
export const issueCertificatesForEvent = async (req, res) => {
  try {
    const issuer = req.user;
    const { eventId } = req.params;

    const eventRes = await query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (eventRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }
    const event = eventRes.rows[0];

    const issuerId = issuer.id || issuer._id;
    if (issuer.role !== 'admin' && String(event.creator_id) !== String(issuerId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    // Find all attended registrations that have not received certificates yet
    const regRes = await query(
      `SELECT r.*, u.name as user_name, u.student_id as user_student_id, u.email as user_email
       FROM event_registrations r
       JOIN users u ON r.user_id = u.id
       LEFT JOIN certificates c ON c.student_id = r.user_id AND c.event_id = r.event_id
       WHERE r.event_id = $1 
         AND r.status = 'attended'
         AND c.id IS NULL`,
      [eventId]
    );

    if (regRes.rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No pending attended participants without certificates found.',
        count: 0,
      });
    }

    let issuedCount = 0;
    for (const reg of regRes.rows) {
      await ensureCertificateForAttendance({
        eventId: event.id,
        userId: reg.user_id,
        studentName: reg.user_name,
        studentRoll: reg.user_student_id,
        eventTitle: event.title,
        issuedBy: issuerId,
      });
      issuedCount++;
    }

    res.status(200).json({
      success: true,
      message: `Successfully generated and dispatched ${issuedCount} verified certificates.`,
      issuedCount,
    });
  } catch (error) {
    console.error('Error in issueCertificatesForEvent:', error);
    res.status(500).json({ success: false, message: 'Failed to generate certificates.' });
  }
};

/**
 * Get Authenticated Student's Certificates
 */
export const getMyCertificates = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    // Auto-generate for any attended events missing certificate
    const unattendedCerts = await query(
      `SELECT r.event_id, r.user_id, u.name as user_name, u.student_id as user_student_id, e.title as event_title, e.creator_id
       FROM event_registrations r
       JOIN users u ON r.user_id = u.id
       JOIN events e ON r.event_id = e.id
       LEFT JOIN certificates c ON c.student_id = r.user_id AND c.event_id = r.event_id
       WHERE r.user_id = $1 
         AND r.status = 'attended'
         AND c.id IS NULL`,
      [userId]
    );

    for (const row of unattendedCerts.rows) {
      await ensureCertificateForAttendance({
        eventId: row.event_id,
        userId: row.user_id,
        studentName: row.user_name,
        studentRoll: row.user_student_id,
        eventTitle: row.event_title,
        issuedBy: row.creator_id,
      });
    }

    const certsRes = await query(
      `SELECT c.*, 
              e.title as event_title, e.category as event_category, e.banner_image as event_banner, e.event_date, e.venue as event_venue,
              e.certificate_template_url, e.certificate_template_config,
              u.organization_name
       FROM certificates c
       LEFT JOIN events e ON c.event_id = e.id
       LEFT JOIN users u ON c.issued_by = u.id
       WHERE c.student_id = $1
       ORDER BY c.created_at DESC`,
      [userId]
    );

    const certificates = certsRes.rows.map(mapCertificate);

    res.status(200).json({
      success: true,
      count: certificates.length,
      certificates,
    });
  } catch (error) {
    console.error('Error in getMyCertificates:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve certificates.' });
  }
};

/**
 * Get Student's Certificate for a Specific Event
 */
export const getEventCertificate = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { eventId } = req.params;

    let certRes = await query(
      `SELECT c.*, 
              e.title as event_title, e.category as event_category, e.banner_image as event_banner, e.event_date, e.venue as event_venue,
              e.certificate_template_url, e.certificate_template_config,
              u.organization_name
       FROM certificates c
       LEFT JOIN events e ON c.event_id = e.id
       LEFT JOIN users u ON c.issued_by = u.id
       WHERE c.student_id = $1 AND c.event_id = $2`,
      [userId, eventId]
    );

    if (certRes.rows.length === 0) {
      // Check if user attended this event, and auto-generate if so
      const regRes = await query(
        `SELECT r.*, u.name as user_name, u.student_id as user_student_id, e.title as event_title, e.creator_id
         FROM event_registrations r
         JOIN users u ON r.user_id = u.id
         JOIN events e ON r.event_id = e.id
         WHERE r.user_id = $1 AND r.event_id = $2 AND r.status = 'attended'`,
        [userId, eventId]
      );

      if (regRes.rows.length > 0) {
        const reg = regRes.rows[0];
        const generated = await ensureCertificateForAttendance({
          eventId: reg.event_id,
          userId: reg.user_id,
          studentName: reg.user_name,
          studentRoll: reg.user_student_id,
          eventTitle: reg.event_title,
          issuedBy: reg.creator_id,
        });
        if (generated) {
          return res.status(200).json({ success: true, certificate: generated });
        }
      }

      return res.status(404).json({ success: false, message: 'No certificate found for this event.' });
    }

    const cert = mapCertificate(certRes.rows[0]);
    res.status(200).json({
      success: true,
      certificate: cert,
    });
  } catch (error) {
    console.error('Error in getEventCertificate:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve event certificate.' });
  }
};

/**
 * Public Verification Endpoint for Certificates
 */
export const verifyCertificate = async (req, res) => {
  try {
    const { code } = req.params;
    const cleanCode = (code || '').toUpperCase().trim();

    const certRes = await query(
      `SELECT c.*, 
              e.title as event_title, e.category as event_category, e.event_date, e.venue as event_venue,
              e.certificate_template_url, e.certificate_template_config,
              u.name as issuer_name, u.email as issuer_email, u.organization_name
       FROM certificates c
       LEFT JOIN events e ON c.event_id = e.id
       LEFT JOIN users u ON c.issued_by = u.id
       WHERE UPPER(c.certificate_code) = UPPER($1) 
          OR UPPER(c.certificate_number) = UPPER($1) 
          OR c.id = $1`,
      [cleanCode]
    );

    if (certRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invalid Certificate Code. No verification record exists in the campus repository.',
      });
    }

    const cert = mapCertificate(certRes.rows[0]);

    res.status(200).json({
      success: true,
      certificate: {
        certificateCode: cert.certificateCode,
        certificateNumber: cert.certificateNumber,
        studentName: cert.studentName,
        studentRoll: cert.studentRoll,
        eventTitle: cert.eventTitle,
        eventDate: cert.eventDate,
        category: cert.category || 'Campus Event',
        issueDate: cert.issueDate,
        issuedAt: cert.issuedAt,
        issuerOrganization: cert.issuerOrganization || 'College Event Council',
        verificationUrl: cert.verificationUrl,
        pdfUrl: cert.pdfUrl,
        certificateTemplateUrl: cert.certificateTemplateUrl || '',
        certificateTemplateConfig: cert.certificateTemplateConfig || null,
        event: cert.event,
        status: 'valid',
      },
    });
  } catch (error) {
    console.error('Error in verifyCertificate:', error);
    res.status(500).json({ success: false, message: 'Certificate verification failed.' });
  }
};

/**
 * Standalone Certificate Download / Print View Endpoint
 * Route: GET /api/certificates/download/:code
 */
export const getCertificateDownload = async (req, res) => {
  try {
    const { code } = req.params;
    const cleanCode = (code || '').toUpperCase().trim();

    const certRes = await query(
      `SELECT c.*, 
              e.title as event_title, e.category as event_category, e.event_date, e.venue as event_venue,
              e.certificate_template_url, e.certificate_template_config,
              u.name as issuer_name, u.organization_name
       FROM certificates c
       LEFT JOIN events e ON c.event_id = e.id
       LEFT JOIN users u ON c.issued_by = u.id
       WHERE UPPER(c.certificate_code) = UPPER($1) 
          OR UPPER(c.certificate_number) = UPPER($1) 
          OR c.id = $1`,
      [cleanCode]
    );

    if (certRes.rows.length === 0) {
      return res.status(404).send('Certificate record not found.');
    }

    const cert = mapCertificate(certRes.rows[0]);
    const formattedDate = cert.eventDate
      ? new Date(cert.eventDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : 'Official Schedule';

    const hasCustomTemplate = !!cert.certificateTemplateUrl;
    const config = cert.certificateTemplateConfig || {};
    const namePos = config.studentName || { x: 50, y: 45, fontSize: 44, color: '#1e1b4b' };
    const rollPos = config.studentRoll || { x: 50, y: 52, fontSize: 20, color: '#4338ca' };
    const eventPos = config.eventTitle || { x: 50, y: 62, fontSize: 26, color: '#1e1b4b' };
    const datePos = config.issueDate || { x: 25, y: 82, fontSize: 16, color: '#475569' };
    const idPos = config.certificateId || { x: 75, y: 82, fontSize: 16, color: '#475569' };

    const bodyContent = hasCustomTemplate
      ? `
      <div class="custom-cert-frame" style="width: 1060px; height: 740px; position: relative; background: #ffffff url('${cert.certificateTemplateUrl}') no-repeat center center / 100% 100%; border-radius: 12px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.2); overflow: hidden;">
        <div style="position: absolute; left: ${namePos.x}%; top: ${namePos.y}%; transform: translate(-50%, -50%); font-family: 'Georgia', serif; font-size: ${namePos.fontSize || 44}px; font-weight: 800; color: ${namePos.color || '#1e1b4b'}; text-align: center; white-space: nowrap; text-shadow: 0 1px 3px rgba(255,255,255,0.8);">
          ${cert.studentName}
        </div>
        ${cert.studentRoll ? `<div style="position: absolute; left: ${rollPos.x}%; top: ${rollPos.y}%; transform: translate(-50%, -50%); font-family: 'Arial', sans-serif; font-size: ${rollPos.fontSize || 20}px; font-weight: 600; color: ${rollPos.color || '#4338ca'}; text-align: center; white-space: nowrap;">Roll / ID: ${cert.studentRoll}</div>` : ''}
        <div style="position: absolute; left: ${eventPos.x}%; top: ${eventPos.y}%; transform: translate(-50%, -50%); font-family: 'Arial', sans-serif; font-size: ${eventPos.fontSize || 26}px; font-weight: bold; color: ${eventPos.color || '#1e1b4b'}; text-align: center; max-width: 80%;">
          ${cert.eventTitle}
        </div>
        <div style="position: absolute; left: ${datePos.x}%; top: ${datePos.y}%; transform: translate(-50%, -50%); font-family: 'Arial', sans-serif; font-size: ${datePos.fontSize || 16}px; color: ${datePos.color || '#475569'}; text-align: center;">
          ${formattedDate}
        </div>
        <div style="position: absolute; left: ${idPos.x}%; top: ${idPos.y}%; transform: translate(-50%, -50%); font-family: monospace; font-size: ${idPos.fontSize || 16}px; font-weight: bold; color: ${idPos.color || '#475569'}; text-align: center;">
          ${cert.certificateNumber || cert.certificateCode}
        </div>
      </div>
      `
      : `
      <div class="cert-frame">
        <div class="cert-inner">
          <div>
            <div class="seal-badge">🎓</div>
            <div class="institution-header">SGU Academic & Technical Council</div>
            <h1 class="main-title">Certificate of Participation</h1>
            <div class="subtitle">This is proudly presented to</div>
            <div class="recipient">${cert.studentName}</div>
            <p class="narrative">
              for active and successful participation in <strong>"${cert.eventTitle}"</strong> 
              organized by the <strong>${cert.issuerOrganization || 'College Event Council'}</strong> on ${formattedDate}.
            </p>
          </div>

          <div>
            <div class="signatures-row">
              <div class="sign-box">
                <div class="sign-script">Dr. Sarah Mitchell</div>
                <div class="sign-rule">Faculty Event Coordinator</div>
              </div>
              <div class="sign-box">
                <div class="sign-script">Dr. Marcus Vance</div>
                <div class="sign-rule">Dean of Student Affairs</div>
              </div>
            </div>

            <div class="footer-bar">
              <div>Verification: <strong>${cert.verificationUrl}</strong></div>
              <div>Certificate ID: <strong>${cert.certificateNumber || cert.certificateCode}</strong></div>
            </div>
          </div>
        </div>
      </div>
      `;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificate of Participation - ${cert.studentName}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 24px;
      font-family: 'Georgia', 'Times New Roman', serif;
      background: #f1f5f9;
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .cert-frame {
      width: 100%;
      max-width: 1060px;
      height: 740px;
      background: #ffffff;
      padding: 28px;
      border: 14px double #b45309;
      border-radius: 12px;
      position: relative;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .cert-inner {
      border: 2px solid #cbd5e1;
      height: 100%;
      padding: 32px;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }
    .seal-badge {
      width: 64px;
      height: 64px;
      margin: 0 auto 10px;
      background: linear-gradient(135deg, #d97706, #92400e);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-size: 30px;
      box-shadow: 0 4px 12px rgba(180, 83, 9, 0.3);
    }
    .institution-header {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      color: #b45309;
      margin-bottom: 4px;
    }
    .main-title {
      font-size: 36px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #1e1b4b;
      margin: 6px 0;
    }
    .subtitle {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      color: #64748b;
      margin-top: 14px;
      font-weight: 600;
    }
    .recipient {
      font-size: 40px;
      font-weight: 800;
      color: #4338ca;
      font-style: italic;
      border-bottom: 2px solid #c7d2fe;
      display: inline-block;
      padding: 2px 36px 6px;
      margin: 10px auto;
    }
    .narrative {
      font-size: 15px;
      color: #334155;
      line-height: 1.65;
      max-width: 780px;
      margin: 12px auto 0;
    }
    .signatures-row {
      display: flex;
      justify-content: space-between;
      padding: 0 60px;
      margin-top: 24px;
    }
    .sign-box {
      text-align: center;
    }
    .sign-script {
      font-family: cursive;
      font-size: 20px;
      color: #1e293b;
    }
    .sign-rule {
      width: 210px;
      border-top: 1.5px solid #94a3b8;
      margin-top: 4px;
      padding-top: 6px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #475569;
      font-weight: 700;
    }
    .footer-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px dashed #cbd5e1;
      padding-top: 12px;
      font-size: 11px;
      color: #64748b;
      font-family: monospace;
    }
    .btn-print {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4f46e5;
      color: white;
      border: none;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: bold;
      border-radius: 8px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
    }
    @media print {
      body {
        padding: 0;
        background: none;
      }
      .cert-frame {
        width: 100vw;
        height: 100vh;
        max-width: none;
        border-radius: 0;
        box-shadow: none;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <button class="btn-print no-print" onclick="window.print()">Print / Save as PDF</button>

  ${bodyContent}

  <script>
    if (window.location.search.includes('autoprint=true')) {
      window.onload = function() {
        window.print();
      };
    }
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('Error in getCertificateDownload:', error);
    res.status(500).send('Failed to generate certificate download.');
  }
};
