import express from 'express';
import {
  issueCertificatesForEvent,
  getMyCertificates,
  getEventCertificate,
  verifyCertificate,
  getCertificateDownload,
} from '../controllers/certificateController.js';
import { protect, requireAnyRole } from '../middleware/auth.js';

const router = express.Router();

// Issue certificates for event (Organizer / Admin)
router.post('/issue/:eventId', protect, requireAnyRole(['organizer', 'admin']), issueCertificatesForEvent);

// Student's certificates
router.get('/my', protect, getMyCertificates);

// Specific event certificate for logged-in student
router.get('/event/:eventId', protect, getEventCertificate);

// Certificate download/render endpoint
router.get('/download/:code', getCertificateDownload);

// Public certificate verification
router.get('/verify/:code', verifyCertificate);
router.get('/verify-certificate/:code', verifyCertificate);

export default router;
