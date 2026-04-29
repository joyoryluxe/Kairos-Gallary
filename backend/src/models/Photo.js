const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    // Cloudinary fields
    url: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
      default: null,
    },
    publicId: {
      type: String,
      required: true,
    },
    // Metadata
    size: {
      type: Number, // in bytes
      default: 0,
    },
    width: {
      type: Number,
      default: null,
    },
    height: {
      type: Number,
      default: null,
    },
    format: {
      type: String,
      default: null,
    },
    // Association
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    // Tag / label for filtering
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    displayId: {
      type: String,
      unique: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

photoSchema.index({ uploadedBy: 1 });

module.exports = mongoose.model('Photo', photoSchema);
