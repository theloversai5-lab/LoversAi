import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['vision', 'service', 'product'], 
    required: true 
  },
  url: { type: String }, // For vision images
  moodboard: [{ type: String }], // Array of image URLs
  label: { type: String },
  prompt: { type: String }, // AI generated prompt/vision text
  details: { type: mongoose.Schema.Types.Mixed }, // Budget, guests, etc.
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // If it's a planner/vendor service
  quantity: { type: Number, default: 1 },
  price: { type: Number },
  addedAt: { type: Date, default: Date.now }
});

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true // This automatically manages createdAt and updatedAt
});

export default mongoose.model('Cart', cartSchema);
