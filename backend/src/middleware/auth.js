const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sptrm_dev_secret_change_in_prod';

/**
 * Verifies the Bearer token on the Authorization header.
 * Attaches the decoded user payload to req.user.
 */
function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token is invalid or expired. Please sign in again.' });
  }
}

/**
 * Same as requireAuth but also requires the admin role.
 */
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required.' });
    }
    next();
  });
}

module.exports = { requireAuth, requireAdmin };
