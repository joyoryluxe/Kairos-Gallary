require('dotenv').config();
const sharp = require('sharp');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function run() {
  console.log('Creating dummy PNG image buffer with sharp...');
  const initialPngBuffer = await sharp({
    create: {
      width: 200,
      height: 200,
      channels: 4,
      background: { r: 0, g: 128, b: 128, alpha: 1 }
    }
  }).png().toBuffer();

  console.log('Converting to WebP and compressing with sharp...');
  const webpBuffer = await sharp(initialPngBuffer)
    .webp({
      quality: 85,
      effort: 6,
      smartSubsample: true
    })
    .toBuffer();

  console.log('Original size (PNG):', initialPngBuffer.length, 'bytes');
  console.log('Compressed size (WebP):', webpBuffer.length, 'bytes');

  const metadata = await sharp(webpBuffer).metadata();
  console.log('WebP metadata:', { format: metadata.format, width: metadata.width, height: metadata.height });

  console.log('Uploading processed WebP buffer to Cloudinary...');
  const uploadOptions = {
    folder: 'kairos_gallery_test',
    public_id: `test_image_${Date.now()}`,
    format: 'webp',
    resource_type: 'image',
  };

  const uploadPromise = () => {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
      stream.end(webpBuffer);
    });
  };

  try {
    const result = await uploadPromise();
    console.log('Upload successful! Cloudinary Result details:');
    console.log('- public_id:', result.public_id);
    console.log('- format:', result.format);
    console.log('- url:', result.secure_url);
    console.log('- size:', result.bytes, 'bytes');
  } catch (error) {
    console.error('Upload failed:', error);
  }
}

run();
