const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const gallerySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Gallery title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    clientName: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true,
    },
    clientEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    // Auto-generated credentials
    clientId: {
      type: String,
      unique: true,
      required: true,
    },
    clientPassword: {
      type: String,
      required: true,
      select: false, // never sent in responses
    },
    clientPasswordPlain: {
      type: String, // stored for admin to share (consider encrypting in prod)
      required: true,
    },
    // Expiry system
    expiresAt: {
      type: Date,
      required: true,
    },
    defaultExpiryDays: {
      type: Number,
      default: 8,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Photos included in this gallery (selected by admin)
    photos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Photo',
      },
    ],
    // Favourited photos by client
    clientFavourites: [
      {
        photo: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Photo',
        },
        favouritedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Created by which admin
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    coverPhoto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Photo',
      default: null,
    },
    shootDate: {
      type: Date,
      default: null,
    },
    totalViews: {
      type: Number,
      default: 0,
    },
    lastAccessedAt: {
      type: Date,
      default: null,
    },
    googleDriveLink: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

// Virtual: check if gallery is expired
gallerySchema.virtual('isExpired').get(function () {
  return new Date() > this.expiresAt;
});

gallerySchema.set('toJSON', { virtuals: true });
gallerySchema.set('toObject', { virtuals: true });

// Hash client password before saving
gallerySchema.pre('save', async function () {
  if (!this.isModified('clientPassword')) return;
  this.clientPassword = await bcrypt.hash(this.clientPassword, 10);
});

// Compare client password
gallerySchema.methods.compareClientPassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.clientPassword);
};

// Index for expiry queries
gallerySchema.index({ expiresAt: 1 });


module.exports = mongoose.model('Gallery', gallerySchema);
