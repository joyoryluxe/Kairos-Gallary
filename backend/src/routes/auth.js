const express = require('express');
const router = express.Router();
const { registerAdmin, loginAdmin, getMe } = require('../controllers/authController');
const { protectAdmin } = require('../middleware/auth');

router.post('/admin/register', registerAdmin);
router.post('/admin/login', loginAdmin);
router.get('/admin/me', protectAdmin, getMe);

module.exports = router;
