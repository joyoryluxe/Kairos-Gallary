const { verifyAdminToken, verifyClientToken } = require('../utils/jwt');
const Admin = require('../models/Admin');
const Gallery = require('../models/Gallery');

/**
 * Protect admin routes
 */
const protectAdmin = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized. Please log in.' });
    }

    const decoded = verifyAdminToken(token);
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Admin not found.' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired.' });
  }
};

/**
 * Protect client routes — validates gallery is active and not expired
 */
const protectClient = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized. Please log in.' });
    }

    const decoded = verifyClientToken(token);
    const gallery = await Gallery.findById(decoded.galleryId);

    if (!gallery) {
      return res.status(404).json({ success: false, message: 'Gallery not found.' });
    }

    // Check if expired
    if (new Date() > gallery.expiresAt) {
      return res.status(403).json({
        success: false,
        message: 'Your access has expired. Please contact the photographer.',
        expired: true,
      });
    }

    if (!gallery.isActive) {
      return res.status(403).json({ success: false, message: 'This gallery has been deactivated.' });
    }

    req.gallery = gallery;
    req.clientId = decoded.clientId;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired.' });
  }
};

module.exports = { protectAdmin, protectClient };
