const express = require('express');
const router = express.Router();
const { protectClient } = require('../middleware/auth');
const {
  clientLogin,
  getClientGallery,
  toggleFavourite,
  getMyFavourites,
} = require('../controllers/clientController');

// Public
router.post('/login', clientLogin);

// Protected (requires valid client token)
router.get('/gallery', protectClient, getClientGallery);
router.post('/gallery/favourite/:photoId', protectClient, toggleFavourite);
router.get('/gallery/favourites', protectClient, getMyFavourites);

module.exports = router;
