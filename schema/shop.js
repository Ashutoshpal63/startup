import mongoose from 'mongoose';

const shopSchema = new mongoose.Schema({
  name: { type: String, required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, required: true },
  location: {
    street: String,
    city: String,
    pincode: String,
    geo: { 
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number] } // [longitude, latitude]
    }
  },

  // ADD THESE TWO FIELDS
  logoUrl: { type: String }, // URL for the shop's logo from Cloudinary
  coverImageUrl: { type: String }, // URL for a banner/cover image from Cloudinary
  
  isVerified: { type: Boolean, default: false },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  rating: { type: Number, default: 0, min: 0, max: 5 },
}, { timestamps: true });
shopSchema.index({ 'location.geo': '2dsphere' });

export default mongoose.model('Shop', shopSchema);