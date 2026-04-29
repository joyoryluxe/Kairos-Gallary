const Gallery = require('../models/Gallery');
const { signClientToken } = require('../utils/jwt');

/**
 * POST /api/client/login
 * Client logs in with clientId + password
 */
const clientLogin = async (req, res) => {
  try {
    const { clientId, password } = req.body;

    if (!clientId || !password) {
      return res.status(400).json({ success: false, message: 'Client ID and password are required.' });
    }

    const gallery = await Gallery.findOne({ clientId }).select('+clientPassword');
    if (!gallery) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Check expiry first
    if (new Date() > gallery.expiresAt) {
      return res.status(403).json({
        success: false,
        message: 'Your access has expired. Please contact the photographer.',
        expired: true,
      });
    }

    if (!gallery.isActive) {
      return res.status(403).json({ success: false, message: 'This gallery is currently inactive.' });
    }

    // Verify password
    const isMatch = await gallery.compareClientPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Update access tracking
    gallery.totalViews += 1;
    gallery.lastAccessedAt = new Date();
    await gallery.save({ validateBeforeSave: false });

    const token = signClientToken(gallery._id.toString(), gallery.clientId);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        galleryId: gallery._id,
        clientName: gallery.clientName,
        title: gallery.title,
        description: gallery.description,
        expiresAt: gallery.expiresAt,
        totalPhotos: gallery.photos.length,
        shootDate: gallery.shootDate,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/client/gallery
 * Get gallery photos (protected by client token)
 */
const getClientGallery = async (req, res) => {
  try {
    const gallery = await Gallery.findById(req.gallery._id)
      .populate('photos')
      .select('-clientPassword -clientPasswordPlain');

    if (!gallery) return res.status(404).json({ success: false, message: 'Gallery not found.' });

    // Get current favourite IDs for this client
    const favouriteIds = gallery.clientFavourites.map((f) => f.photo.toString());

    const photosWithFavourite = gallery.photos.map((photo) => ({
      _id: photo._id,
      url: photo.url,
      thumbnailUrl: photo.thumbnailUrl,
      originalName: photo.originalName,
      width: photo.width,
      height: photo.height,
      isFavourite: favouriteIds.includes(photo._id.toString()),
    }));

    res.status(200).json({
      success: true,
      data: {
        galleryId: gallery._id,
        title: gallery.title,
        description: gallery.description,
        clientName: gallery.clientName,
        expiresAt: gallery.expiresAt,
        shootDate: gallery.shootDate,
        photos: photosWithFavourite,
        totalPhotos: photosWithFavourite.length,
        totalFavourites: favouriteIds.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/client/gallery/favourite/:photoId
 * Toggle favourite on a photo
 */
const toggleFavourite = async (req, res) => {
  try {
    const { photoId } = req.params;
    const gallery = await Gallery.findById(req.gallery._id);

    if (!gallery) return res.status(404).json({ success: false, message: 'Gallery not found.' });

    // Check if this photo is in the gallery
    const photoInGallery = gallery.photos.some((p) => p.toString() === photoId);
    if (!photoInGallery) {
      return res.status(400).json({ success: false, message: 'Photo not found in this gallery.' });
    }

    // Toggle favourite
    const existingIndex = gallery.clientFavourites.findIndex(
      (f) => f.photo.toString() === photoId
    );

    let isFavourite;
    if (existingIndex > -1) {
      // Remove from favourites
      gallery.clientFavourites.splice(existingIndex, 1);
      isFavourite = false;
    } else {
      // Add to favourites
      gallery.clientFavourites.push({ photo: photoId, favouritedAt: new Date() });
      isFavourite = true;
    }

    await gallery.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: isFavourite ? 'Added to favourites.' : 'Removed from favourites.',
      data: {
        photoId,
        isFavourite,
        totalFavourites: gallery.clientFavourites.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/client/gallery/favourites
 * Get all favourited photos for this client
 */
const getMyFavourites = async (req, res) => {
  try {
    const gallery = await Gallery.findById(req.gallery._id)
      .populate('clientFavourites.photo');

    res.status(200).json({
      success: true,
      data: {
        galleryId: gallery._id,
        totalFavourites: gallery.clientFavourites.length,
        favourites: gallery.clientFavourites,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { clientLogin, getClientGallery, toggleFavourite, getMyFavourites };
