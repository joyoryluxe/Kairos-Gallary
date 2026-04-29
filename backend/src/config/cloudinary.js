const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: process.env.CLOUDINARY_FOLDER || 'kairos_gallery',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'tiff'],
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    resource_type: 'image',
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per file
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|heic|heif|tiff/;
    const extName = allowedTypes.test(file.originalname.toLowerCase().split('.').pop());
    const mimeType = file.mimetype.startsWith('image/');
    if (extName && mimeType) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  },
});

module.exports = { cloudinary, upload };
