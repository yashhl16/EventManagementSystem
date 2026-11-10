import jwt from 'jsonwebtoken';
import { query, mapUser } from '../config/db.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in to proceed.',
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'super_secret_college_event_hub_jwt_key_2026_secured'
    );

    const userRes = await query('SELECT * FROM users WHERE id = $1', [decoded.id]);

    if (userRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'The account associated with this session no longer exists.',
      });
    }

    const currentUser = mapUser(userRes.rows[0]);

    if (!currentUser.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact campus administration.',
      });
    }

    req.user = currentUser;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session. Please log in again.',
    });
  }
};

/**
 * Optional authentication middleware
 * Populates req.user if a valid token is provided, but does not block if unauthenticated.
 */
export const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    if (token) {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'super_secret_college_event_hub_jwt_key_2026_secured'
      );
      const userRes = await query('SELECT * FROM users WHERE id = $1', [decoded.id]);
      if (userRes.rows.length > 0) {
        const u = mapUser(userRes.rows[0]);
        if (u.isActive) {
          req.user = u;
        }
      }
    }
  } catch (_) {
    // Continue without setting req.user
  }
  next();
};

/**
 * Enforce specific role
 * e.g. requireRole('admin')
 */
export const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (req.user.role !== role) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires ${role} privileges.`,
      });
    }

    next();
  };
};

/**
 * Enforce any of the given roles
 * e.g. requireAnyRole(['organizer', 'admin'])
 */
export const requireAnyRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires one of [${roles.join(', ')}] privileges.`,
      });
    }

    next();
  };
};
