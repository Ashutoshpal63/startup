import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: String,
  quantity: Number,
  price: Number
}, { _id: false });

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  deliveryAgentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Agent is a User
  products: [orderItemSchema],
  totalAmount: { type: Number, required: true },
  deliveryAddress: {
    street: String,
    city: String,
    pincode: String,
    geo: { lat: Number, lng: Number }
  },
  paymentMethod: { type: String, enum: ['cod', 'card'], default: 'cod' },
  isPaid: { 
    type: Boolean, 
    default: false 
  },
  paidAt: { 
    type: Date 
  },
  paymentResult: {
    id: String, // To store the transaction ID from the payment gateway (e.g., Stripe Payment Intent ID)
    status: String,
    update_time: String,
  },
  status: {
    type: String,
    enum: [
        'PENDING_APPROVAL',   // Customer places order, waits for shop
        'REJECTED',           // Shop rejects the order
        'PENDING_PAYMENT',    // Shop accepts, waits for customer payment
        'PROCESSING',         // Customer paid, shop is preparing
        'OUT_FOR_DELIVERY',   // Agent has picked it up
        'DELIVERED',          // Agent marks as delivered
        'CANCELLED'           // Customer or Admin cancels
    ],
    default: 'PENDING_APPROVAL'
},
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);