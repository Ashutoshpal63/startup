import mongoose from 'mongoose';

const shopSchema = new mongoose.Schema({
  name: { type: String, required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, required: true },
  location: {
    street: String,
    city: String,
    pincode: String,
    geo: { lat: Number, lng: Number }
  },
  isVerified: { type: Boolean, default: false },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  rating: { type: Number, default: 0, min: 0, max: 5 },
}, { timestamps: true });

export default mongoose.model('Shop', shopSchema);