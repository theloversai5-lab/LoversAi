import mongoose from 'mongoose';

const plannerResponseSchema = new mongoose.Schema({
  plannerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['interested', 'quoted', 'declined'],
    default: 'interested'
  },
  quoteAmount: {
    type: Number
  },
  message: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const bidSchema = new mongoose.Schema({
  coupleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  budget: {
    type: Number,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  guestCount: {
    type: Number,
    required: true
  },
  eventDate: {
    type: Date,
    required: true
  },
  aiImages: [{
    type: String // URLs to the Flux generated mood boards
  }],
  status: {
    type: String,
    enum: ['pending', 'reviewing', 'quoted', 'accepted', 'rejected', 'completed'],
    default: 'pending'
  },
  plannerResponses: [plannerResponseSchema],
  hiredPlannerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

bidSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Bid = mongoose.model('Bid', bidSchema);

export default Bid;
