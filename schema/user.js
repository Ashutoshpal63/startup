import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const addressSchema = new mongoose.Schema({
  street: String,
  city: String,
  pincode: String,
  geo: { lat: Number, lng: Number }
}, { _id: false });

const cartItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1, default: 1 }
}, { _id: false });


const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String },
  password: { type: String, required: true, select: false },
  address: addressSchema,
  avatar:{type: String},
  
  role: {
    type: String,
    enum: ['customer', 'shopkeeper', 'delivery_agent', 'admin'],
    default: 'customer'
},
  
  // -- Delivery-agent specific fields --
   cart: [cartItemSchema],
  isAvailable: {
    type: Boolean,
    default: function() { return this.role === 'delivery' ? true : undefined; }
  },
  vehicleDetails: { 
    type: String,
    default: function() { return this.role === 'delivery' ? '' : undefined; }
  },
   currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: function() { return this.role === 'delivery' ? 'Point' : undefined; }
    },
    coordinates: { type: [Number], index: '2dsphere' } // [longitude, latitude]
  },

  // -- Shop-owner specific fields --
  // This links a user of role 'shop' to the single shop they own.
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    default: function() { return this.role === 'shop' ? null : undefined; }
  }

}, { timestamps: true });

// Hashpassword before saving.
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed one
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);
