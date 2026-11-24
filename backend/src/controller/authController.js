const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { getPool } = require('../config/db');

const JWT_SECRET  = process.env.JWT_SECRET  || 'sptrm_dev_secret_change_in_prod';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

async function register(req, res) {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'name, email and password are required.' });
  }
  if (!email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }

  try {
    const db = getPool();

    // Check for duplicate email
    const [existing] = await db.execute(
      'SELECT user_id FROM users WHERE email = ?',
      [email.toLowerCase()]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.execute(
      'INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)',
      [name.trim(), email.toLowerCase(), hash]
    );

    const user = { id: result.insertId, name: name.trim(), email: email.toLowerCase(), role: 'user' };
    const token = signToken(user);

    return res.status(201).json({ success: true, token, user });
  } catch (err) {
    console.error('[auth] register error:', err);
    return res.status(500).json({ success: false, message: 'Could not create account.' });
  }
}

async function login(req, res) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'email and password are required.' });
  }

  try {
    const db = getPool();
    const [rows] = await db.execute(
      'SELECT user_id, full_name, email, password_hash, role FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const row = rows[0];
    const match = await bcrypt.compare(password, row.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = { id: row.user_id, name: row.full_name, email: row.email, role: row.role };
    const token = signToken(user);

    return res.json({ success: true, token, user });
  } catch (err) {
    console.error('[auth] login error:', err);
    return res.status(500).json({ success: false, message: 'Could not sign in.' });
  }
}

// Returns the current user from the token (used for session restore)
async function me(req, res) {
  return res.json({ success: true, user: req.user });
}

module.exports = { register, login, me };
