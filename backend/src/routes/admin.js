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
} = require('../controllers/adminController');

// All admin routes protected
router.use(protectAdmin);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Photo management
router.post('/photos/upload', upload.array('photos', 100), uploadPhotos);
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
