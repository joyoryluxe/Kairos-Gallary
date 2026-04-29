const jwt = require('jsonwebtoken');

/**
 * Sign an admin JWT token
 */
const signAdminToken = (adminId) => {
  return jwt.sign({ id: adminId, role: 'admin' }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

/**
 * Sign a client JWT token (tied to gallery)
 */
const signClientToken = (galleryId, clientId) => {
  return jwt.sign(
    { galleryId, clientId, role: 'client' },
    process.env.CLIENT_JWT_SECRET,
    { expiresIn: '10d' }
  );
};

/**
 * Verify admin token
 */
const verifyAdminToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

/**
 * Verify client token
 */
const verifyClientToken = (token) => {
  return jwt.verify(token, process.env.CLIENT_JWT_SECRET);
};

module.exports = { signAdminToken, signClientToken, verifyAdminToken, verifyClientToken };
