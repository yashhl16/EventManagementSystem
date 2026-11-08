import express from 'express';
import {
  registerStudent,
  registerOrganizer,
  loginStudent,
  loginOrganizer,
  loginAdmin,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public Authentication Endpoints with rate limiting
router.post('/student/register', authLimiter, registerStudent);
router.post('/student/login', authLimiter, loginStudent);

router.post('/organizer/register', authLimiter, registerOrganizer);
router.post('/organizer/login', authLimiter, loginOrganizer);

// Dedicated Admin Portal Endpoint (Strict Admin Only)
router.post('/admin/login', authLimiter, loginAdmin);

router.post('/forgot-password', authLimiter, forgotPassword);

// Protected User Profile Endpoints
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.patch('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

export default router;
