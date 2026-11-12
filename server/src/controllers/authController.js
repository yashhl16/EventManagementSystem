import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query, mapUser } from '../config/db.js';
import {
  validateName,
  validateEmail,
  validatePassword,
  validatePhone,
  validateText,
} from '../utils/validation.js';
import { sendWelcomeEmail, sendOtpEmail } from '../utils/email.js';

// Helper to sign JWT token
const signToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET || 'super_secret_college_event_hub_jwt_key_2026_secured',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

// Send response with token and sanitized user
const sendAuthResponse = (user, statusCode, res, message = 'Authenticated successfully') => {
  const token = signToken(user.id || user._id, user.role);

  res.status(statusCode).json({
    success: true,
    message,
    token,
    user,
  });
};

/**
 * Student Registration
 */
export const registerStudent = async (req, res) => {
  try {
    const { name, email, password, studentId, department, graduationYear, phone, interests } = req.body;

    const nameCheck = validateName(name, 'Full name');
    if (!nameCheck.isValid) {
      return res.status(400).json({ success: false, message: nameCheck.message });
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) {
      return res.status(400).json({ success: false, message: emailCheck.message });
    }

    const pwdCheck = validatePassword(password, true);
    if (!pwdCheck.isValid) {
      return res.status(400).json({ success: false, message: pwdCheck.message });
    }

    const phoneCheck = validatePhone(phone, false);
    if (!phoneCheck.isValid) {
      return res.status(400).json({ success: false, message: phoneCheck.message });
    }

    const idCheck = validateText(studentId, 'Student ID', 0, 50, false);
    if (!idCheck.isValid) {
      return res.status(400).json({ success: false, message: idCheck.message });
    }

    const deptCheck = validateText(department, 'Department', 0, 100, false);
    if (!deptCheck.isValid) {
      return res.status(400).json({ success: false, message: deptCheck.message });
    }

    // Check duplicate email
    const existing = await query('SELECT id FROM users WHERE LOWER(email) = $1', [emailCheck.value]);
    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists. Please sign in.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(pwdCheck.value, salt);
    const id = crypto.randomUUID();

    const insertRes = await query(
      `INSERT INTO users (id, name, email, password_hash, role, student_id, department, graduation_year, phone, interests, is_active)
       VALUES ($1, $2, $3, $4, 'student', $5, $6, $7, $8, $9, true)
       RETURNING *`,
      [
        id,
        nameCheck.value,
        emailCheck.value,
        passwordHash,
        idCheck.value || '',
        deptCheck.value || 'General Engineering',
        graduationYear ? Number(graduationYear) : new Date().getFullYear() + 2,
        phoneCheck.value || '',
        JSON.stringify(Array.isArray(interests) && interests.length > 0 ? interests : ['Technology', 'Hackathons']),
      ]
    );

    const user = mapUser(insertRes.rows[0]);

    // Send automated welcome email non-blockingly so registration response is immediate
    sendWelcomeEmail(emailCheck.value, nameCheck.value).catch((err) => {
      console.warn('[AUTH Registration Welcome Email Notice]:', err.message);
    });

    sendAuthResponse(user, 201, res, 'Student account registered successfully.');
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists. Please sign in.',
      });
    }
    console.error('Error in registerStudent:', error);
    const isConnError = error.message?.includes('DATABASE_URL') || error.message?.includes('connection') || error.message?.includes('ECONNREFUSED');
    const statusCode = isConnError ? 503 : 500;
    res.status(statusCode).json({ success: false, message: error.message || 'Server error during registration.' });
  }
};

/**
 * Organizer Registration
 */
export const registerOrganizer = async (req, res) => {
  try {
    const { name, email, password, employeeId, department, organizationName, phone } = req.body;

    const nameCheck = validateName(name, 'Full name');
    if (!nameCheck.isValid) {
      return res.status(400).json({ success: false, message: nameCheck.message });
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) {
      return res.status(400).json({ success: false, message: emailCheck.message });
    }

    const pwdCheck = validatePassword(password, true);
    if (!pwdCheck.isValid) {
      return res.status(400).json({ success: false, message: pwdCheck.message });
    }

    const orgCheck = validateText(organizationName, 'Organization name', 2, 150, true);
    if (!orgCheck.isValid) {
      return res.status(400).json({ success: false, message: orgCheck.message });
    }

    const deptCheck = validateText(department, 'Department', 0, 100, false);
    if (!deptCheck.isValid) {
      return res.status(400).json({ success: false, message: deptCheck.message });
    }

    const empCheck = validateText(employeeId, 'Employee ID', 0, 50, false);
    if (!empCheck.isValid) {
      return res.status(400).json({ success: false, message: empCheck.message });
    }

    const phoneCheck = validatePhone(phone, false);
    if (!phoneCheck.isValid) {
      return res.status(400).json({ success: false, message: phoneCheck.message });
    }

    const existing = await query('SELECT id FROM users WHERE LOWER(email) = $1', [emailCheck.value]);
    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(pwdCheck.value, salt);
    const id = crypto.randomUUID();

    const insertRes = await query(
      `INSERT INTO users (id, name, email, password_hash, role, employee_id, department, organization_name, phone, is_active)
       VALUES ($1, $2, $3, $4, 'organizer', $5, $6, $7, $8, true)
       RETURNING *`,
      [
        id,
        nameCheck.value,
        emailCheck.value,
        passwordHash,
        empCheck.value || '',
        deptCheck.value || 'Student Affairs',
        orgCheck.value,
        phoneCheck.value || '',
      ]
    );

    const user = mapUser(insertRes.rows[0]);

    // Send automated welcome email non-blockingly so registration response is immediate
    sendWelcomeEmail(emailCheck.value, nameCheck.value).catch((err) => {
      console.warn('[AUTH Registration Welcome Email Notice]:', err.message);
    });

    sendAuthResponse(user, 201, res, 'Organizer account registered successfully.');
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ success: false, message: 'An account with this email address already exists.' });
    }
    console.error('Error in registerOrganizer:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error during registration.' });
  }
};

/**
 * Student Login Portal Endpoint (/student/login)
 */
export const loginStudent = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    if (typeof email !== 'string' || email.trim().length > 254 || typeof password !== 'string' || password.length > 128) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials. Please verify your email and password.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const userRes = await query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);

    if (userRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your email and password.',
      });
    }

    const row = userRes.rows[0];
    const isMatch = await bcrypt.compare(password, row.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your email and password.',
      });
    }

    if (row.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: `This portal is for students only. Your account has the role "${row.role}". Please use the ${row.role} portal.`,
      });
    }

    if (row.is_active === false) {
      return res.status(403).json({
        success: false,
        message: 'Your student account is suspended. Please contact campus administration.',
      });
    }

    // Update last_login
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [row.id]);

    const user = mapUser(row);
    sendAuthResponse(user, 200, res, 'Welcome back to Eventify!');
  } catch (error) {
    console.error('Error in loginStudent:', error);
    const isConnError = error.message?.includes('DATABASE_URL') || error.message?.includes('connection') || error.message?.includes('ECONNREFUSED');
    const statusCode = isConnError ? 503 : 500;
    res.status(statusCode).json({ success: false, message: error.message || 'Server error during login.' });
  }
};

/**
 * Organizer Login Portal Endpoint (/organizer/login)
 */
export const loginOrganizer = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    if (typeof email !== 'string' || email.trim().length > 254 || typeof password !== 'string' || password.length > 128) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials. Please verify your email and password.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const userRes = await query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);

    if (userRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your email and password.',
      });
    }

    const row = userRes.rows[0];
    const isMatch = await bcrypt.compare(password, row.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your email and password.',
      });
    }

    if (row.role !== 'organizer' && row.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only registered Event Organizers and Administrators can access this portal.',
      });
    }

    if (row.is_active === false) {
      return res.status(403).json({
        success: false,
        message: 'Your organizer account is deactivated.',
      });
    }

    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [row.id]);

    const user = mapUser(row);
    sendAuthResponse(user, 200, res, 'Organizer portal authentication successful.');
  } catch (error) {
    console.error('Error in loginOrganizer:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error during login.' });
  }
};

/**
 * Dedicated Administrator Login Portal Endpoint (/admin/login)
 * Strictly enforces admin role and records audit trail
 */
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Administrator email and password are required.',
      });
    }

    if (typeof email !== 'string' || email.trim().length > 254 || typeof password !== 'string' || password.length > 128) {
      return res.status(400).json({
        success: false,
        message: 'Invalid administrative credentials or unauthorized account.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const userRes = await query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);

    if (userRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid administrative credentials or unauthorized account.',
      });
    }

    const row = userRes.rows[0];
    const isMatch = await bcrypt.compare(password, row.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid administrative credentials or unauthorized account.',
      });
    }

    // STRICT CHECK: Student or Organizer CANNOT log in through the admin portal!
    if (row.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not possess institutional administrator privileges.',
      });
    }

    if (row.is_active === false) {
      return res.status(403).json({
        success: false,
        message: 'Administrator account suspended. Contact campus chief IT officer.',
      });
    }

    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [row.id]);

    // Record audit log
    try {
      await query(
        `INSERT INTO audit_logs (id, user_id, admin_email, action, target_type, target_id, details, ip_address)
         VALUES ($1, $2, $3, 'ADMIN_LOGIN', 'USER', $4, 'Administrator portal sign in', $5)`,
        [crypto.randomUUID(), row.id, cleanEmail, row.id, req.ip || '127.0.0.1']
      );
    } catch (e) {
      // Non-blocking audit record
    }

    const user = mapUser(row);
    sendAuthResponse(user, 200, res, 'Administrator portal authentication successful.');
  } catch (error) {
    console.error('Error in loginAdmin:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error during admin login.' });
  }
};

/**
 * Get Current Authenticated User Profile
 */
export const getMe = async (req, res) => {
  try {
    const userRes = await query('SELECT * FROM users WHERE id = $1', [req.user.id || req.user._id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = mapUser(userRes.rows[0]);
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve profile.' });
  }
};

/**
 * Update Profile
 */
export const updateProfile = async (req, res) => {
  try {
    // Security: Strictly strip email, username, and role to prevent modification
    delete req.body.email;
    delete req.body.username;
    delete req.body.role;

    const {
      name,
      fullName,
      studentId,
      rollNumber,
      employeeId,
      adminId,
      avatar,
      avatarUrl,
      profilePicture,
      phone,
      bio,
      department,
      graduationYear,
      interests,
      organizationName,
      designation,
      title,
    } = req.body;
    const userId = req.user.id || req.user._id;

    let cleanName = null;
    const targetName = fullName !== undefined ? fullName : name;
    if (targetName !== undefined && targetName !== null) {
      const check = validateName(targetName, 'Full name');
      if (!check.isValid) return res.status(400).json({ success: false, message: check.message });
      cleanName = check.value;
    }

    let cleanStudentId = null;
    const targetStudentId = rollNumber !== undefined ? rollNumber : studentId;
    if (targetStudentId !== undefined && targetStudentId !== null) {
      const trimmed = String(targetStudentId).trim();
      if (trimmed === '') {
        cleanStudentId = '';
      } else {
        const check = validateText(trimmed, 'Roll number / Student ID', 0, 50, false);
        if (!check.isValid) return res.status(400).json({ success: false, message: check.message });
        cleanStudentId = check.value;
      }
    }

    let cleanEmployeeId = null;
    const targetEmployeeId = employeeId !== undefined ? employeeId : adminId;
    if (targetEmployeeId !== undefined && targetEmployeeId !== null) {
      const trimmedEmp = String(targetEmployeeId).trim();
      if (trimmedEmp === '') {
        cleanEmployeeId = '';
      } else {
        const check = validateText(trimmedEmp, 'Employee / Admin ID', 0, 50, false);
        if (!check.isValid) return res.status(400).json({ success: false, message: check.message });
        cleanEmployeeId = check.value;
      }
    }

    let cleanAvatar = null;
    const targetAvatar = profilePicture !== undefined ? profilePicture : (avatarUrl !== undefined ? avatarUrl : avatar);
    if (targetAvatar !== undefined && targetAvatar !== null) {
      cleanAvatar = String(targetAvatar).trim();
    }

    let cleanPhone = null;
    if (phone !== undefined && phone !== null && phone.trim() !== '') {
      const check = validatePhone(phone, false);
      if (!check.isValid) return res.status(400).json({ success: false, message: check.message });
      cleanPhone = check.value;
    } else if (phone === '') {
      cleanPhone = '';
    }

    let cleanBio = null;
    if (bio !== undefined && bio !== null) {
      const check = validateText(bio, 'Bio', 0, 1000, false);
      if (!check.isValid) return res.status(400).json({ success: false, message: check.message });
      cleanBio = check.value;
    }

    let cleanDept = null;
    if (department !== undefined && department !== null) {
      const check = validateText(department, 'Department', 0, 100, false);
      if (!check.isValid) return res.status(400).json({ success: false, message: check.message });
      cleanDept = check.value;
    }

    let cleanOrg = null;
    const targetOrg = organizationName !== undefined ? organizationName : (designation !== undefined ? designation : title);
    if (targetOrg !== undefined && targetOrg !== null) {
      const check = validateText(targetOrg, 'Organization name / Designation', 0, 150, false);
      if (!check.isValid) return res.status(400).json({ success: false, message: check.message });
      cleanOrg = check.value;
    }

    const updateRes = await query(
      `UPDATE users
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           bio = COALESCE($3, bio),
           department = COALESCE($4, department),
           graduation_year = COALESCE($5, graduation_year),
           interests = COALESCE($6, interests),
           organization_name = COALESCE($7, organization_name),
           student_id = COALESCE($8, student_id),
           employee_id = COALESCE($9, employee_id),
           admin_id = COALESCE($9, admin_id),
           avatar = COALESCE($10, avatar),
           updated_at = NOW()
       WHERE id = $11
       RETURNING *`,
      [
        cleanName,
        cleanPhone,
        cleanBio,
        cleanDept,
        graduationYear ? Number(graduationYear) : null,
        interests ? JSON.stringify(interests) : null,
        cleanOrg,
        cleanStudentId,
        cleanEmployeeId,
        cleanAvatar,
        userId,
      ]
    );

    // Sync event host details if an organizer updates their name or organization
    if (cleanName || cleanOrg) {
      try {
        await query(
          `UPDATE events
           SET organizer_name = COALESCE($1, organizer_name),
               updated_at = NOW()
           WHERE creator_id = $2`,
          [cleanOrg || cleanName, userId]
        );
      } catch (_) {
        // Non-blocking sync
      }
    }

    const user = mapUser(updateRes.rows[0]);
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Profile update failed.' });
  }
};

/**
 * Change Password
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id || req.user._id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both current and new password.',
      });
    }

    const pwdCheck = validatePassword(newPassword, true);
    if (!pwdCheck.isValid) {
      return res.status(400).json({
        success: false,
        message: pwdCheck.message,
      });
    }

    const userRes = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, userRes.rows[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect current password.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(pwdCheck.value, salt);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, userId]);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error changing password.' });
  }
};

/**
 * Forgot Password
 * Accepts { email }, generates a cryptographically secure 6-digit OTP,
 * stores reset_otp and reset_otp_expires (10 mins) in the database,
 * and sends an automated transactional email with generic enumeration protection.
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailCheck = validateEmail(cleanEmail);
    if (!emailCheck.isValid) {
      return res.status(400).json({ success: false, message: emailCheck.message });
    }

    const userRes = await query(
      'SELECT id, name, email FROM users WHERE LOWER(email) = $1',
      [cleanEmail]
    );

    if (userRes.rows.length > 0) {
      const user = userRes.rows[0];
      // Generate cryptographically secure 6-digit OTP (100000 - 999999)
      const otp = crypto.randomInt(100000, 1000000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      await query(
        'UPDATE users SET reset_otp = $1, reset_otp_expires = $2, updated_at = NOW() WHERE id = $3',
        [otp, expiresAt, user.id]
      );

      // Non-blocking transactional email dispatch
      sendOtpEmail(cleanEmail, otp).catch((emailErr) => {
        console.error('[AUTH OTP Email Error]:', emailErr.message);
      });
    } else {
      console.log(`[AUTH forgot-password] No user found for ${cleanEmail}. Returning generic message.`);
    }

    // Return generic success message to prevent user enumeration attacks
    return res.status(200).json({
      success: true,
      message: 'If an account exists with this email address, a 6-digit verification code has been sent.',
    });
  } catch (error) {
    console.error('Error in forgotPassword:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing password recovery request. Please try again.',
    });
  }
};

/**
 * Reset Password
 * Accepts { email, otp, newPassword }, verifies OTP validity and expiration (10m),
 * hashes newPassword with bcrypt, updates user record, and clears reset_otp fields.
 */
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, 6-digit verification code, and new password are required.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({
        success: false,
        message: 'Verification code must be a 6-digit number.',
      });
    }

    const pwdCheck = validatePassword(newPassword, true);
    if (!pwdCheck.isValid) {
      return res.status(400).json({
        success: false,
        message: pwdCheck.message || 'Password must be at least 6 characters.',
      });
    }

    const userRes = await query(
      'SELECT id, name, email, reset_otp, reset_otp_expires FROM users WHERE LOWER(email) = $1',
      [cleanEmail]
    );

    if (userRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code.',
      });
    }

    const user = userRes.rows[0];

    // Check if reset OTP was requested
    if (!user.reset_otp || String(user.reset_otp).trim() !== cleanOtp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please check your code and try again.',
      });
    }

    // Check expiration (10 minutes)
    const now = new Date();
    if (!user.reset_otp_expires || new Date(user.reset_otp_expires).getTime() <= now.getTime()) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new code.',
      });
    }

    // Hash new password using project's bcrypt standard
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(pwdCheck.value, salt);

    // Update password and clear reset_otp & reset_otp_expires to NULL
    await query(
      `UPDATE users
       SET password_hash = $1, reset_otp = NULL, reset_otp_expires = NULL, updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, user.id]
    );

    console.log(`[AUTH reset-password] Password successfully reset for user ${user.id} (${cleanEmail})`);

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now sign in with your new password.',
    });
  } catch (error) {
    console.error('Error in resetPassword:', error);
    return res.status(500).json({
      success: false,
      message: 'Error resetting password. Please try again.',
    });
  }
};
