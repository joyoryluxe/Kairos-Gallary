const Admin = require('../models/Admin');
const { signAdminToken } = require('../utils/jwt');

/**
 * POST /api/auth/admin/register
 * Register the super admin (one-time or controlled)
 */
const registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(409).json({ success: false, message: 'Admin with this email already exists.' });
    }

    const admin = await Admin.create({ name, email, password });
    const token = signAdminToken(admin._id.toString());

    res.status(201).json({
      success: true,
      message: 'Admin registered successfully.',
      data: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
      token,
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/auth/admin/login
 */
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = signAdminToken(admin._id.toString());

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
      token,
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/auth/admin/me
 */
const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      _id: req.admin._id,
      name: req.admin.name,
      email: req.admin.email,
      role: req.admin.role,
    },
  });
};

module.exports = { registerAdmin, loginAdmin, getMe };
