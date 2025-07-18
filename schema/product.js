import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true, min: 0 },
  quantityAvailable: { type: Number, default: 0 },
  category: { type: String, required: true },
  imageUrl: String,
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
}, { timestamps: true });

export default mongoose.model('Product', productSchema);