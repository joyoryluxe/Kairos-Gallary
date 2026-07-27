const Gallery = require('../models/Gallery');
const Photo = require('../models/Photo');
const { generateClientId, generatePassword, getExpiryDate, generatePhotoId } = require('../utils/generateCredentials');
const { cloudinary } = require('../config/cloudinary');
const sharp = require('sharp');
sharp.cache(false); // Disable sharp caching to prevent memory leaks on large batch uploads

// Helper function to upload image buffer to Cloudinary
const uploadToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
    stream.end(buffer);
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// PHOTO MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/admin/photos/upload
 */
const uploadPhotos = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded.' });
    }

    // Process all files in this batch concurrently (Promise.all)
    // The frontend batches in groups of 10, so this handles each batch in parallel
    // for maximum speed without overwhelming Cloudinary or the server.
    const results = await Promise.all(
      req.files.map(async (file) => {
        const originalName = file.originalname;
        const lastDotIndex = originalName.lastIndexOf('.');
        const baseName = lastDotIndex !== -1 ? originalName.substring(0, lastDotIndex) : originalName;
        // Sanitize name to avoid Cloudinary character issues
        const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');

        // Process buffer using sharp to compress and convert to WebP
        let processedBuffer = await sharp(file.buffer)
          .webp({
            quality: 80, // Optimized for mass upload
            effort: 4,   // Faster processing for many images
            smartSubsample: true,
          })
          .toBuffer();

        // Cloudinary free tier rejects files > 10MB.
        // If our WebP is still too large, progressively recompress with lower quality.
        const CLOUDINARY_MAX_BYTES = 9.5 * 1024 * 1024; // 9.5MB safety margin
        const fallbackQualities = [70, 55, 40];
        let qualityIndex = 0;
        while (processedBuffer.length > CLOUDINARY_MAX_BYTES && qualityIndex < fallbackQualities.length) {
          const q = fallbackQualities[qualityIndex];
          console.log(`[Recompress] ${originalName} is ${(processedBuffer.length / 1024 / 1024).toFixed(2)}MB — retrying at quality ${q}`);
          processedBuffer = await sharp(file.buffer)
            .webp({ quality: q, effort: 4, smartSubsample: true })
            .toBuffer();
          qualityIndex++;
        }

        const metadata = await sharp(processedBuffer).metadata();
        const folder = process.env.CLOUDINARY_FOLDER || 'kairos_gallery';
        const uniquePublicId = `${sanitizedBaseName}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

        const uploadOptions = {
          folder,
          public_id: uniquePublicId,
          format: 'webp',
          resource_type: 'image',
        };

        const result = await uploadToCloudinary(processedBuffer, uploadOptions);


        const photoDoc = await Photo.create({
          filename: originalName,
          originalName: originalName,
          url: result.secure_url,
          thumbnailUrl: result.secure_url.replace('/upload/', '/upload/w_400,h_400,c_fill,q_auto/'),
          publicId: result.public_id,
          size: processedBuffer.length,
          width: metadata.width || result.width || null,
          height: metadata.height || result.height || null,
          format: 'webp',
          uploadedBy: req.admin._id,
          displayId: generatePhotoId(),
        });

        return photoDoc;
      })
    );

    res.status(201).json({
      success: true,
      message: `${results.length} photo(s) uploaded successfully.`,
      data: results,
    });
  } catch (error) {
    console.error('Upload Photos Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/admin/photos
 */
const getAllPhotos = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const photos = await Photo.find({ uploadedBy: req.admin._id })
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Photo.countDocuments({ uploadedBy: req.admin._id });

    res.status(200).json({
      success: true,
      data: photos,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/admin/photos/:id
 */
const deletePhoto = async (req, res) => {
  try {
    const photo = await Photo.findOne({ _id: req.params.id, uploadedBy: req.admin._id });
    if (!photo) return res.status(404).json({ success: false, message: 'Photo not found.' });

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(photo.publicId);

    // Delete from DB
    await Photo.findByIdAndDelete(photo._id);

    res.status(200).json({ success: true, message: 'Photo deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GALLERY MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/admin/galleries
 */
const createGallery = async (req, res) => {
  try {
    const { title, description, clientName, clientEmail, photoIds, expiryDays, shootDate, googleDriveLink } = req.body;

    if (!title || !clientName || !photoIds || photoIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Title, client name, and at least one photo are required.',
      });
    }

    // Verify photos belong to admin
    const photos = await Photo.find({ _id: { $in: photoIds }, uploadedBy: req.admin._id });
    if (photos.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid photos selected.' });
    }

    const clientId = generateClientId();
    const clientPasswordPlain = generatePassword();
    const expiresAt = getExpiryDate(expiryDays || 8);

    const validShootDate = shootDate && !isNaN(new Date(shootDate).getTime()) ? new Date(shootDate) : null;

    const gallery = new Gallery({
      title,
      description: description || '',
      clientName,
      clientEmail: clientEmail || '',
      clientId,
      clientPassword: clientPasswordPlain,
      clientPasswordPlain,
      expiresAt,
      defaultExpiryDays: expiryDays || 8,
      photos: photos.map((p) => p._id),
      createdBy: req.admin._id,
      coverPhoto: photos[0]._id,
      shootDate: validShootDate,
      googleDriveLink: googleDriveLink || '',
    });

    await gallery.save();

    res.status(201).json({
      success: true,
      message: 'Gallery created successfully.',
      data: gallery,
    });
  } catch (error) {
    console.error('Create Gallery Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/admin/galleries
 */
const getAllGalleries = async (req, res) => {
  try {
    const galleries = await Gallery.find({ createdBy: req.admin._id })
      .sort({ createdAt: -1 })
      .populate('coverPhoto', 'thumbnailUrl url');

    res.status(200).json({ success: true, data: galleries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/admin/galleries/:id
 */
const getGalleryById = async (req, res) => {
  try {
    const gallery = await Gallery.findOne({ _id: req.params.id, createdBy: req.admin._id })
      .populate('photos')
      .populate('clientFavourites.photo');

    if (!gallery) return res.status(404).json({ success: false, message: 'Gallery not found.' });

    res.status(200).json({ success: true, data: gallery });
  } catch (error) {
    console.error('Get Gallery Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/admin/galleries/:id/extend
 */
const extendGalleryAccess = async (req, res) => {
  try {
    const { days } = req.body;
    if (!days || days < 1) {
      return res.status(400).json({ success: false, message: 'Please provide a valid number of days.' });
    }

    const gallery = await Gallery.findOne({ _id: req.params.id, createdBy: req.admin._id });
    if (!gallery) return res.status(404).json({ success: false, message: 'Gallery not found.' });

    const baseDate = gallery.expiresAt > new Date() ? gallery.expiresAt : new Date();
    baseDate.setDate(baseDate.getDate() + parseInt(days));
    gallery.expiresAt = baseDate;
    gallery.isActive = true;
    await gallery.save();

    res.status(200).json({
      success: true,
      message: 'Gallery access extended.',
      data: { expiresAt: gallery.expiresAt },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/admin/galleries/:id/update-photos
 */
const updateGalleryPhotos = async (req, res) => {
  try {
    const { photoIds } = req.body;
    if (!Array.isArray(photoIds)) {
      return res.status(400).json({ success: false, message: 'photoIds must be an array.' });
    }

    const gallery = await Gallery.findOne({ _id: req.params.id, createdBy: req.admin._id });
    if (!gallery) return res.status(404).json({ success: false, message: 'Gallery not found.' });

    const photos = await Photo.find({ _id: { $in: photoIds }, uploadedBy: req.admin._id });
    gallery.photos = photos.map((p) => p._id);
    if (photos.length > 0 && !gallery.coverPhoto) {
      gallery.coverPhoto = photos[0]._id;
    }
    await gallery.save();

    res.status(200).json({
      success: true,
      message: 'Gallery photos updated.',
      data: { totalPhotos: gallery.photos.length },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/admin/galleries/:id
 */
const updateGallery = async (req, res) => {
  try {
    const { title, description, clientName, clientEmail, isActive, shootDate, googleDriveLink } = req.body;
    const gallery = await Gallery.findOne({ _id: req.params.id, createdBy: req.admin._id });
    if (!gallery) return res.status(404).json({ success: false, message: 'Gallery not found.' });

    if (title !== undefined) gallery.title = title;
    if (description !== undefined) gallery.description = description;
    if (clientName !== undefined) gallery.clientName = clientName;
    if (clientEmail !== undefined) gallery.clientEmail = clientEmail;
    if (isActive !== undefined) gallery.isActive = isActive;
    if (shootDate !== undefined) {
      const validDate = shootDate && !isNaN(new Date(shootDate).getTime()) ? new Date(shootDate) : null;
      gallery.shootDate = validDate;
    }
    if (googleDriveLink !== undefined) gallery.googleDriveLink = googleDriveLink;

    await gallery.save();
    res.status(200).json({ success: true, message: 'Gallery updated.', data: gallery });
  } catch (error) {
    console.error('Update Gallery Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/admin/galleries/:id
 */
const deleteGallery = async (req, res) => {
  try {
    const gallery = await Gallery.findOneAndDelete({ _id: req.params.id, createdBy: req.admin._id });
    if (!gallery) return res.status(404).json({ success: false, message: 'Gallery not found.' });
    res.status(200).json({ success: true, message: 'Gallery deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/admin/galleries/:id/favourites
 */
const getClientFavourites = async (req, res) => {
  try {
    const gallery = await Gallery.findOne({ _id: req.params.id, createdBy: req.admin._id })
      .populate('clientFavourites.photo');
    if (!gallery) return res.status(404).json({ success: false, message: 'Gallery not found.' });

    res.status(200).json({
      success: true,
      data: {
        galleryId: gallery._id,
        clientName: gallery.clientName,
        totalFavourites: gallery.clientFavourites.length,
        favourites: gallery.clientFavourites,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/admin/dashboard
 */
const getDashboardStats = async (req, res) => {
  try {
    const totalGalleries = await Gallery.countDocuments({ createdBy: req.admin._id });
    const totalPhotos = await Photo.countDocuments({ uploadedBy: req.admin._id });
    const now = new Date();
    const activeGalleries = await Gallery.countDocuments({
      createdBy: req.admin._id,
      expiresAt: { $gt: now },
      isActive: true,
    });
    const expiredGalleries = await Gallery.countDocuments({
      createdBy: req.admin._id,
      expiresAt: { $lte: now },
    });
    const recentGalleries = await Gallery.find({ createdBy: req.admin._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('coverPhoto', 'thumbnailUrl url')
      .select('-clientPassword');

    const totalFavourites = await Gallery.aggregate([
      { $match: { createdBy: req.admin._id } },
      { $project: { count: { $size: '$clientFavourites' } } },
      { $group: { _id: null, total: { $sum: '$count' } } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalGalleries,
        totalPhotos,
        activeGalleries,
        expiredGalleries,
        totalFavourites: totalFavourites[0]?.total || 0,
        recentGalleries,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
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
};
