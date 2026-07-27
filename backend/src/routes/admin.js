const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const {
  uploadPhotos,
  getAllPhotos,
  deletePhoto,
  createGallery,
  getAllGalleries,
  getGalleryById,
  extendGalleryAccess,
  updateGalleryPhotos,
  updateGallery,
  deleteGallery,
  getClientFavourites,
  getDashboardStats,
  getUploadSignatures,
  registerPhoto,
} = require('../controllers/adminController');

// All admin routes protected
router.use(protectAdmin);

// Dashboard
router.get('/dashboard', getDashboardStats);

// ── Photo management ──────────────────────────────────────────────────────────
// Direct upload support: browser → Cloudinary (server only handles tiny JSON)
router.get('/photos/upload-signature', getUploadSignatures);  // get signed tokens
router.post('/photos/register', registerPhoto);               // save metadata after upload

// Legacy server-proxied upload (kept as fallback)
router.post('/photos/upload', upload.array('photos', 50), uploadPhotos);
router.get('/photos', getAllPhotos);
router.delete('/photos/:id', deletePhoto);

// Gallery management
router.post('/galleries', createGallery);
router.get('/galleries', getAllGalleries);
router.get('/galleries/:id', getGalleryById);
router.patch('/galleries/:id', updateGallery);
router.delete('/galleries/:id', deleteGallery);
router.patch('/galleries/:id/extend', extendGalleryAccess);
router.patch('/galleries/:id/update-photos', updateGalleryPhotos);
router.get('/galleries/:id/favourites', getClientFavourites);

module.exports = router;
