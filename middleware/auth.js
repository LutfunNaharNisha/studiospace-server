const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'ss_token';

// Challenge 1: every mutation is guarded by a JWT stored in an HTTPOnly cookie.
function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ message: 'Please log in to continue.' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Your session has expired. Please log in again.' });
  }
}

module.exports = { requireAuth, COOKIE_NAME };
